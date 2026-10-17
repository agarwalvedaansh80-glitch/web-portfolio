/* Ondé site runtime: smooth scroll, cursor/lens, kinetic type, scroll scenes,
   pigment fluid, services menu, colour-route game, page washes. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var Q = new URLSearchParams(location.search);
  var CAPTURE = Q.has('capture');
  var RM = !CAPTURE && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches || (CAPTURE && !matchMedia('(pointer: coarse)').matches);
  html.classList.add('js');
  if (CAPTURE) html.classList.add('capture');
  if (RM) html.classList.add('rm');
  if (FINE && !RM) html.classList.add('has-cursor');
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var E = {
    out: function (t) { return 1 - Math.pow(1 - t, 4); },
    expo: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    io: function (t) { return t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  };
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { } }
  };

  /* ---------- main loop + tweens ---------- */
  var ticks = [], tweens = [], VH = innerHeight, VW = innerWidth, now0 = 0;
  function tween(o) { o.t0 = null; o.dur = RM ? 1 : (o.dur || 800); o.delay = RM ? 0 : (o.delay || 0); tweens.push(o); return o; }
  function runTweens(t) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var o = tweens[i]; if (o.t0 === null) o.t0 = t + o.delay;
      if (t < o.t0) continue;
      var p = clamp((t - o.t0) / o.dur, 0, 1); o.update((o.ease || E.out)(p), p);
      if (p >= 1) { tweens.splice(i, 1); if (o.done) o.done(); }
    }
  }
  // Capture mode: drive CSS animations/transitions from the (virtual) rAF clock so frame-stepped recordings are smooth.
  var virt = null;
  if (CAPTURE && doc.getAnimations) {
    var starts = new WeakMap();
    virt = function (t) {
      var list = doc.getAnimations();
      for (var i = 0; i < list.length; i++) {
        var a = list[i];
        if (!starts.has(a)) { starts.set(a, t); try { a.pause(); } catch (e) { } }
        try { a.currentTime = t - starts.get(a); } catch (e) { }
      }
    };
  }
  var lenis = null;
  if (!RM && !CAPTURE && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.95 });
  }
  function loop(t) {
    if (lenis) lenis.raf(t);
    runTweens(t);
    for (var i = 0; i < ticks.length; i++) ticks[i](t);
    if (virt) virt(t);
    requestAnimationFrame(loop);
  }
  addEventListener('resize', function () { VH = innerHeight; VW = innerWidth; });
  function scrollToY(y) { if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else window.scrollTo({ top: y, behavior: RM || CAPTURE ? 'auto' : 'smooth' }); }
  function scrollToEl(el, off) { var y = el.getBoundingClientRect().top + scrollY - (off || 0); scrollToY(y); }

  /* ---------- pointer ---------- */
  var M = { x: VW * 0.6, y: VH * 0.5, px: 0, py: 0, moved: false, inside: true };
  addEventListener('pointermove', function (e) { M.x = e.clientX; M.y = e.clientY; M.moved = true; M.inside = true; M.type = e.pointerType; }, { passive: true });
  doc.addEventListener('pointerleave', function () { M.inside = false; });
  addEventListener('blur', function () { M.inside = false; });

  /* ---------- cursor ---------- */
  var cur = $('.cur'), ring = cur && $('.cur-ring', cur), dot = cur && $('.cur-dot', cur);
  var C = { x: M.x, y: M.y, s: 36, ts: 36, state: '', lensR: 0 };
  if (cur && html.classList.contains('has-cursor')) {
    if (!CAPTURE) cur.classList.add('is-hidden');
    doc.addEventListener('pointerover', function (e) {
      var el = e.target.closest ? e.target : null; if (!el) return;
      var tgt = el.closest('[data-cursor]'), st = tgt ? tgt.getAttribute('data-cursor') : '';
      if (!st && el.closest('a,button,label,summary,input,select,textarea,.slot,.day')) st = 'link';
      if (el.closest('input[type=text],input[type=email],input[type=tel],textarea,input:not([type])')) st = 'text';
      if (el.closest('button:disabled')) st = '';
      C.state = st;
      cur.classList.toggle('is-book', st === 'book');
      cur.classList.toggle('is-lens', st === 'lens');
      cur.classList.toggle('is-img', st === 'lens' && !el.closest('[data-lens]'));
      cur.classList.toggle('on-dark', !!el.closest('[data-theme=dark]'));
      cur.classList.toggle('is-text', st === 'text');
    });
    ticks.push(function () {
      if (M.moved && M.inside) cur.classList.remove('is-hidden'); else if (!CAPTURE && !M.inside) cur.classList.add('is-hidden');
      var k = CAPTURE ? 0.3 : 0.2;
      C.x += (M.x - C.x) * k; C.y += (M.y - C.y) * k;
      C.ts = C.state === 'book' ? 104 : C.state === 'lens' ? (C.lensR ? C.lensR * 2 : 150) : C.state === 'link' ? 58 : C.state === 'text' ? 0 : 36;
      C.s += (C.ts - C.s) * 0.18;
      ring.style.width = ring.style.height = C.s.toFixed(1) + 'px';
      ring.style.margin = (-C.s / 2).toFixed(1) + 'px 0 0 ' + (-C.s / 2).toFixed(1) + 'px';
      ring.style.transform = 'translate3d(' + C.x.toFixed(1) + 'px,' + C.y.toFixed(1) + 'px,0)';
      dot.style.transform = 'translate3d(' + M.x + 'px,' + M.y + 'px,0)';
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (FINE && !RM) {
    $$('[data-magnetic]').forEach(function (b) {
      var x = 0, y = 0;
      ticks.push(function () {
        var r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = M.x - cx, dy = M.y - cy, near = Math.abs(dx) < r.width / 2 + 50 && Math.abs(dy) < r.height / 2 + 40;
        var tx = near ? dx * 0.28 : 0, ty = near ? dy * 0.35 : 0;
        x += (tx - x) * 0.15; y += (ty - y) * 0.15;
        if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) b.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
        else if (b.style.transform) b.style.transform = '';
      });
    });
  }

  /* ---------- header + menu ---------- */
  var hdr = $('[data-hdr]'), lastY = 0;
  var darks = $$('[data-theme=dark]');
  if (hdr) ticks.push(function () {
    var y = scrollY;
    hdr.classList.toggle('is-scrolled', y > 40);
    var menuOpen = html.classList.contains('menu-open');
    if (!menuOpen && y > 700 && y > lastY + 2) hdr.classList.add('is-hidden');
    else if (y < lastY - 2 || y < 700 || menuOpen) hdr.classList.remove('is-hidden');
    lastY = y;
    var on = false;
    for (var i = 0; i < darks.length; i++) { var r = darks[i].getBoundingClientRect(); if (r.top <= 44 && r.bottom >= 44) { on = true; break; } }
    hdr.classList.toggle('on-dark', on && !menuOpen);
  });
  var mbtn = $('.menu-btn'), menu = $('#menu');
  if (mbtn && menu) {
    var setMenu = function (open) {
      mbtn.setAttribute('aria-expanded', open); $('.sr', mbtn).textContent = open ? 'Close menu' : 'Open menu';
      html.classList.toggle('menu-open', open);
      if (open) { menu.hidden = false; requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('is-open'); }); }); if (lenis) lenis.stop(); }
      else { menu.classList.remove('is-open'); setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 800); if (lenis) lenis.start(); }
    };
    mbtn.addEventListener('click', function () { setMenu(mbtn.getAttribute('aria-expanded') !== 'true'); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && html.classList.contains('menu-open')) { setMenu(false); mbtn.focus(); } });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  }

  /* ---------- text splitting ---------- */
  function splitWords(el, cls) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = doc.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var w = doc.createElement('span'); w.className = cls;
            if (cls === 'w') { var inn = doc.createElement('span'); inn.textContent = p; inn.style.setProperty('--i', i); w.appendChild(inn); }
            else { w.textContent = p; w.style.setProperty('--i', i); }
            i++; frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    return i;
  }

  /* ---------- kinetic headline ---------- */
  var kin = [];
  $$('[data-kinetic]').forEach(function (h) {
    var chars = [];
    $$('.l', h).forEach(function (l) {
      var wrap = doc.createElement('span'); wrap.className = 'li';
      while (l.firstChild) wrap.appendChild(l.firstChild); l.appendChild(wrap);
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = doc.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (wd) {
              if (!wd) return;
              if (/^\s+$/.test(wd)) { frag.appendChild(doc.createTextNode(' ')); return; }
              var ws = doc.createElement('span'); ws.style.display = 'inline-block'; ws.style.whiteSpace = 'nowrap';
              Array.from(wd).forEach(function (c) { var s = doc.createElement('span'); s.className = 'ch'; s.textContent = c; ws.appendChild(s); chars.push(s); });
              frag.appendChild(ws);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1) walk(n);
        });
      })(wrap);
    });
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    kin.push({ h: h, chars: chars, w: chars.map(function () { return 400; }), ready: false, hero: !!h.closest('.hero') });
  });
  function playIntro(delay) {
    kin.forEach(function (k) {
      k.h.classList.add('is-ready');
      var n = k.chars.length;
      k.chars.forEach(function (c) { c.style.transform = 'translate3d(0,110%,0) rotate(6deg)'; });
      tween({
        dur: 1300 + n * 26, delay: delay, ease: function (x) { return x; }, update: function (_, p) {
          var T = p * (1300 + n * 26);
          for (var i = 0; i < n; i++) {
            var q = E.expo(clamp((T - i * 26) / 1300, 0, 1));
            k.chars[i].style.transform = q >= 1 ? '' : 'translate3d(0,' + ((1 - q) * 110).toFixed(2) + '%,0) rotate(' + ((1 - q) * 6).toFixed(2) + 'deg)';
          }
        }, done: function () { k.ready = true; }
      });
    });
    $$('[data-intro]').forEach(function (el, i) { setTimeout(function () { el.classList.add('in'); }, RM ? 0 : delay + 350 + i * 140); });
    var fr = $('.lens-frame');
    if (fr && !RM) {
      fr.style.clipPath = 'inset(100% 0 0 0 round 999px 999px 6px 6px)';
      var im = $$('img', fr);
      tween({
        dur: 1600, delay: delay + 250, ease: E.io, update: function (e) {
          fr.style.clipPath = 'inset(' + ((1 - e) * 100).toFixed(2) + '% 0 0 0)';
          im.forEach(function (i) { i.style.transform = 'scale(' + (1 + (1 - e) * 0.18).toFixed(4) + ')'; });
        }, done: function () { fr.style.clipPath = ''; im.forEach(function (i) { i.style.transform = ''; }); }
      });
    }
  }
  // variable-weight "living type" near the cursor (hero headline)
  if (FINE && !RM) ticks.push(function () {
    for (var j = 0; j < kin.length; j++) {
      var k = kin[j]; if (!k.ready || !k.hero) continue;
      var hr = k.h.getBoundingClientRect(); if (hr.bottom < 0 || hr.top > VH) continue;
      var near = M.y > hr.top - 160 && M.y < hr.bottom + 160;
      for (var i = 0; i < k.chars.length; i++) {
        var tw = 400;
        if (near) { var r = k.chars[i].getBoundingClientRect(); var d = Math.hypot(r.left + r.width / 2 - M.x, r.top + r.height / 2 - M.y); tw = 400 + 300 * Math.pow(Math.max(0, 1 - d / 240), 2); }
        var w = k.w[i] + (tw - k.w[i]) * 0.14;
        if (Math.abs(w - k.w[i]) > 0.3 || (w !== 400 && Math.abs(w - 400) < 0.3)) {
          k.w[i] = Math.abs(w - 400) < 0.3 ? 400 : w;
          k.chars[i].style.fontWeight = k.w[i] === 400 ? '' : k.w[i].toFixed(1);
        }
      }
    }
  });

  /* ---------- reveals ---------- */
  $$('[data-reveal=words]').forEach(function (el) { splitWords(el, 'w'); });
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;
  $$('[data-reveal]').forEach(function (el) { if (io && !RM) io.observe(el); else el.classList.add('in'); });

  /* ---------- scroll scenes ---------- */
  var mf = $('[data-scrub-words]');
  if (mf) {
    var nW = splitWords(mf, 'sw'), sws = $$('.sw', mf), lastMf = -1;
    if (RM) sws.forEach(function (s) { s.style.setProperty('--o', 1); });
    else ticks.push(function () {
      var r = mf.getBoundingClientRect(); if (r.bottom < -50 || r.top > VH + 50) return;
      var p = clamp((VH * 0.82 - r.top) / (r.height + VH * 0.3), 0, 1);
      if (Math.abs(p - lastMf) < 0.0005) return; lastMf = p;
      for (var i = 0; i < nW; i++) { var q = clamp((p * (nW + 5) - i) / 5, 0, 1); sws[i].style.setProperty('--o', (0.14 + 0.86 * q).toFixed(3)); }
    });
  }
  var steps = $('[data-steps]');
  if (steps) {
    var line = $('.vs-line', steps), lis = $$('li', steps);
    ticks.push(function () {
      var r = steps.getBoundingClientRect(); if (r.bottom < -100 || r.top > VH + 100) return;
      var p = RM ? 1 : clamp((VH * 0.62 - r.top) / r.height, 0, 1);
      line.style.setProperty('--p', p.toFixed(4));
      lis.forEach(function (li) { li.classList.toggle('on', RM || li.getBoundingClientRect().top < VH * 0.62); });
    });
  }
  var pars = $$('[data-parallax]');
  if (!RM && pars.length) ticks.push(function () {
    for (var i = 0; i < pars.length; i++) {
      var el = pars[i], r = el.parentNode.getBoundingClientRect(); if (r.bottom < -100 || r.top > VH + 100) continue;
      var f = parseFloat(el.getAttribute('data-parallax')) || 0.1, c = (r.top + r.height / 2 - VH / 2) / VH;
      el.style.transform = 'translate3d(0,' + (-c * f * 100).toFixed(2) + '%,0)';
    }
  });
  var wm = $('[data-wordmark]');
  if (wm && !RM) ticks.push(function () {
    var r = wm.getBoundingClientRect(); if (r.top > VH || r.bottom < 0) return;
    var p = clamp(1 - r.top / VH, 0, 1);
    wm.style.transform = 'translate3d(' + ((1 - p) * -8).toFixed(2) + '%,0,0)';
    wm.style.backgroundPosition = (p * 100).toFixed(1) + '% 0';
  });
  var heroEl = $('[data-hero]');
  if (heroEl && !RM) {
    var hc = $('.hero-copy', heroEl), ls = $('.lens-stage', heroEl);
    ticks.push(function () {
      var y = scrollY; if (y > VH * 1.2) return;
      if (hc) { hc.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)'; hc.style.opacity = clamp(1 - y / (VH * 0.75), 0, 1).toFixed(3); }
      if (ls) ls.style.transform = 'translate3d(0,' + (y * -0.06).toFixed(1) + 'px,0)';
    });
  }

  /* ---------- lens before/after ---------- */
  $$('[data-lens]').forEach(function (st) {
    var fr = $('.lens-frame', st), range = $('input[type=range]', st);
    var L = { x: 0, y: 0, r: 0, tr: 0, over: false };
    var R = 92;
    if (!html.classList.contains('has-cursor')) { st.classList.add('is-wipe'); }
    st.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' || CAPTURE) { L.over = true; st.classList.remove('is-wipe'); } });
    st.addEventListener('pointerleave', function () { L.over = false; });
    if (range) {
      var setWipe = function () { st.style.setProperty('--wipe', range.value + '%'); };
      range.addEventListener('input', function () { st.classList.add('is-wipe'); setWipe(); });
      range.addEventListener('focus', function () { st.classList.add('is-wipe'); setWipe(); });
      setWipe();
      // touch drag directly on the portrait
      var dragging = false;
      var dragTo = function (e) { var b = fr.getBoundingClientRect(); range.value = Math.round(clamp((e.clientX - b.left) / b.width, 0, 1) * 100); setWipe(); };
      fr.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { dragging = true; st.classList.add('is-wipe'); dragTo(e); } });
      fr.addEventListener('pointermove', function (e) { if (dragging) dragTo(e); });
      addEventListener('pointerup', function () { dragging = false; });
    }
    ticks.push(function () {
      if (st.classList.contains('is-wipe')) { C.lensR = 0; return; }
      var b = fr.getBoundingClientRect();
      var inFrame = L.over && M.x > b.left && M.x < b.right && M.y > b.top && M.y < b.bottom;
      L.tr = inFrame ? R : 0;
      L.r += (L.tr - L.r) * 0.16;
      // lens centre follows the eased cursor ring so the ring frames the reveal exactly
      var cx = (cur ? C.x : M.x) - b.left, cy = (cur ? C.y : M.y) - b.top;
      fr.style.setProperty('--lx', cx.toFixed(1) + 'px'); fr.style.setProperty('--ly', cy.toFixed(1) + 'px'); fr.style.setProperty('--lr', Math.max(0, L.r).toFixed(1) + 'px');
      if (L.over) C.lensR = L.r > 4 ? L.r : 0;
    });
  });

  /* ---------- fluid canvases ---------- */
  var fluids = [];
  if (window.OndeFluid && !Q.has('nofluid')) {
    $$('[data-fluid]').forEach(function (c) {
      var calm = c.getAttribute('data-fluid') === 'calm', fade = calm ? [0.15, 0.7, 0.45] : [0.18, 0.62, 0.32];
      var f = new window.OndeFluid(c, { calm: calm, fade: fade, palette: (c.getAttribute('data-palette') || '').split(',').filter(Boolean), still: RM, dprCap: CAPTURE ? 1 : 1.5, minFrame: CAPTURE ? 30 : 0, dyeRes: CAPTURE ? 512 : 0 });
      if (f.ok) fluids.push(f);
    });
    if (fluids.length) {
      var lastP = null;
      addEventListener('pointermove', function (e) {
        for (var i = 0; i < fluids.length; i++) {
          var f = fluids[i], r = f.c.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) continue;
          var x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
          if (lastP && lastP.f === f) { var dx = x - lastP.x, dy = y - lastP.y; if (Math.abs(dx) + Math.abs(dy) > 0.0004) f.move(x, y, dx * (r.width / r.height), dy); }
          lastP = { f: f, x: x, y: y };
        }
      }, { passive: true });
      ticks.push(function (t) { for (var i = 0; i < fluids.length; i++) fluids[i].frame(t); });
    }
  }
  var swatches = [];
  if (window.OndeSwatch && !Q.has('noswatch')) {
    $$('canvas.swatch').forEach(function (c) { var s = new window.OndeSwatch(c, c.getAttribute('data-swatch')); s.still = RM; c._sw = s; swatches.push(s); });
    ticks.push(function (t) { for (var i = 0; i < swatches.length; i++) { var s = swatches[i]; if (s.still) { if (!s._d || s.m < 1.1) { s.m = 1.2; s.t = 3; s.last = 0; s.frame(t); s._d = 1; } } else s.frame(t); } });
  }

  /* ---------- horizontal services menu ---------- */
  $$('[data-hscroll]').forEach(function (sec) {
    var sticky = $('.mx-sticky', sec), vp = $('.mx-viewport', sec), track = $('.mx-track', sec);
    var bar = $('.mx-bar i', sec), labels = $$('.mx-progress li', sec), cols = $$('.mx-col', sec), items = $$('.mx-item', sec);
    var sw = ($('canvas.swatch', sec) || {})._sw, now = $('.mx-now', sec);
    var dist = 0, pinned = false, lastHover = -1e9, curCol = -1, curItem = null;
    function layout() {
      pinned = VW > 960 && !RM;
      if (pinned) { dist = Math.max(0, track.scrollWidth - vp.clientWidth + 40); sec.style.height = (sticky.offsetHeight + dist) + 'px'; }
      else { sec.style.height = ''; track.style.transform = ''; }
    }
    layout(); addEventListener('resize', layout); addEventListener('load', layout);
    function show(it, auto) {
      if (it === curItem) return; curItem = it;
      items.forEach(function (x) { x.classList.toggle('is-on', x === it); });
      it.style.setProperty('--hc', it.getAttribute('data-col'));
      if (sw) sw.set(it.getAttribute('data-col'));
      if (!now) return;
      now.classList.add('swap');
      setTimeout(function () {
        $('.mx-now-cat', now).textContent = it.getAttribute('data-cat-name');
        $('.mx-now-name', now).textContent = $('.mx-nm', it).textContent;
        var m = $('.mx-now-meta', now).children; m[0].textContent = $('.mx-du', it).textContent; m[1].textContent = $('.mx-pr', it).textContent;
        $('.mx-now-note', now).textContent = it.getAttribute('data-note');
        now.classList.remove('swap');
      }, RM ? 0 : 200);
    }
    items.forEach(function (it) {
      it.addEventListener('pointerenter', function () { lastHover = performance.now(); show(it); });
      it.addEventListener('focus', function () {
        lastHover = performance.now(); show(it);
        if (pinned) { var col = it.closest('.mx-col'), p = clamp((col.offsetLeft - 40) / (dist || 1), 0, 1), r = sec.getBoundingClientRect(); window.scrollTo(0, scrollY + r.top + p * (sec.offsetHeight - VH)); }
      });
    });
    ticks.push(function (t) {
      var r = sec.getBoundingClientRect(); if (r.bottom < 0 || r.top > VH) return;
      var p;
      if (pinned) { p = clamp(-r.top / Math.max(1, r.height - VH), 0, 1); track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)'; }
      else { var mx = vp.scrollWidth - vp.clientWidth; p = mx > 0 ? vp.scrollLeft / mx : 0; }
      if (bar) bar.parentNode.style.setProperty('--p', p.toFixed(4)), bar.style.setProperty('--p', p.toFixed(4));
      var idx = Math.min(cols.length - 1, Math.floor(p * cols.length * 0.999));
      if (idx !== curCol) {
        curCol = idx; labels.forEach(function (l, i) { l.classList.toggle('on', i === idx); });
        if (t - lastHover > 1400) { var first = $('.mx-item', cols[idx]); if (first) show(first, true); }
      }
    });
    $$('[data-jump]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var col = $('[data-cat=' + a.getAttribute('data-jump') + ']', sec);
        if (pinned) { var p = clamp((col.offsetLeft - 40) / (dist || 1), 0, 1); scrollToY(sec.getBoundingClientRect().top + scrollY + p * (sec.offsetHeight - VH) + 2); }
        else { scrollToEl(sec, 0); vp.scrollTo({ left: col.offsetLeft - 16, behavior: RM ? 'auto' : 'smooth' }); }
      });
    });
  });

  /* ---------- colour route game ---------- */
  var cs = $('#consult');
  if (cs) (function () {
    var LV = { dark: 3, mid: 5, dblonde: 7, brassy: 8, fcopper: 7, grey: 6, pearl: 10, honey: 8, copper: 7, rose: 8, ash: 5, espresso: 3 };
    var sw = ($('canvas.swatch', cs) || {})._sw, go = $('[data-route-go]', cs), route = $('[data-route]', cs);
    var fromN = $('[data-from-name]', cs), toN = $('[data-to-name]', cs), stepTo = $('[data-cs=to]', cs), lineEl = $('.cs-line', cs), book = $('[data-route-book]', cs);
    var sel = { from: null, to: null }, shown = false, timers = [];
    stepTo.classList.add('is-dim');
    function hex2(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
    function mixHex(a, b, t) { var A = hex2(a), B = hex2(b); return '#' + A.map(function (v, i) { return ('0' + Math.round(v + (B[i] - v) * t).toString(16)).slice(-2); }).join(''); }
    function plan(f, d) {
      var lift = LV[d.v] - LV[f.v], s = [];
      var S = function (t, x, min, gbp) { s.push({ t: t, x: x, min: min, gbp: gbp }); };
      if (d.v === 'honey') { S('Hand-painted balayage', 'Lightener painted where the sun would catch it, then glossed.', 210, 210); if (lift >= 3) S('Balayage build & gloss', 'A second, softer layer of brightness.', 150, 150); }
      else if (f.v === 'fcopper' && (d.v === 'ash' || d.v === 'pearl')) { S('Colour correction', 'Lifting out old copper evenly before we tone.', 240, 260); if (d.v === 'pearl') { S('Lightening build & bond repair', 'The final lift, protected from root to tip.', 270, 275); S('Toning gloss', 'Pearl tone and shine.', 45, 48); } else S('Ash refine & gloss', 'Cool the result and lock in shine.', 120, 95); }
      else if (f.v === 'brassy' && d.v === 'pearl') { S('Root lift & toning gloss', 'Lift the regrowth, then cancel the brass with violet.', 165, 143); S('Gloss refresh', 'Keeps pearl from drifting warm.', 45, 48); }
      else if (lift >= 5) { S('Full head lightening', 'The first, gentle lift with bond protection.', 240, 240); S('Lightening build & bond repair', 'The rest of the lift, once your hair has recovered.', 270, 275); S('Toning gloss', 'The final tone.', 45, 48); }
      else if (lift >= 3) { S('Lightening & tone', 'One careful lift, toned the same day.', 285, 288); S('Toning gloss', 'Refreshes tone as it settles.', 45, 48); }
      else if (lift >= 1) { S('Lift & tone', 'A soft lift and a matched gloss.', 180, 150); }
      else if (lift <= -4) { S('Fill & colour', 'Pre-pigment first, so the deeper shade holds.', 165, 140); S('Gloss refresh', 'Rich colour, renewed shine.', 45, 48); }
      else if (d.v === 'copper' || d.v === 'rose') { S('Colour & gloss', 'Pigment laid in, then a clear gloss to seal it.', 150, 120); }
      else if (f.v === 'grey') { S('Grey-blending colour', 'Softens grey so regrowth reads as highlights.', 135, 110); }
      else { S('Root colour & gloss', 'Matched to your formula and glossed.', 120, 95); }
      var wk = 0, out = [{ t: 'Free consultation & strand test', x: 'We test how your hair lifts and takes tone.', min: 25, gbp: 0, wk: 0, free: true }];
      s.forEach(function (it, i) { wk += i === 0 ? 1 : 6; it.wk = wk; out.push(it); });
      out.push({ t: 'Week-ten check', x: 'A quick look at how it has grown out.', min: 10, gbp: 0, wk: wk + 10, free: true });
      var total = s.reduce(function (a, b) { return a + b.gbp; }, 0), mins = s.reduce(function (a, b) { return a + b.min; }, 0);
      return { list: out, visits: s.length, hours: Math.round(mins / 30) / 2, weeks: wk + 10, lo: Math.round(total * 0.92 / 5) * 5, hi: Math.round(total * 1.08 / 5) * 5 };
    }
    function count(el, to, fmt) { var from = 0; tween({ dur: 1300, ease: E.out, update: function (e) { el.textContent = fmt(from + (to - from) * e); } }); }
    function show() {
      timers.forEach(clearTimeout); timers = [];
      var f = sel.from, d = sel.to, P = plan(f, d);
      shown = true; route.classList.add('is-on');
      book.href = 'book.html?service=consult&route=' + f.v + '-' + d.v;
      lineEl.innerHTML = '';
      var n = P.list.length;
      P.list.forEach(function (it, i) {
        var col = mixHex(f.c, d.c, n > 1 ? i / (n - 1) : 1);
        var li = doc.createElement('li'); li.style.setProperty('--c', col);
        li.innerHTML = '<span class="dot"></span><div><h3></h3><p></p></div><span class="when"></span>';
        $('h3', li).textContent = it.t; $('p', li).textContent = it.x;
        $('.when', li).innerHTML = (it.wk === 0 ? 'Today' : 'Week ' + it.wk) + '<b>' + (it.free ? 'Free' : '£' + it.gbp) + ' · ' + (it.min >= 60 ? (Math.floor(it.min / 60) + ' hr' + (it.min % 60 ? ' ' + it.min % 60 : '')) : it.min + ' min') + '</b>';
        lineEl.appendChild(li);
        timers.push(setTimeout(function () { li.classList.add('in'); if (sw) sw.set(col); }, RM ? 0 : 250 + i * 520));
      });
      count($('[data-stat=sessions]', cs), P.visits, function (v) { return Math.round(v); });
      count($('[data-stat=hours]', cs), P.hours, function (v) { return (Math.round(v * 2) / 2).toString(); });
      count($('[data-stat=weeks]', cs), P.weeks, function (v) { return Math.round(v); });
      var pe = $('[data-stat=price]', cs); tween({ dur: 1300, ease: E.out, update: function (e) { pe.textContent = '£' + Math.round(P.lo * e / 5) * 5 + '–£' + Math.round(P.hi * e / 5) * 5; } });
    }
    $$('input[type=radio]', cs).forEach(function (r) {
      r.addEventListener('change', function () {
        var o = { v: r.value, c: r.getAttribute('data-col'), n: r.getAttribute('data-label') };
        sel[r.name] = o;
        if (r.name === 'from') { fromN.textContent = o.n; stepTo.classList.remove('is-dim'); if (sw) sw.set(o.c); if (!sel.to) toN.textContent = 'now your dream shade'; }
        else { toN.textContent = o.n; if (sw && !shown) sw.set(o.c); }
        go.disabled = !(sel.from && sel.to);
        if (shown && sel.from && sel.to) show();
      });
    });
    go.addEventListener('click', function () { if (sel.from && sel.to) { if (sw) sw.set(sel.from.c); show(); } });
  })();

  /* ---------- FAQ accordion ---------- */
  $$('.faq details').forEach(function (d) {
    var s = $('summary', d), a = $('.ans', d), busy = false;
    s.addEventListener('click', function (e) {
      if (RM) return; e.preventDefault(); if (busy) return; busy = true;
      if (!d.open) {
        d.open = true; var h = a.scrollHeight; a.style.height = '0px';
        tween({ dur: 650, ease: E.out, update: function (x) { a.style.height = (h * x) + 'px'; a.style.opacity = x; }, done: function () { a.style.height = ''; busy = false; } });
      } else {
        var h2 = a.scrollHeight;
        tween({ dur: 500, ease: E.io, update: function (x) { a.style.height = (h2 * (1 - x)) + 'px'; a.style.opacity = 1 - x; }, done: function () { d.open = false; a.style.height = ''; a.style.opacity = ''; busy = false; } });
      }
    });
  });

  /* ---------- page wash transitions ---------- */
  var wash = $('.wash'), wlabel = wash && $('.wash-label', wash), blobs = wash ? $$('.wash-fill i', wash) : [];
  var PAGE_NAMES = { 'index.html': 'Ondé', 'services.html': 'The menu', 'book.html': 'Book', 'contact.html': 'Hello' };
  function pageOf(u) { var p = u.pathname.split('/').pop() || 'index.html'; return p; }
  function blobDrift(e) { blobs.forEach(function (b, i) { var a = e * 1.6 + i * 1.57; b.style.transform = 'translate3d(' + (Math.cos(a) * 8).toFixed(2) + 'vmax,' + (Math.sin(a) * 6).toFixed(2) + 'vmax,0) scale(' + (1 + e * 0.15).toFixed(3) + ')'; }); }
  function leave(href, x, y) {
    if (RM || !wash) { location.href = href; return; }
    var u = new URL(href, location.href), name = PAGE_NAMES[pageOf(u)] || 'Ondé';
    store.set('onde-wash', name);
    wlabel.textContent = name; wlabel.style.opacity = 0;
    wash.style.visibility = 'visible';
    var R = Math.hypot(Math.max(x, VW - x), Math.max(y, VH - y)) * 1.05;
    tween({
      dur: 850, ease: E.io, update: function (e) {
        wash.style.clipPath = 'circle(' + (e * R).toFixed(1) + 'px at ' + x + 'px ' + y + 'px)';
        wlabel.style.opacity = clamp((e - 0.55) / 0.45, 0, 1).toFixed(3);
        wlabel.style.transform = 'translate3d(0,' + ((1 - e) * 30).toFixed(1) + 'px,0)';
        blobDrift(e);
      }, done: function () { setTimeout(function () { location.href = href; }, 60); }
    });
  }
  function enter() {
    var name = store.get('onde-wash');
    if (!wash || !html.classList.contains('washing')) { playIntro(150); return; }
    store.del('onde-wash');
    wlabel.textContent = name || ''; wlabel.style.opacity = 1;
    wash.style.visibility = 'visible'; html.classList.remove('washing');
    wash.style.clipPath = 'inset(0 0 0 0)';
    tween({
      dur: 1000, delay: 120, ease: E.io, update: function (e) {
        wash.style.clipPath = 'inset(0 0 ' + (e * 100).toFixed(2) + '% 0)';
        wlabel.style.opacity = (1 - e * 1.6).toFixed(3); wlabel.style.transform = 'translate3d(0,' + (-e * 40).toFixed(1) + 'px,0)';
        blobDrift(1 + e);
      }, done: function () { wash.style.visibility = 'hidden'; wash.style.clipPath = ''; }
    });
    playIntro(520);
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href'); if (/^(mailto:|tel:)/.test(href)) return;
    var u = new URL(a.href, location.href); if (u.origin !== location.origin) return;
    var samePage = pageOf(u) === pageOf(location) && u.search === location.search;
    if (samePage && u.hash) { var t = doc.getElementById(u.hash.slice(1)); if (t) { e.preventDefault(); scrollToEl(t, 10); history.replaceState(null, '', u.hash); } return; }
    if (samePage && !u.hash) { e.preventDefault(); scrollToY(0); return; }
    e.preventDefault();
    var r = a.getBoundingClientRect();
    leave(a.href, M.moved ? M.x : r.left + r.width / 2, M.moved ? M.y : r.top + r.height / 2);
  });
  addEventListener('pageshow', function (e) { if (e.persisted && wash) { wash.style.visibility = 'hidden'; wash.style.clipPath = ''; html.classList.remove('washing'); } });
  // hash on arrival (e.g. index.html#consult from another page)
  if (location.hash) { var tgt = doc.getElementById(location.hash.slice(1)); if (tgt) setTimeout(function () { window.scrollTo(0, tgt.getBoundingClientRect().top + scrollY - 10); }, 60); }

  /* ---------- simple forms ---------- */
  function fieldErr(input, msg) { var f = input.closest('.f'), e = f && $('.err', f); if (f) f.classList.toggle('bad', !!msg); if (e) e.textContent = msg || ''; input.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (e && e.id) input.setAttribute('aria-describedby', e.id); }
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  doc.addEventListener('input', function (e) {
    var f = e.target.closest && e.target.closest('.f.bad'); if (!f) return;
    var ok = e.target.type === 'email' ? EMAIL.test(e.target.value.trim()) : !!e.target.value.trim();
    if (ok) fieldErr(e.target, '');
  });
  var ct = $('#ct-form');
  if (ct) ct.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = ct.elements.name, em = ct.elements.email, m = ct.elements.message, bad = null;
    fieldErr(n, n.value.trim() ? '' : 'Please add your name.'); if (!n.value.trim()) bad = bad || n;
    fieldErr(em, EMAIL.test(em.value.trim()) ? '' : 'Please add an email we can reply to.'); if (!EMAIL.test(em.value.trim())) bad = bad || em;
    fieldErr(m, m.value.trim() ? '' : 'What would you like to ask?'); if (!m.value.trim()) bad = bad || m;
    if (bad) { bad.focus(); return; }
    ct.hidden = true; var d = $('.ct-done'); d.hidden = false; d.focus();
  });

  window.Onde = { tween: tween, E: E, ticks: ticks, RM: RM, CAPTURE: CAPTURE, M: M, fieldErr: fieldErr, EMAIL: EMAIL, scrollToEl: scrollToEl, clamp: clamp };
  enter();
  requestAnimationFrame(loop);
})();
