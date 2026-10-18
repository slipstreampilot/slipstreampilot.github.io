// Physics swallowing (cannon-es), the hole.io technique:
//  * Objects rest on an infinite ground plane.
//  * Each hole carries a kinematic "rim" — an annulus of boxes whose top is flush with the street.
//  * When an object that could fit overlaps a hole, its collision with the ground plane is switched
//    off, so it is supported only by the rim: it teeters on the lip, tips over the void and falls.
//  * A gentle suction pulls loose objects toward the hole center; anything whose top drops below
//    street level is swallowed and scored.
// Only objects near a hole get a physics body; the rest of the city is static instanced geometry.
//
// Nothing is ever forced through: whether an object falls is decided by its collision shape vs. the
// opening. Collision shapes come from each object's visible mesh (a stack of boxes, e.g. trunk +
// canopy), so a tree whose leaves are wider than the hole really can't fit.
(function () {
  const C = CANNON, CFG = HC.CONFIG, PC = CFG.physics, M = CFG.world.unitToMeter;
  // Resting objects only touch the ground and things that are falling; falling objects touch the rim.
  // So nothing outside the opening is ever shoved by the hole or by an overlapping neighbor.
  const G_GROUND = 1, G_RIM = 2, G_REST = 4, G_FALL = 8;
  const MASK_REST = G_GROUND | G_FALL, MASK_FALL = G_RIM | G_FALL | G_REST, MASK_SLIP = G_FALL | G_REST;
  const P = { active: [], rims: new Map(), onConsume: null, captured: [] };

  P.init = function () {
    const w = new C.World({ gravity: new C.Vec3(0, PC.gravity, 0) });
    w.broadphase = new C.SAPBroadphase(w); w.allowSleep = true; w.solver.iterations = 7;
    w.defaultContactMaterial.friction = PC.groundFriction; w.defaultContactMaterial.restitution = 0.05;
    P.world = w;
    P.matGround = new C.Material('ground'); P.matRim = new C.Material('rim'); P.matObj = new C.Material('obj');
    w.addContactMaterial(new C.ContactMaterial(P.matObj, P.matGround, { friction: PC.groundFriction, restitution: 0.02 }));
    w.addContactMaterial(new C.ContactMaterial(P.matObj, P.matRim, { friction: PC.rimFriction, restitution: 0.02 }));
    w.addContactMaterial(new C.ContactMaterial(P.matObj, P.matObj, { friction: 0.12, restitution: 0.05 }));
    const ground = new C.Body({ mass: 0, material: P.matGround, collisionFilterGroup: G_GROUND, collisionFilterMask: G_REST });
    ground.addShape(new C.Plane()); ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); w.addBody(ground);
    P.ground = ground;
  };

  P.gScale = 1;
  P.setGravityScale = function (k) { P.gScale = k; P.world.gravity.set(0, PC.gravity * k, 0); };

  P.reset = function () {
    for (const o of P.active) { P.world.removeBody(o.body); o.body = null; }
    P.active = []; P.captured = [];
    for (const [h, rim] of P.rims) P.world.removeBody(rim.body);
    P.rims.clear();
  };

  // ---- rims ----
  function buildRim(h) {
    const r = h.r * PC.holeSlack * M, W = Math.max(h.r, 170) * M, N = PC.rimSegments, th = PC.rimThickness;
    const body = new C.Body({ mass: 0, type: C.Body.KINEMATIC, material: P.matRim, collisionFilterGroup: G_RIM, collisionFilterMask: G_FALL });
    const segLen = 2 * (r + W) * Math.tan(Math.PI / N) * 1.06;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, rc = r + W / 2;
      const q = new C.Quaternion(); q.setFromEuler(0, -a, 0);
      // Inner face sits a touch outside r so the opening is fully as wide as the drawn hole.
      body.addShape(new C.Box(new C.Vec3(W / 2, th / 2, segLen / 2)), new C.Vec3(Math.cos(a) * rc, -th / 2, Math.sin(a) * rc), q);
    }
    body.position.set(h.x * M, 0, h.z * M);
    P.world.addBody(body);
    return { body, r: h.r };
  }
  P.removeRim = function (h) { const rim = P.rims.get(h); if (rim) { P.world.removeBody(rim.body); P.rims.delete(h); } };

  function updateRims(holes, dt) {
    for (const h of holes) {
      let rim = P.rims.get(h);
      if (!h.alive || !h.physical) { if (rim) P.removeRim(h); continue; }
      if (!rim || Math.abs(rim.r - h.r) > 0.5) { if (rim) P.world.removeBody(rim.body); rim = buildRim(h); P.rims.set(h, rim); }
      // Teleport (no velocity) so the rim never drags or flings things with friction.
      const b = rim.body;
      if (dt > 0 && rim.px != null) { rim.vx = (h.x * M - rim.px) / dt; rim.vz = (h.z * M - rim.pz) / dt; } else { rim.vx = 0; rim.vz = 0; }
      rim.px = h.x * M; rim.pz = h.z * M;
      b.velocity.set(0, 0, 0); b.position.set(h.x * M, 0, h.z * M);
    }
    for (const h of [...P.rims.keys()]) if (!holes.includes(h)) P.removeRim(h);
  }

  // ---- collision shapes derived from the mesh ----
  // The mesh is sliced into height bands. Each band's outline is measured in 8 directions, giving an
  // octagon that hugs it: a box stays a box, a round canopy or a rounded car nose gets its corners
  // cut. Neighbouring bands with nearly the same outline merge, so a building stays one piece while
  // a tree becomes planter + trunk + canopy. Cached per kind. Units: world units, y from the base.
  const DIRS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
  function octVerts(e) {
    const v = [];
    for (let i = 0; i < 8; i++) {
      const [a1, b1] = DIRS[i], [a2, b2] = DIRS[(i + 1) % 8], c1 = e[i], c2 = e[(i + 1) % 8], det = a1 * b2 - a2 * b1;
      const x = (c1 * b2 - c2 * b1) / det, z = (a1 * c2 - a2 * c1) / det;
      const last = v[v.length - 1];
      if (!last || Math.hypot(last[0] - x, last[1] - z) > 0.4) v.push([x, z]);
    }
    if (v.length > 1 && Math.hypot(v[0][0] - v[v.length - 1][0], v[0][1] - v[v.length - 1][1]) <= 0.4) v.pop();
    return v;
  }
  P.shape = function (def) {
    if (def._shape) return def._shape;
    let pos = null;
    try { const g = new HC.Geo(); def.build(g); pos = g.pos; } catch (e) { pos = null; }
    const hs = def.hs || 1, H = def.h, y0b = def.centered ? -H / 2 : 0;
    let parts = [];
    const ext = () => [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity];
    if (pos && pos.length) {
      const B = 5, bands = Array.from({ length: B }, ext);
      for (let i = 0; i < pos.length; i += 9) {
        let ty0 = Infinity, ty1 = -Infinity;
        for (let k = 1; k < 9; k += 3) { const y = pos[i + k] * hs; ty0 = Math.min(ty0, y); ty1 = Math.max(ty1, y); }
        const b0 = Math.max(0, Math.min(B - 1, Math.floor((ty0 - y0b) / H * B))), b1 = Math.max(b0, Math.min(B - 1, Math.floor((ty1 - y0b) / H * B - 1e-6)));
        for (let k = 0; k < 9; k += 3) {
          const x = pos[i + k], z = pos[i + k + 2];
          for (let b = b0; b <= b1; b++) { const e = bands[b]; for (let d = 0; d < 8; d++) { const pr = x * DIRS[d][0] + z * DIRS[d][1]; if (pr > e[d]) e[d] = pr; } }
        }
      }
      for (let b = 0; b < B; b++) {
        const e = bands[b]; if (e[0] === -Infinity) continue;
        const part = { e: e.slice(), y0: y0b + H * b / B, y1: y0b + H * (b + 1) / B };
        const last = parts[parts.length - 1];
        const similar = last && e.every((v, d) => Math.abs(v - last.e[d]) < 0.09 * Math.max(Math.abs(v), Math.abs(last.e[d])) + 1);
        if (similar) { for (let d = 0; d < 8; d++) last.e[d] = Math.max(last.e[d], e[d]); last.y1 = part.y1; }
        else parts.push(part);
      }
      // Ignore paper-thin ground decals (towels, shadows) that would not stop anything falling.
      parts = parts.filter((p) => p.e[0] + p.e[4] > 0.5 && p.e[2] + p.e[6] > 0.5);
    }
    if (!parts.length) { const w = def.w / 2, d = def.d / 2, c = (w + d) / Math.SQRT2; parts = [{ e: [w, c, d, c, w, c, d, c], y0: y0b, y1: y0b + H }]; }
    const fe = ext();
    for (const p of parts) {
      p.x0 = -p.e[4]; p.x1 = p.e[0]; p.z0 = -p.e[6]; p.z1 = p.e[2];
      // Softly rounded corners (as most games do): each corner is cut back by a share of the part's
      // narrow side. A square building can then drop through a hole about as wide as itself, while
      // a long bus is still long and has to tip in end-first.
      const c = PC.cornerRound * Math.min(p.x1 - p.x0, p.z1 - p.z0);
      for (const d of [1, 3, 5, 7]) {
        const sx = DIRS[d][0] > 0 ? p.x1 : -p.x0, sz = DIRS[d][1] > 0 ? p.z1 : -p.z0;
        p.e[d] = Math.min(p.e[d], (sx + sz - c) / Math.SQRT2);
      }
      p.v = octVerts(p.e);
      for (let d = 0; d < 8; d++) fe[d] = Math.max(fe[d], p.e[d]);
    }
    const fv = octVerts(fe);
    let diag = 0; for (const a of fv) for (const b of fv) diag = Math.max(diag, Math.hypot(a[0] - b[0], a[1] - b[1]));
    const wid = [0, 1, 2, 3].map((d) => fe[d] + fe[d + 4]);
    const fw = wid[0], fd = wid[2];
    const foot = { x0: -fe[4], x1: fe[0], z0: -fe[6], z1: fe[2], y0: Math.min(...parts.map((p) => p.y0)) };
    return (def._shape = { parts, foot, fw, fd, min: Math.min(...wid), max: Math.max(fw, fd), diag });
  };
  // Cannon shape for one part, positioned relative to the body's centre (metres).
  function partShape(p, cy) {
    const hy = Math.max(0.02, (p.y1 - p.y0) * M / 2), oy = ((p.y0 + p.y1) / 2 - cy) * M;
    if (p.v.length <= 4) {
      return [new C.Box(new C.Vec3(Math.max(0.02, (p.x1 - p.x0) * M / 2), hy, Math.max(0.02, (p.z1 - p.z0) * M / 2))), new C.Vec3((p.x0 + p.x1) / 2 * M, oy, (p.z0 + p.z1) / 2 * M)];
    }
    // Octagonal prism centred on its own middle.
    let cx = 0, cz = 0; for (const [x, z] of p.v) { cx += x; cz += z; } cx /= p.v.length; cz /= p.v.length;
    const n = p.v.length, verts = [];
    for (const [x, z] of p.v) verts.push(new C.Vec3((x - cx) * M, -hy, (z - cz) * M));
    for (const [x, z] of p.v) verts.push(new C.Vec3((x - cx) * M, hy, (z - cz) * M));
    const faces = [[], []];
    for (let i = n - 1; i >= 0; i--) faces[0].push(i);          // bottom
    for (let i = 0; i < n; i++) faces[1].push(n + i);            // top
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, j, n + j, n + i]); }
    // Make every face wind outward whatever order the octagon came in.
    for (const f of faces) {
      const a = verts[f[0]], b = verts[f[1]], c = verts[f[2]];
      const nx = (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y), ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z), nz = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      let mx = 0, my = 0, mz = 0; for (const k of f) { mx += verts[k].x; my += verts[k].y; mz += verts[k].z; }
      if (nx * mx + ny * my + nz * mz < 0) f.reverse();
    }
    return [new C.ConvexPolyhedron({ vertices: verts, faces }), new C.Vec3(cx * M, oy, cz * M)];
  }
  P.opening = (h) => h.r * 2 * PC.holeSlack;               // physical hole diameter (world units)
  // Worth simulating: the narrow side passes and it is short enough that it could tip in end-first.
  // Physics alone decides whether it actually falls.
  const canFit = (o, h) => { const s = P.shape(o.def), D = P.opening(h); return s.min < D * 0.98 && s.max < D * PC.tipLength; };
  P.canFit = canFit;
  // What a player can reliably get in, calibrated against tools/fitprobe.js: its whole outline fits
  // with a little room to spare, or it's slim and only a little longer than the hole (tips in
  // end-first). Used where physics doesn't run (off-screen rivals), for bot targeting and for the
  // "now fit!" toasts.
  P.likelyFits = (def, r, k = 1) => {
    const s = P.shape(def), D = r * 2 * PC.holeSlack * k;
    return s.diag < D * PC.likelyFlat || (s.max < D * PC.likelyLong && s.min < D * PC.likelySlim);
  };
  // How much of the opening an object's narrow side fills (0..1) — bots prefer big-but-fitting food.
  P.fill = (def, r) => Math.min(1, P.shape(def).min / (r * 2 * PC.holeSlack));

  function activate(o) {
    const d = o.def;
    const mass = Math.max(4, Math.min(4000, 6 * Math.sqrt(d.mass)));
    const body = new C.Body({ mass, material: P.matObj, collisionFilterGroup: G_REST, collisionFilterMask: MASK_REST,
      linearDamping: 0.04, angularDamping: 0.12, sleepSpeedLimit: 0.12, sleepTimeLimit: 0.6 });
    // Compound body built from the mesh-derived boxes, centred on the collider's middle.
    const sh = P.shape(d), cy = d.centered ? 0 : d.h / 2;
    for (const p of sh.parts) { const [shp, off] = partShape(p, cy); body.addShape(shp, off); }
    const q = new C.Quaternion(o.q[0], o.q[1], o.q[2], o.q[3]);
    // `centered` kinds (rolling tumbleweeds) are modeled around their middle, not their base.
    const up = q.vmult(new C.Vec3(0, d.centered ? 0 : d.h * M / 2, 0));
    body.position.set(o.p[0] * M + up.x, o.p[1] * M + up.y + 0.01, o.p[2] * M + up.z);
    body.quaternion.copy(q);
    if (o.mover && o.mover.vx != null) body.velocity.set(o.mover.vx * M, 0, o.mover.vz * M);
    P.world.addBody(body);
    o.body = body; o.state = 'active'; o.groundOn = true; o.inHoleT = 0; o.nudgeT = 0;
    if (o.mover) o.mover.halted = true;
    P.active.push(o);
  }
  function deactivate(o, i) {
    P.world.removeBody(o.body); o.body = null; o.state = 'static';
    P.active[i] = P.active[P.active.length - 1]; P.active.pop();
  }

  const qTmp = new C.Quaternion(), vTmp = new C.Vec3();
  const vHole = new C.Vec3(), vLoc = new C.Vec3(), vRel = new C.Vec3(), vF = new C.Vec3();
  function syncFromBody(o) {
    const b = o.body, d = o.def;
    const down = b.quaternion.vmult(vTmp.set(0, d.centered ? 0 : -d.h * M / 2, 0));
    o.p[0] = (b.position.x + down.x) / M; o.p[1] = (b.position.y + down.y) / M; o.p[2] = (b.position.z + down.z) / M;
    o.q[0] = b.quaternion.x; o.q[1] = b.quaternion.y; o.q[2] = b.quaternion.z; o.q[3] = b.quaternion.w;
    o.x = b.position.x / M; o.z = b.position.z / M;
  }

  // Wake objects that a hole could swallow; retire bodies nobody is near any more.
  function manageBodies(holes) {
    const near = [];
    for (const h of holes) {
      if (!h.alive || !h.physical) continue;
      const reach = h.r * PC.holeSlack + PC.activationPad / M;
      near.length = 0; HC.World.query(h.x, h.z, reach + 260, near);
      for (const o of near) {
        if (o.state !== 'static' || !canFit(o, h) || small(o, h)) continue;
        const d = Math.hypot(o.x - h.x, o.z - h.z);
        const fr = P.shape(o.def).diag / 2, lim = o.mover && !o.mover.halted ? h.r + fr * 0.4 : reach + fr * 0.9;
        if (d < lim && P.active.length < PC.maxBodies) activate(o);
      }
    }
    for (let i = P.active.length - 1; i >= 0; i--) {
      const o = P.active[i];
      if (o.committed) continue;
      let close = false;
      for (const h of holes) { if (h.alive && h.physical && Math.hypot(o.x - h.x, o.z - h.z) < h.r * 1.4 + P.shape(o.def).diag / 2 + 60 && canFit(o, h)) { close = true; break; } }
      if (!close && o.groundOn && (o.body.sleepState === C.Body.SLEEPING || o.body.velocity.lengthSquared() < 0.01)) {
        syncFromBody(o); deactivate(o, i); HC.World.moved(o);
      }
    }
  }

  function holeFor(o, holes) {
    let best = null, bd = Infinity;
    for (const h of holes) {
      if (!h.alive || !h.physical || !canFit(o, h)) continue;
      const d = Math.hypot(o.x - h.x, o.z - h.z) - h.r;
      if (d < P.shape(o.def).min * 0.5 && d < bd) { bd = d; best = h; }
    }
    return best;
  }

  // ---- fast swallow for small things ----
  const small = (o, h) => P.shape(o.def).diag / 2 < h.r * PC.captureRatio;
  function capture(o, h) {
    if (o.body) { P.world.removeBody(o.body); o.body = null; const i = P.active.indexOf(o); if (i >= 0) { P.active[i] = P.active[P.active.length - 1]; P.active.pop(); } }
    o.state = 'captured'; if (o.mover) o.mover.halted = true;
    const a = Math.random() * Math.PI * 2;
    o.cap = { h, t: 0, dur: (0.3 + 0.1 * Math.sqrt(o.def.h * M)) / Math.sqrt(P.gScale), rx: o.x - h.x, rz: o.z - h.z, y0: o.p[1], q0: o.q.slice(), ax: Math.cos(a), az: Math.sin(a), spin: 1.2 + Math.random() * 1.6 };
    P.captured.push(o);
  }
  function captureScan(holes, dt) {
    for (const h of holes) {
      if (!h.alive) continue;
      const list = HC.World.query(h.x, h.z, h.r);
      for (const o of list) {
        if ((o.state !== 'static' && !(o.state === 'active' && !o.committed)) || !small(o, h) || !canFit(o, h)) continue;
        const d = Math.hypot(o.x - h.x, o.z - h.z);
        if (d < h.r * PC.holeSlack - P.shape(o.def).diag / 2 * 0.55) {
          if (o.capHole !== h) { o.capHole = h; o.capT = 0; }
          o.capT += dt;
          if (o.capT >= PC.captureDwell) capture(o, h);
        } else if (o.capHole === h) o.capT = 0;
      }
    }
  }
  const qa = new C.Quaternion(), qb = new C.Quaternion(), ax = new C.Vec3();
  function updateCaptured(dt) {
    for (let i = P.captured.length - 1; i >= 0; i--) {
      const o = P.captured[i], c = o.cap, h = c.h;
      c.t += dt; const f = Math.min(1, c.t / c.dur), e = f * f;
      // Ride along with the hole, drift toward its middle, tip over and drop into the pit.
      const k = 1 - 0.55 * HC.U.easeOutCubic(f);
      o.x = h.x + c.rx * k; o.z = h.z + c.rz * k;
      o.p[0] = o.x; o.p[2] = o.z; o.p[1] = c.y0 - e * (o.def.h * 1.6 + 30);
      ax.set(c.az, 0, -c.ax); qa.setFromAxisAngle(ax, Math.min(1.5, f * c.spin * 1.6));
      qb.set(c.q0[0], c.q0[1], c.q0[2], c.q0[3]); const q = qa.mult(qb);
      o.q[0] = q.x; o.q[1] = q.y; o.q[2] = q.z; o.q[3] = q.w;
      if (HC.Render && HC.Render.kinds) HC.Render.setObject(o);
      if (f >= 1) {
        P.captured[i] = P.captured[P.captured.length - 1]; P.captured.pop();
        HC.World.markGone(o); HC.Render && HC.Render.hideObject && HC.Render.hideObject(o);
        if (P.onConsume) P.onConsume(o, h.alive ? h : (h.deathTo || h));
      }
    }
  }

  P.step = function (dt, holes) {
    updateRims(holes, dt);
    captureScan(holes, dt);
    updateCaptured(dt);
    manageBodies(holes);
    for (let i = P.active.length - 1; i >= 0; i--) {
      const o = P.active[i], b = o.body;
      o.x = b.position.x / M; o.z = b.position.z / M;
      const h = o.committed ? o.owner : holeFor(o, holes);
      if (h && !o.committed) o.owner = h;
      const over = !!h;
      if (over && o.groundOn) { o.groundOn = false; b.collisionFilterGroup = G_FALL; b.collisionFilterMask = MASK_FALL; b.wakeUp(); }
      else if (!over && !o.groundOn && !o.committed && b.aabb.lowerBound.y > -0.03) { o.groundOn = true; o.inHoleT = 0; b.collisionFilterGroup = G_REST; b.collisionFilterMask = MASK_REST; }
      if (h) {
        const dx = h.x * M - b.position.x, dz = h.z * M - b.position.z, dist = Math.hypot(dx, dz) || 1, r = h.r * PC.holeSlack * M;
        if (dist < r * 1.3) {
          // Suction only helps things that already fit flat. Anything longer than the opening gets no
          // sideways pull: centring it would just park it bridged across the hole. It has to tip in.
          const sh = P.shape(o.def), flat = sh.max < r * 2 / M;
          const k = flat ? PC.suction * Math.min(1, dist / r) * b.mass * (dist < r ? 1 : 0.5) * Math.sqrt(P.gScale) : 0;
          if (k) b.applyForce(new C.Vec3(dx / dist * k, 0, dz / dist * k));
          // The hole pulls down on the part of the object that is over it: the point of its footprint
          // nearest the hole's centre. A car nosing over the edge gets its nose pulled down and tips
          // in end-first, but only if the geometry lets it; something resting on the rim on both
          // sides is pulled straight down onto the rim and stays put.
          b.pointToLocalFrame(vHole.set(h.x * M, b.position.y, h.z * M), vLoc);
          const cy = o.def.centered ? 0 : o.def.h / 2, fp = sh.foot;
          vLoc.x = Math.max(fp.x0 * M, Math.min(fp.x1 * M, vLoc.x)); vLoc.z = Math.max(fp.z0 * M, Math.min(fp.z1 * M, vLoc.z)); vLoc.y = (fp.y0 - cy) * M;
          b.quaternion.vmult(vLoc, vRel);
          const pd = Math.hypot(b.position.x + vRel.x - h.x * M, b.position.z + vRel.z - h.z * M);
          const sink = PC.sink * P.gScale * b.mass * Math.max(0, Math.min(1, 1.2 - pd / r));
          if (sink > 0) b.applyForce(vF.set(0, -sink, 0), vRel);
          o.inHoleT += dt;
          // Already part-way into the pit but wedged against the lip and barely moving? Jostle it a little
          // (a real impulse, still resolved by collisions, like the ground shaking as the hole moves).
          // Something bridging the hole on the surface isn't sunk, so it never gets one: it has to tip.
          const stuck = b.aabb.lowerBound.y < -0.1 && b.velocity.lengthSquared() < 0.25 && b.position.y > -1.5;
          if (stuck && o.inHoleT > PC.jamSeconds && (o.nudgeT -= dt) <= 0) {
            o.nudgeT = 0.45; const m = b.mass;
            b.applyImpulse(new C.Vec3((Math.random() - 0.5) * m * 1.2 + dx / dist * m * 0.6, m * 0.8, (Math.random() - 0.5) * m * 1.2 + dz / dist * m * 0.6));
            if (sh.diag < r * 2 / M) {
              // Its whole outline fits inside the opening, and it's already sunk into the pit: it is
              // only snagged on the underside of the lip (a quirk of a thin collision rim). Let it
              // slip past the lip. Anything whose outline doesn't fit never gets this.
              b.collisionFilterMask = MASK_SLIP;
            } else b.angularVelocity.set((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5);
            b.wakeUp();
          }
        }
        // Once it is falling down the pit (its middle is below the surface, or it fits the opening and
        // its base has dropped below the lip), the pit travels with the hole: it is carried along
        // instead of being clipped by the lip as the hole moves on.
        const rim = P.rims.get(h);
        if (rim && dist < r && (b.position.y < 0 || (P.shape(o.def).diag < r * 2 / M && b.aabb.lowerBound.y < -0.2))) {
          const f = Math.min(1, dt * 12);
          b.velocity.x += (rim.vx + dx * 2 - b.velocity.x) * f; b.velocity.z += (rim.vz + dz * 2 - b.velocity.z) * f;
        }
        if (b.position.y < 0 && b.aabb.upperBound.y < 0.5) o.committed = true;
      }
      if (b.aabb.upperBound.y < -0.4 || b.position.y < -60) {
        const owner = o.owner && o.owner.alive ? o.owner : (h || o.owner);
        P.world.removeBody(b); o.body = null; P.active[i] = P.active[P.active.length - 1]; P.active.pop();
        HC.World.markGone(o); HC.Render && HC.Render.hideObject && HC.Render.hideObject(o);
        if (P.onConsume) P.onConsume(o, owner);
        continue;
      }
    }
    P.world.step(dt);
    for (const o of P.active) { syncFromBody(o); if (HC.Render && HC.Render.kinds) HC.Render.setObject(o); }
  };

  // Off-screen holes skip physics. To stay fair with on-screen physics, an object must sit inside
  // the opening for about as long as it would take to tip and fall before it counts as eaten.
  P.consumeInstant = function (h, dt) {
    const list = HC.World.query(h.x, h.z, h.r + 40);
    for (const o of list) {
      if (o.state !== 'static' || !P.likelyFits(o.def, h.r) || small(o, h)) continue;
      const d = Math.hypot(o.x - h.x, o.z - h.z), sh = P.shape(o.def);
      if (d < h.r * PC.holeSlack - sh.min * 0.15) {
        if (o.ghostHole !== h) { o.ghostHole = h; o.ghostT = 0; }
        const hm = o.def.h * M, wide = sh.max / (h.r * 2);
        const need = 0.12 + Math.sqrt(2 * hm / (-PC.gravity * P.gScale)) * 0.8 + Math.max(0, wide - 0.8) * 0.5;
        o.ghostT += dt;
        if (o.ghostT >= need) {
          HC.World.markGone(o); HC.Render && HC.Render.hideObject && HC.Render.hideObject(o);
          if (P.onConsume) P.onConsume(o, h);
        }
      } else if (o.ghostHole === h) { o.ghostT = Math.max(0, o.ghostT - dt * 2); }
    }
  };

  HC.Physics = P;
})();
