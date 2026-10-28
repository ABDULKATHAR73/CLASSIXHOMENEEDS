'use strict';
/* Runs one HEIC -> JPEG conversion in a separate thread, so the website never freezes while a big photo is converted. */
const { parentPort, workerData } = require('worker_threads');
const { heicToJpeg } = require('./heic');
heicToJpeg(Buffer.from(workerData.buf), workerData.opt)
  .then(out => { const ab = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength); parentPort.postMessage({ ok: true, buf: ab }, [ab]); })
  .catch(e => parentPort.postMessage({ ok: false, error: String((e && e.message) || e) }));
