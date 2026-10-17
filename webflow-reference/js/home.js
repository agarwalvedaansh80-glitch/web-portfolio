/* Slotted v2 — home page modules: bento mini-demos, story rail, ROI calculator, pricing flip.
   Each module is independent and keyed off data-attributes, so in Webflow each can be its own embed. */
(function () {
  'use strict';
  var SL = window.SL; if (!SL) return;
  var clamp = SL.clamp, lerp = SL.lerp, ease = SL.ease, R = SL.reduced;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function cls(el, c, on) { if (!el) return; var k = '__' + c; if (el[k] === on) return; el[k] = on; el.classList.toggle(c, on); }
  function txt(el, v) { if (el && el.__t !== v) { el.__t = v; el.textContent = v; } }
  function fmtH(h) { var m = Math.round((h % 1) * 60); if (m === 60) { h += 1; m = 0; } return Math.floor(h) + ':' + (m < 10 ? '0' : '') + m; }

  /* run fn(t seconds, now) every frame only while el is on screen */
  function live(el, fn, staticT) {
    if (!el) return;
    if (R) { fn(staticT || 0, 0); return; }
    var vis = false, t0 = null;
    SL.whenInView(el, function (v) { vis = v; }, { margin: '100px 0px' });
    SL.onFrame(function (now) { if (!vis) return; if (t0 === null) t0 = now; fn((now - t0) / 1000, now); });
  }

  /* ---------- bento spotlight ---------- */
  $$('.bento_tile').forEach(function (t) {
    t.addEventListener('pointermove', function (e) { var r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  });

  /* ---------- [01] skills match ---------- */
  (function () {
    var root = $('[data-skills]'); if (!root) return;
    var TECHS = [
      { n: 'Ana Ruiz', i: 'AR', s: ['GAS-SAFE', 'HVAC'], c: 'var(--c-route-1)' },
      { n: 'Deshawn Cole', i: 'DC', s: ['ELEC', 'EV'], c: 'var(--c-route-2)' },
      { n: 'Priya Nair', i: 'PN', s: ['PLUMBING'], c: 'var(--c-route-3)' },
      { n: 'Tomás Weber', i: 'TW', s: ['HVAC', 'ELEC L2'], c: 'var(--c-route-4)' }
    ];
    var JOBS = [
      { t: 'No heat, combi boiler', r: ['GAS-SAFE', 'HVAC'], m: 0, d: [11, 18, 22, 7], note: 'TOMÁS IS 4 MIN CLOSER · NOT GAS-SAFE' },
      { t: 'EV charger fault', r: ['ELEC', 'EV'], m: 1, d: [14, 9, 20, 6], note: 'ONLY DESHAWN HOLDS THE EV TICKET' },
      { t: 'Burst pipe, kitchen', r: ['PLUMBING'], m: 2, d: [16, 21, 9, 5], note: 'NEAREST QUALIFIED · 9 MIN' }
    ];
    var ul = $('[data-skills-techs]', root), title = $('[data-skills-title]', root), reqs = $('[data-skills-reqs]', root), note = $('[data-skills-note]', root);
    var link = $('[data-skills-link] path', root), svg = $('[data-skills-link]', root);
    var rows = TECHS.map(function (t) {
      var li = document.createElement('li'); li.className = 'skills_tech';
      li.innerHTML = '<div class="board_avatar" style="--lane:' + t.c + '">' + t.i + '</div><div><div class="skills_tech-name">' + t.n + '</div><div class="skills_tech-chips"></div></div><div class="skills_tech-dist">— MIN</div>';
      ul.appendChild(li); return { li: li, chips: $('.skills_tech-chips', li), dist: $('.skills_tech-dist', li), t: t };
    });
    var cur = -1, CY = 4.6;
    function setJob(k) {
      var j = JOBS[k]; cur = k;
      title.textContent = j.t; title.removeAttribute('data-text'); if (!R) SL.decode(title, 500);
      reqs.innerHTML = j.r.map(function (r) { return '<span class="chip">' + r + '</span>'; }).join('');
      note.textContent = j.note;
      rows.forEach(function (row, i) {
        var ok = j.r.every(function (r) { return row.t.s.indexOf(r) > -1; });
        row.ok = ok;
        row.chips.innerHTML = row.t.s.map(function (s) { return '<span class="chip' + (j.r.indexOf(s) > -1 ? ' is-on" data-hit="1' : '') + '">' + s + '</span>'; }).join('') +
          (ok ? '' : j.r.filter(function (r) { return row.t.s.indexOf(r) < 0; }).map(function (r) { return '<span class="chip is-miss">✕ ' + r + '</span>'; }).join(''));
        row.dist.textContent = j.d[i] + ' MIN';
        ['is-scan', 'is-out', 'is-match'].forEach(function (c) { row.li.classList.remove(c); row.li['__' + c] = false; });
        $$('.chip', row.chips).forEach(function (c) { c.style.opacity = '0'; });
      });
    }
    live(root, function (t) {
      var k = Math.floor(t / CY) % JOBS.length, lt = t % CY;
      if (R) { k = 0; lt = 3; }
      if (k !== cur) setJob(k);
      var j = JOBS[k];
      rows.forEach(function (row, i) {
        var s0 = .5 + i * .38;
        cls(row.li, 'is-scan', lt > s0 && lt < s0 + .38);
        var decided = lt > s0 + .38;
        cls(row.li, 'is-out', decided && !row.ok);
        cls(row.li, 'is-match', lt > 2.2 && row.ok && i === j.m);
        $$('.chip', row.chips).forEach(function (c) { c.style.opacity = lt > s0 + .1 ? '1' : '0'; });
      });
      $$('.chip', reqs).forEach(function (c, i) { c.style.opacity = lt > .15 + i * .1 ? '1' : '0'; cls(c, 'is-on', lt > 2.2); });
      // link line from job card to matched tech
      var sr = svg.getBoundingClientRect(), jr = $('.skills_job', root).getBoundingClientRect(), mr = rows[j.m].li.getBoundingClientRect();
      if (sr.width && lt > 2.2) {
        var x1 = jr.right - sr.left, y1 = jr.top + jr.height / 2 - sr.top, x2 = mr.left - sr.left - 6, y2 = mr.top + mr.height / 2 - sr.top;
        var u = ease.out(clamp((lt - 2.2) / .5, 0, 1));
        var xm = lerp(x1, x2, u), ym = lerp(y1, y2, u);
        link.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C ' + (x1 + 30) + ' ' + y1 + ', ' + (xm - 30) + ' ' + ym + ', ' + xm + ' ' + ym);
        link.style.opacity = lt > CY - .35 ? '0' : '1';
        link.style.strokeDashoffset = String(-(t * 30) % 8);
      } else link.style.opacity = '0';
    });
  })();

  /* ---------- [02] SMS arrival window ---------- */
  (function () {
    var root = $('[data-sms]'); if (!root) return;
    var b1 = $('[data-sms-bubble]', root), b2 = $('[data-sms-update]', root), typing = $('[data-sms-typing]', root);
    var minEl = $('[data-sms-min]', root), range = $('[data-sms-range]', root), eta = $('[data-sms-eta]', root), widthEl = $('[data-sms-width]', root), winEl = $('[data-sms-window]', root);
    var CY = 10.5;
    function pop(el, lt) { var e = lt <= 0 ? 0 : ease.back(clamp(lt / .45, 0, 1)); el.style.opacity = lt > 0 ? '1' : '0'; el.style.transform = 'scale(' + (.7 + .3 * e).toFixed(3) + ')'; el.style.display = lt > 0 ? '' : 'none'; }
    live(root, function (t) {
      var lt = R ? 6 : t % CY;
      var fade = lt > CY - .5 ? 1 - (lt - (CY - .5)) / .5 : 1;
      root.style.opacity = fade.toFixed(2);
      typing.style.display = (lt < .9 || (lt > 2.1 && lt < 2.9)) ? '' : 'none';
      pop(b1, lt - .9); pop(b2, lt - 2.9);
      // ETA ticks down; window narrows around it
      var k = clamp((lt - 3.2) / 5.4, 0, 1);
      var mins = Math.max(1, Math.round(lerp(14, 1, k)));
      if (lt > 8.8) b2.innerHTML = 'Ana is at the door. <b>Knock at 9:33.</b>';
      else { if (b2.__arr) { b2.__arr = false; } if (!minEl.isConnected) { b2.innerHTML = 'Ana is about <b data-sms-min>14</b> min away.'; minEl = $('[data-sms-min]', root); } txt(minEl, String(mins)); }
      if (lt > 8.8) b2.__arr = true;
      var s = lerp(9 + 20 / 60, 9 + 29 / 60, ease.inOut(k)), e = lerp(9 + 50 / 60, 9 + 38 / 60, ease.inOut(k));
      range.style.left = ((s - 9) * 100).toFixed(2) + '%'; range.style.width = ((e - s) * 100).toFixed(2) + '%';
      var et = lerp(9 + 19 / 60, 9 + 33 / 60, k);
      eta.style.left = ((et - 9) * 100).toFixed(2) + '%';
      txt(widthEl, Math.round((e - s) * 60) + ' MIN');
      txt(winEl, fmtH(s) + ' – ' + fmtH(e));
    });
  })();

  /* ---------- [03] drive-time calculator (interactive) ---------- */
  (function () {
    var root = $('[data-drive-demo]'); if (!root) return;
    var input = $('[data-drive-input]', root), minEl = $('[data-drive-min]', root), distEl = $('[data-drive-dist]', root), bufEl = $('[data-drive-buffer]', root), timeEl = $('[data-drive-time]', root);
    var area = $('.drive_area', root), line = $('.drive_line', root), marker = $('.drive_marker', root), dot = $('.drive_dot', root);
    var chips = $$('[data-drive-route]', root);
    var ROUTES = [{ base: 11, am: 15, pm: 21, dist: '6.2 MI' }, { base: 8, am: 9, pm: 27, dist: '4.1 MI' }];
    var route = 0, shown = 18, user = false;
    function dt(h, r) { var R2 = ROUTES[r]; return R2.base + R2.am * Math.exp(-Math.pow((h - 8.1) / .75, 2)) + R2.pm * Math.exp(-Math.pow((h - 17.1) / .95, 2)) + 2 * Math.exp(-Math.pow((h - 12.5) / .8, 2)); }
    var MAXM = 42;
    function X(h) { return (h - 6) / 13 * 300; } function Y(m) { return 88 - m / MAXM * 82; }
    function drawChart() {
      var d = '';
      for (var h = 6; h <= 19.001; h += .125) d += (h === 6 ? 'M' : 'L') + X(h).toFixed(1) + ' ' + Y(dt(h, route)).toFixed(1);
      line.setAttribute('d', d); area.setAttribute('d', d + 'L300 90 L0 90Z');
    }
    function setRoute(i) { route = i; chips.forEach(function (c, k) { c.classList.toggle('is-active', k === i); c.setAttribute('aria-pressed', String(k === i)); }); distEl.textContent = ROUTES[i].dist; drawChart(); }
    chips.forEach(function (c, i) { c.addEventListener('click', function () { user = true; setRoute(i); }); });
    ['pointerdown', 'keydown', 'focus'].forEach(function (ev) { input.addEventListener(ev, function () { user = true; }); });
    setRoute(0);
    live(root, function (t) {
      if (!user && !R) { var v = 12.5 + Math.sin(t * .45 - 1.4) * 5.4; input.value = (Math.round(v * 4) / 4).toFixed(2); }
      var h = parseFloat(input.value), m = dt(h, route);
      input.style.setProperty('--p', ((h - 6) / 13 * 100).toFixed(1) + '%');
      shown = R ? m : lerp(shown, m, .14);
      txt(minEl, String(Math.round(shown)));
      txt(timeEl, (h < 10 ? '0' : '') + fmtH(h));
      txt(bufEl, m < 20 ? '+10' : m < 30 ? '+15' : '+20');
      var x = X(h), y = Y(m);
      marker.setAttribute('x1', x); marker.setAttribute('x2', x); dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    }, 0);
    input.addEventListener('input', function () { user = true; });
  })();

  /* ---------- [04] rating pop ---------- */
  (function () {
    var root = $('[data-rating]'); if (!root) return;
    var stars = $$('.rating_star', root), score = $('[data-rating-score]', root), count = $('[data-rating-count]', root), quote = $('[data-rating-quote]', root), who = $('[data-rating-who]', root);
    var cv = $('[data-rating-burst]', root), cx = cv.getContext('2d');
    var QUOTES = [['“Window said 9:20 to 9:50. Knock at 9:31.”', 'M. OKAFOR · BOILER SERVICE'], ['“Got a text when he was six minutes out. Perfect.”', 'J. LINDQVIST · WATER HEATER'], ['“Fixed first visit. Invoice was in my inbox before he left.”', 'R. DELGADO · EV CHARGER']];
    var CY = 6.4, cyc = -1, parts = [];
    live(root, function (t) {
      var c = Math.floor(t / CY), lt = R ? 5 : t % CY;
      if (c !== cyc) { cyc = c; var q = QUOTES[c % 3]; quote.textContent = q[0]; who.textContent = q[1]; parts = []; }
      var w = root.clientWidth, h = root.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      var rr = root.getBoundingClientRect();
      stars.forEach(function (s, i) {
        var t0 = .5 + i * .2, k = lt - t0, on = k > 0;
        cls(s, 'is-on', on);
        var e = on ? ease.back(clamp(k / .38, 0, 1)) : 0;
        s.style.transform = 'scale(' + (on ? (.4 + .6 * e) : .85).toFixed(3) + ') rotate(' + (on ? (1 - e) * -40 : 0).toFixed(1) + 'deg)';
        if (on && !s['__b' + cyc] && !R) {
          s['__b' + cyc] = true;
          var sr = s.getBoundingClientRect(), ox = sr.left + sr.width / 2 - rr.left, oy = sr.top + sr.height / 2 - rr.top;
          for (var p = 0; p < 10; p++) { var a = Math.random() * 6.28, v = 40 + Math.random() * 70; parts.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, c: Math.random() < .7 ? '#FF6A1F' : '#2BE3C4' }); }
        }
      });
      var full = lt > 1.4;
      txt(score, full ? '4.9' : '4.8'); txt(count, full ? '1,284' : '1,283');
      score.style.color = full && lt < 2.2 ? 'var(--c-signal)' : '';
      root.style.opacity = lt > CY - .4 ? ((CY - lt) / .4).toFixed(2) : '1';
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, w, h);
      parts.forEach(function (p) { p.life += 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 120 / 60; p.vx *= .97; var a = 1 - p.life / .9; if (a <= 0) return; cx.globalAlpha = a; cx.fillStyle = p.c; cx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); });
      cx.globalAlpha = 1;
    }, 5);
  })();

  /* ---------- [05] offline sync ---------- */
  (function () {
    var root = $('[data-offline]'); if (!root) return;
    var bars = $$('[data-offline-bars] i', root), state = $('[data-offline-state]', root), items = $$('[data-offline-queue] li', root);
    var CY = 8.5;
    live(root, function (t) {
      var lt = R ? 7.2 : t % CY;
      var sig = lt < 1 ? 4 : lt < 1.8 ? Math.max(0, 4 - Math.floor((lt - 1) / .2)) : lt < 5.0 ? 0 : Math.min(4, Math.floor((lt - 5.0) / .15));
      bars.forEach(function (b, i) { cls(b, 'is-off', i >= sig); });
      var s = lt < 1.2 ? 'SIGNAL OK' : lt < 5.2 ? 'NO SIGNAL · BASEMENT' : lt < 6.9 ? 'SYNCING…' : 'SYNCED · 5 ITEMS';
      txt(state, s); cls(state, 'is-lost', lt >= 1.2 && lt < 5.2);
      items.forEach(function (li, i) {
        cls(li, 'is-in', lt > 1.8 + i * .55 && lt < CY - .5);
        cls(li, 'is-sync', lt > 5.5 + i * .25 && lt < CY - .5);
      });
    }, 7.2);
  })();

  /* ---------- [06] overrun reshuffle ---------- */
  (function () {
    var root = $('[data-overrun]'); if (!root) return;
    var track = $('[data-overrun-track]', root), js = $$('.overrun_job', root), tail = $('[data-ov-tail]', root), logs = $$('[data-overrun-log] span', root);
    var BASE = [[9, 1.5], [10 + 50 / 60, .9], [12, 1], [13 + 10 / 60, .75]];
    var SHIFT = [0, 40 / 60, 40 / 60, 40 / 60];
    var CY = 9;
    live(root, function (t) {
      var lt = R ? 6 : t % CY, W = track.clientWidth, Ht = track.clientHeight;
      function X(h) { return (h - 9) / 6 * W; }
      var back = lt > CY - 1.2 ? ease.inOut(clamp((lt - (CY - 1.2)) / .9, 0, 1)) : 0;
      var grow = ease.inOut(clamp((lt - .6) / 1.6, 0, 1)) * (1 - back);
      js.forEach(function (el, i) {
        var b = BASE[i], sh = 0, u = 0;
        if (i > 0) { u = ease.inOut(clamp((lt - 2.4 - i * .45) / .7, 0, 1)) * (1 - back); sh = SHIFT[i] * u; }
        var dur = i === 0 ? b[1] + (40 / 60) * grow : b[1];
        var y = 8 + i * ((Ht - 16 - 32) / 3);
        el.style.transform = 'translate3d(' + X(b[0] + sh).toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        el.style.width = (X(b[0] + dur) - X(b[0]) - 3).toFixed(1) + 'px';
        if (i > 0) { var span = $('[data-ov-time]', el); txt(span, u > .5 ? fmtH(b[0] + SHIFT[i]) + ' ✓' : fmtH(b[0])); cls(el, 'is-moved', u > .5); }
      });
      txt($('[data-ov-over]', root), grow > .02 ? '+' + Math.round(grow * 40) + ' MIN' : '9:00');
      tail.style.width = (grow * (40 / 60) / (1.5 + (40 / 60) * grow) * 100).toFixed(2) + '%';
      tail.style.right = '0';
      logs.forEach(function (l, i) { cls(l, 'is-on', lt > [1.2, 3.9, 4.6, 5.2][i] && back < .5); });
    }, 6);
  })();

  /* ---------- [07] week view ---------- */
  (function () {
    var root = $('[data-week]'); if (!root) return;
    var grid = $('[data-week-grid]', root), hint = $('[data-week-hint]', root);
    var DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'], T = ['AR', 'DC', 'PN', 'TW'];
    var A = [[.72, .8, .64, 1.15, .7], [.68, .76, .58, 1.08, .74], [.8, .7, .66, 1.12, .62], [.74, .82, .6, 1.14, .7]];
    var B = A.map(function (r) { return r.map(function (v, d) { return d === 3 ? v - .18 : d === 2 ? v + .18 : v; }); });
    var html = '<span></span>' + DAYS.map(function (d, i) { return '<span class="wk_h' + (i === 3 ? '" data-hot="1' : '') + '">' + d + '</span>'; }).join('');
    T.forEach(function (t) { html += '<span class="wk_t">' + t + '</span>'; for (var d = 0; d < 5; d++) html += '<span class="wk_cell"></span>'; });
    grid.innerHTML = html;
    var cells = $$('.wk_cell', grid), hotH = $('[data-hot]', grid), CY = 7.5;
    live(root, function (t) {
      var lt = R ? 1 : t % CY;
      var k = ease.inOut(clamp((lt - 3.0) / 1.2, 0, 1)) * (1 - ease.inOut(clamp((lt - (CY - .9)) / .8, 0, 1)));
      cells.forEach(function (c, i) {
        var r = Math.floor(i / 5), d = i % 5, v = lerp(A[r][d], B[r][d], k);
        c.style.setProperty('--v', clamp(v * .9 - .25, .05, 1).toFixed(3));
        cls(c, 'is-hot', v > 1);
        txt(c, Math.round(v * 100) + '');
      });
      cls(hotH, 'is-hot', k < .5);
      cls(hint, 'is-ok', k >= .5);
      txt(hint, k < .5 ? 'THU AT 112% · MOVE 2 MAINT VISITS → WED' : 'BALANCED · THU 94% · 2 VISITS MOVED, 2 TEXTS SENT');
    }, 1);
  })();

  /* ---------- story card glyphs (procedural route art) ---------- */
  $$('[data-glyph]').forEach(function (svg) {
    var seed = +svg.getAttribute('data-glyph') * 9301 + 49297, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var g = '';
    for (var x = 0; x <= 200; x += 20) g += '<path class="g-grid" d="M' + x + ' 0 V80"/>';
    for (var y = 0; y <= 80; y += 20) g += '<path class="g-grid" d="M0 ' + y + ' H200"/>';
    var px = 10, py = 20 + Math.round(rnd() * 2) * 20, d = 'M' + px + ' ' + py, pts = [[px, py]];
    while (px < 180) { var nx = Math.min(190, px + 20 + Math.round(rnd() * 2) * 20), ny = 10 + Math.round(rnd() * 3) * 20; d += ' H' + nx + ' V' + ny; px = nx; py = ny; pts.push([px, py]); }
    g += '<path d="' + d + '"/>';
    pts.forEach(function (p, i) { g += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === pts.length - 1 ? 4.5 : 3) + '"/>'; });
    svg.innerHTML = g;
  });

  /* ---------- drag rail with momentum ---------- */
  (function () {
    var rail = $('[data-rail]'); if (!rail) return;
    var track = $('[data-rail-track]', rail), cards = $$('.story-card', track), bar = $('[data-rail-bar]');
    rail.setAttribute('data-cursor-label', 'DRAG');
    var x = 0, v = 0, min = 0, dragging = false, startX = 0, startPos = 0, hist = [], target = null;
    function bounds() { var tw = track.scrollWidth, rw = rail.clientWidth; min = Math.min(0, rw - tw - parseFloat(getComputedStyle(rail).paddingLeft) * 2); }
    bounds(); window.addEventListener('resize', bounds);
    function rubber(val) { if (val > 0) return val * .35; if (val < min) return min + (val - min) * .35; return val; }
    rail.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true; target = null; startX = e.clientX; startPos = x; v = 0; hist = [[performance.now(), e.clientX]];
      rail.setPointerCapture(e.pointerId); rail.classList.add('is-drag');
      var c = $('[data-cursor]'); if (c) c.classList.add('is-drag');
    });
    rail.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      x = rubber(startPos + (e.clientX - startX));
      hist.push([performance.now(), e.clientX]); if (hist.length > 6) hist.shift();
    });
    function end() {
      if (!dragging) return; dragging = false; rail.classList.remove('is-drag');
      var c = $('[data-cursor]'); if (c) c.classList.remove('is-drag');
      var a = hist[0], b = hist[hist.length - 1];
      v = b && a && b[0] - a[0] > 0 ? (b[1] - a[1]) / (b[0] - a[0]) * 16 : 0; // px per frame
    }
    rail.addEventListener('pointerup', end); rail.addEventListener('pointercancel', end);
    rail.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); target = null; x = clamp(x - e.deltaX, min, 0); } }, { passive: false });
    function step(dir) {
      var stepW = cards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 20);
      var idx = Math.round(-x / stepW) + dir; target = clamp(-idx * stepW, min, 0); v = 0;
    }
    var prev = $('[data-rail-prev]'), next = $('[data-rail-next]');
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    rail.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } });
    var skew = 0;
    SL.onFrame(function (now, dt) {
      var k = dt / 16.67, vel = 0, px = x;
      if (!dragging) {
        if (target !== null) { x = lerp(x, target, 1 - Math.pow(.86, k)); if (Math.abs(x - target) < .3) { x = target; target = null; } }
        else {
          x += v * k; v *= Math.pow(.94, k);
          if (x > 0) { x = lerp(x, 0, 1 - Math.pow(.82, k)); v *= .5; }
          if (x < min) { x = lerp(x, min, 1 - Math.pow(.82, k)); v *= .5; }
          if (Math.abs(v) < .02) v = 0;
        }
      }
      vel = (x - (track.__px == null ? x : track.__px)) / Math.max(.5, k); track.__px = x;
      skew = lerp(skew, clamp(vel * -.18, -7, 7), .2);
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      if (!R) cards.forEach(function (c) { c.style.transform = Math.abs(skew) > .02 ? 'skewX(' + skew.toFixed(2) + 'deg) scale(' + (1 - Math.abs(skew) * .004).toFixed(4) + ')' : ''; });
      if (bar) { var vis = rail.clientWidth / (rail.clientWidth - min); bar.style.width = (vis * 100).toFixed(1) + '%'; bar.style.transform = 'translate3d(' + ((min ? x / min : 0) * (1 / vis - 1) * 100).toFixed(2) + '%,0,0)'; }
    });
  })();

  /* ---------- ROI calculator ---------- */
  (function () {
    var root = $('#roi'); if (!root) return;
    var inT = $('[data-roi="techs"]', root), inJ = $('[data-roi="jobs"]', root);
    var outT = $('[data-roi-out="techs"]', root), outJ = $('[data-roi-out="jobs"]', root);
    var elH = $('[data-roi-hours]', root), elE = $('[data-roi-extra]', root), elR = $('[data-roi-rev]', root), elC = $('[data-roi-cost]', root), elX = $('[data-roi-x]', root);
    var cellsWrap = $('[data-roi-cells]', root), cells = [];
    for (var i = 0; i < 120; i++) { var c = document.createElement('i'); cellsWrap.appendChild(c); cells.push(c); }
    var tgt = {}, cur = null;
    function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
    function calc() {
      var t = +inT.value, j = +inJ.value;
      var hours = t * j * 21 * 6 / 60, extra = hours / 3 / 1.6, rev = extra * 210, cost = t * (t > 15 ? 39 : 29);
      tgt = { h: hours, e: extra, r: rev, c: cost, x: rev / cost };
      [inT, inJ].forEach(function (inp) { inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min) * 100) + '%'); });
      txt(outT, String(t)); txt(outJ, String(j));
      if (!cur || R) cur = Object.assign({}, tgt);
    }
    inT.addEventListener('input', calc); inJ.addEventListener('input', calc);
    calc();
    var lastH = -1;
    SL.onFrame(function () {
      var moving = false;
      for (var k in tgt) { var d = tgt[k] - cur[k]; if (Math.abs(d) > (k === 'x' ? .005 : .4)) { cur[k] += d * .14; moving = true; } else cur[k] = tgt[k]; }
      txt(elH, String(Math.round(cur.h))); txt(elE, String(Math.round(cur.e))); txt(elR, money(cur.r)); txt(elC, money(cur.c)); txt(elX, cur.x.toFixed(1) + '×');
      var on = Math.min(120, Math.round(cur.h / 10));
      if (on !== lastH) { lastH = on; cells.forEach(function (c, i) { cls(c, 'is-on', i < on); }); }
      elH.style.transform = moving ? 'translateY(-2px)' : '';
    });
  })();

  /* ---------- pricing flip ---------- */
  (function () {
    var tog = $('[data-billing]'), grid = $('[data-pricing]'); if (!tog || !grid) return;
    var opts = $$('[data-billing-option]', tog);
    function set(annual, fromKey) {
      tog.classList.toggle('is-annual', annual); grid.classList.toggle('is-annual', annual);
      opts.forEach(function (o) { var on = (o.getAttribute('data-billing-option') === 'annual') === annual; o.classList.toggle('is-active', on); o.setAttribute('aria-checked', String(on)); o.tabIndex = on ? 0 : -1; if (on && fromKey) o.focus(); });
      $$('.pricing_card', grid).forEach(function (card) {
        var f = $('.is-front', card), b = $('.is-back', card);
        f.setAttribute('aria-hidden', String(annual)); b.setAttribute('aria-hidden', String(!annual));
        $$('a', f).forEach(function (a) { a.tabIndex = annual ? -1 : 0; }); $$('a', b).forEach(function (a) { a.tabIndex = annual ? 0 : -1; });
      });
    }
    opts.forEach(function (o) { o.addEventListener('click', function () { set(o.getAttribute('data-billing-option') === 'annual'); }); });
    tog.addEventListener('keydown', function (e) { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) > -1) { e.preventDefault(); set(!grid.classList.contains('is-annual'), true); } });
    set(false);
  })();
})();
