# Classix Home Needs – Website (customer site + separate admin)

Two separate parts that share one live data store:

| Part | Address | Notes |
|---|---|---|
| **Customer website** | `https://your-domain/` | Read-only. No admin links, buttons or code. |
| **Admin panel** | `https://your-domain/admin` | Login protected, not linked from the customer site. |

Every **Save** in the admin is written to the server immediately. The customer page is built fresh on every visit (never
cached), so **Refresh Customer Website** (or a normal browser refresh) shows the change.

## 1. Run on a computer

Needs **Node.js 18 or newer**. Nothing to install.

```
cd classix-home-needs
npm start
```

Open `http://localhost:3000/` (customer) and `http://localhost:3000/admin` (admin).

## 2. Admin login

Sign in with the **username** and **one password**. There are **two passwords and either one works** (Password 1 *or*
Password 2). The first start creates the login with the default username and the two default passwords you were given.

Change them any time: **Admin → Backup & Security → Change admin login**. Enter one current password, then the new
username and/or new Password 1 / Password 2 (leave a box empty to keep it). Each password needs 8+ characters with letters
and numbers, and the two must be different.

* Passwords are stored only as **scrypt hashes** in `data/admin.json`; no password is written in the website or admin code.
* The session cookie is `HttpOnly`, `SameSite=Strict`, limited to the admin path, `Secure` on HTTPS, and ends when the browser closes.
* Opening or reloading the admin page asks for the login again (`ADMIN_REAUTH_ON_LOAD`). **Refresh Admin Panel** reloads data without logging out.
* The admin locks itself after 20 idle minutes (`ADMIN_IDLE_MINUTES`).
* Login is rate limited (5 wrong tries per address → 15 minute pause). Every write needs the session cookie and a same-origin header. The admin page has a strict Content-Security-Policy.

The login can only be changed after signing in. Keep your passwords safe. If they are ever lost, the person who controls
the server can stop it, delete the file `admin.json` in the data folder and start it again: the default username and
passwords are created again (products, photos and reviews are not touched).

## 3. Customer reviews

* The website shows an average star rating, the reviews and a **Write a review** button. Customers give a name, 1–5 stars and a message (10–800 characters, no links).
* New reviews are **not public** until you approve them: Admin → **Customer Reviews** (a number badge shows waiting ones). You can **edit** name, stars, text and date, write a **reply** shown under the review, **publish**, **hide**, **feature** (show first), **delete**, or add a review yourself.
* Settings on that page: turn the review form off, or publish new reviews immediately (not recommended).
* Spam protection: hidden trap field, minimum fill-in time, max 3 reviews per hour per visitor, HTML removed.
* Stored in `data/reviews.json`, included in the full ZIP backup/restore. All wording is editable in Website Text & Labels → Customer reviews.

## 4. Settings (environment variables, all optional)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Port to listen on |
| `ADMIN_PATH` | `/admin` | Address of the admin panel, e.g. `/owner-panel` |
| `DATA_DIR` | `./data` | Content, photos, backups, stats, reviews and the password hashes |
| `NODE_ENV` | – | `production` on a live host |
| `TRUST_PROXY` | – | `1` behind a proxy that serves HTTPS (Render, Nginx, Cloudflare) |
| `FORCE_HTTPS` | – | `1` redirects http→https and sends HSTS (use with `TRUST_PROXY=1`) |
| `PUBLIC_URL` | – | Public address, e.g. `https://www.myshop.com` (used by *Refresh Customer Website* when admin and site are on different domains) |
| `ADMIN_IDLE_MINUTES` | `20` | Auto-lock after this many idle minutes |
| `ADMIN_REAUTH_ON_LOAD` | on | `0` keeps the login when the admin page is reloaded |
| `STATS_TZ_OFFSET_MIN` | `330` | Time zone for visitor days (330 = India) |

Health check address for hosts: `/healthz`.

## 5. Hosting on Render (step by step)

Saving needs a server **and a disk that survives restarts**. Render **free** plans erase files on every restart, which
would delete products, photos and reviews – use a **paid web service with a Disk**.

1. Put the project files in a GitHub repository (files at the repository root).
2. Render → **New → Web Service** → pick the repository. Runtime **Node**, Build Command `echo ok`, Start Command `node server.js`. (Or **New → Blueprint** to use the included `render.yaml`.)
3. **Disks → Add Disk**: mount path `/var/data`.
4. **Environment**: `DATA_DIR=/var/data`, `NODE_ENV=production`, `TRUST_PROXY=1`, `FORCE_HTTPS=1`, optionally `PUBLIC_URL=https://your-domain`.
5. Deploy. Open `/healthz` (shows ok), then `/admin` and sign in. Change the login in Backup & Security.
6. Custom domain: Settings → Custom Domains (HTTPS is automatic).

**Updating later:** download a full backup (Backup & Security), replace the code files in the repository (never touch the
disk), commit and push – Render redeploys, your data stays on the disk.

Other Node.js hosts (VPS, Railway, cPanel "Setup Node.js App") work the same way: run `node server.js`, keep `DATA_DIR`
on persistent storage, serve over HTTPS. Do not cache the HTML of `/` in a CDN, and run a single server instance.

## 6. What the admin controls

Everything on the customer website is editable: Products · Price List · Categories · Offers & Festivals · Customer
Reviews · Home Page Settings (hero, section titles, showcase, why-us, about, reviews, footer & chat) · Header & Footer
(call button, language switch, "Website created by", creator name/phone, copyright, GSTIN) · Display & Sizes ·
Typography Settings (fonts, sizes, spacing with live preview) · Visitor Stats · Menu & Sections · Website Text & Labels
(every button, heading and message in Tamil and English) · Gallery Management · Retail & Wholesale · Contact (phones,
email, address, map, country code) · Store (logo, name, tagline) · Social Media (incl. WhatsApp group link) · Backup &
Security (login, full ZIP backup/restore, JSON export/import, automatic backups).

All phone numbers are tap-to-call (`tel:`), emails are `mailto:`, and WhatsApp buttons open your chat or group link.

## 7. What is where

```
server.js        the server (no dependencies)
lib/             typography rules + built-in default login (hashes only)
public/          customer site (index.html, assets/site.js, site.css)
admin/           admin panel (served only on the admin address)
seed/            starter content + photos, used once on first start
render.yaml      optional Render blueprint
.env.example     list of settings
data/            created automatically: content.json, reviews.json, uploads/, backups/, stats.json, admin.json
```

Visitor counting is anonymous (a random id kept in the visitor's browser, stored only as a hash); bots are ignored.
