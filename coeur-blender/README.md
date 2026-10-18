# Cœur humain — Z-Anatomy

Modèle 3D : **Z-Anatomy** (https://github.com/Z-Anatomy/Models-of-human-anatomy),
licence **CC BY-SA 4.0**. Tous les fichiers dérivés de ce dossier (rendus, vidéos, GLB,
.blend) sont distribués sous la même licence et doivent créditer « Z-Anatomy ».

## Fichiers

| Fichier | Contenu |
|---|---|
| `coeur-z-anatomy-rendu.png` | Vue antérieure, Cycles 3000×3000, 512 échantillons, débruitage, profondeur de champ |
| `coeur-z-anatomy-coupe-4-cavites.png` | Coupe 4 cavités (v1, coupe par transparence), mêmes réglages |
| `coeur-z-anatomy-coupe-4-cavites-v2.png` (ici `.jpg`, 1600 px) | Coupe 4 cavités « atlas » : plan apex VG / anneau mitral / anneau tricuspide, parois pleines, Cycles 3000×3000, 512 éch., débruitage, sans profondeur de champ |
| `coeur-z-anatomy-coupe-4-cavites-v2-annotee.png` (ici `.jpg`, 1600 px) | La même, étiquettes en français (OD, VD, OG, VG, septums, valves, piliers), marges noires ajoutées |
| `apercu-coeur.jpg`, `apercu-coeur-coupe.jpg` | Aperçus 560 px |
| `coeur-z-anatomy-battement.mp4` | Battement 1 s en boucle (oreillettes puis ventricules), EEVEE 800×800, 24 i/s |
| `coeur-z-anatomy-tour.mp4` | Tour complet en 4 s (4 battements), EEVEE 800×800 |
| `coeur-web.glb` | Version web : Draco, 61 641 triangles, 44 pièces, clip « Battement » |
| `coeur-web-atlas.glb` | Version Atlas : sans Draco, ventricules découpés en territoires coronaires (47 pièces) |
| `coeur-web-coupe.glb` | Atlas coupé selon le plan 4 cavités v2 : coupe appliquée à la géométrie, faces de coupe pleines (matériau « Coupe »), mêmes noms, origine, échelle et battement que `coeur-web-atlas.glb` (pièces entièrement antérieures retirées) |
| `coeur.blend` | Scène complète (matériaux, graisse, battement, coupe, curseurs) |
| `coeur_build.py` | Construit `coeur.blend` depuis la source ; bloc `REGLAGES` en tête |
| `coeur_render.py` | Rendus : `fixe`, `coupe`, `battement`, `tour` |
| `coeur_web.py` | Exports GLB (`web` par défaut, `atlas`, `coupe`) |
| `coeur_plan.py` | Plan 4 cavités et faces de coupe, partagés par la coupe v2 et l'export `coupe` |
| `coeur_coupe_v2.py` | Coupe 4 cavités v2 (plan anatomique, face de coupe pleine, caméra, lumières, rendu) |
| `coeur_coupe_masque.py` | Masque 2D de la face de coupe des parois (numpy, scipy, Pillow), appelé par le précédent |
| `coeur_annoter.py` | Version annotée (Pillow) |
| `source/` | Sources téléchargées : `Z-Anatomy.zip` → `za/Startup.blend` (+ licences). L'ancien `coeur-za.glb` sert de repère. |

## Refaire

```bash
cd ~/perso/blender-mcp-essai/coeur
B=/Applications/Blender.app/Contents/MacOS/Blender
$B -b --disable-autoexec -P coeur_build.py                               # ~6 s
$B -b coeur.blend --disable-autoexec -P coeur_render.py -- fixe 3000 512   # ~5 min 30
$B -b coeur.blend --disable-autoexec -P coeur_render.py -- coupe 3000 512  # ~10 min
$B -b coeur.blend --disable-autoexec -P coeur_render.py -- battement 800 64
$B -b coeur.blend --disable-autoexec -P coeur_render.py -- tour 800 64
ffmpeg -framerate 24 -i _frames_battement/f_%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 coeur-z-anatomy-battement.mp4
ffmpeg -framerate 24 -i _frames_tour/f_%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 coeur-z-anatomy-tour.mp4
$B -b coeur.blend --disable-autoexec -P coeur_web.py
$B -b coeur.blend --disable-autoexec -P coeur_web.py -- atlas
# Coupe 4 cavités v2 (COUPE_PY = un Python avec numpy, scipy et Pillow)
COUPE_PY=python3 $B -b coeur.blend --disable-autoexec -P coeur_coupe_v2.py -- 3000 512 "$PWD/coeur-z-anatomy-coupe-4-cavites-v2.png"
python3 coeur_annoter.py coeur-z-anatomy-coupe-4-cavites-v2.png coeur-z-anatomy-coupe-4-cavites-v2-annotee.png
COUPE_PY=python3 $B -b coeur.blend --disable-autoexec -P coeur_web.py -- coupe   # + scikit-image
```

Un aperçu rapide : `coeur_render.py -- test 700 32` (≈ 10 s, écrit `_test.png`).

## Étapes

1. **Source** : les 44 pièces du cœur sont ajoutées depuis `Startup.blend` par bibliothèque
   (aucun script du fichier source n'est exécuté). 63 032 triangles de maillage + 26 vaisseaux
   en courbes paramétriques (coronaires et veines avec toutes leurs branches, gros vaisseaux).
   Le modèle n'a ni cordages tendineux, ni feuillet antérieur mitral/tricuspide, ni graisse.
2. **Géométrie** : courbes converties en maillage haute résolution (380 060 triangles de base),
   subdivision ×2 au rendu sur les cavités → 858 491 triangles au rendu.
3. **Graisse épicardique** : Geometry Nodes, proximité aux troncs coronaires et grandes veines
   → attribut `graisse` + léger bourrelet ; le shader mélange myocarde et graisse jaune lobulée.
4. **Matériaux procéduraux** : myocarde (marbrure, fibres, grain humide, subsurface, vernis),
   vaisseaux rouges/bleus, valves nacrées (thin film, sheen). Faces arrière = tissu coupé.
5. **Coupe 4 cavités** : plan contenant le grand axe (base → apex du VG), normale antérieure,
   appliqué par transparence dans le shader (groupe de nœuds « Coupe »).
   **v2** (`coeur_coupe_v2.py`) : plan passant par l'apex du VG et les centres des anneaux
   mitral et tricuspide (orifices communs ventricule/oreillette des maillages) ; on garde la
   moitié inféro-postérieure, caméra perpendiculaire au plan, base en haut. Les cavités
   Z-Anatomy sont des coques endocarde + épicarde ouvertes par endroits : leurs contours dans
   le plan sont remplis par un test pair-impair voté sur 4 directions, puis nettoyés
   (`coeur_coupe_masque.py`) ; le masque texture un plan posé sur la coupe (myocarde mat, plus
   clair). Piliers et feuillets sont fermés : Boolean exact. Gros vaisseaux masqués (aorte,
   tronc et artères pulmonaires, veines pulmonaires) ; veines caves gardées, en arrière-plan.
6. **Battement** : deux shape keys (oreillettes, ventricules) — contraction gaussienne autour
   du centre de chaque étage ; oreillettes images 1→4→9, ventricules 7→12→20, boucle 24 images.
7. **Web** : subdivision + graisse appliquées, graisse cuite en couleur de sommet, décimation
   douce, battement converti en squelette à 3 os (Racine, Oreillettes, Ventricules), Draco.

## Curseurs dans coeur.blend

Objet « Coeur » > Propriétés personnalisées (ou panneau N > Cœur après exécution de
`coeur_panneau.py`) : `graisse_epaisseur_mm`, `graisse_largeur_mm`, `coupe_active`,
`coupe_decalage_mm`, `lumiere_principale`, `lumiere_contre_jour`, `lumiere_douce`,
`lumiere_dessus`, `flou_ouverture_f`. Reliés par drivers simples (marchent sans autoriser
les scripts). Amplitude et rythme du battement : bloc `REGLAGES` de `coeur_build.py`, puis rebâtir.

## GLB : repères pour l'intégration

- Unités : mètres (cœur ≈ 12 cm). glTF Y vers le haut ; face antérieure du patient vers **+Z** ;
  gauche du patient vers **+X**. Origine = centre de la boîte des 4 cavités (nœud `Coeur`).
- Hiérarchie : `Coeur` → `Battement` (squelette) → os `Racine` → `Oreillettes`, `Ventricules` ;
  les maillages sont enfants de `Battement` et skinnés sur ces 3 os.
- Animation : un clip `Battement`, 0 → 1,0 s, mise à l'échelle des os `Oreillettes`
  (0,86 à 0,125 s) et `Ventricules` (0,88 à 0,458 s). Fréquence = vitesse de lecture × 60 bpm.
- Extras par nœud : `categorie`, `nom_fr`, et `territoire` (atlas).
- Couleur de sommet `COLOR_0` sur le myocarde (graisse cuite) ; multiplier par la couleur
  du matériau pour recolorer.

## Mesures (Mac M4, GPU Metal 10 cœurs, 16 Go)

| Étape | Durée | Résultat |
|---|---|---|
| Construction de `coeur.blend` | ~6 s | 13 Mo (compressé) |
| Rendu antérieur Cycles 3000², 512 éch. | 5 min 26 s | `coeur-z-anatomy-rendu.png` |
| Coupe 4 cavités Cycles 3000², 512 éch. | 10 min 03 s | `coeur-z-anatomy-coupe-4-cavites.png` |
| Battement EEVEE 800², 24 images | 1 min 48 s | MP4 190 Ko |
| Tour EEVEE 800², 96 images | 6 min 15 s | MP4 1,4 Mo |
| Export web | ~10 s | `coeur-web.glb` 388 Ko (départ `coeur-za.glb` : 862 Ko, −55 %) |
| Export atlas | ~10 s | `coeur-web-atlas.glb` 2,06 Mo (sans Draco) |
| Coupe 4 cavités v2 Cycles 3000², 512 éch. | 6 min 19 s | `coeur-z-anatomy-coupe-4-cavites-v2.png` |
| Export coupe | ~15 s | `coeur-web-coupe.glb` 1,16 Mo (sans Draco), 26 pièces |

Polygones : source 63 032 triangles + 26 courbes → 380 060 triangles de base → 858 491 au rendu
→ 61 641 dans les GLB.
