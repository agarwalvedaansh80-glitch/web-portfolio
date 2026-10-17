/* Ondé pigment fluid: a compact stable-fluids simulation (WebGL2, half-float)
   rendered as hair-colour pigment drifting in a bone-coloured bath.
   Also exports Swatch: a cheap metaball "liquid swatch" that morphs between colours. */
(function () {
  'use strict';
  var PIG = {
    copper: [0.71, 0.40, 0.23], brass: [0.76, 0.60, 0.27],
    ash: [0.50, 0.54, 0.58], rose: [0.74, 0.52, 0.49]
  };
  var ORDER = ['copper', 'brass', 'rose', 'ash'];
  function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }

  var VERT = '#version 300 es\nprecision highp float;in vec2 aPos;out vec2 vUv,vL,vR,vT,vB;uniform vec2 texel;void main(){vUv=aPos*.5+.5;vL=vUv-vec2(texel.x,0.);vR=vUv+vec2(texel.x,0.);vT=vUv+vec2(0.,texel.y);vB=vUv-vec2(0.,texel.y);gl_Position=vec4(aPos,0.,1.);}';
  var H = '#version 300 es\nprecision highp float;precision highp sampler2D;in vec2 vUv,vL,vR,vT,vB;out vec4 o;';
  var FS = {
    splat: H + 'uniform sampler2D uT;uniform float aspect,radius,amt;uniform vec3 color;uniform vec2 point;void main(){vec2 p=vUv-point;p.x*=aspect;float g=exp(-dot(p,p)/radius);o=texture(uT,vUv)+vec4(color*g,amt*g);}',
    advect: H + 'uniform sampler2D uV,uS;uniform vec2 simTexel;uniform float dt,diss;void main(){vec2 c=vUv-dt*texture(uV,vUv).xy*simTexel;o=texture(uS,c)/(1.+diss*dt);}',
    div: H + 'uniform sampler2D uV;void main(){float L=texture(uV,vL).x,R=texture(uV,vR).x,T=texture(uV,vT).y,B=texture(uV,vB).y;vec2 C=texture(uV,vUv).xy;if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;o=vec4(.5*(R-L+T-B),0.,0.,1.);}',
    curl: H + 'uniform sampler2D uV;void main(){float L=texture(uV,vL).y,R=texture(uV,vR).y,T=texture(uV,vT).x,B=texture(uV,vB).x;o=vec4(.5*(R-L-T+B),0.,0.,1.);}',
    vort: H + 'uniform sampler2D uV,uC;uniform float curl,dt;void main(){float L=texture(uC,vL).x,R=texture(uC,vR).x,T=texture(uC,vT).x,B=texture(uC,vB).x,C=texture(uC,vUv).x;vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+1e-4;f*=curl*C;f.y*=-1.;vec2 v=texture(uV,vUv).xy+f*dt;o=vec4(clamp(v,-1000.,1000.),0.,1.);}',
    pres: H + 'uniform sampler2D uP,uD;void main(){float L=texture(uP,vL).x,R=texture(uP,vR).x,T=texture(uP,vT).x,B=texture(uP,vB).x;o=vec4((L+R+B+T-texture(uD,vUv).x)*.25,0.,0.,1.);}',
    grad: H + 'uniform sampler2D uP,uV;void main(){float L=texture(uP,vL).x,R=texture(uP,vR).x,T=texture(uP,vT).x,B=texture(uP,vB).x;vec2 v=texture(uV,vUv).xy-vec2(R-L,T-B);o=vec4(v,0.,1.);}',
    clear: H + 'uniform sampler2D uT;uniform float val;void main(){o=val*texture(uT,vUv);}',
    show: H + 'uniform sampler2D uD;uniform vec2 dT;uniform vec3 bg;uniform float t,maxA;uniform vec4 fade;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){vec4 d=texture(uD,vUv);float a=max(d.a,0.);vec3 pig=d.rgb/max(a,1e-3);float aL=texture(uD,vUv-vec2(dT.x,0.)).a,aR=texture(uD,vUv+vec2(dT.x,0.)).a,aT=texture(uD,vUv+vec2(0.,dT.y)).a,aB=texture(uD,vUv-vec2(0.,dT.y)).a;vec3 n=normalize(vec3((aL-aR)*2.2,(aB-aT)*2.2,1.));vec3 l=normalize(vec3(-.4,.55,1.));float df=dot(n,l);float sp=pow(max(dot(reflect(-l,n),vec3(0.,0.,1.)),0.),28.);float cov=(1.-exp(-a*1.9))*maxA*mix(fade.z,1.,smoothstep(fade.x,fade.y,fade.w<.5?vUv.x:fade.w<1.5?1.-vUv.y:vUv.y));vec3 col=mix(bg,clamp(pig,0.,1.)*(.82+.28*df),cov);col+=sp*.22*cov;col+=(h(gl_FragCoord.xy+t)-.5)*.022;o=vec4(col,1.);}'
  };

  function Fluid(canvas, opts) {
    opts = opts || {};
    this.c = canvas; this.calm = !!opts.calm; this.still = !!opts.still; this.ok = false;
    var gl = canvas.getContext('webgl2', { alpha: false, depth: false, stencil: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserve });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) { canvas.classList.add('is-fallback'); return; }
    gl.getExtension('OES_texture_float_linear');
    this.gl = gl;
    var mobile = Math.min(innerWidth, innerHeight) < 700;
    this.simRes = opts.simRes || (mobile ? 96 : 128);
    this.dyeRes = opts.dyeRes || (mobile ? 384 : 640);
    this.dpr = Math.min(window.devicePixelRatio || 1, opts.dprCap || 1.5); this.minFrame = opts.minFrame || 0;
    try { this.build(); } catch (e) { console.warn('fluid', e); canvas.classList.add('is-fallback'); return; }
    this.ok = true; this.t = 0; this.last = 0; this.pointer = null; this.pcol = 0; this.running = true; this.visible = true;
    this.bg = opts.bg || [0.937, 0.918, 0.886];
    this.maxA = opts.maxA || (this.calm ? 0.72 : 0.86); this.fade = opts.fade || null;
    this.resize();
    var self = this;
    this.order = opts.palette && opts.palette.length ? opts.palette : ORDER;
    this.emitters = (this.calm ? [0, 1] : [0, 1, 2, 3]).map(function (i) {
      return { ph: i * 1.7 + 0.3, sp: 0.16 + i * 0.035, col: PIG[self.order[i % self.order.length]] || PIG.copper, cx: self.calm ? 0.55 + i * 0.25 : [0.7, 0.82, 0.5, 0.9][i], cy: [0.55, 0.35, 0.25, 0.75][i] };
    });
    this.seed();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; }).observe(canvas);
  }
  Fluid.prototype.build = function () {
    var gl = this.gl, self = this;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var vs = sh(gl.VERTEX_SHADER, VERT);
    this.p = {};
    Object.keys(FS).forEach(function (k) {
      var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS[k])); gl.bindAttribLocation(pr, 0, 'aPos'); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      var u = {}, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) { var nm = gl.getActiveUniform(pr, i).name; u[nm] = gl.getUniformLocation(pr, nm); }
      self.p[k] = { pr: pr, u: u };
    });
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
  };
  Fluid.prototype.fbo = function (w, h, fmt, ifmt) {
    var gl = this.gl; gl.activeTexture(gl.TEXTURE0);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, gl.HALF_FLOAT, null);
    var fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('fbo');
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex: tex, fb: fb, w: w, h: h };
  };
  Fluid.prototype.dbl = function (w, h, fmt, ifmt) {
    var a = this.fbo(w, h, fmt, ifmt), b = this.fbo(w, h, fmt, ifmt);
    return { r: a, w: b, swap: function () { var t = this.r; this.r = this.w; this.w = t; } };
  };
  Fluid.prototype.dims = function (res) {
    var ar = this.c.width / this.c.height; if (ar < 1) ar = 1 / ar;
    var mn = Math.round(res), mx = Math.round(res * ar);
    return this.c.width > this.c.height ? [mx, mn] : [mn, mx];
  };
  Fluid.prototype.resize = function () {
    var w = Math.max(2, Math.round(this.c.clientWidth * this.dpr)), h = Math.max(2, Math.round(this.c.clientHeight * this.dpr));
    if (this.c.width === w && this.c.height === h && this.vel) return false;
    this.c.width = w; this.c.height = h;
    var gl = this.gl, s = this.dims(this.simRes), d = this.dims(this.dyeRes);
    this.vel = this.dbl(s[0], s[1], gl.RGBA, gl.RGBA16F);
    this.dye = this.dbl(d[0], d[1], gl.RGBA, gl.RGBA16F);
    this.prs = this.dbl(s[0], s[1], gl.RGBA, gl.RGBA16F);
    this.dv = this.fbo(s[0], s[1], gl.RGBA, gl.RGBA16F);
    this.cu = this.fbo(s[0], s[1], gl.RGBA, gl.RGBA16F);
    return true;
  };
  Fluid.prototype.use = function (k) { var p = this.p[k]; this.gl.useProgram(p.pr); return p.u; };
  Fluid.prototype.tex = function (u, name, t, unit) { var gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.uniform1i(u[name], unit); };
  Fluid.prototype.blit = function (target) {
    var gl = this.gl;
    if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); }
    else { gl.viewport(0, 0, this.c.width, this.c.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  Fluid.prototype.splat = function (x, y, dx, dy, col, amt, rad) {
    var gl = this.gl, u = this.use('splat'), ar = this.c.width / this.c.height;
    gl.uniform2f(u.texel, 1 / this.vel.r.w, 1 / this.vel.r.h);
    gl.uniform1f(u.aspect, ar); gl.uniform2f(u.point, x, y); gl.uniform1f(u.radius, (rad || 0.0022) * (ar > 1 ? 1 : 1 / ar));
    this.tex(u, 'uT', this.vel.r, 0); gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.amt, 0); this.blit(this.vel.w); this.vel.swap();
    if (col) {
      this.tex(u, 'uT', this.dye.r, 0); gl.uniform3f(u.color, col[0] * amt, col[1] * amt, col[2] * amt); gl.uniform1f(u.amt, amt);
      gl.uniform1f(u.radius, (rad || 0.0022) * 1.15 * (ar > 1 ? 1 : 1 / ar)); this.blit(this.dye.w); this.dye.swap();
    }
  };
  Fluid.prototype.seed = function () {
    var calm = this.calm, xs = calm ? [0.62, 0.8, 0.95, 0.72] : [0.56, 0.74, 0.9, 0.66, 0.84, 0.4];
    var ys = calm ? [0.7, 0.35, 0.75, 0.15] : [0.25, 0.62, 0.3, 0.86, 0.12, 0.05];
    for (var i = 0; i < xs.length; i++) {
      var a = i * 2.39; this.splat(xs[i], ys[i], Math.cos(a) * 340, Math.sin(a) * 340, PIG[this.order[i % this.order.length]] || PIG.copper, calm ? 0.6 : 0.75, calm ? 0.008 : 0.01);
    }
  };
  Fluid.prototype.move = function (x, y, dx, dy) {
    // x,y in 0..1 (y up); dx,dy deltas in uv
    if (!this.ok) return;
    this.pcol += Math.hypot(dx, dy) * 0.9;
    var o = this.order, k = Math.floor(this.pcol) % o.length, f = this.pcol % 1, a = PIG[o[k]], b = PIG[o[(k + 1) % o.length]];
    var col = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    this.pending = (this.pending || []); this.pending.push([x, y, dx * 5200, dy * 5200, col]);
  };
  Fluid.prototype.step = function (dt) {
    var gl = this.gl, u, s = this.vel.r, sT = [1 / s.w, 1 / s.h];
    gl.disable(gl.BLEND);
    // ambient emitters: slow orbiting ribbons of pigment
    var t = this.t;
    for (var i = 0; i < this.emitters.length; i++) {
      var e = this.emitters[i], w = e.sp, ph = e.ph;
      var x = e.cx + Math.cos(t * w + ph) * (this.calm ? 0.22 : 0.2), y = e.cy + Math.sin(t * w * 1.3 + ph * 1.7) * (this.calm ? 0.28 : 0.24);
      var vx = -Math.sin(t * w + ph) * w * 0.2, vy = Math.cos(t * w * 1.3 + ph * 1.7) * w * 1.3 * 0.24;
      this.splat(x, y, vx * 900, vy * 900, e.col, (this.calm ? 0.03 : 0.04) * dt * 60, 0.0014);
    }
    if (this.pending) { for (var j = 0; j < this.pending.length; j++) { var p = this.pending[j]; this.splat(p[0], p[1], p[2], p[3], p[4], 0.26, 0.0022); } this.pending = null; }
    u = this.use('curl'); gl.uniform2f(u.texel, sT[0], sT[1]); this.tex(u, 'uV', this.vel.r, 0); this.blit(this.cu);
    u = this.use('vort'); gl.uniform2f(u.texel, sT[0], sT[1]); this.tex(u, 'uV', this.vel.r, 0); this.tex(u, 'uC', this.cu, 1); gl.uniform1f(u.curl, 24); gl.uniform1f(u.dt, dt); this.blit(this.vel.w); this.vel.swap();
    u = this.use('div'); gl.uniform2f(u.texel, sT[0], sT[1]); this.tex(u, 'uV', this.vel.r, 0); this.blit(this.dv);
    u = this.use('clear'); gl.uniform2f(u.texel, sT[0], sT[1]); this.tex(u, 'uT', this.prs.r, 0); gl.uniform1f(u.val, 0.8); this.blit(this.prs.w); this.prs.swap();
    u = this.use('pres'); gl.uniform2f(u.texel, sT[0], sT[1]); this.tex(u, 'uD', this.dv, 1);
    for (var k = 0; k < 16; k++) { this.tex(u, 'uP', this.prs.r, 0); this.blit(this.prs.w); this.prs.swap(); }
    u = this.use('grad'); gl.uniform2f(u.texel, sT[0], sT[1]); this.tex(u, 'uP', this.prs.r, 0); this.tex(u, 'uV', this.vel.r, 1); this.blit(this.vel.w); this.vel.swap();
    u = this.use('advect'); gl.uniform2f(u.texel, sT[0], sT[1]); gl.uniform2f(u.simTexel, sT[0], sT[1]); gl.uniform1f(u.dt, dt);
    this.tex(u, 'uV', this.vel.r, 0); this.tex(u, 'uS', this.vel.r, 1); gl.uniform1f(u.diss, 0.35); this.blit(this.vel.w); this.vel.swap();
    gl.uniform2f(u.texel, 1 / this.dye.r.w, 1 / this.dye.r.h);
    this.tex(u, 'uV', this.vel.r, 0); this.tex(u, 'uS', this.dye.r, 1); gl.uniform1f(u.diss, this.calm ? 0.32 : 0.38); this.blit(this.dye.w); this.dye.swap();
  };
  Fluid.prototype.render = function () {
    var gl = this.gl, u = this.use('show');
    gl.uniform2f(u.texel, 0, 0); gl.uniform2f(u.dT, 1 / this.dye.r.w, 1 / this.dye.r.h);
    gl.uniform3f(u.bg, this.bg[0], this.bg[1], this.bg[2]); gl.uniform1f(u.t, (this.t * 60) % 1000); gl.uniform1f(u.maxA, this.maxA); var fz = !this.fade ? [0, 0.001, 1, 0] : this.c.width > this.c.height * 1.1 ? this.fade.concat(0) : (this.calm ? [0.3, 0.85, this.fade[2], 2] : [0.2, 0.62, this.fade[2] + 0.12, 1]); gl.uniform4f(u.fade, fz[0], fz[1], fz[2], fz[3]);
    this.tex(u, 'uD', this.dye.r, 0); this.blit(null);
  };
  Fluid.prototype.frame = function (now) {
    if (!this.ok) return;
    if (!this.last) this.last = now;
    var dt = Math.min((now - this.last) / 1000, 1 / 30); this.last = now;
    if (this.still) { if (!this.drawn) { this.resize(); for (var i = 0; i < 90; i++) { this.t += 1 / 60; this.step(1 / 60); } this.render(); this.drawn = true; } return; }
    if (!this.visible || document.hidden || dt <= 0) return;
    if (this.minFrame && now - (this.lastDraw || 0) < this.minFrame) { this.last = now - dt * 1000; return; }
    this.lastDraw = now;
    if (this.resize()) this.seed();
    this.t += dt; this.step(dt); this.render();
  };

  /* ---------------- Liquid swatch (WebGL1, metaballs + colour front) ---------------- */
  var SW_V = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  var SW_F = 'precision highp float;varying vec2 v;uniform float t,m;uniform vec3 a,b;uniform vec2 ms;' +
    'float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
    'float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}' +
    'float fb(vec2 p){float s=0.,w=.5;for(int i=0;i<4;i++){s+=w*n2(p);p*=2.03;w*=.5;}return s;}' +
    'float fld(vec2 p){float f=0.;for(int i=0;i<5;i++){float fi=float(i);vec2 c=vec2(cos(t*.33*(1.+fi*.17)+fi*2.1),sin(t*.27*(1.+fi*.13)+fi*1.3))*(.2+.05*fi);c+=ms*.12;float r=.3+.04*sin(t*.5+fi*1.7);f+=r*r/max(dot(p-c,p-c),1e-4);}return f;}' +
    'float hh(vec2 p){return 1.-exp(-max(fld(p)-.9,0.)*1.3);}' +
    'void main(){vec2 p=(v-.5)*2.1;vec2 w=p+.14*(vec2(fb(p*1.5+t*.12),fb(p*1.5-t*.1+7.))-.5);' +
    'float f=fld(w);float e=.015;float fx=hh(w+vec2(e,0.))-hh(w-vec2(e,0.)),fy=hh(w+vec2(0.,e))-hh(w-vec2(0.,e));' +
    'float in1=smoothstep(.97,1.06,f);vec3 n=normalize(vec3(-fx*9.,-fy*9.,1.));vec3 l=normalize(vec3(-.45,.55,1.));' +
    'float front=m*1.75-(length(w)*.75+fb(w*2.2+t*.18)*.75);float k=smoothstep(0.,.14,front);' +
    'float swirl=fb(w*3.+vec2(t*.2,-t*.15));vec3 col=mix(a,b,k);col*=.92+.16*swirl;' +
    'float df=dot(n,l);float sp=pow(max(dot(reflect(-l,n),vec3(0.,0.,1.)),0.),30.);' +
    'col=col*(.55+.55*df)+sp*.45;gl_FragColor=vec4(col*in1,in1);}';
  function Swatch(canvas, hex) {
    this.c = canvas; this.ok = false;
    var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!gl) { this.fallback(hex); return; }
    this.gl = gl;
    function sh(tp, s) { var o = gl.createShader(tp); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, SW_V)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, SW_F)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { this.fallback(hex); return; }
    gl.useProgram(pr); this.u = {};
    var self = this;['t', 'm', 'a', 'b', 'ms'].forEach(function (k) { self.u[k] = gl.getUniformLocation(pr, k); });
    var bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(loc);
    this.a = hexRgb(hex || '#8a7f74'); this.b = this.a.slice(); this.m = 1; this.mt = 1; this.t = Math.random() * 10; this.ms = [0, 0]; this.mst = [0, 0];
    this.ok = true; this.visible = true; this.last = 0;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; }).observe(canvas);
  }
  Swatch.prototype.fallback = function (hex) { this.c.style.borderRadius = '50%'; this.c.style.background = hex; this.c.style.transition = 'background .8s'; };
  Swatch.prototype.set = function (hex) {
    if (!this.ok) { this.c.style.background = hex; return; }
    var nb = hexRgb(hex);
    if (Math.abs(nb[0] - this.b[0]) + Math.abs(nb[1] - this.b[1]) + Math.abs(nb[2] - this.b[2]) < 0.01) return;
    // freeze the current visible blend as the new base colour
    var k = Math.min(1, this.m);
    this.a = [this.a[0] + (this.b[0] - this.a[0]) * k, this.a[1] + (this.b[1] - this.a[1]) * k, this.a[2] + (this.b[2] - this.a[2]) * k];
    this.b = nb; this.m = 0;
  };
  Swatch.prototype.pointer = function (x, y) { this.mst = [x, y]; };
  Swatch.prototype.frame = function (now) {
    if (!this.ok || !this.visible) return;
    var dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0.016; this.last = now;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(this.c.clientWidth * dpr), h = Math.round(this.c.clientHeight * dpr);
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.t += dt; this.m = Math.min(1.2, this.m + dt / 1.1);
    this.ms[0] += (this.mst[0] - this.ms[0]) * 0.06; this.ms[1] += (this.mst[1] - this.ms[1]) * 0.06;
    var gl = this.gl; gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(this.u.t, this.t); gl.uniform1f(this.u.m, this.m); gl.uniform3fv(this.u.a, this.a); gl.uniform3fv(this.u.b, this.b); gl.uniform2fv(this.u.ms, this.ms);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  window.OndeFluid = Fluid;
  window.OndeSwatch = Swatch;
})();
