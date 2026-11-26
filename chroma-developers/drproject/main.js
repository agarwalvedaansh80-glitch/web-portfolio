import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

gsap.registerPlugin(ScrollTrigger);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
const DESK = () => innerWidth > 900;
const P = window.PROJECTS;
const BYSLUG = Object.fromEntries(P.map(p => [p.slug, p]));
if (FINE) document.documentElement.classList.add('fine');
$('#yr').textContent = new Date().getFullYear();

/* ---------------- smooth scroll ---------------- */
const lenis = new Lenis({ lerp: 0.09 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a || a.dataset.open) return;
  const id = a.getAttribute('href'); e.preventDefault(); closeMenu();
  if (id === '#top' || id === '#') return lenis.scrollTo(0, { duration: 1.8 });
  const t = $(id); if (t) lenis.scrollTo(t, { duration: 1.8 });
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

/* ---------------- cursor ---------------- */
const cur = $('#cursor'), dot = $('.c-dot'), ring = $('.c-ring'), lab = $('#cLabel');
const mouse = { x: innerWidth / 2, y: innerHeight / 2 }, rp = { ...mouse };
addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
if (FINE) {
  gsap.ticker.add(() => {
    rp.x += (mouse.x - rp.x) * .2; rp.y += (mouse.y - rp.y) * .2;
    dot.style.transform = `translate(${mouse.x}px,${mouse.y}px)`;
    ring.style.transform = `translate(${rp.x}px,${rp.y}px)`;
  });
  document.addEventListener('pointerover', e => setCursor(e.target));
}
function setCursor(el, forced) {
  const t = el && el.closest && el.closest('[data-cursor],a,button,summary,select,input,.wcard');
  cur.classList.toggle('hover', !!t || !!forced);
  const l = forced || (t && (t.getAttribute('data-cursor') || (t.classList.contains('wcard') ? 'View' : '')));
  if (l) { lab.textContent = l; cur.classList.add('label'); } else cur.classList.remove('label');
  cur.classList.toggle('inv', !!(el && el.closest && el.closest('.process,.contact,.sig,.window,.tunnel,.realised,.manifesto')));
}

/* ---------------- magnetic ---------------- */
if (FINE) $$('.magnetic').forEach(b => {
  b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .35, duration: .5, ease: 'power3.out' }); });
  b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.4)' }));
});

/* ---------------- textures ---------------- */
const TL = new THREE.TextureLoader(), cache = {};
function tex(name) {
  const url = name.includes('/') ? name : `img/${name}.webp`;
  return cache[name] || (cache[name] = new Promise(res => TL.load(url, t => {
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

/* =================================================================
   HERO: 3D RING OF RENDERS
   ================================================================= */
const RING = window.RINGIMG.map(([s, src]) => ({ ...BYSLUG[s], rsrc: src }));
const rc = $('#ring');
const rr = new THREE.WebGLRenderer({ canvas: rc, antialias: true, alpha: true, powerPreference: 'high-performance' });
rr.setClearColor(0x000000, 0);
rr.setPixelRatio(Math.min(devicePixelRatio, 2));
const ANISO = rr.capabilities.getMaxAnisotropy();
const sharp = t => { if (t && !t.userData.sharp) { t.userData.sharp = 1; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = ANISO; t.needsUpdate = true; } return t; };
const rScene = new THREE.Scene();
const rCam = new THREE.PerspectiveCamera(34, 1, .1, 100);
const group = new THREE.Group(); rScene.add(group);
const N = RING.length, PW = 1.5, PH = 1.95, GAP = .24, R = N * (PW + GAP) / (Math.PI * 2);
const intro = { v: 0 };
const panels = RING.map((p, i) => {
  const g = new THREE.PlaneGeometry(PW, PH, 40, 1);
  const pos = g.attributes.position;
  for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), a = x / R; pos.setX(k, Math.sin(a) * R); pos.setZ(k, Math.cos(a) * R - R); }
  g.computeVertexNormals();
  const u = { tex: { value: null }, isz: { value: new THREE.Vector2(1, 1) }, psz: { value: new THREE.Vector2(PW, PH) }, hov: { value: 0 }, inn: { value: 0 }, bg: { value: new THREE.Color('#f3eee6') } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, side: THREE.DoubleSide,
    vertexShader: `uniform float hov,inn;varying vec2 vUv;varying float vF;void main(){vUv=uv;vec3 p=position+normal*hov*.16;
      p.y+=(1.-inn)*-.6;vec4 mv=modelViewMatrix*vec4(p,1.);vF=normalize(normalMatrix*normal).z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `precision highp float;uniform sampler2D tex;uniform vec2 isz,psz;uniform float hov,inn;uniform vec3 bg;varying vec2 vUv;varying float vF;
      void main(){vec2 uv=cover(vUv,psz,isz);uv=(uv-.5)*(1.-.07*hov)+.5;vec3 c=texture2D(tex,uv).rgb;
        float f=gl_FrontFacing?smoothstep(-.15,.75,vF):0.;
        c=mix(bg,c,gl_FrontFacing?mix(.28,1.,f):.12);
        c=mix(c,c*1.06,hov);
        vec2 s=psz*.5;float r=.07;vec2 q=abs((vUv-.5)*psz)-s+r;float d=length(max(q,0.))-r;float a=1.-smoothstep(-.004,.004,d);
        float rev=smoothstep(inn*1.3-.3,inn*1.3,1.-vUv.y);gl_FragColor=vec4(c,a*inn*(1.-rev*0.)*step(1.-inn*1.15,vUv.y+.15));}`
  });
  m.fragmentShader = GLSL + m.fragmentShader;
  const mesh = new THREE.Mesh(g, m);
  const th = i / N * Math.PI * 2;
  mesh.rotation.y = th; mesh.position.set(Math.sin(th) * R, 0, Math.cos(th) * R);
  mesh.userData = { p, u, th };
  group.add(mesh);
  tex(p.rsrc).then(t => { if (t) { sharp(t); u.tex.value = t; u.isz.value.copy(t.userData.size); } });
  return mesh;
});
function rSize() {
  const w = rc.clientWidth, h = rc.clientHeight; rr.setSize(w, h, false); rCam.aspect = w / h;
  rCam.fov = w < 700 ? 52 : 34; rCam.updateProjectionMatrix();
}
rSize(); addEventListener('resize', rSize);
const rot = { a: 0, t: 0, v: 0 }, tilt = { x: 0, y: 0 };
let rayTick = 0, overCanvas = false;
rc.addEventListener('pointerenter', () => overCanvas = true);
rc.addEventListener('pointerleave', () => overCanvas = false);
let dragging = false, dragX = 0, dragMoved = 0, heroOn = true, heroP = 0, hovered = null;
rc.addEventListener('pointerdown', e => { dragging = true; dragX = e.clientX; dragMoved = 0; rc.setPointerCapture(e.pointerId); });
rc.addEventListener('pointermove', e => {
  if (dragging) { const dx = e.clientX - dragX; dragX = e.clientX; dragMoved += Math.abs(dx); rot.t -= dx * .0036; rot.v = -dx * .0024; }
});
rc.addEventListener('pointerup', e => { dragging = false; if (dragMoved < 6 && hovered) openProject(hovered.userData.p.slug); });
rc.addEventListener('pointercancel', () => dragging = false);
rc.addEventListener('pointerleave', () => { setHover(null); });
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function setHover(m) {
  if (m === hovered) return;
  if (hovered) gsap.to(hovered.userData.u.hov, { value: 0, duration: 1.2, ease: 'power3.out' });
  hovered = m;
  if (m) { gsap.to(m.userData.u.hov, { value: 1, duration: 1.2, ease: 'power3.out' }); showLabel(m.userData.p); }
  if (FINE) { if (m) setCursor(null, 'Open'); else setCursor(null); }
  rc.style.cursor = m && !FINE ? 'pointer' : '';
}
let labelP = null, labelT = 0;
function showLabel(p) {
  if (p === labelP) return; labelP = p; const el = $('#ringLabel'); el.classList.add('swap'); clearTimeout(labelT);
  labelT = setTimeout(() => { $('#rlName').textContent = p.t; $('#rlMeta').textContent = p.m; el.classList.remove('swap'); }, 260);
}
function frontPanel() {
  let best = null, bd = 9;
  panels.forEach(pm => { let d = ((pm.userData.th - rot.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; if (Math.abs(d) < bd) { bd = Math.abs(d); best = pm; } });
  return best;
}
ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', onToggle: s => heroOn = s.isActive, onUpdate: s => heroP = s.progress });
document.body.classList.add('in-hero');
{ const heroEl = document.querySelector('#hero'); const upd = () => { if (!heroEl) return; const r = heroEl.getBoundingClientRect(); document.body.classList.toggle('in-hero', r.bottom > innerHeight * 0.6); }; addEventListener('scroll', upd, { passive: true }); lenis.on && lenis.on('scroll', upd); upd(); }
gsap.ticker.add(() => {
  if (!heroOn) return;
  const v = lenis.velocity || 0;
  if (!dragging) { rot.t += .0007 + v * .00022 + rot.v; rot.v *= .95; }
  rot.a += (rot.t - rot.a) * .045;
  group.rotation.y = -rot.a;
  const mx = mouse.x / innerWidth - .5, my = mouse.y / innerHeight - .5;
  tilt.x += ((FINE ? my * .08 : 0) - tilt.x) * .03; tilt.y += ((FINE ? mx * .06 : 0) - tilt.y) * .03;
  group.rotation.x = .1 + tilt.x + heroP * .5; group.rotation.z = -.04 + tilt.y * .4;
  group.position.y = (DESK() ? -1.0 : -.05) + heroP * 1.6;
  rCam.position.set(0, .2, (innerWidth < 700 ? 10.8 : 11.2) + heroP * 3);
  rCam.lookAt(0, -.2, 0);
  panels.forEach(pm => pm.userData.u.inn.value = gsap.utils.clamp(0, 1, intro.v * 1.6 - (pm.userData.th / (Math.PI * 2)) * .6));
  if (FINE && !dragging && (++rayTick % 3 === 0)) {
    ndc.set(mouse.x / rc.clientWidth * 2 - 1, -((mouse.y + scrollY) / rc.clientHeight) * 2 + 1);
    ray.setFromCamera(ndc, rCam);
    const hit = ray.intersectObjects(panels, false).find(h => h.point.z > 0);
    setHover(hit && overCanvas ? hit.object : null);
  }
  if (!hovered) { const f = frontPanel(); if (f) showLabel(f.userData.p); }
  rr.render(rScene, rCam);
});
/* touch tap to open on phones */
if (!FINE) rc.addEventListener('click', e => {
  if (dragMoved > 6) return;
  const r = rc.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, rCam);
  const hit = ray.intersectObjects(panels, false).find(h => h.point.z > -1);
  if (hit) openProject(hit.object.userData.p.slug);
});

/* =================================================================
   WORK GRID
   ================================================================= */
const wg = $('#wgrid');
P.forEach((p, i) => {
  const a = document.createElement('a'); a.href = '#'; a.className = 'wcard'; a.dataset.open = p.slug; a.dataset.rooms = p.r.join(' ');
  a.innerHTML = `<figure data-img="${p.img}"><img loading="lazy" src="img/${p.img}.webp" alt="${p.t}"></figure>
    <div class="wcap"><h3><span class="wn">${String(i + 1).padStart(2, '0')}</span>${p.t}</h3><span>${p.m}</span></div><p class="wsum">${p.s}</p>`;
  wg.appendChild(a);
});
const ROOMS = ['all', 'living', 'kitchen', 'bedroom', 'bathroom', 'pool', 'facade', 'landscape'];
const LBL = { all: 'All', living: 'Living', kitchen: 'Kitchen', dining: 'Dining', bedroom: 'Bedroom', bathroom: 'Bathroom', facade: 'Architecture', pool: 'Pool', landscape: 'Landscape' };
const fl = $('#filters');
ROOMS.forEach(r => { const b = document.createElement('button'); b.textContent = LBL[r]; b.dataset.r = r; if (r === 'all') b.className = 'on'; fl.appendChild(b); });
fl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', fl).forEach(x => x.classList.toggle('on', x === b));
  const r = b.dataset.r, cards = $$('.wcard', wg);
  gsap.to(cards, { opacity: 0, y: 20, duration: .3, onComplete: () => {
    cards.forEach(c => c.classList.toggle('gone', r !== 'all' && !c.dataset.rooms.includes(r)));
    ScrollTrigger.refresh(); if (window.__measureGal) setTimeout(window.__measureGal, 900);
    gsap.fromTo(cards.filter(c => !c.classList.contains('gone')), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .8, stagger: .05, ease: 'power3.out' });
  } });
});

/* ---------- WebGL gallery synced to the grid (desktop) ---------- */
if (FINE && DESK()) {
  const gc = $('#gal');
  const gr = new THREE.WebGLRenderer({ canvas: gc, alpha: true, antialias: true });
  gr.setClearColor(0x000000, 0); gr.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  let workOn = false; new IntersectionObserver(es => es.forEach(e => workOn = e.isIntersecting), { rootMargin: '200px' }).observe($('#wgrid'));
  const gs = new THREE.Scene();
  let W = innerWidth, H = innerHeight;
  const gcam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -10, 10);
  const gsize = () => { W = innerWidth; H = innerHeight; gr.setSize(W, H); Object.assign(gcam, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 }); gcam.updateProjectionMatrix(); };
  gsize(); addEventListener('resize', gsize);
  const geo = new THREE.PlaneGeometry(1, 1, 24, 24);
  const items = $$('.wcard figure', wg).map(fig => {
    const u = { tex: { value: null }, isz: { value: new THREE.Vector2(1, 1) }, psz: { value: new THREE.Vector2(1, 1) }, vel: { value: 0 }, hov: { value: 0 }, ms: { value: new THREE.Vector2(.5, .5) }, rev: { value: 0 }, time: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: u, transparent: true,
      vertexShader: `uniform float vel,hov;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;
        p.y+=sin(uv.x*3.1416)*vel*.0016;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: GLSL + `precision highp float;uniform sampler2D tex;uniform vec2 isz,psz,ms;uniform float vel,hov,rev,time;varying vec2 vUv;
        void main(){vec2 uv=vUv;vec2 d=uv-ms;float l=length(d*vec2(psz.x/psz.y,1.));
          uv+=normalize(d+1e-4)*sin(l*26.-time*4.)*.006*hov*smoothstep(.55,0.,l);
          uv=cover(uv,psz,isz);uv=(uv-.5)*(1.-.06*hov-.08*(1.-rev))+.5;
          float s=clamp(abs(vel)*.00012,0.,.0025);
          vec3 c=vec3(texture2D(tex,uv+vec2(0,s)).r,texture2D(tex,uv).g,texture2D(tex,uv-vec2(0,s)).b);
          float n=fbm(vUv*3.+time*.05);float m=smoothstep(n-.15,n+.15,rev*1.35-.2+(vUv.y-.5)*.4);
          gl_FragColor=vec4(c,m);}`
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.visible = false; gs.add(mesh);
    const card = fig.closest('.wcard');
    card.addEventListener('pointerenter', () => gsap.to(u.hov, { value: 1, duration: .8, ease: 'power3.out' }));
    card.addEventListener('pointerleave', () => gsap.to(u.hov, { value: 0, duration: .8, ease: 'power3.out' }));
    fig.addEventListener('pointermove', e => { const r = fig.getBoundingClientRect(); u.ms.value.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height); });
    tex(`m/${fig.dataset.img}.webp`).then(t => { if (!t) return; u.tex.value = t; u.isz.value.copy(t.userData.size); fig.classList.add('gl-ready'); });
    ScrollTrigger.create({ trigger: fig, start: 'top 92%', once: true, onEnter: () => gsap.to(u.rev, { value: 1, duration: 1.8, ease: 'power2.out' }) });
    return { fig, mesh, u, x: 0, y: 0, w: 0, h: 0 };
  });
  const measure = () => items.forEach(it => { const r = it.fig.getBoundingClientRect(); it.x = r.left; it.y = r.top + scrollY; it.w = r.width; it.h = r.height; });
  measure(); ScrollTrigger.addEventListener('refresh', measure); addEventListener('load', measure);
  window.__measureGal = measure;
  const clk = new THREE.Clock(); let sv = 0;
  gsap.ticker.add(() => {
    if (!workOn) { if (gc.style.visibility !== 'hidden') gc.style.visibility = 'hidden'; return; }
    const t = clk.getElapsedTime(); sv += ((lenis.velocity || 0) - sv) * .15;
    let any = false; const sy = scrollY, modalOpen = document.body.classList.contains('modal-open');
    items.forEach(it => {
      const top = it.y - sy;
      const vis = it.w > 0 && top + it.h > -60 && top < H + 60 && it.u.tex.value && !modalOpen;
      it.mesh.visible = vis; if (!vis) return; any = true;
      it.mesh.scale.set(it.w, it.h, 1);
      it.mesh.position.set(it.x + it.w / 2 - W / 2, -(top + it.h / 2) + H / 2, 0);
      it.u.psz.value.set(it.w, it.h); it.u.vel.value = gsap.utils.clamp(-24, 24, sv); it.u.time.value = t;
    });
    if (any) { gc.style.visibility = 'visible'; gr.render(gs, gcam); } else gc.style.visibility = 'hidden';
  });
}

/* =================================================================
   PROJECT PAGE (modal)
   ================================================================= */
const modal = $('#modal'), ms = $('#modalScroll');
function openProject(slug) {
  const i = P.findIndex(p => p.slug === slug); if (i < 0) return;
  const p = P[i], nx = P[(i + 1) % P.length];
  const secs = (p.d || []).map(([h, t]) => `<div class="m-sec"><h4>${h}</h4><p>${t}</p></div>`).join('') ||
    `<div class="m-sec"><h4>Planning a similar project?</h4><p>Tell us about your villa and we will suggest how to approach the design.</p></div>`;
  const gal = (p.g || []).slice(1).map(g => `<img loading="lazy" src="${g}" alt="${p.t}">`).join('');
  ms.innerHTML = `<div class="m-hero"><img src="img/${p.img}.webp" alt="${p.t}"><div class="m-title"><span>${p.m}</span><h2>${p.t}</h2></div></div>
   <div class="m-body"><div><p class="lead">${p.s}</p><div class="m-tags">${p.k ? `<i>${p.k}</i>` : ''}${p.y ? `<i>${p.y}</i>` : ''}${p.r.map(r => `<i>${LBL[r] || r}</i>`).join('')}</div></div><div>${secs}</div></div>
   ${gal ? `<div class="m-gal">${gal}</div>` : ''}
   <div class="m-cta"><h3>Planning a <em>similar project?</em></h3><div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center"><a class="btn btn-dark" target="_blank" rel="noopener" href="https://wa.me/971528526760?text=${encodeURIComponent('Hello Yurii, I saw the ' + p.t + ' project and would like to discuss a similar design.')}">Get a free brief</a><a href="#" class="m-next" data-open="${nx.slug}">Next: ${nx.t} →</a></div></div>`;
  ms.scrollTop = 0; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open'); lenis.stop();
  gsap.fromTo('.m-hero img', { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'power3.out' });
  gsap.fromTo('.m-title>*', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .08, delay: .4, ease: 'power3.out' });
}
function closeProject() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open'); lenis.start(); }
document.addEventListener('click', e => { const o = e.target.closest('[data-open]'); if (!o) return; e.preventDefault(); openProject(o.dataset.open); });
$('#modalX').addEventListener('click', closeProject);
addEventListener('keydown', e => { if (e.key === 'Escape') closeProject(); });

/* ---------------- menu + nav ---------------- */
const menu = $('#menu'), burger = $('#burger');
function closeMenu() { menu.classList.remove('open'); burger.classList.remove('on'); }
burger.addEventListener('click', () => { menu.classList.toggle('open'); burger.classList.toggle('on'); });
let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  const nav = $('#nav');
  nav.classList.toggle('solid', scroll > 60);
  nav.classList.toggle('hide', scroll > lastY && scroll > 500 && !menu.classList.contains('open'));
  lastY = scroll;
});

/* ---------------- why glow ---------------- */
$$('.why-card').forEach(c => c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }));

$('#consultForm').addEventListener('submit', e => {
  e.preventDefault(); const f = new FormData(e.target);
  const msg = `Hello Yurii, I would like a free brief.\nName: ${f.get('name')}\nWhatsApp: ${f.get('phone')}\nProject: ${f.get('type')}\nI need: ${f.get('need')}${f.get('area') ? '\nArea and district: ' + f.get('area') : ''}`;
  $('#consultOk').classList.add('on');
  window.open('https://wa.me/971528526760?text=' + encodeURIComponent(msg), '_blank', 'noopener');
});
$('#heroClose').addEventListener('click', () => gsap.to('.hero-left', { autoAlpha: 0, y: 20, duration: .5, ease: 'power3.in' }));

/* =================================================================
   THEME (day / night)
   ================================================================= */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f3eee6';
  panels.forEach(pm => pm.userData.u.bg.value.set(bg));
  try { localStorage.setItem('drp-theme', t); } catch (e) {}
}
let savedTheme = null; try { savedTheme = localStorage.getItem('drp-theme'); } catch (e) {}
applyTheme(savedTheme === 'light' ? 'light' : 'dark');
$('#theme').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

/* =================================================================
   SIGNATURE: pinned full-screen WebGL showcase
   ================================================================= */
const SIG = ['al-wasl-villa-dubai', 'luxurious-life-villa-dubai', 'the-man-villa-thailand', 'black-hills-dubai-hills', 'house-of-the-future-dubai'].map(s => BYSLUG[s]);
const SIGVID = {};
function vtex(src) {
  return new Promise(res => {
    const v = document.createElement('video'); v.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.crossOrigin = 'anonymous';
    v.addEventListener('loadeddata', () => { const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; t.userData.size = new THREE.Vector2(v.videoWidth, v.videoHeight); res(t); }, { once: true });
    v.addEventListener('error', () => res(null), { once: true }); v.load();
  });
}
{
  const cv = $('#sigGL');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const U = { t1: { value: null }, t2: { value: null }, s1: { value: new THREE.Vector2(1, 1) }, s2: { value: new THREE.Vector2(1, 1) }, prog: { value: 0 }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, mouse: { value: new THREE.Vector2(.5, .5) } };
  sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
    fragmentShader: GLSL + `precision highp float;varying vec2 vUv;uniform sampler2D t1,t2;uniform vec2 s1,s2,res,mouse;uniform float prog,time;
      void main(){vec2 uv=vUv;float asp=res.x/res.y;vec2 d=(uv-mouse)*vec2(asp,1.);float l=length(d);
        uv+=normalize(d+1e-4)/vec2(asp,1.)*sin(l*30.-time*3.)*.003*smoothstep(.35,0.,l);
        float n=fbm(uv*2.6+time*.03);float m=smoothstep(n-.2,n+.2,prog*1.4-.2);
        vec2 dir=vec2(.25,.08)*(n-.5);
        vec2 u1=cover((uv-.5)*(1.-.08*prog)+.5+dir*prog,res,s1);
        vec2 u2=cover((uv-.5)*(1.+.1*(1.-prog))+.5-dir*(1.-prog),res,s2);
        vec3 c=mix(texture2D(t1,u1).rgb,texture2D(t2,u2).rgb,m);
        c+=vec3(.82,.87,.9)*(1.-smoothstep(0.,.07,abs(m-.5)))*.28*step(.02,prog)*step(prog,.98);
        gl_FragColor=vec4(c,1.);}`
  })));
  const T = [];
  SIG.forEach((p, i) => (SIGVID[p.slug] ? vtex(SIGVID[p.slug]).then(t => t || tex(p.img)) : tex(p.img)).then(t => { T[i] = t; if (i === 0 && t) { U.t1.value = t; U.s1.value.copy(t.userData.size); U.t2.value = t; U.s2.value.copy(t.userData.size); } }));
  const titles = $('#sigTitles');
  SIG.forEach((p, i) => { const d = document.createElement('div'); d.className = 'sig-t'; d.innerHTML = `<span>${p.m}</span><h3>${p.t.split(' ').map(w => `<i>${w}</i>`).join(' ')}</h3><p>${p.s}</p>`; if (i) gsap.set(d, { autoAlpha: 0 }); titles.appendChild(d); });
  const tEls = $$('.sig-t', titles);
  let cur = 0, on = false;
  const size = () => { r.setSize(cv.clientWidth, cv.clientHeight, false); U.res.value.set(cv.clientWidth, cv.clientHeight); };
  size(); addEventListener('resize', size);
  function setIdx(i) {
    if (i === cur) return; cur = i;
    $('#sigN').textContent = String(i + 1).padStart(2, '0');
    tEls.forEach((el, k) => { gsap.killTweensOf(el); gsap.killTweensOf($$('h3 i', el)); if (k !== i) gsap.set(el, { autoAlpha: 0 }); });
    gsap.fromTo(tEls[i], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .6, ease: 'power3.out' });
    gsap.fromTo($$('h3 i', tEls[i]), { yPercent: 110 }, { yPercent: 0, duration: .8, stagger: .04, ease: 'power4.out' });
  }
  $('#sigOpen').addEventListener('click', e => { e.preventDefault(); openProject(SIG[cur].slug); });
  ScrollTrigger.create({
    trigger: '.sig-pin', start: 'top top', end: () => '+=' + innerHeight * 4, pin: true, scrub: true, refreshPriority: 3,
    onToggle: s => on = s.isActive,
    onUpdate: s => {
      const x = s.progress * (SIG.length - 1), a = Math.min(Math.floor(x), SIG.length - 2), f = x - a;
      if (T[a] && T[a + 1]) { U.t1.value = T[a]; U.s1.value.copy(T[a].userData.size); U.t2.value = T[a + 1]; U.s2.value.copy(T[a + 1].userData.size); }
      U.prog.value = gsap.utils.clamp(0, 1, (f - .2) / .6);
      setIdx(Math.round(x)); $('#sigBar').style.width = s.progress * 100 + '%';
    }
  });
  let sigVis = false; new IntersectionObserver(es => es.forEach(e => { sigVis = e.isIntersecting; T.forEach(t => t && t.image && t.image.play && (sigVis ? t.image.play().catch(() => {}) : t.image.pause())); })).observe(cv);
  const clk = new THREE.Clock(), sm = { x: .5, y: .5 };
  cv.parentElement.addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); sm.x = (e.clientX - b.left) / b.width; sm.y = 1 - (e.clientY - b.top) / b.height; });
  gsap.ticker.add(() => {
    if (!sigVis) return;
    U.time.value = clk.getElapsedTime(); U.mouse.value.lerp(new THREE.Vector2(sm.x, sm.y), .08);
    r.render(sc, cam);
  });
}

/* =================================================================
   WINDOW: arch opens to full screen
   ================================================================= */
gsap.timeline({ scrollTrigger: { trigger: '.window-pin', start: 'top top', end: '+=150%', pin: true, scrub: 1, refreshPriority: 2 } })
  .to('#wFrame', { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none', duration: 1 })
  .to('#wFrame img', { scale: 1, ease: 'none', duration: 1 }, 0)
  .fromTo('#wTxt', { y: 0 }, { y: -40, ease: 'none', duration: 1 }, 0);

/* =================================================================
   TUNNEL: walk through the work
   ================================================================= */
{
  const cv = $('#tunGL');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 1.25)); r.setClearColor('#070707');
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(70, 1, .1, 60);
  const tg = new THREE.Group(); sc.add(tg);
  const list = []; P.forEach(p => (p.g || []).slice(1, 4).forEach(g => list.push({ p, src: 't/' + g.split('/').pop() })));
  const RAD = 2.4, STEP = 1.6, meshes = [];
  list.forEach((it, i) => {
    const a = i * 2.4, z = -i * STEP;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide }));
    m.position.set(Math.cos(a) * RAD * (innerWidth < 700 ? .7 : 1.25), Math.sin(a) * RAD * .8, z); m.rotation.set((Math.random() - .5) * .25, -Math.cos(a) * .35, (Math.random() - .5) * .12); m.userData = it; tg.add(m); meshes.push(m);
    tex(it.src).then(t => { if (!t) return; m.material.map = t; m.material.needsUpdate = true; const ar = t.userData.size.x / t.userData.size.y; m.scale.set(ar >= 1.48 ? 1 : ar / 1.48, ar >= 1.48 ? 1.48 / ar : 1, 1); });
  });
  const LEN = list.length * STEP;
  let tunVis = false; new IntersectionObserver(es => es.forEach(e => tunVis = e.isIntersecting)).observe(cv);
  const tray = new THREE.Raycaster(), tn = new THREE.Vector2();
  function pick(e) { const b = cv.getBoundingClientRect(); tn.set((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); tray.setFromCamera(tn, cam); const h = tray.intersectObjects(meshes, false).find(h => h.object.material.opacity > .4); return h && h.object; }
  cv.addEventListener('click', e => { const m = pick(e); if (m) openProject(m.userData.p.slug); });
  cv.addEventListener('pointermove', e => { const m = pick(e); cv.style.cursor = m ? 'pointer' : ''; if (FINE) setCursor(cv, m ? 'Open' : null); });
  let prog = 0, on = false, last = null;
  const size = () => { r.setSize(cv.clientWidth, cv.clientHeight, false); cam.aspect = cv.clientWidth / cv.clientHeight; cam.updateProjectionMatrix(); };
  size(); addEventListener('resize', size);
  ScrollTrigger.create({ trigger: '.tunnel-pin', start: 'top top', end: () => '+=' + innerHeight * 3, pin: true, scrub: 1, refreshPriority: 1, onToggle: s => on = s.isActive, onUpdate: s => prog = s.progress });
  gsap.ticker.add(() => {
    if (!tunVis) return;
    const cz = 4 - prog * (LEN + 2);
    cam.position.z += (cz - cam.position.z) * .12;
    const mx = mouse.x / innerWidth - .5, my = mouse.y / innerHeight - .5;
    cam.position.x += (mx * .6 - cam.position.x) * .05; cam.position.y += (-my * .6 - cam.position.y) * .05;
    cam.lookAt(cam.position.x * .3, cam.position.y * .3, cam.position.z - 6);
    tg.rotation.z = prog * .5;
    let near = null, nd = 99;
    meshes.forEach(m => { const d = cam.position.z - m.position.z; m.material.opacity = gsap.utils.clamp(0, 1, (12 - d) / 6) * gsap.utils.clamp(0, 1, (d + .3) / 1.2); if (d > .8 && d < nd) { nd = d; near = m; } });
    $('#tunTxt').style.opacity = gsap.utils.clamp(0, 1, 1 - prog * 9);
    if (near && near.userData.p !== last && prog > .08) { last = near.userData.p; $('#tunName').innerHTML = `<small>${last.m}</small>${last.t}`; }
    if (prog <= .08 && last) { last = null; $('#tunName').innerHTML = ''; }
    r.render(sc, cam);
  });
}

/* =================================================================
   SCROLL ANIMATIONS
   ================================================================= */
function scrollAnims() {
  $$('.split').forEach(el => { if (el.closest('.hero')) return; gsap.to($$('.w>span', el), { y: 0, duration: 1.3, ease: 'power4.out', stagger: .06, scrollTrigger: { trigger: el, start: 'top 86%' } }); });
  $$('.up').forEach(el => gsap.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 90%' } }));
  $$('.scrub-text').forEach(el => gsap.to($$('.sw', el), { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: true } }));
  $$('.count').forEach(c => { const o = { v: 0 }; gsap.to(o, { v: +c.dataset.to, duration: 2.4, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 88%' }, onUpdate: () => c.textContent = Math.round(o.v) }); });
  gsap.fromTo('.stat', { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: .12, duration: 1.2, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: '.stats', start: 'top 82%' } });
  $$('.arch').forEach(a => {
    gsap.to(a, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 8px 8px)', duration: 1.8, ease: 'power3.inOut', scrollTrigger: { trigger: a, start: 'top 82%' } });
    gsap.fromTo($('img', a), { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: a, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.contact-bg img', { yPercent: -14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
  if (!(FINE && DESK())) $$('.wcard figure img').forEach(img => gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.wcap').forEach(c => gsap.fromTo(c, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 95%' } }));
  // stacking service cards
  const cards = $$('.scard');
  cards.forEach((c, i) => { if (i === cards.length - 1) return;
    gsap.to(c, { scale: .9 + i * .015, opacity: .55, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 15%', scrub: true } }); });
  // floor plan drawn by scroll
  const L = [1, 2, 3, 4].map(n => $$('.plan .L' + n + ' > *'));
  L.flat().forEach(el => { const len = el.getTotalLength ? el.getTotalLength() : 600; el.style.strokeDasharray = (len + 4) + ' ' + (len + 4); el.style.strokeDashoffset = len + 4; });
  const ptl = gsap.timeline({ scrollTrigger: { trigger: '.steps', start: 'top 70%', end: 'bottom 70%', scrub: 1 } });
  L.forEach((els, k) => ptl.to(els, { strokeDashoffset: 0, duration: 1, stagger: .12, ease: 'none' }, k * 1.1));
  ptl.to('.plan .labels', { opacity: 1, duration: .6 }, 2.4);
  $$('.step').forEach(s => ScrollTrigger.create({ trigger: s, start: 'top 62%', end: 'bottom 38%', toggleClass: 'on' }));
  // marquee reacts to scroll speed
  const mt = $('.marquee-track'); let mx = 0, dir = 1;
  gsap.ticker.add(() => { const v = lenis.velocity || 0; if (Math.abs(v) > .1) dir = v > 0 ? 1 : -1; mx -= (.7 + Math.abs(v) * .3) * dir; const w = mt.scrollWidth / 2; if (mx <= -w) mx += w; if (mx > 0) mx -= w; mt.style.transform = `translateX(${mx}px) skewX(${gsap.utils.clamp(-10, 10, -v * .35)}deg)`; });
  gsap.fromTo('.why-card', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: .08, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.why-grid', start: 'top 82%' } });
  gsap.fromTo('details', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .05, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.faq-list', start: 'top 88%' } });
  gsap.fromTo('.foot-big span,.foot-big em', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.6, stagger: .12, ease: 'power4.out', scrollTrigger: { trigger: '.foot', start: 'top 88%' } });
}


/* =================================================================
   STUDIO EFFECTS: blinds reveal, scroll fill text, pinned horizontal
   gallery with velocity skew, inspection lens
   ================================================================= */
function extraFX() {
  // venetian blinds reveal
  $$('[data-blinds]').forEach(b => {
    const st = { trigger: b, start: 'top 82%' };
    gsap.to($$('.bl i', b), { scaleY: 0, duration: 1.7, stagger: .1, ease: 'power3.inOut', scrollTrigger: st });
    gsap.fromTo($('img', b), { scale: 1.16 }, { scale: 1, duration: 2.4, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 82%' } });
  });
  // manifesto: text fills with light as you scroll
  const ft = $('#fillText');
  if (ft) gsap.fromTo(ft, { '--p': 0 }, { '--p': 100, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top 75%', end: 'bottom 55%', scrub: 1 } });
  // realised: pinned horizontal gallery
  const hz = $('#hzTrack'), pv = BYSLUG['private-villa-ukraine'];
  (pv.g || []).forEach((g, i) => {
    const f = document.createElement('figure'); f.className = 'hz-card'; f.dataset.open = pv.slug;
    f.innerHTML = `<div class="hz-img"><img src="${g}" alt="Private villa in Ukraine, realised" loading="lazy"></div><figcaption><span>${String(i + 1).padStart(2, '0')}</span>Realised</figcaption>`;
    hz.appendChild(f);
  });
  const cards = $$('.hz-card', hz);
  const skew = gsap.quickTo(cards, 'skewX', { duration: 1.2, ease: 'power3.out' });
  const dist = () => Math.max(0, hz.scrollWidth - innerWidth);
  gsap.to(hz, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.hz-pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1.2, invalidateOnRefresh: true, refreshPriority: 1.5,
    onUpdate: s => skew(gsap.utils.clamp(-4, 4, s.getVelocity() / -500)), onLeave: () => skew(0), onLeaveBack: () => skew(0) } });
  cards.forEach(c => gsap.fromTo($('img', c), { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: '.hz-pin', start: 'top top', end: () => '+=' + dist(), scrub: true } }));
  // inspection lens
  const stage = $('#lensStage'), lens = $('#lens'), img = $('#lensImg');
  if (stage) {
    const Z = 2;
    lens.style.backgroundImage = `url(${img.src})`;
    const pos = { x: .62, y: .58 }, tgt = { x: .62, y: .58 };
    let active = false, user = 0, vis = false;
    new IntersectionObserver(es => es.forEach(e => vis = e.isIntersecting)).observe(stage);
    const set = e => { const r = stage.getBoundingClientRect(); tgt.x = gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width); tgt.y = gsap.utils.clamp(0, 1, (e.clientY - r.top) / r.height); user = performance.now(); };
    stage.addEventListener('pointerenter', e => { active = true; set(e); stage.classList.add('on'); });
    stage.addEventListener('pointermove', set);
    stage.addEventListener('pointerleave', () => { active = false; user = performance.now(); });
    stage.classList.add('on');
    gsap.ticker.add(() => {
      if (!vis) return;
      const t = performance.now() / 1000;
      if ((!FINE || !active) && performance.now() - user > 1800) { tgt.x = .5 + Math.sin(t * .22) * .3; tgt.y = .55 + Math.sin(t * .31) * .22; }
      pos.x += (tgt.x - pos.x) * .08; pos.y += (tgt.y - pos.y) * .08;
      const r = stage.getBoundingClientRect(), L = lens.offsetWidth;
      const px = pos.x * r.width, py = pos.y * r.height;
      lens.style.transform = `translate(${px - L / 2}px,${py - L / 2}px)`;
      lens.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
      lens.style.backgroundPosition = `${-(px * Z - L / 2)}px ${-(py * Z - L / 2)}px`;
    });
  }
}

/* =================================================================
   LOADER + INTRO
   ================================================================= */
(async function boot() {
  gsap.to('.loader-word span', { y: 0, duration: 1.1, stagger: .04, ease: 'power4.out' });
  const prog = { v: 0 };
  const upd = () => { $('#loaderNum').textContent = Math.round(prog.v); $('#loaderBar').style.width = prog.v + '%'; };
  const tw = gsap.to(prog, { v: 88, duration: 2.4, ease: 'power2.out', onUpdate: upd });
  const need = RING.slice(0, 6).map(p => tex(p.rsrc));
  await Promise.race([Promise.all([...need, document.fonts ? document.fonts.ready : 0]), new Promise(r => setTimeout(r, 6000))]);
  tw.kill();
  await gsap.to(prog, { v: 100, duration: .5, ease: 'power2.inOut', onUpdate: upd });
  const tl = gsap.timeline();
  tl.to('.loader-inner', { y: -40, opacity: 0, duration: .7, ease: 'power3.in' })
    .to('.loader-panels i', { scaleY: 0, duration: 1.1, stagger: .08, ease: 'power4.inOut' }, '-=.2')
    .set('.loader', { display: 'none' })
    .to(intro, { v: 1, duration: 3, ease: 'power3.inOut' }, '-=1.1')
    .fromTo(rot, { t: -.9 }, { t: 0, duration: 3.2, ease: 'power3.inOut' }, '<')
    .to('.hero-title .w>span', { y: 0, duration: 1.5, stagger: .08, ease: 'power4.out' }, '-=2.4')
    .fromTo('.h-in', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .12, ease: 'power3.out' }, '-=1.4')
    .fromTo('.nav', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, '-=1.2');
  tl.add(() => { document.body.classList.remove('loading'); lenis.start(); scrollAnims(); extraFX(); ScrollTrigger.sort(); ScrollTrigger.refresh(); }, '-=1.4');
})();
