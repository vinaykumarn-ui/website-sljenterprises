#!/usr/bin/env bash
# One-time setup for the Hostinger KVM VPS (Ubuntu 22.04 / 24.04).
# Run as root on the VPS:
#   bash setup-vps.sh "ssh-ed25519 AAAA... github-deploy"
# The argument is the PUBLIC key whose private half is stored in the
# VPS_SSH_KEY GitHub secret.
set -euo pipefail

DOMAIN="sljenterprises.com"
DEPLOY_USER="deploy"
WEB_ROOT="/var/www/${DOMAIN}/html"
PUBKEY="${1:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root." >&2
  exit 1
fi
if [ -z "$PUBKEY" ]; then
  echo "Usage: bash setup-vps.sh \"<deploy public key>\"" >&2
  exit 1
fi

echo "==> Installing nginx, certbot, rsync and firewall"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx rsync ufw

echo "==> Creating deploy user"
id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh"
AUTH_KEYS="/home/${DEPLOY_USER}/.ssh/authorized_keys"
touch "$AUTH_KEYS"
grep -qxF "$PUBKEY" "$AUTH_KEYS" || echo "$PUBKEY" >> "$AUTH_KEYS"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"

echo "==> Creating web root"
mkdir -p "$WEB_ROOT"
chown -R "$DEPLOY_USER:www-data" "/var/www/${DOMAIN}"
chmod -R 755 "/var/www/${DOMAIN}"
if [ ! -f "$WEB_ROOT/index.html" ]; then
  echo "<h1>SLJ Enterprises - coming soon</h1>" > "$WEB_ROOT/index.html"
  chown "$DEPLOY_USER:www-data" "$WEB_ROOT/index.html"
fi

echo "==> Configuring nginx"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Keep an existing config so HTTPS settings added by certbot are not lost on re-runs
[ -f "/etc/nginx/sites-available/${DOMAIN}" ] || cp "$SCRIPT_DIR/nginx/${DOMAIN}.conf" "/etc/nginx/sites-available/${DOMAIN}"
ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo "==> Configuring firewall"
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable

cat <<EOF

Done. Next steps:
  1. In GoDaddy DNS, point A records for @ and www to this server's IP.
  2. Once DNS resolves, get the free HTTPS certificate:
       certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --redirect -m <your email> --agree-tos
  3. Push to the main branch on GitHub to deploy the site.
EOF
