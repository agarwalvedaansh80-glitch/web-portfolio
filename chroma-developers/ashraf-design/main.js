import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

gsap.registerPlugin(ScrollTrigger);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
const DESK = () => innerWidth > 900;
const P = window.PROJECTS;
document.body.classList.add('loading');
$('#yr').textContent = new Date().getFullYear();

/* ---------- smooth scroll ---------- */
const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href');
  if (id.length < 2 && id !== '#') return;
  const tgt = id === '#top' || id === '#' ? 0 : $(id);
  if (tgt === null) return;
  e.preventDefault();
  closeMenu();
  lenis.scrollTo(tgt, { offset: 0, duration: 1.6 });
}));

/* ---------- split text ---------- */
function splitEl(el) {
  const out = document.createDocumentFragment();
  [...el.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      n.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span'); w.className = 'w';
        const i = document.createElement('span'); i.textContent = part;
        w.appendChild(i); out.appendChild(w);
      });
    } else if (n.nodeName === 'BR') out.appendChild(n.cloneNode());
    else { const c = n.cloneNode(false); splitEl(n); [...n.childNodes].forEach(k => c.appendChild(k)); out.appendChild(c); }
  });
  el.innerHTML = ''; el.appendChild(out);
}
$$('.split').forEach(splitEl);

/* ---------- cursor ---------- */
const cur = $('#cursor'), dot = $('.c-dot'), ring = $('.c-ring'), lab = $('#cLabel');
const mouse = { x: innerWidth / 2, y: innerHeight / 2 }, rpos = { ...mouse };
addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
if (FINE) {
  gsap.ticker.add(() => {
    rpos.x += (mouse.x - rpos.x) * 0.18; rpos.y += (mouse.y - rpos.y) * 0.18;
    dot.style.transform = `translate(${mouse.x}px,${mouse.y}px)`;
    ring.style.transform = `translate(${rpos.x}px,${rpos.y}px)`;
  });
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor],a,button,summary,select,input');
    cur.classList.toggle('hover', !!t);
    const l = t && t.getAttribute('data-cursor');
    if (l) { lab.textContent = l; cur.classList.add('label'); } else cur.classList.remove('label');
  });
}

/* ---------- magnetic ---------- */
if (FINE) $$('.magnetic').forEach(b => {
  b.addEventListener('pointermove', e => {
    const r = b.getBoundingClientRect();
    gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: .5, ease: 'power3.out' });
  });
  b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.4)' }));
});

/* ---------- shared GLSL ---------- */
const NOISE = `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.02;a*=.5;}return v;}
vec2 cover(vec2 uv,vec2 r,vec2 i){float rs=r.x/r.y,is=i.x/i.y;vec2 n=rs<is?vec2(i.x*r.y/i.y,r.y):vec2(r.x,i.y*r.x/i.x);
 vec2 o=(rs<is?vec2((n.x-r.x)/2.,0.):vec2(0.,(n.y-r.y)/2.))/n;return uv*r/n+o;}`;

/* ---------- HERO WEBGL ---------- */
const SLIDES = [
  { img: 'p01', name: 'Fire & Water Villa, Dubai' },
  { img: 'p03', name: 'Villa Aurora, Dubai Hills' },
  { img: 'p19', name: 'Grand Majlis' },
  { img: 'p02', name: 'Pine Crown Residence, Rublyovka' },
  { img: 'p13', name: 'The Conversation Room, Saadiyat Island' },
];
const loader = new THREE.TextureLoader();
const texCache = {};
function loadTex(name) {
  if (texCache[name]) return texCache[name];
  texCache[name] = new Promise(res => loader.load(`img/${name}.webp`, t => {
    t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    t.userData.size = new THREE.Vector2(t.image.width, t.image.height); res(t);
  }, undefined, () => res(null)));
  return texCache[name];
}

const heroCanvas = $('#heroGL');
const hr = new THREE.WebGLRenderer({ canvas: heroCanvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
hr.setPixelRatio(Math.min(devicePixelRatio, DESK() ? 1.5 : 1.25));
const hScene = new THREE.Scene(), hCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const hU = {
  t1: { value: null }, t2: { value: null }, s1: { value: new THREE.Vector2(1, 1) }, s2: { value: new THREE.Vector2(1, 1) },
  prog: { value: 0 }, time: { value: 0 }, res: { value: new THREE.Vector2() }, mouse: { value: new THREE.Vector2(.5, .5) },
  vel: { value: 0 }, intro: { value: 0 }, scroll: { value: 0 }
};
const hMat = new THREE.ShaderMaterial({
  uniforms: hU,
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
  fragmentShader: `precision highp float;varying vec2 vUv;
  uniform sampler2D t1,t2;uniform vec2 s1,s2,res,mouse;uniform float prog,time,vel,intro,scroll;${NOISE}
  void main(){
    vec2 uv=vUv; float asp=res.x/res.y;
    vec2 m=mouse; vec2 d=(uv-m)*vec2(asp,1.); float dist=length(d);
    float ripple=sin(dist*38.-time*3.)*.0035*smoothstep(.4,0.,dist)*(.35+vel*4.);
    uv+=normalize(d+1e-4)*ripple/vec2(asp,1.);
    uv.y+=scroll*.12;
    float z=1.-.07*(.5+.5*sin(time*.12))-.08*(1.-intro);
    vec2 zu=(uv-.5)*z+.5;
    float n=fbm(uv*3.2+time*.04);
    float mask=smoothstep(n-.18,n+.18,prog*1.36-.18);
    vec2 dir=vec2(.18,-.06)*(n-.5);
    vec2 u1=cover(zu+dir*prog,res,s1);
    vec2 u2=cover((zu-.5)*(1.+.12*(1.-prog))+.5-dir*(1.-prog),res,s2);
    float sh=.0016+vel*.02;
    vec3 c1=vec3(texture2D(t1,u1+vec2(sh,0)).r,texture2D(t1,u1).g,texture2D(t1,u1-vec2(sh,0)).b);
    vec3 c2=vec3(texture2D(t2,u2+vec2(sh,0)).r,texture2D(t2,u2).g,texture2D(t2,u2-vec2(sh,0)).b);
    vec3 col=mix(c1,c2,mask);
    float edge=smoothstep(.0,.06,abs(mask-.5)); col+=vec3(.9,.7,.4)*(1.-edge)*.25*step(.01,prog)*step(prog,.99);
    col*=vec3(1.03,1.,.95);
    float v=smoothstep(1.25,.25,length((vUv-.5)*vec2(asp*.7,1.)));
    col*=mix(.55,1.,v);
    col*=intro;
    gl_FragColor=vec4(col,1.);
  }`
});
hScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hMat));

/* gold dust particles over hero */
const PN = DESK() ? 260 : 110;
const pg = new THREE.BufferGeometry(), pp = new Float32Array(PN * 3), ps = new Float32Array(PN);
for (let i = 0; i < PN; i++) { pp[i * 3] = Math.random() * 2 - 1; pp[i * 3 + 1] = Math.random() * 2 - 1; pp[i * 3 + 2] = 0; ps[i] = Math.random(); }
pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(ps, 1));
const pMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { time: hU.time, mouse: hU.mouse, dpr: { value: hr.getPixelRatio() }, intro: hU.intro },
  vertexShader: `attribute float seed;uniform float time,dpr,intro;uniform vec2 mouse;varying float a;
   void main(){vec3 p=position;p.y=mod(p.y+1.+time*(.012+seed*.03),2.)-1.;p.x+=sin(time*.3+seed*20.)*.03;
   vec2 m=mouse*2.-1.;vec2 dd=p.xy-m;float l=length(dd);p.xy+=normalize(dd+1e-4)*.08*smoothstep(.35,0.,l);
   a=(.25+.75*seed)*(.6+.4*sin(time*1.5+seed*40.))*intro;gl_Position=vec4(p,1.);gl_PointSize=(1.+seed*2.6)*dpr;}`,
  fragmentShader: `varying float a;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.95,.8,.55,a*smoothstep(.5,0.,d));}`
});
hScene.add(new THREE.Points(pg, pMat));

let heroIdx = 0, heroBusy = false, heroVisible = true;
function heroSize() { const r = heroCanvas.getBoundingClientRect(); hr.setSize(r.width, r.height, false); hU.res.value.set(r.width, r.height); }
heroSize(); addEventListener('resize', heroSize);
const hm = { x: .5, y: .5, tx: .5, ty: .5, v: 0 };
$('#hero').addEventListener('pointermove', e => { const r = heroCanvas.getBoundingClientRect(); hm.tx = (e.clientX - r.left) / r.width; hm.ty = 1 - (e.clientY - r.top) / r.height; });
async function heroNext() {
  if (heroBusy || !heroVisible) return; heroBusy = true;
  const n = (heroIdx + 1) % SLIDES.length; const t = await loadTex(SLIDES[n].img);
  if (!t) { heroBusy = false; return; }
  hU.t2.value = t; hU.s2.value.copy(t.userData.size); hU.prog.value = 0;
  gsap.to('#heroName', { opacity: 0, y: -8, duration: .4, onComplete: () => { $('#heroName').textContent = SLIDES[n].name; $('#heroIdx').textContent = String(n + 1).padStart(2, '0'); gsap.fromTo('#heroName', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .6 }); } });
  gsap.to(hU.prog, { value: 1, duration: 2.2, ease: 'power2.inOut', onComplete: () => { hU.t1.value = t; hU.s1.value.copy(t.userData.size); hU.prog.value = 0; heroIdx = n; heroBusy = false; } });
}
ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', onToggle: s => heroVisible = s.isActive, onUpdate: s => hU.scroll.value = s.progress });
let clock = new THREE.Clock();
gsap.ticker.add(() => {
  if (!heroVisible) return;
  const t = clock.getElapsedTime(); hU.time.value = t;
  const px = hm.x, py = hm.y; hm.x += (hm.tx - hm.x) * .06; hm.y += (hm.ty - hm.y) * .06;
  hm.v += (Math.hypot(hm.x - px, hm.y - py) - hm.v) * .1; hU.vel.value = Math.min(hm.v, .05);
  hU.mouse.value.set(hm.x, hm.y);
  hr.render(hScene, hCam);
});

/* ---------- PROJECT LIST ---------- */
const plist = $('#plist'), pgrid = $('#pgrid');
P.forEach((p, i) => {
  const li = document.createElement('li'); li.dataset.rooms = p.r.join(' ');
  li.innerHTML = `<a href="#" class="prow" data-open="${p.slug}" data-img="${p.img}" data-cursor="View"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${p.t}</h3><span class="loc">${p.m}</span><span class="ar">→</span></a>`;
  plist.appendChild(li);
  const c = document.createElement('a'); c.href = '#'; c.className = 'pcard'; c.dataset.open = p.slug; c.dataset.rooms = p.r.join(' ');
  c.innerHTML = `<img loading="lazy" src="img/${p.img}.webp" alt="${p.t}"><span>${p.m}</span><h3>${p.t}</h3>`;
  pgrid.appendChild(c);
});
const ROOMS = ['all', 'living', 'bedroom', 'bathroom', 'kitchen', 'majlis', 'study', 'lounge', 'facade', 'pool', 'landscape'];
const LBL = { all: 'All', living: 'Living', bedroom: 'Bedroom', bathroom: 'Bathroom', kitchen: 'Kitchen', majlis: 'Majlis', study: 'Office', lounge: 'Lounge', facade: 'Facade', pool: 'Pool', landscape: 'Landscape' };
const fl = $('#filters');
ROOMS.forEach(r => { const b = document.createElement('button'); b.textContent = LBL[r]; b.dataset.r = r; if (r === 'all') b.className = 'on'; fl.appendChild(b); });
fl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', fl).forEach(x => x.classList.toggle('on', x === b));
  const r = b.dataset.r;
  $$('li', plist).forEach(li => li.classList.toggle('gone', r !== 'all' && !li.dataset.rooms.includes(r)));
  $$('.pcard', pgrid).forEach(c => c.classList.toggle('gone', r !== 'all' && !c.dataset.rooms.includes(r)));
  ScrollTrigger.refresh();
});
plist.addEventListener('pointerover', e => { const row = e.target.closest('li'); $$('li', plist).forEach(li => li.classList.toggle('dim', row && li !== row)); });
plist.addEventListener('pointerleave', () => $$('li', plist).forEach(li => li.classList.remove('dim')));

/* ---------- REVEAL WEBGL (hover image) ---------- */
if (FINE) {
  const rc = $('#reveal');
  const rr = new THREE.WebGLRenderer({ canvas: rc, alpha: true, antialias: true, premultipliedAlpha: false });
  rr.setClearColor(0x000000, 0);
  rr.setPixelRatio(Math.min(devicePixelRatio, 2));
  const rs = new THREE.Scene();
  let W = innerWidth, H = innerHeight;
  const rcam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -10, 10);
  const rU = { tex: { value: null }, isz: { value: new THREE.Vector2(1, 1) }, psz: { value: new THREE.Vector2(360, 460) }, vel: { value: new THREE.Vector2() }, alpha: { value: 0 }, time: { value: 0 } };
  const rm = new THREE.Mesh(new THREE.PlaneGeometry(360, 460, 40, 40), new THREE.ShaderMaterial({
    transparent: true, uniforms: rU,
    vertexShader: `uniform vec2 vel;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;
      p.x+=sin(uv.y*3.1416)*-vel.x*1.6;p.y+=sin(uv.x*3.1416)*vel.y*1.6;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `precision highp float;uniform sampler2D tex;uniform vec2 isz,psz,vel;uniform float alpha,time;varying vec2 vUv;${NOISE}
      void main(){vec2 uv=cover(vUv,psz,isz);uv=(uv-.5)*(1.-.08*alpha)+.5;
        float s=clamp(length(vel)*.0012,0.,.03);
        vec3 c=vec3(texture2D(tex,uv+vec2(s,0)).r,texture2D(tex,uv).g,texture2D(tex,uv-vec2(s,0)).b);
        float n=fbm(vUv*4.+time*.2);float m=smoothstep(n-.1,n+.1,alpha*1.25-.1+ (1.-vUv.y)*.15);
        gl_FragColor=vec4(c,m);}`
  }));
  rs.add(rm);
  const rsize = () => { W = innerWidth; H = innerHeight; rr.setSize(W, H); Object.assign(rcam, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 }); rcam.updateProjectionMatrix(); };
  rsize(); addEventListener('resize', rsize);
  const pos = { x: 0, y: 0 }; let active = false, cur = null;
  $$('.prow').forEach(row => {
    row.addEventListener('pointerenter', async () => {
      active = true; const name = row.dataset.img; cur = name;
      const t = await loadTex(name); if (!t || cur !== name) return;
      rU.tex.value = t; rU.isz.value.copy(t.userData.size);
      gsap.to(rU.alpha, { value: 1, duration: .7, ease: 'power3.out' });
    });
  });
  plist.addEventListener('pointerleave', () => { active = false; cur = null; gsap.to(rU.alpha, { value: 0, duration: .5, ease: 'power2.out' }); });
  const clk = new THREE.Clock();
  gsap.ticker.add(() => {
    if (rU.alpha.value < .001 && !active) { if (rc.style.visibility !== 'hidden') { rr.clear(); rc.style.visibility = 'hidden'; } return; }
    rc.style.visibility = 'visible';
    const tx = mouse.x - W / 2 + 80, ty = -(mouse.y - H / 2);
    const vx = (tx - pos.x), vy = (ty - pos.y);
    pos.x += vx * .1; pos.y += vy * .1;
    rU.vel.value.set(vx * .1 * 1.5, vy * .1 * 1.5); rU.time.value = clk.getElapsedTime();
    rm.position.set(pos.x, pos.y, 0); rm.rotation.z = THREE.MathUtils.clamp(vx * .0006, -.12, .12);
    rr.render(rs, rcam);
  });
  P.forEach(p => setTimeout(() => loadTex(p.img), 3500));
}

/* ---------- MODAL ---------- */
const modal = $('#modal'), ms = $('#modalScroll');
function openProject(slug) {
  const i = P.findIndex(p => p.slug === slug); if (i < 0) return;
  const p = P[i], nx = P[(i + 1) % P.length];
  const secs = (p.d || []).map(([h, t]) => `<div class="m-sec"><h4>${h}</h4><p>${t}</p></div>`).join('');
  const gal = (p.g || []).slice(1).map(g => `<img loading="lazy" src="img/${g}.webp" alt="${p.t}">`).join('');
  ms.innerHTML = `<div class="m-hero"><img src="img/${p.img}.webp" alt="${p.t}"><div class="m-title"><span>${p.m}</span><h2>${p.t}</h2></div></div>
   <div class="m-body"><div><p class="lead">${p.s}</p><div class="m-tags">${p.r.map(r => `<i>${LBL[r] || r}</i>`).join('')}</div></div><div>${secs || `<div class="m-sec"><h4>Planning a similar project?</h4><p>Tell me about your space, and I will suggest how to approach the design.</p></div>`}</div></div>
   ${gal ? `<div class="m-gal">${gal}</div>` : ''}
   <div class="m-cta"><h3>Planning a <em>similar project?</em></h3><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center"><a class="btn btn-gold" target="_blank" rel="noopener" href="https://wa.me/971588874003?text=${encodeURIComponent('Hello, I saw the ' + p.t + ' project and would like to discuss a similar design.')}">Get a consultation</a><a href="#" class="m-next" data-open="${nx.slug}" data-cursor>Next: ${nx.t} →</a></div></div>`;
  ms.scrollTop = 0; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); lenis.stop();
  gsap.fromTo('.m-hero img', { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'power3.out' });
  gsap.fromTo('.m-title>*', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: .08, delay: .35, ease: 'power3.out' });
}
function closeProject() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); lenis.start(); }
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]'); if (!o) return;
  e.preventDefault(); openProject(o.dataset.open);
});
$('#modalX').addEventListener('click', closeProject);
addEventListener('keydown', e => { if (e.key === 'Escape') closeProject(); });

/* ---------- MENU ---------- */
const menu = $('#menu'), burger = $('#burger');
function closeMenu() { menu.classList.remove('open'); burger.classList.remove('on'); }
burger.addEventListener('click', () => { menu.classList.toggle('open'); burger.classList.toggle('on'); });

/* ---------- NAV ---------- */
let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  $('#nav').classList.toggle('solid', scroll > 60);
  $('#nav').classList.toggle('hide', scroll > lastY && scroll > 400 && !menu.classList.contains('open'));
  lastY = scroll;
});

/* ---------- SERVICES accordion ---------- */
$$('.svc').forEach(s => {
  const body = $('.svc-body', s);
  $('.svc-row', s).addEventListener('click', () => {
    const open = !s.classList.contains('open');
    $$('.svc.open').forEach(o => { if (o !== s) { o.classList.remove('open'); gsap.to($('.svc-body', o), { height: 0, duration: .7, ease: 'power3.inOut' }); } });
    s.classList.toggle('open', open);
    gsap.to(body, { height: open ? 'auto' : 0, duration: .8, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() });
  });
});

/* ---------- tilt + glow ---------- */
if (FINE) $$('.tilt').forEach(c => {
  c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
    gsap.to(c, { rotateY: (x - .5) * 10, rotateX: (.5 - y) * 10, transformPerspective: 900, duration: .6, ease: 'power3.out' });
  });
  c.addEventListener('pointerleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1,.5)' }));
});

/* ---------- CALCULATOR ---------- */
const st = { type: 'Villa', svc: 150, svcL: 'Working Drawings + 3D Visualization' };
$$('.seg').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', g).forEach(x => x.classList.toggle('on', x === b));
  if (g.dataset.name === 'type') st.type = b.dataset.v; else { st.svc = +b.dataset.v; st.svcL = b.dataset.l; }
  calc();
}));
$('#extras').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { b.classList.toggle('on'); calc(); } });
['area', 'loc', 'when'].forEach(id => $('#' + id).addEventListener('input', calc));
const estObj = { v: 45000 };
function calc() {
  const a = +$('#area').value, est = a * st.svc;
  $('#area').style.setProperty('--p', ((a - 30) / (2000 - 30) * 100) + '%');
  $('#areaOut').textContent = a + ' m²'; $('#sArea').textContent = a + ' m²';
  $('#sType').textContent = st.type; $('#sSvc').textContent = st.svcL; $('#sLoc').textContent = $('#loc').value;
  gsap.to(estObj, { v: est, duration: .6, ease: 'power2.out', onUpdate: () => $('#est').textContent = Math.round(estObj.v).toLocaleString('en-US') });
  const ex = $$('#extras .on').map(b => b.textContent).join(', ');
  const msg = `Hello Ashraf, I would like a quote.\nProject: ${st.type}\nService: ${st.svcL}\nArea: ${a} m²\nLocation: ${$('#loc').value}\nTiming: ${$('#when').value}${ex ? '\nAlso interested in: ' + ex : ''}\nStarting estimate: AED ${est.toLocaleString('en-US')}`;
  $('#sendEst').href = 'https://wa.me/971588874003?text=' + encodeURIComponent(msg);
}
calc();

/* ---------- SCROLL ANIMATIONS ---------- */
function scrollAnims() {
  ScrollTrigger.matchMedia({
    '(min-width: 901px)': () => {
      const track = $('#fTrack');
      const dist = () => track.scrollWidth - innerWidth;
      const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.featured-pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, onUpdate: s => $('#fProg').style.width = s.progress * 100 + '%' } });
      $$('.f-img img').forEach(img => gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('.f-card'), containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } }));
      const steps = $$('.pstep');
      ScrollTrigger.create({ trigger: '.process-pin', start: 'top top', end: '+=' + innerHeight * 1.6, pin: true, scrub: true,
        onUpdate: s => { $('#pLine').style.height = s.progress * 100 + '%'; const k = Math.min(steps.length - 1, Math.floor(s.progress * steps.length)); steps.forEach((x, j) => x.classList.toggle('on', j <= k)); } });
    }
  });
  $$('.split').forEach(el => {
    if (el.closest('.hero')) return;
    gsap.to($$('.w>span', el), { y: 0, duration: 1.2, ease: 'power4.out', stagger: .06, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('.reveal-up').forEach(el => { if (el.closest('.hero')) return; gsap.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, clearProps: 'opacity,transform', duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }); });
  $$('.count').forEach(c => { const o = { v: 0 }; gsap.to(o, { v: +c.dataset.to, duration: 2.2, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 85%' }, onUpdate: () => c.textContent = Math.round(o.v) }); });
  gsap.fromTo('.stat', { y: 60, opacity: 0 }, { y: 0, opacity: 1, clearProps: 'opacity,transform', stagger: .12, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 80%' } });
  $$('.clip').forEach(c => {
    gsap.to(c, { clipPath: 'inset(0% 0% 0% 0% round 4px)', duration: 1.6, ease: 'power3.inOut', scrollTrigger: { trigger: c, start: 'top 80%' } });
    gsap.fromTo($('img', c), { yPercent: -10, scale: 1.15 }, { yPercent: 0, scale: 1.02, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.contact-bg img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
  // marquee driven by scroll velocity
  const mt = $('.marquee-track'); let mx = 0, dir = 1;
  gsap.ticker.add(() => { const v = lenis.velocity || 0; if (v) dir = v > 0 ? 1 : -1; mx -= (0.6 + Math.abs(v) * .25) * dir; const w = mt.scrollWidth / 2; if (mx <= -w) mx += w; if (mx > 0) mx -= w; mt.style.transform = `translateX(${mx}px) skewX(${gsap.utils.clamp(-8, 8, -v * .3)}deg)`; });
  // tiers + why cards
  gsap.fromTo('.why-card', { y: 80, opacity: 0 }, { y: 0, opacity: 1, clearProps: 'opacity,transform', duration: 1.1, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.why-grid', start: 'top 80%' } });
  gsap.fromTo('.tier', { y: 80, opacity: 0 }, { y: 0, opacity: 1, clearProps: 'opacity,transform', duration: 1.1, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.tiers', start: 'top 85%' } });
  gsap.fromTo('.incl-item', { y: 40, opacity: 0 }, { y: 0, opacity: 1, clearProps: 'opacity,transform', duration: 1, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: '.incl-list', start: 'top 85%' } });
  gsap.fromTo('.plist li', { y: 30, opacity: 0 }, { y: 0, opacity: 1, clearProps: 'opacity,transform', duration: .9, stagger: .03, ease: 'power3.out', scrollTrigger: { trigger: '.plist', start: 'top 85%' } });
  gsap.fromTo('details', { y: 30, opacity: 0 }, { y: 0, opacity: 1, clearProps: 'opacity,transform', duration: .9, stagger: .05, ease: 'power3.out', scrollTrigger: { trigger: '.faq-list', start: 'top 85%' } });
  gsap.fromTo('.foot-big', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, clearProps: 'opacity,transform', duration: 1.4, ease: 'power4.out', scrollTrigger: { trigger: '.foot', start: 'top 90%' } });


}

/* ---------- LOADER + INTRO ---------- */
(async function boot() {
  gsap.to('.loader-word span', { y: 0, duration: 1, stagger: .04, ease: 'power4.out' });
  const prog = { v: 0 };
  const first = loadTex(SLIDES[0].img), second = loadTex(SLIDES[1].img);
  const fontReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const tw = gsap.to(prog, { v: 85, duration: 2.2, ease: 'power2.out', onUpdate: upd });
  function upd() { $('#loaderNum').textContent = Math.round(prog.v); $('#loaderBar').style.width = prog.v + '%'; }
  const [t] = await Promise.all([first, fontReady]); await second;
  if (t) { hU.t1.value = t; hU.s1.value.copy(t.userData.size); hU.t2.value = t; hU.s2.value.copy(t.userData.size); }
  tw.kill();
  await gsap.to(prog, { v: 100, duration: .5, ease: 'power2.inOut', onUpdate: upd });
  const tl = gsap.timeline();
  tl.to('.loader-word span', { y: '-110%', duration: .7, stagger: .02, ease: 'power3.in' })
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'power4.inOut' }, '-=.2')
    .set('.loader', { display: 'none' })
    .to(hU.intro, { value: 1, duration: 2.2, ease: 'power2.out' }, '-=.9')
    .to('.hero-title .w>span', { y: 0, duration: 1.4, stagger: .07, ease: 'power4.out' }, '-=1.9')
    .from('.hero .reveal-up', { y: 30, opacity: 0, duration: 1.1, stagger: .1, ease: 'power3.out' }, '-=1.1')
    .from('.nav', { y: -30, opacity: 0, duration: 1, ease: 'power3.out' }, '-=1.1')
    .from('.hero-index,.scroll-cue', { opacity: 0, duration: 1 }, '-=.6');
  tl.add(() => { document.body.classList.remove('loading'); lenis.start(); scrollAnims(); ScrollTrigger.refresh(); setInterval(heroNext, 5600); }, '-=1.2');
})();
