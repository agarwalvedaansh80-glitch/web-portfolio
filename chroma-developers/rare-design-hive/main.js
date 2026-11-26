import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const P = window.PROJECTS;
const BYSLUG = Object.fromEntries(P.map((p, i) => [p.slug, i]));
const pad = n => String(n).padStart(2, '0');
if (FINE) root.classList.add('fine');
$('#yr').textContent = new Date().getFullYear();

/* ---------------- theme ---------------- */
const BG = { dark: [0, 0, 0], light: [0.957, 0.949, 0.969] };
let dayTarget = 0, day = 0;
function setTheme(t) {
  root.dataset.theme = t;
  dayTarget = t === 'light' ? 1 : 0;
  const m = $('meta[name="theme-color"]'); if (m) m.content = t === 'light' ? '#f4f2f7' : '#000000';
  try { localStorage.setItem('rdh-theme', t); } catch (e) {}
}
try { const t = localStorage.getItem('rdh-theme'); if (t === 'light' || t === 'dark') { setTheme(t); day = dayTarget; } } catch (e) {}
$('#theme').addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light'));

/* ---------------- smooth scroll ---------------- */
const lenis = new Lenis({ lerp: 0.1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
window.scrollTo(0, 0);

document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]');
  if (o) { e.preventDefault(); openProject(o.dataset.open); return; }
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'); e.preventDefault(); closeMenu();
  if (a.closest('.pv')) closeProject();
  if (id === '#top' || id === '#') return lenis.scrollTo(0, { duration: 1.6 });
  const t = $(id); if (t) lenis.scrollTo(t, { duration: 1.6 });
});

/* ---------------- nav + menu ---------------- */
const nav = $('#nav');
let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  nav.classList.toggle('solid', scroll > 40);
  if (!document.body.classList.contains('menu-open')) nav.classList.toggle('hide', scroll > lastY + 2 && scroll > 300);
  if (scroll < lastY - 2) nav.classList.remove('hide');
  lastY = scroll;
});
const burger = $('#burger');
function closeMenu() { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); $('#menu').setAttribute('aria-hidden', 'true'); }
burger.addEventListener('click', () => {
  const open = !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open)); $('#menu').setAttribute('aria-hidden', String(!open));
  open ? lenis.stop() : lenis.start();
});
$$('#menu a').forEach(a => a.addEventListener('click', () => lenis.start()));

/* ---------------- cursor ---------------- */
const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
const cur = $('#cursor'), cDot = $('.c-dot'), cRing = $('.c-ring'), cLab = $('#cLabel');
const ringP = { ...mouse };
let cursorLabel = '';
addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; root.classList.remove('no-cursor'); }, { passive: true });
root.addEventListener('mouseleave', () => root.classList.add('no-cursor'));
function setCursor(label, hover) {
  if (!FINE) return;
  cur.classList.toggle('hover', !!hover);
  if (label !== cursorLabel) { cursorLabel = label || ''; cLab.textContent = cursorLabel; cur.classList.toggle('labeled', !!cursorLabel); }
}
if (FINE) {
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('a,button,summary,select,input,textarea,[data-cursor]');
    if (t) setCursor(t.dataset.cursor || (t.closest('.card') ? 'View' : ''), true);
  });
  document.addEventListener('pointerout', e => {
    const t = e.target.closest('a,button,summary,select,input,textarea,[data-cursor]');
    if (t && !t.contains(e.relatedTarget)) setCursor('', false);
  });
}
function cursorTick() {
  if (!FINE) return;
  ringP.x += (mouse.x - ringP.x) * 0.22; ringP.y += (mouse.y - ringP.y) * 0.22;
  cDot.style.transform = `translate3d(${mouse.x}px,${mouse.y}px,0)`;
  cRing.style.transform = `translate3d(${ringP.x}px,${ringP.y}px,0)`;
  if (cursorLabel) cLab.style.transform = `translate3d(${ringP.x + 26}px,${ringP.y - 7}px,0)`;
}

/* ---------------- shared ---------------- */
const loader = new THREE.TextureLoader();
function loadTex(url) {
  return new Promise(res => loader.load(url, t => { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; res(t); }, undefined, () => res(null)));
}
function makeRenderer(canvas, dprCap, antialias) {
  const r = new THREE.WebGLRenderer({ canvas, antialias, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  r.outputColorSpace = THREE.LinearSRGBColorSpace;
  r.setClearColor(0x000000, 0);
  return r;
}
const visible = new Map();
const io = new IntersectionObserver(es => es.forEach(e => visible.set(e.target, e.isIntersecting)), { rootMargin: '80px 0px' });
const lerp = (a, b, t) => a + (b - a) * t;
let glOK = true;
try { const c = document.createElement('canvas'); glOK = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { glOK = false; }
if (!glOK) root.classList.add('no-gl');

/* =========================================================
   1. HERO HONEYCOMB
   ========================================================= */
const HEX_R = 0.47, HEX_H = 0.075;
function hexPrism() {
  const pos = [], nor = [], face = [];
  const v = k => { const a = Math.PI / 6 + k * Math.PI / 3; return [Math.cos(a) * HEX_R, Math.sin(a) * HEX_R]; };
  for (let k = 0; k < 6; k++) {
    const [x0, y0] = v(k), [x1, y1] = v(k + 1);
    pos.push(0, 0, HEX_H, x0, y0, HEX_H, x1, y1, HEX_H); nor.push(0, 0, 1, 0, 0, 1, 0, 0, 1); face.push(1, 1, 1);
    pos.push(0, 0, -HEX_H, x1, y1, -HEX_H, x0, y0, -HEX_H); nor.push(0, 0, -1, 0, 0, -1, 0, 0, -1); face.push(-1, -1, -1);
    const nx = (x0 + x1) / 2, ny = (y0 + y1) / 2, l = Math.hypot(nx, ny);
    const n = [nx / l, ny / l, 0];
    pos.push(x0, y0, -HEX_H, x1, y1, -HEX_H, x1, y1, HEX_H, x0, y0, -HEX_H, x1, y1, HEX_H, x0, y0, HEX_H);
    for (let i = 0; i < 6; i++) { nor.push(...n); face.push(0); }
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), face: new Float32Array(face) };
}

const hiveVert = /* glsl */`
attribute float aFace; attribute vec4 aCell; attribute vec2 aTile; attribute float aFlip;
uniform float uTime, uIntro, uScatter, uHover;
uniform vec2 uMouse;
varying vec2 vLocal; varying float vFace; varying vec3 vN; varying float vLift; varying vec2 vTile; varying float vDepth; varying float vFlipK;
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s, 0.,1.,0., s,0.,c);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,s, 0.,-s,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0., -s,c,0., 0.,0.,1.);}
void main(){
  vec2 c = aCell.xy; float rnd = aCell.z; float ring = aCell.w;
  float d = distance(c, uMouse);
  float near = exp(-d*d*.7) * uHover;
  float wave = sin(dot(c, vec2(.55,.35))*1.3 - uTime*.3);
  float lift = near*.5 + wave*.03 + sin(uTime*.22 + rnd*6.283)*.018;
  float flip = aFlip;
  float t0 = clamp(uIntro*1.9 - ring*.55 - rnd*.3, 0., 1.);
  float ia = 1. - pow(1. - t0, 3.);
  float sc = clamp(uScatter*1.35 - rnd*.35, 0., 1.); sc = sc*sc*(3.-2.*sc);
  vec2 dirm = c - uMouse;
  float tx = -dirm.y*near*.16, ty = dirm.x*near*.16;
  float ang = flip*3.14159265 + (1.-ia)*(rnd-.5)*7. + sc*(rnd*5.+1.5);
  mat3 R = rotZ((1.-ia)*(rnd-.5)*3. + sc*(rnd-.5)*3.) * rotX(tx + (1.-ia)*rnd*2.5 + sc*(fract(rnd*9.1)-.5)*5.) * rotY(ang + ty);
  vec3 p = R * position * mix(.25, 1., ia);
  vec3 n = R * normal;
  vec3 center = vec3(c, lift);
  vec3 from = vec3(c*1.8 + (vec2(rnd, fract(rnd*13.7))-.5)*5., -16. - rnd*14.);
  center = mix(from, center, ia);
  vec2 od = normalize(c + vec2(.001));
  vec3 to = vec3(c + od*(2.5 + rnd*7.), 3. + rnd*10.);
  center = mix(center, to, sc);
  vec4 mv = modelViewMatrix * vec4(center + p, 1.);
  gl_Position = projectionMatrix * mv;
  vLocal = position.xy; vFace = aFace; vN = normalize(normalMatrix * n);
  vLift = near; vTile = aTile; vDepth = -mv.z; vFlipK = abs(sin(flip*3.14159265));
}`;
const hiveFrag = /* glsl */`
precision highp float;
uniform sampler2D uAtlas; uniform float uDay; uniform float uScatter;
varying vec2 vLocal; varying float vFace; varying vec3 vN; varying float vLift; varying vec2 vTile; varying float vDepth; varying float vFlipK;
vec2 atl(float t, vec2 uv){ t = floor(t + .5); float row = floor((t + .5)/6.); float col = t - row*6.; uv = uv*.94 + .03; return vec2((col + uv.x)/6., 1. - (row + 1. - uv.y)/6.); }
void main(){
  vec3 v1 = vec3(.608,.235,.961), v3 = vec3(.949,.635,.886);
  vec3 col;
  vec2 uv = vLocal/(2.*${HEX_R.toFixed(3)}) + .5;
  vec2 q = abs(vLocal);
  float hd = max(q.x, q.x*.5 + q.y*.8660254) - ${(HEX_R * 0.8660254).toFixed(4)};
  vec3 L = normalize(vec3(.35,.55,.85));
  float lam = max(dot(vN, L), 0.);
  if (abs(vFace) > .5) {
    vec2 tuv = vFace > .5 ? uv : vec2(1. - uv.x, uv.y);
    col = texture2D(uAtlas, atl(vFace > .5 ? vTile.x : vTile.y, tuv)).rgb;
    float vig = smoothstep(.0, -.22, hd);
    col *= mix(.7, 1., vig) * (.84 + .24*vLift) * (.86 + .14*lam);
    float edge = smoothstep(-.035, -.004, hd);
    vec3 g = mix(v1, v3, uv.x*.8 + uv.y*.2);
    col = mix(col, g, edge*(.45 + .55*vLift));
    col += g * vFlipK * .12;
  } else {
    vec3 base = mix(vec3(.05,.03,.08), vec3(.80,.76,.86), uDay);
    float rim = pow(1. - abs(vN.z), 2.);
    col = base*(.45 + .55*lam) + mix(v1, v3, .5 + .5*vN.x)*rim*.55;
  }
  float fog = smoothstep(14., 30., vDepth);
  float a = 1. - fog;
  gl_FragColor = vec4(col*a, a);
}`;

const hive = { ok: false };
async function initHive() {
  const canvas = $('#hive');
  const renderer = makeRenderer(canvas, 1.5, true);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  camera.position.set(0, 0, 13);
  const group = new THREE.Group(); scene.add(group);

  // cells: super hex of radius 3 + loose outer cells
  const cells = [];
  const S = 0.5, W = Math.sqrt(3) * S;
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) {
    const s = -q - r, dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
    if (dist > 4) continue;
    const rr = rand();
    if (dist === 4 && rr > 0.42) continue;
    cells.push({ q, r, dist, x: W * (q + r / 2), y: -1.5 * S * r, rnd: rand() });
  }
  cells.sort((a, b) => a.dist - b.dist || Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
  cells.forEach((c, i) => { c.front = i % 18; c.back = 18 + ((i * 5 + 7) % 18); });
  const N = cells.length;
  const g = hexPrism();
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(g.pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(g.nor, 3));
  geo.setAttribute('aFace', new THREE.BufferAttribute(g.face, 1));
  const aCell = new Float32Array(N * 4), aTile = new Float32Array(N * 2);
  cells.forEach((c, i) => { aCell.set([c.x, c.y, c.rnd, c.dist / 4], i * 4); aTile.set([c.front, c.back], i * 2); });
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(aCell, 4));
  geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(aTile, 2));
  const aFlip = new Float32Array(N), flipAttr = new THREE.InstancedBufferAttribute(aFlip, 1);
  flipAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aFlip', flipAttr);
  geo.instanceCount = N;
  cells.forEach(c => { c.face = 0; c.anim = null; c.cool = 0; });
  const FLIP_DUR = 1.45;
  const easeIO = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  function flipCell(i, t) {
    const c = cells[i]; if (!c || c.anim || t < c.cool) return false;
    c.anim = { from: c.face, to: 1 - c.face, t0: t }; c.face = 1 - c.face; c.cool = t + FLIP_DUR + 1.5; return true;
  }
  let nextAuto = 4, hoverSince = 0, hoverFlipped = true;
  const atlas = await loadTex('a/atlas.webp');
  hive.atlas = atlas;
  const uni = {
    uTime: { value: 0 }, uIntro: { value: 0 }, uScatter: { value: 0 }, uHover: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) }, uAtlas: { value: atlas }, uDay: { value: day }
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: hiveVert, fragmentShader: hiveFrag, uniforms: uni, transparent: true, premultipliedAlpha: true });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; group.add(mesh);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hit = new THREE.Vector3(), nrm = new THREE.Vector3();
  const target = new THREE.Vector2(0, 0);
  let size = { w: 1, h: 1 }, baseRot = { x: -0.5, y: -0.22, z: 0.1 }, hovering = false, lastMove = -10, hoverCell = -1;

  function layout() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    size = { w, h };
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), visW = visH * camera.aspect;
    if (camera.aspect > 1.05) {
      group.position.set(visW * 0.25, 0.1, 0);
      group.scale.setScalar(Math.min(1, visH / 6.9, visW * 0.56 / 7.2));
      baseRot = { x: -0.52, y: -0.26, z: 0.1 };
    } else {
      group.position.set(0, visH * 0.25, 0);
      group.scale.setScalar(Math.min(0.9, visW / 5.9));
      baseRot = { x: -0.55, y: 0, z: 0.12 };
    }
  }
  function toLocal(cx, cy) {
    ndc.set(cx / size.w * 2 - 1, -(cy / size.h) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    group.updateMatrixWorld();
    nrm.set(0, 0, 1).applyQuaternion(group.quaternion);
    plane.setFromNormalAndCoplanarPoint(nrm, group.position);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return group.worldToLocal(hit.clone());
  }
  function cellAt(lx, ly) {
    let best = -1, bd = 1e9;
    for (let i = 0; i < N; i++) { const dx = cells[i].x - lx, dy = cells[i].y - ly, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    return bd < 0.2 ? best : -1;
  }
  function visibleProject(i) { const c = cells[i]; return c.face === 0 ? c.front : c.back - 18; }
  const lab = { name: $('#clName'), place: $('#clPlace') };
  let labelIdx = 0;
  function setLabel(pi) {
    if (pi === labelIdx) return; labelIdx = pi;
    gsap.fromTo([lab.name, lab.place], { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power3.out', overwrite: true, clearProps: 'transform' });
    lab.name.textContent = P[pi].name; lab.place.textContent = P[pi].place;
  }
  const hero = $('#hero');
  if (FINE) {
    hero.addEventListener('pointermove', e => {
      if (uni.uScatter.value > 0.3) return;
      const l = toLocal(e.clientX, e.clientY); if (!l) return;
      target.set(l.x, l.y); hovering = true; lastMove = uni.uTime.value;
      const ci = cellAt(l.x, l.y);
      if (ci !== hoverCell) {
        hoverCell = ci; hoverSince = uni.uTime.value; hoverFlipped = false;
        if (ci >= 0) setLabel(visibleProject(ci));
        const overUI = e.target.closest('a,button');
        if (!overUI) setCursor(ci >= 0 ? 'Open' : '', ci >= 0);
      }
    });
    hero.addEventListener('pointerleave', () => { hovering = false; hoverCell = -1; setCursor('', false); });
  }
  canvas.addEventListener('click', e => {
    const l = toLocal(e.clientX, e.clientY); if (!l) return;
    const ci = cellAt(l.x, l.y); if (ci < 0) return;
    target.set(l.x, l.y); uni.uHover.value = 1; lastMove = uni.uTime.value;
    const pi = visibleProject(ci); setLabel(pi);
    setTimeout(() => openProject(P[pi].slug), FINE ? 0 : 320);
  });

  layout();
  hive.ok = true;
  hive.layout = layout;
  hive.uni = uni;
  hive.canvas = canvas;
  io.observe(hero);
  let wanderLabelT = 0;
  hive.scatterTarget = 0;
  hive.busy = () => uni.uIntro.value < 1 || hive.scatterTarget < 0.999 || Math.abs(uni.uScatter.value - hive.scatterTarget) > 0.0005;
  hive.render = (t, dt) => {
    uni.uTime.value = t;
    uni.uDay.value = day;
    // scroll scatter: eased toward the scrubbed value
    const ds = hive.scatterTarget - uni.uScatter.value;
    uni.uScatter.value = Math.abs(ds) < 0.0005 ? hive.scatterTarget : uni.uScatter.value + ds * 0.06;
    if (uni.uScatter.value > 0.3 && hoverCell >= 0) { hoverCell = -1; setCursor('', false); }
    // timed flips
    let dirty = false, animating = false;
    for (let i = 0; i < N; i++) {
      const c = cells[i]; if (!c.anim) continue;
      const k = Math.min(1, (t - c.anim.t0) / FLIP_DUR);
      aFlip[i] = c.anim.from + (c.anim.to - c.anim.from) * easeIO(k); dirty = true;
      if (k >= 1) c.anim = null; else animating = true;
    }
    if (dirty) flipAttr.needsUpdate = true;
    const calm = uni.uIntro.value > 0.99 && uni.uScatter.value < 0.05;
    if (calm && t > nextAuto) {
      if (!animating) { const i = Math.floor(Math.random() * N); flipCell(i, t); nextAuto = t + 3 + Math.random() * 2; }
      else nextAuto = t + 0.6;
    }
    if (calm && hoverCell >= 0 && !hoverFlipped && t - hoverSince > 0.35) {
      hoverFlipped = true;
      if (flipCell(hoverCell, t)) setTimeout(() => { if (hoverCell >= 0) setLabel(visibleProject(hoverCell)); }, FLIP_DUR * 500);
    }
    const idle = !hovering || t - lastMove > 5;
    if (idle) {
      target.set(Math.sin(t * 0.07) * 2.2, Math.cos(t * 0.09) * 1.7);
      uni.uHover.value = lerp(uni.uHover.value, 0.6, 0.01);
      if (t - wanderLabelT > 5 && uni.uIntro.value > 0.99) {
        wanderLabelT = t; const ci = cellAt(target.x, target.y);
        if (ci >= 0) setLabel(visibleProject(ci));
      }
    } else uni.uHover.value = lerp(uni.uHover.value, 1, 0.025);
    uni.uMouse.value.lerp(target, idle ? 0.01 : 0.035);
    const mx = FINE ? (mouse.x / size.w - 0.5) : 0, my = FINE ? (mouse.y / size.h - 0.5) : 0;
    group.rotation.x = lerp(group.rotation.x, baseRot.x + my * 0.08 + uni.uScatter.value * 0.35, 0.03);
    group.rotation.y = lerp(group.rotation.y, baseRot.y + mx * 0.1, 0.03);
    group.rotation.z = baseRot.z + Math.sin(t * 0.05) * 0.03;
    camera.position.z = 13 - uni.uScatter.value * 4;
    renderer.render(scene, camera);
  };
}

/* =========================================================
   2. SHOWCASE: hexagonal mosaic transitions
   ========================================================= */
const mosaicFrag = /* glsl */`
precision highp float;
uniform sampler2D uA, uB; uniform float uAspA, uAspB, uP, uTime, uCell;
uniform vec2 uRes;
varying vec2 vUv;
vec2 cover(vec2 uv, float ia){ float sa = uRes.x/uRes.y; vec2 s = sa > ia ? vec2(1., ia/sa) : vec2(sa/ia, 1.); return (uv - .5)*s + .5; }
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float hexD(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1., 1.7320508))), p.x); }
vec4 hexC(vec2 p){ vec2 r = vec2(1., 1.7320508), h = r*.5; vec2 a = mod(p, r) - h, b = mod(p - h, r) - h; vec2 gv = dot(a,a) < dot(b,b) ? a : b; return vec4(gv, p - gv); }
vec3 samp(sampler2D t, float asp, vec2 uv){
  return texture2D(t, clamp(cover(uv, asp), .0002, .9998)).rgb;
}
void main(){
  vec2 px = vUv*uRes;
  vec4 hc = hexC(px/uCell);
  vec2 gv = hc.xy, id = hc.zw;
  vec2 cn = id*uCell/uRes;
  float rnd = h21(id);
  float delay = clamp(cn.x*.55 + (1. - cn.y)*.2 + rnd*.25, 0., 1.);
  float lp = smoothstep(delay*.42, delay*.42 + .58, uP);
  float s = abs(cos(lp*3.14159265));
  s = max(s, .0001);
  vec2 lg = vec2(gv.x/s, gv.y);
  float hd = hexD(lg);
  vec2 suv = (id + lg)*uCell/uRes;
  float wob = sin(lp*3.14159265);
  suv += vec2(sin(suv.y*7. + uTime*.3), cos(suv.x*6. - uTime*.25))*.004*wob;
  vec3 col = lp < .5 ? samp(uA, uAspA, suv) : samp(uB, uAspB, suv);
  col *= .72 + .28*s;
  vec3 g = mix(vec3(.608,.235,.961), vec3(.949,.635,.886), cn.x);
  col += g*smoothstep(.42, .5, hd)*wob*.55;
  float gap = step(.5, hd)*step(.001, wob);
  col = mix(col, g*.16*wob, gap);
  gl_FragColor = vec4(col, 1.);
}`;

const mosaic = { ok: false, want: 0 };
const SHOW_SRC = window.SHOWCASE.map(x => `s/${x.slug}.webp`);
const shImg = $('#shImg');
function showAlt(k) { const p = P[BYSLUG[window.SHOWCASE[k].slug]]; return `${p.name}, ${p.place}`; }
async function initMosaic() {
  const canvas = $('#mosaic');
  const renderer = makeRenderer(canvas, 2, false);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uni = {
    uA: { value: null }, uB: { value: null }, uAspA: { value: 1.78 }, uAspB: { value: 1.78 }, uP: { value: 0 },
    uTime: { value: 0 }, uCell: { value: 90 }, uRes: { value: new THREE.Vector2(1, 1) }
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: mosaicFrag, uniforms: uni });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const imgs = await Promise.all(SHOW_SRC.map(src => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; })));
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const texs = imgs.map(im => {
    if (!im) return null;
    const t = new THREE.Texture(im);
    t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = maxAniso; t.needsUpdate = true;
    return t;
  });
  texs.forEach(t => { if (t) renderer.initTexture(t); });
  const asp = imgs.map(im => im ? im.naturalWidth / im.naturalHeight : 1.78);
  function layout() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    const pr = renderer.getPixelRatio();
    uni.uRes.value.set(w * pr, h * pr);
    uni.uCell.value = Math.max(46, Math.min(96, w / 15)) * pr;
  }
  layout();
  mosaic.layout = layout;
  let cur = 0, anim = null, fadeT = null;
  mosaic.active = false;
  // resting state is the sharp <img>; WebGL only draws while the hex tiles turn
  function start() {
    if (anim || mosaic.want === cur || !texs[cur] || !texs[mosaic.want]) {
      if (!anim && mosaic.want !== cur) { cur = mosaic.want; shImg.src = SHOW_SRC[cur]; shImg.alt = showAlt(cur); }
      return;
    }
    const to = mosaic.want;
    clearTimeout(fadeT);
    uni.uA.value = texs[cur]; uni.uB.value = texs[to]; uni.uAspA.value = asp[cur]; uni.uAspB.value = asp[to]; uni.uP.value = 0;
    mosaic.active = true;
    mosaic.render(performance.now() / 1000);
    canvas.style.transition = 'none'; canvas.style.opacity = 1;
    anim = gsap.to(uni.uP, { value: 1, duration: REDUCED ? 0.01 : 1.5, ease: 'sine.inOut', onComplete: () => {
      cur = to; anim = null;
      if (mosaic.want !== cur) return start();
      shImg.src = SHOW_SRC[cur]; shImg.alt = showAlt(cur);
      const done = () => requestAnimationFrame(() => {
        if (anim) return;
        canvas.style.transition = 'opacity .5s ease'; canvas.style.opacity = 0;
        fadeT = setTimeout(() => { if (!anim) mosaic.active = false; }, 560);
      });
      shImg.decode ? shImg.decode().then(done, done) : done();
    } });
  }
  mosaic.go = k => { mosaic.want = k; start(); };
  mosaic.render = t => { uni.uTime.value = t; renderer.render(scene, camera); };
  mosaic.ok = true;
  io.observe($('#show'));
  start();
}

/* =========================================================
   3. PROCESS: flight through a hexagonal hive
   ========================================================= */
const tunnel = { ok: false };
function initTunnel(atlas) {
  const canvas = $('#tunnel');
  const renderer = makeRenderer(canvas, 1.5, true);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 4, 34);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 60);
  const RINGS = 44, GAP = 2.4, RAD = 3.3;
  const ringPos = [], ringCol = [], latPos = [], latCol = [];
  const cA = new THREE.Color('#9b3cf5'), cB = new THREE.Color('#f2a2e2'), tmp = new THREE.Color();
  const hv = (k, rot) => { const a = Math.PI / 6 + k * Math.PI / 3 + rot; return [Math.cos(a) * RAD, Math.sin(a) * RAD]; };
  for (let i = 0; i < RINGS; i++) {
    const z = -i * GAP, rot = i * 0.045;
    tmp.copy(cA).lerp(cB, (Math.sin(i * 0.35) + 1) / 2);
    for (let k = 0; k < 6; k++) {
      const [x0, y0] = hv(k, rot), [x1, y1] = hv(k + 1, rot);
      ringPos.push(x0, y0, z, x1, y1, z); ringCol.push(tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b);
      if (i < RINGS - 1) {
        const [x2, y2] = hv(k, (i + 1) * 0.045);
        latPos.push(x0, y0, z, x2, y2, z - GAP); latCol.push(tmp.r, tmp.g, tmp.b, tmp.r * .6, tmp.g * .6, tmp.b * .6);
      }
    }
  }
  const mkLines = (p, c, op) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: op });
    const l = new THREE.LineSegments(g, m); scene.add(l); return m;
  };
  const ringMat = mkLines(ringPos, ringCol, 0.95), latMat = mkLines(latPos, latCol, 0.35);
  // dust
  const dp = []; let sd = 3; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 700; i++) { const a = rr() * Math.PI * 2, r = rr() * RAD * 0.95; dp.push(Math.cos(a) * r, Math.sin(a) * r, -rr() * RINGS * GAP); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  const dc = document.createElement('canvas'); dc.width = dc.height = 32;
  const dx = dc.getContext('2d'), grd = dx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  dx.fillStyle = grd; dx.fillRect(0, 0, 32, 32);
  const dustMat = new THREE.PointsMaterial({ color: 0xd9a8f0, size: 0.06, map: new THREE.CanvasTexture(dc), transparent: true, opacity: 0.8, depthWrite: false });
  scene.add(new THREE.Points(dg, dustMat));
  // render panels on the walls
  const panelMat = new THREE.ShaderMaterial({
    uniforms: { uAtlas: { value: atlas }, fogColor: { value: new THREE.Color(0, 0, 0) }, fogNear: { value: 4 }, fogFar: { value: 34 } },
    vertexShader: 'attribute float aTile; varying vec2 vL; varying float vT; varying float vD; void main(){ vL = position.xy; vT = aTile; vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix*mv; }',
    fragmentShader: `precision highp float; uniform sampler2D uAtlas; uniform vec3 fogColor; uniform float fogNear, fogFar; varying vec2 vL; varying float vT; varying float vD;
      void main(){ vec2 uv = vL/2.2 + .5; float t = floor(vT + .5); float row = floor((t + .5)/6.); float col = t - row*6.; uv = uv*.94 + .03;
        vec3 c = texture2D(uAtlas, vec2((col + uv.x)/6., 1. - (row + 1. - uv.y)/6.)).rgb;
        vec2 q = abs(vL); float hd = max(q.x, q.x*.5 + q.y*.866) - .9526;
        c = mix(c, vec3(.81,.42,.93), smoothstep(-.05, -.01, hd));
        c = mix(c, fogColor, smoothstep(fogNear, fogFar, vD)); gl_FragColor = vec4(c, 1.); }`
  });
  for (let i = 0; i < 14; i++) {
    const g = new THREE.CircleGeometry(1.1, 6, Math.PI / 6);
    const tiles = new Float32Array(g.attributes.position.count).fill(i % 18);
    g.setAttribute('aTile', new THREE.BufferAttribute(tiles, 1));
    const m = new THREE.Mesh(g, panelMat);
    const side = i % 2 ? 1 : -1, z = -6 - i * 6.2;
    const ang = side > 0 ? 0.25 : Math.PI - 0.25 + (i % 3) * 0.3;
    m.position.set(Math.cos(ang) * 2.15, Math.sin(ang) * 1.5 - 0.3, z);
    m.rotation.y = -side * 0.75; m.rotation.z = (i % 4) * 0.08;
    scene.add(m);
  }
  function layout() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = camera.aspect < 1 ? 78 : 60; camera.updateProjectionMatrix();
  }
  layout();
  tunnel.layout = layout; tunnel.progress = 0;
  let cz = 4;
  const fogC = new THREE.Color();
  tunnel.render = t => {
    const p = tunnel.progress;
    cz = lerp(cz, 4 - p * (RINGS - 12) * GAP, 0.05);
    camera.position.set(Math.sin(p * 4 + t * 0.08) * 0.3, Math.cos(p * 3 + t * 0.07) * 0.22, cz);
    camera.rotation.z = p * 0.7 + Math.sin(t * 0.06) * 0.03;
    fogC.setRGB(lerp(BG.dark[0], BG.light[0], day), lerp(BG.dark[1], BG.light[1], day), lerp(BG.dark[2], BG.light[2], day));
    scene.fog.color.copy(fogC); panelMat.uniforms.fogColor.value.copy(fogC);
    ringMat.opacity = 0.95; latMat.opacity = lerp(0.35, 0.5, day);
    dustMat.color.setRGB(lerp(.85, .48, day), lerp(.66, .2, day), lerp(.94, .7, day));
    renderer.render(scene, camera);
  };
  tunnel.ok = true;
  io.observe($('#process'));
}

/* =========================================================
   PAGE: work grid, project view, films, form
   ========================================================= */
const grid = $('#grid');
grid.innerHTML = P.map((p, i) => `
  <a class="card" href="#work" data-open="${p.slug}" data-cats="${p.cats.join(' ')}" aria-label="${p.name}, ${p.place}">
    <div class="card-media"><img class="lz" src="t/${p.slug}-01.webp" srcset="t/${p.slug}-01.webp 720w, img/${p.slug}-01.webp 1280w" sizes="(max-width:760px) 92vw, (max-width:1100px) 46vw, 31vw" alt="${p.name}, ${p.type.toLowerCase()}" loading="lazy" decoding="async" width="720" height="405"><span class="open">View project</span></div>
    <div class="card-body"><h3 class="card-name">${p.name}</h3><span class="card-n">${pad(i + 1)}</span></div>
    <p class="card-place">${p.place}</p><p class="card-type">${p.type}</p>
  </a>`).join('');
$$('.card img').forEach(im => { const f = () => im.classList.remove('lz'); im.complete ? f() : im.addEventListener('load', f, { once: true }); });
const counts = { all: P.length };
P.forEach(p => p.cats.forEach(c => counts[c] = (counts[c] || 0) + 1));
$$('.filters button').forEach(b => {
  b.querySelector('sup').textContent = counts[b.dataset.f] || 0;
  b.addEventListener('click', () => {
    $$('.filters button').forEach(x => x.classList.toggle('on', x === b));
    const f = b.dataset.f;
    const shown = [];
    $$('.card').forEach(c => { const on = f === 'all' || c.dataset.cats.split(' ').includes(f); c.classList.toggle('off', !on); if (on) shown.push(c); });
    gsap.fromTo(shown, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.04, ease: 'power3.out', clearProps: 'opacity,transform' });
    ScrollTrigger.refresh();
  });
});

/* project view */
const pv = $('#pv'); let pvIdx = 0, pvReturn = null;
function setMain(slug, k) {
  const im = $('#pvMain');
  im.style.opacity = 0;
  const f = `${slug}-${pad(k + 1)}.webp`;
  im.onload = im.onerror = () => { im.style.opacity = 1; };
  im.sizes = '(max-width:1360px) 92vw, 1250px';
  im.srcset = `img/${f} 1280w, xl/${f} 2200w`;
  im.src = `img/${f}`;
  im.alt = `${P[pvIdx].name}, image ${k + 1}`;
  $$('#pvThumbs button').forEach((b, i) => b.classList.toggle('on', i === k));
}
function fillProject(i) {
  pvIdx = (i + P.length) % P.length; const p = P[pvIdx];
  $('#pvIdx').textContent = `${pad(pvIdx + 1)} of ${P.length}`;
  $('#pvName').textContent = p.name; $('#pvClient').textContent = p.client; $('#pvPlace').textContent = p.place; $('#pvType').textContent = p.type; $('#pvText').textContent = p.text;
  $('#pvThumbs').innerHTML = Array.from({ length: p.n }, (_, k) => `<button aria-label="Show image ${k + 1}"><img src="t/${p.slug}-${pad(k + 1)}.webp" alt="" loading="lazy"></button>`).join('');
  $$('#pvThumbs button').forEach((b, k) => b.addEventListener('click', () => setMain(p.slug, k)));
  setMain(p.slug, 0);
  pv.scrollTop = 0;
}
function openProject(slug) {
  const i = BYSLUG[slug]; if (i == null) return;
  pvReturn = document.activeElement;
  fillProject(i);
  pv.classList.add('open'); pv.setAttribute('aria-hidden', 'false');
  lenis.stop();
  setTimeout(() => $('#pvClose').focus({ preventScroll: true }), 50);
}
function closeProject() {
  if (!pv.classList.contains('open')) return;
  pv.classList.remove('open'); pv.setAttribute('aria-hidden', 'true');
  lenis.start();
  if (pvReturn && pvReturn.focus) pvReturn.focus({ preventScroll: true });
}
window.openProject = openProject;
$('#pvClose').addEventListener('click', closeProject);
$('#pvPrev').addEventListener('click', () => fillProject(pvIdx - 1));
$('#pvNext').addEventListener('click', () => fillProject(pvIdx + 1));
addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeProject(); closeMenu(); lenis.start(); }
  if (pv.classList.contains('open') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const bs = $$('#pvThumbs button'); const cur = bs.findIndex(b => b.classList.contains('on'));
    const n = (cur + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length; setMain(P[pvIdx].slug, n);
  }
});

/* films */
const vio = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; const pr = v.play(); if (pr) pr.catch(() => {}); }
  else if (v.src) v.pause();
}), { threshold: 0.25 });
$$('.clip video').forEach(v => vio.observe(v));

/* consultation form */
$('#form').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, err = $('#formErr');
  const name = f.name.value.trim(), phone = f.phone.value.trim(), type = f.type.value, msg = f.msg.value.trim();
  $$('.fld', f).forEach(x => x.classList.remove('bad'));
  const miss = [];
  if (!name) { miss.push('your name'); f.name.closest('.fld').classList.add('bad'); }
  if (phone.replace(/\D/g, '').length < 7) { miss.push('a phone number'); f.phone.closest('.fld').classList.add('bad'); }
  if (!type) { miss.push('a project type'); f.type.closest('.fld').classList.add('bad'); }
  if (miss.length) { err.textContent = `Please add ${miss.join(', ')} so we can reply.`; return; }
  err.textContent = '';
  let text = `Hello RARE Design Hive, I would like to book a creative consultation.\nName: ${name}\nPhone: ${phone}\nProject type: ${type}`;
  if (msg) text += `\nDetails: ${msg}`;
  const url = `https://wa.me/971526187022?text=${encodeURIComponent(text)}`;
  const w = window.open(url, '_blank', 'noopener');
  if (!w) location.href = url;
});

/* =========================================================
   SCROLL CHOREOGRAPHY (pins first)
   ========================================================= */
let heroST, showST, procST;
function buildScroll() {
  // hero pin: honeycomb scatters, camera dollies in
  const htl = gsap.timeline({ scrollTrigger: {
    trigger: '#hero', start: 'top top', end: '+=120%', pin: true, scrub: 1,
    onUpdate: s => { hive.scatterTarget = s.progress; }
  } });
  htl.fromTo('.hero-copy', { y: 0, opacity: 1 }, { y: -90, opacity: 0, ease: 'none', duration: 0.6 }, 0)
     .fromTo('.hero-foot', { opacity: 1 }, { opacity: 0, ease: 'none', duration: 0.3 }, 0)
     .to({}, { duration: 0.4 });
  heroST = htl.scrollTrigger;

  // showcase pin
  const shNum = $('#shNum'), shName = $('#shName'), shPlace = $('#shPlace'), shClient = $('#shClient');
  const dots = $$('#shDots i');
  let shCur = -1;
  const setShow = k => {
    if (k === shCur) return; shCur = k;
    const p = P[BYSLUG[window.SHOWCASE[k].slug]];
    dots.forEach((d, i) => d.classList.toggle('on', i === k));
    shNum.textContent = pad(k + 1);
    gsap.fromTo([shPlace, shName, shClient], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'power2.out', overwrite: true, clearProps: 'transform' });
    if (mosaic.ok) mosaic.go(k); else { mosaic.want = k; if (!glOK) { shImg.src = SHOW_SRC[k]; shImg.alt = showAlt(k); } }
    shName.textContent = p.name; shPlace.textContent = p.place; shClient.textContent = `For ${p.client}`;
    $('#shOpen').onclick = () => openProject(p.slug);
  };
  setShow(0);
  showST = ScrollTrigger.create({
    trigger: '#show', start: 'top top', end: '+=360%', pin: true, scrub: true,
    onUpdate: s => setShow(Math.min(4, Math.round(s.progress * 4)))
  });

  // process pin
  const steps = $$('.step'), bar = $('#procBar');
  let stCur = -1;
  const setStep = k => {
    if (k === stCur) return;
    if (stCur >= 0) gsap.to(steps[stCur], { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in', overwrite: true });
    gsap.fromTo(steps[k], { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, delay: stCur >= 0 ? 0.15 : 0, ease: 'power3.out', overwrite: true });
    stCur = k;
  };
  setStep(0);
  procST = ScrollTrigger.create({
    trigger: '#process', start: 'top top', end: '+=300%', pin: true, scrub: 1,
    onUpdate: s => { tunnel.progress = s.progress; bar.style.transform = `scaleX(${s.progress})`; setStep(Math.min(4, Math.floor(s.progress * 5))); }
  });

  // studio scrub text
  const sc = $('#scrub');
  sc.innerHTML = sc.textContent.split(/\s+/).map(w => `<span class="sw">${w}</span>`).join(' ');
  gsap.fromTo('#scrub .sw', { opacity: 0.18 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '#scrub', start: 'top 82%', end: 'bottom 45%', scrub: true } });

  // counters
  $$('.count').forEach(el => {
    const to = +el.dataset.to, o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v) }) });
  });

  ScrollTrigger.sort();
  ScrollTrigger.refresh();
}

/* =========================================================
   BOOT
   ========================================================= */
const lnum = $('#loaderNum'), lhex = $('.loader-hex polygon');
const prog = { v: 0 };
const setProg = v => { lnum.textContent = Math.round(v); lhex.style.strokeDashoffset = 1 - v / 100; };
const progTween = gsap.to(prog, { v: 82, duration: 2.2, ease: 'power2.out', onUpdate: () => setProg(prog.v) });

async function boot() {
  const fontsReady = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  if (glOK) {
    try { await initHive(); } catch (e) { console.warn('hive', e); }
  }
  await Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))]);
  progTween.kill();
  await new Promise(r => gsap.to(prog, { v: 100, duration: 0.5, ease: 'power2.inOut', onUpdate: () => setProg(prog.v), onComplete: r }));
  buildScroll();
  // intro
  const intro = gsap.timeline({ delay: 0.15 });
  intro.fromTo('.hero-title .ln>span', { yPercent: 110 }, { yPercent: 0, duration: 1.5, stagger: 0.09, ease: 'expo.out', clearProps: 'transform' }, 0.25)
       .fromTo('.hero-copy .h-in', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'power3.out', clearProps: 'opacity,transform' }, 0.6)
       .fromTo('.hero-foot>*', { opacity: 0 }, { opacity: 1, duration: 1, stagger: 0.1, clearProps: 'opacity' }, 1.1);
  if (hive.uni) intro.fromTo(hive.uni.uIntro, { value: 0 }, { value: 1, duration: REDUCED ? 0.01 : 3.4, ease: 'power2.out' }, 0);
  document.body.classList.remove('is-loading');
  $('#loader').classList.add('out');
  lenis.start();
  // secondary scenes after first paint
  if (glOK) {
    setTimeout(async () => {
      try { await initMosaic(); } catch (e) { console.warn('mosaic', e); }
      try { initTunnel(hive.atlas || await loadTex('a/atlas.webp')); } catch (e) { console.warn('tunnel', e); }
    }, 300);
  }
}
boot();

/* ---------------- frame loop ---------------- */
let last = performance.now();
const elHero = $('#hero'), elShow = $('#show'), elProc = $('#process');
gsap.ticker.add(() => {
  const now = performance.now(), t = now / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
  day = lerp(day, dayTarget, 0.08);
  cursorTick();
  if (hive.ok && visible.get(elHero) !== false && hive.busy()) hive.render(t, dt);
  if (mosaic.ok && mosaic.active && visible.get(elShow)) mosaic.render(t);
  if (tunnel.ok && visible.get(elProc)) tunnel.render(t);
});

/* ---------------- resize ---------------- */
let rw = innerWidth, rh = innerHeight, rT;
addEventListener('resize', () => {
  clearTimeout(rT);
  rT = setTimeout(() => {
    if (Math.abs(innerWidth - rw) < 2 && Math.abs(innerHeight - rh) < 140) return;
    rw = innerWidth; rh = innerHeight;
    hive.layout && hive.layout(); mosaic.layout && mosaic.layout(); tunnel.layout && tunnel.layout();
    ScrollTrigger.refresh();
  }, 160);
});
