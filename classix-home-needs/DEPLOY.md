# Classix Home Needs – Deploy guide / டிப்ளாய் வழிகாட்டி

No build step, no `npm install` – only **Node.js 18+**. (எதுவும் install செய்ய வேண்டாம், Node 18+ மட்டும் போதும்.)

## 0. Before you go live / லைவ் போவதற்கு முன்
1. Start once, open `https://YOUR-DOMAIN/admin/` and **change the admin username & passwords** (Backup & Security).
   The admin address is private – you can change it with `ADMIN_PATH` (e.g. `/shop-panel-7391`).
2. Fill shop details, logo, offers, products in the admin panel. Click **Backup → Download** once a week.
3. Everything you edit is stored in the **data folder** (`DATA_DIR`): `content.json`, `uploads/`, `backups/`.
   **Keep this folder on a persistent disk** – otherwise a restart will erase photos and changes.

## 1. Environment variables
| Name | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | secure cookies |
| `DATA_DIR` | `/var/data` (any persistent folder) | where all data lives |
| `TRUST_PROXY` | `1` | when behind Render / nginx / Cloudflare |
| `FORCE_HTTPS` | `1` | redirect http → https |
| `PUBLIC_URL` | `https://www.your-domain.com` | canonical link / sharing image |
| `ADMIN_PATH` | e.g. `/shop-panel-7391` | private admin address (optional) |
| `PORT` | host gives it automatically | |

## 2A. Easiest: Render.com (+ your own domain)
1. Upload this folder to a private GitHub repository.
2. Render → **New → Blueprint** → choose the repo (it reads `render.yaml`; the plan with a 1 GB disk is needed so data is not lost).
3. Render → your service → **Settings → Custom Domains → Add** `www.your-domain.com` (and `your-domain.com`).
4. At your domain seller (GoDaddy / Namecheap / BigRock…) → DNS:
   * `CNAME`  `www` → `your-service.onrender.com`
   * root domain: the `A`/`ALIAS` record that Render shows you.
5. Wait 5–30 minutes; HTTPS certificate is automatic. Then set `PUBLIC_URL` to `https://www.your-domain.com`.
6. Already have data? Admin → **Backup → Restore** and upload your backup ZIP.

## 2B. Your own VPS (Ubuntu) – Hostinger / DigitalOcean / AWS Lightsail
```bash
sudo apt update && sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx
# Node 18+ check:  node -v   (if older: install from nodesource.com)
sudo mkdir -p /opt/classix /var/data && sudo chown $USER /opt/classix /var/data
# upload the ZIP, then:
unzip classix-home-needs-*.zip -d /opt/classix && cd /opt/classix/classix-home-needs
sudo npm i -g pm2
NODE_ENV=production DATA_DIR=/var/data TRUST_PROXY=1 FORCE_HTTPS=1 PUBLIC_URL=https://www.your-domain.com \
  PORT=3000 pm2 start server.js --name classix
pm2 save && pm2 startup        # starts again after reboot
```
nginx (`/etc/nginx/sites-available/classix`):
```
server {
  server_name your-domain.com www.your-domain.com;
  client_max_body_size 120m;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/classix /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com     # free HTTPS
```
DNS: `A` record for `@` and `www` → your server IP.

## 3. Updating later / பின்னர் அப்டேட்
Replace the program files with the new ZIP but **keep the data folder** (`DATA_DIR`). Then `pm2 restart classix`.
Health check URL: `/healthz`.

## 4. Photos & PDFs
* Allowed: JPG, JPEG, PNG, HEIC/HEIF (converted automatically) and PDF – **max 12 MB per file** (HEIC photos are converted to JPEG on the server in about a second; PDFs open in a new tab).
* HEIC conversion uses `admin/heic2any.min.js` (already included).
* If nginx is used keep `client_max_body_size 120m;` (a full-backup ZIP restore can be large).

## Data safety on free hosts (Supabase) and staying awake
* **SUPABASE-SETUP.md** explains how to connect a free Supabase project (`SUPABASE_URL` + `SUPABASE_SERVICE_KEY`).
  All data is then mirrored to a private bucket and restored automatically after every restart/deploy.
* **Keep-awake is always on**: the server calls its own public address every 8 minutes so a free Render service does not sleep.
  For extra safety also add a free UptimeRobot monitor for `https://YOUR-SITE.onrender.com/healthz` (every 5 minutes).

