import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
let VW = innerWidth, VH = innerHeight;
const DESK = () => VW > 900;
const P = window.PROJECTS;
const BYSLUG = Object.fromEntries(P.map(p => [p.slug, p]));
const pad2 = n => String(n).padStart(2, '0');
const imgName = (p, k = 1) => `${p.slug}-${pad2(Math.min(k, p.n))}`;
if (FINE) document.documentElement.classList.add('fine');
$('#yr').textContent = new Date().getFullYear();
let paused = false; // true while a project page is open

/* ---------------- smooth scroll ---------------- */
const lenis = new Lenis({ lerp: 0.09 });
let SY = 0;
lenis.on('scroll', l => { SY = l.scroll; ScrollTrigger.update(); });
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
addEventListener('resize', () => { VW = innerWidth; VH = innerHeight; });
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a || a.dataset.open) return;
  const id = a.getAttribute('href'); e.preventDefault(); closeMenu();
  if (id === '#top' || id === '#') return lenis.scrollTo(0, { duration: 1.8 });
  const t = $(id); if (t) lenis.scrollTo(t, { duration: 1.8, offset: id === '#contact' ? 0 : -10 });
});

/* ---------------- split text ---------------- */
function splitEl(el, cls = 'w') {
  const out = document.createDocumentFragment();
  [...el.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      n.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span'); w.className = cls;
        if (cls === 'w') { const i = document.createElement('span'); i.textContent = part; w.appendChild(i); } else w.textContent = part;
        out.appendChild(w);
      });
    } else if (n.nodeName === 'BR') out.appendChild(n.cloneNode());
    else { const c = n.cloneNode(false); splitEl(n, cls); [...n.childNodes].forEach(k => c.appendChild(k)); out.appendChild(c); }
  });
  el.innerHTML = ''; el.appendChild(out);
}
$$('.split').forEach(el => splitEl(el));
$$('.scrub-text').forEach(el => splitEl(el, 'sw'));
gsap.set('.split .w>span', { yPercent: 110 });
gsap.set('.loader-word span', { yPercent: 110 });

/* ---------------- cursor ---------------- */
const cur = $('#cursor'), dot = $('.c-dot'), ring = $('.c-ring'), lab = $('#cLabel');
const mouse = { x: VW / 2, y: VH / 2, moved: false }, rp = { x: mouse.x, y: mouse.y };
addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = true; }, { passive: true });
if (FINE) {
  gsap.ticker.add(() => {
    rp.x += (mouse.x - rp.x) * .22; rp.y += (mouse.y - rp.y) * .22;
    dot.style.transform = `translate3d(${mouse.x}px,${mouse.y}px,0)`;
    ring.style.transform = `translate3d(${rp.x}px,${rp.y}px,0)`;
  });
  document.addEventListener('pointerover', e => setCursor(e.target));
}
let curLabel = '';
function setCursor(el, forced) {
  if (!FINE) return;
  const t = el && el.closest && el.closest('[data-cursor],a,button,select,input,.wcard');
  cur.classList.toggle('hover', !!t || !!forced);
  const l = forced || (t && (t.getAttribute('data-cursor') || (t.classList.contains('wcard') ? 'View' : ''))) || '';
  if (l !== curLabel) { curLabel = l; lab.textContent = l; }
  cur.classList.toggle('label', !!l);
  cur.classList.toggle('inv', !!(el && el.closest && el.closest('.process,.contact,.sig,.window,.tunnel,.m-hero')));
}

/* ---------------- textures ---------------- */
const TL = new THREE.TextureLoader(), cache = {};
function tex(url) {
  return cache[url] || (cache[url] = new Promise(res => TL.load(url, t => {
    t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    t.userData.size = new THREE.Vector2(t.image.width, t.image.height); res(t);
  }, undefined, () => res(null))));
}
const GLSL = `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
vec2 cover(vec2 uv,vec2 r,vec2 i){float rs=r.x/r.y,is=i.x/i.y;vec2 n=rs<is?vec2(i.x*r.y/i.y,r.y):vec2(r.x,i.y*r.x/i.x);
 vec2 o=(rs<is?vec2((n.x-r.x)/2.,0.):vec2(0.,(n.y-r.y)/2.))/n;return uv*r/n+o;}`;
const onScreen = (el, cb, margin = '0px') => new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: margin }).observe(el);

/* =================================================================
   HERO: 3D RING OF PROJECTS
   ================================================================= */
const RING = window.RING.map(([s, k]) => ({ p: BYSLUG[s], img: `t/${imgName(BYSLUG[s], k)}.webp` }));
const rc = $('#ring');
const rr = new THREE.WebGLRenderer({ canvas: rc, antialias: true, alpha: true, powerPreference: 'high-performance' });
rr.setClearColor(0x000000, 0);
rr.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const rScene = new THREE.Scene();
const rCam = new THREE.PerspectiveCamera(34, 1, .1, 100);
const group = new THREE.Group(); rScene.add(group);
const N = RING.length, PW = 1.5, PH = 1.95, GAP = .24, R = N * (PW + GAP) / (Math.PI * 2);
const intro = { v: 0 };
const bgCol = () => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0a0a';
const panels = RING.map((it, i) => {
  const g = new THREE.PlaneGeometry(PW, PH, 40, 1);
  const pos = g.attributes.position;
  for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), a = x / R; pos.setX(k, Math.sin(a) * R); pos.setZ(k, Math.cos(a) * R - R); }
  g.computeVertexNormals();
  const u = { tex: { value: null }, isz: { value: new THREE.Vector2(1, 1) }, psz: { value: new THREE.Vector2(PW, PH) }, hov: { value: 0 }, inn: { value: 0 }, bg: { value: new THREE.Color(bgCol()) } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, side: THREE.DoubleSide,
    vertexShader: `uniform float hov,inn;varying vec2 vUv;varying float vF;void main(){vUv=uv;vec3 p=position+normal*hov*.14;
      p.y+=(1.-inn)*-.6;vec4 mv=modelViewMatrix*vec4(p,1.);vF=normalize(normalMatrix*normal).z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: GLSL + `precision highp float;uniform sampler2D tex;uniform vec2 isz,psz;uniform float hov,inn;uniform vec3 bg;varying vec2 vUv;varying float vF;
      void main(){vec2 uv=cover(vUv,psz,isz);uv=(uv-.5)*(1.-.06*hov)+.5;vec3 c=texture2D(tex,uv).rgb;
        float f=gl_FrontFacing?smoothstep(-.15,.75,vF):0.;
        c=mix(bg,c,gl_FrontFacing?mix(.22,1.,f):.1);
        c=mix(c,c*1.05,hov);
        vec2 q=abs((vUv-.5)*psz)-psz*.5;float d=max(q.x,q.y);float a=1.-smoothstep(-.004,.0,d);
        float edge=smoothstep(-.012,-.006,d)*(1.-smoothstep(-.006,-.002,d))*hov;c=mix(c,vec3(.83,.71,.5),edge*.9);
        gl_FragColor=vec4(c,a*inn*step(1.-inn*1.15,vUv.y+.15));}`
  });
  const mesh = new THREE.Mesh(g, m);
  const th = i / N * Math.PI * 2;
  mesh.rotation.y = th; mesh.position.set(Math.sin(th) * R, 0, Math.cos(th) * R);
  mesh.userData = { p: it.p, u, th };
  group.add(mesh);
  tex(it.img).then(t => { if (t) { u.tex.value = t; u.isz.value.copy(t.userData.size); } });
  return mesh;
});
let heroH = 1;
function rSize() {
  const w = rc.clientWidth, h = rc.clientHeight; heroH = h; rr.setSize(w, h, false); rCam.aspect = w / h;
  rCam.fov = w < 700 ? 50 : 34; rCam.updateProjectionMatrix();
}
rSize(); addEventListener('resize', rSize);
const rot = { a: 0, t: 0, v: 0 }, tilt = { x: 0, y: 0 };
let rayTick = 0, overCanvas = false, dragging = false, dragX = 0, dragMoved = 0, heroOn = true, heroP = 0, hovered = null;
rc.addEventListener('pointerenter', () => overCanvas = true);
rc.addEventListener('pointerleave', () => { overCanvas = false; setHover(null); });
rc.addEventListener('pointerdown', e => { dragging = true; dragX = e.clientX; dragMoved = 0; rc.setPointerCapture(e.pointerId); });
rc.addEventListener('pointermove', e => { if (dragging) { const dx = e.clientX - dragX; dragX = e.clientX; dragMoved += Math.abs(dx); rot.t -= dx * .0042; rot.v = -dx * .0042; } });
rc.addEventListener('pointerup', () => { dragging = false; if (FINE && dragMoved < 6 && hovered) openProject(hovered.userData.p.slug); });
rc.addEventListener('pointercancel', () => dragging = false);
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
// canvas sits at the very top of the document: derive local coords from scroll, never from layout reads
const setNdc = (cx, cy) => ndc.set(cx / VW * 2 - 1, -((cy + SY) / heroH) * 2 + 1);
function setHover(m) {
  if (m === hovered) return;
  if (hovered) gsap.to(hovered.userData.u.hov, { value: 0, duration: .7, ease: 'power3.out' });
  hovered = m;
  if (m) { gsap.to(m.userData.u.hov, { value: 1, duration: .7, ease: 'power3.out' }); showLabel(m.userData.p); }
  if (FINE) setCursor(rc, m ? 'Open' : null);
}
let labelP = null, labelT = 0;
const rlEl = $('#ringLabel'), rlName = $('#rlName'), rlMeta = $('#rlMeta');
function showLabel(p) {
  if (p === labelP) return; labelP = p; rlEl.classList.add('swap'); clearTimeout(labelT);
  labelT = setTimeout(() => { rlName.textContent = p.t; rlMeta.textContent = p.m; rlEl.classList.remove('swap'); }, 280);
}
function frontPanel() {
  let best = null, bd = 9;
  for (const pm of panels) { const d = ((pm.userData.th - rot.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; if (Math.abs(d) < bd) { bd = Math.abs(d); best = pm; } }
  return best;
}
ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', onToggle: s => heroOn = s.isActive, onUpdate: s => heroP = s.progress });
gsap.ticker.add(() => {
  if (!heroOn || paused) return;
  const v = lenis.velocity || 0;
  if (!dragging) { rot.t += .0017 + v * .0006 + rot.v; rot.v *= .94; }
  rot.a += (rot.t - rot.a) * .07;
  group.rotation.y = -rot.a;
  const mx = mouse.x / VW - .5, my = mouse.y / VH - .5;
  tilt.x += ((FINE ? my * .08 : 0) - tilt.x) * .05; tilt.y += ((FINE ? mx * .06 : 0) - tilt.y) * .05;
  group.rotation.x = .1 + tilt.x + heroP * .5; group.rotation.z = -.04 + tilt.y * .4;
  group.position.y = (DESK() ? -1.22 : -.15) + heroP * 1.6;
  rCam.position.set(0, .2, (VW < 700 ? 14.2 : 11.4) + heroP * 3);
  rCam.lookAt(0, -.2, 0);
  for (const pm of panels) pm.userData.u.inn.value = gsap.utils.clamp(0, 1, intro.v * 1.6 - (pm.userData.th / (Math.PI * 2)) * .6);
  if (FINE && overCanvas && !dragging && (++rayTick % 3 === 0)) {
    setNdc(mouse.x, mouse.y); ray.setFromCamera(ndc, rCam);
    const hit = ray.intersectObjects(panels, false).find(h => h.point.z > 0);
    setHover(hit ? hit.object : null);
  }
  if (!hovered) { const f = frontPanel(); if (f) showLabel(f.userData.p); }
  rr.render(rScene, rCam);
});
/* tap to open on touch screens */
if (!FINE) rc.addEventListener('click', e => {
  if (dragMoved > 6) return;
  setNdc(e.clientX, e.clientY); ray.setFromCamera(ndc, rCam);
  const hit = ray.intersectObjects(panels, false).find(h => h.point.z > -1);
  if (hit) openProject(hit.object.userData.p.slug);
});

/* =================================================================
   WORK GRID
   ================================================================= */
const CATS = { all: 'All', dubai: 'Dubai', international: 'International', london: 'London', counties: 'Home Counties' };
const wg = $('#wgrid');
P.forEach((p, i) => {
  const a = document.createElement('a'); a.href = '#'; a.className = 'wcard'; a.dataset.open = p.slug; a.dataset.cat = p.cat;
  a.innerHTML = `<figure data-img="${imgName(p, p.cover || 1)}"><img loading="lazy" src="m/${imgName(p, p.cover || 1)}.webp" alt="${p.t}, ${p.m}"></figure>
    <div class="wcap"><h3><span class="wn">${pad2(i + 1)}</span>${p.t}</h3><span>${p.m}</span></div><p class="wsum">${p.s}</p>`;
  wg.appendChild(a);
});
const fl = $('#filters');
const usedCats = new Set(P.map(p => p.cat));
Object.entries(CATS).filter(([k]) => k === 'all' || usedCats.has(k)).forEach(([k, v]) => { const b = document.createElement('button'); b.textContent = v; b.dataset.c = k; if (k === 'all') b.className = 'on'; fl.appendChild(b); });
fl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', fl).forEach(x => x.classList.toggle('on', x === b));
  const c = b.dataset.c, cards = $$('.wcard', wg);
  gsap.to(cards, { opacity: 0, y: 20, duration: .35, ease: 'power2.in', onComplete: () => {
    cards.forEach(el => el.classList.toggle('gone', c !== 'all' && el.dataset.cat !== c));
    ScrollTrigger.refresh();
    gsap.fromTo(cards.filter(el => !el.classList.contains('gone')), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .9, stagger: .06, ease: 'power3.out' });
  } });
});

/* ---------- WebGL gallery synced to the grid (desktop) ---------- */
let galItems = [];
if (FINE && DESK()) {
  const gc = $('#gal');
  const gr = new THREE.WebGLRenderer({ canvas: gc, alpha: true, antialias: true });
  gr.setClearColor(0x000000, 0); gr.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  let workOn = false; onScreen($('#wgrid'), v => workOn = v, '200px');
  const gs = new THREE.Scene();
  const gcam = new THREE.OrthographicCamera(-VW / 2, VW / 2, VH / 2, -VH / 2, -10, 10);
  const gsize = () => { gr.setSize(VW, VH); Object.assign(gcam, { left: -VW / 2, right: VW / 2, top: VH / 2, bottom: -VH / 2 }); gcam.updateProjectionMatrix(); };
  gsize(); addEventListener('resize', gsize);
  const geo = new THREE.PlaneGeometry(1, 1, 24, 24);
  galItems = $$('.wcard figure', wg).map(fig => {
    const u = { tex: { value: null }, isz: { value: new THREE.Vector2(1, 1) }, psz: { value: new THREE.Vector2(1, 1) }, vel: { value: 0 }, hov: { value: 0 }, ms: { value: new THREE.Vector2(.5, .5) }, rev: { value: 0 }, time: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: u, transparent: true,
      vertexShader: `uniform float vel;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;
        p.y+=sin(uv.x*3.1416)*vel*.0015;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: GLSL + `precision highp float;uniform sampler2D tex;uniform vec2 isz,psz,ms;uniform float vel,hov,rev,time;varying vec2 vUv;
        void main(){vec2 uv=vUv;vec2 d=uv-ms;float l=length(d*vec2(psz.x/psz.y,1.));
          uv+=normalize(d+1e-4)*sin(l*24.-time*3.)*.005*hov*smoothstep(.5,0.,l);
          uv=cover(uv,psz,isz);uv=(uv-.5)*(1.-.05*hov-.08*(1.-rev))+.5;
          float s=clamp(abs(vel)*.0001,0.,.002);
          vec3 c=vec3(texture2D(tex,uv+vec2(0,s)).r,texture2D(tex,uv).g,texture2D(tex,uv-vec2(0,s)).b);
          float n=fbm(vUv*3.+time*.04);float m=smoothstep(n-.15,n+.15,rev*1.35-.2+(vUv.y-.5)*.4);
          gl_FragColor=vec4(c,m);}`
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.visible = false; gs.add(mesh);
    const card = fig.closest('.wcard');
    const it = { fig, mesh, u, top: 0, left: 0, w: 0, h: 0 };
    card.addEventListener('pointerenter', () => gsap.to(u.hov, { value: 1, duration: .9, ease: 'power3.out' }));
    card.addEventListener('pointerleave', () => gsap.to(u.hov, { value: 0, duration: .9, ease: 'power3.out' }));
    // pointer position from cached geometry (no layout reads)
    fig.addEventListener('pointermove', e => { u.ms.value.set((e.clientX - it.left) / it.w, 1 - (e.clientY - (it.top - SY)) / it.h); });
    tex(`m/${fig.dataset.img}.webp`).then(t => { if (!t) return; u.tex.value = t; u.isz.value.copy(t.userData.size); fig.classList.add('gl-ready'); });
    ScrollTrigger.create({ trigger: fig, start: 'top 92%', once: true, onEnter: () => gsap.to(u.rev, { value: 1, duration: 1.9, ease: 'power2.out' }) });
    return it;
  });
  const measure = () => { const sy = scrollY; galItems.forEach(it => { const r = it.fig.getBoundingClientRect(); it.top = r.top + sy; it.left = r.left; it.w = r.width; it.h = r.height; it.u.psz.value.set(r.width || 1, r.height || 1); }); };
  ScrollTrigger.addEventListener('refresh', measure); measure();
  const clk = new THREE.Clock(); let sv = 0, shown = false;
  const show = v => { if (v !== shown) { shown = v; gc.style.visibility = v ? 'visible' : 'hidden'; } };
  gsap.ticker.add(() => {
    if (!workOn || paused) { show(false); return; }
    const t = clk.getElapsedTime(); sv += ((lenis.velocity || 0) - sv) * .15;
    const vel = gsap.utils.clamp(-24, 24, sv);
    let any = false;
    for (const it of galItems) {
      const y = it.top - SY;
      const vis = it.w > 0 && y + it.h > -60 && y < VH + 60 && it.u.tex.value;
      it.mesh.visible = !!vis; if (!vis) continue; any = true;
      it.mesh.scale.set(it.w, it.h, 1);
      it.mesh.position.set(it.left + it.w / 2 - VW / 2, -(y + it.h / 2) + VH / 2, 0);
      it.u.vel.value = vel; it.u.time.value = t;
    }
    show(any); if (any) gr.render(gs, gcam);
  });
}

/* =================================================================
   PROJECT PAGE (overlay)
   ================================================================= */
const modal = $('#modal'), ms = $('#modalScroll');
const WA = 'https://wa.me/971529111273?text=';
function openProject(slug) {
  const i = P.findIndex(p => p.slug === slug); if (i < 0) return;
  const p = P[i], nx = P[(i + 1) % P.length];
  const secs = (p.d || []).map(([h, t]) => `<div class="m-sec"><h4>${h}</h4><p>${t}</p></div>`).join('');
  const hero = p.cover || 1;
  const rest = []; for (let k = 1; k <= p.n; k++) if (k !== hero) rest.push(k);
  const gal = rest.map((k, j) => { const wide = j % 3 === 0; return `<img loading="lazy" class="${wide ? 'wide' : ''}" src="${wide ? 'g' : 'm'}/${p.slug}-${pad2(k)}.webp" alt="${p.t}, image ${j + 2}">`; }).join('');
  ms.innerHTML = `<div class="m-hero"><img src="g/${p.slug}-${pad2(hero)}.webp" alt="${p.t}"><div class="m-title"><span>${p.m}</span><h2>${p.t}</h2></div></div>
   <div class="m-body"><div><p class="lead">${p.s}</p><div class="m-tags"><i>${CATS[p.cat]}</i>${(p.k || []).map(k => `<i>${k}</i>`).join('')}</div></div><div>${secs}</div></div>
   ${gal ? `<div class="m-gal">${gal}</div>` : ''}
   <div class="m-cta"><h3>Planning a <em>similar project?</em></h3><div style="display:flex;gap:22px;flex-wrap:wrap;align-items:center"><a class="btn btn-solid" target="_blank" rel="noopener" href="${WA}${encodeURIComponent('Hello, I saw the ' + p.t + ' project and would like to discuss a similar design.')}">Discuss your project</a><a href="#" class="m-next" data-open="${nx.slug}">Next: ${nx.t}</a></div></div>`;
  ms.scrollTop = 0; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open'); lenis.stop(); paused = true;
  gsap.fromTo('.m-hero img', { scale: 1.2 }, { scale: 1, duration: 1.8, ease: 'power3.out' });
  gsap.fromTo('.m-title>*', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .08, delay: .35, ease: 'power3.out' });
}
function closeProject() {
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open');
  paused = false; lenis.start();
}
document.addEventListener('click', e => { const o = e.target.closest('[data-open]'); if (!o) return; e.preventDefault(); openProject(o.dataset.open); });
$('#modalX').addEventListener('click', closeProject);
addEventListener('keydown', e => { if (e.key === 'Escape') { closeProject(); closeMenu(); } });

/* ---------------- menu + nav ---------------- */
const menu = $('#menu'), burger = $('#burger'), nav = $('#nav');
function closeMenu() { if (!menu.classList.contains('open')) return; menu.classList.remove('open'); burger.classList.remove('on'); if (!paused) lenis.start(); }
burger.addEventListener('click', () => { const o = !menu.classList.contains('open'); menu.classList.toggle('open', o); burger.classList.toggle('on', o); if (o) lenis.stop(); else lenis.start(); });
let lastY = 0, navSolid = false, navHide = false;
lenis.on('scroll', ({ scroll }) => {
  const s = scroll > 60, h = scroll > lastY && scroll > 500 && !menu.classList.contains('open');
  if (s !== navSolid) { navSolid = s; nav.classList.toggle('solid', s); }
  if (h !== navHide) { navHide = h; nav.classList.toggle('hide', h); }
  lastY = scroll;
});

/* =================================================================
   THEME (day / night). Night is the default.
   ================================================================= */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const bg = bgCol();
  panels.forEach(pm => pm.userData.u.bg.value.set(bg));
  $('meta[name=theme-color]').setAttribute('content', bg);
  try { localStorage.setItem('hh-theme', t); } catch (e) {}
}
applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
$('#theme').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

/* =================================================================
   SIGNATURE: pinned full-screen WebGL showcase
   ================================================================= */
const SIG = window.SIG.map(([s, k]) => ({ p: BYSLUG[s], img: `m/${imgName(BYSLUG[s], k)}.webp` }));
{
  const cv = $('#sigGL');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
  r.setPixelRatio(1);
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const U = { t1: { value: null }, t2: { value: null }, s1: { value: new THREE.Vector2(1, 1) }, s2: { value: new THREE.Vector2(1, 1) }, prog: { value: 0 }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, mouse: { value: new THREE.Vector2(.5, .5) } };
  sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
    fragmentShader: GLSL + `precision highp float;varying vec2 vUv;uniform sampler2D t1,t2;uniform vec2 s1,s2,res,mouse;uniform float prog,time;
      void main(){vec2 uv=vUv;float asp=res.x/res.y;vec2 d=(uv-mouse)*vec2(asp,1.);float l=length(d);
        uv+=normalize(d+1e-4)/vec2(asp,1.)*sin(l*28.-time*2.6)*.0026*smoothstep(.35,0.,l);
        float n=fbm(uv*2.4+time*.025);float m=smoothstep(n-.2,n+.2,prog*1.4-.2);
        vec2 dir=vec2(.22,.07)*(n-.5);
        vec2 u1=cover((uv-.5)*(1.-.08*prog)+.5+dir*prog,res,s1);
        vec2 u2=cover((uv-.5)*(1.+.1*(1.-prog))+.5-dir*(1.-prog),res,s2);
        vec3 c=mix(texture2D(t1,u1).rgb,texture2D(t2,u2).rgb,m);
        c+=vec3(.83,.7,.46)*(1.-smoothstep(0.,.06,abs(m-.5)))*.22*step(.02,prog)*step(prog,.98);
        gl_FragColor=vec4(c,1.);}`
  })));
  const T = [];
  SIG.forEach((it, i) => tex(it.img).then(t => { T[i] = t; if (i === 0 && t) { U.t1.value = t; U.s1.value.copy(t.userData.size); U.t2.value = t; U.s2.value.copy(t.userData.size); dirty = true; } }));
  const titles = $('#sigTitles');
  SIG.forEach(({ p }, i) => { const d = document.createElement('div'); d.className = 'sig-t'; d.innerHTML = `<span>${p.m}</span><h3>${p.t.split(' ').map(w => `<i>${w}</i>`).join(' ')}</h3><p>${p.s}</p>`; if (i) gsap.set(d, { autoAlpha: 0 }); titles.appendChild(d); });
  $('.sig-count').innerHTML = `<b id="sigN">01</b> / ${pad2(SIG.length)}`;
  const tEls = $$('.sig-t', titles), sigN = $('#sigN'), sigBar = $('#sigBar');
  let cur = 0, vis = false, dirty = true;
  onScreen($('.sig'), v => vis = v);
  const size = () => { r.setSize(cv.clientWidth, cv.clientHeight, false); U.res.value.set(cv.clientWidth, cv.clientHeight); dirty = true; };
  size(); addEventListener('resize', size);
  function setIdx(i) {
    if (i === cur) return; cur = i;
    sigN.textContent = pad2(i + 1);
    tEls.forEach((el, k) => { gsap.killTweensOf(el); gsap.killTweensOf($$('h3 i', el)); if (k !== i) gsap.set(el, { autoAlpha: 0 }); });
    gsap.fromTo(tEls[i], { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: .7, ease: 'power3.out' });
    gsap.fromTo($$('h3 i', tEls[i]), { yPercent: 110 }, { yPercent: 0, duration: .9, stagger: .05, ease: 'power4.out' });
  }
  $('#sigOpen').addEventListener('click', e => { e.preventDefault(); openProject(SIG[cur].p.slug); });
  ScrollTrigger.create({
    trigger: '.sig-pin', start: 'top top', end: () => '+=' + innerHeight * 4, pin: true, scrub: true, refreshPriority: 3,
    onUpdate: s => {
      const x = s.progress * (SIG.length - 1), a = Math.min(Math.floor(x), SIG.length - 2), f = x - a;
      if (T[a] && T[a + 1]) { U.t1.value = T[a]; U.s1.value.copy(T[a].userData.size); U.t2.value = T[a + 1]; U.s2.value.copy(T[a + 1].userData.size); }
      U.prog.value = gsap.utils.clamp(0, 1, (f - .2) / .6);
      setIdx(Math.round(x)); sigBar.style.width = s.progress * 100 + '%';
    }
  });
  const clk = new THREE.Clock(), sm = new THREE.Vector2(.5, .5);
  cv.parentElement.addEventListener('pointermove', e => sm.set(e.clientX / VW, 1 - e.clientY / VH));
  gsap.ticker.add(() => {
    if (!vis || paused) return;
    U.time.value = clk.getElapsedTime(); U.mouse.value.lerp(sm, .08);
    r.render(sc, cam);
  });
}

/* =================================================================
   WINDOW: arch opens to full screen
   ================================================================= */
gsap.timeline({ scrollTrigger: { trigger: '.window-pin', start: 'top top', end: '+=150%', pin: true, scrub: 1, refreshPriority: 2 } })
  .fromTo('#wFrame', { clipPath: DESK() ? 'inset(20% 37% 20% 37% round 999px 999px 0px 0px)' : 'inset(26% 16% 26% 16% round 999px 999px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none', duration: 1 })
  .fromTo('#wFrame img', { scale: 1.3 }, { scale: 1, ease: 'none', duration: 1 }, 0)
  .fromTo('#wVeil', { opacity: 0 }, { opacity: 1, ease: 'none', duration: .6 }, .4)
  .fromTo('#wTxt', { y: 0 }, { y: -40, ease: 'none', duration: 1 }, 0);

/* =================================================================
   TUNNEL: walk through the work
   ================================================================= */
{
  const cv = $('#tunGL');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  r.setPixelRatio(1); r.setClearColor('#0a0a0a');
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(70, 1, .1, 60);
  sc.fog = new THREE.Fog('#0a0a0a', 6, 15);
  const tg = new THREE.Group(); sc.add(tg);
  const list = window.TUNNEL.map(([s, k]) => ({ p: BYSLUG[s], src: `t/${imgName(BYSLUG[s], k)}.webp` }));
  const RAD = 2.4, STEP = 1.6, meshes = [];
  const narrow = VW < 700;
  list.forEach((it, i) => {
    const a = i * 2.4, z = -i * STEP;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, fog: false }));
    m.position.set(Math.cos(a) * RAD * (narrow ? .78 : 1.25), Math.sin(a) * RAD * (narrow ? 1.05 : .8), z);
    m.rotation.set(Math.sin(i * 7.1) * .12, -Math.cos(a) * .35, Math.sin(i * 3.7) * .06);
    m.userData = it; tg.add(m); meshes.push(m);
    tex(it.src).then(t => { if (!t) return; m.material.map = t; m.material.needsUpdate = true; const ar = t.userData.size.x / t.userData.size.y; m.scale.set(ar >= 1.48 ? 1 : ar / 1.48, ar >= 1.48 ? 1.48 / ar : 1, 1); });
  });
  const LEN = list.length * STEP;
  const tray = new THREE.Raycaster(), tn = new THREE.Vector2();
  // the canvas is pinned full-screen while interactive, so viewport coords map directly
  function pick(e) { tn.set(e.clientX / VW * 2 - 1, -(e.clientY / VH) * 2 + 1); tray.setFromCamera(tn, cam); const h = tray.intersectObjects(meshes, false).find(h => h.object.material.opacity > .4); return h && h.object; }
  cv.addEventListener('click', e => { const m = pick(e); if (m) openProject(m.userData.p.slug); });
  let pickTick = 0;
  if (FINE) cv.addEventListener('pointermove', e => { if (++pickTick % 2) return; const m = pick(e); setCursor(cv, m ? 'Open' : null); });
  let prog = 0, vis = false, last = null, txtO = -1;
  onScreen($('.tunnel'), v => vis = v);
  const size = () => { r.setSize(cv.clientWidth, cv.clientHeight, false); cam.aspect = cv.clientWidth / cv.clientHeight; cam.updateProjectionMatrix(); };
  size(); addEventListener('resize', size);
  const tunTxt = $('#tunTxt'), tunName = $('#tunName');
  ScrollTrigger.create({ trigger: '.tunnel-pin', start: 'top top', end: () => '+=' + innerHeight * 3, pin: true, scrub: 1, refreshPriority: 1, onUpdate: s => prog = s.progress });
  gsap.ticker.add(() => {
    if (!vis || paused) return;
    const cz = 4 - prog * (LEN + .4);
    cam.position.z += (cz - cam.position.z) * .12;
    const mx = FINE ? mouse.x / VW - .5 : 0, my = FINE ? mouse.y / VH - .5 : 0;
    cam.position.x += (mx * .6 - cam.position.x) * .05; cam.position.y += (-my * .6 - cam.position.y) * .05;
    cam.lookAt(cam.position.x * .3, cam.position.y * .3, cam.position.z - 6);
    tg.rotation.z = prog * .5;
    let near = null, nd = 99;
    for (const m of meshes) { const d = cam.position.z - m.position.z; m.material.opacity = gsap.utils.clamp(0, 1, (12 - d) / 6) * gsap.utils.clamp(0, 1, (d + .3) / 1.2); if (d > .8 && d < nd) { nd = d; near = m; } }
    const o = Math.round(gsap.utils.clamp(0, 1, 1 - prog * 9) * 100) / 100;
    if (o !== txtO) { txtO = o; tunTxt.style.opacity = o; }
    if (near && near.userData.p !== last && prog > .08) { last = near.userData.p; tunName.innerHTML = `<small>${last.m}</small>${last.t}`; tunName.classList.add('on'); }
    if (prog <= .08 && last) { last = null; tunName.classList.remove('on'); }
    r.render(sc, cam);
  });
}

/* =================================================================
   TESTIMONIALS
   ================================================================= */
{
  const Q = window.QUOTES, st = $('#qStage');
  Q.forEach(q => { const d = document.createElement('figure'); d.className = 'q'; d.innerHTML = `<blockquote>${q.q}</blockquote><cite>${q.a}${q.r ? `<small>${q.r}</small>` : ''}</cite>`; st.appendChild(d); splitEl($('blockquote', d)); });
  const qs = $$('.q', st); let qi = -1, qVis = false, timer = 0;
  function showQ(i) {
    i = (i + Q.length) % Q.length; if (i === qi) return;
    const prev = qs[qi]; qi = i;
    if (prev) gsap.to(prev, { autoAlpha: 0, y: -14, duration: .5, ease: 'power2.in' });
    const el = qs[i];
    gsap.fromTo(el, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, duration: .01, delay: prev ? .45 : 0 });
    gsap.fromTo($$('.w>span', el), { yPercent: 105 }, { yPercent: 0, duration: 1.1, stagger: .012, ease: 'power4.out', delay: prev ? .45 : 0 });
    gsap.fromTo($('cite', el), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', delay: prev ? 1 : .5 });
    $('#qNum').textContent = `${pad2(i + 1)} / ${pad2(Q.length)}`;
    clearTimeout(timer); timer = setTimeout(() => { if (qVis && !paused) showQ(qi + 1); else timer = setTimeout(() => showQ(qi + 1), 9000); }, 9000);
  }
  $('#qPrev').addEventListener('click', () => showQ(qi - 1));
  $('#qNext').addEventListener('click', () => showQ(qi + 1));
  onScreen(st, v => { qVis = v; if (v && qi < 0) showQ(0); });
}

/* ---------------- ledger hover preview ---------------- */
if (FINE) {
  const lp = $('#lprev'), li = $('img', lp);
  const qx = gsap.quickTo(lp, 'x', { duration: .6, ease: 'power3.out' }), qy = gsap.quickTo(lp, 'y', { duration: .6, ease: 'power3.out' });
  $$('.lrow[data-img]').forEach(row => {
    row.addEventListener('pointerenter', () => { li.src = `m/${row.dataset.img}.webp`; if (!lp.classList.contains('on')) gsap.set(lp, { x: mouse.x + 40, y: mouse.y - 170 }); lp.classList.add('on'); });
    row.addEventListener('pointerleave', () => lp.classList.remove('on'));
  });
  $('#ledger').addEventListener('pointermove', e => { qx(e.clientX + 40); qy(e.clientY - 170); });
}

/* =================================================================
   SCROLL ANIMATIONS
   ================================================================= */
function scrollAnims() {
  $$('.split').forEach(el => { if (el.closest('.hero')) return; gsap.fromTo($$('.w>span', el), { yPercent: 110 }, { yPercent: 0, duration: 1.4, ease: 'power4.out', stagger: .06, scrollTrigger: { trigger: el, start: 'top 88%' } }); });
  $$('.up').forEach(el => gsap.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } }));
  $$('.scrub-text').forEach(el => gsap.fromTo($$('.sw', el), { opacity: .16 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: true } }));
  $$('.count').forEach(c => { const o = { v: 0 }; gsap.fromTo(o, { v: 0 }, { v: +c.dataset.to, duration: 2.4, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 92%' }, onUpdate: () => c.textContent = Math.round(o.v) }); });
  $$('.arch').forEach(a => {
    gsap.fromTo(a, { clipPath: 'inset(16% 10% 0% 10% round 999px 999px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0px 0px)', duration: 1.8, ease: 'power3.inOut', scrollTrigger: { trigger: a, start: 'top 85%' } });
    gsap.fromTo($('img', a), { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: a, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('.frame').forEach(f => {
    gsap.fromTo(f, { clipPath: 'inset(12% 12% 12% 12%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'power3.inOut', scrollTrigger: { trigger: f, start: 'top 85%' } });
    gsap.fromTo($('img', f), { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.contact-bg img', { yPercent: -14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
  if (!(FINE && DESK())) $$('.wcard figure img').forEach(img => gsap.fromTo(img, { scale: 1.16 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.wcap').forEach(c => gsap.fromTo(c, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 96%' } }));
  // stacking service cards
  const cards = $$('.scard');
  cards.forEach((c, i) => { if (i === cards.length - 1) return;
    gsap.fromTo(c, { scale: 1, '--dim': 0 }, { scale: .92 + i * .015, '--dim': .7, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top 85%', end: 'top 15%', scrub: true } }); });
  // plan drawn by scroll
  const L = [1, 2, 3, 4].map(n => $$('.plan .L' + n + ' > *'));
  L.flat().forEach(el => { const len = el.getTotalLength ? el.getTotalLength() : 600; el.style.strokeDasharray = len; el.style.strokeDashoffset = len; });
  const ptl = gsap.timeline({ scrollTrigger: DESK() ? { trigger: '.steps', start: 'top 70%', end: 'bottom 70%', scrub: 1 } : { trigger: '.plan', start: 'top 90%', end: 'bottom 35%', scrub: 1 } });
  L.forEach((els, k) => ptl.to(els, { strokeDashoffset: 0, duration: 1, stagger: .12, ease: 'none' }, k * 1.1));
  ptl.fromTo('.plan .labels', { opacity: 0 }, { opacity: 1, duration: .6 }, 2.4);
  $$('.step').forEach(s => ScrollTrigger.create({ trigger: s, start: DESK() ? 'top 62%' : 'top 82%', end: DESK() ? 'bottom 38%' : 'bottom 18%', toggleClass: 'on' }));
  // marquee drifts with scroll speed (width cached, no per-frame layout reads)
  const mt = $('.marquee-track'); let mx = 0, dir = 1, mw = mt.scrollWidth / 2, mOn = false, skew = 0;
  addEventListener('resize', () => mw = mt.scrollWidth / 2); ScrollTrigger.addEventListener('refresh', () => mw = mt.scrollWidth / 2);
  onScreen($('.marquee'), v => mOn = v);
  gsap.ticker.add(() => { if (!mOn || paused) return; const v = lenis.velocity || 0; if (Math.abs(v) > .1) dir = v > 0 ? 1 : -1; mx -= (.55 + Math.abs(v) * .25) * dir; if (mx <= -mw) mx += mw; if (mx > 0) mx -= mw; skew += (gsap.utils.clamp(-6, 6, -v * .25) - skew) * .1; mt.style.transform = `translate3d(${mx}px,0,0) skewX(${skew}deg)`; });
  gsap.fromTo('.pq', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '.philo-grid', start: 'top 85%' } });
  gsap.fromTo('.lrow', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: '.ledger', start: 'top 88%' } });
  gsap.fromTo('.foot-big span', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.6, stagger: .12, ease: 'power4.out', scrollTrigger: { trigger: '.foot', start: 'top 90%' } });
}

/* =================================================================
   LOADER + INTRO
   ================================================================= */
(async function boot() {
  $$('.mono path').forEach(p => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
  gsap.to('.mono path', { strokeDashoffset: 0, duration: 2, stagger: .2, ease: 'power2.inOut' });
  gsap.to('.mono text', { opacity: 1, duration: 1.2, delay: .9, ease: 'power2.out' });
  gsap.to('.loader-word span', { yPercent: 0, duration: 1.2, stagger: .05, delay: .3, ease: 'power4.out' });
  gsap.to('.loader-sub', { opacity: 1, duration: 1, delay: 1, ease: 'power2.out' });
  const prog = { v: 0 }, num = $('#loaderNum'), bar = $('#loaderBar');
  const upd = () => { num.textContent = Math.round(prog.v); bar.style.width = prog.v + '%'; };
  const tw = gsap.to(prog, { v: 88, duration: 2.6, ease: 'power2.out', onUpdate: upd });
  const need = RING.slice(0, 7).map(it => tex(it.img));
  await Promise.race([Promise.all([...need, document.fonts ? document.fonts.ready : 0, new Promise(r => setTimeout(r, 1800))]), new Promise(r => setTimeout(r, 6500))]);
  tw.kill();
  await gsap.to(prog, { v: 100, duration: .5, ease: 'power2.inOut', onUpdate: upd });
  const tl = gsap.timeline();
  tl.to('.loader-inner', { y: -30, opacity: 0, duration: .8, ease: 'power3.in' })
    .to('.loader-panels i', { scaleY: 0, duration: 1.2, stagger: .07, ease: 'power4.inOut' }, '-=.2')
    .set('.loader', { display: 'none' })
    .to(intro, { v: 1, duration: 2.6, ease: 'power3.out' }, '-=1.2')
    .fromTo(rot, { t: -2.2 }, { t: 0, duration: 2.6, ease: 'power3.out' }, '<')
    .fromTo('.hero-title .w>span', { yPercent: 110 }, { yPercent: 0, duration: 1.5, stagger: .08, ease: 'power4.out' }, '-=2.4')
    .fromTo('.h-in', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .12, ease: 'power3.out' }, '-=1.4')
    .fromTo('.ring-label', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out' }, '<')
    .fromTo('.nav', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, '-=1.2');
  tl.add(() => { document.body.classList.remove('loading'); lenis.start(); scrollAnims(); ScrollTrigger.sort(); ScrollTrigger.refresh(); }, '-=1.4');
})();
