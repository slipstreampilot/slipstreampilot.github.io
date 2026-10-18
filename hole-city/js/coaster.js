// The Funland roller coaster: a closed 3D track (lift hill, big drop, a vertical loop, airtime hills)
// built from edible track pieces, plus a train that rides it with simple energy physics.
//
// - Track pieces are ordinary world objects of kind 'coaster_rail' (2 points each). A hole eats a
//   piece when the piece's support stands inside the hole (see Physics: `scripted` kinds).
// - The train starts slow out of the station, is chain-lifted up the lift hill, then gravity takes
//   over: it speeds up downhill, slows uphill, and loses a little to drag.
// - If the train reaches a missing piece fast, it flies off the end and crashes: the cars become
//   physics bodies that shove whatever they hit (nothing is destroyed). If it's slow, the safety
//   brakes stop it at the gap.
(function () {
  const T3 = () => THREE;
  const C = {
    SEG: 36,          // track piece length (world units)
    CAR_GAP: 50,      // car spacing along the track
    CARS: 4,
    G: 312,           // gravity along the track (units/s², a bit gentler than objects so it reads well)
    DRAG: 0.00009,    // quadratic air drag
    ROLL: 6,          // rolling resistance (units/s²)
    LIFT_V: 120,      // chain lift speed
    STATION_V: 55,    // speed out of the station
    DWELL: 2.2,       // seconds parked at the station
    CRASH_V: 170,     // faster than this at a missing piece = flies off
    RAIL_Y: 7,        // car base above the track centreline
  };
  const K = { C };

  // ---------------- generation (called from the level's generate()) ----------------
  // pts: control points [x, z, y]; marks: { lift: [i0, i1], station: [i0, i1] } by control index.
  K.layout = function (T, pts, marks) {
    const THREE = T3();
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z, y]) => new THREE.Vector3(x, y, z)), true, 'centripetal');
    const L = curve.getLength(), N = Math.round(L / C.SEG), seg = L / N;
    // Samples at every piece boundary, with a twist-free "up" carried along the track (so the
    // vertical loop turns the riders upside down and brings them back upright).
    const P = [], Tn = [], U = [];
    for (let i = 0; i <= N; i++) { const u = i / N; P.push(curve.getPointAt(u % 1)); Tn.push(curve.getTangentAt(u % 1).normalize()); }
    let up = new THREE.Vector3(0, 1, 0); up.addScaledVector(Tn[0], -up.dot(Tn[0])).normalize(); U.push(up.clone());
    for (let i = 1; i <= N; i++) { up = up.clone().addScaledVector(Tn[i], -up.dot(Tn[i])).normalize(); U.push(up); }
    // Close the loop: spread any leftover twist evenly.
    const tw = Math.atan2(new THREE.Vector3().crossVectors(U[0], U[N]).dot(Tn[0]), U[0].dot(U[N]));
    for (let i = 0; i <= N; i++) U[i].applyAxisAngle(Tn[i], -tw * i / N);
    // Which control point each sample is nearest (for lift/station zones).
    const ctrlS = pts.map(([x, z, y]) => { let best = 0, bd = Infinity; for (let i = 0; i < N; i++) { const d = P[i].distanceToSquared(new THREE.Vector3(x, y, z)); if (d < bd) { bd = d; best = i; } } return best; });
    const zone = (a, b) => [ctrlS[a] * seg, ctrlS[b] * seg];
    const data = { N, seg, L, lift: zone(...marks.lift), station: zone(...marks.station), stop: ctrlS[marks.stop] * seg, samples: [], posts: [] };
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const c = curve.getPointAt((i + 0.5) / N), t = curve.getTangentAt((i + 0.5) / N).normalize();
      Y.copy(U[i]).add(U[i + 1]).addScaledVector(t, -Y.dot(t)).normalize(); X.copy(t); Z.crossVectors(X, Y).normalize();
      m.makeBasis(X, Y, Z); q.setFromRotationMatrix(m);
      T.put('coaster_rail', c.x, c.z, 0, { y: c.y, q: [q.x, q.y, q.z, q.w], piece: i, occupy: false });
      data.samples.push([c.x, c.z, c.y]);
      // Supports under every other upright piece.
      if (i % 2 === 0 && Y.y > 0.55 && c.y > 18) data.posts.push({ piece: i, x: c.x, z: c.z, h: c.y - 4 });
    }
    data.P = P.map((v) => [v.x, v.y, v.z]); data.T = Tn.map((v) => [v.x, v.y, v.z]); data.U = U.map((v) => [v.x, v.y, v.z]);
    // The train waits in the station.
    for (let k = 0; k < C.CARS; k++) T.put('coaster_car', 0, 0, 0, { car: k, occupy: false, state: 'riding' });
    T.city.coaster = data;
    return data;
  };

  // ---------------- runtime ----------------
  K.init = function (W) {
    K.data = W.city.coaster || null; K.pieces = []; K.cars = []; K.train = null;
    if (!K.data) return;
    for (const o of W.objects) { if (o.kind === 'coaster_rail') K.pieces[o.piece] = o; if (o.kind === 'coaster_car') K.cars[o.car] = o; }
    K.train = { s: K.data.stop, v: 0, wait: C.DWELL, mode: 'run', crashed: false };
    K.place();
  };

  const tmp = { p: [0, 0, 0], t: [0, 0, 0], u: [0, 0, 0] };
  function frameAt(s) {
    const D = K.data, f = ((s % D.L) + D.L) % D.L / D.seg, i = Math.floor(f) % D.N, a = f - Math.floor(f), j = i + 1;
    for (let k = 0; k < 3; k++) { tmp.p[k] = D.P[i][k] + (D.P[j][k] - D.P[i][k]) * a; tmp.t[k] = D.T[i][k] + (D.T[j][k] - D.T[i][k]) * a; tmp.u[k] = D.U[i][k] + (D.U[j][k] - D.U[i][k]) * a; }
    return i;
  }
  const pieceAt = (s) => { const D = K.data; return Math.floor((((s % D.L) + D.L) % D.L) / D.seg) % D.N; };
  const missing = (i) => { const o = K.pieces[i]; return !o || o.state !== 'static'; };

  const m4 = () => (K._m || (K._m = { m: new (T3().Matrix4)(), q: new (T3().Quaternion)(), X: new (T3().Vector3)(), Y: new (T3().Vector3)(), Z: new (T3().Vector3)() }));
  // Put the cars on the track at their places behind the train's front.
  K.place = function () {
    const tr = K.train, M = m4();
    for (let k = 0; k < K.cars.length; k++) {
      const o = K.cars[k]; if (!o || o.state !== 'riding') continue;
      frameAt(tr.s - k * C.CAR_GAP);
      M.X.set(tmp.t[0], tmp.t[1], tmp.t[2]).normalize(); M.Y.set(tmp.u[0], tmp.u[1], tmp.u[2]); M.Y.addScaledVector(M.X, -M.Y.dot(M.X)).normalize(); M.Z.crossVectors(M.X, M.Y);
      M.m.makeBasis(M.X, M.Y, M.Z); M.q.setFromRotationMatrix(M.m);
      o.p[0] = tmp.p[0] + M.Y.x * C.RAIL_Y; o.p[1] = tmp.p[1] + M.Y.y * C.RAIL_Y; o.p[2] = tmp.p[2] + M.Y.z * C.RAIL_Y;
      o.q[0] = M.q.x; o.q[1] = M.q.y; o.q[2] = M.q.z; o.q[3] = M.q.w;
      o.x = o.p[0]; o.z = o.p[2]; o.vel = [M.X.x * tr.v, M.X.y * tr.v, M.X.z * tr.v];
      HC.World.moved(o); HC.Render && HC.Render.kinds && HC.Render.setObject(o);
    }
  };

  const inZone = (s, z) => { const D = K.data, x = ((s % D.L) + D.L) % D.L; return z[0] <= z[1] ? x >= z[0] && x <= z[1] : x >= z[0] || x <= z[1]; };

  K.update = function (dt) {
    if (!K.data || !K.train || K.train.crashed) { K.updatePosts(); return; }
    const tr = K.train, D = K.data;
    // Station: brake to a stop at the platform, wait, then roll out slowly.
    if (tr.wait > 0) { tr.wait -= dt; tr.v = 0; if (tr.wait <= 0) tr.v = C.STATION_V; }
    else {
      let slope = 0; for (let k = 0; k < C.CARS; k++) { frameAt(tr.s - k * C.CAR_GAP); slope += tmp.t[1]; } slope /= C.CARS;
      tr.v += (-C.G * slope - C.DRAG * tr.v * Math.abs(tr.v) - Math.sign(tr.v) * C.ROLL) * dt;
      if (inZone(tr.s, D.lift) && tr.v < C.LIFT_V) tr.v = C.LIFT_V;                 // chain lift
      if (inZone(tr.s, [D.stop, D.lift[0]]) && tr.v < C.STATION_V) tr.v = C.STATION_V; // tyre drive out to the lift
      if (inZone(tr.s, [D.station[0], D.stop])) {
        tr.v = Math.max(C.STATION_V * 0.9, tr.v - 520 * dt);                         // station brakes
        const before = ((D.stop - tr.s) % D.L + D.L) % D.L;
        if (before < tr.v * dt + 1 && tr.mode !== 'stranded') { tr.s = D.stop; tr.wait = C.DWELL; tr.v = 0; }
      }
    }
    // Track check: any car over a missing piece falls off; a gap just ahead is a crash if fast.
    const dir = tr.v >= 0 ? 1 : -1, ahead = Math.abs(tr.v) * 0.12 + 18;
    const front = dir > 0 ? tr.s : tr.s - (C.CARS - 1) * C.CAR_GAP;
    let under = false; for (let k = 0; k < C.CARS; k++) if (missing(pieceAt(tr.s - k * C.CAR_GAP))) under = true;
    const gapAhead = missing(pieceAt(front + dir * ahead));
    if (under || (gapAhead && Math.abs(tr.v) > C.CRASH_V)) { K.place(); K.crash(); return; }
    if (gapAhead) { tr.v = 0; tr.mode = 'stranded'; }                               // safety brakes
    else if (tr.mode === 'stranded') tr.mode = 'run';
    if (tr.mode === 'stranded') tr.v = 0;
    tr.s = ((tr.s + tr.v * dt) % D.L + D.L) % D.L;
    K.place(); K.updatePosts();
  };

  // Off the rails: every car becomes a tumbling physics body with the train's velocity.
  K.crash = function () {
    const tr = K.train; tr.crashed = true;
    for (const o of K.cars) if (o && o.state === 'riding') {
      const v = o.vel || [0, 0, 0];
      HC.Physics.launch(o, [v[0], v[1] + 40, v[2]], [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 6]);
    }
    if (HC.Game && HC.Game.onEvent) HC.Game.onEvent('coasterCrash', { x: K.cars[0] && K.cars[0].x, z: K.cars[0] && K.cars[0].z, v: Math.abs(tr.v) });
  };

  // ---------------- supports (visual only; they vanish with their piece) ----------------
  K.buildVisual = function (group) {
    K.postMesh = null; if (!K.data || !K.data.posts.length) return;
    const THREE = T3(), g = new HC.Geo();
    g.cyl(0, 0, 0, 4.5, 5.5, 1, 8, '#FFFFFF', { tint: true }); g.cyl(0, 0, 0, 10, 12, 0.02, 8, '#E9E4F2');
    const geo = g.toGeometry(), n = K.data.posts.length;
    const mesh = new THREE.InstancedMesh(geo, HC.Render.objMat, n); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const m = new THREE.Matrix4(), col = new THREE.Color('#FF5FA2');
    K.data.posts.forEach((p, i) => { m.makeScale(1, p.h, 1).setPosition(p.x, 0, p.z); mesh.setMatrixAt(i, m); mesh.instanceColor.setXYZ(i, col.r, col.g, col.b); p.shown = true; });
    group.add(mesh); K.postMesh = mesh;
  };
  K.updatePosts = function () {
    const mesh = K.postMesh; if (!mesh || !K.data) return;
    let dirty = false;
    for (let i = 0; i < K.data.posts.length; i++) {
      const p = K.data.posts[i]; if (!p.shown || !missing(p.piece)) continue;
      p.shown = false; dirty = true; K._z = K._z || new (T3().Matrix4)().makeScale(0, 0, 0); mesh.setMatrixAt(i, K._z);
    }
    if (dirty) mesh.instanceMatrix.needsUpdate = true;
  };

  HC.Coaster = K;
})();
