/* ------------------------------------------------------------------ */
/* Scène Babylon.js                                                    */
/* ------------------------------------------------------------------ */
const canvas = document.getElementById('scene');
const engine = new BABYLON.Engine(canvas, true, { stencil: true, antialias: true, alpha: true, premultipliedAlpha: false }, true);
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
scene.skipPointerMovePicking = true;
const HOME = { target: V3(0, 0.88, 0), radius: 3.25 };
const camera = new BABYLON.ArcRotateCamera('cam', Math.PI / 2, Math.PI / 2.08, HOME.radius * (window.innerWidth <= 820 ? 1.35 : 1), HOME.target.clone(), scene);
camera.attachControl(canvas, true);
camera.fov = 0.62; camera.minZ = 0.01; camera.maxZ = 50;
camera.lowerRadiusLimit = 0.22; camera.upperRadiusLimit = 6;
camera.wheelDeltaPercentage = 0.012; camera.pinchDeltaPercentage = 0.004;
camera.panningSensibility = 2500; camera.inertia = 0.86; camera.angularSensibilityX = camera.angularSensibilityY = 900;

const hemi = new BABYLON.HemisphericLight('ciel', V3(0, 1, 0.3), scene);
hemi.intensity = 0.75; hemi.groundColor = new BABYLON.Color3(0.32, 0.28, 0.27);
const key = new BABYLON.DirectionalLight('cle', V3(-0.5, -0.8, -0.9), scene); key.intensity = 1.6;
const rim = new BABYLON.DirectionalLight('contre', V3(0.6, -0.3, 1), scene); rim.intensity = 0.7; rim.diffuse = new BABYLON.Color3(0.75, 0.85, 1);

// Studio virtuel capturé une fois dans une sonde : il sert de reflet au verre et aux organes
const studio = [];
{
  const sky = BABYLON.MeshBuilder.CreateSphere('studio', { diameter: 30, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
  const tex = new BABYLON.DynamicTexture('degrade', { width: 8, height: 256 }, scene, false);
  const cx = tex.getContext(); const g = cx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#e6ecf1'); g.addColorStop(0.55, '#b9c4cd'); g.addColorStop(1, '#7d8893');
  cx.fillStyle = g; cx.fillRect(0, 0, 8, 256); tex.update();
  const sm = new BABYLON.StandardMaterial('studioMat', scene); sm.emissiveTexture = tex; sm.disableLighting = true; sm.backFaceCulling = false; sky.material = sm;
  studio.push(sky);
  for (const [x, y, z, w, h] of [[-3, 3, 3, 3, 4], [3.5, 2, 2, 2, 3], [0, 4, -3, 5, 1.5]]) {
    const p = BABYLON.MeshBuilder.CreatePlane('boite', { width: w, height: h, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    p.position.set(x, y, z); p.lookAt(V3(0, 1, 0));
    const pm = new BABYLON.StandardMaterial('boiteMat', scene); pm.emissiveColor = new BABYLON.Color3(1.6, 1.6, 1.6); pm.disableLighting = true; p.material = pm;
    studio.push(p);
  }
  studio.forEach(m => { m.isPickable = false; m.layerMask = 0x10000000; });
}
const probe = new BABYLON.ReflectionProbe('sonde', 256, scene);
probe.position = V3(0, 1, 0);
studio.forEach(m => probe.renderList.push(m));
probe.cubeTexture.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
probe.cubeTexture.activeCamera = null;
scene.environmentTexture = probe.cubeTexture;

const hl = new BABYLON.HighlightLayer('surbrillance', scene, { blurHorizontalSize: 0.5, blurVerticalSize: 0.5 });
hl.blurHorizontalSize = hl.blurVerticalSize = 0.5;
hl.innerGlow = false; hl.outerGlow = true;

/* --- Matériaux --- */
const C3 = h => BABYLON.Color3.FromHexString(h).toLinearSpace();
function organMat(name, hex, o = {}) {
  const m = new BABYLON.PBRMaterial(name, scene);
  m.albedoColor = C3(hex); m.metallic = 0; m.roughness = o.rough ?? 0.4;
  m.clearCoat.isEnabled = (o.coat ?? 0.55) > 0; m.clearCoat.intensity = o.coat ?? 0.55; m.clearCoat.roughness = 0.12;
  m.environmentIntensity = o.env ?? 0.55;
  if (o.emissive) m.emissiveColor = C3(o.emissive);
  m.alpha = o.alpha ?? 1; m.backFaceCulling = o.cull ?? true;
  if (m.alpha < 1) { m.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND; m.needDepthPrePass = !!o.prepass; }
  m.metadata = { base: m.alpha };
  return m;
}
const glass = new BABYLON.StandardMaterial('verre', scene);
glass.diffuseColor = new BABYLON.Color3(0.93, 0.96, 0.99); glass.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5); glass.specularPower = 128;
glass.reflectionTexture = probe.cubeTexture; glass.reflectionTexture.level = 0.55;
glass.reflectionFresnelParameters = new BABYLON.FresnelParameters({ bias: 0.03, power: 3, leftColor: BABYLON.Color3.White(), rightColor: BABYLON.Color3.Black() });
glass.useReflectionOverAlpha = true; glass.useSpecularOverAlpha = true; glass.backFaceCulling = false;
glass.alpha = 0.14; glass.backFaceCulling = true; glass.disableDepthWrite = true;

// Ondes de péristaltisme : décalage des sommets le long de la normale (plugin de matériau)
class WavePlugin extends BABYLON.MaterialPluginBase {
  constructor(material, amp, freq, speed) {
    super(material, 'Onde', 200, { ONDE: false });
    this.amp = amp; this.freq = freq; this.speed = speed; this.time = 0; this._enable(true);
  }
  prepareDefines(defines) { defines.ONDE = true; }
  getClassName() { return 'WavePlugin'; }
  getUniforms() {
    return { ubo: [{ name: 'ondeT', size: 1, type: 'float' }, { name: 'ondeA', size: 1, type: 'float' }, { name: 'ondeF', size: 1, type: 'float' }, { name: 'ondeV', size: 1, type: 'float' }],
      vertex: '#ifdef ONDE\nuniform float ondeT; uniform float ondeA; uniform float ondeF; uniform float ondeV;\n#endif\n' };
  }
  bindForSubMesh(ubo) { ubo.updateFloat('ondeT', this.time); ubo.updateFloat('ondeA', this.amp); ubo.updateFloat('ondeF', this.freq); ubo.updateFloat('ondeV', this.speed); }
  getCustomCode(type) {
    if (type !== 'vertex') return null;
    return { CUSTOM_VERTEX_UPDATE_POSITION: '#ifdef ONDE\nfloat ondeW = sin(dot(positionUpdated, vec3(0.62, 1.0, 0.41)) * ondeF - ondeT * ondeV);\npositionUpdated += normalUpdated * ondeA * smoothstep(0.35, 1.0, ondeW);\n#endif\n' };
  }
}
const waves = [];

/* --- Organes : correspondance entre le modèle Z-Anatomy et les fiches --- */
const PARTS = {
  peau:       { sys: null },
  squelette:  { organ: 'squelette', sys: 'squelette', col: '#ebe2cd', rough: 0.62, coat: 0.15 },
  crane:      { organ: 'squelette', sys: 'squelette', col: '#ebe2cd', rough: 0.6, coat: 0.1, alpha: 0.22, pick: false },
  cerveau:    { organ: 'cerveau', sys: 'nerveux', col: '#e7aeab', rough: 0.5 },
  moelle:     { organ: 'moelle', sys: 'nerveux', col: '#f1cf63', rough: 0.45, emissive: '#3a2a05' },
  coeur:      { organ: 'coeur', sys: 'cardio', col: '#b42f2d', rough: 0.35, coat: 0.8 },
  arteres:    { organ: 'vaisseaux', sys: 'cardio', col: '#d63b35', rough: 0.35 },
  veines:     { organ: 'vaisseaux', sys: 'cardio', col: '#3d6ec6', rough: 0.35 },
  poumons:    { organ: 'poumons', sys: 'respi', col: '#f0a3a8', rough: 0.6, coat: 0.3, alpha: 0.55 },
  diaphragme: { organ: 'diaphragme', sys: 'respi', col: '#b8433d', rough: 0.55, alpha: 0.6, cull: false },
  estomac:    { organ: 'estomac', sys: 'digestif', col: '#dc8f74', rough: 0.4, wave: [0.0016, 55, 2.2] },
  foie:       { organ: 'foie', sys: 'digestif', col: '#7c2b26', rough: 0.35, coat: 0.8 },
  intestin:   { organ: 'intestin', sys: 'digestif', col: '#e9a78d', rough: 0.45, wave: [0.0012, 90, 3] },
  colon:      { organ: 'colon', sys: 'digestif', col: '#bf8460', rough: 0.45, wave: [0.0014, 45, 1.2] },
  reins:      { organ: 'reins', sys: 'urinaire', col: '#8e3a33', rough: 0.35, coat: 0.7 },
  vessie:     { organ: 'vessie', sys: 'urinaire', col: '#e2c063', rough: 0.35, alpha: 0.85 },
};
const meshOf = {};               // nom de pièce → mesh
const organMeshes = {};          // fiche → meshes
const pickables = [];
const flows = [];                // particules (sang, influx, urine)
const groups = {};
for (const k of Object.keys(SYSTEMS)) {
  groups[k] = {
    _v: true, meshes: [],
    get visible() { return this._v; },
    set visible(v) { this._v = v; this.meshes.forEach(m => m.setEnabled(v)); },
  };
}

/* --- Particules qui circulent le long des vrais trajets (instances fines) --- */
function resample(pts, step) {
  const out = [pts[0]]; let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]; const L = BABYLON.Vector3.Distance(a, b); let t = step - carry;
    while (t <= L) { out.push(BABYLON.Vector3.Lerp(a, b, t / L)); t += step; }
    carry = L - (t - step);
  }
  return out;
}
function makeFlow(name, paths, hex, o) {
  const tracks = paths.map(p => resample(p, 0.004)).filter(t => t.length > 3);
  const parts = [];
  for (let ti = 0; ti < tracks.length; ti++) {
    const n = Math.max(1, Math.round(tracks[ti].length * 0.004 * o.perMeter));
    for (let i = 0; i < n; i++) parts.push({ t: ti, u: Math.random(), j: 0.75 + Math.random() * 0.5, dir: o.both && Math.random() < 0.5 ? -1 : 1 });
  }
  const dot = BABYLON.MeshBuilder.CreateIcoSphere(name, { radius: o.size, subdivisions: 1 }, scene);
  const m = new BABYLON.StandardMaterial(name + 'Mat', scene); m.emissiveColor = BABYLON.Color3.FromHexString(hex); m.disableLighting = true; dot.material = m;
  dot.isPickable = false; dot.alwaysSelectAsActiveMesh = true;
  const buf = new Float32Array(parts.length * 16);
  for (let i = 0; i < parts.length; i++) { buf[i * 16] = buf[i * 16 + 5] = buf[i * 16 + 10] = buf[i * 16 + 15] = 1; }
  dot.thinInstanceSetBuffer('matrix', buf, 16, false);
  const f = { dot, buf, parts, tracks, o };
  flows.push(f); groups[o.sys].meshes.push(dot);
  return f;
}
function updateFlows(dt, p) {
  const rate = state.bpm / 70;
  for (const f of flows) {
    if (!f.dot.isEnabled()) continue;
    const mult = f.o.pulse ? 0.4 + 1.7 * ventContract(p) : 1;
    for (let i = 0; i < f.parts.length; i++) {
      const q = f.parts[i]; const tr = f.tracks[q.t]; const L = tr.length * 0.004;
      q.u += q.dir * dt * f.o.speed * (f.o.paced ? rate : 1) * mult * q.j / L;
      if (q.u > 1) q.u -= 1; if (q.u < 0) q.u += 1;
      const fi = q.u * (tr.length - 1); const i0 = Math.floor(fi); const a = tr[i0], b = tr[Math.min(i0 + 1, tr.length - 1)]; const t = fi - i0;
      const k = i * 16 + 12;
      f.buf[k] = a.x + (b.x - a.x) * t; f.buf[k + 1] = a.y + (b.y - a.y) * t; f.buf[k + 2] = a.z + (b.z - a.z) * t;
    }
    f.dot.thinInstanceBufferUpdated('matrix');
  }
}

/* --- Chargement du modèle et des trajets --- */
const loaderEl = document.getElementById('loader');
let neurons = null, ready = false;
async function fetchModel(url, onProgress) {
  const r = await fetch(url); const total = +r.headers.get('content-length') || 6.7e6;
  const rd = r.body.getReader(); const parts = []; let n = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); n += value.length; onProgress(Math.min(1, n / total)); }
  const txt = new TextDecoder().decode(await new Blob(parts).arrayBuffer());
  const bin = Uint8Array.from(atob(txt.trim()), c => c.charCodeAt(0));
  const ds = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(ds).arrayBuffer());
}
async function loadBody() {
  BABYLON.SceneLoader.ShowLoadingScreen = false;
  // Le modèle est servi en gzip + base64 (corps.txt) : l'hébergement n'accepte pas .glb
  const glb = await fetchModel('corps.txt', f => loaderEl.querySelector('b').textContent = Math.round(f * 100) + ' %');
  const res = await BABYLON.SceneLoader.ImportMeshAsync('', '', glb, scene, null, '.glb');
  for (const m of res.meshes) {
    const name = (m.name || '').replace(/_primitive\d+$/, '');
    const cfg = PARTS[name]; if (!cfg) continue;
    meshOf[name] = m;
    if (name === 'peau') { m.material = glass; m.isPickable = false; m.renderingGroupId = 0; continue; }
    const mt = organMat(name, cfg.col, cfg); m.material = mt;
    if (cfg.wave) { const w = new WavePlugin(mt, ...cfg.wave); waves.push(w); }
    m.metadata = { organ: cfg.organ, part: name };
    m.isPickable = cfg.pick !== false;
    if (m.isPickable) pickables.push(m);
    (organMeshes[cfg.organ] = organMeshes[cfg.organ] || []).push(m);
    groups[cfg.sys].meshes.push(m);
    const c = m.getBoundingInfo().boundingBox.center; m.setPivotPoint(c.clone());
  }
  // Trajets réels (Z-Anatomy) : sang, influx nerveux, urine
  const tr = await (await fetch('trajets.json')).json();
  const heartC = meshOf.coeur.getBoundingInfo().boundingBox.centerWorld;
  const toV = c => c.p.map(q => V3(q[0], q[1], q[2]));
  const orient = (pts, toward) => { const d0 = BABYLON.Vector3.Distance(pts[0], heartC), d1 = BABYLON.Vector3.Distance(pts[pts.length - 1], heartC); return (toward ? d0 < d1 : d0 > d1) ? pts.reverse() : pts; };
  const pulm = n => /lung|pulmonary|poumon/i.test(n);
  const oxy = [], deoxy = [];
  for (const c of tr.art) { const p = orient(toV(c), false); (pulm(c.n) ? deoxy : oxy).push(p); }
  for (const c of tr.vei) { const p = orient(toV(c), true); (pulm(c.n) ? oxy : deoxy).push(p); }
  makeFlow('sangRouge', oxy, '#ff5a4d', { sys: 'cardio', perMeter: 26, size: 0.0017, speed: 0.12, pulse: true, paced: true });
  makeFlow('sangBleu', deoxy, '#5d95ff', { sys: 'cardio', perMeter: 22, size: 0.0017, speed: 0.08, paced: true });
  makeFlow('influx', tr.ner.map(toV), '#ffd860', { sys: 'nerveux', perMeter: 10, size: 0.0014, speed: 0.6, both: true });
  makeFlow('urine', tr.uri.map(c => { const p = toV(c); return p[0].y < p[p.length - 1].y ? p.reverse() : p; }), '#ffe27a', { sys: 'urinaire', perMeter: 60, size: 0.0018, speed: 0.012 });

  // Neurones qui déchargent : points pris à la surface du cerveau, un peu à l'intérieur
  {
    const b = meshOf.cerveau; const P = b.getVerticesData(BABYLON.VertexBuffer.PositionKind); const N = b.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    const W = b.computeWorldMatrix(true); const count = 320; const pos = [];
    for (let i = 0; i < count; i++) {
      const v = Math.floor(Math.random() * (P.length / 3));
      const lp = V3(P[v * 3] - N[v * 3] * 0.003, P[v * 3 + 1] - N[v * 3 + 1] * 0.003, P[v * 3 + 2] - N[v * 3 + 2] * 0.003);
      pos.push(BABYLON.Vector3.TransformCoordinates(lp, W));
    }
    const dot = BABYLON.MeshBuilder.CreateIcoSphere('neurones', { radius: 0.0028, subdivisions: 1 }, scene);
    const m = new BABYLON.StandardMaterial('neuronesMat', scene); m.emissiveColor = BABYLON.Color3.FromHexString('#fff2b0'); m.disableLighting = true; dot.material = m;
    dot.isPickable = false; dot.alwaysSelectAsActiveMesh = true;
    const buf = new Float32Array(count * 16);
    pos.forEach((p, i) => { buf[i * 16 + 12] = p.x; buf[i * 16 + 13] = p.y; buf[i * 16 + 14] = p.z; buf[i * 16 + 15] = 1; });
    dot.thinInstanceSetBuffer('matrix', buf, 16, false);
    neurons = { dot, buf, level: new Float32Array(count) };
    groups.nerveux.meshes.push(dot);
  }
  loaderEl.hidden = true; ready = true;
}

/* ------------------------------------------------------------------ */
/* Sélection, survol, caméra                                           */
/* ------------------------------------------------------------------ */
const tip = document.getElementById('tip');
let hovered = null;
function setHighlight(id, on) {
  if (!id || !organMeshes[id]) return;
  for (const m of organMeshes[id]) { if (on) hl.addMesh(m, new BABYLON.Color3(1, 1, 1)); else hl.removeMesh(m); }
}
function pickAt(x, y) {
  const r = canvas.getBoundingClientRect();
  const hit = scene.pick(x - r.left, y - r.top, m => m.isPickable && m.isEnabled() && !!m.metadata && m.material && m.material.alpha > 0.2);
  return hit && hit.hit ? hit.pickedMesh.metadata.organ : null;
}
let lastMove = 0;
canvas.addEventListener('pointermove', ev => {
  if (ev.pointerType === 'touch' || state.deepOpen || !ready) return;
  const now = performance.now(); if (now - lastMove < 60) return; lastMove = now;
  const id = pickAt(ev.clientX, ev.clientY);
  if (id !== hovered) { if (hovered && hovered !== state.selected) setHighlight(hovered, false); hovered = id; if (id) setHighlight(id, true); }
  canvas.classList.toggle('hover', !!id);
  if (id) { tip.hidden = false; tip.textContent = ORGANS[id].nom; tip.style.left = ev.clientX + 'px'; tip.style.top = ev.clientY + 'px'; } else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; if (hovered && hovered !== state.selected) setHighlight(hovered, false); hovered = null; });
let downAt = null;
canvas.addEventListener('pointerdown', ev => { downAt = [ev.clientX, ev.clientY]; });
canvas.addEventListener('pointerup', ev => {
  if (!downAt || !ready) return; const d = Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]); downAt = null;
  if (d > 6) return;
  const id = pickAt(ev.clientX, ev.clientY); if (id) select(id); else if (state.selected) select(null);
});

const camAnim = { t: 1, start: 0, fromT: V3(0, 0, 0), toT: V3(0, 0, 0), fromR: 3, toR: 3 };
function flyTo(target, radius) {
  camAnim.fromT.copyFrom(camera.target); camAnim.toT.copyFrom(target);
  camAnim.fromR = camera.radius; camAnim.toR = radius * (canvas.clientWidth <= 820 ? 1.35 : 1); camAnim.t = 0; camAnim.start = performance.now();
}
function centerOf(id) {
  let mn = V3(1e9, 1e9, 1e9), mx = V3(-1e9, -1e9, -1e9);
  for (const m of organMeshes[id]) { const b = m.getBoundingInfo().boundingBox; mn = BABYLON.Vector3.Minimize(mn, b.minimumWorld); mx = BABYLON.Vector3.Maximize(mx, b.maximumWorld); }
  return { c: mn.add(mx).scale(0.5), size: BABYLON.Vector3.Distance(mn, mx) };
}
function applyDim() {
  const sel = state.selected;
  for (const [id, meshes] of Object.entries(organMeshes)) {
    const dim = sel && id !== sel;
    for (const m of meshes) {
      const mt = m.material; const base = mt.metadata.base;
      mt.alpha = dim ? Math.min(base, 0.07) : base;
      mt.transparencyMode = mt.alpha < 1 ? BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND : BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
    }
  }
  for (const f of flows) f.dot.visibility = sel && sel !== 'vaisseaux' && sel !== 'coeur' && sel !== 'moelle' && sel !== 'reins' && sel !== 'vessie' ? 0.25 : 1;
  glass.alpha = sel ? 0.06 : 0.14;
}
function select(id) {
  if (state.selected) setHighlight(state.selected, false);
  state.selected = id;
  if (id) {
    const sys = ORGANS[id].sys;
    if (!state.visible[sys]) { state.visible[sys] = true; groups[sys].visible = true; sysBox.children[Object.keys(SYSTEMS).indexOf(sys)].setAttribute('aria-pressed', 'true'); }
    renderOrgan(id);
    const { c, size } = centerOf(id); flyTo(c, clamp(size * 2.2, 0.35, 2.6));
  } else { renderHome(); flyTo(HOME.target, HOME.radius); }
  applyDim();
}
