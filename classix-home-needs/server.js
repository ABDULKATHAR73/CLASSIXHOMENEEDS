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
const T = require('./lib/typography');

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

let ADMIN_PATH = String(process.env.ADMIN_PATH || '/admin').trim().replace(/\/+$/, '');
if (!ADMIN_PATH.startsWith('/')) ADMIN_PATH = '/' + ADMIN_PATH;
if (ADMIN_PATH === '' || ['/', '/api', '/assets', '/uploads', '/robots.txt'].includes(ADMIN_PATH)) {
  console.error('ADMIN_PATH is not allowed: ' + ADMIN_PATH);
  process.exit(1);
}

const MAX_JSON = 6 * 1024 * 1024;
const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_BACKUP_UPLOAD = 100 * 1024 * 1024;
const SESSION_MS = 12 * 60 * 60 * 1000;
const KEEP_BACKUPS = 40;

/* ----------------------------------------------------------------- helpers */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};
const TEXTY = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt']);
const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const exists = async p => { try { await fsp.access(p); return true; } catch { return false; } };

async function writeJSONAtomic(file, obj) {
  const tmp = file + '.' + process.pid + '.' + Date.now() + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(obj, null, 1), 'utf8');
  await fsp.rename(tmp, file);
}
let chain = Promise.resolve();
const serialize = fn => { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; };

function baseHeaders(extra = {}) {
  return { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', ...extra };
}
function send(req, res, status, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body ?? ''), 'utf8');
  const h = baseHeaders(headers);
  const type = String(h['Content-Type'] || '');
  const compressible = /text\/|json|javascript|svg/.test(type);
  if (compressible && buf.length > 900 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    const z = zlib.gzipSync(buf);
    h['Content-Encoding'] = 'gzip'; h['Vary'] = 'Accept-Encoding'; h['Content-Length'] = z.length;
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
    req.on('data', c => { n += c.length; if (n > limit) { reject(Object.assign(new Error('Too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
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
  if (o.site.typo) o.site.typo = T.sanitize(o.site);
  for (const k of ['categories', 'slides', 'offers', 'why', 'stats', 'strips', 'galleryCategories', 'gallery', 'products', 'testimonials']) {
    o[k] = Array.isArray(c && c[k]) ? c[k] : [];
  }
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
  return null;
}
async function saveImage(buf) {
  const ext = sniff(buf); if (!ext) return null;
  const name = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 24) + '.' + ext;
  const file = path.join(UPLOAD_DIR, name);
  if (!(await exists(file))) { const tmp = file + '.tmp'; await fsp.writeFile(tmp, buf); await fsp.rename(tmp, file); }
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

async function loadContent() {
  try { content = normalize(JSON.parse(await fsp.readFile(CONTENT_FILE, 'utf8'))); }
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
  scan(content);
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
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { saveStats(); process.exit(0); });
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
    if (!name || name.startsWith('/') || name.includes('\\') || name.split('/').some(x => x === '..')) throw new Error('Unsafe ZIP path');
    if (dataEnd > buf.length || usize > MAX_BACKUP_UPLOAD) throw new Error('Invalid or oversized ZIP entry');
    const comp=buf.subarray(dataStart,dataEnd); let data;
    if (method===0) data=Buffer.from(comp); else if (method===8) data=zlib.inflateRawSync(comp); else throw new Error('Unsupported ZIP compression');
    if (data.length !== usize || crc32(data) !== crc) throw new Error('ZIP integrity check failed');
    if (!name.endsWith('/')) { if (out.has(name)) throw new Error('Duplicate ZIP path'); out.set(name,data); }
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
const saveReviews = () => serialize(() => writeJSONAtomic(REVIEWS_FILE, { items: reviews }));
const rvClean = (v, max) => String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const rvStar = v => Math.min(5, Math.max(1, Math.round(Number(v)) || 5));
const rvDate = v => { const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString(); };
function publicReviews() {
  return reviews.filter(r => r.status === 'approved').sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 80)
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
  const name = rvClean(b.name, 60), text = rvClean(b.text, 800), rating = Number(b.rating);
  if (name.length < 2) return sendJSON(req, res, 400, { error: 'name' });
  if (text.length < 10) return sendJSON(req, res, 400, { error: 'text' });
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
    if (!r.name || r.name.length < 2 || !r.text || r.text.length < 3) return sendJSON(req, res, 400, { error: 'Enter the customer name and the review text.' });
    reviews.push(r); await saveReviews(); return sendJSON(req, res, 200, { ok: true, item: r });
  }
  const m = route.match(/^\/reviews\/(r[0-9a-f]{12})$/); if (!m) return null;
  const i = reviews.findIndex(r => r.id === m[1]); if (i < 0) return sendJSON(req, res, 404, { error: 'Review not found' });
  if (method === 'PUT') {
    const n = rvFromAdmin(await readJSON(req, 16384), reviews[i]);
    if (!n.name || n.name.length < 2 || !n.text || n.text.length < 3) return sendJSON(req, res, 400, { error: 'Name and review text cannot be empty.' });
    reviews[i] = n; await saveReviews(); return sendJSON(req, res, 200, { ok: true, item: n });
  }
  if (method === 'DELETE') { reviews.splice(i, 1); await saveReviews(); return sendJSON(req, res, 200, { ok: true }); }
  return sendJSON(req, res, 405, { error: 'Method not allowed' });
}

async function fullBackupZip() {
  const entries=[];
  const add=async (file, name) => { if (await exists(file)) entries.push({name, data: await fsp.readFile(file)}); };
  await add(CONTENT_FILE,'data/content.json'); await add(STATS_FILE,'data/stats.json'); await add(REVIEWS_FILE,'data/reviews.json');
  for (const dir of [UPLOAD_DIR, BACKUP_DIR]) {
    if (!(await exists(dir))) continue;
    for (const f of await fsp.readdir(dir)) {
      if (dir===BACKUP_DIR && !/^content-[\w.-]+\.json$/.test(f)) continue;
      const fp=path.join(dir,f); if ((await fsp.stat(fp)).isFile()) entries.push({name:(dir===UPLOAD_DIR?'data/uploads/':'data/backups/')+f,data:await fsp.readFile(fp)});
    }
  }
  entries.push({name:'BACKUP-INFO.txt',data:'Classic Home Needs full data backup. Includes content, uploaded images, visitor statistics and content-version backups. For security, admin password/session secrets are NOT included. Restore using Admin > Backup & Security > Restore full ZIP backup.\n'});
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
    const buf = await readBody(req, MAX_UPLOAD);
    const saved = await saveImage(buf);
    if (!saved) return sendJSON(req, res, 400, { error: 'Only PNG or JPEG images are allowed' });
    return sendJSON(req, res, 200, { ok: true, url: saved.url });
  }

  if (route === '/backup/export' && method === 'GET') {
    const zip = await fullBackupZip();
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}-${String(d.getSeconds()).padStart(2,'0')}`;
    return send(req, res, 200, zip, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="classix-home-needs-full-backup-${stamp}.zip"`, ...NO_STORE });
  }
  if (route === '/backup/restore' && method === 'POST') {
    const ct=String(req.headers['content-type']||''); if (!/application\/zip|application\/octet-stream/i.test(ct)) return sendJSON(req,res,415,{error:'Upload a ZIP backup file.'});
    const raw=await readBody(req,MAX_BACKUP_UPLOAD); let files;
    try { files=readZip(raw); } catch(e) { return sendJSON(req,res,400,{error:'Invalid backup ZIP: '+e.message}); }
    const contentBuf=files.get('data/content.json'); if (!contentBuf) return sendJSON(req,res,400,{error:'This ZIP does not contain data/content.json and is not a full website backup.'});
    let incoming; try { incoming=JSON.parse(contentBuf.toString('utf8')); } catch { return sendJSON(req,res,400,{error:'Backup content is not valid JSON.'}); }
    const normalized=normalize(incoming), validation=validate(normalized); if (validation) return sendJSON(req,res,400,{error:'Backup content failed validation: '+validation});
    // Preserve the current state before applying anything; password file is intentionally never restored.
    await backupCurrent();
    const oldZip=await fullBackupZip(); await fsp.writeFile(path.join(BACKUP_DIR,`pre-restore-${Date.now()}.zip`),oldZip).catch(()=>{});
    const incomingUploads=[...files.entries()].filter(([n])=>n.startsWith('data/uploads/') && n.length>'data/uploads/'.length);
    for (const [name,data] of incomingUploads) {
      const base=name.slice('data/uploads/'.length);
      if (!/^[A-Za-z0-9._-]+$/.test(base) || base==='.' || base==='..') return sendJSON(req,res,400,{error:'Unsafe upload filename in backup.'});
      if (!sniff(data)) return sendJSON(req,res,400,{error:'Backup contains a non-JPEG/PNG upload.'});
    }
    await fsp.mkdir(UPLOAD_DIR,{recursive:true}); await fsp.mkdir(BACKUP_DIR,{recursive:true});
    // Keep existing uploads too, so content referencing an image omitted from a partial ZIP cannot break the site.
    for (const [name,data] of incomingUploads) await fsp.writeFile(path.join(UPLOAD_DIR,name.slice('data/uploads/'.length)),data);
    await writeJSONAtomic(CONTENT_FILE,normalized); content=normalized;
    const statsBuf=files.get('data/stats.json'); if (statsBuf) { try { const st=JSON.parse(statsBuf.toString('utf8')); if (st && st.days && st.total) { await writeJSONAtomic(STATS_FILE,st); stats=st; statsDirty=false; } } catch { /* leave current stats untouched */ } }
    const rvBuf=files.get('data/reviews.json'); if (rvBuf) { try { const j=JSON.parse(rvBuf.toString('utf8')); if (Array.isArray(j.items)) { reviews=j.items.filter(r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&typeof r.text==='string'&&RV_STATUS.includes(r.status)).slice(0,5000); await saveReviews(); } } catch { /* keep current reviews */ } }
    for (const [name,data] of files) {
      if (name.startsWith('data/backups/') && /^data\/backups\/content-[\w.-]+\.json$/.test(name)) {
        const base=name.slice('data/backups/'.length); try { JSON.parse(data.toString('utf8')); await fsp.writeFile(path.join(BACKUP_DIR,base),data); } catch { /* skip malformed historical backup */ }
      }
    }
    return sendJSON(req,res,200,{ok:true,message:'Backup restored. Admin password was kept unchanged.',content});
  }
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
async function renderCustomerPage(req, res) {
  let tpl = await fsp.readFile(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const c = content, s = c.shop, si = c.site;
  const title = String(si.seoTitle || '').trim() || `${s.name} | ${s.nameTa || ''} – Retail & Wholesale, ${s.city || ''}`;
  const desc = String(si.seoDesc || '').trim() || `${s.name}, ${s.city || ''} – ${s.tagline || 'retail & wholesale store'}. ${si.heroTitleTa || ''}`.trim();
  const seed = JSON.stringify({ ...c, reviews: publicReviews() }).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
  const logo = si.logo ? escHtml(si.logo) : '';
  tpl = tpl.replace('{{SPLASH_MARK}}', logo ? `<img src="${logo}" alt="" style="width:74px;height:74px;border-radius:18px;object-fit:cover;position:relative">` : '<b>CH</b>')
    .replace('{{ICON}}', logo ? `<link rel="icon" href="${logo}"><link rel="apple-touch-icon" href="${logo}">` : '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Crect width=\'64\' height=\'64\' rx=\'16\' fill=\'%234a2f20\'/%3E%3C/svg%3E">')
    .replace('{{TYPO_FONTS}}', () => `<link rel="stylesheet" href="${escHtml(T.fontsHref(c.site.typo ? c.site.typo : T.resolve(c.site)))}">`)
    .replace('{{TYPO_STYLE}}', () => `<style id="cx-typo">${T.css(T.resolve(c.site))}</style>`)
    .replace('{{SHOPNAME}}', escHtml(s.name)).replace('{{OGIMG}}', logo ? `<meta property="og:image" content="${logo}">` : '');
  tpl = tpl.replace(/\{\{TITLE\}\}/g, escHtml(title)).replace(/\{\{DESC\}\}/g, escHtml(desc))
    .replace('{{SEED}}', () => `<script id="seed" type="application/json">${seed}</script>`);
  send(req, res, 200, tpl, { 'Content-Type': MIME['.html'], ...NO_STORE,
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; frame-src https://www.google.com https://maps.google.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
}
async function renderAdminPage(req, res) {
  let tpl = await fsp.readFile(path.join(ROOT, 'admin', 'index.html'), 'utf8');
  const tp = T.resolve(content.site);
  tpl = tpl.replace(/\{\{BASE\}\}/g, escHtml(ADMIN_PATH)).replace(/\{\{SITE_URL\}\}/g, escHtml(SITE_URL))
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
    if (rest === '/typography.js') return serveFile(req, res, path.join(ROOT, 'lib', 'typography.js'), { cache: 'no-cache' });
    if (rest === '/admin.js' || rest === '/admin.css') {
      return serveFile(req, res, path.join(ROOT, 'admin', rest.slice(1)), { cache: 'no-cache' });
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
  if (p === '/favicon.ico') { const lg = content.site && content.site.logo; if (lg && /^\/uploads\/[\w.-]+$/.test(lg)) { res.writeHead(302, { Location: lg, 'Cache-Control': 'no-cache' }); return res.end(); } return send(req, res, 204, '', { 'Cache-Control': 'public, max-age=3600' }); }
  if (p === '/robots.txt') return send(req, res, 200, 'User-agent: *\nAllow: /\n', { 'Content-Type': MIME['.txt'], 'Cache-Control': 'no-cache' });
  if (p.startsWith('/assets/')) {
    const f = safeJoin(path.join(ROOT, 'public', 'assets'), p.slice(8)); if (!f) return notFound(req, res);
    return serveFile(req, res, f, { cache: 'no-cache' });
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
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  SEED = JSON.parse(await fsp.readFile(path.join(ROOT, 'seed', 'content.json'), 'utf8'));
  if (!(await exists(CONTENT_FILE))) await writeJSONAtomic(CONTENT_FILE, SEED);
  for (const f of await fsp.readdir(path.join(ROOT, 'seed', 'uploads'))) await copyIfMissing(path.join(ROOT, 'seed', 'uploads', f), path.join(UPLOAD_DIR, f));
  await loadContent();
  await loadReviews();
  await loadAuth();
}

process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));
process.on('uncaughtException', e => { console.error('Fatal error, restarting:', e); try { saveStats(); } catch { /* ignore */ } process.exit(1); });   // the host / Docker / systemd restarts the server
init().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res).catch(e => { console.error(e); if (!res.headersSent) send(req, res, 500, 'Server error', { 'Content-Type': MIME['.txt'] }); else res.end(); });
  });
  server.requestTimeout = 60000; server.headersTimeout = 30000; server.keepAliveTimeout = 65000;
  server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. Stop the other program or set PORT to another number.` : e); process.exit(1); });
  server.listen(PORT, HOST, () => {
    console.log(`\nClassic Home Needs is running`);
    console.log(`  Customer site : http://localhost:${PORT}/`);
    console.log(`  Admin panel   : http://localhost:${PORT}${ADMIN_PATH}/   (keep this address private)`);
    console.log(`  Data folder   : ${DATA_DIR}`);
    if (process.env.RENDER && !process.env.DATA_DIR) console.log('  WARNING       : on Render the data folder must be a persistent disk. Set DATA_DIR to the disk mount path (see README).');
    if (IS_PROD && !TRUST_PROXY && !process.env.PUBLIC_URL) console.log('  Tip           : behind HTTPS set TRUST_PROXY=1 and FORCE_HTTPS=1 so cookies are Secure.');
    console.log('');
  });
}).catch(e => { console.error('Startup failed:', e); process.exit(1); });
