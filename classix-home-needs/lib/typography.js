/* Classic Home Needs – shared typography module.
 * Used by the server (renders the customer page + admin page, validates saves)
 * and by the admin panel (live preview). No dependencies. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CXTypo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---- font catalogue (id -> CSS family + Google Fonts query) ---- */
  const TAMIL = [
    { id: 'noto-sans-tamil', name: 'Noto Sans Tamil – clean & clear (recommended)', family: 'Noto Sans Tamil', gf: 'Noto+Sans+Tamil:wght@400;500;600;700;800' },
    { id: 'mukta-malar', name: 'Mukta Malar – soft & modern', family: 'Mukta Malar', gf: 'Mukta+Malar:wght@400;500;600;700;800' },
    { id: 'hind-madurai', name: 'Hind Madurai – compact & neat', family: 'Hind Madurai', gf: 'Hind+Madurai:wght@400;500;600;700' },
    { id: 'catamaran', name: 'Catamaran – friendly', family: 'Catamaran', gf: 'Catamaran:wght@400;500;600;700;800' },
    { id: 'anek-tamil', name: 'Anek Tamil – contemporary', family: 'Anek Tamil', gf: 'Anek+Tamil:wght@400;500;600;700;800' },
    { id: 'baloo-thambi-2', name: 'Baloo Thambi 2 – rounded display (previous look)', family: 'Baloo Thambi 2', gf: 'Baloo+Thambi+2:wght@400;500;600;700;800' },
    { id: 'noto-serif-tamil', name: 'Noto Serif Tamil – traditional', family: 'Noto Serif Tamil', gf: 'Noto+Serif+Tamil:wght@400;500;600;700;800' },
    { id: 'tiro-tamil', name: 'Tiro Tamil – book style', family: 'Tiro Tamil', gf: 'Tiro+Tamil' }
  ];
  const ENGLISH = [
    { id: 'dm-sans', name: 'DM Sans – clean (current)', family: 'DM Sans', gf: 'DM+Sans:wght@400;500;600;700', generic: 'sans-serif' },
    { id: 'inter', name: 'Inter – very readable', family: 'Inter', gf: 'Inter:wght@400;500;600;700;800', generic: 'sans-serif' },
    { id: 'poppins', name: 'Poppins – rounded modern', family: 'Poppins', gf: 'Poppins:wght@400;500;600;700;800', generic: 'sans-serif' },
    { id: 'nunito', name: 'Nunito – friendly', family: 'Nunito', gf: 'Nunito:wght@400;500;600;700;800', generic: 'sans-serif' },
    { id: 'roboto', name: 'Roboto – neutral', family: 'Roboto', gf: 'Roboto:wght@400;500;700', generic: 'sans-serif' },
    { id: 'playfair-display', name: 'Playfair Display – elegant serif (current headings)', family: 'Playfair Display', gf: 'Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,500;1,600;1,700', generic: 'serif' },
    { id: 'lora', name: 'Lora – classic serif', family: 'Lora', gf: 'Lora:wght@400;500;600;700', generic: 'serif' },
    { id: 'merriweather', name: 'Merriweather – sturdy serif', family: 'Merriweather', gf: 'Merriweather:wght@400;700', generic: 'serif' }
  ];
  const byId = (list, id) => list.find(f => f.id === id);

  /* ---- settings: key -> [default, min, max, step, unit label] ---- */
  const NUM = {
    taSize: [100, 70, 170, 5], enSize: [100, 70, 170, 5],
    paraScale: [100, 80, 140, 5], headScale: [100, 70, 150, 5],
    taLine: [1.75, 1.3, 2.4, 0.05], enLine: [1.6, 1.2, 2.2, 0.05],
    headLineTa: [1.4, 1.2, 2.0, 0.05], headLineEn: [1.3, 1.1, 1.8, 0.05],
    taLetter: [0, -0.02, 0.1, 0.005], enLetter: [0.005, -0.02, 0.1, 0.005], headLetter: [0, -0.02, 0.1, 0.005],
    taWord: [0.04, 0, 0.4, 0.01], enWord: [0, 0, 0.4, 0.01]
  };
  const DEFAULTS = Object.assign({ taFont: 'noto-sans-tamil', enFont: 'dm-sans', enHeadFont: 'playfair-display' },
    Object.fromEntries(Object.entries(NUM).map(([k, v]) => [k, v[0]])));

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const round = (v, step) => { const d = Math.max(0, (String(step).split('.')[1] || '').length); return Number((Math.round(v / step) * step).toFixed(d)); };

  /* Turn whatever is stored in site.* into a complete, safe settings object.
     Older sites only had uiFontTa / uiFontEn / uiLineSpace / uiLetterSpace – they are honoured. */
  function resolve(site) {
    site = site || {};
    const t = (site.typo && typeof site.typo === 'object') ? site.typo : {};
    const out = Object.assign({}, DEFAULTS);
    const legacy = {};
    if (!site.typo) {
      const n = v => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));
      if (n(site.uiFontTa) != null) legacy.taSize = n(site.uiFontTa);
      if (n(site.uiFontEn) != null) legacy.enSize = n(site.uiFontEn);
    }
    const src = Object.assign({}, legacy, t);
    for (const [k, [def, lo, hi, step]] of Object.entries(NUM)) {
      const v = Number(src[k]);
      out[k] = src[k] === '' || src[k] == null || !isFinite(v) ? def : round(clamp(v, lo, hi), step);
    }
    out.taFont = byId(TAMIL, src.taFont) ? src.taFont : DEFAULTS.taFont;
    out.enFont = byId(ENGLISH, src.enFont) ? src.enFont : DEFAULTS.enFont;
    out.enHeadFont = byId(ENGLISH, src.enHeadFont) ? src.enHeadFont : DEFAULTS.enHeadFont;
    return out;
  }

  /* what gets stored: only validated values */
  const sanitize = site => resolve(site);

  const stack = (f, tail) => `'${f.family}',${tail}`;
  /* CSS custom properties for a settings object -> { '--name': 'value' } */
  function vars(typo) {
    const t = resolve({ typo });
    const ta = byId(TAMIL, t.taFont), en = byId(ENGLISH, t.enFont), eh = byId(ENGLISH, t.enHeadFont);
    return {
      '--font-ta': `${stack(ta, "'Noto Sans Tamil','Mukta Malar',sans-serif")}`,
      '--font-en': `${stack(en, en.generic)}`,
      '--font-en-head': `${stack(eh, eh.generic)}`,
      '--fs-ta': String(t.taSize / 100), '--fs-en': String(t.enSize / 100),
      '--p-scale': String(t.paraScale / 100), '--h-scale': String(t.headScale / 100),
      '--lh-ta': String(t.taLine), '--lh-en': String(t.enLine),
      '--lh-head-ta': String(t.headLineTa), '--lh-head-en': String(t.headLineEn),
      '--ls-ta': t.taLetter + 'em', '--ls-en': t.enLetter + 'em', '--ls-head': t.headLetter + 'em',
      '--ws-ta': t.taWord + 'em', '--ws-en': t.enWord + 'em'
    };
  }
  const css = typo => ':root{' + Object.entries(vars(typo)).map(([k, v]) => `${k}:${v}`).join(';') + '}';

  /* Google Fonts <link href> for the chosen families (+ optional extra ids) */
  function fontsHref(typo, extraIds) {
    const t = resolve({ typo });
    const want = new Map();
    const add = (list, id) => { const f = byId(list, id); if (f) want.set(f.gf, 1); };
    add(TAMIL, t.taFont); add(ENGLISH, t.enFont); add(ENGLISH, t.enHeadFont);
    (extraIds || []).forEach(id => { add(TAMIL, id); add(ENGLISH, id); });
    return 'https://fonts.googleapis.com/css2?' + [...want.keys()].map(g => 'family=' + g).join('&') + '&display=swap';
  }

  return { TAMIL, ENGLISH, NUM, DEFAULTS, resolve, sanitize, vars, css, fontsHref };
});
