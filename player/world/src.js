/* The film's world: the company's central image as a small lit world, drawn in WebGL.
   Kits (what a stranger sees at the company's door):
     factory    halls by a river; one lit window = one person; a neighbour whose lights change; a newcomer across the river
     city       a city of apartment blocks; the company's stores or branches as signs in its own colour; customers as lit
                windows; couriers as moving lights that carry customers away (the neighbour's, then a dark store's)
     logistics  warehouses and highways; trucks as light streams; an automated hub with few windows and dense flows
   Times: night, dusk, dawn, snow. Looks: night (lit, bloom) or paper (a daylight paper diorama, tilt-shift).
   The seed (from the company's name unless given) changes layout and camera, so no two companies get the same world.
   Every frame is a pure function of (beat, t). three.js (MIT), pmndrs/postprocessing (Zlib). Build: npm run build:world.

   FilmWorld.create(canvas, cfg) -> { render(beat, t, dur), dispose(), info }
   cfg: { kit, time, look, light, you, them_start, them_end, sites, share, seed, name, width, height }
   beats: open · neighbor · newcomer · finale */
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, Effect, BloomEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode, TiltShiftEffect } from 'postprocessing';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const inertia = (x) => { x = clamp(x); return 0.3 * x + 0.7 * x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const strSeed = (s) => { let h = 2166136261; for (const ch of String(s || '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

class GrainEffect extends Effect {
  constructor(amount = 0.06) {
    super('Grain', `uniform float frame; uniform float amount;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + frame * 0.6180339) * 43758.5453); }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
        float l = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
        float n = (h(floor(uv * resolution / 1.6)) - 0.5) * amount * (1.0 - 0.6 * l);
        outputColor = vec4(inputColor.rgb + n, inputColor.a); }`,
    { uniforms: new Map([['frame', new THREE.Uniform(0)], ['amount', new THREE.Uniform(amount)]]) });
  }
}

const LOOKS = {
  night: {
    sky: ['#05070d', '#1a2540', '#3a4462'], fog: ['#1a2238', 0.0052], ground: '#0c0f15', field: '#10141c', road: '#07080b', river: '#0b1626',
    hall: '#3a4150', roof: '#2a303c', block: '#262c38', them: '#1a2230', hemi: ['#6a80aa', '#1c1610', 2.4], key: ['#a9bfe6', 2.2], keyPos: [-80, 70, -60], shadows: false,
    warm: [2.6, 1.35, 0.5], cool: [1.5, 2.0, 2.9], off: [0.012, 0.012, 0.016], lamp: [2.2, 1.5, 0.8], post: 'night', moon: true, tree: '#0b0f10',
  },
  paper: {
    sky: ['#f1e6cf', '#efe2c8', '#e9d9bb'], fog: ['#eadcc0', 0.0016], ground: '#d9c9a6', field: '#c9bb8f', road: '#bfae8c', river: '#7fa6b8',
    hall: '#c4673f', roof: '#a8502f', block: '#e6d6b8', them: '#f3f1ea', hemi: ['#fff4e0', '#a08060', 1.1], key: ['#fff1d6', 2.6], keyPos: [60, 90, 50], shadows: true,
    warm: [0.98, 0.9, 0.62], cool: [0.62, 0.84, 1.0], off: [0.3, 0.24, 0.2], lamp: [0.95, 0.85, 0.6], post: 'paper', moon: false, tree: '#6f9a5a',
  },
};
// times of day change the night look (the paper look is always daylight)
const TIMES = {
  night: {},
  dusk: { sky: ['#121829', '#563d57', '#d98458'], fog: ['#43354a', 0.0046], ground: '#17151b', field: '#1b1921', hemi: ['#8e7ca4', '#2a1a14', 2.6], key: ['#ffad74', 2.4], keyPos: [-220, 28, -160], moon: false, sun: [3.2, 1.6, 0.7] },
  dawn: { sky: ['#1b2843', '#6a7da4', '#ecc3a2'], fog: ['#6a7a96', 0.0044], ground: '#151a22', field: '#19202a', hemi: ['#a3b6da', '#2a2420', 2.6], key: ['#ffd6b6', 2.0], keyPos: [220, 26, -160], moon: false, sun: [3.0, 2.2, 1.5] },
  snow: { sky: ['#070a12', '#1e2a42', '#40506e'], fog: ['#2c3852', 0.0078], ground: '#7d8799', field: '#737d90', road: '#2c313b', roof: '#a6afbf', block: '#3a4252', hemi: ['#86a0cc', '#4a4a52', 2.4], snow: true, tree: '#1a2028' },
};

function paperTexture(seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = rng(seed);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 110 + r() * 40; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(90,90,90,${0.08 + r() * 0.08})`; g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function hallGeometry(L, D, H, teeth) {
  const s = new THREE.Shape(); const tw = D / teeth, th = Math.min(1.1, tw * 0.55);
  s.moveTo(-D / 2, 0); s.lineTo(D / 2, 0); s.lineTo(D / 2, H);
  for (let k = 0; k < teeth; k++) { const x0 = D / 2 - k * tw; s.lineTo(x0, H + th); s.lineTo(x0 - tw, H); }
  s.lineTo(-D / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false });
  g.rotateY(-Math.PI / 2); g.translate(L / 2, 0, 0);
  return g;
}
// a light colour from a brand hex, bright enough to glow
function glow(hex, fallback) {
  if (!hex) return new THREE.Color(...fallback);
  const c = new THREE.Color(hex); const m = Math.max(c.r, c.g, c.b, 0.05); return c.multiplyScalar(1.8 / m);
}
// a polyline with its cumulative length; position at distance d
function poly(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, len: cum[cum.length - 1] }; }
function along(p, d) {
  d = clamp(d, 0, p.len); let i = 1; while (i < p.cum.length - 1 && p.cum[i] < d) i++;
  const a = p.pts[i - 1], b = p.pts[i], seg = p.cum[i] - p.cum[i - 1] || 1, u = (d - p.cum[i - 1]) / seg;
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
}

export function create(canvas, cfg = {}) {
  const base = LOOKS[cfg.look] || LOOKS.night;
  const look = base.post === 'night' ? { ...base, ...(TIMES[cfg.time] || {}) } : base;
  const W = cfg.width || 1920, H = cfg.height || 1080;
  const seed = Number.isFinite(cfg.seed) ? cfg.seed : strSeed(cfg.name || 'company');
  const R = rng(seed || 7);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = look.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(look.fog[0], look.fog[1]);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 1200);
  const paper = look.post === 'paper' ? paperTexture(3) : null;
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...(paper ? { roughnessMap: paper, bumpMap: paper, bumpScale: 0.6 } : {}), ...extra });

  // sky, moon or a low sun, stars
  {
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { a: { value: new THREE.Color(look.sky[0]) }, b: { value: new THREE.Color(look.sky[1]) }, c: { value: new THREE.Color(look.sky[2]) } },
      vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform vec3 c; varying vec3 p; void main(){ float y = max(p.y, 0.0); vec3 col = mix(c, b, smoothstep(0.0, 0.12, y)); col = mix(col, a, smoothstep(0.12, 0.6, y)); gl_FragColor = vec4(col, 1.0); }' });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), m));
    if (look.post === 'night' && look.moon) {
      const moon = new THREE.Mesh(new THREE.CircleGeometry(11, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.4), fog: false, toneMapped: false }));
      moon.position.set(-230 + R() * 120, 150, -560); moon.lookAt(0, 0, 0); scene.add(moon);
      const sg = new THREE.BufferGeometry(), sp = [];
      for (let i = 0; i < 900; i++) { const th = R() * Math.PI * 2, ph = 0.12 + R() * 1.3; sp.push(760 * Math.cos(ph) * Math.cos(th), 760 * Math.sin(ph), 760 * Math.cos(ph) * Math.sin(th)); }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#aab6d0', size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.55 })));
    }
    if (look.sun) {
      const sun = new THREE.Mesh(new THREE.CircleGeometry(22, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(...look.sun), fog: false, toneMapped: false }));
      const kp = look.keyPos; const v = new THREE.Vector3(kp[0], 0, kp[2]).normalize(); sun.position.set(v.x * 700, 14, v.z * 700); sun.lookAt(0, 0, 0); scene.add(sun);
    }
  }
  scene.add(new THREE.HemisphereLight(look.hemi[0], look.hemi[1], look.hemi[2]));
  const key = new THREE.DirectionalLight(look.key[0], look.key[1]); key.position.set(...look.keyPos);
  if (look.shadows) { key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -160, right: 160, top: 120, bottom: -120, near: 1, far: 500 }); key.shadow.bias = -0.0006; }
  scene.add(key);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat(look.ground)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const dotGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const pool = (color, x, z, sx, sz, k) => { if (look.post !== 'night') return null; const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ map: poolTex, color: color.clone().multiplyScalar(k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z); scene.add(m); return m; };
  const strip = (x, z, w, d, color) => { const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color)); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.02, z); r.receiveShadow = true; scene.add(r); return r; };
  const water = (z, w, d) => { const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: look.river, roughness: look.post === 'paper' ? 0.8 : 0.12, metalness: look.post === 'paper' ? 0 : 0.7 })); r.rotation.x = -Math.PI / 2; r.position.set(0, 0.03, z); r.receiveShadow = true; scene.add(r); };
  const trees = (n, fn) => { const tg = new THREE.ConeGeometry(1.1, 3.4, 7); tg.translate(0, 1.9, 0); const m = new THREE.InstancedMesh(tg, mat(look.tree || '#0b0f10'), n); const o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 2 && k < n; i++) { const p = fn(i); if (!p) continue; o.position.set(p[0], 0, p[1]); o.scale.setScalar(0.7 + R() * 0.6); o.updateMatrix(); m.setMatrixAt(k++, o.matrix); }
    m.count = k; m.castShadow = true; scene.add(m); };
  const instDots = (n, color, scale = 1) => { const m = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color, toneMapped: false }), Math.max(1, n)); m.count = 0; scene.add(m); m.userData.s = scale; return m; };
  const pick = (arr, n) => arr.map((s, i) => [hash(i + 0.5 + (seed % 97)), s]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
  const makeWindows = (list, geo, parent = scene) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: true }), Math.max(1, list.length));
    const o = new THREE.Object3D();
    list.forEach((s, i) => { o.position.set(s[0], s[1], s[2]); o.rotation.set(0, s[5] ? Math.PI / 2 : 0, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, new THREE.Color(0, 0, 0)); });
    m.count = list.length; m.instanceMatrix.needsUpdate = true; parent.add(m); return m;
  };
  const C = new THREE.Color();
  const setWin = (mesh, i, col, k = 1) => { C.copy(col).multiplyScalar(k); mesh.setColorAt(i, C); };
  const O = new THREE.Object3D();
  const putDot = (mesh, k, x, y, z, s = 1) => { O.position.set(x, y, z); O.rotation.set(0, 0, 0); O.scale.setScalar(s); O.updateMatrix(); mesh.setMatrixAt(k, O.matrix); };
  const LIGHT = glow(cfg.light, look.warm), COOL = new THREE.Color(...look.cool), OFF = new THREE.Color(...look.off), WARM = new THREE.Color(...look.warm);
  // the crowd: copies of the newcomer that assemble in the finale (a success is copied; the newcomer is never alone)
  const copycat = (x, z, w, hgt, d, k) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), mat(look.them, look.post === 'night' ? { roughness: 0.35, metalness: 0.4 } : {})); body.position.y = hgt / 2; body.castShadow = true; g.add(body);
    const slots = []; const rows = Math.max(1, Math.floor((hgt - 0.8) / 0.9)), cols = Math.max(2, Math.floor((w - 1) / 0.9));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (hash(r * 31 + c * 7 + k * 101) < 0.45) slots.push([-w / 2 + 0.7 + c * 0.9, 0.7 + r * 0.9, d / 2 + 0.03]);
    const win = makeWindows(slots, new THREE.PlaneGeometry(0.5, 0.5), g);
    const pl = pool(COOL, x, z, w * 2.2, d * 3, 0.06);
    return { g, update(p) { const a = smooth(p); body.visible = a > 0.001; body.scale.y = Math.max(0.001, a); body.position.y = hgt / 2 * a;
      slots.forEach((_, i) => setWin(win, i, a > 0.6 + 0.4 * hash(i * 1.7 + k) ? COOL : OFF, 1.2)); win.instanceColor.needsUpdate = true; win.visible = a > 0.4; if (pl) pl.material.opacity = a * 0.9; } };
  };
  const ctx = { THREE, scene, camera, look, R, seed, mat, pool, strip, water, trees, instDots, pick, makeWindows, setWin, putDot, dotGeo, LIGHT, COOL, OFF, WARM, cfg, hallGeometry, poly, along, copycat };

  const kit = (KITS[cfg.kit] || KITS.factory)(ctx);
  scene.fog.density *= kit.fog || 1;   // bigger worlds need thinner air

  // snow: flakes falling as a pure function of t, around where the camera looks
  let flakes = null;
  if (look.snow) {
    const n = 2600, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    flakes = new THREE.Points(g, new THREE.PointsMaterial({ color: '#dfe6f2', size: 2.0, sizeAttenuation: false, transparent: true, opacity: 0.75, fog: true, depthWrite: false }));
    flakes.userData.seed = Array.from({ length: n }, (_, i) => [hash(i * 1.1) , hash(i * 2.3), hash(i * 3.7), 0.6 + hash(i * 5.9)]); scene.add(flakes);
  }
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  const grain = new GrainEffect(look.post === 'paper' ? 0.015 : 0.018);
  const effects = look.post === 'paper'
    ? [new TiltShiftEffect({ offset: 0.12, rotation: 0.0, focusArea: 0.42, feather: 0.32, bias: 0.06, kernelSize: 3 }), new ToneMappingEffect({ mode: ToneMappingMode.AGX }), new VignetteEffect({ offset: 0.35, darkness: 0.35 }), grain]
    : [new BloomEffect({ luminanceThreshold: 0.95, luminanceSmoothing: 0.25, intensity: 2.0, radius: 0.78, mipmapBlur: true }), new ToneMappingEffect({ mode: ToneMappingMode.AGX }), new VignetteEffect({ offset: 0.28, darkness: 0.72 }), grain];
  composer.addPass(new EffectPass(camera, ...effects));

  // the seed nudges every camera path a little, so two films of the same kit never frame the same shot
  const jitter = [(hash(seed % 1000 + 0.1) - 0.5) * 0.16, (hash(seed % 1000 + 0.2) - 0.5) * 0.12, (hash(seed % 1000 + 0.3) - 0.5) * 0.12];
  function render(beat, t, dur) {
    const u = clamp(t / Math.max(0.1, dur));
    const S = kit.state(beat, u);
    const [p, q] = kit.camera(beat, inertia(u));
    const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    camera.position.set(p[0] + jitter[0] * d, p[1] + jitter[1] * d * 0.5, p[2] + jitter[2] * d * 0.3); camera.lookAt(q[0], q[1], q[2]);
    kit.update(S, t, beat, u);
    if (flakes) {
      const a = flakes.geometry.attributes.position.array, c = camera.position, sd = flakes.userData.seed;
      for (let i = 0; i < sd.length; i++) { const [x, y, z, v] = sd[i]; a[i * 3] = q[0] + (x - 0.5) * 220; a[i * 3 + 1] = ((y * 60 - t * 3.2 * v) % 60 + 60) % 60; a[i * 3 + 2] = q[2] + (z - 0.5) * 220; }
      flakes.geometry.attributes.position.needsUpdate = true; void c;
    }
    grain.uniforms.get('frame').value = Math.round(t * 30) % 997;
    composer.render(0);
  }
  return { render, dispose: () => { composer.dispose(); renderer.dispose(); }, info: { kit: cfg.kit || 'factory', seed, ...kit.info } };
}

// ---------------------------------------------------------------- kits
const KITS = {};

// FACTORY: halls by a river; one lit window = one person
KITS.factory = (X) => {
  const { THREE, scene, look, R, mat, cfg } = X;
  const YOU = Math.max(200, Math.min(12000, Math.round(cfg.you || 9000)));
  const THEM0 = Math.max(4, Math.round(cfg.them_start || 40)), THEM1 = Math.max(THEM0, Math.round(cfg.them_end || 300));
  const SITES = Math.max(3, Math.min(14, Math.round(cfg.sites || 11)));
  X.strip(0, -170, 1400, 300, look.field); X.water(-14, 1400, 16);
  const roads = [[0, 58, 320, 3.2], [0, -3.5, 320, 2.4], [0, 28.5, 320, 2.6]];
  for (const [x, z, w, d] of roads) X.strip(x, z, w, d, look.road);
  const hallMat = mat(look.hall), roofMat = mat(look.roof);
  const PAPER_HALLS = ['#c4673f', '#d39a4a', '#5f8f8a', '#b8553a', '#e0c08a'].map((c) => mat(c));
  const edgeMat = new THREE.LineBasicMaterial({ color: '#fbf6ea' });
  const halls = [];
  const place = (owner, x0, z0, nSites, cols, spanX, spanZ, scale) => {
    for (let s = 0; s < nSites; s++) {
      const cx = x0 + (s % cols) * spanX + (R() - 0.5) * 4, cz = z0 + Math.floor(s / cols) * spanZ + (R() - 0.5) * 3;
      const n = 2 + Math.floor(R() * 2);
      for (let k = 0; k < n; k++) {
        const L = (9 + R() * 7) * scale, D = (3.6 + R() * 1.6) * scale, Hh = (2.4 + R() * 1.8) * scale;
        const x = cx + (R() - 0.5) * 4, z = cz + k * (D + 1.8);
        const g = X.hallGeometry(L, D, Hh, 3 + Math.floor(R() * 3));
        const hm = look.post === 'paper' ? PAPER_HALLS[Math.floor(R() * PAPER_HALLS.length)] : hallMat;
        const m = new THREE.Mesh(g, [hm, look.post === 'paper' ? hm : roofMat]); m.position.set(x, 0, z); m.castShadow = m.receiveShadow = true; scene.add(m);
        if (look.post === 'paper') { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), edgeMat); e.position.copy(m.position); scene.add(e); }
        halls.push({ x, z, L, D, H: Hh, owner, site: s });
      }
      if (R() < 0.55) {
        const hgt = (9 + R() * 7) * scale, ch = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * scale, 0.7 * scale, hgt, 10), mat(look.roof));
        ch.position.set(cx + 7 * scale, hgt / 2, cz - 1); ch.castShadow = true; scene.add(ch);
        halls.push({ chimney: true, x: cx + 7 * scale, y: hgt + 0.3, z: cz - 1, owner });
      }
    }
  };
  if (look.post === 'night') { hallMat.emissive = new THREE.Color('#120d07'); roofMat.emissive = new THREE.Color('#07080c');
    for (let k = 0; k < 6; k++) { const pl = new THREE.PointLight('#ffb070', 220, 60, 2); pl.position.set(-40 + k * 16, 7, k % 2 ? 40 : 12); scene.add(pl); } }
  place('you', -38, 3, SITES, 6, 15, 30, 1);
  place('nb', -150, 3, 5, 3, 15, 30, 0.9);
  X.trees(260, (i) => { const x = -220 + R() * 320, z = [-8.5, 64, 26, -24, -60][i % 5] + (R() - 0.5) * 5; return (z < -20 && x > -16 && x < 46) ? null : [x, z]; });
  const slots = { you: [], nb: [] };
  for (const hl of halls) {
    if (hl.chimney) continue;
    const rows = Math.max(1, Math.floor((hl.H - 0.6) / 0.38)), cols = Math.floor((hl.L - 0.8) / 0.3);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots[hl.owner].push([hl.x - hl.L / 2 + 0.55 + c * 0.3, 0.55 + r * 0.38, hl.z + hl.D / 2 + 0.02, hl.site, c / cols]);
    const er = Math.floor((hl.D - 0.6) / 0.3);
    for (let r = 0; r < rows; r++) for (let c = 0; c < er; c++) slots[hl.owner].push([hl.x + hl.L / 2 + 0.02, 0.55 + r * 0.38, hl.z - hl.D / 2 + 0.4 + c * 0.3, hl.site, 1, true]);
  }
  const winGeo = look.post === 'paper' ? new THREE.PlaneGeometry(0.22, 0.22) : new THREE.PlaneGeometry(0.2, 0.15);
  const youSlots = X.pick(slots.you, Math.min(YOU, slots.you.length));
  const nbSlots = X.pick(slots.nb, Math.min(Math.round(YOU * 0.45), slots.nb.length));
  const winYou = X.makeWindows(youSlots, winGeo), winNb = X.makeWindows(nbSlots, winGeo);
  const redLights = halls.filter((h) => h.chimney).map((h) => { const s = new THREE.Mesh(X.dotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.25, 0.15), toneMapped: false })); s.position.set(h.x, h.y, h.z); scene.add(s); return s; });
  const lamps = X.instDots(120, new THREE.Color(...look.lamp)); { let k = 0; for (const [, z] of roads) for (let x = -200; x < 120 && k < 120; x += 8) X.putDot(lamps, k++, x, 3.2, z + 2, 0.8); lamps.count = k; }
  const TRUCKS = 26, head = X.instDots(TRUCKS * 2, new THREE.Color(2.4, 2.2, 1.8)), tail = X.instDots(TRUCKS * 2, new THREE.Color(2.6, 0.2, 0.1));
  head.count = tail.count = TRUCKS * 2;
  const trucks = Array.from({ length: TRUCKS }, (_, i) => ({ road: i % 3, dir: i % 2 ? 1 : -1, off: X.R() * 300, speed: 6 + X.R() * 5, nb: i < 7 }));
  const newco = new THREE.Group(); newco.position.set(14, 0, -40); scene.add(newco);
  const themMat = mat(look.them, look.post === 'night' ? { roughness: 0.35, metalness: 0.4 } : {});
  const blocks = [];
  for (const [x, z, w, h, d] of [[-10, 0, 12, 5.5, 7], [3, 0, 10, 8.5, 7], [14, 0, 9, 4.5, 6], [-4, -9, 18, 3.6, 6], [11, -9, 8, 11, 6]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), themMat); b.position.set(x, h / 2, z); b.castShadow = b.receiveShadow = true; newco.add(b); blocks.push({ m: b, x, z, w, h, d }); }
  const themSlots = [];
  for (const b of blocks) { const rows = Math.floor((b.h - 0.5) / 0.5), cols = Math.floor((b.w - 0.6) / 0.42); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) themSlots.push([b.x - b.w / 2 + 0.5 + c * 0.42, 0.5 + r * 0.5, b.z + b.d / 2 + 0.02]); }
  const themList = X.pick(themSlots, Math.min(THEM1, themSlots.length));
  const winThem = X.makeWindows(themList, new THREE.PlaneGeometry(0.3, 0.3), newco);
  const beacon = new THREE.Mesh(X.dotGeo, new THREE.MeshBasicMaterial({ color: X.COOL.clone().multiplyScalar(1.4), toneMapped: false })); beacon.position.set(11, 11.6, -9); beacon.scale.setScalar(1.6); newco.add(beacon);
  const poolYou = X.pool(X.LIGHT, -2, 26, 150, 80, 0.05), poolThem = X.pool(X.COOL, 16, -40, 70, 40, 0.09);
  const insideSite = Math.min(SITES - 1, Math.floor(X.R() * SITES));
  const copies = [X.copycat(-44, -50, 12, 6, 7, 1), X.copycat(66, -48, 10, 8, 6, 2), X.copycat(36, -66, 14, 5, 7, 3)];
  return {
    info: { you: youSlots.length, them: themList.length },
    state(beat, u) {
      const S = { on: 1, nb: 0, build: 0, them: 0, inside: 0 };
      if (beat === 'open') S.on = 0.12 + 0.88 * smooth(u / 0.55);
      if (beat === 'neighbor') S.nb = smooth((u - 0.15) / 0.7);
      if (beat === 'newcomer') { S.nb = 1; S.build = clamp((u - 0.08) / 0.5); S.them = lerp(THEM0, Math.round((THEM0 + THEM1) / 2.4), smooth((u - 0.45) / 0.45)) * smooth((u - 0.35) / 0.15); }
      if (beat === 'finale') { S.nb = 1; S.build = 1; S.them = lerp(Math.round((THEM0 + THEM1) / 2.4), THEM1, smooth(u / 0.6)); S.inside = smooth((u - 0.55) / 0.35); S.crowd = clamp((u - 0.1) / 0.5); }
      return S;
    },
    camera(beat, u) {
      if (beat === 'open') return [[lerp(-58, -46, u), lerp(2.4, 30, u), lerp(68, 104, u)], [lerp(-44, -4, u), lerp(3, 0, u), lerp(52, 14, u)]];
      if (beat === 'neighbor') return [[lerp(-104, -114, u), lerp(11, 14, u), lerp(84, 92, u)], [lerp(-126, -132, u), 1.5, lerp(30, 26, u)]];
      if (beat === 'newcomer') return [[lerp(58, 44, u), lerp(9, 6, u), lerp(10, -4, u)], [lerp(22, 16, u), lerp(2, 4, u), lerp(-36, -42, u)]];
      return [[lerp(-14, -26, u), lerp(34, 58, u), lerp(96, 124, u)], [lerp(-6, -10, u), 0, lerp(4, -12, u)]];
    },
    update(S, t) {
      youSlots.forEach((s, i) => {
        const order = (s[3] / SITES) * 0.7 + hash(i * 1.37) * 0.3;
        if (!(order < S.on && hash(i + 0.21) < 0.97)) return X.setWin(winYou, i, X.OFF);
        const flick = 0.85 + 0.15 * hash(i * 3.1);
        if (S.inside > 0 && s[3] === insideSite && hash(i * 7.7) < S.inside) return X.setWin(winYou, i, X.COOL, flick * 1.1);
        X.setWin(winYou, i, X.LIGHT, flick);
      });
      winYou.instanceColor.needsUpdate = true;
      nbSlots.forEach((s, i) => {
        const front = s[4] * 0.6 + (s[3] / 5) * 0.4;
        if (front >= S.nb * 1.05) return X.setWin(winNb, i, X.WARM, 0.85 + 0.15 * hash(i * 2.3));
        if (hash(i + 4.4) < 0.45) return X.setWin(winNb, i, X.OFF);
        X.setWin(winNb, i, X.COOL, 1.05 + 0.2 * hash(i * 5.1));
      });
      winNb.instanceColor.needsUpdate = true;
      blocks.forEach((b, k) => { const a = smooth((S.build - k * 0.14) / 0.3); b.m.visible = a > 0.001; b.m.scale.set(1, Math.max(0.001, a), 1); b.m.position.y = (b.h / 2) * a; });
      const nThem = Math.round(S.them);
      themList.forEach((s, i) => X.setWin(winThem, i, i < nThem ? X.COOL : X.OFF, i < nThem ? 1.2 : 1));
      winThem.instanceColor.needsUpdate = true; winThem.visible = S.build > 0.4; beacon.visible = S.build > 0.95;
      copies.forEach((c, k) => c.update(clamp(((S.crowd || 0) - k * 0.25) / 0.45)));
      if (poolYou) poolYou.material.opacity = 0.35 + 0.65 * S.on;
      if (poolThem) poolThem.material.opacity = clamp(nThem / THEM1) * 0.8 + 0.2 * S.build;
      redLights.forEach((r, i) => { r.visible = ((t + i * 0.37) % 1.6) < 0.8; });
      let kh = 0;
      trucks.forEach((tr) => {
        const [, z] = roads[tr.road], sp = tr.speed * (tr.nb ? 1 + 1.6 * S.nb : 1);
        const x = -210 + ((tr.off + tr.dir * sp * t) % 320 + 320) % 320, zz = z + (tr.dir > 0 ? 0.6 : -0.6);
        for (const side of [-0.35, 0.35]) { X.putDot(head, kh, x + tr.dir * 1.2, 0.55, zz + side, 0.7); X.putDot(tail, kh, x - tr.dir * 1.2, 0.55, zz + side, 0.7); kh++; }
      });
      head.instanceMatrix.needsUpdate = tail.instanceMatrix.needsUpdate = true;
    },
  };
};

// CITY: blocks of apartments (customers), the company's stores as signs, couriers as moving lights
KITS.city = (X) => {
  const { THREE, scene, look, R, mat, cfg } = X;
  const STORES = Math.max(4, Math.min(60, Math.round(cfg.sites || 24)));
  const CUST = Math.max(500, Math.min(15000, Math.round(cfg.you || 6000)));
  const THEM0 = Math.max(4, Math.round(cfg.them_start || 30)), THEM1 = Math.max(THEM0, Math.min(500, Math.round(cfg.them_end || 260)));
  const SHARE = clamp(cfg.share ?? 0.3, 0.05, 0.8);
  const COLS = 9, ROWS = 5, STEP = 30, X0 = -120, Z0 = -2;   // block centres x = X0 + i*STEP, z = Z0 + j*STEP
  const streetsX = Array.from({ length: COLS + 1 }, (_, i) => X0 - STEP / 2 + i * STEP), streetsZ = Array.from({ length: ROWS + 1 }, (_, j) => Z0 - STEP / 2 + j * STEP);
  for (const x of streetsX) X.strip(x, Z0 + (ROWS - 1) * STEP / 2, 4, ROWS * STEP + 6, look.road);
  for (const z of streetsZ) X.strip(X0 + (COLS - 1) * STEP / 2, z, COLS * STEP + 6, 4, look.road);
  X.water(-40, 1400, 14); X.strip(0, -150, 1400, 200, look.field);
  // apartment blocks: customers' windows
  const blockMat = mat(look.block || look.hall), roofMat = mat(look.roof);
  if (look.post === 'night') blockMat.emissive = new THREE.Color('#0d0b0a');
  const PAPER = ['#e6d6b8', '#d9b48c', '#b9c7c0', '#e0c9a6', '#c9a98a'].map((c) => mat(c));
  const custSlots = [], buildings = [];
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
    const cx = X0 + i * STEP, cz = Z0 + j * STEP, centre = 1 - Math.hypot(i - COLS / 2, j - 1) / 7;
    const n = 2 + Math.floor(R() * 3);
    for (let k = 0; k < n; k++) {
      const w = 6 + R() * 5, d = 6 + R() * 4, h = 6 + R() * (10 + 22 * clamp(centre)), x = cx + (k % 2 ? 5 : -5) + (R() - 0.5) * 3, z = cz + (k < 2 ? -5 : 5) + (R() - 0.5) * 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), look.post === 'paper' ? PAPER[Math.floor(R() * PAPER.length)] : blockMat); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
      buildings.push({ x, z, w, d, h, block: [i, j] });
      const rows = Math.floor((h - 1.2) / 0.9), cols = Math.floor((w - 0.8) / 0.7), ec = Math.floor((d - 0.8) / 0.7);
      for (let r = 0; r < rows; r++) { for (let c = 0; c < cols; c++) custSlots.push([x - w / 2 + 0.7 + c * 0.7, 1.4 + r * 0.9, z + d / 2 + 0.03, i, j]); for (let c = 0; c < ec; c++) custSlots.push([x + w / 2 + 0.03, 1.4 + r * 0.9, z - d / 2 + 0.7 + c * 0.7, i, j, true]); }
    }
  }
  void roofMat;
  const custList = X.pick(custSlots, Math.min(CUST, custSlots.length));
  const winCust = X.makeWindows(custList, look.post === 'paper' ? new THREE.PlaneGeometry(0.42, 0.5) : new THREE.PlaneGeometry(0.4, 0.42));
  // stores: low buildings at block corners with a storefront and a sign in the company's colour; the neighbour's in another colour
  const corners = []; for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) for (const [dx, dz] of [[-10, 11], [10, 11]]) corners.push([X0 + i * STEP + dx, Z0 + j * STEP + dz, i, j]);
  const shuffled = X.pick(corners, corners.length);
  const ours = shuffled.slice(0, STORES).sort((a, b) => a[2] - b[2] || a[3] - b[3]);
  const theirs = shuffled.slice(STORES, STORES + Math.round(STORES * 0.6)).filter((c) => c[2] <= 3);
  const NB_COLOR = new THREE.Color(1.1, 2.4, 1.6);
  const storeMat = mat(look.post === 'paper' ? '#f2ede2' : '#20242c');
  const signGeo = new THREE.PlaneGeometry(7.2, 1.3), frontGeo = new THREE.PlaneGeometry(6.4, 2.4), roofSignGeo = new THREE.PlaneGeometry(6, 2.2);
  const mkStores = (list) => list.map(([x, z]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(8, 4.6, 5), storeMat); b.position.set(x, 2.3, z); b.castShadow = b.receiveShadow = true; scene.add(b);
    const sign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })); sign.position.set(x, 3.9, z + 2.53); scene.add(sign);
    const front = new THREE.Mesh(frontGeo, new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })); front.position.set(x, 1.5, z + 2.52); scene.add(front);
    const top = new THREE.Mesh(roofSignGeo, new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false, side: THREE.DoubleSide })); top.position.set(x, 6.4, z + 1.2); scene.add(top);
    const pl = X.pool(new THREE.Color(1, 1, 1), x, z + 6, 22, 14, 1);
    return { x, z, sign, front, top, pl };
  });
  const sOurs = mkStores(ours), sTheirs = mkStores(theirs);
  // the hero store: the camera opens on one of yours, on the front row, away from the neighbour's district
  const hero = [...sOurs].sort((a, b) => (b.z - Math.abs(b.x) * 0.2) - (a.z - Math.abs(a.x) * 0.2))[0];
  sOurs.sort((a, b) => Math.hypot(a.x - hero.x, a.z - hero.z) - Math.hypot(b.x - hero.x, b.z - hero.z));   // signs come on from the hero store outward
  // the dark store at the edge of the city, across the river
  const ds = new THREE.Group(); ds.position.set(-10 + R() * 40, 0, -78); scene.add(ds);
  const dsMat = mat(look.them, look.post === 'night' ? { roughness: 0.35, metalness: 0.4 } : {});
  const dsBody = new THREE.Mesh(new THREE.BoxGeometry(46, 9, 18), dsMat); dsBody.position.y = 4.5; dsBody.castShadow = true; ds.add(dsBody);
  const docks = X.makeWindows(Array.from({ length: 14 }, (_, k) => [-19.5 + k * 3, 1.6, 9.03]), new THREE.PlaneGeometry(2.2, 2.6), ds);
  const stripLights = X.makeWindows(Array.from({ length: 3 }, (_, k) => [0, 6.2 + k * 0.9, 9.04]), new THREE.PlaneGeometry(40, 0.18), ds);
  const dsPool = X.pool(X.COOL, ds.position.x, -78, 110, 60, 0.08);
  const cityPool = X.pool(X.LIGHT, 0, 55, 300, 170, 0.035);
  // couriers: paths along the streets, from a source to a block
  const near = (arr, v) => arr.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), arr[0]);
  const route = (sx, sz, dx, dz) => { const zs = near(streetsZ, sz), xd = near(streetsX, dx); return X.poly([[sx, sz], [sx, zs], [xd, zs], [xd, dz], [dx, dz]]); };
  const blockC = (i, j) => [X0 + i * STEP + (R() - 0.5) * 12, Z0 + j * STEP + (R() - 0.5) * 12];
  const dsGate = () => [ds.position.x + (R() - 0.5) * 30, -68];
  const mkCouriers = (n, from) => Array.from({ length: n }, (_, k) => { const s = from(k), d = blockC(Math.floor(R() * COLS), Math.floor(R() * ROWS));
    const p = s.bridge ? X.poly([[s.x, s.z], [s.x, -40], [near(streetsX, s.x), -18], ...route(near(streetsX, s.x), -18, d[0], d[1]).pts.slice(1)]) : route(s.x, s.z, d[0], d[1]);
    return { p, off: R(), speed: 9 + R() * 7 }; });
  const cNb = mkCouriers(70, () => { const s = sTheirs[Math.floor(R() * Math.max(1, sTheirs.length))] || { x: -100, z: 20 }; return { x: s.x, z: s.z + 2.5 }; });
  const cThem = mkCouriers(THEM1, () => { const g = dsGate(); return { x: g[0], z: g[1], bridge: true }; });
  const cpX = [ds.position.x - 95, ds.position.x + 95];
  const copies = cpX.map((x, k) => X.copycat(x, -80 + k * 6, 30, 7, 14, 10 + k));
  const cCopy = mkCouriers(Math.round(THEM1 * 0.9), (k) => ({ x: cpX[k % 2] + (R() - 0.5) * 20, z: -70, bridge: true }));
  const cOurs = mkCouriers(90, () => { const s = sOurs[Math.floor(R() * sOurs.length)]; return { x: s.x, z: s.z + 2.5 }; });
  const cars = mkCouriers(90, () => { const c = corners[Math.floor(R() * corners.length)]; return { x: c[0], z: c[1] }; });
  const dNb = X.instDots(cNb.length, NB_COLOR), dThem = X.instDots(cThem.length, X.COOL.clone().multiplyScalar(1.15)), dCopy = X.instDots(cCopy.length, X.COOL.clone().multiplyScalar(0.95)), dOurs = X.instDots(cOurs.length, X.LIGHT), dCars = X.instDots(cars.length, new THREE.Color(2.2, 2.0, 1.6));
  const lamps = X.instDots(400, new THREE.Color(...look.lamp)); { let k = 0; for (const z of streetsZ) for (let x = X0 - 12; x < X0 + COLS * STEP && k < 400; x += 10) X.putDot(lamps, k++, x, 3.0, z + 2.6, 0.7); lamps.count = k; }
  X.trees(200, () => { const z = -50 + R() * 22, x = -260 + R() * 520; return [x, z]; });
  const moveDots = (mesh, list, n, t, y, s) => { let k = 0; for (let i = 0; i < Math.min(n, list.length); i++) { const c = list[i], cyc = c.p.len / c.speed + 3, ph = ((t / cyc + c.off) % 1) * cyc; if (ph * c.speed > c.p.len) continue; const [x, z] = X.along(c.p, ph * c.speed); X.putDot(mesh, k++, x, y, z, s); } mesh.count = k; mesh.instanceMatrix.needsUpdate = true; };
  return {
    fog: 0.45,
    info: { stores: sOurs.length, customers: custList.length, couriers: cThem.length },
    state(beat, u) {
      const S = { on: 1, nb: 0, build: 0, them: 0, share: 0, inside: 0, dim: 0 };
      if (beat === 'open') S.on = 0.1 + 0.9 * smooth(u / 0.6);
      if (beat === 'open') S.nb = 0;
      if (beat === 'neighbor') { S.nb = smooth((u - 0.1) / 0.6); S.share = 0.06 * S.nb; S.dim = 0.08 * S.nb; }
      if (beat === 'newcomer') { S.nb = 1; S.build = clamp((u - 0.05) / 0.45); S.them = lerp(THEM0, (THEM0 + THEM1) / 2.2, smooth((u - 0.45) / 0.45)) * smooth((u - 0.4) / 0.12); S.share = 0.06 + 0.1 * smooth((u - 0.5) / 0.5); S.dim = 0.08 + 0.12 * smooth((u - 0.5) / 0.5); }
      if (beat === 'finale') { S.nb = 1; S.build = 1; S.them = lerp((THEM0 + THEM1) / 2.2, THEM1, smooth(u / 0.6)); S.share = lerp(0.16, SHARE, smooth(u / 0.6)); S.dim = lerp(0.2, 0.35, smooth(u / 0.6)); S.inside = smooth((u - 0.55) / 0.35); S.crowd = clamp((u - 0.1) / 0.5); }
      return S;
    },
    camera(beat, u) {
      const cx = X0 + (COLS - 1) * STEP / 2;
      if (beat === 'open') { const f = hero; return [[lerp(f.x + 10, cx - 60, u), lerp(9, 70, u), lerp(f.z + 42, 225, u)], [lerp(f.x, cx, u), lerp(3.5, 0, u), lerp(f.z, 50, u)]]; }
      if (beat === 'neighbor') return [[lerp(X0 - 40, X0 - 30, u), lerp(34, 28, u), lerp(140, 112, u)], [lerp(X0 + 30, X0 + 38, u), 0, lerp(50, 40, u)]];
      if (beat === 'newcomer') return [[lerp(ds.position.x + 60, ds.position.x + 40, u), lerp(16, 10, u), lerp(-12, -30, u)], [lerp(ds.position.x + 6, ds.position.x, u), 3, -78]];
      return [[lerp(cx, cx + 10, u), lerp(95, 125, u), lerp(175, 200, u)], [cx, 0, lerp(20, 0, u)]];
    },
    update(S, t) {
      // customers: windows lit; the share taken by the newcomer turns cool
      custList.forEach((s, i) => { const h = hash(i * 1.913); if (h > 0.93) return X.setWin(winCust, i, X.OFF); const fl = 0.35 + 0.25 * hash(i * 3.3);
        if (hash(i * 7.31) < S.share) return X.setWin(winCust, i, X.COOL, fl * 0.9); X.setWin(winCust, i, X.WARM, fl); });
      winCust.instanceColor.needsUpdate = true;
      // your stores: signs come on one by one; each wave dims them a little (the signature)
      sOurs.forEach((s, k) => { const on = k / sOurs.length < S.on ? 1 : 0; const lit = on * (1 - S.dim * (0.6 + 0.8 * hash(k * 9.1)));
        s.sign.material.color.copy(X.LIGHT).multiplyScalar(lit * 1.4); s.top.material.color.copy(X.LIGHT).multiplyScalar(lit * 1.2); s.front.material.color.copy(X.WARM).multiplyScalar(lit * 0.7);
        if (s.pl) s.pl.material.color.copy(X.LIGHT).multiplyScalar(0.022 * lit); });
      const nbk = 0.35 + 0.65 * S.nb; sTheirs.forEach((s) => { s.sign.material.color.copy(NB_COLOR).multiplyScalar(0.9 * nbk); s.top.material.color.copy(NB_COLOR).multiplyScalar(0.8 * nbk); s.front.material.color.copy(X.WARM).multiplyScalar(0.5); if (s.pl) s.pl.material.color.copy(NB_COLOR).multiplyScalar(0.04 * nbk); });
      dsBody.scale.y = Math.max(0.001, smooth(S.build)); dsBody.position.y = 4.5 * dsBody.scale.y; dsBody.visible = S.build > 0.001;
      for (let k = 0; k < 14; k++) X.setWin(docks, k, S.build > 0.6 + k * 0.02 ? X.COOL : X.OFF, 1.1); docks.instanceColor.needsUpdate = true; docks.visible = S.build > 0.3;
      for (let k = 0; k < 3; k++) X.setWin(stripLights, k, S.build > 0.9 ? X.COOL : X.OFF, 1.6); stripLights.instanceColor.needsUpdate = true; stripLights.visible = S.build > 0.8;
      if (dsPool) dsPool.material.opacity = 0.15 + 0.85 * clamp(S.them / THEM1 + S.build * 0.2);
      if (cityPool) cityPool.material.opacity = 0.4 + 0.6 * S.on - 0.3 * S.dim;
      moveDots(dNb, cNb, Math.round(cNb.length * S.nb), t, 1.0, 2.6);
      moveDots(dThem, cThem, Math.round(S.them), t, 1.0, 2.6);
      copies.forEach((c, k) => c.update(clamp(((S.crowd || 0) - k * 0.3) / 0.45)));
      moveDots(dCopy, cCopy, Math.round(cCopy.length * clamp(((S.crowd || 0) - 0.3) / 0.7)), t * 1.1, 1.0, 2.4);
      moveDots(dOurs, cOurs, Math.round(cOurs.length * S.inside), t, 1.0, 2.8);
      moveDots(dCars, cars, cars.length, t * 0.8, 0.8, 1.6);
    },
  };
};

// LOGISTICS: warehouses on highways; trucks as light streams; an automated hub with few windows and dense flows
KITS.logistics = (X) => {
  const { THREE, scene, look, R, mat, cfg } = X;
  const HUBS = Math.max(3, Math.min(12, Math.round(cfg.sites || 7)));
  const TRUCKS = Math.max(40, Math.min(420, Math.round(cfg.you || 220)));
  const THEM0 = Math.max(4, Math.round(cfg.them_start || 20)), THEM1 = Math.max(THEM0, Math.min(400, Math.round(cfg.them_end || 200)));
  X.water(-34, 1400, 16); X.strip(0, -170, 1400, 260, look.field);
  const hw = [[[-300, 70], [300, 70]], [[-300, 12], [300, 12]], [[-180, 12], [-180, 70]], [[-60, 12], [-60, 70]], [[60, 12], [60, 70]], [[180, 12], [180, 70]]];
  for (const [[ax, az], [bx, bz]] of hw) X.strip((ax + bx) / 2, (az + bz) / 2, Math.abs(bx - ax) + 5, Math.abs(bz - az) + 5, look.road);
  const bridgeX = 30 + Math.round(R() * 40); X.strip(bridgeX, -45, 5, 120, look.road);
  const whMat = mat(look.post === 'paper' ? '#d8c4a0' : look.hall), trMat = mat(look.post === 'paper' ? '#c4673f' : '#1a1d24');
  if (look.post === 'night') whMat.emissive = new THREE.Color('#0d0b08');
  const hubs = [], dockSlots = [], nbDock = [];
  for (let h = 0; h < HUBS + 2; h++) {
    const nb = h >= HUBS, x = nb ? -250 + (h - HUBS) * 46 : -150 + (h % 6) * 60 + (R() - 0.5) * 10, z = nb ? 41 : (h < 6 ? 41 : 98), w = 34 + R() * 14, d = 14 + R() * 6, hgt = 7 + R() * 3;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), whMat); b.position.set(x, hgt / 2, z); b.castShadow = b.receiveShadow = true; scene.add(b);
    hubs.push({ x, z, w, d, nb });
    const n = Math.floor((w - 4) / 2.6);
    for (let k = 0; k < n; k++) (nb ? nbDock : dockSlots).push([x - w / 2 + 2.5 + k * 2.6, 1.5, z + d / 2 + 0.03, h, k / n]);
    for (let k = 0; k < 8; k++) { const tr = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 6), trMat); tr.position.set(x - w / 2 + 3 + k * 3.4, 0.9, z + d / 2 + 6 + R()); tr.castShadow = true; scene.add(tr); }
  }
  const docksYou = X.makeWindows(dockSlots, new THREE.PlaneGeometry(1.8, 2.2)), docksNb = X.makeWindows(nbDock, new THREE.PlaneGeometry(1.8, 2.2));
  // the automated hub across the river
  const ah = new THREE.Group(); ah.position.set(bridgeX, 0, -105); scene.add(ah);
  const ahBody = new THREE.Mesh(new THREE.BoxGeometry(70, 11, 26), mat(look.them, look.post === 'night' ? { roughness: 0.35, metalness: 0.4 } : {})); ahBody.position.y = 5.5; ahBody.castShadow = true; ah.add(ahBody);
  const ahStrips = X.makeWindows(Array.from({ length: 4 }, (_, k) => [0, 2 + k * 2.3, 13.04]), new THREE.PlaneGeometry(64, 0.16), ah);
  const ahPool = X.pool(X.COOL, bridgeX, -105, 140, 70, 0.08), basePool = X.pool(X.LIGHT, 0, 50, 380, 120, 0.03);
  // trucks along the highways; the neighbour's and the newcomer's on their own routes
  const loops = hw.map(([[ax, az], [bx, bz]]) => X.poly([[ax, az], [bx, bz]]));
  const mk = (n, pathOf) => Array.from({ length: n }, () => ({ p: pathOf(), off: R(), speed: 10 + R() * 8, dir: R() < 0.5 ? 1 : -1, lane: (R() < 0.5 ? -1 : 1) * 0.9 }));
  const tYou = mk(TRUCKS, () => loops[Math.floor(R() * loops.length)]);
  const nbPath = X.poly([[-300, 70], [-150, 70]]), nbPath2 = X.poly([[-300, 12], [-120, 12]]);
  const tNb = mk(80, () => (R() < 0.5 ? nbPath : nbPath2));
  const themPaths = [X.poly([[bridgeX, -92], [bridgeX, 12], [300, 12]]), X.poly([[bridgeX, -92], [bridgeX, 12], [-300, 12]]), X.poly([[bridgeX, -92], [bridgeX, 70], [300, 70]]), X.poly([[bridgeX, -92], [bridgeX, 70], [-300, 70]])];
  const tThem = mk(THEM1, () => themPaths[Math.floor(R() * themPaths.length)]);
  const cpX = [bridgeX - 140, bridgeX + 130];
  const copies = cpX.map((x, k) => X.copycat(x, -100 - k * 8, 46, 9, 20, 20 + k));
  for (const x of cpX) X.strip(x, -45, 5, 120, look.road);
  const copyPaths = cpX.flatMap((x) => [X.poly([[x, -88], [x, 12], [300, 12]]), X.poly([[x, -88], [x, 70], [-300, 70]])]);
  const tCopy = mk(Math.round(THEM1 * 0.9), () => copyPaths[Math.floor(R() * copyPaths.length)]);
  const head = X.instDots(TRUCKS * 2, new THREE.Color(2.4, 2.1, 1.6)), tail = X.instDots(TRUCKS * 2, new THREE.Color(2.6, 0.2, 0.1));
  const nbHead = X.instDots(160, new THREE.Color(1.3, 2.4, 1.8)), themHead = X.instDots(THEM1 * 2, X.COOL.clone().multiplyScalar(1.2)), copyHead = X.instDots(Math.round(THEM1 * 0.9) * 2, X.COOL.clone().multiplyScalar(1.0)), ourNew = X.instDots(TRUCKS * 2, X.LIGHT);
  const lamps = X.instDots(300, new THREE.Color(...look.lamp)); { let k = 0; for (const z of [70, 12]) for (let x = -300; x < 300 && k < 300; x += 9) X.putDot(lamps, k++, x, 4, z + 3.2, 0.8); lamps.count = k; }
  X.trees(240, () => [-300 + R() * 600, [-22, 120, -60][Math.floor(R() * 3)] + (R() - 0.5) * 10]);
  const drive = (meshA, meshB, list, n, t, mult, filter) => { let k = 0; for (let i = 0; i < Math.min(n, list.length); i++) { const c = list[i]; if (filter && !filter(i)) continue; const L = c.p.len, d = ((c.off * L + c.dir * c.speed * mult * t) % L + L) % L; const [x, z] = X.along(c.p, c.dir > 0 ? d : L - d);
      const dx = c.p.pts[c.p.pts.length - 1][0] - c.p.pts[0][0], horiz = Math.abs(dx) > 1 && Math.abs(z - c.p.pts[0][1]) < 1;
      const ox = horiz ? 0 : c.lane, oz = horiz ? c.lane : 0;
      for (const s of [-0.45, 0.45]) { X.putDot(meshA, k, x + ox + (horiz ? 0 : s), 0.8, z + oz + (horiz ? s : 0), 2.0); if (meshB) X.putDot(meshB, k, x + ox + (horiz ? -c.dir * 2.4 : s), 0.8, z + oz + (horiz ? s : -c.dir * 2.4), 1.4); k++; } }
    meshA.count = k; meshA.instanceMatrix.needsUpdate = true; if (meshB) { meshB.count = k; meshB.instanceMatrix.needsUpdate = true; } };
  return {
    fog: 0.5,
    info: { hubs: HUBS, trucks: TRUCKS, them: THEM1 },
    state(beat, u) {
      const S = { on: 1, nb: 0, build: 0, them: 0, inside: 0, idle: 0.35 };
      if (beat === 'open') S.on = 0.15 + 0.85 * smooth(u / 0.55);
      if (beat === 'neighbor') { S.nb = smooth((u - 0.1) / 0.6); S.idle = 0.35 + 0.1 * S.nb; }
      if (beat === 'newcomer') { S.nb = 1; S.build = clamp((u - 0.05) / 0.45); S.them = lerp(THEM0, (THEM0 + THEM1) / 2.2, smooth((u - 0.45) / 0.45)) * smooth((u - 0.4) / 0.12); S.idle = 0.45 + 0.1 * smooth((u - 0.5) / 0.5); }
      if (beat === 'finale') { S.nb = 1; S.build = 1; S.them = lerp((THEM0 + THEM1) / 2.2, THEM1, smooth(u / 0.6)); S.idle = 0.55; S.inside = smooth((u - 0.55) / 0.35); S.crowd = clamp((u - 0.1) / 0.5); }
      return S;
    },
    camera(beat, u) {
      if (beat === 'open') return [[lerp(-110, -150, u), lerp(3, 55, u), lerp(78, 160, u)], [lerp(-50, -10, u), lerp(2, 0, u), lerp(68, 40, u)]];
      if (beat === 'neighbor') return [[lerp(-300, -285, u), lerp(30, 24, u), lerp(120, 96, u)], [lerp(-225, -215, u), 0, 40]];
      if (beat === 'newcomer') return [[lerp(bridgeX + 70, bridgeX + 50, u), lerp(14, 10, u), lerp(-20, -40, u)], [bridgeX, 4, -105]];
      return [[lerp(-20, -5, u), lerp(95, 120, u), lerp(170, 195, u)], [lerp(-10, 5, u), 0, lerp(10, -15, u)]];
    },
    update(S, t) {
      dockSlots.forEach((s, i) => { const lit = (s[3] / HUBS) * 0.7 + hash(i * 1.7) * 0.3 < S.on;
        if (!lit || hash(i * 4.1) < S.idle * 0.6) return X.setWin(docksYou, i, X.OFF); X.setWin(docksYou, i, (S.inside > 0 && s[3] === 0 && hash(i) < S.inside) ? X.COOL : X.LIGHT, 0.9); });
      docksYou.instanceColor.needsUpdate = true;
      nbDock.forEach((s, i) => X.setWin(docksNb, i, s[4] < S.nb ? X.COOL : X.WARM, 0.9)); docksNb.instanceColor.needsUpdate = true;
      ahBody.scale.y = Math.max(0.001, smooth(S.build)); ahBody.position.y = 5.5 * ahBody.scale.y; ahBody.visible = S.build > 0.001;
      for (let k = 0; k < 4; k++) X.setWin(ahStrips, k, S.build > 0.7 + k * 0.05 ? X.COOL : X.OFF, 1.5); ahStrips.instanceColor.needsUpdate = true; ahStrips.visible = S.build > 0.5;
      if (ahPool) ahPool.material.opacity = 0.15 + 0.85 * clamp(S.them / THEM1 + S.build * 0.2);
      if (basePool) basePool.material.opacity = 0.4 + 0.6 * S.on;
      // your trucks: a share stands idle at the docks (the signature: trucks that wait or drive empty)
      drive(head, tail, tYou, Math.round(TRUCKS * (1 - S.idle) * S.on), t, 1, (i) => !(S.inside > 0 && hash(i * 2.2) < S.inside * 0.3));
      drive(ourNew, null, tYou, Math.round(TRUCKS * (1 - S.idle)), t, 1.3, (i) => S.inside > 0 && hash(i * 2.2) < S.inside * 0.3);
      drive(nbHead, null, tNb, Math.round(tNb.length * S.nb), t, 1 + 0.8 * S.nb);
      drive(themHead, null, tThem, Math.round(S.them), t, 1.4);
      copies.forEach((c, k) => c.update(clamp(((S.crowd || 0) - k * 0.3) / 0.45)));
      drive(copyHead, null, tCopy, Math.round(tCopy.length * clamp(((S.crowd || 0) - 0.3) / 0.7)), t, 1.3);
    },
  };
};
