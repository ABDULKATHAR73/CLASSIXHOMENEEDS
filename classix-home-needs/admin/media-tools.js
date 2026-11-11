/* Classix admin – media tools (v2.7)
   1. Tap any uploaded photo / video thumbnail -> full-screen preview (video plays with controls).
   2. Every video thumbnail gets a Sound ON / OFF bar underneath. The sound choice is stored in the file address (…mp4?snd=1),
      so it works in Gallery, Offers, Products and Hero slides with no extra setting. Press Save on the page afterwards. */
(function () {
  'use strict';
  var VID = /\.(mp4|webm|mov)($|\?)/i, SND = /[?&]snd=1\b/;
  var base = function (u) { return String(u).replace(/[?&]snd=1\b/, '').replace(/\?$/, ''); };
  var urlOf = function (el) {
    if (el.dataset && el.dataset.vurl) return el.dataset.vurl;
    var m = /url\(["']?([^"')]+)/.exec((el.style && el.style.backgroundImage) || '');
    return m ? m[1] : '';
  };
  var label = function (on) { return on ? '🔊 Sound ON' : '🔇 Sound OFF'; };

  /* ---------- sound bars ---------- */
  var pending = 0;
  function addBars() {
    pending = 0;
    document.querySelectorAll('[data-vurl]').forEach(function (el) {
      if (el.querySelector(':scope > .sndbar')) return;
      var on = SND.test(el.dataset.vurl), b = document.createElement('button');
      b.type = 'button'; b.className = 'sndbar' + (on ? ' on' : ''); b.textContent = label(on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      el.appendChild(b);
    });
  }
  new MutationObserver(function () { if (!pending) pending = requestAnimationFrame(addBars); }).observe(document.documentElement, { childList: true, subtree: true });
  addBars();

  function toggle(btn) {
    var el = btn.parentElement, old = el.dataset.vurl, on = !SND.test(old), nu = on ? base(old) + '?snd=1' : base(old);
    el.dataset.vurl = nu; el.dataset.snd = on ? '1' : '0'; if (el.hasAttribute('data-u')) el.dataset.u = nu;
    var vid = el.querySelector('video'); if (vid) { var t = (vid.getAttribute('src') || '').split('#')[1]; vid.setAttribute('src', nu + (t ? '#' + t : '')); }
    var box = el.closest('.imgf'), hid = box && box.querySelector('input[type=hidden]'); if (hid && hid.value === old) hid.value = nu;
    btn.textContent = label(on); btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    el.dispatchEvent(new CustomEvent('cx-vurl', { bubbles: true, detail: { url: nu, old: old, sound: on } }));
    var t = document.getElementById('toast'); void t;
  }

  /* ---------- full-screen preview ---------- */
  var ov;
  function closePrev() { if (!ov) return; var v = ov.querySelector('video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } ov.remove(); ov = null; document.documentElement.style.overflow = ''; }
  function openPrev(url) {
    closePrev();
    var vid = VID.test(url), on = SND.test(url);
    ov = document.createElement('div'); ov.id = 'cxPrev';
    ov.innerHTML = '<button type="button" class="pvx" aria-label="Close">✕</button><div class="pvbox"></div>' + (vid && on ? '<div class="pvsnd">' + label(on) + '</div>' : '');
    var box = ov.querySelector('.pvbox');
    if (vid) { var v = document.createElement('video'); v.controls = true; v.autoplay = true; v.loop = true; v.playsInline = true; v.muted = !on; if (!on) { v.classList.add('nosnd'); v.addEventListener('volumechange', function () { if (!v.muted) v.muted = true; }); } v.src = url; box.appendChild(v); var p = v.play(); if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () {}); }); }
    else { var im = document.createElement('img'); im.src = url; im.alt = ''; box.appendChild(im); }
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.pvx') || e.target === box) closePrev(); });
    document.body.appendChild(ov); document.documentElement.style.overflow = 'hidden';
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePrev(); });
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    var bar = t.closest('.sndbar'); if (bar) { e.preventDefault(); e.stopPropagation(); toggle(bar); return; }
    if (e.defaultPrevented || t.closest('#cxPrev,button,label,input,select,textarea,a,[data-pdf]')) return;
    var el = t.closest('[data-vurl],[style*="background-image"]'); if (!el) return;
    var u = urlOf(el); if (!u || (u.indexOf('/uploads/') < 0)) return;
    e.preventDefault(); openPrev(u);
  }, true);
})();
