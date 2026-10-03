/* ==========================================================================
   animations.js — GSAP + ScrollTrigger choreography.

   Pacing is deliberate: CHAOS -> SILENCE -> CHAOS -> SILENCE.
     hero (chaos) -> what-is-this (slow, sparse) -> lore (cinematic) ->
     meet (playful) -> wall (loud) -> token (calm, big numbers) ->
     buy (climax) -> community (energy) -> chaos button -> final (silence)

   With reduced motion (or if GSAP failed to load) this module does almost
   nothing: all content is already visible and readable in the static layout.
   ========================================================================== */
(function () {
  'use strict';
  var TK = (window.TK = window.TK || {});

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var env;
  var EASE = 'power4.out';
  var SCALE = 1; // shortens pinned scroll distance on phones

  /* Split an element's text into per-character spans (screen readers keep the label). */
  function splitChars(el) {
    var txt = el.textContent;
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', txt);
    el.textContent = '';
    var chars = [];
    for (var i = 0; i < txt.length; i++) {
      var s = document.createElement('span');
      s.className = 'split-char';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = txt[i] === ' ' ? ' ' : txt[i];
      el.appendChild(s);
      chars.push(s);
    }
    return chars;
  }

  /* ---------- Hero ---------- */
  function hero() {
    var media = $('[data-hero-media]');
    var title = $('[data-hero-title] [data-ticker]');
    var chars = splitChars(title);
    var ins = $$('[data-hero-in]');
    var deco = $$('.hero [data-depth]');

    gsap.set(ins, { y: 40, opacity: 0 });
    gsap.set(deco, { scale: 0, opacity: 0 });
    gsap.set(chars, { yPercent: 70, opacity: 0, rotate: 6 });
    gsap.set(media, { scale: 1.18 });

    // Paused: main.js plays it when the preloader lifts.
    var tl = TK.heroIntro = gsap.timeline({ defaults: { ease: EASE }, delay: 0.15, paused: true });
    tl.to(media, { scale: 1, duration: 2.4, ease: 'power3.out' }, 0)
      .to(chars, { yPercent: 0, opacity: 1, rotate: 0, duration: 1.1, stagger: 0.07 }, 0.45)
      .to(ins, { y: 0, opacity: 1, duration: 0.9, stagger: 0.12 }, 1.1)
      .to(deco, { scale: 1, opacity: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(2.4)' }, 1.3); // stickers slap on last

    // Scroll: video drifts slower, content fades as you leave
    gsap.to(media, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__content', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

    // Mouse depth: video, title and decorations all move at different speeds
    if (!env.touch) {
      var mx = gsap.quickTo(media, 'x', { duration: 1.2, ease: 'power3.out' });
      var my = gsap.quickTo(media, 'y', { duration: 1.2, ease: 'power3.out' });
      var tx = gsap.quickTo('.hero__title', 'x', { duration: 0.9, ease: 'power3.out' });
      var ty = gsap.quickTo('.hero__title', 'y', { duration: 0.9, ease: 'power3.out' });
      var decoTo = deco.map(function (d) {
        return { x: gsap.quickTo(d, 'x', { duration: 1, ease: 'power3.out' }), y: gsap.quickTo(d, 'y', { duration: 1, ease: 'power3.out' }), k: parseFloat(d.dataset.depth) };
      });
      $('.hero').addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
        mx(-nx * 40); my(-ny * 28);
        tx(nx * 22); ty(ny * 12);
        decoTo.forEach(function (d) { d.x(nx * 60 * d.k); d.y(ny * 45 * d.k); });
      });
    }
  }

  /* ---------- Section 01: What is this? (pinned, scrubbed) ---------- */
  function what() {
    var pin = $('[data-what-pin]');
    var head = $('[data-what-head]');
    var words = $$('span', head);
    var lines = $$('[data-what-line]');
    var reveal = $('[data-what-reveal]');
    var media = $('[data-what-media]');
    var textBits = $$('.what__reveal-text > *', reveal);

    gsap.set(lines, { opacity: 0 });
    gsap.set(reveal, { clipPath: 'circle(0% at 50% 50%)', visibility: 'hidden' });
    gsap.set(media, { scale: 1.35 });
    gsap.set(textBits, { y: 60, opacity: 0 });

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: pin, start: 'top top', end: '+=' + Math.round(450 * SCALE) + '%', pin: true, scrub: 0.6, anticipatePin: 1 }
    });

    tl.from(words, { yPercent: 100, opacity: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, 0)
      .to({}, { duration: 0.7 }) // silence: let the headline sit
      .to(head, { opacity: 0, xPercent: -12, duration: 0.5, ease: 'power2.in' });

    lines.forEach(function (l, i) {
      var dir = i % 2 ? 1 : -1;
      var last = i === lines.length - 1;
      tl.fromTo(l, { opacity: 0, xPercent: dir * 30, skewX: dir * 12, scale: 0.9 },
        { opacity: 1, xPercent: 0, skewX: 0, scale: 1, duration: 0.5, ease: 'power3.out' });
      tl.to({}, { duration: 0.35 });
      if (!last) tl.to(l, { opacity: 0, xPercent: -dir * 30, duration: 0.3, ease: 'power2.in' });
    });

    // The answer: iris-open reveal with the video scaling down into place
    tl.set(reveal, { visibility: 'visible' })
      .to(reveal, { clipPath: 'circle(150% at 50% 50%)', duration: 1.1, ease: 'power2.inOut' })
      .to(media, { scale: 1, duration: 1.1, ease: 'power2.out' }, '<')
      .to(textBits, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, '-=0.4')
      .to({}, { duration: 0.6 });
  }

  /* ---------- Section 02: Lore (sticky chapters with mask reveals) ---------- */
  function lore() {
    var pin = $('[data-lore-pin]');
    var chapters = $$('[data-chapter]');
    var bar = $('[data-lore-bar]');
    var counter = $('[data-lore-current]');
    var n = chapters.length;
    var starts = [];

    // Only the active chapter's clip plays (saves CPU and bandwidth)
    var vids = chapters.map(function (c) { return $('[data-video]', c); });
    var lastKey = '';
    function syncVideos(time) {
      var play = {};
      var idx = 0;
      for (var k = 1; k < n; k++) {
        var f = (time - starts[k]) / 1;
        if (f >= 0.5) idx = k;
        if (f > 0 && f < 1) { play[k - 1] = true; play[k] = true; }
      }
      play[idx] = true;
      var key = Object.keys(play).join(',') + '|' + idx;
      if (key === lastKey) return;
      lastKey = key;
      vids.forEach(function (v, i) { TK.video.setPlaying(v, !!play[i]); });
      counter.textContent = ('0' + (idx + 1)).slice(-2);
    }

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: pin, start: 'top top', end: '+=' + Math.round(520 * SCALE) + '%', pin: true, scrub: 0.6, anticipatePin: 1,
        onUpdate: function (self) { syncVideos(self.animation.time()); }
      }
    });

    // Chapter 1 copy plays in as the section arrives (not scrubbed), so the scene is never text-less on screen.
    gsap.from($$('[data-chapter-copy] > *', chapters[0]), {
      y: 50, opacity: 0, stagger: 0.12, duration: 1, ease: EASE,
      scrollTrigger: { trigger: pin, start: 'top 55%', once: true }
    });

    var HOLD = 0.8, STEP = 1.6;
    for (var k = 1; k < n; k++) {
      var at = HOLD + (k - 1) * STEP;
      starts[k] = at;
      var prev = chapters[k - 1], cur = chapters[k];
      var curCopy = $$('[data-chapter-copy] > *', cur);
      var curMedia = $('[data-chapter-media]', cur);

      gsap.set(curMedia, { scale: 1.4 });
      gsap.set(curCopy, { xPercent: 18, opacity: 0 });

      // mask wipe (horizontal), previous scene drifts and scales the other way
      tl.fromTo(cur, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'power3.inOut' }, at)
        .to(curMedia, { scale: 1, duration: 1.2, ease: 'power2.out' }, at)
        .to($('[data-chapter-media]', prev), { scale: 1.2, xPercent: -8, duration: 1, ease: 'power2.in' }, at)
        .to($$('[data-chapter-copy]', prev), { xPercent: -14, opacity: 0, duration: 0.6, ease: 'power2.in' }, at)
        .to(curCopy, { xPercent: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out' }, at + 0.45);
    }
    var total = HOLD + (n - 1) * STEP + 0.4;
    tl.to({}, { duration: 0.01 }, total);
    tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: total, ease: 'none' }, 0);

    // initial manual video state
    vids.forEach(function (v, i) { TK.video.setPlaying(v, i === 0); });
  }

  /* ---------- Section 03: Meet — gentle parallax ---------- */
  function meet() {
    gsap.fromTo('.meet__video-inner', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.meet', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------- Section 04: Wall — clip reveals in batches ---------- */
  function wall() {
    var tiles = $$('[data-tile]');
    gsap.set(tiles, { clipPath: 'inset(100% 0% 0% 0%)' });
    ScrollTrigger.batch(tiles, {
      start: 'top 92%', once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, stagger: { each: 0.09, from: 'random' }, ease: 'power4.inOut',
          onComplete: function () { gsap.set(batch, { clearProps: 'clipPath' }); }
        });
      }
    });
  }

  /* ---------- Section 05: Token — outline fills, counters tick ---------- */
  function token() {
    var title = $('.token__title');
    gsap.fromTo(title, { color: 'rgba(255,138,31,0)' }, {
      color: 'rgba(255,138,31,1)', ease: 'none',
      scrollTrigger: { trigger: title, start: 'top 80%', end: 'bottom 35%', scrub: true }
    });
    $$('[data-count]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(o, {
            v: target, duration: 2.6, ease: 'power3.out',
            onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString('en-US'); }
          });
        }
      });
    });
    $$('.spec__value').forEach(function (v) {
      gsap.fromTo(v, { xPercent: 6 }, { xPercent: -3, ease: 'none', scrollTrigger: { trigger: v, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------- Section 06: Buy — the climax ---------- */
  function buy() {
    gsap.fromTo('[data-buy-media]', { yPercent: -8, scale: 1.1 }, { yPercent: 8, scale: 1, ease: 'none', scrollTrigger: { trigger: '.buy', start: 'top bottom', end: 'bottom top', scrub: true } });
    var btn = $('.buy .btn--mega');
    gsap.from(btn, { scale: 0.6, opacity: 0, duration: 1.1, ease: 'elastic.out(1, 0.6)', scrollTrigger: { trigger: btn, start: 'top 90%', once: true } });
  }

  /* ---------- Section 07: Community — marquee reacts to scroll speed ---------- */
  function community() {
    var track = $('[data-marquee-track]');
    var loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: env.mobile ? 14 : 22, repeat: -1 });
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: function (self) {
        var boost = Math.min(Math.abs(self.getVelocity()) / 250, 7);
        loop.timeScale(self.direction * (1 + boost));
        gsap.to(loop, { timeScale: 1, duration: 0.8, overwrite: true, ease: 'power2.out' });
      }
    });
    gsap.from('.social', { y: 80, opacity: 0, stagger: 0.12, duration: 1, ease: EASE, scrollTrigger: { trigger: '.socials', start: 'top 88%', once: true } });
  }

  /* ---------- Section 09: Final — the last scene ---------- */
  function final() {
    var pin = $('[data-final-pin]');
    var media = $('[data-final-media]');
    var a = $('[data-final-a]'), b = $('[data-final-b]'), c = $('[data-final-c]'), cta = $('[data-final-cta]');

    gsap.set(media, { opacity: 0 });
    gsap.set([a, b, c], { opacity: 0 });
    gsap.set(cta, { opacity: 0, y: 40 });

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: pin, start: 'top top', end: '+=' + Math.round(380 * SCALE) + '%', pin: true, scrub: 0.6, anticipatePin: 1 }
    });
    tl.to(media, { opacity: 0.55, duration: 3 }, 0)                       // video slowly fades in from black
      .fromTo(a, { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }, 0.6)
      .to({}, { duration: 0.6 })
      .to(a, { opacity: 0, scale: 0.9, duration: 0.4, ease: 'power2.in' })
      .fromTo(b, { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'expo.out' })
      .to({}, { duration: 0.4 })
      .to(b, { opacity: 0, duration: 0.25 })
      .fromTo(c, { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
      .to(c, { yPercent: -18, duration: 0.8, ease: 'power2.out' }, '+=0.2')
      .to(cta, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '<0.3')
      .to({}, { duration: 0.8 });
  }

  /* ---------- Generic reveals + footer ---------- */
  function reveals() {
    $$('[data-reveal-up]').forEach(function (el) {
      gsap.from(el, { y: 60, opacity: 0, duration: 1.1, ease: EASE, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    var ft = $('[data-footer-title]');
    gsap.from(ft, { y: 90, opacity: 0, duration: 1.3, ease: EASE, scrollTrigger: { trigger: ft, start: 'top 90%', once: true } });
  }

  TK.animations = {
    init: function () {
      env = TK.env;
      if (!env.motion) {
        // Static fallback: a single, calm marquee row and nothing else.
        var second = $$('.marquee__item')[1];
        if (second) second.hidden = true;
        return;
      }
      SCALE = env.mobile ? 0.75 : 1;
      ScrollTrigger.config({ ignoreMobileResize: true });

      // Order matters: pinned triggers first so later positions account for pin spacing.
      hero();
      what();
      lore();
      meet();
      wall();
      token();
      buy();
      community();
      final();
      reveals();
    }
  };
})();
