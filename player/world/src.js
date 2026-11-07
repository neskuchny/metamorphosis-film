/* The film's world: the company as a lit town by a river, at night (look "night") or as a paper diorama (look "paper").
   One window is one person. Next to it, a neighbour that rebuilds itself; across the river, a company that does not
   exist yet assembles on an empty field. Built with three.js (MIT) and pmndrs/postprocessing (Zlib).

   Every frame is a pure function of (beat, t): no clock, no Math.random, so parallel render workers agree.
   Build: npm run build:world  ->  player/world.js (global FilmWorld). Source of the idea: sarpstar/cinecode (MIT).

   FilmWorld.create(canvas, cfg) -> { render(beat, t, dur), dispose() }
   cfg: { you: 9000, them_start: 40, them_end: 300, sites: 11, look: 'night' | 'paper', width: 1920, height: 1080 }
   beats: open (the town wakes up, the crane reveals it), neighbor (next door, the lights change and go faster),
          newcomer (across the river a company assembles), finale (from above: both lights, and a new light inside yours) */
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, Effect, BloomEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode, TiltShiftEffect, BlendFunction } from 'postprocessing';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const inertia = (x) => { x = clamp(x); return 0.3 * x + 0.7 * x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// film grain as a pure function of the frame (the library noise reads a running clock)
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
    hall: '#3a4150', roof: '#2a303c', them: '#1a2230', hemi: ['#6a80aa', '#1c1610', 2.4], key: ['#a9bfe6', 2.2], shadows: false,
    warm: [2.6, 1.35, 0.5], cool: [1.5, 2.0, 2.9], off: [0.012, 0.012, 0.016], lamp: [2.2, 1.5, 0.8], post: 'night',
  },
  paper: {
    sky: ['#f1e6cf', '#efe2c8', '#e9d9bb'], fog: ['#eadcc0', 0.0016], ground: '#d9c9a6', field: '#c9bb8f', road: '#bfae8c', river: '#7fa6b8',
    hall: '#c4673f', roof: '#a8502f', them: '#f3f1ea', hemi: ['#fff4e0', '#a08060', 1.1], key: ['#fff1d6', 2.6], shadows: true,
    warm: [0.98, 0.9, 0.62], cool: [0.62, 0.84, 1.0], off: [0.3, 0.24, 0.2], lamp: [0.95, 0.85, 0.6], post: 'paper',
  },
};

function paperTexture(seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = rng(seed);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 110 + r() * 40; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(90,90,90,${0.08 + r() * 0.08})`; g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// a factory hall with a sawtooth roof: profile across the depth, extruded along the length (world x), facade at +z
function hallGeometry(L, D, H, teeth) {
  const s = new THREE.Shape(); const tw = D / teeth, th = Math.min(1.1, tw * 0.55);
  s.moveTo(-D / 2, 0); s.lineTo(D / 2, 0); s.lineTo(D / 2, H);
  for (let k = 0; k < teeth; k++) { const x0 = D / 2 - k * tw; s.lineTo(x0, H + th); s.lineTo(x0 - tw, H); }
  s.lineTo(-D / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false });
  g.rotateY(-Math.PI / 2); g.translate(L / 2, 0, 0);   // shape x -> world z, extrusion -> world -x .. centred
  return g;
}

export function create(canvas, cfg = {}) {
  const look = LOOKS[cfg.look] || LOOKS.night;
  const W = cfg.width || 1920, H = cfg.height || 1080;
  const YOU = Math.max(200, Math.min(12000, Math.round(cfg.you || 9000)));
  const THEM0 = Math.max(4, Math.round(cfg.them_start || 40)), THEM1 = Math.max(THEM0, Math.round(cfg.them_end || 300));
  const SITES = Math.max(3, Math.min(14, Math.round(cfg.sites || 11)));
  const R = rng(cfg.seed || 7);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = look.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(look.fog[0], look.fog[1]);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 900);
  const paper = look.post === 'paper' ? paperTexture(3) : null;
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...(paper ? { roughnessMap: paper, bumpMap: paper, bumpScale: 0.6 } : {}), ...extra });

  // sky dome (gradient) and, at night, a moon and faint stars
  {
    const g = new THREE.SphereGeometry(600, 32, 16);
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { a: { value: new THREE.Color(look.sky[0]) }, b: { value: new THREE.Color(look.sky[1]) }, c: { value: new THREE.Color(look.sky[2]) } },
      vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform vec3 c; varying vec3 p; void main(){ float y = max(p.y, 0.0); vec3 col = mix(c, b, smoothstep(0.0, 0.12, y)); col = mix(col, a, smoothstep(0.12, 0.6, y)); gl_FragColor = vec4(col, 1.0); }' });
    scene.add(new THREE.Mesh(g, m));
    if (look.post === 'night') {
      const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.4), fog: false, toneMapped: false }));
      moon.position.set(-170, 120, -420); moon.lookAt(0, 0, 0); scene.add(moon);
      const sg = new THREE.BufferGeometry(), sp = [];
      for (let i = 0; i < 900; i++) { const th = R() * Math.PI * 2, ph = 0.12 + R() * 1.3; sp.push(560 * Math.cos(ph) * Math.cos(th), 560 * Math.sin(ph), 560 * Math.cos(ph) * Math.sin(th)); }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#aab6d0', size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.55 })));
    }
  }

  // light
  scene.add(new THREE.HemisphereLight(look.hemi[0], look.hemi[1], look.hemi[2]));
  const key = new THREE.DirectionalLight(look.key[0], look.key[1]);
  key.position.set(look.post === 'paper' ? 60 : -80, look.post === 'paper' ? 90 : 70, look.post === 'paper' ? 50 : -60);
  if (look.shadows) { key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -110, right: 90, top: 70, bottom: -70, near: 1, far: 300 }); key.shadow.bias = -0.0006; }
  scene.add(key);

  // ground, far field, river, roads
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat(look.ground)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), mat(look.field)); field.rotation.x = -Math.PI / 2; field.position.set(0, 0.01, -170); field.receiveShadow = true; scene.add(field);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(900, 16), new THREE.MeshStandardMaterial({ color: look.river, roughness: look.post === 'paper' ? 0.8 : 0.12, metalness: look.post === 'paper' ? 0 : 0.7 }));
  river.rotation.x = -Math.PI / 2; river.position.set(0, 0.03, -14); river.receiveShadow = true; scene.add(river);
  const roadMat = mat(look.road);
  const roads = [[0, 58, 320, 3.2], [0, -3.5, 320, 2.4], [0, 28.5, 320, 2.6]];
  for (const [x, z, w, d] of roads) { const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.02, z); r.receiveShadow = true; scene.add(r); }

  // ---------- the company: SITES sites of halls; windows are people ----------
  const hallMat = mat(look.hall), roofMat = mat(look.roof);
  const PAPER_HALLS = ['#c4673f', '#d39a4a', '#5f8f8a', '#b8553a', '#e0c08a'].map((c) => mat(c));
  const edgeMat = new THREE.LineBasicMaterial({ color: '#fbf6ea' });
  const halls = [];   // { x, z, L, D, H, owner }
  const place = (owner, x0, z0, nSites, cols, spanX, spanZ, scale) => {
    for (let s = 0; s < nSites; s++) {
      const cx = x0 + (s % cols) * spanX + (R() - 0.5) * 4, cz = z0 + Math.floor(s / cols) * spanZ + (R() - 0.5) * 3;
      const n = 2 + Math.floor(R() * 2);
      for (let k = 0; k < n; k++) {
        const L = (9 + R() * 7) * scale, D = (3.6 + R() * 1.6) * scale, Hh = (2.4 + R() * 1.8) * scale;
        const x = cx + (R() - 0.5) * 4, z = cz + k * (D + 1.8);
        const g = hallGeometry(L, D, Hh, 3 + Math.floor(R() * 3));
        const hm = look.post === 'paper' ? PAPER_HALLS[Math.floor(R() * PAPER_HALLS.length)] : hallMat;
        const m = new THREE.Mesh(g, [hm, look.post === 'paper' ? hm : roofMat]); m.position.set(x, 0, z); m.castShadow = m.receiveShadow = true; scene.add(m);
        if (look.post === 'paper') { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), edgeMat); e.position.copy(m.position); scene.add(e); }
        halls.push({ x, z, L, D, H: Hh, owner, site: s });
      }
      if (R() < 0.55) {   // a chimney with a red light on top
        const hgt = (9 + R() * 7) * scale, ch = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * scale, 0.7 * scale, hgt, 10), mat(look.roof));
        ch.position.set(cx + 7 * scale, hgt / 2, cz - 1); ch.castShadow = true; scene.add(ch);
        halls.push({ chimney: true, x: cx + 7 * scale, y: hgt + 0.3, z: cz - 1, owner });
      }
    }
  };
  if (look.post === 'night') { hallMat.emissive = new THREE.Color('#120d07'); roofMat.emissive = new THREE.Color('#07080c');
    for (let k = 0; k < 6; k++) { const pl = new THREE.PointLight('#ffb070', 220, 60, 2); pl.position.set(-40 + k * 16, 7, k % 2 ? 40 : 12); scene.add(pl); } }
  place('you', -38, 3, SITES, 6, 15, 30, 1);
  place('nb', -150, 3, 5, 3, 15, 30, 0.9);   // the neighbour, left along the same bank

  {
    const tg = new THREE.ConeGeometry(1.1, 3.4, 7); tg.translate(0, 1.9, 0);
    const trees = new THREE.InstancedMesh(tg, mat(look.post === 'paper' ? '#6f9a5a' : '#0b0f10'), 260); const o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < 400 && k < 260; i++) {
      const x = -220 + R() * 320, z = [-8.5, 64, 26, -24, -60][i % 5] + (R() - 0.5) * 5;
      if (z < -20 && x > -16 && x < 46) continue;   // keep the newcomer's field clear
      o.position.set(x, 0, z); o.scale.setScalar(0.7 + R() * 0.6); o.updateMatrix(); trees.setMatrixAt(k++, o.matrix);
    }
    trees.count = k; trees.castShadow = true; scene.add(trees);
  }
  // window slots on each hall's +z facade and its east end
  const slots = { you: [], nb: [] };
  for (const hl of halls) {
    if (hl.chimney) continue;
    const rows = Math.max(1, Math.floor((hl.H - 0.6) / 0.38)), cols = Math.floor((hl.L - 0.8) / 0.3);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots[hl.owner].push([hl.x - hl.L / 2 + 0.55 + c * 0.3, 0.55 + r * 0.38, hl.z + hl.D / 2 + 0.02, hl.site, c / cols]);
    const er = Math.floor((hl.D - 0.6) / 0.3);
    for (let r = 0; r < rows; r++) for (let c = 0; c < er; c++) slots[hl.owner].push([hl.x + hl.L / 2 + 0.02, 0.55 + r * 0.38, hl.z - hl.D / 2 + 0.4 + c * 0.3, hl.site, 1, true]);
  }
  const pick = (arr, n) => { const out = arr.map((s, i) => [hash(i + 0.5), s]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]); return out; };
  const winGeo = look.post === 'paper' ? new THREE.PlaneGeometry(0.22, 0.22) : new THREE.PlaneGeometry(0.2, 0.15);
  const makeWindows = (list) => {
    const m = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: true }), list.length);
    const o = new THREE.Object3D();
    list.forEach((s, i) => { o.position.set(s[0], s[1], s[2]); o.rotation.set(0, s[5] ? Math.PI / 2 : 0, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, new THREE.Color(0, 0, 0)); });
    m.instanceMatrix.needsUpdate = true; scene.add(m); return m;
  };
  // if the facades hold fewer slots than people, every lit window stands for several (said in the caption, not hidden)
  const youSlots = pick(slots.you, Math.min(YOU, slots.you.length));
  const nbSlots = pick(slots.nb, Math.min(Math.round(YOU * 0.45), slots.nb.length));
  const winYou = makeWindows(youSlots), winNb = makeWindows(nbSlots);

  // chimney lights and street lamps (small emissive spheres; bloom does the rest)
  const dotGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const redLights = halls.filter((h) => h.chimney).map((h) => { const s = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.25, 0.15), toneMapped: false })); s.position.set(h.x, h.y, h.z); scene.add(s); return s; });
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...look.lamp), toneMapped: false });
  const lamps = new THREE.InstancedMesh(dotGeo, lampMat, 120); { const o = new THREE.Object3D(); let k = 0;
    for (const [, z] of roads) for (let x = -200; x < 120 && k < 120; x += 8) { o.position.set(x, 3.2, z + 2); o.scale.setScalar(0.8); o.updateMatrix(); lamps.setMatrixAt(k++, o.matrix); }
    lamps.count = k; scene.add(lamps); }

  // trucks: headlight pairs and tail lights moving along the roads, positions a pure function of t
  const TRUCKS = 26; const truckHead = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.8), toneMapped: false }), TRUCKS * 2);
  const truckTail = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.2, 0.1), toneMapped: false }), TRUCKS * 2);
  scene.add(truckHead, truckTail);
  const trucks = Array.from({ length: TRUCKS }, (_, i) => ({ road: i % 3, dir: i % 2 ? 1 : -1, off: hash(i + 9) * 300, speed: 6 + hash(i + 3) * 5, nb: i < 7 }));

  // ---------- the newcomer: compact blocks across the river ----------
  const newco = new THREE.Group(); newco.position.set(14, 0, -40); scene.add(newco);
  const themMat = mat(look.them, look.post === 'night' ? { roughness: 0.35, metalness: 0.4 } : {});
  const blocks = [];
  const BL = [[-10, 0, 12, 5.5, 7], [3, 0, 10, 8.5, 7], [14, 0, 9, 4.5, 6], [-4, -9, 18, 3.6, 6], [11, -9, 8, 11, 6]];
  for (const [x, z, w, h, d] of BL) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), themMat); b.position.set(x, h / 2, z); b.castShadow = b.receiveShadow = true; newco.add(b); blocks.push({ m: b, x, z, w, h, d }); }
  const themSlots = [];
  for (const b of blocks) { const rows = Math.floor((b.h - 0.5) / 0.5), cols = Math.floor((b.w - 0.6) / 0.42);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) themSlots.push([b.x - b.w / 2 + 0.5 + c * 0.42, 0.5 + r * 0.5, b.z + b.d / 2 + 0.02]); }
  const themList = pick(themSlots, Math.min(THEM1, themSlots.length));
  const winThem = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), themList.length);
  { const o = new THREE.Object3D(); themList.forEach((s, i) => { o.position.set(...s); o.updateMatrix(); winThem.setMatrixAt(i, o.matrix); winThem.setColorAt(i, new THREE.Color(0, 0, 0)); }); newco.add(winThem); }
  const beacon = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(...look.cool).multiplyScalar(1.4), toneMapped: false })); beacon.position.set(11, 11.6, -9); beacon.scale.setScalar(1.6); newco.add(beacon);

  // pools of light on the ground: they keep both towns standing on the land, not floating in the dark
  const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const pool = (color, x, z, sx, sz, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(...color).multiplyScalar(k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z); scene.add(m); return m; };
  const poolYou = look.post === 'night' ? pool(look.warm, -2, 26, 150, 80, 0.05) : null;
  const poolThem = look.post === 'night' ? pool(look.cool, 16, -40, 70, 40, 0.09) : null;

  // ---------- post ----------
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  const grain = new GrainEffect(look.post === 'paper' ? 0.015 : 0.018);
  const effects = look.post === 'paper'
    ? [new TiltShiftEffect({ offset: 0.12, rotation: 0.0, focusArea: 0.42, feather: 0.32, bias: 0.06, kernelSize: 3 }), new ToneMappingEffect({ mode: ToneMappingMode.AGX }), new VignetteEffect({ offset: 0.35, darkness: 0.35 }), grain]
    : [new BloomEffect({ luminanceThreshold: 0.95, luminanceSmoothing: 0.25, intensity: 2.0, radius: 0.78, mipmapBlur: true }), new ToneMappingEffect({ mode: ToneMappingMode.AGX }), new VignetteEffect({ offset: 0.28, darkness: 0.72 }), grain];
  composer.addPass(new EffectPass(camera, ...effects));

  const C = new THREE.Color(), WARM = new THREE.Color(...look.warm), COOL = new THREE.Color(...look.cool), OFF = new THREE.Color(...look.off);
  const setWin = (mesh, i, col, k = 1) => { C.copy(col).multiplyScalar(k); mesh.setColorAt(i, C); };

  // state of the world in each beat, as a function of u = t / dur (0..1)
  function state(beat, t, dur) {
    const u = clamp(t / Math.max(0.1, dur));
    // how much of the town is lit; the neighbour's conversion; the newcomer's growth; the new light inside yours
    const S = { on: 1, nb: 0, nbFast: 0, build: 0, them: 0, inside: 0 };
    if (beat === 'open') { S.on = 0.12 + 0.88 * smooth(u / 0.55); }
    if (beat === 'neighbor') { S.nb = smooth((u - 0.15) / 0.7); S.nbFast = S.nb; }
    if (beat === 'newcomer') { S.nb = 1; S.nbFast = 1; S.build = clamp((u - 0.08) / 0.5); S.them = lerp(THEM0, Math.round((THEM0 + THEM1) / 2.4), smooth((u - 0.45) / 0.45)) * smooth((u - 0.35) / 0.15); }
    if (beat === 'finale') { S.nb = 1; S.nbFast = 1; S.build = 1; S.them = lerp(Math.round((THEM0 + THEM1) / 2.4), THEM1, smooth(u / 0.6)); S.inside = smooth((u - 0.55) / 0.35); }
    return S;
  }

  function cameraFor(beat, t, dur) {
    const u = inertia(t / Math.max(0.1, dur));
    let p, q;
    if (beat === 'open') { p = [lerp(-58, -46, u), lerp(2.4, 30, u), lerp(68, 104, u)]; q = [lerp(-44, -4, u), lerp(3, 0, u), lerp(52, 14, u)]; }
    else if (beat === 'neighbor') { p = [lerp(-104, -114, u), lerp(11, 14, u), lerp(84, 92, u)]; q = [lerp(-126, -132, u), 1.5, lerp(30, 26, u)]; }
    else if (beat === 'newcomer') { p = [lerp(58, 44, u), lerp(9, 6, u), lerp(10, -4, u)]; q = [lerp(22, 16, u), lerp(2, 4, u), lerp(-36, -42, u)]; }
    else { p = [lerp(-14, -26, u), lerp(34, 58, u), lerp(96, 124, u)]; q = [lerp(-6, -10, u), 0, lerp(4, -12, u)]; }
    camera.position.set(...p); camera.lookAt(...q);
  }

  function render(beat, t, dur) {
    const S = state(beat, t, dur);
    cameraFor(beat, t, dur);
    // your windows: the shift comes on in a wave from the first site to the last; in the finale one site turns cool
    const insideSite = Math.min(SITES - 1, 2);
    youSlots.forEach((s, i) => {
      const order = (s[3] / SITES) * 0.7 + hash(i * 1.37) * 0.3;
      const lit = order < S.on && hash(i + 0.21) < 0.97;
      if (!lit) return setWin(winYou, i, OFF);
      const flick = 0.85 + 0.15 * hash(i * 3.1);
      if (S.inside > 0 && s[3] === insideSite && hash(i * 7.7) < S.inside) return setWin(winYou, i, COOL, flick * 1.1);
      setWin(winYou, i, WARM, flick);
    });
    winYou.instanceColor.needsUpdate = true;
    // the neighbour: a wave of change runs along its halls; fewer windows, cooler and brighter
    nbSlots.forEach((s, i) => {
      const front = s[4] * 0.6 + (s[3] / 5) * 0.4, changed = front < S.nb * 1.05;
      if (!changed) return setWin(winNb, i, WARM, 0.85 + 0.15 * hash(i * 2.3));
      if (hash(i + 4.4) < 0.45) return setWin(winNb, i, OFF);
      setWin(winNb, i, COOL, 1.05 + 0.2 * hash(i * 5.1));
    });
    winNb.instanceColor.needsUpdate = true;
    // the newcomer: blocks drop into place one by one, then its windows light
    blocks.forEach((b, k) => { const a = smooth((S.build - k * 0.14) / 0.3); b.m.visible = a > 0.001; b.m.scale.set(1, Math.max(0.001, a), 1); b.m.position.y = (b.h / 2) * a; });
    const nThem = Math.round(S.them);
    themList.forEach((s, i) => setWin(winThem, i, i < nThem ? COOL : OFF, i < nThem ? 1.2 : 1));
    winThem.instanceColor.needsUpdate = true; winThem.visible = S.build > 0.4;
    beacon.visible = S.build > 0.95;
    if (poolYou) poolYou.material.opacity = 0.35 + 0.65 * S.on;
    if (poolThem) poolThem.material.opacity = clamp(nThem / THEM1) * 0.8 + 0.2 * S.build;
    // blinking lights and moving trucks
    redLights.forEach((r, i) => { r.visible = ((t + i * 0.37) % 1.6) < 0.8; });
    const o = new THREE.Object3D(); let kh = 0;
    trucks.forEach((tr, i) => {
      const [, z] = roads[tr.road]; const sp = tr.speed * (tr.nb ? 1 + 1.6 * S.nbFast : 1);
      const span = 320, x = -210 + ((tr.off + tr.dir * sp * t) % span + span) % span;
      const zz = z + (tr.dir > 0 ? 0.6 : -0.6);
      for (const side of [-0.35, 0.35]) {
        o.position.set(x + tr.dir * 1.2, 0.55, zz + side); o.scale.setScalar(0.7); o.updateMatrix(); truckHead.setMatrixAt(kh, o.matrix);
        o.position.set(x - tr.dir * 1.2, 0.55, zz + side); o.updateMatrix(); truckTail.setMatrixAt(kh, o.matrix); kh++;
      }
    });
    truckHead.instanceMatrix.needsUpdate = truckTail.instanceMatrix.needsUpdate = true;
    grain.uniforms.get('frame').value = Math.round(t * 30) % 997;
    composer.render(0);
  }

  return { render, dispose: () => { composer.dispose(); renderer.dispose(); }, info: { you: youSlots.length, slotsYou: slots.you.length, them: themList.length } };
}
