/* fx.js: opt-in signature effects. Each effect activates only if its markup exists. */
(() => {
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const G = window.gsap, ST = window.ScrollTrigger;
if (G && ST) G.registerPlugin(ST);
const DPR = Math.min(devicePixelRatio || 1, 2);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const onScreen = (el, cb, m = '0px') => new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: m }).observe(el);

/* ---------- 1. character blur reveal: [data-fx-chars] ---------- */
$$('[data-fx-chars]').forEach(el => {
  const walk = n => { [...n.childNodes].forEach(c => {
    if (c.nodeType === 3) { const f = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(w)); return; }
        const ws = document.createElement('span'); ws.className = 'fxw'; [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'fxc'; s.textContent = ch; ws.appendChild(s); }); f.appendChild(ws); });
      c.replaceWith(f);
    } else if (c.nodeType === 1) walk(c); }); };
  walk(el);
  const cs = $$('.fxc', el);
  if (!G || RM) return;
  G.set(cs, { opacity: 0, filter: 'blur(10px)', yPercent: 40 });
  ST.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => G.to(cs, { opacity: 1, filter: 'blur(0px)', yPercent: 0, duration: 1.6, ease: 'power3.out', stagger: { each: .028 } }) });
});

/* ---------- 2. gradient text fill on scroll: [data-fx-fill] ---------- */
$$('[data-fx-fill]').forEach(el => {
  el.classList.add('fx-fill');
  if (!G) { el.style.setProperty('--fp', '100%'); return; }
  ST.create({ trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 1.2, onUpdate: s => el.style.setProperty('--fp', (s.progress * 100).toFixed(1) + '%') });
});

/* ---------- 3. clip-path reveals: [data-fx-clip="circle|arch|blinds|diag|curtain"] ---------- */
$$('[data-fx-clip]').forEach(el => {
  const k = el.dataset.fxClip; el.classList.add('fxclip', 'fxclip-' + k);
  if (k === 'blinds') { const img = $('img', el); if (img) { const n = 6; for (let i = 0; i < n; i++) { const b = document.createElement('i'); b.style.setProperty('--i', i); b.style.setProperty('--n', n); el.appendChild(b); } } }
  if (RM) { el.classList.add('in'); return; }
  onScreenOnce(el, () => el.classList.add('in'));
});
function onScreenOnce(el, cb) { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { cb(); io.disconnect(); } }), { threshold: .18 }); io.observe(el); }

/* ---------- 4. horizontal pinned gallery with skew: .fx-hgal > .fx-htrack ---------- */
$$('.fx-hgal').forEach(sec => {
  const track = $('.fx-htrack', sec); if (!track || !G) return;
  const items = $$('.fx-hitem', track);
  const dist = () => Math.max(0, track.scrollWidth - innerWidth + (innerWidth > 900 ? 80 : 32));
  let skew = 0, last = 0, lt = performance.now();
  const tw = G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1.1, invalidateOnRefresh: true, anticipatePin: 1,
    onUpdate: s => { const now = performance.now(); const v = (s.progress - last) / Math.max(16, now - lt) * 1000; last = s.progress; lt = now; skew = clamp(v * -6, -5, 5); } } });
  const setS = G.quickTo(items, 'skewX', { duration: 1.2, ease: 'power3.out' });
  G.ticker.add(() => { setS(skew); skew *= .9; });
  items.forEach(it => { const im = $('img', it); if (im) G.fromTo(im, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), scrub: 1.1, containerAnimation: undefined } }); });
});

/* ---------- 5. before / after drag: .fx-ba ---------- */
$$('.fx-ba').forEach(b => {
  const set = p => b.style.setProperty('--p', (clamp(p, .02, .98) * 100).toFixed(2) + '%');
  let on = false;
  const mv = e => { const r = b.getBoundingClientRect(); set((e.clientX - r.left) / r.width); };
  b.addEventListener('pointerdown', e => { on = true; b.setPointerCapture(e.pointerId); mv(e); });
  b.addEventListener('pointermove', e => { if (on || (FINE && b.dataset.hover !== 'off' && false)) mv(e); });
  b.addEventListener('pointerup', () => on = false); b.addEventListener('pointercancel', () => on = false);
  set(.5);
  if (G && !RM) { const o = { p: .5 }; ST.create({ trigger: b, start: 'top 70%', once: true, onEnter: () => G.fromTo(o, { p: .85 }, { p: .5, duration: 2, ease: 'power3.inOut', onUpdate: () => set(o.p) }) }); }
});

/* ---------- 6. image trail cursor: [data-fx-trail] with data-imgs="a.webp,b.webp" ---------- */
$$('[data-fx-trail]').forEach(z => {
  if (!FINE || !G) return;
  const srcs = (z.dataset.imgs || '').split(',').filter(Boolean); if (!srcs.length) return;
  const pool = srcs.map(s => { const i = new Image(); i.src = s; i.className = 'fx-trail-img'; i.alt = ''; z.appendChild(i); return i; });
  let k = 0, lx = 0, ly = 0;
  z.addEventListener('pointermove', e => {
    const r = z.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.hypot(x - lx, y - ly) < 110) return; lx = x; ly = y;
    const im = pool[k++ % pool.length]; z.appendChild(im);
    G.killTweensOf(im);
    G.fromTo(im, { x: x, y: y, xPercent: -50, yPercent: -50, scale: .6, opacity: 0, rotate: (Math.random() - .5) * 8 }, { scale: 1, opacity: 1, duration: .9, ease: 'power3.out' });
    G.to(im, { opacity: 0, scale: .9, duration: 1.4, delay: .9, ease: 'power2.inOut' });
  });
});

/* ---------- 7. tilt + light sheen: [data-fx-tilt] ---------- */
$$('[data-fx-tilt]').forEach(c => {
  c.classList.add('fx-tilt'); if (!FINE) return;
  const sh = document.createElement('i'); sh.className = 'fx-sheen'; c.appendChild(sh);
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const loop = () => { cx += (tx - cx) * .08; cy += (ty - cy) * .08; c.style.transform = `perspective(900px) rotateX(${(-cy * 7).toFixed(2)}deg) rotateY(${(cx * 9).toFixed(2)}deg)`; c.style.setProperty('--sx', (50 + cx * 50) + '%'); c.style.setProperty('--sy', (50 + cy * 50) + '%'); if (Math.abs(tx - cx) + Math.abs(ty - cy) > .001) raf = requestAnimationFrame(loop); else raf = 0; };
  c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; c.classList.add('hov'); if (!raf) raf = requestAnimationFrame(loop); });
  c.addEventListener('pointerleave', () => { tx = ty = 0; c.classList.remove('hov'); if (!raf) raf = requestAnimationFrame(loop); });
});

/* ---------- 8. stacked sticky cards that scale back: .fx-stack > .fx-card ---------- */
$$('.fx-stack').forEach(st => {
  const cards = $$('.fx-card', st); if (!G) return;
  cards.forEach((c, i) => { if (i === cards.length - 1) return;
    G.to(c, { scale: .9, opacity: .35, filter: 'blur(2px)', ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 18%', scrub: 1.2 } }); });
});

/* ---------- 9. cover flow: .fx-flow > .fx-flow-track > .fx-flow-item ---------- */
$$('.fx-flow').forEach(f => {
  const items = $$('.fx-flow-item', f); const n = items.length; if (!n) return;
  let pos = 0, tgt = 0, drag = false, sx = 0, sp = 0, moved = 0;
  const cap = $('.fx-flow-cap', f);
  const render = () => {
    pos += (tgt - pos) * .075;
    const w = f.clientWidth < 700 ? .62 : .34;
    items.forEach((it, i) => { const d = i - pos, a = Math.abs(d);
      it.style.transform = `translate(-50%,-50%) translateX(${d * w * f.clientWidth * .62}px) translateZ(${-a * 160}px) rotateY(${clamp(-d, -1, 1) * 38}deg) scale(${1 - Math.min(a, 3) * .04})`;
      it.style.zIndex = 100 - Math.round(a * 10); it.style.opacity = a > 3.2 ? 0 : 1; it.classList.toggle('on', a < .5); });
    const ci = Math.round(clamp(tgt, 0, n - 1));
    if (cap && cap.dataset.i != ci) { cap.dataset.i = ci; cap.classList.remove('in'); void cap.offsetWidth; cap.innerHTML = items[ci].dataset.cap || ''; cap.classList.add('in'); }
    if (Math.abs(tgt - pos) > .0005 || drag) requestAnimationFrame(render); else running = false;
  };
  let running = false; const kick = () => { if (!running) { running = true; requestAnimationFrame(render); } };
  const go = v => { tgt = clamp(v, 0, n - 1); kick(); };
  f.addEventListener('pointerdown', e => { drag = true; sx = e.clientX; sp = tgt; moved = 0; f.setPointerCapture(e.pointerId); kick(); });
  f.addEventListener('pointermove', e => { if (!drag) return; moved = Math.abs(e.clientX - sx); tgt = clamp(sp - (e.clientX - sx) / (f.clientWidth * .3), 0, n - 1); });
  const up = () => { if (!drag) return; drag = false; go(Math.round(tgt)); };
  f.addEventListener('pointerup', up); f.addEventListener('pointercancel', up);
  items.forEach((it, i) => it.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); return; } if (Math.round(tgt) !== i) { e.preventDefault(); e.stopPropagation(); go(i); } }, true));
  $$('[data-flow]', f).forEach(b => b.addEventListener('click', () => go(Math.round(tgt) + (+b.dataset.flow))));
  go(Math.floor(n / 2)); pos = tgt; render();
  addEventListener('resize', kick);
});

/* ---------- 10. light beam sweep: [data-fx-beam] (wrapper of an image) ---------- */
$$('[data-fx-beam]').forEach(el => { el.classList.add('fx-beam'); });

/* ---------- 11. magnifier lens: [data-fx-lens] (wrapper with img) ---------- */
$$('[data-fx-lens]').forEach(w => {
  if (!FINE) return; const img = $('img', w); if (!img) return;
  const L = document.createElement('div'); L.className = 'fx-lens'; w.appendChild(L);
  const big = img.dataset.big || img.currentSrc || img.src; L.style.backgroundImage = `url("${big}")`;
  const Z = +(w.dataset.fxLens || 2.2);
  w.addEventListener('pointermove', e => { const r = w.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    L.style.left = x + 'px'; L.style.top = y + 'px'; L.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`; L.style.backgroundPosition = `${-(x * Z - 90)}px ${-(y * Z - 90)}px`; w.classList.add('lens-on'); });
  w.addEventListener('pointerleave', () => w.classList.remove('lens-on'));
});

/* ---------- 12. SVG line drawing scrubbed: svg[data-fx-draw] ---------- */
$$('svg[data-fx-draw]').forEach(svg => {
  const ps = $$('path,line,polyline,rect,circle,ellipse', svg);
  ps.forEach(p => { let L = 1000; try { L = p.getTotalLength(); } catch (e) {} p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p._L = L; });
  if (!G) { ps.forEach(p => p.style.strokeDashoffset = 0); return; }
  ST.create({ trigger: svg, start: 'top 85%', end: 'bottom 35%', scrub: 1.4, onUpdate: s => { ps.forEach((p, i) => { const a = i / ps.length * .6, k = clamp((s.progress - a) / .4); p.style.strokeDashoffset = p._L * (1 - k); }); } });
});

/* ---------- 13. text scramble on hover: [data-fx-scramble] ---------- */
const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
$$('[data-fx-scramble]').forEach(el => {
  if (!FINE) return; const orig = el.textContent; let t = 0;
  el.addEventListener('pointerenter', () => { cancelAnimationFrame(t); let f = 0; const tot = 26;
    const step = () => { f++; el.textContent = [...orig].map((c, i) => c === ' ' ? ' ' : (i < orig.length * f / tot ? c : CH[(Math.random() * 26) | 0])).join(''); if (f < tot) t = requestAnimationFrame(step); else el.textContent = orig; }; step(); });
});

/* ---------- 14. scroll Ken Burns with parallax layers: .fx-kb ---------- */
$$('.fx-kb').forEach(k => {
  if (!G) return; const bg = $('.fx-kb-bg', k), fg = $$('.fx-kb-fg', k);
  G.fromTo(bg, { scale: 1.18, yPercent: -4 }, { scale: 1.02, yPercent: 4, ease: 'none', scrollTrigger: { trigger: k, start: 'top bottom', end: 'bottom top', scrub: 1.3 } });
  fg.forEach((f, i) => G.fromTo(f, { y: 80 + i * 40 }, { y: -60 - i * 40, ease: 'none', scrollTrigger: { trigger: k, start: 'top bottom', end: 'bottom top', scrub: 1.3 } }));
});

/* ---------- 15. zoom-through: .fx-zoom (image grows to full screen while pinned) ---------- */
$$('.fx-zoom').forEach(z => {
  if (!G) return; const box = $('.fx-zoom-box', z), txt = $('.fx-zoom-txt', z);
  const tl = G.timeline({ scrollTrigger: { trigger: z, start: 'top top', end: '+=120%', pin: true, scrub: 1.3, anticipatePin: 1 } });
  tl.fromTo(box, { clipPath: 'inset(28% 32% 28% 32% round 200px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut' }, 0)
    .fromTo($('img', box), { scale: 1.35 }, { scale: 1, ease: 'power2.inOut' }, 0);
  if (txt) tl.fromTo(txt, { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out', duration: .35 }, .62);
});

/* ---------- 16. section colour shift: [data-fx-bg] on sections ---------- */
(() => { const secs = $$('[data-fx-bg]'); if (!secs.length || !G) return; const root = document.documentElement;
  const base = getComputedStyle(document.body).backgroundColor;
  secs.forEach(s => ST.create({ trigger: s, start: 'top 55%', end: 'bottom 45%', onToggle: e => { G.to(document.body, { backgroundColor: e.isActive ? s.dataset.fxBg : base, duration: 1.6, ease: 'power2.inOut' }); } })); })();

/* ---------- 17. number counters: [data-fx-count="12"] ---------- */
$$('[data-fx-count]').forEach(el => { const to = +el.dataset.fxCount, o = { v: 0 };
  if (!G || RM) { el.textContent = to; return; } el.textContent = '0';
  ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => G.to(o, { v: to, duration: 2.2, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v) }) }); });

/* ---------- 18. curtain wipe on images: [data-fx-wipe] ---------- */
$$('[data-fx-wipe]').forEach(el => { el.classList.add('fx-wipe'); onScreenOnce(el, () => el.classList.add('in')); });

/* ---------- WebGL helpers ---------- */
function glProg(gl, vs, fs) { const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o)); return o; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); gl.useProgram(p);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const l = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0); return p; }
const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';

/* ---------- 19. depth parallax photo: canvas[data-fx-depth="img.webp"] ---------- */
$$('canvas[data-fx-depth]').forEach(cv => {
  const gl = cv.getContext('webgl', { antialias: false, alpha: false }); if (!gl) return;
  const FS = `precision highp float;varying vec2 v;uniform sampler2D t,d;uniform vec2 m,r,ir;uniform float k;
  void main(){vec2 s=r/ir;float sc=max(s.x,s.y);vec2 uv=(v-.5)*s/sc*.94+.5;uv.y=1.-uv.y;
  float z=texture2D(d,uv).r;vec2 o=m*(z-.45)*k;gl_FragColor=texture2D(t,uv+o);}`;
  const p = glProg(gl, VS, FS); const U = n => gl.getUniformLocation(p, n);
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = cv.dataset.fxDepth;
  let ready = false, iw = 1, ih = 1;
  const mkTex = (src, unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };
  img.onload = () => { iw = img.naturalWidth; ih = img.naturalHeight; mkTex(img, 0);
    // depth from blurred luminance plus vertical gradient (lower = nearer)
    const W = 160, H = Math.round(160 * ih / iw), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.filter = 'blur(6px)'; x.drawImage(img, 0, 0, W, H); const D = x.getImageData(0, 0, W, H);
    for (let i = 0; i < W * H; i++) { const y = Math.floor(i / W) / H, L = (D.data[i * 4] * .3 + D.data[i * 4 + 1] * .59 + D.data[i * 4 + 2] * .11) / 255; const z = clamp(y * .75 + L * .25); D.data[i * 4] = D.data[i * 4 + 1] = D.data[i * 4 + 2] = z * 255; }
    x.filter = 'none'; x.putImageData(D, 0, 0); const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const x2 = c2.getContext('2d'); x2.filter = 'blur(8px)'; x2.drawImage(c, 0, 0);
    mkTex(c2, 1); gl.uniform1i(U('t'), 0); gl.uniform1i(U('d'), 1); ready = true; cv.classList.add('ready'); };
  let mx = 0, my = 0, cx = 0, cy = 0, vis = true, t0 = performance.now();
  if (FINE) addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  onScreen(cv, v => vis = v);
  const size = () => { const w = cv.clientWidth, h = cv.clientHeight; cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); gl.viewport(0, 0, cv.width, cv.height); };
  addEventListener('resize', size); size();
  const k = +(cv.dataset.k || .035);
  const loop = () => { requestAnimationFrame(loop); if (!ready || !vis) return; const t = (performance.now() - t0) / 1000;
    const dx = mx + Math.sin(t * .23) * .35, dy = my + Math.cos(t * .17) * .2; cx += (dx - cx) * .03; cy += (dy - cy) * .03;
    gl.uniform2f(U('m'), cx, -cy); gl.uniform2f(U('r'), cv.width, cv.height); gl.uniform2f(U('ir'), iw, ih); gl.uniform1f(U('k'), k); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  loop();
});

/* ---------- 20. mesh gradient shader: canvas[data-fx-mesh="#c1,#c2,#c3,#c4"] ---------- */
$$('canvas[data-fx-mesh]').forEach(cv => {
  const gl = cv.getContext('webgl', { antialias: false }); if (!gl) return;
  const cols = cv.dataset.fxMesh.split(',').map(h => { h = h.trim().replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); });
  const FS = `precision highp float;varying vec2 v;uniform float T;uniform vec2 R;uniform vec3 a,b,c,d;
  vec2 hash(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(dot(hash(i),f),dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)),dot(hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}
  void main(){vec2 uv=v;uv.x*=R.x/R.y;float t=T*.035;
  vec2 q=vec2(n(uv*1.3+t),n(uv*1.3-t+4.));vec2 w=uv+q*.6;
  float f1=smoothstep(-.5,.6,n(w*1.1+vec2(t*.7,0.)));float f2=smoothstep(-.4,.7,n(w*.9-vec2(0.,t*.5)+7.));
  vec3 col=mix(a,b,f1);col=mix(col,c,f2*.75);col=mix(col,d,smoothstep(.2,1.,v.y)*.35*(1.-f1));
  col+= (fract(sin(dot(v*R,vec2(12.9898,78.233)))*43758.5453)-.5)/255.*2.;
  gl_FragColor=vec4(col,1.);}`;
  const p = glProg(gl, VS, FS); const U = n => gl.getUniformLocation(p, n);
  ['a', 'b', 'c', 'd'].forEach((k, i) => gl.uniform3fv(U(k), cols[i % cols.length]));
  let vis = true; onScreen(cv, v => vis = v);
  const size = () => { const s = Math.min(DPR, 1.25); cv.width = Math.round(cv.clientWidth * s); cv.height = Math.round(cv.clientHeight * s); gl.viewport(0, 0, cv.width, cv.height); };
  addEventListener('resize', size); size(); const t0 = performance.now();
  const loop = () => { requestAnimationFrame(loop); if (!vis) return; gl.uniform1f(U('T'), (performance.now() - t0) / 1000); gl.uniform2f(U('R'), cv.width, cv.height); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  loop();
});

/* ---------- 21. particles assemble into a word: canvas[data-fx-particles="WORD"] ---------- */
$$('canvas[data-fx-particles]').forEach(cv => {
  const x = cv.getContext('2d'); let P = [], W = 0, H = 0, vis = false, form = 0, ftar = 0;
  const col = cv.dataset.color || '#d8c39a', font = cv.dataset.font || '500 120px serif';
  const build = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * DPR; cv.height = H * DPR; x.setTransform(DPR, 0, 0, DPR, 0, 0);
    const o = document.createElement('canvas'); o.width = W; o.height = H; const ox = o.getContext('2d');
    let fs = parseFloat(font.match(/(\d+)px/)[1]); const fam = font.replace(/^.*?\d+px\s*/, ''), wt = font.split(' ')[0];
    ox.font = `${wt} ${fs}px ${fam}`; const tw = ox.measureText(cv.dataset.fxParticles).width; fs = Math.min(fs * (W * .86) / tw, H * .7);
    ox.font = `${wt} ${fs}px ${fam}`; ox.textAlign = 'center'; ox.textBaseline = 'middle'; ox.fillStyle = '#fff'; ox.fillText(cv.dataset.fxParticles, W / 2, H / 2);
    const d = ox.getImageData(0, 0, W, H).data, step = W < 700 ? 4 : 5, pts = [];
    for (let yy = 0; yy < H; yy += step) for (let xx = 0; xx < W; xx += step) if (d[(yy * W + xx) * 4 + 3] > 140) pts.push([xx, yy]);
    P = pts.map(([tx, ty]) => ({ tx, ty, x: Math.random() * W, y: Math.random() * H, ox: Math.random() * W, oy: Math.random() * H, s: Math.random() * .9 + .5, ph: Math.random() * 6.28 })); };
  if (document.fonts) document.fonts.ready.then(build); else build();
  addEventListener('resize', build);
  onScreen(cv, v => vis = v);
  if (G) ST.create({ trigger: cv, start: 'top 75%', end: 'bottom 15%', onToggle: e => ftar = e.isActive ? 1 : 0 }); else ftar = 1;
  const loop = t => { requestAnimationFrame(loop); if (!vis) return; form += (ftar - form) * .018; x.clearRect(0, 0, W, H); x.fillStyle = col;
    const e = form * form * (3 - 2 * form);
    for (const p of P) { const dx = p.ox + Math.sin(t / 2600 + p.ph) * 30, dy = p.oy + Math.cos(t / 3100 + p.ph) * 30;
      p.x = dx + (p.tx - dx) * e; p.y = dy + (p.ty - dy) * e; x.globalAlpha = .35 + e * .6; x.fillRect(p.x, p.y, p.s * 1.6, p.s * 1.6); } };
  requestAnimationFrame(loop);
});

/* ---------- 22. architectural wireframe that solidifies: canvas[data-fx-wire] (needs three via importmap) ---------- */
$$('canvas[data-fx-wire]').forEach(async cv => {
  let THREE; try { THREE = await import('three'); } catch (e) { return; }
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); r.setPixelRatio(DPR);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 100); cam.position.set(9, 6.5, 11); cam.lookAt(0, .6, 0);
  const lineC = new THREE.Color(cv.dataset.color || '#cbb68e'), solidC = new THREE.Color(cv.dataset.solid || '#1a1a1a');
  const grp = new THREE.Group(); sc.add(grp);
  const boxes = JSON.parse(cv.dataset.fxWire || '[]');
  const lm = new THREE.LineBasicMaterial({ color: lineC, transparent: true, opacity: .9 });
  const sm = new THREE.MeshStandardMaterial({ color: solidC, roughness: .7, metalness: .05, transparent: true, opacity: 0 });
  sc.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1.2)); const dl = new THREE.DirectionalLight(0xfff2dd, 1.4); dl.position.set(5, 8, 4); sc.add(dl);
  boxes.forEach(([w, h, d, x, y, z]) => { const g = new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(g, sm); m.position.set(x, y + h / 2, z); grp.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), lm); e.position.copy(m.position); grp.add(e); });
  const gridH = new THREE.GridHelper(16, 32, lineC, lineC); gridH.material.transparent = true; gridH.material.opacity = .12; sc.add(gridH);
  let prog = 0, vis = false; onScreen(cv, v => vis = v);
  if (G) ST.create({ trigger: cv.closest('section') || cv, start: 'top 70%', end: 'bottom 30%', scrub: 1.5, onUpdate: s => prog = s.progress });
  const size = () => { const w = cv.clientWidth, h = cv.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  addEventListener('resize', size); size();
  const loop = t => { requestAnimationFrame(loop); if (!vis) return; grp.rotation.y = t / 9000 + prog * .8; const s = clamp((prog - .25) / .5); sm.opacity = s * .92; lm.opacity = .9 - s * .45; r.render(sc, cam); };
  requestAnimationFrame(loop);
});

/* ---------- 23. ripple water on pool image: canvas[data-fx-water="img"] data-mask="x0,y0,x1,y1" (uv rect) ---------- */
$$('canvas[data-fx-water]').forEach(cv => {
  const gl = cv.getContext('webgl'); if (!gl) return;
  const FS = `precision highp float;varying vec2 v;uniform sampler2D t;uniform float T;uniform vec2 r,ir;uniform vec4 M;
  void main(){vec2 s=r/ir;float sc=max(s.x,s.y);vec2 uv=(v-.5)*s/sc+.5;uv.y=1.-uv.y;
  float m=smoothstep(M.x,M.x+.03,uv.x)*smoothstep(M.z,M.z-.03,uv.x)*smoothstep(M.y,M.y+.03,uv.y)*smoothstep(M.w,M.w-.03,uv.y);
  vec2 o=vec2(sin(uv.y*90.+T*1.1)+sin((uv.x+uv.y)*60.-T*.8),cos(uv.x*70.-T*.9)+sin(uv.y*50.+T*.6))*.0012*m;
  vec4 c=texture2D(t,uv+o);c.rgb+=m*.035*sin(uv.x*120.+uv.y*80.+T*1.3);gl_FragColor=c;}`;
  const p = glProg(gl, VS, FS); const U = n => gl.getUniformLocation(p, n);
  const M = (cv.dataset.mask || '0,0.6,1,1').split(',').map(Number); gl.uniform4f(U('M'), ...M);
  const img = new Image(); img.src = cv.dataset.fxWater; let ready = false, iw = 1, ih = 1;
  img.onload = () => { iw = img.naturalWidth; ih = img.naturalHeight; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); ready = true; cv.classList.add('ready'); };
  let vis = true; onScreen(cv, v => vis = v);
  const size = () => { cv.width = Math.round(cv.clientWidth * DPR); cv.height = Math.round(cv.clientHeight * DPR); gl.viewport(0, 0, cv.width, cv.height); };
  addEventListener('resize', size); size(); const t0 = performance.now();
  const loop = () => { requestAnimationFrame(loop); if (!ready || !vis) return; gl.uniform1f(U('T'), (performance.now() - t0) / 1000); gl.uniform2f(U('r'), cv.width, cv.height); gl.uniform2f(U('ir'), iw, ih); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  loop();
});

addEventListener('load', () => ST && setTimeout(() => ST.refresh(), 400));
})();
