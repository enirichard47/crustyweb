/* ==========================================================================
   video.js — the reusable video engine.

   Usage in HTML (any element becomes a smart video slot):
     <div class="vid" data-video
          data-src="assets/videos/hero.mp4"            required
          data-src-mobile="assets/videos/hero-mobile.mp4"  optional, used on small screens
          data-webm="assets/videos/hero.webm"          optional, preferred when supported
          data-poster="assets/images/hero-poster.jpg"  optional fallback frame
          data-label="hero.mp4"                         shown on the placeholder
          data-eager></div>                              load immediately (hero only)

   What it does:
     - Nothing is downloaded until the slot nears the viewport (IntersectionObserver).
     - Plays only while visible, pauses when scrolled away or the tab is hidden.
     - Far-away videos on mobile are unloaded to free memory.
     - Missing files fail silently: the animated placeholder stays.
     - Reduced motion / Save-Data: shows the poster image, never autoplays.
     - TK.video.setPlaying(el, bool|null) lets scenes (lore, characters, chaos)
       take manual control so only the active clip plays.
   ========================================================================== */
(function () {
  'use strict';
  var TK = (window.TK = window.TK || {});

  var items = new Map();
  var nearIO, farIO;
  var env = null;

  function pickSource(el) {
    var mobile = window.matchMedia('(max-width: 760px)').matches;
    var src = (mobile && el.dataset.srcMobile) || el.dataset.src;
    return src || '';
  }

  function posterOnly(item) {
    var el = item.el;
    var poster = el.dataset.poster;
    if (!poster || item.posterEl) return;
    var img = new Image();
    img.className = 'vid__poster';
    img.alt = '';
    img.decoding = 'async';
    img.onload = function () { el.classList.add('has-video'); };
    img.onerror = function () { img.remove(); };
    img.src = poster;
    el.appendChild(img);
    item.posterEl = img;
  }

  function applyPlayState(item) {
    var v = item.video;
    if (!v || !item.ready) return;
    var want = item.visible && !document.hidden && (item.manual === null || item.manual === true);
    if (want && v.paused) {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    } else if (!want && !v.paused) {
      v.pause();
    }
  }

  function load(item) {
    if (item.loaded || item.failed) return;
    var el = item.el;
    var src = pickSource(el);
    if (!src) return;

    if (env.staticOnly) { item.loaded = true; posterOnly(item); return; }
    item.loaded = true;

    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true;
    v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.disablePictureInPicture = true;
    v.preload = el.hasAttribute('data-eager') ? 'auto' : 'metadata';
    if (el.dataset.poster) v.poster = el.dataset.poster;

    if (el.dataset.webm && v.canPlayType && v.canPlayType('video/webm; codecs="vp9"')) {
      var w = document.createElement('source');
      w.src = el.dataset.webm; w.type = 'video/webm';
      v.appendChild(w);
    }
    var s = document.createElement('source');
    s.src = src; s.type = 'video/mp4';
    v.appendChild(s);

    // <source> errors do not bubble, but they do pass through the capture phase.
    v.addEventListener('error', function () {
      item.failed = true; item.ready = false;
      v.remove(); item.video = null;
      posterOnly(item); // keep a poster if one exists, otherwise the placeholder remains
    }, true);

    v.addEventListener('loadeddata', function () {
      item.ready = true;
      v.classList.add('is-ready');
      el.classList.add('has-video');
      if (item.posterEl) item.posterEl.remove();
      applyPlayState(item);
    }, { once: true });

    el.appendChild(v);
    item.video = v;
  }

  function unload(item) {
    if (!item.video) return;
    item.video.pause();
    item.video.removeAttribute('src');
    while (item.video.firstChild) item.video.removeChild(item.video.firstChild);
    item.video.load();
    item.video.remove();
    item.video = null; item.ready = false; item.loaded = false;
    item.el.classList.remove('has-video');
  }

  function register(el) {
    if (items.has(el)) return items.get(el);
    var item = { el: el, video: null, loaded: false, ready: false, failed: false, visible: false, manual: null, posterEl: null };
    items.set(el, item);
    if (el.hasAttribute('data-eager')) { load(item); item.visible = true; }
    nearIO.observe(el);
    if (farIO) farIO.observe(el);
    return item;
  }

  TK.video = {
    init: function (scope) {
      env = TK.env;
      var save = navigator.connection && navigator.connection.saveData;
      env.staticOnly = env.reduced || !!save;

      nearIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var item = items.get(e.target);
          if (!item) return;
          item.visible = e.isIntersecting;
          if (e.isIntersecting) load(item);
          applyPlayState(item);
        });
      }, { rootMargin: '60% 0px 60% 0px', threshold: 0 });

      // Memory guard for phones: drop videos that are 3+ screens away.
      if (env.mobile) {
        farIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            var item = items.get(e.target);
            if (item && !e.isIntersecting && item.loaded && !item.el.hasAttribute('data-eager')) unload(item);
          });
        }, { rootMargin: '300% 0px 300% 0px', threshold: 0 });
      }

      document.addEventListener('visibilitychange', function () {
        items.forEach(applyPlayState);
      });

      (scope || document).querySelectorAll('[data-video]').forEach(register);
    },

    /** Manual control: true = may play (when visible), false = force pause, null = automatic. */
    setPlaying: function (el, state) {
      var item = items.get(el);
      if (!item) return;
      item.manual = state;
      applyPlayState(item);
    },

    /** Add a slot created after init. */
    add: register
  };
})();
