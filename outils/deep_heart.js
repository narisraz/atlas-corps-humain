/* ------------------------------------------------------------------ */
/* Plongée 3D : le vrai cœur (Z-Anatomy) ouvert en coupe 4 cavités     */
/* ------------------------------------------------------------------ */
const deep = { p: 0.55, speed: 0.5, playing: true, lastPhase: -1, flash: 0, flashTxt: '', cut: true, labels: window.innerWidth > 820, sc: null, loading: null };
const hc = $('heartCanvas'); const deepEcgC = $('deepEcg'); const dx = deepEcgC.getContext('2d');
const labelBox = $('deepLabels'); const flashEl = $('deepFlash');
const H3 = h => BABYLON.Color3.FromHexString(h);

// Ensemble de pièces : couleur, découpe par le plan de coupe
const HEART_PARTS = {
  og: ['#b4554c', 1], od: ['#a8564f', 1], vg: ['#9c3a35', 1], vd: ['#97423c', 1],
  aorte: ['#c4453c', 1], tronc_pulm: ['#5d74b4', 1], veines_caves: ['#566fb0', 1], veines_pulm: ['#c25a50', 1],
  coronaires: ['#d8584c', 1], veines_card: ['#6a82c4', 1],
  tri_inf: ['#eadfcb', 0], tri_sep: ['#eadfcb', 0], mit_post: ['#eadfcb', 0],
  ao_lc: ['#eadfcb', 0], ao_nc: ['#eadfcb', 0], ao_rc: ['#eadfcb', 0], pu_ant: ['#eadfcb', 0], pu_l: ['#eadfcb', 0], pu_r: ['#eadfcb', 0],
};
function meanOf(m) {
  const P = m.getVerticesData('position'); const c = V3(0, 0, 0); const n = P.length / 3;
  for (let i = 0; i < P.length; i += 3) { c.x += P[i]; c.y += P[i + 1]; c.z += P[i + 2]; }
  return c.scaleInPlace(1 / n);
}
const perp = (v, f) => v.subtract(f.scale(BABYLON.Vector3.Dot(v, f)));

async function initHeart3D() {
  const eng = new BABYLON.Engine(hc, true, { stencil: true, antialias: true }, true);
  eng.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
  const sc = new BABYLON.Scene(eng); sc.clearColor = new BABYLON.Color4(0.035, 0.07, 0.105, 1);
  sc.skipPointerMovePicking = true;
  const cam = new BABYLON.ArcRotateCamera('dc', Math.PI / 2, Math.PI / 2, 0.3, V3(0, 1.3, 0), sc);
  cam.attachControl(hc, true); cam.minZ = 0.004; cam.maxZ = 5; cam.fov = 0.6;
  cam.wheelDeltaPercentage = 0.01; cam.pinchDeltaPercentage = 0.004; cam.lowerRadiusLimit = 0.08; cam.upperRadiusLimit = 0.6;
  cam.panningSensibility = 0; cam.inertia = 0.85;
  const hemi = new BABYLON.HemisphericLight('h', V3(0, 1, 0.4), sc); hemi.intensity = 0.6; hemi.groundColor = new BABYLON.Color3(0.18, 0.12, 0.14);
  const key = new BABYLON.DirectionalLight('k', V3(-0.3, -0.5, -1), sc); key.intensity = 1.0;
  const rim = new BABYLON.DirectionalLight('r', V3(0.6, 0.3, 1), sc); rim.intensity = 0.45; rim.diffuse = H3('#9fc3ff');
  // La lumière principale suit la caméra pour que l'intérieur de la coupe reste lisible
  sc.onBeforeRenderObservable.add(() => { key.direction = cam.target.subtract(cam.position).normalize().add(V3(0.15, -0.35, 0)); });

  const glb = await fetchModel('coeur3d.txt', () => {});
  const res = await BABYLON.SceneLoader.ImportMeshAsync('', '', glb, sc, null, '.glb');
  const M = {}, C = {};
  for (const m of res.meshes) {
    const n = (m.name || '').replace(/_primitive\d+$/, ''); if (!HEART_PARTS[n]) continue;
    m.computeWorldMatrix(true); m.setParent(null); m.bakeCurrentTransformIntoVertices(); m.isPickable = false;
    M[n] = m; C[n] = meanOf(m);
  }
  // Plan de coupe « 4 cavités » : contient l'axe droite-gauche et l'axe base-pointe
  const lr = C.og.add(C.vg).subtract(C.od.add(C.vd)).normalize();
  const ba = C.vg.add(C.vd).subtract(C.og.add(C.od)).normalize();
  let n = BABYLON.Vector3.Cross(lr, ba).normalize(); if (n.z < 0) n = n.negate();
  const c0 = C.og.add(C.vg).add(C.od).add(C.vd).scale(0.25);
  const plane = new BABYLON.Plane(n.x, n.y, n.z, -BABYLON.Vector3.Dot(n, c0.add(n.scale(0.004))));
  const vplane = new BABYLON.Plane(n.x, n.y, n.z, -BABYLON.Vector3.Dot(n, c0.add(n.scale(0.014))));
  const mats = {};
  for (const [k, [col, cut]] of Object.entries(HEART_PARTS)) {
    const m = M[k]; if (!m) continue;
    const mt = new BABYLON.StandardMaterial('m_' + k, sc); mt.diffuseColor = H3(col);
    mt.specularColor = new BABYLON.Color3(0.32, 0.26, 0.26); mt.specularPower = 48; mt.backFaceCulling = false; mt.twoSidedLighting = true;
    if (!cut) mt.emissiveColor = new BABYLON.Color3(0.12, 0.1, 0.09);
    mt.clipPlane = cut ? plane : vplane;
    m.material = mt; mats[k] = mt;
  }
  // Cavités : elles se contractent autour de leur centre
  for (const k of ['og', 'od', 'vg', 'vd']) M[k].setPivotPoint(C[k]);
  // Valves : chaque feuillet pivote autour de sa charnière (côté anneau, en amont)
  const valves = [];
  const mkValve = (keys, from, to, openA, shutA, kind) => {
    const f = to.subtract(from).normalize();
    const cs = keys.map(k => C[k]);
    let v = cs.reduce((a, b) => a.add(b), V3(0, 0, 0)).scale(1 / cs.length);
    if (keys.length === 1) { const r0 = perp(cs[0].subtract(from.add(to).scale(0.5)), f).normalize(); v = cs[0].subtract(r0.scale(0.012)); }
    const leaves = keys.map(k => {
      const m = M[k]; const c = C[k]; const r = perp(c.subtract(v), f).normalize();
      const P = m.getVerticesData('position'); let best = -1e9, hinge = c;
      for (let i = 0; i < P.length; i += 3) { const p = V3(P[i], P[i + 1], P[i + 2]).subtract(v); const s = BABYLON.Vector3.Dot(p, r) - 0.6 * BABYLON.Vector3.Dot(p, f); if (s > best) { best = s; hinge = V3(P[i], P[i + 1], P[i + 2]); } }
      m.setPivotPoint(hinge); m.rotationQuaternion = BABYLON.Quaternion.Identity();
      return { m, axis: BABYLON.Vector3.Cross(f, r).normalize() };
    });
    const o = { leaves, openA, shutA, kind, s: 0, center: v }; valves.push(o); return o;
  };
  const avTri = mkValve(['tri_inf', 'tri_sep'], C.od, C.vd, 0.22, -0.08, 'av');
  const avMit = mkValve(['mit_post'], C.og, C.vg, 0.22, -0.08, 'av');
  const slPu = mkValve(['pu_ant', 'pu_l', 'pu_r'], C.vd, C.pu_ant.add(C.pu_l).add(C.pu_r).scale(1 / 3), 0.5, 0, 'sl');
  const slAo = mkValve(['ao_lc', 'ao_nc', 'ao_rc'], C.vg, C.ao_lc.add(C.ao_nc).add(C.ao_rc).scale(1 / 3), 0.5, 0, 'sl');
  const mitC = C.mit_post.add(C.og.add(C.vg).scale(0.5)).scale(0.5);

  // Trajets du sang : veine → oreillette → valve AV → ventricule → valve sigmoïde → artère
  const apex = k => C[k].add(C[k].subtract(k === 'vd' ? C.od : C.og).scale(0.35));
  const P = (a) => V3(a[0], a[1], a[2]);
  const ROUTES = {
    droit: { starts: [P([0.0144, 1.374, 0.023]), P([0.011, 1.225, 0.017])], mid: [C.od, avTri.center, apex('vd'), slPu.center, P([-0.0293, 1.3446, 0.0296])],
      ends: [P([0.0335, 1.3309, -0.007]), P([-0.062, 1.322, -0.014])], R: [0.004, 0.011, 0.004, 0.011, 0.003, 0.005, 0.004] },
    gauche: { starts: [P([-0.0506, 1.2958, -0.0198]), P([-0.0541, 1.3143, -0.0093]), P([0.024, 1.2982, -0.0269]), P([0.034, 1.33, -0.004])], mid: [C.og, mitC, apex('vg'), slAo.center, P([-0.0058, 1.3602, 0.0286])],
      ends: [P([-0.0193, 1.3604, -0.0333])], R: [0.003, 0.011, 0.004, 0.012, 0.003, 0.006, 0.006] },
  };
  const parts = [];
  const mkFlow = (side, col, count) => {
    // Une géométrie par flux : les instances fines sont stockées sur la géométrie
    const mesh = BABYLON.MeshBuilder.CreateSphere('sang_' + side, { diameter: 0.0023, segments: 6 }, sc); const mt = new BABYLON.StandardMaterial('sm_' + side, sc);
    mt.diffuseColor = H3(col); mt.emissiveColor = H3(col).scale(0.4); mt.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4); mesh.material = mt; mesh.isPickable = false;
    const buf = new Float32Array(count * 16); const list = [];
    const rt = ROUTES[side];
    for (let i = 0; i < count; i++) {
      const pts = [rt.starts[i % rt.starts.length], ...rt.mid, rt.ends[i % rt.ends.length]];
      const off = V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().scale(Math.sqrt(Math.random()));
      list.push({ pts, off, s: Math.random() * 6, j: Math.random() });
      BABYLON.Matrix.IdentityToRef(BABYLON.TmpVectors.Matrix[0]); BABYLON.TmpVectors.Matrix[0].copyToArray(buf, i * 16);
    }
    mesh.thinInstanceSetBuffer('matrix', buf, 16, false); mesh.alwaysSelectAsActiveMesh = true;
    parts.push({ side, mesh, buf, list, R: rt.R });
  };
  mkFlow('droit', '#3f72e0', 110); mkFlow('gauche', '#ff4a3a', 110);

  // Caméra face au plan de coupe, base du cœur en haut et pointe en bas
  const up = perp(ba.negate(), n).normalize(); cam.upVector = up;
  const q = new BABYLON.Quaternion(); BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Vector3.UpReadOnly, up, q);
  const loc = n.applyRotationQuaternion(BABYLON.Quaternion.Inverse(q));
  cam.target = c0.clone(); cam.alpha = Math.atan2(loc.z, loc.x); cam.beta = Math.acos(clamp(loc.y, -1, 1)); cam.radius = hc.clientWidth < 520 ? 0.27 : 0.23;
  cam.lowerBetaLimit = 0.05; cam.upperBetaLimit = Math.PI - 0.05;

  // Étiquettes
  const LABELS = [
    ['Oreillette droite', C.od], ['Ventricule droit', apex('vd').add(C.vd).scale(0.5)], ['Oreillette gauche', C.og], ['Ventricule gauche', apex('vg').add(C.vg).scale(0.5)],
    ['Valve tricuspide', avTri.center, 1], ['Valve mitrale', mitC, 1], ['Valve aortique', slAo.center, 1],
    ['Aorte', P([-0.006, 1.362, 0.03])], ['Veine cave sup.', P([0.0144, 1.37, 0.023])],
  ].map(([t, p, v]) => { const el = document.createElement('div'); el.className = 'lab' + (v ? ' v' : ''); el.textContent = t; labelBox.appendChild(el); return { el, p }; });

  deep.sc = sc; deep.eng = eng; deep.cam = cam; deep.M = M; deep.C = C; deep.mats = mats; deep.valves = valves; deep.parts = parts; deep.labelsList = LABELS; deep.plane = plane; deep.vplane = vplane;
  deep.avValves = [avTri, avMit]; deep.slValves = [slPu, slAo]; window.__deep = deep;
}

function setCut(on) {
  deep.cut = on; $('cutBtn').classList.toggle('primary', on);
  if (deep.mats) for (const [k, [, cut]] of Object.entries(HEART_PARTS)) if (deep.mats[k]) deep.mats[k].clipPlane = on ? (cut ? deep.plane : deep.vplane) : null;
}
function setLabels(on) { deep.labels = on; $('labBtn').classList.toggle('primary', on); labelBox.hidden = !on; }

// Panneau latéral de la plongée
const phaseIdx = p => PHASES.findIndex(ph => p >= ph.a && p < ph.b);
const phaseList = $('phaseList');
phaseList.innerHTML = PHASES.map((ph, i) => `<li data-i="${i}" style="--c:${ph.c}"><i></i><span>${ph.t}</span><span>${ph.ecg}</span></li>`).join('');
phaseList.querySelectorAll('li').forEach(li => li.onclick = () => { deep.p = PHASES[+li.dataset.i].a + 0.001; });
function updateDeepText(i) {
  const ph = PHASES[i];
  $('phaseEyebrow').textContent = `Phase ${i + 1} sur 5 · ECG : ${ph.ecg}`;
  $('phaseTitle').textContent = ph.t; $('phaseText').textContent = ph.d;
  phaseList.querySelectorAll('li').forEach((li, k) => li.classList.toggle('on', k === i));
  const av = avOpen(deep.p), sl = slOpen(deep.p);
  $('valves').innerHTML = [['Tricuspide', av], ['Mitrale', av], ['Pulmonaire', sl], ['Aortique', sl]]
    .map(([n, o]) => `<div class="valve ${o ? 'open' : 'shut'}"><span>${n}</span><b>${o ? 'ouverte' : 'fermée'}</b></div>`).join('');
}

const tmpM = BABYLON.Matrix.Identity(); const tmpV = V3(0, 0, 0);
function catmull(pts, s, out) {
  const i = Math.min(pts.length - 2, Math.floor(s)); const t = s - i; const g = k => pts[clamp(k, 0, pts.length - 1)];
  return BABYLON.Vector3.CatmullRomToRef ? BABYLON.Vector3.CatmullRomToRef(g(i - 1), g(i), g(i + 1), g(i + 2), t, out) : out.copyFrom(BABYLON.Vector3.CatmullRom(g(i - 1), g(i), g(i + 1), g(i + 2), t));
}

function drawHeartDeep(dt) {
  if (!deep.sc) return;
  if (deep.playing) deep.p = (deep.p + dt * deep.speed * state.bpm / 60) % 1;
  const p = deep.p; const v = ventContract(p), a = atrContract(p);
  const i = phaseIdx(p);
  if (i !== deep.lastPhase) {
    if (i === 1) { deep.flash = 1; deep.flashTxt = '« toum »'; } if (i === 3) { deep.flash = 1; deep.flashTxt = '« ta »'; }
    deep.lastPhase = i; updateDeepText(i);
  }
  const { M, C } = deep;
  // Cavités
  M.vg.scaling.setAll(1 - 0.075 * v); M.vd.scaling.setAll(1 - 0.07 * v);
  const fillA = slOpen(p) ? 0.03 : 0; M.og.scaling.setAll(1 - 0.09 * a + fillA); M.od.scaling.setAll(1 - 0.09 * a + fillA);
  deep.mats.vg.emissiveColor.set(0.35 * v, 0.04 * v, 0.03 * v); deep.mats.vd.emissiveColor.set(0.3 * v, 0.04 * v, 0.05 * v);
  deep.mats.og.emissiveColor.set(0.3 * a, 0.05 * a, 0.03 * a); deep.mats.od.emissiveColor.set(0.28 * a, 0.05 * a, 0.05 * a);
  // Valves : ouverture lissée
  const k = deep.playing ? 1 - Math.exp(-dt * deep.speed * 40) : 1 - Math.exp(-dt * 20);
  for (const vv of deep.valves) {
    const target = vv.kind === 'av' ? (avOpen(p) ? 1 : 0) : (slOpen(p) ? 1 : 0);
    vv.s += (target - vv.s) * k; const ang = vv.shutA + (vv.openA - vv.shutA) * vv.s;
    for (const lf of vv.leaves) BABYLON.Quaternion.RotationAxisToRef(lf.axis, ang, lf.m.rotationQuaternion);
  }
  // Sang : il attend derrière une valve fermée
  const beat = 60 / state.bpm; const kk = deep.playing ? dt * deep.speed / beat : 0;
  for (const fl of deep.parts) {
    const { list, buf, R } = fl;
    for (let n = 0; n < list.length; n++) {
      const q = list[n];
      let sp; if (q.s < 1) sp = 1.0; else if (q.s < 2) sp = a > 0 ? 4 : 1.4; else if (q.s < 4) sp = slOpen(p) ? 9 : 1.4; else sp = 6;
      let ns = q.s + sp * kk;
      if (!avOpen(p) && q.s <= 2 && ns > 2 - q.j * 0.8) ns = Math.max(q.s, 2 - q.j * 0.8);
      if (!slOpen(p) && q.s >= 2 && q.s <= 4 && ns > 3.95 - q.j * 1.6) ns = Math.max(q.s, 3.95 - q.j * 1.6);
      q.s = ns; if (q.s >= 6) { q.s = Math.random() * 0.15; q.j = Math.random(); }
      catmull(q.pts, q.s, tmpV);
      const ii = Math.min(5, Math.floor(q.s)), t = q.s - ii; const rad = R[ii] + (R[ii + 1] - R[ii]) * t;
      tmpV.addInPlace(q.off.scale(rad));
      const o = n * 16; buf[o] = buf[o + 5] = buf[o + 10] = 1; buf[o + 12] = tmpV.x; buf[o + 13] = tmpV.y; buf[o + 14] = tmpV.z; buf[o + 15] = 1;
    }
    fl.mesh.thinInstanceBufferUpdated('matrix');
  }
  deep.sc.render();
  // Étiquettes projetées
  const w = hc.clientWidth, h = hc.clientHeight;
  if (deep.labels) {
    const tm = deep.sc.getTransformMatrix(); const vp = deep.cam.viewport.toGlobal(w, h);
    for (const L of deep.labelsList) {
      const s = BABYLON.Vector3.Project(L.p, BABYLON.Matrix.IdentityReadOnly, tm, vp);
      const vis = s.z > 0 && s.z < 1 && s.x > 0 && s.x < w && s.y > 0 && s.y < h;
      L.el.style.display = vis ? '' : 'none'; if (vis) L.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
    }
  }
  // Bruits du cœur
  if (deep.flash > 0) { deep.flash = Math.max(0, deep.flash - dt / 0.9); flashEl.textContent = deep.flashTxt; flashEl.style.opacity = deep.flash.toFixed(2); }
  drawDeepEcg(p);
}

function drawDeepEcg(p) {
  const w = deepEcgC.clientWidth, h = deepEcgC.clientHeight; const dpr = Math.min(devicePixelRatio, 2);
  if (deepEcgC.width !== Math.round(w * dpr) || deepEcgC.height !== Math.round(h * dpr)) { deepEcgC.width = Math.round(w * dpr); deepEcgC.height = Math.round(h * dpr); }
  dx.setTransform(dpr, 0, 0, dpr, 0, 0); dx.clearRect(0, 0, w, h);
  const gx = 14, gw = w - 28, H = h - 22;
  PHASES.forEach(ph => { dx.fillStyle = ph.c; dx.globalAlpha = 0.16; dx.fillRect(gx + ph.a * gw, 4, (ph.b - ph.a) * gw, H - 4); dx.globalAlpha = 1; dx.fillRect(gx + ph.a * gw, H + 2, (ph.b - ph.a) * gw - 2, 4); });
  dx.strokeStyle = '#ff6a5c'; dx.lineWidth = 2; dx.beginPath();
  for (let n = 0; n <= 300; n++) { const pp = n / 300; const x = gx + pp * gw; const y = 4 + (H - 4) * 0.8 - ecgAt(pp) * (H - 4) * 0.68; n ? dx.lineTo(x, y) : dx.moveTo(x, y); }
  dx.stroke();
  const cx = gx + p * gw; dx.strokeStyle = '#ece5d5'; dx.lineWidth = 1.5; dx.beginPath(); dx.moveTo(cx, 0); dx.lineTo(cx, H + 6); dx.stroke();
  dx.fillStyle = '#a9b1b8'; dx.font = '11px "IBM Plex Mono", monospace'; dx.textAlign = 'left';
  dx.fillText(`ECG · un battement = ${(60 / state.bpm).toFixed(2).replace('.', ',')} s à ${state.bpm} BPM`, gx, h - 3);
}

async function openDeep() {
  state.deepOpen = 'coeur'; $('deep').hidden = false; deep.lastPhase = -1; tip.hidden = true;
  if (reduceMotion) setSpeed(0.25);
  if (!deep.sc) {
    $('deepLoad').hidden = false;
    try { deep.loading = deep.loading || initHeart3D(); await deep.loading; setCut(deep.cut); setLabels(deep.labels); }
    catch (e) { console.error(e); $('deepLoad').textContent = "Le cœur 3D n'a pas pu se charger."; return; }
    $('deepLoad').hidden = true;
  }
  deep.eng.resize();
}
function setSpeed(s) { deep.speed = s; document.querySelectorAll('#speed button').forEach(b => b.classList.toggle('primary', +b.dataset.s === s)); }
document.querySelectorAll('#speed button').forEach(b => b.onclick = () => setSpeed(+b.dataset.s));
setSpeed(0.5);
$('playBtn').onclick = () => { deep.playing = !deep.playing; $('playBtn').textContent = deep.playing ? 'Pause' : 'Lecture'; };
$('stepBtn').onclick = () => { const i = phaseIdx(deep.p); deep.p = PHASES[(i + 1) % 5].a + 0.001; };
$('cutBtn').onclick = () => setCut(!deep.cut);
$('labBtn').onclick = () => setLabels(!deep.labels);
$('closeDeep').onclick = () => { state.deepOpen = false; $('deep').hidden = true; last = performance.now(); };
window.addEventListener('resize', () => { if (deep.eng) deep.eng.resize(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (state.deepOpen === 'coeur') $('closeDeep').click(); else if (state.deepOpen === 'poumons') closeLungDeep(); else if (state.deepOpen === 'cerveau') closeBrainDeep(); else if (state.selected) select(null); } });
