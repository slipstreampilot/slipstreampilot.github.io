// Level-building toolkit shared by every level in js/levels/.
// A level's generate(seed) gets `T = HC.Gen.create(seed, level)` and calls these helpers to lay out
// ground decals, place objects, add walking/driving/roaming life and spawn points. Output is pure data.
(function () {
  const S = HC.CONFIG.world.size;

  function create(seed, level) {
    const rng = HC.U.rng(seed);
    const city = { size: S, seed, level: level && level.id, roads: null, roadWidth: 200, ground: [], objects: [], walkLoops: [], spawnCandidates: [], land: { min: -260, max: S + 260 } };
    const G = city.ground, O = city.objects;
    const T = { rng, city, S };
    // Occupancy grid so scattered things don't overlap each other or hand-placed ones.
    const occ = new HC.U.Grid(S + 1200, 100), OFF = 600;

    T.rect = (x0, z0, x1, z1, y, color) => G.push({ shape: 'rect', x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: Math.abs(x1 - x0), d: Math.abs(z1 - z0), y, color });
    T.disc = (x, z, r, y, color, seg = 32, sx = 1, sz = 1) => G.push({ shape: 'disc', x, z, r, y, color, seg, sx, sz });
    T.ring = (x, z, r0, r1, y, color, seg = 40) => G.push({ shape: 'ring', x, z, r0, r1, y, color, seg });
    // A straight strip of given width between two points (rivers, paths, rails).
    T.strip = (x0, z0, x1, z1, w, y, color) => G.push({ shape: 'strip', x0, z0, x1, z1, w, y, color });
    T.path = (pts, w, y, color, closed = false) => { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; T.strip(a[0], a[1], b[0], b[1], w, y, color); T.disc(a[0], a[1], w / 2, y, color, 16); } };

    T.occupy = (x, z, r) => occ.insert({ x: x + OFF, y: z + OFF, r });
    T.free = (x, z, r) => { for (const e of occ.query(x + OFF, z + OFF, r + 120)) if (Math.hypot(e.x - OFF - x, e.y - OFF - z) < e.r + r) return false; return true; };

    T.put = (kind, x, z, rot = 0, extra = {}) => {
      const k = HC.CATALOG[kind]; if (!k) { console.warn('Unknown kind', kind); return null; }
      const o = Object.assign({ kind, x, z, rot, tint: k.tints ? rng.int(0, k.tints.length - 1) : 0 }, extra);
      O.push(o); if (!extra.mover && extra.occupy !== false) T.occupy(x, z, k.radius * 0.8);
      return o;
    };
    // Place `kind` repeatedly along a line, e.g. fences, crop rows, bollards. Rotation follows the line.
    T.line = (kind, x0, z0, x1, z1, spacing, o = {}) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.floor(len / spacing)), rot = Math.atan2(-(z1 - z0), x1 - x0) + (o.rot || 0);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n; if (o.gapAt != null && Math.abs(t * len - o.gapAt) < (o.gapW || 70) / 2) continue;
        if (o.chance != null && !rng.chance(o.chance)) continue;
        T.put(typeof kind === 'function' ? kind() : kind, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, rot);
      }
    };
    // Pick from {kind: weight}.
    T.pick = (weights) => { if (typeof weights === 'string') return weights; let tot = 0; for (const k in weights) tot += weights[k]; let r = rng() * tot; for (const k in weights) { r -= weights[k]; if (r <= 0) return k; } return Object.keys(weights)[0]; };
    // Scatter n things inside a rect {x0,z0,x1,z1} or circle {x,z,r}, keeping a gap from everything placed.
    T.scatter = (weights, area, n, o = {}) => {
      let placed = 0;
      for (let tries = 0; tries < n * 12 && placed < n; tries++) {
        let x, z;
        if (area.r != null) { const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * area.r; x = area.x + Math.cos(a) * d; z = area.z + Math.sin(a) * d; if (area.r0 && d < area.r0) continue; }
        else { x = HC.U.lerp(area.x0, area.x1, rng()); z = HC.U.lerp(area.z0, area.z1, rng()); }
        const kind = T.pick(weights), k = HC.CATALOG[kind];
        if (o.avoid && o.avoid(x, z)) continue;
        if (!T.free(x, z, k.radius * 0.7 + (o.gap || 6))) continue;
        T.put(kind, x, z, o.rot != null ? o.rot : rng() * Math.PI * 2); placed++;
      }
      return placed;
    };

    // ---- land ----
    T.island = (o = {}) => {
      const L = city.land;
      T.rect(L.min - 18, L.min - 18, L.max + 18, L.max + 18, -1.2, o.edge || '#F5CF85');
      T.rect(L.min, L.min, L.max, L.max, -0.6, o.ground || '#FFE3A1');
    };
    T.stripes = (x0, z0, x1, z1, y, a, b, n = 9, alongX = true) => {
      for (let i = 0; i < n; i++) {
        if (alongX) T.rect(x0 + i * (x1 - x0) / n, z0, x0 + (i + 1) * (x1 - x0) / n, z1, y, i % 2 ? a : b);
        else T.rect(x0, z0 + i * (z1 - z0) / n, x1, z0 + (i + 1) * (z1 - z0) / n, y, i % 2 ? a : b);
      }
    };

    // ---- road grid (also enables grid traffic) ----
    T.roadGrid = (R, o = {}) => {
      const RW = o.width || 200; city.roads = R; city.roadWidth = RW;
      const c = Object.assign({ road: '#5E6787', line: '#FFD23F', dash: '#FFFFFF', zebra: '#FFFFFF' }, o.colors || {});
      const lo = R[0] - RW / 2, hi = R[R.length - 1] + RW / 2;
      for (const r of R) { T.rect(r - RW / 2, lo, r + RW / 2, hi, 0.8, c.road); T.rect(lo, r - RW / 2, hi, r + RW / 2, 0.8, c.road); }
      if (o.markings !== false) for (let i = 0; i < R.length; i++) for (let j = 0; j < R.length - 1; j++) {
        const a = R[j] + RW / 2 + 70, b = R[j + 1] - RW / 2 - 70, cc = R[i]; if (b <= a) continue;
        if (c.line) { T.rect(cc - 4, a, cc - 1, b, 1.4, c.line); T.rect(cc + 1, a, cc + 4, b, 1.4, c.line); T.rect(a, cc - 4, b, cc - 1, 1.4, c.line); T.rect(a, cc + 1, b, cc + 4, 1.4, c.line); }
        if (c.dash && RW >= 160) for (let t = a + 20; t < b - 30; t += 90) for (const off of [-RW * 0.26, RW * 0.26]) { T.rect(cc + off - 2, t, cc + off + 2, t + 40, 1.4, c.dash); T.rect(t, cc + off - 2, t + 40, cc + off + 2, 1.4, c.dash); }
      }
      if (o.crosswalks !== false) for (const x of R) for (const z of R) {
        const h = RW / 2;
        for (let s = -h + 20; s <= h - 20; s += 26) {
          T.rect(x + s - 8, z - h - 66, x + s + 8, z - h - 4, 1.4, c.zebra); T.rect(x + s - 8, z + h + 4, x + s + 8, z + h + 66, 1.4, c.zebra);
          T.rect(x - h - 66, z + s - 8, x - h - 4, z + s + 8, 1.4, c.zebra); T.rect(x + h + 4, z + s - 8, x + h + 66, z + s + 8, 1.4, c.zebra);
        }
      }
    };
    // Iterate the blocks between grid roads. Draws a curb + sidewalk ring unless o.sidewalk === false.
    T.blocks = (R, fn, o = {}) => {
      const RW = city.roadWidth, SW = o.sidewalkWidth ?? 60, out = [];
      for (let bz = 0; bz < R.length - 1; bz++) for (let bx = 0; bx < R.length - 1; bx++) {
        const x0 = R[bx] + RW / 2 + SW, x1 = R[bx + 1] - RW / 2 - SW, z0 = R[bz] + RW / 2 + SW, z1 = R[bz + 1] - RW / 2 - SW;
        const b = { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, bx, bz, sw: SW };
        if (SW > 0 && o.sidewalk !== false) { T.rect(x0 - SW, z0 - SW, x1 + SW, z1 + SW, 1.0, o.curb || '#D8D0E8'); T.rect(x0 - SW + 3, z0 - SW + 3, x1 + SW - 3, z1 + SW - 3, 1.6, o.sidewalkColor || '#F3EEF8'); }
        if (o.walk !== false && SW > 0) T.walkLoop([[x0 - SW / 2, z0 - SW / 2], [x1 + SW / 2, z0 - SW / 2], [x1 + SW / 2, z1 + SW / 2], [x0 - SW / 2, z1 + SW / 2]], o.walkers ?? 9, o.walkKinds || { person: 1 }, { dogChance: o.dogChance ?? 0.12 });
        out.push(b); fn && fn(b);
      }
      return out;
    };
    // Street furniture along a block's sidewalk ring. `pick()` returns a kind (or a function(x,z,rot) for custom).
    T.sidewalkProps = (b, o = {}) => {
      const off = b.sw ? -b.sw * 0.73 : -30;
      const sides = [
        { ax: 'x', fixed: b.z0 + off, from: b.x0, to: b.x1, rot: 0 }, { ax: 'x', fixed: b.z1 - off, from: b.x0, to: b.x1, rot: Math.PI },
        { ax: 'z', fixed: b.x0 + off, from: b.z0, to: b.z1, rot: Math.PI / 2 }, { ax: 'z', fixed: b.x1 - off, from: b.z0, to: b.z1, rot: -Math.PI / 2 },
      ];
      for (const s of sides) {
        const at = (t, d = 0) => s.ax === 'x' ? [t, s.fixed + d] : [s.fixed + d, t];
        let i = 0;
        for (let t = s.from + 40; t <= s.to - 30; t += o.step || 100, i++) {
          const [x, z] = at(t);
          if (o.tree && i % 2 === 0) T.put(T.pick(o.tree), x, z, rng() * 6.28);
          else if (o.lamp && i % 4 === 1) T.put(o.lamp, x, z, s.rot + Math.PI / 2);
          else if (o.props) { const k = T.pick(o.props); if (k === 'cluster' && o.cluster) { for (let n = 0; n < (o.clusterN || 4); n++) { const [px, pz] = at(t - 30 + n * 20); T.put(o.cluster, px, pz); } } else if (k !== 'none') T.put(k, x, z, s.rot); }
        }
      }
    };

    // ---- life ----
    T.walkLoop = (pts, n, weights = { person: 1 }, o = {}) => {
      const loop = { pts, kind: o.kind || 'path' }; city.walkLoops.push(loop);
      for (let i = 0; i < n; i++) {
        const t = rng(), dir = o.oneWay ? 1 : rng.chance(0.5) ? 1 : -1, speed = o.speed ? HC.U.lerp(o.speed[0], o.speed[1], rng()) : rng.range(38, 62), lane = o.lane != null ? o.lane : rng.range(-14, 14);
        const kind = T.pick(weights);
        T.put(kind, 0, 0, 0, { mover: { type: 'walk', loop, t, dir, speed, lane, bob: o.bob ?? true } });
        if (o.dogChance && kind === 'person' && rng.chance(o.dogChance)) T.put('dog', 0, 0, 0, { mover: { type: 'walk', loop, t: t - dir * 0.004, dir, speed, lane: lane + 10, bob: true } });
      }
      return loop;
    };
    // Vehicles (trains, rovers, boats) riding a closed loop in one direction.
    T.loopVehicles = (weights, pts, n, speed = [90, 130], o = {}) => T.walkLoop(pts, n, weights, { speed, lane: o.lane || 0, bob: false, oneWay: true, kind: 'track' });
    // Animals / wanderers that amble around a home area and pause now and then.
    T.roamers = (weights, x, z, r, n, o = {}) => {
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * r, kind = T.pick(weights);
        T.put(kind, x + Math.cos(a) * d, z + Math.sin(a) * d, rng() * 6.28, { mover: { type: 'roam', cx: x, cz: z, r, speed: o.speed ? HC.U.lerp(o.speed[0], o.speed[1], rng()) : rng.range(25, 45), bob: o.bob ?? true, spin: o.spin || 0 } });
      }
    };
    // Grid traffic (needs T.roadGrid first).
    T.traffic = (weights, n, o = {}) => {
      const R = city.roads, RW = city.roadWidth;
      for (let i = 0; i < n; i++) {
        const kind = T.pick(weights), axis = rng.chance(0.5) ? 'x' : 'z', road = rng.int(0, R.length - 1), seg = rng.int(0, R.length - 2), dir = rng.chance(0.5) ? 1 : -1;
        const span = R[seg + 1] - R[seg] - RW - 80; if (span < 40) continue;
        const along = R[seg] + RW / 2 + 40 + rng() * span, big = HC.CATALOG[kind].w > 150;
        T.put(kind, 0, 0, 0, { mover: { type: 'drive', axis, road, along, dir, lane: o.lane || RW * 0.25, speed: big ? rng.range(95, 120) : rng.range(120, 175) } });
      }
    };
    T.spawnAt = (x, z) => city.spawnCandidates.push({ x, z });
    T.spawnGrid = (R) => { for (let i = 1; i < R.length - 1; i++) for (let j = 1; j < R.length - 1; j++) T.spawnAt(R[i] + rng.range(-40, 40), R[j] + rng.range(-40, 40)); };
    // Props on the beach ring around the island.
    T.beach = (weights, n, o = {}) => {
      for (let i = 0; i < n; i++) {
        const side = i % 4, t = rng.range(-150, S + 150), off = rng.range(o.inner ?? -215, o.outer ?? -80);
        const p = side === 0 ? [t, off] : side === 1 ? [t, S - off] : side === 2 ? [off, t] : [S - off, t];
        const kind = T.pick(weights);
        if (T.free(p[0], p[1], HC.CATALOG[kind].radius * 0.7)) T.put(kind, p[0], p[1], rng() * 6.28);
      }
    };
    return T;
  }

  HC.Gen = { create };
})();
