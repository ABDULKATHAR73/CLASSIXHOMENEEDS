'use strict';
/*
 * Classic Home Needs – website server (no external dependencies, Node 18+)
 *
 *   Customer site : /                      (read-only, never links to the admin)
 *   Admin panel   : ADMIN_PATH (default /admin)
 *   Shared data   : DATA_DIR/content.json  (+ uploaded photos in DATA_DIR/uploads)
 *
 * Every admin save is written to disk immediately, and the customer page is
 * rendered from that file on every request (Cache-Control: no-store), so a
 * simple refresh of the customer page always shows the latest changes.
 */
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { Worker } = require('worker_threads');
const T = require('./lib/typography');
const { isHeic } = require('./lib/heic');

/* ------------------------------------------------------------------ config */
const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const AUTH_FILE = path.join(DATA_DIR, 'admin.json');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const IDLE_MS = Math.max(0.05, Number(process.env.ADMIN_IDLE_MINUTES) || 20) * 60000;   // admin locks after this much inactivity
const REAUTH_ON_LOAD = process.env.ADMIN_REAUTH_ON_LOAD !== '0';                    // opening/reloading the admin page asks for the password again
const PUBLIC_URL = String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');   // optional, e.g. https://www.myshop.com
const SITE_URL = PUBLIC_URL ? PUBLIC_URL + '/' : '/';
const FORCE_HTTPS = process.env.FORCE_HTTPS === '1';   // redirect http -> https (needs TRUST_PROXY=1 behind a proxy)
const IS_PROD = process.env.NODE_ENV === 'production';
const DEFAULT_LOGO = '/uploads/classix-logo.png';      /* shop logo used until the owner uploads another one */
const OLD_DEFAULT_LOGO = '/uploads/logo.jpg';

let ADMIN_PATH = String(process.env.ADMIN_PATH || '/admin').trim().replace(/\/+$/, '');
if (!ADMIN_PATH.startsWith('/')) ADMIN_PATH = '/' + ADMIN_PATH;
if (ADMIN_PATH === '' || ['/', '/api', '/assets', '/uploads', '/robots.txt'].includes(ADMIN_PATH)) {
  console.error('ADMIN_PATH is not allowed: ' + ADMIN_PATH);
  process.exit(1);
}

const MAX_JSON = 6 * 1024 * 1024;
const MAX_UPLOAD = 12 * 1024 * 1024; /* 12 MB per file (phone HEIC photos are converted + shrunk on the server) */
const MAX_BACKUP_UPLOAD = 100 * 1024 * 1024;
const SESSION_MS = 12 * 60 * 60 * 1000;
const KEEP_BACKUPS = 10;
const APP_VERSION = (() => { try { return require('./package.json').version; } catch { return ''; } })();

/* ----------------------------------------------------------------- helpers */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8', '.pfb': 'application/octet-stream', '.ttf': 'font/ttf',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8'
};
const TEXTY = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt']);
const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const exists = async p => { try { await fsp.access(p); return true; } catch { return false; } };

/* Supabase mirror: keeps all data safe outside the host's disk (see SUPABASE-SETUP.md). Inactive unless SUPABASE_URL + SUPABASE_SERVICE_KEY are set. */
const cloud = require('./lib/cloud')({ dataDir: DATA_DIR, afterPull: async () => { await loadContent(); await loadReviews(); await loadAuth(); loadStats(); } });
async function writeJSONAtomic(file, obj) {
  const tmp = file + '.' + process.pid + '.' + Date.now() + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(obj, null, 1), 'utf8');
  await fsp.rename(tmp, file);
  cloud.schedule();
}
let chain = Promise.resolve();
const serialize = fn => { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; };

function baseHeaders(extra = {}) {
  return { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', ...extra };
}
/* Compressed copies are made once and kept (key = what the file/page is), so every visit after the first is instant. */
const zCache = new Map();
function zKey(h, buf) { return h.ETag ? h.ETag + '|' + buf.length : null; }
function zGet(kind, key, buf) {
  const k = key && kind + '|' + key; if (k && zCache.has(k)) return zCache.get(k);
  const z = kind === 'br' ? zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: key ? 9 : 4, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }) : zlib.gzipSync(buf, { level: key ? 9 : 6 });
  if (k) { if (zCache.size > 200) zCache.delete(zCache.keys().next().value); zCache.set(k, z); }
  return z;
}
function send(req, res, status, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body ?? ''), 'utf8');
  const h = baseHeaders(headers);
  const type = String(h['Content-Type'] || '');
  const compressible = /text\/|json|javascript|svg/.test(type);
  const ae = String(req.headers['accept-encoding'] || '');
  if (compressible && buf.length > 900 && /\b(br|gzip)\b/.test(ae)) {
    const kind = /\bbr\b/.test(ae) ? 'br' : 'gzip', z = zGet(kind, zKey(h, buf), buf);
    h['Content-Encoding'] = kind; h['Vary'] = 'Accept-Encoding'; h['Content-Length'] = z.length;
    res.writeHead(status, h); res.end(req.method === 'HEAD' ? undefined : z); return;
  }
  h['Content-Length'] = buf.length;
  res.writeHead(status, h); res.end(req.method === 'HEAD' ? undefined : buf);
}
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' };
const sendJSON = (req, res, status, obj, extra = {}) => send(req, res, status, JSON.stringify(obj), { 'Content-Type': MIME['.json'], ...NO_STORE, ...extra });

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    let over = false;
    req.on('data', c => { if (over) return; n += c.length; if (n > limit) { over = true; chunks.length = 0; reject(Object.assign(new Error('Too large'), { status: 413 })); req.resume(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJSON(req, limit = MAX_JSON) {
  const b = await readBody(req, limit);
  try { return JSON.parse(b.toString('utf8') || '{}'); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

async function serveFile(req, res, file, { cache = 'no-cache', fallbackStatus = 404 } = {}) {
  let st;
  try { st = await fsp.stat(file); if (!st.isFile()) throw 0; } catch { return notFound(req, res, fallbackStatus); }
  const ext = path.extname(file).toLowerCase();
  const etag = '"' + st.size.toString(16) + '-' + Math.round(st.mtimeMs).toString(16) + '"';
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, ETag: etag };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, baseHeaders({ ETag: etag, 'Cache-Control': cache })); return res.end(); }
  if (!TEXTY.has(ext) && st.size > 200 * 1024) {      /* photos / PDFs: stream them (supports Range for PDFs and iOS) */
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    let start = 0, end = st.size - 1, code = 200;
    if (m && (m[1] || m[2])) { if (m[1]) { start = +m[1]; if (m[2]) end = Math.min(end, +m[2]); } else { start = Math.max(0, st.size - +m[2]); } if (start > end || start >= st.size) { res.writeHead(416, baseHeaders({ 'Content-Range': 'bytes */' + st.size })); return res.end(); } code = 206; headers['Content-Range'] = `bytes ${start}-${end}/${st.size}`; }
    headers['Accept-Ranges'] = 'bytes'; headers['Content-Length'] = end - start + 1;
    res.writeHead(code, baseHeaders(headers));
    if (req.method === 'HEAD') return res.end();
    const rs = fs.createReadStream(file, { start, end }); rs.on('error', () => res.destroy()); res.on('close', () => rs.destroy()); rs.pipe(res); return;
  }
  const data = await fsp.readFile(file);
  send(req, res, 200, data, headers);
}
function notFound(req, res, status = 404) {
  send(req, res, status, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title><body style="font-family:sans-serif;text-align:center;padding:12vh 20px;color:#4a2f20"><h1>404</h1><p>Page not found.</p><p><a href="/">Back to home</a></p>', { 'Content-Type': MIME['.html'], ...NO_STORE });
}
function safeJoin(base, rel) {
  let p; try { p = decodeURIComponent(rel); } catch { return null; }
  if (p.includes('\0')) return null;
  const full = path.resolve(base, '.' + path.posix.normalize('/' + p));
  return full.startsWith(base + path.sep) || full === base ? full : null;
}

/* ----------------------------------------------------------------- content */
let SEED = null;
let content = null;

const WA_RE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{10,40}\/?(\?[^\s#]*)?$/;
const cleanWaGroup = v => { v = String(v || '').trim(); return WA_RE.test(v) ? v : ''; };
function normalize(c) {
  const d = SEED || {};
  const o = {};
  o.v = Number(c && c.v) || 1;
  for (const k of ['shop', 'site', 'social']) o[k] = { ...(d[k] || {}), ...((c && typeof c[k] === 'object' && c[k]) || {}) };
  o.social.whatsappGroup = cleanWaGroup(o.social.whatsappGroup);
  o.social.whatsappGroupOn = !(o.social.whatsappGroupOn === false || o.social.whatsappGroupOn === 'false' || o.social.whatsappGroupOn === 0);   /* ON by default; old data keeps working */
  if (o.site.typo) o.site.typo = T.sanitize(o.site);
  for (const k of ['categories', 'slides', 'offers', 'why', 'stats', 'strips', 'galleryCategories', 'gallery', 'products', 'testimonials']) {
    o[k] = Array.isArray(c && c[k]) ? c[k] : [];
  }
  o.offers = o.offers.map(x => offerV7(x, o.products));
  { const seen = new Set(); for (const x of o.offers) { if (!x || typeof x !== 'object') continue; let id = String(x.id || '').replace(/[^\w-]/g, ''); if (!id || seen.has(id)) id = 'o' + crypto.randomBytes(4).toString('hex'); seen.add(id); x.id = id; } }
  for (const k of ['phones', 'address', 'hours']) if (!Array.isArray(o.shop[k])) o.shop[k] = o.shop[k] ? [String(o.shop[k])] : [];
  if (!o.shop.phones.length) o.shop.phones = [''];
  return o;
}

const DATA_URI = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=\s]+)$/;
async function externalize(v) {
  if (typeof v === 'string') {
    const m = DATA_URI.exec(v);
    if (m) { const buf = Buffer.from(m[2], 'base64'); const saved = await saveImage(buf); return saved ? saved.url : ''; }
    return v;
  }
  if (Array.isArray(v)) { const r = []; for (const x of v) r.push(await externalize(x)); return r; }
  if (v && typeof v === 'object') { const r = {}; for (const [k, x] of Object.entries(v)) r[k] = await externalize(x); return r; }
  return v;
}

function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buf.length > 12 && buf.slice(0, 4).toString('latin1') === 'GIF8') return 'gif';
  if (buf.length > 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}
/* HEIC/HEIF -> JPEG in a worker thread (never blocks the website) */
function convertHeic(buf) {
  return new Promise((resolve, reject) => {
    let done = false, w;
    const fin = (fn, v) => { if (done) return; done = true; clearTimeout(t); try { w && w.terminate(); } catch { /* ignore */ } fn(v); };
    const t = setTimeout(() => fin(reject, new Error('Converting the HEIC photo took too long.')), 90000);
    try { w = new Worker(path.join(ROOT, 'lib', 'heic-worker.js'), { workerData: { buf, opt: { maxSide: 1800, quality: 84 } }, resourceLimits: { maxOldGenerationSizeMb: 768 } }); }
    catch (e) { return fin(reject, e); }
    w.once('message', m => m && m.ok ? fin(resolve, Buffer.from(m.buf)) : fin(reject, new Error((m && m.error) || 'Could not read this HEIC photo')));
    w.once('error', e => fin(reject, e));
    w.once('exit', c => fin(reject, new Error('The HEIC converter stopped (code ' + c + ')')));
  });
}
async function saveImage(buf) {
  const ext = sniff(buf); if (!ext) return null;
  const name = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 24) + '.' + ext;
  const file = path.join(UPLOAD_DIR, name);
  if (!(await exists(file))) { const tmp = file + '.tmp'; await fsp.writeFile(tmp, buf); await fsp.rename(tmp, file); cloud.schedule(1500); }
  return { name, url: '/uploads/' + name };
}

const strOf = (o, k) => (typeof o[k] === 'string' ? o[k] : '');
function validate(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'Content must be an object';
  for (const k of ['shop', 'site', 'social']) if (!c[k] || typeof c[k] !== 'object' || Array.isArray(c[k])) return `"${k}" is missing`;
  for (const k of ['categories', 'products', 'gallery']) if (!Array.isArray(c[k])) return `"${k}" must be a list`;
  if (!strOf(c.shop, 'name').trim()) return 'Shop name is required';
  const wg = strOf(c.social, 'whatsappGroup').trim();
  if (wg && !WA_RE.test(wg)) return 'The WhatsApp group link must look like https://chat.whatsapp.com/AbCdEfGhIjK (copy it from WhatsApp → Group info → Invite via link).';
  const em = strOf(c.shop, 'email').trim(); if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return 'The shop email address does not look right.';
  const wn = strOf(c.shop, 'whatsapp').replace(/\D/g, ''); if (strOf(c.shop, 'whatsapp').trim() && (wn.length < 8 || wn.length > 15)) return 'The WhatsApp number needs 8 to 15 digits (with country code), for example 919942875331.';
  if (Array.isArray(c.shop.phones)) for (const ph of c.shop.phones) if (String(ph).trim() && String(ph).replace(/\D/g, '').length < 7) return `The phone number "${ph}" is too short.`;
  const cl = strOf(c.site, 'creatorLink').trim(); if (cl && !/^https?:\/\/\S+$/i.test(cl)) return 'The creator website link must start with https://';
  for (const p of c.products) for (const k of ['price', 'mrp']) { const v = p[k]; if (v !== null && v !== undefined && v !== '' && (!isFinite(Number(v)) || Number(v) < 0)) return `Product "${p.name}": ${k === 'mrp' ? 'MRP' : 'price'} must be a number, zero or more.`; }
  for (const o of c.offers || []) for (const k of ['startDate', 'endDate']) if (o && o[k] && !/^\d{4}-\d{2}-\d{2}$/.test(o[k])) return 'An offer has a date that is not valid.';
  for (const k of ['facebook', 'instagram', 'youtube', 'website']) { const v = strOf(c.social, k).trim(); if (v && !/^https?:\/\/[^\s]+$/i.test(v)) return `The ${k} link must start with https://`; }
  for (const p of c.products) if (!p || typeof p !== 'object' || !p.id || !String(p.name || '').trim()) return 'Every product needs an id and a name';
  const ids = new Set();
  for (const p of c.products) { if (ids.has(p.id)) return 'Duplicate product id ' + p.id; ids.add(p.id); }
  return null;
}

/* One-time upgrade of data saved by older versions (a backup copy is made first).
   v6: new default logo, and newest-first order for offers and gallery photos. */
const MIGRATION = 7;
/* v7 offers: one clean structure (theme, tagline, price + old price, items with photo / qty / price, terms, countdown) */
const OFFER_THEMES = ['special', 'diwali', 'pongal', 'puthandu', 'christmas', 'eid', 'newyear', 'sale', 'wholesale', 'new', 'gift'];
function offerV7(o, products) {
  if (!o || typeof o !== 'object') return o;
  if (o.v7) return o;
  const s = v => (v == null ? '' : String(v));
  let items = (Array.isArray(o.plist) ? o.plist : []).filter(x => x && (x.ta || x.en || x.img)).map(x => ({ ta: s(x.ta), en: s(x.en), img: s(x.img), qty: 1, price: '', note: '' }));
  if (!items.length && Array.isArray(o.includes)) items = o.includes.filter(Boolean).map(x => ({ ta: '', en: s(x), img: '', qty: 1, price: '', note: '' }));
  if (!items.length && Array.isArray(o.items)) items = o.items.map(it => { const p = (products || []).find(x => x.id === it.id); return p ? { ta: s(p.nameTa), en: s(p.name), img: s((p.images || [])[0]), qty: Math.max(1, Math.round(Number(it.qty) || 1)), price: it.price === '' || it.price == null ? '' : Number(it.price), note: '' } : null; }).filter(Boolean);
  const th = OFFER_THEMES.includes(o.festival) ? o.festival : (OFFER_THEMES.includes(o.badge && String(o.badge).toLowerCase()) ? String(o.badge).toLowerCase() : 'special');
  return { v7: true, id: o.id, active: o.active !== false, theme: th, badge: s(o.badge), titleTa: s(o.titleTa), titleEn: s(o.titleEn), tagTa: s(o.textTa), tagEn: s(o.textEn),
    image: s(o.image), photos: Array.isArray(o.photos) ? o.photos.filter(Boolean) : [], startDate: s(o.startDate), endDate: s(o.endDate), timer: true,
    price: o.bundlePrice === '' || o.bundlePrice == null ? '' : Number(o.bundlePrice), oldPrice: '', items, detailsTa: s(o.detailsTa), detailsEn: s(o.detailsEn), termsTa: '', termsEn: '',
    ctaTa: s(o.ctaTa), ctaEn: s(o.ctaEn), link: s(o.link), wa: true, addedAt: Number(o.addedAt) || 0 };
}
async function migrateRaw(raw) {
  if (!raw || typeof raw !== 'object' || !raw.site) return raw;
  if ((Number(raw.site.mig) || 0) >= MIGRATION) return raw;
  try { await fsp.copyFile(CONTENT_FILE, path.join(BACKUP_DIR, `content-before-upgrade-${Date.now()}.json`)); } catch { /* first start */ }
  if (!raw.site.logo || raw.site.logo === OLD_DEFAULT_LOGO) { raw.site.logo = DEFAULT_LOGO; raw.site.uiLogoText = false; }
  if ((Number(raw.site.mig) || 0) < 6) { if (Array.isArray(raw.offers)) raw.offers.reverse(); if (Array.isArray(raw.gallery)) raw.gallery.reverse(); }
  if (Array.isArray(raw.offers)) raw.offers = raw.offers.map(o => offerV7(o, raw.products));
  raw.site.mig = MIGRATION;
  await writeJSONAtomic(CONTENT_FILE, raw);
  return raw;
}
async function loadContent() {
  try { content = normalize(await migrateRaw(JSON.parse(await fsp.readFile(CONTENT_FILE, 'utf8')))); }
  catch (e) { console.error('Could not read content.json, using starter content:', e.message); content = normalize(SEED); }
}
async function backupCurrent() {
  if (!(await exists(CONTENT_FILE))) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fsp.copyFile(CONTENT_FILE, path.join(BACKUP_DIR, `content-${stamp}-v${content.v}.json`));
  const files = (await fsp.readdir(BACKUP_DIR)).filter(f => f.startsWith('content-')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP_BACKUPS))) await fsp.unlink(path.join(BACKUP_DIR, f)).catch(() => {});
}
function saveContent(next) {
  return serialize(async () => {
    await backupCurrent();
    const v = Math.max(Date.now(), content.v + 1);
    const out = normalize({ ...next, v });
    await writeJSONAtomic(CONTENT_FILE, out);
    content = out;
    return out;
  });
}

async function referencedUploads() {
  const refs = new Set();
  const scan = v => {
    if (typeof v === 'string') { const m = v.match(/\/uploads\/[A-Za-z0-9._-]+/g); if (m) m.forEach(x => refs.add(x.slice(9))); }
    else if (Array.isArray(v)) v.forEach(scan);
    else if (v && typeof v === 'object') Object.values(v).forEach(scan);
  };
  scan(content); refs.add(DEFAULT_LOGO.slice(9));
  for (const f of await fsp.readdir(BACKUP_DIR).catch(() => [])) {
    try { scan(JSON.parse(await fsp.readFile(path.join(BACKUP_DIR, f), 'utf8'))); } catch { /* ignore */ }
  }
  return refs;
}

/* -------------------------------------------------------------------- auth */
// Login = username + ONE password: either password 1 or password 2 works. Only scrypt hashes are stored.
let auth = null, authMtime = 0; // { user, s1, h1, s2, h2, mustChange, epoch }
const sessions = new Map(); // token -> { c: created, l: last activity, ep: auth epoch }
const attempts = new Map(); // ip -> { n, until }
const globalFail = { n: 0, until: 0 };

const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
const pwOk = next => typeof next === 'string' && next.length >= 8 && next.length <= 200 && /[A-Za-z]/.test(next) && /[0-9]/.test(next);
const PW_RULE = 'Each password needs at least 8 characters with letters and numbers, and password 1 and 2 must be different.';
const userOk = u => typeof u === 'string' && /^[A-Za-z0-9._@-]{3,40}$/.test(u.trim());
const authValid = a => a && typeof a.user === 'string' && ['s1', 'h1', 's2', 'h2'].every(k => typeof a[k] === 'string' && a[k]);
async function readAuthFile() { const a = JSON.parse(await fsp.readFile(AUTH_FILE, 'utf8')); if (!authValid(a)) throw 0; auth = a; authMtime = (await fsp.stat(AUTH_FILE)).mtimeMs; }
async function loadAuth() {
  try { await readAuthFile(); return; } catch { /* create from the built-in defaults */ }
  const d = JSON.parse(await fsp.readFile(path.join(ROOT, 'lib', 'default-admin.json'), 'utf8'));
  auth = { ...d, mustChange: false, epoch: Date.now() };
  await writeJSONAtomic(AUTH_FILE, auth); authMtime = (await fsp.stat(AUTH_FILE)).mtimeMs;
  console.log('  Admin login created with the default username and passwords. Change them in Backup & Security.');
}
async function refreshAuth() { try { const st = await fsp.stat(AUTH_FILE); if (st.mtimeMs !== authMtime) await readAuthFile(); } catch { /* keep current */ } }
async function saveAuth(user, p1, p2) {   // p1 / p2: new password, or null to keep the current one
  const n = { user, s1: auth.s1, h1: auth.h1, s2: auth.s2, h2: auth.h2, mustChange: false, epoch: Date.now() };
  if (p1) { n.s1 = crypto.randomBytes(16).toString('hex'); n.h1 = hashPw(p1, n.s1); }
  if (p2) { n.s2 = crypto.randomBytes(16).toString('hex'); n.h2 = hashPw(p2, n.s2); }
  auth = n; await writeJSONAtomic(AUTH_FILE, auth); authMtime = (await fsp.stat(AUTH_FILE)).mtimeMs;
}
function eqHash(pw, salt, hash) {
  if (typeof pw !== 'string' || pw.length > 200) return false;
  const a = Buffer.from(hashPw(pw, salt), 'hex'), b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const checkPw = p => { const x = eqHash(p, auth.s1, auth.h1), y = eqHash(p, auth.s2, auth.h2); return x || y; };   // password 1 OR 2
const checkUser = u => { const a = Buffer.from(sha256(String(u || '').trim().toLowerCase()), 'hex'), b = Buffer.from(sha256(auth.user.toLowerCase()), 'hex'); return crypto.timingSafeEqual(a, b); };
const clientIp = req => (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'x';
function cookies(req) {
  const o = {}; String(req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return o;
}
function sessionOf(req, touch = true) {
  const t = cookies(req).cx_sid; if (!t) return null;
  const s = sessions.get(t); if (!s) return null;
  const now = Date.now();
  if (now - s.c > SESSION_MS || now - s.l > IDLE_MS || s.ep !== (auth.epoch || 0)) { sessions.delete(t); return null; }
  if (touch) s.l = now;
  return t;
}
const isHttps = req => !!req.socket.encrypted || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https') || FORCE_HTTPS || process.env.FORCE_SECURE_COOKIE === '1';
/* maxAge null = browser-session cookie (disappears when the browser is closed) */
function cookieHeader(req, token, maxAge) {
  return `cx_sid=${token}; HttpOnly; SameSite=Strict; Path=${ADMIN_PATH}${maxAge == null ? '' : '; Max-Age=' + maxAge}${isHttps(req) ? '; Secure' : ''}`;
}
setInterval(() => { const n = Date.now(); for (const [t, s] of sessions) if (n - s.c > SESSION_MS || n - s.l > IDLE_MS) sessions.delete(t); for (const [k, v] of attempts) if (v.until < n) attempts.delete(k); }, 5 * 60 * 1000).unref();
const sha256 = x => crypto.createHash('sha256').update(String(x)).digest('hex');


/* ------------------------------------------------------------ visitor stats */
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const TZ_MIN = Number(process.env.STATS_TZ_OFFSET_MIN || 330);       // minutes ahead of UTC (330 = India)
const dayKey = (ms = Date.now()) => new Date(ms + TZ_MIN * 60000).toISOString().slice(0, 10);
let stats = { total: { views: 0, visitors: 0 }, seen: {}, days: {} };   // seen: visitorHash -> 1 ; days[d] = {views, ids:[hash]}
const live = new Map(), hitRate = new Map(); let statsDirty = false;
const vhash = s => crypto.createHash('sha256').update('cx|' + s).digest('hex').slice(0, 14);
function loadStats() { try { const j = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); if (j && j.days) stats = { total: j.total || { views: 0, visitors: 0 }, seen: j.seen || {}, days: j.days }; } catch { /* first run */ } }
function saveStats() {
  if (!statsDirty) return; statsDirty = false;
  const keep = Object.keys(stats.days).sort().slice(-800); const d = {}; for (const k of keep) d[k] = stats.days[k];
  const cut = dayKey(Date.now() - 70 * 86400000); for (const k of Object.keys(d)) if (k < cut && d[k].ids) { d[k] = { views: d[k].views, visitors: d[k].visitors ?? d[k].ids.length }; }
  stats.days = d;
  const tmp = STATS_FILE + '.tmp'; try { fs.writeFileSync(tmp, JSON.stringify(stats)); fs.renameSync(tmp, STATS_FILE); } catch (e) { console.error('stats save failed', e.message); }
}
function recordHit(req, body) {
  const ua = String(req.headers['user-agent'] || ''); if (!ua || /bot|crawl|spider|slurp|preview|curl|wget|facebookexternalhit|monitor|uptime/i.test(ua)) return;
  const ip = clientIp(req), now = Date.now(); const r = hitRate.get(ip) || { n: 0, t: now }; if (now - r.t > 60000) { r.n = 0; r.t = now; } if (++r.n > 90) return; hitRate.set(ip, r);
  const raw = String(body.v || '').replace(/[^\w-]/g, '').slice(0, 40); if (raw.length < 8) return;
  const id = vhash(raw); live.set(id, now);
  if (body.t !== 'view') return;
  const k = dayKey(now), d = stats.days[k] || (stats.days[k] = { views: 0, ids: [], visitors: 0 });
  if (!d.ids) d.ids = [];
  d.views++; stats.total.views++;
  if (!d.ids.includes(id)) { d.ids.push(id); d.visitors = d.ids.length; }
  if (!stats.seen[id]) { stats.seen[id] = 1; stats.total.visitors++; }
  statsDirty = true;
}
function statsSummary() {
  const now = Date.now(), today = dayKey(now), month = today.slice(0, 7), d7 = new Set(Array.from({ length: 7 }, (_, i) => dayKey(now - i * 86400000))), d30 = new Set(Array.from({ length: 30 }, (_, i) => dayKey(now - i * 86400000)));
  const agg = pred => { let views = 0; const ids = new Set(); let extra = 0; for (const [k, d] of Object.entries(stats.days)) if (pred(k)) { views += d.views || 0; if (d.ids) d.ids.forEach(x => ids.add(x)); else extra += d.visitors || 0; } return { views, visitors: ids.size + extra }; };
  const days = Array.from({ length: 14 }, (_, i) => { const k = dayKey(now - (13 - i) * 86400000), d = stats.days[k] || {}; return { date: k, views: d.views || 0, visitors: d.ids ? d.ids.length : (d.visitors || 0) }; });
  let liveN = 0; for (const [id, ts] of live) { if (now - ts < 75000) liveN++; else if (now - ts > 600000) live.delete(id); }
  return { live: liveN, today: agg(k => k === today), d7: agg(k => d7.has(k)), d30: agg(k => d30.has(k)), month: agg(k => k.startsWith(month)), total: { ...stats.total }, days, tz: TZ_MIN };
}
loadStats(); setInterval(saveStats, 10000).unref(); setInterval(() => { const n = Date.now(); for (const [k, v] of hitRate) if (n - v.t > 120000) hitRate.delete(k); }, 120000).unref();
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { saveStats(); let done = false; const bye = () => { if (!done) { done = true; process.exit(0); } }; setTimeout(bye, 9500); cloud.flush(9000).then(bye, bye); });
process.on('exit', saveStats);

/* --------------------------- safe ZIP backup helpers (no dependencies) */
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); }
  return (c ^ 0xffffffff) >>> 0;
}
function makeZip(entries) {
  const locals = [], centrals = []; let offset = 0;
  for (const ent of entries) {
    const name = Buffer.from(ent.name.replace(/\\/g, '/'), 'utf8');
    const raw = Buffer.isBuffer(ent.data) ? ent.data : Buffer.from(ent.data);
    const deflated = zlib.deflateRawSync(raw, { level: 6 });
    const useDeflate = deflated.length < raw.length; const body = useDeflate ? deflated : raw; const method = useDeflate ? 8 : 0; const crc = crc32(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50,0); lh.writeUInt16LE(20,4); lh.writeUInt16LE(0x0800,6); lh.writeUInt16LE(method,8); lh.writeUInt32LE(crc,14); lh.writeUInt32LE(body.length,18); lh.writeUInt32LE(raw.length,22); lh.writeUInt16LE(name.length,26);
    locals.push(lh,name,body);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50,0); ch.writeUInt16LE(20,4); ch.writeUInt16LE(20,6); ch.writeUInt16LE(0x0800,8); ch.writeUInt16LE(method,10); ch.writeUInt32LE(crc,16); ch.writeUInt32LE(body.length,20); ch.writeUInt32LE(raw.length,24); ch.writeUInt16LE(name.length,28); ch.writeUInt32LE(offset,42);
    centrals.push(ch,name); offset += lh.length + name.length + body.length;
  }
  const central = Buffer.concat(centrals), local = Buffer.concat(locals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(entries.length,8); end.writeUInt16LE(entries.length,10); end.writeUInt32LE(central.length,12); end.writeUInt32LE(local.length,16);
  return Buffer.concat([local,central,end]);
}
function readZip(buf) {
  const out = new Map(); let p = 0, count = 0;
  while (p + 30 <= buf.length && buf.readUInt32LE(p) === 0x04034b50) {
    if (++count > 10000) throw new Error('Too many files in ZIP');
    const flags=buf.readUInt16LE(p+6), method=buf.readUInt16LE(p+8), crc=buf.readUInt32LE(p+14), csize=buf.readUInt32LE(p+18), usize=buf.readUInt32LE(p+22), nl=buf.readUInt16LE(p+26), el=buf.readUInt16LE(p+28);
    if (flags & 1) throw new Error('Encrypted ZIP files are not supported');
    const start=p+30, name=buf.subarray(start,start+nl).toString('utf8'); const dataStart=start+nl+el, dataEnd=dataStart+csize;
    const unsafe = !name || name.startsWith('/') || name.includes('\\') || name.split('/').some(x => x === '..');   /* skipped, never fatal */
    if (dataEnd > buf.length || usize > MAX_BACKUP_UPLOAD) throw new Error('Invalid or oversized ZIP entry');
    const comp=buf.subarray(dataStart,dataEnd); let data;
    if (method===0) data=Buffer.from(comp); else if (method===8) data=zlib.inflateRawSync(comp); else throw new Error('Unsupported ZIP compression');
    if (data.length !== usize || crc32(data) !== crc) throw new Error('ZIP integrity check failed');
    if (!unsafe && !name.endsWith('/')) out.set(name,data);   /* a repeated name: the last one wins */
    p=dataEnd;
  }
  if (!out.size) throw new Error('No files found in ZIP');
  return out;
}
/* ----------------------------------------------------------- customer reviews */
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
let reviews = [];
const RV_STATUS = ['pending', 'approved', 'hidden'];
async function loadReviews() { try { const j = JSON.parse(await fsp.readFile(REVIEWS_FILE, 'utf8')); reviews = Array.isArray(j.items) ? j.items : []; } catch { reviews = []; } }
let rvVer = 1;
const saveReviews = () => { rvVer++; return serialize(() => writeJSONAtomic(REVIEWS_FILE, { items: reviews })); };
const rvClean = (v, max) => String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const rvStar = v => Math.min(5, Math.max(1, Math.round(Number(v)) || 5));
const rvDate = v => { const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString(); };
function publicReviews() {
  return reviews.filter(r => r.status === 'approved').sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || String(b.date).localeCompare(String(a.date))).slice(0, 120)
    .map(r => ({ id: r.id, name: r.name, rating: r.rating, text: r.text, date: r.date, reply: r.reply || '', featured: !!r.featured }));
}
const publicContent = () => ({ ...content, reviews: publicReviews() });
const rvRate = new Map();
function rvLimited(req) {
  const ip = clientIp(req), now = Date.now(); const a = (rvRate.get(ip) || []).filter(t => now - t < 3600000);
  if (a.length >= 3) { rvRate.set(ip, a); return true; } a.push(now); rvRate.set(ip, a);
  if (rvRate.size > 5000) for (const [k, v] of rvRate) if (!v.some(t => now - t < 3600000)) rvRate.delete(k);
  return false;
}
async function submitReview(req, res) {
  const o = req.headers.origin; if (o) { try { if (new URL(o).host !== req.headers.host) return sendJSON(req, res, 403, { error: 'Forbidden' }); } catch { return sendJSON(req, res, 403, { error: 'Forbidden' }); } }
  if (content.site.reviewForm === false) return sendJSON(req, res, 403, { error: 'Reviews are closed.' });
  let b; try { b = await readJSON(req, 8192); } catch (e) { return sendJSON(req, res, e.status || 400, { error: 'Invalid request' }); }
  if (b.website || b.url) return sendJSON(req, res, 200, { ok: true, status: 'pending' });          // honeypot: pretend success
  if (Number(b.t) < 2500) return sendJSON(req, res, 200, { ok: true, status: 'pending' });          // submitted faster than a human can
  const name = rvClean(b.name, 60), text = rvClean(b.text, 500), rating = Number(b.rating);
  if (name.length < 2) return sendJSON(req, res, 400, { error: 'name' });
  if (text.length < 1) return sendJSON(req, res, 400, { error: 'text' });
  if (!(rating >= 1 && rating <= 5)) return sendJSON(req, res, 400, { error: 'rating' });
  if (/https?:\/\/|www\./i.test(text + ' ' + name)) return sendJSON(req, res, 400, { error: 'links' });
  if (rvLimited(req)) return sendJSON(req, res, 429, { error: 'limit' });
  if (reviews.some(r => r.text === text && r.name === name)) return sendJSON(req, res, 200, { ok: true, status: 'pending' });
  if (reviews.filter(r => r.status === 'pending').length >= 300) return sendJSON(req, res, 503, { error: 'busy' });
  const status = content.site.reviewAuto === true ? 'approved' : 'pending';
  reviews.push({ id: 'r' + crypto.randomBytes(6).toString('hex'), name, rating: rvStar(rating), text, status, source: 'customer', date: new Date().toISOString(), reply: '', featured: false });
  await saveReviews();
  return sendJSON(req, res, 200, { ok: true, status });
}
function rvFromAdmin(b, base = {}) {
  const r = { ...base };
  if ('name' in b) r.name = rvClean(b.name, 60);
  if ('text' in b) r.text = rvClean(b.text, 1000);
  if ('rating' in b) r.rating = rvStar(b.rating);
  if ('status' in b && RV_STATUS.includes(b.status)) r.status = b.status;
  if ('reply' in b) r.reply = rvClean(b.reply, 500);
  if ('date' in b) r.date = rvDate(b.date);
  if ('featured' in b) r.featured = !!b.featured;
  if ('note' in b) r.note = rvClean(b.note, 300);
  return r;
}
async function reviewsAdmin(req, res, route, method) {
  if (route === '/reviews' && method === 'GET') return sendJSON(req, res, 200, { items: [...reviews].sort((a, b) => String(b.date).localeCompare(String(a.date))), pending: reviews.filter(r => r.status === 'pending').length });
  if (route === '/reviews' && method === 'POST') {
    const r = rvFromAdmin(await readJSON(req, 16384), { id: 'r' + crypto.randomBytes(6).toString('hex'), status: 'approved', source: 'admin', date: new Date().toISOString(), rating: 5, reply: '', featured: false });
    if (!r.name || r.name.length < 2 || !r.text || r.text.length < 1) return sendJSON(req, res, 400, { error: 'Enter the customer name and the review text.' });
    reviews.push(r); await saveReviews(); return sendJSON(req, res, 200, { ok: true, item: r });
  }
  const m = route.match(/^\/reviews\/(r[0-9a-f]{12})$/); if (!m) return null;
  const i = reviews.findIndex(r => r.id === m[1]); if (i < 0) return sendJSON(req, res, 404, { error: 'Review not found' });
  if (method === 'PUT') {
    const n = rvFromAdmin(await readJSON(req, 16384), reviews[i]);
    if (!n.name || n.name.length < 2 || !n.text || n.text.length < 1) return sendJSON(req, res, 400, { error: 'Name and review text cannot be empty.' });
    reviews[i] = n; await saveReviews(); return sendJSON(req, res, 200, { ok: true, item: n });
  }
  if (method === 'DELETE') { reviews.splice(i, 1); await saveReviews(); return sendJSON(req, res, 200, { ok: true }); }
  return sendJSON(req, res, 405, { error: 'Method not allowed' });
}

async function fullBackupZip(includeAuth) {
  const entries=[];
  const add=async (file, name) => { if (await exists(file)) entries.push({name, data: await fsp.readFile(file)}); };
  await add(CONTENT_FILE,'data/content.json'); await add(STATS_FILE,'data/stats.json'); await add(REVIEWS_FILE,'data/reviews.json');
  if (includeAuth) await add(AUTH_FILE,'data/admin.json');   /* optional: admin username + password HASHES (never plain passwords) */
  for (const dir of [UPLOAD_DIR, BACKUP_DIR]) {
    if (!(await exists(dir))) continue;
    for (const f of await fsp.readdir(dir)) {
      if (dir===BACKUP_DIR && !/^content-[\w.-]+\.json$/.test(f)) continue;
      const fp=path.join(dir,f); if ((await fsp.stat(fp)).isFile()) entries.push({name:(dir===UPLOAD_DIR?'data/uploads/':'data/backups/')+f,data:await fsp.readFile(fp)});
    }
  }
  entries.push({name:'manifest.json',data:JSON.stringify({app:'classix-home-needs',appVersion:APP_VERSION,backupFormat:2,created:new Date().toISOString(),includesAdminLogin:!!includeAuth},null,1)});
  entries.push({name:'BACKUP-INFO.txt',data:'Classic Home Needs full data backup. Includes ALL website content and settings (shop details, offers, products, gallery, social links, WhatsApp group switch, typography, menu), every uploaded photo/PDF, customer reviews, visitor statistics and content-version backups.'+(includeAuth?' It ALSO contains the admin login (username + hashed passwords) - keep this ZIP private.':' The admin login is NOT included (a restore keeps the current admin password).')+' Restore: Admin > Backup & Security > Restore full backup (.zip) - works on this site or on a brand-new copy of the website.\n'});
  return makeZip(entries);
}

/* -------------------------------------------------------------- admin API */
async function adminApi(req, res, route) {
  const method = req.method;
  await refreshAuth();
  const mutating = method !== 'GET' && method !== 'HEAD';
  if (mutating) {
    if (req.headers['x-requested-with'] !== 'cx') return sendJSON(req, res, 403, { error: 'Forbidden' });
    const o = req.headers.origin;
    if (o) { try { if (new URL(o).host !== req.headers.host) return sendJSON(req, res, 403, { error: 'Forbidden' }); } catch { return sendJSON(req, res, 403, { error: 'Forbidden' }); } }
  }

  if (route === '/session' && method === 'GET') {
    await refreshAuth();
    let t = sessionOf(req, false); const extra = {};
    if (t && REAUTH_ON_LOAD && new URL(req.url, 'http://x').searchParams.get('fresh') === '1') { sessions.delete(t); t = null; extra['Set-Cookie'] = cookieHeader(req, '', 0); }
    return sendJSON(req, res, 200, { authed: !!t, mustChange: !!(t && auth.mustChange), idleMinutes: IDLE_MS / 60000 }, extra);
  }
  if (route === '/login' && method === 'POST') {
    await refreshAuth();
    const ip = clientIp(req); const a = attempts.get(ip) || { n: 0, until: 0 };
    if ((a.n >= 5 && a.until > Date.now()) || (globalFail.n >= 50 && globalFail.until > Date.now())) return sendJSON(req, res, 429, { error: 'Too many attempts. Try again in a few minutes.' });
    const body = await readJSON(req, 10 * 1024);
    const uOk = checkUser(body.username), pOk = checkPw(body.password);
    if (!(uOk && pOk)) {
      a.n += 1; a.until = Date.now() + 15 * 60 * 1000; attempts.set(ip, a);
      globalFail.n += 1; globalFail.until = Date.now() + 15 * 60 * 1000;
      await new Promise(r => setTimeout(r, 500 + Math.min(a.n, 6) * 300));
      return sendJSON(req, res, 401, { error: 'Wrong username or password' });
    }
    attempts.delete(ip); globalFail.n = 0;
    const token = crypto.randomBytes(32).toString('hex'), now = Date.now();
    sessions.set(token, { c: now, l: now, ep: auth.epoch || 0 });
    return sendJSON(req, res, 200, { ok: true, mustChange: !!auth.mustChange, idleMinutes: IDLE_MS / 60000 }, { 'Set-Cookie': cookieHeader(req, token, null) });
  }
  const tok = sessionOf(req, req.headers['x-poll'] !== '1');
  if (!tok) return sendJSON(req, res, 401, { error: 'Please sign in' });

  if (route === '/logout' && method === 'POST') {
    sessions.delete(tok);
    return sendJSON(req, res, 200, { ok: true }, { 'Set-Cookie': cookieHeader(req, '', 0) });
  }
  if (route === '/password' && method === 'POST') {
    const b = await readJSON(req, 10 * 1024);
    if (!checkPw(b.current)) return sendJSON(req, res, 400, { error: 'Current password is wrong' });
    const user = String(b.username || auth.user).trim(), n1 = b.next1 || null, n2 = b.next2 || null;
    if (!userOk(user)) return sendJSON(req, res, 400, { error: 'Username: 3-40 letters, numbers or . _ @ -' });
    if ((n1 && !pwOk(n1)) || (n2 && !pwOk(n2)) || (n1 && n2 && n1 === n2) || (n1 && eqHash(n1, auth.s2, auth.h2)) || (n2 && eqHash(n2, auth.s1, auth.h1))) return sendJSON(req, res, 400, { error: PW_RULE });
    await saveAuth(user, n1, n2); sessions.clear();
    const now = Date.now(); sessions.set(tok, { c: now, l: now, ep: auth.epoch });
    return sendJSON(req, res, 200, { ok: true, username: auth.user });
  }

  /* everything below needs the password to have been changed first */
  if (auth.mustChange) return sendJSON(req, res, 403, { error: 'Please change the default password first', mustChange: true });

  if (route === '/content' && method === 'GET') return sendJSON(req, res, 200, content);

  if (route === '/content' && method === 'PUT') {
    const body = await readJSON(req);
    if (Number(body.baseV) !== content.v) return sendJSON(req, res, 409, { error: 'The website content was changed somewhere else (another tab or device). Reload this page and try again.', v: content.v });
    let next = body.content;
    const err = validate(next); if (err) return sendJSON(req, res, 400, { error: err });
    next = await externalize(next);
    const out = await saveContent(next);
    return sendJSON(req, res, 200, { ok: true, v: out.v, content: body.replace ? out : undefined });
  }

  if (route === '/upload' && method === 'POST') {
    let buf; try { buf = await readBody(req, MAX_UPLOAD); } catch (e) { if (e.status === 413) return sendJSON(req, res, 413, { error: 'File is too big. The maximum size is 12 MB per file.' }); throw e; }
    if (!buf.length) return sendJSON(req, res, 400, { error: 'The file is empty.' });
    if (isHeic(buf)) {
      try { buf = await convertHeic(buf); }
      catch (e) { console.error('HEIC conversion failed:', e.message); return sendJSON(req, res, 422, { error: 'This HEIC photo could not be converted. Please set the phone camera to "Most Compatible" (JPEG) or try another photo.', heicFail: true }); }
    }
    const saved = await saveImage(buf);
    if (!saved) return sendJSON(req, res, 400, { error: 'This file type is not allowed. Please use JPG, PNG, HEIC or PDF.' });
    return sendJSON(req, res, 200, { ok: true, url: saved.url });
  }

  if (route === '/backup/export' && method === 'GET') {
    const zip = await fullBackupZip(new URL(req.url, 'http://x').searchParams.get('auth') === '1');
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}-${String(d.getSeconds()).padStart(2,'0')}`;
    return send(req, res, 200, zip, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="classix-home-needs-full-backup-${stamp}.zip"`, ...NO_STORE });
  }
  if (route === '/backup/restore' && method === 'POST') {
    const ct=String(req.headers['content-type']||''); if (!/application\/zip|application\/octet-stream/i.test(ct)) return sendJSON(req,res,415,{error:'Upload a ZIP backup file.'});
    const raw=await readBody(req,MAX_BACKUP_UPLOAD); let files;
    try { files=readZip(raw); } catch(e) { return sendJSON(req,res,400,{error:'Invalid backup ZIP: '+e.message}); }
    /* Tolerant restore: accepts backups from any version, with or without a wrapping folder; never fails on small differences. */
    { const names=[...files.keys()]; const hit=names.find(n=>/(^|\/)data\/content\.json$/.test(n)) || names.find(n=>/(^|\/)content\.json$/.test(n));
      if (hit) { const pre=hit.replace(/data\/content\.json$|content\.json$/,''); const m=new Map();
        for (const [n,d] of files) { let r=pre&&n.startsWith(pre)?n.slice(pre.length):n; if (!r.startsWith('data/') && /^(content|stats|reviews|admin)\.json$|^(uploads|backups)\//.test(r)) r='data/'+r; m.set(r,d); }
        files=m; } }
    const contentBuf=files.get('data/content.json'); if (!contentBuf) return sendJSON(req,res,400,{error:'This ZIP does not contain content.json, so it is not a website backup.'});
    let incoming; try { incoming=JSON.parse(contentBuf.toString('utf8').replace(/^\uFEFF/,'')); } catch { return sendJSON(req,res,400,{error:'The backup content file is damaged (not valid JSON).'}); }
    const warnings=[]; let normalized, validation;
    try { normalized=normalize(incoming); validation=validate(normalized); } catch(e) { validation='unreadable ('+e.message+')'; }
    if (validation) {   /* backup from an older/newer version: fill the gaps from the default content and try again */
      try {
        const merged={...SEED,...incoming};
        for (const k of Object.keys(SEED)) if (SEED[k]&&typeof SEED[k]==='object'&&!Array.isArray(SEED[k])&&incoming[k]&&typeof incoming[k]==='object'&&!Array.isArray(incoming[k])) merged[k]={...SEED[k],...incoming[k]};
        normalized=normalize(merged); validation=validate(normalized); if (!validation) warnings.push('Some settings were missing in the backup and were filled with defaults.');
      } catch(e) { validation=validation||e.message; }
    }
    if (validation) return sendJSON(req,res,400,{error:'The backup could not be read: '+validation});
    // Preserve the current state before applying anything; password file is intentionally never restored.
    await backupCurrent();
    const oldZip=await fullBackupZip(true); await fsp.writeFile(path.join(BACKUP_DIR,`pre-restore-${Date.now()}.zip`),oldZip).catch(()=>{});
    try { const pre=(await fsp.readdir(BACKUP_DIR)).filter(f=>/^pre-restore-\d+\.zip$/.test(f)).sort(); for (const f of pre.slice(0,Math.max(0,pre.length-3))) await fsp.unlink(path.join(BACKUP_DIR,f)).catch(()=>{}); } catch { /* ignore */ }
    const incomingUploads=[];
    for (const [name,data] of files) {
      if (!name.startsWith('data/uploads/') || name.length<=13) continue;
      const base=name.slice(13);
      if (!/^[A-Za-z0-9._-]+$/.test(base) || base==='.' || base==='..' || !sniff(data)) { warnings.push('Skipped unsupported file: '+base.slice(0,50)); continue; }
      incomingUploads.push([name,data]);
    }
    await fsp.mkdir(UPLOAD_DIR,{recursive:true}); await fsp.mkdir(BACKUP_DIR,{recursive:true});
    // Keep existing uploads too, so content referencing an image omitted from a partial ZIP cannot break the site.
    for (const [name,data] of incomingUploads) await fsp.writeFile(path.join(UPLOAD_DIR,name.slice('data/uploads/'.length)),data);
    normalized.v=Math.max(Date.now(),(content&&content.v||0)+1); /* newer than the live site so every visitor refreshes */
    await writeJSONAtomic(CONTENT_FILE,normalized); content=normalized;
    const statsBuf=files.get('data/stats.json'); if (statsBuf) { try { const st=JSON.parse(statsBuf.toString('utf8')); if (st && st.days && st.total) { await writeJSONAtomic(STATS_FILE,st); stats=st; statsDirty=false; } } catch { /* leave current stats untouched */ } }
    const rvBuf=files.get('data/reviews.json'); if (rvBuf) { try { const j=JSON.parse(rvBuf.toString('utf8')); if (Array.isArray(j.items)) { reviews=j.items.filter(r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&typeof r.text==='string'&&RV_STATUS.includes(r.status)).slice(0,5000); await saveReviews(); } } catch { /* keep current reviews */ } }
    for (const [name,data] of files) {
      if (name.startsWith('data/backups/') && /^data\/backups\/content-[\w.-]+\.json$/.test(name)) {
        const base=name.slice('data/backups/'.length); try { JSON.parse(data.toString('utf8')); await fsp.writeFile(path.join(BACKUP_DIR,base),data); } catch { /* skip malformed historical backup */ }
      }
    }
    let loggedOut=false, authRestored=false;
    const authBuf=files.get('data/admin.json');
    if (authBuf && new URL(req.url,'http://x').searchParams.get('auth')==='1') {
      try { const a=JSON.parse(authBuf.toString('utf8')); if (authValid(a)) { auth={user:a.user,s1:a.s1,h1:a.h1,s2:a.s2,h2:a.h2,mustChange:false,epoch:Date.now()}; await writeJSONAtomic(AUTH_FILE,auth); authMtime=(await fsp.stat(AUTH_FILE)).mtimeMs; sessions.clear(); loggedOut=true; authRestored=true; } } catch { /* keep current login */ }
    }
    cloud.schedule(500);
    return sendJSON(req,res,200,{ok:true,loggedOut,warnings:warnings.slice(0,10),message:(warnings.length?'Restored (with small notes: '+warnings.slice(0,3).join(' ')+') ':'')+(authRestored?'Backup restored including the admin login. Please sign in again with the backup\'s username and password.':'Backup restored. Admin password was kept unchanged.'),content});
  }
  if (route === '/cloud/status' && method === 'GET') return sendJSON(req, res, 200, { ...cloud.status(), keepAwake: kaInfo() });
  if (route === '/keepawake' && method === 'POST') {
    const b = (await readJSON(req)) || {}; if ('enabled' in b) KEEP_AWAKE_ON = !!b.enabled; if ('minutes' in b) { KEEP_AWAKE_MIN = clampMin(b.minutes); kaRestart(); }
    await writeJSONAtomic(KA_FILE, { keepAwake: KEEP_AWAKE_ON, minutes: KEEP_AWAKE_MIN });
    return sendJSON(req, res, 200, { ...cloud.status(), keepAwake: kaInfo() });
  }
  if (route === '/cloud/sync' && method === 'POST') { await cloud.syncNow(); return sendJSON(req, res, 200, { ...cloud.status(), keepAwake: kaInfo() }); }
  if (route === '/stats' && method === 'GET') return sendJSON(req, res, 200, statsSummary());
  if (route === '/backups' && method === 'GET') {
    const files = (await fsp.readdir(BACKUP_DIR)).filter(f => f.startsWith('content-')).sort().reverse();
    const list = [];
    for (const f of files) { const st = await fsp.stat(path.join(BACKUP_DIR, f)); list.push({ name: f, time: st.mtimeMs, size: st.size }); }
    return sendJSON(req, res, 200, { backups: list });
  }
  if (route === '/restore' && method === 'POST') {
    const b = await readJSON(req, 10 * 1024);
    const name = path.basename(String(b.name || ''));
    if (!/^content-[\w.-]+\.json$/.test(name)) return sendJSON(req, res, 400, { error: 'Bad backup name' });
    let data; try { data = JSON.parse(await fsp.readFile(path.join(BACKUP_DIR, name), 'utf8')); } catch { return sendJSON(req, res, 404, { error: 'Backup not found' }); }
    const err = validate(normalize(data)); if (err) return sendJSON(req, res, 400, { error: err });
    const out = await saveContent(data);
    return sendJSON(req, res, 200, { ok: true, v: out.v, content: out });
  }
  if (route === '/cleanup' && method === 'POST') {
    const refs = await referencedUploads(); let removed = 0, bytes = 0;
    for (const f of await fsp.readdir(UPLOAD_DIR)) {
      if (f.endsWith('.tmp') || refs.has(f)) continue;
      const p = path.join(UPLOAD_DIR, f); const st = await fsp.stat(p);
      if (Date.now() - st.mtimeMs < 60 * 60 * 1000) continue; // keep very recent uploads
      await fsp.unlink(p).catch(() => {}); removed++; bytes += st.size;
    }
    return sendJSON(req, res, 200, { ok: true, removed, bytes });
  }
  if (route === '/reviews' || route.startsWith('/reviews/')) { if (!sessionOf(req, true)) return sendJSON(req, res, 401, { error: 'Please sign in' }); const r = await reviewsAdmin(req, res, route, method); if (r !== null) return r; }
  return sendJSON(req, res, 404, { error: 'Not found' });
}

/* ------------------------------------------------------------------ pages */
/* version number of a file (changes when the file changes) so browsers can keep it for a year */
const verCache = new Map();
function fileVer(file) {
  try { const st = fs.statSync(file), k = file + st.mtimeMs + st.size; const c = verCache.get(file); if (c && c.k === k) return c.v; const v = Math.round(st.mtimeMs).toString(36) + st.size.toString(36); verCache.set(file, { k, v }); return v; } catch { return '0'; }
}
const pageCache = new WeakMap();
async function renderCustomerPage(req, res) {
  const hit = pageCache.get(content);
  if (hit && hit.rv === rvVer && hit.sv === fileVer(path.join(ROOT, 'public', 'assets', 'site.js')) + fileVer(path.join(ROOT, 'public', 'assets', 'site.css')) && hit.t === fileVer(path.join(ROOT, 'public', 'index.html'))) return send(req, res, 200, hit.html, hit.h);
  let tpl = await fsp.readFile(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const c = content, s = c.shop, si = c.site;
  const title = String(si.seoTitle || '').trim() || `${s.name} | ${s.nameTa || ''} – Retail & Wholesale, ${s.city || ''}`;
  const desc = String(si.seoDesc || '').trim() || `${s.name}, ${s.city || ''} – ${s.tagline || 'retail & wholesale store'}. ${si.heroTitleTa || ''}`.trim();
  const seed = JSON.stringify({ ...c, reviews: publicReviews() }).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
  const logoPath = si.logo || DEFAULT_LOGO, logo = escHtml(logoPath);
  const icon = logoPath === DEFAULT_LOGO ? '/assets/icon-512.png' : logoPath;
  const abs = u => PUBLIC_URL && u.startsWith('/') ? PUBLIC_URL + u : u;
  const sv = fileVer(path.join(ROOT, 'public', 'assets', 'site.js')), cv = fileVer(path.join(ROOT, 'public', 'assets', 'site.css'));
  tpl = tpl.replace('{{SPLASH_MARK}}', `<img class="splash-logo" src="${logo}" alt="" decoding="async" fetchpriority="high">`)
    .replace('{{ICON}}', `<link rel="icon" href="${escHtml(icon)}"><link rel="apple-touch-icon" href="${escHtml(icon)}"><link rel="preload" as="image" href="${logo}">`)
    .replace('{{TYPO_FONTS}}', () => `<link rel="stylesheet" href="${escHtml(T.fontsHref(c.site.typo ? c.site.typo : T.resolve(c.site)))}">`)
    .replace('{{TYPO_STYLE}}', () => `<style id="cx-typo">${T.css(T.resolve(c.site))}</style>`)
    .replace('{{SHOPNAME}}', escHtml(s.name)).replace('{{OGIMG}}', `<meta property="og:image" content="${escHtml(abs(icon))}">`)
    .replace('/assets/site.css', '/assets/site.css?v=' + cv).replace('/assets/site.js', '/assets/site.js?v=' + sv);
  tpl = tpl.replace(/\{\{TITLE\}\}/g, escHtml(title)).replace(/\{\{DESC\}\}/g, escHtml(desc))
    .replace('{{SEED}}', () => `<script id="seed" type="application/json">${seed}</script>`);
  const h = { 'Content-Type': MIME['.html'], ...NO_STORE, ETag: '"p' + fileVer(path.join(ROOT, 'public', 'index.html')) + '-' + (content.v || 0) + '-' + rvVer + '-' + sv + cv + '"',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; frame-src https://www.google.com https://maps.google.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };
  pageCache.set(content, { rv: rvVer, sv: sv + cv, t: fileVer(path.join(ROOT, 'public', 'index.html')), html: tpl, h });
  send(req, res, 200, tpl, h);
}
async function renderAdminPage(req, res) {
  let tpl = await fsp.readFile(path.join(ROOT, 'admin', 'index.html'), 'utf8');
  const tp = T.resolve(content.site);
  tpl = tpl.replace(/\{\{BASE\}\}\/(admin\.js|admin\.css|typography\.js)/g, (m, f) => escHtml(ADMIN_PATH) + '/' + f + '?v=' + fileVer(path.join(ROOT, f === 'typography.js' ? 'lib' : 'admin', f)))
    .replace(/\{\{BASE\}\}/g, escHtml(ADMIN_PATH)).replace(/\{\{SITE_URL\}\}/g, escHtml(SITE_URL))
    .replace('{{TYPO_FONTS}}', () => `<link rel="stylesheet" href="${escHtml(T.fontsHref(tp))}">`).replace('{{TYPO_STYLE}}', () => `<style id="cx-typo">${T.css(tp)}</style>`);
  send(req, res, 200, tpl, { 'Content-Type': MIME['.html'], ...NO_STORE, 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
}

/* ----------------------------------------------------------------- router */
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  let p = url.pathname;
  if (p === '/healthz') {          // uptime monitors / hosting health checks (no secrets, no cookies)
    let writable = true; try { await fsp.access(DATA_DIR, fs.constants.W_OK); } catch { writable = false; }
    return sendJSON(req, res, writable ? 200 : 503, { ok: writable, uptime: Math.round(process.uptime()) });
  }
  if (FORCE_HTTPS && !isHttps(req) && TRUST_PROXY && req.headers['x-forwarded-proto'] === 'http') { res.writeHead(301, { Location: 'https://' + (req.headers.host || '') + req.url }); return res.end(); }
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  if (!['GET', 'HEAD', 'POST', 'PUT', 'DELETE'].includes(req.method)) return send(req, res, 405, 'Method not allowed', { Allow: 'GET, HEAD', 'Content-Type': MIME['.txt'] });

  /* ---- admin (secret path) ---- */
  if (p === ADMIN_PATH || p.startsWith(ADMIN_PATH + '/')) {
    const rest = p.slice(ADMIN_PATH.length) || '/';
    if (rest.startsWith('/api/')) {
      try { return await adminApi(req, res, rest.slice(4)); }
      catch (e) { return sendJSON(req, res, e.status || 500, { error: e.status ? e.message : 'Server error' }); }
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return notFound(req, res);
    if (rest === '/' || rest === '/index.html') return renderAdminPage(req, res);
    const vq = url.searchParams.has('v') ? 'private, max-age=31536000, immutable' : 'no-cache';
    if (rest === '/heic2any.min.js') return serveFile(req, res, path.join(ROOT, 'admin', 'heic2any.min.js'), { cache: 'private, max-age=86400' });
    if (rest.startsWith('/pdfjs/')) { const f = safeJoin(path.join(ROOT, 'admin', 'pdfjs'), rest.slice(7)); if (!f) return notFound(req, res); return serveFile(req, res, f, { cache: 'private, max-age=604800' }); }
    if (rest === '/typography.js') return serveFile(req, res, path.join(ROOT, 'lib', 'typography.js'), { cache: vq });
    if (rest === '/admin.js' || rest === '/admin.css') {
      return serveFile(req, res, path.join(ROOT, 'admin', rest.slice(1)), { cache: vq });
    }
    return notFound(req, res);
  }

  /* ---- visitor counter (anonymous; just counts visits) ---- */
  if (p === '/api/hit' && req.method === 'POST') {
    try { recordHit(req, await readJSON(req, 2048)); } catch { /* ignore bad beacons */ }
    return send(req, res, 204, '', { 'Cache-Control': 'no-store' });
  }
  if (p === '/api/review' && req.method === 'POST') { try { return await submitReview(req, res); } catch (e) { return sendJSON(req, res, e.status || 500, { error: 'Server error' }); } }
  /* ---- public (read-only) ---- */
  if (req.method !== 'GET' && req.method !== 'HEAD') return notFound(req, res);
  if (p === '/' || p === '/index.html') return renderCustomerPage(req, res);
  if (p === '/api/content') return sendJSON(req, res, 200, publicContent());
  if (p === '/favicon.ico') { const lg = (content.site && content.site.logo) || DEFAULT_LOGO; const to = lg === DEFAULT_LOGO ? '/assets/icon-512.png' : lg; if (/^\/(uploads|assets)\/[\w.-]+$/.test(to)) { res.writeHead(302, { Location: to, 'Cache-Control': 'public, max-age=3600' }); return res.end(); } return send(req, res, 204, '', { 'Cache-Control': 'public, max-age=3600' }); }
  if (p === '/robots.txt') return send(req, res, 200, 'User-agent: *\nAllow: /\n', { 'Content-Type': MIME['.txt'], 'Cache-Control': 'no-cache' });
  if (p.startsWith('/assets/')) {
    const f = safeJoin(path.join(ROOT, 'public', 'assets'), p.slice(8)); if (!f) return notFound(req, res);
    return serveFile(req, res, f, { cache: url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600, must-revalidate' });
  }
  if (p.startsWith('/uploads/')) {
    const f = safeJoin(UPLOAD_DIR, p.slice(9)); if (!f) return notFound(req, res);
    return serveFile(req, res, f, { cache: 'public, max-age=31536000, immutable' });
  }
  return notFound(req, res);
}

/* ------------------------------------------------------------------- boot */
async function copyIfMissing(src, dst) { if (!(await exists(dst))) await fsp.copyFile(src, dst); }
async function init() {
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  try { const t = path.join(DATA_DIR, '.write-test'); await fsp.writeFile(t, String(Date.now())); await fsp.unlink(t); }
  catch (e) { console.error(`\nCannot write to the data folder (${DATA_DIR}): ${e.message}\nSet DATA_DIR to a folder the server can write to (on a host: a persistent disk/volume).\n`); process.exit(1); }
  await cloud.pullOnBoot();      /* fresh/wiped disk? bring everything back from Supabase first */
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  SEED = JSON.parse(await fsp.readFile(path.join(ROOT, 'seed', 'content.json'), 'utf8'));
  if (!(await exists(CONTENT_FILE))) await writeJSONAtomic(CONTENT_FILE, SEED);
  for (const f of await fsp.readdir(path.join(ROOT, 'seed', 'uploads'))) await copyIfMissing(path.join(ROOT, 'seed', 'uploads', f), path.join(UPLOAD_DIR, f));
  await loadContent();
  await loadReviews();
  await loadAuth();
  loadStats();
  cloud.start();
}

process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));
process.on('uncaughtException', e => { console.error('Fatal error, restarting:', e); try { saveStats(); } catch { /* ignore */ } process.exit(1); });   // the host / Docker / systemd restarts the server
/* Keep-awake (always on): free hosts such as Render put a service to sleep after 15 minutes without visitors.
   Every N minutes (default 8, set in Admin) we call our own public address, which counts as a visit and keeps the site awake.
   The address comes from KEEP_AWAKE_URL / RENDER_EXTERNAL_URL / PUBLIC_URL, or is learned from the first real request. */
let SELF_URL = String(process.env.KEEP_AWAKE_URL || process.env.RENDER_EXTERNAL_URL || PUBLIC_URL || '').trim().replace(/\/+$/, '');
const learnSelfUrl = req => {
  if (SELF_URL) return;
  const h = String(req.headers.host || ''); if (!h || /^(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(h)) return;
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || (/\.onrender\.com$|\.railway\.app$|\.fly\.dev$/i.test(h) ? 'https' : 'http');
  SELF_URL = proto + '://' + h;
};
const KA_FILE = path.join(DATA_DIR, 'settings.json');   // { keepAwake: true|false } saved from the admin panel; overrides KEEP_AWAKE
let KEEP_AWAKE_ON = !/^(0|off|false|no)$/i.test(String(process.env.KEEP_AWAKE || '').trim());   // KEEP_AWAKE=0 = default OFF
let KEEP_AWAKE_MIN = 8;   // minutes between visits (1-14; free hosts sleep after 15)
const clampMin = n => Math.max(1, Math.min(14, Math.round(Number(n)) || 8));
try { const st = JSON.parse(fs.readFileSync(KA_FILE, 'utf8')); if (typeof st.keepAwake === 'boolean') KEEP_AWAKE_ON = st.keepAwake; if (st.minutes) KEEP_AWAKE_MIN = clampMin(st.minutes); } catch { /* no saved setting */ }
const kaInfo = () => ({ enabled: KEEP_AWAKE_ON, minutes: KEEP_AWAKE_MIN, url: SELF_URL || '', ok: keepAwakeOk, failed: keepAwakeFail });
let kaTimer = null, kaRestart = () => {};
let keepAwakeStarted = false, keepAwakeOk = 0, keepAwakeFail = 0;
function startKeepAwake() {
  if (keepAwakeStarted) return; keepAwakeStarted = true;
  const ping = async () => {
    if (!KEEP_AWAKE_ON || !SELF_URL) return;
    for (const p of ['/healthz', '/']) {
      try { const r = await fetch(SELF_URL + p, { headers: { 'User-Agent': 'keep-awake' }, signal: AbortSignal.timeout(30000) }); if (r.status < 500) { keepAwakeOk++; return; } } catch { /* try next */ }
    }
    keepAwakeFail++;
  };
  const loop = () => { clearTimeout(kaTimer); kaTimer = setTimeout(() => { ping().catch(() => {}).finally(loop); }, KEEP_AWAKE_MIN * 60 * 1000); };
  kaRestart = loop; loop();
  setTimeout(() => { ping().catch(() => {}); }, 90 * 1000);
  console.log('  Keep-awake    : ' + (KEEP_AWAKE_ON ? 'ON (pings the public address every ' + KEEP_AWAKE_MIN + ' min' + (SELF_URL ? ': ' + SELF_URL : '; address is learned from the first visitor') + ')' : 'OFF (switch it on in Admin > Backup & Security)'));
}

init().then(() => {
  const server = http.createServer((req, res) => {
    learnSelfUrl(req);
    handle(req, res).catch(e => { console.error(e); if (!res.headersSent) send(req, res, 500, 'Server error', { 'Content-Type': MIME['.txt'] }); else res.end(); });
  });
  server.requestTimeout = 60000; server.headersTimeout = 30000; server.keepAliveTimeout = 65000;
  server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. Stop the other program or set PORT to another number.` : e); process.exit(1); });
  server.listen(PORT, HOST, () => {
    console.log(`\nClassic Home Needs is running`);
    console.log(`  Customer site : http://localhost:${PORT}/`);
    console.log(`  Admin panel   : http://localhost:${PORT}${ADMIN_PATH}/   (keep this address private)`);
    console.log(`  Data folder   : ${DATA_DIR}`);
    startKeepAwake();
    console.log('  Cloud storage : ' + (cloud.enabled ? 'Supabase ON (' + cloud.status().host + ')' : 'OFF (set SUPABASE_URL + SUPABASE_SERVICE_KEY to protect data on free hosts)'));
    if (process.env.RENDER && !process.env.DATA_DIR && !cloud.enabled) console.log('  WARNING       : on Render the data folder must be a persistent disk. Set DATA_DIR to the disk mount path (see README).');
    if (IS_PROD && !TRUST_PROXY && !process.env.PUBLIC_URL) console.log('  Tip           : behind HTTPS set TRUST_PROXY=1 and FORCE_HTTPS=1 so cookies are Secure.');
    console.log('');
  });
}).catch(e => { console.error('Startup failed:', e); process.exit(1); });
