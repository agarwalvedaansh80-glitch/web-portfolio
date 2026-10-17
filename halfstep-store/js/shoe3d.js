// Halfstep — real-time 3D (three.js).
//  createStage():   hero / product viewer. Kinetic type plane (shader) behind a draggable shoe with inertia,
//                   plus a liquid noise-dissolve when the colourway changes.
//  createAnatomy(): the same GLB split into layers (laces, knit upper, foam midsole, rubber outsole) that
//                   explode apart as a scroll-scrubbed progress value goes from 0 to 1.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
// ?capture: deterministic demo recording — render at most once per 30 fps video frame
const CAPTURE = /[?&]capture/.test(location.search);
const RENDERERS = [];
if (CAPTURE) window.__hsSync = () => { const b = new Uint8Array(4); RENDERERS.forEach((r) => { const gl = r.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b); }); return RENDERERS.length; };
const gltfCache = new Map();
const texCache = new Map();
const loadGLTF = (url) => {
  if (!gltfCache.has(url)) gltfCache.set(url, new GLTFLoader().loadAsync(url));
  return gltfCache.get(url);
};
const loadTex = (url) => {
  if (!texCache.has(url)) texCache.set(url, new THREE.TextureLoader().loadAsync(url).then((t) => {
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }));
  return texCache.get(url);
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const col = (hex) => new THREE.Color(hex);
// raw sRGB triplet for the hand-written type shader (it writes straight to the canvas, no colour management)
const srgb = (hex) => { const c = new THREE.Color(); c.setStyle(hex, THREE.NoColorSpace); return new THREE.Vector3(c.r, c.g, c.b); };
const setSrgb = (v, hex) => v.copy(srgb(hex));

const NOISE = /* glsl */`
vec3 hsMod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 hsMod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 hsPerm(vec4 x){return hsMod289(((x*34.)+1.)*x);}
float hsNoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=hsMod289(i);
  vec4 p=hsPerm(hsPerm(hsPerm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=inversesqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
`;

/* ---------- shared renderer setup ---------- */
function makeRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  RENDERERS.push(renderer);
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(0.35, 1.2, 0.45);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -0.32, right: 0.32, top: 0.32, bottom: -0.32, near: 0.1, far: 3 });
  key.shadow.radius = 3;
  scene.add(key);
  return { renderer, scene, key };
}

// Liquid dissolve: the new colourway texture eats through the old one along a 3D noise front with an acid edge,
// while the surface wobbles along its normals.
function patchMaterial(mat, U) {
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWob;uniform float uTime;varying vec3 vHsPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHsPos=position;\ntransformed+=normal*sin(position.x*7.0+position.y*5.0-uTime*9.0)*uWob*0.045;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform sampler2D uMapB;uniform float uMix;uniform vec3 uEdge;varying vec3 vHsPos;\n${NOISE}`)
      .replace('#include <map_fragment>', `
        vec4 hsA = texture2D(map, vMapUv);
        float hsM = 0.0, hsEdge = 0.0;
        if (uMix > 0.001) {
          vec4 hsB = texture2D(uMapB, vMapUv);
          float hsN = hsNoise(vHsPos*1.6)*0.5+0.5 + hsNoise(vHsPos*7.0)*0.08;
          float hsF = uMix*1.35-0.2;
          hsM = step(hsN, hsF);
          hsA = mix(hsA, hsB, hsM);
          hsEdge = (1.0-hsM)*step(hsN, hsF+0.07)*step(uMix,0.999);
        }
        diffuseColor *= hsA;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdge*hsEdge*1.6;');
  };
  mat.customProgramCacheKey = () => 'hs-dissolve';
}

function prepShoe(gltf, U, texA) {
  const root = gltf.scene.clone(true);
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.material = o.material.clone();
    o.material.map = texA;
    o.material.side = THREE.DoubleSide;
    patchMaterial(o.material, U);
    meshes.push(o);
  });
  return { root, meshes };
}

/* =====================================================================
   STAGE: kinetic word + shoe
   ===================================================================== */
export function createStage(container, { modelUrl, texUrl, colourway, acid, ink = '#000000', word = 'DRIFT', onReady, interactive = true, camDist = 1 } = {}) {
  const { renderer, scene } = makeRenderer(container);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 20);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), new THREE.ShadowMaterial({ opacity: 0.22 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // ---- kinetic type plane (its own ortho scene, drawn first) ----
  const tScene = new THREE.Scene();
  const tCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const textCanvas = document.createElement('canvas');
  const textTex = new THREE.CanvasTexture(textCanvas);
  textTex.colorSpace = THREE.NoColorSpace;
  textTex.minFilter = THREE.LinearFilter; textTex.generateMipmaps = false;
  const TU = {
    uText: { value: textTex }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uMVel: { value: new THREE.Vector2() }, uVel: { value: 0 }, uTime: { value: 0 }, uIntro: { value: REDUCE ? 1 : 0 },
    uAcidA: { value: srgb(acid) }, uAcidB: { value: srgb(acid) }, uFlood: { value: 0 }, uInk: { value: srgb(ink) }, uLens: { value: 0 }, uHover: { value: 0 },
    uStatic: { value: REDUCE ? 1 : 0 }, uGlitch: { value: 0 },
  };
  const tMat = new THREE.ShaderMaterial({
    uniforms: TU, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D uText;uniform vec2 uRes,uMouse,uMVel;uniform float uVel,uTime,uIntro,uFlood,uLens,uStatic,uHover,uGlitch;
      uniform vec3 uAcidA,uAcidB,uInk;varying vec2 vUv;
      float h1(float n){return fract(sin(n*127.1)*43758.5453);}
      ${NOISE}
      void main(){
        vec2 uv=vUv; float asp=uRes.x/uRes.y; float k=1.0-uStatic;
        float v=clamp(uVel,-1.5,1.5)*k; vec2 mv=uMVel*k;
        // intro: letters rise in a left-to-right wave
        float rise=1.0-clamp(uIntro*1.7-uv.x*0.7,0.,1.); rise=rise*rise*rise;
        uv.y+=rise*0.9;
        // scroll velocity: stretch tall and squash wide
        uv.y=0.5+(uv.y-0.5)/(1.0+abs(v)*0.55);
        uv.x=0.5+(uv.x-0.5)*(1.0+abs(v)*0.08);
        // split: horizontal bands slide apart with scroll + cursor speed
        float energy=abs(v)+length(mv)*2.2+uGlitch*1.6;
        float bands=14.0; float b=floor(uv.y*bands);
        float seed=floor(uTime*9.0);
        uv.x+=(h1(b+1.0)-0.5)*energy*0.11 + (h1(b*3.7+seed)-0.5)*step(0.62,h1(b+seed*1.3))*energy*0.05;
        // cursor lens: magnify + smear along the pointer's motion
        vec2 d=(uv-uMouse)*vec2(asp,1.);
        float lens=exp(-dot(d,d)/0.045)*k*uHover*(0.6+uLens*0.7);
        uv-=(uv-uMouse)*lens*0.3;
        uv-=mv*lens*0.9;
        // idle liquid wobble
        uv.x+=sin(uv.y*9.0+uTime*1.3)*0.0035*k;
        uv.y+=sin(uv.x*7.0-uTime*1.1)*0.003*k;
        vec4 t=texture2D(uText,uv);
        float sh=(v*0.035+mv.x*0.06);
        float gL=texture2D(uText,uv+vec2(sh,0.)).r;
        float gR=texture2D(uText,uv-vec2(sh*0.6,0.)).r;
        // colour flood: new acid spreads through the letters on a noise front
        vec3 acid=uAcidA; float edge=0.0;
        if (uFlood > 0.001 && t.g > 0.0) {
          float n=hsNoise(vec3(vUv*vec2(asp,1.)*2.2,uTime*0.25))*0.5+0.5;
          float f=uFlood*1.45-0.25+ (1.0-vUv.y)*0.15;
          float m=step(n,f);
          acid=mix(uAcidA,uAcidB,m);
          edge=(1.0-m)*step(n,f+0.05)*step(uFlood,0.999);
        }
        vec4 c=vec4(0.);
        c=mix(c,vec4(uInk,1.),t.b);
        c=mix(c,vec4(uInk,1.),t.g);
        c=mix(c,vec4(acid,1.),t.r);
        c=mix(c,vec4(uInk,1.),t.r*edge);
        // chromatic ghosts (only while moving)
        c=mix(c,vec4(1.,1.,1.,1.),clamp(gL-t.g,0.,1.)*0.9);
        c=mix(c,vec4(acid,1.),clamp(gR-t.g,0.,1.)*0.9);
        gl_FragColor=c;
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), tMat);
  quad.frustumCulled = false;
  tScene.add(quad);
  let hasWord = !!word;

  function drawWord() {
    if (!hasWord) return;
    const w = container.clientWidth, h = container.clientHeight;
    const scale = Math.min(1.5, 2048 / Math.max(w, 1));
    const cw = Math.round(w * scale), ch = Math.round(h * scale);
    if (textCanvas.width !== cw || textCanvas.height !== ch) { textCanvas.width = cw; textCanvas.height = ch; textTex.dispose(); }
    const ctx = textCanvas.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
    const portrait = h > w * 1.1;
    const lines = word.includes(' ') && w / h < 1.7 ? word.split(' ') : portrait && word.length > 3 ? [word.slice(0, Math.ceil(word.length / 2)), word.slice(Math.ceil(word.length / 2))] : [word];
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    let size = 100;
    const setFont = () => { ctx.font = `900 ${size}px Archivo`; ctx.fontStretch = 'extra-condensed'; };
    setFont();
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const capH = 0.74; // cap height ratio for Archivo
    const fitW = (cw * 0.94) / widest * size;
    const fitH = (ch * (portrait ? 0.86 : 0.8)) / (lines.length * capH * 1.04) ;
    size = Math.min(fitW, fitH);
    setFont();
    ctx.lineJoin = 'round';
    const stroke = Math.max(4, size * 0.035);
    const lh = size * capH * 1.06;
    const top = ch / 2 - (lines.length * lh) / 2 + size * capH;
    const yOff = portrait ? ch * -0.02 : ch * 0.02;
    const off = Math.max(6, size * 0.04);
    ctx.globalCompositeOperation = 'lighter';
    lines.forEach((l, i) => {
      const y = top + i * lh + yOff;
      // B: hard offset shadow
      ctx.fillStyle = '#0000ff'; ctx.strokeStyle = '#0000ff'; ctx.lineWidth = stroke * 2;
      ctx.fillText(l, cw / 2 + off, y + off); ctx.strokeText(l, cw / 2 + off, y + off);
      // G: outline
      ctx.fillStyle = '#00ff00'; ctx.strokeStyle = '#00ff00';
      ctx.fillText(l, cw / 2, y); ctx.strokeText(l, cw / 2, y);
      // R: fill
      ctx.fillStyle = '#ff0000'; ctx.fillText(l, cw / 2, y);
    });
    textTex.needsUpdate = true;
  }

  // ---- shoe ----
  const U = { uMapB: { value: null }, uMix: { value: 0 }, uEdge: { value: col(acid) }, uWob: { value: 0 }, uTime: { value: 0 } };
  let shoe = null, meshes = [], ready = false;
  const st = { spin: 0, spinV: 0, drag: false, lastX: 0, lastT: 0, mx: 0.5, my: 0.5, tmx: 0.5, tmy: 0.5, hover: 0, inside: false, intro: REDUCE ? 1 : 0, scroll: 0, vel: 0, lastY: scrollY, trans: null, lens: 0 };
  let currentId = colourway;

  Promise.all([loadGLTF(modelUrl), loadTex(texUrl(colourway))]).then(([gltf, tex]) => {
    const s = prepShoe(gltf, U, tex);
    shoe = s.root; meshes = s.meshes;
    const box = new THREE.Box3().setFromObject(shoe);
    const c = box.getCenter(new THREE.Vector3());
    shoe.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
    pivot.add(shoe);
    U.uMapB.value = tex;
    ready = true; resize(); onReady && onReady();
  });

  async function setColourway(id, nextAcid) {
    if (id === currentId) return;
    currentId = id;
    const tex = await loadTex(texUrl(id));
    if (!ready) return;
    if (REDUCE) {
      meshes.forEach((m) => { m.material.map = tex; }); U.uMapB.value = tex; U.uMix.value = 0;
      setSrgb(TU.uAcidA.value, nextAcid); setSrgb(TU.uAcidB.value, nextAcid); return;
    }
    // finish any running transition instantly
    if (st.trans) { meshes.forEach((m) => { m.material.map = U.uMapB.value; }); TU.uAcidA.value.copy(TU.uAcidB.value); }
    U.uMapB.value = tex; U.uEdge.value.set(nextAcid);
    setSrgb(TU.uAcidB.value, nextAcid);
    st.trans = { t: 0, tex };
    st.glitch = 1;
  }
  function setWord(w) {
    if (!w || w === word) return;
    if (REDUCE) { word = w; drawWord(); return; }
    st.glitch = 1;
    pendingWord = w;
  }
  let pendingWord = null;

  // layout: shoe size relative to the stage
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const portrait = h > w * 1.1;
    const dist = (portrait ? 1.5 : Math.max(0.66, 0.78 * (1.6 / camera.aspect))) * camDist;
    camera.position.set(0, portrait ? 0.2 : 0.15, dist);
    camera.lookAt(0, portrait ? 0.03 : 0.07, 0);
    camera.updateProjectionMatrix();
    TU.uRes.value.set(w, h);
    drawWord();
  }
  new ResizeObserver(resize).observe(container);
  if (document.fonts) document.fonts.load('900 100px Archivo').then(drawWord);

  // ---- input ----
  if (interactive) {
    addEventListener('pointermove', (e) => {
      const r = container.getBoundingClientRect();
      st.tmx = (e.clientX - r.left) / r.width; st.tmy = 1 - (e.clientY - r.top) / r.height;
      st.inside = st.tmx > 0 && st.tmx < 1 && st.tmy > 0 && st.tmy < 1;
      if (st.drag) {
        const dx = e.clientX - st.lastX;
        st.spin += dx * 0.011;
        st.spinV = dx * 0.011 * 60 * 0.9;
        st.lastX = e.clientX;
      }
    }, { passive: true });
    container.addEventListener('pointerdown', (e) => {
      st.drag = true; st.lastX = e.clientX; st.spinV = 0;
      container.setPointerCapture?.(e.pointerId);
      container.classList.add('is-dragging');
    });
    const up = () => { st.drag = false; container.classList.remove('is-dragging'); };
    container.addEventListener('pointerup', up);
    container.addEventListener('pointercancel', up);
    // keyboard spin (container is focusable)
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { st.spinV -= 3; e.preventDefault(); }
      if (e.key === 'ArrowRight') { st.spinV += 3; e.preventDefault(); }
    });
  }

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(container);

  let last = performance.now(), time = 0;
  renderer.autoClear = false;
  let failed = false;
  renderer.setAnimationLoop(() => { try { frameFn(); } catch (e) { if (!failed) console.error(e); failed = true; } });
  function frameFn() {
    const now = performance.now();
    if (CAPTURE && now - last < 30) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible) return;
    time += dt;
    // scroll progress + velocity (works with or without smooth scroll)
    const r = container.getBoundingClientRect();
    st.scroll = clamp(-r.top / Math.max(1, r.height));
    const dy = scrollY - st.lastY; st.lastY = scrollY;
    st.vel += ((dy / Math.max(dt, 1 / 120)) / 2600 - st.vel) * 0.12;
    // pointer (smoothed) and its velocity
    const pmx = st.mx, pmy = st.my;
    st.mx += (st.tmx - st.mx) * 0.14; st.my += (st.tmy - st.my) * 0.14;
    const mvx = (st.mx - pmx) / Math.max(dt, 1 / 120), mvy = (st.my - pmy) / Math.max(dt, 1 / 120);
    TU.uMVel.value.x += (mvx * 0.05 - TU.uMVel.value.x) * 0.2;
    TU.uMVel.value.y += (mvy * 0.05 - TU.uMVel.value.y) * 0.2;
    TU.uMouse.value.set(st.mx, st.my);
    st.lens += ((st.drag ? 1 : 0) - st.lens) * 0.1; TU.uLens.value = st.lens;
    st.glitch = Math.max(0, (st.glitch || 0) - dt * 1.8); TU.uGlitch.value = REDUCE ? 0 : Math.sin(Math.min(1, st.glitch) * Math.PI);
    if (pendingWord && st.glitch < 0.5) { word = pendingWord; pendingWord = null; hasWord = true; drawWord(); }
    st.hover += ((st.inside ? 1 : 0) - st.hover) * 0.08; TU.uHover.value = st.hover;
    TU.uVel.value = st.vel; TU.uTime.value = time; U.uTime.value = time;
    if (!REDUCE) st.intro = Math.min(1, st.intro + dt * 0.55);
    TU.uIntro.value = st.intro;

    // colourway transition
    if (st.trans) {
      st.trans.t += dt / 1.25;
      const p = clamp(st.trans.t);
      U.uMix.value = ease(p); TU.uFlood.value = p;
      U.uWob.value = Math.sin(p * Math.PI);
      if (p >= 1) {
        meshes.forEach((m) => { m.material.map = st.trans.tex; });
        U.uMix.value = 0; U.uWob.value = 0; TU.uFlood.value = 0; TU.uAcidA.value.copy(TU.uAcidB.value);
        st.trans = null; st.kick = 0; // a full turn: lands where it started
      } else st.kick = ease(p) * Math.PI * 2;
    }

    // spin with inertia
    if (!st.drag) { st.spin += st.spinV * dt; st.spinV *= Math.pow(0.12, dt); }
    const e = 1 - Math.pow(1 - st.intro, 4);
    const idle = REDUCE ? 0 : Math.sin(time * 0.4) * 0.22;
    if (shoe) {
      pivot.rotation.y = -0.6 + idle + st.spin + (st.kick || 0) + (st.mx - 0.5) * 0.5 + st.scroll * 1.6 + (1 - e) * -2.6;
      pivot.rotation.x = (0.5 - st.my) * 0.1 - st.scroll * 0.25;
      pivot.rotation.z = REDUCE ? 0 : clamp(st.vel, -1, 1) * -0.12;
      pivot.position.y = (REDUCE ? 0 : Math.sin(time * 1.3) * 0.004) + (1 - e) * 0.15 + st.scroll * 0.05;
    }
    renderer.clear();
    if (hasWord) renderer.render(tScene, tCam);
    renderer.clearDepth();
    if (shoe) renderer.render(scene, camera);
  }

  return { setColourway, setWord, resize, get dragging() { return st.drag; } };
}

/* =====================================================================
   ANATOMY: exploded layers
   ===================================================================== */
export function createAnatomy(container, { modelUrl, texUrl, colourway, acid, onFrame, onReady } = {}) {
  const { renderer, scene } = makeRenderer(container);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.01, 20);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const U = { uMapB: { value: null }, uMix: { value: 0 }, uEdge: { value: col(acid) }, uWob: { value: 0 }, uTime: { value: 0 } };
  const layers = []; // { mesh, dir, anchor }
  let progress = REDUCE ? 1 : 0, shown = progress, ready = false, meshes = [];
  const tmp = new THREE.Vector3();

  Promise.all([loadGLTF(modelUrl), loadTex(texUrl(colourway))]).then(([gltf, tex]) => {
    const s = prepShoe(gltf, U, tex);
    const root = s.root;
    U.uMapB.value = tex;
    const src = s.meshes[0];
    const g = src.geometry;
    const pos = g.attributes.position, idx = g.index.array;
    const N = pos.count;
    // connected components (index + welded seams)
    const parent = new Int32Array(N); for (let i = 0; i < N; i++) parent[i] = i;
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };
    for (let i = 0; i < idx.length; i += 3) { join(idx[i], idx[i + 1]); join(idx[i], idx[i + 2]); }
    const seen = new Map();
    for (let i = 0; i < N; i++) {
      const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
      if (seen.has(k)) join(i, seen.get(k)); else seen.set(k, i);
    }
    const info = new Map();
    for (let i = 0; i < N; i++) {
      const r = find(i); const y = pos.getY(i);
      const c = info.get(r) || { n: 0, maxY: -9 };
      c.n++; c.maxY = Math.max(c.maxY, y); info.set(r, c);
    }
    const HARDWARE = new Set([264, 312, 325, 273]); // eyelets + laces in this model
    const groupOfComp = (r) => { const c = info.get(r); if (c.maxY < -0.15) return 'sole'; if (HARDWARE.has(c.n)) return 'laces'; return 'upper'; };
    const buckets = { laces: [], upper: [], foam: [], outsole: [] };
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i], b = idx[i + 1], c = idx[i + 2];
      let grp = groupOfComp(find(a));
      if (grp === 'sole') {
        const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
        grp = cy < -0.445 ? 'outsole' : 'foam';
      }
      buckets[grp].push(a, b, c);
    }
    const parentNode = src.parent;
    parentNode.remove(src);
    // explode direction (in the model's local units) + where callout lines attach
    const spec = {
      laces:   { dir: [0, 1.15, 0],  anchor: [0.22, 0.36, 0.1] },
      upper:   { dir: [0, 0.55, 0],  anchor: [-0.5, 0.02, 0.3] },
      foam:    { dir: [0, -0.05, 0], anchor: [-0.62, -0.3, 0.34] },
      outsole: { dir: [0, -0.62, 0], anchor: [0.6, -0.5, 0.25] },
    };
    for (const k of ['laces', 'upper', 'foam', 'outsole']) {
      const geo = new THREE.BufferGeometry();
      for (const name of Object.keys(g.attributes)) geo.setAttribute(name, g.attributes[name]);
      geo.setIndex(buckets[k]);
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, src.material);
      m.castShadow = true;
      m.position.copy(src.position); m.quaternion.copy(src.quaternion); m.scale.copy(src.scale);
      parentNode.add(m);
      layers.push({ key: k, mesh: m, base: src.position.clone(), dir: new THREE.Vector3(...spec[k].dir), anchor: new THREE.Vector3(...spec[k].anchor) });
    }
    meshes = layers.map((l) => l.mesh);
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.sub(c);
    pivot.add(root);
    ready = true; resize(); onReady && onReady();
  });

  async function setColourway(id, nextAcid) {
    const tex = await loadTex(texUrl(id));
    U.uEdge.value.set(nextAcid);
    if (!ready) return;
    meshes.forEach((m) => { m.material.map = tex; });
    U.uMapB.value = tex;
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const portrait = h > w;
    camera.position.set(0, portrait ? 0.12 : 0.16, portrait ? 1.3 : 1.08);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(container);
  let last = performance.now(), time = 0;
  let failed = false;
  renderer.setAnimationLoop(() => { try { frameFn(); } catch (e) { if (!failed) console.error(e); failed = true; } });
  function frameFn() {
    const now = performance.now();
    if (CAPTURE && now - last < 30) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible || !ready) return;
    time += dt;
    shown += (progress - shown) * (REDUCE ? 1 : 0.14);
    const p = shown;
    const ex = ease(clamp((p - 0.1) / 0.45));
    pivot.rotation.y = REDUCE ? -0.35 : -1.2 + p * 1.1 + Math.sin(time * 0.5) * 0.04;
    pivot.rotation.x = 0.12 + ex * 0.08;
    layers.forEach((l, i) => {
      const bob = REDUCE ? 0 : Math.sin(time * 1.4 + i * 1.3) * 0.02 * ex;
      l.mesh.position.set(l.base.x + l.dir.x * ex, l.base.y + (l.dir.y + bob) * ex, l.base.z + l.dir.z * ex);
    });
    renderer.render(scene, camera);
    if (onFrame) {
      const w = container.clientWidth, h = container.clientHeight;
      const pts = layers.map((l) => {
        tmp.copy(l.anchor).applyMatrix4(l.mesh.matrixWorld).project(camera);
        return { key: l.key, x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h };
      });
      onFrame(pts, ex);
    }
  }

  return { setProgress(p) { progress = clamp(p); }, setColourway, resize };
}
