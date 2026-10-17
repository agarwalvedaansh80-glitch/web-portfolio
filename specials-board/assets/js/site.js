/* Specials Board: page script. All motion runs through GSAP so it stays in step with one clock. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, W = window;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var capture = root.classList.contains('capture');
  var hasG = !!(W.gsap && W.ScrollTrigger);
  if (!hasG) { root.classList.remove('motion'); }
  var motion = hasG && root.classList.contains('motion');
  W.__sb = true;
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var mobile = function () { return W.innerWidth <= 760; };
  if (hasG) { gsap.registerPlugin(ScrollTrigger); if (W.Flip) gsap.registerPlugin(Flip); }

  /* ---------------- generated textures: chalk board + chalk grain mask ---------------- */
  (function textures() {
    try {
      var r = SBPosts.rng(11);
      var c = d.createElement('canvas'); c.width = c.height = 360; var x = c.getContext('2d');
      for (var i = 0; i < 26; i++) {
        var g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(244,239,227,' + (0.025 + r() * 0.035) + ')'); g.addColorStop(1, 'rgba(244,239,227,0)');
        var bx0 = r() * 360, by0 = r() * 360, rot = r() * 3, sx = 40 + r() * 110, sy = 10 + r() * 30;
        for (var ox = -360; ox <= 360; ox += 360) for (var oy = -360; oy <= 360; oy += 360) { x.save(); x.translate(bx0 + ox, by0 + oy); x.rotate(rot); x.scale(sx, sy); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 6.3); x.fill(); x.restore(); }
      }
      for (var k = 0; k < 2600; k++) { x.fillStyle = 'rgba(244,239,227,' + (r() * 0.06) + ')'; x.fillRect(r() * 360, r() * 360, 1, 1); }
      root.style.setProperty('--chalk-img', 'url(' + c.toDataURL() + ')');
      var m = d.createElement('canvas'); m.width = m.height = 260; var y = m.getContext('2d');
      y.fillStyle = '#000'; y.fillRect(0, 0, 260, 260); y.globalCompositeOperation = 'destination-out';
      for (var j = 0; j < 3000; j++) { y.fillStyle = 'rgba(0,0,0,' + (0.15 + r() * 0.55) + ')'; var s = r() < 0.85 ? 1 : 2; y.fillRect(r() * 260, r() * 260, s, s * (1 + r())); }
      for (var q = 0; q < 40; q++) { y.fillStyle = 'rgba(0,0,0,.35)'; y.fillRect(r() * 260, r() * 260, 6 + r() * 14, 1); }
      root.style.setProperty('--grain', 'url(' + m.toDataURL() + ')');
    } catch (e) { /* textures are decoration only */ }
  })();

  /* ---------------- smooth scroll ---------------- */
  var lenis = null;
  if (motion && !capture && W.Lenis) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    if (a.hasAttribute('data-checkout')) return;
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); var t = id.length > 1 && d.getElementById(id.slice(1));
      if (!t) return; e.preventDefault();
      if (lenis) lenis.scrollTo(t, { duration: 1.4, offset: -10 }); else t.scrollIntoView({ behavior: motion && !capture ? 'smooth' : 'auto' });
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
    });
  });

  /* ---------------- header state ---------------- */
  var head = $('.site-head');
  function onScrollHead() { head.classList.toggle('scrolled', W.scrollY > 8); }
  W.addEventListener('scroll', onScrollHead, { passive: true }); onScrollHead();

  /* ---------------- cohort dates + honest countdown ----------------
     Starts the first Monday of each month; enrolment closes the Sunday before at 23:59. Never resets. */
  var closeAt;
  (function cohort() {
    function firstMonday(y, m) { var x = new Date(y, m, 1); x.setDate(1 + (8 - x.getDay()) % 7); return x; }
    var now = new Date(), start;
    for (var k = 0; k < 3; k++) {
      start = firstMonday(now.getFullYear(), now.getMonth() + k);
      closeAt = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 23, 59, 0);
      if (closeAt > now) break;
    }
    var long = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    $$('[data-cohort-start]').forEach(function (el) { el.textContent = long; });
    $$('[data-cohort-start-short]').forEach(function (el) { el.textContent = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }); });
    $$('[data-cohort-month]').forEach(function (el) { el.textContent = start.toLocaleDateString('en-GB', { month: 'short' }); });
    $$('[data-cohort-day]').forEach(function (el) { el.textContent = start.getDate(); });
    $$('[data-cohort-wd]').forEach(function (el) { el.textContent = start.toLocaleDateString('en-GB', { weekday: 'short' }); });
  })();
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  var cdEls = $$('[data-countdown] [data-u]'), cdShort = $$('[data-countdown-short]');
  function tick(first) {
    var ms = Math.max(0, closeAt - new Date());
    var v = { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
    cdEls.forEach(function (el) {
      var t = pad(v[el.getAttribute('data-u')]);
      if (el.textContent === t) return;
      el.textContent = t;
      if (!first && motion && el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < W.innerHeight) {
        if (el.closest('.flip')) gsap.fromTo(el, { rotateX: -80, opacity: 0.3 }, { rotateX: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)', transformPerspective: 400, transformOrigin: '50% 50%' });
        else gsap.fromTo(el, { yPercent: -60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
      }
    });
    cdShort.forEach(function (el) { el.textContent = v.d > 0 ? v.d + 'd ' + pad(v.h) + 'h' : pad(v.h) + 'h ' + pad(v.m) + 'm'; });
  }
  tick(true); setInterval(tick, 1000);

  /* ---------------- odometer ---------------- */
  function Odo(el, digits) {
    var cols = [], txt = '';
    el.textContent = '';
    el.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < digits; i++) {
      var dg = d.createElement('span'); dg.className = 'dg';
      var st = d.createElement('span'); var h = '';
      for (var n = 0; n <= 10; n++) h += '<i>' + (n % 10) + '</i>';
      st.innerHTML = h; dg.appendChild(st); el.appendChild(dg); cols.push(st);
    }
    this.set = function (v) {
      v = Math.max(0, v);
      var iv = Math.floor(v + 1e-6), f = v - iv, r = f < 0.65 ? 0 : (f - 0.65) / 0.35; r = r * r * (3 - 2 * r);
      for (var k = 0; k < digits; k++) {
        var p = Math.pow(10, k), dgt = Math.floor(iv / p) % 10, rolling = k === 0 || (iv % p) === p - 1;
        var pos = dgt + (rolling ? r : 0);
        cols[digits - 1 - k].style.transform = 'translateY(' + (-pos * 100 / 11).toFixed(3) + '%)';
      }
    };
  }

  /* ---------------- rolling text (flip/roll per character) ---------------- */
  function esc(c) { return c === ' ' ? '&nbsp;' : c.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function rollTo(el, next, done) {
    var old = el.textContent, n = Math.max(old.length, next.length), h = '';
    for (var i = 0; i < n; i++) h += '<span class="rc"><span><span>' + esc(old[i] || ' ') + '</span><span>' + esc(next[i] || ' ') + '</span></span></span>';
    el.innerHTML = h;
    var stacks = $$('.rc > span', el);
    gsap.to(stacks, { yPercent: -50, duration: 0.42, ease: 'power3.inOut', stagger: { each: 0.011 }, onComplete: function () { el.textContent = next; if (done) done(); } });
  }

  /* ---------------- headline: chalk write-on, then letters that react ---------------- */
  var glyphs = $$('.chalk-h .g'), under = $('.chalk-h .u');
  function heroIntro() {
    if (!motion) return;
    var tl = gsap.timeline({ delay: 0.15 });
    glyphs.forEach(function (g) { var L = g.getTotalLength(); g.style.strokeDasharray = L + ' ' + L; g.style.strokeDashoffset = L; });
    var UL = under.getTotalLength(); under.style.strokeDasharray = UL + ' ' + UL; under.style.strokeDashoffset = UL;
    tl.from('.hero-grid > .tile:not(.hero-board)', { y: 50, opacity: 0, rotate: function (i) { return [3, -2, 2, -3][i]; }, duration: 0.9, ease: 'back.out(1.4)', stagger: 0.09 }, 0);
    tl.from('.hero-board', { scale: 0.97, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0);
    tl.from('.board-top, .hero-sub, .leave, .hero-cta', { y: 18, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08 }, 0.25);
    glyphs.forEach(function (g, i) {
      var line = g.parentNode.getAttribute('class');
      var at = 0.35 + i * (line === 'l3' ? 0.042 : 0.05) + (line === 'l2' ? 0.15 : line === 'l3' ? 0.3 : 0);
      tl.set(g, { strokeOpacity: 1 }, at);
      tl.to(g, { strokeDashoffset: 0, duration: line === 'l3' ? 0.38 : 0.55, ease: 'power1.inOut' }, at);
      tl.to(g, { fillOpacity: 1, duration: 0.4, ease: 'power1.out' }, at + 0.3);
    });
    tl.set(under, { strokeOpacity: 1 }, '-=0.2').to(under, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, '<');
    tl.call(kineticLetters);
    // price digits roll up
    var pe = $('[data-odo-static]');
    if (pe) { var po = new Odo(pe, 3), pv = { v: 0 }; po.set(0); tl.to(pv, { v: 249, duration: 1.6, ease: 'power3.out', onUpdate: function () { po.set(pv.v); } }, 0.5); }
    // steam
    $$('.steam-cup .st').forEach(function (s, i) {
      gsap.fromTo(s, { y: 6, opacity: 0 }, { y: -6, opacity: 0.9, duration: 1.4, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: i * 0.4 });
    });
  }
  function kineticLetters() {
    if (!motion) return;
    var board = $('.hero-board'), svg = $('.chalk-h');
    glyphs.forEach(function (g) { g.style.strokeDasharray = ''; g.style.strokeDashoffset = ''; });
    var data = glyphs.map(function (g) {
      gsap.set(g, { transformOrigin: '50% 80%' });
      return { g: g, b: g.getBBox(), y: gsap.quickTo(g, 'y', { duration: 0.5, ease: 'power3.out' }), r: gsap.quickTo(g, 'rotation', { duration: 0.6, ease: 'power3.out' }), s: gsap.quickTo(g, 'skewX', { duration: 0.5, ease: 'power3.out' }) };
    });
    board.addEventListener('pointermove', function (e) {
      var m = svg.getScreenCTM(); if (!m) return;
      var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var p = pt.matrixTransform(m.inverse());
      data.forEach(function (o) {
        var cx = o.b.x + o.b.width / 2, cy = o.b.y + o.b.height / 2, dx = cx - p.x, dy = cy - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy), f = Math.max(0, 1 - dist / 150); f = f * f * (3 - 2 * f);
        o.y(-f * 12); o.r((dx > 0 ? 1 : -1) * f * 6); o.s((dx > 0 ? -1 : 1) * f * 5);
      });
    });
    board.addEventListener('pointerleave', function () { data.forEach(function (o) { o.y(0); o.r(0); o.s(0); }); });
  }

  /* ---------------- "you leave with" roller ---------------- */
  (function roller() {
    var el = $('[data-roll]'); if (!el) return;
    var items; try { items = JSON.parse(el.getAttribute('data-roll')); } catch (e) { return; }
    if (!motion) return;
    var i = 0;
    function next() { i = (i + 1) % items.length; rollTo(el, items[i], function () { gsap.delayedCall(2.1, next); }); }
    gsap.delayedCall(3.6, next);
  })();

  /* ---------------- marquee: velocity-driven kinetic type ---------------- */
  (function marquee() {
    var tr = $('.mq-track'); if (!tr || !motion) return;
    var x = 0, half = 0, lastY = W.scrollY, vel = 0;
    var spans = $$('span', tr);
    function measure() { half = spans[0].offsetWidth; }
    measure(); W.addEventListener('resize', measure);
    gsap.ticker.add(function (t, dt) {
      var y = W.scrollY, dy = y - lastY; lastY = y;
      vel += (dy - vel) * 0.12;
      x -= (1.1 + Math.abs(vel) * 0.35) * (dt / 16.67) * (vel < -0.5 ? -1 : 1);
      if (half) { if (x <= -half) x += half; if (x > 0) x -= half; }
      var sk = clamp(-vel * 0.25, -14, 14), wg = Math.round(clamp(520 + Math.abs(vel) * 18, 520, 900));
      tr.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0) skewX(' + sk.toFixed(2) + 'deg)';
      var fv = '"SOFT" 100, "WONK" 1, "opsz" 144, "wght" ' + wg;
      if (tr._fv !== fv) { tr._fv = fv; spans.forEach(function (s) { s.style.fontVariationSettings = fv; }); }
    });
  })();

  /* ---------------- pains: scrubbed chalk strike-through ---------------- */
  $$('.pain').forEach(function (p) {
    var svg = $('.strike', p); if (svg) svg.remove();
    var txt = p.textContent; p.innerHTML = '<span class="st">' + txt + '</span>';
  });
  if (motion) {
    $$('.pain-list li').forEach(function (li) {
      var st = $('.st', li), pain = $('.pain', li), fix = $('.fix', li);
      gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 78%', end: 'top 32%', scrub: true } })
        .fromTo(st, { backgroundSize: '0% .085em' }, { backgroundSize: '100% .085em', ease: 'none', duration: 1 })
        .fromTo(pain, { color: '#2B1B13' }, { color: 'rgba(43,27,19,.38)', ease: 'none', duration: 0.5 }, 0.5)
        .fromTo(fix, { clipPath: 'inset(0 100% 0 0)', x: -10 }, { clipPath: 'inset(0 0% 0 0)', x: 0, ease: 'none', duration: 0.8 }, 0.7);
    });
  } else { $$('.pain .st').forEach(function (s) { s.style.backgroundSize = '100% .085em'; }); $$('.pain').forEach(function (p) { p.style.color = 'rgba(43,27,19,.45)'; }); }

  /* ---------------- kinetic section titles ---------------- */
  $$('[data-kin]').forEach(function (h) {
    if (!motion) return;
    var words = h.textContent.split(' ');
    h.setAttribute('aria-label', h.textContent);
    h.innerHTML = words.map(function (w) { return '<span class="kw" aria-hidden="true" style="display:inline-block;white-space:nowrap">' + w.split('').map(function (c) { return '<span class="kc" style="display:inline-block">' + esc(c) + '</span>'; }).join('') + '</span>'; }).join(' ');
    var cs = $$('.kc', h);
    gsap.fromTo(cs, { yPercent: 70, rotate: 14, opacity: 0, fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144, "wght" 250' },
      { yPercent: 0, rotate: 0, opacity: 1, fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144, "wght" 750', ease: 'none', stagger: 0.04,
        scrollTrigger: { trigger: h, start: 'top 92%', end: 'top 55%', scrub: true } });
  });

  /* ---------------- scroll-driven phone feed ---------------- */
  var CAPS = ['Cardamom buns are out. Two trays.', 'Oat flat white, rosetta by Sam.', 'Today’s board is up.', 'Doors open at 7.', 'Croissants, laminated last night.', 'Iced long black weather.', 'Pulling the first shot.', 'Tomato focaccia, Fridays only.', 'Tulip for Mrs Okafor.', 'New beans on the grinder.', 'The case at 8am.', 'Toast special, ask at the bar.'];
  var feed = (function () {
    var grid = $('[data-grid]'); if (!grid) return null;
    var cells = [], likes = [41, 58, 36, 72, 64, 49, 88, 95, 61, 54, 103, 117];
    var av = $('[data-avatar]'); if (av) av.appendChild(SBPosts.avatar(132));
    SBPosts.order.forEach(function (t, i) {
      var cell = d.createElement('div'); cell.className = 'ps-cell';
      var cv = SBPosts.make(t, 216, 101 + i * 17, i); cell.appendChild(cv);
      var fl = d.createElement('span'); fl.className = 'flash'; cell.appendChild(fl);
      var lk = d.createElement('span'); lk.className = 'lk'; lk.textContent = '0'; cell.appendChild(lk);
      grid.appendChild(cell); cells.push({ el: cell, cv: cv, fl: fl, lk: lk, last: -1 });
    });
    var stat = { posts: $('[data-stat="posts"]'), followers: $('[data-stat="followers"]') };
    var odo = { likes: new Odo($('[data-odo="likes"]'), 4), door: new Odo($('[data-odo="door"]'), 4), saves: new Odo($('[data-odo="saves"]'), 3) };
    var pscroll = $('[data-pscroll]'), beats = $$('.beat'), toast = $('[data-toast]'), toastT = $('[data-toast-t]'), prog = $('.feed-progress i'), plus = $('[data-plus]');
    var lastDoor = 212, lastBeat = -1, lastToast = -1;
    function eob(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
    function render(p) {
      var t = clamp((p - 0.03) / 0.85, 0, 1) * 12, likeSum = 0;
      cells.forEach(function (c, i) {
        var l = clamp(t - i, 0, 1);
        if (l === c.last) { likeSum += likes[i] * l; return; }
        c.last = l;
        var s = l <= 0 ? 0.001 : 0.35 + 0.65 * eob(l);
        c.cv.style.transform = 'scale(' + s.toFixed(3) + ') rotate(' + ((1 - l) * -8).toFixed(2) + 'deg)';
        c.cv.style.opacity = l <= 0 ? 0 : Math.min(1, l * 3).toFixed(2);
        c.fl.style.opacity = l > 0 && l < 1 ? ((1 - l) * 0.85).toFixed(2) : 0;
        c.lk.style.opacity = l > 0.4 ? 1 : 0;
        c.lk.textContent = Math.round(likes[i] * clamp((l - 0.4) / 0.6, 0, 1));
        likeSum += likes[i] * l;
      });
      var e = t / 12;
      if (pscroll) pscroll.style.transform = 'translateY(' + (-clamp((t - 8) / 3, 0, 1) * 56).toFixed(1) + 'px)';
      stat.posts.textContent = Math.floor(t + 0.0001) + 26;
      stat.followers.textContent = Math.round(412 + e * 238);
      odo.likes.set(likeSum);
      odo.saves.set(likeSum * 0.11);
      var door = 212 + Math.pow(e, 1.35) * 129; odo.door.set(door);
      if (plus && motion && Math.floor(door) > lastDoor + 3) { lastDoor = Math.floor(door); gsap.fromTo(plus, { y: 0, opacity: 1 }, { y: -26, opacity: 0, duration: 0.7, ease: 'power2.out', overwrite: 'auto' }); }
      if (Math.floor(door) < lastDoor) lastDoor = Math.floor(door);
      var b = Math.min(beats.length - 1, Math.floor(p * beats.length * 0.999));
      if (b !== lastBeat) { lastBeat = b; beats.forEach(function (x, i) { x.classList.toggle('is-on', i === b); }); }
      var k = Math.floor(t), f = t - k, show = k >= 1 && f < 0.75 && t < 12;
      if (k >= 12) show = false;
      if (show && k !== lastToast) { lastToast = k; toastT.textContent = CAPS[k - 1]; }
      toast.style.opacity = show ? (f < 0.15 ? f / 0.15 : f > 0.6 ? (0.75 - f) / 0.15 : 1).toFixed(2) : 0;
      toast.style.transform = 'translateY(' + (show ? 0 : -10) + 'px)';
      if (prog) prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    function scalePhone() {
      var vh = W.innerHeight, vw = W.innerWidth, s;
      if (vw <= 760) s = clamp((vh - 300) / 690, 0.5, 0.74); else s = clamp((vh * 0.82) / 690, 0.6, 1);
      $('.feed').style.setProperty('--ps', s.toFixed(3));
    }
    scalePhone(); W.addEventListener('resize', scalePhone);
    return { render: render };
  })();
  if (feed) {
    if (motion) {
      ScrollTrigger.create({ trigger: '.feed', start: 'top top', end: function () { return '+=' + Math.round(W.innerHeight * 2.8); }, pin: true, scrub: true, invalidateOnRefresh: true, onUpdate: function (s) { feed.render(s.progress); } });
      feed.render(0);
    } else { feed.render(1); }
  }

  /* ---------------- bento ---------------- */
  (function bento() {
    var tiles = $$('.b-tile');
    // tilt + glare
    if (motion && finePointer || capture) tiles.forEach(function (t) {
      var inn = $('.b-in', t);
      t.addEventListener('pointermove', function (e) {
        if (t.classList.contains('is-open')) return;
        var r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(inn, { '--rx': (-py * 9).toFixed(2) + 'deg', '--ry': (px * 11).toFixed(2) + 'deg', '--gx': (e.clientX - r.left) + 'px', '--gy': (e.clientY - r.top) + 'px', '--go': 1, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
      });
      t.addEventListener('pointerleave', function () { gsap.to(inn, { '--rx': '0deg', '--ry': '0deg', '--go': 0, duration: 0.8, ease: 'elastic.out(1, .5)', overwrite: 'auto' }); });
    });
    function inView(el, play, pause) { if (!motion) return; ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: function (s) { s.isActive ? play() : pause(); } }); }

    // live: waveform
    var bars = $$('.wave i'), wl = [];
    if (motion) {
      bars.forEach(function (b, i) { wl.push(gsap.to(b, { height: 'random(12, 100)%', duration: 'random(.22, .5)', ease: 'sine.inOut', repeat: -1, repeatRefresh: true, delay: i * 0.015, paused: true })); });
      wl.push(gsap.fromTo('.live-dot', { boxShadow: '0 0 0 0 rgba(224,74,45,.7)' }, { boxShadow: '0 0 0 12px rgba(224,74,45,0)', duration: 1.2, repeat: -1, ease: 'power1.out', paused: true }));
      inView('.b-live', function () { wl.forEach(function (x) { x.play(); }); }, function () { wl.forEach(function (x) { x.pause(); }); });
    } else bars.forEach(function (b, i) { b.style.height = (20 + ((i * 37) % 70)) + '%'; });

    // review: mini feed + red-pen marks
    var mf = $('[data-minifeed]');
    if (mf) ['latte', 'board', 'buns', 'iced', 'front', 'focaccia', 'pour', 'tulip', 'counter'].forEach(function (t, i) { mf.appendChild(SBPosts.make(t, 180, 300 + i * 13, i + 1)); });
    var marks = $$('.mf-marks path'), notes = $$('.mf-note');
    if (motion) {
      marks.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      var rtl = gsap.timeline({ paused: true })
        .to(marks, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut', stagger: 0.25 })
        .fromTo(notes, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.5)', stagger: 0.15 }, 0.35);
      ScrollTrigger.create({ trigger: '.b-review', start: 'top 70%', once: true, onEnter: function () { rtl.play(0); } });
      $('.b-review').addEventListener('pointerenter', function () { rtl.restart(); });
    } else notes.forEach(function (n) { n.style.opacity = 1; });

    // refund stamp thump
    var stamp = $('.b-refund .stamp');
    function thump() { gsap.fromTo(stamp, { scale: 1.7, rotate: -40, opacity: 0.1 }, { scale: 1, rotate: -14, opacity: 1, duration: 0.55, ease: 'back.out(3)' }); gsap.fromTo('.b-refund .b-in', { x: 0 }, { x: 3, duration: 0.05, repeat: 3, yoyo: true, delay: 0.2 }); }
    if (motion) { $('.b-refund').addEventListener('pointerenter', thump); ScrollTrigger.create({ trigger: '.b-refund', start: 'top 80%', once: true, onEnter: thump }); }

    // menu: items slide like a waiter correcting the board
    if (motion) $('.b-menu').addEventListener('pointerenter', function () { gsap.fromTo('.menu-card li', { x: -14, opacity: 0.2 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'power3.out' }); });

    // shots: a beam of window light follows the pointer
    var floor = $('.floor'), beam = $('.beam'), spots = $$('.floor .spot');
    if (floor && motion) {
      var bx = gsap.quickTo(beam, 'x', { duration: 0.5, ease: 'power3.out' }), by = gsap.quickTo(beam, 'y', { duration: 0.5, ease: 'power3.out' });
      var idle = gsap.timeline({ repeat: -1, yoyo: true, paused: true }).fromTo(beam, { x: 60, y: 30 }, { x: 160, y: 30, duration: 2.2, ease: 'sine.inOut' });
      function glow() {
        var fr = floor.getBoundingClientRect(), bxp = gsap.getProperty(beam, 'x'), byp = gsap.getProperty(beam, 'y'), sc = fr.width / 200;
        spots.forEach(function (s) { var cx = +s.getAttribute('cx') * sc, cy = +s.getAttribute('cy') * sc, dd = Math.hypot(cx - bxp, cy - byp); s.style.fill = 'rgba(242,196,107,' + (0.3 + Math.max(0, 1 - dd / 70) * 0.65).toFixed(2) + ')'; });
      }
      gsap.ticker.add(function () { if (floor._vis) glow(); });
      inView('.b-shots', function () { floor._vis = true; idle.play(); }, function () { floor._vis = false; idle.pause(); });
      $('.b-shots').addEventListener('pointermove', function (e) { idle.pause(); var fr = floor.getBoundingClientRect(); bx(clamp(e.clientX - fr.left, 0, fr.width)); by(clamp(e.clientY - fr.top, -20, fr.height)); });
      $('.b-shots').addEventListener('pointerleave', function () { idle.play(); });
    }

    // batch: a month of posts fills the calendar
    var cm = $('[data-calmini]'), bn = $('[data-batchn]');
    if (cm) {
      var cellsC = []; for (var i = 0; i < 28; i++) { var c = d.createElement('i'); cm.appendChild(c); cellsC.push(c); }
      var reds = [2, 9, 16, 23, 5, 19];
      var showN = function (n) { cellsC.forEach(function (c, i) { c.classList.toggle('on', i < n); c.classList.toggle('r', i < n && reds.indexOf(i) > -1); }); bn.textContent = n; };
      if (motion) {
        var o = { n: 0 };
        var btl = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.6 })
          .to(o, { n: 28, duration: 2.6, ease: 'power1.inOut', onUpdate: function () { showN(Math.round(o.n)); } })
          .to({}, { duration: 1.6 }).call(function () { o.n = 0; showN(0); });
        inView('.b-batch', function () { btl.play(); }, function () { btl.pause(); });
        $('.b-batch').addEventListener('pointerenter', function () { btl.timeScale(2.2); });
        $('.b-batch').addEventListener('pointerleave', function () { btl.timeScale(1); });
      } else showN(28);
    }

    // captions: typed on, deleted, next
    var ty = $('[data-typer]');
    if (ty && motion) {
      var lines = ['Cardamom buns are out. Two trays, usually gone by ten.', 'If you’re in before ten, ask Sam about the new beans.', 'Rainy one. Soup’s on, and the window seat is free.', 'Last tray, honestly. Back tomorrow at 7.'];
      var li = 0, tw = { n: 0 };
      var caret = gsap.to('.caret', { opacity: 0, duration: 0.45, repeat: -1, yoyo: true, ease: 'steps(1)', paused: true });
      var typeLoop = function () {
        var s = lines[li];
        gsap.timeline({ onComplete: function () { li = (li + 1) % lines.length; typeLoop(); } })
          .fromTo(tw, { n: 0 }, { n: s.length, duration: s.length * 0.045, ease: 'none', onUpdate: function () { ty.textContent = s.slice(0, Math.round(tw.n)); } })
          .to({}, { duration: 1.6 })
          .to(tw, { n: 0, duration: s.length * 0.012, ease: 'none', onUpdate: function () { ty.textContent = s.slice(0, Math.round(tw.n)); } });
      };
      var started = false;
      inView('.b-capt', function () { caret.play(); if (!started) { started = true; typeLoop(); } }, function () { caret.pause(); });
    }

    // chat: 24 seats, people talking
    var dz = $('[data-dots24]');
    if (dz) {
      var said = ['hi!', 'posted', '+1', 'help?', 'nice', '☕', 'done', '?'];
      for (var j = 0; j < 24; j++) { var dt = d.createElement('i'); dt.innerHTML = '<b>' + said[j % said.length] + '</b>'; dz.appendChild(dt); }
      if (motion) {
        var dots = $$('i', dz), rr = SBPosts.rng(5), chatOn = false;
        var talk = function () {
          if (!chatOn) return;
          var b = $('b', dots[Math.floor(rr() * 24)]);
          gsap.timeline().to(b, { scale: 1, duration: 0.3, ease: 'back.out(3)' }).to(b, { scale: 0, duration: 0.25, delay: 0.9 });
          gsap.delayedCall(0.55, talk);
        };
        inView('.b-chat', function () { if (!chatOn) { chatOn = true; talk(); } }, function () { chatOn = false; });
        $('.b-chat').addEventListener('pointerenter', function () { gsap.fromTo(dots, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', stagger: { each: 0.02, from: 'random' } }); });
      }
    }

    // kit: camera flash
    if (motion) $('.b-kit').addEventListener('pointerenter', function () {
      gsap.fromTo('.kit-phone .flash', { boxShadow: '0 0 0 0 rgba(255,244,214,1)' }, { boxShadow: '0 0 0 60px rgba(255,244,214,0)', duration: 0.6, ease: 'power2.out' });
      gsap.fromTo('.b-kit .b-in', { backgroundColor: '#FFFFFF' }, { backgroundColor: '#FAF5EA', duration: 0.5 });
    });

    // expandable tiles (Flip)
    $$('.b-open').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tile = btn.closest('.b-tile'), open = !tile.classList.contains('is-open');
        var state = W.Flip && motion ? Flip.getState(tiles) : null;
        tiles.forEach(function (t) {
          var o = t === tile ? open : false, b = $('.b-open', t), more = $('.b-more', t);
          t.classList.toggle('is-open', o);
          if (b) b.setAttribute('aria-expanded', o ? 'true' : 'false');
          if (more) more.hidden = !o;
          gsap.set($('.b-in', t), { '--rx': '0deg', '--ry': '0deg', '--go': 0 });
        });
        if (state) {
          Flip.from(state, { duration: 0.75, ease: 'power3.inOut', onComplete: function () { ScrollTrigger.refresh(); } });
          if (open) gsap.fromTo($('.b-more', tile).children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, delay: 0.35, ease: 'power3.out' });
        } else if (hasG) ScrollTrigger.refresh();
        if (open) { var r = tile.getBoundingClientRect(); if (r.top < 70 || r.top > W.innerHeight * 0.5) { var y = W.scrollY + r.top - 90; if (lenis) lenis.scrollTo(y, { duration: 0.9 }); else W.scrollTo({ top: y, behavior: motion && !capture ? 'smooth' : 'auto' }); } }
      });
    });
  })();

  /* ---------------- sound (WebAudio only, off by default) ---------------- */
  var audio = { on: false, ctx: null };
  function blip(freq, len, type, vol) {
    if (!audio.on) return;
    try {
      if (!audio.ctx) audio.ctx = new (W.AudioContext || W.webkitAudioContext)();
      var c = audio.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = type || 'triangle'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (len || 0.15));
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + (len || 0.15) + 0.02);
    } catch (e) { }
  }
  var stg = $('[data-sound]');
  if (stg) stg.addEventListener('click', function () {
    audio.on = !audio.on; stg.setAttribute('aria-pressed', audio.on ? 'true' : 'false');
    $('[data-sound-l]', stg).textContent = audio.on ? 'Sound on' : 'Sound off';
    if (audio.on) blip(660, 0.12);
  });

  /* ---------------- 20-minute planner ---------------- */
  (function planner() {
    var sec = $('#planner'); if (!sec) return;
    var tray = $('[data-tray]'), jobs = $$('.job', tray), slots = $$('.slot', sec);
    var fill = $('[data-fill]'), segs = $('[data-segs]'), minsEl = $('[data-mins]'), msg = $('[data-msg]'), done = $('[data-done]'), cv = $('[data-beans]');
    var shown = { m: 0 }, complete = false;
    jobs.forEach(function (j, i) { j._i = i; j._min = +j.getAttribute('data-min'); j._name = j.getAttribute('data-name'); });
    function slotOf(j) { return j.closest('.slot'); }
    function freeSlot() { for (var i = 0; i < slots.length; i++) if (!$('.job', slots[i])) return slots[i]; return null; }
    function total() { return jobs.reduce(function (a, j) { return a + (slotOf(j) ? j._min : 0); }, 0); }
    function flipMove(j, fn) {
      var a = j.getBoundingClientRect(); fn(); var b = j.getBoundingClientRect();
      if (motion) gsap.fromTo(j, { x: a.left - b.left, y: a.top - b.top, rotate: (a.left - b.left) > 0 ? -4 : 4 }, { x: 0, y: 0, rotate: 0, duration: 0.6, ease: 'back.out(1.5)', clearProps: 'transform' });
    }
    function toTray(j) {
      flipMove(j, function () {
        var after = null; jobs.forEach(function (o) { if (o.parentNode === tray && o._i > j._i && (!after || o._i < after._i)) after = o; });
        tray.insertBefore(j, after); j.classList.remove('placed');
      });
    }
    function toSlot(j, s) {
      var other = $('.job', s); if (other && other !== j) toTray(other);
      flipMove(j, function () { $('.slot-drop', s).appendChild(j); j.classList.add('placed'); });
      s.classList.add('full');
      if (motion) gsap.fromTo($('.slot-drop', s), { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, .45)' });
    }
    function sync(text) {
      slots.forEach(function (s) { s.classList.toggle('full', !!$('.job', s)); });
      var t = total();
      // segments in slot order
      segs.innerHTML = '';
      slots.forEach(function (s) { var j = $('.job', s); if (!j) return; var sp = d.createElement('span'); sp.style.width = (j._min / 20 * 100) + '%'; sp.textContent = j._min + '′ ' + j._name.split(' ')[0].toLowerCase(); segs.appendChild(sp); });
      if (motion) {
        gsap.to(fill, { scaleX: t / 20, duration: 0.8, ease: 'power3.out' });
        gsap.to(shown, { m: t, duration: 0.8, ease: 'power2.out', onUpdate: function () { minsEl.textContent = Math.round(shown.m); } });
        gsap.fromTo(segs.children, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.3 });
      } else { fill.style.transform = 'scaleX(' + t / 20 + ')'; minsEl.textContent = t; }
      var placed = jobs.filter(slotOf).length;
      msg.textContent = text || (placed === 0 ? 'Nothing placed yet. The day is still yours.' : placed < 4 ? (4 - placed) + ' job' + (4 - placed > 1 ? 's' : '') + ' left. ' + t + ' of 20 minutes planned.' : 'All four jobs placed.');
      if (t >= 20 && !complete) celebrate();
      if (t < 20 && complete) { complete = false; hideDone(); }
    }
    function hideDone() { if (motion) gsap.to(done, { opacity: 0, y: 10, duration: 0.25, onComplete: function () { done.hidden = true; ScrollTrigger.refresh(); } }); else done.hidden = true; }
    function celebrate() {
      complete = true; done.hidden = false;
      blip(523, 0.25, 'sine', 0.14); setTimeout(function () { blip(659, 0.25, 'sine', 0.14); }, 110); setTimeout(function () { blip(784, 0.5, 'sine', 0.16); }, 220);
      if (!motion) return;
      var tl = gsap.timeline();
      tl.fromTo(fill, { '--sh': '-240px' }, { '--sh': '1400px', duration: 1.1, ease: 'power2.inOut' }, 0.3)
        .fromTo(done, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.2)
        .fromTo('.done-stamp', { scale: 2.6, rotate: -50, opacity: 0 }, { scale: 1, rotate: -12, opacity: 1, duration: 0.6, ease: 'back.out(2.4)' }, 0.45)
        .fromTo('.done-h', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power2.inOut' }, 0.6)
        .fromTo('.done-s, .done-cta', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, 1.0)
        .fromTo('.bar-track', { scale: 1 }, { scale: 1.03, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }, 0.3);
      beans();
      ScrollTrigger.refresh();
    }
    function beans() {
      var r = sec.getBoundingClientRect(), bar = $('.bar-track').getBoundingClientRect();
      var dpr = Math.min(2, W.devicePixelRatio || 1);
      cv.width = r.width * dpr; cv.height = r.height * dpr; var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rnd = SBPosts.rng(42), ps = [];
      var ox = bar.left - r.left, oy = bar.top - r.top + bar.height / 2;
      for (var i = 0; i < 90; i++) ps.push({ x: ox + rnd() * bar.width, y: oy, vx: (rnd() - 0.5) * 7, vy: -6 - rnd() * 10, a: rnd() * 6, va: (rnd() - 0.5) * 0.4, s: 5 + rnd() * 5, c: ['#4A2E1F', '#2B1B13', '#C8874E', '#F2C46B', '#E04A2D'][Math.floor(rnd() * 5)], k: rnd() < 0.75 ? 'bean' : 'star' });
      var st = { t: 0 };
      gsap.to(st, { t: 1, duration: 2.6, ease: 'none', onUpdate: function () {
        x.clearRect(0, 0, r.width, r.height);
        ps.forEach(function (p) {
          p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
          x.save(); x.globalAlpha = Math.max(0, 1 - Math.max(0, st.t - 0.6) / 0.4); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c;
          if (p.k === 'bean') { x.beginPath(); x.ellipse(0, 0, p.s, p.s * 0.68, 0, 0, 6.29); x.fill(); x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-p.s * 0.7, 0); x.quadraticCurveTo(0, p.s * 0.25, p.s * 0.7, 0); x.stroke(); }
          else { x.fillRect(-p.s * 0.6, -1.2, p.s * 1.2, 2.4); x.fillRect(-1.2, -p.s * 0.6, 2.4, p.s * 1.2); }
          x.restore();
        });
      }, onComplete: function () { x.clearRect(0, 0, r.width, r.height); } });
    }
    // click / keyboard
    jobs.forEach(function (j) {
      j.addEventListener('click', function () {
        if (j._dragged) { j._dragged = false; return; }
        if (slotOf(j)) { toTray(j); blip(330, 0.1); sync('Took “' + j._name + '” off the day. ' + (total()) + ' of 20 minutes planned.'); }
        else { var s = freeSlot(); if (!s) return; toSlot(j, s); blip(440 + total() * 22, 0.12); sync('Placed “' + j._name + '” at ' + s.getAttribute('data-slot').toLowerCase() + '. ' + total() + ' of 20 minutes planned.'); }
      });
      // drag
      j.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        var sx = e.clientX, sy = e.clientY, dragging = false, over = null;
        j.setPointerCapture(e.pointerId);
        function hit(x, y) { for (var i = 0; i < slots.length; i++) { var r = $('.slot-drop', slots[i]).getBoundingClientRect(); if (x > r.left - 16 && x < r.right + 16 && y > r.top - 24 && y < r.bottom + 24) return slots[i]; } return null; }
        function mv(ev) {
          var dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (!dragging && Math.hypot(dx, dy) > 6) { dragging = true; j.classList.add('dragging'); slots.forEach(function (s) { s.classList.add('target'); }); }
          if (!dragging) return;
          gsap.set(j, { x: dx, y: dy, rotate: clamp(dx * 0.03, -6, 6), scale: 1.04 });
          var h = hit(ev.clientX, ev.clientY); if (h !== over) { if (over) over.classList.remove('over'); over = h; if (over) over.classList.add('over'); }
        }
        function up() {
          j.removeEventListener('pointermove', mv); j.removeEventListener('pointerup', up); j.removeEventListener('pointercancel', up);
          slots.forEach(function (s) { s.classList.remove('target', 'over'); });
          if (!dragging) return;
          j._dragged = true; setTimeout(function () { j._dragged = false; }, 50);
          j.classList.remove('dragging');
          if (over) { toSlot(j, over); blip(440 + total() * 22, 0.12); sync('Placed “' + j._name + '” at ' + over.getAttribute('data-slot').toLowerCase() + '. ' + total() + ' of 20 minutes planned.'); }
          else if (slotOf(j) && W.innerWidth > 0) { gsap.set(j, { clearProps: 'transform' }); toTray(j); sync(); }
          else gsap.to(j, { x: 0, y: 0, rotate: 0, scale: 1, duration: 0.5, ease: 'back.out(2)', clearProps: 'transform' });
        }
        j.addEventListener('pointermove', mv); j.addEventListener('pointerup', up); j.addEventListener('pointercancel', up);
      });
    });
    $('[data-reset]').addEventListener('click', function () { jobs.filter(slotOf).forEach(toTray); sync('Fresh day. Nothing placed yet.'); jobs[0].focus(); });
    W.__planner = { placeAll: function () { jobs.forEach(function (j) { if (!slotOf(j)) j.click(); }); } };
  })();

  /* ---------------- horizontal curriculum with parallax ---------------- */
  (function curriculum() {
    if (!motion) return;
    var track = $('.cur-track'), fillR = $('.rail-fill');
    function dist() { return Math.max(0, track.scrollWidth - W.innerWidth); }
    var tw = gsap.to(track, { x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: '.curric', start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: capture ? true : 0.6, invalidateOnRefresh: true,
        onUpdate: function (s) { fillR.style.transform = 'scaleX(' + s.progress.toFixed(4) + ')'; } } });
    $$('.wk').forEach(function (wk) {
      $$('[data-depth]', wk).forEach(function (pl) {
        var dp = +pl.getAttribute('data-depth');
        gsap.fromTo(pl, { x: dp * 110, rotate: dp * 4 }, { x: -dp * 110, rotate: -dp * 4, ease: 'none', scrollTrigger: { trigger: wk, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
      });
      var n = $('.wk-n', wk);
      if (n) gsap.fromTo(n, { x: 60, skewX: -10 }, { x: -30, skewX: 6, ease: 'none', scrollTrigger: { trigger: wk, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    });
  })();

  /* ---------------- pricing: view toggle + magnetic buttons ---------------- */
  (function pricing() {
    var seg = $('.seg'), pill = $('.seg-pill'), plans = $('[data-plans]'), cmp = $('[data-compare]');
    if (!seg) return;
    var btns = $$('button', seg);
    function place(b, inst) { var o = { x: b.offsetLeft - 5, width: b.offsetWidth }; if (hasG && !inst) gsap.to(pill, { x: o.x, width: o.width, duration: 0.5, ease: 'back.out(1.6)' }); else { pill.style.transform = 'translateX(' + o.x + 'px)'; pill.style.width = o.width + 'px'; } }
    function cur() { return btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0]; }
    place(cur(), true);
    if (d.fonts) d.fonts.ready.then(function () { place(cur(), true); });
    W.addEventListener('resize', function () { place(cur(), true); });
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-pressed') === 'true') return;
        btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); place(b);
        var toCmp = b.getAttribute('data-view') === 'compare', from = toCmp ? plans : cmp, to = toCmp ? cmp : plans;
        if (!motion) { from.hidden = true; to.hidden = false; return; }
        gsap.to(from, { opacity: 0, y: 16, duration: 0.25, ease: 'power2.in', onComplete: function () {
          from.hidden = true; gsap.set(from, { clearProps: 'all' }); to.hidden = false;
          if (toCmp) { gsap.fromTo(cmp, { opacity: 0 }, { opacity: 1, duration: 0.3 }); gsap.fromTo($$('tr', cmp), { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'power3.out' }); }
          else gsap.fromTo($$('.plan', plans), { y: 40, opacity: 0, rotate: function (i) { return [-3, 0, 3][i]; } }, { y: 0, opacity: 1, rotate: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(1.5)', clearProps: 'transform' });
          ScrollTrigger.refresh();
        } });
      });
    });
  })();
  if (motion && (finePointer || capture)) {
    $$('.magnetic').forEach(function (b) {
      var inner = $('span', b);
      var bx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' }), byq = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
      var ix = gsap.quickTo(inner, 'x', { duration: 0.5, ease: 'power3.out' }), iy = gsap.quickTo(inner, 'y', { duration: 0.5, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); bx(dx * 0.28); byq(dy * 0.4); ix(dx * 0.12); iy(dy * 0.16); });
      b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, .35)', overwrite: 'auto' }); gsap.to(inner, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, .35)', overwrite: 'auto' }); });
    });
  }

  /* ---------------- coffee-ring cursor ---------------- */
  (function cursor() {
    if (!(motion && (finePointer || capture))) return;
    root.classList.add('has-cursor');
    var c = $('.cursor'), ring = $('.cursor-ring'), dot = $('.cursor-dot'), label = $('.cursor-label');
    var qx = gsap.quickTo(c, 'x', { duration: 0.16, ease: 'power3.out' }), qy = gsap.quickTo(c, 'y', { duration: 0.16, ease: 'power3.out' });
    var active = null, spin = gsap.to(ring, { rotate: 360, duration: 9, repeat: -1, ease: 'none', paused: true });
    gsap.set(c, { x: -100, y: -100 });
    var lx = -100, ly = -100, scrollQ = false;
    W.addEventListener('scroll', function () {
      if (scrollQ) return; scrollQ = true;
      gsap.delayedCall(0.05, function () {
        scrollQ = false; var el = d.elementFromPoint(lx, ly); if (!el) return;
        morph(el.closest('[data-cursor], a, button, summary') || null);
        c.classList.toggle('on-dark-bg', !!el.closest('.board, .feed, .foot, .marquee, .t-price, .wk2, .wk4, .wk6, .wk-end'));
      });
    }, { passive: true });
    d.addEventListener('pointermove', function (e) {
      var x = e.clientX, y = e.clientY; lx = x; ly = y;
      if (active && active.classList.contains('magnetic')) { var r = active.getBoundingClientRect(); x += ((r.left + r.width / 2) - x) * 0.25; y += ((r.top + r.height / 2) - y) * 0.25; }
      qx(x); qy(y);
    });
    function morph(t) {
      if (t === active) return; active = t;
      if (t) {
        var lab = t.getAttribute('data-cursor') || 'Open', btn = t.classList.contains('btn'), cta = t.classList.contains('btn-cta'), big = cta ? 1.2 : btn ? 1 : t.classList.contains('job') ? 0.8 : 0.9;
        label.textContent = lab;
        gsap.to(ring, { scale: big, opacity: 1, duration: 0.45, ease: 'back.out(2)', overwrite: 'auto', '--ring': cta ? '#F6E9D2' : '#C8874E', '--ring-fill': cta ? 'rgba(255,248,238,.10)' : 'rgba(200,135,78,.16)' });
        gsap.to(dot, { scale: btn ? 0.55 : 0.35, duration: 0.3, overwrite: 'auto' });
        gsap.to(label, { opacity: btn ? 0 : 1, scale: btn ? 0.6 : 1, duration: 0.35, ease: 'back.out(2)', overwrite: 'auto' });
        spin.play();
      } else {
        gsap.to(ring, { scale: 0, opacity: 0, duration: 0.35, ease: 'power3.in', overwrite: 'auto' });
        gsap.to(dot, { scale: 1, duration: 0.35, ease: 'back.out(3)', overwrite: 'auto' });
        gsap.to(label, { opacity: 0, scale: 0.6, duration: 0.2, overwrite: 'auto' });
        spin.pause();
      }
    }
    d.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor], a, button, summary');
      morph(t || null);
      var dark = e.target.closest && e.target.closest('.board, .feed, .foot, .marquee, .t-price, .wk2, .wk4, .wk6, .wk-end');
      c.classList.toggle('on-dark-bg', !!dark);
    });
    d.addEventListener('pointerdown', function () { gsap.to(dot, { scale: active ? 0.2 : 0.7, duration: 0.15 }); gsap.to(ring, { scale: '-=0.12', duration: 0.15 }); });
    d.addEventListener('pointerup', function () { if (active) { gsap.to(ring, { scale: active.classList.contains('btn-cta') ? 1.15 : 0.9, duration: 0.4, ease: 'back.out(3)' }); gsap.to(dot, { scale: 0.35, duration: 0.3 }); } else gsap.to(dot, { scale: 1, duration: 0.3, ease: 'back.out(3)' }); });
    d.addEventListener('pointerleave', function () { gsap.to(c, { opacity: 0, duration: 0.2 }); });
    d.addEventListener('pointerenter', function () { gsap.to(c, { opacity: 1, duration: 0.2 }); });
  })();

  /* ---------------- FAQ: smooth height ---------------- */
  $$('.acc details').forEach(function (det, _, all) {
    var sum = $('summary', det), body = $('.acc-b', det);
    sum.addEventListener('click', function (e) {
      if (!motion) return;
      e.preventDefault();
      if (det.open) {
        gsap.fromTo(body, { height: body.offsetHeight }, { height: 0, duration: 0.45, ease: 'power3.inOut', onComplete: function () { det.open = false; gsap.set(body, { clearProps: 'height' }); ScrollTrigger.refresh(); } });
      } else {
        $$('.acc details').forEach(function (o) { if (o !== det && o.open) { var b = $('.acc-b', o); gsap.fromTo(b, { height: b.offsetHeight }, { height: 0, duration: 0.4, ease: 'power3.inOut', onComplete: function () { o.open = false; gsap.set(b, { clearProps: 'height' }); } }); } });
        det.open = true; var h = body.offsetHeight;
        gsap.fromTo(body, { height: 0 }, { height: h, duration: 0.55, ease: 'power3.out', onComplete: function () { gsap.set(body, { clearProps: 'height' }); ScrollTrigger.refresh(); } });
        gsap.fromTo($('p', body), { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: 0.1 });
      }
    });
  });

  /* ---------------- sticky mobile CTA ---------------- */
  (function sticky() {
    var bar = $('.sticky-cta'); if (!bar) return;
    var hero = $('.hero'), hide = [$('#pricing'), $('#close')];
    function upd() {
      var hb = hero.getBoundingClientRect().bottom, vh = W.innerHeight;
      var over = hide.some(function (s) { var r = s.getBoundingClientRect(); return r.top < vh * 0.8 && r.bottom > vh * 0.2; });
      var on = hb < 0 && !over; bar.classList.toggle('show', on);
      bar.setAttribute('aria-hidden', on ? 'false' : 'true'); $('a', bar).tabIndex = on ? 0 : -1;
    }
    W.addEventListener('scroll', upd, { passive: true }); W.addEventListener('resize', upd); upd();
  })();

  /* ---------------- checkout stand-in ---------------- */
  (function checkout() {
    var dlg = $('#checkout'); if (!dlg || !dlg.showModal) return;
    $$('[data-checkout]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var plan = a.getAttribute('data-checkout') || 'Live cohort', price = a.getAttribute('data-price') || '249';
        $('[data-co-plan]', dlg).textContent = plan; $('[data-co-price]', dlg).textContent = price;
        dlg.showModal(); if (lenis) lenis.stop();
        if (motion) gsap.fromTo(dlg, { y: 30, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' });
      });
    });
    dlg.addEventListener('close', function () { if (lenis) lenis.start(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  })();

  /* ---------------- go ---------------- */
  heroIntro();
  // posts with chalk lettering are repainted once the handwriting font is ready
  if (d.fonts && d.fonts.load) d.fonts.load('700 20px "Caveat Variable"').then(function () { $$('canvas').forEach(function (c) { if (c._args) SBPosts.paint(c); }); });
  if (hasG) {
    var refresh = function () { ScrollTrigger.refresh(); };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(refresh);
    W.addEventListener('load', refresh);
  }
})();
