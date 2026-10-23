/* Classic Home Needs – admin panel. Runs on its own private URL and talks to the server API;
   every save is written to the server and is live on the customer website immediately. */
(() => {
'use strict';
const BASE = document.body.dataset.base || '';
const SITE = document.body.dataset.site || '/';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let C0 = null, authed = false, tab = 'dashboard', sub = {}, dirty = false, idleMs = 20 * 60000, lastAct = Date.now(), custWin = null;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const C = () => C0;
const toast = (m, err) => { const t = $('#toast'); if (!t) return; t.textContent = m; t.className = 'toast show' + (err ? ' err' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => t.className = 'toast', 3500); };
const LBL = {"home":["முகப்பு","Home"],"products":["பொருட்கள்","Products"],"categories":["வகைகள்","Categories"],"rw":["சில்லறை & மொத்தம்","Retail & Wholesale"],"offers":["சலுகைகள்","Offers"],"gallery":["கடை படங்கள்","Shop Gallery"],"about":["எங்களைப் பற்றி","About"],"contact":["தொடர்பு","Contact"],"call":["அழைக்க","Call Now"],"wa":["வாட்ஸ்அப்","WhatsApp Us"],"visit":["கடைக்கு வாருங்கள்","Visit Store"],"details":["விவரங்கள்","View Details"],"enquire":["விசாரிக்க","Enquire Now"],"all":["அனைத்தும்","All"],"retail":["சில்லறை","Retail"],"wholesale":["மொத்தம்","Wholesale"],"general":["பொதுவான","General"],"viewProducts":["அனைத்துப் பொருட்களையும் பார்க்க","View All Products"],"retailBtn":["சில்லறைப் பொருட்கள்","Retail Products"],"whBtn":["மொத்த விசாரணை","Wholesale Enquiry"],"search":["பொருளைத் தேடுங்கள்...","Search products..."],"retailAv":["சில்லறையில் கிடைக்கும்","Available in retail"],"wholesaleAv":["மொத்தத்தில் கிடைக்கும்","Available in wholesale"],"notFound":["பொருள் எதுவும் இல்லை","No products found"],"directions":["வழி காட்டு","Get Directions"],"name":["உங்கள் பெயர்","Your name"],"phone":["மொபைல் எண்","Mobile number"],"msg":["உங்கள் விசாரணை","Your message"],"send":["WhatsApp-ல் அனுப்புக","Send on WhatsApp"],"quick":["விரைவு இணைப்புகள்","Quick Links"],"hours":["கடை நேரம்","Store Timings"],"address":["முகவரி","Address"],"ctaT":["மொத்தமாக வாங்க வேண்டுமா?","Looking to buy in bulk?"],"ctaS":["சிறப்பு மொத்த விலைக்கு இன்றே தொடர்பு கொள்ளுங்கள்","Contact us today for special wholesale prices"],"all2":["அனைத்து சலுகைகள்","All offers"],"askPrice":["விலைக்கு விசாரிக்கவும்","Ask for price"],"eyCat":["வகைகள்","Categories"],"eyProd":["பொருட்கள் காட்சி","Product Showcase"],"eyRw":["சில்லறை · மொத்தம்","Retail · Wholesale"],"eyOffers":["சலுகைகள்","Offers"],"eyWhy":["ஏன் நாங்கள்","Why us"],"eyGal":["படங்கள்","Gallery"],"eyContact":["வருகை தாருங்கள்","Visit us"],"eyReviews":["கருத்துகள்","Reviews"],"reviewsTitle":["வாடிக்கையாளர் கருத்துகள்","What Our Customers Say"],"enqTitle":["விசாரணை","Product Enquiry"],"sendEnq":["விசாரணை அனுப்புக","Send us an Enquiry"],"photosSoon":["படங்கள் விரைவில்","Photos coming soon"],"viewOffer":["சலுகை விவரங்கள்","View Offer Details"],"oos":["இருப்பு இல்லை","Out of stock"],"backBtn":["← திரும்ப","← Back"],"emailLbl":["மின்னஞ்சல்","Email"],"lastDay":["இன்றே கடைசி நாள்!","Last day!"],"daysLeft":["இன்னும் {n} நாட்கள்","{n} days left"],"dayLeft":["இன்னும் {n} நாள்","{n} day left"],"offerEnded":["இந்தச் சலுகை முடிந்தது","This offer has ended"],"offerPrice":["சலுகை விலை","Offer price"],"youSave":["நீங்கள் சேமிப்பது","You save"],"offerCount":["சலுகையில் உள்ள பொருட்கள்","Products in this offer"],"offerNow":["இப்போது","Now"],"offerOngoing":["தொடர்கிறது","Ongoing"],"offerPeriod":["சலுகைக் காலம்","Offer period"],"offerList":["சலுகையில் உள்ள பொருட்கள்","What is in this offer"],"offerIncl":["உள்ளடக்கம்","What's included"],"offerDetails":["சலுகை விவரங்கள்","Offer details"],"enqOffer":["இந்தச் சலுகையை விசாரிக்க","Enquire about this offer"],"errName":["பெயரை உள்ளிடவும்","Enter your name"],"errPhone":["சரியான 10 இலக்க எண்","Enter a valid 10-digit mobile number"],"waOpening":["WhatsApp திறக்கிறது…","Opening WhatsApp…"],"writeReview":["கருத்து எழுதுங்கள்","Write a review"],"rvAvg":["சராசரி மதிப்பீடு","Average rating"],"rvCount":["{n} கருத்துகள்","{n} reviews"],"rvCount1":["1 கருத்து","1 review"],"rvYourName":["உங்கள் பெயர்","Your name"],"rvYourRating":["உங்கள் மதிப்பீடு","Your rating"],"rvYourText":["உங்கள் கருத்து","Your review"],"rvSend":["கருத்தை அனுப்புக","Submit review"],"rvFormTitle":["உங்கள் அனுபவத்தைப் பகிருங்கள்","Share your experience"],"rvThanksPending":["நன்றி! உங்கள் கருத்து சரிபார்ப்புக்குப் பிறகு இணையதளத்தில் தோன்றும்.","Thank you! Your review will appear on the website after the shop approves it."],"rvThanksLive":["நன்றி! உங்கள் கருத்து இணையதளத்தில் சேர்க்கப்பட்டது.","Thank you! Your review is now on the website."],"rvErrName":["பெயரை உள்ளிடவும் (2+ எழுத்துகள்)","Enter your name (2+ letters)"],"rvErrRating":["நட்சத்திர மதிப்பீட்டைத் தேர்ந்தெடுக்கவும்","Choose a star rating"],"rvErrText":["கருத்தை எழுதவும் (குறைந்தது 10 எழுத்துகள்)","Write your review (at least 10 characters)"],"rvErrLinks":["இணைப்புகளைச் சேர்க்க வேண்டாம்","Please do not include web links"],"rvErrLimit":["நிறைய கருத்துகள் அனுப்பப்பட்டுள்ளன. பிறகு முயற்சிக்கவும்.","Too many reviews sent. Please try again later."],"rvErr":["அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.","Could not send. Please try again."],"rvShopReply":["கடையின் பதில்","Reply from the shop"],"rvMore":["மேலும் கருத்துகள்","Show more reviews"],"rvNone":["இன்னும் கருத்துகள் இல்லை. முதல் கருத்தை நீங்கள் எழுதுங்கள்!","No reviews yet. Be the first to write one!"]};
const uid = p => p + Math.random().toString(36).slice(2, 8);

/* ---------- server API ---------- */
async function api(route, { method = 'GET', body, raw, poll } = {}) {
  const opt = { method, credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'cx' } };
  if (poll) opt.headers['X-Poll'] = '1';
  if (raw) { opt.body = raw; opt.headers['Content-Type'] = raw.type || 'application/octet-stream'; }
  else if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
  let r; try { r = await fetch(BASE + '/api' + route, opt); } catch { throw new Error('Cannot reach the server. Check your internet connection.'); }
  let j = {}; try { j = await r.json(); } catch { /* empty */ }
  if (!r.ok) {
    const e = new Error(j.error || ('Server error ' + r.status)); e.status = r.status; e.data = j;
    if (r.status === 401 && authed && route !== '/login') { authed = false; showLogin('Your session ended. Please sign in again.'); }
    throw e;
  }
  return j;
}

/* ---------- persistence ---------- */
async function persist(replace) {
  try {
    const r = await api('/content', { method: 'PUT', body: { baseV: C().v, content: C(), replace: !!replace } });
    if (replace && r.content) C0 = r.content; else C().v = r.v;
    dirty = false;
    return true;
  } catch (e) { toast(e.message, true); return false; }
}
const IMG_OK = f => /^image\/(png|jpeg)$/i.test(f.type) || /\.(png|jpe?g)$/i.test(f.name || '');
function shrink(file, max = 1600, keepPng = false) {
  return new Promise((res, rej) => { const url = URL.createObjectURL(file), im = new Image(), png = keepPng && /png/i.test(file.type || file.name);
    im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const g = c.getContext('2d'); if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); } g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej(new Error('Could not process that image')), png ? 'image/png' : 'image/jpeg', .85); };
    im.onerror = () => rej(new Error('Could not read that image. Please use a PNG or JPEG photo.')); im.src = url; });
}
const upload = async (f, keepPng) => { if (!IMG_OK(f)) throw new Error('Only PNG or JPEG images are allowed'); const blob = await shrink(f, 1600, keepPng); const r = await api('/upload', { method: 'POST', raw: blob }); return r.url; };
/* three ways to add a photo: camera, gallery, file – PNG and JPEG only */
const picker = (kind, multiple) => `<div class="pick"><label class="btn out sm">📷 Open Camera<input type="file" accept="image/png,image/jpeg" capture="environment" hidden data-pick="${kind}"></label><label class="btn gold sm">🖼️ Open Gallery<input type="file" accept="image/png,image/jpeg" ${multiple ? 'multiple' : ''} hidden data-pick="${kind}"></label><label class="btn out sm">📁 Upload File<input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" ${multiple ? 'multiple' : ''} hidden data-pick="${kind}"></label></div>`;
const css = u => u ? `style="background-image:url('${esc(u)}')"` : '';

/* ---------- form builder ---------- */
function fld(f, v, ns = '') {
  const [k, label, type = 'text', hint] = f; const id = ns + k; const h = hint && type !== 'select' && type !== 'range' && type !== 'color' ? `<small>${esc(hint)}</small>` : '';
  if (type === 'bool') return `<div class="f chk"><input type="checkbox" data-k="${k}" id="${id}" ${v ? 'checked' : ''}><label for="${id}">${esc(label)}</label></div>`;
  if (type === 'img') return `<div class="f"><label>${esc(label)}</label><div class="imgf" data-img><div class="pv" ${css(v)}></div><input type="hidden" data-k="${k}" value="${esc(v)}"><div class="acts">${picker('field', false)}<button type="button" class="btn red sm" data-imgclear>Remove</button></div></div>${h}</div>`;
  if (type === 'imgs') { const arr = Array.isArray(v) ? v.filter(Boolean) : [], max = Number(hint) || 5;
    return `<div class="f"><label>${esc(label)} <small>(<b data-cnt>${arr.length}</b>/${max})</small></label><div class="imgs" data-imgs data-k="${k}" data-max="${max}"><div class="ithumbs">${arr.map(u => `<div class="it" data-u="${esc(u)}" style="background-image:url('${esc(u)}')"><button type="button" data-imgdel aria-label="Remove">✕</button></div>`).join('')}</div><div class="pickwrap" ${arr.length >= max ? 'hidden' : ''}>${picker('multi', true)}</div></div><small>PNG or JPEG. You can add up to ${max} photos – customers see them on the offer's detail page.</small></div>`; }
  if (type === 'offerprods') { const items = Array.isArray(v) ? v : []; const m = new Map(items.map(x => [x.id, x.price])), mq = new Map(items.map(x => [x.id, x.qty]));
    return `<div class="f"><label>${esc(label)}</label><div class="op" data-k="${k}" data-offerprods><input class="opq" placeholder="Search products…"><div class="oplist">${C().products.map(p => { const has = m.has(p.id), pv = has && m.get(p.id) !== '' && m.get(p.id) != null ? m.get(p.id) : ''; return `<div class="oprow" data-pid="${esc(p.id)}" data-name="${esc((p.name + ' ' + (p.nameTa || '')).toLowerCase())}"><label class="opc"><input type="checkbox" ${has ? 'checked' : ''}><span>${esc(p.name)} <small>${esc(p.nameTa || '')}</small></span></label><span class="opnow">Now ${p.price != null && p.price !== '' ? '₹' + esc(p.price) : '—'}</span><input class="opq2" type="number" min="1" step="1" title="Quantity in this offer" placeholder="Qty" value="${esc(has && mq.get(p.id) ? mq.get(p.id) : '')}"><input class="opp" type="number" min="0" step="any" placeholder="Offer ₹" value="${esc(pv)}"></div>`; }).join('') || '<p class="ps">Add products first.</p>'}</div></div><small>Tick the products in this offer. Set how many of each (Qty, default 1). Type an exact offer price per piece, or leave it empty to use the discount % above.</small></div>`; }
  if (type === 'color') { const val = /^#[0-9a-f]{6}$/i.test(String(v)) ? v : hint; return `<div class="f"><label>${esc(label)}</label><input type="color" data-k="${k}" value="${esc(val)}" style="height:46px;padding:4px"></div>`; }
  if (type === 'range') { const [mn, mx, st, un = ''] = hint; const val = v === '' || v == null ? mn : v; return `<div class="f"><label>${esc(label)}: <b data-rv>${esc(val)}${esc(un)}</b></label><input type="range" data-k="${k}" data-unit="${esc(un)}" min="${mn}" max="${mx}" step="${st}" value="${esc(val)}"></div>`; }
  if (type === 'area') return `<div class="f"><label>${esc(label)}</label><textarea data-k="${k}">${esc(v)}</textarea>${h}</div>`;
  if (type === 'lines') return `<div class="f"><label>${esc(label)}</label><textarea data-k="${k}" data-lines>${esc(Array.isArray(v) ? v.join('\n') : v)}</textarea>${h}</div>`;
  if (type === 'select') return `<div class="f"><label>${esc(label)}</label><select data-k="${k}">${hint.map(o => `<option value="${esc(o[0])}" ${o[0] === v ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
  return `<div class="f"><label>${esc(label)}</label><input data-k="${k}" type="${type === 'num' ? 'number' : type === 'date' ? 'date' : 'text'}" ${type === 'num' ? 'step="any" min="0"' : ''} value="${esc(v ?? '')}">${h}</div>`;
}
const form = (fields, obj, ns) => fields.map(f => f[0] === '-' ? `<h3 style="grid-column:1/-1;margin:8px 0 4px;font-size:14px;color:var(--gold)">${esc(f[1])}</h3>` : fld(f, obj[f[0]] ?? (f[4] !== undefined ? f[4] : ''), ns)).join('');
function read(el, fields) {
  const o = {};
  for (const f of fields) { if (f[0] === '-') continue; const n = $(`[data-k="${f[0]}"]`, el); if (!n) continue;
    o[f[0]] = n.hasAttribute('data-imgs') ? $$('[data-u]', n).map(x => x.dataset.u) : n.hasAttribute('data-offerprods') ? $$('.oprow', n).filter(r => $('input[type=checkbox]', r).checked).map(r => { const pv = $('.opp', r).value; const qv = $('.opq2', r).value; return { id: r.dataset.pid, price: pv === '' ? '' : Number(pv), qty: qv === '' ? 1 : Math.max(1, Math.round(Number(qv))) }; }) : n.type === 'checkbox' ? n.checked : n.type === 'range' ? Number(n.value) : (n.hasAttribute('data-lines') ? n.value.split('\n').map(x => x.trim()).filter(Boolean) : (f[2] === 'num' ? (n.value === '' ? null : Number(n.value)) : n.value.trim ? (f[2] === 'area' ? n.value : n.value) : n.value)); }
  return o;
}
const pair = (k, label, type = 'text') => [[k + 'Ta', label + ' – Tamil / தமிழ்', type], [k + 'En', label + ' – English', type]];
const pairs = (...a) => a.flatMap(x => pair(...x));
const wide = el => $$('.f', el).forEach(f => { if ($('textarea', f) || $('[data-img]', f) || $('[data-offerprods]', f) || $('[data-imgs]', f)) f.style.gridColumn = '1/-1'; });

/* ---------- list editor ---------- */
function listEditor(key, fields, items, titleFn, addLabel) {
  return `<div data-list="${key}">${items.map((it, i) => `<div class="item" data-i="${i}" data-id="${esc(it.id || '')}"><div class="ih"><span>${esc(titleFn(it, i))}</span><button type="button" class="btn out ic" data-mv="-1">↑</button><button type="button" class="btn out ic" data-mv="1">↓</button><button type="button" class="btn red ic" data-del>✕</button></div><div class="grid2">${form(fields, it, key + i)}</div></div>`).join('')}<button type="button" class="btn out" data-add>+ ${esc(addLabel)}</button></div>`;
}
function bindList(el, key, fields, items, blank, redraw) {
  const box = $(`[data-list="${key}"]`, el); if (!box) return () => items;
  const sync = () => $$(':scope > .item', box).map(n => ({ id: n.dataset.id, ...read(n, fields) }));
  $$('.grid2', box).forEach(wide);
  box.onclick = e => {
    const it = e.target.closest('.item'); const cur = sync();
    if (e.target.closest('[data-add]')) { cur.push({ id: '', ...blank }); items.splice(0, items.length, ...cur); redraw(); return; }
    if (!it) return; const i = +it.dataset.i;
    if (e.target.closest('[data-del]')) { if (!confirm('Delete this item?')) return; cur.splice(i, 1); items.splice(0, items.length, ...cur); redraw(); }
    const mv = e.target.closest('[data-mv]'); if (mv) { const j = i + +mv.dataset.mv; if (j < 0 || j >= cur.length) return; [cur[i], cur[j]] = [cur[j], cur[i]]; items.splice(0, items.length, ...cur); redraw(); }
  };
  return sync;
}
const withIds = (arr, p) => arr.map((x, i) => ({ ...x, id: x.id || uid(p) }));
async function saveContent(body) {
  const c = C();
  for (const k of ['shop', 'site', 'social']) if (body[k]) c[k] = { ...c[k], ...body[k] };
  for (const k of ['slides', 'offers', 'why', 'stats', 'strips', 'galleryCategories', 'gallery', 'testimonials']) if (body[k]) c[k] = withIds(body[k], k[0]);
  if (body.gallery) { const ids = new Set(c.galleryCategories.map(g => g.id)); c.gallery = c.gallery.filter(g => g.url).map(g => ({ ...g, category: ids.has(g.category) ? g.category : '' })); }
  if (body.galleryCategories) c.galleryCategories = c.galleryCategories.filter(g => g.name).map(g => ({ ...g, id: g.id.startsWith('g') && !g.id.match(/^g[a-z0-9]{6}$/) ? g.id : g.id }));
  if (await persist()) { toast('Saved – live on the website ✓'); return true; } return false;
}

/* ---------- layout ---------- */
const NAV = [['dashboard', '📊', 'Dashboard'], ['products', '📦', 'Products'], ['prices', '💰', 'Price List'], ['categories', '🗂️', 'Categories'], ['offers', '🏷️', 'Offers & Festivals'], ['reviews', '⭐', 'Customer Reviews'], ['home', '🏠', 'Home Page Settings'], ['chrome', '🧱', 'Header & Footer'], ['display', '📐', 'Display & Sizes'], ['typography', '🔤', 'Typography Settings'], ['stats', '📈', 'Visitor Stats'], ['menu', '🧭', 'Menu & Sections'], ['labels', '✏️', 'Website Text & Labels'], ['gallery', '🖼️', 'Gallery Management'], ['rw', '🏪', 'Retail & Wholesale Settings'], ['contact', '📞', 'Contact Settings'], ['store', '⚙️', 'Store Settings'], ['social', '🔗', 'Social Media Settings'], ['backup', '🛡️', 'Backup & Security']];
const MQ = matchMedia('(max-width:860px)');
let sideOpen = false;
function setSide(open, focus = true) {
  sideOpen = open; const sh = $('#shell'); if (!sh) return;
  sh.classList.toggle('side-open', open); $('#side').setAttribute('aria-hidden', open ? 'false' : 'true'); $('#menuBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.classList.toggle('noscroll', open && MQ.matches);
  if (focus) (open ? $('#sideClose') : $('#menuBtn')).focus();
  if (!MQ.matches) { try { localStorage.setItem('cx-side', open ? '1' : '0'); } catch { /* ignore */ } }
}
function layout() {
  if (!$('#shell')) {
    $('#app').innerHTML = `<div class="shell" id="shell"><div class="scrim" id="scrim"></div>
    <aside id="side" aria-label="Admin menu" aria-hidden="true"><div class="side-top"><div><div class="lg">Classic Home Needs</div><div class="sm">Admin Dashboard</div></div><button type="button" class="side-close" id="sideClose" aria-label="Close menu">✕ <span>Close</span></button></div>
    <nav aria-label="Admin sections">${NAV.map(([k, i, l]) => `<button type="button" class="nv" data-tab="${k}"><span>${i}</span>${l}</button>`).join('')}</nav>
    <button type="button" class="nv" id="logoutBtn" style="margin-top:14px"><span>🚪</span>Sign out</button></aside>
    <div class="main"><div class="top"><button type="button" class="btn out ic menu-btn" id="menuBtn" aria-controls="side" aria-expanded="false" aria-label="Open menu">☰ <span>Menu</span></button><b>Admin</b>
      <div class="tools" role="group" aria-label="Refresh buttons"><button type="button" class="btn out sm" id="adminRefresh" title="Reload the data in this admin panel (you stay on this page)">↻ Refresh Admin Panel</button><button type="button" class="btn gold sm" id="customerRefresh" title="Open or reload the customer website in another tab">🌐 Refresh Customer Website</button></div></div>
    <div class="content" id="content"></div></div></div>`;
    $$('#side [data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; if (MQ.matches) setSide(false, false); layout(); render(); window.scrollTo(0, 0); });
    $('#menuBtn').onclick = () => setSide(!sideOpen); $('#sideClose').onclick = () => setSide(false); $('#scrim').onclick = () => setSide(false, false);
    $('#logoutBtn').onclick = logout; $('#adminRefresh').onclick = refreshAdmin; $('#customerRefresh').onclick = openCustomer;
    let stored = '1'; try { stored = localStorage.getItem('cx-side') || '1'; } catch { /* ignore */ }
    setSide(!MQ.matches && stored !== '0', false);
  }
  $$('#side [data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.toggleAttribute('aria-current', b.dataset.tab === tab); });
}
MQ.addEventListener('change', () => { if ($('#shell')) { let st = '1'; try { st = localStorage.getItem('cx-side') || '1'; } catch { /* ignore */ } setSide(!MQ.matches && st !== '0', false); } });
document.addEventListener('keydown', e => { if (e.key !== 'Escape' || !sideOpen || e.defaultPrevented) return; const t = e.target; if (t && t.matches && t.matches('input,textarea,select') ) return; setSide(false); });
/* Button A: reload this admin panel's data, same section, no page reload */
async function refreshAdmin() {
  const b = $('#adminRefresh'); if (!b || b.disabled) return;
  if (dirty && !confirm('You have changes that are not saved yet. Refresh anyway? Unsaved changes will be lost.')) return;
  b.disabled = true; const y = window.scrollY;
  try {
    const st = await api('/session');
    if (!st.authed) { authed = false; return showLogin('Your session ended. Please sign in again.'); }
    C0 = await api('/content'); dirty = false; layout(); render(); window.scrollTo(0, y); toast('Admin panel refreshed ✓');
  } catch (ex) { if (ex.status !== 401) toast(ex.message, true); }
  finally { const bb = $('#adminRefresh'); if (bb) bb.disabled = false; }
}
/* Button B: open the customer website in its own tab, or reload that tab if it is already open */
function openCustomer() {
  const url = SITE + (SITE.includes('?') ? '&' : '?') + '_r=' + Date.now();
  try { if (custWin && !custWin.closed) { custWin.location.replace(url); custWin.focus(); return; } } catch { /* different origin: open normally */ }
  const w = window.open(url, 'cx_customer_site');
  if (!w) return toast('Your browser blocked the new tab. Please allow pop-ups for this page and try again.', true);
  try { w.opener = null; } catch { /* ignore */ } custWin = w;
}
const head = (t, s) => `<h2 class="pt">${t}</h2><p class="ps">${s || ''}</p>`;
const tabsBar = (id, list, cur) => `<div class="tabs" id="${id}">${list.map(([k, l]) => `<button data-s="${k}" class="${k === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const saveBar = (label = 'Save changes') => `<div class="savebar"><button class="btn gold" id="saveBtn">💾 ${label}</button><button type="button" class="btn out" data-viewsite>View website</button></div>`;
async function updateBadge() { try { const d = await api('/reviews', { poll: true }); const b = $('#side [data-tab=reviews]'); if (!b) return; let x = $('.badge', b); if (d.pending) { if (!x) { x = document.createElement('em'); x.className = 'badge'; b.appendChild(x); } x.textContent = d.pending; } else if (x) x.remove(); } catch { /* ignore */ } }
function render() { updateBadge(); dirty = false; const c = $('#content'); (views[tab] || views.dashboard)(c); }
document.addEventListener('input', e => { if (e.target.closest && e.target.closest('#content')) dirty = true; });

const OFFER_F = [['active', 'Show this offer on the website', 'bool'], ['festival', 'Festival / occasion', 'select', [['', 'Normal offer'], ['diwali', '🪔 Diwali / தீபாவளி'], ['pongal', '🌾 Pongal / பொங்கல்'], ['puthandu', '🌼 Tamil New Year / தமிழ் புத்தாண்டு'], ['christmas', '🎄 Christmas'], ['eid', '🌙 Ramzan / Eid'], ['newyear', '🎆 New Year'], ['sale', '🏷️ Sale']]], ['startDate', 'Starts on (optional)', 'date', 'Empty = starts immediately'], ['endDate', 'Ends on (optional)', 'date', 'The offer hides itself automatically after this day'], ['badge', 'Badge text (e.g. NEW, 20% OFF)'], ['discountPct', 'Discount % on the selected products (optional)', 'num', 'Used for products where you do not type an exact offer price'], ['titleTa', 'Title – Tamil / தமிழ்'], ['titleEn', 'Title – English'], ['textTa', 'Description – Tamil', 'area'], ['textEn', 'Description – English', 'area'], ['image', 'Offer banner image (optional)', 'img'], ['photos', 'Offer photos – up to 5 (shown on the offer detail page)', 'imgs', 5], ['bundlePrice', 'Total offer price for the whole offer, ₹ (optional)', 'num', 'Example: 2500 for “2L Cooker + 5L Cooker + Flask”. Shown big on the detail page.'], ['includes', 'What is included – one line per item (optional)', 'lines', 'Example:  2 L Pressure Cooker × 1  – use this if the items are not in your product list'], ['detailsTa', 'Full offer details – Tamil (detail page)', 'area'], ['detailsEn', 'Full offer details – English (detail page)', 'area'], ['ctaTa', 'Button text – Tamil'], ['ctaEn', 'Button text – English'], ['link', 'Button link (optional)', 'text', '#products  #rw  #contact  #gallery  or https://…'], ['items', 'Products in this offer and their offer prices', 'offerprods']];
const WHY_F = [['icon', 'Icon (emoji)'], ['titleTa', 'Title – Tamil / தமிழ்'], ['titleEn', 'Title – English'], ['textTa', 'Text – Tamil'], ['textEn', 'Text – English']];
const STAT_F = [['value', 'Number (e.g. 7+, 1000+)'], ['ta', 'Label – Tamil / தமிழ்'], ['en', 'Label – English']];
const STRIP_F = [['ta', 'Text – Tamil / தமிழ்'], ['en', 'Text – English']];
const SLIDE_F = [['image', 'Slide photo', 'img'], ['tagTa', 'Tag – Tamil'], ['tagEn', 'Tag – English'], ['titleTa', 'Caption title – Tamil'], ['titleEn', 'Caption title – English'], ['textTa', 'Caption text – Tamil'], ['textEn', 'Caption text – English']];
const TESTI_F = [['name', 'Customer name'], ['role', 'Role / place (e.g. Natham)'], ['textTa', 'Words – Tamil / தமிழ்', 'area'], ['textEn', 'Words – English', 'area']];

/* ---------- visitor statistics widgets ---------- */
const nf = n => Number(n || 0).toLocaleString('en-IN');
const pv = n => nf(n) + (Number(n) === 1 ? ' page view' : ' page views');
function visitorCards(s, withMonth) {
  const k = (l, v, sub, cls = '') => `<div class="kpi ${cls}" style="cursor:default"><b>${nf(v)}</b><span>${l}</span>${sub ? `<small class="ksub">${sub}</small>` : ''}</div>`;
  return k('🟢 Online right now', s.live, 'visitors on the website', 'live') + k('Total visitors', s.total.visitors, pv(s.total.views)) + k('Today', s.today.visitors, pv(s.today.views)) + k('Last 7 days', s.d7.visitors, pv(s.d7.views)) + k('Last 30 days', s.d30.visitors, pv(s.d30.views)) + (withMonth ? k('This month', s.month.visitors, pv(s.month.views)) : '') + k('Page views (all time)', s.total.views, 'Today: ' + nf(s.today.views));
}
const emptyStats = () => '<div class="empty" style="grid-column:1/-1">📭 <b>No visits recorded yet.</b><br>Numbers appear here as soon as customers open your website. Everything shown on this page comes from real visits.</div>';
const barsHtml = days => { const mx = Math.max(1, ...days.map(d => d.visitors)); return `<div class="bars">${days.map(d => `<div class="bar" title="${esc(d.date)}: ${d.visitors} visitors, ${d.views} views"><i style="height:${Math.max(3, Math.round(d.visitors / mx * 100))}%"></i><b>${d.visitors}</b><span>${esc(d.date.slice(8))}/${esc(d.date.slice(5, 7))}</span></div>`).join('')}</div>`; };

/* ---------- views ---------- */
const views = {
  dashboard(c) {
    const d = C(); const k = (n, l, go) => `<div class="kpi" data-go="${go}"><b>${n}</b><span>${l}</span></div>`;
    c.innerHTML = head('Dashboard', 'A quick look at your shop website.') + `<div class="kpis">${k((d.products || []).length, 'Total Products', 'products')}${k(d.categories.length, 'Total Categories', 'categories')}${k(d.gallery.length, 'Gallery Images', 'gallery')}${k(d.offers.filter(o => o.active).length, 'Active Offers', 'offers')}</div>
    <div class="card"><h3>📈 Visitor statistics <button type="button" class="btn out sm" data-go="stats">Open detailed Visitor Stats →</button></h3><div id="dashStats" class="kpis vk"><div class="empty">Loading visitor statistics…</div></div><div id="dashBars"></div></div>
    <div class="hint"><b>Live editing:</b> everything you save here goes live on the customer website straight away. Use <b>Refresh Customer Website</b> at the top to see your change.</div>
    <div class="card"><h3>Quick actions</h3><div class="row"><button class="btn gold" data-go="home">✏️ Edit Home Page</button><button class="btn out" data-go="gallery">🖼️ Manage Gallery</button><button class="btn out" data-go="products">➕ Products</button><button class="btn out" data-go="offers">🏷️ Offers</button><button class="btn out" data-go="typography">🔤 Typography</button><button class="btn out" data-go="backup">🛡️ Backup</button></div></div>`;
    $$('[data-go]', c).forEach(b => b.onclick = () => { tab = b.dataset.go; layout(); render(); window.scrollTo(0, 0); });
    const load = async () => { try { const x = await api('/stats', { poll: true }); const el = $('#dashStats', c); if (!el) return; el.innerHTML = x.total.views ? visitorCards(x) : emptyStats(); $('#dashBars', c).innerHTML = x.total.views ? `<h4 class="subh">Last 14 days</h4>${barsHtml(x.days)}` : ''; } catch (ex) { const el = $('#dashStats', c); if (el && ex.status !== 401) el.innerHTML = '<div class="empty">Visitor statistics are not available right now.</div>'; } };
    load(); const iv = setInterval(() => { if (!document.body.contains(c) || tab !== 'dashboard') return clearInterval(iv); load(); }, 20000);
  },
  reviews(c) {
    c.innerHTML = head('Customer Reviews', 'Reviews that customers write on your website. New ones wait here until you approve them. You can edit anything, reply, hide or delete.') + '<div class="empty">Loading reviews…</div>';
    const F = sub.rvf || 'pending';
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    const dlocal = d => { try { const x = new Date(d); return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10); } catch { return ''; } };
    const draw = async () => {
      let data; try { data = await api('/reviews'); } catch (ex) { c.innerHTML = head('Customer Reviews') + `<div class="err">${esc(ex.message)}</div>`; return; }
      const all = data.items, cnt = k => all.filter(r => r.status === k).length;
      const list = all.filter(r => F === 'all' || r.status === F);
      const s = C().site;
      c.innerHTML = head('Customer Reviews', 'Reviews that customers write on your website. New ones wait here until you approve them. You can edit anything, reply, hide or delete.') + `
      <div class="card"><h3>Settings</h3><div class="grid2">
        <div class="f"><label><input type="checkbox" id="rvForm" ${s.reviewForm !== false ? 'checked' : ''}> Let customers write reviews on the website</label></div>
        <div class="f"><label><input type="checkbox" id="rvAuto" ${s.reviewAuto === true ? 'checked' : ''}> Publish new reviews immediately (not recommended – default is to approve each one first)</label></div></div>
        <button class="btn out" id="rvSet">Save settings</button></div>
      <div class="card"><div class="row" id="rvTabs">${[['pending', 'Waiting'], ['approved', 'Published'], ['hidden', 'Hidden'], ['all', 'All']].map(([k, l]) => `<button class="btn ${F === k ? 'gold' : 'out'}" data-f="${k}">${l} (${k === 'all' ? all.length : cnt(k)})</button>`).join('')}<button class="btn out" id="rvAdd" style="margin-left:auto">+ Add a review myself</button></div></div>
      <div id="rvList">${list.length ? list.map(r => `<div class="card rvadm" data-id="${esc(r.id)}"><div class="row" style="justify-content:space-between"><b>${esc(r.name)} <span style="color:#e7a914">${stars(r.rating)}</span></b><span class="pill ${r.status === 'approved' ? 'g' : r.status === 'pending' ? 'o' : 'r'}">${r.status === 'approved' ? 'Published' : r.status === 'pending' ? 'Waiting for approval' : 'Hidden'}</span></div>
        <small style="color:var(--muted)">${r.source === 'admin' ? 'Added by you' : 'From a customer'} · ${esc(dlocal(r.date))}</small>
        <div class="grid2" style="margin-top:10px"><div class="f"><label>Customer name</label><input data-k="name" value="${esc(r.name)}" maxlength="60"></div>
        <div class="f"><label>Stars</label><select data-k="rating">${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${r.rating === n ? 'selected' : ''}>${n} ★</option>`).join('')}</select></div>
        <div class="f" style="grid-column:1/-1"><label>Review</label><textarea data-k="text" maxlength="1000" style="min-height:80px">${esc(r.text)}</textarea></div>
        <div class="f" style="grid-column:1/-1"><label>Your reply (shown under the review, optional)</label><textarea data-k="reply" maxlength="500" style="min-height:56px">${esc(r.reply || '')}</textarea></div>
        <div class="f"><label>Date</label><input type="date" data-k="date" value="${esc(dlocal(r.date))}"></div>
        <div class="f"><label><input type="checkbox" data-k="featured" ${r.featured ? 'checked' : ''}> Show first (featured)</label></div></div>
        <div class="row" style="margin-top:8px"><button class="btn gold" data-a="save">💾 Save</button>${r.status !== 'approved' ? '<button class="btn out" data-a="approved">✔ Publish</button>' : ''}${r.status !== 'hidden' ? '<button class="btn out" data-a="hidden">🙈 Hide</button>' : ''}<button class="btn out" data-a="del" style="color:var(--red)">🗑 Delete</button></div></div>`).join('') : '<div class="empty">📭 Nothing here yet.</div>'}</div>`;
      $('#rvSet', c).onclick = async () => { C().site.reviewForm = $('#rvForm', c).checked; C().site.reviewAuto = $('#rvAuto', c).checked; if (await persist()) toast('Review settings saved ✓'); };
      $$('#rvTabs [data-f]', c).forEach(b => b.onclick = () => { sub.rvf = b.dataset.f; views.reviews(c); });
      $('#rvAdd', c).onclick = async () => { const name = prompt('Customer name'); if (!name) return; const text = prompt('What did the customer say?'); if (!text) return; try { await api('/reviews', { method: 'POST', body: { name, text, rating: 5, status: 'approved' } }); sub.rvf = 'approved'; toast('Review added ✓'); views.reviews(c); updateBadge(); } catch (ex) { toast(ex.message, true); } };
      $$('.rvadm', c).forEach(el => el.addEventListener('click', async e => {
        const a = e.target.closest('[data-a]'); if (!a) return; const id = el.dataset.id;
        const body = () => ({ name: $('[data-k=name]', el).value, rating: +$('[data-k=rating]', el).value, text: $('[data-k=text]', el).value, reply: $('[data-k=reply]', el).value, date: $('[data-k=date]', el).value, featured: $('[data-k=featured]', el).checked });
        try {
          if (a.dataset.a === 'del') { if (!confirm('Delete this review for good?')) return; await api('/reviews/' + id, { method: 'DELETE' }); toast('Deleted'); }
          else if (a.dataset.a === 'save') { await api('/reviews/' + id, { method: 'PUT', body: body() }); toast('Saved ✓'); }
          else { await api('/reviews/' + id, { method: 'PUT', body: { ...body(), status: a.dataset.a } }); toast(a.dataset.a === 'approved' ? 'Published on the website ✓' : 'Hidden from the website'); }
          draw(); updateBadge();
        } catch (ex) { toast(ex.message, true); }
      }));
    };
    draw();
  },
  products(c) {
    const cats = C().categories; const products = C().products;
    if (sub.editP !== undefined) return productForm(c, sub.editP);
    const q = (sub.q || '').toLowerCase(); const list = products.filter(p => !q || (p.name + ' ' + (p.nameTa || '')).toLowerCase().includes(q));
    c.innerHTML = head('Products', 'Showcase products – no cart. Customers send an enquiry on WhatsApp.') + `
    <div class="card"><div class="row"><button class="btn gold" id="addP">+ Add product</button><input id="pq" placeholder="Search products…" value="${esc(sub.q || '')}" style="flex:1;min-width:160px;border:1.5px solid var(--line);border-radius:12px;padding:9px 12px;font:inherit"></div></div>
    <div class="card tw"><table><thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Retail / Wholesale</th><th>Status</th><th></th></tr></thead><tbody>
    ${list.map(p => { const ct = cats.find(x => x.id === p.category) || {}; const im = (p.images || [])[0]; return `<tr><td><div class="thumb" ${css(im)}>${im ? '' : esc(ct.icon || '🛍️')}</div></td><td><b>${esc(p.name)}</b><br><small>${esc(p.nameTa || '')}</small></td><td>${esc(ct.name || '')}</td><td>${p.price != null && p.price !== '' ? '₹' + p.price : '—'}</td><td>${p.retail ? '<span class="pill g">Retail</span> ' : ''}${p.wholesale ? '<span class="pill o">Wholesale</span>' : ''}</td><td>${p.visible === false ? '<span class="pill r">Hidden</span>' : p.featured ? '<span class="pill g">Featured</span>' : 'Shown'}</td><td><div class="row" style="flex-wrap:nowrap"><button class="btn out sm" data-edit="${p.id}">Edit</button><button class="btn red sm" data-del="${p.id}">Delete</button></div></td></tr>`; }).join('') || '<tr><td colspan="7">No products</td></tr>'}</tbody></table></div>`;
    $('#addP').onclick = () => { sub.editP = ''; render(); };
    $('#pq').oninput = e => { sub.q = e.target.value; const p = e.target.selectionStart; render(); const n = $('#pq'); n.focus(); n.setSelectionRange(p, p); };
    $$('[data-edit]', c).forEach(b => b.onclick = () => { sub.editP = b.dataset.edit; render(); window.scrollTo(0, 0); });
    $$('[data-del]', c).forEach(b => b.onclick = async () => { if (!confirm('Delete this product?')) return; C().products = C().products.filter(p => p.id !== b.dataset.del); await persist(); toast('Deleted'); render(); });
  },
  categories(c) {
    const cats = C().categories;
    c.innerHTML = head('Categories', 'Add, edit, reorder, hide or delete categories. Order here = order on the website.') + `
    <div class="card"><h3>Add category</h3><div class="grid2"><div class="f"><label>Icon (emoji)</label><input id="nc-i" value="🛍️"></div><div class="f"><label>English name</label><input id="nc-n"></div><div class="f"><label>Tamil name / தமிழ்</label><input id="nc-t"></div></div><button class="btn gold" id="nc-add">+ Add category</button></div>
    ${cats.map((x, i) => `<div class="card" data-cid="${esc(x.id)}"><div class="grid2"><div class="f"><label>Icon</label><input data-k="icon" value="${esc(x.icon)}"></div><div class="f"><label>English name</label><input data-k="name" value="${esc(x.name)}"></div><div class="f"><label>Tamil name</label><input data-k="ta" value="${esc(x.ta)}"></div><div class="f chk"><input type="checkbox" data-k="visible" id="cv${i}" ${x.visible !== false ? 'checked' : ''}><label for="cv${i}">Show on website</label></div></div>
    <div class="row"><button class="btn gold sm" data-save>Save</button><button class="btn out ic" data-mv="-1">↑</button><button class="btn out ic" data-mv="1">↓</button><button class="btn red sm" data-delc>Delete</button></div></div>`).join('')}`;
    $('#nc-add').onclick = async () => { const name = $('#nc-n').value.trim(); if (!name) return toast('Enter the category name', true); let id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat'; const base = id; let n = 2; while (cats.some(x => x.id === id)) id = base + '-' + n++; cats.push({ id, name, ta: $('#nc-t').value.trim(), icon: $('#nc-i').value.trim() || '🛍️', visible: true }); await persist(); toast('Category added'); render(); };
    $$('[data-cid]', c).forEach(el => { const id = el.dataset.cid; const cat = () => cats.find(x => x.id === id);
      $('[data-save]', el).onclick = async () => { const o = cat(); o.name = $('[data-k=name]', el).value.trim() || o.name; o.ta = $('[data-k=ta]', el).value.trim(); o.icon = $('[data-k=icon]', el).value.trim() || '🛍️'; o.visible = $('[data-k=visible]', el).checked; await persist(); toast('Saved ✓'); };
      $('[data-delc]', el).onclick = async () => { const used = C().products.filter(p => p.category === id).length; if (used) return toast(`${used} product(s) use this category. Move them first.`, true); if (!confirm('Delete this category?')) return; C().categories = cats.filter(x => x.id !== id); await persist(); render(); };
      $$('[data-mv]', el).forEach(b => b.onclick = async () => { const i = cats.findIndex(x => x.id === id), j = i + +b.dataset.mv; if (j < 0 || j >= cats.length) return; [cats[i], cats[j]] = [cats[j], cats[i]]; await persist(); render(); }); });
  },
  offers(c) {
    const TPL = {
      diwali: { festival: 'diwali', badge: 'DIWALI', titleTa: 'தீபாவளி சிறப்புச் சலுகை', titleEn: 'Diwali Special Offer', textTa: 'தீபாவளி கொண்டாட்டத்திற்கான சிறப்பு விலைகள் – வீடு முழுவதும் மகிழ்ச்சி!', textEn: 'Festive prices for your Diwali shopping – brighten up your home!' },
      pongal: { festival: 'pongal', badge: 'PONGAL', titleTa: 'பொங்கல் சிறப்புச் சலுகை', titleEn: 'Pongal Special Offer', textTa: 'பொங்கல் பானை, சமையலறைப் பொருட்கள் மற்றும் பரிசுகளுக்கு சிறப்பு விலை.', textEn: 'Special prices on Pongal pots, kitchenware and gifts.' },
      puthandu: { festival: 'puthandu', badge: 'NEW YEAR', titleTa: 'தமிழ் புத்தாண்டு சலுகை', titleEn: 'Tamil New Year Offer', textTa: 'புத்தாண்டை புதிய பொருட்களுடன் தொடங்குங்கள் – சிறப்பு விலையில்.', textEn: 'Start the new year with new things at special prices.' },
      christmas: { festival: 'christmas', badge: 'CHRISTMAS', titleTa: 'கிறிஸ்துமஸ் சலுகை', titleEn: 'Christmas Offer', textTa: 'கிறிஸ்துமஸ் பரிசுகளுக்கும் அலங்காரங்களுக்கும் சிறப்பு விலை.', textEn: 'Special prices on Christmas gifts and decorations.' },
      eid: { festival: 'eid', badge: 'EID', titleTa: 'ரம்ஜான் சிறப்புச் சலுகை', titleEn: 'Ramzan & Eid Offer', textTa: 'ரம்ஜான் கொண்டாட்டத்திற்கான சிறப்பு விலைகள்.', textEn: 'Special festive prices for Ramzan and Eid.' },
      newyear: { festival: 'newyear', badge: 'NEW YEAR', titleTa: 'புத்தாண்டு சலுகை', titleEn: 'New Year Offer', textTa: 'புத்தாண்டு சிறப்புச் சலுகைகள்.', textEn: 'Special New Year deals.' },
      sale: { festival: 'sale', badge: 'SALE', titleTa: 'சிறப்பு விற்பனை', titleEn: 'Special Sale', textTa: 'குறைந்த காலத்திற்கு மட்டும் சிறப்பு விலை.', textEn: 'Special prices for a limited time only.' }
    };
    const top = `<div class="card"><h3>Quick add a festival offer</h3><p class="ps" style="margin-bottom:10px">Tap a festival to add a ready-made offer, then choose its dates and the products with their offer prices. Press <b>Save</b> to publish.</p><div class="row">${[['diwali', '🪔 Diwali'], ['pongal', '🌾 Pongal'], ['puthandu', '🌼 Tamil New Year'], ['christmas', '🎄 Christmas'], ['eid', '🌙 Ramzan / Eid'], ['newyear', '🎆 New Year'], ['sale', '🏷️ Sale']].map(([k, l]) => `<button type="button" class="btn out sm" data-tpl="${k}">${l}</button>`).join('')}</div></div>`;
    listPage(c, { title: 'Offers & Festivals', sub: 'Festival offers (Diwali, Pongal…) with dates, products and offer prices. Offers show and hide automatically by date.', top, hint: 'Offer prices appear on the product cards automatically while the offer is live. Switch “Show this offer” off to hide an offer without deleting it.', lists: [{ key: 'offers', title: 'Offers', fields: OFFER_F, titleFn: it => (it.active ? '' : '(hidden) ') + (it.titleEn || it.titleTa || 'New offer'), add: 'Add custom offer', blank: { active: true, items: [] } }], extra: [{ group: 'site', fields: pairs(['offersTitle', 'Offers section title'], ['offersSub', 'Offers section subtitle']) }],
      onTop(el, { syncs, lists, draw }) { $$('[data-tpl]', el).forEach(b => b.onclick = () => { const l = lists[0], cur = syncs.offers(); cur.push({ id: '', active: true, startDate: '', endDate: '', discountPct: 10, ctaTa: '', ctaEn: '', link: '', items: [], ...TPL[b.dataset.tpl] }); l.items.splice(0, l.items.length, ...cur); draw(l); toast('Offer added below – choose dates and products, then press Save'); const last = $$('[data-list=offers] > .item', el).pop(); if (last) last.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); } });
  },
  stats(c) {
    c.innerHTML = head('Visitor Stats', 'How many people are visiting your website. Updates automatically every few seconds.') + `<div class="kpis vk" id="sk"><div class="empty">Loading…</div></div><div class="card"><h3>Last 14 days</h3><div id="bars"></div><p class="ps" style="margin-top:8px">A visitor is counted once per day per phone/computer. “Page views” counts every time the website is opened. Numbers come from real visits stored on your server.</p></div>`;
    const load = async () => { try { const s = await api('/stats', { poll: true }); const sk = $('#sk', c); if (!sk) return; sk.innerHTML = s.total.views ? visitorCards(s, true) : emptyStats(); $('#bars', c).innerHTML = s.total.views ? barsHtml(s.days) : '<div class="empty">The chart will appear after the first visit.</div>'; } catch (ex) { /* ignore */ } };
    load(); const iv = setInterval(() => { if (!document.body.contains(c) || tab !== 'stats') return clearInterval(iv); load(); }, 8000);
  },
  chrome(c) {
    formPage(c, 'Header & Footer', 'Everything at the very top and very bottom of the customer website: announcement bar, header, footer, “Website created by” credit and the title shown on Google.', [{ group: 'site', fields: [
      ['-', 'Top announcement bar (leave both boxes empty to hide it)'], ['announcementTa', 'Announcement – Tamil / தமிழ்'], ['announcement', 'Announcement – English'],
      ['-', 'Header'], ['estShow', 'Show “EST. year” above the shop name (computers)', 'bool', '', true], ['estLabel', 'Text before the year (default: EST.)'], ['callPill', 'Show the phone-number button in the header (computers)', 'bool', '', true], ['langBtn', 'Show the Tamil / English language switch', 'bool', '', true],
      ['-', 'Footer'], ...pairs(['footerText', 'Footer text']), ['copyright', 'Copyright text'], ['footerShowGst', 'Show GSTIN in the footer (set it in Store Settings)', 'bool', '', false],
      ['-', '“Website created by” credit'], ['creatorShow', 'Show the credit line', 'bool', '', true], ['creatorLabelTa', 'Wording – Tamil / தமிழ் (optional)'], ['creatorLabelEn', 'Wording – English', 'text', 'Default: Website created by'], ['creatorName', 'Creator name'], ['creatorPhone', 'Creator mobile (visitors can tap to call)'], ['creatorLink', 'Creator website link (optional)', 'text', 'https://…'],
      ['-', 'How the website appears on Google and in the browser tab'], ['seoTitle', 'Page title', 'text', 'Leave empty to use the shop name automatically'], ['seoDesc', 'Short description', 'area', 'Leave empty to build it from your tagline']] }]);
  },
  typography(c) {
    const T = window.CXTypo; const cur = T.resolve(C().site); let st = { ...cur };
    const sel = (k, label, list) => `<div class="f"><label>${label}</label><select data-t="${k}">${list.map(f => `<option value="${f.id}" ${f.id === st[k] ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></div>`;
    const rng = (k, label, un = '') => { const [, lo, hi, stp] = T.NUM[k]; return `<div class="f"><label>${label}: <b data-tv="${k}">${st[k]}${un}</b></label><input type="range" data-t="${k}" data-un="${un}" min="${lo}" max="${hi}" step="${stp}" value="${st[k]}"></div>`; };
    c.innerHTML = head('Typography Settings', 'Choose the fonts and spacing for Tamil and English text. The preview changes instantly; press Save & apply to publish it on the website and in this admin panel.') + `<div class="typo-grid"><div>
      <div class="card"><h3>Fonts</h3>${sel('taFont', 'Tamil font', T.TAMIL)}${sel('enFont', 'English font (text)', T.ENGLISH)}${sel('enHeadFont', 'English font (headings)', T.ENGLISH)}</div>
      <div class="card"><h3>Size</h3>${rng('taSize', 'Tamil text size', '%')}${rng('enSize', 'English text size', '%')}${rng('paraScale', 'Paragraph text size', '%')}${rng('headScale', 'Heading size', '%')}</div>
      <div class="card"><h3>Line height</h3><p class="ps" style="margin-bottom:8px">Tamil letters have marks above and below, so they need more line height than English.</p>${rng('taLine', 'Tamil paragraph line height', '×')}${rng('enLine', 'English paragraph line height', '×')}${rng('headLineTa', 'Tamil heading line height', '×')}${rng('headLineEn', 'English heading line height', '×')}</div>
      <div class="card"><h3>Letter &amp; word spacing</h3>${rng('taLetter', 'Tamil letter spacing', ' em')}${rng('enLetter', 'English letter spacing', ' em')}${rng('headLetter', 'Heading letter spacing', ' em')}${rng('taWord', 'Tamil word spacing', ' em')}${rng('enWord', 'English word spacing', ' em')}</div></div>
      <div class="typo-side"><div class="card"><h3>Live preview <span class="tp-sizes" role="group" aria-label="Preview width"><button type="button" data-w="360">📱 Phone</button><button type="button" data-w="768">Tablet</button><button type="button" data-w="100%" class="on">Desktop</button></span></h3>
      <div class="tp-frame" id="tpf"><div class="tp" id="tp"><h2><span class="ta">தரமான வீட்டு உபயோகப் பொருட்கள்</span><span class="en">Quality Home Needs</span></h2>
      <p><span class="ta">எங்கள் கடையில் சமையலறை பாத்திரங்கள், பிளாஸ்டிக் பொருட்கள் மற்றும் பரிசுப் பொருட்கள் அனைத்தும் சில்லறை மற்றும் மொத்த விலையில் கிடைக்கும்.</span><span class="en">Kitchenware, plastic items and gifts, all available at retail and wholesale prices in one friendly shop.</span></p>
      <h3><span class="ta">இன்றைய சிறப்புச் சலுகை</span><span class="en">Today's special offer</span></h3><ul><li><span class="ta">பிரஷர் குக்கர் – 5 லிட்டர்</span><span class="en">Pressure cooker – 5 litre</span></li><li><span class="ta">சில்வர் டிபன் பாக்ஸ் செட்</span><span class="en">Steel tiffin box set</span></li></ul>
      <span class="tp-btn"><span class="ta">இப்போதே விசாரிக்க</span><span class="en">Enquire now</span></span></div></div></div>
      <div class="card"><div class="row"><button type="button" class="btn gold" id="tySave">💾 Save &amp; apply</button><button type="button" class="btn out" id="tyDiscard">Discard changes</button><button type="button" class="btn out" id="tyReset">Reset to recommended</button><button type="button" class="btn out" id="tySite">🌐 Check on website</button></div><p class="ps" id="tyMsg" style="margin:10px 0 0"></p></div></div></div>`;
    const tp = $('#tp', c); const loaded = new Set();
    const paint = () => { Object.entries(T.vars(st)).forEach(([k, v]) => tp.style.setProperty(k, v)); const href = T.fontsHref(st); if (!loaded.has(href)) { loaded.add(href); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); } const same = JSON.stringify(T.resolve({ typo: st })) === JSON.stringify(cur); $('#tyMsg', c).textContent = same ? 'Showing the saved settings.' : 'Preview only – not saved yet.'; };
    c.addEventListener('input', e => { const el = e.target.closest('[data-t]'); if (!el) return; const k = el.dataset.t; st[k] = el.tagName === 'SELECT' ? el.value : Number(el.value); const b = $(`[data-tv="${k}"]`, c); if (b) b.textContent = st[k] + (el.dataset.un || ''); paint(); });
    c.addEventListener('change', e => { const el = e.target.closest('select[data-t]'); if (el) { st[el.dataset.t] = el.value; paint(); } });
    $$('.tp-sizes button', c).forEach(b => b.onclick = () => { $$('.tp-sizes button', c).forEach(x => x.classList.toggle('on', x === b)); $('#tpf', c).style.maxWidth = b.dataset.w === '100%' ? '100%' : b.dataset.w + 'px'; });
    const redraw = () => { const y = window.scrollY; views.typography(c); window.scrollTo(0, y); };
    $('#tyDiscard').onclick = () => { st = { ...cur }; redraw(); };
    $('#tyReset').onclick = () => { if (!confirm('Put every typography setting back to the recommended values? (Press Save & apply afterwards to publish.)')) return; st = { ...T.DEFAULTS }; redraw(); };
    $('#tySite').onclick = openCustomer;
    $('#tySave').onclick = async () => {
      const b = $('#tySave'); b.disabled = true; const prev = C().site.typo;
      C().site.typo = T.resolve({ typo: st });
      if (await persist()) { const old = $('#cx-typo'); const css = T.css(C().site.typo); if (old) old.textContent = css; else { const el = document.createElement('style'); el.id = 'cx-typo'; el.textContent = css; document.head.appendChild(el); } toast('Typography saved – live on the website ✓'); render(); } else { C().site.typo = prev; b.disabled = false; }
    };
    paint();
  },
  menu(c) {
    const DEF_MENU = ['home', 'products', 'categories', 'rw', 'offers', 'gallery', 'about', 'contact'];
    const DEF_SECS = ['stats', 'strips', 'categories', 'products', 'rw', 'offers', 'why', 'gallery', 'about', 'testimonials', 'contact', 'cta'];
    const SEC_NAME = { stats: 'Number counters (years of service, products…)', strips: 'Scrolling highlights strip', categories: 'Categories', products: 'Products', rw: 'Retail & Wholesale', offers: 'Offers (appears only while an offer is live)', why: 'Why choose us', gallery: 'Shop gallery', about: 'About the store', testimonials: 'Customer reviews', contact: 'Contact, map & enquiry form', cta: 'Bulk-buy banner' };
    const site = C().site;
    const norm = (list, defs) => { const out = [], seen = new Set(); for (const x of (Array.isArray(list) ? list : [])) if (x && x.id && !seen.has(x.id)) { seen.add(x.id); out.push({ ...x }); } for (const id of defs) if (!seen.has(id)) out.push({ id, show: true }); return out.filter(x => defs.includes(x.id) || x.custom); };
    let menu = norm(site.menu, DEF_MENU), secs = norm(site.sections, DEF_SECS);
    const dflt = id => (LBL[id] || ['', '']);
    const read = () => { menu = $$('#mn-list .item', c).map(el => ({ id: el.dataset.id, custom: el.dataset.custom === '1', show: $('[data-k=show]', el).checked, ta: $('[data-k=ta]', el).value.trim(), en: $('[data-k=en]', el).value.trim(), link: el.dataset.custom === '1' ? $('[data-k=link]', el).value.trim() : '' })); secs = $$('#sc-list .item', c).map(el => ({ id: el.dataset.id, show: $('[data-k=show]', el).checked })); };
    const draw = () => {
      c.innerHTML = head('Menu & Sections', 'Choose which menu items and which home-page sections are shown, and the order they appear in.') + `
      <div class="card"><h3>Menu bar <small style="font-weight:400;color:var(--muted)">(the pills under the header on phones, the top bar on computers, and the side menu)</small></h3><div id="mn-list">${menu.map((m, i) => `<div class="item mrow" data-id="${esc(m.id)}" data-custom="${m.custom ? 1 : 0}"><div class="ih"><label class="swt"><input type="checkbox" data-k="show" ${m.show !== false ? 'checked' : ''}><span>Show</span></label><span style="flex:1"></span><button type="button" class="btn out ic" data-mv="-1">↑</button><button type="button" class="btn out ic" data-mv="1">↓</button>${m.custom ? '<button type="button" class="btn red ic" data-del>✕</button>' : ''}</div>
        <div class="grid2"><div class="f"><label>Name – Tamil</label><input data-k="ta" value="${esc(m.ta || '')}" placeholder="${esc(dflt(m.id)[0])}"></div><div class="f"><label>Name – English</label><input data-k="en" value="${esc(m.en || '')}" placeholder="${esc(dflt(m.id)[1])}"></div>${m.custom ? `<div class="f" style="grid-column:1/-1"><label>Link</label><input data-k="link" value="${esc(m.link || '')}" placeholder="#products  or  https://…"></div>` : ''}</div></div>`).join('')}</div>
        <button type="button" class="btn out" id="mn-add">+ Add a menu link</button></div>
      <div class="card"><h3>Home-page sections <small style="font-weight:400;color:var(--muted)">(top to bottom)</small></h3><div id="sc-list">${secs.map(m => `<div class="item mrow" data-id="${esc(m.id)}"><div class="ih"><label class="swt"><input type="checkbox" data-k="show" ${m.show !== false ? 'checked' : ''}><span>${esc(SEC_NAME[m.id] || m.id)}</span></label><span style="flex:1"></span><button type="button" class="btn out ic" data-mv="-1">↑</button><button type="button" class="btn out ic" data-mv="1">↓</button></div></div>`).join('')}</div></div>
      <div class="savebar"><button class="btn gold" id="saveBtn">💾 Save menu &amp; sections</button><button type="button" class="btn out" data-viewsite>View website</button><button type="button" class="btn red" id="mn-reset">Reset to default</button></div>`;
      const move = (listId, arr, e) => { const it = e.target.closest('.item'); const mv = e.target.closest('[data-mv]'); if (!it || !mv) return false; read(); const i = $$(`#${listId} .item`, c).indexOf(it), j = i + +mv.dataset.mv; if (j < 0 || j >= arr().length) return true; const a = arr(); [a[i], a[j]] = [a[j], a[i]]; draw(); return true; };
      $('#mn-list').onclick = e => { if (move('mn-list', () => menu, e)) return; if (e.target.closest('[data-del]')) { read(); const it = e.target.closest('.item'); menu = menu.filter(m => m.id !== it.dataset.id); draw(); } };
      $('#sc-list').onclick = e => { move('sc-list', () => secs, e); };
      $('#mn-add').onclick = () => { read(); menu.push({ id: uid('m'), custom: true, show: true, ta: '', en: 'New link', link: '#products' }); draw(); };
      $('#mn-reset').onclick = async () => { if (!confirm('Reset the menu and the section order to the default?')) return; C().site.menu = []; C().site.sections = []; if (await persist()) { toast('Reset – live on the website ✓'); render(); } };
      $('#saveBtn').onclick = async () => { read(); if (!menu.some(m => m.show)) return toast('Keep at least one menu item shown', true); C().site.menu = menu; C().site.sections = secs; if (await persist()) toast('Saved – live on the website ✓'); };
    };
    draw();
  },
  labels(c) {
    const G = [
      ['Buttons', ['call', 'wa', 'visit', 'details', 'enquire', 'viewProducts', 'retailBtn', 'whBtn', 'directions', 'send', 'viewOffer', 'all', 'all2']],
      ['Products & prices', ['search', 'notFound', 'retail', 'wholesale', 'retailAv', 'wholesaleAv', 'askPrice', 'oos']],
      ['Enquiry form', ['enqTitle', 'sendEnq', 'general', 'name', 'phone', 'msg']],
      ['Footer & contact headings', ['quick', 'hours', 'address']],
      ['Bulk-buy banner', ['ctaT', 'ctaS']],
      ['Small headings above section titles', ['eyCat', 'eyProd', 'eyRw', 'eyOffers', 'eyWhy', 'eyGal', 'eyContact', 'eyReviews']],
      ['Offer details page', ['offerEnded', 'offerPrice', 'youSave', 'offerCount', 'offerNow', 'offerOngoing', 'offerPeriod', 'offerList', 'offerIncl', 'offerDetails', 'enqOffer', 'lastDay', 'daysLeft', 'dayLeft', 'backBtn']],
      ['Messages', ['errName', 'errPhone', 'waOpening']],
      ['Customer reviews', ['reviewsTitle', 'writeReview', 'rvFormTitle', 'rvYourName', 'rvYourRating', 'rvYourText', 'rvSend', 'rvThanksPending', 'rvThanksLive', 'rvErrName', 'rvErrRating', 'rvErrText', 'rvErrLinks', 'rvErrLimit', 'rvErr', 'rvShopReply', 'rvMore', 'rvNone', 'rvCount', 'rvCount1']],
      ['Other texts', ['photosSoon', 'emailLbl']]
    ];
    const NAME = { call: 'Call button', wa: 'WhatsApp button', visit: 'Visit store button', details: 'Product “details” button', enquire: 'Product “enquire” button', viewProducts: '“View all products” button', retailBtn: 'Retail products button', whBtn: 'Wholesale enquiry button', directions: 'Directions button', send: 'Send enquiry button', viewOffer: 'Offer “view details” button', all: '“All” filter', all2: '“All offers”', search: 'Search box hint', notFound: 'No products found', retail: 'Retail tag', wholesale: 'Wholesale tag', retailAv: 'Available in retail', wholesaleAv: 'Available in wholesale', askPrice: 'Price not set', oos: 'Out of stock', enqTitle: 'Enquiry window title', sendEnq: 'Enquiry form title', general: '“General” enquiry type', name: 'Name box', phone: 'Mobile box', msg: 'Message box', quick: 'Footer “Quick links”', hours: 'Store timings heading', address: 'Address heading', ctaT: 'Banner title', ctaS: 'Banner text', eyCat: 'Above Categories', eyProd: 'Above Products', eyRw: 'Above Retail & Wholesale', eyOffers: 'Above Offers', eyWhy: 'Above Why choose us', eyGal: 'Above Gallery', eyContact: 'Above Contact', eyReviews: 'Above Reviews', reviewsTitle: 'Reviews section title', photosSoon: 'Empty gallery message', emailLbl: 'Email heading (contact)', backBtn: 'Back button (offer page)', lastDay: 'Offer: last day', daysLeft: 'Offer: days left – use {n} for the number', dayLeft: 'Offer: 1 day left – use {n} for the number', offerEnded: 'Offer: ended notice', offerPrice: 'Offer: “Offer price”', youSave: 'Offer: “You save”', offerCount: 'Offer: number of products', offerNow: 'Offer: starts now', offerOngoing: 'Offer: no end date', offerPeriod: 'Offer: “Offer period”', offerList: 'Offer: products heading', offerIncl: 'Offer: “What’s included”', offerDetails: 'Offer: “Offer details”', enqOffer: 'Offer: enquire button', errName: 'Enquiry form: name missing', errPhone: 'Enquiry form: bad mobile number', waOpening: 'Message when WhatsApp opens', writeReview: 'Write-a-review button', rvFormTitle: 'Review window title', rvYourName: 'Review: name box', rvYourRating: 'Review: rating heading', rvYourText: 'Review: text box', rvSend: 'Review: submit button', rvThanksPending: 'Review: thanks (waits for approval)', rvThanksLive: 'Review: thanks (published at once)', rvErrName: 'Review: name missing', rvErrRating: 'Review: rating missing', rvErrText: 'Review: text too short', rvErrLinks: 'Review: links not allowed', rvErrLimit: 'Review: too many sent', rvErr: 'Review: could not send', rvShopReply: 'Review: “Reply from the shop”', rvMore: 'Review: show-more button', rvNone: 'Review: no reviews yet', rvCount: 'Review count – use {n}', rvCount1: 'Review count (one review)' };
    const L = C().site.labels || {};
    c.innerHTML = head('Website Text & Labels', 'Change the words on buttons, tags, forms and small headings. Leave a box empty to keep the original wording. Section titles are in Home Page Settings; menu names are in Menu & Sections.') +
      G.map(([t, keys]) => `<div class="card"><h3>${esc(t)}</h3>${keys.map(k => { const d = LBL[k], v = L[k] || ['', '']; return `<div class="lrow" data-k="${k}"><b>${esc(NAME[k] || k)}</b><div class="grid2"><div class="f"><label>Tamil</label><input data-ta value="${esc(v[0] || '')}" placeholder="${esc(d[0])}"></div><div class="f"><label>English</label><input data-en value="${esc(v[1] || '')}" placeholder="${esc(d[1])}"></div></div></div>`; }).join('')}</div>`).join('') +
      '<div class="savebar"><button class="btn gold" id="saveBtn">💾 Save texts</button><button type="button" class="btn out" data-viewsite>View website</button><button type="button" class="btn red" id="lb-reset">Reset all texts</button></div>';
    const collect = () => { const o = {}; $$('.lrow', c).forEach(r => { const ta = $('[data-ta]', r).value.trim(), en = $('[data-en]', r).value.trim(); if (ta || en) o[r.dataset.k] = [ta, en]; }); return o; };
    $('#saveBtn').onclick = async () => { C().site.labels = collect(); if (await persist()) toast('Saved – live on the website ✓'); };
    $('#lb-reset').onclick = async () => { if (!confirm('Put every text back to the original wording?')) return; C().site.labels = {}; if (await persist()) { toast('Reset – live on the website ✓'); render(); } };
  },
  prices(c) {
    const cats = C().categories, q0 = (sub.pq || '').toLowerCase(), cf = sub.pc || '';
    c.innerHTML = head('Price List', 'Quickly update price, MRP, unit and availability of all products. Press Save once at the bottom.') + `
    <div class="card"><div class="row"><input id="pl-q" placeholder="Search products…" value="${esc(sub.pq || '')}" style="flex:1;min-width:160px;border:1.5px solid var(--line);border-radius:12px;padding:9px 12px;font:inherit"><select id="pl-c" style="border:1.5px solid var(--line);border-radius:12px;padding:9px 12px;font:inherit"><option value="">All categories</option>${cats.map(x => `<option value="${esc(x.id)}" ${x.id === cf ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div></div>
    <div class="card tw"><table class="pl"><thead><tr><th>Product</th><th>Price ₹</th><th>MRP ₹</th><th>Unit</th><th>In stock</th><th>Show</th></tr></thead><tbody>
    ${C().products.map(p => `<tr data-pid="${esc(p.id)}" data-name="${esc((p.name + ' ' + (p.nameTa || '')).toLowerCase())}" data-cat="${esc(p.category)}"><td><b>${esc(p.name)}</b><br><small>${esc((cats.find(x => x.id === p.category) || {}).name || '')}</small></td><td><input type="number" min="0" step="any" data-f="price" value="${esc(p.price ?? '')}"></td><td><input type="number" min="0" step="any" data-f="mrp" value="${esc(p.mrp ?? '')}"></td><td><input data-f="unit" value="${esc(p.unit || '')}" placeholder="Each"></td><td><input type="checkbox" data-f="inStock" ${p.inStock !== false ? 'checked' : ''}></td><td><input type="checkbox" data-f="visible" ${p.visible !== false ? 'checked' : ''}></td></tr>`).join('') || '<tr><td colspan="6">No products yet</td></tr>'}</tbody></table></div>${saveBar('Save prices')}`;
    const filt = () => { const k = $('#pl-q').value.trim().toLowerCase(), cc = $('#pl-c').value; sub.pq = $('#pl-q').value; sub.pc = cc; $$('tr[data-pid]', c).forEach(r => r.style.display = (!k || r.dataset.name.includes(k)) && (!cc || r.dataset.cat === cc) ? '' : 'none'); };
    $('#pl-q').oninput = filt; $('#pl-c').onchange = filt; filt();
    $('#saveBtn').onclick = async () => {
      $$('tr[data-pid]', c).forEach(r => { const p = C().products.find(x => x.id === r.dataset.pid); if (!p) return; const g = f => $(`[data-f=${f}]`, r); p.price = g('price').value === '' ? null : Number(g('price').value); p.mrp = g('mrp').value === '' ? null : Number(g('mrp').value); p.unit = g('unit').value.trim(); p.inStock = g('inStock').checked; p.visible = g('visible').checked; });
      if (await persist()) toast('Prices saved – live on the website ✓');
    };
  },
  gallery(c) { galleryPage(c); },
  rw(c) { formPage(c, 'Retail & Wholesale Settings', 'Texts of the Retail Shopping and Wholesale Enquiry sections.', [{ group: 'site', fields: [['-', 'Section heading'], ...pairs(['rwTitle', 'Section title'], ['rwSub', 'Section subtitle']), ['-', 'Retail Shopping'], ...pairs(['retailTitle', 'Retail title'], ['retail', 'Retail description', 'area']), ['retailPointsTa', 'Retail points – Tamil (one per line)', 'area'], ['retailPointsEn', 'Retail points – English (one per line)', 'area'], ['-', 'Wholesale Enquiry'], ...pairs(['wholesaleTitle', 'Wholesale title'], ['wholesale', 'Wholesale description', 'area']), ['wholesalePointsTa', 'Wholesale points – Tamil (one per line)', 'area'], ['wholesalePointsEn', 'Wholesale points – English (one per line)', 'area']] }]); },
  contact(c) { formPage(c, 'Contact Settings', 'Phone, WhatsApp, email, address, store timings and Google Map.', [{ group: 'shop', fields: [['phones', 'Phone numbers (one per line)', 'lines'], ['whatsapp', 'WhatsApp number with country code', 'text', 'Example: 919942875331'], ['email', 'Email'], ['address', 'Store address (one line per row)', 'lines'], ['hours', 'Store timings (one per line, use | between day and time)', 'lines', 'Example: Monday – Saturday | 9:00 AM – 8:30 PM'], ['mapQuery', 'Google Maps search text', 'text', 'Shop name + town. The map and Directions button use this.'], ['countryCode', 'Country code for phone and WhatsApp links (digits only)', 'text', 'India = 91. Numbers you type without a country code get this added so “tap to call” works.']] }, { group: 'site', fields: [['-', 'Contact section'], ['mapShow', 'Show the Google Map', 'bool', '', true], ...pairs(['contactTitle', 'Contact section title'], ['contactSub', 'Contact section subtitle'])] }]); },
  store(c) { formPage(c, 'Store Settings', 'Logo, shop name and basic details.', [{ group: 'site', fields: [['-', 'Shop logo'], ['logo', 'Logo image', 'img', 'Shown in the header, footer, loading screen and browser tab. A square picture works best. Press Remove to go back to the plain “CH” badge.']] }, { group: 'shop', fields: [['name', 'Shop name (English)'], ['nameTa', 'Shop name (Tamil / தமிழ்)'], ['tagline', 'Shop tagline (English)'], ['city', 'City'], ['est', 'Established year'], ['estLabel', 'Word under the year (default EST.)'], ['gstin', 'GSTIN (optional)'], ['gstNote', 'GST note (optional)']] }]); },
  display(c) {
    const DEF = { uiZoom: 100, uiHeroHeightM: 420, uiHeroHeightD: 600, uiHeroTitleM: 26, uiHeroTitleD: 54, uiLogo: 56, uiLogoText: false, uiFabLabel: false, uiColsM: '2', uiColsD: '4', uiRatio: '1/1', uiCatIcon: 72, uiCatColsM: '2', uiGalColsM: '2', uiGalColsD: '4', uiSecPad: 56, uiRadius: 20, uiAnim: 'full', uiGlow: true, uiColorBrown: '', uiColorBrown2: '', uiColorGold: '', uiColorGold2: '', uiColorCream: '' };
    const F = [
      ['-', 'Animations & effects'], ['uiAnim', 'Scroll animations', 'select', [['full', 'Full (recommended)'], ['light', 'Light (smoother on old phones)'], ['off', 'Off']]], ['uiGlow', 'Glowing, shining button effects', 'bool'],
      ['-', 'Brand colours (leave as is to keep the current look)'], ['uiColorBrown', 'Main dark colour (header text, buttons, footer)', 'color', '#4a2f20'], ['uiColorBrown2', 'Second dark colour', 'color', '#5c3d2e'], ['uiColorGold', 'Accent colour (gold)', 'color', '#b08a2e'], ['uiColorGold2', 'Light accent colour', 'color', '#e8c97a'], ['uiColorCream', 'Page background colour', 'color', '#faf6ef'],
      ['-', 'Whole page'], ['uiZoom', 'Overall size of all page content', 'range', [70, 130, 5, '%']], ['uiSecPad', 'Space between sections', 'range', [16, 140, 4, ' px']], ['uiRadius', 'Rounded corners', 'range', [0, 40, 2, ' px']],
      ['-', 'Logo & header'], ['uiLogo', 'Logo size', 'range', [28, 140, 2, ' px']], ['uiLogoText', 'Also show the shop name text next to the logo', 'bool'],
      ['-', 'Top banner (hero) – phones'], ['uiHeroHeightM', 'Minimum banner height on phones', 'range', [260, 800, 10, ' px']], ['uiHeroTitleM', 'Main title size on phones', 'range', [16, 56, 1, ' px']],
      ['-', 'Top banner (hero) – computers & tablets'], ['uiHeroHeightD', 'Minimum banner height on computers', 'range', [360, 900, 10, ' px']], ['uiHeroTitleD', 'Main title size on computers', 'range', [24, 96, 2, ' px']],
      ['-', 'Products'], ['uiColsM', 'Products per row on phones', 'select', [['1', '1 (large cards)'], ['2', '2 (recommended)']]], ['uiColsD', 'Products per row on computers', 'select', [['3', '3'], ['4', '4'], ['5', '5']]], ['uiRatio', 'Product photo shape', 'select', [['1/1', 'Square'], ['4/3', 'Wide'], ['3/4', 'Tall']]],
      ['-', 'Categories'], ['uiCatIcon', 'Category icon size', 'range', [40, 130, 2, ' px']], ['uiCatColsM', 'Categories per row on phones', 'select', [['2', '2'], ['3', '3']]],
      ['-', 'Shop gallery'], ['uiGalColsM', 'Gallery photos per row on phones', 'select', [['1', '1'], ['2', '2'], ['3', '3']]], ['uiGalColsD', 'Gallery photos per row on computers', 'select', [['3', '3'], ['4', '4'], ['5', '5']]],
      ['-', 'WhatsApp button'], ['uiFabLabel', 'Show the words “WhatsApp Us” on the floating button on phones (off = small round button)', 'bool']
    ];
    formPage(c, 'Display & Sizes', 'Control the size and layout of items on the customer website. Fonts, text sizes and spacing are in Typography Settings. Press Save, then use Refresh Customer Website to see the result.', [{ group: 'site', fields: F }], '<div class="card"><h3>Reset</h3><button type="button" class="btn red" id="uiReset">Reset all sizes to the recommended values</button></div>');
    $('#uiReset').onclick = async () => { if (!confirm('Reset every size on this page to the recommended values?')) return; Object.assign(C().site, DEF); if (await persist()) { toast('Sizes reset – live on the website ✓'); render(); } };
  },
  social(c) {
    formPage(c, 'Social Media Settings', 'Links appear as icons in the footer. Leave empty to hide an icon. The WhatsApp group button appears on the website only while a valid invite link is saved.', [{ group: 'social', fields: [['facebook', 'Facebook page link', 'text', 'https://facebook.com/...'], ['instagram', 'Instagram link', 'text', 'https://instagram.com/...'], ['youtube', 'YouTube link', 'text', 'https://youtube.com/...'], ['website', 'Other website link', 'text', 'https://...'], ['-', 'WhatsApp group'], ['whatsappGroup', 'WhatsApp group invitation link', 'text', 'Paste the invite link from WhatsApp → Group info → Invite via link. It looks like https://chat.whatsapp.com/AbCdEfGhIjKlMn. Leave empty to hide the button.'], ['whatsappGroupLabelTa', 'Join button text – Tamil / தமிழ்'], ['whatsappGroupLabelEn', 'Join button text – English'], ['whatsappGroupTitleTa', 'Banner heading – Tamil / தமிழ்'], ['whatsappGroupTitleEn', 'Banner heading – English'], ['whatsappGroupTextTa', 'Banner text – Tamil / தமிழ்', 'area'], ['whatsappGroupTextEn', 'Banner text – English', 'area']] }],
      '<div class="card"><h3>Test the group link</h3><p class="ps" style="margin-bottom:10px">Opens the link you typed above exactly as visitors will see it.</p><button type="button" class="btn out" id="waTest">Open WhatsApp group link</button></div>',
      { validate: b => { const so = b.social || {}; for (const k of ['facebook', 'instagram', 'youtube', 'website']) { const v = (so[k] || '').trim(); if (v && !/^https?:\/\/\S+$/i.test(v)) return `The ${k} link must start with https://`; } const g = (so.whatsappGroup || '').trim(); if (g && !WA_RE.test(g)) return 'The WhatsApp group link must look like https://chat.whatsapp.com/AbCdEfGhIjK (copy it from WhatsApp → Group info → Invite via link).'; so.whatsappGroup = g; return ''; } });
    $('#waTest').onclick = () => { const g = ($('[data-k=whatsappGroup]', c).value || '').trim(); if (!WA_RE.test(g)) return toast('Enter a valid link first: https://chat.whatsapp.com/…', true); window.open(g, '_blank', 'noopener,noreferrer'); };
  },
  backup(c) {
    c.innerHTML = head('Backup & Security', 'Keep your content safe and protect your admin account.') + `
    <div class="card"><h3>Change admin login</h3><p class="ps" style="margin-bottom:10px">You can sign in with <b>either Password 1 or Password 2</b>. Enter one current password, then change the username and/or either password. Leave a box empty to keep it. Each password needs 8+ characters with letters and numbers, and the two must be different.</p><div class="grid2"><div class="f"><label>Current password (1 or 2)</label><input type="password" id="pw1" autocomplete="off"></div><div class="f"><label>New username (optional)</label><input id="pwU" autocomplete="off" maxlength="40"></div><div class="f"><label>New password 1 (optional)</label><input type="password" id="pw2" autocomplete="new-password"></div><div class="f"><label>New password 2 (optional)</label><input type="password" id="pw2b" autocomplete="new-password"></div></div><button class="btn out" id="pwBtn">Change login</button></div>
    <div class="card"><h3>Full website backup (ZIP)</h3><p class="ps" style="margin-bottom:12px">Downloads your current website content, products, prices, settings, uploaded photos, visitor statistics and saved content versions in one ZIP. Admin password and sessions are deliberately excluded.</p><div class="row"><button class="btn gold" id="zipExp">⬇ Download full backup (.zip)</button><label class="btn out">⬆ Restore full backup (.zip)<input type="file" id="zipImp" accept=".zip,application/zip" hidden></label></div><p class="ps" style="margin-top:10px">Before restoring, a safety copy of the current data is created. Restore keeps your current admin password. Store downloaded backups somewhere private.</p></div><div class="card"><h3>Content-only backup (JSON)</h3><p class="ps" style="margin-bottom:12px">For text, products and settings only; photos are not included in this small backup.</p><div class="row"><button class="btn out" id="exp">⬇ Export content (.json)</button><label class="btn out">⬆ Import content<input type="file" id="imp" accept=".json,application/json" hidden></label></div></div>
    <div class="card"><h3>Automatic backups</h3><p class="ps" style="margin-bottom:12px">A copy of the previous version is kept every time you save (last 40). Restore one if something goes wrong.</p><div id="bk">Loading…</div></div>
    <div class="card"><h3>Free up space</h3><p class="ps" style="margin-bottom:12px">Deletes uploaded photos that are not used anywhere (including in the automatic backups).</p><button class="btn out" id="clean">Delete unused photos</button></div>
    <div class="card"><h3>Sign out</h3><button class="btn red" id="out2">Sign out of this device</button></div>`;
    const dl = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
    $('#pwBtn').onclick = async () => { try { await api('/password', { method: 'POST', body: { current: $('#pw1').value, username: $('#pwU').value.trim(), next1: $('#pw2').value, next2: $('#pw2b').value } }); toast('Login details changed ✓'); ['pw1', 'pwU', 'pw2', 'pw2b'].forEach(i => $('#' + i).value = ''); } catch (ex) { toast(ex.message, true); } };
    $('#exp').onclick = async () => { try { const d = await api('/content'); dl('classic-home-needs-content.json', JSON.stringify(d, null, 2), 'application/json'); } catch (ex) { toast(ex.message, true); } };
    $('#zipExp').onclick = async () => { const b=$('#zipExp'); b.disabled=true; try { const r=await fetch(BASE+'/api/backup/export',{credentials:'same-origin',cache:'no-store',headers:{'X-Requested-With':'cx'}}); if(!r.ok){let j={};try{j=await r.json()}catch{} throw new Error(j.error||'Backup download failed');} const blob=await r.blob(); const a=document.createElement('a'); const u=URL.createObjectURL(blob); a.href=u; const d=new Date(); const stamp=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')+'_'+[String(d.getHours()).padStart(2,'0'),String(d.getMinutes()).padStart(2,'0'),String(d.getSeconds()).padStart(2,'0')].join('-'); a.download='classix-home-needs-full-backup-'+stamp+'.zip'; a.click(); setTimeout(()=>URL.revokeObjectURL(u),5000); toast('Full ZIP backup downloaded ✓'); } catch(ex){toast(ex.message,true)} finally{b.disabled=false;} };
    $('#zipImp').onchange = async e => { const f=e.target.files[0]; if(!f)return; try { if(!/\.zip$/i.test(f.name)) throw new Error('Please choose a ZIP backup file'); if(!confirm('Restore this full ZIP backup? Website content and visitor statistics may be replaced. Your current admin password will stay unchanged. A safety backup will be created first.')) return; const r=await fetch(BASE+'/api/backup/restore',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'X-Requested-With':'cx','Content-Type':'application/zip'},body:f}); let j={}; try{j=await r.json()}catch{} if(!r.ok)throw new Error(j.error||'Restore failed'); C0=j.content||await api('/content'); toast('Full backup restored ✓'); render(); } catch(ex){toast(ex.message,true)} finally{e.target.value='';} };
    $('#imp').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (!d.shop || !d.site || !d.categories) throw new Error('This is not a content file'); if (!confirm('Replace ALL current website content with this file?')) return; d.v = C().v; C0 = d; if (await persist(true)) { toast('Imported – live on the website ✓'); render(); } else C0 = await api('/content'); } catch (ex) { toast(ex.message, true); } e.target.value = ''; };
    const loadBk = async () => { try { const r = await api('/backups'); $('#bk').innerHTML = r.backups.length ? `<div class="tw"><table><tbody>${r.backups.slice(0, 15).map(b => `<tr><td>${esc(new Date(b.time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }))}</td><td>${Math.round(b.size / 1024)} KB</td><td><button class="btn out sm" data-restore="${esc(b.name)}">Restore</button></td></tr>`).join('')}</tbody></table></div>` : 'No backups yet – one is created the first time you save.';
      $$('[data-restore]', $('#bk')).forEach(b => b.onclick = async () => { if (!confirm('Restore this version? Your current content is backed up first.')) return; try { const x = await api('/restore', { method: 'POST', body: { name: b.dataset.restore } }); C0 = x.content; toast('Restored – live on the website ✓'); render(); } catch (ex) { toast(ex.message, true); } }); } catch (ex) { $('#bk').textContent = ex.message; } };
    loadBk();
    $('#clean').onclick = async () => { try { const r = await api('/cleanup', { method: 'POST', body: {} }); toast(r.removed ? `Removed ${r.removed} unused photo(s), freed ${(r.bytes / 1048576).toFixed(1)} MB` : 'No unused photos found'); } catch (ex) { toast(ex.message, true); } };
    $('#out2').onclick = logout;
  },
  home(c) {
    const T = [['hero', 'Hero'], ['sections', 'Section Titles'], ['showcase', 'Product Showcase'], ['why', 'Why Choose Us'], ['about', 'About'], ['reviews', 'Reviews'], ['footer', 'Footer & Chat']]; const cur = sub.home || 'hero';
    c.innerHTML = head('Home Page Settings', 'Edit every text and photo of the website. No code needed – press Save and it updates.') + tabsBar('ht', T, cur) + '<div id="hb"></div>';
    $$('#ht button').forEach(b => b.onclick = () => { sub.home = b.dataset.s; render(); });
    const hb = $('#hb');
    if (cur === 'hero') formPage(hb, null, null, [{ group: 'site', fields: [['-', 'Announcement bar (top of the website)'], ['announcementTa', 'Announcement – Tamil / தமிழ்'], ['announcement', 'Announcement – English'], ['-', 'Hero heading'], ...pairs(['heroTag', 'Small tag above title']), ['heroTitleTa', 'Main hero title – Tamil / தமிழ்', 'area'], ['heroTitleEn', 'Main hero title – English', 'area'], ...pairs(['heroSub', 'Subtitle']), ...pairs(['promo', 'Promotional text']), ...pairs(['storeTagline', 'Store tagline']), ['-', 'Hero buttons'], ...[1, 2, 3].flatMap(n => [[`btn${n}TextTa`, `Button ${n} text – Tamil`], [`btn${n}TextEn`, `Button ${n} text – English`], [`btn${n}Link`, `Button ${n} link`, 'text', '#products  #rw  #contact  #gallery  or https://… or tel:+91…']])] }], '', { slides: true });
    else if (cur === 'sections') formPage(hb, null, null, [{ group: 'site', fields: pairs(['categoriesTitle', 'Category section title'], ['categoriesSub', 'Category section subtitle'], ['productsTitle', 'Product showcase title'], ['productsSub', 'Product showcase subtitle'], ['rwTitle', 'Retail & Wholesale title'], ['rwSub', 'Retail & Wholesale subtitle'], ['offersTitle', 'Offers title'], ['offersSub', 'Offers subtitle'], ['whyTitle', 'Why Choose Us title'], ['whySub', 'Why Choose Us subtitle'], ['galleryTitle', 'Shop Gallery title'], ['galleryDesc', 'Gallery description'], ['contactTitle', 'Contact title'], ['contactSub', 'Contact subtitle']) }]);
    else if (cur === 'showcase') {
      hb.innerHTML = `<div id="fw"></div><div class="card"><h3>Featured products (shown first)</h3><p class="hint">Tick the products you want shown first in the Product Showcase.</p>${C().products.map(p => `<div class="f chk"><input type="checkbox" data-fp="${p.id}" id="f${p.id}" ${p.featured ? 'checked' : ''}><label for="f${p.id}">${esc(p.name)} <small>${esc(p.nameTa || '')}</small></label></div>`).join('')}<button class="btn gold" id="fpSave">💾 Save featured products</button></div>`;
      formPage($('#fw'), null, null, [{ group: 'site', fields: pairs(['productsTitle', 'Product showcase title'], ['productsSub', 'Description']) }]);
      $('#fpSave').onclick = async () => { C().products.forEach(p => p.featured = $(`[data-fp="${p.id}"]`).checked); await persist(); toast('Saved ✓'); };
    }
    else if (cur === 'why') listPage(hb, { lists: [{ key: 'why', title: 'Why Choose Us points', fields: WHY_F, titleFn: it => it.titleEn || 'Point', add: 'Add point', blank: { icon: '⭐' } }, { key: 'stats', title: 'Numbers (animated counters)', fields: STAT_F, titleFn: it => it.en || 'Number', add: 'Add number', blank: {} }, { key: 'strips', title: 'Scrolling highlights strip', fields: STRIP_F, titleFn: it => it.en || 'Highlight', add: 'Add highlight', blank: {} }], extra: [{ group: 'site', fields: pairs(['whyTitle', 'Section title'], ['whySub', 'Section subtitle']) }] });
    else if (cur === 'about') formPage(hb, null, null, [{ group: 'site', fields: [...pairs(['aboutTitle', 'About title']), ['aboutTa', 'About content – Tamil / தமிழ்', 'area'], ['aboutEn', 'About content – English', 'area'], ['aboutImage', 'About photo', 'img']] }]);
    else if (cur === 'reviews') { C().testimonials = C().testimonials || []; listPage(hb, { lists: [{ key: 'testimonials', title: 'Customer reviews', fields: TESTI_F, titleFn: it => it.name || 'Review', add: 'Add review', blank: {} }], hint: 'Use real customer words only. Remove all reviews to hide this section.' }); }
    else formPage(hb, null, null, [{ group: 'site', fields: [...pairs(['footerText', 'Footer text']), ['copyright', 'Copyright text'], ['creatorName', 'Footer credit – name'], ['creatorPhone', 'Footer credit – mobile'], ['-', 'Floating WhatsApp button'], ['waButton', 'Show WhatsApp button on the website', 'bool'], ['waButtonMode', 'The floating WhatsApp button opens', 'select', [['contact', 'A chat with the shop (number in Contact Settings)'], ['group', 'The WhatsApp group (link in Social Media Settings)']]], ['waLabel', 'Button label'], ['waMessage', 'Preset message', 'area']] }]);
  }
};

const WA_RE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{10,40}\/?(\?[^\s#]*)?$/;
/* generic pages */
function formPage(c, title, subt, groups, extraHtml = '', opts = {}) {
  const slides = opts.slides ? C().slides.map(x => ({ ...x })) : null;
  c.innerHTML = (title ? head(title, subt) : '') + groups.map((g, gi) => `<div class="card" data-g="${gi}"><div class="grid2">${form(g.fields, C()[g.group], 'g' + gi)}</div></div>`).join('') + (slides ? '<div class="card"><h3>Hero photo slides</h3><p class="hint">These photos slide automatically behind the hero text. Up to 6.</p><div id="sl"></div></div>' : '') + extraHtml + saveBar();
  $$('.grid2', c).forEach(wide); $$('.grid2 h3', c).forEach(h => h.style.gridColumn = '1/-1');
  let sync;
  const draw = () => { if (!slides) return; $('#sl', c).innerHTML = listEditor('slides', SLIDE_F, slides, (it, i) => 'Slide ' + (i + 1), 'Add slide'); sync = bindList(c, 'slides', SLIDE_F, slides, {}, draw); };
  draw();
  $('#saveBtn', c).onclick = async () => {
    const body = {}; groups.forEach((g, gi) => { body[g.group] = { ...(body[g.group] || {}), ...read($(`[data-g="${gi}"]`, c), g.fields) }; });
    if (opts.validate) { const err = opts.validate(body); if (err) return toast(err, true); }
    if (slides) { body.slides = sync(); if (body.slides.some(s => !s.image)) return toast('Every slide needs a photo', true); }
    await saveContent(body);
  };
}
function listPage(c, o) {
  const lists = o.lists.map(l => ({ ...l, items: (C()[l.key] || []).map(x => ({ ...x })) })); const syncs = {};
  c.innerHTML = (o.title ? head(o.title, o.sub) : '') + (o.top || '') + (o.hint ? `<div class="hint">${esc(o.hint)}</div>` : '') + (o.extra || []).map((g, gi) => `<div class="card" data-g="${gi}"><div class="grid2">${form(g.fields, C()[g.group], 'x' + gi)}</div></div>`).join('') + lists.map(l => `<div class="card"><h3>${esc(l.title || 'Items')}</h3><div id="L-${l.key}"></div></div>`).join('') + saveBar();
  $$('.grid2', c).forEach(wide);
  const draw = l => { $('#L-' + l.key, c).innerHTML = listEditor(l.key, l.fields, l.items, l.titleFn, l.add); syncs[l.key] = bindList(c, l.key, l.fields, l.items, l.blank, () => draw(l)); };
  lists.forEach(draw);
  if (o.onTop) o.onTop(c, { syncs, lists, draw });
  $('#saveBtn', c).onclick = async () => { const body = {}; (o.extra || []).forEach((g, gi) => { body[g.group] = { ...(body[g.group] || {}), ...read($(`[data-g="${gi}"]`, c), g.fields) }; }); lists.forEach(l => body[l.key] = syncs[l.key]()); await saveContent(body); };
}

/* gallery management */
function galleryPage(c) {
  let items = C().gallery.map(x => ({ ...x })), gcats = C().galleryCategories.map(x => ({ ...x }));
  const sync = () => { $$('#gGrid .item', c).forEach(el => { const i = +el.dataset.i; items[i] = { ...items[i], title: $('[data-k=title]', el).value, description: $('[data-k=description]', el).value, category: $('[data-k=category]', el).value, visible: $('[data-k=visible]', el).checked }; }); };
  const syncCats = () => { gcats = $$('#gcats .item', c).map(el => ({ id: el.dataset.id, ...read(el, [['name'], ['ta']]) })); };
  const draw = () => {
    c.innerHTML = head('Gallery Management', 'Upload, edit, reorder, hide or delete shop photos. They appear in Shop Gallery on the website.') +
    `<div class="card"><h3>Upload photos</h3><div class="row">${picker('gal', true)}<span id="gMsg" style="color:var(--muted)"></span></div></div>
    <div class="card" id="gtext"><h3>Gallery section text</h3><div class="grid2">${form(pairs(['galleryTitle', 'Gallery title'], ['galleryDesc', 'Gallery description', 'area']), C().site, 'gt')}</div></div>
    <div class="card"><h3>Gallery categories <small style="font-weight:400;color:var(--muted)">(filter buttons)</small></h3><div id="gcats">${gcats.map(g => `<div class="item" data-id="${esc(g.id)}"><div class="grid2"><div class="f"><label>English name</label><input data-k="name" value="${esc(g.name)}"></div><div class="f"><label>Tamil name</label><input data-k="ta" value="${esc(g.ta)}"></div></div><button class="btn red sm" data-gcdel>Delete</button></div>`).join('')}</div><button class="btn out" id="gcAdd">+ Add category</button></div>
    <h3 style="margin:18px 0 10px;color:var(--brown)">Photos (${items.length})</h3>
    <div class="gal" id="gGrid">${items.map((g, i) => `<div class="item" data-i="${i}"><div class="pv ${g.visible === false ? 'off' : ''}" ${css(g.url)}><em>${i + 1}</em></div>
      <div class="f"><label>Title</label><input data-k="title" value="${esc(g.title)}"></div><div class="f"><label>Description</label><textarea data-k="description" style="min-height:60px">${esc(g.description)}</textarea></div>
      <div class="f"><label>Category</label><select data-k="category"><option value="">— none —</option>${gcats.map(x => `<option value="${esc(x.id)}" ${x.id === g.category ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="f chk"><input type="checkbox" data-k="visible" id="gv${i}" ${g.visible !== false ? 'checked' : ''}><label for="gv${i}">Show on website</label></div>
      <div class="row"><button class="btn out ic" data-mv="-1">↑</button><button class="btn out ic" data-mv="1">↓</button><label class="btn out sm">Replace<input type="file" accept="image/png,image/jpeg" hidden data-rep></label><button class="btn red sm" data-del>Delete</button></div></div>`).join('')}</div>${saveBar('Save gallery')}`;
    $$('.grid2', c).forEach(wide);
    const gUpH = async e => { const fs = [...e.target.files]; sync(); syncCats(); let n = 0; for (const f of fs) { try { $('#gMsg').textContent = `Uploading ${++n} / ${fs.length}…`; items.push({ id: '', url: await upload(f), title: '', description: '', category: '', visible: true }); } catch (ex) { toast(ex.message, true); } } draw(); toast('Photos added – press Save gallery'); };
    $$('[data-pick=gal]', c).forEach(inp => inp.onchange = gUpH);
    $('#gcAdd').onclick = () => { sync(); syncCats(); gcats.push({ id: uid('c'), name: 'New category', ta: '' }); draw(); };
    $$('[data-gcdel]', c).forEach(b => b.onclick = () => { sync(); syncCats(); gcats.splice($$('#gcats .item').indexOf(b.closest('.item')), 1); draw(); });
    $('#gGrid').onclick = e => { const it = e.target.closest('.item'); if (!it) return; const i = +it.dataset.i; sync();
      if (e.target.closest('[data-del]')) { if (!confirm('Delete this photo?')) return; items.splice(i, 1); draw(); }
      const mv = e.target.closest('[data-mv]'); if (mv) { const j = i + +mv.dataset.mv; if (j < 0 || j >= items.length) return; [items[i], items[j]] = [items[j], items[i]]; draw(); } };
    $$('[data-rep]', c).forEach(inp => inp.onchange = async () => { if (!inp.files[0]) return; const i = +inp.closest('.item').dataset.i; sync(); try { items[i].url = await upload(inp.files[0]); draw(); toast('Photo replaced – press Save gallery'); } catch (ex) { toast(ex.message, true); } });
    $('#saveBtn').onclick = async () => { sync(); syncCats(); const site = read($('#gtext'), pairs(['galleryTitle', 'x'], ['galleryDesc', 'x']).map(f => [f[0]])); if (await saveContent({ galleryCategories: gcats, gallery: items, site })) { items = C().gallery.map(x => ({ ...x })); gcats = C().galleryCategories.map(x => ({ ...x })); draw(); } };
  };
  draw();
}

/* product form */
function productForm(c, id) {
  const p = id ? C().products.find(x => x.id === id) : { retail: true, wholesale: true, visible: true, inStock: true, featured: false, images: [] };
  p.inStock = p.inStock !== false; let imgs = [...(p.images || [])];
  const F = [['name', 'Product name (English)'], ['nameTa', 'Product name (Tamil / தமிழ்)'], ['category', 'Category', 'select', C().categories.map(x => [x.id, x.name])], ['subtitle', 'Short line (shown on card)'], ['description', 'Description (English)', 'area'], ['descriptionTa', 'Description (Tamil)', 'area'], ['price', 'Price ₹ (optional)', 'num', 'Leave empty to show “Ask for price”'], ['mrp', 'MRP ₹ (optional)', 'num'], ['unit', 'Unit (e.g. Each, Set, Dozen)'], ['badge', 'Offer badge (e.g. 10% OFF, NEW)'], ['inStock', 'In stock (switch off to show “Out of stock”)', 'bool'], ['retail', 'Available in retail', 'bool'], ['wholesale', 'Available in wholesale', 'bool'], ['wholesaleNote', 'Wholesale note (e.g. Min 12 pieces)'], ['featured', 'Show first on website', 'bool'], ['visible', 'Show on website', 'bool']];
  c.innerHTML = head(id ? 'Edit product' : 'Add product', '') + `<div class="card"><div class="grid2" id="pf">${form(F, p, 'p')}</div><div class="f"><label>Photos (up to 8, first one is the main photo)</label><div class="pimgs" id="pimgs"></div><div style="margin-top:8px">${picker('prod', true)}</div></div><div class="err" id="perr"></div></div>
  <div class="savebar"><button class="btn gold" id="pSave">💾 Save product</button><button class="btn out" id="pBack">Back</button></div>`;
  wide($('#pf'));
  const draw = () => { $('#pimgs').innerHTML = imgs.map((u, i) => `<div class="pi ${i ? '' : 'main'}" ${css(u)}>${i ? '' : '<i>Main</i>'}<button data-x="${i}">✕</button></div>`).join(''); $$('[data-x]').forEach(b => b.onclick = () => { imgs.splice(+b.dataset.x, 1); draw(); }); }; draw();
  const pAddH = async e => { for (const f of [...e.target.files].slice(0, 8 - imgs.length)) { try { imgs.push(await upload(f)); draw(); } catch (ex) { toast(ex.message, true); } } e.target.value = ''; };
  $$('[data-pick=prod]').forEach(inp => inp.onchange = pAddH);
  $('#pBack').onclick = () => { delete sub.editP; render(); };
  $('#pSave').onclick = async () => {
    const b = read($('#pf'), F); if (!b.name.trim()) { $('#perr').textContent = 'Product name is required'; return; }
    const o = { ...(id ? p : { id: uid('p'), createdAt: Date.now() }), ...b, name: b.name.trim(), images: imgs, price: b.price, mrp: b.mrp };
    if (id) C().products = C().products.map(x => x.id === id ? o : x); else C().products.unshift(o);
    await persist(); toast('Product saved ✓'); delete sub.editP; render();
  };
}

/* ---------- sign in / start ---------- */
document.addEventListener('input', e => {
  const q = e.target.closest('.opq'); if (q) { const k = q.value.trim().toLowerCase(); $$('.oprow', q.closest('.op')).forEach(r => r.style.display = !k || r.dataset.name.includes(k) ? '' : 'none'); return; }
  const pp = e.target.closest('.opp'); if (pp && pp.value !== '') { const cb = $('input[type=checkbox]', pp.closest('.oprow')); if (cb) cb.checked = true; return; } const r = e.target.closest('input[type=range]'); if (!r) return; const b = r.closest('.f').querySelector('[data-rv]'); if (b) b.textContent = r.value + (r.dataset.unit || ''); });
document.addEventListener('change', async e => {
  const inp = e.target.closest('[data-img] input[type=file]'); if (!inp || !inp.files[0]) return;
  const box = inp.closest('[data-img]'); try { toast('Uploading…'); const hk = $('input[type=hidden]', box); const u = await upload(inp.files[0], hk && hk.dataset.k === 'logo'); $('input[type=hidden]', box).value = u; $('.pv', box).style.backgroundImage = `url('${u}')`; toast('Photo ready – press Save'); } catch (ex) { toast(ex.message, true); } inp.value = '';
});
document.addEventListener('change', async e => {
  const inp = e.target.closest('[data-imgs] input[type=file]'); if (!inp) return;
  const box = inp.closest('[data-imgs]'), max = +box.dataset.max || 5, th = $('.ithumbs', box);
  const files = [...inp.files]; inp.value = ''; if (!files.length) return;
  const room = max - $$('[data-u]', box).length; if (room <= 0) return toast(`You can add only ${max} photos`, true);
  if (files.length > room) toast(`Only ${room} more photo(s) can be added – extra ones skipped`, true);
  for (const f of files.slice(0, room)) { try { toast('Uploading…'); const u = await upload(f); const d = document.createElement('div'); d.className = 'it'; d.dataset.u = u; d.style.backgroundImage = `url('${u}')`; d.innerHTML = '<button type="button" data-imgdel aria-label="Remove">✕</button>'; th.appendChild(d); } catch (ex) { toast(ex.message, true); } }
  imgsSync(box); toast('Photos ready – press Save');
});
function imgsSync(box) { const n = $$('[data-u]', box).length, max = +box.dataset.max || 5; const cn = box.closest('.f').querySelector('[data-cnt]'); if (cn) cn.textContent = n; $('.pickwrap', box).hidden = n >= max; }
document.addEventListener('click', e => {
  const dl = e.target.closest('[data-imgdel]'); if (dl) { const box = dl.closest('[data-imgs]'); dl.closest('.it').remove(); imgsSync(box); }
  const c = e.target.closest('[data-imgclear]'); if (c) { const b = c.closest('[data-img]'); $('input[type=hidden]', b).value = ''; $('.pv', b).style.backgroundImage = ''; }
  if (e.target.closest('[data-viewsite]')) openCustomer();
});
async function logout() { try { await api('/logout', { method: 'POST', body: {} }); } catch { /* ignore */ } authed = false; C0 = null; document.body.classList.remove('noscroll'); showLogin(''); }
/* automatic lock: nothing typed/clicked for the idle time, or the tab was left and you come back later */
['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true, capture: true }));
async function idleCheck() { if (!authed || Date.now() - lastAct <= idleMs) return; try { await api('/logout', { method: 'POST', body: {} }); } catch { /* ignore */ } authed = false; C0 = null; document.body.classList.remove('noscroll'); showLogin('You were signed out because the admin panel was inactive. Please sign in again.'); }
setInterval(idleCheck, 15000); document.addEventListener('visibilitychange', () => { if (!document.hidden) idleCheck(); });
function showLogin(msg, ok) {
  $('#app').innerHTML = `<div class="login"><form id="lf" autocomplete="on"><h1>Classic Home Needs</h1><p>Admin Dashboard – sign in</p>
    <div class="f"><label for="lu">Username</label><input id="lu" autocomplete="username" autocapitalize="characters" spellcheck="false" maxlength="60"></div>
    <div class="f" style="margin-bottom:4px"><label for="lp">Password</label><input type="password" id="lp" autocomplete="current-password" maxlength="200"></div>
    <div class="${ok ? 'okmsg' : 'err'}" id="le" role="alert">${esc(msg || '')}</div><button class="btn gold" style="width:100%" type="submit">Sign in</button></form></div>`;
  $('#lf').onsubmit = async e => { e.preventDefault(); const b = $('#lf button[type=submit]'); b.disabled = true; try { const r = await api('/login', { method: 'POST', body: { username: $('#lu').value, password: $('#lp').value } }); authed = true; lastAct = Date.now(); if (r.idleMinutes) idleMs = r.idleMinutes * 60000; await enter(); } catch (ex) { $('#le').className = 'err'; $('#le').textContent = ex.message; b.disabled = false; } };
  setTimeout(() => $('#lu') && $('#lu').focus(), 50);
}
async function enter() {
  try { C0 = await api('/content'); } catch (ex) { return showLogin(ex.message); }
  tab = 'dashboard'; sub = {}; layout(); render(); updateBadge();
}
(async () => {
  try {
    const st = await api('/session?fresh=1'); if (st.idleMinutes) idleMs = st.idleMinutes * 60000;
    showLogin('Please sign in to continue.');
  } catch (ex) { showLogin(ex.message); }
})();
})();
