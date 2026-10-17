// Halfstep theme — wires the hs-* sections to the Shopify AJAX Cart API, the 3D scenes (hs-shoe3d.js)
// and the motion kit (hs-fx.js). Same behaviour as the static preview's js/app.js.
import { createStage, createAnatomy } from './hs-shoe3d.js';
import { env, initCursor, initMagnetic, initWipe, marquee, createRail, makeFlap, setFlap, scrambleFlap, confetti, glitch, shake, kineticWord } from './hs-fx.js';

const HS = window.HS;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);
const reduce = env.reduce;
const design = !!window.Shopify?.designMode;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const asset = (file) => HS.assetBase + file;
const texUrl = (h) => asset(`hs-tex-${h}.webp`);
const render = (h, a = 'q34') => asset(`hs-${h}-${a}.webp`);
const money = (cents) => new Intl.NumberFormat(HS.locale || 'en', { style: 'currency', currency: HS.currency || 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
const handleize = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');
const fill = (s, o) => s.replace(/\[(\w+)\]/g, (m, k) => (o[k] ?? m));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const hdrH = () => $('.hdr')?.offsetHeight || 0;
window.__hs = {};

/* ---------- colourways (theme settings) ---------- */
const COLOURS = HS.colours;
const colourBy = (nameOrHandle) => COLOURS.find((c) => c.handle === handleize(nameOrHandle)) || { name: nameOrHandle, handle: handleize(nameOrHandle), sw: '#999', acid: '#C8FF2E', ink: '#000', desc: '' };
let current = store.get('hs-cw', COLOURS[0]?.handle);
if (!COLOURS.some((c) => c.handle === current && !c.soon)) current = COLOURS.find((c) => !c.soon)?.handle;
const root = document.documentElement;
function applyTheme(h, animate = true) {
  const c = colourBy(h);
  gsap.to(root, { '--acid': c.acid, duration: animate && !reduce ? 0.9 : 0, ease: 'power2.inOut' });
  root.style.setProperty('--acid-ink', c.ink);
}
applyTheme(current, false);

/* ---------- product model ---------- */
function productModel(json) {
  const p = JSON.parse(json);
  const names = p.options.map((o) => o.name || o);
  const ci = Math.max(0, names.findIndex((n) => /colou?r/i.test(n)));
  const si = names.findIndex((n) => /size/i.test(n));
  const opt = (v, i) => (i < 0 ? null : v.options[i]);
  return {
    p,
    variant(h, size) { return p.variants.find((v) => handleize(opt(v, ci)) === h && (si < 0 || opt(v, si) === size)); },
    sizes(h) { return p.variants.filter((v) => handleize(opt(v, ci)) === h).map((v) => ({ size: opt(v, si), available: v.available, id: v.id, price: v.price })); },
    colours() { return [...new Set(p.variants.map((v) => opt(v, ci)))].map((n) => { const c = colourBy(n); return { ...c, name: c.name || n, soon: c.soon || !p.variants.some((v) => handleize(opt(v, ci)) === c.handle && v.available) }; }); },
    colourOf(v) { return handleize(opt(v, ci)); },
  };
}

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduce && !design && !env.capture) {
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
const goDrop = () => { const d = $('#drop'); if (d) scrollToEl(d); else location.href = `${HS.routes.root}#drop`; };
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="#"]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
  const t = document.querySelector(url.hash);
  if (!t) return;
  e.preventDefault(); closeMenu(); scrollToEl(t);
});

/* ---------- menu ---------- */
const menu = $('.menu'), menuBtn = $('.menu-btn');
const menuLabel = menuBtn?.textContent;
function closeMenu() { if (!menu || menu.hidden) return; menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = menuLabel; }
menuBtn?.addEventListener('click', () => {
  if (!menu.hidden) return closeMenu();
  menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.textContent = '×';
  if (!reduce) gsap.from($$('a', menu), { xPercent: -30, opacity: 0, duration: 0.5, ease: 'expo.out', stagger: 0.05 });
});
if (menu) $$('a', menu).forEach((a) => a.addEventListener('click', closeMenu));

initCursor();
if (!design) initWipe();

/* ---------- cart drawer ---------- */
const drawerEl = $('.drawer'), scrim = $('.drawer-scrim');
let opener = null, isOpen = false;
if (drawerEl) gsap.set(drawerEl, { xPercent: 105 });
const drawer = {
  open() {
    if (!drawerEl || isOpen) return; isOpen = true; opener = document.activeElement;
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
$$('[data-open-cart]').forEach((b) => b.addEventListener('click', (e) => { if (!drawerEl) return; e.preventDefault(); drawer.open(); }));
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

async function cartFetch(url, body) {
  const res = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) } : { headers: { Accept: 'application/json' } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.description || data.message || 'Something went wrong. Try again.');
  return data;
}
async function addToCart(variantId, { open = true } = {}) {
  await cartFetch(HS.routes.add + '.js', { items: [{ id: variantId, quantity: 1 }] });
  const cart = await renderCart();
  $$('.bag-count').forEach((c) => { if (!reduce) gsap.fromTo(c, { scale: 1.8, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(3)' }); });
  if (open) setTimeout(drawer.open, 420);
  return cart;
}
const optVal = (item, re) => item.options_with_values?.find((o) => re.test(o.name))?.value;
async function renderCart() {
  const cart = await cartFetch(HS.routes.cart + '.js');
  $$('.bag-count').forEach((el) => (el.textContent = cart.item_count));
  if (!drawerEl) return cart;
  const lines = $('.lines', drawerEl);
  lines.innerHTML = cart.items.length ? '' : `<div class="empty"><p>${HS.t.empty}</p><p class="small">${HS.t.emptyText}</p></div>`;
  cart.items.forEach((item) => {
    const colour = optVal(item, /colou?r/i);
    const c = colour ? colourBy(colour) : null;
    const el = document.createElement('div');
    el.className = 'line';
    if (c) el.style.setProperty('--c', c.acid);
    el.innerHTML = `<img src="${c ? render(c.handle) : item.image}" alt="" width="84" height="84" loading="lazy">
      <div><h3></h3><p></p><span class="qty"><button type="button" aria-label="${HS.t.less}">−</button><output>${item.quantity}</output><button type="button" aria-label="${HS.t.more}">+</button></span></div>
      <b class="num">${money(item.final_line_price)}</b>`;
    $('h3', el).textContent = colour ? `${item.product_title}, ${colour}` : item.product_title;
    $('p', el).textContent = optVal(item, /size/i) || item.variant_title || '';
    const [minus, plus] = $$('button', el);
    const change = async (q) => { el.style.opacity = 0.5; await cartFetch(HS.routes.change + '.js', { id: item.key, quantity: q }); renderCart(); };
    minus.onclick = () => change(item.quantity - 1);
    plus.onclick = () => change(item.quantity + 1);
    lines.appendChild(el);
  });
  $('.drawer-total', drawerEl).textContent = money(cart.total_price);
  const ship = $('.ship', drawerEl);
  if (HS.freeShip > 0) {
    const left = HS.freeShip - cart.total_price;
    $('p', ship).textContent = cart.total_price === 0 ? fill(HS.t.shipIdle, { amount: money(HS.freeShip) }) : left > 0 ? fill(HS.t.shipLeft, { amount: money(left) }) : HS.t.shipDone;
    const pct = Math.min(100, (cart.total_price / HS.freeShip) * 100);
    gsap.to($('.ship-bar b', ship), { width: `${pct}%`, duration: reduce ? 0 : 0.8, ease: 'expo.out' });
    $('.ship-bar', ship).classList.toggle('is-full', pct >= 100);
  } else ship.hidden = true;
  // upsell: a colour that isn't in the bag yet, in the same size as the first pair
  const up = $('.upsell', drawerEl);
  const model = window.__hs.model;
  up.hidden = true;
  if (model && cart.items.length) {
    const inBag = new Set(cart.items.map((i) => handleize(optVal(i, /colou?r/i) || '')));
    const size = optVal(cart.items[0], /size/i);
    const pick = model.colours().find((c) => !inBag.has(c.handle) && !c.soon && model.variant(c.handle, size)?.available);
    if (pick) {
      const v = model.variant(pick.handle, size);
      up.hidden = false; up.style.setProperty('--c', pick.acid);
      up.innerHTML = `${HS.t.upsellBadge ? '<span class="off"></span>' : ''}<img src="${render(pick.handle)}" alt="" width="72" height="72"><div><b></b><br><span class="small"></span></div><button type="button" data-cursor="ADD"></button>`;
      if (HS.t.upsellBadge) $('.off', up).textContent = HS.t.upsellBadge;
      $('b', up).textContent = fill(HS.t.upsellTitle, { colour: pick.name });
      $('.small', up).textContent = HS.t.upsellText;
      $('button', up).textContent = fill(HS.t.upsellAdd, { size: size || '' });
      $('button', up).onclick = () => addToCart(v.id, { open: false });
    }
  }
  return cart;
}
renderCart().catch(() => {});
function feedback(btn) { btn.classList.add('is-added'); setTimeout(() => btn.classList.remove('is-added'), 1600); }
function failed(btn, err) { const l = $('.btn-label', btn); const old = l.innerHTML; l.textContent = err.message; shake(btn); setTimeout(() => (l.innerHTML = old), 2600); }

/* ---------- swatches + colour state ---------- */
const listeners = [];
function buildSwatches(wrap, colours, onPick) {
  wrap.innerHTML = '';
  colours.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.type = 'button'; b.dataset.handle = c.handle; b.dataset.cursor = c.soon ? 'SOON' : 'PICK';
    b.style.setProperty('--sw', c.sw); b.style.setProperty('--ac', c.acid);
    b.setAttribute('aria-label', c.soon ? `${c.name}, ${HS.t.soon}` : c.name);
    b.setAttribute('aria-pressed', c.handle === current);
    if (c.soon) b.dataset.soon = '';
    b.onclick = () => (c.soon ? goDrop() : onPick(c.handle));
    wrap.appendChild(b);
  });
}
function setCurrent(h) {
  current = h; store.set('hs-cw', h); applyTheme(h);
  const c = colourBy(h);
  $$('.swatch').forEach((s) => s.setAttribute('aria-pressed', s.dataset.handle === h));
  $$('[data-cw-name]').forEach((el) => (el.textContent = c.name));
  $$('[data-cw-desc]').forEach((el) => (el.textContent = c.desc || ''));
  $$('.card-wear[data-handle]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.handle === h));
  $$('.sticky-atc img').forEach((im) => (im.src = render(h)));
  listeners.forEach((fn) => fn(h, c));
  if (!reduce) gsap.fromTo('.hb-name, .buy-title', { skewX: -18, xPercent: -4 }, { skewX: 0, xPercent: 0, duration: 0.7, ease: 'elastic.out(1,.5)' });
}
window.__hs.setCurrent = setCurrent;
window.__hs.drawer = drawer;

/* ---------- sticky add to bag (mobile) ---------- */
function stickyBar(bar, watch, onAdd) {
  if (!bar || !watch) return;
  const btn = $('.btn', bar);
  btn.addEventListener('click', () => onAdd(btn));
  let on = false;
  gsap.set(bar, { yPercent: 150 });
  new IntersectionObserver(([en]) => {
    const show = !en.isIntersecting && en.boundingClientRect.top < 0;
    if (show === on) return; on = show;
    bar.setAttribute('aria-hidden', String(!show)); btn.tabIndex = show ? 0 : -1;
    gsap.to(bar, { yPercent: show ? 0 : 150, visibility: show ? 'visible' : 'hidden', duration: reduce ? 0 : 0.5, ease: show ? 'back.out(1.6)' : 'expo.in' });
  }).observe(watch);
}

/* ---------- marquees + footer word ---------- */
$$('.mq').forEach((m, i) => marquee(m, { speed: 70, dir: i % 2 ? -1 : 1 }));
$$('.ftr-word').forEach(kineticWord);

/* ================= SECTIONS ================= */

// 3D hero with kinetic word
$$('.hs-hero').forEach((sec) => {
  const model = productModel($('[data-hs-product]', sec).textContent);
  window.__hs.model ||= model;
  const size = sec.dataset.size;
  const c0 = colourBy(current);
  const stage = createStage($('.hero-stage', sec), { modelUrl: asset('hs-shoe.glb'), texUrl, colourway: current, acid: c0.acid, word: sec.dataset.word || 'DRIFT', onReady: () => (window.__hs.heroReady = true) });
  window.__hs.stage = stage;
  buildSwatches($('.swatches', sec), model.colours(), (h) => setCurrent(h));
  listeners.push((h, c) => stage.setColourway(h, c.acid));
  const addBtn = $('.add-quick', sec);
  const sync = () => { const v = model.variant(current, size); addBtn.disabled = !v?.available; };
  listeners.push(sync);
  setCurrent(current);
  if (!reduce) {
    gsap.timeline({ delay: root.classList.contains('is-wiping') ? 0.5 : 0.15 })
      .from($$('.hero-bar > *', sec), { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.08 })
      .from($('.hero-title', sec), { y: -60, rotate: -14, opacity: 0, duration: 0.9, ease: 'back.out(1.8)' }, 0.5)
      .from($('.hero-price', sec), { scale: 0, rotate: 40, duration: 0.8, ease: 'back.out(2.2)' }, 0.75);
  }
  const quickAdd = async (btn) => {
    const v = model.variant(current, size);
    if (!v?.available) return failed(btn, new Error(fill(HS.t.unavailable, { size, colour: colourBy(current).name })));
    try { await addToCart(v.id); feedback(btn); } catch (err) { failed(btn, err); }
  };
  addBtn.addEventListener('click', () => quickAdd(addBtn));
  stickyBar($('.sticky-atc', sec), addBtn, quickAdd);
});

// Anatomy: pinned, scroll-scrubbed explode with drawn callouts and counting stats
$$('.hs-anatomy').forEach((sec) => {
  const pin = $('.ana-pin', sec), stageEl = $('.ana-stage', sec), svg = $('.ana-lines', sec);
  const calls = Object.fromEntries($$('.call', sec).map((c) => [c.dataset.k, c]));
  const order = ['laces', 'upper', 'foam', 'outsole'].filter((k) => calls[k]);
  const TH = { laces: 0.36, upper: 0.44, foam: 0.52, outsole: 0.6 };
  const NS = 'http://www.w3.org/2000/svg';
  const lineEls = {};
  order.forEach((k) => {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = '<polyline fill="none" stroke="#000" stroke-width="3"/><circle r="8"/><rect width="10" height="10"/>';
    svg.appendChild(g); lineEls[k] = g;
  });
  let prog = reduce || design ? 1 : 0;
  const local = (k) => clamp((prog - TH[k]) / 0.1);
  const anatomy = createAnatomy(stageEl, {
    modelUrl: asset('hs-shoe.glb'), texUrl, colourway: current, acid: colourBy(current).acid,
    onFrame(pts) {
      if (innerWidth <= 900) return;
      const pr = pin.getBoundingClientRect(), sr = stageEl.getBoundingClientRect();
      pts.forEach((p) => {
        const g = lineEls[p.key], call = calls[p.key];
        if (!g) return;
        const l = local(p.key);
        const [pl, ci, sq] = g.children;
        if (l <= 0) { g.style.display = 'none'; return; }
        g.style.display = '';
        const ax = p.x + sr.left - pr.left, ay = p.y + sr.top - pr.top;
        const cr = call.getBoundingClientRect();
        const left = p.key === 'upper' || p.key === 'foam';
        const ex = (left ? cr.right : cr.left) - pr.left, ey = cr.top - pr.top + 26;
        const mx = ax + (ex - ax) * 0.45;
        const L1 = Math.hypot(mx - ax, ey - ay), L2 = Math.abs(ex - mx);
        const rem = (L1 + L2) * l; const out = [[ax, ay]];
        if (rem <= L1) { const t = rem / L1; out.push([ax + (mx - ax) * t, ay + (ey - ay) * t]); }
        else { out.push([mx, ey]); const t = (rem - L1) / L2; out.push([mx + (ex - mx) * t, ey]); }
        pl.setAttribute('points', out.map((q) => q.join(',')).join(' '));
        ci.setAttribute('cx', ax); ci.setAttribute('cy', ay);
        sq.setAttribute('x', ex - 5); sq.setAttribute('y', ey - 5); sq.style.opacity = l >= 1 ? 1 : 0;
      });
    },
  });
  listeners.push((h, c) => anatomy.setColourway(h, c.acid));
  const counts = $$('[data-count]', sec).map((b) => {
    const raw = b.dataset.count; const n = parseFloat(raw.replace(/[^\d.]/g, ''));
    return { b, n, dec: (raw.split('.')[1] || '').replace(/\D/g, '').length, suffix: raw.replace(/^[\d.,\s]+/, ''), k: b.closest('.call').dataset.k };
  }).filter((c) => !isNaN(c.n));
  const step = $('.ana-step', sec), fillEl = $('.ana-fill', sec);
  const draw = () => {
    anatomy.setProgress(prog);
    fillEl.style.transform = `scaleX(${prog})`;
    order.forEach((k) => {
      const l = local(k), c = calls[k];
      c.style.opacity = l > 0 ? 1 : 0;
      c.style.clipPath = `inset(0 ${(1 - l) * 100}% 0 0)`;
      c.style.transform = `translateY(${(1 - l) * 16}px)`;
    });
    counts.forEach((c) => {
      const t = clamp((prog - TH[c.k]) / 0.2);
      c.b.textContent = (c.n * (1 - Math.pow(1 - t, 3))).toFixed(c.dec) + c.suffix;
    });
    const shown = order.filter((k) => local(k) > 0);
    step.textContent = prog < 0.12 ? HS.t.stepStart : fill(HS.t.stepPart, { n: shown.length || 1, total: order.length, name: $('h3', calls[shown[shown.length - 1] || order[0]]).textContent });
  };
  if (!reduce && !design) {
    ScrollTrigger.create({ trigger: sec, start: () => `top ${hdrH()}px`, end: '+=260%', pin, scrub: true, anticipatePin: 1, onUpdate: (s) => { prog = s.progress; draw(); } });
  }
  draw();
});

// Colour rail
$$('.hs-rail').forEach((sec) => {
  const flood = sec.dataset.flood === 'true';
  const cards = $$('.card', sec);
  const count = $('.rail-count', sec), bar = $$('.rail-bar i', sec);
  const onChange = (i) => {
    count.textContent = `${i + 1}/${cards.length}`;
    bar.forEach((b, j) => b.classList.toggle('on', j <= i));
    if (flood && cards[i]) {
      const acid = cards[i].style.getPropertyValue('--c').trim();
      gsap.to(sec, { '--rail-acid': acid, duration: reduce ? 0 : 0.6, ease: 'power2.out' });
      const c = COLOURS.find((x) => x.acid.toLowerCase() === acid.toLowerCase());
      sec.style.setProperty('--rail-ink', c?.ink || '#000');
    }
  };
  const rail = createRail($('.rail-view', sec), { onChange });
  onChange(0);
  $('[data-rail="prev"]', sec).onclick = rail.prev;
  $('[data-rail="next"]', sec).onclick = rail.next;
  $$('.card-wear[data-handle]', sec).forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.handle === current);
    b.addEventListener('click', () => setCurrent(b.dataset.handle));
  });
  $$('[data-remind]', sec).forEach((b) => b.addEventListener('click', goDrop));
  window.__hs.rail ||= rail;
});

// Fit finder: drag the toe, pick a width, lock it in
$$('.hs-fit').forEach((sec) => {
  const model = productModel($('[data-hs-product]', sec).textContent);
  window.__hs.model ||= model;
  const prefix = sec.dataset.prefix, min = +sec.dataset.min || 6, max = +sec.dataset.max || 13;
  const field = $('.gauge-field', sec), range = $('.foot-range', sec), gauge = $('.gauge', sec);
  const steps = $$('.fit-steps li', sec);
  $('.ruler', sec).innerHTML = Array.from({ length: 65 }, (_, i) => { const cm = i / 2; const maj = cm % 2 === 0; return `<i class="${maj ? 'maj' : ''}" style="left:${(cm / 32) * 100}%"></i>${maj && cm > 0 && cm < 32 ? `<em style="left:${(cm / 32) * 100}%">${cm}</em>` : ''}`; }).join('');
  let width = 'regular', lastSize = null, touched = false, fitLabel = null;
  const sizeFor = (L, w) => { let raw = 6 + (L - 24.5) / 0.85; if (w === 'wide') raw += 0.5; if (w === 'narrow') raw -= 0.25; return clamp(Math.round(raw), min, max); };
  const label = (n) => `${prefix} ${n}`.trim();
  const setStep = (i) => steps.forEach((s, j) => { s.classList.toggle('is-on', j === i); s.classList.toggle('is-done', j < i); });
  const sizeOut = $('.size-out', sec);
  const update = () => {
    const L = parseFloat(range.value);
    field.style.setProperty('--len', L);
    $('.len', sec).textContent = L.toFixed(1);
    const n = sizeFor(L, width);
    range.setAttribute('aria-valuetext', `${L.toFixed(1)} cm, ${label(n)}`);
    if (n !== lastSize) {
      const prev = $('span', sizeOut);
      const next = document.createElement('span'); next.textContent = label(n);
      if (lastSize !== null && !reduce && prev) {
        const dir = n > lastSize ? 1 : -1;
        sizeOut.appendChild(next);
        gsap.set(next, { position: 'absolute', left: 0, right: 0, top: 0 });
        gsap.fromTo(next, { yPercent: 100 * dir, rotate: 6 * dir }, { yPercent: 0, rotate: 0, duration: 0.45, ease: 'back.out(2)', onComplete: () => gsap.set(next, { clearProps: 'position,left,right,top' }) });
        gsap.to(prev, { yPercent: -100 * dir, duration: 0.35, ease: 'power3.in', onComplete: () => prev.remove() });
        gsap.fromTo($('.toe-pin span', sec), { rotate: -18, scale: 1.25 }, { rotate: -6, scale: 1, duration: 0.5, ease: 'elastic.out(1,.4)' });
      } else { sizeOut.innerHTML = ''; sizeOut.appendChild(next); }
      lastSize = n;
    }
    $('.lock-size', sec).textContent = label(n);
  };
  const fromPointer = (e) => {
    const r = field.getBoundingClientRect();
    range.value = clamp(((e.clientX - r.left - 22) / (r.width - 22)) * 32, 22, 31).toFixed(1);
    range.dispatchEvent(new Event('input'));
  };
  let dragging = false;
  field.addEventListener('pointerdown', (e) => { e.preventDefault(); dragging = true; field.setPointerCapture(e.pointerId); fromPointer(e); range.focus({ preventScroll: true }); });
  field.addEventListener('pointermove', (e) => dragging && fromPointer(e));
  field.addEventListener('pointerup', () => { dragging = false; });
  range.addEventListener('input', () => { update(); if (!touched) { touched = true; setStep(1); } });
  range.addEventListener('focus', () => field.classList.add('is-focus'));
  range.addEventListener('blur', () => field.classList.remove('is-focus'));
  $$('.widths button', sec).forEach((b) => b.addEventListener('click', () => {
    width = b.dataset.w;
    $$('.widths button', sec).forEach((x) => x.setAttribute('aria-pressed', x === b));
    setStep(2); update();
    if (!reduce) gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
  }));
  const stamp = $('.stamp', sec), burst = $('.stamp-burst', sec);
  burst.innerHTML = Array.from({ length: 14 }, (_, i) => `<i style="transform:rotate(${(i / 14) * 360}deg)"></i>`).join('');
  const addBtn = $('.fit-add', sec);
  $('.lock-btn', sec).addEventListener('click', () => {
    const L = parseFloat(range.value), n = sizeFor(L, width);
    fitLabel = label(n);
    steps.forEach((s) => { s.classList.remove('is-on'); s.classList.add('is-done'); });
    $('.stamp-size', sec).textContent = fitLabel;
    const o = { cm: L.toFixed(1), size: fitLabel, base: label(sizeFor(L, 'regular')) };
    $('.stamp-why', sec).textContent = fill(width === 'wide' ? HS.t.fitWide : width === 'narrow' ? HS.t.fitNarrow : HS.t.fitTrue, o);
    $('.btn-label', addBtn).textContent = fill(HS.t.addSize, { size: fitLabel });
    stamp.hidden = false;
    if (!reduce) {
      gsap.timeline()
        .fromTo(stamp, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.45, ease: 'expo.inOut' })
        .fromTo($('.stamp-size', sec), { scale: 3.2, rotate: -32, opacity: 0 }, { scale: 1, rotate: -7, opacity: 1, duration: 0.42, ease: 'power4.in' }, 0.3)
        .add(() => shake(gauge), 0.72)
        .fromTo($$('i', burst), { scaleX: 0, x: 80, opacity: 1 }, { scaleX: 1, x: 150, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.01 }, 0.72)
        .fromTo([$('.stamp-why', sec), $('.stamp-actions', sec)], { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.08 }, 0.85);
    }
    addBtn.focus({ preventScroll: true });
  });
  addBtn.addEventListener('click', async () => {
    const v = model.variant(current, fitLabel);
    if (!v?.available) return failed(addBtn, new Error(fill(HS.t.unavailable, { size: fitLabel, colour: colourBy(current).name })));
    try { await addToCart(v.id); feedback(addBtn); } catch (err) { failed(addBtn, err); }
  });
  $('.fit-again', sec).addEventListener('click', () => {
    const done = () => { stamp.hidden = true; setStep(0); touched = false; range.focus(); };
    if (reduce) return done();
    gsap.to(stamp, { clipPath: 'inset(100% 0 0 0)', duration: 0.45, ease: 'expo.inOut', onComplete: done });
  });
  update();
});

// Next drop: split-flap board + reminder form (Shopify customer form)
$$('.hs-drop').forEach((sec) => {
  const target = Date.parse(sec.dataset.date) || Date.now();
  const wordRow = $('.board-word', sec), timeRow = $('.board-time', sec), board = $('.board', sec);
  const word = wordRow.dataset.word || '';
  const wordFlaps = [...word].map(() => { const f = makeFlap(' '); wordRow.appendChild(f); return f; });
  const timeFlaps = [];
  for (let g = 0; g < 4; g++) {
    if (g) { const s = document.createElement('span'); s.className = 'sep'; timeRow.appendChild(s); }
    for (let k = 0; k < 2; k++) { const f = makeFlap('0'); timeRow.appendChild(f); timeFlaps.push(f); }
  }
  const digits = () => {
    const s = Math.max(0, (target - Date.now()) / 1000);
    return [Math.min(99, Math.floor(s / 86400)), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, Math.floor(s) % 60].map((n) => String(n).padStart(2, '0')).join('');
  };
  let live = false;
  ScrollTrigger.create({
    trigger: sec, start: 'top 75%', once: true,
    onEnter: () => {
      [...word].forEach((ch, i) => scrambleFlap(wordFlaps[i], ch, { delay: i * 0.08, steps: 7 }));
      [...digits()].forEach((ch, i) => scrambleFlap(timeFlaps[i], ch, { delay: 0.2 + i * 0.05, steps: 6 }));
      setTimeout(() => { live = true; }, 1600);
    },
  });
  setInterval(() => { if (live) [...digits()].forEach((ch, i) => setFlap(timeFlaps[i], ch)); }, 1000);
  if (!reduce) gsap.fromTo($('.drop-shoe', sec), { xPercent: 14, rotate: -2 }, { xPercent: -4, rotate: -11, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });

  const form = $('form', sec), msg = $('.notify-msg', sec), input = $('input[type="email"]', form), btn = $('button', form);
  const celebrate = () => {
    msg.textContent = HS.t.notified; btn.textContent = HS.t.notifiedBtn;
    const cv = $('.confetti', sec), cr = cv.getBoundingClientRect(), br = btn.getBoundingClientRect();
    confetti(cv, br.left - cr.left + br.width / 2, br.top - cr.top + br.height / 2, ['#000', '#fff', ...COLOURS.map((c) => c.acid)]);
    glitch(board);
  };
  form.addEventListener('submit', (e) => {
    const v = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      e.preventDefault();
      form.classList.add('is-error'); msg.classList.add('is-error');
      msg.textContent = v ? fill(HS.t.emailBad, { email: v }) : HS.t.emailMissing;
      shake(form); input.focus();
    }
  });
  input.addEventListener('input', () => { form.classList.remove('is-error'); msg.classList.remove('is-error'); });
  if (msg.dataset.posted === 'true' || location.search.includes('customer_posted=true')) {
    setTimeout(() => { scrollToEl(sec); setTimeout(celebrate, 900); }, 400);
  }
});

// Product page
$$('.hs-product').forEach((sec) => {
  const model = productModel($('[data-hs-product]', sec).textContent);
  window.__hs.model = model;
  const url = new URL(location.href);
  const initial = model.p.variants.find((v) => String(v.id) === url.searchParams.get('variant'));
  if (initial) { const h = model.colourOf(initial); if (COLOURS.some((c) => c.handle === h)) current = h; }
  applyTheme(current, false);
  const c0 = colourBy(current);
  const stage = createStage($('.pdp-stage', sec), { modelUrl: asset('hs-shoe.glb'), texUrl, colourway: current, acid: c0.acid, word: c0.name.toUpperCase(), camDist: 0.78, onReady: () => (window.__hs.heroReady = true) });
  window.__hs.stage = stage;
  let size = null;
  const prefix = sec.dataset.prefix;
  const shots = $$('.pdp-shots img', sec);
  const useRenders = sec.dataset.renders === 'true';
  const media = (model.p.media || []).filter((m) => m.media_type === 'image');
  const setShots = (h) => {
    const own = media.filter((m) => handleize(m.alt || '') === h);
    shots.forEach((im, i) => {
      const src = !useRenders && own[i] ? `${own[i].src}${own[i].src.includes('?') ? '&' : '?'}width=1400` : render(h, im.dataset.angle);
      const swap = () => { im.src = src; im.alt = `${model.p.title}, ${colourBy(h).name}`; };
      if (reduce) return swap();
      gsap.to(im, { opacity: 0, y: 14, duration: 0.18, delay: i * 0.05, onComplete: () => { swap(); (im.decode?.() || Promise.resolve()).catch(() => {}).finally(() => gsap.to(im, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' })); } });
    });
  };
  const sizesWrap = $('.sizes', sec);
  const form = $('form[action*="/cart/add"]', sec);
  const idInput = $('input[name="id"]', form);
  const addBtn = $('.add', sec);
  const update = () => {
    const v = size ? model.variant(current, size) : null;
    if (v) { idInput.value = v.id; url.searchParams.set('variant', v.id); history.replaceState(null, '', url); }
    $$('[data-size]').forEach((el) => (el.textContent = size || HS.t.pickSize));
    const any = v || model.sizes(current)[0];
    if (any) $$('[data-price]').forEach((el) => (el.textContent = money(any.price)));
  };
  const renderSizes = () => {
    sizesWrap.innerHTML = '';
    model.sizes(current).forEach((s) => {
      const b = document.createElement('button');
      b.className = 'size'; b.type = 'button'; b.textContent = String(s.size).replace(prefix, '').trim();
      b.disabled = !s.available; b.dataset.cursor = 'PICK';
      b.setAttribute('aria-label', s.available ? s.size : `${s.size}, ${HS.t.soldOut}`);
      b.setAttribute('aria-pressed', s.size === size);
      b.onclick = () => {
        size = s.size; $('.size-hint', sec).textContent = '';
        $$('.size', sec).forEach((x) => x.setAttribute('aria-pressed', x === b));
        update();
        if (!reduce) gsap.fromTo(b, { scale: 0.86 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
      };
      sizesWrap.appendChild(b);
    });
    if (size && !model.variant(current, size)?.available) size = null;
    update();
  };
  const pick = (h) => {
    setCurrent(h); setShots(h); renderSizes();
    $('.stock', sec).textContent = model.sizes(h).some((s) => s.available) ? HS.t.inStock : HS.t.soldOut;
  };
  buildSwatches($('.swatches', sec), model.colours(), pick);
  listeners.push((h, c) => { stage.setColourway(h, c.acid); stage.setWord(c.name.toUpperCase()); });
  pick(current);

  const add = async (btn) => {
    if (!size) {
      $('.size-hint', sec).textContent = HS.t.sizeFirst;
      shake(sizesWrap);
      const r = sizesWrap.getBoundingClientRect();
      if (r.top < hdrH() || r.bottom > innerHeight) scrollToEl(sizesWrap.closest('.pick'));
      return;
    }
    try { await addToCart(model.variant(current, size).id); feedback(btn); } catch (err) { failed(btn, err); }
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); add(addBtn); });
  stickyBar($('.sticky-atc'), addBtn, add);
  $$('.acc button', sec).forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true')));
  if (!reduce) {
    gsap.timeline({ delay: root.classList.contains('is-wiping') ? 0.5 : 0.1 })
      .from($('.buy-title', sec), { yPercent: 60, skewY: 8, opacity: 0, duration: 0.9, ease: 'expo.out' })
      .from($$('.buy > :not(.buy-title)', sec), { y: 30, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.04 }, 0.15);
  }
});

initMagnetic();
// Re-init after edits in the theme editor
document.addEventListener('shopify:section:load', () => location.reload());
