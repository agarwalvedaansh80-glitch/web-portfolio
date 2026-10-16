import { COLOURWAYS, PRICE, FREE_SHIP, SIZES, SOLD_OUT, byId } from './data.js';
import { createShoe } from './shoe3d.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);
const money = (n) => `$${n.toFixed(0)}`;
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ---------- smooth scroll ---------- */
let lenis;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- colourway theming: the whole page follows the selected colour ---------- */
let current = store.get('hs-cw', 'street');
if (byId(current)?.soon) current = 'street';
function applyTheme(id) {
  const c = byId(id);
  gsap.to(document.documentElement, { '--cw': c.cw, duration: reduce ? 0 : 0.6, ease: 'power2.out' });
  document.documentElement.style.setProperty('--cw-ink', c.ink);
}
applyTheme(current);
document.documentElement.style.setProperty('--sw-ember', byId('ember').cw);

/* ---------- header ---------- */
const hdr = $('.hdr');
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  hdr.classList.toggle('is-solid', y > 40);
  hdr.classList.toggle('is-hidden', y > lastY && y > 300 && !document.body.classList.contains('drawer-open'));
  lastY = y;
}, { passive: true });

/* ---------- cursor + magnetic buttons ---------- */
if (fine && !reduce) {
  const cur = document.createElement('div');
  cur.className = 'cursor'; cur.innerHTML = '<span></span>'; cur.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cur);
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
  addEventListener('pointermove', (e) => { cur.classList.add('is-live'); xTo(e.clientX); yTo(e.clientY); });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor]');
    cur.classList.toggle('is-label', !!t);
    cur.firstChild.textContent = t ? t.dataset.cursor : '';
  });
  $$('[data-magnetic]').forEach((el) => {
    const s = parseFloat(el.dataset.magnetic) || 0.35;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * s, y: (e.clientY - r.top - r.height / 2) * s, duration: 0.4, ease: 'power3' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,.4)' }));
  });
}

/* ---------- cart ---------- */
let cart = store.get('hs-cart', []);
const drawer = { open() { document.body.classList.add('drawer-open'); lenis?.stop(); $('.drawer').focus(); }, close() { document.body.classList.remove('drawer-open'); lenis?.start(); } };
$$('[data-open-cart]').forEach((b) => b.addEventListener('click', drawer.open));
$$('[data-close-cart]').forEach((b) => b.addEventListener('click', drawer.close));
addEventListener('keydown', (e) => { if (e.key === 'Escape') drawer.close(); });

function addToCart(id, size, { open = true, discount = 0 } = {}) {
  const line = cart.find((l) => l.id === id && l.size === size);
  if (line) line.qty++; else cart.push({ id, size, qty: 1, discount });
  saveCart();
  const count = $('.bag-count');
  count.classList.remove('bump'); void count.offsetWidth; count.classList.add('bump');
  if (open) setTimeout(drawer.open, 450);
}
function saveCart() { store.set('hs-cart', cart); renderCart(); }
function renderCart() {
  const n = cart.reduce((a, l) => a + l.qty, 0);
  const total = cart.reduce((a, l) => a + l.qty * PRICE * (1 - l.discount), 0);
  $('.bag-count').textContent = n;
  const lines = $('.lines');
  lines.innerHTML = cart.length ? '' : '<div class="empty"><p>Your bag is empty.</p><p class="small">Start with a colour you like.</p></div>';
  cart.forEach((l, i) => {
    const c = byId(l.id);
    const el = document.createElement('div');
    el.className = 'line';
    el.innerHTML = `<img src="img/${l.id}_q34.webp" alt="" width="84" height="84">
      <div><h3>Drift Knit — ${c.name}</h3><p>${l.size}${l.discount ? ' · 15% off second pair' : ''}</p>
      <span class="qty"><button aria-label="Remove one">−</button><output>${l.qty}</output><button aria-label="Add one">+</button></span></div>
      <b>${money(l.qty * PRICE * (1 - l.discount))}</b>`;
    const [minus, plus] = $$('button', el);
    minus.onclick = () => { l.qty--; if (!l.qty) cart.splice(i, 1); saveCart(); };
    plus.onclick = () => { l.qty++; saveCart(); };
    lines.appendChild(el);
  });
  $('.drawer-total').textContent = money(total);
  const left = FREE_SHIP - total;
  $('.ship p').textContent = total === 0 ? `Free shipping on orders over ${money(FREE_SHIP)}` : left > 0 ? `${money(left)} away from free shipping` : 'Free shipping unlocked';
  $('.ship-bar b').style.width = `${Math.min(100, (total / FREE_SHIP) * 100)}%`;
  // upsell: second colourway at 15% off
  const up = $('.upsell');
  const owned = new Set(cart.map((l) => l.id));
  const pick = COLOURWAYS.find((c) => !owned.has(c.id) && !c.soon);
  if (cart.length && pick && !cart.some((l) => l.discount)) {
    up.hidden = false;
    up.innerHTML = `<img src="img/${pick.id}_q34.webp" alt="" width="64" height="64"><div><b>Add ${pick.name}</b><br>15% off your second pair</div><button type="button">Add ${cart[0].size}</button>`;
    $('button', up).onclick = () => addToCart(pick.id, cart[0].size, { open: false, discount: 0.15 });
  } else up.hidden = true;
}
renderCart();
$('.checkout')?.addEventListener('click', (e) => { e.preventDefault(); e.currentTarget.querySelector('.btn-label').textContent = 'Checkout opens on the live store'; });

function feedback(btn) {
  btn.classList.add('is-added');
  setTimeout(() => btn.classList.remove('is-added'), 1600);
}

/* ---------- swatches (shared) ---------- */
function buildSwatches(wrap, onPick) {
  wrap.innerHTML = '';
  COLOURWAYS.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.type = 'button';
    b.style.setProperty('--sw', c.sw);
    b.setAttribute('aria-label', `${c.name}${c.soon ? ' (drops Saturday)' : ''}`);
    b.setAttribute('aria-pressed', c.id === current);
    if (c.soon) b.dataset.soon = '';
    b.onclick = () => { if (c.soon) { $('#drop')?.scrollIntoView({ behavior: 'smooth' }); return; } onPick(c.id); };
    wrap.appendChild(b);
  });
}
function setCurrent(id) {
  current = id; store.set('hs-cw', id); applyTheme(id);
  $$('.swatch').forEach((s, i) => s.setAttribute('aria-pressed', COLOURWAYS[i % COLOURWAYS.length].id === id));
  $$('[data-cw-name]').forEach((el) => (el.textContent = byId(id).name));
  $$('[data-cw-img]').forEach((img) => (img.src = `img/${id}_${img.dataset.cwImg}.webp`));
}

/* ================= HOME ================= */
if (document.body.dataset.page === 'home') {
  // hero 3D
  const heroEl = $('.hero');
  let heroProgress = 0;
  const shoe = createShoe($('.hero-canvas'), {
    modelUrl: 'model/shoe.glb', texBase: 'model/tex/', colourway: current,
    scrollTarget: () => heroProgress,
  });
  buildSwatches($('.hero .swatches'), (id) => { setCurrent(id); shoe.setColourway(id); });
  setCurrent(current);

  // page-load: the word stretches open (the one orchestrated intro)
  const letters = $$('.hero-word span');
  const setW = (l, w) => (l.style.fontVariationSettings = `"wdth" ${w}`);
  if (!reduce) {
    letters.forEach((l) => { l._w = 62; setW(l, 62); });
    gsap.from(letters, { opacity: 0, yPercent: 30, duration: 1.4, ease: 'expo.out', stagger: 0.06, delay: 0.15 });
    gsap.to(letters, { _w: 125, duration: 1.6, ease: 'expo.out', stagger: 0.06, delay: 0.15, onUpdate() { letters.forEach((l) => setW(l, l._w)); } });
    gsap.from('.hero-ui > *', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.6 });
  } else letters.forEach((l) => setW(l, 125));

  ScrollTrigger.create({ trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { heroProgress = s.progress; } });
  if (!reduce) gsap.to('.hero-word', { yPercent: -40, scale: 0.9, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true } });

  $('.hero .add').addEventListener('click', (e) => { feedback(e.currentTarget); addToCart(current, 'UK 9'); });

  // layers — pinned, three steps
  const layers = $$('.layer');
  const bars = $$('.layers-progress b');
  const rings = $$('.layers-visual .ring');
  const imgs = $$('.layers-visual img');
  if (!reduce && innerWidth > 900) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.layers', start: 'top top', end: '+=220%', pin: '.layers-pin', scrub: 0.6 } });
    const swap = (i, at) => {
      tl.to(layers[i], { opacity: 0, y: -24, duration: 0.18 }, at)
        .to(rings[i], { opacity: 0, duration: 0.18 }, at)
        .to(imgs[i], { opacity: 0, scale: 0.94, duration: 0.25 }, at)
        .fromTo(imgs[i + 1], { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.25 }, at + 0.1)
        .fromTo(layers[i + 1], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.18 }, at + 0.22);
    };
    tl.to(bars[0], { scaleX: 1, duration: 1 }, 0).to(rings[0], { opacity: 1, scale: 1.1, duration: 0.3 }, 0.15);
    swap(0, 1);
    tl.to(bars[1], { scaleX: 1, duration: 1 }, 1.2).to(rings[1], { opacity: 1, scale: 1.1, duration: 0.3 }, 1.45);
    swap(1, 2.2);
    tl.to(bars[2], { scaleX: 1, duration: 1 }, 2.4).to(rings[2], { opacity: 1, scale: 1.1, duration: 0.3 }, 2.65);
  } else {
    layers.forEach((l) => { l.style.position = 'relative'; l.style.opacity = 1; l.style.marginBottom = '28px'; });
    $('.layers-copy').style.minHeight = 'auto';
    imgs.forEach((im, i) => (im.style.opacity = i ? 0 : 1));
    bars.forEach((b) => (b.style.transform = 'scaleX(1)'));
  }

  // colourway rail — horizontal scroll while pinned
  const track = $('.rail-track');
  if (!reduce && innerWidth > 900) {
    gsap.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: 'none',
      scrollTrigger: { trigger: '.rail', start: 'top top', end: () => `+=${track.scrollWidth - innerWidth}`, pin: true, scrub: 0.6, invalidateOnRefresh: true } });
  } else { track.parentElement.style.overflowX = 'auto'; }

  // countdown — next Saturday 10:00 IST
  const target = (() => { const d = new Date(); const ist = new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
    const add = (6 - ist.getDay() + 7) % 7 || 7; const t = new Date(ist); t.setDate(ist.getDate() + add); t.setHours(10, 0, 0, 0);
    return t.getTime() - (330 + d.getTimezoneOffset()) * 60000; })();
  const cd = $$('.countdown b');
  const tick = () => { let s = Math.max(0, (target - Date.now()) / 1000);
    const v = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, Math.floor(s) % 60];
    v.forEach((n, i) => { const t = String(n).padStart(2, '0'); if (cd[i].textContent !== t) cd[i].textContent = t; }); };
  tick(); setInterval(tick, 1000);
  $('.notify').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('input', e.target).value.trim();
    $('.notify-msg').textContent = /.+@.+\..+/.test(v) ? `Done. We'll email ${v} when Ember goes live.` : 'Enter an email address, like name@example.com.';
  });
  if (!reduce) gsap.fromTo('.drop-img img', { rotate: -30, yPercent: 20 }, { rotate: -8, yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.drop', start: 'top bottom', end: 'bottom top', scrub: true } });

  // fit finder
  const steps = $$('.fit-step');
  const meter = $$('.fit-meter i');
  const ans = {};
  const show = (i) => { steps.forEach((s, j) => s.classList.toggle('is-active', i === j)); meter.forEach((m, j) => m.classList.toggle('on', j <= i)); };
  $$('.fit-step .choice').forEach((b) => b.addEventListener('click', () => {
    const step = b.closest('.fit-step');
    $$('.choice', step).forEach((c) => c.setAttribute('aria-pressed', c === b));
    ans[step.dataset.q] = b.dataset.v;
    const i = steps.indexOf(step);
    setTimeout(() => {
      if (i < 2) return show(i + 1);
      const base = parseFloat(ans.size);
      const adj = ans.width === 'wide' || ans.feel === 'roomy' ? 0.5 : ans.feel === 'snug' ? -0.5 : 0;
      const rec = Math.round(base + adj);
      const label = `UK ${rec}`;
      $('.fit-result b').textContent = label;
      $('.fit-why').textContent = adj > 0 ? 'Drift runs true. We went half a size up for a roomier fit, then rounded to the nearest whole size.' : adj < 0 ? 'Drift runs true. For a snug fit, go with your usual size rounded down.' : 'Drift runs true to size, so your usual size is the one.';
      $('.fit-add').onclick = (e) => { feedback(e.currentTarget); addToCart(current, label); };
      show(3);
    }, 250);
  }));
  $('.fit-back').onclick = () => show(0);
  show(0);
}

/* ================= PRODUCT ================= */
if (document.body.dataset.page === 'product') {
  const params = new URLSearchParams(location.search);
  if (params.get('c') && byId(params.get('c')) && !byId(params.get('c')).soon) current = params.get('c');
  let size = null;
  const imgs = $$('.gallery img');
  const angles = ['q34', 'side', 'back', 'top'];
  let spin;
  const setImages = (id) => imgs.forEach((im, i) => { im.style.opacity = 0; setTimeout(() => { im.src = `img/${id}_${angles[i]}.webp`; im.alt = `Drift Knit in ${byId(id).name}, ${['three-quarter', 'side', 'back', 'top'][i]} view`; im.onload = () => (im.style.opacity = 1); }, 200); });
  const sizesWrap = $('.sizes');
  const renderSizes = () => {
    sizesWrap.innerHTML = '';
    SIZES.forEach((s) => {
      const b = document.createElement('button');
      b.className = 'size'; b.type = 'button'; b.textContent = s.replace('UK ', '');
      b.setAttribute('aria-label', s);
      b.disabled = SOLD_OUT[current].includes(s);
      if (b.disabled) b.setAttribute('aria-label', `${s}, sold out`);
      b.setAttribute('aria-pressed', s === size);
      b.onclick = () => { size = s; $('.size-hint').textContent = ''; $$('.size').forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-size]').textContent = s; };
      sizesWrap.appendChild(b);
    });
    if (size && SOLD_OUT[current].includes(size)) { size = null; $('[data-size]').textContent = 'Pick a size'; }
  };
  const pick = (id) => { setCurrent(id); setImages(id); renderSizes(); spin?.setColourway(id); history.replaceState(null, '', `?c=${id}`); $('.sticky-atc img').src = `img/${id}_q34.webp`; $('.stock').textContent = byId(id).stock; };
  buildSwatches($('.buy .swatches'), pick);
  pick(current);

  const add = (btn) => {
    if (!size) { $('.size-hint').textContent = 'Pick a size first.'; sizesWrap.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 300 }); sizesWrap.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    feedback(btn); addToCart(current, size);
  };
  $('.buy .add').addEventListener('click', (e) => add(e.currentTarget));
  $('.sticky-atc .btn').addEventListener('click', (e) => add(e.currentTarget));
  new IntersectionObserver(([en]) => $('.sticky-atc').classList.toggle('is-on', !en.isIntersecting && en.boundingClientRect.top < 0)).observe($('.buy .add'));

  $('.spin-btn').addEventListener('click', (e) => {
    const fig = e.currentTarget.closest('figure');
    if (!spin) { const box = document.createElement('div'); box.className = 'spin'; box.dataset.cursor = 'Drag'; fig.appendChild(box); $('img', fig).style.visibility = 'hidden';
      spin = createShoe(box, { modelUrl: 'model/shoe.glb', texBase: 'model/tex/', colourway: current, autoRotate: false });
      e.currentTarget.textContent = 'Show photo';
    } else { fig.classList.toggle('photo'); const on = fig.classList.contains('photo'); $('.spin', fig).style.display = on ? 'none' : ''; $('img', fig).style.visibility = on ? 'visible' : 'hidden'; e.currentTarget.textContent = on ? 'Spin in 3D' : 'Show photo'; }
  });

  $$('.acc button').forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true')));
  $('[data-size-guide]').addEventListener('click', () => { const acc = $('#acc-fit'); acc.setAttribute('aria-expanded', 'true'); acc.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
}

/* entrance for section headings: one reveal per heading, only once */
if (!reduce) $$('[data-reveal]').forEach((el) => gsap.from(el, { yPercent: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } }));
