# v3.8 - bigger photos, 2-minute videos, upload progress in MB
* Photos / PDFs / HEIC: up to **20 MB per file** (was 12 MB).
* Videos: up to **2 minutes**, any file size. The length is checked in the admin; the server streams videos straight to disk, so even a very large video does not use the server's memory. Videos over 50 MB are not packed into the Full backup ZIP or copied to Supabase (a ZIP is built in memory); they stay on the server disk.
* Upload progress (Admin): shows the percent, MB sent of total MB for each file, and for many files at once the overall MB sent / total MB, files done and percent.

# v3.7 - photo quality + video sound rule
* Photos: up to 2400 px (PNG 2000 px), JPEG quality 95 (was 1600 px / 86). JPEGs up to 3 MB and 2400 px are uploaded untouched (no re-compression). HEIC phone photos: quality 97 on the phone, 93 / 2400 px on the server. Videos are never re-compressed (uploaded exactly as they are).
* Video sound: a video is silent and shows NO sound / volume control on the customer site unless Sound ON is set for that video in Admin. For Sound ON videos: hero slides and offer pages get a small round sound button; product and gallery videos keep their normal controls. In the Admin preview a Sound OFF video is muted with no volume control.

# v3.6.2 - Admin > Display & Sizes > Animations & effects: new "Colour length" (5-100 %) = how much of the border is coloured, the rest stays white. "Time for one round" is now real seconds (1-20, default 2.5).

# v3.6 - effects stay ON, but made cheap (less lag) + [health] log removed
* Removed: the `[health]` log line. (Admin > Server memory card still works.)
* Rainbow border light: now a short running arc (white border left around it), 2.5x faster, starts the moment a box appears, keeps running while scrolling; max 10 boxes at a time (nearest the middle of the screen).
* Endless animations (sparks, bob, sheen, glow, pulse...): run only for sections on screen and pause while scrolling.
* Blur glass: kept, with smaller blur. Phone header is solid (looks the same, no blur cost).
* Scroll re-animation: kept.
* Emergency only: if a screen is slower than 30 fps, extras drop automatically. Test: `?perf=lite` / `?perf=full`.

# v3.3.1 - launch checklist (the [health] log line was REMOVED in v3.5)
* (Removed in v3.5) every 10 minutes the server wrote one line to the host's Logs (Render > Logs): `[health] up ... | memory ... MB | CPU ...% | requests ... | server errors ... | Supabase ...% used`. A WARNING line appears if memory goes above 400 MB (free host limit 512 MB), if there are many server errors, or if Supabase is not connected. It costs nothing while visitors browse.
* Checked: load test (60,000 requests, 300 at once, 0 errors), memory stays flat (about 150 MB), CPU, log scan (no errors), Supabase connection reuse.
* Nothing visible on the website or admin changed.

# v3.3.0 - launch check (public hosting)
* Checked with a slowed-down phone CPU: scrolling holds 60 frames/s on a 4x slower phone; page loads in about 1 second. Server tested with 500 visitors at once: 0 errors (about 3000 requests/second).
* Home hero photos now load one slide ahead instead of all at once (less data on the first visit; slides still change without a blank flash).
* Nothing else changed: look, glow, animations, videos, Supabase live bar and emoji fix are exactly as in v3.2.1.

# v3.2.1 - emoji fix added (colour emoji on old Windows / old browsers; does nothing and downloads nothing on devices that already show emoji)

# v3.2.0 - video + live Supabase progress added to the smooth v2.1-glow base (nothing else changed)
* **Videos:** Hero slides accept MP4 / WebM / MOV (up to 2 minutes, any size). Gallery, Offer photos and Product photos accept videos too, with a play thumbnail, full-screen player, and sound ON/OFF bar under each video in the admin (new file admin/media-tools.js). Closing a viewer or leaving the tab stops the video.
* **Supabase / Backup & Security:** the storage bar now reads the REAL size live from Supabase (refreshes every 15 s + "Refresh storage" button); files deleted in Supabase disappear from the bar. Backups list shows ZIP safety copies with delete buttons and "Keep only the latest 5".
* Glow, animations, scrolling, header, banner and every other effect are exactly as in v2.1-glow (v4.17.2) - untouched.

# v4.17.2 - running rainbow glow light round every box (on-screen boxes only, GPU transform, pauses while scrolling). Admin > Display & Sizes > Animations & effects: ON/OFF, 5 colours, thickness, speed. Everything else = v2.1-final.

# v4.17.0 - Find setting (tap anything on the website, see every setting for it)

- **New button in the admin top bar: "Find setting".** It opens your customer website inside the admin panel. Tap any text, button, heading or photo - the admin jumps to the exact setting and highlights it so you can change it and press Save.
- Works by matching what you tapped with the real settings (Tamil or English text, and photos). If several settings match, you choose from a short list. If none match, the closest page opens.
- Tapping a product on the website now finds that product's edit form (name, short line, description, price…).
- The sheet shows every related setting: the words, the other settings of the same part (link, colour, show / hide) and the size / font / style settings.
- The two refresh buttons sit side by side at the top; "Find setting" is in the Menu.
- **Full check before public hosting:** every visible website text can be edited in the admin. The "Leave the website?" box texts, "Tap to see" and the all-products title were missing from Website Text & Labels and are added there now. Pressing Esc closes the mobile menu on computers. The website cannot be shown inside another website (frame-ancestors), and Find setting mode only works inside the admin panel.
- Nothing changes on the customer website for visitors; this mode only works inside the admin panel and is never counted as a visit. The existing search bar is unchanged.

# v4.16.0 - smooth button effects, nothing outside the screen, compact leave box, shop name ON

- **Button effect:** the slanted shine band (the visible "cut line") is gone. Buttons now glow softly over the whole button, and button shadows are no longer clipped at the section edge. Applies to every button (gold, WhatsApp, offers banner, review, leave box).
- **Phones / tablets / laptops:** contact boxes (email, address, timings), forms, totals and buttons now shrink to fit - long emails and words wrap instead of going outside the screen. Nothing is hidden or cut.
- **"Leave the website?" box:** compact half-page popup (smaller logo, text and side-by-side Stay / Exit buttons). It always shows the shop name from Store Settings and rebuilds each time it opens, so admin changes appear immediately.
- **Admin duplicates removed:** the separate "Shop name" boxes inside the Leave-box settings (they did not follow the real shop name). Shop name now has ONE place: Store Settings.
- **Shop name in the header:** ON by default for everyone (this upgrade switches it back on once). It turns OFF only when you untick it in Display & Sizes.

# v4.15.0 - numbers stay together, admin menu follows the website, scroll effects, smooth back transitions

- **Numbers never split:** "10", "1000+", "1106", "₹1,23,456", "25% OFF" always stay on ONE line (the "Total Reviews / Offers / Products / Images" boxes on the sub pages, number counters, prices, countdown, badges). Tested with 1000+ values on phone (320 / 390 px) and computer.
- **Admin menu = website order:** Dashboard, Header & Footer, Offers Banner Studio, Home Page Settings (hero ...), then Categories, Products, Price List, Retail & Wholesale, Offers & Festivals, Gallery, Reviews, Contact - the same top-to-bottom order as the customer website - then Social, Store, Display & Sizes, Typography, Menu & Sections, Labels, Visitor Stats, Backup. If you change the section order in **Menu & Sections**, the admin menu follows it automatically.
- **Scroll animations everywhere:** every section, card, gallery photo, contact box, footer column and list item now rises / zooms / slides in one after another while you scroll, headings draw a gold underline, counters pop, and a colourful **scroll progress bar** runs along the top. Admin > Display & Sizes > "Scroll effect style" (Rise up / Zoom / Slide from sides / Bouncy pop) and "Scroll animations" (Full / Light / Off).
- **Smooth back / open transitions:** offer page, all-offers / gallery / reviews / products pages slide in from the right with the background fading dark; pressing Back slides them out smoothly. The menu drawer, popups and photo viewer now also animate when they CLOSE (before they vanished instantly).

# v4.14.1 - compact offers banner + Offers Banner Studio scrolls normally

- **Offers banner is now small and compact** on phones, tablets, laptops and computers (about half the old height on phones). Bigger / smaller any time: Admin > Offers Banner Studio > **"OVERALL banner size"** slider (60% - 200%), plus the separate height / text / button / picture sliders.
- **Offers Banner Studio page:** the live preview is no longer pinned (it blocked scrolling on phones). The settings come first; the **live preview is at the very bottom**. A "Go to the live preview" button at the top jumps there.

# v4.14.0 - Offers Banner Studio (live preview + sliders) and a much smoother banner

- **New admin page: Offers Banner Studio** (left menu, under Offers & Festivals). A **live preview** (Phone / Tablet / Computer) stays on top while you move the **slider bars**: banner height, title size, short-line size, price size, button size and thickness, picture size, animation speed, number of floating emojis. Switches: shining light, pulsing button / badge, floating picture, slide-in text. Press **Save** to publish. The old banner boxes in Display & Sizes moved here (no duplicates).
- **Smoothness mode:** Auto (full effects, lighter on weak phones - default) / Full / Light / No animation.
- **Why it was laggy, and what changed:** the old banner repainted a big moving gradient, animated shadows and used blur on every frame, and every slide animated even when hidden. Now only the **visible slide** animates, using only graphics-chip friendly effects (move / scale / fade), animation pauses when the banner is scrolled out of view or the tab is hidden, blur filters were removed, and the colour gradients are smooth (no hard colour edge).
- Banner is more compact on phones and the button text stays on one line.
- The preview does not count as a website visitor.

# v4.13.0 - new colourful, animated offers banner (top of the website)

- **New look:** moving gradient colours, floating emoji / twinkling stars behind the text, a glowing round offer picture, a pulsing LIMITED / NEW badge, a big price chip with a wiggling "% OFF" sticker, a **live countdown (days + hh:mm:ss)** and a big shining, pulsing button. Every slide animates in when it appears. Phones get a tidy stacked layout; computers get a wide layout.
- **Everything is editable and can be switched on / off, per offer:** Admin > Offers & Festivals > open an offer > **"⑦ Top swipe banner"**: badge, title (own banner title Tamil / English), short line, special price, "% OFF" sticker, countdown, picture, emoji, moving effect (floating emojis / party mix / twinkling stars / none), own banner colours, and the button (on/off, Tamil / English text, arrow or icon, colour, and whether it opens the offer page or WhatsApp).
- **Default button text for all banners:** Admin > Display & Sizes > Offers banner > "Default banner button text" (Tamil / English).
- Existing offers keep working: every new option defaults to ON, so nothing disappears after the upgrade. Banner height / title size / button size in Display & Sizes still work.
- Animations stop automatically if the phone has "reduce motion" on, or if Display & Sizes animation is set to Off / Light.

# v4.12.0 - live sync, name always visible, duplicates removed, dead options fixed

- **Live sync:** the customer website now follows the admin panel by itself - after you press Save, every open page updates within ~12 seconds (no refresh). It never interrupts a visitor who is reading an offer or filling a form.
- **Shop name in the header** is shown by default (Display & Sizes > "Show the shop name in the header" to hide it).
- **Options that did not work were fixed:** hero small tag (English), offer-page item prices switch. The dead "EST. word" box in Header & Footer was removed (it lives in Store Settings).
- **Duplicate options removed:** announcement (only in Header & Footer), footer / copyright / credit (only in Header & Footer), section titles (each one only on its own page), products-on-home count (only in Home Page Settings > Product Showcase).
- Every text option in admin (about 160) was tested automatically: it appears on the customer website.

# v4.11.1 - fixes: banner fits phones, logo-left/name-centre header, editable leave box, admin menu in website order

# v4.11.0 - offers swipe banner, products page, safer backup/restore, back button

- **Swipe offers banner (top of the website):** every live offer is a themed slide (Diwali, Pongal, Christmas, Eid, Sale...). Customers swipe left/right (arrows + dots on computers); it also slides by itself. Tap = opens the offer. Admin > Display & Sizes > "Offers banner": on/off, auto-slide seconds, button on/off, height and text sizes. Each offer has "Also show in the swipe banner" (Offers & Festivals).
- **Products on the home page:** Admin > Display & Sizes (or Home Page Settings > Product Showcase) > "How many products to show" (0 = all). "View All Products" opens a full products page (search + category filter); Back returns to the normal page.
- **Backup & Restore:** progress bar with % and a Cancel button for download and restore. Restore now takes every valid file in the ZIP, skips wrong/damaged files automatically (it never stops), picks the correct content file by itself and lists what was skipped.
- **Keep-awake:** "Reset counter to 0" button; the "${ka.minutes || 8}" text bug is fixed.
- **Shop name:** spelled **"Classix Home Needs"** everywhere (customer site, admin, saved data).
- **Admin loading screen** shows the shop logo.
- **Back button (website + admin):** closes the popup / photo / offer page / menu first, goes to the previous admin page with a slide effect, and never throws the visitor out - a "Leave?" box (Stay / Exit) appears instead.
- **More controls (Display & Sizes):** shop name size (English/Tamil), name wrap, language button, menu button, quick-menu pills, announcement text, all button sizes, product name/description/price, section headings, footer text.

# v4.10.1 - Visitor Stats upgrade (no location, Graph view)

- **Admin > Visitor Stats rebuilt.** Choose Today, Yesterday, 7 / 14 / 30 / 90 days, This month, All time, or **Pick dates** (any From-To, or tap a bar / use "See one day" to look at a single date). A "compare with the period before" switch shows ▲ / ▼ percentages.
- **Boxes (11 options):** summary numbers, day-by-day chart, New vs returning, Phone / computer, Browser, Where visitors came from (Google, Facebook, Instagram, WhatsApp / direct, or your own `?src=poster` links / QR codes), Website sections viewed, Top products, Top offers, Top gallery photos.
- **Graph view / List view:** one button switches every box between charts (line graph for days, round charts for the rest) and simple lists.
- **Customize this page:** tick / untick any box you do not want to see (saved in your browser).
- **Delete visitor data:** delete one day, everything before a date, the dates currently shown, or **ALL and start fresh from zero**. Products, offers and settings are never touched.
- **No location, no IP:** this version does not look up or store where a visitor is. Only counts are saved (no name, phone, IP).
- New counters start from the day you install this version (older days keep only their visitor and page-view counts).

# v4.9.3

- **Header on desktop / laptop / tablet**: shop logo + name are centred and fully visible; the Tamil|English button and the menu button sit in the right corner. Quick menu pills are centred below.

# v4.9.2

- **Photo viewer fixed**: tapping a photo in Shop Gallery, Offers or Products now always shows the WHOLE photo (tall phone screenshots, portrait and wide photos were cut off at the bottom before). Zoom, swipe and caption still work.

# v4.9.1

- **Admin search results** are now clear cards: bold title, a dashed line, then the page and section where the setting is (no more overlapping text).

# v4.9.0 additions

- **Supabase storage usage** (Admin > Backup & Security): used / free space in MB or GB with a progress bar, split into photos & PDFs, automatic backups, and settings/reviews. A coloured warning shows on the Dashboard and on that page at **70%, 85% and 95%** full. The limit defaults to 1 GB (Supabase free); on a paid plan set `SUPABASE_LIMIT_MB` in Render (e.g. 8192 for 8 GB). Free space with "Delete unused photos".
- **Header never overlaps**: if the full menu does not fit on a screen (laptop, desktop, big Tamil fonts), the site automatically switches to the compact menu (burger + quick pills). Works for Tamil and English on every screen size.
- **Full photos everywhere**: new defaults show the WHOLE photo (nothing cropped) for hero slider, products, gallery, offers and about. Admin > Display & Sizes > "Photo display - choose for each area": choose "Show the FULL photo" or "Fill the box (edges may be cropped)" separately for each area. Press Save, then Refresh Customer Website.

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
