/* ==========================================================================
   meme.js — canvas meme generator.

   Templates: pictures (any button with data-tpl-src), three backgrounds
   painted in code, or the visitor's own upload (read locally with
   FileReader; nothing is sent anywhere).
   Text: top and bottom lines, word-wrapped, with font / size / colour /
   caps / outline controls. Download exports a PNG.

   Note: browsers block canvas export when the page is opened straight from
   disk (file://) and the canvas holds a local image. Serve the folder over
   http(s) and the download works; uploads export either way.
   ========================================================================== */
(function () {
  'use strict';
  var TK = (window.TK = window.TK || {});

  var SIDE = 1080; // export size of the longest edge
  var WEIGHTS = { 'Anton': 400, 'Impact': 400, 'Archivo': 800, 'Space Mono': 700 };

  /* Small seeded generator so the rust speckles are identical on every redraw. */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  TK.meme = {
    init: function () {
      var root = document.querySelector('[data-meme]');
      if (!root) return;
      var q = function (s) { return root.querySelector(s); };
      var canvas = q('[data-meme-canvas]');
      var ctx = canvas.getContext && canvas.getContext('2d');
      if (!ctx) return;

      var top = q('[data-meme-top]'), bottom = q('[data-meme-bottom]');
      var font = q('[data-meme-font]'), size = q('[data-meme-size]'), sizeOut = q('[data-meme-size-out]');
      var caps = q('[data-meme-caps]'), outline = q('[data-meme-outline]');
      var upload = q('[data-meme-upload]'), status = q('[data-meme-status]');
      var tpls = Array.prototype.slice.call(root.querySelectorAll('[data-tpl]'));
      var uploadTile = q('.mg__tpl--upload');
      var colors = Array.prototype.slice.call(root.querySelectorAll('[data-color]'));

      var DEFAULTS = { top: top.value, bottom: bottom.value, font: font.value, size: size.value, color: colors[0].getAttribute('data-color') };
      var state = { tpl: 'logo', img: null, color: DEFAULTS.color };
      var loaded = {}; // picture templates, fetched the first time they are picked

      function say(msg) { status.textContent = msg || ''; }

      /* Size the canvas to a picture's own shape, capped at the export size. */
      function useImage(img) {
        var k = SIDE / Math.max(img.naturalWidth, img.naturalHeight);
        canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
        state.img = img;
        draw();
      }

      var paint = {
        ember: function (w, h) {
          var g = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, w * 0.75);
          g.addColorStop(0, '#ffb347'); g.addColorStop(0.35, '#ff6a1a'); g.addColorStop(0.75, '#7a1d08'); g.addColorStop(1, '#120603');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        },
        rust: function (w, h) {
          ctx.fillStyle = '#d9c3a0'; ctx.fillRect(0, 0, w, h);
          var r = rng(7);
          for (var i = 0; i < 320; i++) {
            // push the speckles towards the edges, like the enamel on the logo
            var x = r(), y = r();
            if (r() < 0.6) { if (r() < 0.5) x = x < 0.5 ? x * 0.25 : 1 - (1 - x) * 0.25; else y = y < 0.5 ? y * 0.25 : 1 - (1 - y) * 0.25; }
            ctx.fillStyle = 'rgba(' + (95 + r() * 50 | 0) + ',' + (38 + r() * 30 | 0) + ',18,' + (0.25 + r() * 0.6).toFixed(2) + ')';
            ctx.beginPath();
            ctx.arc(x * w, y * h, 3 + r() * r() * 46, 0, Math.PI * 2);
            ctx.fill();
          }
        },
        soot: function (w, h) {
          ctx.fillStyle = '#0a0705'; ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = w * 0.012;
          var m = w * 0.035;
          ctx.strokeRect(m, m, w - m * 2, h - m * 2);
        }
      };

      function wrap(text, maxW) {
        var words = text.split(/\s+/), lines = [], line = '';
        words.forEach(function (word) {
          var test = line ? line + ' ' + word : word;
          if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = word; }
          else line = test;
        });
        if (line) lines.push(line);
        return lines;
      }

      function draw() {
        var w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        if (state.img) ctx.drawImage(state.img, 0, 0, w, h);
        else if (paint[state.tpl]) paint[state.tpl](w, h);
        else { ctx.fillStyle = '#0a0705'; ctx.fillRect(0, 0, w, h); } // picture template still loading

        var px = Math.round(Math.min(w, h) * parseFloat(size.value) / 100);
        var fam = font.value;
        ctx.font = (WEIGHTS[fam] || 400) + ' ' + px + 'px "' + fam + '", Impact, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.lineJoin = 'round'; ctx.miterLimit = 2;
        ctx.lineWidth = Math.max(4, px / 5.5);
        ctx.fillStyle = state.color;
        ctx.strokeStyle = state.color === '#0a0705' ? '#f1e2c6' : '#0a0705'; // outline always contrasts the fill

        var pad = Math.min(w, h) * 0.055, lh = px * 1.1;
        [[top.value, true], [bottom.value, false]].forEach(function (b) {
          var text = b[0].trim();
          if (!text) return;
          if (caps.checked) text = text.toUpperCase();
          var lines = wrap(text, w - pad * 2);
          var y0 = b[1] ? pad : h - pad - lines.length * lh + (lh - px);
          lines.forEach(function (l, i) {
            if (outline.checked) ctx.strokeText(l, w / 2, y0 + i * lh);
            ctx.fillText(l, w / 2, y0 + i * lh);
          });
        });
        sizeOut.textContent = size.value;
      }

      /* The canvas only repaints with the right face once that web font has actually loaded. */
      function drawWithFont() {
        var fam = font.value;
        if (document.fonts && document.fonts.load) document.fonts.load((WEIGHTS[fam] || 400) + ' 40px "' + fam + '"').then(draw, draw);
        else draw();
      }

      function selectTemplate(name) {
        var src = '';
        state.tpl = name; state.img = null;
        tpls.forEach(function (t) {
          var on = t.getAttribute('data-tpl') === name;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-pressed', String(on));
          if (on) src = t.getAttribute('data-tpl-src') || '';
        });
        uploadTile.classList.remove('is-active');
        if (!src) { canvas.width = SIDE; canvas.height = SIDE; draw(); return; }
        var img = loaded[src];
        if (img && img.naturalWidth) { useImage(img); return; }
        draw();
        img = loaded[src] = new Image();
        img.onload = function () { if (state.tpl === name && !state.img) useImage(img); };
        img.onerror = function () { say('That template could not be loaded.'); };
        img.src = src;
      }

      function selectColor(btn) {
        state.color = btn.getAttribute('data-color');
        colors.forEach(function (c) {
          c.classList.toggle('is-active', c === btn);
          c.setAttribute('aria-pressed', String(c === btn));
        });
        draw();
      }

      tpls.forEach(function (t) { t.addEventListener('click', function () { say(''); selectTemplate(t.getAttribute('data-tpl')); }); });
      colors.forEach(function (c) { c.addEventListener('click', function () { selectColor(c); }); });
      q('[data-meme-form]').addEventListener('input', function (e) { if (e.target === font) drawWithFont(); else if (e.target !== upload) draw(); });
      q('[data-meme-form]').addEventListener('submit', function (e) { e.preventDefault(); });

      upload.addEventListener('change', function () {
        var file = upload.files && upload.files[0];
        if (!file) return;
        if (!/^image\//.test(file.type)) { say('That file is not an image.'); return; }
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            state.tpl = 'upload';
            tpls.forEach(function (t) { t.classList.remove('is-active'); t.setAttribute('aria-pressed', 'false'); });
            uploadTile.classList.add('is-active');
            say('Using your picture. It stays on your device.');
            useImage(img);
          };
          img.onerror = function () { say('That image could not be read. Try a JPG or PNG.'); };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
        upload.value = ''; // lets the same file be picked again
      });

      q('[data-meme-download]').addEventListener('click', function () {
        var fail = function () { say('Export was blocked. Open the site from a web server (not as a local file), or use an uploaded picture.'); };
        try {
          canvas.toBlob(function (blob) {
            if (!blob) return fail();
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'crusty-meme.png';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
            say('Saved. Now go post it.');
            TK.sound.ding();
          }, 'image/png');
        } catch (err) { fail(); }
      });

      q('[data-meme-reset]').addEventListener('click', function () {
        top.value = DEFAULTS.top; bottom.value = DEFAULTS.bottom;
        font.value = DEFAULTS.font; size.value = DEFAULTS.size;
        caps.checked = true; outline.checked = true;
        say('');
        selectColor(colors[0]);
        selectTemplate('logo');
      });

      if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
      selectTemplate('logo');
      drawWithFont();
    }
  };
})();
