/* ==========================================================================
   live.js — live market stats + embedded Dexscreener chart.

   Data comes straight from the public Dexscreener API in the browser
   (no key, no server). If the request fails the section says so and the
   link to Dexscreener still works. Nothing here is cached or invented:
   when there is no data the tiles show a dash.
   ========================================================================== */
(function () {
  'use strict';
  var TK = (window.TK = window.TK || {});

  var REFRESH_MS = 30000;

  function compactUsd(n) {
    n = Number(n);
    if (!isFinite(n)) return '—';
    return '$' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n);
  }

  /* Meme coin prices are tiny: keep four significant digits instead of rounding to $0.00. */
  function priceUsd(p) {
    p = Number(p);
    if (!isFinite(p) || p <= 0) return '—';
    if (p >= 1) return '$' + p.toFixed(2);
    return '$' + p.toFixed(Math.min(12, Math.ceil(-Math.log10(p)) + 3));
  }

  function percent(n) {
    n = Number(n);
    if (!isFinite(n)) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  TK.live = {
    init: function () {
      var sec = document.querySelector('[data-live]');
      if (!sec) return;
      var cfg = TK.config;
      var statusEl = sec.querySelector('[data-live-status]');
      var chart = sec.querySelector('[data-chart]');
      var frame = sec.querySelector('[data-chart-frame]');
      var cover = sec.querySelector('[data-chart-cover]');
      var out = {};
      sec.querySelectorAll('[data-live-stat]').forEach(function (n) { out[n.getAttribute('data-live-stat')] = n; });

      var near = false, timer = null, busy = false, chartSet = false;

      function set(key, text, dir) {
        var el = out[key];
        if (!el) return;
        if (el.textContent !== text) {
          el.textContent = text;
          el.classList.remove('is-tick');
          void el.offsetWidth; // restart the tick animation
          el.classList.add('is-tick');
        }
        if (dir) el.setAttribute('data-dir', dir); else el.removeAttribute('data-dir');
      }

      function setChart(pairAddress) {
        if (chartSet || !frame) return;
        chartSet = true;
        frame.src = 'https://dexscreener.com/solana/' + (pairAddress || cfg.pair || cfg.contract) +
          '?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15';
      }

      function load() {
        if (busy || document.hidden || !near) return;
        busy = true;
        fetch('https://api.dexscreener.com/latest/dex/tokens/' + cfg.contract)
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (data) {
            var pairs = (data.pairs || []).filter(function (p) { return p.chainId === 'solana'; });
            if (!pairs.length) throw new Error('no pairs');
            // The deepest pool is the one people actually trade.
            pairs.sort(function (a, b) { return ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0); });
            var p = pairs[0];
            var change = p.priceChange ? Number(p.priceChange.h24) : NaN;
            set('mcap', compactUsd(p.marketCap != null ? p.marketCap : p.fdv));
            set('price', priceUsd(p.priceUsd));
            set('volume', compactUsd(p.volume && p.volume.h24));
            set('change', percent(change), !isFinite(change) || change === 0 ? '' : change > 0 ? 'up' : 'down');
            setChart(p.pairAddress);
            statusEl.textContent = 'Live · updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · source: Dexscreener';
          })
          .catch(function () {
            setChart();
            statusEl.textContent = 'Live data is not responding right now. The chart on Dexscreener has the numbers.';
          })
          .then(function () { busy = false; });
      }

      // Only fetch (and only load the chart) once the section is close, and only poll while it is.
      new IntersectionObserver(function (entries) {
        near = entries[0].isIntersecting;
        if (near) {
          load();
          if (!timer) timer = setInterval(load, REFRESH_MS);
        } else if (timer) {
          clearInterval(timer); timer = null;
        }
      }, { rootMargin: '80% 0px 80% 0px' }).observe(sec);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });

      // An iframe swallows wheel and touch scrolling, so the chart stays inert until it is asked for.
      if (chart && cover) {
        cover.addEventListener('click', function () { chart.classList.add('is-live'); });
        chart.addEventListener('mouseleave', function () { chart.classList.remove('is-live'); });
        document.addEventListener('pointerdown', function (e) { if (!chart.contains(e.target)) chart.classList.remove('is-live'); });
      }
    }
  };
})();
