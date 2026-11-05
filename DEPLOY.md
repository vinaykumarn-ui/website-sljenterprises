# Deploying sljenterprises.com

**Status:** live at <https://sljenterprises.com> since 2026-11-05.
VPS: Hostinger KVM 1, Ubuntu 24.04, IP `189.72.144.147`. HTTPS by Let's Encrypt (auto-renews).

```
GoDaddy (domain + email)  --A records-->  Hostinger KVM 1 VPS (nginx)  <--rsync over SSH--  GitHub Actions (on push to main)
```

Every push to `main` that changes `site/` copies the site to the VPS automatically.
Until the GitHub secrets below are added, the workflow skips the deploy with a warning.

---

## 1. Finish the VPS setup in Hostinger

1. hPanel → **VPS** → KVM 1 → **Set up**.
2. Choose **Plain OS → Ubuntu 24.04** (no control panel needed).
3. Set a strong root password, and note the **VPS IP address**.

## 2. Create a deploy SSH key (on your PC)

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/slje_deploy -N ""
```

This creates:
- `~/.ssh/slje_deploy` → **private** key (goes into GitHub secret, never share otherwise)
- `~/.ssh/slje_deploy.pub` → **public** key (goes onto the VPS)

## 3. Run the one-time server setup

```bash
scp -r deploy root@<VPS_IP>:/root/
ssh root@<VPS_IP>
bash /root/deploy/setup-vps.sh "<contents of slje_deploy.pub>"
```

This installs nginx, creates a `deploy` user that can only upload the site, configures the firewall, and serves `/var/www/sljenterprises.com/html`.

## 4. Point the domain from GoDaddy to the VPS

GoDaddy → **sljenterprises.com → DNS → DNS Records**:

| Type  | Name | Value            | Action |
|-------|------|------------------|--------|
| A     | @    | `<VPS_IP>`       | Edit the existing "Parked" A record |
| CNAME | www  | `@` (or `sljenterprises.com`) | Usually already there, keep it |

**Do not change nameservers** and **do not touch MX / TXT / email CNAME records**. GoDaddy email keeps working that way.

Check propagation: <https://dnschecker.org/#A/sljenterprises.com>

## 5. Enable free HTTPS (on the VPS, after DNS points to it)

```bash
certbot --nginx -d sljenterprises.com -d www.sljenterprises.com --redirect -m <your email> --agree-tos
```

Certbot renews automatically.

## 6. Add GitHub secrets

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret        | Value |
|---------------|-------|
| `VPS_HOST`    | VPS IP address |
| `VPS_USER`    | `deploy` |
| `VPS_SSH_KEY` | Full contents of `~/.ssh/slje_deploy` (private key) |
| `VPS_PORT`    | Optional, only if SSH is not on port 22 |

## 7. Deploy

- Push any change in `site/` to `main`, or
- GitHub → **Actions → Deploy website → Run workflow**.

Open <https://sljenterprises.com>. 🎉

---

## Editing the site

All public files live in `site/`. Open `site/index.html` in a browser to preview locally.
Search for `TODO` to find content that still needs real details (company story, product specs, phone, address).
