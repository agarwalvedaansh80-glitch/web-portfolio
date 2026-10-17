/* Slotted v2 — hero live dispatch board.
   Reads job blocks from the HTML (data-lane / data-start / data-dur / data-drive / data-stop)
   and plays a deterministic 20 s scenario: urgent job slots in, drive buffers stretch,
   an overrun fires a "running late" alert, then the board resolves it by itself.
   Webflow: build the board from divs, then add this file as a custom-code embed. */
(function () {
  'use strict';
  var SL = window.SL; if (!SL) return;
  var board = document.querySelector('[data-board]'); if (!board) return;
  var main = board.querySelector('[data-board-main]');
  var layer = board.querySelector('[data-board-layer]');
  var lanes = Array.prototype.slice.call(board.querySelectorAll('.board_lane'));
  var tracks = lanes.map(function (l) { return l.querySelector('[data-track]'); });
  var ruler = board.querySelector('[data-board-ruler]');
  var incTrack = board.querySelector('[data-board-incoming-track]');
  var nowEl = board.querySelector('[data-board-now]');
  var nowLabel = board.querySelector('[data-board-now-label]');
  var scan = board.querySelector('[data-board-scan]');
  var toast = board.querySelector('[data-board-toast]');
  var toastTag = toast.querySelector('[data-toast-tag]');
  var toastText = toast.querySelector('[data-toast-text]');
  var tip = board.querySelector('[data-board-tip]');
  var svg = board.querySelector('[data-board-svg]');
  var mapLabel = board.querySelector('[data-board-map-label]');
  var statJobs = board.querySelector('[data-board-jobs]');
  var statHeld = board.querySelector('[data-board-held]');
  var statInc = board.querySelector('[data-board-incoming]');
  var clamp = SL.clamp, lerp = SL.lerp;
  var H0 = 7, H1 = 17, P = 20;
  var techNames = ['Ana Ruiz', 'Deshawn Cole', 'Priya Nair', 'Tomás Weber'];
  var laneColors = ['#2BE3C4', '#7FA8FF', '#C49BFF', '#F3C869'];
  var typeColor = { maint: '#2BE3C4', repair: '#7FA8FF', install: '#C49BFF', urgent: '#FF6A1F' };

  // ---------- ruler ----------
  var rh = '';
  for (var h = H0; h <= H1; h++) rh += '<span style="left:' + ((h - H0) / (H1 - H0) * 100) + '%">' + (h < 10 ? '0' : '') + h + ':00</span>';
  ruler.innerHTML = rh;

  // ---------- jobs ----------
  var jobs = Array.prototype.slice.call(layer.querySelectorAll('.board_job')).map(function (el) {
    var st = el.dataset.stop.split(',').map(Number);
    var type = (el.className.match(/is-(maint|repair|install|urgent)/) || [0, 'maint'])[1];
    var drive = document.createElement('div'); drive.className = 'board_drive'; drive.style.setProperty('--c', laneColors[+el.dataset.lane]);
    layer.insertBefore(drive, layer.firstChild);
    var over = document.createElement('i'); over.className = 'board_job-over'; el.appendChild(over);
    el.setAttribute('aria-label', el.querySelector('.board_job-title').textContent + ', ' + el.querySelector('.board_job-meta').textContent + ', window ' + el.dataset.window);
    el.setAttribute('data-cursor-label', 'INSPECT');
    return {
      el: el, id: el.dataset.job, driveEl: drive, overEl: over, type: type,
      lane0: +el.dataset.lane, start0: +el.dataset.start, dur0: +el.dataset.dur, drive0: +el.dataset.drive,
      inc0: el.dataset.incoming != null ? 1 : 0, incSlot: el.dataset.incoming != null ? +el.dataset.incoming : -1,
      stop: st, window0: el.dataset.window, title: el.querySelector('.board_job-title').textContent, addr: el.querySelector('.board_job-meta').textContent,
      s: {}
    };
  });
  var byId = {}; jobs.forEach(function (j) { byId[j.id] = j; });

  // ---------- scenario keyframes [time, value] (eased between keys) ----------
  function K(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) { var a = keys[i - 1], b = keys[i]; var u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return lerp(a[1], b[1], SL.ease.inOut(u)); }
    }
    return keys[keys.length - 1][1];
  }
  var R0 = 18.65, R1 = 18.7; // reset instant (hidden by the scan wipe)
  var script = {
    n1: { inc: [[1.7, 1], [2.9, 0], [R0, 0], [R1, 1]] },
    n2: { inc: [[13.0, 1], [14.2, 0], [R0, 0], [R1, 1]] },
    p3: { drive: [[4.0, .3], [5.6, .95], [R0, .95], [R1, .3]] },
    t2: { drive: [[4.3, .3], [5.9, .75], [R0, .75], [R1, .3]] },
    d2: { over: [[7.0, 0], [8.6, .75], [R0, .75], [R1, 0]] },
    d3: { to: 3, move: [[10.2, 0], [11.4, 1], [R0, 1], [R1, 0]] }
  };
  var toasts = [
    [0, 'NEW JOB', 'No heat at 88 Quay St · needs GAS-SAFE', 'signal'],
    [1.6, 'MATCHED', 'Ana Ruiz is qualified and 11 min away · window 9:30–10:00 texted', 'teal'],
    [4.0, 'TRAFFIC', 'I-71 slow · two drive buffers stretched, windows still hold', ''],
    [7.5, 'RUNNING LATE', 'Deshawn +45 min at Dock Rd · Kitchen circuit misses 12:45–13:00', 'signal'],
    [10.0, 'RE-SLOTTING', 'Looking for a tech with ELEC and room after 13:00', ''],
    [11.2, 'RESOLVED', 'Kitchen circuit → Tomás Weber (ELEC L2) · new window 13:00–13:30 texted', 'teal'],
    [13.0, 'SLOTTED', 'Water heater leak → Priya Nair · window 14:30–15:00 texted', 'teal'],
    [15.8, 'ALL CLEAR', '14 jobs · 4 vans · every window held', 'teal'],
    [18.2, 'SYNC', 'Loading the next scenario', '']
  ];

  // ---------- geometry ----------
  var G = {};
  function measure() {
    var mr = main.getBoundingClientRect();
    var tr = tracks[0].getBoundingClientRect();
    G.x0 = tr.left - mr.left + 4; G.x1 = tr.right - mr.left - 4; G.w = G.x1 - G.x0;
    G.laneY = tracks.map(function (t) { var r = t.getBoundingClientRect(); return r.top - mr.top; });
    G.laneH = tr.height;
    G.jobH = Math.max(18, G.laneH - (G.laneH > 50 ? 22 : 12));
    var ir = incTrack.getBoundingClientRect();
    G.incY = ir.top - mr.top + (ir.height - G.jobH) / 2;
    G.incX = ir.left - mr.left + 8;
    G.incW = Math.min(170, G.w * 0.26);
    G.top = ruler.getBoundingClientRect().top - mr.top;
    layer.style.setProperty('--job-h', G.jobH + 'px');
    var sr = svg.getBoundingClientRect();
    G.mapK = sr.width ? sr.height / sr.width : 1;
    svg.setAttribute('viewBox', '0 0 100 ' + (100 * G.mapK).toFixed(2));
    buildMap();
    if (SL.reduced && jobs.length) { render(16.4, performance.now()); toast.style.opacity = '1'; toast.style.transform = 'none'; }
  }
  function hx(h) { return G.x0 + (h - H0) / (H1 - H0) * G.w; }

  // ---------- state at time t ----------
  function stateAt(t) {
    jobs.forEach(function (j) {
      var sc = script[j.id] || {};
      j.s.inc = sc.inc ? K(t, sc.inc) : j.inc0;
      j.s.drive = sc.drive ? K(t, sc.drive) : j.drive0;
      j.s.over = sc.over ? K(t, sc.over) : 0;
      j.s.from = j.lane0; j.s.to = sc.to != null ? sc.to : j.lane0;
      j.s.f = sc.move ? K(t, sc.move) : 0;
      j.s.dur = j.dur0 + j.s.over;
    });
    // weighted cascade per lane: start = max(planned, previous end + drive)
    for (var L = 0; L < 4; L++) {
      var list = jobs.filter(function (j) { return j.s.from === L || j.s.to === L; }).sort(function (a, b) { return a.start0 - b.start0; });
      var cursor = H0;
      list.forEach(function (j) {
        var w = j.s.from === j.s.to ? 1 : (j.s.from === L ? 1 - j.s.f : j.s.f);
        w *= (1 - j.s.inc);
        var st = Math.max(j.start0, cursor + j.s.drive);
        j.s['x' + L] = st;
        cursor = lerp(cursor, st + j.s.dur, w);
      });
    }
    jobs.forEach(function (j) {
      var e = SL.ease.inOut(j.s.f);
      j.s.start = lerp(j.s['x' + j.s.from], j.s['x' + j.s.to], e);
      j.s.y = lerp(G.laneY[j.s.from], G.laneY[j.s.to], e) + (G.laneH - G.jobH) / 2;
      j.s.res = j.s.inc < .5 ? (j.s.f < .5 ? j.s.from : j.s.to) : -1;
      j.s.moving = j.s.f > 0.001 && j.s.f < 0.999;
    });
  }

  // ---------- render ----------
  var lastToast = -1, toastAt = 0;
  function render(t, now) {
    stateAt(t);
    var late = false, landed = 0, inc = 0;
    jobs.forEach(function (j) {
      var s = j.s;
      var x = hx(s.start), w = Math.max(6, (s.dur) / (H1 - H0) * G.w), y = s.y;
      if (s.inc > 0) {
        var ix = G.incX + j.incSlot * (G.incW + 8), iy = G.incY, e = s.inc;
        var arc = Math.sin((1 - e) * Math.PI) * -18 * (e > 0 && e < 1 ? 1 : 0);
        x = lerp(x, ix, e); y = lerp(y, iy, e) + arc; w = lerp(w, G.incW, e);
      }
      if (s.inc < .5) landed += j.inc0; else inc++;
      j.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      j.el.style.width = w.toFixed(1) + 'px';
      j.overEl.style.width = s.over > 0.01 ? (s.over / s.dur * 100).toFixed(2) + '%' : '0';
      var isLate = j.id === 'd3' && s.f < .5 && s.start > 13.0 + 1e-3;
      if (isLate) late = true;
      if (isLate !== j.__late) { j.__late = isLate; j.el.classList.toggle('is-late', isLate); }
      // drive buffer (only while resident on a lane)
      var dw = s.drive / (H1 - H0) * G.w, dv = s.inc < .98 ? (1 - s.inc) : 0;
      j.driveEl.style.transform = 'translate3d(' + (hx(s.start) - dw).toFixed(1) + 'px,' + (s.y + (G.jobH - 17) / 2).toFixed(1) + 'px,0)';
      j.driveEl.style.width = Math.max(0, dw - 2).toFixed(1) + 'px';
      j.driveEl.style.opacity = (dv * (s.moving ? .15 : 1)).toFixed(2);
      var mins = Math.round(s.drive * 60) + 'm';
      if (j.__m !== mins) { j.__m = mins; j.driveEl.textContent = dw > 34 ? mins : ''; j.driveEl.classList.toggle('is-stretch', s.drive > j.drive0 + .05); }
    });
    lanes[1].classList.toggle('is-alert', late);
    if (statHeld && statHeld.__v !== late) { statHeld.__v = late; statHeld.textContent = late ? '93%' : '100%'; statHeld.style.color = late ? 'var(--c-signal)' : ''; }
    if (statJobs) { var n = 12 + landed; if (statJobs.__v !== n) { statJobs.__v = n; statJobs.textContent = n; } }
    if (statInc && statInc.__v !== inc) { statInc.__v = inc; statInc.textContent = inc; }
    // lane skill-match highlight while the urgent job is being matched
    var match = t > .7 && t < 3.4;
    lanes.forEach(function (l, i) { l.classList.toggle('is-match', match && i === 0); });
    var match2 = t > 10.2 && t < 11.8;
    if (match2) lanes[3].classList.add('is-match');
    // scan sweep
    var sp = -1;
    if (t > .5 && t < 1.7) sp = (t - .5) / 1.2;
    if (t > 18.0 && t < 19.3) sp = (t - 18.0) / 1.3;
    if (sp >= 0) { scan.style.opacity = Math.sin(sp * Math.PI).toFixed(2); scan.style.transform = 'translate3d(' + (G.x0 - 120 + sp * (G.w + 140)) + 'px,0,0)'; }
    else if (scan.style.opacity !== '0') scan.style.opacity = '0';
    layer.style.opacity = (t > 18.25 && t < 19.2) ? (t < R1 ? lerp(1, .05, clamp((t - 18.25) / .4, 0, 1)) : lerp(.05, 1, clamp((t - R1) / .5, 0, 1))).toFixed(2) : '1';
    // now line
    var nh = 9.4 + (t / P) * 0.8;
    nowEl.style.transform = 'translate3d(' + hx(nh).toFixed(1) + 'px,0,0)';
    var mm = Math.floor((nh % 1) * 60);
    nowLabel.textContent = Math.floor(nh) + ':' + (mm < 10 ? '0' : '') + mm;
    // toast
    var ti = 0; for (var i = 0; i < toasts.length; i++) if (t >= toasts[i][0]) ti = i;
    if (ti !== lastToast) {
      lastToast = ti; toastAt = now;
      toastTag.textContent = toasts[ti][1]; toastText.textContent = toasts[ti][2];
      toast.classList.toggle('is-signal', toasts[ti][3] === 'signal'); toast.classList.toggle('is-teal', toasts[ti][3] === 'teal');
    }
    var tp = SL.ease.expo(clamp((now - toastAt) / 550, 0, 1));
    toast.style.transform = 'translate3d(0,' + ((1 - tp) * 14).toFixed(1) + 'px,0)';
    toast.style.opacity = (0.2 + tp * 0.8).toFixed(2);
    renderMap(nh);
    if (focusJob) placeTip(focusJob);
  }

  // ---------- mini route map ----------
  var NS = 'http://www.w3.org/2000/svg';
  var routeEls = [], vanEls = [], stopEls = {}, legEl, depot = [50, 56];
  function el(name, attrs, parent) { var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function my(v) { return v * G.mapK; }
  function buildMap() {
    svg.innerHTML = '';
    var g = el('g', {}, svg), Hh = 100 * G.mapK;
    el('path', { class: 'map_river', d: 'M-5 ' + my(76) + ' C 25 ' + my(64) + ', 45 ' + my(98) + ', 105 ' + my(70) }, g);
    for (var x = 0; x <= 100; x += 10) el('line', { class: 'map_street' + (x % 30 === 20 ? ' is-main' : ''), x1: x, x2: x, y1: 0, y2: Hh }, g);
    for (var y = 0; y <= 100; y += 10) el('line', { class: 'map_street' + (y % 30 === 20 ? ' is-main' : ''), x1: 0, x2: 100, y1: my(y), y2: my(y) }, g);
    routeEls = []; vanEls = []; stopEls = {};
    for (var L = 0; L < 4; L++) routeEls.push(el('path', { class: 'map_route', stroke: laneColors[L], d: '' }, svg));
    legEl = el('path', { class: 'map_leg', d: '' }, svg);
    el('rect', { x: depot[0] - 2.2, y: my(depot[1]) - 2.2, width: 4.4, height: 4.4, fill: '#0A0F1A', stroke: '#E9EEF6', 'stroke-width': .6, rx: .6 }, svg);
    jobs.forEach(function (j) {
      var gg = el('g', { class: 'map_stop' }, svg);
      el('circle', { cx: j.stop[0], cy: my(j.stop[1]), r: 3.4, fill: typeColor[j.type], opacity: .18 }, gg);
      el('circle', { cx: j.stop[0], cy: my(j.stop[1]), r: 1.5, fill: typeColor[j.type] }, gg);
      stopEls[j.id] = gg;
    });
    for (var V = 0; V < 4; V++) {
      var vg = el('g', {}, svg);
      el('circle', { r: 3.2, fill: laneColors[V], opacity: .25 }, vg);
      el('circle', { r: 1.9, fill: '#0A0F1A', stroke: laneColors[V], 'stroke-width': 1 }, vg);
      vanEls.push(vg);
    }
    lastSig = '';
  }
  var lastSig = '', laneStops = [[], [], [], []];
  function lpath(a, b) { return ' H' + b[0].toFixed(1) + ' V' + my(b[1]).toFixed(1); }
  function renderMap(nowH) {
    var sig = '';
    for (var L = 0; L < 4; L++) {
      laneStops[L] = jobs.filter(function (j) { return j.s.res === L; }).sort(function (a, b) { return a.s.start - b.s.start; });
      sig += laneStops[L].map(function (j) { return j.id; }).join(',') + '|';
    }
    if (sig !== lastSig) {
      lastSig = sig;
      for (var M = 0; M < 4; M++) {
        var d = 'M' + depot[0] + ' ' + my(depot[1]), prev = depot;
        laneStops[M].forEach(function (j) { d += lpath(prev, j.stop); prev = j.stop; });
        routeEls[M].setAttribute('d', d);
        routeEls[M].__len = 0;
      }
      if (focusJob) focus(focusJob, true);
    }
    // vans
    for (var V = 0; V < 4; V++) {
      var list = laneStops[V], pos = depot.slice(), prevEnd = H0, prevStop = depot;
      for (var i = 0; i < list.length; i++) {
        var j = list[i], st = j.s.start, en = st + j.s.dur, ds = st - j.s.drive;
        if (nowH < ds) { pos = prevStop; break; }
        if (nowH < st) { var u = (nowH - ds) / Math.max(.01, j.s.drive); pos = alongL(prevStop, j.stop, SL.ease.inOut(u)); break; }
        if (nowH <= en) { pos = j.stop; break; }
        prevStop = j.stop; pos = j.stop;
      }
      vanEls[V].setAttribute('transform', 'translate(' + pos[0].toFixed(2) + ' ' + my(pos[1]).toFixed(2) + ')');
    }
  }
  function alongL(a, b, u) {
    var dx = b[0] - a[0], dy = b[1] - a[1], tot = Math.abs(dx) + Math.abs(dy) || 1, d = u * tot;
    if (d <= Math.abs(dx)) return [a[0] + Math.sign(dx) * d, a[1]];
    return [b[0], a[1] + Math.sign(dy) * (d - Math.abs(dx))];
  }

  // ---------- hover / focus ----------
  var focusJob = null, focusLane = -1;
  function focus(j, keep) {
    focusJob = j; board.classList.add('has-focus');
    jobs.forEach(function (o) { o.el.classList.toggle('is-focus', o === j); });
    var L = j.s.res >= 0 ? j.s.res : -1;
    routeEls.forEach(function (r, i) { r.classList.toggle('is-focus', i === L); });
    Object.keys(stopEls).forEach(function (k) { stopEls[k].classList.toggle('is-focus', k === j.id); });
    lanes.forEach(function (l, i) { l.classList.toggle('is-focus', i === L); });
    if (L >= 0) {
      var list = laneStops[L], idx = list.indexOf(j), prev = idx > 0 ? list[idx - 1].stop : depot;
      legEl.setAttribute('d', 'M' + prev[0] + ' ' + my(prev[1]) + lpath(prev, j.stop));
      legEl.setAttribute('stroke', typeColor[j.type]); legEl.classList.add('is-focus');
      mapLabel.textContent = techNames[L].toUpperCase().split(' ')[0] + ' → ' + j.addr.toUpperCase();
    } else { legEl.classList.remove('is-focus'); mapLabel.textContent = 'UNASSIGNED'; }
    if (!keep) { tip.innerHTML = tipHtml(j, L); tip.classList.add('is-on'); }
  }
  function tipHtml(j, L) {
    var st = j.s.start, en = st + j.s.dur;
    function fmt(h) { var m = Math.round((h % 1) * 60); if (m === 60) { h++; m = 0; } return Math.floor(h) + ':' + (m < 10 ? '0' : '') + m; }
    var skill = { a1: 'GAS-SAFE', a2: 'HVAC', a3: 'HVAC', d1: 'ELEC', d2: 'EV', d3: 'ELEC', p1: 'PLUMBING', p2: 'PLUMBING', p3: 'PLUMBING', t1: 'HVAC', t2: 'HEAT PUMP', t3: 'HVAC', n1: 'GAS-SAFE', n2: 'PLUMBING' }[j.id];
    return '<b>' + j.title + '</b><dl><dt>ADDRESS</dt><dd>' + j.addr + '</dd><dt>TECH</dt><dd>' + (L >= 0 ? techNames[L] : 'Unassigned') + '</dd><dt>ON SITE</dt><dd>' + fmt(st) + '–' + fmt(en) + '</dd><dt>DRIVE IN</dt><dd>' + Math.round(j.s.drive * 60) + ' min</dd><dt>SKILL</dt><dd class="is-ok">' + skill + ' ✓</dd></dl>';
  }
  function placeTip(j) {
    var br = board.getBoundingClientRect(), r = j.el.getBoundingClientRect();
    var x = clamp(r.left - br.left, 8, br.width - 248), y = r.bottom - br.top + 8;
    if (y + 150 > br.height) y = r.top - br.top - 150;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function blur() {
    focusJob = null; board.classList.remove('has-focus'); tip.classList.remove('is-on');
    jobs.forEach(function (o) { o.el.classList.remove('is-focus'); });
    routeEls.forEach(function (r) { r.classList.remove('is-focus'); });
    lanes.forEach(function (l) { l.classList.remove('is-focus'); });
    legEl.classList.remove('is-focus'); mapLabel.textContent = 'ALL VANS';
  }
  jobs.forEach(function (j) {
    j.el.addEventListener('pointerenter', function () { focus(j); });
    j.el.addEventListener('pointerleave', blur);
    j.el.addEventListener('focus', function () { focus(j); });
    j.el.addEventListener('blur', blur);
  });
  lanes.forEach(function (l, i) {
    var tech = l.querySelector('.board_tech');
    tech.addEventListener('pointerenter', function () {
      board.classList.add('has-focus');
      jobs.forEach(function (o) { o.el.classList.toggle('is-focus', o.s.res === i); });
      routeEls.forEach(function (r, k) { r.classList.toggle('is-focus', k === i); });
      lanes.forEach(function (o, k) { o.classList.toggle('is-focus', k === i); });
      mapLabel.textContent = techNames[i].toUpperCase();
    });
    tech.addEventListener('pointerleave', blur);
  });
  board.setAttribute('role', 'region');

  // ---------- run ----------
  measure();
  window.addEventListener('resize', function () { measure(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  var visible = true, start = performance.now();
  SL.whenInView(board, function (v) { visible = v; });
  if (SL.reduced) return;
  SL.onFrame(function (now) {
    if (!visible) return;
    var t = ((now - start) / 1000) % P;
    render(t, now);
  });
})();
