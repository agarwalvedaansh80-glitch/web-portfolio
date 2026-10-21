// Halfstep static preview — wires data + cart (localStorage) to the 3D scenes and the fx kit.
// The Shopify theme runs the same fx/3D modules with its own glue (hs-app.js) on the AJAX Cart API.
import { COLOURWAYS, PRICE, FREE_SHIP, SIZES, SOLD_OUT, byId } from './data.js';
import { createStage, createAnatomy } from './shoe3d.js';
import { env, initCursor, initMagnetic, initWipe, marquee, createRail, makeFlap, setFlap, scrambleFlap, confetti, glitch, shake, kineticWord } from './fx.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);
const reduce = env.reduce;
const money = (n) => `$${Math.round(n)}`;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const texUrl = (id) => `model/tex/${id}.webp`;
const imgUrl = (id, a = 'q34') => `img/${id}_${a}.webp`;
const hdrH = () => $('.hdr').offsetHeight;
window.__hs = {};

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduce && !env.capture) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToEl = (el) => {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -hdrH(), duration: 1.4 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - hdrH(), behavior: reduce ? 'auto' : 'smooth' });
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="#"]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
  const t = document.querySelector(url.hash);
  if (!t) return;
  e.preventDefault(); closeMenu(); scrollToEl(t);
});

/* ---------- colourway theming: the acid floods the UI ---------- */
let current = store.get('hs-cw', 'street');
if (!byId(current) || byId(current).soon) current = 'street';
const root = document.documentElement;
function applyTheme(id, animate = true) {
  const c = byId(id);
  gsap.to(root, { '--acid': c.acid, duration: animate && !reduce ? 0.9 : 0, ease: 'power2.inOut' });
  root.style.setProperty('--acid-ink', c.ink);
}
applyTheme(current, false);

/* ---------- menu (mobile) ---------- */
const menu = $('#menu'), menuBtn = $('.menu-btn');
function closeMenu() { if (!menu || menu.hidden) return; menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = 'Menu'; }
menuBtn?.addEventListener('click', () => {
  if (!menu.hidden) return closeMenu();
  menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.textContent = 'Close';
  if (!reduce) gsap.from($$('a', menu), { xPercent: -30, opacity: 0, duration: 0.5, ease: 'expo.out', stagger: 0.05 });
});
$$('a', menu || document.createElement('div')).forEach((a) => a.addEventListener('click', closeMenu));

/* ---------- cursor, magnetic, page wipe ---------- */
initCursor();
initWipe();

/* ---------- cart ---------- */
let cart = store.get('hs-cart', []);
const drawerEl = $('.drawer'), scrim = $('.drawer-scrim');
let opener = null, isOpen = false;
gsap.set(drawerEl, { xPercent: 105 });
const drawer = {
  open() {
    if (isOpen) return; isOpen = true; opener = document.activeElement;
    document.body.classList.add('drawer-open'); lenis?.stop();
    gsap.set([drawerEl, scrim], { visibility: 'visible' });
    gsap.to(scrim, { opacity: 1, duration: reduce ? 0 : 0.35 });
    gsap.fromTo(drawerEl, { xPercent: 105, skewX: reduce ? 0 : -4 }, { xPercent: 0, skewX: 0, duration: reduce ? 0 : 0.7, ease: 'expo.out' });
    if (!reduce) gsap.from($$('.line, .upsell:not([hidden]), .ship', drawerEl), { x: 60, opacity: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06, delay: 0.12 });
    drawerEl.focus();
  },
  close() {
    if (!isOpen) return; isOpen = false;
    document.body.classList.remove('drawer-open'); lenis?.start();
    gsap.to(scrim, { opacity: 0, duration: reduce ? 0 : 0.3 });
    gsap.to(drawerEl, { xPercent: 105, duration: reduce ? 0 : 0.5, ease: 'expo.in', onComplete: () => gsap.set([drawerEl, scrim], { visibility: 'hidden' }) });
    opener?.focus?.();
  },
};
$$('[data-open-cart]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); drawer.open(); }));
$$('[data-close-cart]').forEach((b) => b.addEventListener('click', drawer.close));
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { drawer.close(); closeMenu(); }
  if (e.key === 'Tab' && isOpen) {
    const f = $$('button:not([disabled]), a[href], input', drawerEl).filter((x) => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

function addToCart(id, size, { open = true, discount = 0 } = {}) {
  const line = cart.find((l) => l.id === id && l.size === size);
  if (line) line.qty++; else cart.push({ id, size, qty: 1, discount });
  saveCart();
  $$('.bag-count').forEach((c) => { if (!reduce) gsap.fromTo(c, { scale: 1.8, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(3)' }); });
  if (open) setTimeout(drawer.open, 420);
}
function saveCart() { store.set('hs-cart', cart); renderCart(); }
function renderCart() {
  const n = cart.reduce((a, l) => a + l.qty, 0);
  const total = cart.reduce((a, l) => a + l.qty * PRICE * (1 - l.discount), 0);
  $$('.bag-count').forEach((c) => (c.textContent = n));
  const lines = $('.lines');
  lines.innerHTML = cart.length ? '' : '<div class="empty"><p>Bag\'s empty</p><p class="small">Pick a colour up top and add a pair.</p></div>';
  cart.forEach((l, i) => {
    const c = byId(l.id);
    const el = document.createElement('div');
    el.className = 'line'; el.style.setProperty('--c', c.acid);
    el.innerHTML = `<img src="${imgUrl(l.id)}" alt="" width="84" height="84">
      <div><h3>Drift Knit, ${c.name}</h3><p>${l.size}${l.discount ? ', 15% off second pair' : ''}</p>
      <span class="qty"><button type="button" aria-label="Remove one">−</button><output>${l.qty}</output><button type="button" aria-label="Add one">+</button></span></div>
      <b class="num">${money(l.qty * PRICE * (1 - l.discount))}</b>`;
    const [minus, plus] = $$('button', el);
    minus.onclick = () => { l.qty--; if (!l.qty) cart.splice(i, 1); saveCart(); };
    plus.onclick = () => { l.qty++; saveCart(); };
    lines.appendChild(el);
  });
  $('.drawer-total').textContent = money(total);
  const left = FREE_SHIP - total;
  $('.ship p').textContent = total === 0 ? `Free shipping on orders over ${money(FREE_SHIP)}` : left > 0 ? `${money(left)} away from free shipping` : 'Free shipping unlocked';
  const pct = Math.min(100, (total / FREE_SHIP) * 100);
  gsap.to($('.ship-bar b'), { width: `${pct}%`, duration: reduce ? 0 : 0.8, ease: 'expo.out' });
  $('.ship-bar').classList.toggle('is-full', pct >= 100);
  const up = $('.upsell');
  const owned = new Set(cart.map((l) => l.id));
  const pick = COLOURWAYS.find((c) => !owned.has(c.id) && !c.soon && !SOLD_OUT[c.id].includes(cart[0]?.size));
  if (cart.length && pick && !cart.some((l) => l.discount)) {
    up.hidden = false; up.style.setProperty('--c', pick.acid);
    up.innerHTML = `<span class="off">−15%</span><img src="${imgUrl(pick.id)}" alt="" width="72" height="72"><div><b>Add ${pick.name}</b><br><span class="small">15% off a second pair, same size</span></div><button type="button" data-cursor="ADD">Add ${cart[0].size}</button>`;
    $('button', up).onclick = () => addToCart(pick.id, cart[0].size, { open: false, discount: 0.15 });
  } else up.hidden = true;
}
renderCart();
$('.checkout')?.addEventListener('click', (e) => { e.preventDefault(); $('.btn-label', e.currentTarget).textContent = 'Checkout opens on the live store'; });
function feedback(btn) { btn.classList.add('is-added'); setTimeout(() => btn.classList.remove('is-added'), 1600); }

/* ---------- swatches ---------- */
function buildSwatches(wrap, onPick) {
  wrap.innerHTML = '';
  COLOURWAYS.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.type = 'button'; b.dataset.id = c.id; b.dataset.cursor = c.soon ? 'SAT' : 'PICK';
    b.style.setProperty('--sw', c.sw); b.style.setProperty('--ac', c.acid);
    b.setAttribute('aria-label', `${c.name}${c.soon ? ', drops Saturday' : ''}`);
    b.setAttribute('aria-pressed', c.id === current);
    if (c.soon) b.dataset.soon = '';
    b.onclick = () => {
      if (c.soon) { const d = $('#drop'); if (d) scrollToEl(d); else location.href = 'index.html#drop'; return; }
      onPick(c.id);
    };
    wrap.appendChild(b);
  });
}
const listeners = [];
function setCurrent(id) {
  current = id; store.set('hs-cw', id); applyTheme(id);
  const c = byId(id);
  $$('.swatch').forEach((s) => s.setAttribute('aria-pressed', s.dataset.id === id));
  $$('[data-cw-name]').forEach((el) => (el.textContent = c.name));
  $$('[data-cw-desc]').forEach((el) => (el.textContent = c.desc));
  $$('.card-wear').forEach((b) => b.setAttribute('aria-pressed', b.dataset.id === id));
  const sImg = $('.sticky-atc img'); if (sImg) sImg.src = imgUrl(id);
  listeners.forEach((fn) => fn(id, c));
  if (!reduce) gsap.fromTo('.hb-name, .buy-title', { skewX: -18, xPercent: -4 }, { skewX: 0, xPercent: 0, duration: 0.7, ease: 'elastic.out(1,.5)' });
}
window.__hs.setCurrent = setCurrent;
window.__hs.addToCart = addToCart;
window.__hs.drawer = drawer;

/* ---------- colour rail (shared by both pages) ---------- */
function buildRail(sec, { flood }) {
  const track = $('.rail-track', sec);
  track.innerHTML = COLOURWAYS.map((c) => `
    <article class="card" style="--c:${c.acid}">
      <div class="card-in">
        <a class="card-media" href="${c.soon ? 'index.html#drop' : `product.html?c=${c.id}`}" data-cursor="${c.soon ? 'SOON' : 'VIEW'}" data-wipe tabindex="-1" aria-hidden="true">
          ${c.tag ? `<span class="sticker card-tag">${c.tag}</span>` : ''}
          <img src="${imgUrl(c.id)}" alt="" loading="lazy" width="1400" height="1115" draggable="false">
        </a>
        <div class="card-body">
          <h3><a href="${c.soon ? 'index.html#drop' : `product.html?c=${c.id}`}" data-wipe data-cursor="${c.soon ? 'SOON' : 'VIEW'}">${c.name}</a></h3>
          <p>${c.desc}</p>
          <b class="card-price num">$${PRICE}</b>
          ${c.soon ? `<button class="btn card-wear" type="button" data-remind data-cursor="SAT">Get a reminder</button>` : `<button class="btn card-wear" type="button" data-id="${c.id}" data-cursor="PICK" aria-pressed="${c.id === current}">Wear this colour</button>`}
        </div>
      </div>
    </article>`).join('');
  const bar = $('.rail-bar', sec);
  bar.innerHTML = COLOURWAYS.map(() => '<i></i>').join('');
  const count = $('.rail-count', sec);
  const onChange = (i) => {
    count.textContent = `${i + 1}/${COLOURWAYS.length}`;
    $$('i', bar).forEach((b, j) => b.classList.toggle('on', j <= i));
    if (flood) {
      const c = COLOURWAYS[i];
      gsap.to(sec, { '--rail-acid': c.acid, duration: reduce ? 0 : 0.6, ease: 'power2.out' });
      sec.style.setProperty('--rail-ink', c.ink);
    }
  };
  const rail = createRail($('.rail-view', sec), { onChange });
  onChange(0);
  $('[data-rail="prev"]', sec).onclick = rail.prev;
  $('[data-rail="next"]', sec).onclick = rail.next;
  $$('.card-wear[data-id]', sec).forEach((b) => b.addEventListener('click', () => setCurrent(b.dataset.id)));
  $$('[data-remind]', sec).forEach((b) => b.addEventListener('click', () => { const d = $('#drop'); if (d) scrollToEl(d); else location.href = 'index.html#drop'; }));
  return rail;
}

/* ---------- marquees + footer word ---------- */
$$('.mq').forEach((m, i) => marquee(m, { speed: 70, dir: i % 2 ? -1 : 1 }));
$$('.ftr-word').forEach(kineticWord);

/* ---------- sticky add to bag (mobile) ---------- */
function stickyBar(watch, onAdd) {
  const bar = $('.sticky-atc');
  if (!bar || !watch) return;
  const btn = $('.btn', bar);
  btn.addEventListener('click', () => onAdd(btn));
  let on = false;
  new IntersectionObserver(([en]) => {
    const show = !en.isIntersecting && en.boundingClientRect.top < 0;
    if (show === on) return; on = show;
    bar.setAttribute('aria-hidden', String(!show)); btn.tabIndex = show ? 0 : -1;
    gsap.to(bar, { yPercent: show ? 0 : 150, y: 0, visibility: show ? 'visible' : 'hidden', duration: reduce ? 0 : 0.5, ease: show ? 'back.out(1.6)' : 'expo.in' });
  }).observe(watch);
  gsap.set(bar, { yPercent: 150 });
}

/* =========================== HOME =========================== */
if (document.body.dataset.page === 'home') {
  const c0 = byId(current);
  const stage = createStage($('.hero-stage'), { modelUrl: 'model/shoe.glb', texUrl, colourway: current, acid: c0.acid, word: 'DRIFT', onReady: () => (window.__hs.heroReady = true) });
  window.__hs.stage = stage;
  buildSwatches($('.hero .swatches'), (id) => setCurrent(id));
  listeners.push((id, c) => stage.setColourway(id, c.acid));
  setCurrent(current);

  // the one orchestrated page-load moment
  if (!reduce) {
    gsap.timeline({ delay: root.classList.contains('is-wiping') ? 0.5 : 0.15 })
      .from('.hero-bar > *', { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.08 })
      .from('.hero-title', { y: -60, rotate: -14, opacity: 0, duration: 0.9, ease: 'back.out(1.8)' }, 0.5)
      .from('.hero-price', { scale: 0, rotate: 40, duration: 0.8, ease: 'back.out(2.2)' }, 0.75)
      .from('.hero-hint', { opacity: 0, y: 12, duration: 0.6 }, 1.2);
  }
  const quick = $('.add-quick');
  quick.addEventListener('click', () => { feedback(quick); addToCart(current, 'UK 9'); });
  stickyBar(quick, (btn) => { feedback(btn); addToCart(current, 'UK 9'); });

  /* ----- anatomy: pinned, scroll-scrubbed explode ----- */
  const aSec = $('.anatomy'), aPin = $('.ana-pin'), aStage = $('.ana-stage'), svg = $('.ana-lines');
  const calls = Object.fromEntries($$('.call', aSec).map((c) => [c.dataset.k, c]));
  const order = ['laces', 'upper', 'foam', 'outsole'];
  const TH = { laces: 0.36, upper: 0.44, foam: 0.52, outsole: 0.6 };
  const names = { laces: 'Laces', upper: 'Knit upper', foam: 'Foam midsole', outsole: 'Rubber outsole' };
  const NS = 'http://www.w3.org/2000/svg';
  const lineEls = {};
  order.forEach((k) => {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = '<polyline fill="none" stroke="#000" stroke-width="3"/><circle r="8"/><rect width="10" height="10"/>';
    svg.appendChild(g); lineEls[k] = g;
  });
  let aProg = reduce ? 1 : 0;
  const local = (k) => clamp((aProg - TH[k]) / 0.1);
  const anatomy = createAnatomy(aStage, {
    modelUrl: 'model/shoe.glb', texUrl, colourway: current, acid: c0.acid,
    onFrame(pts) {
      if (innerWidth <= 900) return;
      const pr = aPin.getBoundingClientRect(), sr = aStage.getBoundingClientRect();
      pts.forEach((p) => {
        const g = lineEls[p.key], call = calls[p.key], l = local(p.key);
        const [pl, ci, sq] = g.children;
        if (l <= 0) { g.style.display = 'none'; return; }
        g.style.display = '';
        const ax = p.x + sr.left - pr.left, ay = p.y + sr.top - pr.top;
        const cr = call.getBoundingClientRect();
        const left = p.key === 'upper' || p.key === 'foam';
        const ex = (left ? cr.right : cr.left) - pr.left, ey = cr.top - pr.top + 26;
        const mx = ax + (ex - ax) * 0.45;
        const pts3 = [[ax, ay], [mx, ey], [ex, ey]];
        // draw the polyline progressively
        const seg = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
        const L1 = seg(pts3[0], pts3[1]), L2 = seg(pts3[1], pts3[2]);
        let rem = (L1 + L2) * l; const out = [pts3[0]];
        if (rem <= L1) { const t = rem / L1; out.push([ax + (mx - ax) * t, ay + (ey - ay) * t]); }
        else { out.push(pts3[1]); const t = (rem - L1) / L2; out.push([mx + (ex - mx) * t, ey]); }
        pl.setAttribute('points', out.map((q) => q.join(',')).join(' '));
        ci.setAttribute('cx', ax); ci.setAttribute('cy', ay);
        sq.setAttribute('x', ex - 5); sq.setAttribute('y', ey - 5); sq.style.opacity = l >= 1 ? 1 : 0;
      });
    },
  });
  listeners.push((id, c) => anatomy.setColourway(id, c.acid));
  window.__hs.anatomy = anatomy;
  const counts = $$('[data-count]', aSec);
  const step = $('.ana-step'), fill = $('.ana-fill');
  const renderAna = () => {
    anatomy.setProgress(aProg);
    fill.style.transform = `scaleX(${aProg})`;
    order.forEach((k) => {
      const l = local(k), c = calls[k];
      c.style.opacity = l > 0 ? 1 : 0;
      c.style.clipPath = `inset(0 ${(1 - l) * 100}% 0 0)`;
      c.style.transform = `translateY(${(1 - l) * 16}px)`;
    });
    counts.forEach((b) => {
      const k = b.closest('.call').dataset.k;
      const t = clamp((aProg - TH[k]) / 0.2);
      const v = parseFloat(b.dataset.count) * (1 - Math.pow(1 - t, 3));
      b.textContent = b.dataset.dec ? v.toFixed(1) : Math.round(v);
    });
    const shown = order.filter((k) => local(k) > 0);
    step.textContent = aProg < 0.12 ? 'Assembled. Keep scrolling.' : shown.length ? `Part ${shown.length} of 4: ${names[shown[shown.length - 1]]}` : 'Pulling apart…';
  };
  if (!reduce) {
    ScrollTrigger.create({
      trigger: aSec, start: () => `top ${hdrH()}px`, end: '+=260%', pin: aPin, scrub: true, anticipatePin: 1,
      onUpdate: (s) => { aProg = s.progress; renderAna(); },
    });
  }
  renderAna();

  /* ----- rail ----- */
  window.__hs.rail = buildRail($('.rail'), { flood: true });

  /* ----- fit finder ----- */
  const field = $('.gauge-field'), range = $('#foot-len'), gauge = $('.gauge');
  const steps = $$('.fit-steps li');
  const ruler = $('.ruler', field);
  ruler.innerHTML = Array.from({ length: 65 }, (_, i) => { const cm = i / 2; const maj = cm % 2 === 0; return `<i class="${maj ? 'maj' : ''}" style="left:${(cm / 32) * 100}%"></i>${maj && cm > 0 && cm < 32 ? `<em style="left:${(cm / 32) * 100}%">${cm}</em>` : ''}`; }).join('');
  let width = 'regular', lastSize = null, touched = { len: false, w: false };
  const sizeFor = (L, w) => {
    let raw = 6 + (L - 24.5) / 0.85;
    if (w === 'wide') raw += 0.5; if (w === 'narrow') raw -= 0.25;
    return clamp(Math.round(raw), 6, 13);
  };
  const setStep = (i) => steps.forEach((s, j) => { s.classList.toggle('is-on', j === i); s.classList.toggle('is-done', j < i); });
  const sizeOut = $('.size-out');
  const updateFit = () => {
    const L = parseFloat(range.value);
    field.style.setProperty('--len', L);
    $('.len').textContent = L.toFixed(1);
    const uk = sizeFor(L, width);
    range.setAttribute('aria-valuetext', `${L.toFixed(1)} centimetres, UK ${uk}`);
    if (uk !== lastSize) {
      const prev = $('span', sizeOut);
      const next = document.createElement('span'); next.textContent = `UK ${uk}`;
      if (lastSize !== null && !reduce) {
        const dir = uk > lastSize ? 1 : -1;
        sizeOut.appendChild(next);
        gsap.set(next, { position: 'absolute', left: 0, right: 0, top: 0 });
        gsap.fromTo(next, { yPercent: 100 * dir, rotate: 6 * dir }, { yPercent: 0, rotate: 0, duration: 0.45, ease: 'back.out(2)', onComplete: () => { gsap.set(next, { clearProps: 'position,left,right,top' }); } });
        gsap.to(prev, { yPercent: -100 * dir, duration: 0.35, ease: 'power3.in', onComplete: () => prev.remove() });
        gsap.fromTo('.toe-pin span', { rotate: -18, scale: 1.25 }, { rotate: -6, scale: 1, duration: 0.5, ease: 'elastic.out(1,.4)' });
      } else { sizeOut.innerHTML = ''; sizeOut.appendChild(next); }
      lastSize = uk;
    }
    $('.lock-size').textContent = `UK ${uk}`;
  };
  const fromPointer = (e) => {
    const r = field.getBoundingClientRect();
    const L = clamp(((e.clientX - r.left - 22) / (r.width - 22)) * 32, 22, 31);
    range.value = L.toFixed(1); range.dispatchEvent(new Event('input'));
  };
  let dragging = false;
  field.addEventListener('pointerdown', (e) => { e.preventDefault(); dragging = true; field.setPointerCapture(e.pointerId); fromPointer(e); range.focus({ preventScroll: true }); });
  field.addEventListener('pointermove', (e) => dragging && fromPointer(e));
  field.addEventListener('pointerup', () => { dragging = false; });
  range.addEventListener('input', () => { updateFit(); if (!touched.len) { touched.len = true; setStep(1); } });
  range.addEventListener('focus', () => field.classList.add('is-focus'));
  range.addEventListener('blur', () => field.classList.remove('is-focus'));
  $$('.widths button').forEach((b) => b.addEventListener('click', () => {
    width = b.dataset.w;
    $$('.widths button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    touched.w = true; setStep(2); updateFit();
    if (!reduce) gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
  }));
  const stamp = $('.stamp');
  const burst = $('.stamp-burst');
  burst.innerHTML = Array.from({ length: 14 }, (_, i) => `<i style="transform:rotate(${(i / 14) * 360}deg)"></i>`).join('');
  let fitSize = null;
  $('.lock-btn').addEventListener('click', () => {
    const L = parseFloat(range.value);
    const uk = sizeFor(L, width); fitSize = `UK ${uk}`;
    steps.forEach((s) => { s.classList.remove('is-on'); s.classList.add('is-done'); });
    $('.stamp-size').textContent = fitSize;
    $('.stamp-why').textContent = width === 'wide'
      ? `A ${L.toFixed(1)} cm foot is a UK ${sizeFor(L, 'regular')}. Wide feet get half a size more, rounded to a whole size: UK ${uk}.`
      : width === 'narrow' ? `A ${L.toFixed(1)} cm foot sits at UK ${uk}. The knit hugs narrow feet, so there's no need to size down further.`
      : `Drift runs true to UK sizing, and a ${L.toFixed(1)} cm foot is a UK ${uk}.`;
    $('.fit-add .btn-label').textContent = `Add ${fitSize} to bag`;
    stamp.hidden = false;
    if (!reduce) {
      gsap.timeline()
        .fromTo(stamp, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.45, ease: 'expo.inOut' })
        .fromTo('.stamp-size', { scale: 3.2, rotate: -32, opacity: 0 }, { scale: 1, rotate: -7, opacity: 1, duration: 0.42, ease: 'power4.in' }, 0.3)
        .add(() => shake(gauge), 0.72)
        .fromTo($$('i', burst), { scaleX: 0, x: 80, opacity: 1 }, { scaleX: 1, x: 150, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.01 }, 0.72)
        .fromTo(['.stamp-why', '.stamp-actions'], { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.08 }, 0.85);
    }
    $('.fit-add').focus({ preventScroll: true });
  });
  $('.fit-add').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (SOLD_OUT[current].includes(fitSize)) { $('.btn-label', btn).textContent = `${fitSize} is sold out in ${byId(current).name}`; shake(btn); return; }
    feedback(btn); addToCart(current, fitSize);
  });
  $('.fit-again').addEventListener('click', () => {
    const done = () => { stamp.hidden = true; setStep(0); touched = { len: false, w: false }; range.focus(); };
    if (reduce) return done();
    gsap.to(stamp, { clipPath: 'inset(100% 0 0 0)', duration: 0.45, ease: 'expo.inOut', onComplete: done });
  });
  updateFit();
  window.__hs.fit = { set(L) { range.value = L; range.dispatchEvent(new Event('input')); } };

  /* ----- drop: split-flap board ----- */
  const board = $('.board');
  const wordRow = $('.board-word'), timeRow = $('.board-time');
  const wordFlaps = [...wordRow.dataset.word].map(() => { const f = makeFlap(' '); wordRow.appendChild(f); return f; });
  const timeFlaps = [];
  for (let g = 0; g < 4; g++) {
    if (g) { const s = document.createElement('span'); s.className = 'sep'; timeRow.appendChild(s); }
    for (let k = 0; k < 2; k++) { const f = makeFlap('0'); timeRow.appendChild(f); timeFlaps.push(f); }
  }
  // next Saturday, 10:00 IST
  const target = (() => {
    const d = new Date(); const off = (330 + d.getTimezoneOffset()) * 60000;
    const ist = new Date(d.getTime() + off);
    const add = (6 - ist.getDay() + 7) % 7 || 7;
    const t = new Date(ist); t.setDate(ist.getDate() + add); t.setHours(10, 0, 0, 0);
    return t.getTime() - off;
  })();
  const digits = () => {
    const s = Math.max(0, (target - Date.now()) / 1000);
    return [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, Math.floor(s) % 60].map((n) => String(n).padStart(2, '0')).join('');
  };
  let live = false;
  const tick = () => { if (!live) return; [...digits()].forEach((ch, i) => setFlap(timeFlaps[i], ch)); };
  ScrollTrigger.create({
    trigger: '.drop', start: 'top 75%', once: true,
    onEnter: () => {
      [...wordRow.dataset.word].forEach((ch, i) => scrambleFlap(wordFlaps[i], ch, { delay: i * 0.08, steps: 7 }));
      [...digits()].forEach((ch, i) => scrambleFlap(timeFlaps[i], ch, { delay: 0.2 + i * 0.05, steps: 6 }));
      setTimeout(() => { live = true; }, 1600);
    },
  });
  setInterval(tick, 1000);
  if (!reduce) gsap.fromTo('.drop-shoe', { xPercent: 14, rotate: -2 }, { xPercent: -4, rotate: -11, ease: 'none', scrollTrigger: { trigger: '.drop', start: 'top bottom', end: 'bottom top', scrub: true } });

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
  const form = $('.notify'), msg = $('.notify-msg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input', form), v = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      form.classList.add('is-error'); msg.classList.add('is-error');
      msg.textContent = v ? `"${v}" isn't a full email. Try name@example.com.` : 'Add your email first, like name@example.com.';
      shake(form); input.focus();
      return;
    }
    form.classList.remove('is-error'); msg.classList.remove('is-error');
    sendEnquiry(form, 'New Ember drop reminder signup for Halfstep', 'Halfstep website', {}).then((ok) => {
      if (!ok) { form.classList.add('is-error'); msg.classList.add('is-error'); msg.textContent = 'Something went wrong. Please try again in a moment.'; return; }
      msg.textContent = `You're on the list. One email to ${v}, ten minutes before Ember goes live.`;
      const btn = $('button', form); btn.textContent = 'On the list';
      const cr = $('.confetti').getBoundingClientRect(), br = btn.getBoundingClientRect();
      confetti($('.confetti'), br.left - cr.left + br.width / 2, br.top - cr.top + br.height / 2, ['#000', '#fff', ...COLOURWAYS.map((c) => c.acid)]);
      glitch(board);
      input.value = '';
    });
  });
  $('#notify-email').addEventListener('input', () => { form.classList.remove('is-error'); msg.classList.remove('is-error'); });
}

/* =========================== PRODUCT =========================== */
if (document.body.dataset.page === 'product') {
  const params = new URLSearchParams(location.search);
  const p = params.get('c');
  if (p && byId(p) && !byId(p).soon) current = p;
  applyTheme(current, false);
  let size = null;
  const c0 = byId(current);
  const stage = createStage($('.pdp-stage'), { modelUrl: 'model/shoe.glb', texUrl, colourway: current, acid: c0.acid, word: c0.name.toUpperCase(), camDist: 0.78, onReady: () => (window.__hs.heroReady = true) });
  window.__hs.stage = stage;
  const shots = $$('.pdp-shots img');
  const angleName = { side: 'side', back: 'heel', top: 'top' };
  const setShots = (id) => shots.forEach((im, i) => {
    const swap = () => { im.src = imgUrl(id, im.dataset.angle); im.alt = `Drift Knit in ${byId(id).name}, ${angleName[im.dataset.angle]} view`; };
    if (reduce) return swap();
    gsap.to(im, { opacity: 0, y: 14, duration: 0.18, delay: i * 0.05, onComplete: () => { swap(); im.decode?.().catch(() => {}).finally(() => gsap.to(im, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' })); } });
  });
  const sizesWrap = $('.sizes');
  const renderSizes = () => {
    sizesWrap.innerHTML = '';
    SIZES.forEach((s) => {
      const b = document.createElement('button');
      b.className = 'size'; b.type = 'button'; b.textContent = s.replace('UK ', '');
      b.disabled = SOLD_OUT[current].includes(s);
      b.setAttribute('aria-label', b.disabled ? `${s}, sold out` : s);
      b.setAttribute('aria-pressed', s === size);
      b.dataset.cursor = 'PICK';
      b.onclick = () => {
        size = s; $('.size-hint').textContent = '';
        $$('.size').forEach((x) => x.setAttribute('aria-pressed', x === b));
        $$('[data-size]').forEach((el) => (el.textContent = s));
        if (!reduce) gsap.fromTo(b, { scale: 0.86 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
      };
      sizesWrap.appendChild(b);
    });
    if (size && SOLD_OUT[current].includes(size)) { size = null; $$('[data-size]').forEach((el) => (el.textContent = 'Pick a size')); }
  };
  const pick = (id) => {
    setCurrent(id); setShots(id); renderSizes();
    history.replaceState(null, '', `?c=${id}`);
    $('.stock').textContent = byId(id).stock;
  };
  buildSwatches($('.buy .swatches'), pick);
  listeners.push((id, c) => { stage.setColourway(id, c.acid); stage.setWord(c.name.toUpperCase()); });
  setCurrent(current); setShots(current); renderSizes(); $('.stock').textContent = byId(current).stock;

  const add = (btn) => {
    if (!size) {
      $('.size-hint').textContent = 'Pick a size first.';
      shake(sizesWrap);
      if (sizesWrap.getBoundingClientRect().top < hdrH() || sizesWrap.getBoundingClientRect().bottom > innerHeight) scrollToEl(sizesWrap.closest('.pick'));
      return;
    }
    feedback(btn); addToCart(current, size);
  };
  $('.buy .add').addEventListener('click', (e) => add(e.currentTarget));
  stickyBar($('.buy .add'), add);
  $$('.acc button').forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true')));
  if (!reduce) {
    gsap.timeline({ delay: root.classList.contains('is-wiping') ? 0.5 : 0.1 })
      .from('.buy-title', { yPercent: 60, skewY: 8, opacity: 0, duration: 0.9, ease: 'expo.out' })
      .from('.buy > :not(.buy-title)', { y: 30, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.04 }, 0.15)
      .from('.pdp-live', { scale: 0, rotate: 30, duration: 0.7, ease: 'back.out(2.4)' }, 0.5);
  }
  window.__hs.rail = buildRail($('.rail--mini'), { flood: false });
}

initMagnetic();
