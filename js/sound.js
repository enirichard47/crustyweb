/* ==========================================================================
   sound.js — the site's sound, synthesised in the browser (Web Audio API).
   There are no audio files: every sound is generated here.

     hum   a low microwave hum that runs quietly while sound is on
     ding  the microwave bell (sound switched on, chaos reveal, final scene, meme saved)
     tick  a soft blip on buttons and links
     zap   sparks, for the "Do not press start" button

   Browsers do not allow a page to make sound before the visitor has clicked,
   tapped or pressed a key, so the hum starts on the first interaction.
   The nav toggle mutes/unmutes and the choice is remembered (localStorage).
   Set TK.config.sound = false in main.js to make the site start muted.
   ========================================================================== */
(function () {
  'use strict';
  var TK = (window.TK = window.TK || {});

  var KEY = 'crusty-sound';
  var MASTER = 0.55, HUM = 0.085;
  var ctx = null, master = null, hum = null;
  var enabled = true;
  var btn = null, stateEl = null;

  function readPref() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function savePref() {
    try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { /* private mode: just don't remember */ }
  }

  function live() { return enabled && ctx && ctx.state === 'running'; }

  /* Create the audio graph. Only ever called from inside a user gesture. */
  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = MASTER;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function noiseBuffer(seconds, brown) {
    var n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  /* ---------- Hum: mains-style harmonics + a bed of low noise, breathing slowly ---------- */
  function startHum() {
    if (hum || !ctx) return;
    var t = ctx.currentTime;
    var out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(HUM, t + 1.8);
    out.connect(master);

    var nodes = [];
    // 60 Hz is inaudible on phone and laptop speakers, so the upper harmonics carry the hum there
    [[60, 0.5], [120, 0.38], [180, 0.2], [240, 0.09]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = p[0]; g.gain.value = p[1];
      o.connect(g); g.connect(out); o.start(t); nodes.push(o);
    });
    var n = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = noiseBuffer(2, true); n.loop = true;
    lp.type = 'lowpass'; lp.frequency.value = 340; ng.gain.value = 0.55;
    n.connect(lp); lp.connect(ng); ng.connect(out); n.start(t); nodes.push(n);

    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.22; lg.gain.value = HUM * 0.22;
    lfo.connect(lg); lg.connect(out.gain); lfo.start(t); nodes.push(lfo);

    hum = { out: out, nodes: nodes };
  }

  function stopHum() {
    if (!hum) return;
    var h = hum, t = ctx.currentTime;
    hum = null;
    h.out.gain.cancelScheduledValues(t);
    h.out.gain.setValueAtTime(h.out.gain.value, t);
    h.out.gain.linearRampToValueAtTime(0, t + 0.35);
    setTimeout(function () {
      h.nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* already stopped */ } });
      h.out.disconnect();
    }, 500);
  }

  /* ---------- One-shots ---------- */
  function ding() {
    if (!live()) return;
    var t = ctx.currentTime;
    // a small bell: a fundamental plus two inharmonic partials that die away faster
    [[1, 0.22, 1.7], [2.76, 0.07, 0.9], [5.4, 0.025, 0.45]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 1760 * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p[1], t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + p[2] + 0.05);
    });
  }

  function tick() {
    if (!live()) return;
    var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1150, t);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.05);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.09);
  }

  function zap() {
    if (!live()) return;
    var t = ctx.currentTime, dur = 1.1;
    // crackle: noise through a band-pass that sweeps around
    var n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = noiseBuffer(dur, false);
    bp.type = 'bandpass'; bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.exponentialRampToValueAtTime(3400, t + 0.35);
    bp.frequency.exponentialRampToValueAtTime(500, t + dur);
    ng.gain.setValueAtTime(0.22, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(ng); ng.connect(master); n.start(t);
    // buzz: a low saw chopped on and off like arcing
    var o = ctx.createOscillator(), og = ctx.createGain(), chop = ctx.createOscillator(), cg = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 58;
    og.gain.setValueAtTime(0.06, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chop.type = 'square'; chop.frequency.value = 31; cg.gain.value = 0.05;
    chop.connect(cg); cg.connect(og.gain);
    o.connect(og); og.connect(master);
    o.start(t); chop.start(t); o.stop(t + dur); chop.stop(t + dur);
  }

  /* ---------- Toggle ---------- */
  function paint() {
    if (!btn) return;
    btn.classList.toggle('is-on', enabled);
    btn.setAttribute('aria-pressed', String(enabled));
    if (stateEl) stateEl.textContent = enabled ? 'On' : 'Off';
  }

  function setEnabled(on) {
    enabled = on;
    savePref();
    paint();
    if (on) {
      if (unlock()) { startHum(); ding(); }
    } else if (ctx) {
      stopHum();
    }
  }

  TK.sound = {
    init: function () {
      var pref = readPref();
      enabled = pref ? pref === 'on' : TK.config.sound !== false;
      btn = document.getElementById('sound');
      stateEl = btn && btn.querySelector('[data-sound-state]');
      paint();

      if (btn) btn.addEventListener('click', function () { setEnabled(!enabled); });

      // First interaction anywhere: the earliest moment a browser lets the hum start.
      var first = function (e) {
        document.removeEventListener('pointerdown', first, true);
        document.removeEventListener('keydown', first, true);
        if (!enabled) return;
        if (btn && e.target && e.target.closest && e.target.closest('#sound')) return; // the toggle handles its own click
        if (unlock()) startHum();
      };
      document.addEventListener('pointerdown', first, true);
      document.addEventListener('keydown', first, true);

      // Soft blip on anything clickable (the toggle and the chaos button have sounds of their own).
      document.addEventListener('click', function (e) {
        var t = e.target.closest && e.target.closest('a, button, label.mg__tpl');
        if (!t || t.id === 'sound' || t.hasAttribute('data-chaos-btn')) return;
        tick();
      });

      // No sound from a tab nobody is looking at.
      document.addEventListener('visibilitychange', function () {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else if (enabled) ctx.resume();
      });
    },
    ding: ding,
    tick: tick,
    zap: zap
  };
})();
