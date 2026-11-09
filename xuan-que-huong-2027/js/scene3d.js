import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildWorld, GEO, STAGE_RECT, STAGE_H } from './world.js?v=10';

const VIEWS = {
  overview: { p: [15, 12.5, 17],  t: [0, 0.4, -1.5] },
  gate:     { p: [0, 2.4, 25],    t: [0, 2.6, -9] },
  audience: { p: [0, 2.0, 4.5],   t: [0, 1.8, -9.5] },
  stage:    { p: [1, 2.0, -8.6],  t: [0, 1.2, 6] },
  top:      { p: [0.01, 30, 5],   t: [0, 0, -1] }
};

const TIMES = {
  dusk: { bg: 0x4b4470, sky: ['#0c1030', '#262a63', '#6d4a86', '#d7708a', '#f5a77a'], hemiSky: 0x9aa8e8, hemiGround: 0x5a4a48, hemi: 1.3, sun: 0xffc98f, sunI: 1.05, lantern: 2.3, fairy: 3.4, beam: 0.16, win: 0.8, bd: 0.55, tw: 1.0, lamp: 1, bloom: 0.28, exp: 0.95 },
  day:  { bg: 0xbcd8ee, sky: ['#5c92cf', '#86b4df', '#b4d3ee', '#d9e9f5', '#eef3f5'], hemiSky: 0xffffff, hemiGround: 0xb9a58c, hemi: 1.1, sun: 0xfff4e0, sunI: 2.2, lantern: 0.2, fairy: 0.15, beam: 0.0, win: 0.0, bd: 0.05, tw: 0.3, lamp: 0, bloom: 0.12, exp: 0.95 }
};

const EYE = 1.62;
const clamp = THREE.MathUtils.clamp;

export function createScene(container, opts) {
  const { cfg, zones, hotspotLayer, onSelect, onMode } = opts;
  const lowPower = /Mobi|Android/i.test(navigator.userAgent) || matchMedia('(max-width: 760px)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Renderer, camera, controls ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;   // sân tĩnh, chỉ dựng bóng một lần cho nhẹ máy
  let shadowFrames = 8;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(TIMES.dusk.bg);
  scene.fog = new THREE.Fog(TIMES.dusk.bg, 48, 120);

  // vòm trời chuyển màu, đổi theo buổi tối hay ban ngày
  const skyCv = document.createElement('canvas'); skyCv.width = 4; skyCv.height = 256;
  const skyTex = new THREE.CanvasTexture(skyCv); skyTex.colorSpace = THREE.SRGBColorSpace;
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(210, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  skyMesh.renderOrder = -10; skyMesh.frustumCulled = false;
  scene.add(skyMesh);
  function paintSky(stops) {
    const g = skyCv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, stops[0]); gr.addColorStop(0.38, stops[1]); gr.addColorStop(0.52, stops[2]); gr.addColorStop(0.62, stops[3]); gr.addColorStop(0.74, stops[4]); gr.addColorStop(1, stops[4]);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true;
  }

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 300);
  camera.position.set(...VIEWS.overview.p);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...VIEWS.overview.t);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 2;
  controls.maxDistance = 44;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.screenSpacePanning = false;
  controls.zoomToCursor = true;
  controls.rotateSpeed = 0.85;
  controls.panSpeed = 1.2;
  controls.update();

  /* ---------- Ánh sáng ---------- */
  const hemi = new THREE.HemisphereLight(TIMES.dusk.hemiSky, TIMES.dusk.hemiGround, TIMES.dusk.hemi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(TIMES.dusk.sun, TIMES.dusk.sunI);
  sun.position.set(10, 20, 13);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = -19; sc.right = 19; sc.top = 19; sc.bottom = -19; sc.near = 1; sc.far = 70;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  /* ---------- Hiệu ứng phát sáng quanh đèn lồng, đèn nháy (chỉ máy đủ mạnh) ---------- */
  let composer = null, bloom = null;
  if (!lowPower) {
    try {
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
      composer = new EffectComposer(renderer, rt);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.35, 0.55, 1.05);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    } catch (e) { composer = null; bloom = null; }
  }

  /* ---------- Thế giới ---------- */
  const loader = new THREE.TextureLoader();
  const env = {
    lowPower,
    loadTexture: (u, cb) => loader.load(u, cb, undefined, () => {}),
    loadImage: (u, cb) => { const i = new Image(); i.onload = () => cb(i); i.onerror = () => {}; i.src = u; }
  };
  const world = buildWorld(cfg, env);
  scene.add(world.root);
  const { obstacles, steamPuffs, backdropMat, lanternMat, fairyMat, bldMat, beamMats, useLed, lamps, twinkle, foodTables, lixiTrees, brochureSpot } = world;

  /* ---------- Vùng sáng sàn, vùng bấm, số hiệu ---------- */
  const highlights = {};
  const proxies = [];
  const proxyH = { podium: [2.3, 1.15], stage: [1.2, 0.6], backdrop: [3.4, 2.6] };
  zones.forEach(z => {
    const geo = GEO[z.id];
    if (!geo) return;
    const [ax, az, aw, ad] = geo.area;
    const hl = new THREE.Mesh(new THREE.PlaneGeometry(aw, ad), new THREE.MeshBasicMaterial({ color: 0xe3b04b, transparent: true, opacity: 0, depthWrite: false }));
    hl.rotation.x = -Math.PI / 2; hl.position.set(ax, 0.06, az);
    scene.add(hl);
    highlights[z.id] = hl;
    const [ph, py] = proxyH[z.id] || [2.4, 1.2];
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(aw, ph, ad), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.set(ax, z.id === 'backdrop' ? 2.5 : py, az);
    proxy.userData.zone = z.id;
    scene.add(proxy);
    proxies.push(proxy);
  });

  const foodProxies = [];
  const foodGeo = {};
  foodTables.forEach(({ i, x, z }) => {
    const id = 'food:' + i;
    foodGeo[id] = { area: [x, z, 2.7, 1.25], hot: [x, 1.55, z], cam: { p: [x, 2.4, z + 3.6], t: [x, 0.9, z] } };
    const hl = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.25), new THREE.MeshBasicMaterial({ color: 0xe3b04b, transparent: true, opacity: 0, depthWrite: false }));
    hl.rotation.x = -Math.PI / 2; hl.position.set(x, 0.07, z); scene.add(hl); highlights[id] = hl;
    const px = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
    px.position.set(x, 0.65, z); px.userData.zone = id; scene.add(px); foodProxies.push(px);
  });
  const smallProxies = [...foodProxies];
  const extraGeo = {};
  function addItem(id, label, pos, size, cam, hot) {
    extraGeo[id] = { hot, cam };
    const px = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ visible: false }));
    px.position.set(...pos); px.userData.zone = id; scene.add(px); foodProxies.push(px); smallProxies.push(px);
    const b = document.createElement('button');
    b.dataset.id = id; b.type = 'button'; b.className = 'hotspot mini'; b.setAttribute('aria-label', label);
    b.innerHTML = `<b></b><span>${label}</span>`;
    b.addEventListener('click', e => { e.stopPropagation(); selectZone(id); });
    hotspotLayer.appendChild(b);
    hotEls[id] = { el: b, v: new THREE.Vector3(...hot) };
  }
  const hotEls = {};
  lixiTrees.forEach((t, i) => addItem('loc:' + i, cfg.scene.lixiTitle || 'Hái lộc đầu xuân', [t.x, 2.2, t.z], [1.9, 2.4, 1.9],
    { p: [t.x * 0.35, 2.0, 11.6], t: [t.x, 2.0, t.z] }, [t.x, 3.5, t.z]));
  addItem('brochure', (cfg.brochure && cfg.brochure.title) || 'Brochure', [brochureSpot.x, brochureSpot.y + 0.05, brochureSpot.z], [0.55, 0.3, 0.45],
    { p: [-0.1, 1.9, 9.8], t: [brochureSpot.x, 1.0, brochureSpot.z] }, [brochureSpot.x, 1.45, brochureSpot.z]);
  foodTables.forEach(({ i }) => {
    const id = 'food:' + i;
    const f = cfg.scene.foods[i] || {};
    const b = document.createElement('button');
    b.dataset.id = id; b.type = 'button'; b.className = 'hotspot mini'; b.setAttribute('aria-label', f.name || 'Món ăn');
    b.innerHTML = `<b></b><span>${f.name || ''}</span>`;
    b.addEventListener('click', e => { e.stopPropagation(); selectZone(id); });
    hotspotLayer.appendChild(b);
    hotEls[id] = { el: b, v: new THREE.Vector3(...foodGeo[id].hot) };
  });
  zones.forEach(z => {
    const geo = GEO[z.id];
    if (!geo) return;
    const b = document.createElement('button');
    b.dataset.id = z.id; b.type = 'button'; b.className = 'hotspot'; b.setAttribute('aria-label', z.name);
    b.innerHTML = `<b>${z.no}</b><span>${z.name}</span>`;
    b.addEventListener('click', e => { e.stopPropagation(); selectZone(z.id); });
    hotspotLayer.appendChild(b);
    hotEls[z.id] = { el: b, v: new THREE.Vector3(...geo.hot) };
  });

  /* ---------- Trạng thái điều hướng ---------- */
  let mode = 'orbit';
  let activeId = null;
  let tween = null;
  let yaw = 0, pitch = 0, groundY = 0, lookYaw = 0, lookPitch = 0;
  let walkTarget = null;
  const move = { x: 0, y: 0, lx: 0 };
  const vel = { x: 0, z: 0 };
  const keys = new Set();
  const up = new THREE.Vector3(0, 1, 0);
  const tmpF = new THREE.Vector3(), tmpR = new THREE.Vector3(), tmpV = new THREE.Vector3();

  function flyTo(p, t, dur = 1.25, done) {
    tween = {
      start: performance.now(), dur: dur * 1000, done,
      p0: camera.position.clone(), t0: controls.target.clone(),
      p1: new THREE.Vector3(...p), t1: new THREE.Vector3(...t)
    };
  }
  controls.addEventListener('start', () => { tween = null; });

  function exitWalk() {
    if (mode !== 'walk') return;
    mode = 'orbit';
    camera.getWorldDirection(tmpF);
    controls.enabled = true;
    controls.target.copy(camera.position).addScaledVector(tmpF, 6);
    controls.target.y = Math.max(0.6, camera.position.y - 0.7);
    controls.update();
    walkTarget = null;
    if (onMode) onMode('orbit');
  }
  function startWalk() {
    tmpF.copy(controls.target).sub(camera.position).normalize();
    yaw = Math.atan2(-tmpF.x, -tmpF.z);
    pitch = clamp(Math.asin(tmpF.y), -1.0, 1.0);
    groundY = 0; vel.x = vel.z = 0; lookYaw = lookPitch = 0;
    controls.enabled = false;
    mode = 'walk';
    if (onMode) onMode('walk');
  }
  function setMode(m) {
    if (m === 'walk') {
      if (mode === 'walk') return;
      flyTo([0, EYE, 15.8], [0, EYE - 0.05, 6], 1.3, startWalk);
    } else exitWalk();
  }

  function selectZone(id, { fly = true } = {}) {
    activeId = id;
    Object.entries(hotEls).forEach(([k, h]) => h.el.classList.toggle('on', k === id));
    const gg = GEO[id] || foodGeo[id] || extraGeo[id];
    if (id && fly && gg) { exitWalk(); flyTo(gg.cam.p, gg.cam.t); }
    if (onSelect) onSelect(id);
  }
  function setView(key) {
    const v = VIEWS[key];
    if (!v) return;
    exitWalk();
    flyTo(v.p, v.t, 1.4);
  }

  /* ---------- Buổi tối, ban ngày ---------- */
  function setTime(m) {
    const T = TIMES[m];
    scene.background.setHex(T.bg);
    scene.fog.color.setHex(T.bg);
    paintSky(T.sky);
    renderer.toneMappingExposure = T.exp;
    if (bloom) bloom.strength = T.bloom;
    hemi.color.setHex(T.hemiSky); hemi.groundColor.setHex(T.hemiGround); hemi.intensity = T.hemi;
    sun.color.setHex(T.sun); sun.intensity = T.sunI;
    lanternMat.emissiveIntensity = T.lantern;
    fairyMat.emissiveIntensity = T.fairy;
    bldMat.emissiveIntensity = T.win;
    beamMats.forEach(b => { b.opacity = T.beam; });
    backdropMat.emissiveIntensity = useLed ? 0.9 : T.bd;
    twScale = T.tw;
    lamps.forEach(l => { l.light.intensity = m === 'dusk' ? l.dusk : l.day; });
    shadowFrames = 6;
  }
  let twScale = 1;

  /* ---------- Pháo hoa giấy ---------- */
  const CONF_N = lowPower ? 420 : 720;
  const conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.14, 0.085), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), CONF_N);
  conf.frustumCulled = false; conf.count = 0;
  conf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CONF_N * 3), 3);
  scene.add(conf);
  const cp = Array.from({ length: CONF_N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3(), delay: 0, landed: true }));
  const confCols = [0xd9232d, 0xf0c332, 0xf2a5b8, 0xffffff, 0x2f9a4a, 0xe3b04b];
  const cannons = [[-3.9, 0.5, -7.4], [3.9, 0.5, -7.4], [0, 0.5, -6.6]];
  let confActive = false, confTime = 0;
  const cd = new THREE.Object3D();
  const col = new THREE.Color();
  function confetti() {
    conf.count = CONF_N; confTime = 0; confActive = true;
    cp.forEach((c, i) => {
      col.setHex(confCols[i % 6]); conf.setColorAt(i, col);
      c.landed = false;
      c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      c.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      if (i < CONF_N * 0.55) {
        const cn = cannons[i % 3];
        c.p.set(cn[0] + (Math.random() - 0.5) * 0.3, cn[1], cn[2]);
        const side = cn[0] === 0 ? (Math.random() - 0.5) * 3 : -Math.sign(cn[0]) * (0.8 + Math.random() * 2.4);
        c.v.set(side + (Math.random() - 0.5) * 1.6, 7 + Math.random() * 5.5, 0.8 + Math.random() * 3);
        c.delay = Math.random() * 0.25;
      } else {
        c.p.set((Math.random() - 0.5) * 22, 6 + Math.random() * 3, -8 + Math.random() * 18);
        c.v.set((Math.random() - 0.5) * 0.8, -0.5, (Math.random() - 0.5) * 0.8);
        c.delay = 0.4 + Math.random() * 1.6;
      }
    });
    conf.instanceColor.needsUpdate = true;
  }
  function updateConfetti(dt) {
    if (!confActive) return;
    confTime += dt;
    cp.forEach((c, i) => {
      if (c.delay > 0) { c.delay -= dt; cd.position.set(0, -50, 0); cd.scale.setScalar(0); }
      else {
        if (!c.landed) {
          c.v.y -= 9 * dt;
          if (c.v.y < -1.7) c.v.y = -1.7;
          c.v.x *= 1 - 1.1 * dt; c.v.z *= 1 - 1.1 * dt;
          c.p.x += Math.sin(confTime * 3 + i) * 0.35 * dt;
          c.p.addScaledVector(c.v, dt);
          c.r.addScaledVector(c.w, dt);
          if (c.p.y <= 0.035) { c.p.y = 0.035; c.landed = true; c.r.set(-Math.PI / 2, 0, c.r.z); }
        }
        cd.position.copy(c.p); cd.rotation.set(c.r.x, c.r.y, c.r.z); cd.scale.setScalar(1);
      }
      cd.updateMatrix(); conf.setMatrixAt(i, cd.matrix);
    });
    conf.instanceMatrix.needsUpdate = true;
    if (confTime > 40) { confActive = false; conf.count = 0; }
  }

  /* ---------- Điều khiển bàn phím và chạm ---------- */
  let running = false, raf = 0, last = 0;
  const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement ? document.activeElement.tagName : '');
  const KEYSET = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'];
  window.addEventListener('keydown', e => {
    if (!running || typing()) return;
    const k = e.key.toLowerCase();
    if (!KEYSET.includes(k)) return;
    keys.add(k); walkTarget = null; tween = null;
    if (k.startsWith('arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitV = new THREE.Vector3();
  let down = null;
  const el = renderer.domElement;
  function setNdc(e) {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  let lookId = null;
  el.addEventListener('pointerdown', e => {
    if (lookId !== null && e.pointerType === 'touch') return;      // ngón thứ hai bỏ qua, chỉ một ngón dùng để nhìn
    lookId = e.pointerId;
    down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), type: e.pointerType };
    walkTarget = null;
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
  });
  el.addEventListener('pointermove', e => {
    if (down && mode === 'walk' && e.pointerId === lookId && (e.buttons || e.pointerType === 'touch')) {
      const k = e.pointerType === 'touch' ? 0.0042 : 0.005;
      lookYaw -= (e.clientX - down.lx) * k;
      lookPitch = clamp(lookPitch - (e.clientY - down.ly) * k * 0.85, -1.1, 1.1);
      down.lx = e.clientX; down.ly = e.clientY;
      return;
    }
    if (e.buttons || mode === 'walk' || e.pointerType === 'touch') return;
    setNdc(e); ray.setFromCamera(ndc, camera);
    el.style.cursor = (ray.intersectObjects(foodProxies, false).length || ray.intersectObjects(proxies, false).length) ? 'pointer' : 'grab';
  });
  const endLook = e => { if (e.pointerId === lookId) lookId = null; };
  el.addEventListener('pointercancel', e => { endLook(e); down = null; });
  el.addEventListener('pointerup', e => {
    const mine = e.pointerId === lookId;
    endLook(e);
    if (!down || !mine) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 450;
    const touch = down.type === 'touch';
    down = null;
    if (moved > 8 || !quick) return;
    setNdc(e); ray.setFromCamera(ndc, camera);
    if (mode === 'walk') {
      const near = ray.intersectObjects(smallProxies, false)[0];
      if (near && near.distance < 9) { walkTarget = null; activeId = near.object.userData.zone; Object.entries(hotEls).forEach(([k, h]) => h.el.classList.toggle('on', k === activeId)); if (onSelect) onSelect(activeId); return; }
      // trên điện thoại chỉ dùng nút bi để đi, chạm vào sàn không làm nhân vật bật đi bất ngờ
      if (!touch && ray.ray.intersectPlane(groundPlane, hitV)) walkTarget = { x: hitV.x, z: hitV.z, t: 0 };
    } else {
      const hit = ray.intersectObjects(foodProxies, false)[0] || ray.intersectObjects(proxies, false)[0];
      if (hit) selectZone(hit.object.userData.zone);
    }
  });
  el.addEventListener('dblclick', e => {
    if (mode !== 'orbit') return;
    setNdc(e); ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(groundPlane, hitV)) return;
    const d = tmpV.copy(controls.target).sub(camera.position);
    flyTo([hitV.x - d.x * 0.5, Math.max(2, camera.position.y * 0.7), hitV.z - d.z * 0.5], [hitV.x, 0.8, hitV.z], 1.0);
  });

  /* ---------- Va chạm ---------- */
  function resolve(p) {
    p.x = clamp(p.x, -11.6, 11.6); p.z = clamp(p.z, -9.4, 16.0);
    const R = 0.3;
    for (const [x0, x1, z0, z1] of obstacles.rects) {
      if (p.x > x0 - R && p.x < x1 + R && p.z > z0 - R && p.z < z1 + R) {
        const dl = p.x - (x0 - R), dr = x1 + R - p.x, dt = p.z - (z0 - R), db = z1 + R - p.z;
        const m = Math.min(dl, dr, dt, db);
        if (m === dl) p.x = x0 - R; else if (m === dr) p.x = x1 + R; else if (m === dt) p.z = z0 - R; else p.z = z1 + R;
      }
    }
    for (const [cx, cz, r] of obstacles.circles) {
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz), mn = r + R;
      if (d < mn) {
        if (d < 1e-4) { p.x = cx + mn; }
        else { p.x = cx + (dx / d) * mn; p.z = cz + (dz / d) * mn; }
      }
    }
  }

  /* ---------- Cập nhật mỗi khung hình ---------- */
  const inp = () => {
    const f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0) + move.y;
    const side = mode === 'walk'
      ? (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0)
      : (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    return [clamp(f, -1, 1), clamp(side + move.x, -1, 1)];
  };

  function updateNav(dt) {
    const [f, s] = inp();
    const fast = keys.has('shift');
    if (mode === 'orbit') {
      if (!f && !s) return;
      camera.getWorldDirection(tmpF);
      if (Math.hypot(tmpF.x, tmpF.z) < 0.35) tmpF.copy(up).applyQuaternion(camera.quaternion);
      tmpF.y = 0; tmpF.normalize();
      tmpR.set(-tmpF.z, 0, tmpF.x);
      const dist = camera.position.distanceTo(controls.target);
      const sp = Math.max(3, dist * 0.7) * (fast ? 2 : 1) * dt;
      tmpV.set(0, 0, 0).addScaledVector(tmpF, f * sp).addScaledVector(tmpR, s * sp);
      camera.position.add(tmpV); controls.target.add(tmpV);
      tween = null;
      return;
    }
    if (mode !== 'walk') return;
    const turn = (keys.has('arrowleft') ? 1 : 0) - (keys.has('arrowright') ? 1 : 0);
    yaw += turn * 1.7 * dt;
    // xoay nhìn mượt: dồn góc kéo của ngón tay rồi áp dần theo từng khung hình
    const lk = 1 - Math.pow(0.0005, dt);
    yaw += lookYaw * lk; pitch = clamp(pitch + lookPitch * lk, -1.1, 1.1);
    lookYaw -= lookYaw * lk; lookPitch -= lookPitch * lk;
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);
    let wx = 0, wz = 0;
    const maxSp = fast ? 4.4 : 2.4;
    if (f || s) {
      const len = Math.hypot(f, s); const k = len > 1 ? 1 / len : 1;
      wx = (fwdX * f + rgtX * s) * maxSp * k; wz = (fwdZ * f + rgtZ * s) * maxSp * k;
      walkTarget = null;
    } else if (walkTarget) {
      const dx = walkTarget.x - camera.position.x, dz = walkTarget.z - camera.position.z, d = Math.hypot(dx, dz);
      if (d < 0.25 || walkTarget.t > 0.5) walkTarget = null;
      else {
        const want = Math.atan2(-dx, -dz);
        let diff = want - yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        yaw += diff * Math.min(1, dt * 5);
        const sp = Math.min(maxSp * 1.2, d * 2.5 + 0.6);
        wx = (dx / d) * sp; wz = (dz / d) * sp;
      }
    }
    // tăng giảm tốc mượt
    const acc = Math.min(1, dt * (wx || wz ? 9 : 12));
    vel.x += (wx - vel.x) * acc; vel.z += (wz - vel.z) * acc;
    const px0 = camera.position.x, pz0 = camera.position.z;
    // đi từng bước nhỏ, trượt dọc vật cản
    const steps = Math.max(1, Math.ceil(Math.hypot(vel.x, vel.z) * dt / 0.12));
    tmpV.set(px0, 0, pz0);
    for (let i = 0; i < steps; i++) { tmpV.x += vel.x * dt / steps; tmpV.z += vel.z * dt / steps; resolve(tmpV); }
    if (walkTarget) {
      const want = Math.hypot(vel.x, vel.z) * dt, got = Math.hypot(tmpV.x - px0, tmpV.z - pz0);
      if (want > 0.002 && got < want * 0.3) walkTarget.t += dt; else walkTarget.t = Math.max(0, walkTarget.t - dt);
    }
    const onStage = tmpV.x > STAGE_RECT[0] && tmpV.x < STAGE_RECT[1] && tmpV.z > STAGE_RECT[2] && tmpV.z < STAGE_RECT[3];
    groundY += ((onStage ? STAGE_H : 0) - groundY) * Math.min(1, dt * 8);
    camera.position.set(tmpV.x, groundY + EYE, tmpV.z);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  const tmp = new THREE.Vector3();
  function updateHotspots() {
    const w = container.clientWidth, h = container.clientHeight;
    Object.values(hotEls).forEach(({ el: b, v }) => {
      tmp.copy(v).project(camera);
      const hidden = tmp.z > 1 || tmp.z < -1;
      const mini = b.classList.contains('mini');
      const near = mini && Math.hypot(camera.position.x - v.x, camera.position.z - v.z) < 8;
      const lowCam = camera.position.y < 5.5 && b.dataset.id !== activeId && !near;
      b.style.visibility = (hidden || lowCam) ? 'hidden' : 'visible';
      b.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px) translate(-50%, -50%)`;
    });
  }

  /* ---------- Chữ nhắc nổi lên khi đến gần bàn đón tiếp ---------- */
  const nearEl = document.createElement('div');
  nearEl.className = 'nearhint'; nearEl.setAttribute('aria-live', 'polite');
  nearEl.textContent = (cfg.scene && cfg.scene.nearText) || 'Xin mời lấy brochure sự kiện và hái lộc đầu xuân';
  hotspotLayer.appendChild(nearEl);
  const nearPt = new THREE.Vector3(0, 2.15, 7.6);
  let nearK = 0, nearDt = 0.016;
  function updateNear() {
    const d = Math.hypot(camera.position.x - 0, camera.position.z - 7.6);
    const want = (d < 4.6 && camera.position.y < 4.2 && !activeId) ? 1 : 0;
    nearK += (want - nearK) * Math.min(1, nearDt * 7);
    if (nearK < 0.02) { nearEl.style.opacity = 0; nearEl.style.visibility = 'hidden'; return; }
    tmp.copy(nearPt).project(camera);
    const w = container.clientWidth, h = container.clientHeight;
    if (tmp.z > 1 || tmp.z < -1) { nearEl.style.visibility = 'hidden'; return; }
    const y = Math.min(Math.max((-tmp.y * 0.5 + 0.5) * h, 90), h - 90);
    nearEl.style.visibility = 'visible'; nearEl.style.opacity = nearK.toFixed(2);
    nearEl.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${y}px) translate(-50%, -50%) translateY(${((1 - nearK) * 10).toFixed(1)}px)`;
  }

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;

    if (tween) {
      const k = Math.min(1, (now - tween.start) / tween.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e);
      controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (k >= 1) { const d = tween.done; tween = null; if (d) d(); }
    }
    updateNav(dt);
    if (mode === 'orbit') {
      controls.update();
      controls.target.x = clamp(controls.target.x, -14, 14);
      controls.target.z = clamp(controls.target.z, -12, 17);
      controls.target.y = clamp(controls.target.y, 0, 6);
      if (camera.position.y < 0.5) camera.position.y = 0.5;
    }

    Object.entries(highlights).forEach(([id, hl]) => {
      const target = id === activeId ? 0.3 : 0;
      hl.material.opacity += (target - hl.material.opacity) * 0.14;
      hl.visible = hl.material.opacity > 0.004;
    });
    if (!reduceMotion) {
      const t = now / 1000;
      steamPuffs.forEach(({ m, o, y0, h }) => {
        const k = (t * 0.35 + o) % 1;
        m.position.y = y0 + k * h;
        m.scale.setScalar(0.7 + k * 1.0);
        m.material.opacity = 0.32 * (1 - k);
      });
    }
    {
      const t = now / 1000;
      twinkle.forEach((m, i) => {
        const k = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (2.2 + i * 0.7) + i * 2.1))) * twScale;
        m.color.setRGB(1.0 * k, 0.95 * k, 0.78 * k);
      });
    }
    updateConfetti(dt);
    updateHotspots();
    if (shadowFrames > 0) { renderer.shadowMap.needsUpdate = true; shadowFrames--; }
    nearDt = dt; updateNear();
    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  function start() { if (running) return; running = true; shadowFrames = 8; last = performance.now(); resize(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); keys.clear(); move.x = move.y = 0; }

  setTime('dusk');
  resize();

  return {
    start, stop, resize, selectZone, setView, setTime, setMode, confetti,
    getMode: () => mode,
    setMove: (x, y) => { move.x = x; move.y = y; walkTarget = null; }
  };
}
