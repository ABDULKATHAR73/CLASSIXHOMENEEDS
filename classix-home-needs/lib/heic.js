'use strict';
/* HEIC / HEIF  ->  JPEG, done on the server (no phone work, no npm install needed).
 * Uses libheif (WebAssembly, LGPL-3.0) and the jpeg-js encoder, both shipped in /vendor.
 * Big photos are scaled down to MAX_SIDE so the website stays fast. */
const fs = require('fs');
const path = require('path');
const encodeJpeg = require('../vendor/jpeg-js/encoder.js');

let libPromise = null;
function lib() {
  if (!libPromise) {
    const dir = path.join(__dirname, '..', 'vendor', 'libheif');
    const wasmBinary = fs.readFileSync(path.join(dir, 'libheif.wasm'));
    const mod = require(path.join(dir, 'libheif.js'))({ wasmBinary });
    libPromise = Promise.resolve(mod.ready || mod).then(m => (m && m.HeifDecoder ? m : mod));
  }
  return libPromise;
}

const BRANDS = new Set(['mif1', 'msf1', 'heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'avci']);
const isHeic = b => b && b.length > 16 && b.slice(4, 8).toString('latin1') === 'ftyp' && BRANDS.has(b.slice(8, 12).toString('latin1').replace(/\0/g, ' ').trim());

/* box filter down-scale of an RGBA buffer (fast, good quality for photos) */
function scaleDown(src, w, h, max) {
  const k = Math.max(w, h) / max;
  if (k <= 1) return { data: src, width: w, height: h };
  const nw = Math.max(1, Math.round(w / k)), nh = Math.max(1, Math.round(h / k));
  const out = Buffer.allocUnsafe(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const y0 = Math.floor(y * k), y1 = Math.min(h, Math.max(y0 + 1, Math.floor((y + 1) * k)));
    for (let x = 0; x < nw; x++) {
      const x0 = Math.floor(x * k), x1 = Math.min(w, Math.max(x0 + 1, Math.floor((x + 1) * k)));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) { let i = (yy * w + x0) * 4; for (let xx = x0; xx < x1; xx++, i += 4) { r += src[i]; g += src[i + 1]; b += src[i + 2]; n++; } }
      const o = (y * nw + x) * 4; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
  }
  return { data: out, width: nw, height: nh };
}

async function heicToJpeg(buf, { maxSide = 1600, quality = 82 } = {}) {
  if (!isHeic(buf)) throw new Error('Not a HEIC photo');
  const L = await lib();
  const decoder = new L.HeifDecoder();
  const imgs = decoder.decode(buf);
  if (!imgs || !imgs.length) throw new Error('No picture found in this HEIC file');
  try {
    const im = imgs[0], width = im.get_width(), height = im.get_height();
    if (width * height > 120e6) throw new Error('This photo is too large');
    const px = await new Promise((resolve, reject) => {
      im.display({ data: new Uint8ClampedArray(width * height * 4), width, height }, d => d ? resolve(d.data) : reject(new Error('Could not read this HEIC photo')));
    });
    const s = scaleDown(px, width, height, maxSide);
    return Buffer.from(encodeJpeg({ data: s.data, width: s.width, height: s.height }, quality).data);
  } finally {
    try { for (const i of imgs) i.free(); } catch { /* ignore */ }
    try { decoder.decoder.delete(); } catch { /* ignore */ }
  }
}
module.exports = { heicToJpeg, isHeic };
