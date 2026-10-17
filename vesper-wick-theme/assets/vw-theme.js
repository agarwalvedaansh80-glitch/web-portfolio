/* Vesper & Wick — Shopify theme behaviour (AJAX Cart API, scent finder, motion) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var T = window.VWTheme || { routes: { cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change', recommendations: '/recommendations/products' }, freeShip: 5000, moneyFormat: '£{{amount}}', strings: {} };
  var S = T.strings || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches && T.cursor !== false;
  function formatMoney(cents, fmt) {
    fmt = fmt || T.moneyFormat || '£{{amount}}';
    var n = (cents || 0) / 100;
    function d(v, dec, th, ds) { var s = v.toFixed(dec).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, th); return s.join(ds); }
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, k) {
      switch (k) { case 'amount_no_decimals': return d(n, 0, ',', '.'); case 'amount_with_comma_separator': return d(n, 2, '.', ','); case 'amount_no_decimals_with_comma_separator': return d(n, 0, '.', ','); default: return d(n, 2, ',', '.'); }
    });
  }
  function money(c) { var s = formatMoney(c); return /\.00\b/.test(s) && !/,00/.test(s) ? s.replace('.00', '') : s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function json(url, body) {
    return fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) } : { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); });
  }
  var toastT;
  function toast(msg) { var t = $('.toast'); if (!t) return; t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-on'); }, 3200); }

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (!reduced && window.Lenis && !(window.Shopify && window.Shopify.designMode)) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    window.__lenis = lenis;
    if (window.gsap) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(function (time) { lenis.raf(time * 1000); }); gsap.ticker.lagSmoothing(0); }
    else { (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0); }
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) { var id = a.getAttribute('href'); if (id.length < 2) return; var el = document.getElementById(id.slice(1)); if (!el) return; e.preventDefault(); if (lenis) lenis.scrollTo(el, { duration: 1.6 }); else el.scrollIntoView(); });
  });

  /* mobile menu */
  var menu = $('#menu'), mbtn = $('.menu-btn');
  function setMenu(on) { menu.classList.toggle('is-on', on); document.body.classList.toggle('menu-open', on); mbtn.setAttribute('aria-expanded', on); if (lenis) on ? lenis.stop() : lenis.start(); }
  if (menu && mbtn) {
    mbtn.addEventListener('click', function () { setMenu(!menu.classList.contains('is-on')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-on')) { setMenu(false); mbtn.focus(); } });
  }

  /* header */
  var hdr = $('.hdr');
  function onScroll() { if (hdr) hdr.classList.toggle('is-scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();



  /* ---------- cursor + magnetic ---------- */
  var cur = $('.cur'), halo = $('.cur-halo'), haloTxt = $('.cur-halo span');
  if (fine && !reduced) {
    var mx = -100, my = -100, hx = -100, hy = -100, shown = false;
    document.documentElement.classList.add('has-cursor-ready');
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY; if (!shown) { shown = true; hx = mx; hy = my; document.body.classList.add('has-cursor'); }
    }, { passive: true });
    document.addEventListener('mouseleave', function () { document.body.classList.remove('has-cursor'); shown = false; });
    window.addEventListener('pointerdown', function () { halo.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { halo.classList.remove('is-down'); });
    (function loop() {
      hx += (mx - hx) * .16; hy += (my - hy) * .16;
      cur.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      halo.style.transform = 'translate3d(' + hx + 'px,' + hy + 'px,0)' + (halo.classList.contains('is-down') ? ' scale(.85)' : '');
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      var lab = e.target.closest('[data-cursor]'), hot = e.target.closest('a,button,[data-magnetic],label,summary,input');
      if (lab && !hot) { halo.classList.add('is-label'); halo.classList.remove('is-hover'); haloTxt.textContent = lab.getAttribute('data-cursor'); }
      else if (lab && hot && hot.contains(lab) === false && lab.contains(hot)) { halo.classList.add('is-hover'); halo.classList.remove('is-label'); }
      else if (hot) { halo.classList.add('is-hover'); halo.classList.remove('is-label'); }
      else { halo.classList.remove('is-hover', 'is-label'); }
    });
  }
  function magnetic(root) {
    if (!fine || reduced) return;
    $$('[data-magnetic]', root).forEach(function (el) {
      if (el._mag) return; el._mag = 1;
      var k = parseFloat(el.getAttribute('data-magnetic')) || .3;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + x * k + 'px,' + y * k + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }



  /* ---------- sound: synthesised crackle (WebAudio, off by default) ---------- */
  var snd = { ctx: null, on: false, master: null, timer: 0 };
  function sndStart() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!snd.ctx) {
      var c = snd.ctx = new AC();
      snd.master = c.createGain(); snd.master.gain.value = 0; snd.master.connect(c.destination);
      var len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
      var bed = c.createBufferSource(); bed.buffer = buf; bed.loop = true;
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      var bg = c.createGain(); bg.gain.value = .22; bed.connect(lp); lp.connect(bg); bg.connect(snd.master); bed.start();
      var nb = c.createBuffer(1, c.sampleRate * .05, c.sampleRate), nd = nb.getChannelData(0);
      for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
      snd.noise = nb;
    }
    snd.ctx.resume();
    var c2 = snd.ctx; snd.master.gain.cancelScheduledValues(c2.currentTime); snd.master.gain.setTargetAtTime(.5, c2.currentTime, .4);
    (function sched() {
      if (!snd.on) return;
      var c = snd.ctx, t = c.currentTime + .02, n = 1 + (Math.random() * 3 | 0);
      for (var k = 0; k < n; k++) {
        var s = c.createBufferSource(); s.buffer = snd.noise;
        var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200 + Math.random() * 4200; f.Q.value = .8 + Math.random() * 2;
        var g = c.createGain(), at = t + Math.random() * .06, big = Math.random() < .12, amp = (big ? .9 : .25) * (.4 + Math.random() * .6);
        g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(amp, at + .002); g.gain.exponentialRampToValueAtTime(.0008, at + (big ? .06 : .018) + Math.random() * .02);
        s.connect(f); f.connect(g); g.connect(snd.master); s.start(at); s.stop(at + .1);
      }
      snd.timer = setTimeout(sched, 50 + Math.random() * 380);
    })();
  }
  function sndStop() { if (!snd.ctx) return; clearTimeout(snd.timer); snd.master.gain.setTargetAtTime(0, snd.ctx.currentTime, .25); }
  $$('.snd').forEach(function (b) {
    b.addEventListener('click', function () {
      snd.on = !snd.on; $$('.snd').forEach(function (x) { x.setAttribute('aria-pressed', snd.on); var t = $('.snd-t', x); if (t) t.textContent = snd.on ? 'Sound on' : 'Sound off'; });
      snd.on ? sndStart() : sndStop();
    });
  });



  /* ---------- cart (AJAX Cart API) ---------- */
  var cart = null, upsellCache = {};
  function setCount(n, bump) { $$('.bag-count').forEach(function (b) { b.textContent = n; if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } }); }
  function renderCart(c, newKey) {
    cart = c; var box = $('.dr-items'); if (!box) return;
    var tot = c.total_price, left = Math.max(0, T.freeShip - tot);
    $('.dr-n').textContent = c.item_count; $('.dr-total').textContent = formatMoney(tot);
    var ship = $('.ship'), was = ship.classList.contains('is-free');
    $('.ship-msg').innerHTML = !c.item_count ? esc(S.empty || '') : left > 0 ? esc(S.away || '').replace('[amount]', '<b>' + esc(money(left)) + '</b>') : '<b>' + esc(S.unlocked || '') + '</b>';
    ship.style.setProperty('--p', T.freeShip ? Math.min(1, tot / T.freeShip).toFixed(3) : 1);
    ship.classList.toggle('is-free', left === 0 && c.item_count > 0);
    if (!was && left === 0 && c.item_count) { ship.classList.remove('is-free'); void ship.offsetWidth; ship.classList.add('is-free'); }
    box.innerHTML = c.items.map(function (it, i) {
      var img = it.image ? it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=200' : '';
      return '<div class="line"' + (it.key === newKey ? '' : ' style="animation:none"') + ' data-key="' + esc(it.key) + '" data-qty="' + it.quantity + '">' +
        '<a class="line-img" href="' + esc(it.url) + '">' + (img ? '<img src="' + esc(img) + '" alt="" width="76" height="94" loading="lazy">' : '') + '</a>' +
        '<div><h4>' + esc(it.product_title) + '</h4><p>' + esc(it.variant_title && it.variant_title !== 'Default Title' ? it.variant_title : '') + '</p>' +
        '<div class="qty"><button type="button" data-q="-1" aria-label="−">−</button><output>' + it.quantity + '</output><button type="button" data-q="1" aria-label="+">+</button></div></div>' +
        '<div class="line-r"><b>' + esc(formatMoney(it.final_line_price)) + '</b><button type="button" data-rm>' + esc(S.remove || 'Remove') + '</button></div></div>';
    }).join('');
    setCount(c.item_count);
    upsell(c);
  }
  function upsell(c) {
    var up = $('.upsell'), dr = $('#drawer'); if (!up) return;
    if (!c.item_count || (dr && dr.dataset.upsell === 'false')) { up.hidden = true; return; }
    var pid = c.items[0].product_id, inCart = c.items.map(function (i) { return i.product_id; });
    var got = upsellCache[pid] ? Promise.resolve(upsellCache[pid]) :
      json(T.routes.recommendations + '.json?product_id=' + pid + '&limit=6&intent=complementary').then(function (r) {
        if (r.products && r.products.length) return r.products;
        return json(T.routes.recommendations + '.json?product_id=' + pid + '&limit=6').then(function (r2) { return r2.products || []; });
      }).then(function (ps) { upsellCache[pid] = ps; return ps; });
    got.then(function (ps) {
      var p = ps.filter(function (x) { return inCart.indexOf(x.id) < 0 && x.available; })[0];
      if (!p) { up.hidden = true; return; }
      var v = p.variants.filter(function (x) { return x.available; })[0] || p.variants[0];
      up.hidden = false; up.dataset.variant = v.id;
      var img = $('img', up); img.src = p.featured_image ? (p.featured_image.indexOf('//') === 0 ? p.featured_image : p.featured_image) + (p.featured_image.indexOf('?') > -1 ? '&' : '?') + 'width=160' : img.src;
      $('h5', up).textContent = p.title; $('small', up).textContent = v.title !== 'Default Title' ? v.title : (p.type || '');
      $('button', up).textContent = (S.add || 'Add') + ' · ' + money(v.price);
    }).catch(function () { up.hidden = true; });
  }
  function refresh() { return json(T.routes.cart + '.js').then(function (c) { renderCart(c); return c; }); }
  function add(id, qty, srcImg, btn) {
    if (btn) btn.setAttribute('aria-busy', 'true');
    if (srcImg && !reduced) fly(srcImg);
    return json(T.routes.cartAdd + '.js', { items: [{ id: +id, quantity: qty || 1 }] }).then(function (r) {
      var key = r.items && r.items[0] && r.items[0].key;
      return json(T.routes.cart + '.js').then(function (c) { renderCart(c, key); setCount(c.item_count, true); openCart(); });
    }).catch(function (e) { toast((e && (e.description || e.message)) || 'Could not add to bag'); }).then(function () { if (btn) btn.removeAttribute('aria-busy'); });
  }
  function change(key, qty) { return json(T.routes.cartChange + '.js', { id: key, quantity: qty }).then(function (c) { renderCart(c); setCount(c.item_count, true); }).catch(function (e) { toast((e && e.description) || 'Could not update the bag'); }); }
  function fly(img) {
    var bag = $('.bag-btn'); if (!bag || !img || !img.getBoundingClientRect) return;
    var a = img.getBoundingClientRect(), b = bag.getBoundingClientRect(), f = img.cloneNode();
    var s = Math.min(160 / a.width, 1), w = a.width * s, h = a.height * s;
    f.className = 'fly'; f.removeAttribute('loading'); f.removeAttribute('srcset'); f.style.cssText = 'left:' + (a.left + a.width / 2 - w / 2) + 'px;top:' + (a.top + a.height / 2 - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px;object-fit:contain';
    document.body.appendChild(f);
    requestAnimationFrame(function () { f.style.transform = 'translate(' + (b.left + b.width / 2 - (a.left + a.width / 2)) + 'px,' + (b.top + b.height / 2 - (a.top + a.height / 2)) + 'px) scale(.12)'; f.style.opacity = '.2'; });
    setTimeout(function () { f.remove(); }, 900);
  }
  var lastFocus = null;
  function openCart() {
    var d = $('#drawer'); if (!d || d.classList.contains('is-on')) return;
    lastFocus = document.activeElement; d.classList.add('is-on'); $('.scrim').classList.add('is-on'); if (lenis) lenis.stop();
    setTimeout(function () { var c = $('.dr-close'); if (c) c.focus({ preventScroll: true }); }, 60);
  }
  function closeCart() { var d = $('#drawer'); if (!d) return; d.classList.remove('is-on'); $('.scrim').classList.remove('is-on'); if (lenis) lenis.start(); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-open-cart]')) { if (!$('#drawer')) return; e.preventDefault(); refresh(); openCart(); return; }
    if (t.closest('[data-close-cart]')) { closeCart(); return; }
    var addBtn = t.closest('button[data-variant]');
    if (addBtn) {
      e.preventDefault(); var c = addBtn.closest('.card,.pair,.hero-now,.result'); var img = c ? $('img', c) : null;
      addBtn.classList.add('is-added'); setTimeout(function () { addBtn.classList.remove('is-added'); }, 1400);
      add(addBtn.getAttribute('data-variant'), 1, img, addBtn); return;
    }
    var line = t.closest('.drawer .line');
    if (line) {
      var q = t.closest('[data-q]'), cur = +line.dataset.qty;
      if (q) change(line.dataset.key, Math.max(0, cur + +q.dataset.q));
      else if (t.closest('[data-rm]')) { line.classList.add('is-out'); setTimeout(function () { change(line.dataset.key, 0); }, 380); }
      return;
    }
    if (t.closest('.upsell button')) { var up = $('.upsell'); $('button', up).textContent = S.added || 'Added ✓'; add(up.dataset.variant, 1, $('img', up)); }
  });
  document.addEventListener('keydown', function (e) {
    var d = $('#drawer'); if (!d) return;
    if (e.key === 'Escape' && d.classList.contains('is-on')) closeCart();
    if (e.key === 'Tab' && d.classList.contains('is-on')) {
      var f = $$('a,button,input', d).filter(function (x) { return x.offsetParent !== null; }); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  if ($('#drawer')) refresh().catch(function () { });

  /* ---------- drag carousel with momentum ---------- */
  function Drag(root) {
    var track = $('.drag-track', root), x = 0, v = 0, min = 0, dragging = false, sx = 0, sp = 0, lx = 0, lt = 0, moved = 0, raf = 0, target = null, lastF = 0;
    var bar = root.parentNode.querySelector('.drag-bar i');
    function bounds() { min = Math.min(0, root.clientWidth - track.scrollWidth); }
    function paint() {
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      if (bar) { var vis = Math.min(1, root.clientWidth / Math.max(1, track.scrollWidth)), pr = min ? x / min : 0; bar.style.transform = 'translateX(' + (Math.max(0, Math.min(1, pr)) * (1 / vis - 1) * 100) + '%) scaleX(' + vis + ')'; }
    }
    function loop(now) {
      var dt = lastF ? Math.min(3, (now - lastF) / 16.67) : 1; lastF = now; raf = 0;
      if (!dragging) {
        if (target !== null) { x += (target - x) * (1 - Math.pow(.86, dt)); if (Math.abs(target - x) < .3) { x = target; target = null; } }
        else {
          x += v * dt; v *= Math.pow(.94, dt);
          if (x > 0) { x += (0 - x) * (1 - Math.pow(.8, dt)); v *= .5; } else if (x < min) { x += (min - x) * (1 - Math.pow(.8, dt)); v *= .5; }
        }
      }
      paint();
      if (dragging || target !== null || Math.abs(v) > .05 || x > .5 || x < min - .5) raf = requestAnimationFrame(loop); else lastF = 0;
    }
    function kick() { if (!raf) { lastF = 0; raf = requestAnimationFrame(loop); } }
    root.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('button')) return;
      dragging = true; target = null; sx = lx = e.clientX; sp = x; lt = performance.now(); v = 0; moved = 0; bounds(); kick();
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var nx = sp + (e.clientX - sx); moved = Math.max(moved, Math.abs(e.clientX - sx));
      if (nx > 0) nx *= .35; else if (nx < min) nx = min + (nx - min) * .35;
      var now = performance.now(), dtt = Math.max(1, now - lt); v = v * .4 + ((e.clientX - lx) / dtt * 16.67) * .6; lx = e.clientX; lt = now;
      x = nx; if (moved > 6) root.classList.add('is-dragging');
    }, { passive: true });
    window.addEventListener('pointerup', function () { if (!dragging) return; dragging = false; if (performance.now() - lt > 90) v = 0; setTimeout(function () { root.classList.remove('is-dragging'); }, 0); kick(); });
    root.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    root.addEventListener('dragstart', function (e) { e.preventDefault(); });
    root.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); bounds(); target = null; x = Math.max(min, Math.min(0, x - e.deltaX)); v = 0; kick(); } }, { passive: false });
    root.addEventListener('focusin', function (e) {
      var c = e.target.closest('.card'); if (!c) return; bounds();
      var l = c.offsetLeft, w = c.offsetWidth, vw = root.clientWidth;
      if (l + x < 0 || l + w + x > vw) { target = Math.max(min, Math.min(0, -l + 40)); kick(); }
      root.scrollLeft = 0;
    });
    function go(dir) { bounds(); var c = $('.card:not(.is-hidden)', track), step = c ? c.offsetWidth + 20 : 300; target = Math.max(min, Math.min(0, (target === null ? x : target) - dir * step * (root.clientWidth > 900 ? 2 : 1))); v = 0; kick(); }
    window.addEventListener('resize', function () { bounds(); x = Math.max(min, Math.min(0, x)); paint(); });
    bounds(); paint(); root.classList.add('is-grab');
    return { go: go, reset: function () { bounds(); x = 0; v = 0; target = null; paint(); }, nudge: function (to) { bounds(); target = Math.max(min, Math.min(0, to)); kick(); } };
  }


  function cardHover(root) {
    $$('.card-media', root).forEach(function (m) {
      m.addEventListener('pointermove', function (e) { var r = m.getBoundingClientRect(); m.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); m.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); });
    });
  }
  function initShelf(section) {
    if (!section || section._vw) return; section._vw = 1;
    var track = $('.drag-track', section), drag = $('.drag', section); if (!track || !drag) return;
    cardHover(track); magnetic(track);
    var dr = Drag(drag);
    $$('[data-dir]', section).forEach(function (b) { b.addEventListener('click', function () { dr.go(+b.dataset.dir); }); });
    $$('.feel-tab', section).forEach(function (t) {
      t.addEventListener('click', function () {
        var feel = t.dataset.feel;
        $$('.feel-tab', section).forEach(function (x) { x.setAttribute('aria-pressed', x === t); });
        function apply() {
          $$('.card', track).forEach(function (c) { c.classList.toggle('is-hidden', feel !== 'All' && c.dataset.feel !== feel); });
          $$('.card:not(.is-hidden) .chips', track).forEach(function (u) { u.classList.remove('is-anim'); void u.offsetWidth; u.classList.add('is-anim'); });
          dr.reset();
        }
        if (reduced) { apply(); return; }
        track.classList.add('is-swap'); setTimeout(function () { apply(); track.classList.remove('is-swap'); }, 360);
      });
    });
    return dr;
  }

  /* ---------- reveals ---------- */
  function splitWords(el) {
    if (el._split) return; el._split = 1; var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return; if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            var o = document.createElement('span'); o.className = 'w'; var s = document.createElement('span'); s.textContent = w; s.style.setProperty('--i', i++); o.appendChild(s); frag.appendChild(o);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    })(el);
  }

  function reveals(root) {
    $$('.split', root).forEach(splitWords);
    if (!('IntersectionObserver' in window)) { $$('[data-rv],.split', root).forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
    $$('[data-rv],.split', root).forEach(function (el) { io.observe(el); });
  }

  /* ---------- hero: kinetic title + smoke ---------- */
  function initHero(hero) {
    if (!hero || hero._vw) return; hero._vw = 1;
    var title = $('.hero-title', hero), chars = [];
    $$('.ln', title).forEach(function (ln) {
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split('').forEach(function (ch) {
              if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
              var s = document.createElement('span'); s.className = 'ch'; s.textContent = ch;
              s.style.setProperty('--d', (Math.random() * .9 + chars.length * .035).toFixed(2) + 's');
              s.style.setProperty('--dx', ((Math.random() - .5) * 60).toFixed(0) + 'px');
              s.style.setProperty('--rot', ((Math.random() - .5) * 14).toFixed(1) + 'deg');
              s.setAttribute('aria-hidden', 'true'); chars.push(s); frag.appendChild(s);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1) walk(n);
        });
      })(ln);
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () { title.classList.add('is-in'); }); });
    setTimeout(function () {
      if (reduced) return;
      title.classList.add('is-settled');
      var centers = []; function measure() { centers = chars.map(function (c) { var r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2 + window.scrollY]; }); }
      measure(); window.addEventListener('resize', measure);
      var cx = -999, cy = -999, tt = 0, st = chars.map(function () { return { x: 0, y: 0, b: 0 }; });
      window.addEventListener('pointermove', function (e) { cx = e.clientX; cy = e.clientY; }, { passive: true });
      (function waft(now) {
        tt = now / 1000;
        if (window.scrollY < window.innerHeight) {
          chars.forEach(function (c, i) {
            var m = centers[i]; if (!m) return; var dx = m[0] - cx, dy = (m[1] - window.scrollY) - cy, d2 = dx * dx + dy * dy, f = Math.exp(-d2 / 16000), s = st[i];
            var wx = Math.sin(tt * .6 + i * .7) * 1.5 + dx * f * .18, wy = Math.cos(tt * .5 + i) * 2 - f * 22, wb = f;
            s.x += (wx - s.x) * .12; s.y += (wy - s.y) * .12; s.b += (wb - s.b) * .12;
            c.style.setProperty('--wx', s.x.toFixed(1) + 'px'); c.style.setProperty('--wy', s.y.toFixed(1) + 'px');
            c.style.setProperty('--wb', (s.b * 14).toFixed(1) + 'px'); c.style.setProperty('--wc', (1 - s.b * .75).toFixed(3));
          });
        }
        requestAnimationFrame(waft);
      })(0);
    }, 3200);


    var candle = $('.hero-candle img', hero), canvas = $('canvas', hero);
    function startSmoke() {
      var sm = window.VWSmoke && VWSmoke.init({ canvas: canvas, host: hero, anchor: candle, tip: { x: parseFloat(hero.dataset.tipX) || .5, y: parseFloat(hero.dataset.tipY) || .22 }, amount: parseFloat(hero.dataset.amount) || 1, reduced: reduced, onFrame: function (f) { hero.style.setProperty('--flick', (.55 + .45 * f).toFixed(3)); } });
      if (!sm) { canvas.remove(); return; }
      window.addEventListener('resize', function () { sm.place(); });
    }
    if (candle && canvas) { if (candle.complete) startSmoke(); else candle.addEventListener('load', startSmoke); }
  }

  /* ---------- pour story ---------- */
  function initPour(pour) {
    if (!pour || pour._vw || !window.PourScene) return; pour._vw = 1;
    var pc = $('.pour-stage canvas', pour), scene = new PourScene(pc), prog = reduced ? 1 : 0, steps = $$('.step', pour), fill = $('.steps-fill', pour), ghost = $('.pour-ghost', pour);
    var temp = $('[data-temp]', pour), day = $('[data-day]', pour), jars = $('[data-jars]', pour), t0Temp = parseFloat(temp.textContent) || 62, maxJ = +jars.dataset.max || 120, maxD = +day.dataset.max || 14;
    var flakes = [];
    if (!reduced) for (var i = 0; i < 14; i++) { var f = document.createElement('i'); f.className = 'flake'; var s = 3 + Math.random() * 9; f.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (Math.random() * 100) + '%;top:' + (40 + Math.random() * 70) + '%;opacity:' + (.15 + Math.random() * .35); f._k = .4 + Math.random() * 1.6; $('.pour-pin', pour).appendChild(f); flakes.push(f); }
    function update(p) {
      prog = p; var st = p < .34 ? 0 : p < .62 ? 1 : 2; st = Math.min(st, steps.length - 1);
      steps.forEach(function (s, i) { s.classList.toggle('is-on', i === st); });
      if (fill) fill.style.transform = 'scaleY(' + Math.min(1, p * 1.04).toFixed(3) + ')';
      if (ghost) { ghost.textContent = '0' + (st + 1); ghost.style.transform = 'translateY(calc(-50% + ' + ((.5 - p) * 140).toFixed(1) + 'px))'; }
      flakes.forEach(function (f) { f.style.transform = 'translateY(' + (-p * 520 * f._k).toFixed(1) + 'px)'; });
      var tC = p < .34 ? t0Temp - Math.max(0, (p - .2) / .14) * 6 : p < .62 ? (t0Temp - 6) - (p - .34) / .28 * (t0Temp - 32) : 26 - Math.min(1, (p - .62) / .1) * 5;
      temp.textContent = Math.round(tC) + '°';
      day.textContent = String(Math.max(0, Math.min(maxD, Math.round(((p - .64) / .28) * maxD)))).padStart(2, '0');
      jars.textContent = Math.round(Math.min(1, p / .32) * maxJ);
    }
    var visible = false, t0 = performance.now();
    (function tick(now) { if (visible) scene.draw(prog, (now - t0) / 1000); requestAnimationFrame(tick); })(t0);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(pc);
    window.addEventListener('resize', function () { scene.resize(); });
    if (!reduced && window.ScrollTrigger) { ScrollTrigger.create({ trigger: pour, start: 'top top', end: '+=260%', pin: $('.pour-pin', pour), scrub: true, onUpdate: function (self) { update(self.progress); } }); update(0); }
    else update(1);
  }

  /* ---------- quote ---------- */
  function initQuote(q) {
    var qb = q && $('blockquote', q); if (!qb || qb._vw) return; qb._vw = 1;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) { var frag = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(function (w) { if (!w) return; if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(' ')); else { var s = document.createElement('span'); s.className = 'wd'; s.textContent = w; frag.appendChild(s); } }); n.parentNode.replaceChild(frag, n); }
        else if (n.nodeType === 1) walk(n);
      });
    })(qb);
    var words = $$('.wd', qb);
    if (!reduced && window.ScrollTrigger) ScrollTrigger.create({ trigger: qb, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: function (s) { var n = Math.round(s.progress * words.length); words.forEach(function (w, i) { w.classList.toggle('is-lit', i < n); }); } });
    else words.forEach(function (w) { w.classList.add('is-lit'); });
  }

  /* ---------- scent finder (metafield / tag driven) ---------- */
  function initQuiz(root) {
    if (!root || root._vw) return; root._vw = 1;
    var data = []; try { data = JSON.parse($('[data-quiz-products]', root).textContent); } catch (e) { }
    var answers = {}, qsteps = $$('.qstep', root), order = qsteps.filter(function (q) { return q.dataset.q !== 'result'; }).map(function (q) { return q.dataset.q; });
    var prog = $$('.quiz-prog i', root), num = $('.quiz-prog b', root), back = $('.quiz-back', root), stepI = 0, N = order.length;
    function show(i) {
      qsteps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); s.classList.toggle('is-out', k < i); if (k === i) s.removeAttribute('inert'); else s.setAttribute('inert', ''); });
      prog.forEach(function (p, k) { p.classList.toggle('is-done', k < i || i === N); });
      num.textContent = i < N ? '0' + (i + 1) + ' / 0' + N : (S.match || 'Your match');
      back.classList.toggle('is-on', i > 0); stepI = i;
    }
    function weightFor(p, q, a) {
      var pr = p.profile; if (typeof pr === 'string') { try { pr = JSON.parse(pr); } catch (e) { pr = null; } }
      if (pr && pr[q] && pr[q][a] != null) return +pr[q][a];
      return (p.tags || []).some(function (t) { return t.toLowerCase().replace(/\s+/g, '') === (q + ':' + a).toLowerCase(); }) ? 2 : 0;
    }
    function names(raw) { return String(raw || '').split(',').map(function (s) { return s.split(':')[0].trim(); }).filter(Boolean); }
    $$('.choice', root).forEach(function (c) {
      c.addEventListener('click', function () {
        var q = c.closest('.qstep'), key = q.dataset.q, list = $('.choices', q);
        $$('.choice', q).forEach(function (x) { x.classList.remove('is-picked'); x.setAttribute('aria-pressed', 'false'); });
        c.classList.add('is-picked'); c.setAttribute('aria-pressed', 'true'); list.classList.add('has-pick');
        answers[key] = { v: c.dataset.v, label: $('b', c).textContent, w: parseFloat(q.dataset.weight) || 1 };
        setTimeout(function () { var next = order.indexOf(key) + 1; if (next < N) show(next); else result(); }, reduced ? 50 : 560);
      });
    });
    back.addEventListener('click', function () { if (stepI > 0) { var q = qsteps[stepI - 1]; $('.choices', q) && $('.choices', q).classList.remove('has-pick'); $$('.choice', q).forEach(function (x) { x.classList.remove('is-picked'); }); show(stepI - 1); } });
    function result() {
      if (!data.length) return;
      var ranked = data.map(function (p, i) { var s = -i * .001; order.forEach(function (q) { if (answers[q]) s += answers[q].w * weightFor(p, q, answers[q].v); }); return { p: p, s: s }; }).sort(function (a, b) { return b.s - a.s; });
      var p = ranked[0].p, alt = ranked[1] && ranked[1].p, box = $('.qresult', root);
      var chose = order.map(function (q) { return answers[q] && answers[q].label; }).filter(Boolean).join(' · ');
      var heart = names(p.heart), base = names(p.base);
      box.innerHTML = '<div class="result" style="--accent:' + esc(p.accent) + '">' +
        '<div class="result-media"><span class="label">' + (p.number ? 'No. ' + esc(p.number) + ' · ' : '') + esc(p.feel) + '</span>' + (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" width="900" height="1125">' : '') + '</div>' +
        '<div class="result-body"><span class="label">' + esc(root.dataset.resultLabel || '') + '</span><h3 class="result-name">' + esc(p.title) + '</h3>' + (p.tagline ? '<p class="result-line">' + esc(p.tagline) + '</p>' : '') +
        '<p class="result-why">' + esc(chose) + (heart.length ? '. ' + esc(heart.join(' and ')) + (base.length ? ' at the heart, ' + esc(base.join(' and ').toLowerCase()) + ' underneath.' : '.') : '') + '</p>' +
        (p.pyramid || '') +
        '<div class="result-actions">' + (p.available ? '<button class="btn" type="button" data-variant="' + p.variant + '" data-magnetic=".15"><span>' + esc(S.add || 'Add') + ' · ' + esc(p.price) + '</span><span class="done" aria-hidden="true">' + esc(S.added || 'Added') + '</span></button>' : '') +
        '<a class="btn btn--ghost" href="' + esc(p.url) + '" data-magnetic=".15">' + esc(p.title) + ' →</a><button class="link" type="button" data-retake>↺</button></div>' +
        (alt ? '<p class="result-why" style="margin:22px 0 0">2 · <a class="link" href="' + esc(alt.url) + '" style="color:var(--bone)">' + esc(alt.title) + '</a></p>' : '') + '</div></div>';
      show(N); magnetic(box);
      setTimeout(function () { var py = $('.pyramid', box); if (py) py.classList.add('is-on'); }, reduced ? 0 : 450);
      $('[data-retake]', box).setAttribute('aria-label', 'Start again');
      $('[data-retake]', box).addEventListener('click', function () { answers = {}; $$('.choices', root).forEach(function (l) { l.classList.remove('has-pick'); }); $$('.choice', root).forEach(function (x) { x.classList.remove('is-picked'); }); show(0); });
    }
    show(0);
  }

  /* ---------- collection page ---------- */
  function initCollection(hero) {
    if (!hero || hero._vw) return; hero._vw = 1;
    var shelfSec = $('.col-shelf'), grid = $('.col-grid'), dr = null;
    if (shelfSec) { shelfSec.setAttribute('data-shelf', ''); dr = initShelf(shelfSec); }
    var titleEl = $('.col-title em', hero), sub = $('.col-sub p', hero), feel = 'All';
    var q = new URLSearchParams(location.search).get('feel');
    $$('.feel-tab', hero).forEach(function (t) { if (q && t.dataset.feel.toLowerCase() === q.toLowerCase()) feel = t.dataset.feel; });
    function apply(anim) {
      var tab = $('.feel-tab[data-feel="' + feel + '"]', hero);
      document.body.style.setProperty('--accent', tab && tab.dataset.color || getComputedStyle(document.documentElement).getPropertyValue('--ember'));
      titleEl.textContent = feel === 'All' ? hero.dataset.titleAll : feel;
      sub.textContent = hero.dataset['copy' + (feel === 'All' ? 'All' : feel)] || hero.dataset.copyAll;
      var tb = $('.seg[data-k="type"] [aria-pressed="true"]'), tp = tb ? tb.dataset.type : 'all';
      var track = $('.drag-track', shelfSec), cards = $$('.card', track);
      function go() {
        var vis = cards.filter(function (c) { return (feel === 'All' || c.dataset.feel === feel) && (tp === 'all' || c.dataset.type === tp); });
        cards.forEach(function (c) { c.classList.toggle('is-hidden', vis.indexOf(c) < 0); });
        grid.innerHTML = ''; vis.forEach(function (c) { var k = c.cloneNode(true); k.classList.remove('is-hidden'); grid.appendChild(k); });
        $$('.chips', grid).forEach(function (u) { u.classList.add('is-anim'); }); cardHover(grid); magnetic(grid);
        var cnt = $('.col-count'); if (cnt) cnt.textContent = vis.length + (vis.length === 1 ? ' scent' : ' scents');
        if (dr) dr.reset();
      }
      if (!anim || reduced) { go(); return; }
      track.classList.add('is-swap'); grid.style.opacity = 0; setTimeout(function () { go(); track.classList.remove('is-swap'); grid.style.opacity = ''; }, 340);
    }
    $$('.feel-tab', hero).forEach(function (t) {
      t.setAttribute('aria-pressed', t.dataset.feel === feel);
      t.addEventListener('click', function () { feel = t.dataset.feel; $$('.feel-tab', hero).forEach(function (x) { x.setAttribute('aria-pressed', x === t); }); history.replaceState(null, '', '?feel=' + feel.toLowerCase()); apply(true); });
    });
    $$('.seg[data-k="type"] button').forEach(function (b) { b.addEventListener('click', function () { $$('.seg[data-k="type"] button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); apply(true); }); });
    $$('.seg[data-k="view"] button').forEach(function (b) { b.addEventListener('click', function () { $$('.seg[data-k="view"] button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); var g = b.dataset.view === 'grid'; grid.hidden = !g; shelfSec.hidden = g; if (!g && dr) dr.reset(); }); });
    var sort = $('[data-sort]'); if (sort) sort.addEventListener('change', function () { var u = new URL(location.href); u.searchParams.set('sort_by', sort.value); location.href = u.toString(); });
    apply(false);
  }

  /* ---------- product page ---------- */
  function initProduct(pg) {
    if (!pg || pg._vw) return; pg._vw = 1;
    var form = $('form.pform', pg) || $('form[action*="/cart/add"]', pg); if (!form) return;
    var variants = []; try { variants = JSON.parse($('[data-variants]', pg).textContent); } catch (e) { }
    var input = $('[data-variant-input]', form), qtyIn = $('[data-qty-input]', form), qty = 1, main = $('.main-add', form), sticky = $('.sticky-atc');
    var sel = []; var cur = variants.filter(function (v) { return String(v.id) === input.value; })[0] || variants[0];
    if (cur) sel = cur.options.slice();
    function sync() {
      var v = variants.filter(function (x) { return x.options.every(function (o, i) { return o === sel[i]; }); })[0];
      if (!v) return; cur = v; input.value = v.id; qtyIn.value = qty;
      $('[data-price]', pg).textContent = formatMoney(v.price);
      $('[data-addlabel]', form).textContent = v.available ? (S.addBag || 'Add to bag') + ' · ' + formatMoney(v.price * qty) : (S.soldOut || 'Sold out');
      main.disabled = !v.available;
      var sz = $('[data-size]', pg); if (sz && v.option1) sz.textContent = v.option1.split(' · ').pop();
      $$('[data-vname]', pg).forEach(function (n, i) { n.textContent = sel[i] || ''; });
      $('[data-qty]', form).textContent = qty;
      var sm = $('[data-sticky-meta]'); if (sm) sm.textContent = v.title + ' · ' + formatMoney(v.price);
      var left = T.freeShip - (cart ? cart.total_price : 0) - v.price * qty, hint = $('[data-shiphint]');
      if (hint) hint.textContent = left > 0 ? 'Add this and you’re ' + money(left) + ' from free delivery.' : 'This order ships free.';
      if (history.replaceState) { var u = new URL(location.href); u.searchParams.set('variant', v.id); history.replaceState(null, '', u.toString()); }
    }
    S.addBag = (main.textContent.split('·')[0] || 'Add to bag').trim();
    $$('.size', pg).forEach(function (b) { b.addEventListener('click', function () { var oi = +b.dataset.option; sel[oi] = b.dataset.value; $$('.size[data-option="' + oi + '"]', pg).forEach(function (x) { x.setAttribute('aria-checked', x === b); }); sync(); }); });
    $$('[data-pq]', form).forEach(function (q) { q.addEventListener('click', function () { qty = Math.max(1, qty + +q.dataset.pq); sync(); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (!cur || !cur.available) return;
      main.classList.add('is-added'); setTimeout(function () { main.classList.remove('is-added'); sync(); }, 1400);
      add(cur.id, qty, $('.gal img', pg), main);
    });
    var sb = $('[data-sticky-add]'); if (sb) sb.addEventListener('click', function () { if (form.requestSubmit) form.requestSubmit(); else main.click(); });
    if (sticky && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { var e = es[0]; sticky.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0); }).observe(main);
    var py = $('.gal .pyramid', pg); if (py && 'IntersectionObserver' in window) new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-on'); o.unobserve(e.target); } }); }, { threshold: .3 }).observe(py);
    $$('.p-notes .chips').forEach(function (u) { u.classList.add('is-anim'); });
    sync();
  }

  /* ---------- related products (Section Rendering API) ---------- */
  function initRelated(sec) {
    if (!sec || sec._vwr) return; sec._vwr = 1;
    var url = sec.dataset.recommendationsUrl;
    if (!url) { initShelf(sec); return; }
    fetch(url).then(function (r) { return r.text(); }).then(function (html) {
      var d = document.createElement('div'); d.innerHTML = html; var t = $('.drag-track', d);
      if (t && t.children.length) $('.drag-track', sec).innerHTML = t.innerHTML;
    }).catch(function () { }).then(function () { initShelf(sec); });
  }

  function initAll(root) {
    root = root || document;
    reveals(root); magnetic(root);
    $$('[data-smoke]', root).forEach(initHero);
    $$('.shelf[data-shelf]', root).forEach(initShelf);
    $$('[data-pour]', root).forEach(initPour);
    $$('[data-quiz]', root).forEach(initQuiz);
    $$('.quote', root).forEach(initQuote);
    $$('[data-collection-page]', root).forEach(initCollection);
    $$('[data-product-page]', root).forEach(initProduct);
    $$('.more[data-shelf]', root).forEach(initRelated);
    $$('.p-notes .chips', root).forEach(function (u) { u.classList.add('is-anim'); });
  }
  initAll(document);
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  window.VWThemeCart = { open: openCart, close: closeCart, add: add, refresh: refresh };
})();
