# Atlas vivant du corps

Application web (un seul fichier `index.html`, Three.js 0.147 via CDN) pour apprendre le fonctionnement du corps humain.

## v2 (style Verre, corps sculpté)
- Corps lisse généré par champ de distance + marching cubes, rendu en verre poli (transmission), organes en matière brillante.
- Ancienne version hologramme : maquettes/v1-hologramme.html ; maquettes des 3 styles : maquettes/maquettes.html.

## v1
- Corps 3D en « rayons X » avec 6 systèmes affichables : nerveux, cardiovasculaire, respiratoire, digestif, urinaire, squelette.
- 14 organes cliquables, chacun avec rôle, étapes « comment ça marche », chiffres clés et une anecdote.
- Animations liées à de vrais rythmes : battement du cœur (phases du cycle), sang artériel/veineux pulsé, respiration + diaphragme, péristaltisme (œsophage, estomac, intestins), influx nerveux, urine dans les uretères, vessie qui se remplit, neurones qui déchargent.
- Constantes vitales : fréquence cardiaque réglable (sommeil, repos, marche, course) qui pilote cœur, débit, sang et respiration, avec ECG défilant.
- Plongée détaillée du cœur : coupe 4 cavités, 5 phases du cycle, valves ouvertes/fermées, bruits « toum-ta », ECG synchronisé, ralenti ×¼.

## Prochaines plongées possibles
Poumons (alvéole et échanges O₂/CO₂), neurone (potentiel d'action, synapse), rein (néphron), intestin (villosité), muscle (sarcomère).

## Lancer
Ouvrir `index.html` dans un navigateur (connexion internet requise pour Three.js et les polices).

## v3 — Babylon.js + organes réels Z-Anatomy (14 oct. 2026)

- Moteur : Babylon.js 7.54 (UMD jsdelivr). La v2 Three.js est gardée dans `maquettes/v2-verre-three.html`.
- Modèle : 16 groupes extraits de Z-Anatomy (peau, squelette, crâne, cerveau, moelle + nerfs, cœur, artères, veines, poumons, diaphragme, estomac, foie, intestin grêle, côlon, reins, vessie) dans `corps.glb` (6,6 Mo, quantifié). L'hébergement artifact refuse `.glb`, donc la page charge `corps.txt` = `corps.glb` gzip + base64, décompressé dans le navigateur.
- `trajets.json` : vrais trajets des artères, veines, nerfs et uretères (courbes Z-Anatomy), utilisés par les particules.
- Licence : Z-Anatomy CC BY-SA 4.0 (dérivé de BodyParts3D, DBCLS). Crédit affiché sur l'accueil, obligatoire.
- Outils (`outils/`) : `za_part.py` (bpy, un groupe par process → .npz), `za_curves.py` (trajets), `make_glb.py` (npz → GLB), `bab_scene.js` + `bab_loop.js` (sources de la scène) et `assemble.py` (construit index.html à partir de la v2 + sources Babylon).
- Rust/WASM plus tard : les calculs (particules, neurones, cycles) écrivent dans des tableaux typés que Babylon lit seulement ; un module WASM pourra remplacer cette étape sans toucher au rendu.

## Plongées 3D (14 oct. 2026)

- Cœur (`coeur3d.txt`, gzip+base64 d'un GLB) : 19 pièces Z-Anatomy séparées (4 cavités, feuillets des valves, gros vaisseaux, coronaires). Coupe « 4 cavités » par plan de découpe (`material.clipPlane`), valves qui pivotent sur leur charnière, sang en instances fines bloqué par les valves fermées, ECG synchronisé. Code : `outils/deep_heart.js`.
- Poumons (`poumons3d.txt`) : 3 échelles. 1) vrais lobes, trachée, bronches, vaisseaux pulmonaires et diaphragme Z-Anatomy, air qui suit les vrais trajets bronchiques (`outils/lung_paths.json`) ; 2) arbre de bronchioles schématique (7 des 23 divisions) ; 3) alvéole schématique avec capillaires, globules qui se chargent en O₂, O₂/CO₂ qui diffusent. Code : `outils/deep_lung.js`.
- Export des pièces fines : `outils/za_deep.py` (bpy), puis `make_glb.py parts_deep sortie.glb clé1,clé2,…`.
- Piège : après `bakeCurrentTransformIntoVertices()`, appeler `refreshBoundingInfo()` sinon les boîtes englobantes restent dans l'ancien repère (gauche/droite inversés).
- Cerveau (`cerveau3d.txt`) : vrai cerveau Z-Anatomy regroupé en 20 aires fonctionnelles (`outils/za_brain.py`). 3 échelles : 1) carte des aires + 5 circuits animés (voir puis attraper, langage, récompense, peur, mémoire) ; 2) neurone myélinisé schématique, potentiel d'action saltatoire, ions Na⁺/K⁺, courbe de tension ; 3) synapse schématique (Ca²⁺, vésicules, neurotransmetteur au choix : glutamate, GABA, dopamine, sérotonine ; récepteurs, recapture, PPSE/PPSI). Code : `outils/deep_brain.js`.
