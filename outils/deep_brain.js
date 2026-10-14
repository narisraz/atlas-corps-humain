/* ------------------------------------------------------------------ */
/* Plongée 3D : le cerveau, des aires à la synapse (trois échelles)    */
/* ------------------------------------------------------------------ */
const brain = { level: 0, speed: 1, playing: true, sc: null, loading: null, circuit: 0, nt: 0, t: 0, lastKey: '', camAnim: null, hist: [] };
const bc = $('brainCanvas'); const bgC = $('bGraph'); const bgx = bgC.getContext('2d'); const bLabels = $('bLabels');
const BOFF1 = V3(10, 0, 0), BOFF2 = V3(20, 0, 0);
const AREAS = {
  moteur: ['#e5735f', 'Cortex moteur', "Commande les mouvements volontaires, muscle par muscle."],
  sensitif: ['#e9a14f', 'Cortex sensitif', 'Reçoit le toucher, la douleur, la position du corps.'],
  broca: ['#c77dd9', 'Aire de Broca', 'Produit la parole (planifie les mots).'],
  prefrontal: ['#6fa8dc', 'Cortex préfrontal', 'Décide, planifie, retient une information quelques secondes, freine les impulsions.'],
  parietal: ['#7cc4a4', 'Cortex pariétal', "Situe les objets dans l'espace et guide la main vers eux."],
  audition: ['#f2c94c', 'Cortex auditif et Wernicke', 'Entend les sons et comprend les mots.'],
  temporal: ['#8fb3c9', 'Cortex temporal', 'Reconnaît les visages, les objets, le sens des mots.'],
  hippocampe: ['#e98fb0', 'Hippocampe', 'Enregistre les nouveaux souvenirs et les lieux.'],
  limbique: ['#b6a3e0', 'Cortex cingulaire', "Émotions, motivation, détection d'erreur."],
  insula: ['#d7b98e', 'Insula', "Sensations internes : faim, dégoût, battements du cœur."],
  vision: ['#5fc9d9', 'Cortex visuel', 'Analyse les images : contours, couleurs, mouvement.'],
  amygdale: ['#ff6b6b', 'Amygdale', 'Détecte le danger et déclenche la peur.'],
  striatum: ['#9ad36a', 'Striatum (noyau accumbens)', 'Choisit les actions, centre du plaisir et de la motivation.'],
  thalamus: ['#5f8fe6', 'Thalamus', 'Gare de triage : relaie presque toutes les sensations vers le cortex.'],
  hypothalamus: ['#f08c3c', 'Hypothalamus', 'Règle la faim, la soif, la température et les hormones (stress).'],
  tronc: ['#c99f86', 'Tronc cérébral', 'Respiration, rythme cardiaque, éveil ; relie le cerveau à la moelle.'],
  cervelet: ['#d8a6a0', 'Cervelet', 'Coordonne et ajuste les mouvements, équilibre.'],
  sillons: ['#c9b8ad'], optique: ['#e8e0c8'], ventricules: ['#7fb0ff'],
};
const CORTEX = ['moteur', 'sensitif', 'broca', 'prefrontal', 'parietal', 'audition', 'temporal', 'limbique', 'insula', 'vision', 'sillons'];
const CIRCUITS = [
  { nom: 'Carte des aires', sous: 'qui fait quoi', steps: [], d: "Le cortex, la couche plissée de 2 à 4 mm qui recouvre le cerveau, est divisé en aires spécialisées. On regarde ici l'hémisphère gauche. Aucune aire ne travaille seule : chaque geste ou pensée active un réseau. Choisissez un circuit pour le voir s'allumer." },
  { nom: 'Voir puis attraper', sous: 'vision → geste', steps: ['vision', 'parietal', 'prefrontal', 'moteur', 'cervelet', 'tronc'], d: "La lumière frappe la rétine ; l'image arrive au cortex visuel, à l'arrière. Le cortex pariétal calcule où est l'objet, le préfrontal décide de l'attraper, le cortex moteur envoie l'ordre, le cervelet ajuste la trajectoire et l'ordre descend par le tronc cérébral vers la moelle puis les muscles. Le tout prend environ 0,2 s." },
  { nom: 'Entendre et répondre', sous: 'langage', steps: ['thalamus', 'audition', 'temporal', 'broca', 'moteur'], d: "Le son passe par le thalamus puis le cortex auditif. L'aire de Wernicke (arrière du lobe temporal) comprend les mots, le faisceau arqué transmet à l'aire de Broca (lobe frontal) qui prépare la réponse, puis le cortex moteur commande la bouche et le larynx. Chez 95 % des droitiers, ce circuit est à gauche." },
  { nom: 'Récompense', sous: 'dopamine', steps: ['tronc', 'striatum', 'prefrontal', 'limbique'], d: "Quand quelque chose est meilleur que prévu (nourriture, réussite, like), des neurones du tronc cérébral (aire tegmentale ventrale) libèrent de la dopamine dans le noyau accumbens et le cortex préfrontal. Ce signal dit « refais-le » : il crée la motivation et l'apprentissage. Les drogues détournent précisément ce circuit." },
  { nom: 'Peur', sous: 'amygdale', steps: ['thalamus', 'amygdale', 'hypothalamus', 'tronc', 'prefrontal'], d: "Un bruit soudain : le thalamus l'envoie directement à l'amygdale (voie rapide, ≈ 12 ms, avant même d'avoir compris). L'amygdale alerte l'hypothalamus (hormones du stress) et le tronc cérébral (cœur qui s'accélère). Plus lentement, le cortex préfrontal analyse et peut calmer l'alerte : « ce n'était qu'une porte »." },
  { nom: 'Mémoire', sous: 'hippocampe', steps: ['temporal', 'hippocampe', 'hypothalamus', 'thalamus', 'limbique', 'hippocampe'], d: "Pour garder un souvenir, l'hippocampe relie les morceaux d'une expérience (lieu, visages, sons). L'information tourne dans le circuit de Papez (hippocampe, corps mamillaires, thalamus, cortex cingulaire) puis, surtout pendant le sommeil, est transférée vers le cortex pour le long terme." },
];
const AP_STEPS = [
  ['Repos', '−70 mV', '#5f8fe6', "Au repos, l'intérieur du neurone est négatif (−70 mV). La pompe sodium-potassium garde beaucoup de Na⁺ dehors et de K⁺ dedans, comme un barrage chargé."],
  ['Dépolarisation', '→ +40 mV', '#ff9f43', "Un stimulus fait passer le seuil (−55 mV) : les canaux Na⁺ s'ouvrent, le sodium s'engouffre et l'intérieur devient positif en moins d'une milliseconde. C'est tout ou rien."],
  ['Repolarisation', '→ −70 mV', '#6ee7a8', "Les canaux Na⁺ se ferment, les canaux K⁺ s'ouvrent : le potassium sort et l'intérieur redevient négatif."],
  ['Hyperpolarisation', '−80 mV', '#b6a3e0', "Les canaux K⁺ se ferment avec retard : la tension descend brièvement sous le repos. Pendant cette période réfractaire, le neurone ne peut pas refaire de pic, ce qui oblige l'influx à avancer dans un seul sens."],
];
const NTS = [
  { nom: 'Glutamate', c: '#7ee081', sign: 1, ion: '#ff9f43', d: "Le principal messager excitateur du cerveau. Il ouvre des canaux qui laissent entrer le Na⁺ : le neurone suivant se rapproche de son seuil (PPSE). Indispensable à l'apprentissage ; en excès, il est toxique (AVC)." },
  { nom: 'GABA', c: '#6fb6ff', sign: -1, ion: '#9be7ff', d: "Le principal frein du cerveau. Il ouvre des canaux à chlore (Cl⁻) : le neurone suivant s'éloigne de son seuil (PPSI). L'alcool et les anxiolytiques (benzodiazépines) renforcent son effet, d'où la somnolence." },
  { nom: 'Dopamine', c: '#ffb347', sign: 0.45, ion: '#ff9f43', d: "Un modulateur : elle ne déclenche pas directement de pic mais change la sensibilité du neurone, via des récepteurs couplés aux protéines G. Motivation, récompense, mouvement (son manque cause la maladie de Parkinson). La cocaïne bloque sa recapture." },
  { nom: 'Sérotonine', c: '#c38bff', sign: 0.3, ion: '#ff9f43', d: "Un modulateur de l'humeur, du sommeil et de l'appétit. Beaucoup d'antidépresseurs (ISRS) bloquent sa recapture : elle reste plus longtemps dans la fente. 90 % de la sérotonine du corps est en fait dans l'intestin." },
];
// Forme du potentiel d'action (temps ralenti, en secondes « modèle »)
const apShape = d => d < 0 ? -70 : d < 0.04 ? -70 + 110 * smooth(0, 0.04, d) : d < 0.11 ? 40 - 120 * smooth(0.04, 0.11, d) : d < 0.4 ? -80 + 10 * smooth(0.11, 0.4, d) : -70;
const apPhase = d => d < 0 || d >= 0.4 ? 0 : d < 0.04 ? 1 : d < 0.11 ? 2 : 3;

async function initBrain3D() {
  const eng = new BABYLON.Engine(bc, true, { stencil: true, antialias: true }, true);
  eng.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
  const sc = new BABYLON.Scene(eng); sc.clearColor = new BABYLON.Color4(0.035, 0.07, 0.105, 1); sc.skipPointerMovePicking = true;
  const cam = new BABYLON.ArcRotateCamera('bc', Math.PI, 1.35, 0.32, V3(0, 1.63, 0), sc);
  cam.attachControl(bc, true); cam.minZ = 0.003; cam.maxZ = 200; cam.fov = 0.6; cam.wheelDeltaPercentage = 0.01; cam.pinchDeltaPercentage = 0.004; cam.panningSensibility = 0; cam.inertia = 0.85;
  const hemi = new BABYLON.HemisphericLight('bh', V3(0, 1, 0.4), sc); hemi.intensity = 0.65; hemi.groundColor = new BABYLON.Color3(0.18, 0.12, 0.14);
  const key = new BABYLON.DirectionalLight('bk', V3(-0.3, -0.5, -1), sc); key.intensity = 0.9;
  const rim = new BABYLON.DirectionalLight('br', V3(0.6, 0.3, 1), sc); rim.intensity = 0.4; rim.diffuse = BABYLON.Color3.FromHexString('#9fc3ff');
  sc.onBeforeRenderObservable.add(() => { key.direction = cam.target.subtract(cam.position).normalize().add(V3(0.15, -0.35, 0)); });
  const B = { sc, eng, cam, roots: [], labels: [] };

  /* --- Échelle 1 : le vrai cerveau, aires et circuits --- */
  const r0 = new BABYLON.TransformNode('bniv0', sc); B.roots.push(r0);
  const glb = await fetchModel('cerveau3d.txt', () => {});
  const res = await BABYLON.SceneLoader.ImportMeshAsync('', '', glb, sc, null, '.glb');
  const M = {}, MAT = {}, PT = {};
  for (const m of res.meshes) {
    const n = (m.name || '').replace(/_primitive\d+$/, ''); if (!AREAS[n] || !m.getTotalVertices()) continue;
    m.computeWorldMatrix(true); m.setParent(null); m.bakeCurrentTransformIntoVertices(); m.refreshBoundingInfo(); m.isPickable = false; m.parent = r0; M[n] = m;
    const mt = new BABYLON.StandardMaterial('bm_' + n, sc); mt.diffuseColor = BABYLON.Color3.FromHexString(AREAS[n][0]); mt.specularColor = new BABYLON.Color3(0.25, 0.22, 0.22); mt.specularPower = 32;
    mt.backFaceCulling = false; mt.twoSidedLighting = true; mt.emissiveColor = new BABYLON.Color3(0, 0, 0); m.material = mt; MAT[n] = mt;
    // Point de repère : centre de la partie gauche (sauf structures médianes)
    const P = m.getVerticesData('position'); const c = V3(0, 0, 0); let k = 0; const mid = ['tronc', 'hypothalamus', 'cervelet', 'ventricules', 'optique'].includes(n);
    for (let i = 0; i < P.length; i += 3) if (mid || P[i] < -0.004) { c.x += P[i]; c.y += P[i + 1]; c.z += P[i + 2]; k++; }
    PT[n] = c.scale(1 / Math.max(1, k));
  }
  res.meshes.forEach(m => { if (m.name === '__root__') m.dispose(); });
  PT.tronc = PT.tronc.add(V3(0, 0.012, 0.004));
  if (M.ventricules) { MAT.ventricules.alpha = 0.6; }
  if (M.sillons) { MAT.sillons.diffuseColor = BABYLON.Color3.FromHexString('#cdb9ad'); }
  B.M = M; B.MAT = MAT; B.PT = PT;
  let mn = V3(1e9, 1e9, 1e9), mx = V3(-1e9, -1e9, -1e9); for (const m of Object.values(M)) { const P = m.getVerticesData('position'); for (let i = 0; i < P.length; i += 3) { mn.minimizeInPlaceFromFloats(P[i], P[i + 1], P[i + 2]); mx.maximizeInPlaceFromFloats(P[i], P[i + 1], P[i + 2]); } }
  B.c0 = mn.add(mx).scale(0.5); B.size0 = mx.subtract(mn).length();
  // Influx : trois points lumineux qui suivent le circuit
  B.pulse = dotsMesh(sc, 'influx', '#fff4c2', 3, 0.006, 1.2); B.pulse.m.parent = r0; B.pulse.m.renderingGroupId = 1;
  B.trail = dotsMesh(sc, 'trainee', '#ffd36b', 24, 0.0035, 1); B.trail.m.parent = r0; B.trail.m.renderingGroupId = 1;
  for (const n of Object.keys(AREAS)) if (AREAS[n][1] && PT[n]) B.labels.push([AREAS[n][1], 0, () => PT[n], n]);

  /* --- Échelle 2 : un neurone et son potentiel d'action --- */
  const r1 = new BABYLON.TransformNode('bniv1', sc); r1.position.copyFrom(BOFF1); B.roots.push(r1);
  const mat = (n, hex, o = {}) => lungMat(sc, n, hex, o);
  const axY = x => 0.15 * Math.sin(x * 0.6);
  const axPath = (x0, x1, n = 40) => { const p = []; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; p.push(V3(x, axY(x), 0)); } return p; };
  const soma = BABYLON.MeshBuilder.CreateSphere('soma', { diameter: 1.5, segments: 24 }, sc); soma.parent = r1; soma.position.set(-5.3, 0, 0); soma.scaling.set(1.15, 1, 1); soma.material = mat('somaM', '#e2a77f', { em: '#2a1408' });
  const nucleus = BABYLON.MeshBuilder.CreateSphere('noyau', { diameter: 0.6, segments: 16 }, sc); nucleus.parent = r1; nucleus.position.set(-5.35, 0.05, 0.42); nucleus.material = mat('noyM', '#8a5bb0');
  const hill = BABYLON.MeshBuilder.CreateCylinder('cone', { height: 0.75, diameterTop: 0.22, diameterBottom: 0.75, tessellation: 20 }, sc); hill.parent = r1; hill.rotation.z = Math.PI / 2; hill.position.set(-4.35, 0, 0); hill.material = soma.material;
  const axon = BABYLON.MeshBuilder.CreateTube('axone', { path: axPath(-4.1, 6.6, 120), radius: 0.1, tessellation: 12, cap: BABYLON.Mesh.CAP_ALL }, sc); axon.parent = r1; axon.material = mat('axM', '#d9b48f', { em: '#1a1008' });
  const NODES = []; for (let k = 0; k < 7; k++) NODES.push(-3.2 + k * 1.5);
  const myelM = mat('myM', '#f3efe2', { em: '#1c1a14' });
  const sheathEnds = [[-4.0, NODES[0] - 0.14], ...NODES.slice(0, -1).map((x, k) => [x + 0.14, NODES[k + 1] - 0.14]), [NODES[6] + 0.14, 6.0]];
  sheathEnds.forEach(([a, b], k) => { const t = BABYLON.MeshBuilder.CreateTube('gaine' + k, { path: axPath(a, b, 16), radius: 0.3, tessellation: 18, cap: BABYLON.Mesh.CAP_ALL }, sc); t.parent = r1; t.material = myelM; });
  const nodeMats = NODES.map((x, k) => { const t = BABYLON.MeshBuilder.CreateTorus('noeud' + k, { diameter: 0.3, thickness: 0.08, tessellation: 20 }, sc); t.parent = r1; t.rotation.z = Math.PI / 2; t.position.set(x, axY(x), 0); const m = mat('nM' + k, '#ffd36b'); t.material = m; return m; });
  // Dendrites : arborescence courbée qui s'affine
  const dr = lcg(21); const dendM = mat('dendM', '#e2a77f', { em: '#2a1408' });
  const dend = (start, dir, len, r, depth) => {
    const pts = [start]; let p = start.clone(), d = dir.clone();
    for (let i = 0; i < 6; i++) { d = d.add(V3(dr() - 0.5, dr() - 0.5, dr() - 0.5).scale(0.5)).normalize(); p = p.add(d.scale(len / 6)); pts.push(p.clone()); }
    const t = BABYLON.MeshBuilder.CreateTube('dend', { path: pts, radiusFunction: (i) => r * (1 - 0.45 * i / 6), tessellation: 8, cap: BABYLON.Mesh.CAP_END }, sc); t.parent = r1; t.material = dendM;
    if (depth < 2) for (let k = 0; k < 2; k++) dend(p, d.add(V3(dr() - 0.5, dr() - 0.5, dr() - 0.5).scale(1.2)).normalize(), len * 0.62, r * 0.55, depth + 1);
  };
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const dir = V3(-0.8, Math.cos(a), Math.sin(a)).normalize(); dend(V3(-5.3, 0, 0).add(dir.scale(0.65)), dir, 2.2, 0.16, 0); }
  // Terminaisons
  const termEnds = [V3(7.6, 0.9, 0.5), V3(7.8, 0.2, -0.7), V3(7.5, -0.7, 0.4), V3(7.3, -1.1, -0.5)];
  const axEnd = V3(6.6, axY(6.6), 0);
  termEnds.forEach((e, k) => { const t = BABYLON.MeshBuilder.CreateTube('term' + k, { path: [axEnd, axEnd.add(e).scale(0.5).add(V3(0, 0.1, 0)), e], radius: 0.07, tessellation: 8 }, sc); t.parent = r1; t.material = axon.material;
    const s = BABYLON.MeshBuilder.CreateSphere('bouton' + k, { diameter: 0.42, segments: 12 }, sc); s.parent = r1; s.position.copyFrom(e); s.material = mat('boutM' + k, '#e6b88a', { em: '#2a1408' }); });
  B.neu = { NODES, nodeMats, axY, termEnds, axEnd, spikes: [], last: -9, hill };
  B.neu.spark = dotsMesh(sc, 'pic', '#fff4c2', 1, 0.42, 1.4); B.neu.spark.m.parent = r1; B.neu.spark.m.renderingGroupId = 1;
  B.neu.na = dotsMesh(sc, 'na', '#ff9f43', 140, 0.09, 0.8); B.neu.k = dotsMesh(sc, 'kp', '#6ee7a8', 140, 0.09, 0.8); B.neu.na.m.parent = B.neu.k.m.parent = r1; B.neu.na.list = []; B.neu.k.list = [];
  B.labels.push(['Corps cellulaire', 1, () => BOFF1.add(V3(-5.3, 0.95, 0))], ['Dendrites', 1, () => BOFF1.add(V3(-7.2, 1.4, 0.2))], ['Gaine de myéline', 1, () => BOFF1.add(V3((NODES[1] + NODES[2]) / 2, 0.55, 0))],
    ['Nœud de Ranvier', 1, () => BOFF1.add(V3(NODES[4], axY(NODES[4]) - 0.45, 0))], ['Axone', 1, () => BOFF1.add(V3(6.3, 0.35, 0))], ['Terminaisons', 1, () => BOFF1.add(V3(7.9, 1.35, 0.5))], ['Mesure', 1, () => BOFF1.add(V3(NODES[3], axY(NODES[3]) + 0.45, 0)), 'v']);

  /* --- Échelle 3 : la synapse --- */
  const r2 = new BABYLON.TransformNode('bniv2', sc); r2.position.copyFrom(BOFF2); B.roots.push(r2);
  const pre = BABYLON.MeshBuilder.CreateSphere('pre', { diameter: 4, segments: 32 }, sc); pre.parent = r2; pre.position.y = 2.4; pre.material = mat('preM', '#e2b48a', { alpha: 0.13, em: '#2a1408' }); pre.material.opacityFresnelParameters.power = 4; pre.alphaIndex = 5;
  const preAx = BABYLON.MeshBuilder.CreateCylinder('preAx', { height: 3, diameter: 0.9, tessellation: 24 }, sc); preAx.parent = r2; preAx.position.y = 5.6; preAx.material = pre.material;
  const post = BABYLON.MeshBuilder.CreateSphere('post', { diameter: 2, segments: 40 }, sc); post.parent = r2; post.scaling.set(3.3, 0.9, 3.3); post.position.y = -0.95; post.material = mat('postM', '#c9a0d8', { alpha: 0.32, em: '#1a0c22' }); post.alphaIndex = 4;
  const sr = lcg(9); const ves = [];
  const vesM = BABYLON.MeshBuilder.CreateSphere('vesicules', { diameter: 0.34, segments: 10 }, sc); vesM.parent = r2; const vmat = mat('vesMat', '#f6e7c1', { alpha: 0.85 }); vmat.opacityFresnelParameters = null; vesM.material = vmat; vesM.alwaysSelectAsActiveMesh = true;
  for (let i = 0; i < 40; i++) {
    const docked = i < 7; let p;
    if (docked) { const a = i / 7 * Math.PI * 2; p = V3(Math.cos(a) * 0.75 * (0.4 + sr() * 0.6), 0.62, Math.sin(a) * 0.75 * (0.4 + sr() * 0.6)); }
    else { do { p = V3((sr() - 0.5) * 3, 0.9 + sr() * 2.2, (sr() - 0.5) * 3); } while (p.subtract(V3(0, 2.4, 0)).length() > 1.65); }
    ves.push({ home: p, p: p.clone(), docked, s: 1 });
  }
  B.ves = ves; B.vesM = vesM; B.vesBuf = new Float32Array(ves.length * 16); vesM.thinInstanceSetBuffer('matrix', B.vesBuf, 16, false);
  const recM = BABYLON.MeshBuilder.CreateCylinder('recepteurs', { height: 0.22, diameter: 0.2, tessellation: 10 }, sc); recM.parent = r2; recM.material = mat('recMat', '#ffffff', { em: '#101010' }); recM.alwaysSelectAsActiveMesh = true;
  const recs = []; for (let i = 0; i < 18; i++) { const a = i * 2.39996; const rr = 0.25 + Math.sqrt(i / 18) * 1.15; recs.push({ p: V3(Math.cos(a) * rr, -0.02, Math.sin(a) * rr), g: 0 }); }
  B.recs = recs; B.recM = recM; B.recBuf = new Float32Array(recs.length * 16); B.recCol = new Float32Array(recs.length * 4);
  { const m = new BABYLON.Matrix(); recs.forEach((r, i) => { BABYLON.Matrix.ComposeToRef(V3(1, 1, 1), BABYLON.Quaternion.Identity(), r.p, m); m.copyToArray(B.recBuf, i * 16); }); }
  recM.thinInstanceSetBuffer('matrix', B.recBuf, 16, true); recM.thinInstanceSetBuffer('color', B.recCol, 4, false);
  const trM = BABYLON.MeshBuilder.CreateBox('transporteurs', { size: 0.22 }, sc); trM.parent = r2; trM.material = mat('trMat', '#9fd0ff', { em: '#0a1a2a' });
  B.trans = [0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2 + 0.3; return V3(Math.cos(a) * 1.45, 0.75, Math.sin(a) * 1.45); });
  { const buf = new Float32Array(B.trans.length * 16); const m = new BABYLON.Matrix(); B.trans.forEach((p, i) => { BABYLON.Matrix.ComposeToRef(V3(1, 1, 1), BABYLON.Quaternion.Identity(), p, m); m.copyToArray(buf, i * 16); }); trM.thinInstanceSetBuffer('matrix', buf, 16, true); }
  const caM = BABYLON.MeshBuilder.CreateCylinder('canauxCa', { height: 0.25, diameter: 0.16, tessellation: 8 }, sc); caM.parent = r2; caM.material = mat('caMat', '#7fe3ff', { em: '#0a2a33' });
  B.caCh = [0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * Math.PI * 2; return V3(Math.cos(a) * 1.05, 0.5, Math.sin(a) * 1.05); });
  { const buf = new Float32Array(6 * 16); const m = new BABYLON.Matrix(); B.caCh.forEach((p, i) => { BABYLON.Matrix.ComposeToRef(V3(1, 1, 1), BABYLON.Quaternion.Identity(), p, m); m.copyToArray(buf, i * 16); }); caM.thinInstanceSetBuffer('matrix', buf, 16, true); }
  B.ntd = dotsMesh(sc, 'nt', '#7ee081', 260, 0.075, 0.9); B.ntd.m.parent = r2; B.ntd.list = [];
  B.ca = dotsMesh(sc, 'ca', '#7fe3ff', 40, 0.07, 0.9); B.ca.m.parent = r2; B.ca.list = [];
  B.ion = dotsMesh(sc, 'ionPost', '#ff9f43', 80, 0.07, 0.9); B.ion.m.parent = r2; B.ion.list = [];
  B.apSyn = dotsMesh(sc, 'apSyn', '#fff4c2', 1, 0.5, 1.4); B.apSyn.m.parent = r2; B.apSyn.m.renderingGroupId = 1;
  B.syn = { last: -9, cycle: 0, post: -70 };
  B.labels.push(['Bouton présynaptique', 2, () => BOFF2.add(V3(-1.9, 3.4, 0))], ['Vésicules', 2, () => BOFF2.add(V3(0.9, 2.0, 0.9))], ['Fente synaptique (20 nm)', 2, () => BOFF2.add(V3(2.25, 0.2, 0))],
    ['Récepteurs', 2, () => BOFF2.add(V3(-1.2, -0.25, 0.8))], ['Neurone suivant', 2, () => BOFF2.add(V3(0, -1.5, 2.4))], ['Recapture', 2, () => BOFF2.add(B.trans[0].add(V3(0.45, 0.2, 0)))], ['Canaux Ca²⁺', 2, () => BOFF2.add(B.caCh[3].add(V3(-0.3, -0.25, 0)))]);

  B.labels = B.labels.map(([t, lvl, pos, key]) => { const el = document.createElement('div'); el.className = 'lab' + (key === 'v' ? ' v' : ''); el.textContent = t; bLabels.appendChild(el); return { el, lvl, pos, key }; });
  Object.assign(brain, B); window.__brain = brain;
  applyCircuit(brain.circuit); setNT(brain.nt);
}

/* Interface */
const bList = $('bList');
function renderBrainList() {
  const lv = brain.level;
  const items = lv === 0 ? CIRCUITS.map((c, i) => [c.nom, c.sous, i === 0 ? '#c9b8ad' : AREAS[c.steps[0]][0]]) : lv === 1 ? AP_STEPS.map(s => [s[0], s[1], s[2]]) : NTS.map(n => [n.nom, n.sign > 0.9 ? 'excitateur' : n.sign < 0 ? 'inhibiteur' : 'modulateur', n.c]);
  bList.innerHTML = items.map(([a, b, c], i) => `<li data-i="${i}" style="--c:${c}"><i></i><span>${a}</span><span>${b}</span></li>`).join('');
  bList.querySelectorAll('li').forEach(li => li.onclick = () => { const i = +li.dataset.i; if (brain.level === 0) applyCircuit(i); else if (brain.level === 2) setNT(i); else fireSpike(); });
  markBrainList();
}
function markBrainList(i) {
  const on = brain.level === 0 ? brain.circuit : brain.level === 2 ? brain.nt : i;
  bList.querySelectorAll('li').forEach((li, k) => li.classList.toggle('on', k === on));
}
function applyCircuit(i) {
  brain.circuit = i; brain.lastKey = ''; brain.pulseS = 0;
  if (brain.MAT) {
    const steps = CIRCUITS[i].steps;
    for (const [n, mt] of Object.entries(brain.MAT)) {
      const inC = steps.includes(n); const cortex = CORTEX.includes(n);
      if (i === 0) { mt.alpha = n === 'ventricules' ? 0.6 : 1; }
      else mt.alpha = cortex ? (inC ? 0.92 : 0.1) : (inC ? 1 : (n === 'cervelet' || n === 'tronc' ? 0.35 : 0.5));
      const base = BABYLON.Color3.FromHexString(AREAS[n][0]);
      mt.diffuseColor = i === 0 || inC ? base : BABYLON.Color3.Lerp(base, BABYLON.Color3.FromHexString('#c9b8ad'), 0.7);
      mt.emissiveColor.set(0, 0, 0);
    }
    if (i > 0) { const pts = steps.map(s => brain.PT[s]); brain.curve = polyInfo(BABYLON.Curve3.CreateCatmullRomSpline(pts, 14, false).getPoints()); brain.stepIdx = -1; }
  }
  markBrainList(); $('bReplay').hidden = i === 0 || brain.level !== 0;
}
function setNT(i) {
  brain.nt = i; brain.lastKey = '';
  if (brain.ntd) {
    const c = BABYLON.Color3.FromHexString(NTS[i].c); brain.ntd.m.material.diffuseColor = c; brain.ntd.m.material.emissiveColor = c.scale(0.9);
    const ic = BABYLON.Color3.FromHexString(NTS[i].ion); brain.ion.m.material.diffuseColor = ic; brain.ion.m.material.emissiveColor = ic.scale(0.9);
    brain.ntd.list.length = 0; brain.hist.length = 0;
  }
  markBrainList();
}
function fireSpike() { if (brain.neu) brain.neu.spikes.push(brain.t); }
function brainPreset(i) {
  const mob = bc.clientWidth < 520;
  if (i === 0) return { t: brain.c0.clone(), r: brain.size0 * (mob ? 2.1 : 1.45), a: Math.PI + 0.25, b: 1.3, lo: brain.size0 * 0.6, hi: brain.size0 * 5 };
  if (i === 1) return { t: BOFF1.add(V3(0.4, 0, 0)), r: mob ? 36 : 19.5, a: -Math.PI / 2 - 0.25, b: 1.25, lo: 3, hi: 40 };
  return { t: BOFF2.add(V3(0, 1.5, 0)), r: mob ? 16 : 12, a: -Math.PI / 2 - 0.35, b: 1.3, lo: 3, hi: 25 };
}
function setBrainLevel(i, instant) {
  brain.level = i; brain.lastKey = '';
  document.querySelectorAll('#bLevels button').forEach(b => b.classList.toggle('primary', +b.dataset.l === i));
  $('bReplay').hidden = !(i === 0 && brain.circuit > 0); $('bFire').hidden = i === 0;
  renderBrainList();
  if (!brain.sc) return;
  brain.roots.forEach((r, k) => r.setEnabled(k === i));
  const p = brainPreset(i); const cam = brain.cam; cam.lowerRadiusLimit = null; cam.upperRadiusLimit = null;
  brain.camAnim = { s: performance.now(), dur: instant ? 0 : 900, fT: cam.target.clone(), fR: cam.radius, fA: cam.alpha, fB: cam.beta, p };
  $('bHint').textContent = i === 0 ? "Le vrai cerveau (Z-Anatomy), hémisphère gauche vu de côté. Faites-le tourner pour voir l'intérieur ; dans un circuit, le reste du cortex devient transparent."
    : i === 1 ? "Modèle schématique d'un neurone myélinisé, ralenti environ mille fois. Orange : ions Na⁺ qui entrent ; vert : ions K⁺ qui sortent. L'influx saute d'un nœud de Ranvier à l'autre (conduction saltatoire)."
    : "Modèle schématique très agrandi : la fente synaptique ne mesure que 20 nanomètres. Bleu clair : ions calcium ; points colorés : le neurotransmetteur choisi ; cubes bleus : transporteurs de recapture.";
}
function setBrainSpeed(s) { brain.speed = s; document.querySelectorAll('#bSpeed button').forEach(b => b.classList.toggle('primary', +b.dataset.s === s)); }
document.querySelectorAll('#bSpeed button').forEach(b => b.onclick = () => setBrainSpeed(+b.dataset.s));
document.querySelectorAll('#bLevels button').forEach(b => b.onclick = () => setBrainLevel(+b.dataset.l));
$('bPlay').onclick = () => { brain.playing = !brain.playing; $('bPlay').textContent = brain.playing ? 'Pause' : 'Lecture'; };
$('bNext').onclick = () => setBrainLevel((brain.level + 1) % 3);
$('bReplay').onclick = () => { brain.pulseS = 0; brain.stepIdx = -1; };
$('bFire').onclick = () => { if (brain.level === 1) fireSpike(); else if (brain.syn) brain.syn.last = -9; };
function closeBrainDeep() { state.deepOpen = false; $('deepBrain').hidden = true; last = performance.now(); }
$('bClose').onclick = closeBrainDeep;
window.addEventListener('resize', () => { if (brain.eng) brain.eng.resize(); });
setBrainSpeed(1);

async function openBrainDeep() {
  state.deepOpen = 'cerveau'; $('deepBrain').hidden = false; tip.hidden = true;
  if (!brain.sc) {
    $('bLoad').hidden = false; setBrainLevel(0);
    try { brain.loading = brain.loading || initBrain3D(); await brain.loading; }
    catch (e) { console.error(e); $('bLoad').textContent = "Le cerveau 3D n'a pas pu se charger."; return; }
    $('bLoad').hidden = true; brain.eng.resize(); setBrainLevel(brain.level, true);
  }
  brain.eng.resize(); if (reduceMotion) setBrainSpeed(0.5);
}

const bTmp = V3(0, 0, 0);
function drawBrainDeep(dt) {
  if (!brain.sc) return;
  const B = brain; const mdt = B.playing ? dt * B.speed : 0; B.t += mdt;
  if (B.camAnim) {
    const A = B.camAnim; const t = A.dur ? Math.min(1, (performance.now() - A.s) / A.dur) : 1; const e = 1 - Math.pow(1 - t, 3);
    B.cam.target = BABYLON.Vector3.Lerp(A.fT, A.p.t, e); B.cam.radius = A.fR + (A.p.r - A.fR) * e; B.cam.alpha = A.fA + (A.p.a - A.fA) * e; B.cam.beta = A.fB + (A.p.b - A.fB) * e;
    if (t >= 1) { B.cam.lowerRadiusLimit = A.p.lo; B.cam.upperRadiusLimit = A.p.hi; B.camAnim = null; }
  }
  let liveStep = 0;
  if (B.level === 0) {
    const C = CIRCUITS[B.circuit];
    for (const [n, mt] of Object.entries(B.MAT)) { const e = mt.emissiveColor; e.scaleInPlace(Math.exp(-mdt * 2.5)); }
    if (B.circuit > 0 && B.curve) {
      const n = C.steps.length; B.pulseS = (B.pulseS || 0) + mdt * 0.55; if (B.pulseS > n + 0.8) { B.pulseS = 0; B.stepIdx = -1; }
      const s = Math.min(B.pulseS, n - 1); const idx = Math.min(n - 1, Math.round(s));
      if (Math.abs(s - idx) < 0.12 && idx !== B.stepIdx && B.pulseS <= n - 1 + 0.12) { B.stepIdx = idx; const mt = B.MAT[C.steps[idx]]; mt.emissiveColor.copyFrom(BABYLON.Color3.FromHexString(AREAS[C.steps[idx]][0]).scale(0.85)); }
      const f = s / (n - 1); const vis = B.pulseS <= n - 1 + 0.3;
      for (let k = 0; k < 3; k++) { polyAt(B.curve, clamp(f - k * 0.012, 0, 1), bTmp); putDot(B.pulse.buf, k, bTmp, vis ? 1 - k * 0.25 : 0); }
      for (let k = 0; k < 24; k++) { polyAt(B.curve, clamp(f - 0.03 - k * 0.012, 0, 1), bTmp); putDot(B.trail.buf, k, bTmp, vis && f - 0.03 - k * 0.012 > 0 ? 1 - k / 24 : 0); }
      liveStep = Math.max(0, B.stepIdx);
    } else { B.pulse.buf.fill(0); B.trail.buf.fill(0); }
    B.pulse.m.thinInstanceBufferUpdated('matrix'); B.trail.m.thinInstanceBufferUpdated('matrix');
  } else if (B.level === 1) {
    const N = B.neu; const DT = 0.16;
    if (B.t - N.last > 2.2) { N.spikes.push(B.t); }
    if (N.spikes.length) N.last = N.spikes[N.spikes.length - 1];
    N.spikes = N.spikes.filter(t0 => B.t - t0 < 2.2);
    N.nodeMats.forEach(m => m.emissiveColor.set(0, 0, 0));
    let spark = null;
    for (const t0 of N.spikes) {
      const d = B.t - t0;
      N.NODES.forEach((x, k) => {
        const tk = 0.12 + k * DT; const g = Math.exp(-Math.pow((d - tk) / 0.05, 2)); const m = N.nodeMats[k]; m.emissiveColor.r += 1.0 * g; m.emissiveColor.g += 0.75 * g; m.emissiveColor.b += 0.3 * g;
        if (d >= tk && d - mdt < tk && mdt > 0) { // ouverture des canaux à ce nœud
          for (let i = 0; i < 9; i++) { const a = Math.random() * Math.PI * 2; N.na.list.push({ x, a, t: 0, dir: -1 }); }
          for (let i = 0; i < 7; i++) { const a = Math.random() * Math.PI * 2; N.k.list.push({ x, a, t: -0.07, dir: 1 }); }
        }
      });
      if (d >= 0 && d < 0.12 + 6 * DT + 0.4) {
        let x; if (d < 0.12) x = -4.4 + (N.NODES[0] + 4.4) * (d / 0.12);
        else { const u = (d - 0.12) / DT; const k = Math.min(6, Math.floor(u)); const fr = u - k; x = k >= 6 ? N.NODES[6] + Math.min(1, fr / 1.5) * (6.6 - N.NODES[6]) : N.NODES[k] + (N.NODES[k + 1] - N.NODES[k]) * smooth(0.55, 0.8, fr); }
        spark = V3(x, N.axY(x), 0);
      }
    }
    putDot(N.spark.buf, 0, spark || bTmp, spark ? 1 : 0); N.spark.m.thinInstanceBufferUpdated('matrix');
    const ionStep = (pool) => {
      pool.list = pool.list.filter(g => (g.t += mdt / 0.22) < 1);
      pool.buf.fill(0);
      pool.list.forEach((g, i) => { if (i >= pool.count || g.t < 0) return; const u = smooth(0, 1, g.t); const r = g.dir < 0 ? 0.75 - 0.62 * u : 0.13 + 0.62 * u; putDot(pool.buf, i, V3(g.x + (g.dir < 0 ? 0 : 0.05), N.axY(g.x) + Math.cos(g.a) * r, Math.sin(g.a) * r), g.t > 0.85 ? (1 - g.t) / 0.15 : 1); });
      pool.m.thinInstanceBufferUpdated('matrix');
    };
    ionStep(N.na); ionStep(N.k);
    const d3 = N.spikes.length ? B.t - N.spikes[N.spikes.length - 1] - (0.12 + 3 * DT) : 9;
    B.v = apShape(d3); liveStep = apPhase(d3);
    B.hist.push([B.t, B.v]); while (B.hist.length && B.t - B.hist[0][0] > 3) B.hist.shift();
  } else {
    // Synapse : un cycle toutes les 3 s (temps modèle)
    const S = B.syn; if (B.t - S.last > 3.2) { S.last = B.t; S.fired = false; }
    const d = B.t - S.last; const nt = NTS[B.nt];
    // Potentiel d'action qui descend l'axone jusqu'au bouton
    putDot(B.apSyn.buf, 0, V3(0, 7 - 6.2 * smooth(0, 0.45, d), 0), d < 0.5 ? 1 : 0); B.apSyn.m.thinInstanceBufferUpdated('matrix');
    // Entrée de calcium
    if (d > 0.45 && d - mdt <= 0.45 && mdt > 0) for (let i = 0; i < 24; i++) { const c = B.caCh[i % 6]; B.ca.list.push({ from: c.add(V3(0, -0.25, 0)), to: c.add(V3((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6)), t: -Math.random() * 0.15 }); }
    B.ca.list = B.ca.list.filter(g => (g.t += mdt / 0.5) < 1); B.ca.buf.fill(0);
    B.ca.list.forEach((g, i) => { if (g.t >= 0) putDot(B.ca.buf, i, BABYLON.Vector3.Lerp(g.from, g.to, smooth(0, 0.6, g.t)), g.t > 0.8 ? (1 - g.t) * 5 : 1); }); B.ca.m.thinInstanceBufferUpdated('matrix');
    // Vésicules : les vésicules amarrées fusionnent et libèrent leur contenu
    const mtx = new BABYLON.Matrix();
    B.ves.forEach((v, i) => {
      if (v.docked) {
        if (d < 0.6) { v.s = Math.min(1, v.s + mdt * 2); v.p.copyFrom(v.home); }
        else if (d < 0.95) { const u = smooth(0.6, 0.95, d); v.p.set(v.home.x, v.home.y - 0.22 * u, v.home.z); v.s = 1 - 0.9 * smooth(0.8, 0.95, d);
          if (d >= 0.9 && !v.rel) { v.rel = true; for (let k = 0; k < 30; k++) B.ntd.list.push({ p: V3(v.home.x, 0.36, v.home.z), v: V3((Math.random() - 0.5) * 1.6, -0.4 - Math.random() * 0.8, (Math.random() - 0.5) * 1.6), st: 0, t: 0, rec: null }); } }
        else { v.s = 0.1 + 0.9 * smooth(2.4, 3.1, d); if (d > 2.4) v.rel = false; }
      } else { v.p.set(v.home.x + 0.04 * Math.sin(B.t * 1.3 + i), v.home.y + 0.04 * Math.cos(B.t * 1.1 + i), v.home.z); }
      BABYLON.Matrix.ComposeToRef(V3(v.s, v.s, v.s), BABYLON.Quaternion.Identity(), v.p, mtx); mtx.copyToArray(B.vesBuf, i * 16);
    });
    B.vesM.thinInstanceBufferUpdated('matrix');
    // Neurotransmetteurs : diffusion → fixation → recapture
    B.recs.forEach(r => r.g = Math.max(0, r.g - mdt * 1.2));
    let bound = 0;
    B.ntd.list = B.ntd.list.filter(g => {
      g.t += mdt;
      if (g.st === 0) {
        g.p.addInPlace(g.v.scale(mdt)); g.v.addInPlace(V3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6).scale(mdt)); g.v.scaleInPlace(Math.exp(-mdt * 1.5));
        if (g.p.y > 0.36) { g.p.y = 0.36; g.v.y = -Math.abs(g.v.y); } const rr = Math.hypot(g.p.x, g.p.z); if (rr > 1.9) { g.p.x *= 1.9 / rr; g.p.z *= 1.9 / rr; }
        if (g.p.y < 0.05) { g.p.y = 0.05; g.v.y = Math.abs(g.v.y) * 0.5; const r = B.recs.find(r => Math.hypot(r.p.x - g.p.x, r.p.z - g.p.z) < 0.22 && !r.busy); if (r) { g.st = 1; g.rec = r; r.busy = true; g.t = 0; } }
        if (g.t > 1.3) { g.st = 2; g.t = 0; g.from = g.p.clone(); g.to = B.trans[Math.floor(Math.random() * B.trans.length)].clone(); }
      } else if (g.st === 1) {
        g.p.set(g.rec.p.x, 0.12, g.rec.p.z); g.rec.g = 1; bound++;
        if (g.t > 0.45) { g.rec.busy = false; g.st = 2; g.t = 0; g.from = g.p.clone(); g.to = B.trans[Math.floor(Math.random() * B.trans.length)].clone();
          if (nt.sign !== 0) for (let k = 0; k < 2; k++) B.ion.list.push({ from: V3(g.rec.p.x, 0.3, g.rec.p.z), to: V3(g.rec.p.x + (Math.random() - 0.5) * 0.4, -0.75, g.rec.p.z + (Math.random() - 0.5) * 0.4), t: 0 }); }
      } else { const u = smooth(0, 1, g.t / 0.7); g.p = BABYLON.Vector3.Lerp(g.from, g.to, u); if (g.t > 0.7) return false; }
      return true;
    });
    B.ntd.buf.fill(0); B.ntd.list.forEach((g, i) => { if (i < B.ntd.count) putDot(B.ntd.buf, i, g.p, 1); }); B.ntd.m.thinInstanceBufferUpdated('matrix');
    B.ion.list = B.ion.list.filter(g => (g.t += mdt / 0.6) < 1); B.ion.buf.fill(0); B.ion.list.forEach((g, i) => { if (i < B.ion.count) putDot(B.ion.buf, i, BABYLON.Vector3.Lerp(g.from, g.to, smooth(0, 1, g.t)), g.t > 0.8 ? (1 - g.t) * 5 : 1); }); B.ion.m.thinInstanceBufferUpdated('matrix');
    const rc = BABYLON.Color3.FromHexString(nt.c);
    B.recs.forEach((r, i) => { const g = r.g; B.recCol.set([0.75 + (rc.r - 0.75) * g + 0.3 * g, 0.75 + (rc.g - 0.75) * g + 0.3 * g, 0.78 + (rc.b - 0.78) * g + 0.3 * g, 1], i * 4); }); B.recM.thinInstanceBufferUpdated('color');
    // Potentiel post-synaptique
    const target = -70 + nt.sign * Math.min(bound, 12) * (nt.sign > 0 ? 1.4 : 0.9) * (Math.abs(nt.sign) < 0.9 ? 0.6 : 1);
    S.post += (target - S.post) * (1 - Math.exp(-mdt * (target > S.post === nt.sign > 0 ? 9 : 2.5)));
    B.v = S.post; B.hist.push([B.t, B.v]); while (B.hist.length && B.t - B.hist[0][0] > 4) B.hist.shift();
    liveStep = d < 0.45 ? 0 : d < 0.9 ? 1 : d < 2 ? 2 : 3;
  }
  B.sc.render();
  // Étiquettes
  const w = bc.clientWidth, h = bc.clientHeight; const tm = B.sc.getTransformMatrix(); const vp = B.cam.viewport.toGlobal(w, h);
  const steps = B.level === 0 ? CIRCUITS[B.circuit].steps : null;
  for (const lb of B.labels) {
    let show = lb.lvl === B.level && !B.camAnim;
    if (show && B.level === 0) show = B.circuit === 0 ? ['moteur', 'sensitif', 'prefrontal', 'broca', 'parietal', 'audition', 'temporal', 'vision', 'cervelet'].includes(lb.key) : steps.includes(lb.key);
    if (!show) { lb.el.style.display = 'none'; continue; }
    const s = BABYLON.Vector3.Project(lb.pos(), BABYLON.Matrix.IdentityReadOnly, tm, vp);
    const vis = s.z > 0 && s.z < 1 && s.x > 0 && s.x < w && s.y > 0 && s.y < h;
    lb.el.style.display = vis ? '' : 'none'; if (vis) lb.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
    if (B.level === 0 && B.circuit > 0) lb.el.classList.toggle('hot', steps[B.stepIdx] === lb.key);
  }
  updateBrainSide(liveStep);
  drawBrainGraph(liveStep);
}

function updateBrainSide(step) {
  const B = brain; const lv = B.level;
  const key = lv + ':' + (lv === 0 ? B.circuit : lv === 1 ? step : B.nt);
  if (key !== B.lastKey) {
    B.lastKey = key;
    if (lv === 0) { const c = CIRCUITS[B.circuit]; $('bEyebrow').textContent = `Échelle 1 sur 3 · Cerveau` + (B.circuit ? ` · circuit ${B.circuit} sur 5` : ''); $('bTitle').textContent = c.nom; $('bText').textContent = c.d; }
    else if (lv === 1) { const s = AP_STEPS[step]; $('bEyebrow').textContent = `Échelle 2 sur 3 · Neurone · ${s[1]}`; $('bTitle').textContent = s[0]; $('bText').textContent = s[3]; markBrainList(step); }
    else { const n = NTS[B.nt]; $('bEyebrow').textContent = `Échelle 3 sur 3 · Synapse · ${n.sign > 0.9 ? 'excitateur' : n.sign < 0 ? 'inhibiteur' : 'modulateur'}`; $('bTitle').textContent = n.nom; $('bText').textContent = n.d; }
  }
  const box = (n, v, on) => `<div class="valve ${on ? 'open' : 'shut'}"><span>${n}</span><b>${v}</b></div>`;
  let html;
  if (lv === 0) {
    const c = CIRCUITS[B.circuit];
    if (!B.circuit) html = box('Neurones', '≈ 86 milliards', true) + box('Connexions', '≈ 100 000 milliards', true) + box('Poids', '≈ 1,4 kg', true) + box('Énergie', '20 % du corps', true);
    else { const a = AREAS[c.steps[Math.max(0, B.stepIdx)]]; html = box('Étape', `${Math.max(0, B.stepIdx) + 1} / ${c.steps.length}`, true) + `<div class="valve open" style="grid-column:1/-1;flex-direction:column;align-items:flex-start"><b style="color:${a[0]}">${a[1]}</b><span>${a[2]}</span></div>`; }
  } else if (lv === 1) {
    html = box('Tension au point de mesure', `${Math.round(B.v)} mV`, B.v > -55) + box('Canaux Na⁺', step === 1 ? 'ouverts' : 'fermés', step === 1) + box('Canaux K⁺', step === 2 || step === 3 ? 'ouverts' : 'fermés', step >= 2) + box('Vitesse réelle', "jusqu'à 120 m/s", true);
  } else {
    const n = NTS[B.nt]; html = box('Neurone suivant', `${Math.round(B.v)} mV`, Math.abs(B.v + 70) > 1) + box('Effet', n.sign > 0.9 ? 'excite' : n.sign < 0 ? 'freine' : 'module', true) + box('Molécules libres', `${B.ntd.list.length}`, true) + box('Délai synaptique', '≈ 0,5 ms', true);
  }
  if (html !== B.lastStats) { $('bStats').innerHTML = html; B.lastStats = html; }
}

function drawBrainGraph(step) {
  const w = bgC.clientWidth, h = bgC.clientHeight; const dpr = Math.min(devicePixelRatio, 2);
  if (bgC.width !== Math.round(w * dpr) || bgC.height !== Math.round(h * dpr)) { bgC.width = Math.round(w * dpr); bgC.height = Math.round(h * dpr); }
  const g = bgx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const gx = 14, gw = w - 28, H = h - 22; g.font = '11px "IBM Plex Mono", monospace'; g.textAlign = 'left';
  const B = brain;
  if (B.level === 0) {
    const c = CIRCUITS[B.circuit];
    if (!B.circuit) { g.fillStyle = '#a9b1b8'; g.fillText('Choisissez un circuit dans la liste pour suivre un influx à travers le cerveau.', gx, H / 2 + 4); return; }
    const n = c.steps.length; const bw = gw / n;
    c.steps.forEach((s, i) => { const on = i === B.stepIdx; g.fillStyle = AREAS[s][0]; g.globalAlpha = on ? 0.9 : 0.25; g.fillRect(gx + i * bw + 2, 8, bw - 4, H - 12); g.globalAlpha = 1; g.fillStyle = on ? '#09121b' : '#ece5d5'; g.font = '600 12px "IBM Plex Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(AREAS[s][1].split(' (')[0], gx + i * bw + bw / 2, 8 + (H - 12) / 2 + 4, bw - 10); });
    g.textAlign = 'left'; g.font = '11px "IBM Plex Mono", monospace'; g.fillStyle = '#a9b1b8'; g.fillText(`Parcours de l'influx · ${c.nom}`, gx, h - 3); return;
  }
  const lo = B.level === 1 ? -90 : -80, hi = B.level === 1 ? 50 : -55; const yOf = v => 6 + (hi - v) / (hi - lo) * (H - 10);
  g.strokeStyle = 'rgba(169,177,184,.35)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(gx, yOf(-70)); g.lineTo(gx + gw, yOf(-70)); g.stroke();
  if (B.level === 1) { g.strokeStyle = 'rgba(255,159,67,.5)'; g.beginPath(); g.moveTo(gx, yOf(-55)); g.lineTo(gx + gw, yOf(-55)); g.stroke(); g.fillStyle = '#ff9f43'; g.fillText('seuil −55 mV', gx + gw - 92, yOf(-55) - 3); }
  g.setLineDash([]); g.fillStyle = '#a9b1b8'; g.fillText('−70 mV', gx + 2, yOf(-70) - 3);
  const span = B.level === 1 ? 3 : 4; const col = B.level === 1 ? '#ffd36b' : NTS[B.nt].c;
  g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); B.hist.forEach(([t, v], i) => { const x = gx + gw - (B.t - t) / span * gw; const y = yOf(clamp(v, lo, hi)); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
  g.fillStyle = '#a9b1b8'; g.fillText(B.level === 1 ? "Potentiel de membrane au point de mesure (nœud 4) · ralenti ≈ ×1000" : `Potentiel du neurone suivant · ${NTS[B.nt].sign > 0.9 ? 'PPSE (excitation)' : NTS[B.nt].sign < 0 ? 'PPSI (inhibition)' : 'effet modulateur, plus faible et plus lent'}`, gx, h - 3);
}
