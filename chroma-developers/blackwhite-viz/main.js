import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
const DESK = () => innerWidth > 900;
const MOB = innerWidth < 760;
const P = window.PROJECTS;
const BYSLUG = Object.fromEntries(P.map(p => [p.slug, p]));
const WA = '971502148129';
const clamp = gsap.utils.clamp;
if (FINE) root.classList.add('fine');
$('#yr').textContent = new Date().getFullYear();

/* ---------------- theme (night default) ---------------- */
let THEME = 'dark';
try { if (localStorage.getItem('bw-theme') === 'light') THEME = 'light'; } catch (e) {}
root.dataset.theme = THEME;
const cssVar = n => getComputedStyle(root).getPropertyValue(n).trim();
const themeHooks = [];
function applyTheme(t) {
  THEME = t; root.dataset.theme = t;
  try { localStorage.setItem('bw-theme', t); } catch (e) {}
  const bg = cssVar('--bg');
  const m = $('meta[name=theme-color]'); if (m) m.content = bg;
  themeHooks.forEach(f => f(t === 'dark', bg));
}
$('#theme').addEventListener('click', () => applyTheme(THEME === 'dark' ? 'light' : 'dark'));

/* ---------------- smooth scroll ---------------- */
const lenis = new Lenis({ lerp: 0.085 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
const SCROLL = () => lenis.scroll || 0;
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
$$('.scrub-text').forEach(el => splitEl(el, 'sw2'));

/* ---------------- cursor ---------------- */
const cur = $('#cursor'), dot = $('.c-dot'), ring = $('.c-ring'), lab = $('#cLabel');
const mouse = { x: innerWidth * .7, y: innerHeight * .4 }, rp = { ...mouse };
let mouseMoved = false;
addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouseMoved = true; }, { passive: true });
if (FINE) {
  gsap.ticker.add(() => {
    rp.x += (mouse.x - rp.x) * .22; rp.y += (mouse.y - rp.y) * .22;
    dot.style.transform = `translate3d(${mouse.x}px,${mouse.y}px,0)`;
    ring.style.transform = `translate3d(${rp.x}px,${rp.y}px,0)`;
  });
  document.addEventListener('pointerover', e => setCursor(e.target));
}
function setCursor(el, forced) {
  if (!FINE) return;
  const t = el && el.closest && el.closest('[data-cursor],a,button,summary,select,input,label,.wcard');
  cur.classList.toggle('hover', !!t || !!forced);
  const l = forced || (t && (t.getAttribute('data-cursor') || (t.classList.contains('wcard') ? 'View' : '')));
  if (l) { lab.textContent = l; cur.classList.add('label'); } else cur.classList.remove('label');
  const dark = el && el.closest && el.closest('.sig,.window,.contact,.m-hero');
  const flip = el && el.closest && el.closest('.quote');
  cur.classList.toggle('inv', !!dark || (!!flip && THEME !== 'dark'));
  cur.classList.toggle('invd', !!flip && THEME === 'dark');
}
{ const s = document.createElement('style'); s.textContent = '.cursor.invd .c-dot{background:#0a0a0a}.cursor.invd .c-ring{border-color:rgba(10,10,10,.5)}.cursor.invd .c-label{background:#0a0a0a;color:#f2f2ef}'; document.head.appendChild(s); }

/* ---------------- magnetic (rect cached on enter) ---------------- */
if (FINE) $$('.magnetic').forEach(b => {
  let r = null;
  b.addEventListener('pointerenter', () => { r = b.getBoundingClientRect(); });
  b.addEventListener('pointermove', e => { if (!r) return; gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .18, y: (e.clientY - r.top - r.height / 2) * .24, duration: .6, ease: 'power3.out' }); });
  b.addEventListener('pointerleave', () => { r = null; gsap.to(b, { x: 0, y: 0, duration: .8, ease: 'power3.out' }); });
});

/* ---------------- on-screen observer ---------------- */
function watch(el, cb, margin = '120px') {
  const io = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: margin });
  io.observe(el); return io;
}

/* ---------------- textures ---------------- */
const TL = new THREE.TextureLoader(), cache = {};
let MAXANI = 8;
function tex(url, mip = false) {
  const key = url + (mip ? '#m' : '');
  return cache[key] || (cache[key] = new Promise(res => TL.load(url, t => {
    t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = mip; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = MAXANI;
    t.userData.size = new THREE.Vector2(t.image.width, t.image.height); res(t);
  }, undefined, () => res(null))));
}
const GLSL = `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec2 cover(vec2 uv,vec2 r,vec2 i){float rs=r.x/r.y,is=i.x/i.y;vec2 n=rs<is?vec2(i.x*r.y/i.y,r.y):vec2(r.x,i.y*r.x/i.x);
 vec2 o=(rs<is?vec2((n.x-r.x)/2.,0.):vec2(0.,(n.y-r.y)/2.))/n;return uv*r/n+o;}`;

/* =================================================================
   HERO: real-time sculpture with material switcher
   ================================================================= */
const heroState = { build: 0, ready: false };
const hero = (() => {
  const cv = $('#hero3d');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, FINE ? 2 : 1.5));
  MAXANI = r.capabilities.getMaxAnisotropy();
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(cssVar('--bg'));
  /* studio environment: dark room with softbox strips, for crisp product-style reflections */
  function studioEnv() {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: 0x090909, side: THREE.BackSide })));
    const box = (w, h, x, y, z, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 1.5, 0); s.add(m); };
    box(16, 7, 0, 14, 3, 2.6);
    box(2.4, 16, -13, 3, 5, 5.5);
    box(1.6, 16, 13, 3, -1, 4.2);
    box(12, 3, -2, 4, -14, 1.6);
    box(9, 9, 8, -2, 13, .35);
    s.add(new THREE.Mesh(new THREE.CircleGeometry(30, 32).rotateX(-Math.PI / 2).translate(0, -6, 0), new THREE.MeshBasicMaterial({ color: 0x050505 })));
    return s;
  }
  const pm = new THREE.PMREMGenerator(r);
  sc.environment = pm.fromScene(studioEnv(), .02).texture; pm.dispose();
  const cam = new THREE.PerspectiveCamera(28, 1, .1, 80);
  const world = new THREE.Group(); sc.add(world);
  const sculpt = new THREE.Group(); world.add(sculpt);

  /* procedural textures */
  function makeMarble() {
    const S = MOB ? 384 : 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), im = g.createImageData(S, S), d = im.data;
    const G = 256, rnd = new Float32Array(G * G); for (let i = 0; i < G * G; i++) rnd[i] = Math.random();
    const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const x0 = xi & 255, y0 = yi & 255, x1 = (x0 + 1) & 255, y1 = (y0 + 1) & 255;
      const a = rnd[y0 * G + x0], b = rnd[y0 * G + x1], c2 = rnd[y1 * G + x0], d2 = rnd[y1 * G + x1];
      return a + (b - a) * u + (c2 - a) * v + (a - b - c2 + d2) * u * v; };
    const fbm = (x, y) => { let s = 0, a = .5; for (let o = 0; o < 5; o++) { s += a * vn(x, y); x *= 2.03; y *= 2.03; a *= .5; } return s; };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S * 4, v = y / S * 4, f = fbm(u, v), f2 = fbm(u * 2.1 + 7.3, v * 2.1 + 1.7);
      const vein = Math.pow(1 - Math.abs(Math.sin((u * .8 + v * .5 + f * 4.4) * Math.PI)), 16);
      const vein2 = Math.pow(1 - Math.abs(Math.sin((u * .35 - v * .8 + f2 * 3.2) * Math.PI * 1.3)), 60);
      const col = 242 - f * 22 - vein * 175 - vein2 * 85, i = (y * S + x) * 4;
      d[i] = col; d[i + 1] = col; d[i + 2] = col - 1; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function makeBrushed() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    for (let y = 0; y < S; y++) { const v = 120 + Math.random() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, S, 1); }
    for (let k = 0; k < 900; k++) { const v = 90 + Math.random() * 140 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(Math.random() * S, Math.random() * S, 20 + Math.random() * 80, 1); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  const brushed = makeBrushed();
  const M = {
    marble: new THREE.MeshPhysicalMaterial({ map: makeMarble(), roughness: .16, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: .9 }),
    metal: new THREE.MeshPhysicalMaterial({ color: 0xb4b4b4, metalness: 1, roughness: .5, roughnessMap: brushed, anisotropy: .9, envMapIntensity: 1.1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .03, transmission: 1, thickness: 1.1, ior: 1.52, envMapIntensity: 1.4, specularIntensity: 1, attenuationColor: new THREE.Color(0xdedede), attenuationDistance: 2.2 }),
    clay: new THREE.MeshStandardMaterial({ color: 0xbdbab5, roughness: 1, metalness: 0, envMapIntensity: .22 })
  };
  const NAMES = { marble: 'Marble', metal: 'Brushed metal', glass: 'Glass', clay: 'Matte clay' };

  /* the form: a twisting stack of floor plates around a core */
  const N = 30, GAP = .108, H = N * GAP;
  const plate = new RoundedBoxGeometry(2.1, .072, .9, 3, .03);
  const inst = new THREE.InstancedMesh(plate, M.marble, N);
  inst.castShadow = inst.receiveShadow = true; inst.frustumCulled = false;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, H + .05, 40), M.marble);
  core.castShadow = core.receiveShadow = true;
  sculpt.add(inst, core);

  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: .36, metalness: 0, envMapIntensity: .3 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, .09, 96), plinthMat);
  plinth.position.y = -.045; plinth.receiveShadow = true; plinth.castShadow = true; world.add(plinth);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(1.7, .0035, 6, 160), new THREE.MeshBasicMaterial({ color: 0x8a8a8a }));
  edge.rotation.x = Math.PI / 2; edge.position.y = .001; world.add(edge);

  const fc = document.createElement('canvas'); fc.width = fc.height = 256; const fg = fc.getContext('2d');
  const grd = fg.createRadialGradient(128, 128, 0, 128, 128, 128); grd.addColorStop(0, '#fff'); grd.addColorStop(.55, '#888'); grd.addColorStop(1, '#000');
  fg.fillStyle = grd; fg.fillRect(0, 0, 256, 256);
  const fade = new THREE.CanvasTexture(fc);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: .92, metalness: 0, transparent: true, alphaMap: fade, depthWrite: false, envMapIntensity: 0 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 72), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.091; floor.receiveShadow = true; world.add(floor);
  const shadowFloor = new THREE.Mesh(new THREE.CircleGeometry(9, 72), new THREE.ShadowMaterial({ opacity: .16, depthWrite: false }));
  shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = -.09; shadowFloor.receiveShadow = true; world.add(shadowFloor);

  const spot = new THREE.SpotLight(0xffffff, 125, 0, .5, .9, 2);
  spot.castShadow = true; spot.shadow.mapSize.set(MOB ? 512 : 1024, MOB ? 512 : 1024);
  spot.shadow.bias = -.0004; spot.shadow.normalBias = .025; spot.shadow.camera.near = 2; spot.shadow.camera.far = 22;
  spot.target.position.set(0, 1.5, 0); world.add(spot, spot.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x101010, .3); sc.add(hemi);
  const rim = new THREE.DirectionalLight(0xffffff, .9); rim.position.set(-5, 4, -6); world.add(rim);

  function setThemeColors(dark, bg) {
    sc.background.set(bg);
    floor.visible = dark;
    plinthMat.color.set(dark ? 0x0d0d0d : 0xe3e3e0);
    edge.material.color.set(dark ? 0x6a6a6a : 0x9a9a96);
    hemi.intensity = dark ? .3 : .75;
    shadowFloor.material.opacity = dark ? .3 : .16;
  }
  setThemeColors(THEME === 'dark', cssVar('--bg'));
  themeHooks.push(setThemeColors);

  /* layout */
  let cfg = { x: 2.3, dist: 11.5, lookY: 1.7, camY: 2.9, s: 1 };
  let W = 1, Hh = 1;
  function size() {
    W = cv.clientWidth; Hh = cv.clientHeight; r.setSize(W, Hh, false); cam.aspect = W / Hh;
    if (W < 900) {
      cam.fov = 34;
      const fitW = 3.7 / (2 * Math.tan(17 * Math.PI / 180) * cam.aspect * .74);
      cfg = { x: 0, dist: Math.max(11, fitW), lookY: 0, camY: 0, s: 1 };
      const visH = 2 * cfg.dist * Math.tan(17 * Math.PI / 180);
      cfg.lookY = 1.75 + visH * .2; cfg.camY = cfg.lookY + .5;
    } else {
      cam.fov = 28;
      cfg = { x: Math.min(2.5, 1.4 * cam.aspect), dist: 13.4, lookY: 1.55, camY: 2.5, s: 1 };
    }
    cam.updateProjectionMatrix();
  }
  size(); addEventListener('resize', size);

  /* interaction */
  const rot = { a: .6, t: .6, v: 0 }, wave = { a: 0 }, L = { x: .35, y: -.3, tx: .35, ty: -.3 };
  let drag = false, dragX = 0, touching = false, heroP = 0, on = true, curMat = 'marble';
  cv.addEventListener('pointerdown', e => { drag = true; dragX = e.clientX; if (e.pointerType !== 'mouse') touching = true; });
  addEventListener('pointermove', e => {
    if (drag) { const dx = e.clientX - dragX; dragX = e.clientX; rot.t += dx * .009; rot.v = dx * .0045; }
    if (touching) { L.tx = e.clientX / innerWidth * 2 - 1; L.ty = e.clientY / innerHeight * 2 - 1; }
  }, { passive: true });
  addEventListener('pointerup', () => { drag = false; touching = false; });
  addEventListener('pointercancel', () => { drag = false; touching = false; });
  cv.addEventListener('pointerenter', () => FINE && setCursor(null, 'Drag'));
  cv.addEventListener('pointerleave', () => FINE && setCursor(null));

  const hudMat = $('#hudMat'), hudLight = $('#hudLight');
  if (!FINE) { const h = $('.mats-label small'); if (h) h.textContent = 'Touch to light it · Drag to turn'; }
  function setMat(k) {
    if (k === curMat || !M[k]) return; curMat = k;
    $$('#mats button').forEach(b => b.classList.toggle('on', b.dataset.mat === k));
    gsap.to(hudMat, { opacity: 0, duration: .4, ease: 'power2.inOut', onComplete: () => { hudMat.textContent = NAMES[k]; gsap.to(hudMat, { opacity: 1, duration: .8, ease: 'power2.out' }); } });
    gsap.killTweensOf(wave);
    gsap.timeline()
      .to(wave, { a: 1, duration: .7, ease: 'power3.inOut', onComplete: () => {
        inst.material = core.material = M[k];
        const cs = k !== 'glass'; inst.castShadow = core.castShadow = cs;
      } })
      .to(wave, { a: 0, duration: 1.5, ease: 'power4.out' });
  }
  $('#mats').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setMat(b.dataset.mat); });

  ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', onUpdate: s => { heroP = s.progress; document.body.classList.toggle('hero-on', s.progress < .28); } });
  document.body.classList.add('hero-on');
  watch($('#hero'), v => on = v, '0px');

  const dummy = new THREE.Object3D();
  let hudTick = 0;
  function frame(time) {
    if (!on) return;
    if (!drag) { rot.t += .0009 + rot.v; rot.v *= .95; }
    rot.a += (rot.t - rot.a) * .05;
    if (FINE && !touching) { if (mouseMoved) { L.tx = mouse.x / innerWidth * 2 - 1; L.ty = mouse.y / innerHeight * 2 - 1; } }
    else if (!touching) { L.tx = Math.sin(time * .18) * .85; L.ty = -.35 + Math.cos(time * .13) * .3; }
    L.x += (L.tx - L.x) * .045; L.y += (L.ty - L.y) * .045;
    const az = L.x * 1.35, el = .5 - L.y * .55, rr = 7.2;
    spot.position.set(Math.sin(az) * rr * Math.cos(el), 1.5 + Math.sin(el) * rr, Math.cos(az) * rr * Math.cos(el));
    if (++hudTick % 6 === 0) hudLight.textContent = 'Light ' + String(Math.round(((az * 180 / Math.PI) % 360 + 360) % 360)).padStart(3, '0') + '°';

    const b = heroState.build, tw = 1.75 + Math.sin(time * .2) * .1, spread = 1 + wave.a * .5;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const k = clamp(0, 1, b * (N + 6) - i);
      const ke = 1 - Math.pow(1 - k, 3);
      const s = .62 + .38 * Math.sin(Math.PI * (t * .86 + .07));
      dummy.position.set(0, .06 + i * GAP * spread + (1 - ke) * .7, 0);
      dummy.rotation.set(0, tw * t + wave.a * Math.sin(t * Math.PI) * 1.1 + (1 - ke) * .6, 0);
      const sc2 = Math.max(.0001, ke);
      dummy.scale.set(s * sc2, sc2, (.82 + .18 * s) * sc2);
      dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    core.scale.set(1, Math.max(.0001, b) * spread, 1); core.position.y = (H / 2 + .03) * Math.max(.0001, b) * spread;

    sculpt.rotation.y = rot.a + heroP * .8;
    world.position.x = cfg.x; world.scale.setScalar(cfg.s);
    cam.position.set(cfg.x * .35, cfg.camY + heroP * 2.2, cfg.dist + heroP * 2);
    cam.lookAt(cfg.x * .35, cfg.lookY + heroP * .9, 0);
    r.render(sc, cam);
  }
  gsap.ticker.add(t => frame(t));
  return { render: () => r.render(sc, cam), frame };
})();

/* =================================================================
   WORK GRID
   ================================================================= */
const LBL = { all: 'All', exterior: 'Exterior', interior: 'Interior', landscape: 'Landscape', amenity: 'Amenity', cultural: 'Cultural', detail: 'Detail', aerial: 'Aerial' };
const wg = $('#wgrid');
P.forEach((p, i) => {
  const a = document.createElement('a'); a.href = '#'; a.className = 'wcard'; a.dataset.open = p.slug; a.dataset.k = p.k.join(' ');
  const img = p.g[0].f;
  a.innerHTML = `<figure data-img="${img}"><img loading="lazy" decoding="async" src="m/${img}.webp" srcset="m/${img}.webp 1280w, g/${img}.webp 1920w" sizes="(max-width:600px) 92vw, (max-width:900px) 46vw, 56vw" alt="${p.t}, ${p.d}"></figure>
    <div class="wcap"><h3><span class="wn">${String(i + 1).padStart(2, '0')}</span>${p.t}</h3><span>${p.d} · ${p.y}</span></div><p class="wsum">${p.s}</p>`;
  wg.appendChild(a);
});
const fl = $('#filters');
['all', 'exterior', 'interior', 'landscape', 'amenity', 'cultural'].forEach(k => { const b = document.createElement('button'); b.textContent = LBL[k]; b.dataset.k = k; if (k === 'all') b.className = 'on'; fl.appendChild(b); });
fl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', fl).forEach(x => x.classList.toggle('on', x === b));
  const k = b.dataset.k, cards = $$('.wcard', wg);
  gsap.to(cards, { opacity: 0, y: 20, duration: .3, onComplete: () => {
    cards.forEach(c => c.classList.toggle('gone', k !== 'all' && !c.dataset.k.split(' ').includes(k)));
    ScrollTrigger.refresh();
    gsap.fromTo(cards.filter(c => !c.classList.contains('gone')), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .9, stagger: .05, ease: 'power3.out' });
  } });
});

/* ---------- WebGL gallery synced to the grid (desktop) ---------- */
if (FINE && DESK()) {
  const gc = $('#gal');
  const gr = new THREE.WebGLRenderer({ canvas: gc, alpha: true, antialias: true });
  gr.setClearColor(0x000000, 0); gr.setPixelRatio(Math.min(devicePixelRatio, 2));
  let workOn = false; watch(wg, v => workOn = v, '150px');
  const gs = new THREE.Scene();
  let W = innerWidth, H = innerHeight;
  const gcam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -10, 10);
  const gsize = () => { W = innerWidth; H = innerHeight; gr.setSize(W, H); Object.assign(gcam, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 }); gcam.updateProjectionMatrix(); };
  gsize(); addEventListener('resize', gsize);
  const geo = new THREE.PlaneGeometry(1, 1, 24, 24);
  const items = $$('.wcard figure', wg).map(fig => {
    const u = { tex: { value: null }, isz: { value: new THREE.Vector2(1, 1) }, psz: { value: new THREE.Vector2(1, 1) }, vel: { value: 0 }, hov: { value: 0 }, ms: { value: new THREE.Vector2(.5, .5) }, rev: { value: 0 }, col: { value: 0 }, time: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: u, transparent: true,
      vertexShader: `uniform float vel;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.y+=sin(uv.x*3.1416)*vel*.0008;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: GLSL + `precision highp float;uniform sampler2D tex;uniform vec2 isz,psz,ms;uniform float vel,hov,rev,col,time;varying vec2 vUv;
        void main(){vec2 uv=vUv;vec2 d=uv-ms;float l=length(d*vec2(psz.x/psz.y,1.));
          uv+=normalize(d+1e-4)*sin(l*24.-time*4.)*.005*hov*smoothstep(.5,0.,l);
          uv=cover(uv,psz,isz);uv=(uv-.5)*(1.-.05*hov-.08*(1.-rev))+.5;
          float s=clamp(abs(vel)*.00006,0.,.0014);
          vec3 c=vec3(texture2D(tex,uv+vec2(0,s)).r,texture2D(tex,uv).g,texture2D(tex,uv-vec2(0,s)).b);
          float n=fbm(vUv*3.+time*.04);
          float m=smoothstep(n-.15,n+.15,rev*1.35-.2+(vUv.y-.5)*.4);
          float cm=smoothstep(n-.2,n+.2,max(col,hov)*1.4-.2);
          c=mix(vec3(luma(c)),c,cm);
          gl_FragColor=vec4(c,m);}`
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.visible = false; gs.add(mesh);
    const card = fig.closest('.wcard');
    const it = { fig, mesh, u, top: 0, left: 0, w: 0, h: 0 };
    card.addEventListener('pointerenter', () => gsap.to(u.hov, { value: 1, duration: 1.3, ease: 'power3.out' }));
    card.addEventListener('pointerleave', () => gsap.to(u.hov, { value: 0, duration: 1.3, ease: 'power3.out' }));
    fig.addEventListener('pointermove', e => { if (!it.w) return; u.ms.value.set((e.clientX - it.left) / it.w, 1 - (e.clientY - (it.top - SCROLL())) / it.h); });
    tex(`g/${fig.dataset.img}.webp`, true).then(t => { if (!t) return; u.tex.value = t; u.isz.value.copy(t.userData.size); fig.classList.add('gl-ready'); });
    ScrollTrigger.create({ trigger: fig, start: 'top 92%', once: true, onEnter: () => { gsap.fromTo(u.rev, { value: 0 }, { value: 1, duration: 2.2, ease: 'power3.out' }); gsap.fromTo(u.col, { value: 0 }, { value: 1, duration: 2.4, delay: .8, ease: 'power2.inOut' }); } });
    return it;
  });
  const cacheGal = () => { const sy = SCROLL(); items.forEach(it => { const r = it.fig.getBoundingClientRect(); it.top = r.top + sy; it.left = r.left; it.w = r.width; it.h = r.height; }); };
  ScrollTrigger.addEventListener('refresh', cacheGal);
  addEventListener('load', cacheGal);
  let sv = 0;
  gsap.ticker.add(t => {
    if (!workOn || document.body.classList.contains('modal-open')) { if (gc.style.visibility !== 'hidden') gc.style.visibility = 'hidden'; return; }
    sv += ((lenis.velocity || 0) - sv) * .08;
    const sy = SCROLL(); let any = false;
    items.forEach(it => {
      const top = it.top - sy;
      const vis = it.w > 0 && top + it.h > -60 && top < H + 60 && it.u.tex.value;
      it.mesh.visible = !!vis; if (!vis) return; any = true;
      it.mesh.scale.set(it.w, it.h, 1);
      it.mesh.position.set(it.left + it.w / 2 - W / 2, -(top + it.h / 2) + H / 2, 0);
      it.u.psz.value.set(it.w, it.h); it.u.vel.value = clamp(-24, 24, sv); it.u.time.value = t;
    });
    if (any) { if (gc.style.visibility !== 'visible') gc.style.visibility = 'visible'; gr.render(gs, gcam); } else if (gc.style.visibility !== 'hidden') gc.style.visibility = 'hidden';
  });
}

/* =================================================================
   PROJECT OVERLAY
   ================================================================= */
const modal = $('#modal'), ms = $('#modalScroll');
function openProject(slug) {
  const i = P.findIndex(p => p.slug === slug); if (i < 0) return;
  const p = P[i], nx = P[(i + 1) % P.length];
  const stills = p.g.map((g, k) => `<figure class="m-still"><div class="ms-img"><img loading="${k < 2 ? 'eager' : 'lazy'}" src="g/${g.f}.webp" srcset="m/${g.f}.webp 1280w, g/${g.f}.webp 1920w, x/${g.f}.webp 3840w" sizes="(max-width:900px) 100vw, 75vw" alt="${p.t}, still ${k + 1}"></div><figcaption class="ms-cap"><span>Still ${String(k + 1).padStart(2, '0')}</span><p>${g.cap}</p></figcaption></figure>`).join('');
  const msg = encodeURIComponent(`Hello Blackwhite Viz, I saw the ${p.t} project and would like to discuss a similar visual set.`);
  ms.innerHTML = `<div class="m-hero"><img src="g/${p.g[0].f}.webp" srcset="m/${p.g[0].f}.webp 1280w, g/${p.g[0].f}.webp 1920w, x/${p.g[0].f}.webp 3840w" sizes="(max-aspect-ratio: 16/9) 160vh, 100vw" alt="${p.t}"><div class="m-title"><span>${p.d}</span><h2>${p.t}</h2></div></div>
   <div class="m-meta"><div><small>Location</small><b>${p.loc}</b></div><div><small>Year</small><b>${p.y}</b></div><div><small>Discipline</small><b>${p.d}</b></div><div><small>Client</small><b>${p.c}</b></div></div>
   <div class="m-body"><div><p class="lead">${p.s}</p></div><div class="m-p">${p.p.map(t => `<p>${t}</p>`).join('')}</div></div>
   <div class="m-stills">${stills}</div>
   <div class="m-cta"><h3>Planning a <em>similar set?</em></h3><div class="m-acts"><a class="btn btn-solid" target="_blank" rel="noopener" href="https://wa.me/${WA}?text=${msg}">Discuss on WhatsApp</a><a href="#" class="m-next" data-open="${nx.slug}" data-cursor="Next">Next: ${nx.t} →</a></div></div>`;
  ms.scrollTop = 0; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open'); lenis.stop(); clearTimeout(window.__mf); window.__mf = setTimeout(() => document.body.classList.contains('modal-open') && document.body.classList.add('modal-full'), 1050);
  gsap.fromTo('.m-hero img', { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power3.out' });
  gsap.fromTo('.m-title>*', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .08, delay: .35, ease: 'power3.out' });
}
function closeProject() { if (!modal.classList.contains('open')) return; modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open', 'modal-full'); clearTimeout(window.__mf); lenis.start(); }
document.addEventListener('click', e => { const o = e.target.closest('[data-open]'); if (!o) return; e.preventDefault(); openProject(o.dataset.open); });
$('#modalX').addEventListener('click', closeProject);
addEventListener('keydown', e => { if (e.key === 'Escape') { closeProject(); closeMenu(); } });

/* ---------------- menu + nav ---------------- */
const menu = $('#menu'), burger = $('#burger'), nav = $('#nav');
function closeMenu() { menu.classList.remove('open'); burger.classList.remove('on'); }
burger.addEventListener('click', () => { menu.classList.toggle('open'); burger.classList.toggle('on'); });
let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  nav.classList.toggle('solid', scroll > 60);
  nav.classList.toggle('hide', scroll > lastY && scroll > 500 && !menu.classList.contains('open'));
  lastY = scroll;
});

/* ---------------- contact form -> WhatsApp ---------------- */
$('#cForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, v = n => (f.elements[n].value || '').trim();
  let ok = true;
  ['name', 'email'].forEach(n => { const bad = !v(n) || (n === 'email' && !/^\S+@\S+\.\S+$/.test(v(n))); f.elements[n].classList.toggle('err', bad); if (bad) ok = false; });
  if (!ok) { $('#fNote').textContent = 'Please add your name and a valid email.'; return; }
  const lines = [`Hello Blackwhite Viz, I would like to discuss a project.`, `Name: ${v('name')}`, `Email: ${v('email')}`];
  if (v('company')) lines.push(`Company: ${v('company')}`);
  if (v('phone')) lines.push(`Phone: ${v('phone')}`);
  if (v('url')) lines.push(`Company URL: ${v('url')}`);
  lines.push(`Project: ${v('service')}`);
  $('#fNote').textContent = 'Opening WhatsApp with your message.';
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
});

/* =================================================================
   SHOWCASE: pinned full-screen. Resting slide is a sharp DOM image;
   WebGL renders only during the liquid transition.
   ================================================================= */
const SIG = [['water-villa', 3], ['tower-3', 0], ['kenya-villa', 2], ['nshama', 0], ['fort', 0], ['concept-tower', 1]].map(([s, k]) => ({ p: BYSLUG[s], f: BYSLUG[s].g[k].f }));
const SIGBIG = FINE && DESK();
const sigTex = [];
{
  const cv = $('#sigGL'), wrap = $('#sigImgs'), N = SIG.length;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const U = { t1: { value: null }, t2: { value: null }, s1: { value: new THREE.Vector2(1, 1) }, s2: { value: new THREE.Vector2(1, 1) }, prog: { value: 0 }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, mouse: { value: new THREE.Vector2(.5, .5) } };
  sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
    fragmentShader: GLSL + `precision highp float;varying vec2 vUv;uniform sampler2D t1,t2;uniform vec2 s1,s2,res,mouse;uniform float prog,time;
      void main(){vec2 uv=vUv;float tr=sin(prog*3.14159);float asp=res.x/res.y;vec2 d=(uv-mouse)*vec2(asp,1.);float l=length(d);
        uv+=normalize(d+1e-4)/vec2(asp,1.)*sin(l*26.-time*2.)*.0022*smoothstep(.32,0.,l)*tr;
        float n=fbm(uv*2.2+time*.02);float m=smoothstep(n-.22,n+.22,prog*1.44-.22);
        vec2 dir=vec2(.2,.05)*(n-.5);
        vec2 u1=cover((uv-.5)*(1.-.06*prog)+.5+dir*prog,res,s1);
        vec2 u2=cover((uv-.5)*(1.+.08*(1.-prog))+.5-dir*(1.-prog),res,s2);
        vec3 a=texture2D(t1,u1).rgb,b=texture2D(t2,u2).rgb;
        a=mix(a,vec3(luma(a)),smoothstep(0.,.55,prog));
        b=mix(vec3(luma(b)),b,smoothstep(.45,1.,prog));
        vec3 c=mix(a,b,m);
        float e=1.-smoothstep(0.,.05,abs(m-.5));
        c=mix(c,vec3(1.),e*.5*tr);
        gl_FragColor=vec4(c,1.);}`
  })));
  const imgs = SIG.map((s, i) => {
    const im = new Image(); im.decoding = 'async'; im.alt = `${s.p.t}, ${s.p.d}`;
    im.sizes = '(max-aspect-ratio: 16/9) 178vh, 100vw';
    im.srcset = `m/${s.f}.webp 1280w, g/${s.f}.webp 1920w, x/${s.f}.webp 3840w`; im.src = `g/${s.f}.webp`;
    if (i === 0) im.className = 'on'; wrap.appendChild(im); return im;
  });
  SIG.forEach((s, i) => tex(`${SIGBIG ? 'x' : 'g'}/${s.f}.webp`, SIGBIG).then(t => { sigTex[i] = t; }));
  $('#sigT').textContent = String(N).padStart(2, '0');
  const titles = $('#sigTitles');
  SIG.forEach((s, i) => { const d = document.createElement('div'); d.className = 'sig-t'; d.innerHTML = `<span>${s.p.d} · ${s.p.loc} · ${s.p.y}</span><h3>${s.p.t.split(' ').map(w => `<i>${w}</i>`).join(' ')}</h3><p>${s.p.s}</p>`; if (i) gsap.set(d, { autoAlpha: 0 }); titles.appendChild(d); });
  const tEls = $$('.sig-t', titles);
  let cur = 0, on = false, xt = 0, xs = 0, shown = 0, glOn = false;
  const size = () => { r.setSize(cv.clientWidth, cv.clientHeight, false); U.res.value.set(cv.clientWidth, cv.clientHeight); };
  size(); addEventListener('resize', size);
  function setIdx(i) {
    if (i === cur) return; cur = i;
    $('#sigN').textContent = String(i + 1).padStart(2, '0');
    tEls.forEach((el, k) => { gsap.killTweensOf(el); gsap.killTweensOf($$('h3 i', el)); if (k !== i) gsap.to(el, { autoAlpha: 0, duration: .5, ease: 'power2.out' }); });
    gsap.fromTo(tEls[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.3, delay: .15, ease: 'power3.out' });
    gsap.fromTo($$('h3 i', tEls[i]), { yPercent: 110 }, { yPercent: 0, duration: 1.4, delay: .15, stagger: .07, ease: 'power4.out' });
  }
  $('#sigOpen').addEventListener('click', e => { e.preventDefault(); openProject(SIG[cur].p.slug); });
  ScrollTrigger.create({
    trigger: '.sig-pin', start: 'top top', end: () => '+=' + innerHeight * 5, pin: true, refreshPriority: 2,
    onUpdate: s => { xt = s.progress * (N - 1); $('#sigBar').style.width = s.progress * 100 + '%'; }
  });
  watch(cv, v => on = v, '0px');
  const sm = { x: .5, y: .5 };
  cv.parentElement.addEventListener('pointermove', e => { sm.x = e.clientX / innerWidth; sm.y = 1 - e.clientY / innerHeight; });
  const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  gsap.ticker.add((t, dt) => {
    if (!on) return;
    xs += (xt - xs) * (1 - Math.exp(-(dt / 1000) / .34)); if (Math.abs(xt - xs) < 1e-4) xs = xt;
    const a = Math.min(Math.floor(xs), N - 2), f = xs - a, p = ease(clamp(0, 1, (f - .18) / .64));
    setIdx(Math.round(xs));
    const rest = p <= .0005 ? a : p >= .9995 ? a + 1 : -1;
    if (rest >= 0 || !sigTex[a] || !sigTex[a + 1]) {
      const show = rest >= 0 ? rest : (p < .5 ? a : a + 1);
      if (show !== shown) { imgs.forEach((im, i) => im.classList.toggle('on', i === show)); shown = show; }
      if (glOn) { cv.style.visibility = 'hidden'; glOn = false; }
      return;
    }
    U.t1.value = sigTex[a]; U.s1.value.copy(sigTex[a].userData.size); U.t2.value = sigTex[a + 1]; U.s2.value.copy(sigTex[a + 1].userData.size);
    U.prog.value = p; U.time.value = t;
    U.mouse.value.x += (sm.x - U.mouse.value.x) * .05; U.mouse.value.y += (sm.y - U.mouse.value.y) * .05;
    r.render(sc, cam);
    if (!glOn) { cv.style.visibility = 'visible'; glOn = true; }
  });
}

/* =================================================================
   FRAME ZOOM (pinned)
   ================================================================= */
{
  const wi = MOB ? [30, 14] : [24, 32];
  gsap.timeline({ scrollTrigger: { trigger: '.window-pin', start: 'top top', end: '+=160%', pin: true, scrub: 1.4, refreshPriority: 1 } })
    .fromTo('#wFrame', { clipPath: `inset(${wi[0]}% ${wi[1]}% ${wi[0]}% ${wi[1]}%)` }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 1 })
    .fromTo('#wFrame img', { scale: 1.3 }, { scale: 1, ease: 'none', duration: 1 }, 0)
    .fromTo('.vf-w', { top: wi[0] + '%', bottom: wi[0] + '%', left: wi[1] + '%', right: wi[1] + '%' }, { top: '3%', bottom: '3%', left: '2%', right: '2%', ease: 'none', duration: 1 }, 0)
    .fromTo('#wTxt', { y: 0 }, { y: -40, ease: 'none', duration: 1 }, 0);
}

/* =================================================================
   PROCESS: drawing to final still, driven by scroll
   ================================================================= */
{
  const cv = $('#procGL');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const U = { tex: { value: null }, isz: { value: new THREE.Vector2(1280, 720) }, res: { value: new THREE.Vector2(1, 1) }, stage: { value: 0 }, time: { value: 0 }, paper: { value: new THREE.Color() }, ink: { value: new THREE.Color() }, dpr: { value: 1 } };
  sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
    fragmentShader: GLSL + `precision highp float;varying vec2 vUv;uniform sampler2D tex;uniform vec2 isz,res;uniform float stage,time,dpr;uniform vec3 paper,ink;
      float L(vec2 p){return luma(texture2D(tex,p).rgb);}
      float wipe(float x,float n){return smoothstep(n-.1,n+.1,clamp(x,0.,1.)*1.3-.15);}
      float hline(float v,float w){return 1.-smoothstep(0.,w,abs(v));}
      void main(){
        vec2 uv=cover(vUv,res,isz);
        vec2 px=vec2(2.4/1280.)*vec2(1.,isz.x/isz.y);
        float tl=L(uv+px*vec2(-1,1)),t=L(uv+px*vec2(0,1)),tr=L(uv+px*vec2(1,1)),l=L(uv+px*vec2(-1,0)),r=L(uv+px*vec2(1,0)),bl=L(uv+px*vec2(-1,-1)),b=L(uv+px*vec2(0,-1)),br=L(uv+px*vec2(1,-1));
        float gx=-tl-2.*l-bl+tr+2.*r+br,gy=-tl-2.*t-tr+bl+2.*b+br;
        float e=smoothstep(.22,.66,length(vec2(gx,gy)));
        vec3 col=texture2D(tex,uv).rgb;float lu=luma(col);
        vec2 fc=gl_FragCoord.xy/dpr;vec2 q=fract(fc/32.);
        float grid=max(step(q.x,1./32.),step(q.y,1./32.));
        vec3 L0=mix(paper,ink,e*.92);L0=mix(L0,ink,grid*.05);
        vec2 v=vUv;float guides=max(max(hline(v.x-1./3.,.0016),hline(v.x-2./3.,.0016)),max(hline(v.y-1./3.,.0028),hline(v.y-2./3.,.0028)));
        float cross=max(hline(v.x-.5,.0012)*step(abs(v.y-.5),.04),hline(v.y-.5,.002)*step(abs(v.x-.5),.025));
        vec2 fr=abs(v-.5);float frame=max(hline(fr.x-.44,.0016)*step(fr.y,.42),hline(fr.y-.42,.0026)*step(fr.x,.44));
        vec3 L1=mix(L0,ink,max(max(guides,cross),frame)*.55);
        float clay=mix(.2,.88,smoothstep(.04,.92,lu));
        vec3 L2=mix(vec3(clay)*vec3(1.,.99,.97),vec3(.08),e*.35);
        vec3 L3=vec3(smoothstep(.0,1.,lu*1.08));
        vec3 L4=col;
        float n=fbm(vUv*3.2+time*.02);
        vec3 c=L0;
        c=mix(c,L1,wipe(stage,n));
        c=mix(c,L2,wipe(stage-1.,n));
        c=mix(c,L3,wipe(stage-2.,n));
        c=mix(c,L4,wipe(stage-3.,n));
        gl_FragColor=vec4(c,1.);}`
  })));
  tex(`${FINE && DESK() ? 'x' : 'g'}/tower-2-1.webp`, true).then(t => { if (t) { U.tex.value = t; U.isz.value.copy(t.userData.size); } });
  const setCols = dark => { U.paper.value.set(dark ? '#0e0e0e' : '#f7f7f5'); U.ink.value.set(dark ? '#ecece8' : '#121212'); };
  setCols(THEME === 'dark'); themeHooks.push(setCols);
  const size = () => { r.setSize(cv.clientWidth, cv.clientHeight, false); U.res.value.set(cv.clientWidth, cv.clientHeight); U.dpr.value = r.getPixelRatio(); };
  size(); addEventListener('resize', size);
  let on = false, target = 0, shown = -1;
  const NAMES = ['Drawing', 'Cameras', 'Clay', 'Light', 'Final'];
  watch(cv, v => on = v, '60px');
  ScrollTrigger.create({ trigger: '.steps', start: 'top 55%', end: 'bottom 85%', onUpdate: s => target = clamp(0, 4, s.progress * 4.4) });
  gsap.ticker.add(t => {
    if (!on || !U.tex.value) return;
    U.stage.value += (target - U.stage.value) * .045; U.time.value = t;
    const k = Math.round(U.stage.value);
    if (k !== shown) { shown = k; $('#passN').textContent = String(k + 1).padStart(2, '0'); $('#passName').textContent = NAMES[k]; }
    r.render(sc, cam);
  });
}

/* =================================================================
   ARCHIVE: 3D ring of stills
   ================================================================= */
{
  const RING = [['water-villa', 0], ['tower-3', 0], ['kenya-villa', 2], ['nshama', 0], ['fort', 0], ['heritage', 0], ['tower-2', 1], ['concept-tower', 1], ['interior', 0], ['water-villa', 3], ['tower-3', 3], ['kenya-villa', 1], ['nshama', 3], ['fort', 3], ['heritage', 1], ['tower-1', 0], ['tower-3', 5], ['interior', 3]]
    .map(([s, k]) => ({ p: BYSLUG[s], f: BYSLUG[s].g[k].f }));
  const rc = $('#ring');
  const rr = new THREE.WebGLRenderer({ canvas: rc, antialias: true, alpha: true });
  rr.setClearColor(0x000000, 0); rr.setPixelRatio(Math.min(devicePixelRatio, 2));
  const RTX = innerWidth >= 760 ? 'm' : 't';
  const rs = new THREE.Scene(), rcam = new THREE.PerspectiveCamera(32, 1, .1, 100);
  const group = new THREE.Group(); rs.add(group);
  const N = RING.length, PW = 1.9, PH = 1.22, GAP = .2, R = N * (PW + GAP) / (Math.PI * 2);
  const intro = { v: 0 };
  const panels = RING.map((it, i) => {
    const g = new THREE.PlaneGeometry(PW, PH, 36, 1);
    const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), a = x / R; pos.setX(k, Math.sin(a) * R); pos.setZ(k, Math.cos(a) * R - R); }
    g.computeVertexNormals();
    const u = { tex: { value: null }, isz: { value: new THREE.Vector2(16, 9) }, psz: { value: new THREE.Vector2(PW, PH) }, hov: { value: 0 }, inn: { value: 0 }, bg: { value: new THREE.Color(cssVar('--bg')) } };
    const m = new THREE.ShaderMaterial({
      uniforms: u, transparent: true, side: THREE.DoubleSide,
      vertexShader: `uniform float hov,inn;varying vec2 vUv;varying float vF;void main(){vUv=uv;vec3 p=position+normal*hov*.18;p.y+=(1.-inn)*-.5;vec4 mv=modelViewMatrix*vec4(p,1.);vF=normalize(normalMatrix*normal).z;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: GLSL + `precision highp float;uniform sampler2D tex;uniform vec2 isz,psz;uniform float hov,inn;uniform vec3 bg;varying vec2 vUv;varying float vF;
        void main(){vec2 uv=cover(vUv,psz,isz);uv=(uv-.5)*(1.-.06*hov)+.5;vec3 c=texture2D(tex,uv).rgb;
          float f=gl_FrontFacing?smoothstep(-.1,.8,vF):0.;
          c=mix(vec3(luma(c)),c,clamp(f*1.4-.3+hov,0.,1.));
          c=mix(bg,c,gl_FrontFacing?mix(.22,1.,f):.1);
          vec2 s=psz*.5;float rr=.025;vec2 q=abs((vUv-.5)*psz)-s+rr;float d=length(max(q,0.))-rr;float a=1.-smoothstep(-.004,.004,d);
          gl_FragColor=vec4(c,a*inn*step(1.-inn*1.15,vUv.y+.15));}`
    });
    const mesh = new THREE.Mesh(g, m);
    const th = i / N * Math.PI * 2;
    mesh.rotation.y = th; mesh.position.set(Math.sin(th) * R, 0, Math.cos(th) * R);
    mesh.userData = { it, u, th };
    group.add(mesh);
    tex(`${RTX}/${it.f}.webp`, true).then(t => { if (t) { u.tex.value = t; u.isz.value.copy(t.userData.size); } });
    return mesh;
  });
  themeHooks.push((d, bg) => panels.forEach(pm => pm.userData.u.bg.value.set(bg)));
  let CW = 1, CH = 1, docTop = 0, left = 0;
  function rSize() {
    CW = rc.clientWidth; CH = rc.clientHeight; rr.setSize(CW, CH, false); rcam.aspect = CW / CH;
    rcam.fov = CW < 760 ? 50 : 32; rcam.updateProjectionMatrix();
  }
  rSize(); addEventListener('resize', rSize);
  const cacheRing = () => { const b = rc.getBoundingClientRect(); docTop = b.top + SCROLL(); left = b.left; };
  ScrollTrigger.addEventListener('refresh', cacheRing);
  const rot = { a: 0, t: 0, v: 0 }, tilt = { x: 0, y: 0 };
  let on = false, dragging = false, dragX = 0, dragMoved = 0, hovered = null, over = false, rayTick = 0, introDone = false;
  watch(rc, v => {
    on = v;
    if (v && !introDone) { introDone = true; gsap.fromTo(intro, { v: 0 }, { v: 1, duration: 2.8, ease: 'power3.out' }); gsap.fromTo(rot, { t: rot.t - 1.1 }, { t: rot.t, duration: 2.8, ease: 'power3.out' }); }
  }, '0px');
  rc.addEventListener('pointerenter', () => { over = true; if (FINE) setCursor(null, 'Drag'); });
  rc.addEventListener('pointerleave', () => { over = false; setHover(null); if (FINE) setCursor(null); });
  rc.addEventListener('pointerdown', e => { dragging = true; dragX = e.clientX; dragMoved = 0; });
  addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - dragX; dragX = e.clientX; dragMoved += Math.abs(dx); rot.t -= dx * .004; rot.v = -dx * .004; }, { passive: true });
  addEventListener('pointerup', () => { if (dragging && dragMoved < 6 && hovered && FINE) openProject(hovered.userData.it.p.slug); dragging = false; });
  addEventListener('pointercancel', () => dragging = false);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function setHover(m) {
    if (m === hovered) return;
    if (hovered) gsap.to(hovered.userData.u.hov, { value: 0, duration: 1.1, ease: 'power3.out' });
    hovered = m;
    if (m) { gsap.to(m.userData.u.hov, { value: 1, duration: 1.1, ease: 'power3.out' }); showLabel(m.userData.it.p); }
    if (FINE && over) setCursor(null, m ? 'Open' : 'Drag');
  }
  let labelP = null, labelT = 0;
  function showLabel(p) {
    if (p === labelP) return; labelP = p; const el = $('#ringLabel'); el.classList.add('swap'); clearTimeout(labelT);
    labelT = setTimeout(() => { $('#rlName').textContent = p.t; $('#rlMeta').textContent = `${p.d} · ${p.loc}`; el.classList.remove('swap'); }, 260);
  }
  function frontPanel() {
    let best = null, bd = 9;
    panels.forEach(pm => { const d = ((pm.userData.th - rot.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; if (Math.abs(d) < bd) { bd = Math.abs(d); best = pm; } });
    return best;
  }
  function pick(cx, cy) {
    const top = docTop - SCROLL();
    ndc.set((cx - left) / CW * 2 - 1, -((cy - top) / CH) * 2 + 1);
    ray.setFromCamera(ndc, rcam);
    const hit = ray.intersectObjects(panels, false).find(h => h.point.z > -R * .2);
    return hit ? hit.object : null;
  }
  if (!FINE) rc.addEventListener('click', e => { if (dragMoved > 6) return; const m = pick(e.clientX, e.clientY); if (m) openProject(m.userData.it.p.slug); });
  gsap.ticker.add(() => {
    if (!on) return;
    const v = lenis.velocity || 0;
    if (!dragging) { rot.t += .0006 + v * .00015 + rot.v; rot.v *= .95; }
    rot.a += (rot.t - rot.a) * .045;
    group.rotation.y = -rot.a;
    const mx = mouse.x / innerWidth - .5, my = mouse.y / innerHeight - .5;
    tilt.x += ((FINE ? my * .06 : 0) - tilt.x) * .03; tilt.y += ((FINE ? mx * .05 : 0) - tilt.y) * .03;
    group.rotation.x = .1 + tilt.x; group.rotation.z = -.03 + tilt.y * .4;
    const mob = CW < 760;
    group.position.y = mob ? -.1 : -.45;
    rcam.position.set(0, .3, R + (mob ? 6.6 : 9.2));
    rcam.lookAt(0, -.1, 0);
    panels.forEach(pm => pm.userData.u.inn.value = clamp(0, 1, intro.v * 1.6 - (pm.userData.th / (Math.PI * 2)) * .6));
    if (FINE && over && !dragging && (++rayTick % 3 === 0)) setHover(pick(mouse.x, mouse.y));
    if (!hovered) { const f = frontPanel(); if (f) showLabel(f.userData.it.p); }
    rr.render(rs, rcam);
  });
}

/* =================================================================
   SCROLL ANIMATIONS
   ================================================================= */
function scrollAnims() {
  $$('.split').forEach(el => { if (el.closest('.hero')) return; gsap.fromTo($$('.w>span', el), { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.3, ease: 'power4.out', stagger: .05, scrollTrigger: { trigger: el, start: 'top 88%' } }); });
  $$('.up').forEach(el => gsap.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 92%' } }));
  $$('.scrub-text').forEach(el => gsap.fromTo($$('.sw2', el), { opacity: .14 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: true } }));
  $$('.count').forEach(c => { const o = { v: 0 }; gsap.fromTo(o, { v: 0 }, { v: +c.dataset.to, duration: 2.4, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 90%' }, onUpdate: () => c.textContent = Math.round(o.v) }); });
  gsap.fromTo('.stat', { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: .12, duration: 1.2, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.stats', start: 'top 86%' } });
  const fr = $('.frame-reveal');
  gsap.fromTo(fr, { clipPath: 'inset(14% 14% 14% 14%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'power3.inOut', scrollTrigger: { trigger: fr, start: 'top 82%', onEnter: () => fr.classList.add('in') } });
  gsap.fromTo('.frame-reveal img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: fr, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.contact-bg img', { yPercent: -14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
  if (!(FINE && DESK())) $$('.wcard figure img').forEach(img => gsap.fromTo(img, { scale: 1.16 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.wcap').forEach(c => gsap.fromTo(c, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 96%' } }));
  if (DESK()) {
    const cards = $$('.scard');
    cards.forEach((c, i) => { if (i === cards.length - 1) return;
      gsap.fromTo(c, { scale: 1, '--dim': 0 }, { scale: .92 + i * .012, '--dim': .62, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 18%', scrub: 1 } }); });
  } else $$('.scard').forEach(c => gsap.fromTo(c, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: c, start: 'top 90%' } }));
  $$('.step').forEach(s => ScrollTrigger.create({ trigger: s, start: 'top 62%', end: 'bottom 38%', toggleClass: 'on' }));
  const mt = $('.marquee-track'); let mx = 0, dir = 1, mOn = false;
  watch($('.marquee'), v => mOn = v);
  gsap.ticker.add(() => { if (!mOn) return; const v = lenis.velocity || 0; if (Math.abs(v) > .1) dir = v > 0 ? 1 : -1; mx -= (.35 + Math.min(Math.abs(v), 30) * .1) * dir; const w = mt.scrollWidth / 2; if (mx <= -w) mx += w; if (mx > 0) mx -= w; mt.style.transform = `translate3d(${mx}px,0,0)`; });
  const ct = $('.cl-track'); let cx = 0, cOn = false;
  watch($('.clients'), v => cOn = v);
  gsap.ticker.add(() => { if (!cOn) return; cx -= .28; const w = ct.scrollWidth / 2; if (cx <= -w) cx += w; ct.style.transform = `translate3d(${cx}px,0,0)`; });
  gsap.fromTo('.tm', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .12, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.team-grid', start: 'top 86%' } });
  gsap.fromTo('.pillar', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: .08, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.pillars', start: 'top 88%' } });
  gsap.fromTo('.mission p', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.mission', start: 'top 86%' } });
  gsap.fromTo('details', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .05, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.faq-list', start: 'top 88%' } });
  gsap.fromTo('.foot-big span,.foot-big em', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.6, stagger: .12, ease: 'power4.out', scrollTrigger: { trigger: '.foot', start: 'top 90%' } });
}

/* =================================================================
   LOADER + INTRO
   ================================================================= */
(async function boot() {
  gsap.fromTo('.loader-word span', { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.1, stagger: .045, ease: 'power4.out' });
  gsap.fromTo('.loader-mark', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' });
  const prog = { v: 0 }, PASSES = ['Clay pass', 'Light pass', 'Material pass', 'Final still'];
  const upd = () => { $('#loaderNum').textContent = Math.round(prog.v); $('#loaderBar').style.width = prog.v + '%'; $('#loaderPass').textContent = PASSES[Math.min(3, Math.floor(prog.v / 25))]; };
  const tw = gsap.to(prog, { v: 86, duration: 2.6, ease: 'power2.out', onUpdate: upd });
  const need = [document.fonts ? document.fonts.ready : 0];
  await Promise.race([Promise.all(need), new Promise(r => setTimeout(r, 6000))]);
  await new Promise(r => setTimeout(r, 300));
  tw.kill();
  await gsap.to(prog, { v: 100, duration: .5, ease: 'power2.inOut', onUpdate: upd });
  const tl = gsap.timeline();
  tl.to('.loader-inner', { y: -30, opacity: 0, duration: .7, ease: 'power3.in' })
    .to('.loader-panels i', { scaleY: 0, duration: 1.1, stagger: .07, ease: 'power4.inOut' }, '-=.2')
    .set('.loader', { display: 'none' })
    .fromTo(heroState, { build: 0 }, { build: 1, duration: 2.6, ease: 'power2.inOut' }, '-=1.2')
    .fromTo('.hero-title .w>span', { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.5, stagger: .08, ease: 'power4.out' }, '-=2.4')
    .fromTo('.h-in', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .1, ease: 'power3.out' }, '-=1.6')
    .fromTo('.nav', { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, '-=1.4');
  tl.add(() => { document.body.classList.remove('loading'); lenis.start(); scrollAnims(); ScrollTrigger.sort(); ScrollTrigger.refresh(); }, '-=1.6');
  addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
})();
