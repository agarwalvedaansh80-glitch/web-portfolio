/* Signature effects library (calm, phone safe). Activated by data attributes. Requires gsap + ScrollTrigger globals. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const FX = window.FX = {};

  /* ---------- character blur reveal ---------- */
  FX.blurchars = () => $$('[data-fx="blurchars"]').forEach(el => {
    if (el._fx) return; el._fx = 1;
    const walk = n => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return;
          if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(' ')); return; }
          const ws = document.createElement('span'); ws.className = 'fxw';
          [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'fxc'; s.textContent = ch; ws.appendChild(s); });
          f.appendChild(ws);
        });
        c.replaceWith(f);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
    });
    walk(el);
    const cs = $$('.fxc', el);
    gsap.set(cs, { opacity: 0, filter: 'blur(10px)', y: '0.35em' });
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () =>
      gsap.to(cs, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.6, ease: 'power3.out', stagger: { each: 0.022 }, clearProps: 'filter' }) });
  });

  /* ---------- text fills with gradient on scroll ---------- */
  FX.fill = () => $$('[data-fx="fill"]').forEach(el => {
    if (el._fx) return; el._fx = 1; el.classList.add('fx-fill');
    gsap.fromTo(el, { backgroundPositionX: '100%' }, { backgroundPositionX: '0%', ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 45%', scrub: 1.2 } });
  });

  /* ---------- number counters (real numbers only) ---------- */
  FX.count = () => $$('[data-fx-count]').forEach(el => {
    if (el._fx) return; el._fx = 1;
    const to = +el.dataset.fxCount, from = +(el.dataset.fxFrom || 0), o = { v: from };
    el.textContent = from;
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () =>
      gsap.to(o, { v: to, duration: 2.4, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v) }) });
  });

  /* ---------- text scramble on hover (labels) ---------- */
  FX.scramble = () => {
    const G = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $$('[data-fx="scramble"]').forEach(el => {
      if (el._fx) return; el._fx = 1; const orig = el.textContent; let raf = 0;
      const run = () => {
        cancelAnimationFrame(raf); const t0 = performance.now(), D = 700;
        const step = t => { const p = clamp((t - t0) / D), n = Math.floor(p * orig.length);
          el.textContent = orig.split('').map((c, i) => i < n || c === ' ' ? c : G[(Math.random() * 26) | 0]).join('');
          if (p < 1) raf = requestAnimationFrame(step); else el.textContent = orig; };
        raf = requestAnimationFrame(step);
      };
      (el.closest('a,button,li,article') || el).addEventListener('pointerenter', () => FINE && run());
    });
  };

  /* ---------- clip-path reveals: arch, circle, diagonal, blinds, curtain ---------- */
  FX.reveal = () => $$('[data-fx-reveal]').forEach(el => {
    if (el._fx) return; el._fx = 1; const k = el.dataset.fxReveal;
    const st = { trigger: el, start: 'top 82%', once: true };
    const img = el.querySelector('img');
    if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 2.2, ease: 'power3.out', scrollTrigger: st });
    if (k === 'arch') gsap.fromTo(el, { clipPath: 'inset(38% 22% 0% 22% round 999px 999px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0px 0px)', duration: 2, ease: 'power3.inOut', scrollTrigger: st });
    else if (k === 'circle') gsap.fromTo(el, { clipPath: 'circle(0% at 50% 55%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 2, ease: 'power3.inOut', scrollTrigger: st });
    else if (k === 'diagonal') gsap.fromTo(el, { clipPath: 'polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)' }, { clipPath: 'polygon(0% 0%, 200% 0%, 0% 200%, 0% 0%)', duration: 2, ease: 'power3.inOut', scrollTrigger: st });
    else if (k === 'blinds' || k === 'curtain') {
      const n = k === 'blinds' ? 7 : 2, wrap = document.createElement('div'); wrap.className = 'fx-blinds ' + k;
      for (let i = 0; i < n; i++) wrap.appendChild(document.createElement('i'));
      el.appendChild(wrap);
      if (k === 'blinds') gsap.to($$('i', wrap), { scaleY: 0, duration: 1.6, ease: 'power3.inOut', stagger: 0.09, scrollTrigger: st });
      else gsap.to($$('i', wrap), { scaleX: 0, duration: 1.8, ease: 'power4.inOut', scrollTrigger: st });
    }
  });

  /* ---------- light beam sweep over an image ---------- */
  FX.sweep = () => $$('[data-fx="sweep"]').forEach(el => {
    if (el._fx) return; el._fx = 1; const b = document.createElement('i'); b.className = 'fx-beam'; el.appendChild(b);
    gsap.fromTo(b, { xPercent: -160 }, { xPercent: 260, duration: 3.6, ease: 'sine.inOut', repeat: -1, repeatDelay: 4.5 });
  });

  /* ---------- hover Ken Burns cards + scroll Ken Burns with parallax layers ---------- */
  FX.kb = () => {
    $$('[data-fx="kb"]').forEach(el => { if (el._fx) return; el._fx = 1; el.classList.add('fx-kb'); });
    $$('[data-fx="kbscroll"]').forEach(el => {
      if (el._fx) return; el._fx = 1; const bg = $('.fx-kb-bg', el), mid = $('.fx-kb-mid', el), fg = $('.fx-kb-fg', el);
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.4 } });
      if (bg) tl.fromTo(bg, { scale: 1.22, xPercent: -2, yPercent: -4 }, { scale: 1.02, xPercent: 2, yPercent: 4, ease: 'none' }, 0);
      if (mid) tl.fromTo(mid, { yPercent: 18 }, { yPercent: -18, ease: 'none' }, 0);
      if (fg) tl.fromTo(fg, { yPercent: 40 }, { yPercent: -30, ease: 'none' }, 0);
    });
  };

  /* ---------- magnifier lens on renders (desktop) ---------- */
  FX.lens = () => $$('[data-fx="lens"]').forEach(el => {
    if (el._fx || !FINE) return; el._fx = 1; const img = $('img', el); if (!img) return;
    const L = document.createElement('div'); L.className = 'fx-lens'; el.appendChild(L);
    const Z = 2.4, R = 95; let tx = 0, ty = 0, x = 0, y = 0, on = 0, raf = 0;
    const src = () => el.dataset.hi || img.currentSrc || img.src;
    const tick = () => { x += (tx - x) * .14; y += (ty - y) * .14; const r = el.getBoundingClientRect();
      L.style.transform = `translate(${x - R}px,${y - R}px)`; L.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
      L.style.backgroundPosition = `${-(x * Z - R)}px ${-(y * Z - R)}px`; if (on) raf = requestAnimationFrame(tick); };
    el.addEventListener('pointerenter', e => { const r = el.getBoundingClientRect(); x = tx = e.clientX - r.left; y = ty = e.clientY - r.top; L.style.backgroundImage = `url("${src()}")`; on = 1; el.classList.add('fx-lens-on'); raf = requestAnimationFrame(tick); });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; });
    el.addEventListener('pointerleave', () => { on = 0; el.classList.remove('fx-lens-on'); cancelAnimationFrame(raf); });
  });

  /* ---------- image trail cursor over a list (desktop) ---------- */
  FX.trail = () => $$('[data-fx="trail"]').forEach(box => {
    if (box._fx || !FINE) return; box._fx = 1;
    const imgs = (box.dataset.trail || '').split(',').filter(Boolean); if (!imgs.length) return;
    imgs.forEach(s => { const i = new Image(); i.src = s; });
    let lx = -999, ly = -999, k = 0, z = 1;
    box.addEventListener('pointermove', e => {
      const r = box.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (Math.hypot(x - lx, y - ly) < 110) return; lx = x; ly = y;
      const im = document.createElement('img'); im.className = 'fx-trail'; im.src = imgs[k++ % imgs.length]; im.alt = '';
      im.style.left = x + 'px'; im.style.top = y + 'px'; im.style.zIndex = z++; box.appendChild(im);
      gsap.fromTo(im, { opacity: 0, scale: .7, rotate: (Math.random() - .5) * 8 }, { opacity: 1, scale: 1, duration: .9, ease: 'power3.out' });
      gsap.to(im, { opacity: 0, scale: .92, y: 30, duration: 1.4, delay: .9, ease: 'power2.inOut', onComplete: () => im.remove() });
    });
  });

  /* ---------- cover flow 3D carousel ---------- */
  FX.coverflow = () => $$('[data-fx="coverflow"]').forEach(box => {
    if (box._fx) return; box._fx = 1;
    const items = $$('.fx-cf-item', box), cap = $('.fx-cf-cap', box.parentNode), n = items.length; let a = 0, cur = 0, timer = 0;
    const lay = () => items.forEach((it, i) => {
      let d = i - cur; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
      const ad = Math.abs(d), m = innerWidth < 700 ? .62 : 1;
      it.style.transform = `translate(-50%,-50%) translateX(${d * 34 * m}%) translateZ(${-ad * 160}px) rotateY(${clamp(-d, -1, 1) * 42}deg) scale(${ad ? .86 : 1})`;
      it.style.zIndex = 100 - Math.round(ad * 10); it.style.opacity = ad > 3 ? 0 : 1 - ad * .18;
      it.classList.toggle('on', Math.round(ad * 10) === 0);
    });
    const go = i => { a = (i + n) % n; const o = { v: cur }; let tgt = a; if (tgt - cur > n / 2) tgt -= n; if (cur - tgt > n / 2) tgt += n;
      gsap.to(o, { v: tgt, duration: 1.5, ease: 'power3.inOut', onUpdate: () => { cur = o.v; lay(); }, onComplete: () => { cur = a; lay(); } });
      if (cap) { const t = items[a].dataset.cap || ''; gsap.to(cap, { opacity: 0, y: 10, duration: .5, onComplete: () => { cap.textContent = t; gsap.to(cap, { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }); } }); } };
    const auto = () => { clearInterval(timer); timer = setInterval(() => go(a + 1), 5200); };
    items.forEach((it, i) => it.addEventListener('click', () => { if (i !== a) { go(i); auto(); } }));
    $$('[data-cf]', box.parentNode).forEach(b => b.addEventListener('click', () => { go(a + (+b.dataset.cf)); auto(); }));
    let sx = null; box.addEventListener('pointerdown', e => sx = e.clientX);
    addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) { go(a + (dx < 0 ? 1 : -1)); auto(); } });
    lay(); if (cap) cap.textContent = items[0].dataset.cap || ''; auto();
  });

  /* ---------- horizontal pinned gallery with velocity skew ---------- */
  FX.hscroll = () => $$('[data-fx="hscroll"]').forEach(sec => {
    if (sec._fx) return; sec._fx = 1; const track = $('.fx-h-track', sec); if (!track) return;
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + (innerWidth < 700 ? 32 : 96));
    const skewTo = gsap.quickTo(track, 'skewX', { duration: .9, ease: 'power3.out' });
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1.2, invalidateOnRefresh: true,
      onUpdate: s => { skewTo(clamp(s.getVelocity() / -900, -4, 4)); clearTimeout(sec._t); sec._t = setTimeout(() => skewTo(0), 160); } } });
    $$('.fx-h-item img', sec).forEach(im => gsap.fromTo(im, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), scrub: 1.2 } }));
  });

  /* ---------- sticky stacked cards that scale back ---------- */
  FX.stack = () => $$('[data-fx="stack"]').forEach(box => {
    if (box._fx) return; box._fx = 1; const cards = $$('.fx-st-card', box);
    cards.forEach((c, i) => { if (i === cards.length - 1) return;
      gsap.to(c, { scale: .9, filter: 'brightness(.55)', ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 15%', scrub: 1 } }); });
  });

  /* ---------- SVG line drawing scrubbed by scroll ---------- */
  FX.draw = () => $$('[data-fx="draw"]').forEach(svg => {
    if (svg._fx) return; svg._fx = 1; const ps = $$('path,line,rect,circle,polyline', svg);
    ps.forEach(p => { const L = p.getTotalLength ? p.getTotalLength() : 1000; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    gsap.to(ps, { strokeDashoffset: 0, ease: 'none', stagger: .04, scrollTrigger: { trigger: svg.closest('section') || svg, start: 'top 70%', end: 'bottom 60%', scrub: 1.5 } });
  });

  /* ---------- drifting dust / light particles ---------- */
  FX.dust = () => $$('[data-fx="dust"]').forEach(host => {
    if (host._fx) return; host._fx = 1; const cv = document.createElement('canvas'); cv.className = 'fx-dust'; host.appendChild(cv);
    const g = cv.getContext('2d'), dpr = Math.min(devicePixelRatio, 2); let W = 0, H = 0, vis = false;
    const col = host.dataset.dust || css('--fx-accent') || '#d8b878';
    const P = Array.from({ length: innerWidth < 700 ? 38 : 80 }, () => ({ x: Math.random(), y: Math.random(), r: .5 + Math.random() * 1.8, s: .00008 + Math.random() * .00022, p: Math.random() * 6.28 }));
    const size = () => { const r = host.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; };
    size(); addEventListener('resize', size);
    new IntersectionObserver(e => vis = e[0].isIntersecting).observe(host);
    const loop = t => { requestAnimationFrame(loop); if (!vis) return; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      P.forEach(q => { q.y -= q.s * 16; q.x += Math.sin(t * .0003 + q.p) * .00012; if (q.y < -.02) { q.y = 1.02; q.x = Math.random(); }
        const a = .25 + .35 * Math.sin(t * .0012 + q.p * 3); g.globalAlpha = Math.max(0, a); g.fillStyle = col; g.beginPath(); g.arc(q.x * W, q.y * H, q.r, 0, 6.283); g.fill(); }); };
    requestAnimationFrame(loop);
  });

  /* ---------- WebGL helpers ---------- */
  const glProg = (gl, vs, fs) => { const p = gl.createProgram(); [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([t, s]) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); gl.attachShader(p, sh); }); gl.linkProgram(p); gl.useProgram(p);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const l = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0); return p; };
  const hex = h => { h = (h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  /* ---------- animated mesh gradient shader background ---------- */
  FX.mesh = () => $$('[data-fx="mesh"]').forEach(host => {
    if (host._fx) return; host._fx = 1; const cv = document.createElement('canvas'); cv.className = 'fx-mesh'; host.prepend(cv);
    const gl = cv.getContext('webgl', { antialias: false, alpha: false }); if (!gl) return;
    const cols = (host.dataset.mesh || '#050505,#1a1208,#3a2a14,#0b0b10').split(',').map(hex);
    const p = glProg(gl, 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}',
      `precision highp float;varying vec2 v;uniform float t;uniform vec2 r;uniform vec3 c0,c1,c2,c3;
      vec2 h(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}
      void main(){vec2 u=v;u.x*=r.x/r.y;float s=t*.035;
        vec2 a=vec2(.25+.18*sin(s*1.3),.3+.2*cos(s*1.1)),b=vec2(.8+.2*cos(s*.9),.7+.15*sin(s*1.7)),c=vec2(.55+.3*sin(s*.7+2.),.15+.12*cos(s*1.4));a.x*=r.x/r.y;b.x*=r.x/r.y;c.x*=r.x/r.y;
        float wa=1./(.02+pow(length(u-a),2.)),wb=1./(.02+pow(length(u-b),2.)),wc=1./(.02+pow(length(u-c),2.)),wd=6.;
        vec3 col=(c1*wa+c2*wb+c3*wc+c0*wd)/(wa+wb+wc+wd);
        col+= (h(v*r+t).x-.5)*.018;gl_FragColor=vec4(col,1.);}`);
    const U = n => gl.getUniformLocation(p, n); ['c0', 'c1', 'c2', 'c3'].forEach((n, i) => gl.uniform3fv(U(n), cols[i] || cols[0]));
    let vis = false; new IntersectionObserver(e => vis = e[0].isIntersecting).observe(host);
    const size = () => { const d = Math.min(devicePixelRatio, 1.5), r = host.getBoundingClientRect(); cv.width = r.width * d; cv.height = r.height * d; gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(U('r'), cv.width, cv.height); };
    size(); addEventListener('resize', size);
    const loop = t => { requestAnimationFrame(loop); if (!vis) return; gl.uniform1f(U('t'), t / 1000); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }; requestAnimationFrame(loop);
  });

  /* ---------- WebGL depth parallax from a single photo (luminance + vertical depth) ---------- */
  FX.depth = () => $$('[data-fx="depth"]').forEach(host => {
    if (host._fx) return; host._fx = 1; const im = $('img', host); if (!im) return;
    const start = () => {
      const cv = document.createElement('canvas'); cv.className = 'fx-depth'; host.appendChild(cv);
      const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false }); if (!gl) { cv.remove(); return; }
      // build a soft depth map: blurred luminance mixed with a vertical gradient (floor near, ceiling far)
      const dw = 160, dh = Math.round(160 * im.naturalHeight / im.naturalWidth), dc = document.createElement('canvas'); dc.width = dw; dc.height = dh;
      const dg = dc.getContext('2d'); dg.filter = 'blur(6px) grayscale(1)'; dg.drawImage(im, 0, 0, dw, dh);
      const p = glProg(gl, 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}',
        `precision highp float;varying vec2 v;uniform sampler2D T,D;uniform vec2 m,r,s;uniform float k;
        vec2 cover(vec2 u){float ra=r.x/r.y,ia=s.x/s.y;vec2 q=u-.5;if(ra>ia)q.y*=ia/ra;else q.x*=ra/ia;return q+.5;}
        void main(){vec2 u=cover(v);float d=texture2D(D,u).r;d=mix(d,1.-u.y,.55);
          vec2 off=m*(d-.5)*k;vec2 uu=(u-.5)*.94+.5+off;gl_FragColor=vec4(texture2D(T,uu).rgb,1.);}`);
      const mk = (src, i) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); ['TEXTURE_WRAP_S', 'TEXTURE_WRAP_T'].forEach(w => gl.texParameteri(gl.TEXTURE_2D, gl[w], gl.CLAMP_TO_EDGE));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); };
      mk(im, 0); mk(dc, 1);
      const U = n => gl.getUniformLocation(p, n); gl.uniform1i(U('T'), 0); gl.uniform1i(U('D'), 1); gl.uniform2f(U('s'), im.naturalWidth, im.naturalHeight); gl.uniform1f(U('k'), +(host.dataset.depth || .045));
      const size = () => { const d = Math.min(devicePixelRatio, 2), r = host.getBoundingClientRect(); cv.width = r.width * d; cv.height = r.height * d; gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(U('r'), cv.width, cv.height); };
      size(); addEventListener('resize', size);
      let tx = 0, ty = 0, x = 0, y = 0, vis = false, sp = 0;
      new IntersectionObserver(e => vis = e[0].isIntersecting).observe(host);
      if (FINE) host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; });
      host.classList.add('fx-depth-on');
      const loop = t => { requestAnimationFrame(loop); if (!vis) return; const r = host.getBoundingClientRect(); sp = clamp(1 - (r.top + r.height) / (innerHeight + r.height)) - .5;
        const ax = FINE ? tx : Math.sin(t * .00025) * .5, ay = FINE ? ty + sp * .6 : sp * .9 + Math.cos(t * .0002) * .2;
        x += (ax - x) * .045; y += (ay - y) * .045; gl.uniform2f(U('m'), -x, -y); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
      requestAnimationFrame(loop);
    };
    if (im.complete && im.naturalWidth) start(); else im.addEventListener('load', start, { once: true });
  });

  /* ---------- page section colour shift ---------- */
  FX.bgshift = () => $$('[data-fx-bg]').forEach(sec => {
    if (sec._fx) return; sec._fx = 1; const host = document.querySelector(sec.dataset.fxBgHost || 'body');
    ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 45%', onToggle: s => { if (s.isActive) gsap.to(host, { backgroundColor: sec.dataset.fxBg, duration: 1.6, ease: 'power2.inOut' }); } });
  });

  /* ---------- zoom-through between two sections ---------- */
  FX.zoom = () => $$('[data-fx="zoom"]').forEach(sec => {
    if (sec._fx) return; sec._fx = 1; const w = $('.fx-zoom-win', sec), t = $('.fx-zoom-txt', sec);
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=140%', pin: true, scrub: 1.4 } });
    tl.fromTo(w, { clipPath: 'inset(30% 34% 30% 34% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut' }, 0)
      .fromTo($('img', w), { scale: 1.35 }, { scale: 1, ease: 'power2.inOut' }, 0);
    if (t) tl.fromTo(t, { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out' }, .45);
  });

  /* ---------- 3D tilt with moving light sheen ---------- */
  FX.sheen = () => $$('[data-fx="sheen"]').forEach(el => {
    if (el._fx || !FINE) return; el._fx = 1; const s = document.createElement('i'); s.className = 'fx-sheen'; el.appendChild(s);
    const rx = gsap.quickTo(el, 'rotationX', { duration: 1.2, ease: 'power3.out' }), ry = gsap.quickTo(el, 'rotationY', { duration: 1.2, ease: 'power3.out' });
    gsap.set(el, { transformPerspective: 900 });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      rx((.5 - y) * 7); ry((x - .5) * 9); s.style.setProperty('--sx', x * 100 + '%'); s.style.setProperty('--sy', y * 100 + '%'); s.style.opacity = 1; });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); s.style.opacity = 0; });
  });

  FX.init = () => { ['blurchars', 'fill', 'count', 'scramble', 'reveal', 'sweep', 'kb', 'lens', 'trail', 'coverflow', 'hscroll', 'stack', 'draw', 'dust', 'mesh', 'depth', 'bgshift', 'zoom', 'sheen'].forEach(k => { try { FX[k](); } catch (e) { console.warn('fx', k, e); } }); ScrollTrigger.refresh(); };

  /* hide the floating contact button over the hero on phones */
  (function(){ const h = document.getElementById('hero'); if (!h) return; new IntersectionObserver(e => document.body.classList.toggle('fx-hero-on', e[0].intersectionRatio > .35), { threshold: [0, .35, .7, 1] }).observe(h); })();
  const go = () => setTimeout(FX.init, 400);
  if (document.readyState === 'complete') go(); else addEventListener('load', go);
})();
