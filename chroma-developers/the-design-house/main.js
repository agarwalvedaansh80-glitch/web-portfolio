import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
const DESK = () => VW > 900;
const CATS = window.CATS, PCS = window.PIECES;
const CAT = Object.fromEntries(CATS.map(c => [c.k, c]));
const BYID = Object.fromEntries(PCS.map(p => [p.id, p]));
const WA = '971525935616';
const waLink = m => `https://wa.me/${WA}?text=${encodeURIComponent(m)}`;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
if (FINE) document.documentElement.classList.add('fine');
$('#yr').textContent = new Date().getFullYear();
let VW = innerWidth, VH = innerHeight;
addEventListener('resize', () => { VW = innerWidth; VH = innerHeight; });

/* ---------------- smooth scroll ---------------- */
const lenis = new Lenis({ lerp: 0.08 });
let SY = window.scrollY;
lenis.on('scroll', l => { SY = l.animatedScroll; ScrollTrigger.update(); });
addEventListener('scroll', () => { SY = window.scrollY; }, { passive: true });
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a || a.dataset.open || a.dataset.cat || a.dataset.piece) return;
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
function splitChars(el) {
  const walk = n => { [...n.childNodes].forEach(c => { if (c.nodeType === 3) { const f = document.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(' ')); return; } const ws = document.createElement('span'); ws.className = 'cw'; [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; ws.appendChild(s); }); f.appendChild(ws); }); c.replaceWith(f); } else if (c.nodeType === 1) walk(c); }); };
  walk(el);
}
$$('.chars').forEach(splitChars);
$$('.scrub-text').forEach(el => splitEl(el, 'sw2'));

/* ---------------- cursor ---------------- */
const cur = $('#cursor'), dot = $('.c-dot'), ring = $('.c-ring'), lab = $('#cLabel');
const mouse = { x: VW / 2, y: VH / 2 }, rp = { ...mouse };
addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
if (FINE) {
  gsap.ticker.add(() => {
    rp.x += (mouse.x - rp.x) * .22; rp.y += (mouse.y - rp.y) * .22;
    dot.style.transform = `translate(${mouse.x}px,${mouse.y}px)`;
    ring.style.transform = `translate(${rp.x}px,${rp.y}px)`;
  });
  document.addEventListener('pointerover', e => setCursor(e.target));
}
function setCursor(el, forced) {
  const t = el && el.closest && el.closest('[data-cursor],a,button,summary,.wcard');
  cur.classList.toggle('hover', !!t || !!forced);
  const l = forced || (t && (t.getAttribute('data-cursor') || (t.classList.contains('wcard') ? 'View' : '')));
  if (l) { lab.textContent = l; cur.classList.add('label'); } else cur.classList.remove('label');
  cur.classList.toggle('inv', !!(el && el.closest && el.closest('.show,.window,.process,.contact,.m-hero')));
}

/* ---------------- magnetic (no elastic) ---------------- */
if (FINE) $$('.magnetic').forEach(b => {
  let r = null;
  b.addEventListener('pointerenter', () => { r = b.getBoundingClientRect(); });
  b.addEventListener('pointermove', e => { if (!r) return; gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .3, duration: .5, ease: 'power3.out' }); });
  b.addEventListener('pointerleave', () => { r = null; gsap.to(b, { x: 0, y: 0, duration: .8, ease: 'power3.out' }); });
});

/* ---------------- shared texture + glsl ---------------- */
const TL = new THREE.TextureLoader(), tcache = {};
function tex(url, aniso) {
  const key = url + (aniso ? '#m' : '');
  return tcache[key] || (tcache[key] = new Promise(res => TL.load(url, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    if (aniso) { t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = aniso; } else { t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; }
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

/* cached geometry, measured only on refresh/resize (never per frame) */
const measurers = [];
function measure() { measurers.forEach(f => f()); }
ScrollTrigger.addEventListener('refresh', measure);
addEventListener('load', () => ScrollTrigger.refresh());

/* =================================================================
   HERO: modular sofa configurator
   ================================================================= */
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rnd = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646); };
function heightToNormal(c, k) {
  const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data;
  const out = cnv(w, h), o = out.getContext('2d'), img = o.createImageData(w, h), d = img.data;
  const H = (x, y) => src[((((y + h) % h) * w) + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x - 1, y) - H(x + 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (dy / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
  }
  o.putImageData(img, 0, 0); return out;
}
function boucleH() {
  const S = 256, c = cnv(S, S), x = c.getContext('2d'), r = rnd(7); x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 1500; i++) {
    const px = r() * S, py = r() * S, rad = 1.6 + r() * 3, g = 110 + r() * 145 | 0; x.strokeStyle = `rgb(${g},${g},${g})`; x.lineWidth = 1.1 + r() * 1.4;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const X = px + ox, Y = py + oy; if (X < -8 || X > S + 8 || Y < -8 || Y > S + 8) continue;
      x.beginPath(); x.arc(X, Y, rad, 0, Math.PI * 2); x.stroke();
    }
  }
  return c;
}
function linenH() {
  const S = 256, c = cnv(S, S), x = c.getContext('2d'), r = rnd(3); x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 2) { const g = 90 + r() * 100 | 0; x.fillStyle = `rgba(${g},${g},${g},.6)`; x.fillRect(0, y, S, 1); }
  for (let X = 0; X < S; X += 2) { const g = 100 + r() * 100 | 0; x.fillStyle = `rgba(${g},${g},${g},.45)`; x.fillRect(X, 0, 1, S); }
  for (let i = 0; i < 160; i++) { const g = 160 + r() * 80 | 0; x.fillStyle = `rgba(${g},${g},${g},.55)`; x.fillRect(r() * S, (r() * S) | 0, 6 + r() * 22, 1); }
  return c;
}
function leatherH() {
  const S = 256, a = cnv(S, S), x = a.getContext('2d'), r = rnd(5); x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { const g = 70 + r() * 130 | 0; x.fillStyle = `rgb(${g},${g},${g})`; x.beginPath(); x.arc(r() * S, r() * S, .8 + r() * 2.2, 0, 7); x.fill(); }
  const c = cnv(S, S), y = c.getContext('2d'); y.filter = 'blur(1px)'; y.drawImage(a, 0, 0); return c;
}
function woodC(base, dk, lt, seed) {
  const W = 1024, H = 256, c = cnv(W, H), x = c.getContext('2d'), r = rnd(seed); x.fillStyle = base; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 190; i++) {
    const y0 = r() * H, a = 2 + r() * 7, f = .002 + r() * .006, ph = r() * 6.28;
    x.strokeStyle = r() < .55 ? dk : lt; x.globalAlpha = .1 + r() * .3; x.lineWidth = .6 + r() * 2.4; x.beginPath();
    for (let X = 0; X <= W; X += 16) { const y = y0 + Math.sin(X * f + ph) * a + Math.sin(X * f * 3.1 + ph * 2) * a * .3; X ? x.lineTo(X, y) : x.moveTo(X, y); }
    x.stroke();
  }
  for (let i = 0; i < 2000; i++) { x.fillStyle = dk; x.globalAlpha = .06 + r() * .12; x.fillRect(r() * W, r() * H, 2 + r() * 9, 1); }
  x.globalAlpha = 1; return c;
}
function marbleC() {
  const S = 1024, c = cnv(S, S), x = c.getContext('2d'), r = rnd(11); x.fillStyle = '#ede9e2'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 46; i++) { const px = r() * S, py = r() * S, rr = 80 + r() * 260, g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(196,188,176,.16)'); g.addColorStop(1, 'rgba(196,188,176,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  x.filter = 'blur(1.4px)';
  for (let v = 0; v < 16; v++) {
    let px = r() * S, py = r() * S, ang = r() * 6.28; x.strokeStyle = v % 4 === 0 ? 'rgba(168,136,92,.55)' : 'rgba(118,112,104,.5)'; x.lineWidth = .6 + r() * 2.6; x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 170; k++) { ang += (r() - .5) * .5; px += Math.cos(ang) * 7; py += Math.sin(ang) * 7; x.lineTo(px, py); }
    x.stroke();
  }
  x.filter = 'none';
  for (let v = 0; v < 34; v++) {
    let px = r() * S, py = r() * S, ang = r() * 6.28; x.strokeStyle = 'rgba(130,124,116,.28)'; x.lineWidth = .5; x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 60; k++) { ang += (r() - .5) * .7; px += Math.cos(ang) * 5; py += Math.sin(ang) * 5; x.lineTo(px, py); }
    x.stroke();
  }
  return c;
}
function brushedC() {
  const W = 512, H = 128, c = cnv(W, H), x = c.getContext('2d'), r = rnd(13); x.fillStyle = '#8c8c8c'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 1100; i++) { const g = 80 + r() * 130 | 0; x.fillStyle = `rgba(${g},${g},${g},.3)`; x.fillRect(r() * W - 100, r() * H, 80 + r() * 400, 1); }
  return c;
}
function shadowC(a) {
  const c = cnv(256, 256), x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.45, `rgba(0,0,0,${a * .5})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return c;
}
/* box projected uvs in metres so every part shares the same texel density */
function boxUV(g) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i), p.getZ(i));
    else if (ax >= az) uv.setXY(i, p.getZ(i), p.getY(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
  uv.needsUpdate = true; return g;
}

function chenilleH() {
  const S = 256, c = cnv(S, S), x = c.getContext('2d'), r = rnd(17); x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 3) { const g = 80 + r() * 120 | 0; x.fillStyle = `rgba(${g},${g},${g},.7)`; x.fillRect(0, y, S, 2); }
  for (let i = 0; i < 900; i++) { const g = 150 + r() * 100 | 0; x.fillStyle = `rgba(${g},${g},${g},.5)`; x.fillRect(r() * S, r() * S, 2 + r() * 5, 2); }
  const o = cnv(S, S), y = o.getContext('2d'); y.filter = 'blur(.8px)'; y.drawImage(c, 0, 0); return o;
}
function travC2() {
  const W = 1024, H = 512, c = cnv(W, H), x = c.getContext('2d'), r = rnd(23); x.fillStyle = '#d7ccb8'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 110; i++) { const y0 = r() * H, th = 2 + r() * 12, a = 3 + r() * 8, f = .002 + r() * .004, ph = r() * 6.28; x.fillStyle = r() < .5 ? 'rgba(180,162,132,.22)' : 'rgba(240,232,216,.25)'; x.beginPath(); x.moveTo(0, y0); for (let X = 0; X <= W; X += 16) x.lineTo(X, y0 + Math.sin(X * f + ph) * a); for (let X = W; X >= 0; X -= 16) x.lineTo(X, y0 + th + Math.sin(X * f + ph) * a); x.closePath(); x.fill(); }
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(120,98,70,${.1 + r() * .2})`; x.beginPath(); x.ellipse(r() * W, r() * H, 1 + r() * 3, .6 + r(), 0, 0, 7); x.fill(); }
  return c;
}
const cfgCv = $('#cfgGL');
const CR = new THREE.WebGLRenderer({ canvas: cfgCv, antialias: true, alpha: true, powerPreference: 'high-performance' });
CR.setPixelRatio(Math.min(devicePixelRatio, 2)); CR.setClearColor(0x000000, 0);
CR.toneMapping = THREE.ACESFilmicToneMapping; CR.toneMappingExposure = 1.02; CR.outputColorSpace = THREE.SRGBColorSpace;
const cScene = new THREE.Scene();
{ const pm = new THREE.PMREMGenerator(CR); cScene.environment = pm.fromScene(new RoomEnvironment(CR), .04).texture; pm.dispose(); }
cScene.add(new THREE.HemisphereLight(0xfffaf2, 0x111110, .35));
const key = new THREE.DirectionalLight(0xfff1dc, 1.8); key.position.set(-4, 6, 3); cScene.add(key);
const rim = new THREE.DirectionalLight(0xdfe6ff, .5); rim.position.set(4, 3, -4); cScene.add(rim);

const CT = (c, rep, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const V2 = (a, b) => new THREE.Vector2(a, b);
const FAB = {
  boucle: new THREE.MeshStandardMaterial({ color: 0xeae5dc, roughness: 1, normalMap: CT(heightToNormal(boucleH(), 2.4), [1 / .16, 1 / .16]), normalScale: V2(1.1, 1.1), envMapIntensity: .55 }),
  linen: new THREE.MeshStandardMaterial({ color: 0xbfb19b, roughness: .96, normalMap: CT(heightToNormal(linenH(), 1.6), [1 / .09, 1 / .09]), normalScale: V2(.7, .7), envMapIntensity: .5 }),
  olive: new THREE.MeshPhysicalMaterial({ color: 0x4b5232, roughness: .78, sheen: 1, sheenRoughness: .32, sheenColor: new THREE.Color(0xb9c08f), envMapIntensity: .5 }),
  mocha: new THREE.MeshStandardMaterial({ color: 0x6e5a4b, roughness: .95, normalMap: CT(heightToNormal(chenilleH(), 1.8), [1 / .12, 1 / .12]), normalScale: V2(.8, .8), envMapIntensity: .5 }),
  stone: new THREE.MeshPhysicalMaterial({ color: 0x8c8a85, roughness: .8, sheen: 1, sheenRoughness: .3, sheenColor: new THREE.Color(0xdedbd5), envMapIntensity: .5 })
};
const FIN = {
  oak: new THREE.MeshPhysicalMaterial({ map: CT(woodC('#b98d5c', '#7d5d3a', '#d6b182', 9), [1 / 2.4, 1 / .6], true), roughness: .55, clearcoat: .25, clearcoatRoughness: .4, envMapIntensity: .7 }),
  walnut: new THREE.MeshPhysicalMaterial({ map: CT(woodC('#5a3925', '#2b1a10', '#7d5437', 5), [1 / 2.4, 1 / .6], true), roughness: .42, clearcoat: .5, clearcoatRoughness: .28, envMapIntensity: .7 }),
  black: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .6, envMapIntensity: .6 })
};
const TRAV = new THREE.MeshPhysicalMaterial({ map: CT(travC2(), [1 / 1.6, 1 / .8], true), roughness: .45, clearcoat: .3, clearcoatRoughness: .4, envMapIntensity: .6 });
const FABN = { boucle: 'Bouclé Ivory', linen: 'Linen Sand', olive: 'Velvet Olive', mocha: 'Chenille Mocha', stone: 'Velvet Stone' };
const FINN = { oak: 'Oak', walnut: 'Walnut', black: 'Matte black', fabric: 'Upholstered' };
const LAYN = { straight: 'Straight', l: 'L-shape', u: 'U-shape' };
const cfgState = { fab: 'boucle', fin: 'oak', lay: 'straight' };

const croot = new THREE.Group(); cScene.add(croot);
const sofa = new THREE.Group(); croot.add(sofa);
const parts = [], anchors = {};
const RB = (w, h, d, r, s = 5) => new RoundedBoxGeometry(w, h, d, s, r);
const MW = .92;
function mkModule(i) {
  const g = new THREE.Group(); sofa.add(g);
  const add = (geo, kind, pos, off, d) => { boxUV(geo); const m = new THREE.Mesh(geo, FAB.boucle); m.position.set(...pos); g.add(m); const p = { m, kind, p: new THREE.Vector3(...pos), o: new THREE.Vector3(...off), d: d + i * .03 }; parts.push(p); return p; };
  const base = add(RB(MW, .12, MW, .035, 3), 'fin', [0, .06, 0], [0, -.25, 0], 0);
  const seat = add(RB(MW - .02, .3, MW - .26, .13), 'fab', [0, .27, .12], [0, .45, .2], .08);
  const back = add(RB(MW - .02, .5, .28, .13), 'fab', [0, .5, -.31], [0, .7, -.15], .14);
  return { g, base, seat, back, pos: new THREE.Vector3(), rot: 0, s: 1 };
}
function mkArm() {
  const g = new THREE.Group(); sofa.add(g);
  const geo = RB(.26, .5, MW, .12); boxUV(geo); const m = new THREE.Mesh(geo, FAB.boucle); m.position.set(0, .31, 0); g.add(m);
  const geo2 = RB(.26, .12, MW, .035, 3); boxUV(geo2); const b = new THREE.Mesh(geo2, FIN.oak); b.position.set(0, .06, 0); g.add(b);
  const p = { m, kind: 'fab', p: m.position.clone(), o: new THREE.Vector3(0, .3, 0), d: .2 }; parts.push(p);
  const pb = { m: b, kind: 'fin', p: b.position.clone(), o: new THREE.Vector3(0, -.25, 0), d: 0 }; parts.push(pb);
  return { g, arm: p, pos: new THREE.Vector3(), rot: 0, s: 1 };
}
const MODS = [0, 1, 2, 3, 4].map(mkModule), ARMS = [mkArm(), mkArm()];
anchors.back = [MODS[1].back, new THREE.Vector3(0, .2, 0)];
anchors.seat = [MODS[0].seat, new THREE.Vector3(-.1, .1, .25)];
anchors.base = [MODS[2].base, new THREE.Vector3(.2, 0, .46)];
anchors.arm = [ARMS[1].arm, new THREE.Vector3(0, .22, .3)];
const H = Math.PI / 2, A = MW / 2 + .13;
const LAYOUTS = {
  straight: { m: [[-MW, 0, 0, 1], [0, 0, 0, 1], [MW, 0, 0, 1], [MW, MW, -H, 0], [-MW, MW, H, 0]], a: [[-MW - A, 0, 0, 1], [MW + A, 0, 0, 1]], cz: .1 },
  l: { m: [[-MW, 0, 0, 1], [0, 0, 0, 1], [MW, 0, 0, 1], [MW, MW, -H, 1], [-MW, MW, H, 0]], a: [[-MW - A, 0, 0, 1], [MW, MW + A, H, 1]], cz: -.35 },
  u: { m: [[-MW, 0, 0, 1], [0, 0, 0, 1], [MW, 0, 0, 1], [MW, MW, -H, 1], [-MW, MW, H, 1]], a: [[-MW, MW + A, H, 1], [MW, MW + A, H, 1]], cz: -.45 }
};
const layT = { v: 0 };
function setLayout(k, instant) {
  const L = LAYOUTS[k], d = instant ? 0 : 1.7, e = 'power3.inOut';
  [...MODS.map((M, i) => [M, L.m[i]]), ...ARMS.map((M, i) => [M, L.a[i]])].forEach(([M, t], i) => {
    gsap.to(M.pos, { x: t[0], z: t[1] + L.cz, duration: d, ease: e, delay: instant ? 0 : i * .04 });
    gsap.to(M, { rot: t[2], s: t[3] ? 1 : 0, duration: d, ease: e, delay: instant ? 0 : i * .04 });
  });
  gsap.to(table.position, { z: k === 'straight' ? 1.35 : k === 'l' ? 1.62 : 1.52, duration: d, ease: e });
}
const table = new THREE.Group(); sofa.add(table);
{
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .32, 72), TRAV); top.position.y = .16; table.add(top);
  const t2 = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .22, 64), TRAV); t2.position.set(.62, .11, .25); table.add(t2);
  table.position.set(0, 0, 1.25);
  const sm = (a, sx, sz, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowC(a)), transparent: true, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1); m.position.set(x, .001, z); sofa.add(m); return m; };
  sm(.7, 4.6, 3.2, 0, .3); sm(.6, 1.6, 1.6, 0, 1.1);
}
function applyMats() {
  const f = FAB[cfgState.fab], fin = cfgState.fin === 'fabric' ? f : FIN[cfgState.fin];
  parts.forEach(p => { p.m.material = p.kind === 'fab' ? f : fin; });
  const fn = FINN[cfgState.fin], fb = FABN[cfgState.fab], ln = LAYN[cfgState.lay];
  $('#cfgSel').textContent = `${fb} · ${fn}`;
  $$('.finName').forEach(e => e.textContent = fn.toLowerCase());
  $('#cfgSend').href = waLink(`Hello The Design House, I built a sofa on your website.\nLayout: ${ln}\nFabric: ${fb}\nPlinth: ${fn}\nPlease contact me about sizes and a quotation.`);
}
setLayout('straight', true); applyMats();
const flash = { v: 0 };
[['#swFab', 'fab'], ['#swFin', 'fin'], ['#swLay', 'lay']].forEach(([sel, k]) => $(sel).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.classList.contains('on')) return;
  $$('button', $(sel)).forEach(x => x.classList.toggle('on', x === b));
  cfgState[k] = b.dataset.k; applyMats();
  if (k === 'lay') setLayout(b.dataset.k); else gsap.fromTo(flash, { v: 1 }, { v: 0, duration: 1.4, ease: 'power3.out' });
}));
$('#cfgX').addEventListener('click', () => document.body.classList.add('cfg-closed'));
$('#cfgOpen').addEventListener('click', () => document.body.classList.remove('cfg-closed'));

const cCam = new THREE.PerspectiveCamera(28, 1, .1, 60);
let cw = 1, ch = 1;
function cfgSize() {
  cw = cfgCv.clientWidth || VW; ch = cfgCv.clientHeight || VH; CR.setSize(cw, ch, false);
  cCam.aspect = cw / ch; cCam.fov = cw < 700 ? 36 : 28;
  if (cw >= 900) cCam.setViewOffset(cw, ch, -cw * .15, -ch * .03, cw, ch); else cCam.clearViewOffset();
  cCam.updateProjectionMatrix();
}
cfgSize(); addEventListener('resize', cfgSize);
const yaw = { a: -1.4, t: -1.4, v: 0 };
const ex = { v: 0 }, exS = { v: 1 }, intro = { ex: 1 };
let drag = false, lx = 0, cfgOn = true, heroP = 0;
cfgCv.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; try { cfgCv.setPointerCapture(e.pointerId); } catch (_) {} });
cfgCv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - lx; lx = e.clientX; yaw.t += dx * .008; yaw.v = dx * .004; });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => cfgCv.addEventListener(t, () => drag = false));
onScreen($('#hero'), v => cfgOn = v, '60px');
const tags = $$('.tag').map(el => ({ el, k: el.dataset.k, l: false }));
const tv = new THREE.Vector3(), tgt = new THREE.Vector3();
const ease3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const heroTop = $('#heroTop'), xp = $('#xp'), hint = $('.hero-hint');
gsap.ticker.add(() => {
  if (!cfgOn) return;
  if (!drag) { yaw.t += yaw.v; yaw.v *= .94; yaw.t += .0004; }
  yaw.a += (yaw.t - yaw.a) * .045;
  const target = Math.max(ex.v, intro.ex);
  exS.v += (target - exS.v) * .055;
  const e = exS.v;
  croot.rotation.y = yaw.a;
  [...MODS, ...ARMS].forEach(M => { M.g.position.copy(M.pos); M.g.rotation.y = M.rot; const s = Math.max(M.s, .0001); M.g.scale.setScalar(s); M.g.visible = M.s > .01; });
  parts.forEach(p => { const k = ease3(clamp(e * 1.3 - p.d)); p.m.position.set(p.p.x + p.o.x * k, p.p.y + p.o.y * k, p.p.z + p.o.z * k); });
  const tf = Math.tan(cCam.fov * Math.PI / 360), S = cw < 700 ? 3.6 : 6.2;
  const D = Math.max((S / 2) / (tf * cCam.aspect), 1.5 / tf) * (1 + .14 * e);
  const el = (cw < 700 ? .34 : .3) + .06 * e;
  tgt.set(0, .35 + .3 * e, .2);
  cCam.position.set(0, tgt.y + Math.sin(el) * D, Math.cos(el) * D); cCam.lookAt(tgt);
  CR.toneMappingExposure = 1.02 + flash.v * .2;
  CR.render(cScene, cCam);
  const lv = clamp((ex.v - .3) / .3);
  if (lv > 0 || tags[0].shown) {
    croot.updateMatrixWorld();
    tags.forEach((t, i) => {
      const a = anchors[t.k]; if (!a) return;
      tv.copy(a[1]).add(a[0].m.position).applyMatrix4(a[0].m.parent.matrixWorld).project(cCam);
      const x = (tv.x * .5 + .5) * cw, y = (-tv.y * .5 + .5) * ch, left = x > cw - (cw < 700 ? 150 : 240);
      if (left !== t.l) { t.l = left; t.el.classList.toggle('l', left); }
      const o = clamp(lv * 1.6 - i * .1);
      t.el.style.opacity = o;
      t.el.style.transform = `translate3d(${x}px,${y}px,0) translate(${left ? '-100%' : '0'},-50%)`;
    });
    tags[0].shown = lv > 0;
  }
});
ScrollTrigger.create({
  trigger: '.hero-pin', start: 'top top', end: () => '+=' + Math.round(VH * 1.3), pin: true, scrub: true, refreshPriority: 5,
  onUpdate: s => {
    heroP = s.progress; ex.v = clamp((s.progress - .08) / .55);
    const a = clamp(1 - heroP * 6), b = clamp((heroP - .22) * 5);
    heroTop.style.opacity = a; heroTop.style.transform = `translateY(${-heroP * 120}px)`;
    hint.style.opacity = a;
    xp.style.opacity = b; xp.style.visibility = b > 0 ? 'visible' : 'hidden'; xp.style.transform = `translateY(${(1 - b) * 30}px)`;
  },
  onLeave: () => document.body.classList.remove('in-hero'),
  onEnterBack: () => document.body.classList.add('in-hero')
});

/* =================================================================
   RING GALLERY
   ================================================================= */
const RING = ['sf1', 'ch1', 'dn9', 'bd3', 'tb1', 'sf5', 'ch5', 'st1', 'bd5', 'dn3', 'sf4', 'tb4', 'ch3', 'st4'].map(id => BYID[id]);
const rc = $('#ring');
const rr = new THREE.WebGLRenderer({ canvas: rc, antialias: true, alpha: true, powerPreference: 'high-performance' });
rr.setClearColor(0x000000, 0); rr.setPixelRatio(Math.min(devicePixelRatio, 2));
const ANISO = rr.capabilities.getMaxAnisotropy();
const rScene = new THREE.Scene(), rCam = new THREE.PerspectiveCamera(34, 1, .1, 100), rGroup = new THREE.Group(); rScene.add(rGroup);
const RN = RING.length, PW = 1.5, PH = 1.95, GAP = .24, RR = RN * (PW + GAP) / (Math.PI * 2);
const rIntro = { v: 0 };
const bgCol = () => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0a0a';
const panels = RING.map((p, i) => {
  const g = new THREE.PlaneGeometry(PW, PH, 40, 1), pos = g.attributes.position;
  for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), a = x / RR; pos.setX(k, Math.sin(a) * RR); pos.setZ(k, Math.cos(a) * RR - RR); }
  g.computeVertexNormals();
  const u = { tex: { value: null }, isz: { value: new THREE.Vector2(1, 1) }, psz: { value: new THREE.Vector2(PW, PH) }, hov: { value: 0 }, inn: { value: 0 }, bg: { value: new THREE.Color('#0a0a0a') } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, side: THREE.DoubleSide,
    vertexShader: `uniform float hov,inn;varying vec2 vUv;varying float vF;void main(){vUv=uv;vec3 p=position+normal*hov*.16;
      p.y+=(1.-inn)*-.6;vec4 mv=modelViewMatrix*vec4(p,1.);vF=normalize(normalMatrix*normal).z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: GLSL + `precision highp float;uniform sampler2D tex;uniform vec2 isz,psz;uniform float hov,inn;uniform vec3 bg;varying vec2 vUv;varying float vF;
      void main(){vec2 uv=cover(vUv,psz,isz);uv=(uv-.5)*(1.-.07*hov)+.5;vec3 c=texture2D(tex,uv).rgb;
        float f=gl_FrontFacing?smoothstep(-.15,.75,vF):0.;
        c=mix(bg,c,gl_FrontFacing?mix(.22,1.,f):.1);
        c=mix(c,c*1.06,hov);
        vec2 s=psz*.5;float r=.06;vec2 q=abs((vUv-.5)*psz)-s+r;float d=length(max(q,0.))-r;float a=1.-smoothstep(-.004,.004,d);
        gl_FragColor=vec4(c,a*inn*step(1.-inn*1.15,vUv.y+.15));}`
  });
  const mesh = new THREE.Mesh(g, m), th = i / RN * Math.PI * 2;
  mesh.rotation.y = th; mesh.position.set(Math.sin(th) * RR, 0, Math.cos(th) * RR);
  mesh.userData = { p, u, th }; rGroup.add(mesh);
  tex(`img/${p.id}.webp`, ANISO).then(t => { if (t) { u.tex.value = t; u.isz.value.copy(t.userData.size); } });
  return mesh;
});
const ringBox = { top: 0, left: 0, w: 1, h: 1 };
function rSize() { const w = rc.clientWidth, h = rc.clientHeight; rr.setSize(w, h, false); rCam.aspect = w / h; rCam.fov = w < 700 ? 54 : 34; rCam.updateProjectionMatrix(); }
rSize(); addEventListener('resize', rSize);
measurers.push(() => { const r = rc.getBoundingClientRect(); ringBox.top = r.top + window.scrollY; ringBox.left = r.left; ringBox.w = r.width; ringBox.h = r.height; });
const rot = { a: 0, t: 0, v: 0 }, tilt = { x: 0, y: 0 };
let rTick = 0, overRing = false, rDrag = false, rdx = 0, rMoved = 0, ringOn = false, ringP = 0, hovered = null;
rc.addEventListener('pointerenter', () => overRing = true);
rc.addEventListener('pointerleave', () => { overRing = false; setHover(null); });
rc.addEventListener('pointerdown', e => { rDrag = true; rdx = e.clientX; rMoved = 0; try { rc.setPointerCapture(e.pointerId); } catch (_) {} });
rc.addEventListener('pointermove', e => { if (rDrag) { const dx = e.clientX - rdx; rdx = e.clientX; rMoved += Math.abs(dx); rot.t -= dx * .0036; rot.v = -dx * .0024; } });
rc.addEventListener('pointerup', () => { rDrag = false; if (FINE && rMoved < 6 && hovered) openPiece(hovered.userData.p.id); });
rc.addEventListener('pointercancel', () => rDrag = false);
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function setHover(m) {
  if (m === hovered) return;
  if (hovered) gsap.to(hovered.userData.u.hov, { value: 0, duration: 1.2, ease: 'power3.out' });
  hovered = m;
  if (m) { gsap.to(m.userData.u.hov, { value: 1, duration: 1.2, ease: 'power3.out' }); showLabel(m.userData.p); }
  if (FINE) setCursor(null, m ? 'Open' : null);
}
let labelP = null, labelT = 0;
function showLabel(p) {
  if (p === labelP) return; labelP = p; const el = $('#ringLabel'); el.classList.add('swap'); clearTimeout(labelT);
  labelT = setTimeout(() => { $('#rlName').textContent = p.t; $('#rlMeta').textContent = CAT[p.c].t; el.classList.remove('swap'); }, 260);
}
function frontPanel() {
  let best = null, bd = 9;
  panels.forEach(pm => { const d = ((pm.userData.th - rot.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; if (Math.abs(d) < bd) { bd = Math.abs(d); best = pm; } });
  return best;
}
onScreen($('#collection'), v => ringOn = v, '80px');
ScrollTrigger.create({ trigger: '#collection', start: 'top bottom', end: 'bottom top', onUpdate: s => ringP = s.progress });
ScrollTrigger.create({ trigger: '#collection', start: 'top 70%', once: true, onEnter: () => { gsap.to(rIntro, { v: 1, duration: 3, ease: 'power3.inOut' }); gsap.fromTo(rot, { t: rot.t - .9 }, { t: rot.t, duration: 3.2, ease: 'power3.inOut' }); } });
gsap.ticker.add(() => {
  if (!ringOn) return;
  const v = lenis.velocity || 0;
  if (!rDrag) { rot.t += .0007 + v * .00022 + rot.v; rot.v *= .95; }
  rot.a += (rot.t - rot.a) * .045;
  rGroup.rotation.y = -rot.a;
  const mx = mouse.x / VW - .5, my = mouse.y / VH - .5;
  tilt.x += ((FINE ? my * .08 : 0) - tilt.x) * .03; tilt.y += ((FINE ? mx * .06 : 0) - tilt.y) * .03;
  const k = ringP - .5;
  rGroup.rotation.x = .1 + tilt.x + k * .28; rGroup.rotation.z = -.04 + tilt.y * .4;
  rGroup.position.y = (DESK() ? -.42 : .25) - k * .7;
  rCam.position.set(0, .2, VW < 700 ? 12.2 : 11.4); rCam.lookAt(0, -.2, 0);
  panels.forEach(pm => pm.userData.u.inn.value = clamp(rIntro.v * 1.6 - (pm.userData.th / (Math.PI * 2)) * .6));
  if (FINE && !rDrag && overRing && (++rTick % 3 === 0)) {
    const top = ringBox.top - SY;
    ndc.set((mouse.x - ringBox.left) / ringBox.w * 2 - 1, -((mouse.y - top) / ringBox.h) * 2 + 1);
    ray.setFromCamera(ndc, rCam);
    const hit = ray.intersectObjects(panels, false).find(h => h.point.z > 0);
    setHover(hit ? hit.object : null);
  }
  if (!hovered) { const f = frontPanel(); if (f) showLabel(f.userData.p); }
  rr.render(rScene, rCam);
});
if (!FINE) rc.addEventListener('click', e => {
  if (rMoved > 6) return;
  const top = ringBox.top - SY;
  ndc.set((e.clientX - ringBox.left) / ringBox.w * 2 - 1, -((e.clientY - top) / ringBox.h) * 2 + 1);
  ray.setFromCamera(ndc, rCam);
  const hit = ray.intersectObjects(panels, false).find(h => h.point.z > -1);
  if (hit) openPiece(hit.object.userData.p.id);
});

/* =================================================================
   SHOWCASE: pinned liquid WebGL transitions
   ================================================================= */
const SHOW = [
  { k: 'sofas', img: 'sf3', t: 'Living', m: 'Modular sofas', s: 'Cloud, Mayfair and Moda modular sofas, made to your exact size.' },
  { k: 'dining', img: 'dn9', t: 'Dining', m: 'Tables and chairs', s: 'Sculpted dining tables and upholstered dining chairs.' },
  { k: 'bedroom', img: 'bd3', t: 'Bedroom', m: 'Beds and bedside', s: 'Upholstered beds with sculpted headboards.' },
  { k: 'tables', img: 'tb1', t: 'Tables', m: 'Coffee and side', s: 'Coffee table sets in stone, timber and lacquer.' },
  { k: 'sofas', img: 'sf6', t: 'Curves', m: 'Sculpted sofas', s: 'Soft, flowing curves for an inviting living room.' }
];
{
  const cv = $('#showGL'), frame = $('#showFrame');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const U = { t1: { value: null }, t2: { value: null }, s1: { value: new THREE.Vector2(1, 1) }, s2: { value: new THREE.Vector2(1, 1) }, prog: { value: 0 }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, mouse: { value: new THREE.Vector2(.5, .5) }, vel: { value: 0 } };
  sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
    fragmentShader: GLSL + `precision highp float;varying vec2 vUv;uniform sampler2D t1,t2;uniform vec2 s1,s2,res,mouse;uniform float prog,time,vel;
      void main(){vec2 uv=vUv;float asp=res.x/res.y;vec2 d=(uv-mouse)*vec2(asp,1.);float l=length(d);
        uv+=normalize(d+1e-4)/vec2(asp,1.)*sin(l*22.-time*1.4)*.003*smoothstep(.4,0.,l)*sin(prog*3.1416);
        float n=fbm(uv*2.4+time*.02);float m=smoothstep(n-.2,n+.2,prog*1.4-.2+(1.-uv.y)*.15);
        vec2 dir=vec2(.06,.22)*(n-.5);
        vec2 u1=cover((uv-.5)*(1.-.08*prog)+.5+dir*prog,res,s1);
        vec2 u2=cover((uv-.5)*(1.+.1*(1.-prog))+.5-dir*(1.-prog),res,s2);
        vec3 c=mix(texture2D(t1,u1).rgb,texture2D(t2,u2).rgb,m);
        c+=vec3(.95,.76,.46)*(1.-smoothstep(0.,.06,abs(m-.5)))*.3*step(.02,prog)*step(prog,.98);
        gl_FragColor=vec4(c,1.);}`
  })));
  const T = [];
  SHOW.forEach((p, i) => tex(`img/${p.img}.webp`).then(t => { T[i] = t; if (i === 0 && t) { U.t1.value = t; U.s1.value.copy(t.userData.size); U.t2.value = t; U.s2.value.copy(t.userData.size); } }));
  const titles = $('#showTitles'), list = $('#showList'), imgBox = $('#showImgs');
  const domImgs = SHOW.map((p, i) => { const im = document.createElement('img'); im.src = `img/${p.img}.webp`; im.alt = p.t; im.decoding = 'async'; if (!i) im.className = 'on'; imgBox.appendChild(im); return im; });
  let restIdx = 0, glOn = false, cvVis = false;
  function setRest(i) {
    if (i === restIdx && !glOn) return;
    restIdx = i; glOn = i < 0;
    if (i >= 0) { domImgs.forEach((im, k) => im.classList.toggle('on', k === i)); cv.style.visibility = 'hidden'; cvVis = false; }
  }
  SHOW.forEach((p, i) => {
    const d = document.createElement('div'); d.className = 'show-t';
    d.innerHTML = `<span>${String(i + 1).padStart(2, '0')} · ${p.m}</span><h3>${p.t.split(' ').map(w => `<i>${w}</i>`).join(' ')}</h3><p>${p.s}</p>`;
    if (i) gsap.set(d, { autoAlpha: 0 }); titles.appendChild(d);
    const li = document.createElement('li'); li.innerHTML = `<small>${String(i + 1).padStart(2, '0')}</small>${p.t}`; li.dataset.i = i; li.dataset.cursor = 'View'; if (!i) li.className = 'on'; list.appendChild(li);
  });
  const tEls = $$('.show-t', titles), lis = $$('li', list);
  let idx = 0, on = false, fw = 1, fh = 1;
  const size = () => { fw = frame.clientWidth; fh = frame.clientHeight; r.setSize(fw, fh, false); U.res.value.set(fw, fh); };
  size(); addEventListener('resize', size);
  function setIdx(i) {
    if (i === idx) return; idx = i;
    $('#showN').textContent = $('#showNum').textContent = String(i + 1).padStart(2, '0');
    lis.forEach((l, k) => l.classList.toggle('on', k === i));
    tEls.forEach((el, k) => { gsap.killTweensOf(el); gsap.killTweensOf($$('h3 i', el)); if (k !== i) gsap.set(el, { autoAlpha: 0 }); });
    gsap.fromTo(tEls[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'power3.out' });
    gsap.fromTo($$('h3 i', tEls[i]), { yPercent: 110 }, { yPercent: 0, duration: 1.4, stagger: .08, ease: 'power4.out' });
  }
  $('#showOpen').addEventListener('click', e => { e.preventDefault(); openCat(SHOW[idx].k); });
  const st = ScrollTrigger.create({
    trigger: '.show-pin', start: 'top top', end: () => '+=' + Math.round(VH * 4.4), pin: true, scrub: 1.2, refreshPriority: 4,
    onUpdate: s => {
      const x = s.progress * (SHOW.length - 1), a = Math.min(Math.floor(x), SHOW.length - 2), f = x - a;
      const pr = clamp((f - .2) / .6), ready = T[a] && T[a + 1];
      if (ready) { U.t1.value = T[a]; U.s1.value.copy(T[a].userData.size); U.t2.value = T[a + 1]; U.s2.value.copy(T[a + 1].userData.size); }
      U.prog.value = pr;
      setRest(!ready ? (pr < .5 ? a : a + 1) : pr <= 0 ? a : pr >= 1 ? a + 1 : -1);
      setIdx(Math.round(x)); $('#showBar').style.width = s.progress * 100 + '%';
    }
  });
  list.addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; lenis.scrollTo(st.start + (st.end - st.start) * (+li.dataset.i / (SHOW.length - 1)) + 2, { duration: 1.4 }); });
  onScreen($('.show'), v => on = v, '40px');
  const clk = new THREE.Clock(), sm = { x: .5, y: .5 }, mv = new THREE.Vector2(.5, .5);
  frame.addEventListener('pointermove', e => { sm.x = e.offsetX / fw; sm.y = 1 - e.offsetY / fh; });
  frame.addEventListener('pointerleave', () => { sm.x = .5; sm.y = .5; });
  frame.addEventListener('click', () => openCat(SHOW[idx].k));
  frame.dataset.cursor = 'Open';
  gsap.ticker.add(() => {
    if (!on || !glOn) return;
    U.time.value = clk.getElapsedTime(); mv.set(sm.x, sm.y); U.mouse.value.lerp(mv, .05);
    r.render(sc, cam);
    if (!cvVis) { cv.style.visibility = 'visible'; cvVis = true; }
  });
}

/* =================================================================
   GALLERY GRID (scroll reactive WebGL on desktop)
   ================================================================= */
const srcset = p => `t/${p.id}.webp ${Math.round(p.w * Math.min(1, 720 / Math.max(p.w, p.h)))}w, img/${p.id}.webp ${p.w}w`;
const CUR = ['sf2', 'ch2', 'dn7', 'bd2', 'tb2', 'st2', 'sf7', 'ch6', 'dn1', 'bd7', 'tb3', 'st5'];
const ORDER = [...CUR.map(id => BYID[id]), ...PCS.filter(p => !CUR.includes(p.id))];
const wg = $('#wgrid');
ORDER.forEach((p, i) => {
  const a = document.createElement('a'); a.href = '#'; a.className = 'wcard' + (i < CUR.length ? '' : ' gone'); a.dataset.piece = p.id; a.dataset.c = p.c; a.dataset.cur = i < CUR.length ? 1 : 0;
  a.innerHTML = `<figure data-img="${p.id}"><img loading="lazy" src="t/${p.id}.webp" srcset="${srcset(p)}" sizes="(max-width:900px) 46vw, 52vw" alt="${p.t}" width="${p.w}" height="${p.h}"></figure>
    <div class="wcap"><h3><span class="wn">${String(i + 1).padStart(2, '0')}</span>${p.t}</h3><span>${CAT[p.c].s}</span></div>`;
  wg.appendChild(a);
});
const fl = $('#filters');
[['all', 'All'], ...CATS.map(c => [c.k, c.s])].forEach(([k, l]) => { const b = document.createElement('button'); b.textContent = l; b.dataset.k = k; if (k === 'all') b.className = 'on'; fl.appendChild(b); });
function filterGrid(k) {
  $$('button', fl).forEach(x => x.classList.toggle('on', x.dataset.k === k));
  const cards = $$('.wcard', wg);
  gsap.to(cards, { opacity: 0, y: 16, duration: .6, ease: 'power2.inOut', onComplete: () => {
    let n = 0;
    cards.forEach(c => { const show = k === 'all' ? c.dataset.cur === '1' : c.dataset.c === k; c.classList.toggle('gone', !show); if (show) $('.wn', c).textContent = String(++n).padStart(2, '0'); });
    wg.classList.toggle('flat', k !== 'all');
    ScrollTrigger.refresh();
    gsap.fromTo(cards.filter(c => !c.classList.contains('gone')), { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1.3, stagger: .07, ease: 'power3.out' });
  } });
}
fl.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.classList.contains('on')) filterGrid(b.dataset.k); });
if (FINE && DESK()) {
  const gc = $('#gal');
  const gr = new THREE.WebGLRenderer({ canvas: gc, alpha: true, antialias: true });
  gr.setClearColor(0x000000, 0); gr.setPixelRatio(Math.min(devicePixelRatio, 2));
  const GAN = gr.capabilities.getMaxAnisotropy(); wg.classList.add('gl');
  let workOn = false; onScreen(wg, v => workOn = v, '200px');
  const gs = new THREE.Scene();
  let W = VW, H = VH;
  const gcam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -10, 10);
  const gsize = () => { W = innerWidth; H = innerHeight; gr.setSize(W, H); Object.assign(gcam, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 }); gcam.updateProjectionMatrix(); };
  gsize(); addEventListener('resize', gsize);
  const geo = new THREE.PlaneGeometry(1, 1, 24, 24);
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const it = e.target._it; if (it && !it.loading) { it.loading = true; tex(`img/${it.fig.dataset.img}.webp`, GAN).then(t => { if (!t) return; it.u.tex.value = t; it.u.isz.value.copy(t.userData.size); }); } } }), { rootMargin: '400px' });
  const items = $$('.wcard figure', wg).map(fig => {
    const u = { tex: { value: null }, isz: { value: new THREE.Vector2(1, 1) }, psz: { value: new THREE.Vector2(1, 1) }, vel: { value: 0 }, hov: { value: 0 }, ms: { value: new THREE.Vector2(.5, .5) }, rev: { value: 0 }, time: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: u, transparent: true,
      vertexShader: `uniform float vel;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.y+=sin(uv.x*3.1416)*vel*.0016;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: GLSL + `precision highp float;uniform sampler2D tex;uniform vec2 isz,psz,ms;uniform float vel,hov,rev,time;varying vec2 vUv;
        void main(){vec2 uv=vUv;vec2 d=uv-ms;float l=length(d*vec2(psz.x/psz.y,1.));
          uv+=normalize(d+1e-4)*sin(l*22.-time*1.8)*.005*hov*smoothstep(.55,0.,l);
          uv=cover(uv,psz,isz);uv=(uv-.5)*(1.-.06*hov-.08*(1.-rev))+.5;
          float s=clamp(abs(vel)*.00012,0.,.0025);
          vec3 c=vec3(texture2D(tex,uv+vec2(0,s)).r,texture2D(tex,uv).g,texture2D(tex,uv-vec2(0,s)).b);
          float n=fbm(vUv*3.+time*.05);float m=smoothstep(n-.15,n+.15,rev*1.35-.2+(vUv.y-.5)*.4);
          vec2 q=abs((vUv-.5)*psz)-psz*.5+8.;float rd=length(max(q,0.))-8.;float a=1.-smoothstep(-1.,0.,rd);
          gl_FragColor=vec4(c,m*a);}`
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.visible = false; gs.add(mesh);
    const card = fig.closest('.wcard');
    card.addEventListener('pointerenter', () => gsap.to(u.hov, { value: 1, duration: 1.3, ease: 'power3.out' }));
    card.addEventListener('pointerleave', () => gsap.to(u.hov, { value: 0, duration: 1.3, ease: 'power3.inOut' }));
    const it = { fig, mesh, u, x: 0, top: 0, w: 0, h: 0, loading: false, shown: false, act: false };
    fig.addEventListener('pointermove', e => { if (it.w) u.ms.value.set(e.offsetX / it.w, 1 - e.offsetY / it.h); });
    fig._it = it; io.observe(fig);
    return it;
  });
  measurers.push(() => items.forEach(it => { const r = it.fig.getBoundingClientRect(); it.x = r.left; it.top = r.top + window.scrollY; it.w = r.width; it.h = r.height; }));
  const clk = new THREE.Clock(); let sv = 0, vis = false;
  gsap.ticker.add(() => {
    if (!workOn || document.body.classList.contains('modal-open')) { if (vis) { gc.style.visibility = 'hidden'; vis = false; } return; }
    const t = clk.getElapsedTime(); sv += ((lenis.velocity || 0) - sv) * .15;
    let any = false;
    items.forEach(it => {
      const y = it.top - SY;
      const v = it.w > 0 && y + it.h > -60 && y < H + 60 && !!it.u.tex.value;
      if (v && !it.shown) { it.shown = true; gsap.fromTo(it.u.rev, { value: 0 }, { value: 1, duration: 2, ease: 'power3.inOut' }); }
      // WebGL only while revealing, hovered or scrolling; at rest the sharp DOM image shows
      const act = v && (it.u.rev.value < .999 || it.u.hov.value > .002 || Math.abs(sv) > .35);
      if (act !== it.act) { it.act = act; it.fig.classList.toggle('gl-on', act); }
      it.mesh.visible = act; if (!act) return; any = true;
      it.mesh.scale.set(it.w, it.h, 1);
      it.mesh.position.set(it.x + it.w / 2 - W / 2, -(y + it.h / 2) + H / 2, 0);
      it.u.psz.value.set(it.w, it.h); it.u.vel.value = clamp(sv, -24, 24); it.u.time.value = t;
    });
    if (any !== vis) { gc.style.visibility = any ? 'visible' : 'hidden'; vis = any; }
    if (any) gr.render(gs, gcam);
  });
}

/* =================================================================
   OVERLAYS (collections and pieces)
   ================================================================= */
const modal = $('#modal'), ms = $('#modalScroll');
function showModal(html) {
  ms.innerHTML = html; ms.scrollTop = 0;
  modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open'); lenis.stop();
  gsap.fromTo('.m-pic img', { scale: 1.12 }, { scale: 1, duration: 2, ease: 'power3.out' });
  gsap.fromTo('.m-title>*', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.4, stagger: .1, delay: .45, ease: 'power3.out' });
}
const heroBlock = (img, w, h, eyebrow, title) => `<div class="m-hero"><img class="m-bg" src="t/${img}.webp" alt=""><div class="m-title"><span>${eyebrow}</span><h2>${title}</h2></div><div class="m-pic" style="--ar:${w}/${h}"><img src="img/${img}.webp" alt="${title}"></div></div>`;
const galBlock = list => list.length ? `<div class="m-gal">${list.map(p => `<a href="#" data-piece="${p.id}" data-cursor="View"><img loading="lazy" src="t/${p.id}.webp" srcset="${srcset(p)}" sizes="(max-width:900px) 46vw, 30vw" alt="${p.t}"><span>${p.t}</span></a>`).join('')}</div>` : '';
function openCat(k) {
  const c = CAT[k]; if (!c) return;
  const list = PCS.filter(p => p.c === k), first = list[0], ci = CATS.findIndex(x => x.k === k), nx = CATS[(ci + 1) % CATS.length];
  showModal(heroBlock(first.id, first.w, first.h, 'Collection', c.t) +
    `<div class="m-body"><div><p class="lead">${c.d}</p><div class="m-tags">${c.l.map(x => `<i>${x}</i>`).join('')}</div></div>
     <div><div class="m-sec"><h4>Fully customised</h4><p>Every item can be made to your dimensions, fabric, colour and finish.</p></div>
     <div class="m-sec"><h4>Visit the showroom</h4><p>See fabrics and finishes at 22nd Street, Al Quoz Industrial Area 3, or message us on WhatsApp. Free shipping on all Dubai orders.</p></div></div></div>` +
    galBlock(list) +
    `<div class="m-cta"><h3>Planning something <em>similar?</em></h3><div class="m-cta-r"><a class="btn btn-brass" target="_blank" rel="noopener" href="${waLink(`Hello The Design House, I saw your ${c.t} collection on your website and would like to know more.`)}">Ask on WhatsApp</a><a href="#" class="m-next" data-cat="${nx.k}">Next: ${nx.t} →</a></div></div>`);
}
function openPiece(id) {
  const p = BYID[id]; if (!p) return;
  const c = CAT[p.c], same = PCS.filter(x => x.c === p.c), i = same.indexOf(p), nx = same[(i + 1) % same.length];
  showModal(heroBlock(p.id, p.w, p.h, c.t, p.t) +
    `<div class="m-body"><div><p class="lead">${p.d}</p><div class="m-tags"><i>${c.t}</i><i>Custom size and fabric</i><i>${p.p}</i></div></div>
     <div><div class="m-sec"><h4>About the collection</h4><p>${c.d}</p></div>
     <div class="m-sec"><h4>Your version</h4><p>Share your measurements and preferred fabric on WhatsApp, and our team will guide you through the options.</p></div></div></div>` +
    (same.length > 1 ? `<div class="m-more"><div class="eyebrow">More from ${c.t}</div></div>` + galBlock(same.filter(x => x !== p)) : '') +
    `<div class="m-cta"><h3>Like this <em>piece?</em></h3><div class="m-cta-r"><a class="btn btn-brass" target="_blank" rel="noopener" href="${waLink(`Hello The Design House, I am interested in the ${p.t} from your website. Could you share more details?`)}">Ask on WhatsApp</a>${nx !== p ? `<a href="#" class="m-next" data-piece="${nx.id}">Next: ${nx.t} →</a>` : ''}</div></div>`);
}
function closeModal() { if (!modal.classList.contains('open')) return; modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open'); lenis.start(); }
document.addEventListener('click', e => {
  const p = e.target.closest('[data-piece]'); if (p) { e.preventDefault(); return openPiece(p.dataset.piece); }
  const c = e.target.closest('[data-cat]'); if (c && c.tagName === 'A') { e.preventDefault(); closeMenu(); return openCat(c.dataset.cat); }
});
$('#modalX').addEventListener('click', closeModal);
addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------------- menu + nav ---------------- */
const menu = $('#menu'), burger = $('#burger'), nav = $('#nav');
function closeMenu() { menu.classList.remove('open'); burger.classList.remove('on'); }
burger.addEventListener('click', () => { menu.classList.toggle('open'); burger.classList.toggle('on'); });
let lastY = 0;
lenis.on('scroll', ({ animatedScroll: y }) => {
  nav.classList.toggle('solid', y > 60);
  nav.classList.toggle('hide', y > lastY && y > 500 && !menu.classList.contains('open'));
  lastY = y;
});

/* ---------------- why glow ---------------- */
$$('.why-card').forEach(c => c.addEventListener('pointermove', e => { c.style.setProperty('--mx', e.offsetX + 'px'); c.style.setProperty('--my', e.offsetY + 'px'); }));

/* =================================================================
   THEME (night by default)
   ================================================================= */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const bg = bgCol(); panels.forEach(pm => pm.userData.u.bg.value.set(bg));
  const tc = $('meta[name=theme-color]'); if (tc) tc.content = t === 'light' ? '#efede8' : '#090909';
  try { localStorage.setItem('tdh-theme', t); } catch (e) {}
}
applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
$('#theme').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

/* =================================================================
   WINDOW: arch opens to full screen
   ================================================================= */
gsap.timeline({ scrollTrigger: { trigger: '.window-pin', start: 'top top', end: () => '+=' + Math.round(VH * 1.5), pin: true, scrub: 1.2, refreshPriority: 3 } })
  .fromTo('#wFrame', { clipPath: 'inset(24% 26% 24% 26% round 999px 999px 12px 12px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 14px 14px)', ease: 'power1.inOut', duration: 1 })
  .fromTo('#wFrame img', { scale: 1.18 }, { scale: 1, ease: 'power1.inOut', duration: 1 }, 0)
  .fromTo('#wTxt', { y: 0 }, { y: -40, ease: 'none', duration: 1 }, 0);

/* =================================================================
   SCROLL ANIMATIONS
   ================================================================= */
function scrollAnims() {
  $$('.split').forEach(el => { if (el.closest('.hero')) return; gsap.fromTo($$('.w>span', el), { y: '110%' }, { y: '0%', duration: 1.3, ease: 'power4.out', stagger: .06, scrollTrigger: { trigger: el, start: 'top 88%' } }); });
  $$('.chars').forEach(el => gsap.fromTo($$('.ch', el), { opacity: 0, filter: 'blur(12px)', y: 14 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.4, ease: 'power3.out', stagger: .025, scrollTrigger: { trigger: el, start: 'top 88%' } }));
  $$('.blinds').forEach(b => { const n = 7, w = document.createElement('div'); w.className = 'blind-set'; for (let i = 0; i < n; i++) w.appendChild(document.createElement('i')); b.appendChild(w);
    gsap.fromTo($$('i', w), { scaleY: 1 }, { scaleY: 0, duration: 1.6, ease: 'power3.inOut', stagger: .09, scrollTrigger: { trigger: b, start: 'top 80%' } }); });
  $$('.count').forEach(el => { const o = { v: +el.dataset.from }; gsap.to(o, { v: +el.dataset.to, duration: 2.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => el.textContent = Math.round(o.v) }); });
  $$('.up').forEach(el => gsap.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 92%' } }));
  $$('.scrub-text').forEach(el => gsap.fromTo($$('.sw2', el), { opacity: .16 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: true } }));
  $$('.arch').forEach(a => {
    gsap.fromTo(a, { clipPath: 'inset(18% 10% 0% 10% round 999px 999px 8px 8px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 8px 8px)', duration: 1.8, ease: 'power3.inOut', scrollTrigger: { trigger: a, start: 'top 85%' } });
    gsap.fromTo($('img', a), { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: a, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.contact-bg img', { yPercent: -14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
  if (!(FINE && DESK())) $$('.wcard figure img').forEach(img => gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.wcap').forEach(c => gsap.fromTo(c, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 96%' } }));
  const cards = $$('.scard');
  cards.forEach((c, i) => { if (i === cards.length - 1) return;
    gsap.fromTo(c, { scale: 1, '--dim': 0 }, { scale: .92 + i * .012, '--dim': .62, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top 55%', end: 'top 14%', scrub: true } }); });
  const L = [1, 2, 3, 4].map(n => $$('.plan .L' + n + ' > *'));
  L.flat().forEach(el => { const len = el.getTotalLength ? el.getTotalLength() : 600; el.style.strokeDasharray = len; el.style.strokeDashoffset = len; });
  const ptl = gsap.timeline({ scrollTrigger: { trigger: '.steps', start: 'top 70%', end: 'bottom 70%', scrub: 1 } });
  L.forEach((els, k) => ptl.fromTo(els, { strokeDashoffset: (i, el) => el.style.strokeDasharray }, { strokeDashoffset: 0, duration: 1, stagger: .12, ease: 'none' }, k * 1.1));
  ptl.fromTo('.plan .labels', { opacity: 0 }, { opacity: 1, duration: .6 }, 2.4);
  $$('.step').forEach(s => ScrollTrigger.create({ trigger: s, start: 'top 62%', end: 'bottom 38%', toggleClass: 'on' }));
  const mt = $('.marquee-track'); let mx = 0, dir = 1, mw = mt.scrollWidth / 2, mOn = false;
  measurers.push(() => { mw = mt.scrollWidth / 2; });
  onScreen($('.marquee'), v => mOn = v);
  gsap.ticker.add(() => { if (!mOn) return; const v = lenis.velocity || 0; if (Math.abs(v) > .1) dir = v > 0 ? 1 : -1; mx -= (.32 + Math.abs(v) * .12) * dir; if (mx <= -mw) mx += mw; if (mx > 0) mx -= mw; mt.style.transform = `translateX(${mx}px) skewX(${clamp(-v * .12, -3, 3)}deg)`; });
  gsap.fromTo('.why-card', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: .08, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.why-grid', start: 'top 85%' } });
  gsap.fromTo('details', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .05, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.faq-list', start: 'top 90%' } });
  gsap.fromTo('.foot-big span', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.6, ease: 'power4.out', scrollTrigger: { trigger: '.foot', start: 'top 90%' } });
}

/* =================================================================
   SIGNATURE: 3D cover flow of the collection
   ================================================================= */
{
  const FL = ['sf3', 'ch1', 'dn9', 'sf5', 'bd3', 'tb1', 'ch5', 'sf2', 'st1', 'dn8', 'bd5', 'tb4'].map(id => BYID[id]);
  const stage = $('#flowStage'); let cur = 0, dragX = null, moved = 0;
  $('#flowT').textContent = String(FL.length).padStart(2, '0');
  const cards = FL.map((p, i) => { const a = document.createElement('a'); a.href = '#'; a.className = 'fcard'; a.dataset.i = i; a.innerHTML = `<img src="t/${p.id}.webp" srcset="${srcset(p)}" sizes="(max-width:900px) 64vw, 26vw" alt="${p.t}" loading="lazy"><i class="fsheen"></i>`; stage.appendChild(a); return a; });
  function lay() {
    const mob = VW < 700, cwid = cards[0].offsetWidth || 300, dz = mob ? 160 : 240;
    cards.forEach((c, i) => {
      const o = i - cur, ao = Math.abs(o);
      gsap.to(c, { xPercent: -50, x: o === 0 ? 0 : Math.sign(o) * (cwid * (mob ? .62 : .72) + (ao - 1) * cwid * (mob ? .3 : .42)), z: -ao * dz, rotationY: clamp(-o * 34, -55, 55), opacity: ao > 3 ? 0 : 1 - ao * .18, duration: 1.5, ease: 'power3.inOut' });
      c.style.zIndex = 100 - ao; c.classList.toggle('on', o === 0);
    });
    const p = FL[cur]; $('#flowName').textContent = p.t; $('#flowMeta').textContent = CAT[p.c].t; $('#flowPrice').textContent = p.p; $('#flowN').textContent = String(cur + 1).padStart(2, '0');
  }
  const go = i => { cur = (i + FL.length) % FL.length; lay(); };
  $('#flowPrev').addEventListener('click', () => go(cur - 1)); $('#flowNext').addEventListener('click', () => go(cur + 1));
  stage.addEventListener('pointerdown', e => { dragX = e.clientX; moved = 0; });
  addEventListener('pointerup', e => { if (dragX === null) return; const dx = e.clientX - dragX; dragX = null; moved = Math.abs(dx); if (dx > 50) go(cur - 1); else if (dx < -50) go(cur + 1); });
  stage.addEventListener('click', e => { const c = e.target.closest('.fcard'); if (!c) return; e.preventDefault(); if (moved > 8) return; const i = +c.dataset.i; if (i === cur) openPiece(FL[i].id); else go(i); });
  if (FINE) cards.forEach(c => c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--sx', ((e.clientX - r.left) / r.width * 100) + '%'); }));
  addEventListener('resize', lay); lay();
}

/* ---------------- quote form opens WhatsApp ---------------- */
$('#qform').addEventListener('submit', e => {
  e.preventDefault(); const f = new FormData(e.target);
  window.open(waLink(`Hello The Design House, my name is ${f.get('name')}.\nI am interested in: ${f.get('type')}\n${f.get('msg') || ''}`), '_blank', 'noopener');
});

/* =================================================================
   LOADER + INTRO (assembly of the sofa)
   ================================================================= */
(async function boot() {
  gsap.fromTo('.dh-box span', { y: '110%' }, { y: '0%', duration: 1.1, stagger: .05, ease: 'power4.out' });
  gsap.fromTo('.loader-sub', { opacity: 0, letterSpacing: '.9em' }, { opacity: 1, letterSpacing: '.62em', duration: 1.6, ease: 'power3.out', delay: .4 });
  const prog = { v: 0 };
  const upd = () => { $('#loaderNum').textContent = Math.round(prog.v); $('#loaderBar').style.width = prog.v + '%'; };
  const tw = gsap.fromTo(prog, { v: 0 }, { v: 88, duration: 1.5, ease: 'power2.out', onUpdate: upd });
  CR.compile(cScene, cCam);
  const need = [...RING.slice(0, 5).map(p => tex(`img/${p.id}.webp`, ANISO)), tex('img/sf3.webp')];
  await Promise.race([Promise.all([...need, document.fonts ? document.fonts.ready : 0, new Promise(r => setTimeout(r, 900))]), new Promise(r => setTimeout(r, 5000))]);
  tw.kill();
  await gsap.fromTo(prog, { v: prog.v }, { v: 100, duration: .5, ease: 'power2.inOut', onUpdate: upd });
  const tl = gsap.timeline();
  tl.fromTo('.loader-inner', { y: 0, opacity: 1 }, { y: -40, opacity: 0, duration: .7, ease: 'power3.in' })
    .fromTo('.loader-panels i', { scaleX: 1 }, { scaleX: 0, duration: 1.4, stagger: { each: .06, from: 'center' }, ease: 'power4.inOut' }, '-=.2')
    .set('.loader', { display: 'none' })
    .fromTo(intro, { ex: 1 }, { ex: 0, duration: 3.4, ease: 'power3.inOut' }, '-=1.1')
    .fromTo(yaw, { t: -1.4 }, { t: -.62, duration: 3.6, ease: 'power3.inOut' }, '<')
    .fromTo('.hero-title .w>span', { y: '110%' }, { y: '0%', duration: 1.5, stagger: .08, ease: 'power4.out' }, '-=2.3')
    .fromTo('.h-in', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .12, ease: 'power3.out' }, '-=1.4')
    .fromTo('.nav', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, '-=1.2');
  tl.add(() => {
    document.body.classList.remove('loading'); lenis.start(); scrollAnims(); ScrollTrigger.sort(); ScrollTrigger.refresh();
    // safety net: if content height changes later (fonts, lazy media), re-measure once it settles
    let h = document.body.scrollHeight, rt = 0;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { const n = document.body.scrollHeight; if (Math.abs(n - h) > 2) { h = n; ScrollTrigger.refresh(); h = document.body.scrollHeight; } }, 250); }).observe($('main'));
  }, '-=1.4');
})();
