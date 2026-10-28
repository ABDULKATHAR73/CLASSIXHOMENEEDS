/* Classic Home Needs – customer website (Tamil + English). Content comes from the server on every page load. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let C = null, products = [];

/* ---------- icons ---------- */
const P = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-10 6L2 7"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  right: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', up: '<path d="m18 15-6-6-6 6"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  zin: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>', zout: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/>',
  fb: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>', ig: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
  yt: '<path d="M22.5 6.4a2.8 2.8 0 0 0-2-2C18.8 4 12 4 12 4s-6.8 0-8.5.4a2.8 2.8 0 0 0-2 2C1 8.1 1 12 1 12s0 3.9.5 5.6a2.8 2.8 0 0 0 2 2C5.2 20 12 20 12 20s6.8 0 8.5-.4a2.8 2.8 0 0 0 2-2c.5-1.7.5-5.6.5-5.6s0-3.9-.5-5.6z"/><path d="m10 15 5-3-5-3z" fill="currentColor"/>',
  web: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>'
};
const ico = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
const WA = '<svg class="i f" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2a8.200 8.200 0 0 1-4.200-1.200l-.3-.2-3 .8.8-2.900-.2-.3A8.200 8.200 0 1 1 12 20.200zm4.500-6.100c-.2-.1-1.500-.7-1.700-.8-.2-.1-.4-.1-.6.100l-.8 1c-.1.200-.3.200-.5.100a6.700 6.700 0 0 1-3.300-2.900c-.2-.4.200-.4.700-1.300.1-.2 0-.3 0-.5l-.8-1.800c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.300-.2.300-.9.900-.9 2.200s.9 2.500 1.100 2.700c.1.200 1.800 2.800 4.400 3.900 1.600.7 2.300.8 3.100.6.500-.1 1.500-.6 1.700-1.200.2-.6.2-1.100.2-1.200-.1-.2-.3-.2-.6-.4z"/></svg>';

/* ---------- helpers ---------- */
const bi = (ta, en) => ta && en ? `<span class="ta">${esc(ta)}</span> <span class="en">${esc(en)}</span>` : (ta ? `<span class="ta keep">${esc(ta)}</span>` : (en ? `<span class="en keep">${esc(en)}</span>` : ''));
const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
const U = {
  home: ['முகப்பு', 'Home'], products: ['பொருட்கள்', 'Products'], categories: ['வகைகள்', 'Categories'], rw: ['சில்லறை & மொத்தம்', 'Retail & Wholesale'],
  offers: ['சலுகைகள்', 'Offers'], gallery: ['கடை படங்கள்', 'Shop Gallery'], about: ['எங்களைப் பற்றி', 'About'], contact: ['தொடர்பு', 'Contact'],
  call: ['அழைக்க', 'Call Now'], wa: ['வாட்ஸ்அப்', 'WhatsApp Us'], visit: ['கடைக்கு வாருங்கள்', 'Visit Store'], details: ['விவரங்கள்', 'View Details'],
  enquire: ['விசாரிக்க', 'Enquire Now'], all: ['அனைத்தும்', 'All'], retail: ['சில்லறை', 'Retail'], wholesale: ['மொத்தம்', 'Wholesale'], general: ['பொதுவான', 'General'],
  viewProducts: ['அனைத்துப் பொருட்களையும் பார்க்க', 'View All Products'], retailBtn: ['சில்லறைப் பொருட்கள்', 'Retail Products'], whBtn: ['மொத்த விசாரணை', 'Wholesale Enquiry'],
  search: ['பொருளைத் தேடுங்கள்...', 'Search products...'], retailAv: ['சில்லறையில் கிடைக்கும்', 'Available in retail'], wholesaleAv: ['மொத்தத்தில் கிடைக்கும்', 'Available in wholesale'],
  notFound: ['பொருள் எதுவும் இல்லை', 'No products found'], directions: ['வழி காட்டு', 'Get Directions'], name: ['உங்கள் பெயர்', 'Your name'], phone: ['மொபைல் எண்', 'Mobile number'],
  msg: ['உங்கள் விசாரணை', 'Your message'], send: ['WhatsApp-ல் அனுப்புக', 'Send on WhatsApp'], quick: ['விரைவு இணைப்புகள்', 'Quick Links'], hours: ['கடை நேரம்', 'Store Timings'], address: ['முகவரி', 'Address'],
  ctaT: ['மொத்தமாக வாங்க வேண்டுமா?', 'Looking to buy in bulk?'], ctaS: ['சிறப்பு மொத்த விலைக்கு இன்றே தொடர்பு கொள்ளுங்கள்', 'Contact us today for special wholesale prices'], all2: ['அனைத்து சலுகைகள்', 'All offers'], askPrice: ['விலைக்கு விசாரிக்கவும்', 'Ask for price']
};
Object.assign(U, {
  backBtn: ['← திரும்ப', '← Back'], emailLbl: ['மின்னஞ்சல்', 'Email'], lastDay: ['இன்றே கடைசி நாள்!', 'Last day!'], daysLeft: ['இன்னும் {n} நாட்கள்', '{n} days left'], dayLeft: ['இன்னும் {n} நாள்', '{n} day left'],
  offerEnded: ['இந்தச் சலுகை முடிந்தது', 'This offer has ended'], offerPrice: ['சலுகை விலை', 'Offer price'], youSave: ['நீங்கள் சேமிப்பது', 'You save'], offerCount: ['சலுகையில் உள்ள பொருட்கள்', 'Products in this offer'],
  offerNow: ['இப்போது', 'Now'], offerOngoing: ['தொடர்கிறது', 'Ongoing'], offerPeriod: ['சலுகைக் காலம்', 'Offer period'], offerList: ['சலுகையில் உள்ள பொருட்கள்', 'What is in this offer'], offerIncl: ['உள்ளடக்கம்', "What's included"],
  offerDetails: ['சலுகை விவரங்கள்', 'Offer details'], enqOffer: ['இந்தச் சலுகையை விசாரிக்க', 'Enquire about this offer'], errName: ['பெயரை உள்ளிடவும்', 'Enter your name'], errPhone: ['சரியான 10 இலக்க எண்', 'Enter a valid 10-digit mobile number'], waOpening: ['WhatsApp திறக்கிறது…', 'Opening WhatsApp…'],
  eyCat: ['வகைகள்', 'Categories'], eyProd: ['பொருட்கள் காட்சி', 'Product Showcase'], eyRw: ['சில்லறை · மொத்தம்', 'Retail · Wholesale'], eyOffers: ['சலுகைகள்', 'Offers'], eyWhy: ['ஏன் நாங்கள்', 'Why us'], eyGal: ['படங்கள்', 'Gallery'], eyContact: ['வருகை தாருங்கள்', 'Visit us'], eyReviews: ['கருத்துகள்', 'Reviews'],
  reviewsTitle: ['வாடிக்கையாளர் கருத்துகள்', 'What Our Customers Say'], enqTitle: ['விசாரணை', 'Product Enquiry'], sendEnq: ['விசாரணை அனுப்புக', 'Send us an Enquiry'], photosSoon: ['படங்கள் விரைவில்', 'Photos coming soon'], viewOffer: ['சலுகை விவரங்கள்', 'View Offer Details'], oos: ['இருப்பு இல்லை', 'Out of stock'], writeReview: ["கருத்து எழுதுங்கள்", "Write a review"], rvAvg: ["சராசரி மதிப்பீடு", "Average rating"], rvCount: ["{n} கருத்துகள்", "{n} reviews"], rvCount1: ["1 கருத்து", "1 review"], rvYourName: ["உங்கள் பெயர்", "Your name"], rvYourRating: ["உங்கள் மதிப்பீடு", "Your rating"], rvYourText: ["உங்கள் கருத்து", "Your review"], rvSend: ["கருத்தை அனுப்புக", "Submit review"], rvFormTitle: ["உங்கள் அனுபவத்தைப் பகிருங்கள்", "Share your experience"], rvThanksPending: ["நன்றி! உங்கள் கருத்து சரிபார்ப்புக்குப் பிறகு இணையதளத்தில் தோன்றும்.", "Thank you! Your review will appear on the website after the shop approves it."], rvThanksLive: ["நன்றி! உங்கள் கருத்து இணையதளத்தில் சேர்க்கப்பட்டது.", "Thank you! Your review is now on the website."], rvErrName: ["பெயரை உள்ளிடவும் (2+ எழுத்துகள்)", "Enter your name (2+ letters)"], rvErrRating: ["நட்சத்திர மதிப்பீட்டைத் தேர்ந்தெடுக்கவும்", "Choose a star rating"], rvErrText: ["கருத்தை எழுதவும் (1–500 எழுத்துகள்)", "Write your review (1 to 500 letters)"], rvErrLinks: ["இணைப்புகளைச் சேர்க்க வேண்டாம்", "Please do not include web links"], rvErrLimit: ["நிறைய கருத்துகள் அனுப்பப்பட்டுள்ளன. பிறகு முயற்சிக்கவும்.", "Too many reviews sent. Please try again later."], rvErr: ["அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.", "Could not send. Please try again."], rvShopReply: ["கடையின் பதில்", "Reply from the shop"], rvMore: ["மேலும் கருத்துகள்", "Show more reviews"], rvNone: ["இன்னும் கருத்துகள் இல்லை. முதல் கருத்தை நீங்கள் எழுதுங்கள்!", "No reviews yet. Be the first to write one!"]
});
Object.assign(U, {
  viewAllOffers: ['மேலும் ஆஃபர்கள் பார்க்க', 'View All Offers'], offersAllTitle: ['அனைத்து ஆஃபர்கள்', 'All Offers'], totalOffers: ['மொத்த ஆஃபர்கள்', 'Total Offers'],
  productsIncluded: ['{n} பொருட்கள் இந்த ஆஃபரில்', '{n} Products Included'], offerWhat: ['இந்த ஆஃபரில் என்னென்ன பொருட்கள்?', "What's included in this offer?"],
  offerTotalProducts: ['மொத்த பொருட்கள்', 'Total Products'], specialPrice: ['சிறப்பு விலை', 'Special Price'], totalLbl: ['மொத்தம்', 'Total'],
  closeBtn: ['மூடு', 'Close'], seeMoreImg: ['மேலும் படங்கள்', 'See More Images'], totalImages: ['மொத்த படங்கள்', 'Total Images'], galAllTitle: ['கடை படங்கள்', 'Shop Gallery'],
  seeAllReviews: ['அனைத்து விமர்சனங்கள்', 'See All Reviews'], totalReviews: ['மொத்த விமர்சனங்கள்', 'Total Reviews'], rvAllTitle: ['வாடிக்கையாளர் கருத்துகள்', 'Customer Reviews'],
  backWeb: ['முகப்புப் பக்கத்திற்குத் திரும்ப', 'Back to Website'], pdfLbl: ['PDF கோப்பு', 'PDF file'], productsWord: ['பொருட்கள்', 'Products']
});
Object.assign(U, Object.fromEntries(Object.entries({ view: ['சலுகையைப் பார்க்க', 'View offer'], items: ['பொருட்கள்', 'items'], inc: ['இந்தச் சலுகையில்', "What's inside"], price: ['சிறப்பு விலை', 'Special price'], save: ['சேமிப்பு', 'You save'], ends: ['சலுகை முடிய', 'Offer ends in'], d: ['நாள்', 'Days'], h: ['மணி', 'Hrs'], m: ['நிமி', 'Min'], s: ['வினா', 'Sec'], from: ['தொடக்கம்', 'Starts'], till: ['முடிவு', 'Ends'], terms: ['நிபந்தனைகள்', 'Terms & conditions'], more: ['சலுகை விவரங்கள்', 'Offer details'], photos: ['படங்கள்', 'Photos'], enq: ['இந்தச் சலுகை பற்றி விசாரிக்க', 'Enquire about this offer'], ended: ['இந்தச் சலுகை முடிந்துவிட்டது', 'This offer has ended'], soon: ['விரைவில் தொடங்கும்', 'Starting soon'] }).map(([k, v]) => ['of_' + k, v])));
const U0 = JSON.parse(JSON.stringify(U));
function applyLabels() { for (const k in U0) U[k] = U0[k].slice(); const L = C.site.labels; if (L && typeof L === 'object') for (const k in L) if (U[k] && Array.isArray(L[k])) { if (String(L[k][0] || '').trim()) U[k][0] = String(L[k][0]).trim(); if (String(L[k][1] || '').trim()) U[k][1] = String(L[k][1]).trim(); } }
const u = k => bi(U[k][0], U[k][1]);
let NAV = [];
const DEF_MENU = ['home', 'products', 'categories', 'rw', 'offers', 'gallery', 'about', 'contact'];
const DEF_SECS = ['stats', 'strips', 'categories', 'products', 'rw', 'offers', 'why', 'gallery', 'about', 'testimonials', 'contact', 'cta'];
function buildNav() {
  const saved = Array.isArray(C.site.menu) && C.site.menu.length ? C.site.menu : DEF_MENU.map(id => ({ id, show: true }));
  NAV = saved.filter(m => m && m.show !== false).map(m => { const b = U[m.id]; return [m.id, okLink(m.link || '#' + m.id), bi(m.ta || (b && b[0]) || '', m.en || (b && b[1]) || '')]; });
}
const secOrder = () => { const out = [], seen = new Set(), known = new Set(DEF_SECS); for (const x of (Array.isArray(C.site.sections) ? C.site.sections : [])) if (x && known.has(x.id) && !seen.has(x.id)) { seen.add(x.id); if (x.show !== false) out.push(x.id); } for (const id of DEF_SECS) if (!seen.has(id)) out.push(id); return out; };
const S = k => C.site[k] || '';
const DEFAULT_LOGO = '/uploads/classix-logo.png';
const LOGO = () => C.site.logo || DEFAULT_LOGO;
const sb = k => bi(S(k + 'Ta'), S(k + 'En'));
const cc = () => String(C.shop.countryCode || '91').replace(/\D/g, '') || '91';
const intl = raw => { raw = String(raw || '').trim(); const d = raw.replace(/\D/g, ''); if (!d) return ''; if (raw.startsWith('+') || d.length > 10) return d; return cc() + d.slice(-10); };
const waNum = () => intl(C.shop.whatsapp) || intl((C.shop.phones || [])[0]);
const waLink = msg => `https://wa.me/${waNum()}?text=${encodeURIComponent(msg || S('waMessage'))}`;
const telLink = n => { const d = intl(n || (C.shop.phones || [])[0]); return d ? 'tel:+' + d : '#contact'; };
const mailLink = e => 'mailto:' + String(e || '').trim();
const mapSearch = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(C.shop.mapQuery)}`;
const normLink = l => { l = String(l || '').trim(); const m = l.match(/^#\/([^/?#]*)/); if (!m) return l; return ({ products: '#products', 'retail-wholesale': '#rw', rw: '#rw', contact: '#contact', gallery: '#gallery', about: '#about', offers: '#offers', categories: '#categories', home: '#home' })[m[1]] || '#home'; };
const okLink = l => { l = normLink(l); return /^(https?:|tel:|mailto:|#|\/)/i.test(l) ? l : '#home'; };
const hrefAttr = l => /^https?:/i.test(String(l).trim()) ? `href="${esc(okLink(l))}" target="_blank" rel="noopener"` : `href="${esc(okLink(l || '#home'))}"`;
const catOf = id => C.categories.find(c => c.id === id);
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3000); };
const isPdf = u => /\.pdf($|\?)/i.test(String(u || ''));
const img = (src, alt, extra = '') => isPdf(src) ? `<span class="pdfi" role="img" aria-label="PDF"><b>📄</b>PDF</span>` :  `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" ${extra}>`;
/* fade images in once loaded (no inline handlers, so a strict Content-Security-Policy works) */
document.addEventListener('load', e => { if (e.target && e.target.tagName === 'IMG') e.target.classList.add('in'); }, true);
const markLoaded = () => $$('img').forEach(i => { if (i.complete && i.naturalWidth) i.classList.add('in'); });
const sec = (id, head, body, cls = '') => `<section class="sec ${cls}" id="${id}"><div class="wrap">${head}${body}</div></section>`;
const head = (t, s, eyebrow = '') => `<div class="sec-head" data-r="up">${eyebrow ? `<span class="eyebrow">${U[eyebrow] ? bi(U[eyebrow][0], U[eyebrow][1]) : esc(eyebrow)}</span>` : ''}<h2>${t}</h2>${s ? `<p>${s}</p>` : ''}</div>`;
const btn = (cls, href, inner, attrs = '') => `<a class="btn ${cls}" ${hrefAttr(href)} ${attrs}><span class="t">${inner}</span></a>`;
const waBtn = (cls = '', msg, inner) => `<a class="btn wa ${cls}" href="${waLink(msg)}" target="_blank" rel="noopener">${WA}<span class="t">${inner || u('wa')}</span></a>`;
const callBtn = (cls = 'dark', n) => `<a class="btn ${cls}" href="${telLink(n)}">${ico('phone')}<span class="t">${u('call')}</span></a>`;
const money = n => '₹' + Number(n).toLocaleString('en-IN');

/* ---------- shell ---------- */
function shell() {
  const s = C.shop;
  const links = NAV.map(([k, h, l]) => `<a href="${h}" data-nav="${k}">${l}</a>`).join('');
  $('#site').innerHTML = `
  ${S('announcementTa') || S('announcement') ? `<div class="annc">${bi(S('announcementTa'), S('announcement'))}</div>` : ''}
  ${festBar()}
  <header class="top" id="top"><div class="wrap nav">
    <a class="brand ${!S('uiLogoText') ? 'notext' : ''}" href="#home" aria-label="Home"><span class="logo img"><img src="${esc(LOGO())}" alt="${esc(s.name)}" width="160" height="88" decoding="async" fetchpriority="high"></span><span class="brand-t">${s.est && C.site.estShow !== false ? `<small>${esc(C.shop.estLabel || 'EST.')} ${esc(s.est)}</small>` : ''}<b>${esc(s.name)}</b><span class="ta keep">${esc(s.nameTa || '')}</span></span></a>
    <nav class="links" aria-label="Main">${links}</nav>
    ${C.site.langBtn !== false ? '<button class="pill" id="langBtn" aria-label="Language"></button>' : ''}
    ${C.site.callPill !== false && s.phones[0] ? `<a class="pill call hide-sm" href="${telLink()}">${ico('phone')}<span>${esc(s.phones[0])}</span></a>` : ''}
    <button class="burger" id="burger" aria-label="Menu"><span></span></button>
  </div>
    <nav class="qnav" aria-label="Quick menu">${NAV.map(([k, h, l]) => `<a href="${h}" data-nav="${k}">${l}</a>`).join('')}</nav></header>
  <div class="drawer"><div class="bg" id="dbg"></div><nav>
    <div class="dh"><b style="font-family:var(--font-en-head);font-size:20px;color:var(--brown)">${esc(s.name)}</b><button class="burger" id="dclose" aria-label="Close">${ico('x')}</button></div>
    ${NAV.map(([k, h, l], i) => `<a class="l" href="${h}" data-nav="${k}" style="--i:${i}"><span>${l}</span>${ico('right')}</a>`).join('')}
    <div class="dc">${callBtn('dark')}${waBtn()}${btn('line', mapSearch(), u('visit'))}</div>
  </nav></div>
  <main id="view">${page()}</main>
  <footer class="foot" id="foot">${footer()}</footer>
  <div class="fab ${S('uiFabLabel') ? 'lbl' : ''} ${C.site.waPos === 'left' ? 'left' : ''}">${S('waButton') ? `<a class="wa" href="${S('waButtonMode') === 'group' && waGroupUrl() ? esc(waGroupUrl()) : waLink()}" target="_blank" rel="noopener" aria-label="WhatsApp">${WA}<span>${esc(S('waLabel') || 'WhatsApp')}</span></a>` : ''}<button class="up" id="toTop" aria-label="Top">${ico('up')}</button></div>
  <div class="modal" id="enqModal"><div class="bg" data-close></div><div class="box"><button class="x" data-close aria-label="Close">${ico('x')}</button><div id="enqBody"></div></div></div>
  <div class="modal" id="rvModal"><div class="bg" data-close></div><div class="box"><button class="x" data-close aria-label="Close">${ico('x')}</button><div id="rvBody"></div></div></div>
  <div class="modal" id="pModal"><div class="bg" data-close></div><div class="box wide"><button class="x" data-close aria-label="Close">${ico('x')}</button><div id="pBody"></div></div></div>
  <div class="lb" id="lb" aria-modal="true" role="dialog">
    <div class="lb-top"><span class="lb-count" id="lbCount"></span><div class="lb-tools"><button class="lb-b" id="lbZi" aria-label="Zoom in">${ico('zin')}</button><button class="lb-b" id="lbZo" aria-label="Zoom out">${ico('zout')}</button><button class="lb-b" id="lbX" aria-label="Close">${ico('x')}</button></div></div>
    <div class="lb-stage" id="lbStage"><button class="lb-nav p" id="lbP" aria-label="Previous">${ico('left')}</button><img class="lb-img" id="lbImg" alt="" draggable="false"><button class="lb-nav n" id="lbN" aria-label="Next">${ico('right')}</button></div>
    <div class="lb-cap" id="lbCap"></div>
  </div>`;
  langLabel();
  $('#burger').onclick = () => document.body.classList.toggle('menu-open');
  $('#dbg').onclick = $('#dclose').onclick = () => document.body.classList.remove('menu-open');
  $('.drawer').addEventListener('click', e => { if (e.target.closest('a')) document.body.classList.remove('menu-open'); });
  if ($('#langBtn')) $('#langBtn').onclick = () => { const o = ['both', 'ta', 'en']; const n = o[(o.indexOf(document.body.dataset.lang) + 1) % 3]; document.body.dataset.lang = n; try { localStorage.setItem('cx-lang', n); } catch {} langLabel(); };
  $('#toTop').onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
  $$('[data-close]').forEach(b => b.onclick = closeModals);
  initLightbox();
}
function langLabel() { const l = document.body.dataset.lang; if (!$('#langBtn')) return; $('#langBtn').innerHTML = `<b style="font-family:var(--font-ta)">${l === 'en' ? 'EN' : l === 'ta' ? 'தமிழ்' : 'த | EN'}</b>`; }
function creditHtml() {
  if (C.site.creatorShow === false || !S('creatorName')) return '';
  const label = bi(S('creatorLabelTa'), S('creatorLabelEn') || 'Website created by');
  const nm = /^https?:\/\//i.test(S('creatorLink')) ? `<a href="${esc(S('creatorLink'))}" target="_blank" rel="noopener">${esc(S('creatorName'))}</a>` : esc(S('creatorName'));
  const ph = S('creatorPhone') ? ` · <a href="${telLink(S('creatorPhone'))}">${esc(S('creatorPhone'))}</a>` : '';
  return `<span class="credit"><span class="cr">${label}</span> ${nm}${ph}</span>`;
}
function footer() {
  const s = C.shop, so = C.social;
  const group = waGroupUrl() ? `<a class="wa-group" href="${esc(waGroupUrl())}" target="_blank" rel="noopener noreferrer">💬 ${esc(so.whatsappGroupLabelTa || 'வாட்ஸ்அப் குழுவில் சேரவும்')} <span class="en">${esc(so.whatsappGroupLabelEn || 'Join WhatsApp Group')}</span></a>` : '';
  const soc = [['fb', so.facebook], ['ig', so.instagram], ['yt', so.youtube], ['web', so.website]].filter(x => String(x[1] || '').trim()).map(([k, h]) => [k, /^https?:\/\//i.test(String(h).trim()) ? String(h).trim() : 'https://' + String(h).trim()]).map(([k, h]) => `<a href="${esc(h)}" target="_blank" rel="noopener" aria-label="${k}">${ico(k)}</a>`).join('');
  return `<div class="wrap"><div class="fgrid">
    <div class="fb"><img class="flogo" src="${esc(LOGO())}" alt="${esc(s.name)}" loading="lazy" decoding="async"><b>${esc(s.name)}</b><span class="ta keep" style="color:var(--gold2)">${esc(s.nameTa || '')}</span><p>${bi(S('footerTextTa'), S('footerTextEn'))}</p><div class="soc"><a href="${waLink()}" target="_blank" rel="noopener" aria-label="WhatsApp">${WA}</a>${soc}</div></div>
    <div><h4>${bi(U.quick[0], U.quick[1])}</h4>${NAV.map(([k, h, l]) => `<a href="${h}">${l}</a>`).join('')}</div>
    <div><h4>${bi(U.address[0], U.address[1])}</h4>${s.address.map(x => `<div class="fl">${esc(x)}</div>`).join('')}<a href="${mapSearch()}" target="_blank" rel="noopener" style="color:var(--gold2)">${bi(U.directions[0], U.directions[1])} →</a></div>
    <div><h4>${bi(U.hours[0], U.hours[1])}</h4>${s.hours.map(x => `<div class="fl">${esc(x.replace('|', ' · '))}</div>`).join('')}<h4 style="margin-top:16px">${bi(U.phone[0], U.phone[1])}</h4>${s.phones.map(p => `<a href="${telLink(p)}">${esc(p)}</a>`).join('')}${s.email ? `<a href="${esc(mailLink(s.email))}">${esc(s.email)}</a>` : ''}${C.site.footerShowGst && s.gstin ? `<div class="fl" style="margin-top:12px">GSTIN: ${esc(s.gstin)}${s.gstNote ? ' · ' + esc(s.gstNote) : ''}</div>` : ''}</div>
  </div><div class="legal"><span>${esc(S('copyright'))}</span>${creditHtml()}</div></div>`;
}

/* ---------- components ---------- */
/* ---------- offers, deals & prices ---------- */
/* ---------- offers (v4.7) ---------- */
const OT = { special: ['✨', 'Special', 'சிறப்பு'], diwali: ['🪔', 'Diwali', 'தீபாவளி'], pongal: ['🌾', 'Pongal', 'பொங்கல்'], puthandu: ['🌼', 'Tamil New Year', 'தமிழ் புத்தாண்டு'], christmas: ['🎄', 'Christmas', 'கிறிஸ்துமஸ்'], eid: ['🌙', 'Ramzan / Eid', 'ரம்ஜான்'], newyear: ['🎆', 'New Year', 'புத்தாண்டு'], sale: ['🏷️', 'Sale', 'சிறப்பு விற்பனை'], wholesale: ['📦', 'Wholesale', 'மொத்த விலை'], new: ['🆕', 'New arrivals', 'புதிய வரவு'], gift: ['🎁', 'Gifts', 'பரிசுகள்'] };
const ox = k => u('of_' + k);
const th = o => OT[o.theme] ? o.theme : 'special';
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const offerLive = o => { if (!o || !o.active) return false; const t = ymd(new Date()); return (!o.startDate || t >= o.startDate) && (!o.endDate || t <= o.endDate); };
const liveOffers = () => (C.offers || []).filter(offerLive);
const daysLeft = o => o.endDate ? Math.round((new Date(o.endDate + 'T00:00:00') - new Date(ymd(new Date()) + 'T00:00:00')) / 864e5) : null;
const leftText = n => { if (n <= 0) return u('lastDay'); const k = n > 1 ? 'daysLeft' : 'dayLeft'; return bi(U[k][0].replace('{n}', n), U[k][1].replace('{n}', n)); };
const dFmt = s => { const d = new Date(s + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
const pos = v => v !== '' && v != null && !isNaN(Number(v)) && Number(v) > 0 ? Number(v) : null;
function offerInfo(o) {
  const items = (Array.isArray(o.items) ? o.items : []).filter(x => x && (x.ta || x.en || x.img)).map(x => ({ ta: x.ta || '', en: x.en || '', img: x.img || '', note: x.note || '', qty: Math.max(1, Math.round(Number(x.qty) || 1)), price: pos(x.price) }));
  const count = items.reduce((a, x) => a + x.qty, 0), price = pos(o.price);
  let was = pos(o.oldPrice); if (was == null && items.length && items.every(x => x.price != null)) was = items.reduce((a, x) => a + x.price * x.qty, 0);
  if (was != null && price != null && was <= price) was = null;
  const save = was != null && price != null ? was - price : 0, pct = save ? Math.round(save / was * 100) : 0;
  const photos = [...(o.photos || []).filter(Boolean)]; if (o.image && !photos.includes(o.image)) photos.unshift(o.image);
  return { items, count, price, was, save, pct, photos };
}
const ofPrice = n => n.price != null ? `<div class="of-price"><b>${money(n.price)}</b>${n.was != null ? `<s>${money(n.was)}</s>` : ''}</div>` : '';
const ofThumb = x => x.img && !isPdf(x.img) ? `<img src="${esc(x.img)}" alt="" loading="lazy" decoding="async">` : `<span>${esc((x.en || x.ta || '•').trim().charAt(0).toUpperCase())}</span>`;
function offerCards() {
  const all = liveOffers(), N = Math.floor(Number(C.site.offersHomeCount)), list = N > 0 ? all.slice(0, N) : all;
  return `<div class="of-grid">${list.map((o, i) => {
    const t = th(o), f = OT[t], n = offerInfo(o), dl = daysLeft(o), shown = n.items.slice(0, 4);
    return `<article class="of-card of-${t}" data-r="up" data-offer="${esc(o.id)}" tabindex="0" role="button" style="--i:${i % 3}">
      <div class="of-top">${o.image ? img(o.image, o.titleEn || o.titleTa) : ''}<span class="of-wm">${f[0]}</span>
        <div class="of-tags"><span class="of-tag">${f[0]} ${bi(f[2], f[1])}</span>${o.badge ? `<span class="of-tag alt">${esc(o.badge)}</span>` : ''}</div>
        ${n.pct ? `<div class="of-seal"><b>${n.pct}%</b><small>OFF</small></div>` : ''}</div>
      <div class="of-body"><h3>${bi(o.titleTa, o.titleEn)}</h3>${o.tagTa || o.tagEn ? `<p>${bi(o.tagTa, o.tagEn)}</p>` : ''}
        ${shown.length ? `<div class="of-strip">${shown.map(x => `<i>${ofThumb(x)}</i>`).join('')}${n.items.length > 4 ? `<i class="more">+${n.items.length - 4}</i>` : ''}<span class="of-cnt">🎁 ${n.count} ${ox('items')}</span></div>` : ''}
        <div class="of-foot">${ofPrice(n)}${dl != null && o.timer !== false ? `<span class="of-left">⏳ ${leftText(dl)}</span>` : ''}</div>
        <button class="btn gold of-go" data-offer="${esc(o.id)}"><span class="t">${ox('view')} <i>›</i></span></button></div></article>`;
  }).join('')}</div>${all.length > list.length ? `<div class="lp-more"><button type="button" class="btn gold big" data-lp="offers"><span class="t">${u('viewAllOffers')} <i>›</i></span></button></div>` : ''}`;
}
let ofTimer = 0;
function ofTick() {
  const els = $$('[data-cd]'); if (!els.length) { clearInterval(ofTimer); ofTimer = 0; return; }
  els.forEach(el => { const end = new Date(el.dataset.cd + 'T23:59:59').getTime() - Date.now(); if (end <= 0) return; const s = Math.floor(end / 1000), v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60]; $$('b', el).forEach((b, k) => { b.textContent = String(v[k]).padStart(2, '0'); }); });
}
function openOffer(id, fromHash) {
  const o = (C.offers || []).find(x => x.id === id); if (!o) return;
  const t = th(o), f = OT[t], n = offerInfo(o), live = offerLive(o), title = o.titleEn || o.titleTa || 'Offer';
  const al = v => Array.isArray(v) ? v.filter(Boolean) : lines(v), tA = al(o.termsTa), tE = al(o.termsEn), terms = Array.from({ length: Math.max(tA.length, tE.length) }, (_, k) => bi(tA[k], tE[k]));
  const msg = `Hi, I am interested in the offer: ${title}${o.titleTa && o.titleEn ? ' (' + o.titleTa + ')' : ''}${n.price != null ? ' – ' + money(n.price) : ''}`;
  const started = !o.startDate || ymd(new Date()) >= o.startDate;
  let pg = $('#opage'); if (!pg) { pg = document.createElement('div'); pg.id = 'opage'; pg.className = 'opage'; pg.setAttribute('role', 'dialog'); pg.setAttribute('aria-modal', 'true'); document.body.appendChild(pg); }
  pg.innerHTML = `<div class="op-bar"><button class="op-arrow" data-opclose aria-label="Back">←</button><b class="op-bt">${f[0]} ${bi(o.titleTa, o.titleEn)}</b><button class="op-x" data-opclose aria-label="Close">✕</button></div>
  <div class="op-in ofd of-${t}">
    <section class="ofd-hero">${o.image && !isPdf(o.image) ? `<img class="ofd-bg" src="${esc(o.image)}" alt="">` : ''}<span class="of-wm big">${f[0]}</span>
      <div class="of-tags"><span class="of-tag">${f[0]} ${bi(f[2], f[1])}</span>${o.badge ? `<span class="of-tag alt">${esc(o.badge)}</span>` : ''}${!live ? `<span class="of-tag end">${started ? ox('ended') : ox('soon')}</span>` : ''}</div>
      <h1>${bi(o.titleTa, o.titleEn)}</h1>${o.tagTa || o.tagEn ? `<p>${bi(o.tagTa, o.tagEn)}</p>` : ''}</section>
    ${n.price != null ? `<section class="ofd-ticket"><div class="tk-l"><small>${ox('price')}</small><div class="tk-p"><b>${money(n.price)}</b>${n.was != null ? `<s>${money(n.was)}</s>` : ''}</div>${n.save ? `<em>🎉 ${ox('save')} ${money(n.save)} (${n.pct}%)</em>` : ''}</div><div class="tk-r">${n.count ? `<div><b>${n.count}</b><span>${ox('items')}</span></div>` : ''}${n.pct ? `<div class="hot"><b>${n.pct}%</b><span>OFF</span></div>` : ''}</div></section>` : ''}
    ${live && o.timer !== false && o.endDate ? `<section class="ofd-cd"><small>⏳ ${ox('ends')}</small><div data-cd="${esc(o.endDate)}"><div><b>00</b><span>${ox('d')}</span></div><div><b>00</b><span>${ox('h')}</span></div><div><b>00</b><span>${ox('m')}</span></div><div><b>00</b><span>${ox('s')}</span></div></div></section>` : ''}
    ${o.startDate || o.endDate ? `<div class="ofd-dates">${o.startDate ? `<span>📅 ${ox('from')}: <b>${dFmt(o.startDate)}</b></span>` : ''}${o.endDate ? `<span>🏁 ${ox('till')}: <b>${dFmt(o.endDate)}</b></span>` : ''}</div>` : ''}
    ${n.items.length ? `<h2 class="ofd-h">${ox('inc')} <i>${n.count}</i></h2><div class="ofd-items">${n.items.map(x => `<div class="ofd-it"><div class="ofd-im">${ofThumb(x)}${x.qty > 1 ? `<b>×${x.qty}</b>` : ''}</div><div class="ofd-nm"><b>${bi(x.ta, x.en)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ''}${x.price != null ? `<em>${money(x.price)}</em>` : ''}</div></div>`).join('')}</div>` : ''}
    ${n.photos.length ? `<h2 class="ofd-h">${ox('photos')}</h2><div class="ofd-ph">${n.photos.map((s, k) => `<button type="button" data-oph="${k}" aria-label="Photo ${k + 1}">${isPdf(s) ? '📄' : `<img src="${esc(s)}" alt="${esc(title)}" loading="lazy" decoding="async">`}</button>`).join('')}</div>` : ''}
    ${(o.detailsTa || o.detailsEn) ? `<h2 class="ofd-h">${ox('more')}</h2><div class="op-det">${bi(o.detailsTa, o.detailsEn)}</div>` : ''}
    ${terms.length ? `<h2 class="ofd-h">${ox('terms')}</h2><ul class="ofd-terms">${terms.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    <div class="op-cta">${o.wa === false ? '' : waBtn('', msg, ox('enq'))}${callBtn('dark')}${o.link ? btn('light', o.link, bi(o.ctaTa, o.ctaEn) || u('details')) : ''}</div>
    <button type="button" class="btn dark op-closebtn" data-opclose><span class="t">✕ ${u('closeBtn')}</span></button>
  </div>`;
  const ph = n.photos.filter(s => !isPdf(s)); $$('[data-oph]', pg).forEach(b => b.onclick = () => { const s = n.photos[+b.dataset.oph]; if (isPdf(s)) { window.open(s, '_blank', 'noopener'); return; } openLightbox(ph.map(x => ({ url: x, title, description: '' })), Math.max(0, ph.indexOf(s))); });
  closeModals(); pg.scrollTop = 0; pg.classList.add('open'); document.body.classList.add('op-open'); observe(pg);
  ofTick(); if (!ofTimer) ofTimer = setInterval(ofTick, 1000);
  if (!fromHash) { try { history.pushState({ op: id }, '', '#offer-' + id); } catch { /* ignore */ } }
}
function closeOffer(fromPop) { const pg = $('#opage'); if (!pg || !pg.classList.contains('open')) return; pg.classList.remove('open'); if (!$('#lpage.open')) document.body.classList.remove('op-open'); clearInterval(ofTimer); ofTimer = 0; if (!fromPop && history.state && history.state.op) history.back(); }
const priceHtml = p => {
  const base = p.price != null && p.price !== '' ? Number(p.price) : null, unit = p.unit ? `<small> / ${esc(p.unit)}</small>` : '';
  if (base != null) return `<div class="price">${money(p.price)}${p.mrp && p.mrp > p.price ? `<s>${money(p.mrp)}</s>` : ''}${unit}</div>`;
  return `<div class="price"><small>${esc(U.askPrice[1])}</small></div>`;
};
const badgeHtml = p => {
  let b = '';
  if (p.badge) b = `<span class="badge">${esc(p.badge)}</span>`;
  return b + (p.inStock === false ? `<span class="oos-tag">${esc(U.oos[1])} · ${esc(U.oos[0])}</span>` : '');
};
function productCard(p, i = 0) {
  const c = catOf(p.category) || {}; const im = (p.images || [])[0];
  return `<article class="card ${p.inStock === false ? 'oos' : ''}" data-r="up" style="--i:${i % 4}">
    <a class="ph" href="#products" data-pd="${esc(p.id)}" aria-label="${esc(p.name)}">${badgeHtml(p)}${im ? img(im, p.name) : `<span class="em">${esc(c.icon || '🛍️')}</span>`}</a>
    <div class="cbody"><span class="ccat">${esc(c.name || '')}</span><h3><a href="#products" data-pd="${esc(p.id)}">${bi(p.nameTa, p.name)}</a></h3>
      <p class="d">${esc(p.subtitle || p.description || '')}</p>
      <div class="tags">${C.site.showAvail === true ? (p.retail ? `<span class="tag">✓ ${esc(U.retail[1])}</span>` : '') + (p.wholesale ? `<span class="tag w">✓ ${esc(U.wholesale[1])}</span>` : '') : ''}</div>
      ${priceHtml(p)}
      <div class="cacts"><button class="btn line sm" data-pd="${esc(p.id)}"><span class="t">${u('details')}</span></button><button class="btn gold sm" data-enq="${esc(p.id)}"><span class="t">${u('enquire')}</span></button></div>
    </div></article>`;
}
function catCards() {
  return `<div class="cats">${C.categories.filter(c => c.visible !== false).map((c, i) => {
    const n = products.filter(p => p.category === c.id).length;
    return `<a class="cat" href="#products" data-cat="${esc(c.id)}" data-r="zoom" style="--i:${i % 4}"><div class="ic">${esc(c.icon)}</div>${bi(c.ta, c.name)}${n && C.site.catCountShow !== false && c.showCount !== false ? `<em>${bi(n + ' பொருட்கள்', n + (n === 1 ? ' item' : ' items'))}</em>` : ''}</a>`;
  }).join('')}</div>`;
}
function galHome(g) {
  const N = Math.floor(Number(C.site.galleryHomeCount)), cut = N > 0 && g.length > N, list = cut ? g.slice(0, N) : g;
  const chips = !cut && C.galleryCategories.some(c => g.some(x => x.category === c.id)) ? `<div class="chips" id="gchips" style="margin-bottom:22px"><button class="on" data-c="all">${u('all')}</button>${C.galleryCategories.filter(c => g.some(x => x.category === c.id)).map(c => `<button data-c="${esc(c.id)}">${bi(c.ta, c.name)}</button>`).join('')}</div>` : '';
  return chips + `<div class="masonry" id="masonry">${list.map((x, i) => galItem(x, i)).join('')}</div>` + (cut ? `<div class="lp-more"><button type="button" class="btn gold big" data-lp="gallery"><span class="t">🖼️ ${u('seeMoreImg')}</span></button></div>` : '');
}
const lpTotal = (k, n) => `<div class="lp-total"><span>${k}</span><b>${n}</b></div>`;
function lpBody(kind) {
  if (kind === 'offers') {
    const list = liveOffers();
    return { t: U.offersAllTitle, total: lpTotal(bi(U.totalOffers[0], U.totalOffers[1]), list.length), html: `<div class="lp-offers">${list.map(o => { const n = offerInfo(o), f = OT[th(o)]; return `<button type="button" class="lp-oc" data-offer="${esc(o.id)}">${o.image && !isPdf(o.image) ? `<span class="lp-oi">${img(o.image, o.titleEn || o.titleTa)}</span>` : `<span class="lp-oi em">${f[0]}</span>`}<span class="lp-on"><b>${bi(o.titleTa, o.titleEn)}</b>${n.count ? `<small>${n.count} ${ox('items')}</small>` : ''}${n.price != null ? `<em>${money(n.price)}</em>` : ''}</span><i class="lp-ch">›</i></button>`; }).join('')}</div>` };
  }
  if (kind === 'gallery') {
    const g = gal();
    const chips = C.galleryCategories.some(c => g.some(x => x.category === c.id)) ? `<div class="chips" id="lpchips" style="margin-bottom:16px"><button class="on" data-lpc="all">${u('all')}</button>${C.galleryCategories.filter(c => g.some(x => x.category === c.id)).map(c => `<button data-lpc="${esc(c.id)}">${bi(c.ta, c.name)}</button>`).join('')}</div>` : '';
    return { t: U.galAllTitle, total: lpTotal(bi(U.totalImages[0], U.totalImages[1]), g.length), html: chips + `<div class="masonry lp-mas">${g.map((x, i) => galItem(x, i)).join('')}</div>` };
  }
  const all = rvList();
  return { t: U.rvAllTitle, total: lpTotal(bi(U.totalReviews[0], U.totalReviews[1]), all.length), html: `<div class="testi lp-rv">${all.join('')}</div>${C.site.reviewForm !== false ? `<div class="rv-act"><button type="button" class="btn rv-write" data-rv-open><span class="t"><i>★</i> ${u('writeReview')}</span></button></div>` : ''}` };
}
function openList(kind, fromPop) {
  let pg = $('#lpage'); if (!pg) { pg = document.createElement('div'); pg.id = 'lpage'; pg.className = 'opage lpage'; pg.setAttribute('role', 'dialog'); pg.setAttribute('aria-modal', 'true'); document.body.appendChild(pg); }
  if (!(pg.classList.contains('open') && pg.dataset.kind === kind)) {
    const b = lpBody(kind);
    pg.innerHTML = `<div class="op-bar"><button class="op-arrow" data-lpclose aria-label="Back">←</button><b class="op-bt">${bi(b.t[0], b.t[1])}</b><button class="op-x" data-lpclose aria-label="Close">✕</button></div><div class="op-in">${b.total}${b.html}</div><div class="lp-foot"><button type="button" class="btn dark" data-lpclose><span class="t">✕ ${u('closeBtn')}</span></button></div>`;
    pg.dataset.kind = kind; pg.scrollTop = 0; markLoaded(); observe(pg);
    $$('img', pg).forEach(i => { i.classList.add('in'); });
  }
  closeModals(); pg.classList.add('open'); document.body.classList.add('op-open');
  if (!fromPop) { try { history.pushState({ lp: kind }, '', '#all-' + kind); } catch { /* ignore */ } }
}
function closeList(fromPop) {
  const pg = $('#lpage'); if (!pg || !pg.classList.contains('open')) return;
  pg.classList.remove('open'); if (!$('#opage.open')) document.body.classList.remove('op-open');
  if (!fromPop && history.state && history.state.lp) history.back();
}
addEventListener('popstate', () => {
  const h = location.hash, om = h.match(/^#offer-(.+)$/), lm = h.match(/^#all-(offers|gallery|reviews)$/);
  if (om) openOffer(decodeURIComponent(om[1]), true); else closeOffer(true);
  if (lm) openList(lm[1], true); else if (!om) closeList(true);
});
addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('op-open') && !$('.modal.open') && !$('#lb.open')) closeOffer(); });
function festBar() {
  const o = liveOffers().find(x => x.theme && x.theme !== 'special' && OT[x.theme] && !['wholesale', 'new', 'gift'].includes(x.theme)); if (!o) return ''; const f = OT[o.theme], dl = daysLeft(o);
  return `<a class="fest-bar" href="#offers"><span class="em">${f[0]}</span><span>${bi(o.titleTa, o.titleEn)}</span>${dl != null ? `<u>${leftText(dl)}</u>` : ''}<span class="em">${f[0]}</span></a>`;
}
const whyCards = () => `<div class="why">${C.why.map((w, i) => `<div class="wy" data-r="up" style="--i:${i % 3}"><div class="ic">${esc(w.icon)}</div><h3>${bi(w.titleTa, w.titleEn)}</h3><p>${bi(w.textTa, w.textEn)}</p></div>`).join('')}</div>`;
const statsHtml = (flat) => C.stats.length ? `<div class="wrap"><div class="stats ${flat ? 'flat' : ''}">${C.stats.map((s, i) => `<div class="stat" data-r="up" style="--i:${i}"><b data-count="${esc(s.value)}">${esc(s.value)}</b>${bi(s.ta, s.en)}</div>`).join('')}</div></div>` : '';
function rwCards() {
  const pts = (ta, en) => { const a = lines(ta), b = lines(en); const n = Math.max(a.length, b.length); return `<ul>${Array.from({ length: n }, (_, i) => `<li><span>${bi(a[i], b[i])}</span></li>`).join('')}</ul>`; };
  return `<div class="rw">
    <div class="rwc r" data-r="left"><div class="big">🛒</div><h3>${sb('retailTitle')}</h3><p>${sb('retail')}</p>${pts(S('retailPointsTa'), S('retailPointsEn'))}<div class="btns">${btn('light', '#products', u('retailBtn'))}${btn('glass', mapSearch(), u('visit'))}</div></div>
    <div class="rwc w" data-r="right"><div class="big">📦</div><h3>${sb('wholesaleTitle')}</h3><p>${sb('wholesale')}</p>${pts(S('wholesalePointsTa'), S('wholesalePointsEn'))}<div class="btns">${btn('gold', '#contact', u('whBtn'), 'data-type="wholesale"')}${waBtn('', 'Hi, I would like wholesale rates and the price list.')}${callBtn('glass')}</div></div></div>`;
}
const aboutBlock = () => `<div class="about"><div class="about-img" data-r="left">${S('aboutImage') ? img(S('aboutImage'), C.shop.name) : ''}<div class="est"><b>${esc(C.shop.est)}</b><small>${esc(C.shop.estLabel || 'EST.')}</small></div></div>
  <div data-r="right"><h2>${sb('aboutTitle')}</h2><p>${bi(S('aboutTa'), S('aboutEn'))}</p><div class="tagline">${sb('storeTagline')}</div><div class="cbtns" style="margin-top:20px">${btn('dark', '#contact', u('contact'))}${btn('line', '#gallery', u('gallery'))}</div></div></div>`;
const galItem = (x, i) => `<a class="gi" ${isPdf(x.url) ? 'target="_blank" rel="noopener" ' : ''}data-r="zoom" style="--i:${i % 4}" data-gi="${i}" data-gcat="${esc(x.category)}" href="${esc(x.url)}" aria-label="${esc(x.title || 'photo')}">${img(x.url, x.title || C.shop.name)}<span class="zm">${ico('zin')}</span><span class="ov">${x.title ? `<b>${esc(x.title)}</b>` : ''}${x.description ? `<span>${esc(x.description)}</span>` : ''}</span></a>`;
const gal = () => C.gallery.filter(g => g.visible !== false);
function enquiryForm(type = 'general', pid = '') {
  const t = ['retail', 'wholesale', 'general'];
  return `<form class="enq" novalidate><input type="hidden" name="productId" value="${esc(pid)}">
    <div class="seg">${t.map(k => `<label><input type="radio" name="type" value="${k}" ${k === type ? 'checked' : ''}><span>${esc(U[k][0])}<span class="en">${esc(U[k][1])}</span></span></label>`).join('')}</div>
    <div class="fld"><label>${esc(U.name[0])} / ${esc(U.name[1])}</label><input name="name" maxlength="80" autocomplete="name"></div>
    <div class="fld"><label>${esc(U.phone[0])} / ${esc(U.phone[1])}</label><input name="phone" inputmode="tel" maxlength="15" autocomplete="tel"></div>
    <div class="fld"><label>${esc(U.msg[0])} / ${esc(U.msg[1])}</label><textarea name="message" maxlength="600"></textarea></div>
    <div class="ferr"></div><button class="btn wa" style="width:100%" type="submit">${WA}<span class="t">${u('send')}</span></button></form>`;
}
function bindForms(root) {
  $$('form.enq', root).forEach(f => {
    f.onsubmit = e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(f)); const er = $('.ferr', f); er.textContent = '';
      const ph = String(d.phone || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
      if (!String(d.name || '').trim()) { er.textContent = U.errName[0] + ' / ' + U.errName[1]; return; }
      if (!/^[6-9]\d{9}$/.test(ph)) { er.textContent = U.errPhone[0] + ' / ' + U.errPhone[1]; return; }
      const prod = products.find(p => p.id === d.productId);
      const kind = d.type === 'wholesale' ? 'Wholesale' : d.type === 'retail' ? 'Retail' : 'General';
      const msg = `Hello ${C.shop.name}, I am ${d.name.trim()} (${ph}).\n${kind} enquiry${prod ? ' about: ' + prod.name + (prod.nameTa ? ' (' + prod.nameTa + ')' : '') : ''}.\n${(d.message || '').trim()}`.trim();
      window.open(waLink(msg), '_blank', 'noopener'); toast(U.waOpening[0] + ' / ' + U.waOpening[1]); closeModals();
    };
  });
}
function openEnq(pid, type) {
  const p = products.find(x => x.id === pid);
  $('#enqBody').innerHTML = `<div class="formcard"><h3>${u('enqTitle')}</h3>${p ? `<p style="margin-top:6px;font-weight:600;color:var(--gold)">${esc(p.nameTa || '')} ${esc(p.name)}</p>` : ''}${enquiryForm(type || 'general', pid || '')}</div>`;
  bindForms($('#enqBody')); closeModals(); $('#enqModal').classList.add('open');
}
function closeModals() { $$('.modal').forEach(m => m.classList.remove('open')); }
function openProduct(id) {
  const p = products.find(x => x.id === id); if (!p) return; const c = catOf(p.category) || {}; const imgs = p.images || [];
  const msg = `Hi, I would like details about: ${p.name}${p.nameTa ? ' (' + p.nameTa + ')' : ''}`;
  $('#pBody').innerHTML = `<div class="pd" style="padding:22px"><div><div class="pd-main" id="pdMain">${badgeHtml(p)}${imgs.length ? `<img src="${esc(imgs[0])}" alt="${esc(p.name)}" id="pdImg">` : `<div class="ph" style="height:100%"><span class="em" style="font-size:110px">${esc(c.icon || '🛍️')}</span></div>`}</div>
    ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((s, i) => `<button class="${i ? '' : 'on'}" data-th="${i}" aria-label="Photo ${i + 1}"><img src="${esc(s)}" alt=""></button>`).join('')}</div>` : ''}</div>
    <div><span class="ccat">${esc(c.icon || '')} ${esc(c.name || '')}</span><h1>${bi(p.nameTa, p.name)}</h1>${priceHtml(p)}
    <p class="desc">${bi(p.descriptionTa, p.description || p.subtitle)}</p>
    ${C.site.showAvail === true ? `<div class="avail"><div>${p.retail ? '✅' : '⛔'}<span><b>${bi(U.retail[0], U.retail[1])}</b>${p.retail ? bi(U.retailAv[0], U.retailAv[1]) : 'Not available'}</span></div>
    <div>${p.wholesale ? '✅' : '⛔'}<span><b>${bi(U.wholesale[0], U.wholesale[1])}</b>${p.wholesale ? bi(U.wholesaleAv[0], U.wholesaleAv[1]) : 'Not available'}${p.wholesaleNote ? `<br><small style="color:var(--muted)">${esc(p.wholesaleNote)}</small>` : ''}</span></div></div>` : ''}
    <div class="acts"><button class="btn gold" data-enq="${esc(p.id)}"><span class="t">${u('enquire')}</span></button>${waBtn('', msg)}${callBtn('dark')}</div></div></div>`;
  const main = $('#pdImg'); let ci = 0;
  $$('#pBody [data-th]').forEach(b => b.onclick = () => { ci = +b.dataset.th; main.src = imgs[ci]; $$('#pBody [data-th]').forEach(x => x.classList.toggle('on', x === b)); });
  if (imgs.length) $('#pdMain').onclick = () => openLightbox(imgs.map(s => ({ url: s, title: p.name, description: p.nameTa || '' })), ci);
  closeModals(); $('#pModal').classList.add('open');
}

/* ---------- page ---------- */
const state = { cat: 'all', q: '' };
function page() {
  const sl = C.slides; const g = gal();
  const hero = `<div class="hero" id="home"><div class="hero-box">
      ${sl.map((s, i) => `<div class="slide ${i ? '' : 'on'}">${s.image ? `<img src="${esc(s.image)}" alt="" ${i ? 'loading="lazy"' : ''}>` : ''}</div>`).join('')}
      <span class="blob a"></span><span class="blob b"></span><div class="sparks">${Array.from({ length: 10 }, (_, i) => `<i style="--x:${(i * 37 + 11) % 96}%;--d:${(i % 5) * 1.4}s;--s:${6 + (i % 4) * 3}px"></i>`).join('')}</div>
      <div class="hero-in">
        <span class="chip"><i></i><span class="cl">${bi(S('heroTagTa'), S('heroTag'))}</span></span>
        <h1>${bi(S('heroTitleTa'), S('heroTitleEn'))}</h1>
        <div class="sub">${bi(S('heroSubTa'), S('heroSubEn'))}</div>
        <div class="promo">${bi(S('promoTa'), S('promoEn'))}</div>
        <div class="btns">${btn('gold', S('btn1Link') || '#products', bi(S('btn1TextTa'), S('btn1TextEn')))}${btn('light', S('btn2Link') || '#rw', bi(S('btn2TextTa'), S('btn2TextEn')))}${btn('glass', S('btn3Link') || '#contact', bi(S('btn3TextTa'), S('btn3TextEn')))}</div>
      </div>
      ${sl.length ? `<div class="cap" id="cap"></div>` : ''}
      ${sl.length > 1 ? `<div class="dots">${sl.map((_, i) => `<button class="${i ? '' : 'on'}" data-slide="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}</div>` : ''}
    </div></div>`;
  const strip = C.strips.length ? (() => { const one = C.strips.map(s => `<span>${bi(s.ta, s.en)}</span>`).join(''); return `<div class="strip-w"><div class="strip"><div class="strip-track">${one}${one}${one}${one}</div></div></div>`; })() : '';
  const act = liveOffers().length > 0;
  const P = {
    strips: strip,
    categories: sec('categories', head(sb('categoriesTitle'), sb('categoriesSub'), 'eyCat'), catCards()),
    products: sec('products', head(sb('productsTitle'), sb('productsSub'), 'eyProd'),
      `<div class="bar"><label class="search">${ico('search')}<input id="q" type="search" placeholder="${matchMedia('(max-width:520px)').matches ? esc(U.search[0]) : esc(U.search[0]) + ' / ' + esc(U.search[1])}" autocomplete="off"></label>
      <div class="chips" id="chips"><button data-c="all" class="on">${u('all')}</button>${C.categories.filter(c => c.visible !== false).map(c => `<button data-c="${esc(c.id)}">${esc(c.icon)} ${bi(c.ta, c.name)}</button>`).join('')}</div></div>
      <div class="grid" id="plistGrid"></div><div class="more" id="plMore"></div>`),
    rw: sec('rw', head(sb('rwTitle'), sb('rwSub'), 'eyRw'), rwCards()),
    offers: (act ? sec('offers', head(sb('offersTitle'), sb('offersSub'), 'eyOffers'), offerCards()) : ''),
    why: sec('why', head(sb('whyTitle'), sb('whySub'), 'eyWhy'), whyCards()),
    gallery: sec('gallery', head(sb('galleryTitle'), sb('galleryDesc'), 'eyGal'),
      g.length ? galHome(g) : `<div class="empty"><b>📷</b>${u('photosSoon')}</div>`),
    about: sec('about', '', aboutBlock()),
    testimonials: reviewsSection(),
    contact: sec('contact', head(sb('contactTitle'), sb('contactSub'), 'eyContact'), contactBlock()),
    cta: ctaBlock()
  };
  return hero + secOrder().map((id, i) => id === 'stats' ? statsHtml(i > 0) : (P[id] || '')).join('') + waGroupBlock();
}
function contactBlock() {
  const s = C.shop;
  return `<div class="contact"><div class="cinfo" data-r="left">
    <div class="ci"><span class="ic">${ico('phone')}</span><div><small>${esc(U.call[1])}</small>${s.phones.map(p => `<div><a href="${telLink(p)}"><b>${esc(p)}</b></a></div>`).join('')}</div></div>
    <div class="ci"><span class="ic">${WA}</span><div><small>WhatsApp</small><a href="${waLink()}" target="_blank" rel="noopener"><b>+${esc(waNum())}</b></a></div></div>
    ${s.email ? `<div class="ci"><span class="ic">${ico('mail')}</span><div><small>${bi(U.emailLbl[0], U.emailLbl[1])}</small><a href="${esc(mailLink(s.email))}"><b>${esc(s.email)}</b></a></div></div>` : ''}
    <div class="ci"><span class="ic">${ico('pin')}</span><div><small>${bi(U.address[0], U.address[1])}</small>${s.address.map(x => `<div>${esc(x)}</div>`).join('')}</div></div>
    <div class="ci"><span class="ic">${ico('clock')}</span><div style="flex:1"><small>${bi(U.hours[0], U.hours[1])}</small>${s.hours.map(x => { const [a, b] = x.split('|'); return `<div class="hr"><span>${esc((a || '').trim())}</span><span>${esc((b || '').trim())}</span></div>`; }).join('')}</div></div>
    <div class="cbtns">${callBtn('dark')}${waBtn()}${btn('line', mapSearch(), u('directions'))}</div></div>
    <div data-r="right">${C.site.mapShow === false ? '' : `<div class="map"><iframe title="Map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(s.mapQuery)}&output=embed"></iframe></div>`}
    <div class="formcard" style="margin-top:18px"><h3>${u('sendEnq')}</h3>${enquiryForm('general')}</div></div></div>`;
}
const WA_GROUP_RE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{10,40}\/?(\?[^\s#]*)?$/;
const waGroupUrl = () => { const so = C.social || {}; if (so.whatsappGroupOn === false) return ''; const v = String(so.whatsappGroup || '').trim(); return WA_GROUP_RE.test(v) ? v : ''; };
const WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.27-1.38A9.9 9.9 0 1 0 12.04 2Zm5.8 14.1c-.25.7-1.45 1.34-2 1.4-.52.06-1.17.09-1.9-.12a17 17 0 0 1-1.72-.64c-3.03-1.31-5-4.37-5.15-4.57-.15-.2-1.23-1.64-1.23-3.12 0-1.49.78-2.22 1.06-2.52.28-.3.6-.38.8-.38l.58.01c.19 0 .43-.07.67.5.25.6.84 2.06.91 2.2.07.16.12.33.02.53-.1.2-.15.32-.3.5l-.45.52c-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.05 1.14 1 2.1 1.32 2.4 1.47.3.15.47.12.65-.07.17-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.74.82 2.04.97.3.15.5.22.57.35.08.12.08.72-.17 1.42Z"/></svg>';
const waGroupBlock = () => { const url = waGroupUrl(); if (!url) return ''; const so = C.social;
  return `<section class="wag" id="whatsapp-group"><div class="wrap"><div class="wag-in" data-r="zoom"><div class="wag-t"><span class="wag-ic">${WA_SVG}</span><div><h3>${bi(so.whatsappGroupTitleTa || 'எங்கள் வாட்ஸ்அப் குழுவில் இணையுங்கள்', so.whatsappGroupTitleEn || 'Join our WhatsApp Group')}</h3><p>${bi(so.whatsappGroupTextTa || 'புதிய பொருட்கள், சலுகைகள் மற்றும் அறிவிப்புகளை முதலில் பெறுங்கள்.', so.whatsappGroupTextEn || 'Get new arrivals, offers and updates first.')}</p></div></div><a class="wag-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${WA_SVG}<span>${bi(so.whatsappGroupLabelTa || 'வாட்ஸ்அப் குழுவில் சேரவும்', so.whatsappGroupLabelEn || 'Join Our WhatsApp Group')}</span></a></div></div></section>`; };
const ctaBlock = () => `<div class="wrap"><div class="cta" data-r="zoom"><h2>${bi(U.ctaT[0], U.ctaT[1])}</h2><p style="margin-top:8px;opacity:.85">${bi(U.ctaS[0], U.ctaS[1])}</p><div class="btns">${btn('gold', '#contact', u('whBtn'), 'data-type="wholesale"')}${waBtn()}${callBtn('glass')}</div></div></div>`;

/* ---------- behaviours ---------- */
let heroTimer, io, spy;
function drawProducts() {
  const grid = $('#plistGrid'); if (!grid) return; const k = state.q.trim().toLowerCase();
  const list = products.filter(p => (state.cat === 'all' || p.category === state.cat) && (!k || [p.name, p.nameTa, p.subtitle, p.description, p.descriptionTa].join(' ').toLowerCase().includes(k)));
  const lim = state.cat === 'all' && !k && !state.all ? 8 : 1000;
  grid.innerHTML = list.length ? list.slice(0, lim).map(productCard).join('') : `<div class="empty" style="grid-column:1/-1"><b>🔎</b>${bi(U.notFound[0], U.notFound[1])}</div>`;
  $('#plMore').innerHTML = list.length > lim ? `<button class="btn dark" id="plAll"><span class="t">${u('viewProducts')}</span></button>` : '';
  const pa = $('#plAll'); if (pa) pa.onclick = () => { state.all = true; drawProducts(); };
  observe(grid); tilt(grid);
}
function setCat(c) { state.cat = c; $$('#chips button').forEach(x => x.classList.toggle('on', x.dataset.c === c)); drawProducts(); }
function tilt(root) { $$('.card', root).forEach(c => { if (!matchMedia('(pointer:fine)').matches) return; c.onmousemove = e => { const r = c.getBoundingClientRect(); c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 6 + 'deg'); c.style.setProperty('--rx', (-((e.clientY - r.top) / r.height - .5)) * 6 + 'deg'); }; c.onmouseleave = () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }; }); }
function afterRender() {
  bindForms($('#view'));
  const hb = $('.hero-box');
  if (hb) {
    const slides = $$('.slide', hb), dots = $$('[data-slide]', hb), cap = $('#cap'); let cur = 0;
    const show = i => { cur = i; slides.forEach((s, k) => s.classList.toggle('on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i));
      const sl = C.slides[i]; if (cap && sl) { cap.innerHTML = `<small>${esc(sl.tagTa || sl.tagEn)}</small><b>${esc(sl.titleTa || sl.titleEn)}</b>`; cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap'); } };
    show(0); clearInterval(heroTimer);
    if (slides.length > 1) { const run = () => { clearInterval(heroTimer); heroTimer = setInterval(() => show((cur + 1) % slides.length), 6500); }; run(); dots.forEach(d => d.onclick = () => { show(+d.dataset.slide); run(); }); }
  }
  if ($('#plistGrid')) { drawProducts(); $('#q').oninput = e => { state.q = e.target.value; drawProducts(); }; $('#chips').onclick = e => { const b = e.target.closest('button'); if (b) setCat(b.dataset.c); }; }
  const gc = $('#gchips');
  if (gc) gc.onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#gchips button').forEach(x => x.classList.toggle('on', x === b));
    $$('#masonry .gi').forEach(g => { const show = b.dataset.c === 'all' || g.dataset.gcat === b.dataset.c; g.classList.toggle('hide', !show); if (show) { g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); } }); };
  observe($('#view')); tilt($('#view'));
  if (spy) spy.disconnect();
  spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const id = e.target.id; $$('[data-nav]').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id)); const qa = $('.qnav a.on'), qn = $('.qnav'); if (qa && qn && qn.offsetParent) qn.scrollTo({ left: qa.offsetLeft - (qn.clientWidth - qa.offsetWidth) / 2, behavior: 'smooth' }); } }), { rootMargin: '-35% 0px -60% 0px' });
  $$('#view [id]').forEach(el => { if (NAV.some(n => n[1] === '#' + el.id)) spy.observe(el); });
}
let animMode = 'full';
function observe(root) {
  animMode = document.documentElement.dataset.anim || 'full';
  if (!io) io = new IntersectionObserver(es => es.forEach(e => {
    const el = e.target, reveal = el.hasAttribute('data-r');
    if (e.isIntersecting) { el.classList.add('in'); if (el.dataset.count) countUp(el); if (animMode !== 'full') io.unobserve(el); }
    else if (animMode === 'full' && reveal) el.classList.remove('in');
  }), { threshold: 0, rootMargin: '0px 0px -40px 0px' });
  $$('[data-r],[data-count]', root).forEach(el => { if (animMode === 'off') { el.classList.add('in'); return; } io.observe(el); });
}
function countUp(el) {
  const m = /^(\D*)(\d+)(.*)$/.exec(el.dataset.count); if (!m) return; const to = +m[2], dur = 1400, t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = m[1] + Math.round(to * (1 - Math.pow(1 - k, 3))) + m[3]; if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
}

/* ---------- lightbox ---------- */
let LB = { list: [], i: 0, s: 1, x: 0, y: 0 };
function openLightbox(list, i) { const cur = list[i]; if (cur && isPdf(cur.url)) { window.open(cur.url, '_blank', 'noopener'); return; } list = list.filter(x => !isPdf(x.url)); if (!list.length) return; i = Math.max(0, list.indexOf(cur)); LB.list = list; LB.i = i; $('#lb').classList.add('open'); document.body.style.overflow = 'hidden'; lbShow(0); }
function closeLightbox() { $('#lb').classList.remove('open'); document.body.style.overflow = ''; }
function lbTransform(anim) { const im = $('#lbImg'); im.classList.toggle('anim', !!anim); im.style.transform = `translate(${LB.x}px,${LB.y}px) scale(${LB.s})`; im.style.cursor = LB.s > 1 ? 'grab' : 'zoom-in'; }
function lbReset() { LB.s = 1; LB.x = 0; LB.y = 0; lbTransform(false); }
function lbShow(dir) {
  const n = LB.list.length; if (!n) return; LB.i = (LB.i + dir + n) % n; const it = LB.list[LB.i], im = $('#lbImg');
  lbReset(); im.classList.remove('fl', 'fr'); void im.offsetWidth; if (dir) im.classList.add(dir > 0 ? 'fl' : 'fr');
  im.src = it.url; im.alt = it.title || '';
  $('#lbCount').textContent = `${LB.i + 1} / ${n}`;
  $('#lbCap').innerHTML = `${it.title ? `<b>${esc(it.title)}</b>` : ''}${it.description ? `<span>${esc(it.description)}</span>` : ''}`;
  $('#lbP').style.display = $('#lbN').style.display = n > 1 ? '' : 'none';
  [1, -1].forEach(d => { const o = new Image(); o.src = LB.list[(LB.i + d + n) % n].url; });
}
function lbZoom(k, ax, ay) { const ns = Math.min(4, Math.max(1, LB.s * k)); if (ns === LB.s) return; const r = ns / LB.s; LB.x = (LB.x - (ax || 0)) * r + (ax || 0); LB.y = (LB.y - (ay || 0)) * r + (ay || 0); LB.s = ns; if (ns === 1) { LB.x = 0; LB.y = 0; } lbTransform(true); }
let kbBound = false;
function initLightbox() {
  $('#lbX').onclick = closeLightbox; $('#lbP').onclick = () => lbShow(-1); $('#lbN').onclick = () => lbShow(1);
  $('#lbZi').onclick = () => lbZoom(1.6); $('#lbZo').onclick = () => lbZoom(1 / 1.6);
  if (!kbBound) { kbBound = true; document.addEventListener('keydown', e => { const lb = $('#lb'); if (!lb || !lb.classList.contains('open')) { if (e.key === 'Escape') closeModals(); return; } if (e.key === 'Escape') closeLightbox(); if (e.key === 'ArrowRight') lbShow(1); if (e.key === 'ArrowLeft') lbShow(-1); if (e.key === '+') lbZoom(1.4); if (e.key === '-') lbZoom(1 / 1.4); }); }
  const st = $('#lbStage'), ptr = new Map(); let start = null, pinch = null, lastTap = 0, moved = 0;
  const center = () => { const r = st.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  st.addEventListener('wheel', e => { e.preventDefault(); const [cx, cy] = center(); lbZoom(e.deltaY < 0 ? 1.25 : .8, e.clientX - cx, e.clientY - cy); }, { passive: false });
  st.addEventListener('pointerdown', e => { if (e.target.closest('.lb-nav')) return; st.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); moved = 0;
    if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: LB.s }; } else start = { x: e.clientX, y: e.clientY, ox: LB.x, oy: LB.y }; });
  st.addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2 && pinch) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); LB.s = Math.min(4, Math.max(1, pinch.s * d / pinch.d)); if (LB.s === 1) { LB.x = 0; LB.y = 0; } lbTransform(false); moved = 99; return; }
    if (!start) return; const dx = e.clientX - start.x, dy = e.clientY - start.y; moved = Math.max(moved, Math.hypot(dx, dy));
    if (LB.s > 1) { LB.x = start.ox + dx; LB.y = start.oy + dy; lbTransform(false); } else if (Math.abs(dx) > Math.abs(dy)) { LB.x = dx * .6; lbTransform(false); } });
  const end = e => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId);
    if (pinch) { if (ptr.size < 2) pinch = null; if (!ptr.size) start = null; return; }
    if (!start) return; const dx = e.clientX - start.x; const wasTap = moved < 8; const s0 = start; start = null;
    if (LB.s === 1) { if (Math.abs(dx) > 60) { lbShow(dx < 0 ? 1 : -1); return; } LB.x = 0; lbTransform(true);
      if (wasTap) { const now = Date.now(); if (now - lastTap < 320) { const [cx, cy] = center(); lbZoom(2.4, s0.x - cx, s0.y - cy); lastTap = 0; } else lastTap = now; } }
    else if (wasTap) { const now = Date.now(); if (now - lastTap < 320) { lbReset(); lbTransform(true); lastTap = 0; } else lastTap = now; } };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  st.addEventListener('click', e => { if (e.target === st) closeLightbox(); });
}

/* ---------- render + events ---------- */
function prep() {
  const hidden = new Set(C.categories.filter(c => c.visible === false).map(c => c.id));
  products = (C.products || []).filter(p => p.visible !== false && !hidden.has(p.category)).sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (b.createdAt || 0) - (a.createdAt || 0));
}
/* size / layout settings chosen by the shop owner (stored in site.ui* keys) */
const UI = { uiZoom: 100, uiHeroHeightM: 420, uiHeroHeightD: 600, uiHeroTitleM: 26, uiHeroTitleD: 54, uiLogo: 56, uiColsM: 2, uiColsD: 4, uiRatio: '1/1', uiCatIcon: 72, uiCatColsM: 2, uiGalColsM: 2, uiGalColsD: 4, uiSecPad: 56, uiRadius: 20, uiFontTa: 100, uiFontEn: 100, uiLineSpace: 145, uiLetterSpace: 0, uiAnim: 'full', uiGlow: true };
function applyUI() {
  const g = k => { const v = C.site[k]; return v === undefined || v === null || v === '' ? UI[k] : v; };
  const n = (k, lo, hi) => Math.min(hi, Math.max(lo, Number(g(k)) || UI[k]));
  const st = document.documentElement.style;
  const n2 = (k, lo, hi, d) => { const v = Number(C.site[k]); return Math.min(hi, Math.max(lo, C.site[k] !== '' && C.site[k] != null && isFinite(v) ? v : d)); };
  st.setProperty('--wa-size', n2('waSize', 44, 84, 56) + 'px'); st.setProperty('--wa-bottom', n2('waBottom', 8, 160, 16) + 'px'); st.setProperty('--wa-side', n2('waSide', 4, 60, 14) + 'px');
  st.setProperty('--ui-zoom', n('uiZoom', 70, 130) / 100);
  st.setProperty('--hero-h', n('uiHeroHeightM', 260, 800) + 'px'); st.setProperty('--hero-h-d', n('uiHeroHeightD', 360, 900) + 'px');
  st.setProperty('--hero-title', n('uiHeroTitleM', 16, 56) + 'px'); st.setProperty('--hero-title-d', n('uiHeroTitleD', 24, 96) + 'px');
  st.setProperty('--logo', n('uiLogo', 28, 140) + 'px');
  st.setProperty('--cols-m', n('uiColsM', 1, 2)); st.setProperty('--cols-d', n('uiColsD', 3, 5));
  st.setProperty('--ratio', ['1/1', '4/3', '3/4'].includes(String(g('uiRatio'))) ? g('uiRatio') : '1/1');
  st.setProperty('--cat-ic', n('uiCatIcon', 40, 130) + 'px'); st.setProperty('--cat-cols-m', n('uiCatColsM', 2, 3));
  st.setProperty('--gal-cols-m', n('uiGalColsM', 1, 3)); st.setProperty('--gal-cols-d', n('uiGalColsD', 3, 5));
  st.setProperty('--sec-pad', n('uiSecPad', 16, 140) + 'px'); st.setProperty('--r', n('uiRadius', 0, 40) + 'px');
  const col = (k, v) => { const x = String(C.site[k] || ''); if (/^#[0-9a-f]{6}$/i.test(x)) st.setProperty(v, x); else st.removeProperty(v); };
  col('uiColorBrown', '--brown'); col('uiColorBrown2', '--brown2'); col('uiColorGold', '--gold'); col('uiColorGold2', '--gold2'); col('uiColorCream', '--cream');
  const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = /^#[0-9a-f]{6}$/i.test(String(C.site.uiColorBrown || '')) ? C.site.uiColorBrown : '#4a2f20';
  document.documentElement.dataset.fit = C.site.imgFit === 'cover' ? 'cover' : 'contain';
  ['hero', 'products', 'gallery', 'offers', 'about'].forEach(a => { const v = C.site['imgFit' + a[0].toUpperCase() + a.slice(1)]; document.documentElement.dataset['fit' + a[0].toUpperCase() + a.slice(1)] = v === 'cover' ? 'cover' : 'contain'; });
  document.documentElement.dataset.anim = ['full', 'light', 'off'].includes(String(g('uiAnim'))) ? g('uiAnim') : 'full';
  document.documentElement.dataset.glow = g('uiGlow') === false || g('uiGlow') === 'false' ? 'off' : 'on';
}
function renderAll(keep) {
  const y = scrollY; prep(); applyLabels(); applyUI(); buildNav(); clearInterval(heroTimer); shell(); markLoaded(); afterRender();
  document.title = S('seoTitle') || `${C.shop.name} | ${C.shop.nameTa || ''} – Retail & Wholesale, ${C.shop.city || ''}`;
  if (keep) scrollTo(0, y);
  fitHeader();
}
/* Header never overlaps: if the full menu does not fit (any screen, any font size, Tamil or English) switch to the compact menu (burger + quick pills). */
let fhT = 0;
function fitHeader() {
  const h = document.getElementById('top'); if (!h) return;
  h.classList.remove('compact');
  if (innerWidth < 980) return;
  const nav = h.querySelector('.nav'), kids = [...nav.children].filter(e => e.offsetParent !== null && e.getBoundingClientRect().width > 0);
  let bad = nav.scrollWidth > nav.clientWidth + 1;
  for (let i = 1; i < kids.length && !bad; i++) if (kids[i].getBoundingClientRect().left < kids[i - 1].getBoundingClientRect().right - 1) bad = true;
  const lk = h.querySelector('.links'); if (!bad && lk) { const L = [...lk.children]; if (L.some(a => a.scrollWidth > a.clientWidth + 1)) bad = true; }
  if (bad) h.classList.add('compact');
}
const fitSoon = () => { clearTimeout(fhT); fhT = setTimeout(fitHeader, 120); };
addEventListener('resize', fitSoon); addEventListener('load', fitSoon); addEventListener('orientationchange', fitSoon);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);
new MutationObserver(fitSoon).observe(document.body, { attributes: true, attributeFilter: ['data-lang', 'class'] });
new MutationObserver(fitSoon).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-lang'] });
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.of-card[data-offer]')) { e.preventDefault(); openOffer(e.target.dataset.offer); } });
document.addEventListener('click', e => {
  if (e.target.closest('[data-opclose]')) { e.preventDefault(); closeOffer(); return; }
  if (e.target.closest('[data-lpclose]')) { e.preventDefault(); closeList(); return; }
  const lpb = e.target.closest('[data-lp]'); if (lpb) { e.preventDefault(); openList(lpb.dataset.lp); return; }
  const lpc = e.target.closest('[data-lpc]'); if (lpc) { $$('[data-lpc]').forEach(x => x.classList.toggle('on', x === lpc)); $$('#lpage .gi').forEach(x => x.classList.toggle('hide', lpc.dataset.lpc !== 'all' && x.dataset.gcat !== lpc.dataset.lpc)); return; }
  const of = e.target.closest('[data-offer]'); if (of) { if (e.target.closest('a[href]') && !e.target.closest('button[data-offer]')) return; e.preventDefault(); openOffer(of.dataset.offer); return; }
  const pd = e.target.closest('[data-pd]'); if (pd) { e.preventDefault(); openProduct(pd.dataset.pd); return; }
  const enq = e.target.closest('[data-enq]'); if (enq) { e.preventDefault(); openEnq(enq.dataset.enq); return; }
  const cat = e.target.closest('[data-cat]'); if (cat) { e.preventDefault(); setCat(cat.dataset.cat); window.cxGo($('#products'), true); return; }
  const gi = e.target.closest('.gi'); if (gi) { if (isPdf(gi.getAttribute('href'))) return; e.preventDefault(); const g = gal(); openLightbox(g, +gi.dataset.gi); return; }
  const ty = e.target.closest('[data-type]'); if (ty) { const r = $$('#contact input[name=type]'); r.forEach(x => x.checked = x.value === ty.dataset.type); }
  const b = e.target.closest('.btn'); if (b) { const r = b.getBoundingClientRect(), s = document.createElement('span'); s.className = 'rp'; const d = Math.max(r.width, r.height); s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`; b.appendChild(s); setTimeout(() => s.remove(), 600); }
});
/* ---------------------------------------------------------- customer reviews */
const stars = n => `<span class="stars" role="img" aria-label="${n} / 5"><b>${'★'.repeat(n)}</b><i>${'★'.repeat(5 - n)}</i></span>`;
const rvDate = d => { try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return ''; } };
const rvCard = (r, i) => `<div class="tc rv" data-r="up" style="--i:${i % 3}">${stars(r.rating)}<p class="rvt">${esc(r.text)}</p><div class="au"><b>${esc(r.name)}</b><small>${esc(rvDate(r.date))}</small></div>${r.reply ? `<div class="rvr"><b>${u('rvShopReply')}</b><span>${esc(r.reply)}</span></div>` : ''}</div>`;
const testiCard = (t, i) => `<div class="tc" data-r="up" style="--i:${i % 3}"><div class="q">“</div><p>${bi(t.textTa, t.textEn)}</p><div class="au"><b>${esc(t.name)}</b><small>${esc(t.role)}</small></div></div>`;
/* newest first: the review (or shop-added comment) that came last is shown first; "featured" ones stay on top */
function rvList() {
  const items = [];
  (C.testimonials || []).forEach((t, i) => items.push({ f: 0, t: Number(t.addedAt) || 0, i, html: testiCard(t, i) }));
  (C.reviews || []).forEach((r, i) => items.push({ f: r.featured ? 1 : 0, t: Date.parse(r.date) || 0, i: 1e6 + i, html: rvCard(r, i) }));
  return items.sort((a, b) => b.f - a.f || b.t - a.t || a.i - b.i).map(x => x.html);
}
function reviewsSection() {
  const cur = C.testimonials || [], cust = C.reviews || [], form = C.site.reviewForm !== false;
  if (!cur.length && !cust.length && !form) return '';
  const avg = cust.length ? cust.reduce((n, r) => n + r.rating, 0) / cust.length : 0;
  const sum = cust.length ? `<div class="rv-sum" data-r="up"><b>${avg.toFixed(1)}</b>${stars(Math.round(avg))}<span>${cust.length === 1 ? u('rvCount1') : esc(U.rvCount[0].replace('{n}', cust.length)) + ' · ' + esc(U.rvCount[1].replace('{n}', cust.length))}</span></div>` : '';
  const all = rvList(), N = Math.floor(Number(C.site.reviewsHomeCount)), shown = N > 0 ? all.slice(0, N) : all;
  const more = all.length > shown.length ? `<div class="rv-act"><button type="button" class="btn gold big" data-lp="reviews"><span class="t">★ ${u('seeAllReviews')} <i>›</i></span></button></div>` : '';
  const write = form ? `<div class="rv-act"><button type="button" class="btn rv-write" data-rv-open><span class="t"><i>★</i> ${u('writeReview')}</span></button></div>` : '';
  const empty = !all.length ? `<p class="rv-none" data-r="up">${u('rvNone')}</p>` : '';
  return sec('testimonials', head(u('reviewsTitle'), '', 'eyReviews'), sum + (shown.length ? `<div class="testi">${shown.join('')}</div>` : '') + empty + more + write);
}
let rvOpened = 0;
const RV_MAX = 500;
const RV_WORDS = [['😞', 'மோசம்', 'Poor'], ['😐', 'சுமார்', 'Fair'], ['🙂', 'நன்று', 'Good'], ['😀', 'மிக நன்று', 'Very good'], ['🤩', 'அருமை', 'Excellent']];
function openReview() {
  rvOpened = Date.now();
  $('#rvBody').innerHTML = `<div class="formcard rvf"><div class="rvf-top"><span class="rvf-ic">★</span><h3>${u('rvFormTitle')}</h3></div><form id="rvForm" novalidate autocomplete="off">
    <label class="rvl" for="rvName">${u('rvYourName')}</label><input id="rvName" name="name" maxlength="60" autocomplete="name">
    <span class="rvl">${u('rvYourRating')}</span><div class="rv-pick" role="radiogroup" aria-label="${esc(U.rvYourRating[1])}">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="false" aria-label="${n}" data-star="${n}">★</button>`).join('')}</div><div class="rv-word" id="rvWord" aria-live="polite"></div>
    <label class="rvl" for="rvText">${u('rvYourText')}</label><textarea id="rvText" name="text" rows="4" maxlength="${RV_MAX}"></textarea>
    <div class="rv-cnt"><span class="rv-bar"><i id="rvBar"></i></span><span id="rvCnt">0 / ${RV_MAX}</span></div>
    <input class="rv-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="rv-msg" id="rvMsg" role="alert"></p><button class="btn rv-send" type="submit" id="rvSend"><span class="t">➤ ${u('rvSend')}</span></button></form></div>`;
  closeModals(); $('#rvModal').classList.add('open'); setTimeout(() => { const n = $('#rvName'); if (n) n.focus(); }, 80);
}
const rvErr = k => { const e = U[k] || U.rvErr; return e[0] + ' / ' + e[1]; };
async function submitReviewForm(f) {
  const msg = $('#rvMsg'), val = f.querySelector('[aria-checked=true]'), name = f.name.value.trim(), text = f.text.value.trim();
  msg.className = 'rv-msg';
  if (name.length < 2) { msg.textContent = rvErr('rvErrName'); return; }
  if (!val) { msg.textContent = rvErr('rvErrRating'); return; }
  if (text.length < 1 || text.length > RV_MAX) { msg.textContent = rvErr('rvErrText'); return; }
  const btn = $('#rvSend'); btn.disabled = true;
  try {
    const r = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, text, rating: +val.dataset.star, website: f.website.value, t: Date.now() - rvOpened }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { msg.textContent = rvErr(({ name: 'rvErrName', text: 'rvErrText', rating: 'rvErrRating', links: 'rvErrLinks', limit: 'rvErrLimit' })[j.error] || 'rvErr'); btn.disabled = false; return; }
    const k = j.status === 'approved' ? 'rvThanksLive' : 'rvThanksPending';
    $('#rvBody').innerHTML = `<div class="formcard rv-ok"><div class="rv-tick">✓</div><p>${u(k)}</p></div>`;
    if (j.status === 'approved') { fetch('/api/content', { cache: 'no-store' }).then(x => x.json()).then(n => { C.reviews = n.reviews || []; const y = scrollY; const s = $('#testimonials'); if (s) { s.outerHTML = reviewsSection(); markLoaded(); afterRender && afterRender(); scrollTo(0, y); } }).catch(() => {}); }
  } catch { msg.textContent = rvErr('rvErr'); btn.disabled = false; }
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-rv-open]')) { e.preventDefault(); openReview(); return; }
  const m = e.target.closest('[data-rv-more]'); if (m) { $$('[data-rvx]').forEach(x => x.hidden = false); m.closest('.rv-act').remove(); return; }
  const st = e.target.closest('[data-star]'); if (st) { const n = +st.dataset.star; $$('[data-star]', st.parentNode).forEach(b => { const on = +b.dataset.star <= n; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(+b.dataset.star === n)); }); const w = RV_WORDS[n - 1], el = $('#rvWord'); if (el) { el.innerHTML = `<b>${w[0]}</b> ${bi(w[1], w[2])}`; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
});
document.addEventListener('submit', e => { if (e.target.id === 'rvForm') { e.preventDefault(); submitReviewForm(e.target); } });
document.addEventListener('input', e => { if (e.target.id !== 'rvText') return; const n = e.target.value.length, c = $('#rvCnt'), b = $('#rvBar'); if (c) { c.textContent = n + ' / ' + RV_MAX; c.classList.toggle('warn', n >= RV_MAX - 40); } if (b) b.style.width = Math.min(100, n / RV_MAX * 100) + '%'; });

let lastY = scrollY, ticking = false;
let fabT = 0;
function onScroll() {
  ticking = false;
  if (C && C.site.waAutoHide === true && innerWidth < 760) { const f = $('.fab'); if (f) { f.classList.add('away'); clearTimeout(fabT); fabT = setTimeout(() => f.classList.remove('away'), 650); } }
  const y = scrollY, h = document.documentElement.scrollHeight - innerHeight, root = document.documentElement;
  $('#progress').style.width = (h > 0 ? y / h * 100 : 0) + '%';
  const t = $('#top'); if (t) t.classList.toggle('scrolled', y > 10); const up = $('#toTop'); if (up) up.classList.toggle('show', y > 600);
  const dy = y - lastY; if (Math.abs(dy) > 4) { const d = dy > 0 ? 'down' : 'up'; if (root.dataset.dir !== d) root.dataset.dir = d; lastY = y; }
  if (animMode === 'full' && y < 1100) { const hb = $('.hero-box'); if (hb) hb.style.setProperty('--py', Math.min(y * (innerWidth < 760 ? .1 : .2), 80).toFixed(1) + 'px'); }
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
document.addEventListener('pointermove', e => { const t = e.target.closest && e.target.closest('.btn,.card,.offer'); if (!t) return; const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); }, { passive: true });

function loadContent() {
  const seed = document.getElementById('seed');
  if (seed) { try { return Promise.resolve(JSON.parse(seed.textContent)); } catch { /* fall through to network */ } }
  return fetch('/api/content', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
}
async function boot() {
  try { const s = localStorage.getItem('cx-lang'); if (['both', 'ta', 'en'].includes(s)) document.body.dataset.lang = s; } catch {}
  const t0 = Date.now(), sp = $('#splash');
  const hideSplash = () => { if (!sp || sp.classList.contains('out')) return; sp.classList.add('out'); setTimeout(() => { sp.style.display = 'none'; }, 900); };
  setTimeout(hideSplash, 10000); /* safety: the loading screen can never stay forever */
  try { C = await loadContent(); }
  catch { sp.innerHTML = '<div style="text-align:center;padding:0 24px"><p style="margin:0 0 16px;font-size:16px">Could not load the website. Please check your connection and try again.</p><button onclick="location.reload()" style="background:#c8902e;color:#fff;border:0;border-radius:99px;padding:12px 28px;font:700 16px inherit;cursor:pointer">Try again</button></div>'; return; }
  try { renderAll(false); } catch (e) { console.error(e); }
  setTimeout(hideSplash, Math.max(0, 350 - (Date.now() - t0)));
  const oh = location.hash.match(/^#offer-(.+)$/);
  if (oh) { try { history.replaceState({ op: null }, '', location.pathname); history.pushState({ op: 1 }, '', location.hash || '#offer-' + oh[1]); } catch {} openOffer(decodeURIComponent(oh[1]), true); }
  else { let el = null; try { el = location.hash && $(location.hash); } catch {} if (el) setTimeout(() => window.cxGo(el, false), 700); }
  const lh = location.hash.match(/^#all-(offers|gallery|reviews)$/); if (lh) { try { history.replaceState({ lp: null }, '', location.pathname); history.pushState({ lp: lh[1] }, '', '#all-' + lh[1]); } catch {} openList(lh[1], true); }
  visitCount();
}
function visitCount() {
  let v = ''; try { v = localStorage.getItem('cx_v') || ''; if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^\w-]/g, ''); localStorage.setItem('cx_v', v); } } catch { v = Math.random().toString(36).slice(2) + Date.now().toString(36); }
  const hit = k => { try { const b = JSON.stringify({ v, t: k }); if (navigator.sendBeacon) navigator.sendBeacon('/api/hit', new Blob([b], { type: 'application/json' })); else fetch('/api/hit', { method: 'POST', body: b, headers: { 'Content-Type': 'application/json' }, keepalive: true }); } catch {} };
  hit('view'); setInterval(() => { if (!document.hidden) hit('ping'); }, 25000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) hit('ping'); });
}
boot();
})();

/* ---- Menu / section links: land exactly on the section, below the sticky header ---------------------------
   The header height is measured live; the position is corrected again while images and animations settle,
   so a menu tap never ends up in the wrong place. */
(function () {
  const hdr = () => { const h = document.getElementById('top'); return h ? h.getBoundingClientRect().height : 0; };
  const setVar = () => { document.documentElement.style.setProperty('--hdr-h', Math.ceil(hdr()) + 'px'); };
  const absTop = el => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };   /* ignores animation transforms */
  let token = 0;
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, () => { token++; }, { passive: true }));
  const target = el => Math.max(0, Math.round(absTop(el) - hdr() - 6));
  window.cxGo = function (el, smooth) {
    if (!el) return; setVar();
    const my = ++token;
    scrollTo({ top: target(el), behavior: smooth ? 'smooth' : 'auto' });
    [450, 1000, 1900].forEach(ms => setTimeout(() => { if (token !== my) return; const t = target(el); if (Math.abs(scrollY - t) > 3) scrollTo({ top: t, behavior: 'auto' }); }, ms));
  };
  addEventListener('resize', setVar); addEventListener('orientationchange', setVar); addEventListener('load', setVar); setTimeout(setVar, 300); setTimeout(setVar, 1500);
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const id = (a.getAttribute('href') || '').slice(1); if (!id) return;
    if (a.getAttributeNames().some(n => n.startsWith('data-') && n !== 'data-nav')) return;   /* product / offer / category links keep their own behaviour */
    let el = null; try { el = document.getElementById(id); } catch { /* ignore */ }
    if (!el) return;
    e.preventDefault();
    setTimeout(() => { window.cxGo(el, true); try { history.replaceState(history.state, '', '#' + id); } catch { /* ignore */ } }, 80);   /* after the mobile drawer has closed */
  }, true);
})();
