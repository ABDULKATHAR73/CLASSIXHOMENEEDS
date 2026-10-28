'use strict';
/* Supabase Storage mirror - keeps a live copy of the whole data folder (content, admin login, reviews,
 * visitor stats, every uploaded photo/PDF, content versions) in a PRIVATE Supabase bucket, so nothing is lost
 * when the host (e.g. Render free plan) wipes its disk or restarts.
 *
 *   SUPABASE_URL          https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY  service_role key (secret - server only, never sent to browsers)
 *   SUPABASE_BUCKET       optional, default "classix-data" (created automatically)
 *
 * Local disk stays the working copy; this module (1) restores from Supabase on boot, (2) pushes every change
 * within seconds, (3) removes remote files that were deleted locally. Zero npm dependencies (Node 18 fetch). */
const fs = require('fs'), fsp = fs.promises, path = require('path');

const TYPES = { '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf', '.zip': 'application/zip', '.svg': 'image/svg+xml' };
const TOP_FILES = ['content.json', 'admin.json', 'reviews.json', 'stats.json'];
const TOP_DIRS = ['uploads', 'backups'];
const KEY_OK = /^[A-Za-z0-9._\-\/]+$/;
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = function createCloud({ dataDir, afterPull }) {
  const rawUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/(rest|storage)\/v1$/, '');
  const key = String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
  const bucket = String(process.env.SUPABASE_BUCKET || 'classix-data').trim();
  const enabled = /^https?:\/\//i.test(rawUrl) && key.length > 20;
  const st = { enabled, bucket, connected: false, pushAllowed: false, lastSync: 0, lastError: '', lastErrorAt: 0, files: 0, pending: 0, restored: 0, host: enabled ? rawUrl.replace(/^https?:\/\//, '') : '' };
  const synced = new Map();            // key -> "size:mtime" that is known to be stored remotely
  const lastUp = new Map();
  let timer = null, running = null, interval = null, warned = new Set();

  const isJwt = key.startsWith('eyJ');   /* legacy service_role keys are JWTs; new sb_secret_ keys go in apikey only */
  const hdr = extra => (isJwt ? { Authorization: 'Bearer ' + key, apikey: key, ...extra } : { apikey: key, ...extra });
  const enc = k => k.split('/').map(encodeURIComponent).join('/');
  const setErr = e => { st.lastError = String(e && e.message || e).slice(0, 300); st.lastErrorAt = Date.now(); };

  async function call(method, url, { body, headers, tries = 3 } = {}) {
    let last;
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(rawUrl + url, { method, headers: hdr(headers), body, signal: AbortSignal.timeout(60000) });
        if (r.status >= 500 || r.status === 429) { last = new Error(`Supabase ${r.status}`); await sleep(800 * (i + 1)); continue; }
        return r;
      } catch (e) { last = e; await sleep(800 * (i + 1)); }
    }
    throw last || new Error('Supabase request failed');
  }

  async function ensureBucket() {
    const r = await call('POST', '/storage/v1/bucket', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bucket, name: bucket, public: false }) });
    if (r.ok) return;
    const t = await r.text().catch(() => '');
    if (/already exists|Duplicate|409/i.test(t)) return;
    if (r.status === 401 || r.status === 403) throw new Error('Supabase rejected the key (use the service_role key, not the anon key)');
    throw new Error(`Cannot create bucket (${r.status}) ${t.slice(0, 120)}`);
  }

  async function listDir(prefix, out) {
    for (let offset = 0; ; offset += 1000) {
      const r = await call('POST', `/storage/v1/object/list/${encodeURIComponent(bucket)}`, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }) });
      if (!r.ok) throw new Error(`List failed (${r.status})`);
      const items = await r.json();
      if (!Array.isArray(items)) throw new Error('Unexpected list response');
      for (const it of items) {
        const k = prefix ? prefix + '/' + it.name : it.name;
        if (it.id === null || it.id === undefined) await listDir(k, out);
        else out.set(k, { size: Number(it.metadata && it.metadata.size) || 0 });
      }
      if (items.length < 1000) break;
    }
  }
  async function listRemote() { const out = new Map(); await listDir('', out); return out; }

  async function download(k) {
    const r = await call('GET', `/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${enc(k)}`);
    if (!r.ok) throw new Error(`Download ${k} failed (${r.status})`);
    return Buffer.from(await r.arrayBuffer());
  }
  async function upload(k, buf) {
    const r = await call('POST', `/storage/v1/object/${encodeURIComponent(bucket)}/${enc(k)}`, { headers: { 'Content-Type': TYPES[path.extname(k).toLowerCase()] || 'application/octet-stream', 'x-upsert': 'true' }, body: buf });
    if (!r.ok) throw new Error(`Upload ${k} failed (${r.status}) ${(await r.text().catch(() => '')).slice(0, 100)}`);
  }
  async function removeRemote(keys) {
    for (let i = 0; i < keys.length; i += 50) {
      const r = await call('DELETE', `/storage/v1/object/${encodeURIComponent(bucket)}`, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: keys.slice(i, i + 50) }) });
      if (!r.ok) throw new Error(`Delete failed (${r.status})`);
    }
  }

  async function walk(dir, rel, out) {
    let ents; try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const k = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) await walk(path.join(dir, e.name), k, out);
      else if (e.isFile() && !/\.tmp$|^\.write-test$/.test(e.name)) {
        if (!KEY_OK.test(k)) { if (!warned.has(k)) { warned.add(k); console.warn('Cloud sync skips file with unsupported name:', k); } continue; }
        try { const s = await fsp.stat(path.join(dir, e.name)); out.set(k, { file: path.join(dir, e.name), sig: s.size + ':' + Math.round(s.mtimeMs), size: s.size }); } catch { /* vanished */ }
      }
    }
  }
  async function scanLocal() {
    const out = new Map();
    for (const f of TOP_FILES) { try { const s = await fsp.stat(path.join(dataDir, f)); if (s.isFile()) out.set(f, { file: path.join(dataDir, f), sig: s.size + ':' + Math.round(s.mtimeMs), size: s.size }); } catch { /* none */ } }
    for (const d of TOP_DIRS) await walk(path.join(dataDir, d), d, out);
    return out;
  }

  async function readV(buf) { try { const j = JSON.parse(buf.toString('utf8')); return Number(j && j.v) || 0; } catch { return -1; } }

  /* Restore from Supabase. Remote wins when local data is missing or older; local wins when it is newer. */
  async function pullOnBoot() {
    if (!enabled) return false;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await ensureBucket();
        const remote = await listRemote();
        st.connected = true; st.lastError = '';
        let localBuf = null; try { localBuf = await fsp.readFile(path.join(dataDir, 'content.json')); } catch { /* fresh disk */ }
        let remoteWins = false;
        if (remote.has('content.json')) {
          if (!localBuf) remoteWins = true;
          else { const rv = await readV(await download('content.json')); const lv = await readV(localBuf); remoteWins = rv > lv; }
        }
        let got = 0;
        for (const [k, meta] of remote) {
          if (k.endsWith('.tmp') || !KEY_OK.test(k) || !(TOP_FILES.includes(k) || TOP_DIRS.some(d => k.startsWith(d + '/')))) continue;
          const f = path.join(dataDir, ...k.split('/'));
          let ls = null; try { ls = await fsp.stat(f); } catch { /* missing */ }
          if (ls && !remoteWins) continue;                     // local is newer: only fill in missing files
          if (ls && remoteWins && ls.size === meta.size && k !== 'content.json') continue;
          await fsp.mkdir(path.dirname(f), { recursive: true });
          const buf = await download(k); const tmp = f + '.' + process.pid + '.tmp';
          await fsp.writeFile(tmp, buf); await fsp.rename(tmp, f); got++;
        }
        st.restored = got;
        const local = await scanLocal();
        for (const [k, v] of local) { const r = remote.get(k); if (r && r.size === v.size) synced.set(k, v.sig); }
        st.pushAllowed = true;
        if (got) console.log(`  Cloud sync    : restored ${got} file(s) from Supabase`);
        return got > 0;
      } catch (e) { setErr(e); console.error(`Supabase restore attempt ${attempt} failed: ${e.message}`); if (attempt < 4) await sleep(2500 * attempt); }
    }
    st.connected = false;
    console.error('Supabase is unreachable at startup - cloud pushes are paused so remote data is never overwritten. Will retry.');
    return false;
  }

  async function syncNow() {
    if (!enabled) return st;
    if (running) return running;
    running = (async () => {
      try {
        if (!st.pushAllowed) {                                // boot restore failed earlier: try again before any push
          const had = await pullOnBoot(); if (!st.pushAllowed) return st;
          if (had && typeof afterPull === 'function') { try { await afterPull(); } catch (e) { console.error('afterPull failed', e.message); } }
        }
        const local = await scanLocal();
        const now = Date.now(); let pending = 0, failed = 0;
        for (const [k, v] of local) {
          if (synced.get(k) === v.sig) continue;
          if (k === 'stats.json' && now - (lastUp.get(k) || 0) < 60000) { pending++; continue; }
          try { await upload(k, await fsp.readFile(v.file)); synced.set(k, v.sig); lastUp.set(k, now); } catch (e) { failed++; pending++; setErr(e); }
        }
        const gone = [...synced.keys()].filter(k => !local.has(k));
        if (gone.length && local.has('content.json')) {       /* never mass-delete when the local copy looks empty */
          try { await removeRemote(gone); gone.forEach(k => synced.delete(k)); } catch (e) { setErr(e); }
        }
        st.files = local.size; st.pending = pending; st.connected = failed === 0; if (!failed) { st.lastSync = Date.now(); st.lastError = ''; }
      } catch (e) { setErr(e); st.connected = false; }
      finally { running = null; }
      return st;
    })();
    return running;
  }

  function schedule(ms = 2500) { if (!enabled) return; clearTimeout(timer); timer = setTimeout(() => { syncNow().catch(() => {}); }, ms); if (timer.unref) timer.unref(); }
  function start() {
    if (!enabled || interval) return;
    schedule(1500);
    interval = setInterval(() => { syncNow().catch(() => {}); }, 20000); if (interval.unref) interval.unref();
    /* Supabase free projects are paused after a week without activity: touch the project every 6 hours. */
    const hb = setInterval(() => { call('POST', `/storage/v1/object/list/${encodeURIComponent(bucket)}`, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: '', limit: 1 }), tries: 1 }).catch(() => {}); }, 6 * 3600 * 1000); if (hb.unref) hb.unref();
  }
  async function flush(maxMs = 9000) { if (!enabled) return; clearTimeout(timer); await Promise.race([syncNow().catch(() => {}), sleep(maxMs)]); }
  function status() { return { ...st, synced: synced.size }; }

  return { enabled, pullOnBoot, syncNow, schedule, start, flush, status };
};
