// Scripted city life: pedestrians stroll sidewalk loops (some walking dogs), ducks paddle,
// and traffic drives right-hand lanes, choosing turns at every intersection.
// A mover stops being scripted the moment physics takes it (it's about to be swallowed).
(function () {
  const M = { walkers: [], drivers: [] };
  const LANE = 50;

  function prepLoop(loop) {
    if (loop.len) return;
    loop.seg = []; let total = 0;
    for (let i = 0; i < loop.pts.length; i++) {
      const a = loop.pts[i], b = loop.pts[(i + 1) % loop.pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      loop.seg.push({ a, b, l, start: total }); total += l;
    }
    loop.len = total;
  }
  function loopPoint(loop, t, lane, out) {
    let s = ((t % 1) + 1) % 1 * loop.len;
    for (const sg of loop.seg) {
      if (s <= sg.start + sg.l) {
        const f = (s - sg.start) / sg.l, dx = (sg.b[0] - sg.a[0]) / sg.l, dz = (sg.b[1] - sg.a[1]) / sg.l;
        out.x = sg.a[0] + dx * sg.l * f - dz * lane; out.z = sg.a[1] + dz * sg.l * f + dx * lane; out.dx = dx; out.dz = dz; return out;
      }
    }
    const sg = loop.seg[0]; out.x = sg.a[0]; out.z = sg.a[1]; out.dx = 1; out.dz = 0; return out;
  }

  M.init = function (W) {
    M.W = W; M.walkers = []; M.drivers = []; M.R = W.city.roads;
    const tmp = {};
    for (const o of W.objects) {
      const m = o.mover; if (!m) continue;
      if (m.type === 'walk' && m.loop) { prepLoop(m.loop); loopPoint(m.loop, m.t, m.lane, tmp); o.x = tmp.x; o.z = tmp.z; M.walkers.push(o); place(o, tmp.dx * m.dir, tmp.dz * m.dir, 0); }
      else if (m.type === 'drive' && M.R) { driverPos(o); M.drivers.push(o); }
      else if (m.type === 'roam') { m.tx = o.x; m.tz = o.z; m.wait = Math.random() * 2; M.walkers.push(o); }
    }
  };

  function place(o, fx, fz, bob) {
    const yaw = Math.atan2(-fz, fx);
    o.rot = yaw; o.p[0] = o.x; o.p[1] = bob; o.p[2] = o.z;
    o.q[0] = 0; o.q[1] = Math.sin(yaw / 2); o.q[2] = 0; o.q[3] = Math.cos(yaw / 2);
  }

  function driverPos(o) {
    const m = o.mover, R = M.R;
    const ln = m.lane || LANE;
    if (m.axis === 'x') { o.x = m.along; o.z = R[m.road] + m.dir * ln; place(o, m.dir, 0, 0); m.vx = m.dir * m.speed; m.vz = 0; }
    else { o.z = m.along; o.x = R[m.road] - m.dir * ln; place(o, 0, m.dir, 0); m.vx = 0; m.vz = m.dir * m.speed; }
  }

  // Pick what to do at the next intersection: straight, left or right (never U-turn, never off-map).
  function plan(o) {
    const m = o.mover, R = M.R;
    let k = -1;
    for (let i = 0; i < R.length; i++) { const ahead = (R[i] - m.along) * m.dir; if (ahead > 40 && (k < 0 || ahead < (R[k] - m.along) * m.dir)) k = i; }
    if (k < 0) { m.next = null; return; }
    const options = [];
    const canStraight = k > 0 && k < R.length - 1;
    if (canStraight) options.push('s', 's');
    for (const nd of [1, -1]) { const valid = nd > 0 ? m.road < R.length - 1 : m.road > 0; if (valid) options.push(nd); }
    const ch = options[Math.floor(Math.random() * options.length)];
    if (ch === 's' || ch == null) { m.next = { k, straight: true }; return; }
    const ln = m.lane || LANE, nd = ch, lane = m.axis === 'x' ? R[k] - nd * ln : R[k] + nd * ln;
    // New road runs along the other axis; turn when we reach its lane line.
    m.next = { k, newDir: nd, turnAt: lane };
  }

  M.update = function (dt) {
    const tmp = {}, W = M.W;
    for (const o of M.walkers) {
      const m = o.mover;
      if (o.state !== 'static' || m.halted) continue;
      if (m.type === 'roam') {
        // Amble to a random point in the home circle, pause, repeat.
        const dx = m.tx - o.x, dz = m.tz - o.z, d = Math.hypot(dx, dz);
        if (d < 4) { m.wait -= dt; m.vx = m.vz = 0; if (m.wait <= 0) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * m.r; m.tx = m.cx + Math.cos(a) * r; m.tz = m.cz + Math.sin(a) * r; m.wait = 0.3 + Math.random() * 2.5; } }
        else { const st = Math.min(d, m.speed * dt); o.x += dx / d * st; o.z += dz / d * st; m.vx = dx / d * m.speed; m.vz = dz / d * m.speed; m.fx = dx / d; m.fz = dz / d; m.ph = (m.ph || 0) + dt * m.speed * 0.25; }
        place(o, m.fx ?? 1, m.fz ?? 0, m.bob && d >= 4 ? Math.abs(Math.sin(m.ph)) * 2 * (m.amt || 0) : 0);
        // Legs ease into the stride when it sets off and settle back to standing when it stops.
        m.amt = HC.U.damp(m.amt || 0, d >= 4 ? 1 : 0, 8, dt);
        if (m.spin) { // tumbleweeds roll forward: yaw × roll-about-local-z
          m.roll = (m.roll || 0) + dt * m.speed * 0.06;
          const hy = Math.atan2(-(m.fz ?? 0), m.fx ?? 1) / 2, ay = Math.sin(hy), aw = Math.cos(hy), bz = -Math.sin(m.roll / 2), bw = Math.cos(m.roll / 2);
          o.q[0] = ay * bz; o.q[1] = ay * bw; o.q[2] = aw * bz; o.q[3] = aw * bw; o.p[1] = HC.CATALOG[o.kind].h / 2; // spin kinds are modeled centered on their origin
        }
      }
      else {
        m.t += m.dir * m.speed * dt / m.loop.len;
        loopPoint(m.loop, m.t, m.lane, tmp); m.vx = tmp.dx * m.dir * m.speed; m.vz = tmp.dz * m.dir * m.speed;
        o.x = tmp.x; o.z = tmp.z; m.ph = (m.ph || 0) + dt * m.speed * 0.25; m.amt = 1;
        place(o, tmp.dx * m.dir, tmp.dz * m.dir, m.bob === false ? 0 : Math.abs(Math.sin(m.ph)) * 2.2);
      }
      W.moved(o); HC.Render && HC.Render.kinds && (HC.Render.setObject(o), HC.Render.setWalk(o, m.ph || 0, m.amt || 0));
    }
    const R = M.R;
    for (const o of M.drivers) {
      const m = o.mover;
      if (o.state !== 'static' || m.halted) continue;
      if (!m.next) plan(o);
      // Brake for the car ahead in the same lane.
      let target = m.speed;
      for (const p of M.drivers) {
        if (p === o || p.state !== 'static') continue;
        const pm = p.mover; if (pm.axis !== m.axis || pm.road !== m.road || pm.dir !== m.dir) continue;
        const gap = (pm.along - m.along) * m.dir;
        const need = (o.def.w + p.def.w) / 2 + 30;
        if (gap > 0 && gap < need + 60) target = Math.min(target, Math.max(0, (gap - need) * 2));
      }
      m.cur = HC.U.damp(m.cur ?? m.speed, target, 4, dt);
      const step = m.cur * dt * m.dir;
      const nx = m.next;
      if (nx && !nx.straight && (m.along + step - nx.turnAt) * m.dir >= 0) {
        // Turn onto the crossing road.
        const fixed = m.axis === 'x' ? o.z : o.x;
        m.axis = m.axis === 'x' ? 'z' : 'x'; m.road = nx.k; m.dir = nx.newDir; m.along = fixed; m.next = null;
      } else {
        m.along += step;
        if (nx && nx.straight && (m.along - R[nx.k]) * m.dir > 0) m.next = null;
        if (m.along < R[0] - 120 || m.along > R[R.length - 1] + 120) { m.dir *= -1; m.next = null; }
      }
      driverPos(o); m.vx *= m.cur / m.speed; m.vz *= m.cur / m.speed;
      W.moved(o); HC.Render && HC.Render.kinds && HC.Render.setObject(o);
    }
  };

  HC.Movers = M;
})();
