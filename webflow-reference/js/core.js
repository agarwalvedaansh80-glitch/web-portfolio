/* Slotted v2 — core runtime (shared by every page).
   In Webflow: paste into Site settings > Custom code > Footer, or host and load with <script src>. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var params = new URLSearchParams(location.search);
  var capture = params.has('capture');
  var reduced = !capture && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (capture) doc.classList.add('is-capture');
  if (reduced) doc.classList.add('is-reduced');

  /* ---------- one shared frame loop ---------- */
  var subs = [];
  var last = performance.now();
  function onFrame(fn) { subs.push(fn); return function () { var i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; }
  function loop(now) {
    var dt = Math.min(64, now - last); last = now;
    for (var i = 0; i < subs.length; i++) { try { subs[i](now, dt); } catch (e) { console.error(e); } }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    expo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    back: function (t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function tween(opts) {
    var start = performance.now(), dur = opts.duration || 600, e = opts.ease || ease.out, off;
    off = onFrame(function (now) {
      var t = clamp((now - start - (opts.delay || 0)) / dur, 0, 1);
      opts.update(e(t), t);
      if (t >= 1) { off(); if (opts.done) opts.done(); }
    });
    return off;
  }

  /* ---------- capture mode: drive CSS animations/transitions from the (fake) clock ---------- */
  if (capture) {
    onFrame(function (now, dt) {
      var anims = document.getAnimations ? document.getAnimations() : [];
      for (var i = 0; i < anims.length; i++) {
        var a = anims[i];
        if (!a.__cap) { a.__cap = true; a.__t = a.currentTime || 0; a.pause(); }
        a.__t += dt;
        var end = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming().endTime : Infinity;
        if (isFinite(end) && a.__t >= end) { try { a.finish(); } catch (e) {} continue; }
        a.currentTime = a.__t;
      }
    });
  }

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!capture && !reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    onFrame(function (now) { lenis.raf(now); });
    document.querySelectorAll('a[href^="#"], a[href*=".html#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href'); var hash = href.slice(href.indexOf('#'));
        var samePage = href.charAt(0) === '#' || href.indexOf(location.pathname.split('/').pop() || 'index.html') === 0;
        if (!samePage || hash.length < 2) return;
        var t = document.querySelector(hash); if (!t) return;
        e.preventDefault(); lenis.scrollTo(t, { offset: -70, duration: 1.4 });
        closeMenu();
      });
    });
  }

  /* ---------- navbar ---------- */
  var nav = document.querySelector('[data-nav]');
  var burger = document.querySelector('[data-burger]');
  var lastY = 0;
  function closeMenu() { if (!nav) return; nav.classList.remove('is-open'); if (burger) burger.setAttribute('aria-expanded', 'false'); }
  if (burger) burger.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  document.querySelectorAll('.navbar_menu a').forEach(function (a) { a.addEventListener('click', function () { closeMenu(); if (lenis) lenis.start(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  onFrame(function () {
    if (!nav) return;
    var y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 20);
    if (!nav.classList.contains('is-open') && !capture) nav.classList.toggle('is-hidden', y > 600 && y > lastY + 2);
    if (y < lastY - 2 || y < 600) nav.classList.remove('is-hidden');
    lastY = y;
  });
  var clock = document.querySelector('[data-clock]');
  if (clock) {
    var base = 10 * 3600 + 42 * 60, t0 = performance.now(), lastS = -1;
    onFrame(function (now) {
      var s = Math.floor(base + (now - t0) / 1000); if (s === lastS) return; lastS = s;
      clock.textContent = pad(Math.floor(s / 3600) % 24) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- pointer state ---------- */
  var mouse = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });

  /* ---------- custom cursor: crosshair + radar ping ---------- */
  var cursor = document.querySelector('[data-cursor]');
  if (cursor && fine && !reduced) {
    doc.classList.add('has-cursor');
    var cx = mouse.x, cy = mouse.y, label = cursor.querySelector('[data-cursor-label]'), coords = cursor.querySelector('[data-cursor-coords]');
    var lastPing = 0;
    onFrame(function (now) {
      cx = lerp(cx, mouse.x, 0.32); cy = lerp(cy, mouse.y, 0.32);
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (coords) coords.textContent = 'X' + String(Math.round(mouse.x)).padStart(4, '0') + ' Y' + String(Math.round(mouse.y + window.scrollY)).padStart(5, '0');
      if (mouse.active && now - lastPing > 2600) { lastPing = now; ping(cx, cy, false, true); }
    });
    var hoverSel = 'a, button, summary, input, label, [data-cursor-label], .board_job';
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest(hoverSel) : null;
      cursor.classList.toggle('is-hover', !!t && !t.closest('[data-rail]'));
      var lb = e.target.closest ? e.target.closest('[data-cursor-label]') : null;
      if (lb) { label.textContent = lb.getAttribute('data-cursor-label'); cursor.classList.add('is-label'); }
      else cursor.classList.remove('is-label');
    });
    document.addEventListener('pointerdown', function (e) { cursor.classList.add('is-down'); ping(e.clientX, e.clientY, true); });
    document.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
    document.addEventListener('pointerleave', function () { cursor.style.opacity = capture ? 1 : 0; });
    document.addEventListener('pointerenter', function () { cursor.style.opacity = 1; });
  }
  function ping(x, y, signal, soft) {
    var p = document.createElement('div');
    p.className = 'cursor_ping' + (signal ? ' is-signal' : '');
    p.style.left = x + 'px'; p.style.top = y + 'px';
    if (soft) p.style.opacity = '.45';
    document.body.appendChild(p);
    setTimeout(function () { p.remove(); }, 1000);
  }

  /* ---------- magnetic buttons ---------- */
  if (fine && !reduced) {
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var inner = el.firstElementChild, x = 0, y = 0, tx = 0, ty = 0;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        tx = dx * 0.32; ty = dy * 0.42;
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      el.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
      onFrame(function () {
        if (Math.abs(tx - x) < .05 && Math.abs(ty - y) < .05 && tx === 0 && Math.abs(x) < .05) { if (x !== 0) { x = y = 0; el.style.transform = ''; if (inner) inner.style.transform = ''; } return; }
        x = lerp(x, tx, 0.18); y = lerp(y, ty, 0.18);
        el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
        if (inner) inner.style.transform = 'translate3d(' + (x * 0.35).toFixed(2) + 'px,' + (y * 0.35).toFixed(2) + 'px,0)';
      });
    });
  }

  /* ---------- in-view helpers ---------- */
  function whenInView(el, cb, opts) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { cb(en.isIntersecting, en); if (en.isIntersecting && opts && opts.once) io.disconnect(); });
    }, { threshold: (opts && opts.threshold) || 0, rootMargin: (opts && opts.margin) || '0px' });
    io.observe(el);
  }

  /* text scramble (mission-control decode) */
  var GLYPHS = '01<>/\\_-=+*#%[]';
  function decode(el, dur) {
    var final = el.getAttribute('data-text') || el.textContent; el.setAttribute('data-text', final);
    if (reduced) { el.textContent = final; return; }
    var start = performance.now(); dur = dur || 900;
    var off = onFrame(function (now) {
      var t = clamp((now - start) / dur, 0, 1), out = '';
      for (var i = 0; i < final.length; i++) {
        var c = final[i], reveal = (i / final.length) * 0.7 + 0.3;
        if (c === ' ' || t >= reveal) out += c; else if (t > reveal - 0.3) out += GLYPHS[(Math.random() * GLYPHS.length) | 0]; else out += ' ';
      }
      el.textContent = out;
      if (t >= 1) { el.textContent = final; off(); }
    });
  }
  document.querySelectorAll('[data-decode]').forEach(function (el) {
    el.style.minWidth = el.offsetWidth ? '' : '';
    whenInView(el, function (vis) { if (vis) decode(el, 900); }, { once: true, margin: '0px 0px -10% 0px' });
  });

  /* word split reveal */
  document.querySelectorAll('[data-split]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w, i) { return '<span class="word" aria-hidden="true"><span style="--i:' + i + '">' + w + '</span></span>'; }).join(' ');
    whenInView(el, function (vis) { if (vis) el.classList.add('is-in'); }, { once: true, margin: '0px 0px -12% 0px' });
  });
  document.querySelectorAll('[data-reveal]').forEach(function (el, i) {
    whenInView(el, function (vis) { if (vis) el.classList.add('is-in'); }, { once: true, margin: '0px 0px -8% 0px' });
  });

  /* ---------- kinetic headline ---------- */
  var kin = document.querySelector('[data-kinetic]');
  if (kin) {
    var chars = [];
    function splitNode(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          if (!n.textContent.trim()) return;
          n.textContent.split('').forEach(function (ch) {
            if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span'); s.className = 'char'; s.textContent = ch; s.setAttribute('aria-hidden', 'true');
            s.dataset.ch = ch; frag.appendChild(s); chars.push(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) splitNode(n);
      });
    }
    splitNode(kin);
    var slot = kin.querySelector('.hero_slot');
    if (!reduced) {
      var k0 = performance.now() + 150;
      chars.forEach(function (c, i) { c.__d = i * 32; c.style.opacity = '0'; });
      if (slot) { slot.style.setProperty('--slot', '0%'); slot.style.setProperty('--slot-o', '0'); }
      var settled = false, centers = [], measureAt = 0;
      onFrame(function (now) {
        var t = now - k0;
        if (!settled) {
          var allDone = true;
          for (var i = 0; i < chars.length; i++) {
            var c = chars[i], lt = clamp((t - c.__d) / 700, 0, 1);
            if (lt < 1) allDone = false;
            var e = ease.expo(lt);
            c.style.opacity = lt > 0 ? '1' : '0';
            c.style.transform = 'translate3d(0,' + ((1 - e) * 0.6).toFixed(3) + 'em,0)';
            c.textContent = lt > 0 && lt < 0.55 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : c.dataset.ch;
            c.style.color = lt > 0 && lt < 0.55 ? 'var(--c-teal)' : '';
          }
          if (slot) {
            var st = clamp((t - chars.length * 32 - 250) / 650, 0, 1);
            slot.style.setProperty('--slot', (ease.inOut(st) * 100).toFixed(1) + '%');
            slot.style.setProperty('--slot-o', st > .9 ? '1' : '0');
            if (st < 1) allDone = false;
          }
          if (allDone) { settled = true; chars.forEach(function (c) { c.style.transform = ''; }); }
          return;
        }
        // proximity weight: letters swell toward the cursor
        if (!fine) return;
        if (now - measureAt > 500) {
          measureAt = now;
          centers = chars.map(function (c) { var r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
        }
        for (var j = 0; j < chars.length; j++) {
          var dx = mouse.x - centers[j][0], dy = mouse.y - centers[j][1];
          var f = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 260);
          f = f * f * (3 - 2 * f);
          var cj = chars[j]; cj.__f = lerp(cj.__f || 0, f, 0.15);
          var w = Math.round(560 + cj.__f * 340);
          if (cj.__w !== w) { cj.__w = w; cj.style.fontVariationSettings = '"wght" ' + w; cj.style.color = cj.__f > .35 ? 'color-mix(in srgb, var(--c-teal) ' + Math.round(cj.__f * 70) + '%, var(--c-text))' : ''; }
        }
      });
    }
  }

  /* ---------- reading progress (post template) ---------- */
  var prog = document.querySelector('[data-progress]');
  if (prog) {
    var bar = prog.querySelector('.post_progress-bar');
    var lab = document.querySelector('[data-progress-label]');
    var art = document.querySelector('[data-article]');
    var cover = document.querySelector('.post_cover');
    var minsTotal = parseFloat((lab && lab.getAttribute('data-minutes')) || '4');
    onFrame(function () {
      var r = art.getBoundingClientRect();
      var total = r.height - innerHeight * 0.6;
      var p = clamp((-r.top + innerHeight * 0.3) / Math.max(1, total), 0, 1);
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (lab) {
        lab.querySelector('b').textContent = Math.round(p * 100) + '%';
        var left = Math.max(0, Math.ceil(minsTotal * (1 - p)));
        lab.querySelector('span').textContent = p >= .995 ? 'DONE' : left + ' MIN LEFT';
      }
      if (cover) { var cr = cover.getBoundingClientRect(); cover.style.setProperty('--pp', clamp(1 - cr.bottom / (innerHeight + cr.height), 0, 1).toFixed(3)); }
    });
  }

  /* ---------- table of contents (built from h2s in the CMS rich text) ---------- */
  var toc = document.querySelector('[data-toc]');
  if (toc) {
    var hs = document.querySelectorAll('[data-article] h2');
    var links = [];
    hs.forEach(function (h, i) {
      var id = h.id || h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      h.id = id; h.setAttribute('data-num', '0' + (i + 1) + ' /');
      var a = document.createElement('a'); a.href = '#' + id; a.textContent = h.textContent; toc.appendChild(a); links.push(a);
      a.addEventListener('click', function (e) { if (lenis) { e.preventDefault(); lenis.scrollTo(h, { offset: -90 }); } });
    });
    onFrame(function () {
      var cur = 0;
      hs.forEach(function (h, i) { if (h.getBoundingClientRect().top < innerHeight * 0.35) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === cur); });
    });
  }

  /* ---------- blog filters (CMS category filter) ---------- */
  var filters = document.querySelectorAll('[data-filter]');
  if (filters.length) {
    var cards = document.querySelectorAll('[data-category]');
    filters.forEach(function (f) {
      f.addEventListener('click', function () {
        var cat = f.getAttribute('data-filter');
        filters.forEach(function (o) { o.classList.toggle('is-active', o === f); o.setAttribute('aria-pressed', String(o === f)); });
        // FLIP: record, change, animate
        var first = new Map(); cards.forEach(function (c) { first.set(c, c.getBoundingClientRect()); });
        cards.forEach(function (c) { c.classList.toggle('is-hidden', cat !== 'all' && c.getAttribute('data-category') !== cat); });
        cards.forEach(function (c) {
          if (c.classList.contains('is-hidden')) return;
          var a = first.get(c), b = c.getBoundingClientRect();
          var dx = a.width ? a.left - b.left : 0, dy = a.width ? a.top - b.top : 40;
          tween({ duration: 700, ease: ease.expo, update: function (e) {
            c.style.transform = 'translate3d(' + (dx * (1 - e)) + 'px,' + (dy * (1 - e)) + 'px,0)';
            c.style.opacity = a.width ? 1 : e;
          }, done: function () { c.style.transform = ''; c.style.opacity = ''; } });
        });
      });
    });
  }

  window.SL = { onFrame: onFrame, tween: tween, ease: ease, clamp: clamp, lerp: lerp, capture: capture, reduced: reduced, fine: fine, mouse: mouse, whenInView: whenInView, decode: decode, lenis: function () { return lenis; } };
})();
