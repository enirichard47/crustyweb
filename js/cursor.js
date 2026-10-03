/* ==========================================================================
   cursor.js — custom cursor (desktop, fine pointer, motion allowed only).
   Normal: small dot. Over [data-cursor="LABEL"]: grows into a labelled disc.
   ========================================================================== */
(function () {
  'use strict';
  var TK = (window.TK = window.TK || {});

  TK.cursor = {
    init: function () {
      var env = TK.env;
      if (env.touch || env.reduced || !window.gsap) return;

      var el = document.querySelector('.cursor');
      var label = el && el.querySelector('.cursor__label');
      if (!el) return;

      document.documentElement.classList.add('has-cursor');

      var xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
      gsap.set(el, { opacity: 0 });
      var shown = false;

      window.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        if (!shown) { shown = true; gsap.set(el, { x: e.clientX, y: e.clientY }); gsap.to(el, { opacity: 1, duration: 0.3 }); }
        xTo(e.clientX); yTo(e.clientY);
      }, { passive: true });

      document.addEventListener('mouseleave', function () { gsap.to(el, { opacity: 0, duration: 0.2 }); shown = false; });

      document.addEventListener('mouseover', function (e) {
        var t = e.target.closest && e.target.closest('[data-cursor]');
        if (t) { label.textContent = t.getAttribute('data-cursor'); el.classList.add('is-label'); }
      });
      document.addEventListener('mouseout', function (e) {
        var t = e.target.closest && e.target.closest('[data-cursor]');
        if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) el.classList.remove('is-label');
      });
      document.addEventListener('pointerdown', function () { gsap.to(el, { scale: 0.8, duration: 0.15 }); });
      document.addEventListener('pointerup', function () { gsap.to(el, { scale: 1, duration: 0.4, ease: 'back.out(3)' }); });
    }
  };
})();
