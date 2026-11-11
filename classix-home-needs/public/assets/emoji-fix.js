/* Colour emoji for computers that have none (for example Windows 7 / old Windows 10).
   Phones and modern computers already have emoji, so this file does nothing there and downloads nothing.
   If the computer cannot show colour emoji, a small emoji font from this website is used instead (only the parts that are needed).
   Test on any computer: add ?cxemoji=1 to the web address. */
(function () {
  try {
    var force = /[?&]cxemoji=1/.test(location.search);
    function supported() {
      var c = document.createElement('canvas'); c.width = c.height = 32;
      var x = c.getContext && c.getContext('2d'); if (!x || !x.getImageData) return true;
      x.textBaseline = 'top'; x.font = '24px sans-serif';
      function colour(t) {
        x.clearRect(0, 0, 32, 32); x.fillText(t, 2, 2);
        var d = x.getImageData(0, 0, 32, 32).data, i;
        for (i = 0; i < d.length; i += 4) if (d[i + 3] > 50 && (Math.abs(d[i] - d[i + 1]) > 30 || Math.abs(d[i + 1] - d[i + 2]) > 30)) return true;
        return false;
      }
      return colour('\uD83E\uDDF8') && colour('\uD83D\uDECD\uFE0F') && colour('\uD83E\uDDFC') && colour('\uD83E\uDEA3');
    }
    if (!force && supported()) return;
    var st = document.createElement('style');
    st.textContent = '@font-face{font-family:"CxEmoji";src:url(/assets/cx-emoji-2.woff?v=1) format("woff");unicode-range:U+1F600-1F64F,U+200D,U+FE0F,U+20E3;font-display:swap}@font-face{font-family:"CxEmoji";src:url(/assets/cx-emoji-3.woff?v=1) format("woff");unicode-range:U+1F680-1F6FF,U+200D,U+FE0F,U+20E3;font-display:swap}@font-face{font-family:"CxEmoji";src:url(/assets/cx-emoji-4.woff?v=1) format("woff");unicode-range:U+1F900-1F9FF,U+1FA70-1FAFF,U+200D,U+FE0F,U+20E3;font-display:swap}@font-face{font-family:"CxEmoji";src:url(/assets/cx-emoji-5.woff?v=1) format("woff");unicode-range:U+2600-27BF,U+2B50-2B55,U+2B05-2B1C,U+231A-23FF,U+25AA-25FE,U+2934-2935,U+203C-2049,U+2122-2139,U+A9,U+AE,U+24C2,U+3030,U+303D,U+3297-3299,U+200D,U+FE0F,U+20E3;font-display:swap}@font-face{font-family:"CxEmoji";src:url(/assets/cx-emoji-1a.woff?v=1) format("woff");unicode-range:U+1F300-1F3FF,U+200D,U+FE0F,U+20E3;font-display:swap}@font-face{font-family:"CxEmoji";src:url(/assets/cx-emoji-1b.woff?v=1) format("woff");unicode-range:U+1F400-1F4FF,U+200D,U+FE0F,U+20E3;font-display:swap}@font-face{font-family:"CxEmoji";src:url(/assets/cx-emoji-1c.woff?v=1) format("woff");unicode-range:U+1F500-1F5FF,U+200D,U+FE0F,U+20E3;font-display:swap}' + '.cxe{font-family:"CxEmoji",sans-serif!important;font-style:normal!important;font-weight:400!important;letter-spacing:0!important;text-transform:none!important;-webkit-text-fill-color:initial!important;background:none!important}';
    document.head.appendChild(st);
    document.documentElement.className += ' cx-emo';
    var SEQ = '(?:[\\uD83C-\\uD83E][\\uDC00-\\uDFFF]|[\\u231A\\u231B\\u23E9-\\u23F3\\u23F8-\\u23FA\\u25FD\\u25FE\\u2614\\u2615\\u2648-\\u2653\\u267F\\u2693\\u26A1\\u26AA\\u26AB\\u26BD\\u26BE\\u26C4\\u26C5\\u26CE\\u26D4\\u26EA\\u26F2\\u26F3\\u26F5\\u26FA\\u26FD\\u2705\\u270A\\u270B\\u2728\\u274C\\u274E\\u2753-\\u2755\\u2757\\u2795-\\u2797\\u27B0\\u27BF\\u2B1B\\u2B1C\\u2B50\\u2B55]|[\\u00A9\\u00AE\\u203C\\u2049\\u2122\\u2139\\u2194-\\u21AA\\u231A-\\u23FF\\u24C2\\u25AA-\\u27BF\\u2934\\u2935\\u2B05-\\u2B07\\u3030\\u303D\\u3297\\u3299](?=\\uFE0F))(?:\\uFE0F|\\u20E3|\\uD83C[\\uDFFB-\\uDFFF]|\\u200D(?:[\\uD83C-\\uD83E][\\uDC00-\\uDFFF]|[\\u2600-\\u27BF])\\uFE0F?)*';
    var TEST = new RegExp(SEQ), ALL = new RegExp(SEQ, 'g');
    var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, OPTION: 1, NOSCRIPT: 1, TITLE: 1, INPUT: 1 };
    function wrap(root) {
      if (!root || !document.createTreeWalker) return;
      var w = document.createTreeWalker(root, 4, null, false), list = [], n;
      while ((n = w.nextNode())) {
        var p = n.parentNode; if (!p || SKIP[p.nodeName] || (p.classList && p.classList.contains('cxe'))) continue;
        if (TEST.test(n.nodeValue)) list.push(n);
      }
      list.forEach(function (t) {
        var s = t.nodeValue, f = document.createDocumentFragment(), last = 0, m; ALL.lastIndex = 0;
        while ((m = ALL.exec(s))) {
          if (m.index > last) f.appendChild(document.createTextNode(s.slice(last, m.index)));
          var sp = document.createElement('span'); sp.className = 'cxe'; sp.textContent = m[0]; f.appendChild(sp); last = m.index + m[0].length;
        }
        if (last < s.length) f.appendChild(document.createTextNode(s.slice(last)));
        if (t.parentNode) t.parentNode.replaceChild(f, t);
      });
    }
    var tm = 0;
    function later() { clearTimeout(tm); tm = setTimeout(function () { wrap(document.body); }, 40); }
    function start() { wrap(document.body); if (window.MutationObserver) new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true }); }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  } catch (e) { /* emoji help only - never break the website */ }
})();
