import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ANNOTATIONS, GROUPS, TOUR, EQ_3D, TASK_PARTS } from './content.js';

// Fassung: index.html = Vollfassung (alles sichtbar), index.html?aufgabe = Schülerfassung (ohne Lösungen, Nummern 1–6 wie Abb. A)
const AUFGABE = new URLSearchParams(location.search).has('aufgabe');
document.body.classList.toggle('tasks', AUFGABE);

const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const DEG = Math.PI / 180;

const TOUCH = matchMedia('(pointer: coarse)').matches;
const LOW = TOUCH || (navigator.hardwareConcurrency || 8) <= 4;

// ------------------------------------------------------------------ renderer / scene
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const pixelRatio = Math.min(window.devicePixelRatio, LOW ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;

const BG = new THREE.Color('#060c18');
const scene = new THREE.Scene();
scene.background = BG;
scene.fog = new THREE.FogExp2(BG, 0.004);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.38;

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.2, 800);
camera.position.set(0, 10, 90);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.zoomToCursor = true;
controls.minDistance = 5;
controls.maxDistance = 110;
controls.screenSpacePanning = true;

scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x120d10, 0.55));
const key = new THREE.DirectionalLight(0xfff0da, 2.2);
key.position.set(-25, 35, 30);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6fb6ff, 1.4);
rim.position.set(30, 18, -40);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xcfe2ff, 0.5);
fill.position.set(10, -20, 30);
scene.add(fill);
const lampLight = new THREE.PointLight(0xffe9a8, 0, 18, 1.6);
scene.add(lampLight);

// Schwebende Partikel für Tiefe
(() => {
  const n = 1200, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = THREE.MathUtils.randFloat(30, 120), th = Math.random() * Math.PI * 2, ph = Math.acos(THREE.MathUtils.randFloatSpread(2));
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(th)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size: 0.5, map: dotTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), color: 0x86b6e8, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(g, m));
})();

function dotTexture(inner, outer, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '.45)'));
  gr.addColorStop(1, outer);
  x.fillStyle = gr;
  x.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// ------------------------------------------------------------------ post-processing
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: LOW ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(pixelRatio);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
let gtao = null;
if (!LOW) {
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.4, thickness: 0.5, scale: 1.0, samples: 12 });
  gtao.blendIntensity = 0.6;
  composer.addPass(gtao);
}
const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
Object.assign(outline, { edgeStrength: 3.5, edgeGlow: 0.5, edgeThickness: 1.2, pulsePeriod: 0 });
outline.visibleEdgeColor.set('#ffb35c');
outline.hiddenEdgeColor.set('#3a2408');
composer.addPass(outline);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.5, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ------------------------------------------------------------------ Zustand
const state = {
  playing: false, tourIdx: 0, tourT: 0, labels: true, crystal: false, arrows: false, eqs: false, anode: false,
  tasks: AUFGABE, selected: null, flight: null, zoomGoal: null, highlight: [], taskSel: null, taskSolved: new Set(),
};
// Akku-Prozess: s = Entladefortschritt (0 = voll, 1 = leer)
const proc = { s: 0, dir: 0, running: false, speed: 0.06, to: null, loop: false, device: 'lampe', glow: 0, pause: 0 };
const nodes = {};
const meshes = [];
let meta = null;
const parts = { li: [], e: [], co: [], liPaths: [], ePaths: [] };

// ------------------------------------------------------------------ Laden
const loader = new GLTFLoader();
const metaP = fetch('models/meta.json').then((r) => r.json());
loader.load(
  'models/akku.glb',
  async (gltf) => {
    meta = await metaP;
    setup(gltf);
    $('loadBar').style.width = '100%';
    $('loader').classList.add('done');
  },
  (e) => {
    if (e.total) {
      const p = Math.min(100, Math.round((e.loaded / e.total) * 100));
      $('loadBar').style.width = p + '%';
      $('loadPct').textContent = p + ' %';
    }
  },
  (err) => { $('loadPct').textContent = 'Fehler beim Laden: ' + err.message; },
);

// ------------------------------------------------------------------ Aufbau
const LAMP_OFF = new THREE.Color('#9c977f'), LAMP_ON = new THREE.Color('#fff7c2');
const TRANSPARENT = { Elektrolyt: 0.1, Lampe: 0.86 };
const KRISTALL = ['Graphit_Kristall_C', 'Graphit_Kristall_Bindung', 'Oxid_Kristall_Co', 'Oxid_Kristall_O', ...[1, 2, 3, 4, 5, 6].map((k) => `C6k_${k}`)];
const SCHEMA = ['Graphit_Schichten', 'Oxid_Schichten', ...[1, 2, 3, 4, 5, 6].map((k) => `C6s_${k}`)];

function physical(src) {
  const name = src.name;
  const tr = TRANSPARENT[name];
  const m = new THREE.MeshPhysicalMaterial({
    name, color: src.color.clone(), roughness: Math.max(0.25, src.roughness ?? 0.5), metalness: src.metalness ?? 0,
    clearcoat: ['Li', 'Elektron', 'Lampe', 'Oxid'].includes(name) || name.startsWith('Co_') ? 0.6 : 0.1, clearcoatRoughness: 0.3,
    emissive: src.emissive?.clone() ?? new THREE.Color(0), emissiveIntensity: src.emissiveIntensity ?? 1,
    transparent: tr != null, opacity: tr ?? 1, depthWrite: tr == null,
  });
  if (name === 'Elektrolyt') m.side = THREE.DoubleSide;
  if (name === 'Pol' || name.startsWith('Pfeil')) m.emissiveIntensity = 0.12;
  if (name === 'Pol') m.color.set('#c3cddb');
  if (name === 'Lader') m.color.set('#aab3bf');   // hell, aber unter der Bloom-Schwelle
  if (name === 'Buchse') m.color.set('#8d96a2');
  return m;
}

function register(o) {
  o.geometry.computeBoundingBox();
  o.geometry.computeBoundingSphere();
  o.userData = { ...o.userData, base: o.material.color.clone(), baseEmissive: o.material.emissive.clone(), ann: null };
  meshes.push(o);
}

function setup(gltf) {
  const root = gltf.scene;
  scene.add(root);
  root.traverse((o) => { if (o.name) nodes[o.name] = o; });
  const protos = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = physical(o.material);
    if (o.material.transparent) o.renderOrder = o.name === 'Elektrolyt' ? 30 : 31;
    if (/_Vorlage$|_Zeichen$|^Inst_/.test(o.name)) { o.visible = false; protos.push(o); return; }
    register(o);
  });

  // Kugelgitter als InstancedMesh (Positionen aus meta.json)
  for (const [name, def] of Object.entries(meta.instances)) {
    const p = nodes[def.proto];
    const im = new THREE.InstancedMesh(p.geometry, p.material.clone(), def.pos.length);
    const mtx = new THREE.Matrix4();
    def.pos.forEach((q, i) => im.setMatrixAt(i, mtx.makeTranslation(q[0], q[1], q[2])));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.computeBoundingBox?.();
    im.name = name;
    scene.add(im);
    nodes[name] = im;
    register(im);
  }

  // Bewegliche Teilchen: 6 wandernde Li⁺ + 2 im Elektrolyten, 6 Elektronen
  const mkParticle = (name, sphere, sign) => {
    const s = new THREE.Mesh(sphere.geometry, sphere.material);
    s.name = name;
    const z = new THREE.Mesh(sign.geometry, sign.material);
    z.name = name + '_Zeichen';
    s.add(z);
    scene.add(s);
    nodes[name] = s;
    register(s);
    register(z);
    return s;
  };
  for (let i = 0; i < 8; i++) parts.li.push(mkParticle(`Li_${i + 1}`, nodes.Li_Vorlage, nodes.Li_Zeichen));
  for (let i = 0; i < 6; i++) parts.e.push(mkParticle(`e_${i + 1}`, nodes.e_Vorlage, nodes.e_Zeichen));
  parts.liPaths = meta.li.map((d) => d.path.map((p) => new THREE.Vector3().fromArray(p)));
  parts.ePaths = meta.e.map((d) => d.path.map((p) => new THREE.Vector3().fromArray(p)));
  parts.co = [1, 2, 3, 4, 5, 6].map((k) => nodes[`Co_${k}`]);
  parts.co4 = new THREE.Color(meta.colors.co4);
  parts.co3 = new THREE.Color(meta.colors.co3);
  parts.elyt = meta.elyt.map((p) => new THREE.Vector3().fromArray(p));
  for (const c of parts.co) c.material = c.material.clone();
  // C₆-Einheiten: Schema- und Kristall-Ring teilen sich je ein Material (C₆⁻ rötlich ↔ C₆ grau)
  parts.c6 = [1, 2, 3, 4, 5, 6].map((k) => {
    const m = nodes[`C6s_${k}`].material.clone();
    nodes[`C6s_${k}`].material = m;
    nodes[`C6k_${k}`].material = m;
    return m;
  });
  parts.c6m = new THREE.Color(meta.colors.c6m);
  parts.c6n = new THREE.Color(meta.colors.c6);
  parts.c6pos = meta.c6.map((p) => new THREE.Vector3().fromArray(p));

  for (const n of KRISTALL) if (nodes[n]) nodes[n].visible = false;
  for (const n of ['Pfeil_e', 'Pfeil_Li']) { nodes[n].userData.noPick = true; nodes[n].visible = false; }
  nodes.Elektrolyt.userData.noPick = true;
  nodes.Lampe_Glas.material.emissive.set('#ffe08a');

  for (const a of ANNOTATIONS) a.list = meshesFor(a);
  for (const o of meshes) o.userData.ann = annotationForName(o.name);

  buildUI();
  computeHome();
  goToStep(0, { instant: true });
  camera.position.copy(state.flight.toPos).sub(state.flight.toTarget).multiplyScalar(1.8).add(state.flight.toTarget);
  state.flight.fromPos.copy(camera.position);
}

const matchName = (p, name) => (p.endsWith('_') ? name.startsWith(p) : name === p);
function annotationForName(name) {
  for (const a of ANNOTATIONS) for (const p of a.meshes) if (matchName(p, name)) return a;
  return null;
}
function meshesFor(a) { return meshes.filter((o) => a.meshes.some((p) => matchName(p, o.name))); }
const annById = (id) => ANNOTATIONS.find((a) => a.id === id);

// ------------------------------------------------------------------ Kamera
function computeHome() {
  const aspect = innerWidth / innerHeight;
  state.distScale = aspect >= 1.45 ? 1 : 1.45 / aspect;   // ganze Zelle auch im Hochformat sichtbar
}
function viewToPose(v) {
  const t = new THREE.Vector3().fromArray(v.t || [0, 0, 0]);
  // Übersicht ist auf breiten Bildschirmen nach links versetzt (Platz für die Stationskarte); schmal: mittig
  if (innerWidth < 1000 && Math.abs(t.x) < 3) t.x = 0;
  const d = Math.min(v.d * state.distScale, controls.maxDistance * 0.95);
  const az = v.az * DEG, el = v.el * DEG;
  const p = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(d).add(t);
  return { pos: p, target: t };
}
function flyTo(pos, target, dur = 1.6) {
  state.flight = { fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos: pos.clone(), toTarget: target.clone(), t: 0, dur };
}
function resetView() {
  const p = viewToPose(TOUR[state.tourIdx].view);
  flyTo(p.pos, p.target);
}
function focusOn(a) {
  const box = new THREE.Box3();
  for (const o of a.list) if (o.visible) box.expandByObject(o);
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3());
  const r = box.getSize(new THREE.Vector3()).length() * 0.5;
  const dir = camera.position.clone().sub(controls.target).normalize();
  const dist = clamp((r / Math.sin((camera.fov * DEG) / 2)) * 1.1, 8, 60);
  flyTo(c.clone().addScaledVector(dir, dist), c, 1.2);
}
canvas.addEventListener('pointerdown', () => { state.flight = null; state.zoomGoal = null; });
canvas.addEventListener('wheel', () => { state.flight = null; state.zoomGoal = null; }, { passive: true });

// ------------------------------------------------------------------ Akku-Prozess
function setProcess({ from, run = 0, to = null, speed = 0.06, loop = false, device = 'lampe' }) {
  if (from != null) proc.s = from;
  proc.dir = run;
  proc.running = run !== 0;
  proc.to = to;
  proc.speed = speed;
  proc.loop = loop;
  proc.device = device;
  proc.pause = 0;
  updateProcButtons();
}
function startDischarge() {
  stopTour();
  setProcess({ from: proc.s >= 0.999 ? 0 : null, run: 1, speed: 0.06, device: 'lampe' });
}
function startCharge() {
  stopTour();
  setProcess({ from: proc.s <= 0.001 ? 1 : null, run: -1, speed: 0.06, device: 'lader' });
}
function holdProcess() {
  stopTour();
  proc.running = false;
  updateProcButtons();
}
function stopTour() {
  if (!state.playing) return;
  state.playing = false;
  $('play').classList.add('paused');
}
function updateProcButtons() {
  $('btnDischarge').classList.toggle('on', proc.running && proc.dir > 0);
  $('btnCharge').classList.toggle('on', proc.running && proc.dir < 0);
}

function stepProcess(dt) {
  if (proc.pause > 0) {
    proc.pause -= dt;
    if (proc.pause <= 0) {
      proc.dir = -proc.dir;
      proc.device = proc.dir > 0 ? 'lampe' : 'lader';
      proc.running = true;
      updateProcButtons();
    }
    return;
  }
  if (!proc.running) return;
  proc.s += proc.dir * proc.speed * dt;
  const hitTo = proc.to != null && (proc.dir > 0 ? proc.s >= proc.to : proc.s <= proc.to);
  if (hitTo) { proc.s = proc.to; proc.running = false; updateProcButtons(); }
  if (proc.s >= 1 || proc.s <= 0) {
    proc.s = clamp(proc.s, 0, 1);
    if (proc.loop) { proc.pause = 1.4; proc.running = false; }
    else { proc.running = false; updateProcButtons(); }
  }
}

function samplePath(P, u, out) {
  const f = u * (P.length - 1);
  const k = Math.min(Math.floor(f), P.length - 2);
  return out.lerpVectors(P[k], P[k + 1], f - k);
}

const procInfo = { inG: 6, inO: 0, co4: 6, c6m: 6, u: [] };
function updateParticles(time, dt) {
  const W = meta.windows;
  let sumU = 0, inG = 0, inO = 0, co4 = 0, c6m = 0, transit = 0;
  for (let i = 0; i < 6; i++) {
    const u = smooth01((proc.s - W[i][0]) / (W[i][1] - W[i][0]));
    procInfo.u[i] = u;
    sumU += u;
    if (u < 0.02) inG++; else if (u > 0.98) inO++; else transit++;
    samplePath(parts.liPaths[i], u, parts.li[i].position);
    const e = parts.e[i];
    samplePath(parts.ePaths[i], u, e.position);
    // Farbwechsel erst, wenn das Elektron das Cobalt-Ion erreicht (bzw. den C₆-Ring verlässt)
    const ua = meta.u_arrive[i], ud = meta.u_depart[i];
    e.visible = u < ua + 0.4 * (1 - ua);
    const c = smooth01((u - ua) / Math.max(1e-3, 0.8 * (1 - ua)));
    if (c < 0.5) co4++;
    parts.co[i].material.color.copy(parts.co4).lerp(parts.co3, c);
    parts.co[i].material.emissive.copy(parts.co[i].material.color).multiplyScalar(0.18 * (1 - c));
    const g = smooth01(u / Math.max(1e-3, ud));   // 0 = C₆⁻ (Elektron im Ring), 1 = C₆
    if (g < 0.5) c6m++;
    parts.c6[i].color.copy(parts.c6m).lerp(parts.c6n, g);
    parts.c6[i].emissive.copy(parts.c6[i].color).multiplyScalar(0.3 * (1 - g));
  }
  parts.elyt.forEach((p, k) => {
    const ph = time * 0.9 + k * 2.1;
    parts.li[6 + k].position.set(p.x + 0.22 * Math.sin(ph), p.y + 0.22 * Math.cos(ph * 1.3), p.z - 0.13 * Math.sin(ph * 0.7 + 1));
  });
  // Zeichen (+ / −) zeigen immer zur Kamera
  for (const o of [...parts.li, ...parts.e]) o.children[0].quaternion.copy(camera.quaternion);
  Object.assign(procInfo, { inG, inO, co4, c6m, charge: 1 - sumU / 6, transit });

  // Gerät: Lämpchen oder Ladegerät
  const lader = proc.device === 'lader';
  for (const o of meshes) {
    if (o.name.startsWith('Lampe_')) o.visible = !lader;
    else if (o.name === 'Ladegeraet' || o.name.startsWith('Ladegeraet_')) o.visible = lader;
    else if (o.name.startsWith('Pol_Lader_')) o.visible = lader && state.arrows;
  }
  const glowGoal = proc.running && proc.dir > 0 && !lader && transit > 0 ? 1 : 0;
  proc.glow = damp(proc.glow, glowGoal, 5, dt);
  nodes.Lampe_Glas.material.emissiveIntensity = 3.2 * proc.glow;
  nodes.Lampe_Glas.material.color.copy(LAMP_OFF).lerp(LAMP_ON, proc.glow);
  lampLight.position.fromArray(meta.anchors.lampe).y -= 0.75;
  lampLight.intensity = 60 * proc.glow;

  // Pfeile: Richtung nach Gerät (Lämpchen = Entladen, Ladegerät = Laden)
  const dir = lader ? -1 : 1;
  for (const n of ['Pfeil_e', 'Pfeil_Li']) {
    nodes[n].visible = state.arrows;
    nodes[n].scale.x = dir;
  }
}

// ------------------------------------------------------------------ UI
const hotspots = [];
const tags = [];
function buildUI() {
  const list = $('partList');
  let n = 0;
  GROUPS.forEach(([label, ids]) => {
    list.insertAdjacentHTML('beforeend', `<li class="grp">${label}</li>`);
    for (const id of ids) {
      const a = annById(id);
      a.no = ++n;
      const li = document.createElement('li');
      li.innerHTML = `<button data-id="${a.id}"><span class="n">${String(a.no).padStart(2, '0')}</span><span class="dot" style="background:${a.color}"></span><span>${a.title}</span></button>`;
      li.firstChild.addEventListener('click', () => select(a.id, true));
      list.appendChild(li);
    }
  });
  $('partCount').textContent = `· ${n}`;
  $('indexToggle').addEventListener('click', () => {
    const c = $('index').classList.toggle('collapsed');
    $('indexToggle').setAttribute('aria-expanded', String(!c));
  });
  if (innerWidth < 1100 || innerHeight < 760) $('index').classList.add('collapsed');

  const host = $('hotspots');
  for (const a of ANNOTATIONS) {
    const el = document.createElement('button');
    el.className = 'hs';
    el.style.setProperty('--c', a.color);
    el.setAttribute('aria-label', a.title);
    el.innerHTML = `<span class="ring">${a.no}</span><span class="lbl">${a.title}</span>`;
    el.addEventListener('click', (ev) => { ev.stopPropagation(); select(a.id); });
    host.appendChild(el);
    hotspots.push({ a, el, anchor: a.anchor, pos: new THREE.Vector3(), task: false });
  }
  for (const t of TASK_PARTS) {
    const el = document.createElement('button');
    el.className = 'hs num gone';
    el.setAttribute('aria-label', `Teil ${t.no}`);
    el.innerHTML = `<span class="ring">${t.no}</span><span class="lbl"></span>`;
    el.addEventListener('click', (ev) => { ev.stopPropagation(); selectTask(t); });
    host.appendChild(el);
    hotspots.push({ a: annById(t.id), t, el, anchor: t.anchor, pos: new THREE.Vector3(), task: true });
  }

  // 3D-Beschriftungen: Co-Ionen, Pfeile, Anode/Kathode, Gleichungen
  const mkTag = (cls, html, get) => {
    const el = document.createElement('div');
    el.className = 'tag gone ' + cls;
    el.innerHTML = `<span>${html}</span>`;
    host.appendChild(el);
    const t = { el, get, show: () => false, span: el.firstChild };
    tags.push(t);
    return t;
  };
  parts.co.forEach((c, i) => {
    const t = mkTag('co4', 'Co⁴⁺', (v) => v.copy(c.position).add(new THREE.Vector3(0, 0.28, 0.25)));
    t.show = () => state.labels && (state.tasks || TOUR[state.tourIdx].coLabels || state.selected?.id === 'cobalt');
    t.update = () => {
      const four = procInfo.u[i] < meta.u_arrive[i] + 0.4 * (1 - meta.u_arrive[i]);
      t.el.classList.toggle('co4', four);
      t.el.classList.toggle('co3', !four);
      t.span.textContent = four ? 'Co⁴⁺' : 'Co³⁺';
    };
  });
  parts.c6pos.forEach((c, i) => {
    const t = mkTag('c6m', 'C₆⁻', (v) => v.copy(c).add(new THREE.Vector3(0.75, 0.05, 0.35)));
    t.show = () => state.labels && (state.tasks || TOUR[state.tourIdx].c6Labels || state.selected?.id === 'c6');
    t.update = () => {
      const minus = procInfo.u[i] < meta.u_depart[i] * 0.5;
      t.el.classList.toggle('c6m', minus);
      t.el.classList.toggle('c6', !minus);
      t.span.textContent = minus ? 'C₆⁻' : 'C₆';
    };
  });
  mkTag('e', 'e⁻', (v) => v.copy(nodes.Pfeil_e.position).add(new THREE.Vector3(0, 0.7, 0))).show = () => state.arrows;
  mkTag('li', 'Li⁺', (v) => v.copy(nodes.Pfeil_Li.position).add(new THREE.Vector3(0, -0.2, 0))).show = () => state.arrows;
  const anodeTag = (anchor, isGraphit) => {
    const t = mkTag('big anode', 'Anode', (v) => v.fromArray(meta.anchors[anchor]).add(new THREE.Vector3(0, 1.2, 0)));
    t.show = () => state.anode && !state.tasks;
    t.update = () => {
      const anode = (proc.device === 'lampe') === isGraphit;
      t.el.classList.toggle('anode', anode);
      t.el.classList.toggle('kathode', !anode);
      t.span.textContent = anode ? 'Anode · Oxidation' : 'Kathode · Reduktion';
    };
  };
  anodeTag('graphit', true);
  anodeTag('oxid', false);
  for (const side of ['links', 'rechts']) {
    const el = document.createElement('div');
    el.className = 'eqbox gone';
    el.innerHTML = '<div><small></small><strong></strong></div>';
    host.appendChild(el);
    const t = { el, get: (v) => v.fromArray(meta.anchors['eq_' + side]), show: () => state.eqs, box: true };
    t.update = () => {
      const [k, f] = EQ_3D[proc.device === 'lader' ? 'laden' : 'entladen'][side];
      el.querySelector('small').textContent = k;
      el.querySelector('strong').textContent = f;
    };
    tags.push(t);
  }

  if (AUFGABE) document.querySelector('.eyebrow').textContent = 'Elektrochemie · Klasse 9 · Aufgabenfassung';
  buildTimeline();

  $('play').addEventListener('click', togglePlay);
  $('scrub').addEventListener('input', () => {
    const v = +$('scrub').value / 1000;
    const i = Math.floor(v);
    if (i !== state.tourIdx) goToStep(i);
    state.tourT = (v - i) * TOUR[state.tourIdx].seconds;
  });
  $('phasePrev').addEventListener('click', () => step(-1));
  $('phaseNext').addEventListener('click', () => step(1));
  $('btnDischarge').addEventListener('click', startDischarge);
  $('btnCharge').addEventListener('click', startCharge);
  $('btnHold').addEventListener('click', holdProcess);

  chip('crystal', () => setCrystal(!state.crystal));
  chip('arrows', () => setArrows(!state.arrows));
  chip('eqs', () => setEqs(!state.eqs));
  chip('labels', () => {
    state.labels = !state.labels;
    setChip('labels', state.labels);
    $('hotspots').classList.toggle('hide-labels', !state.labels);
  });
  $('reset').addEventListener('click', resetView);
  $('infoClose').addEventListener('click', () => select(null));
  $('infoFocus').addEventListener('click', () => (state.selected || state.taskSel) && focusOn(state.taskSel ? annById(state.taskSel.id) : state.selected));
  const cycle = (d) => {
    if (state.tasks) {
      const i = state.taskSel ? TASK_PARTS.indexOf(state.taskSel) : -1;
      selectTask(TASK_PARTS[(i + d + TASK_PARTS.length) % TASK_PARTS.length]);
      return;
    }
    const order = [...ANNOTATIONS].sort((x, y) => x.no - y.no);
    const i = state.selected ? order.indexOf(state.selected) : -1;
    select(order[(i + d + order.length) % order.length].id, true);
  };
  $('infoPrev').addEventListener('click', () => cycle(-1));
  $('infoNext').addEventListener('click', () => cycle(1));

  const slider = $('zoomSlider');
  slider.addEventListener('input', () => { state.zoomGoal = sliderToDist(+slider.value); state.sliderActive = true; state.flight = null; });
  slider.addEventListener('change', () => { state.sliderActive = false; });
  $('zoomIn').addEventListener('click', () => { state.flight = null; state.zoomGoal = clamp(currentDist() / 1.5, controls.minDistance, controls.maxDistance); });
  $('zoomOut').addEventListener('click', () => { state.flight = null; state.zoomGoal = clamp(currentDist() * 1.5, controls.minDistance, controls.maxDistance); });

  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.key === 'Escape') select(null);
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'k' || e.key === 'K') setCrystal(!state.crystal);
    if (!AUFGABE && (e.key === 'p' || e.key === 'P')) setArrows(!state.arrows);
    if (!AUFGABE && (e.key === 'g' || e.key === 'G')) setEqs(!state.eqs);
    if (e.key === '+' || e.key === '=') $('zoomIn').click();
    if (e.key === '-') $('zoomOut').click();
  });

  // Picking (im Aufgabenmodus aus, damit keine Namen verraten werden)
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || state.tasks) return;
    const hit = pick(e.clientX, e.clientY);
    select(hit ? hit.id : null);
  });
  if (!TOUCH) {
    let raf = 0;
    canvas.addEventListener('pointermove', (e) => {
      if (raf || e.buttons) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const a = state.tasks ? null : pick(e.clientX, e.clientY);
        const tip = $('hoverTip');
        tip.classList.toggle('on', !!a);
        canvas.style.cursor = a ? 'pointer' : '';
        if (a) {
          tip.textContent = a.title;
          tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`;
        }
      });
    });
  }
}

function buildTimeline() {
  const ticks = $('ticks');
  ticks.innerHTML = '';
  TOUR.forEach((s, i) => {
    const x = (i / TOUR.length) * 100;
    ticks.insertAdjacentHTML('beforeend', `<i style="left:${x}%"></i><span style="left:${x + 50 / TOUR.length}%">${i + 1}</span>`);
  });
  $('phaseTrack').innerHTML = TOUR.map(() => '<i style="--w:1"><b></b></i>').join('');
  $('scrub').max = String(TOUR.length * 1000 - 1);
}

function chip(id, fn) { $(id).addEventListener('click', fn); }
function setChip(id, on) {
  $(id).classList.toggle('on', on);
  $(id).setAttribute('aria-pressed', String(on));
}
function setCrystal(on) {
  state.crystal = on;
  setChip('crystal', on);
  for (const n of KRISTALL) if (nodes[n]) nodes[n].visible = on;
  for (const n of SCHEMA) if (nodes[n]) nodes[n].visible = !on;
}
function setArrows(on) {
  state.arrows = on;
  setChip('arrows', on);
}
function setEqs(on) {
  state.eqs = on;
  setChip('eqs', on);
}

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pickables() {
  return meshes.filter((o) => o.visible && o.userData.ann && !o.userData.noPick && (!o.parent || o.parent.visible !== false));
}
function pick(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(pickables(), false);
  return hits.length ? hits[0].object.userData.ann : null;
}

function openInfo(color, kicker, title, text, facts) {
  const info = $('info');
  info.style.setProperty('--c', color);
  $('infoKicker').textContent = kicker;
  $('infoTitle').textContent = title;
  $('infoText').textContent = text;
  $('infoFacts').innerHTML = (facts || []).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  info.classList.add('open');
  info.setAttribute('aria-hidden', 'false');
}
function closeInfo() {
  $('info').classList.remove('open');
  $('info').setAttribute('aria-hidden', 'true');
}

function select(id, fly = false) {
  const a = id ? annById(id) : null;
  state.selected = a;
  state.taskSel = null;
  document.querySelectorAll('#partList button').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
  hotspots.forEach((h) => h.el.classList.toggle('active', !h.task && h.a === a));
  outline.selectedObjects = a ? a.list.filter((o) => o.visible) : highlightObjects();
  if (a) outline.visibleEdgeColor.set(a.color);
  $('infoFocus').hidden = false;
  if (!a) return closeInfo();
  openInfo(a.color, a.kicker, a.title, a.text, a.facts);
  if (fly) focusOn(a);
}

function selectTask(t) {
  state.taskSel = t;
  state.selected = null;
  hotspots.forEach((h) => h.el.classList.toggle('active', h.task && h.t === t));
  outline.selectedObjects = [];
  $('infoFocus').hidden = true;
  openInfo('#9fd0ff', `Teil ${t.no}`, 'Welches Teil ist das?', 'Benenne das Bauteil bzw. Teilchen und gib seine Funktion im Akku an (A1). Die Nummern stimmen mit Abb. A auf dem Aufgabenblatt überein.', []);
}

function highlightObjects() {
  return state.highlight.length && state.highlight.length < 4 ? state.highlight.flatMap((a) => a.list.filter((o) => o.visible)) : [];
}

// ------------------------------------------------------------------ Rundgang
function goToStep(i, { instant = false } = {}) {
  state.tourIdx = ((i % TOUR.length) + TOUR.length) % TOUR.length;
  state.tourT = 0;
  const s = TOUR[state.tourIdx];
  $('phaseNo').textContent = String(state.tourIdx + 1).padStart(2, '0');
  $('phaseStep').textContent = s.kicker;
  const h3 = $('phaseTitle');
  h3.textContent = (AUFGABE && s.titleAufgabe) || s.title;
  h3.classList.remove('swap');
  void h3.offsetWidth;
  h3.classList.add('swap');
  $('phaseText').textContent = AUFGABE ? s.aufgabe : s.text;
  // Vollfassung: Gleichungen, Pfeile, Pole und Anode/Kathode direkt; Schülerfassung: nichts davon
  setArrows(!AUFGABE && !!s.arrows);
  setEqs(!AUFGABE && !!s.eq && !s.anode);
  state.anode = !AUFGABE && !!s.anode;
  renderEq(s);
  setProcess(s.proc);
  state.highlight = (s.highlight || []).map(annById);
  select(null);
  const col = state.highlight[0]?.color || '#ffb84d';
  outline.visibleEdgeColor.set(col);
  const p = viewToPose(s.view);
  if (instant) {
    state.flight = { fromPos: p.pos.clone(), fromTarget: p.target.clone(), toPos: p.pos, toTarget: p.target, t: 0, dur: 2.4 };
    controls.target.copy(p.target);
  } else flyTo(p.pos, p.target, 1.8);
}
function step(d) { goToStep(state.tourIdx + d); }
function togglePlay() {
  state.playing = !state.playing;
  $('play').classList.toggle('paused', !state.playing);
  $('play').setAttribute('aria-label', state.playing ? 'Pause' : 'Rundgang abspielen');
}

// Gleichungen und Erklärzeilen einer Station (nur Vollfassung)
function renderEq(s) {
  const host = $('reveal');
  host.replaceChildren();
  if (AUFGABE || !s.eq) return;
  const box = document.createElement('div');
  box.className = 'rbox';
  for (const [k, f] of s.eq) {
    const row = document.createElement('div');
    row.className = 'rrow' + (/[→=]/.test(f) ? ' f' : '');
    row.innerHTML = '<b></b><span></span>';
    row.children[0].textContent = k;
    row.children[1].textContent = f;
    box.append(row);
  }
  host.append(box);
}

// ------------------------------------------------------------------ Zoom
const currentDist = () => camera.position.distanceTo(controls.target);
const sliderToDist = (v) => controls.minDistance * Math.pow(controls.maxDistance / controls.minDistance, 1 - v / 1000);
const distToSlider = (d) => 1000 * (1 - Math.log(d / controls.minDistance) / Math.log(controls.maxDistance / controls.minDistance));

// ------------------------------------------------------------------ Schleife
const clock = new THREE.Clock();
let frame = 0;
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  frame++;

  if (meta) {
    const s = TOUR[state.tourIdx];
    if (state.playing) {
      state.tourT += dt;
      if (state.tourT >= s.seconds) goToStep(state.tourIdx + 1);
    }
    {
      const prog = (state.tourIdx + Math.min(state.tourT / s.seconds, 1)) / TOUR.length;
      const scrub = $('scrub');
      if (document.activeElement !== scrub) scrub.value = String(Math.round(prog * TOUR.length * 1000));
      scrub.style.setProperty('--p', (prog * 100).toFixed(2) + '%');
      $('phaseTrack').querySelectorAll('b').forEach((b, i) => {
        const p = i < state.tourIdx ? 100 : i > state.tourIdx ? 0 : Math.min(state.tourT / s.seconds, 1) * 100;
        b.style.width = p + '%';
      });
    }
    stepProcess(dt);
    updateParticles(time, dt);

    // Hervorhebung der besprochenen Bauteile
    const pulseT = 0.5 + 0.5 * Math.sin(time * 3.2);
    for (const o of meshes) {
      const u = o.userData, m = o.material;
      if (!u.ann || o.name.startsWith('Co_') || o.name.startsWith('C6') || o.name === 'Lampe_Glas') continue;
      const hl = state.highlight.includes(u.ann);
      if (hl) m.emissive.copy(m.color).multiplyScalar(0.05 + 0.1 * pulseT);
      else m.emissive.copy(u.baseEmissive);
    }
    if (!state.selected && !state.taskSel) outline.selectedObjects = highlightObjects();
  }

  // Kameraflug
  if (state.flight) {
    const f = state.flight;
    f.t += dt / f.dur;
    const k = easeInOut(Math.min(f.t, 1));
    camera.position.lerpVectors(f.fromPos, f.toPos, k);
    controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
    if (f.t >= 1) state.flight = null;
  } else if (state.zoomGoal) {
    const d = currentDist();
    const nd = damp(d, state.zoomGoal, 8, dt);
    camera.position.sub(controls.target).setLength(nd).add(controls.target);
    if (Math.abs(nd - state.zoomGoal) < 0.01) state.zoomGoal = null;
  }
  controls.update();

  if (meta) {
    updateHotspots();
    updateTags();
    if (!state.sliderActive) $('zoomSlider').value = String(Math.round(distToSlider(currentDist())));
    if (frame % 6 === 0) updateReadout();
  }

  composer.render();
  requestAnimationFrame(tick);
}

function updateReadout() {
  const pct = Math.round(procInfo.charge * 100);
  $('procPct').textContent = pct + ' %';
  const bar = $('procBar');
  bar.style.width = Math.max(2, pct) + '%';
  bar.classList.toggle('low', pct < 20);
  let txt;
  if (proc.pause > 0) txt = proc.dir > 0 ? 'Akku leer · Ladegerät wird angeschlossen' : 'Akku voll · Lämpchen wird angeschlossen';
  else if (proc.running) txt = proc.dir > 0 ? '<b>Entladen</b> · Lämpchen leuchtet' : '<b>Laden</b> · Ladegerät arbeitet';
  else txt = (pct >= 99 ? 'Akku voll' : pct <= 1 ? 'Akku leer' : 'angehalten') + ' · ' + (proc.device === 'lader' ? 'Ladegerät' : 'Lämpchen');
  $('procState').innerHTML = txt;
  $('rStep').textContent = `${state.tourIdx + 1} / ${TOUR.length}`;
  $('rG').textContent = `${procInfo.inG} / 6`;
  $('rO').textContent = `${procInfo.inO} / 6`;
  $('rCo').textContent = `${procInfo.co4} / ${6 - procInfo.co4}`;
  $('rC6').textContent = `${procInfo.c6m} / ${6 - procInfo.c6m}`;
}

function anchorPos(anchor, out) {
  if (anchor.startsWith('dyn:')) {
    const k = anchor.slice(4);
    if (k === 'c60') return out.copy(parts.c6pos[0]).add(new THREE.Vector3(0, 0.3, 0));
    const o = k === 'elyt0' ? parts.li[6] : k === 'e0' ? parts.e[0] : parts.co[0];
    if (!o.visible) return null;
    return out.copy(o.position).add(new THREE.Vector3(0, 0.45, 0));
  }
  return out.fromArray(meta.anchors[anchor]);
}

function project(pos) {
  _v.copy(pos).project(camera);
  if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) return null;
  return [(_v.x * 0.5 + 0.5) * innerWidth, (-_v.y * 0.5 + 0.5) * innerHeight];
}

function updateHotspots() {
  for (const h of hotspots) {
    let gone = state.tasks ? !h.task : h.task;
    if (h.task && h.t.id === 'lampe' && proc.device === 'lader') gone = true;
    if (!gone && !h.task) {
      if (h.a.id === 'ladegeraet' && proc.device !== 'lader') gone = true;
      if (h.a.id === 'lampe' && proc.device === 'lader') gone = true;
      if (state.highlight.length && !state.highlight.includes(h.a) && state.selected !== h.a) gone = true;
    }
    const p = !gone && anchorPos(h.anchor, h.pos);
    const xy = p && project(h.pos);
    if (!xy) gone = true;
    h.el.classList.toggle('gone', gone);
    if (gone) continue;
    h.el.style.transform = `translate(${xy[0].toFixed(1)}px, ${xy[1].toFixed(1)}px)`;
  }
}

function updateTags() {
  for (const t of tags) {
    let show = t.show();
    if (show) {
      t.update?.();
      t.get(_w);
      const xy = project(_w);
      if (xy) t.el.style.transform = `translate(${xy[0].toFixed(1)}px, ${xy[1].toFixed(1)}px)`;
      else show = false;
    }
    t.el.classList.toggle('gone', !show);
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
  gtao?.setSize(innerWidth, innerHeight);
  computeHome();
});
document.addEventListener('gesturestart', (e) => e.preventDefault());

requestAnimationFrame(tick);
// zum Testen in der Konsole
window.__akku = { state, proc, goToStep, procInfo };

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
