// Physics swallowing (cannon-es): a physics sandbox with real holes in the ground.
//  * The street is one still, infinite ground plane. Each hole is cut out of it: contacts between the
//    ground and anything over an opening are simply dropped, so the street holds up exactly the part
//    of a building that's still on solid ground. Every base carries a grid of small "feet" so that
//    support follows the lip precisely (a box alone only touches the ground at its corners).
//  * Below each opening is a shaft: kinematic walls from just under the street down past the
//    deepest anything reaches, travelling with the hole.
//  * So nothing is scripted: what's over the edge decides. Less than half over the edge, a building
//    stands; more than half (its centre of mass over the void) and it tips, pivoting on the lip. If the
//    hole slides under it mid-tip, it falls at whatever angle it had reached, its upper floors hit
//    the far wall and it scrapes down the shaft. Something longer than the hole is wide can bridge it.
//  * No helpers: no pull toward the middle, no carrying, no funnel, no straightening. When the hole moves,
//    its walls push whatever is down the shaft. Only the wedge shake/spit and the tilt freeze remain.
//  * Anything whose top drops far enough below street level is swallowed and scored.
// Only objects near a hole get a physics body; the rest of the city is static instanced geometry.
// Collision shapes come from each object's visible mesh (a stack of boxes/octagons, e.g. trunk +
// canopy), so a tree whose leaves are wider than the hole really can't fit. A fallen-over object is
// judged by how it's lying now (a toppled skyscraper is a long thing, eaten end-first).
// Only when every body is in use do tiny things skip physics (the overflow swallow, below).
(function () {
  const C = CANNON, CFG = HC.CONFIG, PC = CFG.physics, M = CFG.world.unitToMeter;
  // Groups: the street, shaft walls, objects, and crashed coaster cars flying through the scene (which
  // hit the street and objects but never the shafts). Feet only ever touch the street.
  const G_GROUND = 1, G_WALL = 2, G_OBJ = 4, G_SMASH = 16, S_GROUND = 64, S_FEET = 128;
  const MASK_OBJ = G_GROUND | G_WALL | G_OBJ | G_SMASH, MASK_SMASH = G_GROUND | G_OBJ | G_SMASH;
  const P = { active: [], rims: new Map(), onConsume: null, captured: [], cut: [] };

  P.init = function () {
    const w = new C.World({ gravity: new C.Vec3(0, PC.gravity, 0) });
    w.broadphase = new C.SAPBroadphase(w); w.allowSleep = true; w.solver.iterations = 8;
    w.defaultContactMaterial.friction = PC.groundFriction; w.defaultContactMaterial.restitution = 0.05;
    P.world = w;
    P.matGround = new C.Material('ground'); P.matWall = new C.Material('wall'); P.matObj = new C.Material('obj');
    w.addContactMaterial(new C.ContactMaterial(P.matObj, P.matGround, { friction: PC.groundFriction, restitution: 0.02 }));
    w.addContactMaterial(new C.ContactMaterial(P.matObj, P.matWall, { friction: PC.wallFriction, restitution: 0.04 }));
    w.addContactMaterial(new C.ContactMaterial(P.matObj, P.matObj, { friction: PC.objFriction, restitution: 0.05 }));
    P.matObjNear = new C.Material('objNear');
    w.addContactMaterial(new C.ContactMaterial(P.matObjNear, P.matGround, { friction: PC.nearHoleFriction, restitution: 0.02 }));
    w.addContactMaterial(new C.ContactMaterial(P.matObjNear, P.matWall, { friction: PC.wallFriction, restitution: 0.04 }));
    w.addContactMaterial(new C.ContactMaterial(P.matObjNear, P.matObj, { friction: PC.objFriction, restitution: 0.05 }));
    w.addContactMaterial(new C.ContactMaterial(P.matObjNear, P.matObjNear, { friction: PC.objFriction, restitution: 0.05 }));
    const ground = new C.Body({ mass: 0, material: P.matGround, collisionFilterGroup: G_GROUND, collisionFilterMask: G_OBJ | G_SMASH });
    const plane = new C.Plane(); plane.collisionFilterGroup = S_GROUND;
    ground.addShape(plane); ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); w.addBody(ground);
    P.ground = ground;
    // Cut the holes out of the street: drop every ground contact over an opening (and any deep one —
    // something that far below the street is down a shaft, and the walls handle it).
    const np = w.narrowphase, get = np.getContacts.bind(np), pt = new C.Vec3(), offWall = new Set();
    np.getContacts = function (p1, p2, world, result, oldcontacts, frictionResult, frictionPool) {
      get(p1, p2, world, result, oldcontacts, frictionResult, frictionPool);
      if (!P.cut.length) return;
      const skin = -PC.groundSkin;
      // The ground around a flask is solid; only its top surface defers to the street. A wall's friction
      // goes with its contact.
      const ledge = (eq, n) => {
        const w = eq.bi.hcWall ? eq.bi : eq.bj, other = w === eq.bi ? eq.bj : eq.bi, r = w === eq.bi ? eq.rj : eq.ri;
        if (!n || Math.abs(n.y) < 0.8) return false;
        other.position.vadd(r, pt);
        // The ground's top surface is the street, which already holds things up (with its crumbly
        // lip): the earth doesn't hold them a second time there, nor just under the lip strip.
        if (pt.y > -0.05) return true;
        const d = Math.hypot(pt.x - w.position.x, pt.z - w.position.z);
        return pt.y > -PC.neckDepth && d < w.hcR * (1 + PC.lipBand) + 0.05;
      };
      const wallKey = (eq) => `${eq.bi.id}/${eq.bj.id}/${eq.ri.x.toFixed(4)}/${eq.ri.y.toFixed(4)}/${eq.ri.z.toFixed(4)}`;
      offWall.clear();
      const off = (eq) => {
        const g = eq.bi === ground, other = g ? eq.bj : eq.bi, r = g ? eq.rj : eq.ri;
        other.position.vadd(r, pt);
        if (other.hcNoGround) return true;
        if (pt.y < skin && !other.hcSurface) return true;
        for (const c of P.cut) {
          const dx = pt.x - c[0], dz = pt.z - c[1], d2 = dx * dx + dz * dz;
          if (d2 < c[2]) return true;
          // On the lip strip: it only holds if the thing's middle is over solid street.
          if (d2 < c[3]) { const mx = other.position.x - c[0], mz = other.position.z - c[1]; if (mx * mx + mz * mz < c[2]) return true; }
        }
        return false;
      };
      for (const eq of result) {
        if (eq.bi === ground || eq.bj === ground) { eq.enabled = !off(eq); if (eq.enabled) (eq.bi === ground ? eq.bj : eq.bi).hcGround = world.stepnumber; }
        else if (eq.bi.hcWall || eq.bj.hcWall) { eq.enabled = !ledge(eq, eq.ni); if (!eq.enabled) offWall.add(wallKey(eq)); }
        else eq.enabled = true;
      }
      for (const eq of frictionResult) {
        if (eq.bi === ground || eq.bj === ground) eq.enabled = !off(eq);
        else if (eq.bi.hcWall || eq.bj.hcWall) eq.enabled = !offWall.has(wallKey(eq));
        else eq.enabled = true;
      }
    };
  };

  P.gScale = 1;
  P.setGravityScale = function (k) { P.gScale = k; P.world.gravity.set(0, PC.gravity * k, 0); };

  P.reset = function () {
    for (const o of P.active) { P.world.removeBody(o.body); o.body = null; }
    P.active = []; P.captured = [];
    for (const h of [...P.rims.keys()]) P.removeRim(h);
  };

  // ---- the shafts: an Erlenmeyer flask under each hole, cut into solid ground ----
  // A short vertical neck as wide as the opening, flush with the street (`neckDepth`), then a cone that
  // widens at `flareAngle` from vertical for `flareLength` metres of slope, then nothing (no floor).
  // The ground around it is solid: 22 thick wedges of earth whose inner faces are the neck and the cone,
  // reaching from the street down past the cone's bottom and `earthBeyond` metres beyond it. Anything
  // that isn't in the flask (or above the street) is inside solid ground and gets pushed back out.
  function wedge(r, a0, a1) {
    const nd = PC.neckDepth, fa = PC.flareAngle * Math.PI / 180, fl = PC.flareLength;
    const rc = r + Math.sin(fa) * fl, yc = nd + Math.cos(fa) * fl, ro = rc + PC.earthBeyond;
    const k = 1 / Math.cos((a1 - a0) / 2);            // chord facets touch the true radius at their middle
    const sec = [[r, 0], [ro, 0], [ro, -yc], [rc, -yc], [r, -nd]];
    const verts = [];
    for (const a of [a0, a1]) for (const [rho, y] of sec) verts.push(new C.Vec3(Math.cos(a) * rho * k, y, Math.sin(a) * rho * k));
    let cx = 0, cy = 0, cz = 0; for (const v of verts) { cx += v.x; cy += v.y; cz += v.z; } cx /= 10; cy /= 10; cz /= 10;
    for (const v of verts) { v.x -= cx; v.y -= cy; v.z -= cz; }
    const faces = [[0, 1, 2, 3, 4], [9, 8, 7, 6, 5]];
    for (let q = 0; q < 5; q++) { const n = (q + 1) % 5; faces.push([q, 5 + q, 5 + n, n]); }
    for (const f of faces) {
      const a = verts[f[0]], b = verts[f[1]], c = verts[f[2]];
      const nx = (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y), ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z), nz = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      let mx = 0, my = 0, mz = 0; for (const q of f) { mx += verts[q].x; my += verts[q].y; mz += verts[q].z; }
      if (nx * mx + ny * my + nz * mz < 0) f.reverse();
    }
    return [new C.ConvexPolyhedron({ vertices: verts, faces }), new C.Vec3(cx, cy, cz)];
  }
  function buildRim(h) {
    const r = h.r * PC.holeSlack * M, N = PC.rimSegments;
    const wall = new C.Body({ mass: 0, type: C.Body.KINEMATIC, material: P.matWall, collisionFilterGroup: G_WALL, collisionFilterMask: G_OBJ });
    for (let i = 0; i < N; i++) { const [shape, off] = wedge(r, (i - 0.5) / N * Math.PI * 2, (i + 0.5) / N * Math.PI * 2); wall.addShape(shape, off); }
    wall.position.set(h.x * M, 0, h.z * M); wall.hcWall = true; wall.hcR = r;
    wall.allowSleep = false;   // a sleeping kinematic body ignores its velocity: the walls would stay behind
    P.world.addBody(wall);
    return { wall, r: h.r, vx: 0, vz: 0, dvx: 0, dvz: 0 };
  }
  P.removeRim = function (h) { const rim = P.rims.get(h); if (rim) { P.world.removeBody(rim.wall); P.rims.delete(h); } };

  function updateRims(holes, dt) {
    P.cut.length = 0;
    for (const h of holes) {
      let rim = P.rims.get(h);
      if (!h.alive || !h.physical) { if (rim) P.removeRim(h); continue; }
      if (!rim || Math.abs(rim.r - h.r) > 0.5) {
        const old = rim; if (old) P.world.removeBody(old.wall);
        rim = buildRim(h); if (old) { rim.px = old.px; rim.pz = old.pz; rim.vx = old.vx; rim.vz = old.vz; } P.rims.set(h, rim);
      }
      const tx = h.x * M, tz = h.z * M, pvx = rim.vx, pvz = rim.vz;
      if (dt > 0 && rim.px != null) { rim.vx = (tx - rim.px) / dt; rim.vz = (tz - rim.pz) / dt; } else { rim.vx = 0; rim.vz = 0; }
      rim.dvx = rim.vx - pvx; rim.dvz = rim.vz - pvz;
      // Is the player wiggling? Count direction reversals (heading flips by more than ~110°) in the last
      // second. Steering around to line up under something is not a wiggle; two or more quick
      // back-and-forths are.
      rim.t = (rim.t || 0) + dt; rim.flips = (rim.flips || []).filter((ft) => rim.t - ft < PC.wiggleWindow);
      const sp = Math.hypot(rim.vx, rim.vz);
      if (sp > PC.wiggleMinSpeed) {
        const ux = rim.vx / sp, uz = rim.vz / sp;
        if (rim.hx != null && ux * rim.hx + uz * rim.hz < -0.35) rim.flips.push(rim.t);
        rim.hx = ux; rim.hz = uz;
      }
      rim.wiggling = rim.flips.length >= PC.wiggleFlips;
      rim.px = tx; rim.pz = tz;
      // The walls move with the hole: they're given the velocity that carries them to the hole's new
      // position over this step, so what they meet is hit by a moving wall (not overlapped by one that
      // jumped). A big jump (respawn) just places them.
      // (It starts each step exactly where the last one aimed it, so it can never drift or lag.)
      const w = rim.wall;
      if (rim.wx != null) w.position.set(rim.wx, 0, rim.wz);
      const jx = tx - w.position.x, jz = tz - w.position.z;
      if (dt > 0 && Math.hypot(jx, jz) < 6) w.velocity.set(jx / dt, 0, jz / dt);
      else { w.velocity.set(0, 0, 0); w.position.set(tx, 0, tz); }
      rim.wx = tx; rim.wz = tz;
      // [x, z, r², r + lip band] where the walls are during this step: the last strip of street at the
      // edge (lipBand of the radius, at most lipMax metres) can't hold up something whose weight is over
      // the opening (a rounded, crumbly lip).
      const rr = h.r * PC.holeSlack * M, lip = rr + Math.min(PC.lipMax, rr * PC.lipBand); P.cut.push([w.position.x, w.position.z, rr * rr, lip * lip]);
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
  // Bodies are a hair smaller than their meshes (4%, at least 2.5 units a side) so buildings packed
  // shoulder to shoulder, like a townhouse row, don't start out pressed into each other and held up
  // by friction.
  const SHRINK = 2.5, shrinkOf = (half) => Math.min(half * 0.3, Math.max(SHRINK, half * 0.04));   // small props keep most of their size
  function partShape(p, cy, cheap, roof) {
    const hy = Math.max(0.02, (p.y1 - p.y0) * M / 2), oy = ((p.y0 + p.y1) / 2 - cy) * M;
    // Props (people, trees, lamps, cars…) collide as plain boxes, octagonal parts slightly trimmed:
    // a box costs about half as much per contact, and the cut corners only matter on big things.
    // (A roof gets its edges rounded off instead, whatever its outline: see below.)
    if (cheap || (p.v.length <= 4 && !roof)) {
      const k = p.v.length <= 4 ? 1 : 0.9, hx = (p.x1 - p.x0) / 2 * k, hz = (p.z1 - p.z0) / 2 * k;
      return [new C.Box(new C.Vec3(Math.max(0.02, (hx - shrinkOf(hx)) * M), hy, Math.max(0.02, (hz - shrinkOf(hz)) * M))), new C.Vec3((p.x0 + p.x1) / 2 * M, oy, (p.z0 + p.z1) / 2 * M)];
    }
    // Octagonal prism centred on its own middle.
    let cx = 0, cz = 0; for (const [x, z] of p.v) { cx += x; cz += z; } cx /= p.v.length; cz /= p.v.length;
    const n = p.v.length, verts = [];
    const sk = (x, z, extra = 0) => { const d = Math.hypot(x - cx, z - cz) || 1, k = Math.max(0.3, 1 - (SHRINK + extra) / d); return [(x - cx) * k * M, (z - cz) * k * M]; };
    // Roof: the top edge is bevelled (`roofRound` of the narrow side, at most `roofRoundMax` m, and at most
    // 40% of the part's height), so leaning neighbours slide past each other instead of pinching.
    let bev = 0;
    if (roof) { const w = Math.min(p.x1 - p.x0, p.z1 - p.z0); bev = Math.min(w * PC.roofRound, PC.roofRoundMax / M, (p.y1 - p.y0) * 0.4); }
    for (const [x, z] of p.v) { const [a, b] = sk(x, z); verts.push(new C.Vec3(a, -hy, b)); }
    if (bev > 0) for (const [x, z] of p.v) { const [a, b] = sk(x, z); verts.push(new C.Vec3(a, hy - bev * M, b)); }
    for (const [x, z] of p.v) { const [a, b] = sk(x, z, bev); verts.push(new C.Vec3(a, hy, b)); }
    const top = bev > 0 ? 2 * n : n;
    const faces = [[], []];
    for (let i = n - 1; i >= 0; i--) faces[0].push(i);          // bottom
    for (let i = 0; i < n; i++) faces[1].push(top + i);          // top
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, j, n + j, n + i]); }
    if (bev > 0) for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([n + i, n + j, 2 * n + j, 2 * n + i]); }   // bevel
    // Make every face wind outward whatever order the octagon came in.
    for (const f of faces) {
      const a = verts[f[0]], b = verts[f[1]], c = verts[f[2]];
      const nx = (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y), ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z), nz = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      let mx = 0, my = 0, mz = 0; for (const k of f) { mx += verts[k].x; my += verts[k].y; mz += verts[k].z; }
      if (nx * mx + ny * my + nz * mz < 0) f.reverse();
    }
    // Opposite sides share a separating axis: test each direction once (half the work in every contact).
    const axes = [];
    for (const f of faces) {
      const a = verts[f[0]], b = verts[f[1]], c = verts[f[2]];
      const nv = new C.Vec3((b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y), (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z), (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
      nv.normalize(); if (!axes.some((u) => Math.abs(u.dot(nv)) > 0.999)) axes.push(nv);
    }
    return [new C.ConvexPolyhedron({ vertices: verts, faces, axes }), new C.Vec3(cx * M, oy, cz * M)];
  }
  P.opening = (h) => h.r * 2 * PC.holeSlack;               // physical hole diameter (world units)

  // An object's footprint as it is lying right now: standing, that's its kind's footprint; tipped over,
  // its rotated outline (a toppled skyscraper's footprint is its whole length). Cached per pose.
  const DIRS16 = Array.from({ length: 16 }, (_, i) => [Math.cos(i * Math.PI / 16), Math.sin(i * Math.PI / 16)]);
  P.footNow = function (o) {
    const q = o.q, upy = 1 - 2 * (q[0] * q[0] + q[2] * q[2]);
    if (upy > 0.985) return P.shape(o.def);
    // Reused until the pose turns by more than about 2.5°.
    if (o._foot && Math.abs(o._footQ[0] * q[0] + o._footQ[1] * q[1] + o._footQ[2] * q[2] + o._footQ[3] * q[3]) > 0.99976) return o._foot;
    const s = P.shape(o.def), qq = new C.Quaternion(q[0], q[1], q[2], q[3]), v = new C.Vec3(), out = new C.Vec3(), pts = [];
    for (const p of s.parts) for (const [x, z] of p.v) for (const y of [p.y0, p.y1]) { v.set(x, y, z); qq.vmult(v, out); pts.push([out.x, out.z]); }
    let min = Infinity, max = 0, diag = 0;
    for (const [dx, dz] of DIRS16) {
      let lo = Infinity, hi = -Infinity; for (const [x, z] of pts) { const pr = x * dx + z * dz; if (pr < lo) lo = pr; if (pr > hi) hi = pr; }
      min = Math.min(min, hi - lo); max = Math.max(max, hi - lo);
    }
    diag = max / Math.cos(Math.PI / 32);   // a point set's diameter is its widest width; 16 directions get within 0.5%
    o._footQ = q.slice(); return (o._foot = { min, max, diag });
  };
  // Worth simulating: its narrow side passes and it's at most `tipLength`× as long as the hole is wide
  // (so it could tip in end-first). Physics alone decides whether it actually goes in.
  const canFit = (o, h) => { if (o.def.scripted) return false; const s = P.footNow(o), D = P.opening(h); return s.min < D * 0.98 && s.max < D * PC.tipLength; };
  // Scripted kinds (roller-coaster track) are eaten when their support stands inside the opening and
  // the hole is at least `minHole` across; they drop into the pit with the scripted fall.
  const scriptedEdible = (o, h, d) => o.state === 'static' && h.r * 2 >= o.def.minHole && d < h.r * PC.holeSlack - 6;
  P.canFit = canFit;
  // What a player can reliably get in, calibrated against tools/fitprobe.js: its whole outline fits
  // with a little room to spare, or it's slim and only a little longer than the hole (tips in
  // end-first). Used where physics doesn't run (off-screen rivals), for bot targeting and for the
  // "now fit!" toasts.
  const likely = (s, r, k = 1) => { const D = r * 2 * PC.holeSlack * k; return s.diag < D * PC.likelyFlat || (s.max < D * PC.likelyLong && s.min < D * PC.likelySlim); };
  P.likelyFits = (def, r, k = 1) => likely(P.shape(def), r, k);
  P.likelyFitsNow = (o, r, k = 1) => likely(P.footNow(o), r, k);
  // How much of the opening an object's narrow side fills (0..1) — bots prefer big-but-fitting food.
  P.fill = (def, r) => Math.min(1, P.shape(def).min / (r * 2 * PC.holeSlack));

  function activate(o) {
    const d = o.def;
    // Heavier things really are heavier (square-root squashed): a skyscraper isn't shoved around by an
    // apartment block tumbling into the hole beside it.
    const mass = Math.max(4, Math.min(30000, 6 * Math.sqrt(d.mass)));
    const body = new C.Body({ mass, material: P.matObj, collisionFilterGroup: G_OBJ, collisionFilterMask: MASK_OBJ,
      linearDamping: 0.04, angularDamping: 0.12, sleepSpeedLimit: 0.12, sleepTimeLimit: 0.6 });
    // Compound body built from the mesh-derived boxes, centred on the collider's middle.
    const sh = P.shape(d), cy = d.centered ? 0 : d.h / 2;
    const cheap = sh.diag < PC.propSize && !slenderKind(d);   // trees keep their true shape: it decides how they slip in
    // Buildings and tall, thin things (trees, lamp posts, towers) get rounded roof edges on their top part.
    let topPart = sh.parts[0]; for (const p of sh.parts) if (p.y1 > topPart.y1) topPart = p;
    for (const p of sh.parts) { const [shp, off] = partShape(p, cy, cheap, !cheap && p === topPart && !d.centered); body.addShape(shp, off); }
    if (!d.centered) addFeet(body, sh, cy);
    // Turn a bit more readily than a real solid block would, so tipping over an edge reads at game
    // speed instead of the slow-motion lean of a real 30 m tower.
    body.updateMassProperties(); body.inertia.scale(PC.inertiaScale, body.inertia);
    body.invInertia.set(1 / body.inertia.x, 1 / body.inertia.y, 1 / body.inertia.z); body.updateInertiaWorld(true);
    const q = new C.Quaternion(o.q[0], o.q[1], o.q[2], o.q[3]);
    // `centered` kinds (rolling tumbleweeds) are modeled around their middle, not their base.
    const up = q.vmult(new C.Vec3(0, d.centered ? 0 : d.h * M / 2, 0));
    body.position.set(o.p[0] * M + up.x, o.p[1] * M + up.y + 0.01, o.p[2] * M + up.z);
    body.quaternion.copy(q);
    if (o.mover && o.mover.vx != null) body.velocity.set(o.mover.vx * M, 0, o.mover.vz * M);
    P.world.addBody(body);
    o.body = body; o.state = 'active'; o.groundOn = true; o.inHoleT = 0; o.owner = null;
    if (o.mover) o.mover.halted = true;
    P.active.push(o);
  }
  // A grid of small feet under the base: they touch only the street, so the street holds up exactly the
  // part of the base that's on solid ground, right up to the lip (a box alone only touches at its corners).
  function addFeet(body, sh, cy) {
    let base = sh.parts[0]; for (const p of sh.parts) if (p.y0 < base.y0) base = p;
    const wx = base.x1 - base.x0, wz = base.z1 - base.z0, rad = 0.03;
    const nx = Math.max(2, Math.min(PC.feetGrid, Math.round(wx / 12) + 1)), nz = Math.max(2, Math.min(PC.feetGrid, Math.round(wz / 12) + 1));
    const D8 = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      // On a big base only the outer ring: what holds it up is the outline of its supported feet, and the
      // inner ones would only add work to every contact check. (Small bases keep the full grid.)
      if ((nx > 3 || nz > 3) && i > 0 && i < nx - 1 && k > 0 && k < nz - 1) continue;
      const x = base.x0 + wx * (0.04 + 0.92 * i / (nx - 1)), z = base.z0 + wz * (0.04 + 0.92 * k / (nz - 1));
      if (D8.some(([a, b], dI) => x * a + z * b > base.e[dI] - 0.5)) continue;   // outside the octagon
      const f = new C.Sphere(rad); f.collisionFilterGroup = S_FEET; f.collisionFilterMask = S_GROUND;
      body.addShape(f, new C.Vec3(x * M, (base.y0 - cy) * M + rad, z * M)); (body.hcFeet || (body.hcFeet = [])).push(f);
    }
  }
  function dropFeet(b) {
    for (const f of b.hcFeet) b.removeShape(f);
    b.hcFeet = null;
    b.inertia.scale(PC.inertiaScale, b.inertia);   // removeShape recomputed it from scratch
    b.invInertia.set(1 / b.inertia.x, 1 / b.inertia.y, 1 / b.inertia.z); b.updateInertiaWorld(true);
  }
  function deactivate(o, i) {
    P.world.removeBody(o.body); o.body = null; o.state = 'static';
    P.active[i] = P.active[P.active.length - 1]; P.active.pop();
  }

  const vTmp = new C.Vec3();
  function syncFromBody(o) {
    const b = o.body, d = o.def;
    const down = b.quaternion.vmult(vTmp.set(0, d.centered ? 0 : -d.h * M / 2, 0));
    o.p[0] = (b.position.x + down.x) / M; o.p[1] = (b.position.y + down.y) / M; o.p[2] = (b.position.z + down.z) / M;
    o.q[0] = b.quaternion.x; o.q[1] = b.quaternion.y; o.q[2] = b.quaternion.z; o.q[3] = b.quaternion.w;
    o.x = b.position.x / M; o.z = b.position.z / M;
  }
  // Horizontal reach of a body from its centre right now (world units) — a lying tower reaches far.
  const reachOf = (b) => Math.hypot(b.aabb.upperBound.x - b.aabb.lowerBound.x, b.aabb.upperBound.z - b.aabb.lowerBound.z) / 2 / M;

  // Wake objects that a hole could swallow; retire bodies nobody is near any more.
  const want = [];
  function manageBodies(holes) {
    const near = [];
    for (const h of holes) {
      if (!h.alive || !h.physical) continue;
      const reach = h.r * PC.holeSlack + PC.activationPad / M;
      near.length = 0; HC.World.query(h.x, h.z, reach + 1200, near);
      want.length = 0;
      for (const o of near) {
        if (o.state !== 'static' || o.def.scripted || !canFit(o, h)) continue;
        const d = Math.hypot(o.x - h.x, o.z - h.z);
        const fr = P.footNow(o).diag / 2, lim = o.mover && !o.mover.halted ? h.r + fr * 0.4 : reach + fr;
        if (d < lim) { o._wd = d - fr; want.push(o); }
      }
      // Nearest the opening first; small things leave `bigReserve` bodies free so a building the hole
      // reaches always gets real physics. What doesn't get a body waits (and, if it's tiny next to the
      // hole and ends up inside the opening, takes the quick swallow — see captureScan).
      if (want.length > 1) want.sort((a, b) => a._wd - b._wd);
      for (const o of want) {
        const cap = small(o, h) ? PC.maxBodies - PC.bigReserve : PC.maxBodies;
        if (P.active.length < cap) activate(o);
      }
    }
    for (let i = P.active.length - 1; i >= 0; i--) {
      const o = P.active[i];
      if (o.committed || o.smash || o.spat) continue;
      if (o.keepT > 0) { o.keepT -= 1 / 60; continue; }   // shoved by a crash: let it tumble and settle
      if (!o.groundOn) continue;
      let close = false;
      for (const h of holes) { if (h.alive && h.physical && Math.hypot(o.x - h.x, o.z - h.z) < h.r * 1.4 + reachOf(o.body) + 60 && canFit(o, h)) { close = true; break; } }
      if (!close && (o.body.sleepState === C.Body.SLEEPING || (o.body.velocity.lengthSquared() < 0.01 && o.body.angularVelocity.lengthSquared() < 0.01))) {
        syncFromBody(o); deactivate(o, i); HC.World.moved(o);
      }
    }
  }

  // The hole whose ground an object is standing on: the nearest one whose annulus reaches under it.
  function holeFor(o, holes) {
    let best = null, bd = Infinity;
    const ext = reachOf(o.body);
    // Something already partly down a shaft stays with it whatever angle it's at (tilted, its outline
    // on the street can look too big to fit).
    const down = o.body.aabb.lowerBound.y < -0.3;
    for (const h of holes) {
      if (!h.alive || !h.physical || (!down && !canFit(o, h))) continue;
      const d = Math.hypot(o.x - h.x, o.z - h.z) - h.r * PC.holeSlack;
      if (d < ext + 4 && d < bd) { bd = d; best = h; }
    }
    return best;
  }

  // ---- quick swallow: the overflow valve ----
  // Everything a visible hole eats normally gets real physics (it tips, tumbles and knocks into its
  // neighbours on the way down). Only when the body budget is used up does tiny clutter next to the
  // hole (a third of its radius across or less) that ends up inside the opening without a body take a
  // scripted drop instead, so a huge hole ploughing through downtown never stalls.
  const small = (o, h) => P.footNow(o).diag / 2 < h.r * PC.captureRatio && o.def.h < h.r * PC.captureHeight;
  function capture(o, h) {
    if (o.body) { P.world.removeBody(o.body); o.body = null; const i = P.active.indexOf(o); if (i >= 0) { P.active[i] = P.active[P.active.length - 1]; P.active.pop(); } }
    o.state = 'captured'; if (o.mover) o.mover.halted = true;
    const up = Math.max(0, o.p[1]);   // elevated things (coaster track) drop from where they are
    // It tips toward the hole's centre, and never so far that its top pokes out past the far rim:
    // the top travels h·sin(tilt) from the base, and the base ends up at 45% of its starting offset.
    const rx = o.x - h.x, rz = o.z - h.z, rd = Math.hypot(rx, rz), a = Math.random() * Math.PI * 2;
    const dirx = rd > 1 ? -rx / rd : Math.cos(a), dirz = rd > 1 ? -rz / rd : Math.sin(a);
    const room = 0.45 * rd + 0.85 * h.r * PC.holeSlack - P.footNow(o).min * 0.25;
    const maxTilt = Math.min(1.5, Math.asin(Math.max(0, Math.min(1, room / Math.max(1, o.def.h)))));
    // It falls under the same gravity as everything else: far enough to drop out of sight (its own height
    // and a bit), taking as long as a real fall of that distance takes.
    const fall = up + o.def.h * 1.25 + 25, dur = Math.max(0.25, Math.sqrt(2 * fall * M / (-PC.gravity * P.gScale)));
    o.cap = { h, t: 0, dur, rx, rz, y0: o.p[1], fall, q0: o.q.slice(), ax: dirx, az: dirz, spin: 1.2 + Math.random() * 1.6, maxTilt };
    P.captured.push(o);
  }
  function captureScan(holes, dt) {
    for (const h of holes) {
      if (!h.alive || !h.physical) continue;
      const list = HC.World.query(h.x, h.z, h.r);
      for (const o of list) {
        if (o.def.scripted) { if (scriptedEdible(o, h, Math.hypot(o.x - h.x, o.z - h.z))) capture(o, h); continue; }
        // Only while the physics budget is used up, and only for something that never got a body.
        if (o.state !== 'static' || !small(o, h) || !canFit(o, h) || P.active.length < PC.maxBodies - PC.bigReserve) { if (o.capHole === h) o.capT = 0; continue; }
        const d = Math.hypot(o.x - h.x, o.z - h.z);
        if (d < h.r * PC.holeSlack - P.footNow(o).diag / 2 * 0.55) {
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
      o.p[0] = o.x; o.p[2] = o.z; o.p[1] = c.y0 - e * c.fall;
      ax.set(c.az, 0, -c.ax); qa.setFromAxisAngle(ax, Math.min(c.maxTilt, f * c.spin * 1.6));
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

  const vImp = new C.Vec3();
  P.step = function (dt, holes) {
    updateRims(holes, dt);
    captureScan(holes, dt);
    updateCaptured(dt);
    manageBodies(holes);
    for (let i = P.active.length - 1; i >= 0; i--) {
      const o = P.active[i], b = o.body;
      o.x = b.position.x / M; o.z = b.position.z / M; b.hcNoGround = false;
      if (o.smash) { smashStep(o, b, dt); continue; }
      if (o.spat) spatStep(o, b, dt);
      // Once it's down the shaft it belongs to that hole until it's gone. (Something just spat out
      // belongs to nobody while it's in the air.)
      let h = o.spat ? null : o.committed && o.owner && o.owner.alive ? o.owner : holeFor(o, holes);
      if (o.committed && !h) h = o.owner;
      if (h && !o.committed) o.owner = h;
      // Near a hole it can't doze off: a building leaning ever so slowly over the edge must keep going.
      // Near a hole the street underfoot is loose and crumbly (lower friction), so the hole's pull slides
      // things toward the edge instead of tripping them over.
      if (h && o.groundOn) { o.groundOn = false; b.allowSleep = false; b.material = P.matObjNear; b.wakeUp(); }
      else if (!h && !o.groundOn) { o.groundOn = true; o.inHoleT = 0; o.owner = null; b.allowSleep = true; b.material = P.matObj; }
      // Away from every hole the street is solid all the way down: anything left partly below it (the
      // hole moved off) is pushed back up rather than staying buried.
      b.hcSurface = !h;
      // Standing on the street, away from any hole: it stays standing. (Some props carry their weight
      // off-centre, like a lamp post's arm, and would otherwise keel over the moment they got a body.)
      if (o.groundOn && !(o.keepT > 0)) b.angularVelocity.scale(0.5, b.angularVelocity);
      // Over a hole with nothing under it any more: it stops tipping and falls at whatever tilt it had
      // reached (its spin dies away; knocks against the walls can still turn it).
      if (h && !o.spat && b.hcGround !== P.world.stepnumber && b.hcGround !== P.world.stepnumber - 1) {
        const k = Math.exp(-PC.freeFallSpinDamp * dt); b.angularVelocity.x *= k; b.angularVelocity.z *= k;
      }
      if (h) {
        const rim = P.rims.get(h);
        if (b.position.y < 0 && b.aabb.upperBound.y < 0.5) o.committed = true;
        else if (o.committed && b.position.y > 0) o.committed = false;   // knocked back out: not committed any more
        // No pull, no carry, no funnel, no straightening, no riding along with the hole: what goes in goes
        // in because the street under it ran out (user's call, Nov 2026 — see docs/PLAYTEST.md).
        wedgeStep(o, b, h, rim, dt);
      }
      // Nothing on it can touch the street (all of it is down the shaft, or over the opening, or the street
      // has let go of it): leave the street out of its collision checks entirely. Otherwise every foot of
      // every falling thing makes a contact with the street plane each step, only to be thrown away.
      if (!o.spat) {
        const rim = h && P.rims.get(h);
        let off = false;
        if (rim) {
          const lo = b.aabb.lowerBound, up = b.aabb.upperBound, rr = h.r * PC.holeSlack * M;
          off = b.hcNoGround || up.y < -PC.groundSkin ||
            (Math.max((lo.x - rim.px) ** 2, (up.x - rim.px) ** 2) + Math.max((lo.z - rim.pz) ** 2, (up.z - rim.pz) ** 2) < rr * rr);
        }
        // Wholly above the street it can't touch the ground around a flask: skip those checks too.
        b.collisionFilterMask = (off ? MASK_OBJ & ~G_GROUND : MASK_OBJ) & (b.aabb.lowerBound.y > -0.03 ? ~G_WALL : ~0);
        // All the way down the shaft it will never stand on the street again: its feet only cost time
        // (every shape pair is checked against every neighbour's).
        if (b.hcFeet && b.aabb.upperBound.y < -PC.groundSkin) dropFeet(b);
      }
      // Eaten once it has dropped far enough down the shaft to be lost in the dark: deeper for a bigger
      // hole (you can see further into it), so things visibly tumble and knock together on the way down.
      // (Something taller than the hole is wide goes as soon as it's under: it can only scrape down the
      // shaft, and making it scrape further would just get it stuck and spat out.)
      const own = h || o.owner, sink = own && o.def.h < own.r * 2 ? Math.min(PC.sinkMax, Math.max(0.4, own.r * M * PC.sinkDepth)) : 0.4;
      // Wholly under the street and partly out under the pavement (slid into the flare): it's in the
      // ground now, so it's eaten (it could otherwise be left buried when the hole moves on).
      let buried = false;
      if (b.aabb.upperBound.y < 0 && own) {
        const lo = b.aabb.lowerBound, up = b.aabb.upperBound, rr = own.r * PC.holeSlack * M, cx = own.x * M, cz = own.z * M;
        buried = Math.max((lo.x - cx) ** 2, (up.x - cx) ** 2) + Math.max((lo.z - cz) ** 2, (up.z - cz) ** 2) > rr * rr;
      }
      // Also gone as soon as it's wholly under the street if it's resting on something (a pile on a
      // jammed tower) or the body budget is getting tight.
      const under = buried || (b.aabb.upperBound.y < -0.4 && (o.slow || P.active.length > PC.deepBudget));
      if (b.aabb.upperBound.y < -sink || under || b.position.y < -80) {
        const owner = o.owner && o.owner.alive ? o.owner : (h || o.owner);
        P.world.removeBody(b); o.body = null; P.active[i] = P.active[P.active.length - 1]; P.active.pop();
        HC.World.markGone(o); HC.Render && HC.Render.hideObject && HC.Render.hideObject(o);
        if (P.onConsume) P.onConsume(o, owner);
        continue;
      }
    }
    P.world.step(dt);
    for (const o of P.active) {
      // Never explode: deep contacts can't fling anything faster than a hole moves or spin it wildly.
      const b = o.body;
      if (!o.smash && !o.spat) {
        const v = b.velocity, sp = v.length(); if (sp > PC.maxSpeed) v.scale(PC.maxSpeed / sp, v);
        if (v.y > PC.maxRise) v.y = PC.maxRise;
        const w = b.angularVelocity, ws = w.length(); if (ws > PC.maxSpin) w.scale(PC.maxSpin / ws, w);
      }
      syncFromBody(o); if (HC.Render && HC.Render.kinds) HC.Render.setObject(o);
    }
  };
  // Wedged in the shaft (milestone 3 fills this in).
  // Slender: thin (trees, lamp posts, poles, rowhouses) or tall and narrow (big trees, drop towers, pillars).
  const slenderKind = (d) => { const m = P.shape(d).min; return m < PC.slenderWidth || (m < 160 && d.h > 2.2 * m); };

  // ---- wedged in the shaft ----
  // Wedged = partly down the shaft and barely sinking (its top dropped less than 2.5 m in the last
  // second: stuck, or scraping down at a crawl). Wiggling the hole rattles it: every change in the hole's speed jolts whatever is stuck,
  // like shaking a jar. (No automatic shake: user's call.) After `wedgeSpit` seconds it
  // gives up and spits the thing out, up and away in a random direction. It lands back on the street
  // and can be eaten again (no points until it actually goes in).
  const vJ = new C.Vec3(), vRel = new C.Vec3();
  function wedgeStep(o, b, h, rim, dt) {
    o.inHoleT += dt;
    const low = b.aabb.lowerBound.y, top = b.aabb.upperBound.y;
    if (low > -0.3 || !rim) { o.wedgeT = 0; o.wTop = top; o.wClock = 0; o.slow = false; return; }
    if (o.wTop == null) o.wTop = top;
    o.wClock = (o.wClock || 0) + dt;
    // Judged once a second: only a full second of barely sinking counts as stuck.
    if (o.wClock >= 1) { const fell = o.wTop - top; o.wClock = 0; o.wTop = top; o.slow = fell <= 2.5; if (o.slow && !o.wedgeT) o.wedgeT = 1; }
    if (!o.slow) { o.wedgeT = 0; o.shakeT = 0; return; }
    o.wedgeT += dt;
    const m = b.mass;

    // The player wiggling (quick back-and-forths, not ordinary steering): each change of the hole's
    // speed becomes a jolt (walls push the other way from how the hole moved, plus a little hop and twist).
    const dv = Math.hypot(rim.dvx, rim.dvz);
    if (o.wedgeT > 0.25 && rim.wiggling && dv > 0.3) {
      const k = Math.min(1, dv / 5);
      b.applyImpulse(vJ.set(-rim.dvx * m * 0.06, m * 0.9 * k, -rim.dvz * m * 0.06));
      b.angularVelocity.x += (Math.random() - 0.5) * 0.6 * k; b.angularVelocity.z += (Math.random() - 0.5) * 0.6 * k;
      b.wakeUp();
    }
    if (o.wedgeT >= PC.wedgeSpit) spit(o, b, h, rim);
  }
  function spit(o, b, h, rim) {
    o.spat = true; o.spatT = 0; o.committed = false; o.owner = null; o.wedgeT = 0; o.shook = false; o.wTop = null;
    b.collisionFilterMask = G_GROUND | G_OBJ | G_SMASH;     // no walls: nothing snags it on the way out
    const g = -PC.gravity * P.gScale;
    // Enough upward speed to lift its lowest point clear of the street, and enough sideways speed to
    // land beyond the hole's edge.
    const rise = Math.max(0, -b.aabb.lowerBound.y) + 2.5, vy = Math.sqrt(2 * g * rise), T = vy / g + Math.sqrt(2 * 2.5 / g);
    const a = Math.random() * Math.PI * 2, ux = Math.cos(a), uz = Math.sin(a);
    const along = (b.position.x - rim.px) * ux + (b.position.z - rim.pz) * uz;   // already this far out that way
    const need = Math.max(2, (h.r * PC.holeSlack + reachOf(b)) * M * 1.25 - along), hs = Math.min(PC.maxSpeed, need / T);
    b.velocity.set(ux * hs + rim.vx, vy, uz * hs + rim.vz);
    b.angularVelocity.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3);
    b.allowSleep = false; b.wakeUp();
    if (P.onSpit) P.onSpit(o, h);
  }
  function spatStep(o, b, dt) {
    o.spatT += dt;
    const settled = o.spatT > 0.8 && b.velocity.length() < 1.5 && b.aabb.lowerBound.y > -0.15;
    if (settled || o.spatT > 6) { o.spat = false; b.collisionFilterMask = MASK_OBJ; b.allowSleep = true; }
  }

  // Off-screen holes skip physics. To stay fair with on-screen physics, an object must sit inside
  // the opening for about as long as it would take to tip and fall before it counts as eaten.
  P.consumeInstant = function (h, dt) {
    const list = HC.World.query(h.x, h.z, h.r + 40);
    for (const o of list) {
      if (o.def.scripted) { if (scriptedEdible(o, h, Math.hypot(o.x - h.x, o.z - h.z))) { HC.World.markGone(o); HC.Render && HC.Render.hideObject && HC.Render.hideObject(o); if (P.onConsume) P.onConsume(o, h); } continue; }
      if (o.state !== 'static' || !P.likelyFitsNow(o, h.r)) continue;
      const d = Math.hypot(o.x - h.x, o.z - h.z), sh = P.footNow(o);
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

  // ---- crashed coaster cars ----
  // Throw an object into the scene as a tumbling body (velocity in world units/s, spin in rad/s).
  P.launch = function (o, vel, spin) {
    o.state = 'static'; activate(o);
    const b = o.body; b.collisionFilterGroup = G_SMASH; b.collisionFilterMask = MASK_SMASH;
    b.velocity.set(vel[0] * M, vel[1] * M, vel[2] * M); b.angularVelocity.set(spin[0], spin[1], spin[2]);
    b.linearDamping = 0.02; b.allowSleep = false; o.smash = true; o.settleT = 0; b.wakeUp();
  };
  const near = [];
  function smashStep(o, b, dt) {
    const sp = b.velocity.length();
    // Wake whatever it's about to plough into so it gets shoved around (and stays awake a while).
    if (sp > 1.2) {
      near.length = 0; HC.World.query(o.x, o.z, P.shape(o.def).diag / 2 + 90 + sp * 4, near);
      for (const n of near) {
        if (n === o || n.state !== 'static' || n.def.scripted || P.active.length >= PC.maxBodies) continue;
        activate(n); n.keepT = 3; n.groundOn = true;
      }
    }
    if (sp < 0.5 && b.angularVelocity.length() < 0.6 && b.position.y < 4) o.settleT += dt; else o.settleT = 0;
    if (o.settleT > 0.8 || b.position.y < -40) {
      // Settled: from now on it's an ordinary object a hole can swallow.
      o.smash = false; o.groundOn = true; o.inHoleT = 0; b.allowSleep = true;
      b.collisionFilterGroup = G_OBJ; b.collisionFilterMask = MASK_OBJ;
    }
  }

  HC.Physics = P;
})();
