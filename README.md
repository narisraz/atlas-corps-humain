# Atlas vivant du corps

Application web pour comprendre en profondeur comment fonctionne le corps humain, avec de vrais organes en 3D et des animations : corps entier cliquable, puis plongées 3D dans le cœur (cycle cardiaque en coupe 4 cavités), les poumons (jusqu'à l'alvéole) et le cerveau (aires, circuits, neurone, synapse).

Outil pédagogique, pas un avis médical.

## Lancer

Version en ligne : GitHub Pages de ce dépôt. En local, servir le dossier (par exemple `python3 -m http.server`) puis ouvrir `index.html` : la page charge les modèles par `fetch`, donc l'ouverture directe du fichier ne suffit pas.

## Contenu

- `index.html` : toute l'application (Babylon.js 7.54 via CDN).
- `corps.txt`, `coeur3d.txt`, `poumons3d.txt`, `cerveau3d.txt` : modèles GLB compressés (gzip + base64), décodés dans le navigateur.
- `trajets.json` : trajets réels des vaisseaux, nerfs et uretères.
- `outils/` : scripts d'export Blender (Z-Anatomy → GLB) et sources JS ; `assemble.py` construit `index.html`.
- `NOTES.md` : journal technique détaillé.

## Licence et crédits

Les modèles anatomiques sont dérivés de **Z-Anatomy** (https://www.z-anatomy.com), lui-même basé sur **BodyParts3D** (© The Database Center for Life Science, DBCLS), sous licence **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/). Les fichiers de modèles de ce dépôt sont redistribués sous la même licence. Le crédit est aussi affiché dans l'application.
