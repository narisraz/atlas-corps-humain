import os
S='/tmp/claude-0/-home-claude/4e4e9a72-3ead-5197-81cd-815cb2bc9ef3/scratchpad/'
L=open(S+'v2_index.html').read().split('\n')
seg=lambda a,b: '\n'.join(L[a-1:b])
head=seg(1,218); content=seg(226,231)+'\n'+seg(236,398); ui=seg(826,884); ecg=seg(954,970); deep=seg(1028,1177)
head=head.replace("<title>Atlas vivant du corps</title>","<title>Atlas vivant du corps</title>\n<script>document.documentElement.dataset.style = 'verre';</script>")
head=head.replace("anatomie · physiologie · v2","anatomie · physiologie · v3")
head=head.replace('  <div id="tip" hidden></div>','  <div id="tip" hidden></div>\n  <div id="loader" role="status"><span>Chargement de l\'anatomie</span><b>0 %</b></div>')
head=head.replace("#tip {","#loader { position: absolute; left: 0; right: 0; top: 46%; display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; color: var(--bone-dim); font: 500 13px var(--font-body); text-align: center; padding-inline: 16px; }\n#loader b { font: 500 22px var(--font-mono); color: var(--bone); font-variant-numeric: tabular-nums; }\n@media (min-width: 821px) { #loader { right: 380px; } }\n@media (max-width: 820px) { #loader { top: 22%; } }\n#panel a { color: var(--artery); }\n#tip {",1)
content=content.replace("const V3 = (x, y, z) => new THREE.Vector3(x, y, z);","const V3 = (x, y, z) => new BABYLON.Vector3(x, y, z);")
ui=ui.replace('    <p class="hint">Glisser pour tourner','    <p class="hint">Modèles 3D : <a href="https://www.z-anatomy.com" target="_blank" rel="noopener">Z-Anatomy</a> (CC BY-SA 4.0), d\'après BodyParts3D © DBCLS (CC BY-SA 2.1 JP).</p>\n    <p class="hint">Glisser pour tourner')
assert 'Z-Anatomy' in ui
scripts='<script src="https://cdn.jsdelivr.net/npm/babylonjs@7.54.0/babylon.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/babylonjs-loaders@7.54.0/babylon.glTFFileLoader.min.js"></script>\n<script>\n(() => {'
tail='''
loadBody().catch(err => { console.error(err); loaderEl.querySelector('span').textContent = "Le modèle 3D n'a pas pu se charger. Rechargez la page."; loaderEl.querySelector('b').textContent = ''; });
renderHome(); setBpm(70);
})();
</script>'''
deep=deep[:deep.index('const deep = {')]+open(S+'deep_heart.js').read()+'\n'+open(S+'deep_lung.js').read().replace('__LUNG_PATHS__',open(S+'lung_paths.json').read())+'\n'+open(S+'deep_brain.js').read()
old_stage='<div class="deep-stage"><canvas id="heartCanvas"></canvas></div>'
assert old_stage in head
head=head.replace(old_stage,'<div class="deep-stage"><canvas id="heartCanvas" aria-label="Cœur en 3D, ouvert en coupe"></canvas><div id="deepLabels"></div><div id="deepFlash"></div>\n        <div class="stage-tools"><button class="btn primary" id="cutBtn">Coupe</button><button class="btn primary" id="labBtn">Étiquettes</button></div>\n        <div id="deepLoad" hidden>Chargement du cœur 3D…</div><canvas id="deepEcg"></canvas></div>')
old_css='#heartCanvas { width: 100%; height: 100%; display: block; }'
assert old_css in head
head=head.replace(old_css,"""#heartCanvas, .d3 { position: absolute; left: 0; top: 0; width: 100%; height: calc(100% - var(--ecg-h)); display: block; touch-action: none; outline: none; }
.deep-stage { --ecg-h: 96px; }
#deepEcg, .dgraph { position: absolute; left: 0; bottom: 0; width: 100%; height: var(--ecg-h); background: rgba(21,34,47,.92); border-top: 1px solid var(--line); }
#deepLabels, .dlabels { position: absolute; left: 0; top: 0; right: 0; bottom: var(--ecg-h); pointer-events: none; overflow: hidden; }
.lab { position: absolute; left: 0; top: 0; translate: -50% -50%; font: 600 12px var(--font-body); color: #ece5d5; background: rgba(9,18,27,.7); border: 1px solid rgba(236,229,213,.22); padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.lab.v { color: #e6c35c; font-weight: 500; }
#deepFlash { position: absolute; top: 52px; left: 0; right: 0; text-align: center; font: italic 600 40px Spectral, Georgia, serif; color: #e6c35c; opacity: 0; pointer-events: none; }
.stage-tools { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; flex-wrap: wrap; gap: 6px; pointer-events: none; }
.stage-tools .btn { white-space: nowrap; pointer-events: auto; }
#deepLoad, .dload { position: absolute; inset: 0; display: grid; place-items: center; color: var(--bone-dim); font-size: 14px; }""")
head=head.replace("  .deep-side { overflow: visible; }","  .deep-side { overflow: visible; }\n  .deep-stage { --ecg-h: 72px; min-height: 58vh; }\n  .deep-body { grid-template-rows: auto auto; }\n  .lab { font-size: 10.5px; padding: 1px 6px; }\n  .lab.v { display: none; }\n  .deep-head h2 { font-size: 19px; }\n  .deep-head .btn, .stage-tools .btn { padding: 5px 9px; font-size: 12px; }\n  .deep-head .row { gap: 6px; }")
head=head.replace("<p class=\"hint\">Vue de face : la droite du patient est à gauche de l'écran. Le côté droit du cœur (bleu) envoie le sang aux poumons, le côté gauche (rouge) l'envoie au reste du corps.</p>","<p class=\"hint\">Coupe « 4 cavités » du vrai cœur (Z-Anatomy) : la droite du patient est à gauche de l'écran. Bleu : sang pauvre en oxygène, envoyé aux poumons. Rouge : sang riche en oxygène, envoyé au corps. Faites tourner le cœur avec la souris ou le doigt, zoomez à la molette ou en pinçant.</p>")
head=head.replace('#deep { --ink','#deep, #deepLung, #deepBrain { --ink',1)
head=head.replace('.lab.v {','.lab.hot { background: #ffd36b; color: #09121b; border-color: #ffd36b; }\n.lab.v {',1)
LUNGSEC='''  <section id="deepLung" hidden aria-label="Respiration en détail">
    <div class="deep-head">
      <h2>Respirer, <em>de la trachée à l'alvéole</em></h2>
      <div class="row">
        <div class="speed" id="lSpeed"><button class="btn" data-s="0.25">×¼</button><button class="btn" data-s="0.5">×½</button><button class="btn" data-s="1">×1</button></div>
        <button class="btn" id="lPlay">Pause</button>
        <button class="btn" id="lNext">Échelle suivante</button>
        <button class="btn primary" id="lClose">Retour au corps</button>
      </div>
    </div>
    <div class="deep-body">
      <div class="deep-stage"><canvas id="lungCanvas" class="d3" aria-label="Poumons en 3D"></canvas><div id="lLabels" class="dlabels"></div>
        <div class="stage-tools" id="lLevels"><button class="btn" data-l="0">1 · Poumons</button><button class="btn" data-l="1">2 · Bronchioles</button><button class="btn" data-l="2">3 · Alvéole</button></div>
        <div id="lLoad" class="dload" hidden>Chargement des poumons 3D…</div><canvas id="lGraph" class="dgraph"></canvas></div>
      <div class="deep-side">
        <div class="phase-card"><div class="eyebrow" id="lEyebrow"></div><h3 id="lTitle"></h3><p id="lText"></p></div>
        <div><h3 class="eyebrow" style="margin:0 0 8px">En direct</h3><div class="valves" id="lStats"></div></div>
        <ol class="phase-list" id="lSteps"></ol>
        <p class="hint" id="lHint"></p>
      </div>
    </div>
  </section>'''
assert '  </section>\n</div>' in head
BRAINSEC='''  <section id="deepBrain" hidden aria-label="Le cerveau en détail">
    <div class="deep-head">
      <h2>Le cerveau, <em>des aires à la synapse</em></h2>
      <div class="row">
        <div class="speed" id="bSpeed"><button class="btn" data-s="0.25">×¼</button><button class="btn" data-s="0.5">×½</button><button class="btn" data-s="1">×1</button></div>
        <button class="btn" id="bPlay">Pause</button>
        <button class="btn" id="bNext">Échelle suivante</button>
        <button class="btn primary" id="bClose">Retour au corps</button>
      </div>
    </div>
    <div class="deep-body">
      <div class="deep-stage"><canvas id="brainCanvas" class="d3" aria-label="Cerveau en 3D"></canvas><div id="bLabels" class="dlabels"></div>
        <div class="stage-tools" id="bLevels"><button class="btn" data-l="0">1 · Cerveau</button><button class="btn" data-l="1">2 · Neurone</button><button class="btn" data-l="2">3 · Synapse</button><button class="btn" id="bReplay" hidden>Rejouer</button><button class="btn" id="bFire" hidden>Stimuler</button></div>
        <div id="bLoad" class="dload" hidden>Chargement du cerveau 3D…</div><canvas id="bGraph" class="dgraph"></canvas></div>
      <div class="deep-side">
        <div class="phase-card"><div class="eyebrow" id="bEyebrow"></div><h3 id="bTitle"></h3><p id="bText"></p></div>
        <div><h3 class="eyebrow" style="margin:0 0 8px">En direct</h3><div class="valves" id="bStats"></div></div>
        <ol class="phase-list" id="bList"></ol>
        <p class="hint" id="bHint"></p>
      </div>
    </div>
  </section>'''
head=head.replace('  </section>\n</div>','  </section>\n'+LUNGSEC+'\n'+BRAINSEC+'\n</div>',1)
content=content.replace("cerveau: { nom: 'Cerveau', sys: 'nerveux', dist: 0.55,","cerveau: { nom: 'Cerveau', sys: 'nerveux', dist: 0.55, deep: 'cerveau',")
content=content.replace("poumons: { nom: 'Poumons', sys: 'respi', dist: 0.6,","poumons: { nom: 'Poumons', sys: 'respi', dist: 0.6, deep: 'poumons',")
ui=ui.replace('<button class="btn primary" id="deepBtn">Plonger dans le cycle cardiaque</button>','<button class="btn primary" id="deepBtn">${({ coeur: \'Plonger dans le cycle cardiaque\', poumons: "Plonger jusqu\'à l\'alvéole", cerveau: \'Plonger dans le cerveau et le neurone\' })[o.deep]}</button>')
ui=ui.replace("if (o.deep) $('deepBtn').onclick = openDeep;","if (o.deep) $('deepBtn').onclick = ({ coeur: openDeep, poumons: openLungDeep, cerveau: openBrainDeep })[o.deep];")
content=content.replace("coeur: { nom: 'Cœur', sys: 'cardio', dist: 0.5, deep: true,","coeur: { nom: 'Cœur', sys: 'cardio', dist: 0.5, deep: 'coeur',")
os.makedirs(S+'atlas3',exist_ok=True)
open(S+'atlas3/index.html','w').write('\n'.join([head,scripts,content,open(S+'bab_scene.js').read(),ui,ecg,open(S+'bab_loop.js').read(),deep,tail]))
print('ok')
