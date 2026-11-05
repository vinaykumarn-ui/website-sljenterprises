"""Enquiry form mailer for sljenterprises.com.

A tiny HTTP service (Python standard library only) that nginx proxies
POST /api/enquiry to. It validates the form, applies basic spam checks
and emails the enquiry through the company mailbox over SMTP.

Configuration comes from environment variables (see slje-enquiry.env.example).
If SMTP_PASS is empty the service runs in dry-run mode: it logs the
enquiry instead of sending it.
"""
import base64
import json
import logging
import os
import re
import smtplib
import ssl
import time
from collections import defaultdict, deque
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SMTP_HOST = os.environ.get("SMTP_HOST", "smtpout.secureserver.net")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "info@sljenterprises.com")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
if os.environ.get("SMTP_PASS_B64"):
    SMTP_PASS = base64.b64decode(os.environ["SMTP_PASS_B64"]).decode()
MAIL_TO = os.environ.get("MAIL_TO", "info@sljenterprises.com")
MAIL_CC = os.environ.get("MAIL_CC", "")
LISTEN_PORT = int(os.environ.get("LISTEN_PORT", "8081"))

RATE_LIMIT = 5            # enquiries per IP ...
RATE_WINDOW = 60 * 60     # ... per hour
MIN_FILL_SECONDS = 3      # forms submitted faster than this are bots
MAX_BODY = 8 * 1024

FIELDS = {  # name: (required, max length)
    "name": (True, 100),
    "phone": (True, 20),
    "email": (False, 120),
    "company": (False, 150),
    "product": (True, 80),
    "quantity": (False, 40),
    "message": (False, 2000),
}
PHONE_RE = re.compile(r"^[0-9 +\-]{10,15}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

log = logging.getLogger("slje-enquiry")
recent = defaultdict(deque)


def rate_limited(ip):
    now = time.time()
    hits = recent[ip]
    while hits and now - hits[0] > RATE_WINDOW:
        hits.popleft()
    if len(hits) >= RATE_LIMIT:
        return True
    hits.append(now)
    return False


def clean(data):
    """Return (fields, error). Strips control characters and enforces limits."""
    out = {}
    for name, (required, limit) in FIELDS.items():
        value = str(data.get(name, "")).strip()
        value = re.sub(r"[\x00-\x08\x0b-\x1f\x7f]", "", value)
        if name != "message":
            value = " ".join(value.split())
        if required and not value:
            return None, f"Please fill in {name}."
        if len(value) > limit:
            return None, f"{name.capitalize()} is too long."
        out[name] = value
    if not PHONE_RE.match(out["phone"]):
        return None, "Please enter a valid phone number."
    if out["email"] and not EMAIL_RE.match(out["email"]):
        return None, "Please enter a valid email address."
    return out, None


def send(fields, ip):
    msg = EmailMessage()
    msg["Subject"] = f"Website enquiry: {fields['product']} - {fields['name']}"
    msg["From"] = formataddr(("SLJ Enterprises Website", SMTP_USER))
    msg["To"] = MAIL_TO
    if MAIL_CC:
        msg["Cc"] = MAIL_CC
    if fields["email"]:
        msg["Reply-To"] = formataddr((fields["name"], fields["email"]))
    msg["Message-ID"] = make_msgid(domain="sljenterprises.com")
    msg.set_content(
        "New enquiry from sljenterprises.com\n\n"
        f"Name:      {fields['name']}\n"
        f"Phone:     {fields['phone']}\n"
        f"Email:     {fields['email'] or '-'}\n"
        f"Company:   {fields['company'] or '-'}\n"
        f"Product:   {fields['product']}\n"
        f"Quantity:  {fields['quantity'] or '-'}\n\n"
        f"Message:\n{fields['message'] or '-'}\n\n"
        f"-- \nSent from the website enquiry form ({time.strftime('%d %b %Y %H:%M %Z')}, IP {ip})\n"
    )
    if not SMTP_PASS:
        log.warning("DRY RUN (SMTP_PASS not set), not sending:\n%s", msg)
        return
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ssl.create_default_context(), timeout=20) as smtp:
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.send_message(msg)


class Handler(BaseHTTPRequestHandler):
    server_version = "slje-enquiry"

    def log_message(self, fmt, *args):
        log.info("%s %s", self.client_ip(), fmt % args)

    def client_ip(self):
        return self.headers.get("X-Real-IP") or self.client_address[0]

    def reply(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == "/api/enquiry/health":
            return self.reply(200, {"ok": True, "dry_run": not SMTP_PASS})
        self.reply(404, {"ok": False})

    def do_POST(self):
        if self.path != "/api/enquiry":
            return self.reply(404, {"ok": False})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self.reply(413, {"ok": False, "error": "Request too large."})
        try:
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError
        except ValueError:
            return self.reply(400, {"ok": False, "error": "Invalid request."})

        ip = self.client_ip()
        # Spam checks: hidden honeypot field filled, or form sent too fast.
        # Answer "ok" so bots learn nothing, but do not send.
        try:
            elapsed = time.time() - float(data.get("started", 0)) / 1000
        except (TypeError, ValueError):
            elapsed = 0
        if data.get("website") or elapsed < MIN_FILL_SECONDS:
            log.info("%s spam check triggered (honeypot=%s, elapsed=%.1fs)", ip, bool(data.get("website")), elapsed)
            return self.reply(200, {"ok": True})
        if rate_limited(ip):
            return self.reply(429, {"ok": False, "error": "Too many enquiries. Please call us instead."})

        fields, error = clean(data)
        if error:
            return self.reply(422, {"ok": False, "error": error})
        try:
            send(fields, ip)
        except Exception:
            log.exception("sending failed")
            return self.reply(502, {"ok": False, "error": "Could not send right now."})
        log.info("%s enquiry sent: %s / %s", ip, fields["name"], fields["product"])
        self.reply(200, {"ok": True})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    log.info("listening on 127.0.0.1:%d (dry run: %s)", LISTEN_PORT, not SMTP_PASS)
    ThreadingHTTPServer(("127.0.0.1", LISTEN_PORT), Handler).serve_forever()
