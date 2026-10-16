// Halfstep theme — interactions for the custom sections (hs-*). Works with the Shopify AJAX Cart API.
import { createShoe } from './hs-shoe3d.js';

const HS = window.HS;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);
const asset = (file) => HS.assetBase + file;
const texUrl = (handle) => asset(`hs-tex-${handle}.webp`);
const render = (handle, angle) => asset(`hs-${handle}-${angle}.webp`);
const money = (cents) => new Intl.NumberFormat(HS.locale || 'en', { style: 'currency', currency: HS.currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
const handleize = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ---------- colourways (from theme settings) ---------- */
const COLOURS = HS.colours;
const colourByName = (name) => COLOURS.find((c) => c.handle === handleize(name)) || { name, handle: handleize(name), sw: '#999', cw: '#000', ink: '#fff' };
let current = store.get('hs-cw', COLOURS[0]?.handle);
if (!COLOURS.some((c) => c.handle === current && !c.soon)) current = COLOURS.find((c) => !c.soon)?.handle;

function applyTheme(handle) {
  const c = COLOURS.find((x) => x.handle === handle);
  if (!c) return;
  gsap.to(document.documentElement, { '--cw': c.cw, duration: reduce ? 0 : 0.6, ease: 'power2.out' });
  document.documentElement.style.setProperty('--cw-ink', c.ink);
}
applyTheme(current);
const soon = COLOURS.find((c) => c.soon);
if (soon) document.documentElement.style.setProperty('--sw-ember', soon.cw);

/* ---------- product helpers ---------- */
function productModel(json) {
  const p = JSON.parse(json);
  const ci = Math.max(0, p.options.findIndex((o) => /colou?r/i.test(o.name || o)));
  const si = p.options.findIndex((o) => /size/i.test(o.name || o));
  const opt = (v, i) => (i < 0 ? null : v.options[i]);
  return {
    p,
    variant(colourHandle, size) { return p.variants.find((v) => handleize(opt(v, ci)) === colourHandle && (si < 0 || opt(v, si) === size)); },
    sizes(colourHandle) { return p.variants.filter((v) => handleize(opt(v, ci)) === colourHandle).map((v) => ({ size: opt(v, si), available: v.available, id: v.id, price: v.price })); },
    colours() { return [...new Set(p.variants.map((v) => opt(v, ci)))].map(colourByName); },
  };
}

/* ---------- smooth scroll ---------- */
let lenis;
if (!reduce && !window.Shopify?.designMode) {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- header ---------- */
const hdr = $('.hdr');
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  hdr?.classList.toggle('is-solid', y > 40);
  hdr?.classList.toggle('is-hidden', y > lastY && y > 300 && !document.body.classList.contains('drawer-open'));
  lastY = y;
}, { passive: true });

/* ---------- cursor + magnetic ---------- */
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

/* ---------- cart drawer (Shopify AJAX API) ---------- */
const drawerEl = $('.drawer');
const drawer = {
  open() { document.body.classList.add('drawer-open'); lenis?.stop(); drawerEl?.focus(); },
  close() { document.body.classList.remove('drawer-open'); lenis?.start(); },
};
$$('[data-open-cart]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); drawer.open(); }));
$$('[data-close-cart]').forEach((b) => b.addEventListener('click', drawer.close));
addEventListener('keydown', (e) => { if (e.key === 'Escape') drawer.close(); });

async function cartFetch(url, body) {
  const res = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) } : { headers: { Accept: 'application/json' } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.description || data.message || 'Something went wrong. Try again.');
  return data;
}
async function addToCart(variantId, { open = true } = {}) {
  await cartFetch(HS.routes.add + '.js', { items: [{ id: variantId, quantity: 1 }] });
  const cart = await renderCart();
  const count = $('.bag-count');
  if (count) { count.classList.remove('bump'); void count.offsetWidth; count.classList.add('bump'); }
  if (open) setTimeout(drawer.open, 420);
  return cart;
}
async function renderCart() {
  const cart = await cartFetch(HS.routes.cart + '.js');
  $$('.bag-count').forEach((el) => (el.textContent = cart.item_count));
  if (!drawerEl) return cart;
  const lines = $('.lines', drawerEl);
  lines.innerHTML = cart.items.length ? '' : `<div class="empty"><p>${HS.t.empty}</p></div>`;
  cart.items.forEach((item) => {
    const colourOpt = item.options_with_values?.find((o) => /colou?r/i.test(o.name));
    const c = colourOpt ? colourByName(colourOpt.value) : null;
    const img = item.image || (c ? render(c.handle, 'q34') : '');
    const el = document.createElement('div');
    el.className = 'line';
    el.innerHTML = `<img src="${img}" alt="" width="84" height="84" loading="lazy">
      <div><h3></h3><p></p><span class="qty"><button type="button" aria-label="${HS.t.less}">−</button><output>${item.quantity}</output><button type="button" aria-label="${HS.t.more}">+</button></span></div>
      <b>${money(item.final_line_price)}</b>`;
    $('h3', el).textContent = item.product_title;
    $('p', el).textContent = item.variant_title || '';
    const [minus, plus] = $$('button', el);
    const change = async (q) => { el.style.opacity = 0.5; await cartFetch(HS.routes.change + '.js', { id: item.key, quantity: q }); renderCart(); };
    minus.onclick = () => change(item.quantity - 1);
    plus.onclick = () => change(item.quantity + 1);
    lines.appendChild(el);
  });
  $('.drawer-total', drawerEl).textContent = money(cart.total_price);
  const left = HS.freeShip - cart.total_price;
  if (HS.freeShip > 0) {
    $('.ship p', drawerEl).textContent = cart.total_price === 0 ? HS.t.shipIdle.replace('[amount]', money(HS.freeShip)) : left > 0 ? HS.t.shipLeft.replace('[amount]', money(left)) : HS.t.shipDone;
    $('.ship-bar b', drawerEl).style.width = `${Math.min(100, (cart.total_price / HS.freeShip) * 100)}%`;
  } else $('.ship', drawerEl).hidden = true;
  // upsell: a colour that isn't in the bag yet, same size as the first item
  const up = $('.upsell', drawerEl);
  const model = window.HS_UPSELL_MODEL;
  if (up && model && cart.items.length) {
    const inBag = new Set(cart.items.map((i) => handleize(i.options_with_values?.find((o) => /colou?r/i.test(o.name))?.value || '')));
    const firstSize = cart.items[0].options_with_values?.find((o) => /size/i.test(o.name))?.value;
    const pick = model.colours().find((c) => !inBag.has(c.handle) && !c.soon && model.variant(c.handle, firstSize)?.available);
    if (pick) {
      const v = model.variant(pick.handle, firstSize);
      up.hidden = false;
      up.innerHTML = `<img src="${render(pick.handle, 'q34')}" alt="" width="64" height="64"><div><b></b><br><span></span></div><button type="button"></button>`;
      $('b', up).textContent = HS.t.upsellTitle.replace('[colour]', pick.name);
      $('span', up).textContent = HS.t.upsellText;
      $('button', up).textContent = HS.t.upsellAdd.replace('[size]', firstSize || '');
      $('button', up).onclick = () => addToCart(v.id, { open: false });
    } else up.hidden = true;
  } else if (up) up.hidden = true;
  return cart;
}
renderCart().catch(() => {});

function feedback(btn) { btn.classList.add('is-added'); setTimeout(() => btn.classList.remove('is-added'), 1600); }
function failed(btn, err) { const l = $('.btn-label', btn); const old = l.textContent; l.textContent = err.message; setTimeout(() => (l.textContent = old), 2600); }

/* ---------- swatches ---------- */
function buildSwatches(wrap, colours, onPick) {
  wrap.innerHTML = '';
  colours.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.type = 'button'; b.dataset.handle = c.handle;
    b.style.setProperty('--sw', c.sw);
    b.setAttribute('aria-label', c.soon ? `${c.name} (${HS.t.soon})` : c.name);
    b.setAttribute('aria-pressed', c.handle === current);
    if (c.soon) b.dataset.soon = '';
    b.onclick = () => { if (c.soon) { $('.drop')?.scrollIntoView({ behavior: 'smooth' }); return; } onPick(c.handle); };
    wrap.appendChild(b);
  });
}
function setCurrent(handle) {
  current = handle; store.set('hs-cw', handle); applyTheme(handle);
  $$('.swatch').forEach((s) => s.setAttribute('aria-pressed', s.dataset.handle === handle));
  const c = COLOURS.find((x) => x.handle === handle);
  $$('[data-cw-name]').forEach((el) => (el.textContent = c?.name || ''));
  $$('[data-cw-img]').forEach((img) => (img.src = render(handle, img.dataset.cwImg)));
}

/* ================= SECTIONS ================= */

// Hero with 3D shoe
$$('.hs-hero').forEach((sec) => {
  const model = productModel($('[data-hs-product]', sec).textContent);
  window.HS_UPSELL_MODEL ||= model;
  let progress = 0;
  const shoe = createShoe($('.hero-canvas', sec), { modelUrl: asset('hs-shoe.glb'), texUrl, colourway: current, scrollTarget: () => progress });
  const colours = model.colours();
  buildSwatches($('.swatches', sec), colours, (h) => { setCurrent(h); shoe.setColourway(h); syncAdd(); });
  setCurrent(current);
  const size = sec.dataset.size;
  const addBtn = $('.add', sec);
  const syncAdd = () => { const v = model.variant(current, size); addBtn.disabled = !v?.available; $('.price', sec).textContent = v ? money(v.price) : ''; };
  syncAdd();
  addBtn.addEventListener('click', async (e) => {
    const btn = e.currentTarget; const v = model.variant(current, size);
    try { await addToCart(v.id); feedback(btn); } catch (err) { failed(btn, err); }
  });

  const letters = $$('.hero-word span', sec);
  const setW = (l, w) => (l.style.fontVariationSettings = `"wdth" ${w}`);
  if (!reduce) {
    letters.forEach((l) => { l._w = 62; setW(l, 62); });
    gsap.from(letters, { opacity: 0, yPercent: 30, duration: 1.4, ease: 'expo.out', stagger: 0.06, delay: 0.15 });
    gsap.to(letters, { _w: 125, duration: 1.6, ease: 'expo.out', stagger: 0.06, delay: 0.15, onUpdate() { letters.forEach((l) => setW(l, l._w)); } });
    gsap.from($$('.hero-ui > *', sec), { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.6 });
    gsap.to($('.hero-word', sec), { yPercent: -40, scale: 0.9, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: true } });
  } else letters.forEach((l) => setW(l, 125));
  ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { progress = s.progress; } });
});

// Layers (pinned three-step story)
$$('.hs-layers').forEach((sec) => {
  const layers = $$('.layer', sec), bars = $$('.layers-progress b', sec), rings = $$('.layers-visual .ring', sec), imgs = $$('.layers-visual img', sec);
  if (!reduce && innerWidth > 900 && layers.length > 1) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: `+=${layers.length * 75}%`, pin: $('.layers-pin', sec), scrub: 0.6 } });
    layers.forEach((_, i) => {
      const at = i * 1.2;
      tl.to(bars[i], { scaleX: 1, duration: 1 }, at).to(rings[i] || {}, { opacity: 1, scale: 1.1, duration: 0.3 }, at + 0.25);
      if (i < layers.length - 1) {
        const s = at + 1;
        tl.to(layers[i], { opacity: 0, y: -24, duration: 0.18 }, s).to(rings[i] || {}, { opacity: 0, duration: 0.18 }, s)
          .to(imgs[i] || {}, { opacity: 0, scale: 0.94, duration: 0.25 }, s)
          .fromTo(imgs[i + 1] || {}, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.25 }, s + 0.1)
          .fromTo(layers[i + 1], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.18 }, s + 0.22);
      }
    });
  } else {
    sec.classList.add('is-static');
    layers.forEach((l) => { l.style.position = 'relative'; l.style.opacity = 1; l.style.marginBottom = '28px'; });
    imgs.forEach((im, i) => (im.style.opacity = i ? 0 : 1));
    bars.forEach((b) => (b.style.transform = 'scaleX(1)'));
  }
});

// Colour rail (horizontal scroll while pinned)
$$('.hs-rail').forEach((sec) => {
  const track = $('.rail-track', sec);
  if (!reduce && innerWidth > 900) {
    gsap.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${track.scrollWidth - innerWidth}`, pin: true, scrub: 0.6, invalidateOnRefresh: true } });
  } else track.parentElement.style.overflowX = 'auto';
});

// Next drop countdown
$$('.hs-drop').forEach((sec) => {
  const target = Date.parse(sec.dataset.date);
  const cd = $$('.countdown b', sec);
  const tick = () => {
    const s = Math.max(0, ((target || Date.now()) - Date.now()) / 1000);
    [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, Math.floor(s) % 60].forEach((n, i) => {
      const t = String(n).padStart(2, '0'); if (cd[i] && cd[i].textContent !== t) cd[i].textContent = t;
    });
  };
  tick(); setInterval(tick, 1000);
  if (!reduce) gsap.fromTo($('.drop-img img', sec), { rotate: -30, yPercent: 20 }, { rotate: -8, yPercent: -10, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
});

// Fit finder
$$('.hs-fit').forEach((sec) => {
  const model = productModel($('[data-hs-product]', sec).textContent);
  const steps = $$('.fit-step', sec), meter = $$('.fit-meter i', sec), ans = {};
  const show = (i) => { steps.forEach((s, j) => s.classList.toggle('is-active', i === j)); meter.forEach((m, j) => m.classList.toggle('on', j <= i)); };
  $$('.fit-step .choice', sec).forEach((b) => b.addEventListener('click', () => {
    const step = b.closest('.fit-step');
    $$('.choice', step).forEach((c) => c.setAttribute('aria-pressed', c === b));
    ans[step.dataset.q] = b.dataset.v;
    const i = steps.indexOf(step);
    setTimeout(() => {
      if (i < 2) return show(i + 1);
      const base = parseFloat(ans.size);
      const adj = ans.width === 'wide' || ans.feel === 'roomy' ? 0.5 : ans.feel === 'snug' ? -0.5 : 0;
      const label = `${sec.dataset.prefix} ${Math.round(base + adj)}`.trim();
      $('.fit-result b', sec).textContent = label;
      $('.fit-why', sec).textContent = adj > 0 ? HS.t.fitUp : adj < 0 ? HS.t.fitDown : HS.t.fitTrue;
      const add = $('.fit-add', sec);
      add.onclick = async (e) => {
        const btn = e.currentTarget; const v = model.variant(current, label);
        if (!v?.available) return failed(btn, new Error(HS.t.unavailable));
        try { await addToCart(v.id); feedback(btn); } catch (err) { failed(btn, err); }
      };
      show(3);
    }, 250);
  }));
  $('.fit-back', sec).onclick = () => show(0);
  show(0);
});

// Product page
$$('.hs-product').forEach((sec) => {
  const model = productModel($('[data-hs-product]', sec).textContent);
  window.HS_UPSELL_MODEL = model;
  const url = new URL(location.href);
  const vParam = url.searchParams.get('variant');
  const initial = vParam && model.p.variants.find((v) => String(v.id) === vParam);
  if (initial) current = handleize(initial.options.find((o) => COLOURS.some((c) => c.handle === handleize(o))) || current);
  let size = null;
  const angles = ['q34', 'side', 'back', 'top'];
  const imgs = $$('.gallery img', sec);
  const useRenders = sec.dataset.renders === 'true';
  const media = model.p.media || [];
  const setImages = (h) => {
    const name = COLOURS.find((c) => c.handle === h)?.name;
    const own = media.filter((m) => m.media_type === 'image' && handleize(m.alt || '') === h);
    imgs.forEach((im, i) => {
      const src = !useRenders && own[i] ? own[i].src + '&width=1400' : render(h, angles[i]);
      im.style.opacity = 0;
      setTimeout(() => { im.src = src; im.alt = `${model.p.title} — ${name}`; im.onload = () => (im.style.opacity = 1); }, 180);
    });
  };
  const sizesWrap = $('.sizes', sec);
  const form = $('form[action*="/cart/add"]', sec);
  const idInput = $('input[name="id"]', form);
  const addBtn = $('.add', sec);
  const sticky = $('.sticky-atc');
  const update = () => {
    const v = size ? model.variant(current, size) : null;
    if (v) idInput.value = v.id;
    $$('[data-size]').forEach((el) => (el.textContent = size || HS.t.pickSize));
    const any = model.variant(current, size) || model.sizes(current)[0];
    if (any) $$('[data-price]').forEach((el) => (el.textContent = money(any.price)));
    if (v) { url.searchParams.set('variant', v.id); history.replaceState(null, '', url); }
  };
  const renderSizes = () => {
    sizesWrap.innerHTML = '';
    model.sizes(current).forEach((s) => {
      const b = document.createElement('button');
      b.className = 'size'; b.type = 'button'; b.textContent = String(s.size).replace(sec.dataset.prefix, '').trim();
      b.disabled = !s.available;
      b.setAttribute('aria-label', s.available ? s.size : `${s.size}, ${HS.t.soldOut}`);
      b.setAttribute('aria-pressed', s.size === size);
      b.onclick = () => { size = s.size; $('.size-hint', sec).textContent = ''; $$('.size', sec).forEach((x) => x.setAttribute('aria-pressed', x === b)); update(); };
      sizesWrap.appendChild(b);
    });
    if (size && !model.variant(current, size)?.available) size = null;
    update();
  };
  let spin;
  const pick = (h) => {
    setCurrent(h); setImages(h); renderSizes(); spin?.setColourway(h);
    if (sticky) $('img', sticky).src = render(h, 'q34');
    const allOut = !model.sizes(h).some((s) => s.available);
    $('.stock', sec).textContent = allOut ? HS.t.soldOut : HS.t.inStock;
  };
  buildSwatches($('.swatches', sec), model.colours(), pick);
  pick(current);

  const add = async (btn) => {
    if (!size) {
      $('.size-hint', sec).textContent = HS.t.sizeFirst;
      sizesWrap.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 300 });
      sizesWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    try { await addToCart(model.variant(current, size).id); feedback(btn); } catch (err) { failed(btn, err); }
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); add(addBtn); });
  if (sticky) {
    $('.btn', sticky).addEventListener('click', (e) => add(e.currentTarget));
    new IntersectionObserver(([en]) => sticky.classList.toggle('is-on', !en.isIntersecting && en.boundingClientRect.top < 0)).observe(addBtn);
  }

  $('.spin-btn', sec)?.addEventListener('click', (e) => {
    const fig = e.currentTarget.closest('figure');
    if (!spin) {
      const box = document.createElement('div'); box.className = 'spin'; box.dataset.cursor = HS.t.drag; fig.appendChild(box); $('img', fig).style.visibility = 'hidden';
      spin = createShoe(box, { modelUrl: asset('hs-shoe.glb'), texUrl, colourway: current, autoRotate: false });
      e.currentTarget.textContent = HS.t.showPhoto;
    } else {
      const on = fig.classList.toggle('photo');
      $('.spin', fig).style.display = on ? 'none' : '';
      $('img', fig).style.visibility = on ? 'visible' : 'hidden';
      e.currentTarget.textContent = on ? HS.t.spin : HS.t.showPhoto;
    }
  });
  $$('.acc button', sec).forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true')));
  $('[data-size-guide]', sec)?.addEventListener('click', () => { const acc = $('[data-acc-fit]', sec); if (acc) { acc.setAttribute('aria-expanded', 'true'); acc.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
});

// Newsletter feedback after Shopify customer form posts back
if (location.search.includes('customer_posted=true')) $$('.notify-msg').forEach((el) => (el.textContent = HS.t.notified));

if (!reduce) $$('[data-reveal]').forEach((el) => gsap.from(el, { yPercent: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } }));

// Re-init after edits in the theme editor
document.addEventListener('shopify:section:load', () => location.reload());
