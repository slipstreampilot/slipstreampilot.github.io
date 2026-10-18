// Rival holes. A small utility AI with four moods:
//   forage  – head for the richest reachable cluster of things that currently fit
//   hunt    – chase a smaller hole for a few seconds, then give up
//   flee    – run from a bigger hole that's close
//   wander  – drift when nothing is worth it
// Each bot has a personality (greed, aggression, caution, focus) so they don't move like clones.
(function () {
  const CFG = HC.CONFIG, U = HC.U;
  const B = {};

  B.personality = function (rng, skill) {
    return {
      greed: U.lerp(0.7, 1.3, rng()), aggression: U.lerp(0.15, 0.95, rng()), caution: U.lerp(0.3, 1.0, rng()),
      focus: U.lerp(0.5, 1.0, rng()) * skill, noise: U.lerp(0.15, 0.45, rng()) * (1.4 - skill), skill,
    };
  };

  B.init = function (h, rng, skill = 0.85) {
    h.ai = { p: B.personality(rng, skill), mood: 'forage', think: rng() * 0.4, tx: h.x, tz: h.z, prey: null, huntT: 0, wob: rng() * 10, stuck: 0 };
  };

  function bestCluster(h, ai) {
    const near = HC.World.query(h.x, h.z, CFG.bots.scanRadius);
    const cells = new Map(), cs = 240;
    const Ph = HC.Physics;
    for (const o of near) {
      if (!Ph.likelyFits(o.def, h.r, 0.9)) continue;
      const k = Math.floor(o.x / cs) * 1000 + Math.floor(o.z / cs);
      let c = cells.get(k); if (!c) { c = { x: 0, z: 0, v: 0, n: 0 }; cells.set(k, c); }
      // Big-but-fitting things are worth chasing more than crumbs.
      const v = o.def.points * (0.6 + 0.8 * Ph.fill(o.def, h.r));
      c.x += o.x * v; c.z += o.z * v; c.v += v; c.n++;
    }
    let best = null, bs = -Infinity;
    for (const c of cells.values()) {
      const x = c.x / c.v, z = c.z / c.v, d = Math.hypot(x - h.x, z - h.z);
      let s = Math.pow(c.v, ai.p.greed * 0.9) / (d + 260 + h.r) * (0.75 + Math.random() * 0.5 * (1.4 - ai.p.focus));
      // Avoid clusters guarded by bigger holes.
      for (const o of B.holes) if (o !== h && o.alive && o.r > h.r * 1.1 && Math.hypot(o.x - x, o.z - z) < o.r * 3 + 250) s *= 1 - 0.8 * ai.p.caution;
      if (s > bs) { bs = s; best = { x, z }; }
    }
    return best;
  }

  B.think = function (h, holes) {
    const ai = h.ai; B.holes = holes;
    // Threats.
    let fx = 0, fz = 0, threat = 0;
    for (const o of holes) {
      if (o === h || !o.alive || o.r <= h.r * CFG.hole.eatHoleRatio) continue;
      const d = Math.hypot(o.x - h.x, o.z - h.z), range = o.r * 2.5 + 260 * ai.p.caution + 120;
      if (d < range) { const w = (1 - d / range); fx += (h.x - o.x) / (d || 1) * w; fz += (h.z - o.z) / (d || 1) * w; threat = Math.max(threat, w); }
    }
    if (threat > 0.15 + 0.3 * (1 - ai.p.caution)) { ai.mood = 'flee'; ai.fx = fx; ai.fz = fz; ai.prey = null; return; }
    // Prey.
    if (ai.prey && (!ai.prey.alive || ai.huntT <= 0 || h.r < ai.prey.r * CFG.hole.eatHoleRatio || ai.prey.protect > 0)) { ai.prey = null; ai.cool = 3 + Math.random() * 3; }
    if (!ai.prey && (ai.cool || 0) <= 0) {
      let best = null, bs = 0;
      for (const o of holes) {
        if (o === h || !o.alive || o.protect > 0 || h.r < o.r * CFG.hole.eatHoleRatio * 1.05) continue;
        // Mercy for the player: small players are left alone unless they wander right into a bot.
        if (o.isPlayer && o.level <= 3 && Math.hypot(o.x - h.x, o.z - h.z) > h.r * 1.6) continue;
        const d = Math.hypot(o.x - h.x, o.z - h.z), range = h.level < 4 ? h.r * 3 : h.r * 6 + 500; // tiny bots only snap at holes right next to them
        if (d > range) continue;
        const s = ai.p.aggression * (1 - d / range) * (1 + o.score / 400) * (o.isPlayer ? CFG.bots.playerHuntFactor : 1);
        if (s > bs) { bs = s; best = o; }
      }
      if (best && bs > 0.25) { ai.prey = best; ai.huntT = 3 + ai.p.aggression * 4; }
    }
    if (ai.prey) { ai.mood = 'hunt'; return; }
    // Stick with the current snack until it's gone (so we actually sit over it while it falls).
    const Ph = HC.Physics, fits = (o) => Ph.likelyFits(o.def, h.r, 0.9);
    const o0 = ai.obj;
    if (o0 && ai.objT > 3.5 && o0.state !== 'gone') { ai.skip = ai.skip || new Map(); ai.skip.set(o0, performance.now() + 15000); }
    if (o0 && (o0.state === 'gone' || !fits(o0) || ai.objT > 3.5 || Math.hypot(o0.x - h.x, o0.z - h.z) > 500 + h.r * 4)) ai.obj = null;
    if (!ai.obj) {
      const near = HC.World.query(h.x, h.z, 260 + h.r * 4);
      let bo = null, bv = 0;
      for (const o of near) {
        if (o.state === 'gone' || !fits(o)) continue;
        const Lb = HC.World.city.land; if (o.x < Lb.min + 90 || o.x > Lb.max - 90 || o.z < Lb.min + 90 || o.z > Lb.max - 90) continue;
        if (ai.skip && ai.skip.has(o) && ai.skip.get(o) > performance.now()) continue;
        const d = Math.hypot(o.x - h.x, o.z - h.z);
        let v = Math.pow(o.def.points, ai.p.greed) * (0.7 + 0.6 * Ph.fill(o.def, h.r)) / (d + 40 + h.r);
        if (o.mover && !o.mover.halted) v *= 0.55;
        for (const t of holes) if (t !== h && t.alive && t.r > h.r * 1.1 && Math.hypot(t.x - o.x, t.z - o.z) < t.r * 2.2 + 150) v *= 1 - 0.85 * ai.p.caution;
        if (v > bv) { bv = v; bo = o; }
      }
      if (bo) { ai.obj = bo; ai.objT = 0; }
    }
    if (ai.obj) { ai.mood = 'eat'; return; }
    const c = bestCluster(h, ai);
    if (c) { ai.mood = 'forage'; ai.tx = c.x; ai.tz = c.z; }
    else { ai.mood = 'wander'; if (Math.hypot(ai.tx - h.x, ai.tz - h.z) < 100) { ai.tx = 300 + Math.random() * 4400; ai.tz = 300 + Math.random() * 4400; } }
  };

  // Returns a steering direction for this frame.
  B.steer = function (h, holes, dt) {
    const ai = h.ai;
    ai.think -= dt; if (ai.prey) ai.huntT -= dt; if (ai.cool > 0) ai.cool -= dt;
    if (ai.think <= 0) { B.think(h, holes); ai.think = U.lerp(CFG.bots.thinkInterval[0], CFG.bots.thinkInterval[1], Math.random()); }
    let dx = 0, dz = 0;
    if (ai.obj) ai.objT = (ai.objT || 0) + dt;
    if (ai.mood === 'flee') { dx = ai.fx; dz = ai.fz; }
    else if (ai.mood === 'eat' && ai.obj) {
      dx = ai.obj.x - h.x; dz = ai.obj.z - h.z; const d = Math.hypot(dx, dz);
      // Slow down on top of it so it can tip in.
      if (d < h.r * 0.35) { dx *= 0.15; dz *= 0.15; } else if (d < h.r) { dx *= 0.6; dz *= 0.6; }
      const lenE = Math.hypot(dx, dz); if (lenE < 0.05) return [dx, dz];
    }
    else if (ai.mood === 'hunt' && ai.prey) { const lead = 0.35; dx = ai.prey.x + ai.prey.vx * lead - h.x; dz = ai.prey.z + ai.prey.vz * lead - h.z; }
    else { dx = ai.tx - h.x; dz = ai.tz - h.z; const d = Math.hypot(dx, dz); if (d < h.r * 0.5) { dx *= 0.3; dz *= 0.3; } }
    // Organic wobble so paths aren't laser-straight.
    ai.wob += dt * 1.7;
    const len = Math.hypot(dx, dz) || 1, n = ai.p.noise * (ai.mood === 'eat' ? 0.3 : 1), mag = Math.min(1, len);
    dx = (dx / len + Math.sin(ai.wob) * n) * mag; dz = (dz / len + Math.cos(ai.wob * 1.3) * n) * mag;
    // Keep off the very edge of the island.
    const L = HC.World.city.land, m = 120;
    if (h.x < L.min + m) dx += 1; if (h.x > L.max - m) dx -= 1; if (h.z < L.min + m) dz += 1; if (h.z > L.max - m) dz -= 1;
    return [dx, dz];
  };

  HC.Bots = B;
})();
