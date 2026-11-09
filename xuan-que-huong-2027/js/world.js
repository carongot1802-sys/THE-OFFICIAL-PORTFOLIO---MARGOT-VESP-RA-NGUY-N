import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/*
  Mô hình sân tổ chức, đơn vị là mét.
  Trục x sang phải, y lên trên, z về phía người xem. Tường phông nền ở z = -10, cổng chào ở z = +10.6.
  Mỗi khu có area (x, z, rộng, sâu) để tô sáng sàn, hot (x, y, z) để đặt số, cam (vị trí máy, điểm nhìn).
*/
export const GEO = {
  gate:      { area: [0, 13.4, 5.6, 2.6],    hot: [0, 6.0, 13.4],     cam: { p: [7.5, 3.6, 19.5],  t: [0, 2.6, 13] } },
  reception: { area: [0, 7.7, 4.6, 2.6],     hot: [0, 2.8, 7.4],      cam: { p: [-0.8, 2.5, 11.8],  t: [0, 1.2, 7.2] } },
  coffee:    { area: [-10.4, 0.2, 2.8, 4.0], hot: [-10.4, 4.4, 0.2],  cam: { p: [-4.4, 2.9, 3.0],  t: [-10.4, 1.5, 0.2] } },
  tea:       { area: [-10.4, 6.4, 2.8, 4.0], hot: [-10.4, 4.4, 6.4],  cam: { p: [-4.4, 2.9, 9.2],  t: [-10.4, 1.5, 6.4] } },
  banhchung: { area: [8.2, 4.9, 6.8, 5.0],   hot: [8.2, 2.5, 4.9],    cam: { p: [2.2, 3.9, 10.4],  t: [8.4, 0.7, 4.9] } },
  cocktail:  { area: [0.2, 0.6, 8.4, 4.4],   hot: [0.2, 1.9, 0.6],    cam: { p: [-4.8, 4.6, 7.2],  t: [0.2, 0.8, 0.6] } },
  buffet:    { area: [8.75, -4.25, 6.4, 8.0],hot: [8.75, 4.2, -4.25], cam: { p: [2.0, 5.6, 2.4],   t: [8.75, 0.9, -4.25] } },
  seating:   { area: [-6.55, -3.9, 5.8, 5.4],hot: [-6.55, 2.2, -3.9],cam: { p: [-1.0, 4.4, 2.4],   t: [-6.5, 0.8, -3.9] } },
  standing:  { area: [0, -3.9, 7.4, 4.6],    hot: [0, 2.5, -3.9],     cam: { p: [0, 3.4, 4.8],     t: [0, 1.2, -4.5] } },
  stage:     { area: [0, -8.4, 7.8, 3],      hot: [2.6, 1.2, -8.3],   cam: { p: [7.6, 3.2, -0.6],  t: [0, 1.0, -8.4] } },
  backdrop:  { area: [0, -9.5, 6.6, 0.8],    hot: [0, 4.9, -9.7],     cam: { p: [0, 2.5, -1.6],    t: [0, 2.4, -9.9] } },
  podium:    { area: [-3, -8, 1.4, 1.4],     hot: [-3, 2.3, -8],      cam: { p: [-6.8, 2.4, -3.7], t: [-3, 1.3, -8] } }
};

export const STAGE_RECT = [-3.8, 3.8, -9.8, -7.0];
export const STAGE_H = 0.3;

const COL = {
  red: 0xa8141f, redDeep: 0x7a0f18, gold: 0xe3b04b, cream: 0xf2e8d5, white: 0xf3f1ec,
  kraft: 0xc9a46b, wood: 0x6b4528, leaf: 0x2f6b3f, pink: 0xf2a5b8, mai: 0xf0c332,
  steel: 0xc9ced6, dark: 0x2b2b30, bamboo: 0x7fa04a
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildWorld(cfg, env) {
  const root = new THREE.Group();
  const rnd = mulberry32(2027);
  const TH = cfg.theme || {};
  const FD = TH._fd || '"Cormorant Garamond", Georgia, serif';
  const FB = TH._fb || '"Be Vietnam Pro", Arial, sans-serif';
  const TC = Object.assign({ bannerTitle: '#f3dca3', bannerSub: '#e3b04b', couplet: '#f3dca3', sign: '#f3dca3' }, TH.colors || {});
  const lamps = [];
  const twinkleSpots = [[], [], []];
  const foodTables = [];
  const obstacles = { rects: [], circles: [] };
  const rect = (x0, x1, z0, z1) => obstacles.rects.push([x0, x1, z0, z1]);
  const circ = (x, z, r) => obstacles.circles.push([x, z, r]);

  /* ---------- Hàm dựng cơ bản ---------- */
  const matCache = {};
  const M = (color, o = {}) => {
    const k = color + JSON.stringify(o);
    return (matCache[k] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o }));
  };
  const geoCache = {};
  const G = (type, ...a) => (geoCache[type + a.join(',')] ||= new THREE[type](...a));

  function mesh(geo, mat, x = 0, y = 0, z = 0, parent = root, shadow = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (w, h, d, mat, x, y, z, p) => mesh(G('BoxGeometry', w, h, d), mat, x, y, z, p);
  const cyl = (rt, rb, h, mat, x, y, z, p, seg = 16) => mesh(G('CylinderGeometry', rt, rb, h, seg), mat, x, y, z, p);
  const sph = (r, mat, x, y, z, p, ws = 12, hs = 8) => mesh(G('SphereGeometry', r, ws, hs), mat, x, y, z, p);

  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h, c);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  function flatPlane(tex, w, h, x, y, z, parent = root, rotY = 0, double = false) {
    const m = new THREE.Mesh(G('PlaneGeometry', w, h), new THREE.MeshBasicMaterial({ map: tex, side: double ? THREE.DoubleSide : THREE.FrontSide, toneMapped: false }));
    m.position.set(x, y, z); m.rotation.y = rotY;
    parent.add(m);
    return m;
  }
  function wrap(g, text, maxW) {
    const words = text.split(' '); const lines = []; let cur = '';
    words.forEach(w => {
      const t = cur ? cur + ' ' + w : w;
      if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function signPlane(text, w, h, bg, fg, x, y, z, parent = root, rotY = 0, double = false) {
    const fgc = fg === '#f3dca3' ? TC.sign : fg;
    const t = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => {
      g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
      g.strokeStyle = fgc; g.globalAlpha = 0.7; g.lineWidth = 6; g.strokeRect(10, 10, cw - 20, ch - 20); g.globalAlpha = 1;
      g.fillStyle = fgc; g.textAlign = 'center'; g.textBaseline = 'middle';
      let size = ch * 0.5;
      g.font = `bold ${size}px ${FD}`;
      while (g.measureText(text).width > cw * 0.86 && size > 12) { size -= 2; g.font = `bold ${size}px ${FD}`; }
      g.fillText(text, cw / 2, ch / 2 + size * 0.04);
    });
    return flatPlane(t, w, h, x, y, z, parent, rotY, double);
  }

  function signPlane2(vi, fr, w, h, bg, fg, x, y, z, parent = root, rotY = 0) {
    const fgc = fg === '#f3dca3' ? TC.sign : fg;
    const t = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => {
      g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
      g.strokeStyle = fgc; g.globalAlpha = 0.7; g.lineWidth = 6; g.strokeRect(10, 10, cw - 20, ch - 20); g.globalAlpha = 1;
      g.fillStyle = fgc; g.textAlign = 'center'; g.textBaseline = 'middle';
      let size = ch * 0.42;
      g.font = `bold ${size}px ${FD}`;
      while (g.measureText(vi).width > cw * 0.86 && size > 12) { size -= 2; g.font = `bold ${size}px ${FD}`; }
      g.fillText(vi, cw / 2, ch * (fr ? 0.36 : 0.5));
      if (fr) {
        let s2 = ch * 0.27; g.globalAlpha = 0.92; g.font = `italic ${s2}px ${FD}`;
        while (g.measureText(fr).width > cw * 0.82 && s2 > 10) { s2 -= 2; g.font = `italic ${s2}px ${FD}`; }
        g.fillText(fr, cw / 2, ch * 0.74); g.globalAlpha = 1;
      }
    });
    return flatPlane(t, w, h, x, y, z, parent, rotY, false);
  }

  /* ---------- Đèn chiếu thật (bật mạnh buổi tối, giảm ban ngày) ---------- */
  function spot(x, y, z, tx, ty, tz, color, dusk, day, angle = 0.7, pen = 0.5) {
    const l = new THREE.SpotLight(color, dusk, 0, angle, pen, 2);
    l.position.set(x, y, z); l.target.position.set(tx, ty, tz);
    root.add(l, l.target); lamps.push({ light: l, dusk, day });
    return l;
  }
  function point(x, y, z, color, dusk, day, dist = 0) {
    const l = new THREE.PointLight(color, dusk, dist, 2);
    l.position.set(x, y, z); root.add(l); lamps.push({ light: l, dusk, day });
    return l;
  }

  /* ---------- Vật liệu phát sáng ---------- */
  const lanternMat = new THREE.MeshStandardMaterial({ color: COL.red, emissive: 0xff2a14, emissiveIntensity: 1.7, roughness: 0.5 });
  const fairyMat = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd98a, emissiveIntensity: 2.6 });
  const beamMats = [];
  const steamPuffs = [];

  /* ---------- Đèn lồng (gom lại một lượt để nhẹ máy) ---------- */
  const lanternList = [];
  function lantern(x, y, z, s = 1, parent = null) {
    if (parent) {
      parent.updateMatrixWorld(true);
      const v = parent.localToWorld(new THREE.Vector3(x, y, z));
      x = v.x; y = v.y; z = v.z;
    }
    lanternList.push({ x, y, z, s });
  }
  function flushLanterns() {
    const n = lanternList.length;
    const body = new THREE.InstancedMesh(G('SphereGeometry', 0.22, 14, 10), lanternMat, n);
    const cap = new THREE.InstancedMesh(G('CylinderGeometry', 0.07, 0.07, 0.05, 8), M(COL.gold), n * 2);
    const tas = new THREE.InstancedMesh(G('CylinderGeometry', 0.012, 0.012, 0.22, 4), M(COL.gold), n);
    const d = new THREE.Object3D();
    lanternList.forEach((l, i) => {
      d.rotation.set(0, 0, 0);
      d.position.set(l.x, l.y, l.z); d.scale.set(l.s, 0.88 * l.s, l.s); d.updateMatrix(); body.setMatrixAt(i, d.matrix);
      d.scale.setScalar(l.s);
      d.position.set(l.x, l.y + 0.2 * l.s, l.z); d.updateMatrix(); cap.setMatrixAt(i * 2, d.matrix);
      d.position.set(l.x, l.y - 0.2 * l.s, l.z); d.updateMatrix(); cap.setMatrixAt(i * 2 + 1, d.matrix);
      d.position.set(l.x, l.y - 0.34 * l.s, l.z); d.updateMatrix(); tas.setMatrixAt(i, d.matrix);
    });
    root.add(body, cap, tas);
  }

  /* ---------- Nền đất, tường, nhà xung quanh ---------- */
  const groundTex = canvasTex(512, 512, (g, w, h) => {
    // đá granite ấm, có vân hạt mịn và mạch ron mảnh, nhìn sang hơn gạch trắng phẳng
    g.fillStyle = '#a89d8e'; g.fillRect(0, 0, w, h);
    const tr = mulberry32(31);
    for (let i = 0; i < 5200; i++) {
      const v = Math.floor(120 + tr() * 70);
      g.fillStyle = `rgba(${v + 14},${v + 4},${v - 10},${0.10 + tr() * 0.14})`;
      g.fillRect(tr() * w, tr() * h, 1 + tr() * 3, 1 + tr() * 3);
    }
    const sl = g.createLinearGradient(0, 0, w, h);
    sl.addColorStop(0, 'rgba(255,240,215,.10)'); sl.addColorStop(.5, 'rgba(0,0,0,0)'); sl.addColorStop(1, 'rgba(60,40,20,.12)');
    g.fillStyle = sl; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(70,58,46,.55)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
    g.strokeStyle = 'rgba(70,58,46,.32)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  }, [13, 13]);
  const ground = mesh(G('PlaneGeometry', 26, 26), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.62, metalness: 0.04 }), 0, 0, 0, root, false);
  ground.rotation.x = -Math.PI / 2;
  const street = mesh(G('PlaneGeometry', 220, 220), M(0x2a2c33, { roughness: 1 }), 0, -0.03, 0, root, false);
  street.rotation.x = -Math.PI / 2;

  const wallMat = M(COL.white, { roughness: 0.95 });
  box(26, 4.8, 0.3, wallMat, 0, 2.4, -10.15);
  box(0.3, 4.2, 22.6, wallMat, -12.15, 2.1, 0.9);
  box(0.3, 2.8, 22.6, wallMat, 12.15, 1.4, 0.9);
  box(9, 1.2, 0.3, wallMat, -7.5, 0.6, 12.15);
  box(9, 1.2, 0.3, wallMat, 7.5, 0.6, 12.15);
  rect(-12, -3, 12.0, 12.3); rect(3, 12, 12.0, 12.3);
  const sideTex = groundTex.clone(); sideTex.repeat.set(13, 2); sideTex.needsUpdate = true;
  const sidewalk = mesh(G('PlaneGeometry', 26, 4), new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.7 }), 0, 0.002, 14.15, root, false);
  sidewalk.rotation.x = -Math.PI / 2;
  box(26, 0.12, 0.2, M(0xb3aa9c), 0, 0.03, 16.2);

  const bRnd = mulberry32(88);
  const winCanvas = lit => canvasTex(128, 256, (g, w, h) => {
    // nhà xung quanh lùi vào bóng tối, chỉ vài ô cửa sổ sáng ánh vàng ấm
    g.fillStyle = lit ? '#000' : '#4a4752'; g.fillRect(0, 0, w, h);
    for (let y = 14; y < h; y += 34) for (let x = 14; x < w; x += 34) {
      if (lit) { g.fillStyle = bRnd() > 0.72 ? (bRnd() > 0.5 ? '#ffcf86' : '#ffe6b8') : '#000'; }
      else g.fillStyle = '#2c2a34';
      g.fillRect(x, y, 13, 18);
    }
  }, [3, 4]);
  const bldMat = new THREE.MeshStandardMaterial({ map: winCanvas(false), emissiveMap: winCanvas(true), emissive: 0xffffff, emissiveIntensity: 1.3, roughness: 1 });
  [[-19, -14, 8, 14, 9], [-21, 3, 7, 10, 12], [-18, 18, 8, 15, 8], [20, -13, 9, 12, 9], [21, 6, 7, 16, 9],
   [3, -20, 16, 11, 8], [-12, -21, 10, 15, 8], [14, -22, 12, 13, 8]].forEach(([x, z, w, h, d]) => box(w, h, d, bldMat, x, h / 2, z));

  /* ---------- Cây, hoa đào, hoa mai ---------- */
  function realTree(x, z, sc = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(sc); root.add(g);
    cyl(0.22, 0.34, 3.4, M(COL.wood), 0, 1.7, 0, g, 8);
    const greens = [0x24563a, 0x2c6642, 0x1f4c33, 0x357548];
    [[0, 4.2, 0, 1.45], [-1.1, 3.8, 0.4, 1.0], [1.0, 3.9, -0.3, 1.1], [0.2, 5.0, 0.3, 0.95], [-0.4, 3.6, -1.0, 0.9],
     [0.9, 4.6, 0.7, 0.8], [-0.9, 4.7, -0.5, 0.8], [0.3, 3.5, 1.0, 0.8], [-0.2, 5.5, -0.2, 0.55]].forEach(([a, b, c, r], i) =>
      mesh(G('IcosahedronGeometry', r, 2), M(greens[i % 4], { roughness: 0.92 }), a, b, c, g));
    circ(x, z, 0.5 * sc);
  }
  function blossomTree(x, z, color, parent = root, s = 1, solid = true, lixi = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
    cyl(0.4, 0.3, 0.5, M(COL.redDeep), 0, 0.25, 0, g, 14);
    cyl(0.4, 0.4, 0.03, M(COL.gold), 0, 0.48, 0, g, 14);
    cyl(0.06, 0.1, 1.7, M(COL.wood), 0, 1.3, 0, g, 6);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const b = cyl(0.03, 0.05, 1.1, M(COL.wood), Math.cos(a) * 0.25, 2.0, Math.sin(a) * 0.25, g, 5);
      b.rotation.z = Math.cos(a) * 0.6; b.rotation.x = -Math.sin(a) * 0.6;
    }
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, r = 0.2 + rnd() * 0.85, y = 1.85 + rnd() * 1.2;
      const c = new THREE.Color(color).offsetHSL(0, 0, (rnd() - 0.5) * 0.1);
      mesh(G('IcosahedronGeometry', 0.17 + rnd() * 0.08, 0), M(c.getHex()), Math.cos(a) * r, y, Math.sin(a) * r, g);
    }
    for (let i = 0; i < 8; i++) {
      const a = rnd() * Math.PI * 2, r = 0.55 + rnd() * 0.5, y = 2.0 + rnd() * 0.8;
      box(0.07, 0.17, 0.012, M(COL.red), Math.cos(a) * r, y, Math.sin(a) * r, g);
      sph(0.016, M(COL.gold), Math.cos(a) * r, y + 0.04, Math.sin(a) * r + 0.008, g, 5, 4);
    }
    if (lixi > 0) {
      const strMat = M(0xe3b04b), envs = [M(0xd9232d), M(0xb3151f), M(0xe8412d)], trim = M(0xf0c332);
      for (let i = 0; i < lixi; i++) {
        const a = (i / lixi) * Math.PI * 2 * 3.1 + rnd() * 0.5, r = 0.35 + rnd() * 0.75, top = 2.85 - rnd() * 0.75 - (r < 0.5 ? 0.35 : 0);
        const ex = Math.cos(a) * r, ez = Math.sin(a) * r, len = 0.16 + rnd() * 0.2;
        box(0.006, len, 0.006, strMat, ex, top - len / 2, ez, g);
        const ey = top - len - 0.1;
        const env = box(0.1, 0.17, 0.012, envs[i % 3], ex, ey, ez, g); env.rotation.y = rnd() * Math.PI;
        const cy = Math.cos(env.rotation.y) * 0.008, sy = -Math.sin(env.rotation.y) * 0.008;
        box(0.1, 0.012, 0.014, trim, ex, ey + 0.07, ez, g).rotation.y = env.rotation.y;
        sph(0.022, trim, ex + cy, ey, ez + sy, g, 6, 4);
      }
    }
    g.updateWorldMatrix(true, false);
    const v = new THREE.Vector3();
    for (let i = 0; i < 52; i++) {
      const a = rnd() * Math.PI * 2, r = 0.15 + rnd() * 1.0, y = 1.75 + rnd() * 1.4;
      twinkleSpots[i % 3].push(g.localToWorld(v.set(Math.cos(a) * r, y, Math.sin(a) * r)).clone());
    }
    if (solid) circ(x, z, 0.45 * s);
  }
  realTree(-9.6, -8.8);
  // thêm cây xanh, bụi cây và hàng rào cây cho khuôn viên
  function hedge(x0, z0, x1, z1, h = 0.8) {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.55));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const r = 0.42 + rnd() * 0.12;
      mesh(G('IcosahedronGeometry', r, 1), M(i % 3 ? 0x2f6b3f : 0x3f7a45), x, h * 0.5 + rnd() * 0.12, z, root).scale.set(1, h / (r * 1.7), 1);
    }
    rect(Math.min(x0, x1) - 0.35, Math.max(x0, x1) + 0.35, Math.min(z0, z1) - 0.35, Math.max(z0, z1) + 0.35);
  }
  [[-7.2, -9.1, 1.05], [-11.2, -5.6, 0.9], [6.8, -9.2, 1.1], [11.2, -9.3, 1.0], [-11.3, 10.4, 1.0], [-11.3, 11.9, 0.85],
   [11.3, 9.4, 1.05], [11.3, 11.6, 0.9], [-8.4, 10.9, 0.95], [8.6, 10.9, 1.0], [-11.3, -3.4, 0.8]].forEach(([x, z, sc]) => realTree(x, z, sc));
  hedge(-11.7, -9.6, -8.2, -9.6); hedge(4.6, -9.6, 7.4, -9.6); hedge(9.2, -9.6, 11.7, -9.6);
  hedge(-11.75, 9.3, -11.75, 11.9, 0.7); hedge(11.75, 7.6, 11.75, 11.9, 0.7);
  hedge(-11.5, 11.65, -6.6, 11.65, 0.7); hedge(6.6, 11.65, 11.5, 11.65, 0.7);
  hedge(-11.75, -9.0, -11.75, -5.2, 0.75);
  // chậu bụi hoa nhỏ rải dọc lối đi
  [[-3.4, 10.6], [3.4, 10.6], [-3.3, 5.2], [3.3, 5.2]].forEach(([x, z], i) => {
    cyl(0.3, 0.24, 0.4, M(COL.redDeep), x, 0.2, z, root, 12);
    for (let k = 0; k < 4; k++) mesh(G('IcosahedronGeometry', 0.26, 1), M(k % 2 ? 0x3f7a45 : 0x2f6b3f), x + (k - 1.5) * 0.1, 0.55 + (k % 2) * 0.1, z + ((k * 7) % 3 - 1) * 0.08, root);
    for (let k = 0; k < 3; k++) sph(0.06, M(i % 2 ? COL.pink : COL.mai), x + (k - 1) * 0.15, 0.78, z, root, 6, 5);
    circ(x, z, 0.32);
  });

  /* ---------- Câu đối ---------- */
  function coupletTex(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return canvasTex(256, 1024, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b3151f'); gr.addColorStop(1, '#8e0f18');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#e3b04b'; g.lineWidth = 5; g.strokeRect(12, 12, w - 24, h - 24);
      g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
      g.fillStyle = '#e3b04b';
      [[42, 42], [w - 42, 42], [42, h - 42], [w - 42, h - 42]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); });
      g.fillStyle = TC.couplet; g.textAlign = 'center'; g.textBaseline = 'middle';
      const step = (h - 170) / Math.max(1, words.length);
      words.forEach((wd, i) => {
        let s = Math.min(96, step * 0.8);
        g.font = `italic 700 ${s}px ${FD}`;
        while (g.measureText(wd).width > w - 80 && s > 20) { s -= 4; g.font = `italic 700 ${s}px ${FD}`; }
        g.fillText(wd, w / 2, 90 + step * (i + 0.5));
      });
    });
  }
  const coupletTexs = {
    left: coupletTex(cfg.scene.couplets.left),
    right: coupletTex(cfg.scene.couplets.right)
  };
  function couplet(side, x, y, z, parent = root, rotY = 0, s = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; g.scale.setScalar(s); parent.add(g);
    flatPlane(coupletTexs[side], 0.45, 1.8, 0, 0, 0, g, 0, true);
    [0.92, -0.92].forEach(yy => {
      const r = cyl(0.03, 0.03, 0.56, M(COL.wood), 0, yy, 0, g, 8); r.rotation.z = Math.PI / 2;
      sph(0.045, M(COL.gold), 0.29, yy, 0, g, 8, 6); sph(0.045, M(COL.gold), -0.29, yy, 0, g, 8, 6);
    });
    return g;
  }

  /* ---------- Dây đèn lồng, dây đèn nhỏ ---------- */
  function lanternString(x1, x2, z, y, sag, count) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new THREE.Vector3(x1 + (x2 - x1) * t, y - Math.sin(t * Math.PI) * sag, z)); }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x6b5340, transparent: true, opacity: 0.55 })));
    for (let i = 1; i < count; i++) {
      const t = i / count;
      lantern(x1 + (x2 - x1) * t, y - Math.sin(t * Math.PI) * sag - 0.28, z);
    }
  }
  [[8.6, 4.9], [4.2, 5.0], [0.0, 5.1], [-4.0, 5.2], [-7.6, 5.0]].forEach(([z, y]) => lanternString(-11.8, 11.8, z, y, 0.5, 15));
  for (let x = -11.5; x <= 11.5; x += 0.55) sph(0.05, fairyMat, x, 4.15 + Math.sin(x * 1.3) * 0.07, -9.95, root, 6, 4);
  for (let z = -9.5; z <= 11; z += 0.55) sph(0.05, fairyMat, -11.95, 3.9 + Math.sin(z * 1.3) * 0.07, z, root, 6, 4);

  /* ---------- Sân khấu, phông nền ---------- */
  const [bw, bh] = cfg.scene.backdropSize || [6.4, 3.4];
  box(7.6, 0.3, 2.8, M(COL.red, { roughness: 0.95 }), 0, 0.15, -8.4);
  box(7.7, 0.015, 2.9, M(COL.gold), 0, 0.305, -8.4);
  box(7.5, 0.02, 2.7, M(COL.redDeep), 0, 0.31, -8.4);

  function drawFlagVN(g, x, y, w, h) {
    g.fillStyle = '#da251d'; g.fillRect(x, y, w, h);
    g.fillStyle = '#ffde00'; g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = (i % 2 ? 0.1 : 0.26) * h, a = -Math.PI / 2 + (i * Math.PI) / 5;
      g.lineTo(x + w / 2 + Math.cos(a) * r, y + h / 2 + Math.sin(a) * r);
    }
    g.closePath(); g.fill();
  }
  function drawFlagDZ(g, x, y, w, h) {
    g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h);
    g.fillStyle = '#006233'; g.fillRect(x, y, w / 2, h);
    g.fillStyle = '#d21034';
    g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(x + w / 2 + h * 0.07, y + h / 2, h * 0.21, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d21034';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = (i % 2 ? 0.05 : 0.12) * h, a = -Math.PI / 2 + (i * Math.PI) / 5;
      g.lineTo(x + w / 2 + h * 0.1 + Math.cos(a) * r, y + h / 2 + Math.sin(a) * r);
    }
    g.closePath(); g.fill();
  }
  const bdTex = canvasTex(1024, Math.round(1024 * bh / bw), (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#3a0c12'); gr.addColorStop(0.5, '#7a1a14'); gr.addColorStop(1, '#0f3b25');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(227,176,75,.2)'; g.lineWidth = 2;
    for (let y = 0; y < h; y += 26) for (let x = ((y / 26) % 2) * 26; x < w; x += 52) { g.beginPath(); g.arc(x, y, 26, Math.PI, 0); g.stroke(); }
    g.fillStyle = '#e3b04b'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${h * 0.04}px ${FD}`;
    g.fillText('ĐẠI SỨ QUÁN NƯỚC CHXHCN VIỆT NAM TẠI ALGERIA', w / 2, h * 0.08);
    g.fillText('AMBASSADE DE LA RÉPUBLIQUE SOCIALISTE DU VIETNAM EN ALGÉRIE', w / 2, h * 0.14);
    g.font = `bold ${h * 0.2}px ${FD}`; g.fillText('Xuân Quê hương', w / 2, h * 0.43);
    g.font = `bold ${h * 0.14}px ${FD}`; g.fillStyle = '#f3dca3'; g.fillText('Đinh Mùi 2027', w / 2, h * 0.65);
    drawFlagVN(g, w * 0.3, h * 0.78, w * 0.1, h * 0.1);
    drawFlagDZ(g, w * 0.6, h * 0.78, w * 0.1, h * 0.1);
    g.fillStyle = '#f3dca3'; g.font = `bold ${h * 0.05}px ${FD}`;
    g.fillText('Việt Nam', w * 0.45, h * 0.83); g.fillText('Algérie', w * 0.55, h * 0.83);
    g.font = `${h * 0.032}px ${FB}`; g.fillStyle = 'rgba(243,220,163,.75)';
    g.fillText('Phông minh họa. Thiết kế giao thoa Việt Nam và Algeria sẽ được thêm trong trang quản trị', w / 2, h * 0.94);
  });
  const useLed = !!cfg.scene.useLed;
  const backdropMat = new THREE.MeshStandardMaterial({ map: bdTex, roughness: 0.7, emissive: 0xffffff, emissiveMap: bdTex, emissiveIntensity: useLed ? 0.9 : 0.1 });
  const backdrop = new THREE.Mesh(G('PlaneGeometry', bw, bh), backdropMat);
  backdrop.position.set(0, 1.0 + bh / 2, -9.97);
  backdrop.receiveShadow = true;
  root.add(backdrop);
  if (cfg.scene.backdropImage) env.loadTexture(cfg.scene.backdropImage, t => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    backdropMat.map = t; backdropMat.emissiveMap = t; backdropMat.needsUpdate = true;
  });
  const bdTop = 1.0 + bh;
  box(bw + 0.2, 0.1, 0.06, M(COL.dark), 0, bdTop + 0.05, -9.95);
  box(bw + 0.2, 0.1, 0.06, M(COL.dark), 0, 0.95, -9.95);
  const railY = bdTop + 0.45;
  box(bw + 0.6, 0.05, 0.05, M(COL.dark), 0, railY, -9.7);
  for (let i = 0; i < 5; i++) {
    const x = -bw * 0.38 + (i * bw * 0.76) / 4;
    const fx = new THREE.Group(); fx.position.set(x, railY - 0.05, -9.7); fx.rotation.x = 0.16; root.add(fx);
    cyl(0.07, 0.09, 0.18, M(COL.dark), 0, -0.05, 0, fx, 10);
    const bm = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    beamMats.push(bm);
    const cone = new THREE.Mesh(G('ConeGeometry', 0.55, 2.4, 14, 1, true), bm);
    cone.position.y = -1.3; fx.add(cone);
  }
  couplet('left', -bw / 2 - 0.55, 2.35, -9.9, root, 0, 1.15);
  couplet('right', bw / 2 + 0.55, 2.35, -9.9, root, 0, 1.15);
  blossomTree(-4.7, -8.9, COL.pink);
  blossomTree(4.7, -8.9, COL.mai);
  lantern(-bw / 2 - 1.2, 3.6, -9.6, 1.3); lantern(bw / 2 + 1.2, 3.6, -9.6, 1.3);
  // đèn chiếu sân khấu: hai đèn trên thanh rọi và hai đèn pha hai bên sân
  spot(-1.9, 4.7, -9.2, -0.6, 1.3, -8.2, 0xffe2b8, 55, 9, 0.85, 0.6);
  spot(1.9, 4.7, -9.2, 0.6, 1.3, -8.2, 0xffe2b8, 55, 9, 0.85, 0.6);
  [-1, 1].forEach(sd => {
    cyl(0.05, 0.05, 4.8, M(COL.dark), sd * 6.8, 2.4, -3.2, root, 8);
    box(0.5, 0.3, 0.3, M(COL.dark), sd * 6.8, 4.9, -3.2);
    sph(0.12, M(0xfff2d0, { emissive: 0xfff2d0, emissiveIntensity: 1.5 }), sd * 6.8 - sd * 0.05, 4.85, -3.35, root, 8, 6);
    spot(sd * 6.8, 4.9, -3.2, 0, 1.4, -8.4, 0xfff0d0, 190, 30, 0.5, 0.5);
    circ(sd * 6.8, -3.2, 0.2);
  });

  /* ---------- Bục phát biểu bên trái và người phát biểu ---------- */
  const pod = new THREE.Group(); pod.position.set(-3, 0.3, -8); root.add(pod);
  box(0.75, 1.05, 0.5, M(COL.wood), 0, 0.525, 0, pod);
  const podTop = box(0.85, 0.07, 0.6, M(0x4a2e1a), 0, 1.08, 0, pod); podTop.rotation.x = 0.12;
  const emb = new THREE.Mesh(G('CircleGeometry', 0.17, 24), new THREE.MeshBasicMaterial({ color: COL.gold }));
  emb.position.set(0, 0.55, 0.255); pod.add(emb);
  cyl(0.012, 0.012, 0.32, M(COL.dark), 0.1, 1.27, 0.05, pod, 6);
  sph(0.03, M(COL.dark), 0.1, 1.45, 0.07, pod, 8, 6);
  circ(-3, -8, 0.55);

  // Người phát biểu đứng sau bục, áo dài xanh
  const speaker = new THREE.Group(); speaker.position.set(-3, 0.3, -8.5); root.add(speaker);
  const robe = new THREE.Mesh(G('CylinderGeometry', 0.2, 0.3, 1.3, 16), M(0xb3151f, { roughness: 0.7 }));
  robe.position.y = 0.65; robe.castShadow = true; speaker.add(robe);
  box(0.36, 0.05, 0.18, M(0x7a0f18), 0, 1.3, 0.04, speaker);
  sph(0.15, M(0xe2b48c), 0, 1.5, 0, speaker, 12, 10);
  const silver = M(0xd5d9e0, { metalness: 0.85, roughness: 0.25 });
  // kính gọng bạc, mắt kính hình chữ nhật
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xdfeaf2, transparent: true, opacity: 0.28, roughness: 0.1 });
  [-0.062, 0.062].forEach(x => {
    const fz = 0.141, fw = 0.082, fh = 0.054, t = 0.007;
    box(fw, t, t, silver, x, 1.52 + fh / 2, fz, speaker); box(fw, t, t, silver, x, 1.52 - fh / 2, fz, speaker);
    box(t, fh, t, silver, x - fw / 2, 1.52, fz, speaker); box(t, fh, t, silver, x + fw / 2, 1.52, fz, speaker);
    box(fw, fh, 0.002, lensMat, x, 1.52, fz, speaker);
  });
  box(0.05, 0.007, 0.007, silver, 0, 1.538, 0.141, speaker);
  [-0.106, 0.106].forEach(x => { const a = box(0.006, 0.006, 0.1, silver, x, 1.538, 0.09, speaker); a.rotation.y = x < 0 ? 0.1 : -0.1; });
  box(0.34, 0.03, 0.2, M(COL.gold), 0, 1.27, 0.03, speaker);
  // tóc đen ôm tròn đầu, mái hơi phủ trán
  const hairMat = M(0x141414, { roughness: 0.9 });
  sph(0.166, hairMat, 0, 1.535, -0.032, speaker, 16, 12).scale.set(1.0, 0.98, 1.02);
  const fr = sph(0.15, hairMat, 0, 1.6, 0.045, speaker, 14, 8); fr.scale.set(1.02, 0.55, 0.8);
  [-0.15, 0.15].forEach(x => sph(0.05, hairMat, x, 1.5, -0.02, speaker, 8, 6).scale.set(0.5, 1.1, 1.1));
  const armL = cyl(0.05, 0.05, 0.5, M(0xb3151f), -0.2, 1.0, 0.12, speaker, 8); armL.rotation.x = -0.7;
  const armR = cyl(0.05, 0.05, 0.5, M(0xb3151f), 0.2, 1.0, 0.12, speaker, 8); armR.rotation.x = -0.7;
  sph(0.045, M(0xe2b48c), -0.2, 0.82, 0.3, speaker, 8, 6); sph(0.045, M(0xe2b48c), 0.2, 0.82, 0.3, speaker, 8, 6);

  /* ---------- Bàn ghế ---------- */
  const cupMat = M(COL.red);
  const kraftMat = M(COL.kraft);
  function cocktailTable(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    cyl(0.44, 0.6, 1.05, M(0xa5121f, { roughness: 0.7 }), 0, 0.525, 0, g, 20);
    cyl(0.46, 0.46, 0.04, M(0xa5121f, { roughness: 0.7 }), 0, 1.07, 0, g, 20);
    cyl(0.12, 0.09, 0.1, kraftMat, -0.12, 1.14, 0.06, g, 12);
    cyl(0.12, 0.09, 0.1, kraftMat, 0.12, 1.14, -0.1, g, 12);
    for (let i = 0; i < 3; i++) cyl(0.045, 0.035, 0.1, cupMat, -0.25 + i * 0.22, 1.14, 0.25, g, 8);
    circ(x, z, 0.6);
  }
  const cocktailPos = [[-2.4, -0.6], [0.2, 0.0], [2.6, -0.8], [-1.4, 1.9], [1.6, 2.1], [3.9, 0.9], [-3.9, 0.8], [-0.8, -1.2]];
  cocktailPos.forEach(([x, z]) => cocktailTable(x, z));

  const chairMat = M(0x5a3b24);
  function chair(x, z, rotY) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; root.add(g);
    box(0.42, 0.05, 0.42, chairMat, 0, 0.46, 0, g);
    box(0.42, 0.45, 0.05, chairMat, 0, 0.72, 0.2, g);
    [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([a, b]) => box(0.04, 0.44, 0.04, M(COL.dark), a, 0.22, b, g));
  }
  const seated = [];
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xeaf4f8, transparent: true, opacity: 0.45, roughness: 0.1 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb040, toneMapped: false });
  function placeSetting(parent, x, z, a) {
    const sg = new THREE.Group(); sg.position.set(x, 0.78, z); sg.rotation.y = Math.PI / 2 - a; parent.add(sg);
    cyl(0.13, 0.12, 0.012, M(COL.white), 0, 0.006, 0, sg, 18);
    cyl(0.062, 0.04, 0.05, M(0xf4f0e6), 0, 0.037, 0.01, sg, 12);
    cyl(0.052, 0.052, 0.004, M(0xb8742f), 0, 0.064, 0.01, sg, 12);
    [-0.2, -0.22].forEach(zz => { const c = cyl(0.004, 0.004, 0.22, M(0x3a2a22), 0, 0.006, zz, sg, 5); c.rotation.z = Math.PI / 2; });
    box(0.02, 0.006, 0.16, M(COL.steel, { metalness: 0.7, roughness: 0.3 }), -0.2, 0.004, 0, sg);
    box(0.026, 0.006, 0.15, M(COL.steel, { metalness: 0.7, roughness: 0.3 }), 0.19, 0.004, 0, sg);
    box(0.11, 0.014, 0.11, M(COL.red), -0.34, 0.008, 0.0, sg);
    cyl(0.004, 0.004, 0.08, glassMat, 0.26, 0.04, -0.2, sg, 5);
    cyl(0.04, 0.022, 0.075, glassMat, 0.26, 0.115, -0.2, sg, 10);
    cyl(0.033, 0.02, 0.03, M(0x7a1030), 0.26, 0.098, -0.2, sg, 10);
  }
  function roundTable(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    cyl(0.85, 0.9, 0.74, M(COL.cream), 0, 0.37, 0, g, 24);
    cyl(0.87, 0.87, 0.04, M(COL.cream), 0, 0.76, 0, g, 24);
    cyl(0.28, 0.28, 0.02, M(COL.red), 0, 0.79, 0, g, 16);
    // nến giữa bàn và ba đĩa món
    cyl(0.05, 0.05, 0.015, M(COL.gold), 0, 0.81, 0, g, 10);
    cyl(0.03, 0.03, 0.16, M(COL.cream), 0, 0.89, 0, g, 10);
    const flame = sph(0.018, flameMat, 0, 0.99, 0, g, 6, 5); flame.castShadow = false;
    [[0x7a1f2a, 0.0], [0x3d8f3a, 2.09], [0xe8b53a, 4.18]].forEach(([c, a0], k) => {
      const px = Math.cos(a0 + 0.5) * 0.24, pz = Math.sin(a0 + 0.5) * 0.24;
      cyl(0.11, 0.1, 0.02, M(COL.white), px, 0.8, pz, g, 14);
      for (let i = 0; i < 5; i++) sph(0.035, M(c), px + (rnd() - 0.5) * 0.12, 0.835, pz + (rnd() - 0.5) * 0.12, g, 6, 5);
    });
    circ(x, z, 1.0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      chair(x + Math.cos(a) * 1.25, z + Math.sin(a) * 1.25, Math.PI / 2 - a);
      placeSetting(g, Math.cos(a) * 0.6, Math.sin(a) * 0.6, a);
      if (rnd() > 0.45) seated.push([x + Math.cos(a) * 1.2, z + Math.sin(a) * 1.2]);
    }
  }
  [[-7.8, -5.4], [-5.3, -5.4], [-7.8, -2.4], [-5.3, -2.4]].forEach(([x, z]) => roundTable(x, z));

  /* ---------- Cờ nhỏ, khăn kẻ caro, thảm ---------- */
  const flagTex = canvasTex(96, 64, (g, w, h) => drawFlagVN(g, 0, 0, w, h));
  const flagTexDZ = canvasTex(96, 64, (g, w, h) => drawFlagDZ(g, 0, 0, w, h));
  function miniFlag(x, y, z, parent, tex = flagTex, k = 1) {
    cyl(0.008 * k, 0.008 * k, 0.3 * k, M(COL.dark), x, y + 0.15 * k, z, parent, 4);
    const f = new THREE.Mesh(G('PlaneGeometry', 0.2 * k, 0.135 * k), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }));
    f.position.set(x + 0.1 * k, y + 0.25 * k, z); parent.add(f);
  }
  const checkerTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#a31621'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7c0f18';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) g.fillRect(x * 16, y * 16, 16, 16);
  }, [3, 1]);
  const checkerMat = new THREE.MeshStandardMaterial({ map: checkerTex, roughness: 0.9 });

  function bowlStack(x, y, z, parent, n = 3) {
    for (let i = 0; i < n; i++) cyl(0.11, 0.08, 0.07, kraftMat, x, y + 0.035 + i * 0.06, z, parent, 12);
  }
  function chafing(x, y, z, parent) {
    box(0.55, 0.14, 0.36, M(COL.steel, { metalness: 0.6, roughness: 0.35 }), x, y + 0.07, z, parent);
    const lid = new THREE.Mesh(G('SphereGeometry', 0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(COL.steel, { metalness: 0.7, roughness: 0.3 }));
    lid.scale.set(1.3, 0.85, 0.9); lid.position.set(x, y + 0.14, z); lid.castShadow = true; parent.add(lid);
  }

  /* ---------- Bàn đón tiếp ---------- */
  (function reception() {
    const g = new THREE.Group(); g.position.set(0, 0, 7.4); root.add(g);
    const front = canvasTex(1024, 380, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b3151f'); gr.addColorStop(1, '#8e0f18');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(227,176,75,.28)'; c.lineWidth = 2;
      for (let y = 0; y < h; y += 26) for (let x = ((y / 26) % 2) * 26; x < w; x += 52) { c.beginPath(); c.arc(x, y, 26, Math.PI, 0); c.stroke(); }
      c.strokeStyle = '#e3b04b'; c.lineWidth = 8; c.strokeRect(14, 14, w - 28, h - 28); c.lineWidth = 3; c.strokeRect(28, 28, w - 56, h - 56);
      c.fillStyle = TC.sign; c.textAlign = 'center'; c.textBaseline = 'middle';
      const fit = (t, size, maxW) => { let f = size; c.font = `bold ${f}px ${FD}`; while (c.measureText(t).width > maxW && f > 20) { f -= 4; c.font = `bold ${f}px ${FD}`; } };
      fit('BÀN ĐÓN TIẾP', 138, w * 0.82); c.fillText('BÀN ĐÓN TIẾP', w / 2, h * 0.38);
      c.fillStyle = '#e3b04b'; fit('BIENVENUE', 92, w * 0.6); c.fillText('BIENVENUE', w / 2, h * 0.73);
    });
    box(3.4, 0.95, 0.8, M(0xa5121f), 0, 0.475, 0, g);
    flatPlane(front, 3.3, 0.88, 0, 0.47, 0.405, g);
    box(3.5, 0.05, 0.9, M(COL.gold), 0, 0.975, 0, g);
    box(3.3, 0.04, 0.78, M(COL.white), 0, 1.0, 0, g);
    cyl(0.1, 0.08, 0.22, M(COL.redDeep), -1.1, 1.13, 0, g, 12);
    [0xf2a5b8, 0xf0c332, 0xd9232d, 0xf2a5b8, 0xf0c332].forEach((c, i) => sph(0.07, M(c), -1.1 + Math.cos(i * 1.3) * 0.1, 1.33 + (i % 2) * 0.05, Math.sin(i * 1.3) * 0.08, g, 8, 6));
    box(0.5, 0.04, 0.34, M(COL.white), -0.2, 1.04, 0.05, g);
    for (let i = 0; i < 4; i++) box(0.22, 0.012, 0.15, M(COL.cream), 0.3 + i * 0.26, 1.03 + (i % 2) * 0.006, 0.12, g);
    // chồng brochure trên bàn
    const brGeo = G('BoxGeometry', 0.42, 0.007, 0.3);
    for (let i = 0; i < 7; i++) { const sh = new THREE.Mesh(brGeo, M(i % 2 ? 0xf4efe3 : 0xffffff)); sh.position.set(-0.78 + i * 0.001, 1.03 + i * 0.007, 0.14); sh.rotation.y = (i - 3) * 0.03; sh.castShadow = true; g.add(sh); }
    const brTopMat = new THREE.MeshStandardMaterial({ color: 0xf4efe3, roughness: 0.6 });
    const brTop = new THREE.Mesh(G('PlaneGeometry', 0.42, 0.3), brTopMat); brTop.rotation.x = -Math.PI / 2; brTop.rotation.z = -0.09; brTop.position.set(-0.78, 1.086, 0.14); g.add(brTop);
    if (cfg.brochure && cfg.brochure.front) env.loadTexture(cfg.brochure.front, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; brTopMat.map = t; brTopMat.color.set(0xffffff); brTopMat.needsUpdate = true; });
    // hai lá cờ ở góc phải bàn, cờ Việt Nam bên trái cờ Algeria
    miniFlag(1.12, 1.02, 0.18, g, flagTex, 1.5);
    miniFlag(1.5, 1.02, 0.18, g, flagTexDZ, 1.5);
    // panel phía sau
    box(3.6, 2.6, 0.08, M(COL.redDeep), 0, 1.3, -1.0, g);
    signPlane('CHÀO MỪNG QUÝ KHÁCH', 3.0, 0.5, '#7a0f18', '#f3dca3', 0, 1.9, -0.95, g, 0, false);
    // hai cây hai bên, câu đối treo trên cây
    [-2.2, 2.2].forEach((x, i) => {
      blossomTree(x, 0.2, i ? COL.mai : COL.pink, g, 0.95, false, 74);
      signPlane((cfg.scene.lixiTitle || 'Hái lộc đầu xuân').toUpperCase(), 1.25, 0.26, '#7a0f18', '#f3dca3', x, 1.12, 0.62, g, 0, false);
    });
    couplet('left', -2.85, 1.45, 0.75, g, 0, 0.72); couplet('right', 2.85, 1.45, 0.75, g, 0, 0.72);
    lantern(-1.1, 2.3, -0.7, 1.1, g); lantern(1.1, 2.3, -0.7, 1.1, g);
    point(0, 2.6, 1.2, 0xffe2b8, 16, 3, 7);
    rect(-1.95, 1.95, 6.95, 7.9);
    circ(-2.2, 7.6, 0.45); circ(2.2, 7.6, 0.45);
  })();

  /* ---------- Gian cà phê, trà ---------- */
  function drawCup(g, cx, cy, s, coffee) {
    g.fillStyle = '#f7f1e6';
    g.beginPath(); g.moveTo(cx - s * 0.5, cy - s * 0.2); g.lineTo(cx + s * 0.5, cy - s * 0.2); g.lineTo(cx + s * 0.34, cy + s * 0.32); g.lineTo(cx - s * 0.34, cy + s * 0.32); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(cx, cy + s * 0.36, s * 0.7, s * 0.1, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = coffee ? '#4a2616' : '#9fc46a';
    g.beginPath(); g.ellipse(cx, cy - s * 0.2, s * 0.5, s * 0.08, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(243,220,163,.8)'; g.lineWidth = 5; g.lineCap = 'round';
    [-0.2, 0.05, 0.3].forEach(o => { g.beginPath(); g.moveTo(cx + s * o, cy - s * 0.35); g.bezierCurveTo(cx + s * (o + 0.15), cy - s * 0.55, cx + s * (o - 0.15), cy - s * 0.7, cx + s * o, cy - s * 0.9); g.stroke(); });
  }
  function bannerTex(kind) {
    const coffee = kind === 'coffee';
    return canvasTex(1024, 392, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      if (coffee) { gr.addColorStop(0, '#2a140c'); gr.addColorStop(1, '#5a2e19'); } else { gr.addColorStop(0, '#173d24'); gr.addColorStop(1, '#2f6b3f'); }
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.22; g.fillStyle = coffee ? '#e3b04b' : '#d9f0c0';
      for (let i = 0; i < 30; i++) {
        const x = rnd() * w, y = rnd() * h, r = 10 + rnd() * 14, a = rnd() * Math.PI;
        g.save(); g.translate(x, y); g.rotate(a); g.beginPath();
        if (coffee) g.ellipse(0, 0, r, r * 0.65, 0, 0, Math.PI * 2);
        else { g.moveTo(-r * 1.3, 0); g.quadraticCurveTo(0, -r, r * 1.3, 0); g.quadraticCurveTo(0, r, -r * 1.3, 0); }
        g.fill(); g.restore();
      }
      g.globalAlpha = 1;
      g.strokeStyle = '#e3b04b'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const title = coffee ? 'CÀ PHÊ VIỆT NAM' : 'TRÀ VIỆT NAM';
      let fs = h * 0.3; g.font = `bold ${fs}px ${FD}`;
      while (g.measureText(title).width > w * 0.7 && fs > 20) { fs -= 4; g.font = `bold ${fs}px ${FD}`; }
      g.fillStyle = TC.bannerTitle; g.fillText(title, w * 0.4, h * 0.42);
      g.font = `${h * 0.095}px ${FB}`; g.fillStyle = TC.bannerSub;
      g.fillText(coffee ? 'Phin · Robusta · Arabica' : 'Trà xanh · Trà sen · Trà hoa nhài', w * 0.4, h * 0.74);
      drawCup(g, w * 0.87, h * 0.55, h * 0.2, coffee);
    });
  }
  const stripeTex = canvasTex(128, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f3f1ec' : '#a8141f'; g.fillRect(i * 16, 0, 16, h); } });

  function bagBox(x, y, z, parent, label) {
    box(0.17, 0.27, 0.08, kraftMat, x, y + 0.135, z, parent);
    box(0.12, 0.1, 0.005, M(label), x, y + 0.12, z + 0.043, parent);
  }
  function teaTin(x, y, z, parent, color) {
    cyl(0.085, 0.085, 0.24, M(color, { roughness: 0.5 }), x, y + 0.12, z, parent, 14);
    cyl(0.09, 0.09, 0.02, M(COL.gold), x, y + 0.25, z, parent, 14);
  }
  function teaCup(x, y, z, parent, fill) {
    cyl(0.045, 0.032, 0.05, M(COL.white), x, y + 0.025, z, parent, 10);
    if (fill) cyl(0.038, 0.038, 0.004, M(fill), x, y + 0.052, z, parent, 10);
  }
  function teapot(x, y, z, parent) {
    sph(0.12, M(0xdde6ee), x, y + 0.12, z, parent, 12, 8);
    cyl(0.04, 0.04, 0.04, M(0xdde6ee), x, y + 0.26, z, parent, 8);
    const sp = cyl(0.015, 0.025, 0.14, M(0xdde6ee), x + 0.15, y + 0.17, z, parent, 6); sp.rotation.z = -0.9;
  }

  function booth(kind, x, z, label, labelFr) {
    const coffee = kind === 'coffee';
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 2; root.add(g);
    const W = 3.8;
    box(W, 0.95, 0.95, M(0xfbfaf6), 0, 0.475, 0.05, g);
    box(W + 0.12, 0.05, 1.05, M(0xf0e8d8), 0, 0.97, 0.05, g);
    box(W - 0.2, 0.5, 0.01, M(COL.red), 0, 0.5, 0.535, g);
    box(W + 0.2, 3.2, 0.1, M(coffee ? 0xe9dcc0 : 0xe3ecd4), 0, 1.6, -0.95, g);
    flatPlane(bannerTex(kind), 3.4, 1.3, 0, 2.5, -0.89, g);
    [-W / 2, W / 2].forEach(px => cyl(0.06, 0.06, 3.3, M(COL.wood), px, 1.65, 0.9, g, 8));
    const aw = new THREE.Mesh(G('BoxGeometry', W + 0.5, 0.09, 2.1), new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.9 }));
    aw.position.set(0, 3.3, -0.05); aw.castShadow = true; g.add(aw);
    signPlane2(label, labelFr, 2.7, 0.7, coffee ? '#3b2418' : '#1f4a2c', '#f3dca3', 0, 3.72, 0.95, g, 0);
    couplet('left', -2.2, 2.35, 0.93, g, 0, 0.95); couplet('right', 2.2, 2.35, 0.93, g, 0, 0.95);
    [-1.82, 1.82].forEach(px => { for (let i = 0; i < 6; i++) sph(0.13 - i * 0.01, M(COL.pink), px, 3.15 - i * 0.17, 0.85, g, 8, 6); });
    [-0.9, 0.9].forEach(px => lantern(px, 3.1, 0.85, 0.8, g));
    box(2.4, 0.04, 0.34, M(COL.wood), 0, 1.2, -0.78, g); box(2.4, 0.04, 0.34, M(COL.wood), 0, 1.6, -0.78, g);
    // hiên: dải đèn và đèn chiếu sáng dưới mái
    for (let i = 0; i < 15; i++) sph(0.035, fairyMat, -W / 2 - 0.1 + (i * (W + 0.2)) / 14, 3.22, 1.02, g, 6, 4);
    [-1.2, 0, 1.2].forEach(px => { cyl(0.05, 0.08, 0.14, M(COL.dark), px, 3.2, 0.7, g, 10); sph(0.045, M(0xfff2d0, { emissive: 0xfff2d0, emissiveIntensity: 1.6 }), px, 3.12, 0.7, g, 8, 6); });
    g.updateMatrixWorld(true);
    const wp = g.localToWorld(new THREE.Vector3(0, 2.8, 0.9));
    point(wp.x, wp.y, wp.z, 0xffe6bf, 30, 5, 8);

    if (coffee) {
      const labels = [0xd13b3b, 0x4f8a3a, 0x3a6fc4, 0xe0577a];
      for (let i = 0; i < 9; i++) { bagBox(-1.1 + i * 0.275, 1.22, -0.78, g, labels[i % 4]); bagBox(-1.1 + i * 0.275, 1.62, -0.78, g, labels[(i + 1) % 4]); }
      for (let i = 0; i < 5; i++) {
        const cx = -1.6 + i * 0.36;
        cyl(0.07, 0.055, 0.09, M(COL.white), cx, 1.04, 0.2, g, 10);
        cyl(0.055, 0.055, 0.05, M(COL.steel, { metalness: 0.6, roughness: 0.4 }), cx, 1.12, 0.2, g, 10);
        cyl(0.04, 0.055, 0.03, M(COL.steel, { metalness: 0.6, roughness: 0.4 }), cx, 1.16, 0.2, g, 10);
      }
      for (let i = 0; i < 18; i++) {
        const cx = -0.45 + (i % 6) * 0.19, cz = 0.34 - Math.floor(i / 6) * 0.19 - 0.1;
        cyl(0.045, 0.034, 0.055, M(COL.white), cx, 1.03, cz, g, 10);
        cyl(0.038, 0.038, 0.004, M(0x3b1f10), cx, 1.058, cz, g, 10);
      }
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) bagBox(1.0 + i * 0.2 + r * 0.1, 0.97 + r * 0.27, 0.18, g, labels[(i + r) % 4]);
      cyl(0.2, 0.24, 0.45, M(0xb99a68), -1.7, 1.22, -0.45, g, 12);
    } else {
      const tins = [0xe6c229, 0xb3262b, 0x6c9a2f, 0xe6c229, 0xb3262b, 0x6c9a2f, 0xe6c229, 0xb3262b];
      for (let i = 0; i < 8; i++) { teaTin(-1.1 + i * 0.31, 1.22, -0.78, g, tins[i]); teaTin(-1.0 + i * 0.31, 1.62, -0.78, g, tins[(i + 2) % 8]); }
      box(1.5, 0.03, 0.55, M(COL.wood), -0.7, 0.995, 0.2, g);
      teapot(-1.15, 1.01, 0.2, g); teapot(-0.7, 1.01, 0.2, g); teapot(-0.25, 1.01, 0.2, g);
      for (let i = 0; i < 18; i++) teaCup(-1.4 + (i % 6) * 0.22, 1.01, 0.4 - Math.floor(i / 6) * 0.17, g, 0xc98b2a);
      for (let i = 0; i < 4; i++) { box(0.22, 0.13, 0.1, M(i % 2 ? 0xe6c229 : 0x2f6b3f), 0.9 + i * 0.25, 1.04, 0.2, g); }
      for (let i = 0; i < 3; i++) teaTin(1.0 + i * 0.3, 0.97, 0.0, g, tins[i]);
      cyl(0.28, 0.2, 0.14, M(0xc9a46b), 1.55, 1.05, 0.3, g, 14); cyl(0.26, 0.26, 0.02, M(0x6f8f3b), 1.55, 1.12, 0.3, g, 14);
    }
    [-0.8, 0.8].forEach((px, i) => {
      const st = mesh(G('CapsuleGeometry', 0.2, 0.85, 4, 8), M(i ? COL.red : COL.dark), px, 0.625, -0.45, g);
      st.castShadow = true;
      sph(0.15, M(0xe2b48c), px, 1.37, -0.45, g, 10, 8);
    });
    rect(x - 1.0, x + 0.95, z - W / 2, z + W / 2);
  }
  const BO = cfg.scene.booths || {};
  booth('coffee', -10.4, 0.2, (BO.coffee || {}).vi || 'Gian cà phê', (BO.coffee || {}).fr || 'Stand de café');
  booth('tea', -10.4, 6.4, (BO.tea || {}).vi || 'Gian trà', (BO.tea || {}).fr || 'Stand de thé');
  [[-10.4, -2.4, COL.pink], [-10.4, 3.3, COL.mai], [-10.4, 9.0, COL.pink]].forEach(([x, z, c]) => blossomTree(x, z, c, root, 1.1));

  /* ---------- Khu gói bánh chưng ---------- */
  const matTex = canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#e8d9b0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b3151f'; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26); g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
    g.strokeStyle = '#e8d9b0'; g.lineWidth = 3; g.strokeRect(38, 38, w - 76, h - 76);
    g.strokeStyle = '#b3151f'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, h / 2, 36, 0, 7); g.stroke();
    g.fillStyle = '#b3151f'; g.fillRect(w / 2 - 12, h / 2 - 12, 24, 24);
    [[70, 70], [w - 70, 70], [70, h - 70], [w - 70, h - 70]].forEach(([x, y]) => g.fillRect(x - 10, y - 10, 20, 20));
  });
  function sitter(x, y, z, parent, color, skin) {
    const b = mesh(G('CapsuleGeometry', 0.2, 0.85, 4, 8), M(color), x, y + 0.3, z, parent);
    b.scale.set(1.15, 0.45, 1.15);
    sph(0.15, M(skin), x, y + 0.72, z, parent, 10, 8);
  }
  (function banhChung() {
    const g = new THREE.Group(); g.position.set(8.2, 0, 4.9); root.add(g);
    [-1.45, 1.45].forEach(tx => {
      box(2.7, 0.78, 0.8, M(COL.white), tx, 0.39, -1.7, g);
      box(2.8, 0.04, 0.9, M(COL.cream), tx, 0.8, -1.7, g);
      for (let i = 0; i < 3; i++) box(0.5, 0.06, 0.34, M(COL.leaf), tx - 0.9 + i * 0.55, 0.85, -1.82, g);
      for (let i = 0; i < 4; i++) { const bc = box(0.26, 0.15, 0.26, M(0x3d7d48), tx + 0.3 + (i % 2) * 0.35, 0.9, -1.82 + Math.floor(i / 2) * 0.28, g); bc.rotation.y = rnd() * 0.5; }
      box(0.34, 0.06, 0.34, M(COL.wood), tx - 0.1, 0.86, -1.5, g);
      for (let s = 0; s < 3; s++) cyl(0.17, 0.17, 0.46, M(COL.wood), tx - 0.9 + s * 0.9, 0.23, -0.95, g, 12);
    });
    rect(5.5, 10.9, 2.7, 3.6);
    // ba tấm chiếu cói ngồi gói bánh
    [-2.3, -0.3, 1.7].forEach((mx, mi) => {
      const m = new THREE.Mesh(G('PlaneGeometry', 1.85, 1.4), new THREE.MeshStandardMaterial({ map: matTex, roughness: 1 }));
      m.rotation.x = -Math.PI / 2; m.position.set(mx, 0.025, 1.35); m.receiveShadow = true; g.add(m);
      box(0.8, 0.06, 0.55, M(COL.wood), mx, 0.06, 1.35, g);
      for (let i = 0; i < 2; i++) box(0.5, 0.03, 0.32, M(COL.leaf), mx - 0.1, 0.1 + i * 0.03, 1.3, g);
      for (let i = 0; i < 3; i++) box(0.2, 0.12, 0.2, M(0x3d7d48), mx + 0.18 + (i % 2) * 0.18, 0.16, 1.28 + Math.floor(i / 2) * 0.2, g);
      const cols = [0x7a1f2a, 0x2d3a2f, 0xe0a3b5, 0x3b4a7a, 0xd8d1c4, 0xa8141f];
      const skins = [0xf0c8a0, 0xd9a679, 0xb9855a];
      sitter(mx - 0.6, 0.02, 1.0, g, cols[(mi * 2) % 6], skins[mi % 3]);
      sitter(mx + 0.6, 0.02, 1.0, g, cols[(mi * 2 + 1) % 6], skins[(mi + 1) % 3]);
      sitter(mx, 0.02, 1.95, g, cols[(mi + 3) % 6], skins[(mi + 2) % 3]);
    });
    // nồi bánh đặt ở góc ngoài, dễ thấy
    const px = 3.2, pz = -0.2;
    box(0.9, 0.3, 0.9, M(0x3a2a22), px, 0.15, pz, g);
    const fire = new THREE.Mesh(G('CircleGeometry', 0.3, 16), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
    fire.rotation.x = -Math.PI / 2; fire.position.set(px, 0.31, pz + 0.38); g.add(fire);
    cyl(0.55, 0.55, 0.8, M(0x1d1d22), px, 0.7, pz, g, 20);
    cyl(0.58, 0.58, 0.06, M(0x2c2c33), px, 1.12, pz, g, 20);
    [-0.45, 0.45].forEach(o => sph(0.06, M(COL.dark), px + o, 1.0, pz, g, 8, 6));
    for (let i = 0; i < 4; i++) {
      const p = sph(0.26, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }), px, 1.3, pz, g, 10, 8);
      p.castShadow = false;
      steamPuffs.push({ m: p, o: i / 4, y0: 1.3, h: 1.8 });
    }
    for (let i = 0; i < 3; i++) cyl(0.12, 0.12, 0.3, M(COL.wood), px - 1.0 + (i % 2) * 0.3, 0.15, pz + 0.9 + i * 0.1, g, 8); // củi
    circ(11.4, 4.7, 0.8);
    blossomTree(-3.2, -2.3, COL.mai, g, 1.15, false);
    cyl(0.04, 0.04, 2.5, M(COL.wood), -1.7, 1.25, -2.5, g, 6); cyl(0.04, 0.04, 2.5, M(COL.wood), 0.9, 1.25, -2.5, g, 6);
  })();

  /* ---------- Khu buffet món Việt dưới mái che ---------- */
  function dish(kind, parent, y) {
    const white = M(COL.white);
    if (kind === 'pho') {
      for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) {
        const x = -0.8 + i * 0.5, z = 0.02 + r * 0.3;
        cyl(0.16, 0.09, 0.1, white, x, y + 0.05, z, parent, 16);
        cyl(0.145, 0.145, 0.004, M(0xa66f2f), x, y + 0.102, z, parent, 16);
        cyl(0.1, 0.1, 0.012, M(0xf1e6c8), x, y + 0.106, z, parent, 14);
        box(0.08, 0.012, 0.05, M(0xb55c52), x - 0.03, y + 0.115, z - 0.01, parent);
        sph(0.025, M(0x3d8f3a), x + 0.05, y + 0.12, z + 0.03, parent, 6, 4);
      }
      chafing(-0.55, y, -0.32, parent); chafing(0.55, y, -0.32, parent);
    } else if (kind === 'banhmi') {
      [-0.2, 0.22].forEach((tz, t) => {
        box(1.7, 0.03, 0.4, M(COL.wood), 0, y + 0.015, tz, parent);
        for (let i = 0; i < 7; i++) {
          const b = mesh(G('CapsuleGeometry', 0.055, 0.22, 4, 8), M(0xd9a85b), -0.65 + i * 0.2, y + 0.09, tz + (i % 2) * 0.05, parent);
          b.rotation.z = Math.PI / 2; b.rotation.y = 0.4 + t * 0.2;
        }
      });
    } else if (kind === 'sup') {
      for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) {
        const x = -0.85 + i * 0.42, z = 0.02 + r * 0.3;
        cyl(0.14, 0.08, 0.1, white, x, y + 0.05, z, parent, 16);
        cyl(0.125, 0.125, 0.004, M(0xe8b53a), x, y + 0.102, z, parent, 16);
        sph(0.02, M(0x3d8f3a), x, y + 0.11, z, parent, 6, 4);
      }
      chafing(-0.55, y, -0.32, parent); chafing(0.55, y, -0.32, parent);
    } else if (kind === 'che') {
      const fills = [0x7fc97f, 0x9a6bb7, 0xf0a050, 0x7fc97f, 0xd9a05b, 0x9a6bb7];
      for (let i = 0; i < 24; i++) {
        const x = -0.85 + (i % 6) * 0.32, z = -0.3 + Math.floor(i / 6) * 0.2;
        cyl(0.065, 0.045, 0.1, glassMat, x, y + 0.05, z, parent, 12);
        cyl(0.055, 0.04, 0.07, M(fills[i % 6]), x, y + 0.04, z, parent, 12);
      }
    } else if (kind === 'banhchung') {
      [[-0.55, -0.2], [0.55, -0.2], [-0.55, 0.22], [0.55, 0.22]].forEach(([cx, cz], q) => {
        for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) {
          const bc = box(0.25, 0.14, 0.25, M(0x3d7d48), cx - 0.26 + i * 0.28 + r * 0.14, y + 0.07 + r * 0.15, cz, parent); bc.rotation.y = (i + r + q) * 0.1;
          box(0.255, 0.02, 0.03, M(0x1f4a2b), cx - 0.26 + i * 0.28 + r * 0.14, y + 0.142 + r * 0.15, cz, parent);
        }
      });
    } else if (kind === 'nem') {
      // nem rán xếp hai hàng chéo trên đĩa sứ trắng vuông, kèm rau thơm, hoa cà chua và chén nước chấm
      const plate = M(0xfbfbf8), rollA = M(0xc98a38), rollB = M(0xdca957), tipM = M(0x8a5a22), herb = M(0x4f9a43), herb2 = M(0x6bb55a), tom = M(0xd8281f), dipM = M(0xe8541f);
      [-0.22, 0.2].forEach((tz, r) => [-0.8, 0, 0.8].forEach((tx, c) => {
        const k = r * 3 + c;
        box(0.7, 0.025, 0.4, plate, tx, y + 0.0125, tz, parent);
        for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
          const n = mesh(G('CylinderGeometry', 0.032, 0.032, 0.21, 8), (i + row + k) % 2 ? rollA : rollB, tx - 0.2 + i * 0.125 + row * 0.04, y + 0.045, tz - 0.07 + row * 0.13, parent);
          n.rotation.z = Math.PI / 2; n.rotation.y = 0.62 + (i % 2) * 0.05;
          [-1, 1].forEach(sd => mesh(G('CylinderGeometry', 0.026, 0.026, 0.006, 8), tipM, 0, 0.1055 * sd, 0, n, false));
        }
        // rau thơm và hoa cà chua
        [[0.27, 0.1], [0.3, 0.02], [0.24, -0.02], [0.3, 0.13]].forEach(([dx, dz], q) => { const h = sph(0.035, q % 2 ? herb : herb2, tx + dx, y + 0.04, tz + dz, parent, 6, 4); h.scale.y = 0.55; });
        sph(0.035, tom, tx + 0.26, y + 0.045, tz - 0.14, parent, 8, 6);
        // chén nước chấm ở góc sau mỗi đĩa
        if (k % 2 === 0) { cyl(0.05, 0.034, 0.05, white, tx - 0.27, y + 0.05, tz + 0.15, parent, 12); cyl(0.04, 0.04, 0.004, dipM, tx - 0.27, y + 0.077, tz + 0.15, parent, 12); }
      }));
    } else {
      [0xf0a050, 0xe0577a, 0x7fc97f, 0xf0a050, 0xe0577a, 0x7fc97f].forEach((c, i) => {
        const jx = -0.85 + (i % 3) * 0.3, jz = -0.3 + Math.floor(i / 3) * 0.2;
        cyl(0.1, 0.1, 0.3, glassMat, jx, y + 0.15, jz, parent, 14);
        cyl(0.085, 0.085, 0.22, M(c), jx, y + 0.12, jz, parent, 14);
      });
      for (let i = 0; i < 28; i++) cyl(0.04, 0.03, 0.08, cupMat, 0.1 + (i % 7) * 0.13, y + 0.04, -0.3 + Math.floor(i / 7) * 0.2, parent, 8);
    }
  }

  (function pavilion() {
    const g = new THREE.Group(); root.add(g);
    const x0 = 5.7, x1 = 11.8, z0 = -8.2, z1 = -0.3;
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf6f3ee, transparent: true, opacity: 0.38, roughness: 0.9, depthWrite: false });
    const roof = new THREE.Mesh(G('BoxGeometry', x1 - x0 + 0.5, 0.08, z1 - z0 + 0.5), roofMat);
    roof.position.set((x0 + x1) / 2, 3.4, (z0 + z1) / 2); g.add(roof);
    [z0, (z0 + z1) / 2, z1].forEach(rz => box(x1 - x0 + 0.5, 0.1, 0.1, M(COL.white), (x0 + x1) / 2, 3.4, rz, g));
    [x0, (x0 + x1) / 2, x1].forEach(rx => box(0.1, 0.1, z1 - z0 + 0.5, M(COL.white), rx, 3.4, (z0 + z1) / 2, g));
    const fascia = new THREE.Mesh(G('BoxGeometry', x1 - x0 + 0.6, 0.35, 0.1), new THREE.MeshStandardMaterial({ map: stripeTex }));
    fascia.position.set((x0 + x1) / 2, 3.15, z1 + 0.25); g.add(fascia);
    [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) / 2, z1], [(x0 + x1) / 2, z0]].forEach(([x, z]) => { cyl(0.07, 0.07, 3.35, M(COL.white), x, 1.675, z, g, 8); circ(x, z, 0.12); });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) lantern(x0 + 0.9 + i * 1.5, 3.0, z0 + 0.9 + j * 2.2, 1.0);
    [[x0, z0 + 0.3], [x1, z0 + 0.3]].forEach(([x, z]) => { for (let i = 0; i < 6; i++) sph(0.13 - i * 0.01, M(COL.pink), x, 3.2 - i * 0.18, z, g, 8, 6); });
    // hai câu đối treo ra phía trước hai cột trước
    couplet('left', x0, 1.85, z1 + 0.25, g, 0, 0.95); couplet('right', x1, 1.85, z1 + 0.25, g, 0, 0.95);
    // đèn công suất lớn ở bốn góc mái
    [[x0 + 0.2, z0 + 0.3], [x1 - 0.2, z0 + 0.3], [x0 + 0.2, z1 - 0.3], [x1 - 0.2, z1 - 0.3]].forEach(([x, z]) => {
      box(0.6, 0.1, 0.6, M(COL.dark), x, 3.28, z, g);
      const pnl = new THREE.Mesh(G('PlaneGeometry', 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xcdbb94, toneMapped: true }));
      pnl.rotation.x = Math.PI / 2; pnl.position.set(x, 3.225, z); g.add(pnl);
      point(x, 3.0, z, 0xffe9c8, 26, 6, 10);
    });

    const cols = [7.0, 10.5], rows = [-6.8, -4.2, -1.6];
    let fi = 0;
    rows.forEach(rz => cols.forEach(cx => {
      const food = cfg.scene.foods[fi] || { kind: 'nem' };
      const t = new THREE.Group(); t.position.set(cx, 0, rz); g.add(t);
      box(2.4, 0.9, 0.9, checkerMat, 0, 0.45, 0, t);
      box(2.5, 0.04, 1.0, M(COL.white), 0, 0.92, 0, t);
      dish(food.kind, t, 0.94);
      rect(cx - 1.25, cx + 1.25, rz - 0.55, rz + 0.55);
      foodTables.push({ i: fi, x: cx, z: rz });
      fi++;
    }));
  })();

  /* ---------- Cổng chào đứng trước tường, bảng hiệu ngoài tường ---------- */
  const GZ = 13.4;
  const emblemState = { img: null, plates: [] };
  function drawPlate(g, w, h, kind) {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#d2c47e'); gr.addColorStop(1, '#bba95c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c8161d'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#c8161d';
    for (let x = 22; x < w - 22; x += 14) { g.fillRect(x, 18, 8, 4); g.fillRect(x, h - 22, 8, 4); }
    for (let y = 22; y < h - 22; y += 14) { g.fillRect(18, y, 4, 8); g.fillRect(w - 22, y, 4, 8); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c8161d';
    const E = cfg.scene.embassy;
    if (kind === 'top') {
      const es = h * 0.3;
      if (emblemState.img) g.drawImage(emblemState.img, w / 2 - es / 2 * 0.96, 30, es * 0.96, es);
      else {
        g.beginPath(); g.arc(w / 2, 30 + es / 2, es / 2, 0, 7); g.fill();
        g.fillStyle = '#ffde00'; g.beginPath();
        for (let i = 0; i < 10; i++) { const r = (i % 2 ? 0.1 : 0.25) * es, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(w / 2 + Math.cos(a) * r, 30 + es / 2 + Math.sin(a) * r); }
        g.fill(); g.fillStyle = '#c8161d';
      }
      let y = 30 + es + h * 0.1;
      let s2 = h * 0.12; g.font = `bold ${s2}px ${FB}`;
      while (g.measureText(E.nameVi).width > w - 70 && s2 > 14) { s2 -= 2; g.font = `bold ${s2}px ${FB}`; }
      g.fillText(E.nameVi, w / 2, y);
      y += h * 0.1;
      let fs = h * 0.07; g.font = `bold ${fs}px ${FB}`;
      let lines = wrap(g, E.nameFr, w - 80);
      while (lines.length > 2 && fs > 10) { fs -= 2; g.font = `bold ${fs}px ${FB}`; lines = wrap(g, E.nameFr, w - 80); }
      lines.forEach((l, i) => g.fillText(l, w / 2, y + i * fs * 1.25));
    } else {
      g.font = `bold ${h * 0.2}px ${FB}`; g.fillText('ĐỊA CHỈ / ADRESSE', w / 2, h * 0.28);
      let fs = h * 0.26; g.font = `bold ${fs}px ${FB}`;
      while (g.measureText(E.address).width > w - 70 && fs > 12) { fs -= 2; g.font = `bold ${fs}px ${FB}`; }
      g.fillText(E.address, w / 2, h * 0.64);
    }
  }
  function embassySign(x, z, rotY) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; root.add(g);
    [-1.45, 1.45].forEach(px => cyl(0.05, 0.05, 3.0, M(0xb08d2e, { metalness: 0.5, roughness: 0.4 }), px, 1.5, 0, g, 10));
    [[3.0, 1.7, 2.1, 'top'], [3.0, 0.7, 0.85, 'addr']].forEach(([w, h, y, kind]) => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
      const ctx = c.getContext('2d'); drawPlate(ctx, c.width, c.height, kind);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      emblemState.plates.push({ c, t, kind });
      [0, Math.PI].forEach(r => flatPlane(t, w, h, 0, y, r ? -0.04 : 0.04, g, r, false));
      box(w + 0.06, h + 0.06, 0.06, M(0x6f5a1a), 0, y, 0, g);
    });
    rect(x - 1.6, x + 1.6, z - 0.2, z + 0.2);
    // đèn rọi bảng hiệu
    [-1.0, 1.0].forEach(o => { cyl(0.04, 0.05, 0.12, M(COL.dark), x + o, 3.05, z + 0.45, root, 8); });
    point(x, 2.6, z + 1.2, 0xfff0d8, 14, 3, 6);
  }
  embassySign(8.4, 13.2, 0);
  if (cfg.scene.emblemImage) env.loadImage(cfg.scene.emblemImage, img => {
    emblemState.img = img;
    emblemState.plates.forEach(pl => { drawPlate(pl.c.getContext('2d'), pl.c.width, pl.c.height, pl.kind); pl.t.needsUpdate = true; });
  });

  const archTile = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#b3151f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e3b04b'; g.lineWidth = 2.5;
    [44, 33, 22, 11].forEach(r => { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke(); });
    [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => { [40, 28, 16].forEach(r => { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }); });
    g.fillStyle = '#e3b04b'; g.beginPath(); g.arc(w / 2, h / 2, 4, 0, 7); g.fill();
  }, [1 / 0.8, 1 / 0.8]);

  function paperFlower(x, y, z, sc, c1, c2, parent, rotY = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; g.scale.setScalar(sc); parent.add(g);
    [[0.5, c1, 0], [0.4, c2, 0.012], [0.28, c1, 0.024], [0.14, COL.gold, 0.036]].forEach(([r, c, zz]) => {
      const d = new THREE.Mesh(G('CircleGeometry', r, 14), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide }));
      d.position.z = zz; g.add(d);
    });
  }
  function fan(x, y, z, r, c, parent, rotZ = 0) {
    const d = new THREE.Mesh(G('CircleGeometry', r, 20, 0, Math.PI), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide }));
    d.position.set(x, y, z); d.rotation.z = rotZ; parent.add(d);
    const e = new THREE.Mesh(G('RingGeometry', r * 0.92, r, 20, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: COL.gold, side: THREE.DoubleSide }));
    e.position.set(x, y, z + 0.004); e.rotation.z = rotZ; parent.add(e);
  }
  function coin(x, y, z, parent) {
    const c = cyl(0.2, 0.2, 0.03, M(COL.gold, { metalness: 0.5, roughness: 0.4 }), x, y, z, parent, 20); c.rotation.x = Math.PI / 2;
    box(0.09, 0.09, 0.035, M(0x7a5a10), x, y, z, parent);
  }

  // Dải chữ uốn theo vòm cổng
  function curvedBandTex(text) {
    return canvasTex(2048, 2048, (g, w, h) => {
      const cx = w / 2, cy = h / 2, R = w / 2, rIn = R * (2.62 / 3.78), rOut = R - 8;
      g.beginPath(); g.arc(cx, cy, rOut, Math.PI, 0); g.arc(cx, cy, rIn, 0, Math.PI, true); g.closePath();
      const gr = g.createLinearGradient(0, cy - rOut, 0, cy); gr.addColorStop(0, '#c4202a'); gr.addColorStop(1, '#8f1119');
      g.fillStyle = gr; g.fill();
      g.strokeStyle = '#e3b04b'; g.lineWidth = 12; g.stroke();
      [rOut - 24, rIn + 24].forEach(r => { g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.lineWidth = 5; g.strokeStyle = 'rgba(243,220,163,.85)'; g.stroke(); });
      const rt = (rIn + rOut) / 2;
      let fs = (rOut - rIn) * 0.62;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const chars = [...text];
      let total = 0;
      for (;;) {
        g.font = `bold ${fs}px ${FD}`;
        total = chars.reduce((a, ch) => a + g.measureText(ch).width + fs * 0.07, 0) / rt;
        if (total < 2.3 || fs < 60) break;
        fs -= 6;
      }
      let ang = Math.PI / 2 + total / 2;
      g.fillStyle = '#ffe08a'; g.strokeStyle = 'rgba(60,5,10,.95)'; g.lineWidth = fs * 0.08; g.lineJoin = 'round';
      chars.forEach(ch => {
        const wd = g.measureText(ch).width + fs * 0.07;
        const a = ang - wd / rt / 2;
        g.save(); g.translate(cx + rt * Math.cos(a), cy - rt * Math.sin(a)); g.rotate(Math.PI / 2 - a);
        g.strokeText(ch, 0, 0); g.fillText(ch, 0, 0); g.restore();
        ang -= wd / rt;
      });
    });
  }

  (function gate() {
    const g = new THREE.Group(); g.position.set(0, 0, GZ); root.add(g);
    const sh = new THREE.Shape();
    sh.moveTo(-2.6, 0); sh.lineTo(-2.6, 1.7); sh.absarc(0, 1.7, 2.6, Math.PI, 0, true); sh.lineTo(2.6, 0); sh.lineTo(1.9, 0); sh.lineTo(1.9, 1.7);
    sh.absarc(0, 1.7, 1.9, 0, Math.PI, false); sh.lineTo(-1.9, 0); sh.closePath();
    const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 40 });
    const archMat = new THREE.MeshStandardMaterial({ map: archTile, emissive: 0xffffff, emissiveMap: archTile, emissiveIntensity: 0.4, roughness: 0.8 });
    const arch = new THREE.Mesh(eg, [archMat, M(COL.redDeep)]);
    arch.position.z = -0.15; arch.castShadow = true; g.add(arch);
    [1.9, 2.6].forEach(r => { const t = new THREE.Mesh(G('TorusGeometry', r, 0.04, 6, 64, Math.PI), M(COL.gold, { metalness: 0.4 })); t.position.set(0, 1.7, 0.16); g.add(t); const t2 = t.clone(); t2.position.z = -0.16; g.add(t2); });

    // dải chữ uốn theo vòm, sáng cả ban đêm
    const bandTex = curvedBandTex(cfg.scene.gateText || 'XUÂN QUÊ HƯƠNG ĐINH MÙI 2027');
    const bandMat = new THREE.MeshBasicMaterial({ map: bandTex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, toneMapped: false });
    const bandGeo = new THREE.RingGeometry(2.62, 3.78, 120, 1, 0, Math.PI);
    const bandF = new THREE.Mesh(bandGeo, bandMat); bandF.position.set(0, 1.7, 0.19); g.add(bandF);
    const bandB = new THREE.Mesh(bandGeo, bandMat); bandB.position.set(0, 1.7, -0.19); bandB.rotation.y = Math.PI; g.add(bandB);

    // hoa giấy, quạt, đồng tiền, lồng đèn quanh dải chữ và hai chân cổng
    const ring = (deg, r) => [Math.cos(deg * Math.PI / 180) * r, 1.7 + Math.sin(deg * Math.PI / 180) * r];
    [[8, 4.2], [30, 4.2], [55, 4.1], [125, 4.1], [150, 4.2], [172, 4.2]].forEach(([d, r], i) => {
      const [x, y] = ring(d, r);
      paperFlower(x, y, 0.24, 0.62 + (i % 3) * 0.08, i % 2 ? 0xd9232d : 0xc41a24, i % 2 ? 0xf0a0a8 : 0xe3b04b, g);
      paperFlower(x, y, -0.24, 0.62 + (i % 3) * 0.08, i % 2 ? 0xd9232d : 0xc41a24, i % 2 ? 0xf0a0a8 : 0xe3b04b, g, Math.PI);
    });
    [[-3.0, 0.5], [-3.0, 1.3], [3.0, 0.5], [3.0, 1.3]].forEach(([x, y], i) => {
      paperFlower(x, y, 0.24, 0.55, i % 2 ? 0xd9232d : 0xc41a24, 0xe3b04b, g);
      paperFlower(x, y, -0.24, 0.55, i % 2 ? 0xd9232d : 0xc41a24, 0xe3b04b, g, Math.PI);
    });
    fan(0, 1.7 + 3.78, 0.2, 0.8, 0xc41a24, g); fan(0, 1.7 + 3.78, -0.2, 0.8, 0xc41a24, g);
    fan(-1.3, 1.7 + 3.55, 0.2, 0.5, 0xe3b04b, g, 0.35); fan(1.3, 1.7 + 3.55, 0.2, 0.5, 0xe3b04b, g, -0.35);
    [[75, 4.0], [105, 4.0], [90, 4.55]].forEach(([d, r]) => { const [x, y] = ring(d, r); coin(x, y, 0.24, g); });
    [[-3.45, 2.7], [3.45, 2.7]].forEach(([x, y]) => lantern(x, y, 0.3, 1.8, g));
    [[-3.5, 1.2], [3.5, 1.2]].forEach(([x, y]) => lantern(x, y, 0.3, 1.2, g));

    // gờ đèn nhỏ chạy theo mép vòm
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI; sph(0.04, fairyMat, Math.cos(a) * 3.85, 1.7 + Math.sin(a) * 3.85, 0.24, g, 6, 4); }


    // hàng rào tre hai bên, treo nón lá và câu đối chữ thoi
    [-1, 1].forEach(sd => {
      [3.3, 4.6, 5.9].forEach(x => cyl(0.045, 0.05, 2.1, M(COL.bamboo), sd * x, 1.05, 0, g, 6));
      [0.5, 1.5].forEach(y => { const r = cyl(0.035, 0.035, 2.7, M(COL.bamboo), sd * 4.6, y, 0, g, 6); r.rotation.z = Math.PI / 2; });
      [[3.3, 4.6], [4.6, 5.9]].forEach(([a, b]) => [1, -1].forEach(dir => {
        const dd = cyl(0.025, 0.025, 1.9, M(COL.bamboo), sd * (a + b) / 2, 1.0, 0, g, 5); dd.rotation.z = dir * 0.62;
      }));
      [1.75, 1.3].forEach((y, i) => {
        const n = new THREE.Mesh(G('ConeGeometry', 0.3, 0.17, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xf1e3bd, side: THREE.DoubleSide, roughness: 0.9 }));
        n.position.set(sd * 3.3, y, 0.12); n.rotation.x = Math.PI / 2; g.add(n);
        const dec = new THREE.Mesh(G('CircleGeometry', 0.08, 12), new THREE.MeshBasicMaterial({ color: i ? 0xf2a5b8 : 0x3d7d48 })); dec.position.set(sd * 3.3, y, 0.215); g.add(dec);
      });
      for (let i = 0; i < 4; i++) {
        const d = box(0.3, 0.3, 0.03, M(0xc41a24), sd * 5.9, 1.9 - i * 0.38, 0.1, g); d.rotation.z = Math.PI / 4;
        sph(0.03, M(COL.gold), sd * 5.9, 1.9 - i * 0.38, 0.13, g, 6, 4);
      }
      rect(sd > 0 ? 2.6 : -6.0, sd > 0 ? 6.0 : -2.6, GZ - 0.15, GZ + 0.15);
      blossomTree(sd * 3.0, 0.9, sd > 0 ? COL.mai : COL.pink, g, 1.0, false);
    });
    rect(-2.65, -1.85, GZ - 0.2, GZ + 0.2); rect(1.85, 2.65, GZ - 0.2, GZ + 0.2);
  })();

  // đèn rọi từ vỉa hè lên cổng, buổi tối cổng vẫn sáng rõ
  [-1, 1].forEach(sd => {
    cyl(0.1, 0.12, 0.25, M(COL.dark), sd * 4.8, 0.14, 15.8, root, 10);
    sph(0.1, M(0xfff2d0, { emissive: 0xfff2d0, emissiveIntensity: 1.6 }), sd * 4.8, 0.3, 15.8, root, 8, 6);
    spot(sd * 4.8, 0.4, 15.8, 0, 3.6, GZ + 0.05, 0xffe6bf, 80, 14, 0.75, 0.5);
    point(sd * 1.7, 2.4, GZ + 1.3, 0xffe2b8, 20, 3, 7);
  });

  // thảm đỏ trải từ mép đường, qua cổng, tới bàn đón tiếp
  const carpet = mesh(G('PlaneGeometry', 2.3, 8.5), M(0xa5121f, { roughness: 1 }), 0, 0.03, 12.15, root, false);
  carpet.rotation.x = -Math.PI / 2;
  [-1.15, 1.15].forEach(x => { const l = mesh(G('PlaneGeometry', 0.07, 8.5), M(COL.gold), x, 0.032, 12.15, root, false); l.rotation.x = -Math.PI / 2; });

  /* ---------- Cờ đuôi nheo ---------- */
  (function bunting() {
    [-1, 1].forEach(sd => cyl(0.05, 0.05, 3.6, M(COL.dark), sd * 9.5, 1.8, GZ + 0.5, root, 8));
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.1, 0, 0, 0.1, 0, 0, 0, -0.22, 0], 3));
    tri.computeVertexNormals();
    const strings = [[-3.6, 3.9, -9.5, 3.55], [3.6, 3.9, 9.5, 3.55]];
    const per = 14;
    const inst = new THREE.InstancedMesh(tri, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), strings.length * per);
    const d = new THREE.Object3D(); const cols = [0xd9232d, 0xf0c332, 0x2f9a4a, 0xf2a5b8];
    let k = 0;
    strings.forEach(([ax, ay, bx, by]) => {
      const pts = [];
      for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector3(ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * 0.4, GZ + 0.5)); }
      root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x20120f })));
      for (let i = 0; i < per; i++) {
        const t = (i + 0.5) / per;
        d.position.set(ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * 0.4, GZ + 0.5);
        d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix();
        inst.setMatrixAt(k, d.matrix); inst.setColorAt(k, new THREE.Color(cols[i % 4])); k++;
      }
    });
    root.add(inst);
  })();

  /* ---------- Khách tham dự, chân chạm đất ---------- */
  const people = [];
  const addP = (x, z, mode = 'stand', o = {}) => people.push({ x, z, mode, ...o });
  for (let gx = -3.4; gx <= 3.4; gx += 0.82) for (let gz = -6.0; gz <= -2.3; gz += 0.82)
    if (rnd() > 0.14) addP(gx + (rnd() - 0.5) * 0.4, gz + (rnd() - 0.5) * 0.4);
  cocktailPos.forEach(([tx, tz]) => {
    const n = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2; addP(tx + Math.cos(a) * 0.95, tz + Math.sin(a) * 0.95); }
  });
  [7.0, 10.5].forEach(cx => [-6.8, -4.2, -1.6].forEach(rz => {
    addP(cx - 0.6, rz + 0.95); addP(cx + 0.55, rz + 0.95); addP(cx + (rnd() - 0.5) * 0.8, rz - 0.85, 'stand', { staff: true });
  }));
  [[7.0, -3.4], [8.6, -3.2], [10.0, -3.4], [8.4, -0.9]].forEach(([x, z]) => addP(x, z));
  [[-9.0, -0.6], [-9.1, 0.8], [-9.0, 5.6], [-9.1, 7.0], [-8.4, 3.3]].forEach(([x, z]) => addP(x, z));
  seated.forEach(([x, z]) => addP(x, z, 'chair'));
  [-2.35, -1.45, 0.55, 1.45].forEach(o => addP(8.2 + o, 3.95, 'chair'));
  addP(-1.6, 6.0); addP(1.8, 5.7); addP(-2.7, 9.4); addP(2.9, 9.0);
  addP(-3.6, 8.4); addP(-4.5, 8.6);
  addP(-0.5, 6.7, 'stand', { staff: true }); addP(0.6, 6.7, 'stand', { staff: true });

  const bodyGeo = G('CapsuleGeometry', 0.2, 0.85, 4, 8);
  const headGeo = G('SphereGeometry', 0.15, 10, 8);
  const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), people.length);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), people.length);
  bodies.castShadow = heads.castShadow = true;
  const coats = [0x2d3a2f, 0x1c1c22, 0xd8d1c4, 0x7a1f2a, 0x3b4a7a, 0xf1efe8, 0x8a8f98, 0xe0a3b5, 0xa8141f];
  const skins = [0xf0c8a0, 0xd9a679, 0xb9855a, 0x8d5a3c];
  const dm = new THREE.Object3D();
  people.forEach((p, i) => {
    const s = 0.93 + rnd() * 0.17;
    if (p.mode === 'chair') {
      dm.position.set(p.x, 0.5 + 0.31, p.z); dm.scale.set(1, 0.62, 1);
    } else {
      dm.position.set(p.x, 0.625 * s, p.z); dm.scale.set(1, s, 1);
    }
    dm.rotation.set(0, 0, 0); dm.updateMatrix(); bodies.setMatrixAt(i, dm.matrix);
    bodies.setColorAt(i, new THREE.Color(p.staff ? COL.red : coats[Math.floor(rnd() * coats.length)]));
    dm.position.set(p.x, p.mode === 'chair' ? 0.5 + 0.62 + 0.14 : 1.37 * s, p.z); dm.scale.set(1, 1, 1); dm.updateMatrix();
    heads.setMatrixAt(i, dm.matrix);
    heads.setColorAt(i, new THREE.Color(skins[Math.floor(rnd() * skins.length)]));
  });
  root.add(bodies, heads);

  // đèn nháy trên các cây mai, cây đào
  const twinkle = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: 0xfff1c8, toneMapped: false }));
  twinkleSpots.forEach((pts, gi) => {
    const im = new THREE.InstancedMesh(G('SphereGeometry', 0.027, 6, 4), twinkle[gi], pts.length);
    const dd = new THREE.Object3D();
    pts.forEach((v, i) => { dd.position.copy(v); dd.updateMatrix(); im.setMatrixAt(i, dd.matrix); });
    root.add(im);
  });
  // đèn bổ sung buổi tối cho các khu đông người, tránh bị chìm trong bóng tối
  point(8.2, 3.6, 4.9, 0xffe2b8, 60, 6, 13);
  point(0, 4.2, -3.9, 0xffe6c4, 80, 8, 16);
  point(0, 3.8, 0.8, 0xffe6c4, 55, 6, 13);
  point(-6.5, 3.8, -3.9, 0xffe2b8, 50, 6, 12);
  flushLanterns();

  /* Gộp các khối tĩnh cùng vật liệu thành một lưới để máy yếu vẫn mượt */
  (function mergeStatic() {
    root.updateMatrixWorld(true);
    const cached = new Set(Object.values(matCache));
    const groups = new Map(); const remove = [];
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !cached.has(o.material)) return;
      let geo = o.geometry.clone();
      if (geo.index) geo = geo.toNonIndexed();
      geo.applyMatrix4(o.matrixWorld);
      Object.keys(geo.attributes).forEach(n => { if (!['position', 'normal', 'uv'].includes(n)) geo.deleteAttribute(n); });
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      const key = o.material.uuid + (o.castShadow ? 'c' : 'n');
      if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, list: [] });
      groups.get(key).list.push(geo);
      remove.push(o);
    });
    remove.forEach(o => o.parent.remove(o));
    groups.forEach(({ mat, cast, list }) => {
      const m = new THREE.Mesh(mergeGeometries(list, false), mat);
      m.castShadow = cast; m.receiveShadow = true; m.matrixAutoUpdate = false;
      root.add(m);
    });
  })();

  return {
    brochureSpot: { x: -0.78, y: 1.08, z: 7.54 },
    lixiTrees: [{ x: -2.2, z: 7.6 }, { x: 2.2, z: 7.6 }],
    root, obstacles, beamMats, lanternMat, fairyMat, bldMat, backdropMat, steamPuffs, useLed, lamps, twinkle, foodTables
  };
}
