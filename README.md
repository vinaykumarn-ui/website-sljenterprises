# SLJ Enterprises website

Website for **SLJ Enterprises**, street light pole manufacturer: <https://sljenterprises.com>

- `site/` — the public website (plain HTML, CSS and JS, no build step)
- `.github/workflows/deploy.yml` — deploys `site/` to the Hostinger VPS on every push to `main`
- `deploy/` — one-time VPS setup script and nginx config

See [DEPLOY.md](DEPLOY.md) for hosting and domain setup.
