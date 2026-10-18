/* ------------------------------------------------------------------ */
/* État du corps : causes (carences, substances, médicaments, maladies,*/
/* situations) → variables physiologiques → cœur 3D et ECG.            */
/* Ajouter un cas = ajouter une fiche dans CAS ou PRINCIPES, sans      */
/* toucher au rendu. Les organes futurs liront et écriront ce même     */
/* état : c'est ce qui donnera les réactions en chaîne.                */
/* Modèle pédagogique simplifié, pas un avis médical.                  */
/* ------------------------------------------------------------------ */
const ETAT_BASE = () => ({
  k: 4.2,          // potassium sanguin (mmol/L), normal 3,5–5,0
  hb: 14.5,        // hémoglobine (g/dL), normal ≈ 12–17
  dFc: 0,          // battements/min ajoutés (sympathique, caféine…)
  fcMul: 1,        // freins du rythme (bêtabloquants…)
  dPas: 0, dPad: 0,// pression artérielle ajoutée (mmHg)
  cafeine: 0,      // tasses de café équivalentes
  effort: 0,       // 0 repos → 1 effort maximal
  ischemie: { iva: 0, cx: 0, cd: 0 }, // 0 artère libre → 1 artère bouchée
});
const fr = (v, d = 1) => v.toFixed(d).replace('.', ',');
const BDPM = 'https://base-donnees-publique.medicaments.gouv.fr';

// Une fiche = une cause, avec un niveau x de 0 à 1.
const CAS = [
  { id: 'k_bas', cat: 'Minéraux', nom: 'Potassium bas', sous: 'hypokaliémie', cles: 'potassium kaliemie hypokaliemie mineral',
    val: x => `${fr(4.2 - 1.9 * x)} mmol/L`, organes: 'cœur (repolarisation), muscles',
    agit: (e, x) => { e.k -= 1.9 * x; },
    fiche: "Le potassium règle le retour au repos des cellules du cœur (repolarisation). Quand il manque (vomissements, diarrhée, diurétiques), l'onde T s'aplatit, une onde U apparaît et le segment ST s'abaisse. Sous 3 mmol/L, des battements en trop (extrasystoles) surviennent, et le risque d'arythmie grave augmente.",
    source: ['Manuel MSD, « Hypokaliémie »', 'https://www.msdmanuals.com/fr/professional/troubles-endocriniens-et-métaboliques/troubles-électrolytiques/hypokaliémie'] },
  { id: 'fer', cat: 'Carences', nom: 'Manque de fer', sous: 'anémie ferriprive', cles: 'fer anemie carence vitamine fatigue',
    val: x => `Hb ${fr(14.5 - 7 * x)} g/dL`, organes: 'moelle osseuse, sang, cœur',
    agit: (e, x) => { e.hb -= 7 * x; },
    fiche: "Sans fer, la moelle fabrique moins d'hémoglobine : le sang transporte moins d'oxygène et devient plus pâle. Pour compenser, le cœur bat plus vite et éjecte plus fort. Une anémie sévère et durable peut fatiguer le cœur et provoquer un souffle.",
    source: ['Manuel MSD, « Anémie ferriprive »', 'https://www.msdmanuals.com/fr/professional/hématologie-et-oncologie/anémies-dues-à-un-déficit-de-l-érythropoïèse/anémie-ferriprive'] },
  { id: 'cafe', cat: 'Aliments et boissons', nom: 'Café', sous: 'caféine', cles: 'cafe caffeine cafeine boisson expresso',
    val: x => { const n = Math.round(x * 5); return `${n} tasse${n > 1 ? 's' : ''}`; }, organes: 'cerveau, cœur',
    agit: (e, x) => { e.cafeine += Math.round(x * 5); },
    fiche: "La caféine bloque les récepteurs de l'adénosine, un frein naturel du cœur et du cerveau. Le rythme et la pression montent un peu, surtout chez qui en boit rarement. Jusqu'à environ 400 mg par jour (4 tasses) n'est pas jugé risqué chez l'adulte en bonne santé. Au-delà, palpitations et extrasystoles deviennent plus fréquentes.",
    source: ['EFSA, avis scientifique sur la sécurité de la caféine (2015)', 'https://www.efsa.europa.eu/fr/efsajournal/pub/4102'] },
  { id: 'iva', cat: 'Maladies', nom: 'Infarctus antérieur', sous: 'artère interventriculaire antérieure', cles: 'infarctus crise cardiaque coronaire iva artere bouchee',
    val: x => x < 0.05 ? 'artère libre' : x < 0.7 ? `rétrécie à ${Math.round(x * 100)} %` : 'bouchée', organes: 'avant du ventricule gauche, cloison',
    agit: (e, x) => { e.ischemie.iva = Math.max(e.ischemie.iva, x); },
    fiche: "L'interventriculaire antérieure nourrit l'avant du ventricule gauche et la cloison. Si une plaque la bouche, le muscle en aval manque d'oxygène : il pâlit, se contracte moins bien, et le segment ST s'élève à l'ECG. Chaque minute compte : on rouvre l'artère au plus vite (angioplastie).",
    source: ['ESC, recommandations sur les syndromes coronariens aigus (2023)', 'https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines/Acute-Coronary-Syndromes-ACS-Guidelines'] },
  { id: 'effort', cat: 'Situations', nom: 'Effort physique', sous: 'marche → sprint', cles: 'effort sport course marche exercice',
    val: x => ['repos', 'marche', 'footing', 'course', 'sprint'][Math.min(4, Math.round(x * 4))], organes: 'muscles, cœur, poumons',
    agit: (e, x) => { e.effort = Math.max(e.effort, x); },
    fiche: "À l'effort, les muscles réclament plus d'oxygène. Le système nerveux sympathique accélère le cœur et renforce chaque contraction. Le débit cardiaque peut passer de 5 à plus de 20 L/min. La fréquence maximale se situe autour de 220 moins l'âge.",
    source: ["Manuel MSD, « Revue de l'exercice et de la forme physique »", 'https://www.msdmanuals.com/fr/accueil/problèmes-de-santé-de-l-enfant/sport-et-santé'] },
];

// Principes actifs : motif sur le nom de substance de la BDPM → effet sur l'état.
// Pour un médicament, x = 0,5 correspond à une prise habituelle ; l'effet reçoit 2x (1 = prise habituelle).
const PA_DOSE = x => x <= 0 ? 'aucune prise' : x < 0.35 ? 'demi-dose' : x < 0.7 ? 'une prise habituelle' : x < 0.9 ? 'dose forte' : 'surdosage';
const SRC_HTA = ["Manuel MSD, « Traitement médicamenteux de l'hypertension »", 'https://www.msdmanuals.com/fr/professional/troubles-cardiovasculaires/hypertension/traitement-médicamenteux-de-l-hypertension'];
const PRINCIPES = [
  { m: /PARAC[ÉE]TAMOL/, nom: 'Paracétamol', classe: 'antalgique et antifièvre', organes: 'cerveau (douleur, fièvre), foie (élimination)',
    agit: () => {}, effet: "Aucun effet visible sur le cœur. Il agit dans le cerveau, où il baisse la fièvre et atténue la douleur. Il est éliminé par le foie, qui sature en cas de surdosage : au-delà de 4 g par jour chez l'adulte, il peut détruire le foie.",
    source: ['ANSM, « Paracétamol : attention au risque pour le foie »', 'https://ansm.sante.fr/dossiers-thematiques/medicaments-contenant-du-paracetamol'] },
  { m: /IBUPROF[ÈE]NE/, nom: 'Ibuprofène', classe: 'anti-inflammatoire (AINS)', organes: 'tissus enflammés, estomac, reins',
    agit: (e, x) => { e.dPas += 6 * x; e.dPad += 3 * x; }, effet: "Il bloque les enzymes COX, qui fabriquent les prostaglandines de l'inflammation et de la douleur. Ces mêmes prostaglandines protègent l'estomac et aident les reins à éliminer le sel : la tension peut monter un peu, surtout en prise prolongée.",
    source: ['Manuel MSD, « Anti-inflammatoires non stéroïdiens »', 'https://www.msdmanuals.com/fr/professional/sujets-spéciaux/médicaments-non-opiacés-contre-la-douleur/anti-inflammatoires-non-stéroïdiens-ains'] },
  { m: /SALBUTAMOL/, nom: 'Salbutamol', classe: 'bronchodilatateur bêta-2', organes: 'bronches, cœur, potassium',
    agit: (e, x) => { e.dFc += 18 * x; e.k -= 0.5 * x; }, effet: "Il stimule les récepteurs bêta-2 des bronches, qui se relâchent et s'ouvrent en quelques minutes. Une partie touche aussi le cœur : le pouls accélère, parfois avec des palpitations. Il fait entrer le potassium dans les cellules, donc le potassium sanguin baisse un peu.",
    source: ['Vidal, « Salbutamol »', 'https://www.vidal.fr/medicaments/substances/salbutamol-3133.html'] },
  { m: /BISOPROLOL|AT[ÉE]NOLOL|M[ÉE]TOPROLOL|PROPRANOLOL|N[ÉE]BIVOLOL/, nom: 'Bêtabloquant', classe: 'bêtabloquant', organes: 'cœur (nœud sinusal, muscle)',
    agit: (e, x) => { e.fcMul *= 1 - 0.3 * x; e.dPas -= 14 * x; e.dPad -= 8 * x; }, effet: "Il bloque les récepteurs bêta du cœur, là où l'adrénaline appuie sur l'accélérateur. Le cœur bat plus lentement et moins fort, et la tension baisse. Il limite aussi l'accélération à l'effort et sous caféine.",
    source: SRC_HTA },
  { m: /HYDROCHLOROTHIAZIDE|IND[ÁA]PAMIDE|FUROS[ÉE]MIDE|BUM[ÉE]TANIDE|CHLORTALIDONE/, nom: 'Diurétique', classe: 'diurétique', organes: 'reins, potassium, tension',
    agit: (e, x) => { e.k -= 0.9 * x; e.dPas -= 10 * x; e.dPad -= 5 * x; }, effet: "Il fait éliminer plus de sel et d'eau par les reins : le volume de sang et la tension baissent. Le potassium part avec, d'où le risque d'hypokaliémie, à surveiller par prise de sang. Associé à un autre facteur (vomissements, Ventoline), il peut faire apparaître une onde U à l'ECG.",
    source: SRC_HTA },
  { m: /AMLODIPINE|NIF[ÉE]DIPINE|L[ÉE]RCANIDIPINE/, nom: 'Inhibiteur calcique', classe: 'antihypertenseur', organes: 'parois des artères',
    agit: (e, x) => { e.dPas -= 14 * x; e.dPad -= 8 * x; e.dFc += 4 * x; }, effet: "Il empêche le calcium d'entrer dans les muscles des parois des artères, qui se relâchent : la tension baisse. Le cœur compense parfois en accélérant un peu.",
    source: SRC_HTA },
  { m: /CAF[ÉE]INE/, nom: 'Caféine', classe: 'stimulant', organes: 'cerveau, cœur',
    agit: (e, x) => { e.cafeine += x; }, effet: "Ajoutée à certains antidouleurs pour renforcer leur effet. Elle accélère un peu le cœur, comme un café.",
    source: ['EFSA, avis sur la caféine (2015)', 'https://www.efsa.europa.eu/fr/efsajournal/pub/4102'] },
];
const principe = sub => PRINCIPES.find(p => p.m.test(sub));

// Causes actives : { id, nom, x, cas } ou { id, nom, x, med: [nom, forme, voie, [[substance, dosage]…], cis] }
const etat = { actifs: [], sel: null, meds: null };

function deriver(actifs = etat.actifs) {
  const e = ETAT_BASE();
  for (const a of actifs) {
    if (a.x <= 0) continue;
    if (a.cas) a.cas.agit(e, a.x);
    if (a.med) for (const [sub] of a.med[3]) { const p = principe(sub); if (p) p.agit(e, a.x * 2); }
  }
  const anemie = clamp((12 - e.hb) / 6, 0, 1.2);
  const hypoK = clamp((3.6 - e.k) / 1.3, 0, 1);
  const isch = Math.max(e.ischemie.iva, e.ischemie.cx, e.ischemie.cd);
  const bpm = clamp(Math.round((68 + e.effort * 112 + anemie * 32 + e.cafeine * 3 + isch * 14 + hypoK * 6 + e.dFc) * e.fcMul), 38, 195);
  return {
    e, bpm,
    contract: clamp((1 + 0.45 * e.effort + 0.15 * anemie - 0.35 * e.ischemie.iva) * (0.75 + 0.25 * e.fcMul), 0.5, 1.6),
    ectopie: clamp(hypoK * 0.35 + Math.max(0, e.cafeine - 3) * 0.05 + (isch > 0.6 ? 0.1 : 0), 0, 0.5), // probabilité d'extrasystole par battement
    ecg: { t: 0.26 * (1 - 0.8 * hypoK), u: 0.12 * hypoK, st: -0.07 * hypoK + 0.32 * e.ischemie.iva, qt: 1 + 0.25 * hypoK },
    sang: 1 - 0.45 * clamp(anemie, 0, 1), // 1 = rouge normal, moins = plus pâle
    ischemie: e.ischemie,
    pas: Math.round(120 + e.effort * 45 + e.cafeine * 2.5 - isch * 15 + e.dPas), pad: Math.round(78 + e.effort * 4 + e.cafeine * 1.5 - isch * 6 + e.dPad),
    k: e.k, hb: e.hb,
  };
}
const ETAT_REPOS = deriver([]);

// ECG paramétré : mêmes ondes que ecgAt, déformées par l'état
const ecgEtat = (p, E) => {
  const q = E.qt;
  return 0.12 * gauss(p, 0.06, 0.018) - 0.12 * gauss(p, 0.145, 0.006) + 1.0 * gauss(p, 0.16, 0.0075)
    - 0.28 * gauss(p, 0.175, 0.007) + E.st * smooth(0.18, 0.2, p) * (1 - smooth(0.3 * q, 0.38 * q, p))
    + E.t * gauss(p, 0.38 * q, 0.035 * q) + E.u * gauss(p, 0.5 * q, 0.03);
};

/* ---------- Interface : constantes, recherche, pastilles, carte ---------- */
const sansAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
async function chargerMeds() {
  if (etat.meds) return etat.meds;
  etat.meds = (async () => {
    try {
      const b64 = (await (await fetch('medicaments.txt')).text()).trim();
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const txt = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      return JSON.parse(txt).map(m => (m.k = sansAccent(m[0] + ' ' + m[3].map(s => s[0]).join(' ')), m));
    } catch (err) { console.error(err); return []; }
  })();
  etat.meds = await etat.meds; return etat.meds;
}
const nomCourt = m => m[0].split(/,\s/)[0].replace(/\s+/g, ' ');
function chercher(q) {
  const t = sansAccent(q.trim()); if (t.length < 2) return [];
  const mots = t.split(/\s+/);
  const cas = CAS.filter(c => mots.every(w => sansAccent(c.nom + ' ' + c.sous + ' ' + c.cles).includes(w))).map(c => ({ cas: c }));
  const meds = (Array.isArray(etat.meds) ? etat.meds : []).filter(m => mots.every(w => m.k.includes(w)))
    .sort((a, b) => (sansAccent(a[0]).startsWith(t) ? 0 : 1) - (sansAccent(b[0]).startsWith(t) ? 0 : 1) || a[0].length - b[0].length || a[0].localeCompare(b[0]))
    .filter((m, i, l) => i === 0 || l[i - 1][0] !== m[0]).slice(0, 8).map(m => ({ med: m }));
  return [...cas, ...meds];
}

function renderEtat() {
  const box = $('etat'); if (!box) return;
  box.innerHTML = `<div class="etat-vitals" id="etatVitals"></div>
    <div class="etat-search"><input id="etatQ" type="search" autocomplete="off" placeholder="Médicament, aliment, carence, maladie…" aria-label="Rechercher un médicament ou une situation"><div class="etat-res" id="etatRes" hidden></div></div>
    <div class="etat-sugg"><span>Essayer :</span>${CAS.map(c => `<button class="chip-s" data-c="${c.id}">${c.nom}</button>`).join('')}<button class="chip-s" data-q="Doliprane 1000">Doliprane</button><button class="chip-s" data-q="Ventoline">Ventoline</button><button class="chip-s" data-q="bisoprolol">Bêtabloquant</button></div>
    <div class="etat-actifs" id="etatActifs"></div>
    <div class="etat-carte" id="etatCarte" hidden></div>
    <p class="hint">Modèle pédagogique simplifié : il montre des tendances, pas des valeurs cliniques. Ce n'est ni un avis médical ni un remplacement de la notice ou du pharmacien. Médicaments : <a href="${BDPM}" target="_blank" rel="noopener">base de données publique des médicaments</a> (ANSM).</p>`;
  const q = $('etatQ'), res = $('etatRes');
  q.onfocus = () => chargerMeds();
  q.oninput = async () => {
    await chargerMeds(); const r = chercher(q.value);
    res.hidden = !q.value.trim();
    res.innerHTML = r.length ? r.map((o, i) => o.cas
      ? `<button data-i="${i}"><b>${o.cas.nom}</b><small>${o.cas.cat} · ${o.cas.sous}</small></button>`
      : `<button data-i="${i}"><b>${esc(nomCourt(o.med))}</b><small>${esc(o.med[3].map(s => s[0].toLowerCase()).join(' + '))} · ${esc(o.med[1])}</small></button>`).join('')
      : `<p>Aucun résultat pour « ${esc(q.value)} ».</p>`;
    res.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { ajouter(r[+b.dataset.i]); q.value = ''; res.hidden = true; });
  };
  box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => ajouter({ cas: CAS.find(c => c.id === b.dataset.c) }));
  box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { q.value = b.dataset.q; q.focus(); q.oninput(); });
  majEtat();
}
function ajouter(o) {
  const id = o.cas ? o.cas.id : 'med:' + o.med[4];
  let a = etat.actifs.find(x => x.id === id);
  if (!a) { a = { id, nom: o.cas ? o.cas.nom : nomCourt(o.med), x: 0.5, ...o }; etat.actifs.push(a); }
  etat.sel = id; majEtat();
}
function retirer(id) { etat.actifs = etat.actifs.filter(a => a.id !== id); if (etat.sel === id) etat.sel = null; majEtat(); }

function renderCarte() {
  const c = $('etatCarte'); const a = etat.actifs.find(x => x.id === etat.sel);
  c.hidden = !a; if (!a) return;
  const valeur = x => a.cas ? a.cas.val(x) : PA_DOSE(x);
  let corps;
  if (a.cas) {
    corps = `<p class="eyebrow">${a.cas.cat} · agit sur : ${a.cas.organes}</p><p>${a.cas.fiche}</p>
      <p class="src">Source : <a href="${a.cas.source[1]}" target="_blank" rel="noopener">${a.cas.source[0]}</a></p>`;
  } else {
    const m = a.med;
    corps = `<p class="eyebrow">${esc(m[1])} · voie ${esc(m[2])}</p>
      <h5>Principes actifs</h5>
      <ul class="compo">${m[3].map(([s, d]) => { const p = principe(s); return `<li><b>${esc(s.toLowerCase())}</b> <span>${esc(d)}</span>${p ? `<em>${p.classe}</em>` : ''}</li>`; }).join('')}</ul>
      ${m[3].map(([s]) => { const p = principe(s); return p
        ? `<div class="pa"><h5>${p.nom} · agit sur : ${p.organes}</h5><p>${p.effet}</p><p class="src">Source : <a href="${p.source[1]}" target="_blank" rel="noopener">${p.source[0]}</a></p></div>`
        : `<div class="pa"><h5>${esc(s.toLowerCase())}</h5><p>Pas encore de fiche pour cette substance, donc pas d'effet simulé pour l'instant.</p></div>`; }).join('')}
      <p class="src">Excipients et notice complète : <a href="${BDPM}/extrait.php?specid=${m[4]}" target="_blank" rel="noopener">fiche officielle du médicament</a>.</p>`;
  }
  c.innerHTML = `<div class="carte-tete"><h4>${esc(a.nom)}</h4><button class="btn" id="carteX">Fermer</button></div>
    <label class="dose"><span>${a.cas ? 'Intensité' : 'Dose'}</span><output id="carteVal">${valeur(a.x)}</output>
      <input type="range" min="0" max="1" step="0.01" value="${a.x}" id="carteR" aria-label="${a.cas ? 'Intensité' : 'Dose'} : ${esc(a.nom)}"></label>
    <p class="etat-effet" id="carteEffet"></p>${corps}`;
  $('carteR').oninput = e => { a.x = +e.target.value; $('carteVal').textContent = valeur(a.x); majEtat(true); };
  $('carteX').onclick = () => { etat.sel = null; majEtat(); };
}
function majEtat(garderCarte) {
  const D = deriver(), B = ETAT_REPOS; deep.etat = etat.actifs.some(a => a.x > 0) ? D : null;
  const fl = (v, b) => v > b ? ' ↑' : v < b ? ' ↓' : '';
  const vit = [['Pouls', `${D.bpm}${fl(D.bpm, B.bpm)}`, 'BPM'], ['Tension', `${D.pas}/${D.pad}${fl(D.pas, B.pas)}`, 'mmHg'],
    ['Potassium', fr(D.k) + fl(+D.k.toFixed(1), 4.2), 'mmol/L'], ['Hémoglobine', fr(D.hb) + fl(+D.hb.toFixed(1), 14.5), 'g/dL']];
  $('etatVitals').innerHTML = vit.map(([l, v, u]) => `<div class="${/[↑↓]/.test(v) ? 'chg' : ''}"><span>${l}</span><b>${v}</b><small>${u}</small></div>`).join('');
  $('etatActifs').innerHTML = etat.actifs.map(a => `<span class="pastille${a.id === etat.sel ? ' on' : ''}"><button data-s="${esc(a.id)}">${esc(a.nom)}</button><button data-x="${esc(a.id)}" aria-label="Retirer ${esc(a.nom)}">×</button></span>`).join('');
  $('etatActifs').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { etat.sel = b.dataset.s; majEtat(); });
  $('etatActifs').querySelectorAll('[data-x]').forEach(b => b.onclick = () => retirer(b.dataset.x));
  if (!garderCarte) renderCarte();
  const eff = $('carteEffet'); if (eff) eff.textContent = resume(D, B);
}
function resume(D, B) {
  const t = [];
  if (D.bpm !== B.bpm) t.push(`pouls ${D.bpm > B.bpm ? 'plus rapide' : 'plus lent'} (${D.bpm} BPM)`);
  if (D.pas !== B.pas) t.push(`tension ${D.pas > B.pas ? 'plus haute' : 'plus basse'} (${D.pas}/${D.pad} mmHg)`);
  if (D.k < 3.5) t.push('potassium bas : onde T aplatie, onde U');
  if (D.ectopie > 0.08) t.push('extrasystoles possibles');
  if (D.sang < 0.95) t.push('sang moins riche en oxygène, plus pâle');
  if (D.ischemie.iva > 0.05) t.push("muscle antérieur privé d'oxygène, segment ST surélevé");
  return t.length ? 'Avec tout ce qui est actif : ' + t.join(' ; ') + '.' : "Pas d'effet visible sur le cœur.";
}

/* ---------- Explications visuelles : la différence explique, pas le texte ---------- */
// Chaque variable a son signal standard : une fiche n'a rien à écrire pour être expliquée.
const SIGNAUX = [
  { ic: '❤️', d: (D, P) => D.bpm - P.bpm, s: 3, t: (D, d) => `pouls ${D.bpm} ${d > 0 ? '↑' : '↓'}` },
  { ic: '🩸', d: (D, P) => D.pas - P.pas, s: 3, t: (D, d) => `tension ${D.pas}/${D.pad} ${d > 0 ? '↑' : '↓'}` },
  { ic: '⚡', d: (D, P) => D.k - P.k, s: 0.15, t: (D, d) => D.k < 3.5 ? 'potassium bas : onde U' : `potassium ${fr(D.k)} ${d > 0 ? '↑' : '↓'}`, ecg: 1 },
  { ic: '🔴', d: (D, P) => D.hb - P.hb, s: 0.4, t: (D, d) => d < 0 ? 'sang plus pâle' : 'sang plus rouge' },
  { ic: '💥', d: (D, P) => D.ectopie - P.ectopie, s: 0.06, t: (D, d) => d > 0 ? 'battements en trop' : 'rythme plus régulier', ecg: 1 },
  { ic: '🫀', d: (D, P) => D.ischemie.iva - P.ischemie.iva, s: 0.08, t: (D, d) => d > 0 ? 'zone sans oxygène, ST ↑' : "l'artère se rouvre", ecg: 1,
    zone: dp => dp.C.vg.add(dp.C.vd).scale(0.5).add(new BABYLON.Vector3(0, -0.012, 0.02)) },
];
const ICONE_CAT = { 'Minéraux': '🧪', 'Carences': '🥗', 'Aliments et boissons': '☕', 'Maladies': '🩺', 'Situations': '🏃' };
const annonce = { file: [], t: 0, prec: null, minuteur: 0 };
function signaler(D) {
  // Compare au dernier état affiché, une fois le curseur relâché ou stabilisé
  clearTimeout(annonce.minuteur);
  annonce.minuteur = setTimeout(() => {
    const P = annonce.prec || ETAT_REPOS; annonce.prec = D;
    const chg = SIGNAUX.map(s => ({ s, d: s.d(D, P) })).filter(o => Math.abs(o.d) >= o.s.s);
    if (!chg.length) return;
    annonce.file = chg.map(o => `${o.s.ic} ${o.s.t(D, o.d)}`); annonce.t = 0;
    deep.ralenti = 1.6; // un battement au ralenti pour voir le changement
    const zone = chg.find(o => o.s.zone); if (zone && deep.C) deep.focus = { p: zone.s.zone(deep), t: 2.4 };
    if (chg.some(o => o.s.ecg)) deepEcgC.classList.add('vu'), setTimeout(() => deepEcgC.classList.remove('vu'), 1800);
    renderFrise(D);
  }, 350);
}
function animerAnnonces(dt) {
  const el = $('annonce'); if (!el) return;
  if (!annonce.file.length) { el.style.opacity = 0; return; }
  annonce.t += dt; const dur = 1.7;
  const i = Math.floor(annonce.t / dur);
  if (i >= annonce.file.length) { annonce.file = []; el.style.opacity = 0; return; }
  const f = (annonce.t % dur) / dur;
  el.textContent = annonce.file[i]; el.style.opacity = Math.min(1, f * 6, (1 - f) * 4).toFixed(2);
}
function renderFrise(D) {
  const el = $('frise'); if (!el) return;
  const a = etat.actifs.find(x => x.id === etat.sel) || etat.actifs[etat.actifs.length - 1];
  if (!a || a.x <= 0) { el.innerHTML = ''; return; }
  const cause = a.cas ? `${ICONE_CAT[a.cas.cat] || '•'} ${a.nom}` : `💊 ${a.nom}`;
  const org = a.cas ? a.cas.organes : (a.med[3].map(([s]) => principe(s)).filter(Boolean).map(p => p.organes).join(', ') || 'pas de fiche');
  const eff = SIGNAUX.map(s => ({ s, d: s.d(D, ETAT_REPOS) })).filter(o => Math.abs(o.d) >= o.s.s).map(o => `${o.s.ic} ${o.s.t(D, o.d)}`);
  const pas = [cause, '🎯 ' + org.split(',')[0].replace(/\s*\(.*$/, ''), ...(eff.length ? eff : ['· pas d\'effet sur le cœur'])];
  el.innerHTML = pas.map((p, i) => `<span style="animation-delay:${i * 0.35}s">${esc(p)}</span>`).join('<i>→</i>');
  el.querySelectorAll('span').forEach((s, i) => s.onclick = () => { annonce.file = [pas[i]]; annonce.t = 0; });
}
