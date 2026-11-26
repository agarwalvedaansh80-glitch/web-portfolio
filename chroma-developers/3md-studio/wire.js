/* Rotating architectural wireframe that rises floor by floor and solidifies with scroll */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const sec = document.querySelector('#wire'), cv = document.querySelector('#wireGL');
if (sec && cv) {
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setClearColor(0, 0);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, .1, 200);
  const g = new THREE.Group(); sc.add(g);
  const acc = new THREE.Color('#5fd0e6');
  const lineM = new THREE.LineBasicMaterial({ color: acc, transparent: true, opacity: .9 });
  const faceM = new THREE.MeshStandardMaterial({ color: '#1a2630', metalness: .6, roughness: .25, transparent: true, opacity: 0, emissive: '#0b1720' });
  sc.add(new THREE.AmbientLight('#9fd8ee', .7)); const dl = new THREE.DirectionalLight('#ffffff', 1.6); dl.position.set(6, 10, 8); sc.add(dl);
  const floors = [], N = 22;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), w = 3.2 - Math.sin(t * Math.PI) * .5 - t * .6, d = 2.2 - t * .35;
    const geo = new THREE.BoxGeometry(w, .34, d);
    const fl = new THREE.Group();
    const mesh = new THREE.Mesh(geo, faceM); fl.add(mesh);
    const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineM); fl.add(ed);
    // mullions
    const mul = new THREE.Group();
    for (let k = -3; k <= 3; k++) { const p = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(k * w / 7, -.17, d / 2), new THREE.Vector3(k * w / 7, .17, d / 2)]); mul.add(new THREE.Line(p, lineM)); }
    fl.add(mul);
    fl.position.y = i * .42 - N * .21; fl.rotation.y = t * .5;
    fl.userData = { y: fl.position.y, i };
    g.add(fl); floors.push(fl);
  }
  // podium and ground grid
  const grid = new THREE.GridHelper(16, 32, acc, acc); grid.material.transparent = true; grid.material.opacity = .14; grid.position.y = -N * .21 - .3; sc.add(grid);
  let P = 0, vis = false, W = 0, H = 0, ST = null;
  if (window.ScrollTrigger) ST = ScrollTrigger.create({ trigger: sec, start: 'top top', end: '+=170%', pin: true, pinSpacing: true });
  const size = () => { const b = sec.getBoundingClientRect(); W = b.width; H = innerHeight; r.setSize(W, H, false); cam.aspect = W / H; cam.position.set(0, 1.2, W < 700 ? 30 : 22); cam.updateProjectionMatrix(); g.position.x = W < 760 ? 0 : 3.6; g.position.y = W < 760 ? 1.6 : 0; grid.position.x = g.position.x; };
  size(); addEventListener('resize', size);
  new IntersectionObserver(e => vis = e[0].isIntersecting).observe(sec);
  const steps = [...sec.querySelectorAll('.wire-steps li')];
  const tick = () => {
    requestAnimationFrame(tick); if (!vis) return;
    const tgt = ST ? ST.progress : 0;
    P += (tgt - P) * .06;
    const rise = Math.min(1, .2 + P / .5), solid = Math.min(1, Math.max(0, (P - .45) / .45));
    floors.forEach((f, i) => { const k = Math.min(1, Math.max(0, rise * N * 1.15 - i)); f.visible = k > 0.01; f.position.y = f.userData.y - (1 - k) * 1.2; f.scale.setScalar(.92 + k * .08); });
    faceM.opacity = solid * .92; lineM.opacity = .9 - solid * .55;
    g.rotation.y += .0022; cam.position.y = 1.5 + P * 2.5; cam.lookAt(g.position.x * .55, g.position.y * .4, 0);
    steps.forEach((s, i) => s.classList.toggle('on', i === (P < .3 ? 0 : P < .65 ? 1 : 2)));
    r.render(sc, cam);
  };
  tick();
}
