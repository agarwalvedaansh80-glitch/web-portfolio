// Halfstep theme — real-time 3D sneaker (three.js). Used by the hero section and the product page "Spin in 3D" view.
import * as THREE from 'three';
import { GLTFLoader } from './hs-GLTFLoader.js';
import { RoomEnvironment } from './hs-RoomEnvironment.js';

export function createShoe(container, { modelUrl, texUrl, colourway, interactive = true, scrollTarget = null, autoRotate = true, onReady } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(0.3, 1.2, 0.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -0.3, right: 0.3, top: 0.3, bottom: -0.3, near: 0.1, far: 3 });
  key.shadow.radius = 10;
  scene.add(key);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 20);
  const pivot = new THREE.Group();
  scene.add(pivot);

  const textures = {};
  const loadTex = (id) => {
    if (textures[id]) return textures[id];
    textures[id] = new THREE.TextureLoader().loadAsync(texUrl(id)).then((t) => {
      t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    });
    return textures[id];
  };

  let shoe, materials = [];
  const state = { tx: 0, ty: 0, x: 0, y: 0, spin: 0, spinV: 0, scroll: 0, drag: false, lastX: 0, float: 0, intro: 0 };

  new GLTFLoader().load(modelUrl, async (gltf) => {
    shoe = gltf.scene;
    shoe.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); materials.push(o.material); } });
    const box = new THREE.Box3().setFromObject(shoe);
    const c = box.getCenter(new THREE.Vector3());
    shoe.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
    pivot.add(shoe);
    await setColourway(colourway, false);
    resize();
    onReady && onReady();
  });

  async function setColourway(id, animate = true) {
    const tex = await loadTex(id);
    if (!animate || reduce) { materials.forEach((m) => { m.map = tex; m.needsUpdate = true; }); return; }
    // quick spin: swap the texture at the moment the shoe faces away
    state.spinV += Math.PI * 2;
    setTimeout(() => materials.forEach((m) => { m.map = tex; m.needsUpdate = true; }), 260);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w < h;
    const dist = narrow ? 1.55 : 0.86;
    camera.position.set(0, 0.11, dist);
    camera.lookAt(0, narrow ? 0.02 : 0.05, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);

  if (interactive) {
    addEventListener('pointermove', (e) => {
      state.tx = (e.clientX / innerWidth - 0.5);
      state.ty = (e.clientY / innerHeight - 0.5);
      if (state.drag) { state.spinV += (e.clientX - state.lastX) * 0.012; state.lastX = e.clientX; }
    });
    container.addEventListener('pointerdown', (e) => { state.drag = true; state.lastX = e.clientX; container.setPointerCapture(e.pointerId); });
    container.addEventListener('pointerup', () => { state.drag = false; });
  }

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(container);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible || !shoe) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    state.intro = Math.min(1, state.intro + dt * 0.7);
    const e = 1 - Math.pow(1 - state.intro, 4);
    state.x += (state.tx - state.x) * 0.06;
    state.y += (state.ty - state.y) * 0.06;
    // spin velocity eases out
    const step = state.spinV * Math.min(1, dt * 4);
    state.spin += step; state.spinV -= step;
    const scrollTurn = scrollTarget ? scrollTarget() : 0;
    const idle = autoRotate && !reduce ? Math.sin(t * 0.35) * 0.35 : 0;
    pivot.rotation.y = -0.55 + idle + state.x * 0.5 + state.spin + scrollTurn * Math.PI * 1.1 + (1 - e) * -2.2;
    pivot.rotation.x = state.y * 0.12;
    pivot.position.y = (reduce ? 0 : Math.sin(t * 1.2) * 0.004) + (1 - e) * 0.12;
    renderer.render(scene, camera);
  });

  return { setColourway, resize };
}
