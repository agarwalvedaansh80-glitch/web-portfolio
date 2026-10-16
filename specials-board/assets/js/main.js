/* Specials Board: interactions.
   Everything here is progressive: the page reads and converts without it, and with
   prefers-reduced-motion the same features work without movement. */
(function () {
  'use strict';
  window.__sb = true;

  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var motion = root.classList.contains('motion') && !reduce && !!(gsap && ST);
  if (!motion) root.classList.remove('motion');
  if (gsap && ST) gsap.registerPlugin(ST);

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function onVisible(el, cb, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { io.disconnect(); cb(); } }, { rootMargin: margin || '300px 0px' });
    io.observe(el);
  }
  function fontsReady(max) {
    return Promise.race([
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
      new Promise(function (r) { setTimeout(r, max); })
    ]);
  }

  /* ---------------- smooth scroll ---------------- */
  var lenis = null;
  if (motion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]:not(.skip)').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var t = id.length > 1 && document.getElementById(id.slice(1));
        if (!t) return;
        e.preventDefault();
        lenis.scrollTo(t, { duration: 1.4 });
        if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
        t.focus({ preventScroll: true });
      });
    });
  }
  function scrollToY(y) { if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }

  /* ---------------- rolling cohort + honest countdown ----------------
     Starts the first Monday of a month, closes the Sunday before at 23:59. Never resets on reload. */
  (function cohort() {
    function firstMonday(year, month) { var d = new Date(year, month, 1); d.setDate(1 + (8 - d.getDay()) % 7); return d; }
    var now = new Date(), start, close;
    for (var k = 0; k < 3; k++) {
      start = firstMonday(now.getFullYear(), now.getMonth() + k);
      close = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 23, 59, 0);
      if (close > now) break;
    }
    var long = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    var short = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    $$('[data-cohort-start]').forEach(function (el) { el.textContent = long; });
    $$('[data-cohort-start-short]').forEach(function (el) { el.textContent = short; });
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function tick() {
      var ms = Math.max(0, close - new Date());
      var d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, mi = Math.floor(ms / 6e4) % 60;
      var label = d > 0 ? d + 'd ' + pad(h) + 'h ' + pad(mi) + 'm' : pad(h) + 'h ' + pad(mi) + 'm';
      $$('[data-countdown]').forEach(function (el) { el.textContent = label; });
    }
    tick(); setInterval(tick, 30000);
  })();

  /* ---------------- letterboard: split into plastic letters ---------------- */
  var seedN = 0;
  function splitLetters(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    var letters = [];
    function proc(n) {
      if (n.nodeType === 3) {
        var f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { f.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w';
          Array.from(part).forEach(function (ch) {
            var l = document.createElement('span'), lr = document.createElement('span');
            l.className = 'l'; lr.className = 'lr'; lr.textContent = ch;
            var s = Math.sin(++seedN * 12.9898) * 43758.5453, rnd = s - Math.floor(s);
            l.style.setProperty('--r', ((rnd - 0.5) * 2.4).toFixed(2) + 'deg');
            l.style.setProperty('--dy', ((rnd - 0.5) * 2).toFixed(1) + 'px');
            l.appendChild(lr); w.appendChild(l); letters.push(l);
          });
          f.appendChild(w);
        });
        return f;
      }
      if (n.nodeType === 1) {
        var c = n.cloneNode(false);
        Array.from(n.childNodes).forEach(function (k) { c.appendChild(proc(k)); });
        return c;
      }
      return n.cloneNode(true);
    }
    var frag = document.createDocumentFragment();
    Array.from(el.childNodes).forEach(function (n) { frag.appendChild(proc(n)); });
    var holder = document.createElement('span'); holder.setAttribute('aria-hidden', 'true'); holder.appendChild(frag);
    el.textContent = ''; el.appendChild(holder);
    el.classList.add('is-split');
    return letters;
  }

  /* letters lift and thicken (variable weight) as the pointer passes over the board */
  function letterProximity(zone, letters) {
    if (!fine || !motion || !letters.length) return;
    function lock() { // fix each letter's box so weight changes never reflow the line
      letters.forEach(function (l) { l.style.width = ''; });
      var ws = letters.map(function (l) { return l.firstChild.getBoundingClientRect().width; });
      letters.forEach(function (l, i) { l.style.width = ws[i] + 'px'; });
    }
    lock();
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(lock, 150); });
    letters.forEach(function (l) { l.style.transition = 'font-weight .35s ease, transform .35s ease, text-shadow .35s ease, color .35s ease'; });
    var px = -1e4, py = -1e4, raf = 0;
    function apply() {
      raf = 0;
      var rs = letters.map(function (l) { return l.getBoundingClientRect(); });
      rs.forEach(function (r, i) {
        var d = Math.hypot(px - (r.left + r.width / 2), (py - (r.top + r.height / 2)) * 1.25);
        var p = clamp(1 - d / 190, 0, 1); p = p * p * (3 - 2 * p);
        letters[i].style.setProperty('--p', p.toFixed(3));
      });
    }
    zone.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(apply); });
    zone.addEventListener('pointerleave', function () { px = py = -1e4; if (!raf) raf = requestAnimationFrame(apply); });
  }

  /* ---------------- hero: the self-filling feed ---------------- */
  var POSTS = [
    { art: 'croissant', bg: '#F5CF57', cap: 'Butter croissants out at 8. Two trays, usually gone by ten.', t: 'Tue 7:30' },
    { art: 'latte', bg: '#2443C4', cap: 'Flat white by the window. The morning light does the rest.', t: 'Tue 10:30' },
    { art: 'board', bg: '#27373C', cap: "Today's board. The cardamom bun is back.", t: 'Wed 7:45' },
    { art: 'bun', bg: '#EDC3BD', cap: 'Cardamom buns, twisted by hand at 6am.', t: 'Wed 14:45' },
    { art: 'iced', bg: '#9FB8A8', cap: 'First warm day. Iced latte, nothing added.', t: 'Thu 10:30' },
    { art: 'window', bg: '#E6EAE5', cap: 'Best seat in the house, 9 to 11.', t: 'Thu 14:45' },
    { art: 'pour', bg: '#1B3191', cap: 'The pour, filmed at the bar during service.', t: 'Fri 7:40' },
    { art: 'cake', bg: '#FBE29A', cap: 'Weekend slice: brown butter and raspberry.', t: 'Fri 14:45' },
    { art: 'loaf', bg: '#1D2A2E', cap: 'Sourdough for Saturday. Order by Friday.', t: 'Sat 7:40' },
    { art: 'awning', bg: '#9FB8A8', cap: 'Open 7 to 5, and the bench is in the sun.', t: 'Sat 10:30' },
    { art: 'beans', bg: '#F5CF57', cap: 'New beans in from the roaster down the road.', t: 'Sun 8:30' },
    { art: 'filter', bg: '#2443C4', cap: 'Batch brew refills are free before 9.', t: 'Mon 7:40' }
  ];
  var feedEl = $('[data-feed]'), countEl = $('[data-postcount]');
  var capEl = $('[data-float-cap]'), timeEl = $('[data-float-time]');
  var tiles = [], postIdx = 0, posted = 0;
  function makeTile(p) {
    var d = document.createElement('div');
    d.className = 'tile'; d.style.setProperty('--bg', p.bg);
    d.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#p-' + p.art + '"/></svg>';
    return d;
  }
  function placeTile(t, i) { t.style.setProperty('--c', i % 3); t.style.setProperty('--r', Math.floor(i / 3)); }
  function swapText(el, txt) {
    if (!el) return;
    if (!motion) { el.textContent = txt; return; }
    el.classList.add('is-swapping');
    setTimeout(function () { el.textContent = txt; el.classList.remove('is-swapping'); }, 300);
  }
  function pushPost(animate) {
    var p = POSTS[postIdx++ % POSTS.length];
    var t = makeTile(p); placeTile(t, 0);
    if (animate) t.classList.add('is-new');
    feedEl.insertBefore(t, feedEl.firstChild); tiles.unshift(t);
    tiles.forEach(function (x, i) { if (i) placeTile(x, i); });
    while (tiles.length > 15) tiles.pop().remove();
    posted++; if (countEl) countEl.textContent = posted;
    if (animate) { swapText(capEl, p.cap); swapText(timeEl, p.t); }
  }
  var feedTimer = null, heroVisible = true, feedStarted = false;
  function feedLoop() {
    clearTimeout(feedTimer);
    if (!heroVisible || document.hidden) return;
    pushPost(true);
    feedTimer = setTimeout(feedLoop, posted < 9 ? 620 : 2600);
  }
  function startFeed() {
    if (!feedEl || feedStarted) return;
    feedStarted = true;
    if (!motion) { for (var i = 0; i < 9; i++) pushPost(false); return; }
    feedLoop();
  }
  document.addEventListener('visibilitychange', function () { if (motion && feedStarted && !document.hidden) feedLoop(); });

  /* ---------------- hero: tilt, lamp, entrance ---------------- */
  var hero = $('.hero'), tiltEl = $('[data-tilt]'), stageEl = $('.phone-stage');
  var tilt = { rx: 4, ry: -12 };
  function writeTilt() {
    if (!tiltEl) return;
    tiltEl.style.setProperty('--rx', tilt.rx.toFixed(2) + 'deg');
    tiltEl.style.setProperty('--ry', tilt.ry.toFixed(2) + 'deg');
    tiltEl.style.setProperty('--gx', (tilt.ry / 30).toFixed(3));
    stageEl.style.setProperty('--ry-n', (tilt.ry / 30).toFixed(3));
  }
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (e) {
      heroVisible = e[0].isIntersecting;
      if (heroVisible && motion && feedStarted) feedLoop();
    }).observe(hero);
  }

  function intro() {
    var h1 = $('.board-title');
    var letters = splitLetters(h1);
    if (!motion) { root.classList.add('is-ready'); startFeed(); return; }

    h1.classList.add('is-intro');
    var lines = [], lastTop = null;
    $$('.w', h1).forEach(function (w) {
      var t = w.offsetTop;
      if (lastTop === null || Math.abs(t - lastTop) > 4) { lines.push([]); lastTop = t; }
      lines[lines.length - 1].push(w);
    });
    gsap.set($$('.lr', h1), { yPercent: 115 });

    var price = $('.board-price .price');
    price.style.width = price.getBoundingClientRect().width + 'px';
    var target = +price.dataset.countTo, pc = { v: 0 };
    price.textContent = '$0';

    gsap.ticker.add(function () { if (heroVisible) writeTilt(); });

    var tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete: function () {
        h1.classList.remove('is-intro'); root.classList.add('is-ready');
        letterProximity(hero, letters);
        if (!fine) gsap.to(tilt, { rx: 8, ry: -4, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      }
    });
    lines.forEach(function (ws, i) {
      var lrs = []; ws.forEach(function (w) { lrs = lrs.concat($$('.lr', w)); });
      tl.to(lrs, { yPercent: 0, duration: 1.15, stagger: 0.016 }, 0.05 + i * 0.12);
    });
    tl.fromTo('.hero .board-price', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8 }, 0.42)
      .from('.board-price .leader', { scaleX: 0, duration: 1.1, ease: 'power3.inOut' }, 0.5)
      .to(pc, { v: target, duration: 1.3, ease: 'power2.out', onUpdate: function () { price.textContent = '$' + Math.round(pc.v); } }, 0.55)
      .fromTo(['.hero .lede', '.hero-actions', '.hero-meta'], { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.5)
      .fromTo('.phone-stage', { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 1.5 }, 0.25)
      .fromTo(tilt, { rx: 30, ry: -34 }, { rx: 4, ry: -12, duration: 1.8, ease: 'expo.out' }, 0.25)
      .fromTo('.float', { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.15 }, 1.2)
      .add(startFeed, 0.8);

    if (fine) {
      var lamp = $('.hero .lamp'), lp = { x: 32, y: 18 };
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
        gsap.to(lp, { x: nx * 100, y: ny * 100, duration: 1.2, ease: 'power3.out', overwrite: true, onUpdate: function () {
          lamp.style.setProperty('--lx', lp.x.toFixed(1) + '%'); lamp.style.setProperty('--ly', lp.y.toFixed(1) + '%');
        } });
        if (tl.progress() > 0.6) {
          var sr = stageEl.getBoundingClientRect();
          var dx = (e.clientX - (sr.left + sr.width / 2)) / (r.width / 2), dy = (e.clientY - (sr.top + sr.height / 2)) / (r.height / 2);
          gsap.to(tilt, { ry: clamp(-12 + dx * 22, -36, 20), rx: clamp(4 - dy * 14, -14, 20), duration: 1.1, ease: 'power3.out', overwrite: true });
        }
      });
      hero.addEventListener('pointerleave', function () { gsap.to(tilt, { rx: 4, ry: -12, duration: 1.6, ease: 'elastic.out(1, .5)', overwrite: true }); });
    }
  }
  fontsReady(700).then(intro);

  /* closing band: letters press onto the board when it scrolls in */
  (function closingBoard() {
    var h = $('.board-close');
    if (!h) return;
    fontsReady(1500).then(function () {
      var letters = splitLetters(h);
      if (!motion) return;
      var lrs = $$('.lr', h);
      gsap.set(lrs, { yPercent: -60, opacity: 0, rotate: function (i) { return (i % 2 ? 1 : -1) * (6 + (i * 7) % 9); } });
      ST.create({ trigger: h, start: 'top 82%', once: true, onEnter: function () {
        gsap.to(lrs, { yPercent: 0, opacity: 1, rotate: 0, duration: 0.7, ease: 'back.out(2.4)', stagger: 0.022, onComplete: function () { letterProximity(h.closest('.closing'), letters); } });
      } });
    });
  })();

  /* ---------------- curriculum: the 6-week scene ---------------- */
  (function curriculum() {
    var stage = $('[data-stage]'), track = $('[data-track]');
    if (!stage) return;
    var weeks = $$('.week', stage), rail = $$('.rail [data-goto]', stage);
    var status = $('[data-stage-status]', stage), count = $('[data-stage-count]', stage), spark = $('.spark', stage);
    var STATUS = ['Content menu', 'Shot list, two light spots', 'Caption starters', 'Next month scheduled', 'Three reels ready', 'Ten-minute monthly check'];
    var READY = [3, 6, 6, 12, 12, 12];
    var current = 0;
    function setWeek(n) {
      if (n === current) return;
      current = n;
      stage.dataset.week = n;
      for (var k = 2; k <= 6; k++) stage.classList.toggle('w' + k, n >= k);
      weeks.forEach(function (w, i) { w.classList.toggle('is-active', i === n - 1); w.classList.toggle('is-past', i < n - 1); });
      rail.forEach(function (b, i) { b.classList.toggle('is-active', i === n - 1); if (i === n - 1) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      if (status) status.textContent = STATUS[n - 1];
      if (count) count.textContent = READY[n - 1];
    }
    if (motion) {
      setWeek(1);
      ST.create({
        trigger: track, start: 'top top', end: 'bottom bottom',
        onUpdate: function (self) {
          var p = self.progress;
          setWeek(clamp(Math.floor(p * 6) + 1, 1, 6));
          stage.style.setProperty('--prog', p.toFixed(4));
          spark.style.setProperty('--draw', clamp(p * 1.08, 0.04, 1).toFixed(4));
        }
      });
      spark.style.setProperty('--draw', 0.04);
      rail.forEach(function (b) {
        b.addEventListener('click', function () {
          var n = +b.dataset.goto;
          var top = track.getBoundingClientRect().top + window.scrollY;
          var len = track.offsetHeight - window.innerHeight;
          scrollToY(top + len * ((n - 1) / 6 + 0.04));
        });
      });
    } else {
      // static layout: follow the list as it scrolls, no movement
      setWeek(6);
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { var n = +e.target.dataset.w; setWeek(n); if (spark) spark.style.setProperty('--draw', n / 6); } });
        }, { rootMargin: '-45% 0px -45% 0px' });
        weeks.forEach(function (w) { io.observe(w); });
      }
    }
  })();

  /* ---------------- planner: 20 minutes a day ---------------- */
  onVisible($('[data-planner]'), function initPlanner() {
    var app = $('[data-planner]'), section = $('#planner');
    var chips = $$('.chip', app), docks = $$('.dock', app), slots = $$('.slot', app), tray = $('[data-tray]', app);
    var ring = $('.ring', app), ringMin = $('[data-ring-min]', app), status = $('[data-planner-status]', app);
    var grabbed = null, shown = { v: 0 };
    chips.forEach(function (c, i) { c._dock = docks[i]; c._name = $('.chip-t', c).textContent; });

    function slotOf(c) { return c.closest('.slot'); }
    function slotLabel(s) { return $('.slot-time', s).textContent + ', ' + $('.slot-name', s).textContent.toLowerCase(); }
    function syncTargets() {
      slots.forEach(function (s) {
        var has = !!$('.chip', s);
        $('.drop-target', s).hidden = has;
        s.classList.toggle('is-filled', has);
      });
      chips.forEach(function (c) {
        var s = slotOf(c);
        if (s) c.setAttribute('aria-label', c._name + ', ' + c.dataset.min + ' minutes, placed at ' + slotLabel(s) + '. Press to take it off the day.');
        else c.removeAttribute('aria-label');
      });
    }
    function total() { return chips.reduce(function (sum, c) { return sum + (slotOf(c) ? +c.dataset.min : 0); }, 0); }
    function update(msg) {
      var m = total();
      ring.style.setProperty('--fill', m / 20);
      ring.classList.toggle('is-full', m === 20);
      section.classList.toggle('is-done', m === 20);
      if (motion) gsap.to(shown, { v: m, duration: 0.8, ease: 'power2.out', overwrite: true, onUpdate: function () { ringMin.textContent = Math.round(shown.v); } });
      else ringMin.textContent = m;
      if (m === 20) msg = "That's the whole day: 20 minutes, fitted around service. Six weeks turns it into a habit.";
      status.textContent = msg || (m ? m + ' of 20 minutes planned.' : 'Four jobs, four quiet moments. Nothing placed yet.');
    }
    function flip(el, first, fn) {
      var a = first || el.getBoundingClientRect();
      fn();
      if (!motion) return;
      var b = el.getBoundingClientRect();
      gsap.fromTo(el, { x: a.left - b.left, y: a.top - b.top, rotate: first ? -2 : 0 }, { x: 0, y: 0, rotate: 0, duration: 0.65, ease: 'expo.out', clearProps: 'transform' });
    }
    function home(c, first) { flip(c, first, function () { c._dock.appendChild(c); }); }
    function placeIn(c, slot, first) {
      var occ = $('.chip', slot);
      if (occ === c) { flip(c, first, function () {}); return; }
      var from = slotOf(c);
      if (occ) { if (from) flip(occ, null, function () { $('.drop', from).appendChild(occ); }); else home(occ); }
      flip(c, first, function () { $('.drop', slot).appendChild(c); });
      syncTargets();
      update('Placed "' + c._name + '" at ' + slotLabel(slot) + '. ' + total() + ' of 20 minutes planned.');
    }
    function firstEmpty() { return slots.filter(function (s) { return !$('.chip', s); })[0]; }
    function endGrab(focusEl) {
      if (grabbed) grabbed.removeAttribute('aria-pressed');
      grabbed = null; section.classList.remove('is-picking');
      if (focusEl) focusEl.focus();
    }
    function nextFocus() {
      var left = chips.filter(function (c) { return !slotOf(c); });
      return left[0] || $('.planner-cta .btn', app);
    }

    chips.forEach(function (c) {
      c.addEventListener('click', function (e) {
        if (performance.now() - (c._dragEnd || 0) < 350) return;
        if (slotOf(c)) { endGrab(); home(c); syncTargets(); update('Took "' + c._name + '" off the day. ' + total() + ' of 20 minutes planned.'); c.focus(); return; }
        if (e.detail === 0) { // keyboard: pick up, then choose a slot
          if (grabbed === c) { endGrab(c); status.textContent = 'Put back.'; return; }
          endGrab(); grabbed = c; c.setAttribute('aria-pressed', 'true'); section.classList.add('is-picking');
          status.textContent = 'Picked up "' + c._name + '". Choose a time slot and press Enter, or Escape to cancel.';
          var t = firstEmpty(); if (t) $('.drop-target', t).focus();
          return;
        }
        var s = firstEmpty(); if (s) { placeIn(c, s); }
      });
    });
    slots.forEach(function (s) {
      $('.drop-target', s).addEventListener('click', function () {
        var c = grabbed || chips.filter(function (x) { return !slotOf(x); })[0];
        if (!c) return;
        var wasGrab = !!grabbed;
        endGrab();
        placeIn(c, s);
        if (wasGrab) nextFocus().focus();
      });
    });
    app.addEventListener('keydown', function (e) { if (e.key === 'Escape' && grabbed) { var g = grabbed; endGrab(g); status.textContent = 'Cancelled.'; } });
    $('[data-planner-reset]', app).addEventListener('click', function () {
      endGrab(); chips.forEach(function (c) { if (slotOf(c)) home(c); }); syncTargets(); update();
    });

    /* pointer drag (mouse, pen, touch) */
    function slotAt(x, y) {
      for (var i = 0; i < slots.length; i++) {
        var r = $('.drop', slots[i]).getBoundingClientRect();
        if (x > r.left - 12 && x < r.right + 12 && y > r.top - 10 && y < r.bottom + 10) return slots[i];
      }
      return null;
    }
    chips.forEach(function (c) {
      c.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        var sx = e.clientX, sy = e.clientY, r = c.getBoundingClientRect(), ox = sx - r.left, oy = sy - r.top;
        var dragging = false, ghost = null, over = null;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        function move(ev) {
          if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
            dragging = true; endGrab();
            ghost = c.cloneNode(true); ghost.classList.add('chip-drag'); ghost.setAttribute('aria-hidden', 'true'); ghost.removeAttribute('aria-label');
            ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
            document.body.appendChild(ghost); c.classList.add('is-ghosted');
            root.classList.add('is-dragging');
          }
          if (!dragging) return;
          ghost.style.transform = 'translate(' + (ev.clientX - ox) + 'px,' + (ev.clientY - oy) + 'px) rotate(-2deg)';
          var s = slotAt(ev.clientX, ev.clientY);
          if (s !== over) { if (over) over.classList.remove('is-over'); over = s; if (s) s.classList.add('is-over'); }
        }
        function up(ev) {
          c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up);
          if (!dragging) return;
          c._dragEnd = performance.now();
          root.classList.remove('is-dragging');
          var first = ghost.getBoundingClientRect();
          ghost.remove(); c.classList.remove('is-ghosted');
          if (over) { over.classList.remove('is-over'); placeIn(c, over, first); }
          else {
            var tr = tray.getBoundingClientRect();
            if (slotOf(c) && ev.type === 'pointerup' && ev.clientY < tr.bottom + 20) { home(c, first); syncTargets(); update('Took "' + c._name + '" off the day. ' + total() + ' of 20 minutes planned.'); }
            else flip(c, first, function () {});
          }
        }
        c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
      });
    });
    syncTargets();
  }, '400px 0px');

  /* ---------------- FAQ: smooth height ---------------- */
  $$('.faq details').forEach(function (d) {
    var s = $('summary', d), a = $('.answer', d), anim = null;
    function label() { s.dataset.cursor = d.open ? 'Close' : 'Open'; if (cursorLabel && cursorLabel.target === s) cursorLabel.set(s.dataset.cursor); }
    s.addEventListener('click', function (e) {
      if (!motion || !a.animate) { setTimeout(label, 0); return; }
      e.preventDefault();
      if (anim) { anim.cancel(); anim = null; }
      if (!d.open) {
        d.open = true;
        var h = a.scrollHeight;
        anim = a.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
        anim.onfinish = function () { anim = null; ST.refresh(); };
      } else {
        anim = a.animate([{ height: a.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 360, easing: 'cubic-bezier(.4,0,.2,1)' });
        anim.onfinish = function () { d.open = false; anim = null; label(); ST.refresh(); };
      }
      label();
    });
  });

  /* ---------------- cursor + magnetic buttons (fine pointers only) ---------------- */
  var cursorLabel = null, cursorEl = null;
  if (fine && motion) {
    cursorEl = document.createElement('div');
    cursorEl.className = 'cursor'; cursorEl.setAttribute('aria-hidden', 'true');
    cursorEl.innerHTML = '<div class="cursor-dot"></div><div class="cursor-follow"><div class="cursor-ring"><span></span></div></div>';
    document.body.appendChild(cursorEl);
    var dot = $('.cursor-dot', cursorEl), follow = $('.cursor-follow', cursorEl), ringTxt = $('.cursor-ring span', cursorEl);
    var dx = gsap.quickSetter(dot, 'x', 'px'), dy = gsap.quickSetter(dot, 'y', 'px');
    var fx = gsap.quickTo(follow, 'x', { duration: 0.32, ease: 'power3' }), fy = gsap.quickTo(follow, 'y', { duration: 0.32, ease: 'power3' });
    cursorLabel = { target: null, set: function (t) { ringTxt.textContent = t; } };
    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (!cursorEl.classList.contains('is-live') && !$('dialog[open]')) { cursorEl.classList.add('is-live'); root.classList.add('has-cursor'); }
      dx(e.clientX); dy(e.clientY); fx(e.clientX); fy(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor]');
      var h = !t && e.target.closest && e.target.closest('a, button, summary, [role="button"]');
      cursorEl.classList.toggle('is-label', !!t);
      cursorEl.classList.toggle('is-hover', !!h);
      cursorLabel.target = t;
      if (t) cursorLabel.set(t.dataset.cursor);
    });
    document.documentElement.addEventListener('mouseleave', function () { cursorEl.classList.remove('is-live'); });
    addEventListener('pointerdown', function () { cursorEl.classList.add('is-down'); });
    addEventListener('pointerup', function () { cursorEl.classList.remove('is-down'); });

    $$('.btn').forEach(function (b) {
      function at(e) { var r = b.getBoundingClientRect(); b.style.setProperty('--fx', (e.clientX - r.left) + 'px'); b.style.setProperty('--fy', (e.clientY - r.top) + 'px'); }
      b.addEventListener('pointerenter', at);
      b.addEventListener('pointerleave', at);
    });
    $$('[data-magnetic]').forEach(function (b) {
      var lab = $('.btn-label', b);
      var bx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' }), by = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
      var lx = gsap.quickTo(lab, 'x', { duration: 0.5, ease: 'power3' }), ly = gsap.quickTo(lab, 'y', { duration: 0.5, ease: 'power3' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var cx = r.left - gsap.getProperty(b, 'x') + r.width / 2, cy = r.top - gsap.getProperty(b, 'y') + r.height / 2;
        var mx = e.clientX - cx, my = e.clientY - cy;
        bx(mx * 0.28); by(my * 0.4); lx(mx * 0.12); ly(my * 0.18);
      });
      b.addEventListener('pointerleave', function () {
        gsap.to([b, lab], { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, .38)', overwrite: true });
      });
    });
  }

  /* ---------------- section headings: one reveal each ---------------- */
  if (motion) {
    $$('[data-reveal]').forEach(function (h) {
      gsap.from(h, { yPercent: 35, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });
  }

  /* ---------------- sticky mobile CTA ---------------- */
  (function sticky() {
    var bar = $('[data-sticky]');
    if (!bar || !('IntersectionObserver' in window)) return;
    var heroCta = $('.hero-actions'), zones = $$('#pricing, .closing, #planner .planner-foot');
    var heroVis = true, inZone = new Set(), btn = $('button', bar);
    function upd() {
      var show = !heroVis && inZone.size === 0;
      bar.classList.toggle('is-shown', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      btn.tabIndex = show ? 0 : -1;
    }
    new IntersectionObserver(function (e) { heroVis = e[0].isIntersecting || e[0].boundingClientRect.top > 0; upd(); }).observe(heroCta);
    var zo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) inZone.add(e.target); else inZone.delete(e.target); });
      upd();
    }, { rootMargin: '0px 0px -20% 0px' });
    zones.forEach(function (z) { zo.observe(z); });
  })();

  /* ---------------- demo checkout ---------------- */
  var dlg = document.getElementById('checkout');
  $$('[data-checkout]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('[data-checkout-tier]', dlg).textContent = b.dataset.checkout;
      $('[data-checkout-price]', dlg).textContent = b.dataset.price;
      if (cursorEl) { cursorEl.classList.remove('is-live'); root.classList.remove('has-cursor'); }
      if (lenis) lenis.stop();
      if (dlg.showModal) dlg.showModal(); else alert('Demo: checkout would open here.');
    });
  });
  dlg.addEventListener('close', function () { if (lenis) lenis.start(); });

  if (motion) {
    fontsReady(2000).then(function () { ST.refresh(); });
    addEventListener('load', function () { ST.refresh(); });
  }
})();
