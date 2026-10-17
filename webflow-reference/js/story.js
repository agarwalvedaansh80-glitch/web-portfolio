/* Slotted v2 — scroll-scrubbed product story.
   A procedural city drawn on <canvas>. Scroll progress drives the clock: vans move along
   street-routed paths, an urgent job drops in at 09:42 and the day's plan rebuilds itself.
   Webflow: a 520vh section with a sticky 100vh child; this file runs as a custom-code embed. */
(function () {
  'use strict';
  var SL = window.SL; if (!SL) return;
  var sec = document.querySelector('[data-story]'); if (!sec) return;
  var canvas = sec.querySelector('[data-story-canvas]');
  var ctx = canvas.getContext('2d');
  var chapters = Array.prototype.slice.call(sec.querySelectorAll('[data-chapter]'));
  var elClock = sec.querySelector('[data-story-clock]'), elDone = sec.querySelector('[data-story-done]');
  var elTexts = sec.querySelector('[data-story-texts]'), elBar = sec.querySelector('[data-story-bar]');
  var elStrip = sec.querySelector('[data-story-strip]'), elStripState = sec.querySelector('[data-story-strip-state]');
  var clamp = SL.clamp, lerp = SL.lerp, ease = SL.ease;

  /* ---------- city ---------- */
  var COLS = 22, ROWS = 14, S = 72, W = (COLS - 1) * S, H = (ROWS - 1) * S;
  var BRIDGES = { 3: 1, 8: 1, 13: 1, 18: 1 };
  var RIVER_ROW = 8; // river runs between row 8 and row 9
  var MAIN_R = { 3: 1, 7: 1, 11: 1 }, MAIN_C = { 4: 1, 10: 1, 16: 1 };
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function riverY(x) { return (RIVER_ROW + .5) * S + Math.sin(x / 170) * 12 + Math.sin(x / 61) * 4; }

  /* router: Dijkstra on the street grid with a turn penalty, bridges only */
  function blocked(c1, r1, c2, r2) {
    if (c1 === c2 && Math.min(r1, r2) === RIVER_ROW && Math.max(r1, r2) === RIVER_ROW + 1) return !BRIDGES[c1];
    return false;
  }
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function route(a, b) {
    var N = COLS * ROWS * 4, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    var start = (a[1] * COLS + a[0]) * 4;
    for (var d = 0; d < 4; d++) dist[start + d] = 0;
    for (;;) {
      var best = -1, bv = Infinity;
      for (var i = 0; i < N; i++) if (!done[i] && dist[i] < bv) { bv = dist[i]; best = i; }
      if (best < 0) break;
      done[best] = 1;
      var node = best >> 2, dir = best & 3, c = node % COLS, r = (node / COLS) | 0;
      if (c === b[0] && r === b[1]) {
        var pts = [], k = best;
        while (k >= 0) { var nn = k >> 2; pts.unshift([(nn % COLS) * S, ((nn / COLS) | 0) * S]); k = prev[k]; }
        // collapse duplicates (same node, different dir)
        return pts.filter(function (p, i) { return i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]; });
      }
      for (var nd = 0; nd < 4; nd++) {
        var c2 = c + DIRS[nd][0], r2 = r + DIRS[nd][1];
        if (c2 < 0 || r2 < 0 || c2 >= COLS || r2 >= ROWS || blocked(c, r, c2, r2)) continue;
        var cost = bv + 1 + (nd !== dir && node * 4 + dir !== start + dir ? .6 : 0) - ((MAIN_R[r] && r === r2) || (MAIN_C[c] && c === c2) ? .25 : 0);
        var id = (r2 * COLS + c2) * 4 + nd;
        if (cost < dist[id]) { dist[id] = cost; prev[id] = best; }
      }
    }
    return [[a[0] * S, a[1] * S], [b[0] * S, b[1] * S]];
  }

  /* ---------- the day (plan A = 07:00 plan, plan B = after the urgent job) ---------- */
  var DEPOT = [10, 10];
  var COLORS = ['#2BE3C4', '#7FA8FF', '#C49BFF', '#F3C869'];
  var NAMES = ['V1 ANA', 'V2 DESHAWN', 'V3 PRIYA', 'V4 TOMÁS'];
  var STOPS = {
    a1: [6, 5, 'Larch Rd'], urg: [12, 6, 'Quay St'], a2: [16, 3, 'Oakfield School'], a3: [19, 5, 'Mill Lane'], a4: [14, 9, 'Pine Ct'],
    d1: [4, 11, 'Birch Ave'], d2: [8, 12, 'Dock Rd'], d3: [2, 7, 'Hale St'],
    p1: [7, 2, 'Fern Close'], p2: [3, 3, 'Crane St'], p3: [9, 4, 'Ashby Rd'], p4: [13, 1, 'Pell Ct'],
    t1: [17, 11, 'Harbor Clinic'], t2: [20, 7, 'Wren Way'], t3: [15, 12, 'Kiln Studios']
  };
  var PLAN_A = [
    [['a1', 7.5, 9.75], ['a2', 10.1, 11.6], ['a3', 13.0, 13.75], ['a4', 14.5, 15.5]],
    [['d1', 8.0, 10.0], ['d2', 10.5, 11.75], ['d3', 12.75, 15.25]],
    [['p1', 7.25, 8.25], ['p2', 9.0, 10.25], ['p3', 11.0, 14.0], ['p4', 14.75, 15.5]],
    [['t1', 8.0, 9.5], ['t2', 10.0, 12.5], ['t3', 14.0, 15.0]]
  ];
  var PLAN_B = [
    [['a1', 7.5, 9.75], ['urg', 10.1, 11.3], ['a2', 11.6, 13.1], ['a4', 13.6, 14.6]],
    PLAN_A[1], PLAN_A[2],
    [['t1', 8.0, 9.5], ['t2', 10.0, 12.5], ['a3', 13.0, 13.75], ['t3', 14.2, 15.2]]
  ];
  var SPEED = 1 / 0.05; // grid units per hour

  function buildItin(plan) {
    return plan.map(function (jobs) {
      var legs = [], prevStop = DEPOT, prevEnd = 7.0;
      jobs.concat([['home', 16.0, 16.0]]).forEach(function (j) {
        var st = j[0] === 'home' ? DEPOT : STOPS[j[0]];
        var pts = route(prevStop, st);
        var len = 0; for (var i = 1; i < pts.length; i++) len += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
        var travel = len / S / SPEED;
        var dep = j[0] === 'home' ? prevEnd : Math.max(prevEnd, j[1] - travel - .05);
        legs.push({ id: j[0], pts: pts, len: len, dep: dep, arr: dep + travel, start: j[1], end: j[2] });
        prevStop = st; prevEnd = j[2];
      });
      var all = [], cum = 0;
      legs.forEach(function (l) { l.cum0 = cum; cum += l.len; l.pts.forEach(function (p, i) { if (all.length && i === 0) return; all.push(p); }); });
      return { legs: legs, pts: all, len: cum };
    });
  }
  var IA = buildItin(PLAN_A), IB = buildItin(PLAN_B);

  function vanAt(it, T) { // returns {d: distance travelled along it.pts}
    var d = 0;
    for (var i = 0; i < it.legs.length; i++) {
      var l = it.legs[i];
      if (T < l.dep) { d = l.cum0; break; }
      if (T < l.arr) { d = l.cum0 + l.len * ease.inOut((T - l.dep) / Math.max(1e-4, l.arr - l.dep)); break; }
      d = l.cum0 + l.len;
    }
    return d;
  }
  function pointAt(pts, d) {
    var acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], seg = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      if (acc + seg >= d) { var u = seg ? (d - acc) / seg : 0; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), Math.atan2(b[1] - a[1], b[0] - a[0])]; }
      acc += seg;
    }
    var l = pts[pts.length - 1]; return [l[0], l[1], 0];
  }
  function strokeTo(pts, d0, d1) { // path between distances d0..d1
    var acc = 0, started = false;
    ctx.beginPath();
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], seg = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      var s0 = acc, s1 = acc + seg; acc = s1;
      if (s1 < d0) continue; if (s0 > d1) break;
      var u0 = seg ? clamp((d0 - s0) / seg, 0, 1) : 0, u1 = seg ? clamp((d1 - s0) / seg, 0, 1) : 1;
      var x0 = lerp(a[0], b[0], u0), y0 = lerp(a[1], b[1], u0), x1 = lerp(a[0], b[0], u1), y1 = lerp(a[1], b[1], u1);
      if (!started) { ctx.moveTo(x0, y0); started = true; }
      ctx.lineTo(x1, y1);
    }
  }
  // divergence distance for routes that change between plan A and B
  function divergence(a, b) {
    var n = Math.min(a.pts.length, b.pts.length), d = 0;
    for (var i = 1; i < n; i++) {
      if (a.pts[i][0] !== b.pts[i][0] || a.pts[i][1] !== b.pts[i][1]) return d;
      d += Math.abs(a.pts[i][0] - a.pts[i - 1][0]) + Math.abs(a.pts[i][1] - a.pts[i - 1][1]);
    }
    return d;
  }
  var DIV = IA.map(function (a, i) { return JSON.stringify(a.pts) === JSON.stringify(IB[i].pts) ? -1 : divergence(a, IB[i]); });

  /* ---------- static layer ---------- */
  var stat = document.createElement('canvas'), sctx = stat.getContext('2d'), statScale = 1;
  function drawStatic(scale) {
    statScale = scale;
    stat.width = Math.ceil(W * scale + 2 * S * scale); stat.height = Math.ceil(H * scale + 2 * S * scale);
    var c = sctx; c.setTransform(scale, 0, 0, scale, S * scale, S * scale);
    c.fillStyle = '#070C16'; c.fillRect(-S, -S, W + 2 * S, H + 2 * S);
    var R = rnd(7);
    // blocks
    for (var cc = -1; cc < COLS; cc++) for (var rr = -1; rr < ROWS; rr++) {
      var x = cc * S, y = rr * S, park = cc >= 13 && cc <= 14 && rr >= 2 && rr <= 3, inset = 9;
      if (rr === RIVER_ROW) continue;
      c.fillStyle = park ? 'rgba(43,227,196,.07)' : 'rgba(22,32,50,' + (0.55 + R() * 0.35).toFixed(2) + ')';
      roundRect(c, x + inset, y + inset, S - inset * 2, S - inset * 2, 5); c.fill();
      if (park) {
        c.fillStyle = 'rgba(43,227,196,.18)';
        for (var k = 0; k < 7; k++) { c.beginPath(); c.arc(x + 16 + R() * (S - 32), y + 16 + R() * (S - 32), 2 + R() * 2.5, 0, 6.3); c.fill(); }
      } else {
        c.fillStyle = 'rgba(40,56,84,.35)';
        var nb = 1 + (R() * 3) | 0;
        for (var b = 0; b < nb; b++) { var bw = 10 + R() * 20, bh = 8 + R() * 18; c.fillRect(x + inset + 4 + R() * (S - inset * 2 - bw - 8), y + inset + 4 + R() * (S - inset * 2 - bh - 8), bw, bh); }
      }
    }
    // river
    c.beginPath();
    for (var xx = -S; xx <= W + S; xx += 8) { var yy = riverY(xx) - 20; xx === -S ? c.moveTo(xx, yy) : c.lineTo(xx, yy); }
    for (xx = W + S; xx >= -S; xx -= 8) c.lineTo(xx, riverY(xx) + 20);
    c.closePath(); c.fillStyle = '#082029'; c.fill();
    c.strokeStyle = 'rgba(43,227,196,.22)'; c.lineWidth = 1.2;
    [-20, 20].forEach(function (o) { c.beginPath(); for (var x2 = -S; x2 <= W + S; x2 += 8) { var y2 = riverY(x2) + o; x2 === -S ? c.moveTo(x2, y2) : c.lineTo(x2, y2); } c.stroke(); });
    c.setLineDash([2, 10]); c.strokeStyle = 'rgba(43,227,196,.18)';
    c.beginPath(); for (var x3 = -S; x3 <= W + S; x3 += 8) { var y3 = riverY(x3); x3 === -S ? c.moveTo(x3, y3) : c.lineTo(x3, y3); } c.stroke(); c.setLineDash([]);
    // streets
    for (var r2 = 0; r2 < ROWS; r2++) { c.strokeStyle = MAIN_R[r2] ? '#22324E' : '#141F33'; c.lineWidth = MAIN_R[r2] ? 4 : 2; c.beginPath(); c.moveTo(-S, r2 * S); c.lineTo(W + S, r2 * S); c.stroke(); }
    for (var c2 = 0; c2 < COLS; c2++) {
      c.strokeStyle = MAIN_C[c2] ? '#22324E' : '#141F33'; c.lineWidth = MAIN_C[c2] ? 4 : 2;
      c.beginPath(); c.moveTo(c2 * S, -S);
      if (BRIDGES[c2]) c.lineTo(c2 * S, H + S); else { c.lineTo(c2 * S, RIVER_ROW * S + 6); c.moveTo(c2 * S, (RIVER_ROW + 1) * S - 6); c.lineTo(c2 * S, H + S); }
      c.stroke();
      if (BRIDGES[c2]) { c.strokeStyle = 'rgba(233,238,246,.25)'; c.lineWidth = 1; c.strokeRect(c2 * S - 7, RIVER_ROW * S + 10, 14, S - 20); }
    }
    // labels
    c.font = '500 11px "Geist Mono", monospace'; c.fillStyle = 'rgba(147,160,181,.55)';
    [['HARBOR', 17.2, 10.45], ['OAKFIELD', 15.2, 2.45], ['DOCK RD', 7.2, 12.45], ['KILN QUARTER', 14.2, 12.55], ['MILL END', 18.2, 4.45], ['ASHBY', 8.2, 3.45], ['FERN HILL', 2.2, 2.45], ['RIVER WELL', 1.2, 8.6]].forEach(function (l) { c.fillText(l[0], l[1] * S, l[2] * S); });
    // edge coordinates
    c.font = '400 9px "Geist Mono", monospace'; c.fillStyle = 'rgba(94,107,128,.7)';
    for (var i = 0; i < COLS; i++) c.fillText(String.fromCharCode(65 + i), i * S - 3, -S * .45);
    for (var j = 0; j < ROWS; j++) c.fillText(String(j + 1).padStart(2, '0'), -S * .7, j * S + 3);
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  /* ---------- sizing ---------- */
  var vw = 0, vh = 0, dpr = 1, base = 1, desktop = true;
  function resize() {
    var r = canvas.getBoundingClientRect(); vw = r.width; vh = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    desktop = vw > 991;
    base = Math.max(vw / (W + S), vh / (H + S)) * (desktop ? 1.02 : 1.0);
    if (!desktop) base = Math.max(vh / (H + S) * 1.05, vw / (W * .62));
    var sc = Math.min(base * 1.5 * dpr, 3600 / (W + 2 * S));
    drawStatic(sc);
    buildStrip();
    dirty = true;
    if (SL.reduced) draw(.69, 0);
  }

  /* ---------- progress → time ---------- */
  function timeAt(p) {
    if (p < .10) return lerp(7.0, 7.3, p / .10);
    if (p < .36) return lerp(7.3, 9.69, ease.inOut((p - .10) / .26));
    if (p < .50) return lerp(9.69, 9.70, (p - .36) / .14);
    if (p < .70) return lerp(9.70, 9.7009, (p - .50) / .20);
    return lerp(9.7009, 16.5, ease.inOut((p - .70) / .30));
  }
  function fmt(T, secs) {
    var h = Math.floor(T), mf = (T - h) * 60, m = Math.floor(mf), s = Math.floor((mf - m) * 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + (secs ? ':' + (s < 10 ? '0' : '') + s : '');
  }
  function K(p, keys) {
    if (p <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) if (p <= keys[i][0]) { var a = keys[i - 1], b = keys[i]; return lerp(a[1], b[1], ease.inOut((p - a[0]) / (b[0] - a[0]))); }
    return keys[keys.length - 1][1];
  }

  /* ---------- schedule strip ---------- */
  var stripBlocks = [], stripNow, rowEls = [];
  function buildStrip() {
    if (!elStrip) return;
    elStrip.innerHTML = ''; stripBlocks = []; rowEls = [];
    var rh = elStrip.clientHeight / 4;
    for (var v = 0; v < 4; v++) {
      var row = document.createElement('div'); row.className = 'strip_row'; row.style.top = (v * rh) + 'px';
      row.innerHTML = '<span class="strip_label">' + NAMES[v].split(' ')[0] + '</span>';
      elStrip.appendChild(row); rowEls.push(row);
    }
    var ids = {};
    PLAN_A.forEach(function (jobs, v) { jobs.forEach(function (j) { ids[j[0]] = ids[j[0]] || {}; ids[j[0]].a = [v, j[1], j[2]]; }); });
    PLAN_B.forEach(function (jobs, v) { jobs.forEach(function (j) { ids[j[0]] = ids[j[0]] || {}; ids[j[0]].b = [v, j[1], j[2]]; }); });
    var n = 0;
    Object.keys(ids).forEach(function (id) {
      var d = ids[id], b = document.createElement('div');
      var v = (d.a || d.b)[0];
      b.className = 'strip_block' + (id === 'urg' ? ' is-urgent' : '');
      b.style.setProperty('--c', id === 'urg' ? '#FF6A1F' : COLORS[v]);
      b.textContent = id === 'urg' ? 'URGENT' : STOPS[id][2];
      elStrip.appendChild(b);
      var changed = !d.a || !d.b || d.a[0] !== d.b[0] || d.a[1] !== d.b[1];
      stripBlocks.push({ el: b, a: d.a, b: d.b, id: id, k: changed ? n++ : -1 });
    });
    stripNow = document.createElement('div'); stripNow.className = 'strip_now'; elStrip.appendChild(stripNow);
  }
  function renderStrip(T, rb) {
    if (!elStrip || !rowEls.length) return;
    var w = elStrip.clientWidth, left = rowEls[0].offsetLeft, tw = w - left, rh = elStrip.clientHeight / 4;
    function X(h) { return left + (h - 7) / 10 * tw; }
    stripBlocks.forEach(function (s) {
      var u = s.k < 0 ? 0 : clamp(rb * 1.6 - s.k * .14, 0, 1), e = ease.inOut(u);
      var A = s.a || s.b, B = s.b || s.a;
      var row = lerp(A[0], B[0], e), st = lerp(A[1], B[1], e), en = lerp(A[2], B[2], e);
      var op = !s.a ? e : !s.b ? 1 - e : 1;
      var lift = s.k >= 0 ? Math.sin(u * Math.PI) * -6 : 0;
      s.el.style.transform = 'translate3d(' + X(st).toFixed(1) + 'px,' + (row * rh + lift).toFixed(1) + 'px,0) scale(' + (!s.a ? (.6 + .4 * e) : 1) + ')';
      s.el.style.width = Math.max(4, X(en) - X(st) - 2).toFixed(1) + 'px';
      s.el.style.opacity = op.toFixed(2);
      var done = T > en;
      if (done !== s.done) { s.done = done; s.el.classList.toggle('is-done', done); }
    });
    stripNow.style.transform = 'translate3d(' + X(T).toFixed(1) + 'px,0,0)';
    var st = rb <= 0 ? 'PLAN A · 07:00' : rb < 1 ? 'REBUILDING…' : 'PLAN B · 5 TEXTS SENT';
    if (elStripState.__s !== st) { elStripState.__s = st; elStripState.textContent = st; elStripState.classList.toggle('is-b', rb >= 1); }
  }

  /* ---------- frame ---------- */
  var dirty = true, lastP = -1, visible = false;
  function draw(p, now) {
    var T = timeAt(p);
    var rb = clamp((p - .52) / .16, 0, 1);
    // camera
    var urg = [STOPS.urg[0] * S, STOPS.urg[1] * S];
    var z = K(p, [[0, 1.1], [.12, 1], [.36, 1], [.47, 1.2], [.66, 1.2], [.8, 1.0], [1, 1.0]]);
    var f = K(p, [[0, 0], [.36, 0], [.47, 1], [.66, 1], [.8, 0], [1, 0]]);
    var cxw = lerp(W / 2 + S * .5, urg[0], f), cyw = lerp(H / 2, urg[1], f);
    var sc = base * z * dpr;
    var ox = (desktop ? vw * lerp(.60, .71, f) : vw * .5) * dpr, oy = (desktop ? vh * .5 : vh * .36) * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#060A12'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    function tx(x) { return ox + (x - cxw) * sc; } function ty(y) { return oy + (y - cyw) * sc; }
    ctx.setTransform(sc / statScale, 0, 0, sc / statScale, tx(-S), ty(-S));
    ctx.drawImage(stat, 0, 0);
    ctx.setTransform(sc, 0, 0, sc, tx(0), ty(0));
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // radar sweep from the depot at the start of the day
    var dx = DEPOT[0] * S, dy = DEPOT[1] * S;
    var radarA = 1 - clamp((p - .06) / .08, 0, 1);
    if (radarA > 0) {
      var ang = now / 900;
      var g = ctx.createConicGradient ? ctx.createConicGradient(ang, dx, dy) : null;
      if (g) { g.addColorStop(0, 'rgba(43,227,196,.28)'); g.addColorStop(.12, 'rgba(43,227,196,0)'); g.addColorStop(1, 'rgba(43,227,196,0)'); ctx.fillStyle = g; ctx.globalAlpha = radarA; ctx.beginPath(); ctx.arc(dx, dy, S * 5.5, 0, 6.29); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = 'rgba(43,227,196,' + (.25 * radarA) + ')'; ctx.lineWidth = 1 / z;
      [2, 3.5, 5].forEach(function (r) { ctx.beginPath(); ctx.arc(dx, dy, S * r, 0, 6.29); ctx.stroke(); });
    }

    // routes
    var texts = 0, done = 0;
    for (var v = 0; v < 4; v++) {
      var A = IA[v], B = IB[v], col = COLORS[v];
      var reveal = clamp((p - .015 - v * .018) / .12, 0, 1);
      var dist = vanAt(B, T);
      var changed = DIV[v] >= 0;
      // planned route (dashed)
      ctx.setLineDash([7, 7]); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.globalAlpha = .32;
      if (changed) {
        var div = DIV[v];
        strokeTo(A.pts, dist, Math.min(div, A.len * reveal)); ctx.stroke();
        if (rb < 1) { ctx.globalAlpha = .4 * (1 - rb); ctx.strokeStyle = rb > 0 ? '#FF6A1F' : col; strokeTo(A.pts, Math.max(dist, div), A.len * reveal); ctx.stroke(); }
        if (rb > 0) { ctx.globalAlpha = .55; ctx.strokeStyle = col; ctx.setLineDash([]); ctx.lineWidth = 2.5; strokeTo(B.pts, Math.max(dist, div), lerp(div, B.len, ease.inOut(rb))); ctx.stroke(); }
      } else { strokeTo(B.pts, dist, B.len * reveal); ctx.stroke(); }
      ctx.setLineDash([]);
      // travelled (glow + core)
      if (dist > 0) {
        ctx.globalAlpha = .12; ctx.lineWidth = 12; strokeTo(B.pts, 0, dist); ctx.strokeStyle = col; ctx.stroke();
        ctx.globalAlpha = .95; ctx.lineWidth = 3; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // stops
      var it = rb > .5 ? B : A;
      it.legs.forEach(function (l) {
        if (l.id === 'home') return;
        var st = STOPS[l.id], x = st[0] * S, y = st[1] * S, isDone = T > l.end, onSite = T >= l.arr && T <= l.end;
        if (l.id === 'urg' && rb <= 0) return;
        if (isDone) done++;
        if (T >= l.dep) texts++;
        ctx.globalAlpha = reveal;
        ctx.fillStyle = isDone ? col : '#0A0F1A'; ctx.strokeStyle = l.id === 'urg' ? '#FF6A1F' : col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(x - 6, y - 6, 12, 12); ctx.fill(); ctx.stroke();
        if (onSite) { var pr = (now / 1400) % 1; ctx.globalAlpha = (1 - pr) * .8; ctx.beginPath(); ctx.arc(x, y, 10 + pr * 26, 0, 6.29); ctx.stroke(); }
        ctx.globalAlpha = 1;
      });
    }
    // depot
    ctx.fillStyle = '#E9EEF6'; ctx.beginPath(); ctx.rect(dx - 8, dy - 8, 16, 16); ctx.fill();
    ctx.fillStyle = '#060A12'; ctx.beginPath(); ctx.rect(dx - 4, dy - 4, 8, 8); ctx.fill();

    // urgent job
    var ua = clamp((p - .36) / .03, 0, 1) * (1 - clamp((p - .8) / .05, 0, 1));
    if (ua > 0) {
      var ux = urg[0], uy = urg[1];
      for (var k = 0; k < 3; k++) {
        var ph = ((now / 1600) + k / 3) % 1;
        ctx.strokeStyle = 'rgba(255,106,31,' + ((1 - ph) * .8 * ua) + ')'; ctx.lineWidth = 2 / z;
        ctx.beginPath(); ctx.arc(ux, uy, 12 + ph * S * 1.6, 0, 6.29); ctx.stroke();
      }
      ctx.fillStyle = '#FF6A1F'; ctx.globalAlpha = ua; ctx.beginPath(); ctx.arc(ux, uy, 8, 0, 6.29); ctx.fill(); ctx.globalAlpha = 1;
      // candidate scan lines from urgent job to every van
      var ca = clamp((p - .44) / .04, 0, 1) * (1 - clamp((p - .62) / .06, 0, 1));
      if (ca > 0) {
        for (var c = 0; c < 4; c++) {
          var vp = pointAt(IB[c].pts, vanAt(IB[c], T));
          var ok = c === 0, grow = clamp((p - .44 - c * .012) / .05, 0, 1);
          ctx.setLineDash(ok ? [] : [5, 6]); ctx.lineWidth = (ok ? 2.5 : 1.5) / z * 1.2;
          ctx.strokeStyle = ok ? 'rgba(43,227,196,' + ca + ')' : 'rgba(255,106,31,' + (ca * .7) + ')';
          ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(lerp(ux, vp[0], grow), lerp(uy, vp[1], grow)); ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }

    // vans + labels in screen space for crisp text
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = '500 ' + (11 * dpr) + 'px "Geist Mono", monospace';
    for (var q = 0; q < 4; q++) {
      var pos = pointAt(IB[q].pts, vanAt(IB[q], T)), sx = tx(pos[0]), sy = ty(pos[1]), colq = COLORS[q];
      var a = clamp((p - .02 - q * .018) / .06, 0, 1);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = colq; ctx.globalAlpha = .18 * a; ctx.beginPath(); ctx.arc(sx, sy, 16 * dpr, 0, 6.29); ctx.fill();
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(sx, sy, 7 * dpr, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#060A12'; ctx.beginPath(); ctx.arc(sx, sy, 3 * dpr, 0, 6.29); ctx.fill();
      var label = NAMES[q], lw = ctx.measureText(label).width + 12 * dpr, lx = sx + 14 * dpr, ly = sy - 26 * dpr;
      ctx.fillStyle = 'rgba(6,10,18,.88)'; ctx.fillRect(lx, ly, lw, 18 * dpr);
      ctx.strokeStyle = colq; ctx.lineWidth = 1 * dpr; ctx.strokeRect(lx + .5, ly + .5, lw - 1, 18 * dpr - 1);
      ctx.fillStyle = colq; ctx.fillText(label, lx + 6 * dpr, ly + 13 * dpr);
    }
    ctx.globalAlpha = 1;
    if (ua > 0) {
      var ul = 'URGENT · NO HEAT · 88 QUAY ST', usx = tx(urg[0]), usy = ty(urg[1]);
      var w2 = ctx.measureText(ul).width + 16 * dpr;
      ctx.globalAlpha = ua;
      ctx.fillStyle = '#FF6A1F'; ctx.fillRect(usx - w2 / 2, usy + 22 * dpr, w2, 22 * dpr);
      ctx.fillStyle = '#160803'; ctx.fillText(ul, usx - w2 / 2 + 8 * dpr, usy + 37 * dpr);
      var cand = clamp((p - .46) / .04, 0, 1) * (1 - clamp((p - .62) / .06, 0, 1));
      if (cand > 0) {
        ctx.globalAlpha = cand;
        var tags = ['✓ GAS-SAFE · 11 MIN', '✗ NO GAS-SAFE', '✗ NO GAS-SAFE', '✗ ON INSTALL'];
        for (var c3 = 0; c3 < 4; c3++) {
          var vp3 = pointAt(IB[c3].pts, vanAt(IB[c3], T)), qx = tx(vp3[0]), qy = ty(vp3[1]) + 14 * dpr;
          var tw3 = ctx.measureText(tags[c3]).width + 12 * dpr;
          ctx.fillStyle = c3 === 0 ? '#2BE3C4' : 'rgba(255,106,31,.92)'; ctx.fillRect(qx + 12 * dpr, qy, tw3, 18 * dpr);
          ctx.fillStyle = '#0A0F1A'; ctx.fillText(tags[c3], qx + 18 * dpr, qy + 13 * dpr);
        }
      }
      ctx.globalAlpha = 1;
    }

    // HUD + chapters
    elClock.textContent = fmt(T, p > .36 && p < .72);
    elClock.style.color = p > .36 && p < .52 ? 'var(--c-signal)' : p >= .52 && p < .72 ? 'var(--c-teal)' : '';
    elDone.textContent = Math.round(done / 15 * 23) + '/23';
    elTexts.textContent = String(texts + (rb >= 1 ? 5 : Math.round(rb * 5)));
    if (elBar) elBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    var ranges = [[0, .12], [.12, .36], [.36, .52], [.52, .78], [.78, 1.01]];
    chapters.forEach(function (ch, i) {
      var r = ranges[i], fi = .035;
      var o = i === 0 ? 1 - clamp((p - r[1] + fi) / fi, 0, 1) : clamp((p - r[0]) / fi, 0, 1) * (1 - clamp((p - r[1] + fi) / fi, 0, 1));
      if (i === 4) o = clamp((p - r[0]) / fi, 0, 1);
      var y = i === 0 ? -(1 - o) * 24 : (1 - o) * (p < r[0] + fi ? 30 : -24);
      ch.style.opacity = o.toFixed(3); ch.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      ch.style.visibility = o < .01 ? 'hidden' : 'visible';
    });
    renderStrip(T, rb);
  }

  function progress() {
    var r = sec.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
  }
  resize();
  window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); });
  SL.whenInView(sec, function (v) { visible = v; }, { margin: '200px 0px 200px 0px' });
  if (SL.reduced) return;
  SL.onFrame(function (now) {
    if (!visible) return;
    draw(progress(), now);
  });
})();
