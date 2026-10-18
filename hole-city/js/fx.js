// Visual juice: sparkle bursts and dust puffs when things drop in, a ground shockwave on level-up,
// confetti for a win, and a little screen shake for skyscrapers.
(function () {
  const T = THREE;
  const F = { parts: [], rings: [], shake: 0 };
  const MAX = 420;

  F.init = function () {
    const geo = new T.IcosahedronGeometry(1, 0);
    const mat = new T.MeshBasicMaterial({ color: 0xffffff });
    F.mesh = new T.InstancedMesh(geo, mat, MAX); F.mesh.frustumCulled = false;
    F.mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(MAX * 3).fill(1), 3);
    F.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    for (let i = 0; i < MAX; i++) F.parts.push({ life: 0 });
    F.hideAll();
    HC.Render.scene.add(F.mesh);
    F.ringGeo = new T.RingGeometry(0.86, 1, 64);
  };
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3(), col = new T.Color();
  F.hideAll = function () { for (let i = 0; i < MAX; i++) { m4.makeScale(0, 0, 0); F.mesh.setMatrixAt(i, m4); } F.mesh.instanceMatrix.needsUpdate = true; };

  function spawn(x, y, z, vx, vy, vz, size, color, life, grav = -900, drag = 1.5) {
    let p = F.parts.find((p) => p.life <= 0); if (!p) p = F.parts[Math.floor(Math.random() * MAX)];
    Object.assign(p, { x, y, z, vx, vy, vz, size, life, max: life, grav, drag, rx: Math.random() * 6, ry: Math.random() * 6, spin: (Math.random() - 0.5) * 12 });
    col.set(color); F.mesh.instanceColor.setXYZ(F.parts.indexOf(p), col.r, col.g, col.b); F.mesh.instanceColor.needsUpdate = true;
  }

  // Burst of sparkles rising out of the hole when something drops in.
  F.swallow = function (h, obj, big) {
    if (!F.mesh) return;
    const n = big ? 14 : 4, sz = Math.min(16, 2 + Math.sqrt(obj.def.h) * 0.45);
    const colors = obj.def.tints ? [obj.def.tints[obj.tint % obj.def.tints.length], '#FFFFFF', '#FFE66D'] : ['#FFFFFF', '#FFE66D', h.skin.colors[0]];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = h.r * Math.random() * 0.6;
      spawn(h.x + Math.cos(a) * r, 4, h.z + Math.sin(a) * r, Math.cos(a) * 60, 260 + Math.random() * 260 + sz * 10, Math.sin(a) * 60, sz * (0.6 + Math.random() * 0.6), colors[i % colors.length], 0.7 + Math.random() * 0.4);
    }
    if (big) F.dust(h.x, h.z, h.r);
  };
  F.dust = function (x, z, r) {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      spawn(x + Math.cos(a) * r, 6, z + Math.sin(a) * r, Math.cos(a) * 120, 40 + Math.random() * 60, Math.sin(a) * 120, r * 0.12 + 6, '#F4ECFF', 1.1, -20, 1.2);
    }
  };
  F.confetti = function (x, z, r) {
    const cs = ['#FF5A5F', '#FFD23F', '#3DDC97', '#3D7BFF', '#B388FF', '#FF8FCB'];
    for (let i = 0; i < 120; i++) {
      const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 500;
      spawn(x, 20, z, Math.cos(a) * sp, 500 + Math.random() * 700, Math.sin(a) * sp, 5 + Math.random() * 6 + r * 0.03, cs[i % cs.length], 2 + Math.random(), -600, 0.8);
    }
  };
  F.shock = function (x, z, r, color) {
    const mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
    const m = new T.Mesh(F.ringGeo, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, 4.5, z); m.renderOrder = 3;
    HC.Render.scene.add(m); F.rings.push({ m, x, z, r, t: 0 });
  };
  F.addShake = function (amt) { F.shake = Math.min(1, F.shake + amt); };

  F.update = function (dt) {
    if (!F.mesh) return;
    let any = false;
    for (let i = 0; i < MAX; i++) {
      const p = F.parts[i]; if (p.life <= 0) continue;
      any = true; p.life -= dt;
      if (p.life <= 0) { m4.makeScale(0, 0, 0); F.mesh.setMatrixAt(i, m4); continue; }
      p.vy += p.grav * dt; const k = Math.exp(-p.drag * dt); p.vx *= k; p.vz *= k;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rx += p.spin * dt;
      if (p.y < 1 && p.grav < -100) { p.y = 1; p.vy *= -0.3; }
      const f = p.life / p.max, sc = p.size * Math.min(1, f * 2.2);
      e.set(p.rx, p.ry + p.rx * 0.5, 0); q.setFromEuler(e); v.set(p.x, p.y, p.z); s.set(sc, sc, sc);
      m4.compose(v, q, s); F.mesh.setMatrixAt(i, m4);
    }
    if (any) F.mesh.instanceMatrix.needsUpdate = true;
    for (let i = F.rings.length - 1; i >= 0; i--) {
      const rg = F.rings[i]; rg.t += dt * 1.6;
      const sc = rg.r * (1 + HC.U.easeOutCubic(Math.min(1, rg.t)) * 2.2);
      rg.m.scale.set(sc, sc, sc); rg.m.material.opacity = Math.max(0, 0.9 * (1 - rg.t));
      if (rg.t >= 1) { HC.Render.scene.remove(rg.m); rg.m.material.dispose(); F.rings.splice(i, 1); }
    }
    // Screen shake decays; applied as a tiny camera jitter.
    if (F.shake > 0.001) {
      const c = HC.Render.camera, amt = F.shake * HC.Render.cam.view * 0.012;
      c.position.x += (Math.random() - 0.5) * amt; c.position.z += (Math.random() - 0.5) * amt;
      F.shake *= Math.exp(-dt * 6);
    }
  };
  HC.FX = F;
})();
