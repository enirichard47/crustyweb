/* ==========================================================================
   main.js — configuration + boot order.

   EDIT THE CONFIG BELOW with the client's real project information.
   Only publish verified facts: no claims about exchanges, liquidity,
   market cap or partnerships unless the client supplies them.
   ========================================================================== */
(function () {
  'use strict';
  var TK = (window.TK = window.TK || {});

  /* ---------- CONFIG: replace placeholders ---------- */
  TK.config = {
    ticker: '$CRUSTY',                // appears everywhere
    name: 'Crusty the Microwave',
    network: 'Solana',
    supply: 1000000000,               // supply at launch (animated counter target); some has since been burned
    contract: 'CLn6y4vGYQeGXWuwf3QUdq77vytto5dwwpnDZZajpump', // full contract address (copied to clipboard)
    pair: '8WL76y2vvWCKThGydiucWy58JWaUtAqub96kWzyvoy6o',     // main pool on Dexscreener: chart fallback if the API is down
    links: {                          // leave '' to keep a link inert
      buy: 'https://jup.ag/swap/SOL-CLn6y4vGYQeGXWuwf3QUdq77vytto5dwwpnDZZajpump',
      x: 'https://x.com/CrustyCto',
      telegram: 'https://t.me/CRUSTYCTO',
      chart: 'https://dexscreener.com/solana/8wl76y2vvwckthgydiucwy58jwautaqub96kwzyvoy6o'
    },
    marquee: 'Hot • Dirty • Decentralized'
  };

  /* ---------- Environment ---------- */
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  TK.env = {
    reduced: mqReduce.matches,
    touch: window.matchMedia('(hover: none), (pointer: coarse)').matches,
    mobile: window.matchMedia('(max-width: 760px)').matches,
    hasGSAP: !!(window.gsap && window.ScrollTrigger),
    motion: false,
    staticOnly: false
  };

  function applyConfig() {
    var c = TK.config;
    document.title = c.ticker + ' — ' + c.name + ' | Hot. Dirty. Decentralized.';

    document.querySelectorAll('[data-ticker]').forEach(function (n) { n.textContent = c.ticker; });
    var h1 = document.querySelector('[data-hero-title]');
    if (h1) h1.setAttribute('aria-label', c.ticker);

    var short = c.contract.length > 16 ? c.contract.slice(0, 6) + '...' + c.contract.slice(-4) : c.contract;
    document.querySelectorAll('[data-contract-short]').forEach(function (n) { n.textContent = short; });
    document.querySelectorAll('[data-contract-full]').forEach(function (n) { n.textContent = c.contract; });

    document.querySelectorAll('[data-network]').forEach(function (n) { n.textContent = c.network; });
    document.querySelectorAll('[data-count]').forEach(function (n) {
      n.setAttribute('data-count', c.supply);
      n.textContent = Number(c.supply).toLocaleString('en-US');
    });

    var phrase = (c.marquee + ' • ').repeat(4);
    document.querySelectorAll('.marquee__item').forEach(function (n) { n.textContent = phrase; });
  }

  /* ---------- Preloader ----------
     The microwave counts down while the fonts, the page and the hero clip load. It never closes in under
     MIN ms (so it does not just flash) and never stays longer than MAX ms, whatever the network does. */
  function runLoader(done) {
    var root = document.documentElement;
    var el = document.getElementById('loader');
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      root.classList.add('is-loaded');
      done();
      if (el) setTimeout(function () { el.remove(); }, 1200);
    }
    if (!el || TK.env.reduced) { finish(); return; }

    var clock = el.querySelector('[data-loader-clock]');
    var bar = el.querySelector('[data-loader-bar]');
    var pct = el.querySelector('[data-loader-pct]');
    var MIN = 1500, MAX = 6000;
    var total = 0, ready = 0;
    function task(run) {
      total++;
      var once = false;
      run(function () { if (!once) { once = true; ready++; } });
    }
    task(function (ok) { if (document.fonts && document.fonts.ready) document.fonts.ready.then(ok, ok); else ok(); });
    task(function (ok) { if (document.readyState === 'complete') ok(); else window.addEventListener('load', ok); });
    task(function (ok) {
      var v = document.querySelector('.hero video');
      if (!v || v.readyState >= 2) { ok(); return; }
      v.addEventListener('loadeddata', ok);
      v.addEventListener('error', ok, true);
    });

    function ding() {
      clock.textContent = 'DING';
      bar.style.transform = 'scaleX(1)';
      pct.textContent = '100%';
      el.classList.add('is-ding');
      setTimeout(finish, 520);
    }

    var start = performance.now(), shown = 0, dinged = false;
    function tick(now) {
      if (finished || dinged) return;
      var t = now - start;
      // creep forward on its own so it never looks frozen, but only reach 100% once everything is ready
      var creep = 0.9 * (1 - Math.exp(-t / 2200));
      var target = Math.min(Math.max(ready / total, creep), t / MIN);
      if (ready === total && t >= MIN) target = 1;
      if (t > MAX) target = 1;
      shown += (target - shown) * 0.14;
      if (target - shown < 0.005) shown = target;
      bar.style.transform = 'scaleX(' + shown.toFixed(3) + ')';
      pct.textContent = Math.round(shown * 100) + '%';
      clock.textContent = '0:0' + Math.max(0, Math.ceil((1 - shown) * 3));
      if (shown >= 1) { dinged = true; ding(); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // requestAnimationFrame stops in a background tab; this makes sure the page still opens.
    setTimeout(function () { if (!dinged) finish(); }, MAX + 1500);
  }

  function boot() {
    var root = document.documentElement;
    applyConfig();

    var env = TK.env;
    env.motion = env.hasGSAP && !env.reduced;
    if (env.motion) root.classList.add('is-motion');

    // 1. Video engine (works with or without GSAP)
    TK.video.init();

    // 2. Smooth scroll, wired into ScrollTrigger
    TK.lenis = null;
    if (env.motion) {
      gsap.registerPlugin(ScrollTrigger);
      if (window.Lenis) {
        var lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 0.95 });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
        TK.lenis = lenis;
      }
    }

    // 3. Everything else
    TK.cursor.init();
    TK.interactions.init();
    TK.live.init();
    TK.meme.init();
    TK.animations.init();
    root.classList.add('is-booted'); // intro states are set: safe to show the hero (see css: html.js:not(.is-booted))

    // Hold the page still behind the preloader, then release it and play the hero intro.
    if (TK.lenis) TK.lenis.stop();
    runLoader(function () {
      if (TK.lenis) TK.lenis.start();
      if (TK.heroIntro) TK.heroIntro.play();
    });

    // Re-measure once fonts and layout settle (pinned sections depend on it)
    if (env.motion) {
      var refresh = function () { ScrollTrigger.refresh(); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
      window.addEventListener('load', refresh);
    }

    // Live-react if the user flips reduced motion mid-session: simplest safe path is a reload.
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', function () { location.reload(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
