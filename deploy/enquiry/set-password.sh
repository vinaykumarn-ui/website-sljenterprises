#!/usr/bin/env bash
# Store the info@sljenterprises.com mailbox password for the enquiry mailer.
# Run as root on the VPS; the password is typed at a hidden prompt.
set -euo pipefail
ENV=/etc/slje-enquiry.env

read -r -s -p "Password for info@sljenterprises.com: " PASS
echo
[ -n "$PASS" ] || { echo "No password entered, nothing changed."; exit 1; }

# Pass the password through the environment (not argv) and store it base64
# encoded so quotes or backslashes in it cannot break the systemd env file.
SLJE_PASS="$PASS" python3 -I - "$ENV" <<'EOF'
import base64, os, re, sys
path = sys.argv[1]
encoded = base64.b64encode(os.environ["SLJE_PASS"].encode()).decode()
lines = [l for l in open(path).read().splitlines() if not re.match(r"SMTP_PASS(_B64)?=", l)]
lines.append("SMTP_PASS_B64=" + encoded)
open(path, "w").write("\n".join(lines) + "\n")
EOF
unset PASS
chmod 600 "$ENV"
systemctl restart slje-enquiry
sleep 1
curl -s http://127.0.0.1:8081/api/enquiry/health; echo
echo "Saved. \"dry_run\": false above means the mailer will now send emails."
