/* Overnight — app: timeline (11 pm to 9 am), hero, film-strip nav, story, roll game,
   looks, waitlist, viewfinder cursor, WebAudio, atmosphere. One rAF loop drives it all. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const CAPTURE = params.has('capture');
  window.__CAPTURE = CAPTURE;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches || CAPTURE;
  if (CAPTURE) root.classList.add('capture');
  if (RM) root.classList.add('rm');
  if (FINE) root.classList.add('has-cursor');
  let vw = window.innerWidth, vh = window.innerHeight;
  const isMobile = () => vw < 900;

  /* ---------------- tweens (rAF-clocked, so deterministic under a fake clock) ---------------- */
  const tweens = new Set();
  function tween(o) {
    const tw = Object.assign({ from: 0, to: 1, dur: 600, delay: 0, ease: easeOut }, o);
    tw.start = performance.now() + tw.delay;
    tweens.add(tw);
    return tw;
  }
  function runTweens(now) {
    for (const tw of tweens) {
      if (now < tw.start) continue;
      const k = clamp((now - tw.start) / tw.dur);
      tw.update && tw.update(lerp(tw.from, tw.to, tw.ease(k)), k);
      if (k >= 1) { tweens.delete(tw); tw.done && tw.done(); }
    }
  }

  /* ---------------- sound (WebAudio only, off by default) ---------------- */
  const Sound = {
    on: false, ctx: null, master: null, crackleT: 0,
    init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
      const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      const g = ctx.createGain(); g.gain.value = 0.11;
      src.connect(lp).connect(g).connect(this.master); src.start();
      const hum = ctx.createOscillator(); hum.frequency.value = 55; const hg = ctx.createGain(); hg.gain.value = 0.008;
      hum.connect(hg).connect(this.master); hum.start();
      this.noise = buf;
      return true;
    },
    toggle(force) {
      const want = force == null ? !this.on : force;
      if (want && !this.ctx && !this.init()) return;
      this.on = want;
      if (this.ctx) {
        if (want) this.ctx.resume();
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setTargetAtTime(want ? 1 : 0, t, 0.12);
      }
      const b = $('.sound');
      b.setAttribute('aria-pressed', String(want));
      $('.sound__txt', b).textContent = want ? 'Sound on' : 'Sound off';
      if (want) this.play('advance');
    },
    burst(at, dur, freq, q, gain, type = 'bandpass') {
      const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      s.connect(f).connect(g).connect(this.master); s.start(at, Math.random() * 3, dur + 0.02);
    },
    thunk(at, freq, dur, gain) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(freq, at); o.frequency.exponentialRampToValueAtTime(freq * 0.5, at + dur);
      g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(this.master); o.start(at); o.stop(at + dur + 0.02);
    },
    play(kind) {
      if (!this.on || !this.ctx) return;
      const t = this.ctx.currentTime + 0.005;
      if (kind === 'advance') {
        for (let i = 0; i < 4; i++) this.burst(t + i * 0.03, 0.012, 2600 - i * 150, 4, 0.55);
        this.thunk(t + 0.12, 140, 0.06, 0.18);
      } else if (kind === 'shutter') {
        this.burst(t, 0.03, 1900, 1.2, 0.6); this.burst(t + 0.05, 0.04, 1300, 1.4, 0.45); this.thunk(t, 90, 0.05, 0.12);
      } else if (kind === 'tick') {
        this.burst(t, 0.015, 3200, 5, 0.35);
      } else if (kind === 'flash') {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(6200, t + 0.32);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
        o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.4);
        this.burst(t + 0.34, 0.09, 1500, 0.8, 0.8); this.thunk(t + 0.34, 70, 0.12, 0.25);
      } else if (kind === 'done') {
        [0, 0.09, 0.18].forEach((d, i) => this.thunk(t + d, 520 + i * 260, 0.25, 0.06));
      }
    },
    update(t) {
      if (!this.on || !this.ctx) return;
      if (t - this.crackleT > 0.14) {
        this.crackleT = t;
        if (Math.random() < 0.3) this.burst(this.ctx.currentTime + 0.01, 0.004, 2500 + Math.random() * 3000, 2, 0.04 + Math.random() * 0.08, 'highpass');
      }
    },
  };
  $('.sound').addEventListener('click', () => Sound.toggle());

  /* ---------------- shutter micro-interaction on buttons ---------------- */
  function shutter(el) {
    tween({ dur: 70, ease: easeOut, update: (v) => el.style.setProperty('--iris', v.toFixed(3)), done: () => {
      tween({ from: 1, to: 0, dur: 140, ease: easeOut, update: (v) => el.style.setProperty('--iris', v.toFixed(3)) });
    } });
    Sound.play(el.dataset.sound || 'shutter');
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-shutter], [data-sound]');
    if (b) shutter(b);
  });

  /* ---------------- film strip data ---------------- */
  const FRAMES = [
    { id: 'top', n: '01', title: 'Develop', time: '11:00 pm', img: 'img/sparklers.webp' },
    { id: 'how', n: '02', title: 'Three trays', time: '11:40 pm', img: 'img/rooftop.webp' },
    { id: 'night', n: '03', title: 'The night', time: '12:00 am', img: 'img/bonfire.webp' },
    { id: 'roll', n: '04', title: 'Develop early', time: '5:40 am', img: 'img/trails.webp' },
    { id: 'looks', n: '05', title: 'Film looks', time: '6:40 am', img: 'img/sunrise.webp' },
    { id: 'waitlist', n: '06', title: 'First roll', time: '8:20 am', img: 'img/window.webp' },
    { id: 'faq', n: '07', title: 'Questions', time: '9:00 am', img: 'img/pool.webp' },
  ];

  class FilmStrip {
    constructor(el, opts = {}) {
      this.el = el; this.opts = opts;
      this.x = 0; this.v = 0; this.idx = -1;
      const track = this.track = document.createElement('div');
      track.className = 'fs-track';
      for (let rep = 0; rep < 3; rep++) {
        FRAMES.forEach((f, i) => {
          const cell = document.createElement('div');
          cell.className = 'fs-cell';
          const real = rep === 1;
          cell.innerHTML = `<span class="fs-edge" aria-hidden="true"><span>▸ ${f.n}</span><span>OVERNIGHT 400</span><span>${f.n}A</span></span>` +
            `<a class="fs-frame" href="#${f.id}" draggable="false" ${real ? '' : 'tabindex="-1" aria-hidden="true"'} data-snap="Frame ${f.n} · ${f.time}">` +
            `<canvas data-film="${f.img}" data-dev="1" data-seed="${(i * 1.7 + 0.3).toFixed(2)}" data-vig="0.35"></canvas>` +
            `<span class="fs-label"><span class="fs-num">${f.n}</span><span class="fs-txt"><span class="fs-title">${f.title}</span><span class="fs-time">${f.time}</span></span></span></a>`;
          track.appendChild(cell);
        });
      }
      el.appendChild(track);
      el.setAttribute('role', 'navigation');
      el.setAttribute('aria-label', opts.label || 'Page sections as film frames');
      this.bind();
    }
    measure() {
      this.setW = this.track.scrollWidth / 3;
      this.cellW = this.setW / FRAMES.length;
      this.viewW = this.el.clientWidth;
      if (!this.x) this.x = -this.setW + (this.opts.startOffset || 0);
    }
    bind() {
      const el = this.el;
      let drag = null, moved = 0;
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        drag = { x0: e.clientX, y0: e.clientY, p0: this.x, lx: e.clientX, lt: performance.now(), id: e.pointerId, captured: false };
        moved = 0; this.v = 0;
        if (e.pointerType === 'mouse') e.preventDefault();
      });
      el.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x0;
        moved = Math.max(moved, Math.abs(dx));
        if (moved > 4 && !drag.captured) { try { el.setPointerCapture(e.pointerId); } catch (_) {} drag.captured = true; }
        const now = performance.now();
        const dt = Math.max(1, now - drag.lt) / 1000;
        this.v = lerp(this.v, (e.clientX - drag.lx) / dt, 0.4);
        drag.lx = e.clientX; drag.lt = now;
        this.x = drag.p0 + dx;
      });
      const end = (e) => {
        if (!drag) return;
        if (performance.now() - drag.lt > 90) this.v = 0;
        drag = null;
        this.suppress = moved > 6;
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('click', (e) => { if (this.suppress) { e.preventDefault(); e.stopPropagation(); this.suppress = false; } }, true);
      el.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); this.x -= e.deltaX; this.v = -e.deltaX * 8; }
      }, { passive: false });
      el.addEventListener('focusin', (e) => {
        const f = e.target.closest('.fs-frame'); if (!f) return;
        const r = f.getBoundingClientRect(), er = el.getBoundingClientRect();
        const want = er.left + er.width / 2 - (r.left + r.width / 2);
        this.v = 0;
        const from = this.x;
        tween({ dur: 500, ease: easeInOut, update: (v) => { this.x = from + want * v; } });
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { this.v = -900; e.preventDefault(); }
        if (e.key === 'ArrowLeft') { this.v = 900; e.preventDefault(); }
      });
    }
    fling(v) { this.v = v; }
    update(dt) {
      if (!this.setW) return;
      this.x += this.v * dt;
      this.v *= Math.pow(0.93, dt * 60);
      if (Math.abs(this.v) < 2) this.v = 0;
      if (this.opts.drift && !RM) this.x -= this.opts.drift * dt;
      const s = this.setW;
      while (this.x > -s * 0.5) this.x -= s;
      while (this.x < -s * 1.5) this.x += s;
      const skew = RM ? 0 : clamp(-this.v * 0.0016, -5, 5);
      this.track.style.transform = `translate3d(${this.x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      const c = (((-this.x + this.viewW / 2) % s) + s) % s;
      const idx = Math.floor(c / this.cellW) % FRAMES.length;
      if (idx !== this.idx) {
        if (this.idx !== -1 && Math.abs(this.v) > 30) Sound.play('tick');
        this.idx = idx; this.opts.onFrame && this.opts.onFrame(FRAMES[idx]);
      }
    }
  }

  /* ---------------- roll (contact sheet) DOM ---------------- */
  const ROLL_IMGS = ['rooftop', 'neon', 'sparklers', 'ferris', 'bonfire', 'dance', 'trails', 'moon', 'bluehour', 'sunrise', 'window', 'pool'];
  const ROLL = [];
  ROLL_IMGS.forEach((n) => { ROLL.push(`img/${n}-b.webp`); ROLL.push(`img/${n}.webp`); });
  const sheetStrips = $('[data-sheet-strips]');
  const perStrip = vw < 640 ? 4 : 6;
  for (let s = 0; s < 24 / perStrip; s++) {
    const strip = document.createElement('div');
    strip.className = 'sheet__strip';
    strip.style.setProperty('--n', perStrip);
    for (let k = 0; k < perStrip; k++) {
      const i = s * perStrip + k;
      const f = document.createElement('div');
      f.className = 'sheet__frame';
      f.innerHTML = `<canvas data-film="${ROLL[i]}" data-dev="0" data-seed="${(i * 0.71 + 0.2).toFixed(2)}" data-grain="0.09"></canvas><i class="flash"></i><span>▸ ${i + 1}</span>`;
      strip.appendChild(f);
    }
    sheetStrips.appendChild(strip);
  }

  /* ---------------- film strips (inline + reel) ---------------- */
  const reelEl = $('#reel');
  const inlineStrip = new FilmStrip($('.filmstrip--inline'), { drift: 26, label: 'Page sections, drag the film' });
  const reelReadout = $('[data-reel-readout]');
  const reelStrip = new FilmStrip($('.filmstrip--reel'), {
    label: 'Page sections', onFrame: (f) => { reelReadout.textContent = `▸ ${f.n} ${f.title} · ${f.time}`; },
  });
  const indexBtn = $('.nav__index');
  function openReel() {
    reelEl.hidden = false;
    indexBtn.setAttribute('aria-expanded', 'true');
    if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      reelEl.classList.add('is-open');
      reelStrip.measure();
      const cur = currentSection();
      const ci = Math.max(0, FRAMES.findIndex((f) => f.id === cur));
      $$('.fs-frame', reelEl).forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + FRAMES[ci].id));
      reelStrip.x = -reelStrip.setW - ci * reelStrip.cellW + reelStrip.viewW / 2 - reelStrip.cellW / 2 + 1400;
      reelStrip.v = -5880;
      grader.flush();
      $('.reel__close').focus();
    });
  }
  function closeReel(skipFocus) {
    if (reelEl.hidden) return;
    reelEl.classList.remove('is-open');
    indexBtn.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start(); else document.body.style.overflow = '';
    setTimeout(() => { reelEl.hidden = true; }, 360);
    if (!skipFocus) indexBtn.focus();
  }
  indexBtn.addEventListener('click', openReel);
  $('.reel__close').addEventListener('click', () => closeReel());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReel(); });
  reelEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('.reel__close, .filmstrip--reel .fs-frame:not([tabindex="-1"])', reelEl);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------------- grader ---------------- */
  const { Grader, HeroStrip, LOOKS } = window.OvernightFilm;
  const grader = new Grader();
  if (!grader.ok) root.classList.add('no-gl');
  const filmEls = $$('canvas[data-film]');
  if (grader.ok) {
    filmEls.forEach((c) => grader.register(c));
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.target._film) en.target._film.visible = en.isIntersecting; }), { rootMargin: '300px 0px' });
    filmEls.forEach((c) => io.observe(c));
  } else {
    /* 2D fallback: CSS-filter grade so the page still reads without WebGL */
    filmEls.forEach((c) => {
      window.OvernightFilm.loadImage(c.dataset.film).then((im) => {
        const r = c.getBoundingClientRect(); c.width = Math.max(2, r.width); c.height = Math.max(2, r.height);
        const ctx = c.getContext('2d');
        const s = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight);
        ctx.filter = parseFloat(c.dataset.dev || 1) < 0.5 ? 'invert(1) sepia(1) saturate(2.5) hue-rotate(-15deg)' : 'sepia(.2) saturate(1.1)';
        ctx.drawImage(im, (c.width - im.naturalWidth * s) / 2, (c.height - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
      });
    });
  }

  /* ---------------- looks ---------------- */
  let lookName = 'dusk';
  const look = grader.look || { a: 0, b: 0, mix: 0 };
  let leakBurst = 0;
  function setLook(name) {
    if (name === lookName || !(name in LOOKS)) return;
    const from = LOOKS[lookName], to = LOOKS[name];
    lookName = name;
    root.dataset.look = name;
    $$('[data-look-set]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.lookSet === name)));
    look.a = from; look.b = to; look.mix = 0;
    leakBurst = 1;
    Sound.play('advance');
    if (RM) { look.a = to; look.mix = 0; grader.markLookDirty(); return; }
    tween({ dur: 950, ease: easeInOut, update: (v) => { look.mix = v; grader.markLookDirty(); }, done: () => { look.a = to; look.b = to; look.mix = 0; grader.markLookDirty(); } });
  }
  $$('[data-look-set]').forEach((b) => {
    b.addEventListener('click', () => setLook(b.dataset.lookSet));
    b.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const group = $$('[data-look-set]', b.parentElement);
      const i = group.indexOf(b) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
      const nb = group[(i + group.length) % group.length];
      nb.focus(); setLook(nb.dataset.lookSet); e.preventDefault();
    });
  });
  // viewer
  const vImgs = $$('.viewer__img'); let vIdx = 0;
  function viewer(d) {
    vImgs[vIdx].classList.remove('is-on');
    vIdx = (vIdx + d + vImgs.length) % vImgs.length;
    vImgs[vIdx].classList.add('is-on');
    $('[data-viewer-cap]').textContent = vImgs[vIdx].dataset.snap;
  }
  $('[data-viewer-prev]').addEventListener('click', () => viewer(-1));
  $('[data-viewer-next]').addEventListener('click', () => viewer(1));

  /* ---------------- smooth scroll ---------------- */
  let lenis = null;
  if (!CAPTURE && !RM && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, autoRaf: false });
    root.classList.add('lenis');
  }
  function goTo(hash) {
    const t = hash === '#top' ? null : $(hash);
    const y = t ? t.getBoundingClientRect().top + window.scrollY : 0;
    let target = y;
    if (hash === '#night') target = y + 1;
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else window.scrollTo({ top: target, behavior: RM ? 'auto' : 'smooth' });
    if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const h = a.getAttribute('href');
    if (h.length < 2) return;
    e.preventDefault();
    const wasOpen = !reelEl.hidden;
    closeReel(true);
    setTimeout(() => goTo(h), wasOpen ? 220 : 0);
  });

  /* ---------------- timeline: 11 pm -> 9 am ---------------- */
  const PAL = [
    { m: 0, s: ['#0c0202', '#2a0605', '#560d07'], g: [255, 40, 14], ga: 0.5, ac: '#ff4a24' },
    { m: 40, s: ['#0b0204', '#230611', '#410a14'], g: [225, 30, 40], ga: 0.32, ac: '#ff5a2e' },
    { m: 90, s: ['#07050f', '#150a1f', '#2c0e24'], g: [160, 30, 90], ga: 0.2, ac: '#ff6a3a' },
    { m: 300, s: ['#060a18', '#11183a', '#29244e'], g: [80, 90, 255], ga: 0.12, ac: '#ff7a45' },
    { m: 390, s: ['#16214a', '#3e3d6a', '#8a5d72'], g: [255, 140, 110], ga: 0.2, ac: '#ff7a45' },
    { m: 430, s: ['#c98f8a', '#efb999', '#f7d2ad'], g: [255, 170, 110], ga: 0.35, ac: '#d9481f' },
    { m: 480, s: ['#f3cfb0', '#f8e2c8', '#fbecdc'], g: [255, 210, 160], ga: 0.4, ac: '#cf3f18' },
    { m: 600, s: ['#f7ead8', '#fbf3e6', '#fff8ee'], g: [255, 226, 170], ga: 0.3, ac: '#cf3f18' },
  ];
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  PAL.forEach((p) => { p.sr = p.s.map(hex); p.acr = hex(p.ac); });
  const mixc = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const toMin = (s) => { let [h, m] = s.split(':').map(Number); if (h < 12) h += 24; return (h - 23) * 60 + m; };
  let TL = [];
  const timeSecs = $$('[data-time]');
  function buildTimeline() {
    const pts = [];
    const maxS = Math.max(1, document.documentElement.scrollHeight - vh);
    timeSecs.forEach((s, i) => {
      const [a, b] = s.dataset.time.split('-').map(toMin);
      const top = s.getBoundingClientRect().top + window.scrollY;
      pts.push({ y: i === 0 ? 0 : clamp(top - vh * 0.5, 0, maxS), m: a });
      if (i === timeSecs.length - 1) pts.push({ y: maxS, m: b });
    });
    for (let i = 1; i < pts.length; i++) if (pts[i].y <= pts[i - 1].y) pts[i].y = pts[i - 1].y + 1;
    TL = pts;
  }
  function minutesAt(y) {
    if (!TL.length) return 0;
    if (y <= TL[0].y) return TL[0].m;
    for (let i = 1; i < TL.length; i++) {
      if (y <= TL[i].y) return lerp(TL[i - 1].m, TL[i].m, (y - TL[i - 1].y) / (TL[i].y - TL[i - 1].y));
    }
    return TL[TL.length - 1].m;
  }
  function currentSection() {
    const y = window.scrollY + vh * 0.5;
    let cur = 'top';
    $$('main > section[id]').forEach((s) => { if (s.offsetTop <= y) cur = s.id; });
    if (cur === 'frames') cur = 'top';
    return cur;
  }
  const clockEl = $('[data-clock]'), clockSub = $('[data-clock-sub]'), hud = $('.hud');
  const hH = $('.hud__h'), hM = $('.hud__m');
  (function ticks() {
    const g = $('.hud__ticks');
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, r1 = 17.5, r2 = i % 3 ? 19.5 : 20.5;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', 24 + Math.sin(a) * r1); l.setAttribute('y1', 24 - Math.cos(a) * r1);
      l.setAttribute('x2', 24 + Math.sin(a) * r2); l.setAttribute('y2', 24 - Math.cos(a) * r2);
      g.appendChild(l);
    }
  })();
  let lastMinute = -1, developedFlag = false, lastFgDark = null;
  const varCache = {};
  const setVar = (k, v) => { if (varCache[k] !== v) { varCache[k] = v; root.style.setProperty(k, v); } };
  let lastTlY = -1, lastTlM = 0;
  function updateTimeline(sy) {
    if (Math.abs(sy - lastTlY) < 0.5) return lastTlM;
    lastTlY = sy;
    const m = minutesAt(sy);
    lastTlM = m;
    let i = 0; while (i < PAL.length - 2 && m > PAL[i + 1].m) i++;
    const A = PAL[i], B = PAL[i + 1], t = clamp((m - A.m) / (B.m - A.m));
    const s = [0, 1, 2].map((k) => mixc(A.sr[k], B.sr[k], t));
    const st = { setProperty: setVar };
    st.setProperty('--sky-1', rgb(s[0])); st.setProperty('--sky-2', rgb(s[1])); st.setProperty('--sky-3', rgb(s[2]));
    const g = mixc(A.g, B.g, t);
    st.setProperty('--glow', g.join(','));
    st.setProperty('--glow-a', lerp(A.ga, B.ga, t).toFixed(3));
    st.setProperty('--sun-y', lerp(120, 48, sstep(380, 560, m)).toFixed(2));
    st.setProperty('--sun-a', sstep(380, 470, m).toFixed(3));
    const L = lum(s[1]);
    const dark = L > 0.36;
    if (dark !== lastFgDark) {
      lastFgDark = dark;
      st.setProperty('--fg', dark ? '#22140d' : '#f6e3d3');
      st.setProperty('--fg-mute', dark ? 'rgba(34,20,13,.72)' : 'rgba(246,227,211,.72)');
      st.setProperty('--line', dark ? 'rgba(34,20,13,.2)' : 'rgba(246,227,211,.22)');
      st.setProperty('--bg-ink', dark ? '#fbf4e8' : '#1a0504');
      st.setProperty('--accent-ink', dark ? '#fff6ec' : '#1a0504');
      st.setProperty('--nav-rgb', dark ? '251,243,230' : '13,4,6');
      st.setProperty('--card', dark ? 'rgba(255,250,242,.55)' : 'rgba(20,6,4,.5)');
      root.classList.toggle('is-day', dark);
    }
    st.setProperty('--accent', rgb(mixc(A.acr, B.acr, t)));
    st.setProperty('--nav-a', clamp((sy - vh * 0.6) / (vh * 0.5)).toFixed(3));
    // clock
    const total = Math.round(m);
    if (total !== lastMinute) {
      lastMinute = total;
      const abs = (23 * 60 + total) % (24 * 60);
      const hh = Math.floor(abs / 60), mm = abs % 60;
      const h12 = ((hh + 11) % 12) + 1;
      clockEl.textContent = `${h12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
      hM.style.transform = `rotate(${mm * 6}deg)`;
      hH.style.transform = `rotate(${(hh % 12) * 30 + mm * 0.5}deg)`;
      const dev = total >= 600;
      if (dev !== developedFlag) {
        developedFlag = dev;
        clockSub.textContent = dev ? 'Roll developed · 86 photos' : 'Roll sealed · develops 9:00';
        hud.classList.toggle('is-dev', dev);
        if (dev && !RM) { flash(0.55, 650); Sound.play('shutter'); }
      }
    }
    return m;
  }

  /* ---------------- flash frame ---------------- */
  const flashEl = $('.flashframe');
  function flash(peak = 1, dur = 800, onPeak) {
    tween({ dur: 60, ease: (k) => k, update: (v) => { flashEl.style.opacity = (v * peak).toFixed(3); }, done: () => {
      onPeak && onPeak();
      tween({ dur, delay: 70, ease: easeOut, from: 1, to: 0, update: (v) => { flashEl.style.opacity = (v * peak).toFixed(3); } });
    } });
  }

  /* ---------------- hero ---------------- */
  const heroSec = $('.hero'), heroCanvas = $('.hero__gl');
  const hero = new HeroStrip(heroCanvas, ['img/rooftop.webp', 'img/neon.webp', 'img/sparklers.webp', 'img/ferris.webp', 'img/bonfire.webp', 'img/dance.webp']);
  let heroReady = false, heroIntroT = null;
  const heroPtr = { x: -1, y: -1, in: false, down: false, moved: false };
  function heroLayout() {
    if (!hero.ok) return;
    const dpr = CAPTURE ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    hero.layout(vw, vh, dpr, isMobile());
    const g = hero.g;
    $('.hero__meter').style.top = `${Math.round(g.cy + (g.fh / 2 + g.band) + 28)}px`;
  }
  const pin = $('.hero__pin');
  pin.addEventListener('pointermove', (e) => { heroPtr.x = e.clientX; heroPtr.y = e.clientY; heroPtr.in = true; heroPtr.moved = true; });
  pin.addEventListener('pointerleave', () => { heroPtr.in = false; heroPtr.down = false; });
  pin.addEventListener('pointerdown', (e) => { if (e.target.closest('a,button')) return; heroPtr.down = true; heroPtr.x = e.clientX; heroPtr.y = e.clientY; heroPtr.in = true; });
  window.addEventListener('pointerup', () => { heroPtr.down = false; });
  if (!FINE) $('.hero__hint-txt').textContent = 'Touch and drag the film to develop it. Scroll to finish the bath.';
  const devReadout = $('[data-dev-readout]'), devBar = $('.hero__meter');
  if (hero.ok) {
    heroLayout();
    (document.fonts ? document.fonts.load('500 22px "DM Mono"').catch(() => {}) : Promise.resolve()).then(() => hero.init()).then((ok) => {
      heroReady = !!ok;
      if (!ok) root.classList.add('no-gl');
      heroIntroT = performance.now() + 700;
    });
  } else root.classList.add('no-gl');
  // headline intro
  const hls = $$('.hl__in');
  if (!RM) {
    hls.forEach((h, i) => {
      h.style.transform = 'translateY(105%)';
      tween({ dur: 1300, delay: 250 + i * 140, ease: easeOutExpo, update: (v) => { h.style.transform = `translateY(${((1 - v) * 105).toFixed(2)}%)`; } });
    });
    const fades = $$('.hero__copy .eyebrow, .hero__side, .hero__hint');
    fades.forEach((f, i) => { f.style.opacity = 0; tween({ dur: 900, delay: 700 + i * 120, update: (v) => { f.style.opacity = v; f.style.transform = `translateY(${(1 - v) * 16}px)`; } }); });
  }
  const heroCopy = $('.hero__copy');
  let heroP = 0;
  function updateHero(t, dt, sy) {
    const h = heroSec.offsetHeight;
    const p = clamp(sy / Math.max(1, h - vh));
    heroP = p;
    if (!heroReady || sy > h) return;
    hero.time = RM ? 0 : t;
    hero.wave = RM ? 0 : 6 + Math.min(18, Math.abs(scrollVel) * 0.004);
    hero.offset = (RM ? 0 : t * 22) + p * vw * 0.7;
    for (let i = 0; i < 6; i++) {
      const off = ((i * 0.37) % 1) * 0.22;
      hero.dev[i] = easeInOut(clamp((p - 0.04 - off) / 0.62));
    }
    // developer brush: hover paints slowly, holding pushes harder
    if (heroPtr.in && heroPtr.x >= 0) {
      const k = Math.min(3, dt * 60);
      const r = hero.g.fh * (heroPtr.down ? 0.5 : 0.3);
      hero.paint(heroPtr.x, heroPtr.y, (heroPtr.down ? 0.075 : 0.028) * k, r);
      if (heroPtr.moved || heroPtr.down) { heroIntroT = null; }
    } else if (heroIntroT && !RM) {
      const e = (performance.now() - heroIntroT) / 1000;
      if (e > 0 && e < 3.4) {
        const g = hero.g;
        const x = g.cx + Math.sin(e * 1.9) * g.fw * 0.32 - g.fw * 0.1;
        const y = g.cy + Math.cos(e * 3.1) * g.fh * 0.25 + Math.tan(-g.angle) * (g.cx - x) * -1;
        hero.paint(x, y, 0.045 * Math.min(3, dt * 60), g.fh * 0.26);
      }
    }
    hero.render(look);
    const dv = Math.max(hero.dev.reduce((a, b) => a + b, 0) / 6, hero.painted);
    devReadout.textContent = String(Math.round(dv * 100)).padStart(2, '0') + '%';
    devBar.style.setProperty('--dev', dv.toFixed(3));
    if (!RM) {
      heroCopy.style.transform = `translate3d(0, ${(p * 6).toFixed(2)}vh, 0)`;
      heroCopy.style.opacity = (1 - sstep(0.78, 1, p)).toFixed(3);
    }
  }

  /* ---------------- trays (agitation + tilt) ---------------- */
  const trays = $$('.tray');
  trays.forEach((tr) => {
    tr._rx = 0; tr._ry = 0; tr._tx = 0; tr._ty = 0;
    tr.addEventListener('pointermove', (e) => {
      const r = tr.getBoundingClientRect();
      tr._tx = ((e.clientY - r.top) / r.height - 0.5) * -14;
      tr._ty = ((e.clientX - r.left) / r.width - 0.5) * 18;
    });
    tr.addEventListener('pointerleave', () => { tr._tx = 0; tr._ty = 0; });
  });
  function updateTrays(t, dt) {
    trays.forEach((tr, i) => {
      const r = tr.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const k = 1 - Math.pow(0.001, dt);
      tr._rx = lerp(tr._rx, tr._tx + (RM ? 0 : Math.sin(t * 1.3 + i) * 3), k);
      tr._ry = lerp(tr._ry, tr._ty + (RM ? 0 : Math.cos(t * 1.1 + i * 2) * 4), k);
      tr.style.setProperty('--rx', tr._rx.toFixed(2) + 'deg');
      tr.style.setProperty('--ry', tr._ry.toFixed(2) + 'deg');
      tr.style.setProperty('--sheen', (RM ? -30 : ((t * 18 + i * 40) % 160) - 80).toFixed(1) + '%');
    });
  }

  /* ---------------- night story ---------------- */
  const night = $('.night');
  const chapters = $$('.chapter');
  chapters.forEach((c) => {
    const line = $('.chapter__line', c);
    const words = line.textContent.trim().split(/\s+/);
    line.innerHTML = words.map((w) => `<span class="w">${w} </span>`).join('');
    c._words = $$('.w', line);
    c._time = $('.chapter__time', c);
  });
  const vfs = $$('.phone__vf canvas');
  const shotsEl = $('[data-shots]'), toast = $('.phone__toast'), phoneFlash = $('.phone__flash'), shutterBtn = $('.shutter i');
  const stepEl = $('[data-night-step]');
  const nightLayers = $$('.night .layer[data-depth]');
  const polas = $$('.polaroid');
  const nstrips = $$('.nstrip');
  let shots = 27, vfIdx = 0;
  function takeShot() {
    tween({ dur: 360, from: 0.55, to: 0, update: (v) => { phoneFlash.style.opacity = v.toFixed(3); } });
    tween({ dur: 260, from: 0.82, to: 1, ease: easeBack, update: (v) => { shutterBtn.style.setProperty('--press', v.toFixed(3)); } });
    tween({ dur: 1500, update: (v, k) => {
      const o = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
      toast.style.opacity = o.toFixed(3);
      toast.style.transform = `translate(-50%, ${((1 - Math.min(1, k / 0.15)) * 10).toFixed(1)}px)`;
    } });
    tween({ dur: 300, from: -8, to: 0, ease: easeBack, update: (v) => { shotsEl.style.transform = `translateY(${v.toFixed(1)}px)`; } });
    Sound.play('shutter');
  }
  function updateNight(t, sy) {
    const top = night.offsetTop, h = night.offsetHeight;
    if (sy + vh < top || sy > top + h) return;
    const np = clamp((sy - top) / (h - vh));
    const c = np * 5.25 - 0.02;
    chapters.forEach((ch, i) => {
      const local = c - i;
      const isLast = i === chapters.length - 1;
      const inA = clamp(local / 0.38);
      const outA = isLast ? 0 : clamp((local - 0.78) / 0.22);
      const vis = inA > 0 && outA < 1;
      ch.style.visibility = vis ? 'visible' : 'hidden';
      if (!vis) return;
      const n = ch._words.length;
      ch._words.forEach((w, wi) => {
        const a = RM ? (inA > 0.05 ? 1 : 0) : clamp(inA * (n + 3) - wi, 0, 1) * 1;
        const e = easeOut(a);
        w.style.opacity = e.toFixed(3);
        w.style.transform = RM ? '' : `translate3d(0, ${((1 - e) * 0.55).toFixed(3)}em, 0) rotate(${((1 - e) * 4).toFixed(2)}deg)`;
      });
      ch._time.style.opacity = clamp(inA * 3).toFixed(3);
      ch.style.opacity = (1 - outA).toFixed(3);
      ch.style.transform = (isMobile() ? '' : 'translateY(-50%) ') + (RM ? '' : `translate3d(0, ${(-outA * 60).toFixed(1)}px, 0)`);
      ch.style.filter = '';
    });
    const step = clamp(Math.floor(c), 0, 4);
    stepEl.textContent = String(step + 1).padStart(2, '0');
    if (step !== vfIdx) { vfs[vfIdx].classList.remove('is-on'); vfs[step].classList.add('is-on'); vfIdx = step; }
    const nShots = Math.round(lerp(27, 2, clamp(np * 1.08)));
    if (nShots !== shots) { const took = nShots < shots; shots = nShots; shotsEl.textContent = shots; if (took && (CAPTURE ? shots % 3 === 0 : Math.random() < 0.5)) takeShot(); }
    if (!RM) {
      nightLayers.forEach((l) => {
        const d = parseFloat(l.dataset.depth);
        if (l.classList.contains('layer--strips')) return;
        l.style.transform = `translate3d(0, ${((0.5 - np) * d * vh * 0.9).toFixed(1)}px, 0)`;
      });
      nstrips.forEach((s, i) => {
        const dir = i ? 1 : -1;
        s.style.transform = `translate3d(${(dir * np * vw * 0.5 - (i ? vw * 0.3 : 0)).toFixed(1)}px, 0, 0) rotate(${i ? 6 : -9}deg)`;
      });
      polas.forEach((p, i) => {
        const d = parseFloat(p.dataset.depth), r = parseFloat(p.dataset.rot);
        p.style.transform = `translate3d(0, ${((0.5 - np) * d * vh * (isMobile() ? 0.35 : 1.1)).toFixed(1)}px, 0) rotate(${(r + Math.sin(t * 0.6 + i * 1.7) * 1.6).toFixed(2)}deg)`;
        p.style.setProperty('--seal', (0.9 + Math.sin(t * 1.4 + i) * 0.05).toFixed(3));
      });
    } else {
      polas.forEach((p) => { p.style.transform = `rotate(${p.dataset.rot}deg)`; });
    }
  }

  const prints = $$('.prints .print'), waitSec = $('.waitlist');
  function updatePrints(t, sy) {
    const top = waitSec.offsetTop, h = waitSec.offsetHeight;
    if (sy + vh < top || sy > top + h) return;
    const k = clamp((sy + vh - top) / (h + vh));
    prints.forEach((p, i) => {
      const d = parseFloat(p.dataset.depth), r = parseFloat(p.dataset.rot);
      p.style.transform = RM ? `rotate(${r}deg)` : `translate3d(0, ${((0.5 - k) * d * 260).toFixed(1)}px, 0) rotate(${(r + Math.sin(t * 0.5 + i * 2) * 1.2).toFixed(2)}deg)`;
    });
  }

  /* ---------------- develop the roll (game) ---------------- */
  const sheet = $('[data-sheet]');
  const frames = $$('.sheet__frame', sheet).map((el, i) => ({ el, canvas: $('canvas', el), flashEl: $('.flash', el), dev: 0, done: false, i }));
  const countEl = $('[data-roll-count]'), labelEl = $('[data-roll-label]'), subEl = $('[data-roll-sub]');
  const holdBtn = $('[data-hold]'), resetBtn = $('[data-roll-reset]'), doneEl = $('[data-roll-done]');
  const marks = $('[data-sheet-marks]'), stamp = $('.sheet__stamp');
  let remaining = 24, holding = false, rollFinished = false, rects = null, lastRub = null;
  function cacheRects() { rects = frames.map((f) => f.el.getBoundingClientRect()); }
  function bump(f, amt) {
    if (f.done || amt <= 0) return;
    f.dev = Math.min(1, f.dev + amt);
    grader.setDev(f.canvas, f.dev);
    if (f.dev >= 1) {
      f.done = true; remaining--;
      countEl.textContent = remaining;
      tween({ dur: 380, from: 0.9, to: 0, update: (v) => { f.flashEl.style.opacity = v.toFixed(3); } });
      tween({ dur: 420, from: 1.12, to: 1, ease: easeBack, update: (v) => { f.el.style.transform = `scale(${v.toFixed(3)})`; } });
      tween({ dur: 260, from: -10, to: 0, ease: easeBack, update: (v) => { countEl.style.transform = `translateY(${v.toFixed(1)}px)`; } });
      Sound.play('tick');
      holdBtn.style.setProperty('--hold', ((24 - remaining) / 24).toFixed(3));
      if (remaining === 0) finishRoll();
    }
  }
  function rubAt(x, y, dist) {
    if (rollFinished) return;
    if (!rects) cacheRects();
    const w = rects[0].width;
    rects.forEach((r, i) => {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const d = Math.hypot((x - cx) / r.width, (y - cy) / r.height);
      const wgt = clamp(1.15 - d * 1.1);
      if (wgt > 0) bump(frames[i], dist * wgt / (w * 1.7));
    });
  }
  sheet.addEventListener('pointerdown', (e) => { cacheRects(); lastRub = { x: e.clientX, y: e.clientY, down: true }; });
  sheet.addEventListener('pointermove', (e) => {
    if (!lastRub) { cacheRects(); lastRub = { x: e.clientX, y: e.clientY, down: false }; return; }
    const d = Math.hypot(e.clientX - lastRub.x, e.clientY - lastRub.y);
    const isDown = e.buttons & 1 || e.pointerType !== 'mouse';
    rubAt(e.clientX, e.clientY, Math.min(160, d) * (isDown ? 1 : 0.45));
    lastRub.x = e.clientX; lastRub.y = e.clientY;
  });
  sheet.addEventListener('pointerleave', () => { lastRub = null; rects = null; });
  window.addEventListener('scroll', () => { rects = null; }, { passive: true });
  let holdSrc = null;
  const startHold = (e, src) => { if (rollFinished) return; holding = true; holdSrc = src || holdBtn; holdBtn.classList.add('is-holding'); if (e && e.pointerType) try { holdBtn.setPointerCapture(e.pointerId); } catch (_) {} };
  const stopHold = () => { holding = false; holdBtn.classList.remove('is-holding'); };
  holdBtn.addEventListener('pointerdown', (e) => startHold(e, holdBtn));
  holdBtn.addEventListener('pointerup', stopHold);
  holdBtn.addEventListener('pointercancel', stopHold);
  holdBtn.addEventListener('lostpointercapture', stopHold);
  holdBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  [holdBtn, sheet].forEach((el) => {
    el.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(null, el); } });
    el.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stopHold(); });
    el.addEventListener('blur', () => { if (holdSrc === el) stopHold(); });
  });
  function updateRoll(dt) {
    if (!holding || rollFinished) return;
    const next = frames.findIndex((f) => !f.done);
    if (next < 0) return;
    for (let k = next; k < Math.min(24, next + 5); k++) bump(frames[k], dt * 8 * Math.max(0, 1 - (k - next) * 0.22));
  }
  function pencil(d, delay) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d); marks.appendChild(p);
    const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
    tween({ dur: 520, delay, ease: easeInOut, update: (v) => { p.style.strokeDashoffset = (L * (1 - v)).toFixed(1); } });
  }
  function note(x, y, txt, rot, delay) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = txt;
    t.setAttribute('transform', `rotate(${rot} ${x} ${y})`); t.style.opacity = 0;
    marks.appendChild(t);
    tween({ dur: 300, delay, update: (v) => { t.style.opacity = v; } });
  }
  function finishRoll() {
    rollFinished = true; holding = false;
    const m = minutesAt(window.scrollY);
    const abs = (23 * 60 + Math.round(m)) % 1440, hh = Math.floor(abs / 60), mm = abs % 60;
    const early = Math.max(0, 600 - Math.round(m));
    $('[data-stamp-time]').textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
    $('[data-stamp-early]').textContent = `${Math.floor(early / 60)} h ${early % 60} m early`;
    labelEl.textContent = 'shots still sealed. Roll developed.';
    subEl.textContent = 'Goa, December · 24 of 24 frames';
    Sound.play('done');
    // contact-sheet reveal: flash, pulse, grease pencil, stamp
    flash(0.7, 700);
    tween({ dur: 700, ease: easeBack, from: 0.96, to: 1, update: (v) => { sheet.style.transform = `rotate(1.2deg) scale(${v.toFixed(4)})`; } });
    const sr = sheet.getBoundingClientRect();
    marks.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
    marks.innerHTML = '';
    const picks = [[4, 'keeper!', -6], [9, 'ha', 4], [19, 'print this', -3]];
    picks.forEach(([fi, txt, rot], k) => {
      const r = frames[fi].el.getBoundingClientRect();
      const x = r.left - sr.left, y = r.top - sr.top, w = r.width, h = r.height;
      const cx = x + w / 2, cy = y + h / 2, rx = w * 0.62, ry = h * 0.66;
      let d = '';
      for (let a = 0; a <= 6.9; a += 0.25) {
        const wob = 1 + Math.sin(a * 3 + k) * 0.04;
        d += (a ? 'L' : 'M') + (cx + Math.cos(a - 0.6) * rx * wob * (1 + a * 0.012)).toFixed(1) + ' ' + (cy + Math.sin(a - 0.6) * ry * wob).toFixed(1) + ' ';
      }
      pencil(d, 380 + k * 420);
      note(Math.min(sr.width - 90, cx + rx * 0.4), Math.max(18, cy - ry - 8), txt, rot, 700 + k * 420);
    });
    tween({ dur: 650, delay: 1700, ease: easeBack, update: (v) => { stamp.style.setProperty('--stamp', v.toFixed(3)); } });
    resetBtn.hidden = false; doneEl.hidden = false;
    tween({ dur: 600, delay: 1500, update: (v) => { doneEl.style.opacity = v; } });
  }
  resetBtn.addEventListener('click', () => {
    frames.forEach((f) => { f.dev = 0; f.done = false; grader.setDev(f.canvas, 0); f.el.style.transform = ''; });
    remaining = 24; rollFinished = false;
    countEl.textContent = '24'; labelEl.textContent = 'shots still sealed'; subEl.textContent = 'Goa, December · 7 people';
    marks.innerHTML = ''; stamp.style.setProperty('--stamp', 0);
    holdBtn.style.setProperty('--hold', 0);
    resetBtn.hidden = true; doneEl.hidden = true;
    holdBtn.focus();
  });

  /* ---------------- waitlist ---------------- */
  const form = $('[data-form]'), input = $('#wl-email'), err = $('#wl-error'), row = $('.form__row', form);
  const success = $('[data-success]');
  function setErr(msg) {
    err.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    row.classList.toggle('is-error', !!msg);
  }
  input.addEventListener('input', () => { if (err.textContent) setErr(''); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) { setErr('We need an email to send the invite to.'); shake(); input.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setErr("That doesn't look like an email yet. Check for a typo?"); shake(); input.focus(); return; }
    setErr('');
    let hsh = 0; for (const ch of v) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    $('[data-frame-no]').textContent = String(400 + (hsh % 97)).padStart(4, '0');
    $('[data-success-email]').textContent = v;
    try { localStorage.setItem('overnight-waitlist', JSON.stringify({ email: v, crew: form.crew.value, at: Date.now() })); } catch (_) {}
    Sound.play('flash');
    const swap = () => {
      form.hidden = true; success.hidden = false;
      grader.flush(true);
      success.focus({ preventScroll: true });
      tween({ dur: 900, ease: easeBack, from: -60, to: 0, update: (v2) => { $('.success__print').style.setProperty('--eject', v2.toFixed(1) + 'px'); } });
    };
    if (RM) swap(); else setTimeout(() => flash(1, 900, swap), CAPTURE ? 0 : 330);
  });
  function shake() {
    if (RM) return;
    tween({ dur: 420, update: (v, k) => { row.style.transform = `translateX(${(Math.sin(k * 26) * (1 - k) * 9).toFixed(1)}px)`; } });
  }
  $('[data-success-reset]').addEventListener('click', () => { success.hidden = true; form.hidden = false; input.value = ''; input.focus(); });

  /* ---------------- viewfinder cursor ---------------- */
  const vf = $('.vf'), vfLabel = $('.vf__label');
  const cur = { x: vw / 2, y: vh / 2, bx: vw / 2 - 17, by: vh / 2 - 13, bw: 34, bh: 26, down: false, target: null, seen: false };
  const SNAP = '[data-snap], canvas[data-film], .btn, a, button, summary, input, .sheet, label';
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && !CAPTURE) return;
    cur.x = e.clientX; cur.y = e.clientY;
    if (!cur.seen) { cur.seen = true; cur.bx = cur.x - 17; cur.by = cur.y - 13; }
    const t = e.target.closest ? e.target.closest(SNAP) : null;
    cur.target = t && !t.closest('.phone__vf, .nstrip') ? t : null;
  }, { passive: true });
  window.addEventListener('pointerdown', () => { cur.down = true; });
  window.addEventListener('pointerup', () => { cur.down = false; });
  document.addEventListener('pointerleave', () => { cur.seen = false; vf.style.opacity = 0; });
  function updateCursor(dt) {
    if (!FINE) return;
    if (!cur.seen) { vf.style.opacity = 0; return; }
    vf.style.opacity = 1;
    let tx, ty, tw, th, label = '', snap = false, media = false;
    const el = cur.target;
    if (el && el !== document.body) {
      const isSheet = el.classList.contains('sheet');
      const r = el.getBoundingClientRect();
      media = el.tagName === 'CANVAS' || el.hasAttribute('data-snap') || el.classList.contains('fs-frame');
      if (isSheet) {
        tw = 64; th = 48; tx = cur.x - 32; ty = cur.y - 24; label = rollFinished ? 'Developed' : 'Rub to develop'; snap = true;
      } else if (r.width < vw * 0.9 && r.height < vh * 0.9) {
        const pad = media ? 8 : 6;
        tx = r.left - pad; ty = r.top - pad; tw = r.width + pad * 2; th = r.height + pad * 2;
        label = el.dataset.snap || ''; snap = true;
      }
    }
    if (!snap) {
      const s = heroPtr.in && heroP < 0.95 ? 1.5 : 1;
      tw = 34 * s; th = 26 * s; tx = cur.x - tw / 2; ty = cur.y - th / 2;
    }
    if (cur.down) { const k = 0.86; tx += tw * (1 - k) / 2; ty += th * (1 - k) / 2; tw *= k; th *= k; }
    const k = RM ? 1 : 1 - Math.pow(0.00002, dt);
    cur.bx = lerp(cur.bx, tx, k); cur.by = lerp(cur.by, ty, k); cur.bw = lerp(cur.bw, tw, k); cur.bh = lerp(cur.bh, th, k);
    vf.style.transform = `translate3d(${cur.bx.toFixed(1)}px, ${cur.by.toFixed(1)}px, 0)`;
    vf.style.width = cur.bw.toFixed(1) + 'px'; vf.style.height = cur.bh.toFixed(1) + 'px';
    vf.classList.toggle('is-snap', snap && !!label);
    vf.classList.toggle('is-light', media);
    if (vfLabel.textContent !== label) vfLabel.textContent = label;
    const dot = vf.firstElementChild && $('.vf__dot', vf);
    dot.style.transform = snap ? '' : `translate(${(cur.x - (cur.bx + cur.bw / 2)).toFixed(1)}px, ${(cur.y - (cur.by + cur.bh / 2)).toFixed(1)}px)`;
  }

  /* ---------------- atmosphere: grain, leaks, rails ---------------- */
  const grainEl = $('.grain');
  (function makeGrain() {
    const c = document.createElement('canvas'); c.width = c.height = 220;
    const x = c.getContext('2d'), d = x.createImageData(220, 220);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    grainEl.style.backgroundImage = `url(${c.toDataURL()})`;
  })();
  const leakA = $('.leak--a'), leakB = $('.leak--b');
  const rails = $$('.rail');
  let grainT = 0, leakV = 0;
  function updateAtmos(t, sy, m) {
    if (!RM && t - grainT > 1 / 24) {
      grainT = t;
      grainEl.style.transform = `translate3d(${Math.floor(Math.random() * 200 - 100)}px, ${Math.floor(Math.random() * 200 - 100)}px, 0)`;
    }
    leakV = lerp(leakV, clamp(Math.abs(scrollVel) / 4000), 0.08);
    leakBurst *= 0.965;
    if (!RM) {
      const day = sstep(430, 520, m);
      const base = 0.28 + 0.18 * Math.sin(t * 0.33) + 0.1 * Math.sin(t * 0.91);
      const a = clamp(base * (1 - day * 0.55) + leakV * 0.6 + leakBurst * 0.7);
      const b = clamp((0.18 + 0.15 * Math.sin(t * 0.27 + 2)) * (1 - day * 0.4) + leakV * 0.5 + leakBurst * 0.5);
      leakA.style.opacity = a.toFixed(3);
      leakB.style.opacity = b.toFixed(3);
      leakA.style.transform = `translate3d(${(Math.sin(t * 0.21) * 6).toFixed(2)}vw, ${(Math.cos(t * 0.17) * 4).toFixed(2)}vh, 0)`;
      leakB.style.transform = `translate3d(${(Math.cos(t * 0.19) * 5).toFixed(2)}vw, ${(Math.sin(t * 0.23) * 5).toFixed(2)}vh, 0)`;
    }
    const off = (-sy % 32).toFixed(0);
    if (off !== updateAtmos.off) { updateAtmos.off = off; rails.forEach((r) => { r.style.backgroundPositionY = off + 'px'; }); }
  }
  // sound bars
  const bars = $$('.sound__bars i');
  function updateBars(t) {
    bars.forEach((b, i) => { b.style.height = Sound.on ? `${(4 + Math.abs(Math.sin(t * (3 + i) + i)) * 10).toFixed(1)}px` : '3px'; });
  }

  /* ---------------- layout & loop ---------------- */
  function layout() {
    vw = window.innerWidth; vh = window.innerHeight;
    heroLayout();
    inlineStrip.measure();
    if (!reelEl.hidden) reelStrip.measure();
    buildTimeline();
    rects = null;
    grader.flush();
  }
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
  window.addEventListener('load', () => { layout(); });
  if (document.fonts) document.fonts.ready.then(() => { layout(); });

  let last = performance.now(), lastSy = window.scrollY, scrollVel = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (CAPTURE && now - last < 30) return;
    try { tick(now); } catch (e) { console.error('frame error', e && e.stack || e); }
  }
  function tick(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const t = now / 1000;
    if (lenis) lenis.raf(now);
    const sy = lenis ? lenis.scroll : window.scrollY;
    scrollVel = lerp(scrollVel, (sy - lastSy) / dt, 0.2);
    lastSy = sy;
    runTweens(now);
    const m = updateTimeline(sy);
    updateHero(t, dt, sy);
    inlineStrip.update(dt);
    if (!reelEl.hidden) reelStrip.update(dt);
    updateTrays(t, dt);
    updateNight(t, sy);
    updatePrints(t, sy);
    updateRoll(dt);
    updateCursor(dt);
    updateAtmos(t, sy, m);
    updateBars(t);
    Sound.update(t);
    grader.flush();
  }
  layout();
  requestAnimationFrame(frame);

  function replayIntro() {
    hero.clearMask();
    heroIntroT = performance.now() + 500;
    if (RM) return;
    hls.forEach((h, i) => {
      h.style.transform = 'translateY(105%)';
      tween({ dur: 1300, delay: 200 + i * 140, ease: easeOutExpo, update: (v) => { h.style.transform = `translateY(${((1 - v) * 105).toFixed(2)}%)`; } });
    });
    $$('.hero__copy .eyebrow, .hero__side, .hero__hint').forEach((f, i) => { f.style.opacity = 0; tween({ dur: 900, delay: 600 + i * 120, update: (v) => { f.style.opacity = v; f.style.transform = `translateY(${(1 - v) * 16}px)`; } }); });
  }
  window.__overnight = { replayIntro, heroReady: () => heroReady, setLook, openReel, closeReel, grader, hero, inlineStrip, reelStrip, minutesAt, frames };
})();
