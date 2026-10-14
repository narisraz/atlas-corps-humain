/* ------------------------------------------------------------------ */
/* Plongée 3D : respirer, des poumons à l'alvéole (trois échelles)     */
/* ------------------------------------------------------------------ */
const lung = { b: 0.05, speed: 1, playing: true, level: 0, sc: null, loading: null, lastKey: '', camAnim: null };
const lc = $('lungCanvas'); const lgC = $('lGraph'); const lgx = lgC.getContext('2d'); const lLabels = $('lLabels');
const LUNG_PATHS = __LUNG_PATHS__;
const inspOf = b => b < 0.4 ? smooth(0, 0.4, b) : 1 - smooth(0.4, 1, b);
const O2C = '#f2c94c', CO2C = '#b48ad8';
const satOf = u => 0.75 + 0.23 * (1 - Math.exp(-Math.max(0, u) / 0.11));
const po2Of = u => 40 + 60 * (1 - Math.exp(-Math.max(0, u) / 0.11));
const pco2Of = u => 46 - 6 * (1 - Math.exp(-Math.max(0, u) / 0.12));
const lerpCol = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const BLUE_RGB = [0.25, 0.38, 0.8], RED_RGB = [0.86, 0.17, 0.14];
const OFF1 = V3(10, 0, 0), OFF2 = V3(20, 0, 0);

const LUNG_LEVELS = [
  { nom: 'Poumons', sous: 'la mécanique', c: '#e79a9f' },
  { nom: 'Bronchioles', sous: '23 divisions', c: '#efe2cf' },
  { nom: 'Alvéole', sous: "l'échange des gaz", c: '#f2c94c' },
];
const LUNG_TEXT = {
  '0i': ['Inspiration (active)', "Le diaphragme se contracte et descend d'environ 1,5 cm, les muscles intercostaux externes soulèvent les côtes. Le thorax s'agrandit et la plèvre entraîne les poumons avec lui : la pression dans les alvéoles passe à environ −1 cmH₂O, juste sous celle de l'air extérieur, et l'air entre (≈ 500 mL au repos)."],
  '0e': ['Expiration (passive)', "Les muscles se relâchent. Les fibres élastiques du poumon et la tension de surface des alvéoles le font se rétracter, comme un ballon qui se dégonfle. La pression alvéolaire monte à environ +1 cmH₂O et l'air ressort. À l'effort, les abdominaux et les intercostaux internes accélèrent la sortie."],
  '1i': ["L'arbre bronchique", "De la trachée aux alvéoles, les voies aériennes se divisent en deux environ 23 fois. Les 16 premières générations ne font que conduire l'air : elles le réchauffent à 37 °C, l'humidifient et le filtrent (le mucus piège les poussières, les cils les remontent vers la gorge). À partir de la 17e, des alvéoles s'ouvrent sur les parois : c'est la zone respiratoire."],
  '1e': ["L'arbre bronchique", "À l'expiration, l'air chargé de CO₂ remonte le même chemin. Environ 150 mL de chaque respiration restent dans les voies de conduction sans jamais atteindre une alvéole : c'est l'« espace mort ». Respirer lentement et profondément est donc plus efficace que respirer vite et superficiellement."],
  '2': ["L'alvéole : l'échange des gaz", "Chaque alvéole (≈ 0,2 mm) est enveloppée d'un filet de capillaires. Les gaz traversent une paroi de 0,5 µm par simple diffusion, du plus concentré vers le moins concentré : l'O₂ passe de l'air (104 mmHg) au sang (40 mmHg) et se fixe sur l'hémoglobine des globules rouges ; le CO₂ fait le chemin inverse (46 → 40 mmHg). Un globule met ≈ 0,75 s à longer l'alvéole mais il est plein dès 0,25 s : c'est la réserve qui permet l'effort."],
};

function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const qFromTo = (from, to) => { const q = new BABYLON.Quaternion(); BABYLON.Quaternion.FromUnitVectorsToRef(from, to, q); return q; };
function polyInfo(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + BABYLON.Vector3.Distance(pts[i - 1], pts[i])); return { pts, cum, len: cum[cum.length - 1] }; }
function polyAt(pi, frac, out) {
  const d = clamp(frac, 0, 1) * pi.len; let i = 1; while (i < pi.cum.length - 1 && pi.cum[i] < d) i++;
  const a = pi.pts[i - 1], b = pi.pts[i]; const seg = pi.cum[i] - pi.cum[i - 1] || 1; const t = (d - pi.cum[i - 1]) / seg;
  out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); return out;
}
function lungMat(sc, name, hex, o = {}) {
  const m = new BABYLON.StandardMaterial(name, sc); m.diffuseColor = BABYLON.Color3.FromHexString(hex);
  m.specularColor = new BABYLON.Color3(0.3, 0.28, 0.28); m.specularPower = o.sp || 40; m.backFaceCulling = false; m.twoSidedLighting = true;
  if (o.em) m.emissiveColor = BABYLON.Color3.FromHexString(o.em);
  if (o.alpha != null) {
    m.alpha = o.alpha; m.separateCullingPass = true;
    m.opacityFresnelParameters = new BABYLON.FresnelParameters(); m.opacityFresnelParameters.leftColor = BABYLON.Color3.White(); m.opacityFresnelParameters.rightColor = new BABYLON.Color3(o.alpha, o.alpha, o.alpha); m.opacityFresnelParameters.power = 2.2;
  }
  return m;
}
function dotsMesh(sc, name, hex, count, d, em = 0.6) {
  const m = BABYLON.MeshBuilder.CreateSphere(name, { diameter: d, segments: 5 }, sc);
  const mt = new BABYLON.StandardMaterial(name + 'M', sc); mt.diffuseColor = BABYLON.Color3.FromHexString(hex); mt.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(em); mt.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
  m.material = mt; m.isPickable = false; m.alwaysSelectAsActiveMesh = true;
  const buf = new Float32Array(count * 16); m.thinInstanceSetBuffer('matrix', buf, 16, false);
  return { m, buf, count };
}
const putDot = (buf, i, p, s) => { const o = i * 16; buf.fill(0, o, o + 16); buf[o] = buf[o + 5] = buf[o + 10] = s; buf[o + 12] = p.x; buf[o + 13] = p.y; buf[o + 14] = p.z; buf[o + 15] = 1; };

async function initLung3D() {
  const eng = new BABYLON.Engine(lc, true, { stencil: true, antialias: true }, true);
  eng.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
  const sc = new BABYLON.Scene(eng); sc.clearColor = new BABYLON.Color4(0.035, 0.07, 0.105, 1); sc.skipPointerMovePicking = true;
  const cam = new BABYLON.ArcRotateCamera('lc', Math.PI / 2, 1.45, 0.6, V3(0, 1.3, 0), sc);
  cam.attachControl(lc, true); cam.minZ = 0.004; cam.maxZ = 200; cam.fov = 0.6; cam.wheelDeltaPercentage = 0.01; cam.pinchDeltaPercentage = 0.004; cam.panningSensibility = 0; cam.inertia = 0.85;
  const hemi = new BABYLON.HemisphericLight('lh', V3(0, 1, 0.4), sc); hemi.intensity = 0.65; hemi.groundColor = new BABYLON.Color3(0.18, 0.12, 0.14);
  const key = new BABYLON.DirectionalLight('lk', V3(-0.3, -0.5, -1), sc); key.intensity = 0.9;
  const rim = new BABYLON.DirectionalLight('lr', V3(0.6, 0.3, 1), sc); rim.intensity = 0.4; rim.diffuse = BABYLON.Color3.FromHexString('#9fc3ff');
  sc.onBeforeRenderObservable.add(() => { key.direction = cam.target.subtract(cam.position).normalize().add(V3(0.15, -0.35, 0)); });
  const L = { sc, eng, cam, roots: [], labels: [] };

  /* --- Échelle 1 : les vrais poumons --- */
  const r0 = new BABYLON.TransformNode('niv0', sc); L.roots.push(r0);
  const glb = await fetchModel('poumons3d.txt', () => {});
  const res = await BABYLON.SceneLoader.ImportMeshAsync('', '', glb, sc, null, '.glb');
  const M = {};
  for (const m of res.meshes) {
    const n = (m.name || '').replace(/_primitive\d+$/, ''); if (!m.getTotalVertices || !m.getTotalVertices()) continue;
    m.computeWorldMatrix(true); m.setParent(null); m.bakeCurrentTransformIntoVertices(); m.refreshBoundingInfo(); m.isPickable = false; m.parent = r0; M[n] = m;
  }
  res.meshes.forEach(m => { if (m.name === '__root__') m.dispose(); });
  const lobeMat = lungMat(sc, 'lobes', '#e79a9f', { alpha: 0.2, em: '#2a1012' });
  for (const k of ['lobe_sd', 'lobe_md', 'lobe_id', 'lobe_sg', 'lobe_ig']) { M[k].material = lobeMat; M[k].alphaIndex = 10; }
  M.trachee.material = M.bronches.material = lungMat(sc, 'cartilage', '#efe2cf', { alpha: 0.4, em: '#1a1612' }); M.trachee.material.opacityFresnelParameters = null; M.trachee.alphaIndex = M.bronches.alphaIndex = 12;
  M.art_pulm.material = lungMat(sc, 'artp', '#4d6fc4'); M.vei_pulm.material = lungMat(sc, 'veip', '#d0473f');
  M.diaphragme.material = lungMat(sc, 'diaph', '#b0544c', { alpha: 0.3 }); M.diaphragme.alphaIndex = 8;
  const bbOf = keys => { let mn = V3(1e9, 1e9, 1e9), mx = V3(-1e9, -1e9, -1e9); for (const k of keys) { const b = M[k].getBoundingInfo().boundingBox; mn = BABYLON.Vector3.Minimize(mn, b.minimumWorld); mx = BABYLON.Vector3.Maximize(mx, b.maximumWorld); } return { mn, mx, c: mn.add(mx).scale(0.5) }; };
  const bR = bbOf(['lobe_sd', 'lobe_md', 'lobe_id']), bL = bbOf(['lobe_sg', 'lobe_ig']), bAll = bbOf(['lobe_sd', 'lobe_md', 'lobe_id', 'lobe_sg', 'lobe_ig']);
  for (const k of ['lobe_sd', 'lobe_md', 'lobe_id']) M[k].setPivotPoint(V3(bR.c.x, bR.mx.y, bR.c.z));
  for (const k of ['lobe_sg', 'lobe_ig']) M[k].setPivotPoint(V3(bL.c.x, bL.mx.y, bL.c.z));
  const dbb = M.diaphragme.getBoundingInfo().boundingBox; M.diaphragme.setPivotPoint(V3(dbb.centerWorld.x, dbb.maximumWorld.y, dbb.centerWorld.z));
  L.M = M; L.c0 = bAll.c; L.r0size = bAll.mx.subtract(bAll.mn).length();
  // Air dans les bronches : vrais trajets Z-Anatomy, de la trachée aux bronches segmentaires
  const paths0 = LUNG_PATHS.map(a => { const pts = []; for (let i = 0; i < a.length; i += 3) pts.push(V3(a[i], a[i + 1], a[i + 2])); return polyInfo(pts); });
  const rnd = lcg(11);
  const mkAir = (paths, count, d, root, rad) => {
    const inn = dotsMesh(sc, 'airIn' + root.name, O2C, count, d), out = dotsMesh(sc, 'airOut' + root.name, CO2C, count, d);
    inn.m.parent = out.m.parent = root;
    const list = []; for (let i = 0; i < count; i++) list.push({ pi: paths[i % paths.length], j: rnd(), off: V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).scale(rad) });
    return { inn, out, list };
  };
  L.air0 = mkAir(paths0, 300, 0.0042, r0, 0.004); L.air0.inn.m.renderingGroupId = L.air0.out.m.renderingGroupId = 1;
  L.labels.push(['Trachée', 0, () => paths0[0].pts[3]], ['Bronche souche droite', 0, () => paths0[12].pts[17]], ['Bronche souche gauche', 0, () => paths0[0].pts[19]],
    ['Poumon droit', 0, () => V3(bR.mn.x + (bR.mx.x - bR.mn.x) * 0.75, bR.c.y + 0.03, bR.mx.z)], ['Poumon gauche', 0, () => V3(bL.mn.x + (bL.mx.x - bL.mn.x) * 0.25, bL.c.y + 0.03, bL.mx.z)],
    ['Diaphragme', 0, () => V3(dbb.centerWorld.x, dbb.maximumWorld.y - 0.01 + M.diaphragme.position.y, dbb.maximumWorld.z - 0.02)]);

  /* --- Échelle 2 : des bronchioles aux sacs alvéolaires (modèle schématique) --- */
  const r1 = new BABYLON.TransformNode('niv1', sc); r1.position.copyFrom(OFF1); L.roots.push(r1);
  const tr = lcg(7); const branches = [], leaves = [];
  const grow = (a, dir, len, r, depth, path) => {
    const b = a.add(dir.scale(len)); branches.push({ a, b, r, depth }); const p2 = [...path, b];
    if (depth === 6) { leaves.push({ b, dir, path: p2 }); return; }
    let side = BABYLON.Vector3.Cross(dir, Math.abs(dir.y) < 0.9 ? BABYLON.Axis.Y : BABYLON.Axis.X).normalize();
    side = side.applyRotationQuaternion(BABYLON.Quaternion.RotationAxis(dir, depth * Math.PI / 2 + (tr() - 0.5) * 0.7));
    for (const sg of [-1, 1]) { const a2 = (0.6 - depth * 0.025) * (0.85 + tr() * 0.3); grow(b, dir.scale(Math.cos(a2)).add(side.scale(sg * Math.sin(a2))).normalize(), len * 0.8, r * 0.74, depth + 1, p2); }
  };
  grow(V3(0, 3.4, 0), V3(0, -1, 0), 1.25, 0.17, 0, [V3(0, 3.4, 0)]);
  const tube = (name, hex, list) => {
    const m = BABYLON.MeshBuilder.CreateCylinder(name, { height: 1, diameter: 1, tessellation: 12, cap: BABYLON.Mesh.NO_CAP }, sc); m.material = lungMat(sc, name + 'M', hex, { em: '#1a1410' }); m.parent = r1; m.isPickable = false;
    const buf = new Float32Array(list.length * 16); const mat = new BABYLON.Matrix();
    list.forEach((br, i) => { const d = br.b.subtract(br.a); const len = d.length(); BABYLON.Matrix.ComposeToRef(V3(br.r * 2, len * 1.04, br.r * 2), qFromTo(BABYLON.Axis.Y, d.normalize()), br.a.add(d.scale(0.5)), mat); mat.copyToArray(buf, i * 16); });
    m.thinInstanceSetBuffer('matrix', buf, 16, true); return m;
  };
  tube('conduction', '#efe2cf', branches.filter(b => b.depth < 4)); tube('respiratoire', '#e8b0a8', branches.filter(b => b.depth >= 4));
  // Joints sphériques aux embranchements
  const joints = BABYLON.MeshBuilder.CreateSphere('joints', { diameter: 1, segments: 8 }, sc); joints.parent = r1; joints.material = lungMat(sc, 'jointsM', '#ecd8c4', { em: '#1a1410' });
  { const buf = new Float32Array(branches.length * 16); const mat = new BABYLON.Matrix(); branches.forEach((br, i) => { BABYLON.Matrix.ComposeToRef(V3(br.r * 2.1, br.r * 2.1, br.r * 2.1), BABYLON.Quaternion.Identity(), br.b, mat); mat.copyToArray(buf, i * 16); }); joints.thinInstanceSetBuffer('matrix', buf, 16, true); }
  // Alvéoles : sur les parois de la zone respiratoire et en grappes au bout
  const alv = []; const ar = lcg(3);
  const randUnit = () => V3(ar() - 0.5, ar() - 0.5, ar() - 0.5).normalize();
  for (const br of branches) if (br.depth >= 4) for (let k = 0; k < (br.depth - 3) * 2; k++) { const t = 0.2 + ar() * 0.7; const p = BABYLON.Vector3.Lerp(br.a, br.b, t); const d = br.b.subtract(br.a).normalize(); const u = perp(randUnit(), d).normalize(); alv.push([p.add(u.scale(br.r * 1.1)), br.r * 0.85]); }
  for (const lf of leaves) { const c = lf.b.add(lf.dir.scale(0.17)); for (let k = 0; k < 9; k++) alv.push([c.add(randUnit().scale(0.11 + ar() * 0.04)), 0.075 + ar() * 0.02]); }
  const alvM = BABYLON.MeshBuilder.CreateSphere('alveoles', { diameter: 1, segments: 10 }, sc); alvM.parent = r1; alvM.material = lungMat(sc, 'alvM', '#f2aaa8', { alpha: 0.6, em: '#3a1416' });
  { const buf = new Float32Array(alv.length * 16); const mat = new BABYLON.Matrix(); alv.forEach(([p, r], i) => { BABYLON.Matrix.ComposeToRef(V3(r * 2, r * 2, r * 2), BABYLON.Quaternion.Identity(), p, mat); mat.copyToArray(buf, i * 16); }); alvM.thinInstanceSetBuffer('matrix', buf, 16, true); }
  L.alv1 = alvM;
  const paths1 = leaves.map(lf => polyInfo([...lf.path, lf.b.add(lf.dir.scale(0.17))]));
  L.air1 = mkAir(paths1, 320, 0.075, r1, 0.12);
  const pick = (d, f) => branches.filter(b => b.depth === d).reduce((m, b) => f(b) > f(m) ? b : m);
  const midOf = b => BABYLON.Vector3.Lerp(b.a, b.b, 0.5);
  const bT = pick(3, b => b.b.x + b.b.z), bR2 = pick(5, b => -b.b.x + b.b.z), lS = leaves.reduce((m, l) => l.b.x - l.b.y > m.b.x - m.b.y ? l : m);
  L.labels.push(['Bronchiole (conduction)', 1, () => OFF1.add(midOf(branches[0]))], ['Bronchiole terminale', 1, () => OFF1.add(midOf(bT))],
    ['Bronchiole respiratoire', 1, () => OFF1.add(midOf(bR2))], ['Sac alvéolaire', 1, () => OFF1.add(lS.b.add(lS.dir.scale(0.3)))]);
  { let mn = V3(1e9, 1e9, 1e9), mx = V3(-1e9, -1e9, -1e9); for (const b of branches) { mn = BABYLON.Vector3.Minimize(mn, b.b); mx = BABYLON.Vector3.Maximize(mx, b.b); } mx = BABYLON.Vector3.Maximize(mx, V3(0, 3.4, 0)); L.c1 = OFF1.add(mn.add(mx).scale(0.5)); L.r1 = mx.subtract(mn).length(); }

  /* --- Échelle 3 : une alvéole et ses capillaires --- */
  const r2 = new BABYLON.TransformNode('niv2', sc); r2.position.copyFrom(OFF2); L.roots.push(r2);
  const memb = lungMat(sc, 'membrane', '#f0b0b0', { alpha: 0.2, em: '#2a0e10' }); const membN = lungMat(sc, 'membraneN', '#f0b0b0', { alpha: 0.07, em: '#1a0a0c' });
  const main = BABYLON.MeshBuilder.CreateSphere('alveole', { diameter: 2, segments: 32 }, sc); main.parent = r2; main.material = memb; main.alphaIndex = 5;
  const neigh = [];
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.4; const s = BABYLON.MeshBuilder.CreateSphere('voisine' + k, { diameter: 1.7, segments: 20 }, sc); s.parent = r2; s.position.set(Math.cos(a) * 1.75, Math.sin(a) * 1.75, -0.9); s.material = membN; s.alphaIndex = 4; neigh.push(s); }
  const duct = BABYLON.MeshBuilder.CreateCylinder('canal', { height: 1.6, diameter: 0.7, tessellation: 24, cap: BABYLON.Mesh.NO_CAP }, sc); duct.parent = r2; duct.position.set(0.5, 1.3, -0.35); duct.rotation.z = -0.4; duct.material = membN;
  L.alvMain = main; L.alvNeigh = neigh;
  // Capillaires : bandes qui enlacent la face avant de l'alvéole, du côté veineux (gauche) au côté artériel (droit)
  const CAP_R = 1.07, LON0 = -2.25, LON1 = 2.25;
  const capPt = (k, u) => { const lon = LON0 + (LON1 - LON0) * u; const lat = -0.75 + 0.37 * k + 0.12 * Math.sin(2.2 * lon + k * 1.7); return V3(-Math.cos(lat) * Math.sin(lon) * CAP_R, Math.sin(lat) * CAP_R, Math.cos(lat) * Math.cos(lon) * CAP_R); };
  const caps = [];
  for (let k = 0; k < 5; k++) {
    const pts = []; for (let i = 0; i <= 60; i++) pts.push(capPt(k, -0.06 + i / 60 * 1.12));
    const t = BABYLON.MeshBuilder.CreateTube('cap' + k, { path: pts, radius: 0.085, tessellation: 14, cap: BABYLON.Mesh.NO_CAP, updatable: false }, sc); t.parent = r2;
    const P = t.getVerticesData('position'); const col = new Float32Array(P.length / 3 * 4);
    for (let i = 0; i < P.length / 3; i++) { const lon = Math.atan2(-P[i * 3], P[i * 3 + 2]); const u = (lon - LON0) / (LON1 - LON0); const c = lerpCol(BLUE_RGB, RED_RGB, clamp((satOf(u) - 0.75) / 0.23, 0, 1)); col.set([c[0], c[1], c[2], 1], i * 4); }
    t.setVerticesData('color', col); const tm = lungMat(sc, 'capM' + k, '#ffffff', { alpha: 0.55 }); tm.opacityFresnelParameters = null; t.material = tm; t.useVertexColors = true; t.alphaIndex = 6;
    caps.push(t);
  }
  // Globules rouges : disques aplatis, couleur selon leur saturation en O₂
  const rbc = BABYLON.MeshBuilder.CreateSphere('globules', { diameter: 0.15, segments: 10 }, sc); rbc.parent = r2;
  const rm = new BABYLON.StandardMaterial('rbcM', sc); rm.diffuseColor = BABYLON.Color3.White(); rm.specularColor = new BABYLON.Color3(0.35, 0.3, 0.3); rm.emissiveColor = new BABYLON.Color3(0.15, 0.05, 0.05); rbc.material = rm; rbc.alwaysSelectAsActiveMesh = true;
  const cells = []; for (let k = 0; k < 5; k++) for (let i = 0; i < 6; i++) cells.push({ k, u: i / 6 + (k * 0.07) % 0.17 - 0.05 });
  const rbcBuf = new Float32Array(cells.length * 16), rbcCol = new Float32Array(cells.length * 4);
  rbc.thinInstanceSetBuffer('matrix', rbcBuf, 16, false); rbc.thinInstanceSetBuffer('color', rbcCol, 4, false);
  L.cells = cells; L.rbc = rbc; L.rbcBuf = rbcBuf; L.rbcCol = rbcCol; L.capPt = capPt;
  // Gaz : O₂ (jaune) qui entre dans le sang, CO₂ (violet) qui en sort
  L.o2 = dotsMesh(sc, 'o2', O2C, 160, 0.05, 0.7); L.co2 = dotsMesh(sc, 'co2', CO2C, 160, 0.05, 0.7); L.o2.m.parent = L.co2.m.parent = r2;
  L.o2.list = []; L.co2.list = [];
  L.bg = dotsMesh(sc, 'o2air', O2C, 70, 0.04, 0.5); L.bg.m.parent = r2; L.bg.list = []; const br = lcg(5);
  for (let i = 0; i < 70; i++) { const p = V3(br() - 0.5, br() - 0.5, br() - 0.5).normalize().scale(Math.cbrt(br()) * 0.82); L.bg.list.push({ p, v: V3(br() - 0.5, br() - 0.5, br() - 0.5).scale(0.25) }); }
  L.track = cells[12];
  L.labels.push(['Alvéole (air)', 2, () => OFF2.add(V3(0.15, 0.25, -0.2))], ['Capillaire', 2, () => OFF2.add(capPt(0, 0.1))], ['Sang pauvre en O₂', 2, () => OFF2.add(capPt(4, 0.0).add(V3(0.2, 0.25, 0)))],
    ['Sang riche en O₂', 2, () => OFF2.add(capPt(4, 1).add(V3(-0.2, 0.25, 0)))], ['Globule suivi', 2, () => OFF2.add(capPt(L.track.k, L.track.u).scale(1.06)), 'v'], ['Canal alvéolaire', 2, () => OFF2.add(V3(0.85, 1.95, -0.35))]);
  L.c2 = OFF2.clone();

  // Étiquettes HTML
  L.labels = L.labels.map(([t, lvl, pos, cls]) => { const el = document.createElement('div'); el.className = 'lab' + (cls ? ' ' + cls : ''); el.textContent = t; lLabels.appendChild(el); return { el, lvl, pos }; });
  Object.assign(lung, L); window.__lung = lung;
}

/* Interface de la plongée poumons */
const lSteps = $('lSteps');
lSteps.innerHTML = LUNG_LEVELS.map((l, i) => `<li data-i="${i}" style="--c:${l.c}"><i></i><span>${i + 1} · ${l.nom}</span><span>${l.sous}</span></li>`).join('');
lSteps.querySelectorAll('li').forEach(li => li.onclick = () => setLungLevel(+li.dataset.i));
document.querySelectorAll('#lLevels button').forEach(b => b.onclick = () => setLungLevel(+b.dataset.l));
function lungPreset(i) {
  const mob = lc.clientWidth < 520;
  if (i === 0) return { t: lung.c0.add(V3(0, lung.r0size * 0.08, 0)), r: lung.r0size * (mob ? 1.65 : 1.45), a: Math.PI / 2, b: 1.42, lo: lung.r0size * 0.3, hi: lung.r0size * 4 };
  if (i === 1) return { t: lung.c1.clone(), r: lung.r1 * (mob ? 1.9 : 1.35), a: Math.PI / 2 - 0.3, b: 1.4, lo: 2, hi: 20 };
  return { t: lung.c2.clone(), r: mob ? 6.6 : 5.2, a: Math.PI / 2, b: 1.5, lo: 1.6, hi: 12 };
}
function setLungLevel(i, instant) {
  lung.level = i; lung.lastKey = '';
  lSteps.querySelectorAll('li').forEach((li, k) => li.classList.toggle('on', k === i));
  document.querySelectorAll('#lLevels button').forEach(b => b.classList.toggle('primary', +b.dataset.l === i));
  setLungSpeed(i === 2 ? 0.25 : 1);
  if (!lung.sc) return;
  lung.roots.forEach((r, k) => r.setEnabled(k === i));
  const p = lungPreset(i); const cam = lung.cam;
  cam.lowerRadiusLimit = null; cam.upperRadiusLimit = null;
  lung.camAnim = { s: performance.now(), dur: instant ? 0 : 900, fT: cam.target.clone(), fR: cam.radius, fA: cam.alpha, fB: cam.beta, p };
  $('lHint').textContent = i === 0 ? "Les vrais poumons (Z-Anatomy), rendus transparents pour voir l'arbre bronchique, les artères pulmonaires (bleu, sang pauvre en O₂) et les veines pulmonaires (rouge). Jaune : air riche en O₂ qui entre ; violet : air chargé de CO₂ qui sort."
    : i === 1 ? "Modèle schématique : seules 7 des 23 divisions sont dessinées. En crème, la zone de conduction ; en rose, la zone respiratoire où les alvéoles apparaissent."
    : "Modèle schématique, très agrandi : une alvéole fait environ 0,2 mm. Jaune : O₂ ; violet : CO₂. La couleur des globules passe du bleu au rouge à mesure qu'ils se chargent en oxygène.";
}
function setLungSpeed(s) { lung.speed = s; document.querySelectorAll('#lSpeed button').forEach(b => b.classList.toggle('primary', +b.dataset.s === s)); }
document.querySelectorAll('#lSpeed button').forEach(b => b.onclick = () => setLungSpeed(+b.dataset.s));
$('lPlay').onclick = () => { lung.playing = !lung.playing; $('lPlay').textContent = lung.playing ? 'Pause' : 'Lecture'; };
$('lNext').onclick = () => setLungLevel((lung.level + 1) % 3);
function closeLungDeep() { state.deepOpen = false; $('deepLung').hidden = true; last = performance.now(); }
$('lClose').onclick = closeLungDeep;
window.addEventListener('resize', () => { if (lung.eng) lung.eng.resize(); });

async function openLungDeep() {
  state.deepOpen = 'poumons'; $('deepLung').hidden = false; tip.hidden = true;
  if (!lung.sc) {
    $('lLoad').hidden = false; setLungLevel(0);
    try { lung.loading = lung.loading || initLung3D(); await lung.loading; }
    catch (e) { console.error(e); $('lLoad').textContent = "Les poumons 3D n'ont pas pu se charger."; return; }
    $('lLoad').hidden = true; lung.eng.resize(); setLungLevel(lung.level, true);
  }
  lung.eng.resize(); if (reduceMotion) setLungSpeed(0.25);
}

const lTmp = V3(0, 0, 0), lTmp2 = V3(0, 0, 0);
function moveAir(air, insp, dir) {
  const { inn, out, list } = air; const show = dir >= 0 ? inn : out, hide = dir >= 0 ? out : inn;
  show.m.setEnabled(true); hide.m.setEnabled(false);
  for (let i = 0; i < list.length; i++) {
    const q = list[i]; const s = clamp(insp * 1.55 - q.j * 0.55, 0, 1);
    if (s <= 0.001) { putDot(show.buf, i, lTmp, 0); continue; }
    polyAt(q.pi, s, lTmp); lTmp.addInPlace(q.off.scale(0.4 + 0.6 * s)); putDot(show.buf, i, lTmp, 1);
  }
  show.m.thinInstanceBufferUpdated('matrix');
}

function drawLungDeep(dt) {
  if (!lung.sc) return;
  const rr = respRate();
  if (lung.playing) lung.b = (lung.b + dt * lung.speed * rr / 60) % 1;
  const b = lung.b, insp = inspOf(b), dir = b < 0.4 ? 1 : -1; const L = lung;
  const mdt = lung.playing ? dt * lung.speed : 0;
  // Caméra
  if (L.camAnim) {
    const A = L.camAnim; const t = A.dur ? Math.min(1, (performance.now() - A.s) / A.dur) : 1; const e = 1 - Math.pow(1 - t, 3);
    L.cam.target = BABYLON.Vector3.Lerp(A.fT, A.p.t, e); L.cam.radius = A.fR + (A.p.r - A.fR) * e; L.cam.alpha = A.fA + (A.p.a - A.fA) * e; L.cam.beta = A.fB + (A.p.b - A.fB) * e;
    if (t >= 1) { L.cam.lowerRadiusLimit = A.p.lo; L.cam.upperRadiusLimit = A.p.hi; L.camAnim = null; }
  }
  if (L.level === 0) {
    const M = L.M;
    for (const k of ['lobe_sd', 'lobe_md', 'lobe_id', 'lobe_sg', 'lobe_ig']) M[k].scaling.set(1 + 0.045 * insp, 1 + 0.075 * insp, 1 + 0.045 * insp);
    M.diaphragme.position.y = -0.015 * insp; M.diaphragme.scaling.y = 1 - 0.12 * insp;
    moveAir(L.air0, insp, dir);
  } else if (L.level === 1) {
    moveAir(L.air1, insp, dir);
    L.alv1.scaling.setAll(1);
  } else {
    L.alvMain.scaling.setAll(1 + 0.04 * insp); L.alvNeigh.forEach(s => s.scaling.setAll(1 + 0.04 * insp));
    // Globules
    const mat = new BABYLON.Matrix(); const q = new BABYLON.Quaternion();
    for (let i = 0; i < L.cells.length; i++) {
      const c = L.cells[i]; c.u += mdt / 0.75 * 0.85; if (c.u > 1.06) c.u -= 1.12;
      const p = L.capPt(c.k, c.u), p2 = L.capPt(c.k, c.u + 0.01); const tg = p2.subtract(p).normalize(); const nrm = p.clone().normalize(); const side = BABYLON.Vector3.Cross(nrm, tg);
      BABYLON.Quaternion.RotationQuaternionFromAxisToRef(side, nrm, tg, q);
      BABYLON.Matrix.ComposeToRef(V3(1, 0.42, 1), q, p, mat); mat.copyToArray(L.rbcBuf, i * 16);
      const col = lerpCol(BLUE_RGB, RED_RGB, clamp((satOf(c.u) - 0.75) / 0.23, 0, 1)); L.rbcCol.set([col[0], col[1], col[2], 1], i * 4);
      // Échanges : surtout dans le premier tiers du trajet
      if (c.u > 0 && c.u < 1 && mdt > 0) {
        if (Math.random() < 14 * Math.exp(-c.u / 0.11) * mdt && L.o2.list.length < L.o2.count) L.o2.list.push({ c, from: p.scale(0.72).add(V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).scale(0.25)), t: 0 });
        if (Math.random() < 9 * Math.exp(-c.u / 0.12) * mdt && L.co2.list.length < L.co2.count) L.co2.list.push({ from: p.clone(), to: p.scale(0.55).add(V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).scale(0.3)), t: 0 });
      }
    }
    L.rbc.thinInstanceBufferUpdated('matrix'); L.rbc.thinInstanceBufferUpdated('color');
    // O₂ : de l'air vers le globule (il le rattrape)
    L.o2.list = L.o2.list.filter(g => (g.t += mdt / 0.3) < 1);
    L.o2.buf.fill(0); L.o2.list.forEach((g, i) => { const to = L.capPt(g.c.k, g.c.u); putDot(L.o2.buf, i, BABYLON.Vector3.Lerp(g.from, to, smooth(0, 1, g.t)), 1); });
    L.o2.m.thinInstanceBufferUpdated('matrix');
    // CO₂ : du globule vers l'air, puis il s'efface (il sera expiré)
    L.co2.list = L.co2.list.filter(g => (g.t += mdt / 1.6) < 1);
    L.co2.buf.fill(0); L.co2.list.forEach((g, i) => { putDot(L.co2.buf, i, BABYLON.Vector3.Lerp(g.from, g.to, smooth(0, 0.3, g.t)), g.t < 0.75 ? 1 : (1 - g.t) * 4); });
    L.co2.m.thinInstanceBufferUpdated('matrix');
    // O₂ de l'air alvéolaire : agitation thermique
    L.bg.list.forEach((g, i) => { g.p.addInPlace(g.v.scale(mdt)); if (g.p.length() > 0.85) { g.v.scaleInPlace(-1); g.p.scaleInPlace(0.98); } putDot(L.bg.buf, i, g.p, 1); });
    L.bg.m.thinInstanceBufferUpdated('matrix');
  }
  L.sc.render();
  // Étiquettes
  const w = lc.clientWidth, h = lc.clientHeight; const tm = L.sc.getTransformMatrix(); const vp = L.cam.viewport.toGlobal(w, h);
  for (const lb of L.labels) {
    if (lb.lvl !== L.level || L.camAnim) { lb.el.style.display = 'none'; continue; }
    const s = BABYLON.Vector3.Project(lb.pos(), BABYLON.Matrix.IdentityReadOnly, tm, vp);
    const vis = s.z > 0 && s.z < 1 && s.x > 0 && s.x < w && s.y > 0 && s.y < h;
    lb.el.style.display = vis ? '' : 'none'; if (vis) lb.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
  }
  updateLungSide(insp, dir);
  drawLungGraph(b, insp);
}

function updateLungSide(insp, dir) {
  const L = lung; const lv = L.level; const key = lv === 2 ? '2' : lv + (dir > 0 ? 'i' : 'e');
  if (key !== L.lastKey) {
    L.lastKey = key; const [t, d] = LUNG_TEXT[key];
    $('lEyebrow').textContent = `Échelle ${lv + 1} sur 3 · ${LUNG_LEVELS[lv].nom}` + (lv < 2 ? (dir > 0 ? ' · inspiration' : ' · expiration') : '');
    $('lTitle').textContent = t; $('lText').textContent = d;
  }
  const box = (n, v, on) => `<div class="valve ${on ? 'open' : 'shut'}"><span>${n}</span><b>${v}</b></div>`;
  let html;
  if (lv === 0) {
    const flow = Math.abs(insp - inspOf((L.b + 0.995) % 1)) > 0.0004;
    html = box('Volume', `${(2.5 + 0.5 * insp).toFixed(2).replace('.', ',')} L`, true) + box('Pression alvéolaire', flow ? (dir > 0 ? '−1 cmH₂O' : '+1 cmH₂O') : '0', flow)
      + box('Diaphragme', dir > 0 ? 'se contracte' : 'se relâche', dir > 0) + box('Fréquence', `${respRate()} / min`, true);
  } else if (lv === 1) {
    html = box('Air', dir > 0 ? 'entre' : 'sort', dir > 0) + box('Divisions', '≈ 23', true) + box('Bronchiole terminale', '≈ 0,5 mm', true) + box('Alvéoles', '≈ 480 millions', true);
  } else {
    const u = clamp(L.track.u, 0, 1);
    html = box('PO₂ du globule', `${Math.round(po2Of(u))} mmHg`, u > 0.3) + box('Saturation', `${Math.round(satOf(u) * 100)} %`, u > 0.3)
      + box('Temps passé', `${(u * 0.75).toFixed(2).replace('.', ',')} s`, true) + box('PCO₂', `${Math.round(pco2Of(u))} mmHg`, u > 0.3);
  }
  if (html !== L.lastStats) { $('lStats').innerHTML = html; L.lastStats = html; }
}

function drawLungGraph(b, insp) {
  const w = lgC.clientWidth, h = lgC.clientHeight; const dpr = Math.min(devicePixelRatio, 2);
  if (lgC.width !== Math.round(w * dpr) || lgC.height !== Math.round(h * dpr)) { lgC.width = Math.round(w * dpr); lgC.height = Math.round(h * dpr); }
  const g = lgx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const gx = 14, gw = w - 28, H = h - 22;
  g.font = '11px "IBM Plex Mono", monospace'; g.textAlign = 'left';
  if (lung.level < 2) {
    g.fillStyle = 'rgba(242,201,76,.12)'; g.fillRect(gx, 4, gw * 0.4, H - 4); g.fillStyle = 'rgba(180,138,216,.12)'; g.fillRect(gx + gw * 0.4, 4, gw * 0.6, H - 4);
    g.fillStyle = O2C; g.fillRect(gx, H + 2, gw * 0.4 - 2, 4); g.fillStyle = CO2C; g.fillRect(gx + gw * 0.4, H + 2, gw * 0.6, 4);
    g.strokeStyle = '#8fd3ff'; g.lineWidth = 2; g.beginPath();
    for (let n = 0; n <= 200; n++) { const x = gx + n / 200 * gw; const y = H - 6 - inspOf(n / 200) * (H - 16); n ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    const cx = gx + b * gw; g.strokeStyle = '#ece5d5'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, H + 6); g.stroke();
    g.fillStyle = '#a9b1b8'; g.fillText(`Volume d'air dans les poumons · une respiration = ${(60 / respRate()).toFixed(1).replace('.', ',')} s · ≈ 0,5 L échangé`, gx, h - 3);
  } else {
    const yOf = v => H - 4 - (v - 30) / 80 * (H - 10);
    g.strokeStyle = 'rgba(242,201,76,.6)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(gx, yOf(104)); g.lineTo(gx + gw, yOf(104)); g.stroke(); g.setLineDash([]);
    g.fillStyle = O2C; g.fillText('air alvéolaire 104 mmHg', gx + gw - 170, yOf(104) - 4);
    g.strokeStyle = '#ff6a5c'; g.lineWidth = 2; g.beginPath(); for (let n = 0; n <= 200; n++) { const x = gx + n / 200 * gw; const y = yOf(po2Of(n / 200)); n ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.fillStyle = 'rgba(143,209,158,.18)'; g.fillRect(gx, 4, gw / 3, H - 4);
    const u = clamp(lung.track.u, 0, 1); const cx = gx + u * gw; g.strokeStyle = '#ece5d5'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, H + 6); g.stroke();
    g.fillStyle = '#a9b1b8'; g.fillText(`PO₂ du globule suivi le long du capillaire (0 → 0,75 s) · plein d'O₂ dès 0,25 s`, gx, h - 3);
  }
}
