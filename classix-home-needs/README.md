# v4.7.1 additions

- **Retail / Wholesale tags**: hidden on the website by default. Admin > Retail & Wholesale Settings > switch "Show Retail / Wholesale available" ON to show them. When OFF, the retail/wholesale fields also disappear from the product form.
- **Admin sliders** no longer change while scrolling: tap a slider once to unlock it ("unlocked - drag now"), then drag. It locks again after 8 seconds.
- **Website Text & Labels** now also covers the new offer texts and the remaining labels (every word on buttons, headings, forms, offers, reviews).
- Load test: 400 simultaneous visitors served with no failures.

# What's new in v4.7

- **PDF uploads now become real pictures.** When you upload a PDF (product, gallery, offer photos), every page is turned into a normal full picture in your browser (Mozilla pdf.js, bundled in `admin/pdfjs/`, Apache-2.0). No more PDF tile or blank preview. Up to 20 pages per PDF. PDFs uploaded earlier stay as they were - upload them again to convert.
- **Offers completely rebuilt** (customer website and admin). Old offers are converted automatically on first start (a backup is saved first).
  - Customer site: colourful themed offer cards (festival colours, discount seal, item thumbnails, special price + regular price, days left) and a new offer page with price ticket, live countdown, items list with quantity, photo gallery, details, terms and WhatsApp / Call buttons.
  - Admin > Offers: every part is editable - theme, badge, title, tagline (Tamil/English), special price, regular price, items (photo, name, qty, price, note), start/end dates, countdown on/off, banner + unlimited photos, details, terms, WhatsApp button, extra button. Newest offer on top, with move up/down/top.
  - Product-linked offer prices were removed (product cards now show only the normal price).

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


## v4.2 notes
* Photo upload accepts **HEIC, JPEG, PNG** (converted to JPEG/PNG on the device). Apple devices read HEIC natively. For Android browsers that cannot read HEIC, put the file `heic2any.min.js` (from the open-source heic2any project) into the `admin/` folder; the admin loads it automatically. Otherwise use the Camera button or set the camera to "Most Compatible".
* Admin: password show/hide eye, category item count on/off, per-item on/off switches, WhatsApp button side/size/height/auto-hide controls.
* Save errors: double taps and stale versions no longer show the red "changed somewhere else" popup; popups are now full-width and readable.

## v4.4 notes
* Offer details page now follows the blueprint (banner, products-included pill, numbered names, total products, special price, Close). Unlimited offer/product photos.
* Admin: sliders, number boxes and drop-downs change only after a double tap/click; dashboard opens with Visitor statistics first.
* Uploads read the file itself (JPEG, PNG, WebP, GIF, HEIC where the browser supports it, PDF); errors stay visible.

## v4.5 notes
* Offer page editor: add / edit / delete products (name Tamil + English, photo), total count, special price, banner, descriptions.
* WhatsApp button shows on the home page only. Loading-screen logo is shown complete (no cropping) and the screen always disappears.
* Uploads: JPG/PNG/HEIC/PDF, 5 MB per file, progress bar, Retry/Skip. See DEPLOY.md for going live.

## What is new in v4.6
* Admin drop-downs, sliders and number boxes work with one tap (the old double-tap lock is gone).
* HEIC photos are converted on the server (`lib/heic.js`, libheif WebAssembly in `vendor/`, LGPL-3.0; jpeg-js encoder). No npm install needed. PDFs show a PDF tile in the admin and open in a new tab on the website.
* Photos/photos-in-bulk upload 3 at a time and are shrunk on the phone first.
* New default logo (transparent PNG): `seed/uploads/classix-logo.png`. Remove the logo in Store Settings to return to it.
* Newest first: new offers, gallery photos, comments and customer reviews appear first. Use ⤒ ↑ ↓ in the admin to change the order. On first start the existing offers and gallery are reversed once (a backup `content-before-upgrade-*.json` is saved).
* Customer reviews: 1–500 letters with a live counter, new attractive form.
* Offer page shows product names, total count and the exact special price you type. Each offer has a 👁 Preview button.
* Speed: files cached for a year, Brotli/gzip cached, fewer fonts, lighter animations on phones.
