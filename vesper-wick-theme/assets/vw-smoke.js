/* Vesper & Wick — candle flame + rising smoke (WebGL2 advection of a density field through a curl-noise velocity field).
   The smoke leans toward the cursor; the flame flickers and sways. */
(function () {
  var NOISE = [
    'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    'return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}'
  ].join('\n');
  var VS = '#version 300 es\nlayout(location=0) in vec2 a;out vec2 vUv;void main(){vUv=a*.5+.5;gl_Position=vec4(a,0,1);}';
  var ADV = '#version 300 es\nprecision highp float;in vec2 vUv;out vec4 o;\n' +
    'uniform sampler2D uD;uniform float uT,uDt,uAsp,uDiss,uSrc,uMOn;uniform vec2 uF,uM,uMV;\n' + NOISE + '\n' +
    'float pot(vec2 p){return noise(p)*.7+noise(p*2.13+7.3)*.3;}\n' +
    'vec2 curl(vec2 p){float e=.03,c=pot(p);return vec2(pot(p+vec2(0,e))-c,-(pot(p+vec2(e,0))-c))/e;}\n' +
    'vec2 curl1(vec2 p){float e=.05,c=noise(p);return vec2(noise(p+vec2(0,e))-c,-(noise(p+vec2(e,0))-c))/e;}\n' +
    'vec2 vel(vec2 p){float h=p.y-uF.y;float turb=smoothstep(.0,.32,h);' +
    'vec2 v=vec2(0.,.12+.08*smoothstep(-.02,.06,h));' +
    'v+=curl(p*6.+vec2(uT*.1,-uT*.9))*(.003+.05*turb)+curl(p*2.2+vec2(3.,-uT*.38))*(.004+.13*turb)+curl1(p*.9+vec2(9.,-uT*.12))*.05*turb;' +
    'v.x+=(noise(vec2(uT*.21,1.7))-.5)*.14*turb;' +
    'vec2 d=uM-p;float r2=dot(d,d);' +
    'v+=d*1.15*exp(-r2/.07)*uMOn*smoothstep(0.,.1,h);' +
    'v+=uMV*exp(-r2/.01)*.8;return v;}\n' +
    'uniform vec2 uTx;\n' +
    'void main(){vec2 p=vec2(vUv.x*uAsp,vUv.y);vec2 v=vel(p);vec2 b=p-v*uDt;vec2 bu=vec2(b.x/uAsp,b.y);' +
    'float c=texture(uD,bu).r;float n4=(texture(uD,bu+vec2(uTx.x,0.)).r+texture(uD,bu-vec2(uTx.x,0.)).r+texture(uD,bu+vec2(0.,uTx.y)).r+texture(uD,bu-vec2(0.,uTx.y)).r)*.25;' +
    'float h=p.y-uF.y;float d=mix(c,n4,.08+.3*smoothstep(.05,.5,h))*pow(uDiss,uDt*60.);' +
    'vec2 q=p-uF;float s=exp(-(q.x*q.x)/(.0065*.0065)-(q.y*q.y)/(.012*.012));' +
    'd+=s*uSrc*uDt*60.*.3;d*=smoothstep(1.,.86,vUv.y);' +
    'float hz=noise(p*1.4+vec2(uT*.02,-uT*.035))*.6+noise(p*3.2-uT*.025)*.4;' +
    'o=vec4(clamp(d,0.,1.6),smoothstep(.4,.95,hz),0,1);}';
  var DISP = '#version 300 es\nprecision highp float;out vec4 o;\n' +
    'uniform sampler2D uD;uniform vec2 uRes,uFp;uniform float uT,uFl,uSc,uLean,uAsp,uAmt;\n' + NOISE + '\n' +
    'vec3 flame(vec2 q){float H=.058*(.9+.18*uFl),W=H*.2;q.y-=.003;float y=q.y/H;' +
    'q.x-=(uLean+sin(uT*7.3)*.0009+(noise(vec2(uT*5.,0.))-.5)*.003)*max(y,0.)*max(y,0.);' +
    'vec2 s=vec2(q.x/W,y);float tp=pow(clamp(1.-s.y,0.,1.),.75);float rx=abs(s.x)/max(.001,tp);float ry=s.y<0.?-s.y/.22:0.;float r=length(vec2(rx,ry));' +
    'float body=smoothstep(1.,.5,r);float inner=smoothstep(.75,.05,r)*smoothstep(-.12,.2,s.y)*smoothstep(1.,.35,s.y);' +
    'vec3 c=vec3(1.,.46,.12)*body*1.25+vec3(1.,.88,.66)*inner*1.15;' +
    'float bl=smoothstep(.22,-.04,s.y)*smoothstep(1.,.45,r);c=mix(c,vec3(.25,.42,1.)*.8,bl*.55);' +
    'c+=vec3(1.,.52,.18)*exp(-length(vec2(s.x*.6,s.y-.35))*2.2)*.2*uFl;return c;}\n' +
    'void main(){vec2 fc=gl_FragCoord.xy;vec2 uv=fc/uRes;vec2 p=vec2(uv.x*uAsp,uv.y);' +
    'vec2 tx=texture(uD,uv).rg;float d=tx.r;float sm=0.;' +
    'if(d>.012){float det=noise(p*13.+vec2(0.,-uT*.55))*.55+noise(p*27.-vec2(uT*.2,uT*.9))*.3+.45;sm=pow(smoothstep(.012,1.25,d),.62)*(.5+.65*det)*uAmt;}' +
    'float hz=tx.g*.05*uAmt;' +
    'vec2 fp=(fc-uFp)/uSc;float rg=length(fp*vec2(1.,.75));' +
    'float glow=(exp(-rg*5.5)*.42+exp(-rg*24.)*.55)*uFl;' +
    'vec3 sc=mix(vec3(.74,.70,.65),vec3(1.,.64,.38),clamp(exp(-rg*4.5)*1.4,0.,1.));' +
    'float lit=.42+1.1*exp(-rg*2.6)*uFl;' +
    'vec3 col=sc*sm*.6*lit+vec3(.93,.88,.82)*hz+vec3(1.,.42,.14)*glow*.6;' +
    'if(abs(fp.x)<.06&&fp.y>-.04&&fp.y<.12)col+=flame(fp);' +
    'col+=(hash(fc+fract(uT)*91.)-.5)*.008;o=vec4(max(col,0.),0.);}';

  function sh(gl, type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function prog(gl, fs) {
    var p = gl.createProgram(); gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u };
  }

  function init(opts) {
    var canvas = opts.canvas, host = opts.host, anchor = opts.anchor, tip = opts.tip || { x: .5, y: .2 };
    var reduce = opts.reduced;
    var gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) return null;
    var half = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    var adv, disp;
    try { adv = prog(gl, ADV); disp = prog(gl, DISP); } catch (e) { console.warn('smoke shader', e); return null; }
    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var W, H, SW, SH, asp, scale, tex = [], fbo = [], cur = 0;
    function mkTex(w, h) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    var flame = { x: .5, y: .3 }, flamePx = [0, 0], fs = 1;
    function resize() {
      var r = host.getBoundingClientRect(); var dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.25) * (window.__vwScale || 1);
      W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
      canvas.width = W; canvas.height = H; asp = W / H; scale = H;
      var nSW = Math.min(420, Math.max(160, Math.round(r.width * .3))), nSH = Math.round(nSW / asp);
      if (nSW !== SW || nSH !== SH) {
        SW = nSW; SH = nSH;
        tex.forEach(function (t) { gl.deleteTexture(t); }); fbo.forEach(function (f) { gl.deleteFramebuffer(f); });
        tex = [mkTex(SW, SH), mkTex(SW, SH)]; fbo = tex.map(function (t) { var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); return f; });
      }
      place();
    }
    function place() {
      var hr = host.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
      var fx = ar.left - hr.left + ar.width * tip.x, fy = ar.top - hr.top + ar.height * tip.y;
      flame.x = (fx / hr.width) * asp; flame.y = 1 - fy / hr.height;
      flamePx = [fx / hr.width * W, (1 - fy / hr.height) * H];
      fs = Math.max(.5, Math.min(1.3, (ar.width / hr.height) / .46)); scale = H * fs;
    }

    var mouse = { x: -9, y: -9, tx: -9, ty: -9, on: 0, ton: 0, vx: 0, vy: 0, lx: null, ly: null };
    function onMove(e) {
      var r = host.getBoundingClientRect(); if (!r.height) return;
      var x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
      mouse.tx = x * asp; mouse.ty = y; mouse.ton = (y >= 0 && y <= 1 && x >= 0 && x <= 1) ? 1 : 0;
      if (mouse.x < -5) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', function () { mouse.ton = 0; });

    var t = 0, last = 0, running = false, visible = true, raf = 0, flick = 1, lean = 0, fseed = Math.random() * 100;
    function n1(x) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); function h(n) { var s = Math.sin(n * 127.1 + fseed) * 43758.5453; return s - Math.floor(s); } return h(i) * (1 - u) + h(i + 1) * u; }

    function step(dt) {
      // smooth cursor + velocity
      var px = mouse.x, py = mouse.y;
      mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 10); mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 10);
      var vx = (mouse.x - px) / Math.max(dt, 1e-3), vy = (mouse.y - py) / Math.max(dt, 1e-3);
      mouse.vx += (Math.max(-2, Math.min(2, vx)) - mouse.vx) * .25; mouse.vy += (Math.max(-2, Math.min(2, vy)) - mouse.vy) * .25;
      mouse.on += (mouse.ton - mouse.on) * Math.min(1, dt * 3);
      flick = .86 + .2 * n1(t * 6.5) - .1 * Math.pow(n1(t * 2.3 + 40), 4) + .04 * Math.sin(t * 31);
      var want = mouse.on * Math.max(-.012, Math.min(.012, (mouse.x - flame.x) * .03)) - mouse.vx * .004 * mouse.on;
      lean += (want - lean) * Math.min(1, dt * 4);
      gl.useProgram(adv.p); gl.viewport(0, 0, SW, SH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]); gl.uniform1i(adv.u.uD, 0);
      gl.uniform1f(adv.u.uT, t); gl.uniform1f(adv.u.uDt, dt); gl.uniform1f(adv.u.uAsp, asp); gl.uniform1f(adv.u.uDiss, .9974);
      gl.uniform1f(adv.u.uSrc, .9 + .3 * n1(t * 2.1 + 9)); gl.uniform2f(adv.u.uTx, 1 / SW, 1 / SH); gl.uniform1f(adv.u.uMOn, mouse.on);
      gl.uniform2f(adv.u.uF, flame.x + lean * fs, flame.y + .052 * fs);
      gl.uniform2f(adv.u.uM, mouse.x, mouse.y); gl.uniform2f(adv.u.uMV, mouse.vx * mouse.on, mouse.vy * mouse.on);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]); gl.drawArrays(gl.TRIANGLES, 0, 3); cur = 1 - cur;
    }
    function draw() {
      gl.useProgram(disp.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]); gl.uniform1i(disp.u.uD, 0);
      gl.uniform2f(disp.u.uRes, W, H); gl.uniform2f(disp.u.uFp, flamePx[0], flamePx[1]);
      gl.uniform1f(disp.u.uT, t); gl.uniform1f(disp.u.uFl, flick); gl.uniform1f(disp.u.uSc, scale); gl.uniform1f(disp.u.uLean, lean); gl.uniform1f(disp.u.uAsp, asp);
      gl.uniform1f(disp.u.uAmt, opts.amount || 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (opts.onFrame) opts.onFrame(flick);
    }
    function frame(now) {
      raf = 0; if (!running) return;
      if (window.__vwRec) { if (last && now - last < 30) { raf = requestAnimationFrame(frame); return; } last = now; t += 1 / 30; step(1 / 30); draw(); raf = requestAnimationFrame(frame); return; }
      var dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now;
      var n = Math.max(1, Math.ceil(dt / (1 / 60) - .01)), sdt = dt / n;
      for (var i = 0; i < n; i++) { t += sdt; step(sdt); }
      draw(); raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduce) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    resize();
    window.addEventListener('resize', function () { resize(); if (reduce) still(); });
    function still() { for (var i = 0; i < 260; i++) { t += 1 / 60; step(1 / 60); } draw(); }
    if (reduce) still();
    else {
      for (var i = 0; i < 90; i++) { t += 1 / 60; step(1 / 60); }
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(host);
      start();
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
    return { place: place, resize: resize };
  }
  window.VWSmoke = { init: init };
})();
