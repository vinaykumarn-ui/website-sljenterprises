#!/usr/bin/env bash
# Install or update the enquiry mailer on the VPS. Run as root:
#   bash /root/deploy/enquiry/install.sh
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install -d -m 755 /opt/slje-enquiry
install -m 644 "$DIR/app.py" /opt/slje-enquiry/app.py
install -m 644 "$DIR/slje-enquiry.service" /etc/systemd/system/slje-enquiry.service
# Keep an existing config (it holds the mailbox password)
[ -f /etc/slje-enquiry.env ] || install -m 600 "$DIR/slje-enquiry.env.example" /etc/slje-enquiry.env

systemctl daemon-reload
systemctl enable slje-enquiry >/dev/null
systemctl restart slje-enquiry
sleep 1
systemctl is-active slje-enquiry
