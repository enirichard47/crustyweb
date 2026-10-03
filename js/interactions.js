/* ==========================================================================
   interactions.js — UI behaviour: nav, menu, anchors, link wiring, copy,
   magnetic buttons, character roster, chaos button.
   Works without GSAP where it can; extras are gated on TK.env.motion.
   ========================================================================== */
(function () {
  'use strict';
  var TK = (window.TK = window.TK || {});

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Nav: shrink + blur after scrolling ---------- */
  function initNav() {
    var nav = $('#nav');
    var on = false;
    function check() {
      var s = window.scrollY > 40;
      if (s !== on) { on = s; nav.classList.toggle('is-scrolled', s); }
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ---------- Hero: size the ticker to fill its row ----------
     Any ticker length works: short ones are capped by viewport height, long ones shrink to fit the width. */
  function initHeroFit() {
    var title = $('[data-hero-title]');
    var inner = title && $('[data-ticker]', title);
    var box = $('.hero__content');
    if (!inner || !box) return;
    var lastW = 0, lastH = 0, raf = 0;

    function fit() {
      var w = inner.offsetWidth; // layout width, unaffected by GSAP transforms
      var cur = parseFloat(getComputedStyle(title).fontSize);
      if (!w || !cur) return;
      var vh = window.innerHeight;
      var cap = vh * (vh < 520 ? 0.36 : 0.46);
      title.style.fontSize = Math.min(cur * box.clientWidth / w, cap).toFixed(1) + 'px';
    }
    function onResize() {
      // Ignore the small height changes caused by mobile browser bars showing/hiding.
      var w = window.innerWidth, h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) < 120) return;
      lastW = w; lastH = h;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    }

    lastW = window.innerWidth; lastH = window.innerHeight;
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); // the display font changes the width
    window.addEventListener('load', fit);
    window.addEventListener('resize', onResize);
  }

  /* ---------- Smooth anchor scrolling ---------- */
  function scrollToTarget(id) {
    var t = id === '#top' ? document.body : $(id);
    if (!t) return;
    if (TK.lenis) TK.lenis.scrollTo(id === '#top' ? 0 : t, { duration: 1.6, offset: 0 });
    else if (id === '#top') window.scrollTo(0, 0);
    else t.scrollIntoView();
  }

  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (href === '#') { e.preventDefault(); return; } // inert placeholder link
      if (href.length > 1 && $(href)) { e.preventDefault(); scrollToTarget(href); }
    });
  }

  /* ---------- Full-screen mobile menu ---------- */
  function initMenu() {
    var burger = $('#burger'), menu = $('#menu');
    function setOpen(open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      $('#nav').classList.toggle('is-menu-open', open);
      if (TK.lenis) open ? TK.lenis.stop() : TK.lenis.start();
      else document.documentElement.style.overflow = open ? 'hidden' : '';
    }
    burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
    $$('[data-menu-link]').forEach(function (l) {
      l.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    window.matchMedia('(min-width: 761px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
  }

  /* ---------- Wire social/buy links from config ---------- */
  function initLinks() {
    var links = TK.config.links;
    $$('[data-link]').forEach(function (a) {
      var key = a.getAttribute('data-link');
      var url = links[key];
      if (url) {
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      } else if (key === 'buy') {
        a.setAttribute('href', '#buy'); // until a real buy URL exists, jump to the Buy section
      }
    });
  }

  /* ---------- Contract copy (Clipboard API + fallback) ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-999px;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (err) { rej(err); } finally { ta.remove(); }
    });
  }

  function burst(btn) {
    if (!TK.env.motion) return;
    var host = btn.parentElement && btn.parentElement.querySelector('[data-burst]');
    if (!host) return;
    var r = btn.getBoundingClientRect(), hr = host.getBoundingClientRect();
    var cx = r.left + r.width / 2 - hr.left, cy = r.top + r.height / 2 - hr.top;
    for (var i = 0; i < 16; i++) {
      var d = document.createElement('i');
      d.className = 'burst-dot';
      d.style.left = cx + 'px'; d.style.top = cy + 'px';
      host.appendChild(d);
      var ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.4, dist = 50 + Math.random() * 60;
      gsap.fromTo(d, { x: 0, y: 0, scale: 1, opacity: 1 }, {
        x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, scale: 0, opacity: 0, duration: 0.8 + Math.random() * 0.3,
        ease: 'power3.out', onComplete: function () { this.targets()[0].remove(); }
      });
    }
  }

  function initCopy() {
    $$('[data-copy]').forEach(function (btn) {
      var idle = $('.contract__idle', btn), done = $('.contract__done', btn);
      if (done) done.setAttribute('aria-hidden', 'true');
      var original = btn.textContent;
      var timer;
      btn.addEventListener('click', function () {
        copyText(TK.config.contract).then(function () {
          clearTimeout(timer);
          if (idle && done) {
            btn.classList.add('is-copied');
            idle.setAttribute('aria-hidden', 'true'); done.removeAttribute('aria-hidden');
          } else { btn.textContent = 'Copied ✓'; }
          burst(btn);
          timer = setTimeout(function () {
            if (idle && done) {
              btn.classList.remove('is-copied');
              done.setAttribute('aria-hidden', 'true'); idle.removeAttribute('aria-hidden');
            } else { btn.textContent = original; }
          }, 2000);
        }).catch(function () {
          // Write into the idle label when there is one, so the button's inner markup survives.
          var slot = idle || btn;
          var prev = idle ? idle.textContent : original;
          clearTimeout(timer);
          slot.textContent = 'Press Ctrl/Cmd+C';
          timer = setTimeout(function () { slot.textContent = prev; }, 2000);
        });
      });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagnetic() {
    var env = TK.env;
    if (!env.motion || env.touch) return;
    $$('.magnetic').forEach(function (el) {
      var inner = el.querySelector('span') || el;
      var xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
      var ixTo = gsap.quickTo(inner, 'x', { duration: 0.5, ease: 'power3.out' });
      var iyTo = gsap.quickTo(inner, 'y', { duration: 0.5, ease: 'power3.out' });
      var strength = el.classList.contains('btn--mega') ? 0.28 : 0.38;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        xTo(dx * strength); yTo(dy * strength);
        ixTo(dx * strength * 0.5); iyTo(dy * strength * 0.5);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); ixTo(0); iyTo(0); });
    });
  }

  /* ---------- Section 03: character roster ---------- */
  function initMeet() {
    var stage = $('[data-meet-stage]');
    if (!stage) return;
    var tabs = $$('.roster__item', stage);
    var vids = $$('[data-char-video]', stage);
    var nameEl = $('[data-meet-name]', stage);
    var statEls = {
      name: $('[data-stat="name"]', stage), role: $('[data-stat="role"]', stage),
      chaos: $('[data-stat="chaos"]', stage), power: $('[data-stat="power"]', stage)
    };
    var meter = $('[data-stat-meter]', stage);
    var particleHost = $('[data-particles]', stage);
    var current = -1;

    function sparkle() {
      if (!TK.env.motion || !particleHost) return;
      var box = $('.meet__video', stage).getBoundingClientRect();
      var host = particleHost.getBoundingClientRect();
      for (var i = 0; i < 22; i++) {
        var p = document.createElement('i');
        p.className = 'particle';
        var size = 4 + Math.random() * 8; p.style.width = p.style.height = size + 'px';
        p.style.left = (box.left - host.left + Math.random() * box.width) + 'px';
        p.style.top = (box.top - host.top + box.height * (0.4 + Math.random() * 0.6)) + 'px';
        particleHost.appendChild(p);
        gsap.to(p, {
          y: -(80 + Math.random() * 220), x: (Math.random() - 0.5) * 120, opacity: 0, scale: 0.2,
          duration: 1 + Math.random() * 0.8, ease: 'power2.out', onComplete: function () { this.targets()[0].remove(); }
        });
      }
    }

    function setText(i, animate) {
      var t = tabs[i], d = t.dataset;
      var apply = function () {
        nameEl.textContent = d.title || d.name;
        statEls.name.textContent = d.name; statEls.role.textContent = d.role;
        statEls.chaos.textContent = d.chaos; statEls.power.textContent = d.power;
        meter.style.width = d.chaos + '%';
      };
      if (animate && TK.env.motion) {
        var targets = [nameEl, statEls.name, statEls.role, statEls.power, statEls.chaos];
        gsap.to(targets, {
          y: -14, opacity: 0, duration: 0.18, stagger: 0.02, ease: 'power2.in',
          onComplete: function () { apply(); gsap.fromTo(targets, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.04, ease: 'power3.out' }); }
        });
      } else apply();
    }

    function activate(i, animate) {
      if (i === current) return;
      current = i;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      stage.style.setProperty('--c', tabs[i].dataset.color || '#ff8a1f');
      vids.forEach(function (v, k) {
        v.classList.toggle('is-active', k === i);
        TK.video.setPlaying(v, k === i);
      });
      setText(i, animate);
      if (animate) sparkle();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { activate(i, true); });
      if (!TK.env.touch) t.addEventListener('pointerenter', function () { activate(i, true); });
      t.addEventListener('focus', function () { activate(i, true); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var next = (i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
          tabs[next].focus();
        }
      });
    });
    // Tap the big video to cycle to the next character (great on mobile)
    $('.meet__video', stage).addEventListener('click', function () { activate((current + 1) % tabs.length, true); });

    activate(0, false);
  }

  /* ---------- Section 08: DO NOT CLICK ---------- */
  function initChaos() {
    var sec = $('#chaos');
    if (!sec) return;
    var btn = $('[data-chaos-btn]', sec), warned = $('[data-chaos-warned]', sec);
    var skip = $('[data-chaos-skip]', sec), fx = $('[data-chaos-fx]', sec);
    var vidEl = $('[data-video]', sec);
    var tl = null;
    TK.video.setPlaying(vidEl, false);

    var WORDS = ['DING', 'SPARKS', 'WHO LEFT A FORK', 'BZZZT', 'HOT', 'DIRTY', 'CTO', 'UH OH', 'STILL COOKING', TK.config.ticker];
    var COLORS = ['#ff8a1f', '#f1e2c6', '#ff3b1a'];

    function cleanup() {
      sec.classList.remove('is-glitching', 'is-blasting');
      TK.video.setPlaying(vidEl, false);
      fx.innerHTML = '';
      skip.hidden = true;
      btn.disabled = false;
      warned.hidden = false;
      if (TK.env.motion) gsap.fromTo(warned, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2.2)' });
    }

    function finish() { if (tl) { tl.kill(); tl = null; } cleanup(); }

    btn.addEventListener('click', function () {
      warned.hidden = true;
      // Reduced motion: no glitch, no explosion. Just the reveal.
      if (!TK.env.motion) { warned.hidden = false; return; }

      btn.disabled = true; skip.hidden = false;
      sec.classList.add('is-glitching', 'is-blasting');
      TK.video.setPlaying(vidEl, true);

      var W = sec.clientWidth, H = sec.clientHeight;
      var count = TK.env.mobile ? 16 : 30;
      tl = gsap.timeline({ onComplete: function () { tl = null; cleanup(); } });

      for (var i = 0; i < count; i++) {
        var w = document.createElement('span');
        w.className = 'chaos-word';
        w.textContent = WORDS[i % WORDS.length];
        w.style.fontSize = (TK.env.mobile ? 12 + Math.random() * 18 : 5 + Math.random() * 10) + 'vw';
        w.style.color = COLORS[i % COLORS.length];
        w.style.left = '50%'; w.style.top = '50%';
        fx.appendChild(w);
        tl.fromTo(w,
          { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0, rotation: 0, opacity: 1 },
          { x: (Math.random() - 0.5) * W * 1.1, y: (Math.random() - 0.5) * H * 1.1, scale: 1, rotation: (Math.random() - 0.5) * 70, duration: 0.9, ease: 'expo.out' },
          i * 0.03);
        tl.to(w, { opacity: 0, scale: 1.3, duration: 0.5, ease: 'power2.in' }, 1.5 + i * 0.01);
      }
      // Glitch only lasts the first beat, then silence before the reveal.
      tl.call(function () { sec.classList.remove('is-glitching'); }, null, 1.0);
    });

    skip.addEventListener('click', finish);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tl) finish(); });
  }

  /* ---------- FAQ accordion (one answer open at a time) ---------- */
  function initFaq() {
    var qs = $$('.faq__q');
    function set(q, open) {
      q.setAttribute('aria-expanded', String(open));
      q.closest('.faq__item').classList.toggle('is-open', open);
    }
    qs.forEach(function (q) {
      q.addEventListener('click', function () {
        var open = q.getAttribute('aria-expanded') !== 'true';
        qs.forEach(function (o) { if (o !== q) set(o, false); });
        set(q, open);
        // The page height just changed: pinned scenes further down need re-measuring once the panel settles.
        if (TK.env.motion) setTimeout(function () { ScrollTrigger.refresh(); }, 560);
      });
    });
  }

  TK.interactions = {
    init: function () {
      initFaq();
      initNav();
      initHeroFit();
      initAnchors();
      initMenu();
      initLinks();
      initCopy();
      initMagnetic();
      initMeet();
      initChaos();
    }
  };
})();
