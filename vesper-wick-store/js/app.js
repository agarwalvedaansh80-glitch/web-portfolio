/* Vesper & Wick — preview store behaviour */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var D = window.VW, P = D.products;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var money = function (n) { return '£' + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  document.documentElement.classList.add('js');
  var FEELS = { Cosy: '#c48a5c', Fresh: '#5f9a8a', Clean: '#7f98a6', Smoky: '#d9622b' };
  var ICON_PLUS = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 2v12M2 8h12"/></svg>';

  /* ---------- shared chrome: cursor, drawer, toast ---------- */
  document.body.insertAdjacentHTML('beforeend',
    '<div class="cur" aria-hidden="true"></div><div class="cur-halo" aria-hidden="true"><span></span></div>' +
    '<div class="scrim" data-close-cart></div>' +
    '<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-h" tabindex="-1">' +
    '<div class="dr-head"><h2 id="dr-h">Your bag<sup class="dr-n">0</sup></h2><button class="dr-close" type="button" data-close-cart aria-label="Close bag"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l12 12M13 1L1 13"/></svg></button></div>' +
    '<div class="ship" aria-live="polite"><p class="ship-msg"></p><div class="ship-bar"><i></i><b></b></div></div>' +
    '<div class="dr-items" data-lenis-prevent></div>' +
    '<div class="upsell" hidden><img alt="" width="58" height="70"><div><span class="label">Pairs well with</span><h5></h5><small></small></div><button type="button">Add</button></div>' +
    '<div class="dr-foot"><div class="dr-sum"><span>Subtotal</span><b class="dr-total">£0</b></div><p class="dr-note">Taxes included. Free UK delivery over ' + money(D.freeShip) + '. Ships in 2 working days.</p>' +
    '<button class="btn" type="button" data-checkout data-magnetic=".12">Checkout <span class="arr">→</span></button></div></aside>' +
    '<div class="toast" role="status" aria-live="polite"></div>');

  var toastT;
  function toast(msg) { var t = $('.toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-on'); }, 3200); }

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    window.__lenis = lenis;
    if (window.gsap) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(function (time) { lenis.raf(time * 1000); }); gsap.ticker.lagSmoothing(0); }
    else { (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0); }
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) { var id = a.getAttribute('href'); if (id.length < 2) return; var el = $(id); if (!el) return; e.preventDefault(); if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 }); else el.scrollIntoView(); });
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

  /* ---------- markup builders ---------- */
  function chips(p, max, animate) {
    var all = [].concat(p.notes.top, p.notes.heart, p.notes.base).slice(0, max || 6);
    return '<ul class="chips' + (animate ? ' is-anim' : '') + '" aria-label="Scent notes">' + all.map(function (n, i) {
      return '<li class="chip" style="--c:' + D.family[n[2]] + ';--i:' + i + ';--cd:' + (i * .37).toFixed(2) + 's"><i aria-hidden="true"></i>' + n[0] + '</li>';
    }).join('') + '</ul>';
  }
  function tierChips(p) {
    return ['top', 'heart', 'base'].map(function (t) {
      return '<div class="tier"><span>' + t + '</span><ul class="chips is-anim">' + p.notes[t].map(function (n, i) { return '<li class="chip" style="--c:' + D.family[n[2]] + ';--i:' + i + ';--cd:' + (i * .5).toFixed(2) + 's"><i aria-hidden="true"></i>' + n[0] + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }
  function pyramid(p) {
    var k = 0;
    return '<div class="pyramid">' + ['top', 'heart', 'base'].map(function (t) {
      return '<div class="tier"><span>' + t + '</span><ul>' + p.notes[t].map(function (n) {
        k++;
        return '<li class="bar" style="--c:' + D.family[n[2]] + ';--v:' + (n[1] / 100) + ';--bd:' + (k * .12).toFixed(2) + 's"><em>' + n[0] + '</em><i role="img" aria-label="Intensity ' + n[1] + ' of 100"></i><small>' + n[1] + '</small></li>';
      }).join('') + '</ul></div>';
    }).join('') + '</div>';
  }
  function card(p) {
    var v = p.variants[0];
    return '<article class="card" style="--accent:' + p.accent + '" data-slug="' + p.slug + '" data-feel="' + p.feel + '" data-type="' + p.type + '">' +
      '<a class="card-link" href="product.html?p=' + p.slug + '" data-cursor="View" draggable="false">' +
      '<div class="card-media"><span class="card-no">No. ' + p.no + '</span><span class="card-feel">' + p.feel + '</span>' +
      '<img src="img/' + p.slug + '-a.webp" alt="' + p.name + (p.type === 'mist' ? ' room mist' : ' scented candle') + '" width="1000" height="1250" loading="lazy" draggable="false"></div>' +
      '<div class="card-body"><h3 class="card-name">' + p.name + '</h3><p class="card-line">' + p.line + '</p>' + chips(p, 4) + '</div></a>' +
      '<div class="card-foot"><span class="card-price">' + money(v.price) + '</span><span class="card-meta">' + v.size + ' · ' + (p.type === 'mist' ? 'room mist' : v.burn + ' burn') + '</span>' +
      '<button class="card-add" type="button" data-add="' + p.slug + '" aria-label="Add ' + p.name + ' to bag">' + ICON_PLUS + '</button></div></article>';
  }
  function cardHover(root) {
    $$('.card-media', root).forEach(function (m) {
      m.addEventListener('pointermove', function (e) { var r = m.getBoundingClientRect(); m.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); m.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); });
    });
  }

  /* ---------- cart ---------- */
  var cart = store.get('vw-cart', []);
  function cartCount() { return cart.reduce(function (a, l) { return a + l.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (a, l) { var p = D.bySlug(l.slug); return a + (p ? p.variants[l.v].price * l.qty : 0); }, 0); }
  function saveCart() { store.set('vw-cart', cart); }
  function setCount(bump) { $$('.bag-count').forEach(function (b) { b.textContent = cartCount(); if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } }); }
  function renderCart(newKey) {
    var box = $('.dr-items'), tot = cartTotal(), left = Math.max(0, D.freeShip - tot);
    $('.dr-n').textContent = cartCount(); $('.dr-total').textContent = money(tot);
    var ship = $('.ship'), was = ship.classList.contains('is-free');
    $('.ship-msg').innerHTML = !cart.length ? 'Free UK delivery on orders over <b>' + money(D.freeShip) + '</b>.' : left > 0 ? 'You’re <b>' + money(left) + '</b> away from free delivery.' : '<b>Free delivery unlocked.</b> We’ll wrap it in tissue, too.';
    ship.style.setProperty('--p', Math.min(1, tot / D.freeShip).toFixed(3));
    ship.classList.toggle('is-free', left === 0 && cart.length > 0);
    if (!was && left === 0 && cart.length) { ship.classList.remove('is-free'); void ship.offsetWidth; ship.classList.add('is-free'); }
    if (!cart.length) box.innerHTML = '<div class="dr-empty"><b>Nothing burning yet.</b>Not sure where to start? <a class="link" href="index.html#finder" data-close-cart>Find your scent</a>.</div>';
    else box.innerHTML = cart.map(function (l, i) {
      var p = D.bySlug(l.slug), v = p.variants[l.v], key = l.slug + l.v;
      return '<div class="line" style="--accent:' + p.accent + (key === newKey ? '' : ';animation:none') + '" data-i="' + i + '"><a class="line-img" href="product.html?p=' + p.slug + '"><img src="img/' + p.slug + '-a.webp" alt="" width="76" height="94"></a>' +
        '<div><h4>' + p.name + '</h4><p>' + v.name + ' · ' + p.feel + '</p><div class="qty"><button type="button" data-q="-1" aria-label="Decrease quantity">−</button><output>' + l.qty + '</output><button type="button" data-q="1" aria-label="Increase quantity">+</button></div></div>' +
        '<div class="line-r"><b>' + money(v.price * l.qty) + '</b><button type="button" data-rm>Remove</button></div></div>';
    }).join('');
    // upsell: a pairing for something already in the bag
    var inBag = cart.map(function (l) { return l.slug; }), cand = null;
    cart.some(function (l) { var pr = D.bySlug(l.slug).pair; if (inBag.indexOf(pr) < 0) { cand = D.bySlug(pr); return true; } });
    if (!cand && cart.length) cand = P.filter(function (p) { return inBag.indexOf(p.slug) < 0; })[0];
    var up = $('.upsell');
    if (cand && cart.length) {
      up.hidden = false; up.style.setProperty('--accent', cand.accent); up.dataset.slug = cand.slug;
      $('img', up).src = 'img/' + cand.slug + '-a.webp'; $('h5', up).textContent = cand.name; $('small', up).textContent = cand.notes.top[0][0] + ', ' + cand.notes.heart[0][0].toLowerCase() + ' · ' + cand.variants[0].size;
      $('button', up).textContent = 'Add · ' + money(cand.variants[0].price); $('button', up).setAttribute('aria-label', 'Add ' + cand.name + ' to bag');
    } else up.hidden = true;
    setCount();
  }
  function addToCart(slug, vi, qty, srcImg) {
    vi = vi || 0; qty = qty || 1;
    var l = cart.filter(function (x) { return x.slug === slug && x.v === vi; })[0];
    if (l) l.qty += qty; else cart.push({ slug: slug, v: vi, qty: qty });
    saveCart();
    if (srcImg && !reduced) fly(srcImg);
    setTimeout(function () { renderCart(slug + vi); setCount(true); openCart(); }, srcImg && !reduced ? 520 : 0);
  }
  function fly(img) {
    var bag = $('.bag-btn'); if (!bag || !img.getBoundingClientRect) return;
    var a = img.getBoundingClientRect(), b = bag.getBoundingClientRect(), f = img.cloneNode();
    var s = Math.min(160 / a.width, 1), w = a.width * s, h = a.height * s;
    f.className = 'fly'; f.removeAttribute('loading'); f.style.cssText = 'left:' + (a.left + a.width / 2 - w / 2) + 'px;top:' + (a.top + a.height / 2 - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px;object-fit:contain';
    document.body.appendChild(f);
    requestAnimationFrame(function () { f.style.transform = 'translate(' + (b.left + b.width / 2 - (a.left + a.width / 2)) + 'px,' + (b.top + b.height / 2 - (a.top + a.height / 2)) + 'px) scale(.12)'; f.style.opacity = '.2'; });
    setTimeout(function () { f.remove(); }, 900);
  }
  var lastFocus = null;
  function openCart() {
    var d = $('#drawer'); if (d.classList.contains('is-on')) return;
    lastFocus = document.activeElement; d.classList.add('is-on'); $('.scrim').classList.add('is-on'); if (lenis) lenis.stop();
    setTimeout(function () { $('.dr-close').focus({ preventScroll: true }); }, 60);
  }
  function closeCart() { $('#drawer').classList.remove('is-on'); $('.scrim').classList.remove('is-on'); if (lenis) lenis.start(); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  window.VWCart = { open: openCart, close: closeCart, add: addToCart };
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-open-cart]')) { e.preventDefault(); renderCart(); openCart(); return; }
    if (t.closest('[data-close-cart]')) { closeCart(); return; }
    var add = t.closest('[data-add]');
    if (add) {
      e.preventDefault(); var c = add.closest('.card,.result,.pair,.hero-now'); var img = c ? $('img', c) : null;
      add.classList.add('is-added'); setTimeout(function () { add.classList.remove('is-added'); }, 1400);
      addToCart(add.getAttribute('data-add'), +(add.getAttribute('data-v') || 0), 1, img); return;
    }
    var line = t.closest('.line');
    if (line) {
      var i = +line.dataset.i, q = t.closest('[data-q]');
      if (q) { cart[i].qty += +q.dataset.q; if (cart[i].qty < 1) cart.splice(i, 1); saveCart(); renderCart(); setCount(true); }
      else if (t.closest('[data-rm]')) { line.classList.add('is-out'); setTimeout(function () { cart.splice(i, 1); saveCart(); renderCart(); }, 400); }
      return;
    }
    if (t.closest('.upsell button')) {
      var up = $('.upsell'), btn = $('button', up); btn.textContent = 'Added ✓';
      setTimeout(function () { var s = up.dataset.slug, l2 = cart.filter(function (x) { return x.slug === s && x.v === 0; })[0]; if (l2) l2.qty++; else cart.push({ slug: s, v: 0, qty: 1 }); saveCart(); renderCart(s + 0); setCount(true); }, 380);
      return;
    }
    if (t.closest('[data-checkout]')) { toast('Preview store: checkout runs on the Shopify theme.'); }
  });
  document.addEventListener('keydown', function (e) {
    var d = $('#drawer');
    if (e.key === 'Escape' && d.classList.contains('is-on')) closeCart();
    if (e.key === 'Tab' && d.classList.contains('is-on')) {
      var f = $$('a,button,input', d).filter(function (x) { return x.offsetParent !== null; }); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  renderCart();

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
  function shelf(section, list, initial) {
    var track = $('.drag-track', section), drag = $('.drag', section);
    track.innerHTML = list.map(card).join(''); cardHover(track); magnetic(track);
    var dr = Drag(drag);
    $$('[data-dir]', section).forEach(function (b) { b.addEventListener('click', function () { dr.go(+b.dataset.dir); }); });
    function filter(feel, instant) {
      $$('.feel-tab', section).forEach(function (t) { t.setAttribute('aria-pressed', t.dataset.feel === feel); });
      function apply() {
        $$('.card', track).forEach(function (c) { c.classList.toggle('is-hidden', feel !== 'All' && c.dataset.feel !== feel); });
        $$('.card:not(.is-hidden) .chips', track).forEach(function (u) { u.classList.remove('is-anim'); void u.offsetWidth; u.classList.add('is-anim'); });
        dr.reset();
      }
      if (instant || reduced) { apply(); return; }
      track.classList.add('is-swap');
      setTimeout(function () { apply(); track.classList.remove('is-swap'); }, 360);
    }
    $$('.feel-tab', section).forEach(function (t) { t.addEventListener('click', function () { filter(t.dataset.feel); if (section.dataset.sync) history.replaceState(null, '', '?feel=' + t.dataset.feel.toLowerCase()); if (section.onfeel) section.onfeel(t.dataset.feel); }); });
    filter(initial || 'All', true);
    return { drag: dr, filter: filter };
  }
  function feelTabs(withCounts) {
    return ['All', 'Cosy', 'Fresh', 'Clean', 'Smoky'].map(function (f) {
      var n = f === 'All' ? P.length : P.filter(function (p) { return p.feel === f; }).length;
      return '<button class="feel-tab" type="button" data-feel="' + f + '" aria-pressed="false">' + (f === 'All' ? '' : '<span class="feel-dot" style="--fc:' + FEELS[f] + '"></span>') + f + (withCounts ? '<sup>' + n + '</sup>' : '') + '</button>';
    }).join('');
  }
  $$('.feel-tabs[data-build]').forEach(function (el) { el.innerHTML = feelTabs(true); });

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
  $$('.split').forEach(splitWords);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
    $$('[data-rv],.split').forEach(function (el) { io.observe(el); });
  } else $$('[data-rv],.split').forEach(function (el) { el.classList.add('is-in'); });

  var page = document.body.dataset.page;

  /* ================= HOME ================= */
  if (page === 'home') {
    // kinetic headline: letters drift in like smoke, then waft away from the cursor
    var title = $('.hero-title');
    var chars = [];
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

    var hero = $('.hero'), candle = $('.hero-candle img');
    function startSmoke() {
      var sm = window.VWSmoke && VWSmoke.init({ canvas: $('.hero canvas'), host: hero, anchor: candle, tip: { x: .4962, y: .2184 }, reduced: reduced, onFrame: function (f) { hero.style.setProperty('--flick', (.55 + .45 * f).toFixed(3)); } });
      if (!sm) { $('.hero canvas').remove(); return; }
      window.addEventListener('resize', function () { sm.place(); });
    }
    if (candle.complete) startSmoke(); else candle.addEventListener('load', startSmoke);
    magnetic(document);

    // shelf
    var sh = shelf($('#shop'), P, 'All');
    window.__shelf = sh;

    // pour story
    var pour = $('.pour'), pc = $('.pour-stage canvas');
    if (pour && window.PourScene) {
      var scene = new PourScene(pc), prog = reduced ? 1 : 0, steps = $$('.step', pour), fill = $('.steps-fill', pour), ghost = $('.pour-ghost', pour);
      var temp = $('[data-temp]'), day = $('[data-day]'), jars = $('[data-jars]');
      var flakes = [];
      if (!reduced) for (var i = 0; i < 14; i++) { var f = document.createElement('i'); f.className = 'flake'; var s = 3 + Math.random() * 9; f.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (Math.random() * 100) + '%;top:' + (40 + Math.random() * 70) + '%;opacity:' + (.15 + Math.random() * .35); f._k = .4 + Math.random() * 1.6; $('.pour-pin', pour).appendChild(f); flakes.push(f); }
      function update(p) {
        prog = p; var st = p < .34 ? 0 : p < .62 ? 1 : 2;
        steps.forEach(function (s, i) { s.classList.toggle('is-on', i === st); });
        if (fill) fill.style.transform = 'scaleY(' + Math.min(1, p * 1.04).toFixed(3) + ')';
        if (ghost) { ghost.textContent = '0' + (st + 1); ghost.style.transform = 'translateY(calc(-50% + ' + ((.5 - p) * 140).toFixed(1) + 'px))'; }
        flakes.forEach(function (f) { f.style.transform = 'translateY(' + (-p * 520 * f._k).toFixed(1) + 'px)'; });
        var tC = p < .34 ? 62 - Math.max(0, (p - .2) / .14) * 6 : p < .62 ? 56 - (p - .34) / .28 * 30 : 26 - Math.min(1, (p - .62) / .1) * 5;
        temp.textContent = Math.round(tC) + '°';
        day.textContent = String(Math.max(0, Math.min(14, Math.round(((p - .64) / .28) * 14)))).padStart(2, '0');
        jars.textContent = Math.round(Math.min(1, p / .32) * 120);
      }
      var visible = false, t0 = performance.now();
      (function tick(now) { if (visible) scene.draw(prog, (now - t0) / 1000); requestAnimationFrame(tick); })(t0);
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(pc);
      window.addEventListener('resize', function () { scene.resize(); });
      if (!reduced && window.ScrollTrigger) {
        ScrollTrigger.create({ trigger: pour, start: 'top top', end: '+=260%', pin: $('.pour-pin', pour), scrub: true, onUpdate: function (self) { update(self.progress); } });
        update(0);
      } else update(1);
    }

    // quote: words light up as you scroll
    var qb = $('.quote blockquote');
    if (qb) {
      splitWordsPlain(qb);
      var words = $$('.wd', qb);
      if (!reduced && window.ScrollTrigger) ScrollTrigger.create({ trigger: qb, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: function (s) { var n = Math.round(s.progress * words.length); words.forEach(function (w, i) { w.classList.toggle('is-lit', i < n); }); } });
      else words.forEach(function (w) { w.classList.add('is-lit'); });
    }
    initQuiz();
  }
  function splitWordsPlain(el) {
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) { var frag = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(function (w) { if (!w) return; if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(' ')); else { var s = document.createElement('span'); s.className = 'wd'; s.textContent = w; frag.appendChild(s); } }); n.parentNode.replaceChild(frag, n); }
        else if (n.nodeType === 1) walk(n);
      });
    })(el);
  }

  /* ---------- quiz ---------- */
  function initQuiz() {
    var root = $('#finder'); if (!root) return;
    var answers = {}, order = ['mood', 'room', 'season'], stepI = 0;
    var qsteps = $$('.qstep', root), prog = $$('.quiz-prog i', root), num = $('.quiz-prog b', root), back = $('.quiz-back', root);
    function show(i) {
      qsteps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); s.classList.toggle('is-out', k < i); s.setAttribute('aria-hidden', k !== i); if (k === i) s.removeAttribute('inert'); else s.setAttribute('inert', ''); });
      prog.forEach(function (p, k) { p.classList.toggle('is-done', k < i || i === 3); });
      num.textContent = i < 3 ? '0' + (i + 1) + ' / 03' : 'Your match';
      back.classList.toggle('is-on', i > 0); stepI = i;
    }
    $$('.choice', root).forEach(function (c) {
      c.addEventListener('click', function () {
        var q = c.closest('.qstep'), key = q.dataset.q, list = $('.choices', q);
        $$('.choice', q).forEach(function (x) { x.classList.remove('is-picked'); x.setAttribute('aria-pressed', 'false'); });
        c.classList.add('is-picked'); c.setAttribute('aria-pressed', 'true'); list.classList.add('has-pick');
        answers[key] = { v: c.dataset.v, label: $('b', c).textContent };
        setTimeout(function () {
          var next = order.indexOf(key) + 1;
          if (next < 3) { show(next); var f = $('.choice', qsteps[next]); if (f && document.activeElement === c) f.focus({ preventScroll: true }); }
          else result();
        }, reduced ? 50 : 560);
      });
    });
    back.addEventListener('click', function () { if (stepI > 0) { var q = qsteps[stepI - 1]; $('.choices', q) && $('.choices', q).classList.remove('has-pick'); $$('.choice', q).forEach(function (x) { x.classList.remove('is-picked'); }); show(stepI - 1); } });
    function result() {
      var ranked = P.map(function (p, i) {
        var s = (p.quiz.mood[answers.mood.v] || 0) * 1.2 + (p.quiz.room[answers.room.v] || 0) + (p.quiz.season[answers.season.v] || 0) * 1.1 - i * .001;
        return { p: p, s: s };
      }).sort(function (a, b) { return b.s - a.s; });
      var p = ranked[0].p, alt = ranked[1].p, box = $('.qresult', root);
      box.innerHTML = '<div class="result" style="--accent:' + p.accent + '">' +
        '<div class="result-media"><span class="label">No. ' + p.no + ' · ' + p.feel + '</span><img src="img/' + p.slug + '-a.webp" alt="' + p.name + '" width="1000" height="1250"></div>' +
        '<div class="result-body"><span class="label">Your scent is</span><h3 class="result-name">' + p.name + '</h3><p class="result-line">' + p.line + '</p>' +
        '<p class="result-why">You chose ' + answers.mood.label + ' · ' + answers.room.label + ' · ' + answers.season.label + '. ' + p.notes.heart.map(function (n) { return n[0]; }).join(' and ') + ' at the heart, ' + p.notes.base.map(function (n) { return n[0].toLowerCase(); }).join(' and ') + ' underneath.</p>' +
        pyramid(p) +
        '<div class="result-actions"><button class="btn" type="button" data-add="' + p.slug + '" data-magnetic=".15"><span>Add to bag · ' + money(p.variants[0].price) + '</span><span class="done" aria-hidden="true">Added ✓</span></button>' +
        '<a class="btn btn--ghost" href="product.html?p=' + p.slug + '" data-magnetic=".15">View ' + (p.type === 'mist' ? 'mist' : 'candle') + '</a>' +
        '<button class="link" type="button" data-retake>Start again</button></div>' +
        '<p class="result-why" style="margin:22px 0 0">Close second: <a class="link" href="product.html?p=' + alt.slug + '" style="color:var(--bone)">' + alt.name + '</a>, ' + alt.feel.toLowerCase() + '.</p></div></div>';
      show(3); magnetic(box);
      setTimeout(function () { $('.pyramid', box).classList.add('is-on'); }, reduced ? 0 : 450);
      $('[data-retake]', box).addEventListener('click', function () { answers = {}; $$('.choices', root).forEach(function (l) { l.classList.remove('has-pick'); }); $$('.choice', root).forEach(function (x) { x.classList.remove('is-picked'); }); show(0); });
    }
    show(0);
    window.__quiz = { pick: function (q, v) { var c = $('.qstep[data-q="' + q + '"] .choice[data-v="' + v + '"]', root); c && c.click(); } };
  }

  /* ================= COLLECTION ================= */
  if (page === 'collection') {
    var params = new URLSearchParams(location.search), f0 = params.get('feel'), feel = 'All';
    ['Cosy', 'Fresh', 'Clean', 'Smoky'].forEach(function (f) { if (f0 && f0.toLowerCase() === f.toLowerCase()) feel = f; });
    var COPY = { All: 'Eight scents, sorted by how they make a room feel rather than what is in them.', Cosy: 'Soft, warm and close. Fig, saffron, vanilla and wood for the evenings you stay in.', Fresh: 'Green, cold and awake. Juniper, tomato leaf and fir for windows-open days.', Clean: 'Linen, rain and white musk. The room after it has been put right.', Smoky: 'Birch tar, leather and oud. For low light and the last chapter.' };
    var titleEl = $('.col-title em'), sub = $('.col-sub p'), grid = $('.col-grid'), count = $('.col-count'), shelfSec = $('.col-shelf');
    $('.col-hero .feel-tabs').innerHTML = feelTabs(true);
    var shc = shelf(shelfSec, P, 'All');
    function setFeel(f, anim) {
      document.body.style.setProperty('--accent', f === 'All' ? '#e0672c' : FEELS[f]);
      titleEl.textContent = f === 'All' ? 'Everything' : f; sub.textContent = COPY[f];
      var tb = $('.seg[data-k="type"] [aria-pressed="true"]'), tp = tb ? tb.dataset.type : 'all';
      var list = P.filter(function (p) { return (f === 'All' || p.feel === f) && (tp === 'all' || p.type === tp); });
      var sort = $('#sort').value;
      if (sort === 'low') list.sort(function (a, b) { return a.price - b.price; }); else if (sort === 'high') list.sort(function (a, b) { return b.price - a.price; });
      count.textContent = list.length + (list.length === 1 ? ' scent' : ' scents');
      var track = $('.drag-track', shelfSec);
      function apply() {
        grid.innerHTML = list.map(card).join('') || '<p class="col-count">Nothing here yet. Try another feel.</p>'; cardHover(grid); magnetic(grid);
        $$('.chips', grid).forEach(function (u) { u.classList.add('is-anim'); });
        var slugs = list.map(function (p) { return p.slug; });
        $$('.card', track).forEach(function (c) { c.classList.toggle('is-hidden', slugs.indexOf(c.dataset.slug) < 0); });
        slugs.forEach(function (s) { var c = $('.card[data-slug="' + s + '"]', track); if (c) track.appendChild(c); });
        $$('.card:not(.is-hidden) .chips', track).forEach(function (u) { u.classList.remove('is-anim'); void u.offsetWidth; u.classList.add('is-anim'); });
        shc.drag.reset();
      }
      if (!anim || reduced) { apply(); return; }
      track.classList.add('is-swap'); grid.style.opacity = 0;
      setTimeout(function () { apply(); track.classList.remove('is-swap'); grid.style.opacity = ''; }, 340);
    }
    $$('.col-hero .feel-tab').forEach(function (t) { t.addEventListener('click', function () { feel = t.dataset.feel; $$('.col-hero .feel-tab').forEach(function (x) { x.setAttribute('aria-pressed', x === t); }); history.replaceState(null, '', '?feel=' + feel.toLowerCase()); setFeel(feel, true); }); });
    $$('.col-hero .feel-tab').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.feel === feel); });
    $$('.seg[data-k="type"] button').forEach(function (b) { b.addEventListener('click', function () { $$('.seg[data-k="type"] button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); setFeel(feel, true); }); });
    $$('.seg[data-k="view"] button').forEach(function (b) { b.addEventListener('click', function () { $$('.seg[data-k="view"] button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); var g = b.dataset.view === 'grid'; grid.hidden = !g; shelfSec.hidden = g; if (!g) shc.drag.reset(); }); });
    $('#sort').addEventListener('change', function () { setFeel(feel, true); });
    setFeel(feel); magnetic(document);
  }

  /* ================= PRODUCT ================= */
  if (page === 'product') {
    var slug = new URLSearchParams(location.search).get('p'), p = D.bySlug(slug) || P[0], vi = 0, qty = 1;
    document.title = p.name + ' — Vesper & Wick';
    document.body.style.setProperty('--accent', p.accent);
    var pair = D.bySlug(p.pair);
    $('.gal').innerHTML =
      '<figure><img src="img/' + p.slug + '-a.webp" alt="' + p.name + ', front" width="1000" height="1250"></figure>' +
      '<figure><img src="img/' + p.slug + '-b.webp" alt="' + p.name + ', detail of the ' + (p.type === 'mist' ? 'sprayer' : 'wax and wick') + '" width="1000" height="1250" loading="lazy"></figure>' +
      '<figure class="notes-panel on-dark"><span class="label">Note intensity</span><h3>How it unfolds</h3>' + pyramid(p) + '<p style="color:var(--mute);margin:26px 0 0;font-size:14px;max-width:44ch">Top notes lead for the first half hour; the heart fills the room; the base is what you notice when you walk back in.</p></figure>';
    var b = $('.buy-in');
    b.innerHTML =
      '<nav class="crumb" aria-label="Breadcrumb"><a href="collection.html">Shop</a><span>/</span><a href="collection.html?feel=' + p.feel.toLowerCase() + '">' + p.feel + '</a><span>/</span><span>No. ' + p.no + '</span></nav>' +
      '<h1>' + p.name + '</h1><p class="p-line">' + p.line + '</p>' +
      '<div class="p-price"><b data-price>' + money(p.variants[0].price) + '</b><span>' + (p.type === 'mist' ? 'Room mist' : 'Scented candle') + ' · free UK delivery over ' + money(D.freeShip) + '</span></div>' +
      '<p class="p-desc">' + p.desc + '</p>' +
      (p.variants.length > 1 ? '<div class="opt-label"><span>Size</span><span data-vname>' + p.variants[0].name + '</span></div><div class="sizes" role="radiogroup" aria-label="Size">' + p.variants.map(function (v, i) {
        return '<button class="size" type="button" role="radio" aria-checked="' + (i === 0) + '" data-v="' + i + '"><b>' + v.name.split(' · ')[0] + '</b><span>' + v.size + ' · ' + v.burn + '</span><em>' + money(v.price) + '</em></button>';
      }).join('') + '</div>' : '') +
      '<div class="buy-row"><div class="qty" aria-label="Quantity"><button type="button" data-pq="-1" aria-label="Decrease quantity">−</button><output data-qty>1</output><button type="button" data-pq="1" aria-label="Increase quantity">+</button></div>' +
      '<button class="btn main-add" type="button" data-magnetic=".1"><span data-addlabel>Add to bag · ' + money(p.variants[0].price) + '</span><span class="done" aria-hidden="true">Added ✓</span></button></div>' +
      '<p class="ship-hint"><i></i><span data-shiphint></span></p>' +
      '<div class="p-notes"><div class="opt-label"><span>The notes</span><span>Top · Heart · Base</span></div><div class="pyramid-chips" style="display:grid;gap:12px">' + tierChips(p) + '</div></div>' +
      '<div class="facts"><div><b data-size>' + p.variants[0].size + '</b><span>' + (p.type === 'mist' ? 'Bottle' : 'Wax weight') + '</span></div><div><b data-burn>' + p.variants[0].burn.replace('≈ ', '') + '</b><span>' + (p.type === 'mist' ? 'Per bottle' : 'Burn time') + '</span></div><div><b>' + p.feel + '</b><span>Feel</span></div></div>' +
      '<details class="acc" open><summary>Burn &amp; care<i></i></summary><p>' + (p.type === 'mist' ? 'Shake, then two to four sprays into the middle of the room, away from wood and fabric. Lasts about 400 sprays.' : 'Let the first burn reach the edge of the jar (about two hours). Trim the wick to 5 mm before each light. Stop when 1 cm of wax is left.') + '</p></details>' +
      '<details class="acc"><summary>What it is made of<i></i></summary><p>' + (p.type === 'mist' ? 'Perfumer’s alcohol, water and fine fragrance in a recycled glass bottle with a brass-finish sprayer.' : 'Coconut and rapeseed wax, a cotton wick and fine fragrance, poured into a reusable glass jar. Vegan, no paraffin.') + '</p></details>' +
      '<details class="acc"><summary>Delivery &amp; returns<i></i></summary><p>Dispatched in 2 working days. Free UK delivery over ' + money(D.freeShip) + ', otherwise £3.95. Unlit candles can be returned within 30 days.</p></details>' +
      '<div class="pair" style="--pa:' + pair.accent + '"><img src="img/' + pair.slug + '-a.webp" alt="" width="70" height="86"><div><span class="label" style="color:#6b6157">Pairs well with</span><h4>' + pair.name + '</h4><small>' + pair.notes.top[0][0] + ' · ' + money(pair.price) + '</small></div><button class="btn btn--dark" type="button" data-add="' + pair.slug + '" style="height:44px;padding:0 18px">Add<span class="done" aria-hidden="true">✓</span></button></div>';
    $('.sticky-atc').innerHTML = '<img src="img/' + p.slug + '-a.webp" alt="" width="44" height="54"><div><b>' + p.name + '</b><small data-sticky-meta>' + p.variants[0].name + ' · ' + money(p.variants[0].price) + '</small></div><button class="btn" type="button" data-sticky-add>Add to bag</button>';
    function sync() {
      var v = p.variants[vi];
      $('[data-price]').textContent = money(v.price); $('[data-addlabel]').textContent = 'Add to bag · ' + money(v.price * qty);
      $('[data-size]').textContent = v.size; $('[data-burn]').textContent = v.burn.replace('≈ ', ''); $('[data-qty]').textContent = qty;
      var vn = $('[data-vname]'); if (vn) vn.textContent = v.name;
      $('[data-sticky-meta]').textContent = v.name + ' · ' + money(v.price);
      var left = D.freeShip - cartTotal() - v.price * qty;
      $('[data-shiphint]').textContent = left > 0 ? 'Add this and you’re ' + money(left) + ' from free delivery.' : 'This order ships free.';
    }
    $$('.size').forEach(function (s) { s.addEventListener('click', function () { vi = +s.dataset.v; $$('.size').forEach(function (x) { x.setAttribute('aria-checked', x === s); }); sync(); }); });
    $$('[data-pq]').forEach(function (q) { q.addEventListener('click', function () { qty = Math.max(1, qty + +q.dataset.pq); sync(); }); });
    var main = $('.main-add');
    function doAdd(btn) { btn.classList.add('is-added'); setTimeout(function () { btn.classList.remove('is-added'); sync(); }, 1400); addToCart(p.slug, vi, qty, $('.gal img')); }
    main.addEventListener('click', function () { doAdd(main); });
    $('[data-sticky-add]').addEventListener('click', function () { doAdd(main); });
    sync();
    var sticky = $('.sticky-atc');
    new IntersectionObserver(function (es) { var e = es[0]; sticky.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0); }).observe(main);
    // notes panel bars animate when visible
    new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-on'); o.unobserve(e.target); } }); }, { threshold: .3 }).observe($('.gal .pyramid'));
    var others = P.filter(function (x) { return x.slug !== p.slug; }).sort(function (a, b2) { return (b2.feel === p.feel) - (a.feel === p.feel); });
    $('.more .h2').innerHTML = 'More to <em>burn</em>.';
    shelf($('.more'), others, 'All');
    magnetic(document);
  }
})();


/* newsletter sign-up -> email */
(function () {
  function sendEnquiry( form, subject, fromName, extra ) {
    var fd = new FormData( form );
    if ( fd.get( 'website' ) ) { return Promise.resolve( true ); }
    var data = {};
    fd.forEach( function ( v, k ) { if ( k !== 'website' ) { data[ k ] = data[ k ] !== undefined ? data[ k ] + ', ' + v : v; } } );
    Object.keys( extra || {} ).forEach( function ( k ) { data[ k ] = extra[ k ]; } );
    data.access_key = 'REPLACE_WITH_WEB3FORMS_KEY';
    data.subject = subject;
    data.from_name = fromName;
    return fetch( 'https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify( data ) } )
      .then( function ( r ) { return r.json().then( function ( j ) { return !!( r.ok && j.success ); }, function () { return false; } ); } )
      .catch( function () { return false; } );
  }

  var f = document.querySelector('form.news');
  if (!f) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = f.querySelector('button');
    btn.disabled = true;
    sendEnquiry(f, 'New newsletter signup for Vesper Wick', 'Vesper Wick website', {}).then(function (ok) {
      btn.disabled = false;
      if (ok) { btn.textContent = 'Thank you'; return; }
      var err = f.parentNode.querySelector('.news-error') || f.parentNode.appendChild(Object.assign(document.createElement('p'), { className: 'news-error', role: 'status' }));
      err.textContent = 'Something went wrong. Please email us directly.';
    });
  });
})();
