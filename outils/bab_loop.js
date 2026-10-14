/* ------------------------------------------------------------------ */
/* Boucle d'animation                                                  */
/* ------------------------------------------------------------------ */
function layoutOffset() {
  const w = canvas.clientWidth;
  // Sur grand écran le panneau occupe la droite : on décale le corps vers la gauche ; sur mobile on le remonte
  camera.targetScreenOffset.x = w > 820 ? -camera.radius * 0.115 : 0;
  camera.targetScreenOffset.y = w > 820 ? 0 : camera.radius * 0.1;
}
window.addEventListener('resize', () => engine.resize());

let last = performance.now(), cardiac = 0, breath = 0, clock = 0, bladderFill = 0.2;
engine.runRenderLoop(() => {
  const now = performance.now();
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state.deepOpen) { ({ coeur: drawHeartDeep, poumons: drawLungDeep, cerveau: drawBrainDeep })[state.deepOpen](dt); return; }
  if (reduceMotion) dt *= 0.4;
  clock += dt;
  cardiac = (cardiac + dt * state.bpm / 60) % 1;
  breath = (breath + dt * respRate() / 60) % 1;
  const p = cardiac;
  if (ready) {
    const v = ventContract(p), a = atrContract(p);
    meshOf.coeur.scaling.set(1 - 0.07 * v + 0.025 * a, 1 - 0.05 * v + 0.02 * a, 1 - 0.07 * v + 0.025 * a);
    const insp = breath < 0.4 ? smooth(0, 0.4, breath) : 1 - smooth(0.4, 1, breath);
    meshOf.poumons.scaling.set(1 + 0.045 * insp, 1 + 0.035 * insp, 1 + 0.045 * insp);
    meshOf.diaphragme.position.y = -0.014 * insp;
    for (const w of waves) w.time = clock;
    bladderFill += dt / 40; if (bladderFill > 1.15) bladderFill = 0.15;
    meshOf.vessie.scaling.setAll(0.7 + 0.45 * Math.min(bladderFill, 1));
    if (neurons && neurons.dot.isEnabled()) {
      const lv = neurons.level; const fire = 0.18 * dt * (0.8 + state.bpm / 120) * 10;
      for (let i = 0; i < lv.length; i++) {
        lv[i] *= Math.exp(-dt * 7); if (Math.random() < fire * 0.1) lv[i] = 1;
        const s = lv[i] < 0.05 ? 0 : lv[i]; const k = i * 16; neurons.buf[k] = neurons.buf[k + 5] = neurons.buf[k + 10] = s;
      }
      neurons.dot.thinInstanceBufferUpdated('matrix');
    }
    updateFlows(dt, p);
  }
  drawEcg(dt, p);
  if (camAnim.t < 1) {
    camAnim.t = Math.min(1, (now - camAnim.start) / 900); const e = 1 - Math.pow(1 - camAnim.t, 3);
    camera.target = BABYLON.Vector3.Lerp(camAnim.fromT, camAnim.toT, e);
    camera.radius = camAnim.fromR + (camAnim.toR - camAnim.fromR) * e;
  }
  layoutOffset();
  scene.render();
});
