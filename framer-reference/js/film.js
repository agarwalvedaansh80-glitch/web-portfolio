/* Overnight — film engine.
   One shared GLSL "film" core used two ways:
   1. Grader: an offscreen WebGL canvas renders every <canvas data-film> on the page
      (look grade + develop stage + grain + chromatic bleed), then copies the pixels in.
   2. Hero: a live WebGL film strip whose frames develop from orange negatives to
      positives as you scroll or hold the cursor over them (developer brush mask). */
(function () {
  'use strict';

  const LOOKS = { dusk: 0, harbor: 1, bleach: 2 };

  const GLSL_CORE = `
precision highp float;
uniform float uLookA, uLookB, uLookMix;
float luma(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
vec3 sat(vec3 c, float s){ return mix(vec3(luma(c)), c, s); }
vec3 sc(vec3 c, float k){ return clamp(c + k*c*(1.-c)*(c-.5)*2., 0., 1.); }
vec3 gDusk(vec3 c){
  float l = luma(c);
  c = sc(c, .3);
  c *= vec3(1.1,.96,.8);
  c += vec3(.07,.022,.045)*(1.-l)*(1.-l);
  c = mix(c, c*vec3(1.04,.9,.72)+vec3(.05,.025,0.), smoothstep(.45,1.,l)*.7);
  return sat(c, 1.1);
}
vec3 gHarbor(vec3 c){
  float l = luma(c);
  c = sc(c, .55);
  c *= vec3(.74,.98,1.12);
  c += vec3(-.03,.06,.09)*(1.-l)*(1.-l);
  c = mix(c, c*vec3(1.06,1.02,.94)+vec3(.05,.04,0.), smoothstep(.55,1.,l));
  return sat(c, .82);
}
vec3 gBleach(vec3 c){
  float l = luma(c);
  vec3 m = vec3(l);
  c = mix(c, m*1.04, .64);
  c = mix(2.*c*m, 1.-2.*(1.-c)*(1.-m), step(.5, l));
  c *= vec3(.97,1.,1.03);
  return clamp(c*1.04, 0., 1.);
}
vec3 gradeOne(vec3 c, float k){
  if (k < .5) return gDusk(c);
  if (k < 1.5) return gHarbor(c);
  return gBleach(c);
}
vec3 grade(vec3 c){ if (uLookMix <= 0.001) return gradeOne(c, uLookA); return mix(gradeOne(c,uLookA), gradeOne(c,uLookB), uLookMix); }
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1.,0.)), u.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .55;
  for (int i = 0; i < 4; i++){ v += a*vnoise(p); p = p*2.03 + 7.1; a *= .5; }
  return v;
}
vec3 negative(vec3 c){
  vec3 n = pow(1. - c, vec3(2.1));
  return n*vec3(.93,.56,.3)*.94 + vec3(.06,.02,0.);
}
/* t: develop amount 0..1 at this pixel; n: noise 0..1; pos/neg: colours */
vec3 develop(vec3 pos, vec3 neg, float t, float n, out float front){
  float thr = n*.78 + .11;
  float rv = smoothstep(thr-.09, thr+.09, t);
  front = rv*(1.-rv)*4.;
  vec3 col = mix(neg, pos, rv);
  vec3 lat = vec3(luma(pos))*vec3(.62,.43,.3)*.75 + vec3(.03,.01,0.);
  col = mix(col, lat, front*.55);
  col += front*vec3(.28,.08,0.)*.8;
  return col;
}
`;

  const VS = `
attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = aPos*.5+.5; gl_Position = vec4(aPos,0.,1.); }`;

  const FS_GRADE = GLSL_CORE + `
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec4 uCrop;
uniform vec2 uRes;
uniform float uDev, uSeed, uGrain, uVig;
void main(){
  vec2 uv = vUv;
  vec2 tuv = uCrop.xy + uv*uCrop.zw;
  float g = hash(gl_FragCoord.xy*.731 + uSeed*91.7) - .5;
  float vig = 1. - uVig*pow(length(uv-.5)*1.25, 2.4);
  if (uDev >= .999) {
    vec2 o = vec2(.0012*uRes.y/uRes.x*1.5, .0004*1.5);
    vec3 r0 = vec3(texture2D(uTex, clamp(tuv+o,0.,1.)).r, texture2D(uTex, tuv).g, texture2D(uTex, clamp(tuv-o,0.,1.)).b);
    vec3 c0 = grade(r0);
    c0 += g*uGrain*(.55 + .45*(1.-luma(c0)));
    gl_FragColor = vec4(clamp(c0*vig,0.,1.), 1.);
    return;
  }
  float n = fbm(uv*vec2(uRes.x/uRes.y,1.)*3.2 + uSeed*13.17);
  float t = uDev;
  float rvApprox = smoothstep(n*.78+.02, n*.78+.2, t);
  float fr = rvApprox*(1.-rvApprox)*4.;
  vec2 dir = vec2(1.,.35)*(.0012 + .01*fr + .003*(1.-rvApprox))*vec2(uRes.y/uRes.x,1.)*1.5;
  vec3 raw = vec3(texture2D(uTex, clamp(tuv+dir,0.,1.)).r, texture2D(uTex, tuv).g, texture2D(uTex, clamp(tuv-dir,0.,1.)).b);
  vec3 pos = grade(raw);
  vec3 neg = negative(raw);
  float front;
  vec3 col = develop(pos, neg, t, n, front);
  col += g*uGrain*(.55 + .45*(1.-luma(col)));
  col *= vig;
  gl_FragColor = vec4(clamp(col,0.,1.), 1.);
}`;

  const FS_HERO = GLSL_CORE + `
varying vec2 vUv;
uniform sampler2D uAtlas, uEdge, uMask;
uniform vec2 uRes;          /* canvas px */
uniform vec2 uCenter;       /* strip centre, px */
uniform float uAngle, uFh, uFw, uGap, uBand, uOffset, uTime, uScroll, uDpr, uWave;
uniform float uDevA[6];
void main(){
  vec2 p = vec2(vUv.x, 1.-vUv.y)*uRes - uCenter;
  float ca = cos(uAngle), sa = sin(uAngle);
  vec2 q = vec2(ca*p.x + sa*p.y, -sa*p.x + ca*p.y);
  float wave = sin(q.x/uDpr*.0035 + uTime*.7)*uWave + sin(q.x/uDpr*.011 - uTime*1.3)*uWave*.25;
  float sy = q.y - wave;
  float hs = uFh*.5 + uBand;
  if (abs(sy) > hs + 2.*uDpr) { gl_FragColor = vec4(0.); return; }
  float P = uFw + uGap;
  float L = P*6.;
  float sx = q.x + uOffset;
  float sxl = mod(sx, L);
  float fi = floor(sxl / P);
  float lx = sxl - fi*P - uGap*.5;
  vec2 maskUv = vec2(sxl/L, (sy + hs)/(2.*hs));
  float m = texture2D(uMask, maskUv).r;
  float dGlob = 0.;
  for (int i = 0; i < 6; i++) { if (abs(float(i)-fi) < .5) dGlob = uDevA[i]; }
  float d = clamp(dGlob + m, 0., 1.);
  float edgeA = 1. - smoothstep(hs - 1.5*uDpr, hs + .5*uDpr, abs(sy));
  /* film base: orange negative base -> developed near-black */
  vec3 baseNeg = vec3(.55,.24,.07), basePos = vec3(.075,.045,.04);
  float bd = smoothstep(.2,.9,d);
  vec3 col = mix(baseNeg, basePos, bd);
  float alpha = mix(.9, .97, bd) * edgeA;
  bool inFrame = lx > 0. && lx < uFw && abs(sy) < uFh*.5;
  if (inFrame) {
    vec2 luv = vec2(lx/uFw, (sy + uFh*.5)/uFh);
    float corner = 1.;
    vec2 cd = max(abs(luv-.5)*vec2(uFw,uFh) - (vec2(uFw,uFh)*.5 - 7.*uDpr), 0.);
    corner = 1. - smoothstep(6.*uDpr, 7.*uDpr, length(cd));
    float n = (d > .001 && d < .999) ? fbm(luv*vec2(1.5,1.)*3.2 + fi*7.31) : .5;
    float rvA = smoothstep(n*.78+.02, n*.78+.2, d);
    float fr = rvA*(1.-rvA)*4.;
    vec2 dir = vec2(1.,.3)*(.0015 + .012*fr + .003*(1.-rvA));
    vec2 cell = vec2(mod(fi,3.), floor(fi/3.));
    vec2 l1 = clamp(luv+dir, .002, .998), l0 = clamp(luv, .002, .998), l2 = clamp(luv-dir, .002, .998);
    vec3 raw = vec3(texture2D(uAtlas, (cell+l1)/vec2(3.,2.)).r, texture2D(uAtlas, (cell+l0)/vec2(3.,2.)).g, texture2D(uAtlas, (cell+l2)/vec2(3.,2.)).b);
    vec3 pos = grade(raw);
    vec3 neg = negative(raw);
    float front;
    vec3 fc = develop(pos, neg, d, n, front);
    fc *= 1. - .22*pow(length(luv-.5)*1.3, 2.6);
    /* light leak creeping in from the frame edge */
    float leak = smoothstep(.55, 0., luv.x + .25*sin(uTime*.4 + fi)) * (.5 + .5*sin(uTime*.9 + fi*2.));
    fc += leak*vec3(.55,.16,.02)*.35*(1.-bd*.4);
    col = mix(col, fc, corner);
    alpha = mix(alpha, 1., corner);
  } else if (abs(sy) > uFh*.5 + uBand*.06) {
    /* sprocket band: holes on the outer side, edge printing on the inner side */
    float bandY = (abs(sy) - uFh*.5)/uBand;              /* 0 inner .. 1 outer */
    float hp = P/8.;
    float hx = mod(sx, hp) - hp*.5;
    vec2 hsz = vec2(hp*.28, uBand*.2);
    vec2 hc = vec2(hx, (bandY - .66)*uBand);
    vec2 dd = abs(hc) - hsz + 3.*uDpr;
    float hole = length(max(dd,0.)) - 3.*uDpr;
    float holeA = smoothstep(-.8*uDpr, .8*uDpr, hole);
    alpha *= holeA;
    if (bandY < .5 && sy > 0.) {
      vec2 euv = vec2(sxl/L, clamp((bandY - .07)/.38, 0., 1.));
      float e = texture2D(uEdge, euv).a * step(.07, bandY) * step(bandY, .45);
      col = mix(col, mix(vec3(1.,.72,.32), vec3(.95,.55,.2), bd), e*.9);
    }
  }
  float g = hash(gl_FragCoord.xy*.913 + fract(uTime*7.3)*91.) - .5;
  col += g*.09*(.6 + .4*(1.-luma(col)));
  gl_FragColor = vec4(col*alpha, alpha);
}`;

  const FS_BRUSH = `
precision highp float;
varying vec2 vUv;
uniform vec2 uPos; uniform vec2 uRad; uniform float uStr;
void main(){
  vec2 d = (vUv - uPos)/uRad;
  float a = exp(-dot(d,d)*2.2) * uStr;
  gl_FragColor = vec4(a, a, a, a);
}`;

  function compile(gl, vs, fs) {
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }
  function quad(gl) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    return b;
  }
  function texFrom(gl, src, opts = {}) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opts.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  const imgCache = new Map();
  function loadImage(src) {
    if (!imgCache.has(src)) {
      imgCache.set(src, new Promise((res, rej) => {
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => res(im); im.onerror = rej;
        im.src = src;
      }));
    }
    return imgCache.get(src);
  }

  /* ---------------- Grader ---------------- */
  class Grader {
    constructor() {
      this.ok = false;
      this.items = [];
      this.look = { a: 0, b: 0, mix: 0 };
      try {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 2048; this.canvas.height = 1400;
        const gl = this.canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: false, preserveDrawingBuffer: false });
        if (!gl) return;
        this.gl = gl;
        this.prog = compile(gl, VS, FS_GRADE);
        quad(gl);
        this.textures = new Map();
        this.ok = true;
      } catch (e) { console.warn('Grader unavailable', e); }
    }
    async texture(src) {
      if (this.textures.has(src)) return this.textures.get(src);
      const pr = loadImage(src).then((im) => texFrom(this.gl, im));
      this.textures.set(src, pr);
      return pr;
    }
    register(el) {
      const item = {
        el, src: el.dataset.film, dev: parseFloat(el.dataset.dev || '1'),
        seed: parseFloat(el.dataset.seed || (this.items.length * 0.37 % 7).toFixed(2)),
        fixedLook: el.dataset.look ? LOOKS[el.dataset.look] : null,
        visible: false, w: 0, h: 0, ctx: el.getContext('2d'), tex: null, dirty: true,
      };
      el._film = item;
      this.items.push(item);
      this.texture(item.src).then((t) => { item.tex = t; item.dirty = true; this.flush(); });
      return item;
    }
    size(item, force) {
      const rw = item.el.offsetWidth, rh = item.el.offsetHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, window.__CAPTURE ? 1 : 2);
      const w = Math.max(2, Math.min(2048, Math.round(rw * dpr)));
      const h = Math.max(2, Math.min(1400, Math.round(rh * dpr)));
      if (force || w !== item.w || h !== item.h) {
        if (rw < 2 || rh < 2) return false;
        item.w = w; item.h = h;
        item.el.width = w; item.el.height = h;
        item.dirty = true;
      }
      return true;
    }
    render(item) {
      if (!this.ok || !item.tex || !item.w) return;
      const gl = this.gl, P = this.prog;
      gl.viewport(0, 0, item.w, item.h);
      gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, item.tex);
      gl.uniform1i(P.u.uTex, 0);
      const im = imgCache.get(item.src);
      const iw = item._iw || 3, ih = item._ih || 2;
      const ca = item.w / item.h, ia = iw / ih;
      let sx = 1, sy = 1;
      if (ca > ia) sy = ia / ca; else sx = ca / ia;
      const ox = (1 - sx) * 0.5 + (parseFloat(item.el.dataset.panx || 0) * (1 - sx));
      gl.uniform4f(P.u.uCrop, ox, (1 - sy) * 0.5, sx, sy);
      gl.uniform2f(P.u.uRes, item.w, item.h);
      gl.uniform1f(P.u.uDev, item.dev);
      gl.uniform1f(P.u.uSeed, item.seed);
      gl.uniform1f(P.u.uGrain, parseFloat(item.el.dataset.grain || '0.07'));
      gl.uniform1f(P.u.uVig, parseFloat(item.el.dataset.vig || '0.25'));
      if (item.fixedLook != null) {
        gl.uniform1f(P.u.uLookA, item.fixedLook); gl.uniform1f(P.u.uLookB, item.fixedLook); gl.uniform1f(P.u.uLookMix, 0);
      } else {
        gl.uniform1f(P.u.uLookA, this.look.a); gl.uniform1f(P.u.uLookB, this.look.b); gl.uniform1f(P.u.uLookMix, this.look.mix);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const n = item.w * item.h * 4;
      if (!item.buf || item.buf.length !== n) { item.buf = new Uint8ClampedArray(n); item.img = new ImageData(item.buf, item.w, item.h); }
      gl.readPixels(0, 0, item.w, item.h, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(item.buf.buffer));
      item.ctx.putImageData(item.img, 0, 0);
      item.dirty = false;
      item.el.classList.add('is-ready');
    }
    /* render all dirty items (and size-check them) */
    flush(all) {
      if (!this.ok) return;
      for (const it of this.items) {
        if (!it.tex || !(all || it.visible)) continue;
        if (!it._iw) { const imP = imgCache.get(it.src); imP.then((im) => { it._iw = im.naturalWidth; it._ih = im.naturalHeight; it.dirty = true; }); }
        if (!it._iw) continue;
        if (!this.size(it)) continue;
        if (it.dirty && (all || it.visible)) this.render(it);
      }
    }
    setDev(el, v) {
      const it = el._film; if (!it) return;
      if (Math.abs(it.dev - v) > 0.002) { it.dev = v; it.dirty = true; }
    }
    markLookDirty(onlyVisible) {
      for (const it of this.items) if (it.fixedLook == null) it.dirty = true;
    }
  }

  /* ---------------- Hero film strip ---------------- */
  class HeroStrip {
    constructor(canvas, frames) {
      this.canvas = canvas;
      this.ok = false;
      this.frames = frames;
      this.dev = [0, 0, 0, 0, 0, 0];
      this.offset = 0;
      this.time = 0;
      this.painted = 0;
      this.wave = 6;
      try {
        const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
        if (!gl) return;
        this.gl = gl;
        this.prog = compile(gl, VS, FS_HERO);
        this.brush = compile(gl, VS, FS_BRUSH);
        quad(gl);
        this.ok = true;
      } catch (e) { console.warn('Hero GL unavailable', e); }
    }
    async init() {
      if (!this.ok) return false;
      const gl = this.gl;
      const ims = await Promise.all(this.frames.map(loadImage));
      const cw = 900, ch = 600;
      const atlas = document.createElement('canvas');
      atlas.width = cw * 3; atlas.height = ch * 2;
      const c = atlas.getContext('2d');
      ims.forEach((im, i) => c.drawImage(im, (i % 3) * cw, Math.floor(i / 3) * ch, cw, ch));
      this.atlas = texFrom(gl, atlas);
      /* edge printing for one loop of six frames */
      const edge = document.createElement('canvas');
      edge.width = 6 * 320; edge.height = 40;
      const e = edge.getContext('2d');
      e.fillStyle = '#fff';
      e.font = '500 22px "DM Mono", monospace';
      e.textBaseline = 'middle';
      for (let i = 0; i < 6; i++) {
        const n = 12 + i * 2;
        e.fillText(`▸ ${n}`, i * 320 + 10, 21);
        e.fillText(`OVERNIGHT 400`, i * 320 + 92, 21);
        e.fillText(`${n}A`, i * 320 + 268, 21);
      }
      this.edge = texFrom(gl, edge);
      /* developer mask in strip space */
      this.mask = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.mask);
      this.mw = 1024; this.mh = 180;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.mw, this.mh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.mask, 0);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.ready = true;
      return true;
    }
    layout(w, h, dpr, mobile) {
      this.dpr = dpr;
      this.w = w; this.h = h; this.mobile = mobile;
      const fh = mobile ? Math.min(h * 0.22, w * 0.5) : Math.min(h * 0.33, w * 0.23);
      this.g = {
        fh, fw: fh * 1.5, gap: fh * 0.09, band: fh * 0.17,
        cx: w * 0.5, cy: mobile ? h * 0.32 : h * 0.375,
        angle: mobile ? -0.1 : -0.075,
      };
      const g = this.g;
      const half = g.fh * 0.5 + g.band + Math.abs(Math.tan(g.angle)) * w * 0.5 + 34;
      this.top = Math.max(0, Math.floor(g.cy - half));
      this.ch = Math.min(h, Math.ceil(g.cy + half)) - this.top;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(this.ch * dpr);
      this.canvas.style.top = this.top + 'px';
      this.canvas.style.height = this.ch + 'px';
    }
    /* screen px -> strip coords */
    toStrip(x, y) {
      const g = this.g;
      const px = x - g.cx, py = y - g.cy;
      const ca = Math.cos(g.angle), sa = Math.sin(g.angle);
      const qx = ca * px + sa * py, qy = -sa * px + ca * py;
      const wave = Math.sin(qx * 0.0035 + this.time * 0.7) * this.wave + Math.sin(qx * 0.011 - this.time * 1.3) * this.wave * 0.25;
      const sy = qy - wave;
      const P = g.fw + g.gap, L = P * 6;
      const sx = qx + this.offset;
      const sxl = ((sx % L) + L) % L;
      const hs = g.fh * 0.5 + g.band;
      return { u: sxl / L, v: (sy + hs) / (2 * hs), inside: Math.abs(sy) < hs, L, hs };
    }
    paint(x, y, strength, radiusPx) {
      if (!this.ready) return;
      const s = this.toStrip(x, y);
      if (s.v < -0.3 || s.v > 1.3) return;
      const gl = this.gl, B = this.brush;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.viewport(0, 0, this.mw, this.mh);
      gl.useProgram(B.p);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      const rx = radiusPx / s.L, ry = radiusPx / (2 * s.hs);
      for (const du of [-1, 0, 1]) {
        if (s.u + du + rx * 2 < 0 || s.u + du - rx * 2 > 1) continue;
        gl.uniform2f(B.u.uPos, s.u + du, s.v);
        gl.uniform2f(B.u.uRad, rx, ry);
        gl.uniform1f(B.u.uStr, strength);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (s.inside) this.painted = Math.min(1, this.painted + strength * radiusPx / 9000);
    }
    clearMask() {
      if (!this.ready) return;
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.painted = 0;
    }
    render(look) {
      if (!this.ready) return;
      const gl = this.gl, P = this.prog, g = this.g, d = this.dpr;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.atlas); gl.uniform1i(P.u.uAtlas, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.edge); gl.uniform1i(P.u.uEdge, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.mask); gl.uniform1i(P.u.uMask, 2);
      gl.uniform2f(P.u.uRes, this.canvas.width, this.canvas.height);
      gl.uniform2f(P.u.uCenter, g.cx * d, (g.cy - this.top) * d);
      gl.uniform1f(P.u.uAngle, g.angle);
      gl.uniform1f(P.u.uFh, g.fh * d); gl.uniform1f(P.u.uFw, g.fw * d);
      gl.uniform1f(P.u.uGap, g.gap * d); gl.uniform1f(P.u.uBand, g.band * d);
      gl.uniform1f(P.u.uOffset, this.offset * d);
      gl.uniform1f(P.u.uTime, this.time);
      gl.uniform1f(P.u.uDpr, d);
      gl.uniform1f(P.u.uWave, this.wave * d);
      gl.uniform1fv(P.u.uDevA, this.dev);
      gl.uniform1f(P.u.uLookA, look.a); gl.uniform1f(P.u.uLookB, look.b); gl.uniform1f(P.u.uLookMix, look.mix);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  window.OvernightFilm = { Grader, HeroStrip, LOOKS, loadImage };
})();
