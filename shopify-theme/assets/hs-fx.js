// Halfstep theme — motion + interaction kit (same module as the static preview's js/fx.js).
// Everything time-based runs on GSAP's ticker (requestAnimationFrame), so it stays smooth and deterministic.
const { gsap } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const env = {
  reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
  fine: matchMedia('(hover:hover) and (pointer:fine)').matches || /[?&]capture/.test(location.search),
  capture: /[?&]capture/.test(location.search),
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- scroll velocity (px per second, smoothed) ---------- */
export const scrollVel = { v: 0 };
{
  let last = scrollY;
  gsap.ticker.add((t, dt) => {
    const dy = scrollY - last; last = scrollY;
    scrollVel.v += ((dy / Math.max(dt, 8)) * 1000 - scrollVel.v) * 0.15;
  });
}

/* ---------- custom cursor: crosshair + sticker label ---------- */
export function initCursor() {
  if (!env.fine || env.reduce) return null;
  document.documentElement.classList.add('has-cursor');
  const cur = document.createElement('div');
  cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<svg class="cur-x" viewBox="0 0 40 40"><path class="o" d="M20 3v12M20 25v12M3 20h12M25 20h12"/><path class="i" d="M20 3v12M20 25v12M3 20h12M25 20h12"/><rect x="17.5" y="17.5" width="5" height="5"/></svg><span class="cur-tag"></span>';
  document.body.appendChild(cur);
  const tag = $('.cur-tag', cur), cross = $('.cur-x', cur);
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.18, ease: 'power3' });
  const yTo = gsap.quickTo(cur, 'y', { duration: 0.18, ease: 'power3' });
  let label = '';
  const show = (txt) => {
    if (txt === label) return;
    label = txt;
    if (txt) {
      tag.textContent = txt;
      gsap.fromTo(tag, { scale: 0.2, rotate: -24 }, { scale: 1, rotate: -6, duration: 0.45, ease: 'back.out(3)', overwrite: true });
      gsap.to(cross, { rotate: 45, scale: 1.25, duration: 0.3, ease: 'power3.out', overwrite: true });
    } else {
      gsap.to(tag, { scale: 0, rotate: -12, duration: 0.2, ease: 'power2.in', overwrite: true });
      gsap.to(cross, { rotate: 0, scale: 1, duration: 0.3, ease: 'power3.out', overwrite: true });
    }
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    cur.classList.add('is-live'); xTo(e.clientX); yTo(e.clientY);
    const t = e.target.closest?.('[data-cursor]');
    show(t ? t.dataset.cursor : '');
  }, { passive: true });
  addEventListener('pointerdown', () => gsap.to(cross, { scale: 0.7, duration: 0.12 }));
  addEventListener('pointerup', () => gsap.to(cross, { scale: label ? 1.25 : 1, duration: 0.3, ease: 'back.out(3)' }));
  document.documentElement.addEventListener('pointerleave', () => cur.classList.remove('is-live'));
  return { show, el: cur };
}

/* ---------- magnetic buttons: the button leans toward the pointer, its label leans further ---------- */
export function initMagnetic(root = document) {
  if (!env.fine || env.reduce) return;
  $$('[data-magnetic]', root).forEach((el) => {
    if (el._mag) return; el._mag = true;
    const s = parseFloat(el.dataset.magnetic) || 0.32;
    const inner = el.querySelector('.btn-label') || null;
    const x = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' }), y = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' });
    const ix = inner && gsap.quickTo(inner, 'x', { duration: 0.45, ease: 'power3' }), iy = inner && gsap.quickTo(inner, 'y', { duration: 0.45, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
      x(dx * s); y(dy * s); if (inner) { ix(dx * s * 0.45); iy(dy * s * 0.45); }
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,.35)' });
      if (inner) gsap.to(inner, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,.35)' });
    });
  });
}

/* ---------- page wipe: striped bars + glitching wordmark between pages ---------- */
export function initWipe() {
  const w = $('.wipe');
  if (!w) return;
  const bars = $$('i', w), word = $('b', w);
  const html = document.documentElement;
  const out = () => {
    try { sessionStorage.removeItem('hs-wipe'); } catch {}
    if (!html.classList.contains('is-wiping')) return;
    if (env.reduce) { html.classList.remove('is-wiping'); return; }
    gsap.set(bars, { scaleY: 1, transformOrigin: '50% 0%' });
    gsap.timeline({ onComplete: () => { html.classList.remove('is-wiping'); gsap.set(bars, { clearProps: 'all' }); } })
      .fromTo(word, { opacity: 1, skewX: -20 }, { opacity: 0, skewX: 0, duration: 0.3, ease: 'steps(4)' })
      .to(bars, { scaleY: 0, duration: 0.6, ease: 'expo.inOut', stagger: { each: 0.05, from: 'random' } }, 0.1);
  };
  out();
  addEventListener('pageshow', (e) => { if (e.persisted) { html.classList.remove('is-wiping'); gsap.set(bars, { clearProps: 'all' }); gsap.set(word, { opacity: 0 }); } });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (env.reduce || !a.hasAttribute('data-wipe') && !a.closest('[data-wipe-all]')) return;
    e.preventDefault();
    try { sessionStorage.setItem('hs-wipe', '1'); } catch {}
    w.style.pointerEvents = 'auto';
    gsap.set(bars, { transformOrigin: '50% 100%' });
    gsap.timeline({ onComplete: () => { location.href = url.href; } })
      .to(bars, { scaleY: 1, duration: 0.55, ease: 'expo.inOut', stagger: { each: 0.05, from: 'start' } })
      .fromTo(word, { opacity: 0, skewX: 30, x: -40 }, { opacity: 1, skewX: 0, x: 0, duration: 0.35, ease: 'steps(5)' }, 0.3);
  });
}

/* ---------- marquee strips: speed and direction follow scroll velocity ---------- */
export function marquee(el, { speed = 60, dir = 1 } = {}) {
  const track = $('.mq-track', el);
  const base = track.innerHTML;
  while (track.scrollWidth < el.clientWidth * 2.2 && track.children.length < 80) track.insertAdjacentHTML('beforeend', base);
  track.insertAdjacentHTML('beforeend', track.innerHTML);
  let x = 0, d = dir;
  if (env.reduce) return;
  gsap.ticker.add((t, dt) => {
    const half = track.scrollWidth / 2;
    const v = scrollVel.v;
    if (Math.abs(v) > 40) d = Math.sign(v) * dir;
    x -= (speed + Math.min(Math.abs(v) * 0.35, 900)) * d * (dt / 1000);
    if (x <= -half) x += half; if (x > 0) x -= half;
    track.style.transform = `translate3d(${x}px,0,0) skewX(${clamp(-v * 0.004, -12, 12) * dir}deg)`;
  });
}

/* ---------- draggable rail: momentum, snap, 3D tilt cards ---------- */
export function createRail(view, { onChange } = {}) {
  const track = $('.rail-track', view);
  const cards = () => $$('.card', track);
  const st = { x: 0, drag: false, moved: false, sx: 0, stx: 0, samples: [], v: 0, idx: 0, lastX: 0 };
  const bounds = () => {
    const pad = parseFloat(getComputedStyle(view).paddingLeft);
    const max = 0, min = Math.min(0, view.clientWidth - pad * 2 - track.scrollWidth);
    return { min, max };
  };
  const offsets = () => { const c = cards(); const b = bounds(); return c.map((el) => clamp(-(el.offsetLeft - c[0].offsetLeft), b.min, b.max)); };
  const apply = () => { track.style.transform = `translate3d(${st.x}px,0,0)`; };
  const nearest = (x) => { const o = offsets(); let bi = 0; o.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(o[bi] - x)) bi = i; }); return bi; };
  const setIdx = (i) => { if (i !== st.idx) { st.idx = i; onChange && onChange(i); } };
  let tween;
  const snapTo = (i, dur = 0.9) => {
    const o = offsets(); i = clamp(i, 0, o.length - 1);
    tween?.kill();
    setIdx(i);
    tween = gsap.to(st, { x: o[i], duration: env.reduce ? 0 : dur, ease: 'power3.out', onUpdate: apply });
  };
  view.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    tween?.kill(); st.drag = true; st.moved = false; st.sx = e.clientX; st.stx = st.x; st.samples = [{ x: e.clientX, t: performance.now() }];
    st.pid = e.pointerId;
  });
  addEventListener('pointermove', (e) => {
    if (!st.drag) return;
    const dx = e.clientX - st.sx;
    if (!st.moved && Math.abs(dx) > 6) { st.moved = true; view.setPointerCapture?.(st.pid); view.classList.add('is-dragging'); }
    if (!st.moved) return;
    const b = bounds();
    let x = st.stx + dx;
    if (x > b.max) x = b.max + (x - b.max) * 0.35;
    if (x < b.min) x = b.min + (x - b.min) * 0.35;
    st.x = x; apply();
    const now = performance.now();
    st.samples.push({ x: e.clientX, t: now }); if (st.samples.length > 6) st.samples.shift();
    setIdx(nearest(st.x));
  });
  const release = () => {
    if (!st.drag) return; st.drag = false; view.classList.remove('is-dragging');
    if (!st.moved) return;
    const s = st.samples, a = s[0], z = s[s.length - 1];
    const v = (z.x - a.x) / Math.max(16, z.t - a.t) * 1000;
    const target = st.x + v * 0.32;
    snapTo(nearest(target), clamp(0.6 + Math.abs(v) / 4000, 0.6, 1.3));
  };
  addEventListener('pointerup', release); addEventListener('pointercancel', release);
  view.addEventListener('click', (e) => { if (st.moved) { e.preventDefault(); e.stopPropagation(); st.moved = false; } }, true);
  view.addEventListener('dragstart', (e) => e.preventDefault());
  let wheelT;
  view.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); tween?.kill();
    const b = bounds(); st.x = clamp(st.x - e.deltaX, b.min, b.max); apply(); setIdx(nearest(st.x));
    clearTimeout(wheelT); wheelT = setTimeout(() => snapTo(nearest(st.x), 0.5), 140);
  }, { passive: false });
  view.addEventListener('focusin', (e) => { const c = e.target.closest('.card'); if (c) { view.scrollLeft = 0; snapTo(cards().indexOf(c), 0.6); } });

  // velocity lean + per-card 3D tilt toward the pointer
  let prevX = 0;
  const tilt = new Map();
  if (!env.reduce) {
    cards().forEach((card) => {
      const t = { rx: 0, ry: 0, trx: 0, try: 0 };
      tilt.set(card, t);
      card.addEventListener('pointermove', (e) => {
        if (st.moved) return;
        const r = card.getBoundingClientRect();
        t.try = ((e.clientX - r.left) / r.width - 0.5) * 22;
        t.trx = -((e.clientY - r.top) / r.height - 0.5) * 18;
      });
      card.addEventListener('pointerleave', () => { t.trx = 0; t.try = 0; });
    });
    gsap.ticker.add((time, dt) => {
      const v = (st.x - prevX) / Math.max(dt, 8) * 1000; prevX = st.x;
      st.v += (v - st.v) * 0.18;
      const lean = clamp(st.v / 90, -16, 16);
      tilt.forEach((t, card) => {
        t.rx += (t.trx - t.rx) * 0.12; t.ry += (t.try + lean - t.ry) * 0.12;
        const inner = card.firstElementChild;
        inner.style.transform = `rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
        inner.style.setProperty('--sx', `${(8 - t.ry * 0.5).toFixed(1)}px`);
        inner.style.setProperty('--sy', `${(8 + t.rx * 0.5).toFixed(1)}px`);
      });
    });
  }
  addEventListener('resize', () => snapTo(st.idx, 0));
  return { snapTo, next: () => snapTo(st.idx + 1), prev: () => snapTo(st.idx - 1), get index() { return st.idx; }, get count() { return cards().length; } };
}

/* ---------- split-flap ---------- */
export function makeFlap(ch = ' ') {
  const f = document.createElement('span');
  f.className = 'flap';
  f.dataset.c = ch;
  f.innerHTML = `<span class="t"><i>${ch}</i></span><span class="b"><i>${ch}</i></span><span class="ft"><i>${ch}</i></span><span class="fb"><i>${ch}</i></span>`;
  return f;
}
export function setFlap(f, ch, { dur = 0.26, delay = 0 } = {}) {
  ch = String(ch);
  if (f.dataset.c === ch) return;
  const prev = f.dataset.c; f.dataset.c = ch;
  const [t, b, ft, fb] = [...f.children].map((s) => s.firstChild);
  if (env.reduce) { t.textContent = b.textContent = ft.textContent = fb.textContent = ch; return; }
  gsap.killTweensOf([ft.parentNode, fb.parentNode]);
  t.textContent = ch; ft.textContent = prev; fb.textContent = ch; b.textContent = prev;
  gsap.timeline({ delay })
    .fromTo(ft.parentNode, { rotateX: 0 }, { rotateX: -90, duration: dur / 2, ease: 'power2.in' })
    .fromTo(fb.parentNode, { rotateX: 90 }, { rotateX: 0, duration: dur / 2, ease: 'power2.out', onComplete: () => { b.textContent = ch; ft.textContent = ch; gsap.set(ft.parentNode, { rotateX: 0 }); gsap.set(fb.parentNode, { rotateX: 90 }); } });
}
const GLYPHS = 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789#%';
export function scrambleFlap(f, final, { steps = 6, step = 0.09, delay = 0 } = {}) {
  if (env.reduce) return setFlap(f, final);
  for (let i = 0; i < steps; i++) gsap.delayedCall(delay + i * step, () => setFlap(f, GLYPHS[(Math.random() * GLYPHS.length) | 0], { dur: step * 0.95 }));
  gsap.delayedCall(delay + steps * step, () => setFlap(f, final, { dur: 0.3 }));
}

/* ---------- confetti-glitch burst ---------- */
export function confetti(canvas, x, y, colours) {
  if (env.reduce) return;
  const dpr = Math.min(devicePixelRatio, 2);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  const P = [];
  for (let i = 0; i < 140; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25;
    const sp = 500 + Math.random() * 900;
    const kind = Math.random();
    P.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
      w: kind < 0.2 ? 30 + Math.random() * 40 : 8 + Math.random() * 12, h: kind < 0.2 ? 5 : 8 + Math.random() * 10,
      c: colours[(Math.random() * colours.length) | 0], kind, life: 0 });
  }
  let alive = true;
  const tick = (t, dt) => {
    const s = Math.min(dt, 50) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    alive = false;
    for (const p of P) {
      p.life += s; p.vy += 1500 * s; p.vx *= 0.985; p.x += p.vx * s; p.y += p.vy * s; p.r += p.vr * s;
      if (p.y < H + 60) alive = true;
      // glitch: some pieces jump sideways for a frame
      const gx = p.kind > 0.85 && Math.random() < 0.2 ? (Math.random() - 0.5) * 40 : 0;
      ctx.save(); ctx.translate(p.x + gx, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
      if (p.kind > 0.6 && p.kind < 0.8) { ctx.beginPath(); ctx.moveTo(0, -p.h); ctx.lineTo(p.w * 0.8, p.h); ctx.lineTo(-p.w * 0.8, p.h); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      ctx.restore();
    }
    if (!alive) { gsap.ticker.remove(tick); ctx.clearRect(0, 0, W, H); }
  };
  gsap.ticker.add(tick);
}
export function glitch(el, { hue = true } = {}) {
  if (env.reduce) return;
  const tl = gsap.timeline({ onComplete: () => gsap.set(el, { clearProps: 'x,skewX,filter' }) });
  for (let i = 0; i < 9; i++) tl.to(el, { x: (Math.random() - 0.5) * 26, skewX: (Math.random() - 0.5) * 14, filter: hue ? `hue-rotate(${(Math.random() * 300) | 0}deg) contrast(1.4)` : 'none', duration: 0.05, ease: 'steps(1)' });
  tl.to(el, { x: 0, skewX: 0, filter: 'hue-rotate(0deg) contrast(1)', duration: 0.05 });
  return tl;
}
export function shake(el) {
  if (env.reduce) return;
  gsap.fromTo(el, { x: 0 }, { keyframes: [{ x: -16 }, { x: 14 }, { x: -10 }, { x: 7 }, { x: -3 }, { x: 0 }], duration: 0.5, ease: 'none' });
}

/* ---------- footer wordmark: letters widen near the pointer (variable font width axis) ---------- */
export function kineticWord(el) {
  const spans = $$('span', el);
  const fit = () => {
    spans.forEach((s) => (s.style.fontVariationSettings = '"wdth" 80'));
    el.style.fontSize = '100px';
    const w = spans.reduce((a, s) => a + s.getBoundingClientRect().width, 0);
    const avail = el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) * 2;
    el.style.fontSize = `${Math.floor((100 * avail) / w * 0.97)}px`;
  };
  (document.fonts?.ready || Promise.resolve()).then(fit);
  addEventListener('resize', fit);
  if (env.reduce) return;
  const cur = spans.map(() => 80); let px = -1;
  el.closest('footer')?.addEventListener('pointermove', (e) => { px = e.clientX; });
  el.closest('footer')?.addEventListener('pointerleave', () => { px = -1; });
  gsap.ticker.add(() => {
    const raw = spans.map((s) => {
      if (px < 0) return 1;
      const r = s.getBoundingClientRect(); const d = (r.left + r.width / 2 - px) / innerWidth;
      return 0.15 + Math.exp(-(d * d) / 0.006) * 2.2;
    });
    const sum = raw.reduce((a, b) => a + b, 0);
    spans.forEach((s, i) => {
      const target = 62 + (raw[i] / sum) * spans.length * 18;
      cur[i] += (clamp(target, 62, 125) - cur[i]) * 0.12;
      s.style.fontVariationSettings = `"wdth" ${cur[i].toFixed(1)}`;
    });
  });
}
