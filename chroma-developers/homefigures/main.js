(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const WA = '971509729558';
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const wide = () => innerWidth > 1000;
const hasG = !!window.gsap;
if (hasG && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
const CATS = window.CATS || [], PIECES = window.PIECES || [];
const catOf = k => CATS.find(c => c.k === k) || {};
const pad = n => String(n).padStart(2, '0');

/* ---------- smooth scroll ---------- */
let lenis = null;
if (fine && window.Lenis && hasG) {
  lenis = new Lenis({ duration: 1.25, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
}
const scrollToEl = el => { if (!el) return; if (lenis) lenis.scrollTo(el, { duration: 1.8 }); else el.scrollIntoView({ behavior: 'smooth' }); };
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'); if (id.length < 2) { e.preventDefault(); return; }
  const el = $(id); if (!el) return; e.preventDefault();
  document.body.classList.remove('menu-open');
  if (a.dataset.cat) setFilter(a.dataset.cat);
  scrollToEl(el);
});
$('#burger').addEventListener('click', () => document.body.classList.toggle('menu-open'));
$('#yr').textContent = new Date().getFullYear();

/* ---------- text splitting ---------- */
function splitWords(el, cls = 'wi') {
  let i = 0;
  const walk = (node, it) => {
    const out = document.createDocumentFragment();
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { out.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement(it ? 'em' : 'span'); s.className = cls; s.textContent = tok; s.style.transitionDelay = (i++ * .08) + 's';
          w.appendChild(s); out.appendChild(w);
        });
      } else out.appendChild(walk(n, n.tagName === 'EM'));
    });
    return out;
  };
  const f = walk(el, false); el.textContent = ''; el.appendChild(f);
}
$$('[data-split]').forEach(el => splitWords(el));

/* ---------- reveals ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08, rootMargin: '0px 0px -5% 0px' });
const watch = els => els.forEach(el => io.observe(el));
watch($$('[data-r],[data-split]'));
/* fully clipped elements never report as intersecting, so watch their parent */
$$('[data-clip]').forEach(el => { const o = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { el.classList.add('in'); o.disconnect(); } }, { threshold: .15 }); o.observe(el.parentElement); });

/* ---------- tiny WebGL helper ---------- */
const NOISE = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*ns(p);p=p*2.03+11.;a*=.5;}return s;}
vec2 cov(vec2 uv,float ia,float fy,float z){float ca=res.x/res.y;vec2 s=ca>ia?vec2(1.,ia/ca):vec2(ca/ia,1.);vec2 o=vec2(0.,(.5-fy)*(1.-s.y));s/=(1.+z);return (uv-.5)*s+.5+o;}`;
function makeGL(canvas, frag) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram();
  try {
    gl.attachShader(p, sh(gl.VERTEX_SHADER, 'attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}'));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, 'precision highp float;varying vec2 v;uniform vec2 res;' + NOISE + frag));
  } catch (e) { return null; }
  gl.linkProgram(p); gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const U = {}; const u = n => U[n] || (U[n] = gl.getUniformLocation(p, n));
  const tex = img => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const size = () => { const d = Math.min(devicePixelRatio || 1, 2), w = Math.round(canvas.clientWidth * d), hh = Math.round(canvas.clientHeight * d);
    if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; } gl.viewport(0, 0, w, hh); gl.uniform2f(u('res'), w, hh); };
  const bind = (unit, t, name) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u(name), unit); };
  return { gl, u, tex, size, bind, draw: () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4) };
}
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

/* ---------- HERO: liquid dissolve between real pieces ---------- */
const SLIDES = [
  { id: 'tab1', t: 'Stainless Steel Splash', c: 'Tables', n: 'Brushed stainless steel', fy: .64 },
  { id: 'sea2', t: 'Stacked Leather Sofa', c: 'Seating', n: 'Upholstered in leather', fy: .66 },
  { id: 'tab2', t: '3 Balls Coffee Table', c: 'Tables', n: 'Travertine top', fy: .66 },
  { id: 'sea4', t: 'Intersect Armchair', c: 'Seating', n: 'Made to your size', fy: .68 },
  { id: 'tab4', t: 'Organic Dining Table', c: 'Tables', n: 'Plaster finish', fy: .62 }
];
const hero = (() => {
  const cv = $('#heroGL'), still = $('#heroStill'), title = $('#heroTitle'), meta = $('.hero-meta'), ticks = $('#heroTicks');
  const HOLD = 7, DUR = 2.2;
  let G = null, cur = 0, nxt = 0, P = { v: 0 }, busy = false, vis = true, tickTw = null, started = false;
  const imgs = [], texs = [], zt = SLIDES.map(() => 0);
  SLIDES.forEach((s, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', s.t); b.innerHTML = '<i></i>'; b.addEventListener('click', () => go(i)); ticks.appendChild(b); });
  const setTitle = (s, first) => {
    const put = () => { title.classList.remove('show', 'out'); title.textContent = s.t; splitWords(title); void title.offsetWidth; title.classList.add('show');
      $('#heroCat').textContent = s.c; $('#heroNote').textContent = s.n; meta.classList.remove('out'); };
    if (first) return put();
    title.classList.add('out'); meta.classList.add('out'); setTimeout(put, 1050);
  };
  const FR = `uniform sampler2D ta,tb;uniform float ra,rb,p,za,zb,t,fa,fb;uniform vec2 ms;
  void main(){vec2 uv=v+ms*.006;float n=fbm(uv*vec2(2.,2.8)+t*.015);float n2=fbm(uv*2.6+9.+t*.01);
  float e=uv.x*.4+n*.6;float q=p*1.4-.2;float m=smoothstep(q-.22,q+.22,e);
  vec2 d=(vec2(n,n2)-.5)*vec2(.26,.14);
  vec3 a=texture2D(ta,cov(uv+d*p,ra,fa,za)).rgb;vec3 b=texture2D(tb,cov(uv-d*(1.-p),rb,fb,zb)).rgb;
  vec3 c=mix(b,a,m);float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,.84);c*=.7;
  c*=mix(.62,1.,smoothstep(1.05,.25,length((v-.5)*vec2(1.05,1.))));
  gl_FragColor=vec4(c,1.);}`;
  const frame = now => {
    requestAnimationFrame(frame); if (!G || !vis || document.hidden || !texs[cur]) return;
    const t = now / 1000; G.size(); const gl = G.gl;
    G.bind(0, texs[cur], 'ta'); G.bind(1, texs[nxt] || texs[cur], 'tb');
    gl.uniform1f(G.u('ra'), imgs[cur].width / imgs[cur].height); gl.uniform1f(G.u('rb'), (imgs[nxt] || imgs[cur]).width / (imgs[nxt] || imgs[cur]).height);
    gl.uniform1f(G.u('fa'), SLIDES[cur].fy); gl.uniform1f(G.u('fb'), SLIDES[nxt].fy);
    gl.uniform1f(G.u('za'), Math.min((t - zt[cur]) * .006, .12)); gl.uniform1f(G.u('zb'), Math.min((t - zt[nxt]) * .006, .12));
    gl.uniform1f(G.u('p'), P.v); gl.uniform1f(G.u('t'), t); gl.uniform2f(G.u('ms'), mx, my); G.draw();
  };
  let mx = 0, my = 0, tx = 0, ty = 0;
  if (fine) { addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = .5 - e.clientY / innerHeight; });
    (function l() { mx += (tx - mx) * .03; my += (ty - my) * .03; requestAnimationFrame(l); })(); }
  const runTick = () => {
    $$('button i', ticks).forEach((el, i) => { if (i !== cur) el.style.transform = 'scaleX(0)'; });
    if (!hasG) return; if (tickTw) tickTw.kill();
    tickTw = gsap.fromTo($$('button i', ticks)[cur], { scaleX: 0 }, { scaleX: 1, duration: HOLD, ease: 'none', onComplete: () => go((cur + 1) % SLIDES.length) });
    if (!vis) tickTw.pause();
  };
  function go(i) {
    if (busy || i === cur || !started) return;
    if (!imgs[i]) { setTimeout(() => go(i), 400); return; }
    busy = true; nxt = i; zt[i] = performance.now() / 1000; if (tickTw) tickTw.kill();
    $('#heroN').textContent = pad(i + 1); setTitle(SLIDES[i]);
    const done = () => { cur = nxt; P.v = 0; busy = false; runTick(); };
    if (G && hasG) gsap.to(P, { v: 1, duration: DUR, ease: 'power2.inOut', onComplete: done });
    else { still.style.opacity = 0; setTimeout(() => { still.src = imgs[i].src; still.style.opacity = 1; done(); }, 1500); }
  }
  new IntersectionObserver(e => { vis = e[0].isIntersecting; if (tickTw) vis ? tickTw.resume() : tickTw.pause(); }).observe($('#hero'));
  $('#heroNext').addEventListener('click', () => go((cur + 1) % SLIDES.length));
  $('#heroPrev').addEventListener('click', () => go((cur + SLIDES.length - 1) % SLIDES.length));
  let sx = 0; const h = $('#hero');
  h.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  h.addEventListener('touchend', e => { const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 60) go((cur + (d < 0 ? 1 : SLIDES.length - 1)) % SLIDES.length); }, { passive: true });
  const first = loadImg('img/' + SLIDES[0].id + '.webp').then(im => {
    imgs[0] = im;
    try { G = makeGL(cv, FR); } catch (e) { G = null; }
    if (G) { texs[0] = G.tex(im); zt[0] = performance.now() / 1000; cv.classList.add('on'); requestAnimationFrame(frame); }
    SLIDES.slice(1).reduce((pr, s, k) => pr.then(() => loadImg('img/' + s.id + '.webp')).then(m => { imgs[k + 1] = m; if (G) texs[k + 1] = G.tex(m); }).catch(() => {}), Promise.resolve());
  }).catch(() => {});
  return { first, start: () => { started = true; setTitle(SLIDES[0], true); runTick(); } };
})();

/* ---------- loader ---------- */
(() => {
  const bar = $('#loaderBar'); let done = false;
  requestAnimationFrame(() => bar.style.transform = 'scaleX(.6)');
  const fin = () => { if (done) return; done = true; bar.style.transform = 'scaleX(1)';
    setTimeout(() => { $('#loader').classList.add('done'); document.body.classList.remove('loading'); hero.start(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 700); };
  Promise.all([hero.first, document.fonts ? document.fonts.ready : 0]).then(fin); setTimeout(fin, 3500);
})();

/* ---------- nav + whatsapp state ---------- */
const onScroll = () => { const y = scrollY; $('#nav').classList.toggle('solid', y > 60); document.body.classList.toggle('past-hero', y > innerHeight * .7); };
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---------- statement fill ---------- */
(() => {
  const el = $('#fill'); splitWords(el, 'fw'); const ws = $$('.fw', el); ws.forEach(w => w.style.transitionDelay = '');
  if (hasG && window.ScrollTrigger) gsap.to(ws, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 55%', scrub: .6 } });
  else ws.forEach(w => w.style.opacity = 1);
})();

/* ---------- collections: pinned horizontal gallery ---------- */
(() => {
  const track = $('#collTrack'); const pick = { seat: 'sea5', tables: 'tab3', cabinets: 'cab5', mirrors: 'mir2', beds: 'bed3' };
  track.innerHTML = CATS.map((c, i) => { const n = PIECES.filter(p => p.c === c.k).length;
    return `<article class="cpanel"><a class="cpanel-img" href="#pieces" data-cat="${c.k}"><img src="img/${pick[c.k]}.webp" alt="${c.t} by Home Figures" loading="lazy"></a>
    <div><span class="cpanel-n">${pad(i + 1)} / ${pad(CATS.length)}</span><h3>${c.t.replace('&', '&amp;')}</h3><p>${c.d}</p><ul>${c.l.map(x => `<li>${x}</li>`).join('')}</ul><a class="tlink" href="#pieces" data-cat="${c.k}">View ${n} pieces</a></div></article>`; }).join('');
  if (!(hasG && window.ScrollTrigger)) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width:1001px)', () => {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth); const im = $$('.cpanel-img img', track), bar = $('#collBar');
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.coll', pin: '.coll-pin', start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true,
      onUpdate: s => { bar.style.transform = `scaleX(${s.progress})`; const x = (s.progress - .5) * 12; im.forEach(i => i.style.transform = `translateX(${-x}%)`); } } });
    return () => { track.style.transform = ''; im.forEach(i => i.style.transform = ''); };
  });
})();

/* ---------- pieces grid + filters ---------- */
let filter = 'all', showAll = false;
const grid = $('#grid'), filters = $('#filters'), more = $('#more');
function renderGrid() {
  let list = filter === 'all' ? PIECES.slice() : PIECES.filter(p => p.c === filter);
  if (filter === 'all') { // interleave categories so the first rows show the range
    const by = CATS.map(c => PIECES.filter(p => p.c === c.k)); list = [];
    for (let i = 0; i < 9; i++) by.forEach(b => { if (b[i]) list.push(b[i]); });
    if (!showAll) list = list.slice(0, wide() ? 12 : 8);
  }
  grid.innerHTML = list.map(p => `<button class="tile" data-id="${p.id}" aria-label="${p.t}"><div class="tile-ph"><img src="t/${p.id}.webp" alt="${p.t}" loading="lazy"></div><div class="tile-cap"><b>${p.t}</b><span>${catOf(p.c).s}</span></div></button>`).join('');
  $$('.tile', grid).forEach((t, i) => { t.style.transitionDelay = (i % 4) * .09 + 's'; });
  watch($$('.tile', grid));
  more.style.display = filter === 'all' && !showAll ? '' : 'none'; more.textContent = `View all ${PIECES.length} pieces`;
  $$('button', filters).forEach(b => b.classList.toggle('on', b.dataset.k === filter));
  if (window.ScrollTrigger) ScrollTrigger.refresh();
}
function setFilter(k) { filter = k; renderGrid(); }
filters.innerHTML = `<button data-k="all">All<sup>${PIECES.length}</sup></button>` + CATS.map(c => `<button data-k="${c.k}">${c.t.replace('&', '&amp;')}<sup>${PIECES.filter(p => p.c === c.k).length}</sup></button>`).join('');
filters.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setFilter(b.dataset.k); });
more.addEventListener('click', () => { showAll = true; renderGrid(); });
grid.addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) openPiece(t.dataset.id); });
renderGrid();

/* ---------- grid hover: WebGL liquid ripple (desktop only) ---------- */
(() => {
  if (!fine || !wide()) return;
  const cv = document.createElement('canvas'); let G = null;
  const FR = `uniform sampler2D ta;uniform float ra,s,t;uniform vec2 ms;
  void main(){vec2 uv=v;float d=distance(uv*vec2(res.x/res.y,1.),ms*vec2(res.x/res.y,1.));float f=smoothstep(.55,0.,d)*s;
  vec2 dir=normalize(uv-ms+1e-4);uv+=dir*sin(d*22.-t*2.2)*.014*f;uv+=(vec2(fbm(uv*4.+t*.12),fbm(uv*4.+5.-t*.1))-.5)*.035*f;
  vec3 c=texture2D(ta,cov(uv,ra,.5,.04*s)).rgb;gl_FragColor=vec4(c,1.);}`;
  const cache = {}; let tile = null, s = { v: 0 }, m = [.5, .5], tm = [.5, .5], raf = 0, img = null;
  const loop = now => { if (!tile) { raf = 0; return; } raf = requestAnimationFrame(loop);
    m[0] += (tm[0] - m[0]) * .08; m[1] += (tm[1] - m[1]) * .08; G.size(); const gl = G.gl; G.bind(0, cache[img.src], 'ta');
    gl.uniform1f(G.u('ra'), img.naturalWidth / img.naturalHeight); gl.uniform1f(G.u('s'), s.v); gl.uniform1f(G.u('t'), now / 1000); gl.uniform2f(G.u('ms'), m[0], m[1]); G.draw(); };
  grid.addEventListener('pointerover', e => {
    const t = e.target.closest('.tile-ph'); if (!t || t === tile) return;
    const im = $('img', t); if (!im.complete || !im.naturalWidth) return;
    if (!G) { try { G = makeGL(cv, FR); } catch (x) { } if (!G) return; }
    tile = t; img = im; if (!cache[im.src]) cache[im.src] = G.tex(im);
    t.appendChild(cv); gsap.killTweensOf(s); s.v = 0; gsap.to(s, { v: 1, duration: 1.4, ease: 'power2.out' }); if (!raf) raf = requestAnimationFrame(loop);
  });
  grid.addEventListener('pointermove', e => { if (!tile) return; const r = tile.getBoundingClientRect(); tm = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; });
  grid.addEventListener('pointerout', e => { if (!tile || tile.contains(e.relatedTarget)) return; const t = tile;
    gsap.to(s, { v: 0, duration: 1.1, ease: 'power2.out', onComplete: () => { if (tile === t) { tile = null; cv.remove(); } } }); });
})();

/* ---------- materials ---------- */
(() => {
  const M = [
    { n: 'Plaster', img: 'cab7', pos: '8% 62%', size: '230%', on: 'Archy Console' },
    { n: 'Stainless steel', img: 'tab1', pos: '80% 92%', size: '230%', on: 'Stainless Steel Splash' },
    { n: 'Travertine', img: 'tab2', pos: '28% 70%', size: '250%', on: '3 Balls Coffee Table' },
    { n: 'Oak', img: 'cab6', pos: '88% 78%', size: '240%', on: 'Grid Oak Console' },
    { n: 'Leather', img: 'sea2', pos: '42% 90%', size: '240%', on: 'Stacked Leather Sofa' },
    { n: 'Cane', img: 'cab4', pos: '22% 60%', size: '260%', on: 'Cane Cabinet' }
  ];
  const list = $('#matList'), frame = $('#matFrame'); let cur = -1;
  list.innerHTML = M.map((m, i) => `<li data-i="${i}" tabindex="0"><span>${pad(i + 1)}</span><b>${m.n}</b><i>${m.on}</i></li>`).join('');
  frame.innerHTML = M.map(m => `<div class="mat-layer" role="img" aria-label="${m.n} close up, ${m.on}" style="background-image:url(img/${m.img}.webp);background-size:${m.size};background-position:${m.pos}"></div>`).join('');
  const L = $$('.mat-layer', frame), I = $$('li', list);
  const set = i => { if (i === cur) return; L.forEach((l, k) => { l.classList.toggle('was', k === cur); l.classList.remove('on'); });
    void frame.offsetWidth; L[i].classList.remove('was'); L[i].classList.add('on'); I.forEach((li, k) => li.classList.toggle('on', k === i)); cur = i; };
  I.forEach(li => { const i = +li.dataset.i; li.addEventListener(fine ? 'pointerenter' : 'click', () => set(i)); li.addEventListener('focus', () => set(i)); li.addEventListener('click', () => set(i)); });
  set(0);
})();

/* ---------- bespoke rows: floating image ---------- */
(() => {
  const f = $('#svcFloat'); if (!fine) return; const im = $('img', f); let x = 0, y = 0, tx = 0, ty = 0, on = false;
  $$('.svc-row').forEach(r => { r.addEventListener('pointerenter', () => { im.src = r.dataset.img; f.classList.add('on'); if (!on) { on = true; loop(); } });
    r.addEventListener('pointerleave', () => f.classList.remove('on')); });
  addEventListener('pointermove', e => { tx = e.clientX + 30; ty = e.clientY - 150; });
  function loop() { x += (tx - x) * .09; y += (ty - y) * .09; f.style.transform = `translate(${Math.min(x, innerWidth - 270)}px,${y}px)`; requestAnimationFrame(loop); }
})();

/* ---------- process line ---------- */
if (hasG && window.ScrollTrigger) gsap.to('#stepsBar', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 80%', end: 'top 30%', scrub: 1 } });

/* ---------- piece overlay ---------- */
const modal = $('#modal');
function openPiece(id) {
  const p = PIECES.find(x => x.id === id); if (!p) return; const c = catOf(p.c);
  $('#mImg').src = 'img/' + p.id + '.webp'; $('#mImg').alt = p.t; $('#mCat').textContent = c.s; $('#mTitle').textContent = p.t; $('#mDesc').textContent = c.d;
  $('#mList').innerHTML = ['Made to order in our UAE workshop', 'Your size, material and colour', 'Two to five weeks, delivered and assembled'].map(x => `<li>${x}</li>`).join('');
  $('#mWa').href = `https://wa.me/${WA}?text=` + encodeURIComponent(`Hello Home Figures, I would like to enquire about the ${p.t}.`);
  modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('lock'); if (lenis) lenis.stop();
}
const closePiece = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('lock'); if (lenis) lenis.start(); };
$('#modalX').addEventListener('click', closePiece);
addEventListener('keydown', e => { if (e.key === 'Escape') closePiece(); });

/* ---------- enquiry form ---------- */
$('#cform').addEventListener('submit', e => { e.preventDefault(); const d = new FormData(e.target);
  const msg = `Hello Home Figures, my name is ${d.get('n')}.\nI am interested in: ${d.get('t')}.\n${d.get('m') || ''}`;
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'); });

/* ---------- cursor ---------- */
if (fine) { const c = $('#cursor'), ring = $('.c-ring', c), dot = $('.c-dot', c); let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; c.classList.toggle('on', !!e.target.closest('a,button,summary,.mat-list li')); });
  (function l() { rx += (x - rx) * .14; ry += (y - ry) * .14; dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(l); })(); }

addEventListener('load', () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
})();
