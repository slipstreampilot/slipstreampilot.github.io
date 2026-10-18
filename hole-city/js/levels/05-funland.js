// Level 5 — Funland: a candy-colored theme park. A fairy-tale castle sits on a moated plaza in the
// middle; a promenade ring and eight curvy spokes lead out to themed lands (lagoon, food court,
// kiddie rides, thrill rides, teacups, bumper cars), an outer loop, and big corner attractions
// (big top, ferris wheel, log flume, resort hotel). A little park train circles everything.
(function () {
  const PI = Math.PI, D = PI / 180;
  const C = {
    pink: '#FF5FA2', hot: '#FF3D8B', sky: '#5CC8FF', mint: '#5FE3B4', lemon: '#FFE45C', lilac: '#B892FF',
    white: '#FFFFFF', cream: '#FFF6E8', coral: '#FF7B72', orange: '#FF9F43', gold: '#FFC83D', red: '#FF3B5C',
    dark: '#3A3F58', tire: '#2B2D42', glass: '#9FE7FF', wood: '#B0703F', skin: '#FFD3B0',
  };
  const PASTEL = ['#FF9FD2', '#8FD3FF', '#9BF0CF', '#FFE77A', '#D2BCFF', '#FFB98A'];
  const SHIRTS = ['#FF5A5F', '#FFB400', '#00A699', '#3D7BFF', '#9B5DE5', '#F15BB5', '#00BBF9', '#FEE440', '#00F5D4', '#FF8C42'];

  // ---- drawing helpers (wedge-striped cones/cylinders, beams between two points) ----
  function stripes(g, x, base, z, rTop, rBot, h, n, a, b, o = {}) {
    for (let i = 0; i < n; i++) {
      const geo = new THREE.CylinderGeometry(rTop, rBot, h, 1, 1, !!o.open, (o.rot || 0) + i * 2 * PI / n, 2 * PI / n);
      g._add(geo, x, base + h / 2, z, 0, 0, 0, 1, 1, 1, i % 2 ? a : b, false, o.shade);
    }
  }
  const beamXY = (g, x0, y0, x1, y1, z, t, d, color, o = {}) => g.box((x0 + x1) / 2, (y0 + y1) / 2, z, Math.hypot(x1 - x0, y1 - y0), t, d, color, Object.assign({ rz: Math.atan2(y1 - y0, x1 - x0) }, o));
  const beamZY = (g, z0, y0, z1, y1, x, t, w, color, o = {}) => g.box(x, (y0 + y1) / 2, (z0 + z1) / 2, w, t, Math.hypot(z1 - z0, y1 - y0), color, Object.assign({ rx: Math.atan2(-(y1 - y0), z1 - z0) }, o));
  const torus = (g, x, y, z, R, r, rs, ts, color, o = {}) => g._add(new THREE.TorusGeometry(R, r, rs, ts), x, y, z, o.rx || 0, o.ry || 0, 0, 1, 1, 1, color, o.tint, o.shade);
  // A little rider: shirt + head (+ hair), sitting at (x, y, z).
  const rider = (g, x, y, z, shirt, hair) => { g.block(x, y, z, 7, 7, 8, shirt); g.ball(x, y + 11, z, 4.2, C.skin); g.ball(x - 0.6, y + 13, z, 4.3, hair || '#5A3825', { sy: 0.55 }); };

  function kinds(def) {
    // ---------- tiny (1 pt) ----------
    def('fun_kid', { w: 10, d: 8, h: 40, points: 1, mass: 30, tints: SHIRTS, mover: 'walk',
      build(g) { // faces +x, holding a balloon that matches the shirt
        g.limb(-1, 0, 9, () => g.block(0, 0, -2, 3, 9, 3, '#3B4A6B')); g.limb(1, 0, 9, () => g.block(0, 0, 2, 3, 9, 3, '#3B4A6B'));
        g.block(0, 9, 0, 5, 8, 8, '#FFF', { tint: true }); g.block(0, 12, 5, 2.4, 9, 2.4, '#FFF', { tint: true });
        g.ball(0, 21, 0, 4, C.skin, { detail: 1 }); g.ball(-0.5, 23, 0, 4.1, C.hot, { sy: 0.55 }); g.block(3, 23.4, 0, 4, 0.8, 5, C.hot);
        g.block(0, 21, 5, 0.5, 12, 0.5, C.white); g.ball(0, 35.5, 5, 4.5, '#FFF', { tint: true, sy: 1.15 });
      } });
    def('fun_balloons', { w: 16, d: 16, h: 58, points: 1, mass: 3,
      build(g) {
        g.block(0, 0, 0, 6, 4, 6, C.hot); g.block(0, 4, 0, 0.6, 36, 0.6, C.white);
        const B = [[0, 51, 0, C.pink], [6, 46, 3, C.sky], [-6, 46, -2, C.lemon], [3, 52, -6, C.mint], [-4, 51, 6, C.lilac], [5, 40, -3, C.orange]];
        for (const [x, y, z, c] of B) g.ball(x, y, z, 5.5, c, { sy: 1.15 });
      } });
    def('fun_trash', { w: 14, d: 14, h: 26, points: 1, mass: 20, tints: ['#FF8FC5', '#7ED3FF', '#7FE8C4', '#FFE36B', '#C9A9FF'],
      build(g) {
        g.cyl(0, 0, 0, 6.5, 6, 18, 10, '#FFF', { tint: true }); g.cyl(0, 6, 0, 6.8, 6.6, 3, 10, C.white);
        g.cyl(0, 18, 0, 7.4, 7.4, 2, 10, C.white); g.ball(0, 20, 0, 6.2, C.white, { sy: 0.6 }); g.ball(0, 24, 0, 1.8, C.gold);
      } });
    // ---------- small (2–3 pts) ----------
    def('fun_mascot', { w: 18, d: 16, h: 42, points: 2, mass: 90, tints: ['#D9954A', '#FF9FD2', '#8FD3FF', '#FFE36B'], mover: 'walk',
      build(g) { // a costumed teddy, faces +x
        g.limb(-1, 0, 8, () => g.block(0, 0, -4, 6, 8, 5, '#FFF', { tint: true })); g.limb(1, 0, 8, () => g.block(0, 0, 4, 6, 8, 5, '#FFF', { tint: true }));
        g.ball(0, 16, 0, 9, '#FFF', { tint: true, sy: 1.1 }); g.ball(4, 15, 0, 6, C.cream, { sx: 0.6 });
        g.limb(0.6, 0, 20, () => g.ball(0, 18, -9, 3.5, '#FFF', { tint: true })); g.limb(-0.6, 0, 20, () => g.ball(0, 18, 9, 3.5, '#FFF', { tint: true }));
        g.ball(0, 31, 0, 8.5, '#FFF', { tint: true, detail: 1 }); g.ball(0, 38, -6.5, 3.4, '#FFF', { tint: true }); g.ball(0, 38, 6.5, 3.4, '#FFF', { tint: true });
        g.ball(7, 29.5, 0, 3.4, C.cream); g.ball(10, 30.5, 0, 1.3, C.tire); g.ball(7, 34, -3, 1.1, C.tire); g.ball(7, 34, 3, 1.1, C.tire);
        g.block(7.5, 22.5, 0, 2, 3, 8, C.hot);
      } });
    def('fun_balloonman', { w: 24, d: 24, h: 82, points: 2, mass: 80, tints: SHIRTS, mover: 'walk',
      build(g) {
        g.limb(-1, 0, 15, () => g.block(0, 0, -3, 4, 15, 5, '#3B4A6B')); g.limb(1, 0, 15, () => g.block(0, 0, 3, 4, 15, 5, '#3B4A6B'));
        g.block(0, 14, 0, 7, 12, 12, '#FFF', { tint: true }); g.block(0, 18, 7.5, 3, 14, 3, '#FFF', { tint: true });
        g.ball(0, 30, 0, 5, C.skin, { detail: 1 }); g.cyl(0, 33, 0, 3.5, 3.5, 7, 8, C.hot); g.cyl(0, 33, 0, 6.5, 6.5, 1, 8, C.hot);
        g.block(0, 32, 8, 0.5, 28, 0.5, C.white);
        const cols = [C.pink, C.sky, C.lemon, C.mint, C.lilac, C.orange, C.red, C.sky, C.pink];
        for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * PI; g.ball(Math.cos(a) * 7, 66 + (i % 2) * 5, 4 + Math.sin(a) * 7, 5.5, cols[i], { sy: 1.15 }); }
        g.ball(0, 74, 4, 5.5, cols[8], { sy: 1.15 });
      } });
    def('fun_popcorn', { w: 38, d: 24, h: 50, points: 3, mass: 120,
      build(g) {
        for (const x of [-12, 12]) for (const z of [-11, 11]) g.cyl(x, 0, z, 5, 5, 2, 10, C.gold, { rx: PI / 2 });
        g.block(0, 5, 0, 34, 15, 20, C.red);
        for (const x of [-11, 0, 11]) { g.panel('z+', x, 12.5, 10.3, 4, 15, C.white); g.panel('z-', x, 12.5, -10.3, 4, 15, C.white); }
        g.block(0, 20, 0, 30, 2, 18, C.white);
        for (const [x, z] of [[-14, -8], [14, -8], [-14, 8], [14, 8]]) g.block(x, 22, z, 2, 18, 2, C.red);
        g.ball(-5, 26, 0, 8, '#FFF3C4', { sy: 0.6 }); g.ball(6, 25, 2, 7, '#FFE38A', { sy: 0.6 });
        g.panel('z+', 0, 30, 9.2, 28, 14, C.glass); g.panel('z-', 0, 30, -9.2, 28, 14, C.glass);
        g.block(0, 40, 0, 38, 3, 24, C.white); g.block(0, 43, 0, 16, 7, 2, C.lemon); g.ball(0, 47, 0, 2.6, C.red);
      } });
    def('fun_cotton', { w: 36, d: 24, h: 54, points: 3, mass: 110,
      build(g) {
        for (const x of [-12, 12]) for (const z of [-11, 11]) g.cyl(x, 0, z, 5, 5, 2, 10, C.white, { rx: PI / 2 });
        g.block(0, 5, 0, 32, 16, 20, '#FF9FD2'); g.block(0, 12, 10.3, 32, 3, 0.5, C.white); g.block(0, 12, -10.3, 32, 3, 0.5, C.white);
        g.block(0, 21, 0, 34, 2, 22, C.white); g.cyl(-10, 23, 0, 7, 7, 6, 10, '#C9CCD9');
        for (const [x, z, c] of [[2, -5, '#FF8FC5'], [8, 4, '#8FD3FF'], [-3, 6, '#D2BCFF']]) { g.block(x, 23, z, 1, 10, 1, C.white); g.ball(x, 37, z, 6.5, c); }
        g.block(14, 23, -8, 1.4, 22, 1.4, C.white); stripes(g, 14, 44, -8, 0.5, 18, 8, 8, C.pink, C.white);
      } });
    def('fun_icecream', { w: 42, d: 30, h: 60, points: 3, mass: 300,
      build(g) {
        g.block(0, 0, 0, 40, 26, 28, '#7FE3C4'); g.block(0, 0, 0, 42, 3, 30, C.white); g.block(0, 26, 0, 42, 3, 30, C.white);
        g.panel('z+', 0, 14, 14.3, 28, 10, C.cream); for (const x of [-9, 0, 9]) g.ball(x, 14, 14.6, 2.4, [C.pink, C.lemon, C.sky][(x + 9) / 9], { sz: 0.3 });
        for (const [x, z] of [[-18, 12], [18, 12], [-18, -12], [18, -12]]) g.block(x, 29, z, 2, 8, 2, C.white);
        for (let i = 0; i < 5; i++) g.block(-16.8 + i * 8.4, 37, 0, 8.4, 3, 32, i % 2 ? C.white : C.pink);
        g.cyl(0, 40, 0, 6.5, 0.6, 12, 8, '#E7B57E'); g.ball(0, 53, 0, 7, '#FF9FD2'); g.ball(0, 58.5, 0, 2.2, C.red);
      } });
    def('fun_ticket', { w: 34, d: 34, h: 64, points: 3, mass: 400, tints: ['#D2BCFF', '#8FD3FF', '#FF9FD2', '#9BF0CF'],
      build(g) {
        g.block(0, 0, 0, 33, 4, 33, C.white); g.block(0, 4, 0, 29, 30, 29, '#FFF', { tint: true });
        for (const f of ['z+', 'z-']) g.panel(f, 0, 22, f === 'z+' ? 14.8 : -14.8, 18, 11, C.glass);
        for (const f of ['x+', 'x-']) g.panel(f, f === 'x+' ? 14.8 : -14.8, 22, 0, 18, 11, C.glass);
        g.block(0, 15, 16, 22, 2, 5, C.white);
        g.cyl(0, 34, 0, 21, 21, 3, 8, C.white); stripes(g, 0, 37, 0, 0.5, 21, 22, 8, C.pink, C.white);
        g.block(0, 58, 0, 1, 6, 1, C.white); g.block(3, 61, 0, 6, 3, 0.6, C.lemon);
      } });
    def('fun_bumper', { w: 34, d: 26, h: 40, points: 3, mass: 220, tints: ['#FF4757', '#FFC312', '#1E90FF', '#2ED573', '#A55EEA', '#FF6BB5', '#22D3EE'], mover: 'drive',
      build(g) { // front +x
        g.block(0, 1, 0, 34, 6, 26, C.dark); g.block(-1, 6, 0, 30, 8, 22, '#FFF', { tint: true }); g.block(11, 6, 0, 10, 5, 22, '#FFF', { tint: true });
        g.block(-7, 12, 0, 9, 10, 16, C.tire); g.cyl(3, 14, 0, 3.5, 3.5, 1.2, 8, C.tire, { rz: 0.7 });
        g.block(-5, 14, 0, 6, 6, 8, '#FFFFFF'); g.ball(-5, 24, 0, 4, C.skin); g.ball(-5.6, 26, 0, 4.1, '#5A3825', { sy: 0.55 });
        g.block(-13, 12, 0, 1.5, 26, 1.5, '#C9CCD9'); g.ball(-13, 38, 0, 2, C.lemon);
        g.panel('x+', 16.3, 9, -7, 4, 3, '#FFF7C2'); g.panel('x+', 16.3, 9, 7, 4, 3, '#FFF7C2');
      } });
    // ---------- car-size (4–5 pts) ----------
    def('fun_teacup', { w: 40, d: 40, h: 34, points: 4, mass: 180, tints: PASTEL,
      build(g) {
        g.cyl(0, 0, 0, 20, 17, 4, 14, C.white); g.cyl(0, 4, 0, 18, 11, 20, 14, '#FFF', { tint: true });
        g.cyl(0, 22, 0, 18.6, 18, 2.6, 14, C.white); g.cyl(0, 22.2, 0, 15.5, 15.5, 2.5, 14, '#FFF6EE');
        g.block(18.5, 9, 0, 3, 11, 3, '#FFF', { tint: true }); g.block(17, 19, 0, 5, 3, 3, '#FFF', { tint: true });
        for (let i = 0; i < 5; i++) { const a = i / 5 * 2 * PI + 0.4; g.ball(Math.cos(a) * 15.5, 13, Math.sin(a) * 15.5, 2.6, C.white, { sx: 0.7, sz: 0.7 }); }
        rider(g, -5, 18, -5, C.hot); rider(g, 5, 18, 5, C.sky, '#F2C14E');
      } });
    def('fun_engine', { w: 80, d: 40, h: 58, points: 5, mass: 3000, mover: 'drive',
      build(g) { // front +x
        g.block(0, 6, 0, 76, 6, 34, C.dark);
        for (const x of [-22, 6, 26]) for (const z of [-18, 18]) { g.cyl(x, 0, z, 8, 8, 4, 10, C.hot, { rx: PI / 2 }); g.cyl(x, 4, z * 1.12, 2.5, 2.5, 1, 6, C.gold, { rx: PI / 2 }); }
        g.cyl(14, 4, 0, 13, 13, 44, 12, '#2FB2FF', { rz: PI / 2 }); g.cyl(4, 12.5, 0, 13.8, 13.8, 3, 12, C.gold, { rz: PI / 2 }); g.cyl(26, 12.5, 0, 13.8, 13.8, 3, 12, C.gold, { rz: PI / 2 });
        g.cyl(28, 36, 0, 5.5, 4, 14, 8, C.tire); g.cyl(28, 50, 0, 8, 5.5, 6, 8, C.gold); g.ball(14, 39, 0, 5, C.gold);
        g.block(-22, 12, 0, 30, 34, 34, C.pink); g.block(-22, 46, 0, 36, 4, 40, C.lemon);
        g.panel('z+', -20, 34, 17.3, 18, 12, C.glass); g.panel('z-', -20, 34, -17.3, 18, 12, C.glass); g.ball(-22, 36, 0, 5, C.skin); g.cyl(-22, 40, 0, 5.5, 5.5, 3, 8, '#3D7BFF');
        g.block(39, 6, 0, 6, 8, 30, C.gold, { rz: -0.5 }); g.cyl(39, 28, 0, 4, 4, 4, 8, '#FFF7C2', { rz: PI / 2 });
      } });
    def('fun_carriage', { w: 70, d: 40, h: 50, points: 5, mass: 1500, tints: ['#5CC8FF', '#FFE45C', '#7FE3C4', '#B892FF', '#FF9F43'], mover: 'drive',
      build(g) {
        g.block(0, 6, 0, 68, 5, 34, C.dark);
        for (const x of [-22, 22]) for (const z of [-18, 18]) g.cyl(x, 0, z, 7, 7, 4, 10, C.hot, { rx: PI / 2 });
        g.block(0, 11, 0, 66, 14, 36, '#FFF', { tint: true }); g.block(0, 25, 0, 66, 2, 36, C.white);
        const hair = ['#5A3825', '#F2C14E', '#2B2D42'];
        for (let i = 0; i < 3; i++) { const x = -20 + i * 20; g.block(x - 5, 11, 0, 4, 18, 30, C.cream); rider(g, x, 22, -8, SHIRTS[i * 2], hair[i]); rider(g, x, 22, 8, SHIRTS[i * 2 + 3], hair[(i + 1) % 3]); }
        for (const [x, z] of [[-31, -16], [31, -16], [-31, 16], [31, 16]]) g.block(x, 27, z, 2, 18, 2, C.white);
        for (let i = 0; i < 6; i++) g.block(-29 + i * 11.6, 45, 0, 11.6, 3, 40, i % 2 ? C.white : C.hot);
      } });
    // ---------- the big roller coaster (js/coaster.js) ----------
    // One 36-unit track piece, centred on its origin, running along +x. Eaten when its support is
    // inside a hole at least 41 across (scripted; see Physics).
    def('coaster_rail', { centered: true, scripted: true, minHole: 41, w: 36, d: 26, h: 16, points: 2, mass: 300, tints: [C.hot],
      build(g) {
        for (const z of [-9, 9]) g.block(0, -1.6, z, 36.4, 3.2, 3.2, '#FFF', { tint: true });               // rails
        for (let x = -15; x <= 15; x += 10) g.block(x, -4.5, 0, 3, 2.6, 22, C.white);                      // ties
        g.block(0, -9, 0, 36.4, 5, 7, C.lemon);                                                              // spine
        g.block(0, -11.5, 0, 36.4, 1.4, 12, C.hot);
      } });
    def('coaster_car', { w: 46, d: 28, h: 30, points: 6, mass: 900, tints: [C.sky, C.lemon, C.mint, C.hot, C.lilac, C.orange],
      build(g) { // faces +x; riders throw their arms up
        g.block(0, 2, 0, 44, 12, 26, '#FFF', { tint: true }); g.block(19, 2, 0, 8, 16, 26, '#FFF', { tint: true });
        g.cone(26, 8, 0, 10, 10, 6, '#FFF', { tint: true, rz: -PI / 2 });
        for (const x of [-14, 14]) for (const z of [-11, 11]) g.cyl(x, 0, z, 3.4, 3.4, 3, 8, C.tire, { rx: PI / 2 });
        for (const [x, i] of [[-12, 0], [6, 1]]) {
          g.block(x - 5, 14, 0, 4, 12, 24, C.white); g.block(x + 6, 14, 0, 2, 4, 24, C.dark);
          for (const z of [-6, 6]) {
            const shirt = SHIRTS[(i * 3 + (z > 0 ? 1 : 0) * 5) % SHIRTS.length];
            g.block(x, 14, z, 7, 7, 8, shirt); g.ball(x, 25, z, 3.8, C.skin); g.ball(x - 0.6, 27, z, 3.9, i ? '#F2C14E' : '#5A3825', { sy: 0.55 });
            for (const s of [-1, 1]) g.box(x + 1, 28, z + s * 4.5, 2, 9, 2, shirt, { rx: s * 0.35 });
          }
        }
        g.block(21, 18, 0, 2, 6, 24, C.lemon);
      } });
    // ---------- bus-size ----------
    def('fun_coaster', { w: 240, d: 60, h: 150, points: 14, mass: 20000,
      build(g) { // one camel-hump of track; segments chain end to end along x
        const N = 10, Y = (x) => 16 + 120 * Math.pow(Math.sin(PI * (x + 120) / 240), 2);
        for (let i = 0; i < N; i++) {
          const x0 = -120 + i * 24, x1 = x0 + 24, y0 = Y(x0), y1 = Y(x1);
          for (const z of [-11, 11]) beamXY(g, x0, y0, x1, y1, z, 4, 4, C.hot);
          beamXY(g, x0, y0 - 4, x1, y1 - 4, 0, 3, 26, i % 2 ? C.lemon : C.white);
          if (i % 2 === 1) { g.block(x1, 0, 0, 6, y1 - 6, 6, C.white); g.block(x1, 0, 0, 14, 4, 22, '#C9CCD9'); }
        }
        g.block(-108, 0, 0, 6, 10, 6, C.white); g.block(108, 0, 0, 6, 10, 6, C.white);
        beamXY(g, -60, 6, 0, Y(-1) - 8, 0, 4, 4, C.white); beamXY(g, 60, 6, 0, Y(1) - 8, 0, 4, 4, C.white);
        for (const x of [-48, 48]) g.block(x, 0, 0, 20, 3, 60, '#C9CCD9');
      } });
    def('fun_pirate', { w: 230, d: 110, h: 180, points: 20, mass: 30000,
      build(g) {
        g.block(0, 0, 0, 230, 6, 110, '#D2BCFF'); g.block(0, 6, 0, 220, 2, 100, C.white);
        for (const z of [-46, 46]) { beamXY(g, -100, 8, 0, 170, z, 7, 7, '#5A6FB5'); beamXY(g, 100, 8, 0, 170, z, 7, 7, '#5A6FB5'); beamXY(g, -55, 70, 55, 70, z, 5, 5, '#5A6FB5'); }
        g.block(0, 166, 0, 10, 10, 100, C.gold);
        for (const z of [-28, 28]) { beamXY(g, 0, 170, -56, 60, z, 5, 5, '#C9CCD9'); beamXY(g, 0, 170, 56, 60, z, 5, 5, '#C9CCD9'); }
        // the ship, caught mid-swing
        const sw = 0.18;
        g.box(0, 42, 0, 140, 24, 50, C.wood, { rz: sw }); g.box(0, 28, 0, 110, 10, 36, '#8D5A3B', { rz: sw });
        g.box(-66, 50, 0, 26, 22, 50, C.wood, { rz: sw + 0.25 }); g.box(68, 66, 0, 26, 22, 50, C.wood, { rz: sw - 0.25 });
        g.box(0, 52, 25.4, 140, 4, 0.6, C.gold, { rz: sw }); g.box(0, 52, -25.4, 140, 4, 0.6, C.gold, { rz: sw });
        for (let i = 0; i < 5; i++) { const x = -40 + i * 20, y = 56 + x * Math.tan(sw); g.ball(x, y + 4, -10, 4.2, C.skin); g.ball(x + 4, y + 4, 10, 4.2, C.skin); }
        g.box(8, 92, 0, 3, 66, 3, '#8D5A3B', { rz: sw }); g.box(2, 92, 0, 40, 36, 2, C.white, { rz: sw }); g.box(2, 92, 1.2, 40, 8, 0.4, C.red, { rz: sw });
        g.box(-5, 128, 0, 14, 8, 1, C.tire, { rz: sw }); g.ball(-5, 128, 0.7, 2, C.white, { sz: 0.3 });
      } });
    // ---------- buildings ----------
    def('fun_droptower', { hs: 0.62, w: 130, d: 130, h: 660, points: 26, mass: 60000,
      build(g) {
        g.cyl(0, 0, 0, 65, 65, 12, 12, '#D2BCFF'); g.cyl(0, 12, 0, 56, 60, 4, 12, C.white);
        g.cyl(0, 16, 0, 20, 24, 560, 10, C.white);
        for (let i = 0; i < 6; i++) g.cyl(0, 70 + i * 82, 0, 22.5, 22.5, 26, 10, i % 2 ? C.sky : C.pink);
        g.cyl(0, 200, 0, 46, 46, 22, 12, C.hot); g.cyl(0, 196, 0, 40, 40, 4, 12, C.lemon);
        for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * PI; g.ball(Math.cos(a) * 49, 230, Math.sin(a) * 49, 5, C.skin); g.block(Math.cos(a) * 49, 216, Math.sin(a) * 49, 8, 8, 8, SHIRTS[i]); }
        g.cyl(0, 576, 0, 38, 28, 30, 10, C.sky); stripes(g, 0, 606, 0, 0.5, 42, 42, 10, C.pink, C.white); g.ball(0, 652, 0, 8, C.gold);
      } });
    def('fun_shop', { w: 170, d: 140, h: 182, points: 24, mass: 40000, tints: ['#FF5FA2', '#4FB8FF', '#3FD69E', '#FFC93C', '#A57BFF', '#FF8A5C'],
      build(g) {
        g.block(0, 0, 0, 176, 6, 146, C.white); g.block(0, 0, 0, 170, 90, 140, '#FFF4FA');
        g.block(0, 0, 0, 172, 12, 142, '#FFF', { tint: true }); for (const x of [-84, 84]) g.block(x, 0, 0, 4, 90, 142, '#FFF', { tint: true });
        g.block(0, 86, 0, 176, 7, 146, C.white); g.gable(0, 93, 0, 184, 154, 48, '#FFF', { tint: true });
        for (let i = 0; i < 7; i++) g.block(-72 + i * 24, 50, 77, 24, 3, 18, i % 2 ? C.white : C.pink, { rx: 0.35 });
        g.panel('z+', 0, 22, 70.4, 26, 44, '#8D5A3B'); for (const x of [-50, 50]) g.panel('z+', x, 26, 70.4, 44, 34, C.glass);
        g.windows(0, 0, 170, 140, 52, 80, 1, 3, C.glass, { fill: 0.5 });
        torus(g, 0, 152, 0, 19, 9, 6, 12, '#E7B57E'); torus(g, 0, 152, 2.5, 19, 8, 6, 12, '#FF8FC5');
        for (const [x, y, c] of [[-14, 160, C.lemon], [12, 164, C.sky], [18, 148, C.white], [-18, 144, C.mint], [0, 170, C.white]]) g.block(x, y, 11, 4, 1.6, 1.6, c, { rz: x * 0.1 });
      } });
    def('fun_carousel', { w: 180, d: 180, h: 182, points: 28, mass: 30000,
      build(g) {
        g.cyl(0, 0, 0, 90, 90, 10, 16, C.cream); g.cyl(0, 10, 0, 84, 84, 6, 16, '#FF9FD2');
        g.cyl(0, 16, 0, 22, 22, 112, 12, C.lemon); g.cyl(0, 60, 0, 23, 23, 30, 12, '#8FD3FF');
        const HC_ = [C.white, '#FFB3D9', '#A9E1FF', '#FFE98A', '#C9F5DF', '#E2D2FF'];
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * 2 * PI, x = Math.cos(a) * 62, z = Math.sin(a) * 62, ry = -a + PI / 2, up = (i % 2) * 10;
          g.block(x, 16, z, 2, 112, 2, C.gold);
          g.box(x, 46 + up, z, 8, 9, 24, HC_[i], { ry }); g.box(x + Math.sin(a + PI / 2) * 12, 56 + up, z + Math.cos(a + PI / 2) * 12, 6, 12, 6, HC_[i], { ry });
          g.box(x, 36 + up, z, 6, 12, 18, HC_[i], { ry }); g.box(x, 51 + up, z, 9, 2, 8, C.hot, { ry });
        }
        g.cyl(0, 128, 0, 92, 92, 4, 16, C.white); stripes(g, 0, 132, 0, 93, 93, 14, 16, C.lemon, C.hot);
        stripes(g, 0, 146, 0, 3, 96, 30, 16, C.pink, C.white); g.block(0, 176, 0, 2, 8, 2, C.white); g.ball(0, 178, 0, 4, C.gold);
      } });
    def('fun_funhouse', { w: 250, d: 220, h: 262, points: 50, mass: 200000,
      build(g) {
        g.block(0, 0, 0, 250, 10, 220, C.white);
        g.block(0, 10, 0, 230, 110, 200, C.lemon);
        for (const [x, y] of [[-90, 40], [-60, 95], [80, 90], [95, 40], [-100, 100]]) { g.ball(x, y, 100.5, 10, C.pink, { sz: 0.15 }); g.ball(x, y, -100.5, 10, C.sky, { sz: 0.15 }); }
        g.box(10, 160, -5, 190, 80, 170, C.sky, { rz: 0.07 }); g.windows(10, -5, 190, 170, 135, 185, 1, 4, C.white, { fill: 0.4 });
        g.box(-12, 222, 0, 120, 44, 110, C.pink, { rz: -0.12 }); stripes(g, -16, 242, 0, 1, 40, 14, 8, C.lilac, C.white);
        g.cyl(0, 15, 111, 48, 48, 6, 14, C.cream, { rx: PI / 2 }); g.ball(0, 74, 116, 9, C.red);
        for (const x of [-18, 18]) { g.ball(x, 88, 114, 7, C.white, { sz: 0.4 }); g.ball(x, 88, 116.5, 3, C.tire); }
        g.panel('z+', 0, 46, 114.2, 46, 24, '#4A1F3B'); g.ball(-50, 90, 106, 20, C.sky); g.ball(50, 90, 106, 20, C.sky);
        g.cone(0, 108, 108, 24, 40, 6, C.hot, { rz: 0.25 }); g.ball(-10, 148, 108, 6, C.lemon);
      } });
    def('fun_haunted', { w: 250, d: 230, h: 270, points: 52, mass: 220000,
      build(g) {
        g.block(0, 0, 0, 250, 10, 230, '#8C7AA8'); g.block(20, 10, -5, 200, 120, 180, '#9D7BD8');
        g.gable(20, 130, -5, 214, 194, 76, '#4B3B6B'); g.block(20, 126, -5, 206, 6, 186, '#E2D2FF');
        g.block(-80, 10, 55, 72, 200, 72, '#8F6CCB'); g.block(-80, 206, 55, 80, 6, 80, '#E2D2FF'); g.cone(-80, 212, 55, 58, 58, 4, '#4B3B6B', { ry: PI / 4 }); g.ball(-80, 272 - 6, 55, 5, C.gold);
        g.glowing(() => {
          for (const x of [-10, 70]) for (const y of [45, 95]) g.panel('z+', x, y, 85.3, 26, 30, '#B6FF8A');
          for (const y of [60, 120, 170]) g.panel('z+', -80, y, 91.3, 22, 28, '#FFE36B');
          g.windows(20, -5, 200, 180, 30, 115, 2, 4, '#B6FF8A', { fill: 0.35 });
        });
        g.panel('z+', 30, 30, 85.3, 30, 44, '#3A2A55'); g.block(30, 52, 96, 50, 3, 22, '#4B3B6B');
        g.ball(80, 220, -10, 17, C.white); g.cone(80, 196, -10, 18, 12, 8, C.white, { rx: PI }); g.ball(74, 224, 6, 2.8, C.tire); g.ball(86, 224, 6, 2.8, C.tire);
        g.cyl(-10, 150, -20, 8, 8, 70, 6, '#6B5A8E');
      } });
    def('fun_hotel', { w: 340, d: 300, h: 300, points: 82, mass: 400000,
      build(g) {
        g.block(0, 0, 0, 340, 8, 300, C.white); g.block(0, 8, 0, 320, 190, 280, '#FFC6DD');
        g.windows(0, 0, 320, 280, 30, 190, 5, 6, C.glass, { fill: 0.55, litColor: '#FFF1A8' });
        for (let r = 0; r < 4; r++) { g.block(0, 58 + r * 32, 143, 290, 3, 8, C.white); g.block(0, 58 + r * 32, -143, 290, 3, 8, C.white); }
        g.block(0, 198, 0, 330, 8, 290, C.cream); g.block(0, 206, -60, 160, 40, 110, '#8FD3FF'); g.gable(0, 246, -60, 168, 118, 34, C.hot);
        g.block(0, 206, 75, 180, 3, 90, C.white); g.block(0, 207, 75, 164, 3, 74, '#4DD6FF', { shade: false });
        for (const x of [-110, 110]) for (const z of [50, 100]) { g.block(x, 206, z, 30, 4, 14, C.white); g.cyl(x, 206, z - 16, 1, 1, 26, 6, C.white); stripes(g, x, 228, z - 16, 0.5, 16, 6, 6, x < 0 ? C.pink : C.sky, C.white); }
        for (const x of [-140, 140]) for (const z of [-120, 120]) { g.cyl(x, 206, z, 24, 24, 40, 8, C.cream); g.cone(x, 246, z, 30, 50, 8, C.sky); g.ball(x, 298, z, 4, C.gold); }
        for (let i = 0; i < 6; i++) g.block(-50 + i * 20, 26, 156, 20, 3, 22, i % 2 ? C.white : C.sky, { rx: 0.3 });
        g.panel('z+', 0, 24, 140.4, 60, 40, C.glass); g.ball(0, 270, 70, 14, C.pink, { sz: 0.4 });
      } });
    def('fun_flume', { w: 340, d: 320, h: 300, points: 86, mass: 500000,
      build(g) {
        g.ball(0, 90, -10, 150, '#E9B47E', { sy: 0.62 }); g.ball(-95, 60, 50, 80, '#F2C796', { sy: 0.8 }); g.ball(100, 60, -40, 75, '#D99A62', { sy: 0.9 });
        g.ball(30, 170, -40, 90, '#E9B47E', { sy: 0.8 }); g.ball(-40, 220, -50, 55, '#F2C796'); g.ball(10, 260, -60, 32, '#D99A62');
        g.ball(-120, 30, -90, 45, '#2FB86E'); g.ball(120, 30, 100, 40, '#38C55A'); g.ball(-30, 120, 110, 30, '#4FD86A');
        // the flume: a channel down the front, a splash, a log boat
        beamZY(g, -20, 235, 60, 170, 50, 8, 40, '#4FC3F7'); beamZY(g, 60, 170, 158, 10, 50, 8, 40, '#4FC3F7');
        for (const x of [30, 70]) { beamZY(g, -20, 243, 60, 178, x, 8, 4, C.wood); beamZY(g, 60, 178, 158, 18, x, 8, 4, C.wood); }
        g.ball(50, 10, 150, 26, '#E6FBFF', { sy: 0.5 }); g.ball(36, 18, 160, 10, C.white); g.ball(66, 18, 158, 10, C.white);
        g.box(50, 120, 100, 22, 14, 44, '#8D5A3B', { rx: -Math.atan2(160, 98) + PI / 2 - PI / 2 + Math.atan2(-160, 98) * 0 + 1.02 });
        g.ball(44, 132, 92, 4, C.skin); g.ball(56, 128, 102, 4, C.skin);
        g.box(-70, 110, 105, 30, 140, 4, '#7FDBFF', { rx: -0.35 }); g.ball(-70, 30, 135, 18, '#E6FBFF', { sy: 0.5 });
        g.ball(-110, 40, 90, 34, '#3A2E35', { sz: 0.4 });
        for (const [x, z] of [[-60, -40], [60, -70]]) { g.cyl(x, 230 - Math.abs(x) * 0.5, z, 4, 5, 50, 6, '#9A6343'); g.cone(x, 270 - Math.abs(x) * 0.5, z, 26, 28, 6, '#38C55A'); }
      } });
    // ---------- very large ----------
    def('fun_bigtop', { w: 400, d: 400, h: 330, points: 135, mass: 600000,
      build(g) {
        g.cyl(0, 0, 0, 200, 200, 8, 16, C.cream);
        stripes(g, 0, 8, 0, 186, 186, 120, 16, C.red, C.white);
        stripes(g, 0, 118, 0, 196, 196, 16, 16, C.lemon, C.sky);
        stripes(g, 0, 134, 0, 6, 198, 160, 16, C.red, C.white, { rot: PI / 16 });
        g.block(0, 294, 0, 5, 26, 5, C.gold); g.block(10, 310, 0, 18, 10, 1, C.sky); g.ball(0, 322, 0, 7, C.gold);
        for (const a of [PI / 4, 3 * PI / 4, 5 * PI / 4, 7 * PI / 4]) { const x = Math.cos(a) * 110, z = Math.sin(a) * 110; g.block(x, 220, z, 3, 26, 3, C.gold); g.block(x + 7, 240, z, 12, 7, 1, a < PI ? C.lemon : C.pink); }
        g.block(0, 8, 172, 80, 86, 56, C.lemon); g.gable(0, 94, 172, 64, 90, 34, C.red, { ry: PI / 2 });
        g.panel('z+', 0, 40, 200.3, 44, 64, '#4A1F3B'); for (const x of [-30, 30]) g.ball(x, 104, 200, 7, C.sky);
      } });
    def('fun_ferris', { w: 440, d: 400, h: 500, points: 140, mass: 800000,
      build(g) {
        const cy = 272, R = 190;
        g.block(0, 0, 0, 440, 10, 400, C.cream); g.block(0, 10, 0, 410, 3, 370, '#FFD1E6');
        g.block(0, 13, 120, 120, 30, 50, '#8FD3FF'); stripes(g, 0, 43, 120, 0.5, 40, 24, 8, C.pink, C.white);
        g.cyl(0, 13, 0, 150, 150, 1, 24, '#FFF6E8'); g.cyl(0, 13, 0, 136, 136, 1.6, 24, '#FFB8DA');
        for (const [x, z] of [[-180, -160], [180, -160], [-180, 160], [180, 160]]) { g.block(x, 13, z, 50, 12, 50, C.white); g.ball(x, 30, z, 22, '#38C55A', { sy: 0.7 }); for (let k = 0; k < 3; k++) g.ball(x - 12 + k * 12, 40, z + 8 - k * 6, 5, [C.pink, C.lemon, C.lilac][k]); }
        for (const x of [-100, 100]) for (const z of [150, 175]) g.block(x, 13, z, 120, 10, 3, C.lemon);
        for (const z of [-50, 50]) { beamXY(g, -150, 13, 0, cy, z, 12, 12, C.white); beamXY(g, 150, 13, 0, cy, z, 12, 12, C.white); beamXY(g, -90, 110, 90, 110, z, 6, 6, C.white); }
        g.cyl(0, cy - 60, 0, 18, 18, 120, 10, C.gold, { rx: PI / 2 });
        for (const z of [-15, 15]) torus(g, 0, cy, z, R, 7, 4, 24, C.hot);
        torus(g, 0, cy, 0, 90, 5, 3, 16, C.sky);
        const GC = [C.pink, C.sky, C.lemon, C.mint, C.lilac, C.orange];
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * 2 * PI, x = Math.cos(a) * R, y = cy + Math.sin(a) * R;
          beamXY(g, 0, cy, x, y, 0, 5, 30, C.white);
          g.block(x, y - 46, 0, 30, 28, 32, GC[i % 6]); g.block(x, y - 18, 0, 34, 4, 36, C.white); g.block(x, y - 14, 0, 3, 14, 3, '#C9CCD9');
        }
      } });
    // ---------- landmark ----------
    def('fun_castle', { hs: 0.62, w: 540, d: 500, h: 1000, points: 330, mass: 6000000,
      build(g) {
        const wall = '#FFD3E8', stone = '#FFF0F8', roofA = C.hot, roofB = '#3FB4FF', tower = '#C7A8FF';
        g.block(0, 0, 0, 540, 16, 500, C.cream);
        // curtain walls with crenellations
        for (const [x, z, w, d] of [[0, 205, 400, 30], [0, -205, 400, 30], [-225, 0, 30, 360], [225, 0, 30, 360]]) {
          g.block(x, 16, z, w, 150, d, wall);
          g.block(x, 160, z, w + 2, 6, d + 2, '#FF8FC5'); const n = 6; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n - 0.5; g.block(x + (w > d ? t * w : 0), 166, z + (w > d ? 0 : t * d), w > d ? 26 : w + 4, 18, w > d ? d + 4 : 26, '#FF8FC5'); }
        }
        // gate + drawbridge
        g.panel('z+', 0, 70, 220.4, 80, 108, '#6B4A7A'); g.ball(0, 124, 220.5, 40, '#6B4A7A', { sz: 0.05, sy: 0.6 }); g.block(0, 16, 238, 70, 4, 30, C.wood);
        g.block(0, 140, 222, 120, 16, 4, C.lemon);
        // corner towers
        for (const [x, z] of [[-225, -205], [225, -205], [-225, 205], [225, 205]]) {
          g.cyl(x, 16, z, 46, 50, 290, 10, tower); g.cyl(x, 300, z, 54, 54, 12, 10, C.white);
          g.cone(x, 312, z, 60, 190, 10, roofA); g.ball(x, 508, z, 9, C.gold); g.block(x + 12, 510, z, 22, 12, 1.5, C.lemon);
          g.panel('z+', x, 220, z + 47.5, 18, 32, C.glass); g.panel('z+', x, 130, z + 49, 18, 32, C.glass);
        }
        // keep
        g.block(0, 16, -20, 300, 290, 250, stone); g.windows(0, -20, 300, 250, 120, 270, 2, 5, C.glass, { fill: 0.4, fillY: 0.6 });
        g.block(0, 306, -20, 310, 12, 260, '#E2CCFF'); for (const x of [-155, 155]) g.block(x, 318, -20, 6, 10, 230, C.white); g.block(0, 16, 0, 420, 2, 380, '#BDEBC9');
        for (const [x, z] of [[-150, -145], [150, -145], [-150, 105], [150, 105]]) {
          g.cyl(x, 306, z, 34, 34, 170, 8, wall); g.cone(x, 476, z, 44, 150, 8, roofB); g.ball(x, 628, z, 7, C.gold);
          g.panel('z+', x, 420, z + 34.5, 14, 26, C.glass);
        }
        // great tower
        g.cyl(0, 318, -20, 82, 90, 330, 12, '#FFF6FA'); g.cyl(0, 648, -20, 96, 96, 14, 12, C.white);
        for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * PI; g.panel('z+', 0, 0, 0, 0.01, 0.01, C.white); g.box(Math.cos(a) * 92, 670, -20 + Math.sin(a) * 92, 22, 16, 22, C.white, { ry: -a }); }
        stripes(g, 0, 662, -20, 1, 100, 300, 12, roofA, '#FF8FC5');
        g.ball(0, 966, -20, 14, C.gold); g.block(0, 978, -20, 3, 22, 3, C.gold); g.block(16, 990, -20, 30, 16, 1.5, C.lemon);
        g.glowing(() => { for (const y of [400, 520]) g.panel('z+', 0, y, 69, 30, 50, '#FFF1A8'); });
        g.ball(0, 370, 236, 26, C.pink, { sz: 0.15 }); g.ball(0, 370, 238, 10, C.lemon, { sz: 0.15 });
      } });
  }

  HC.Levels.add({
    id: 'funland', num: 5, name: 'Funland', tagline: 'Candy theme park · rides, treats & a fairy-tale castle', icon: '🎡', colors: ['#FF5FA2', '#5CC8FF'],
    theme: { sky: '#A6E8FF', sun: '#FFF0E2', sunI: 2.35, hemiSky: '#F2FAFF', hemiGround: '#FFB8E2', hemi: 1.6,
      sea: { show: true, deep: '#2AA9F0', shallow: '#7DE8FF', foam: 1 }, skirt: '#F5CF85' },
    mods: { botSkill: -0.1 },
    milestones: [['fun_bumper', '🚗 Bumper cars'], ['fun_teacup', '☕ Teacups'], ['fun_engine', '🚂 The park train'], ['fun_coaster', '🎢 Coasters'],
      ['fun_pirate', '🏴‍☠️ Pirate ship'], ['fun_droptower', '🗼 Drop towers'], ['fun_shop', '🍩 Candy shops'], ['fun_carousel', '🎠 Carousels'], ['fun_funhouse', '🤡 Funhouses'],
      ['fun_hotel', '🏨 The resort'], ['fun_flume', '⛰️ Log flume'], ['fun_bigtop', '🎪 The big top'], ['fun_ferris', '🎡 Ferris wheel'], ['fun_castle', '🏰 THE CASTLE']],
    kinds,
    generate(T) {
      const rng = T.rng, CX = 2500, CZ = 2300;
      // Workaround: HC.Geo.strip winds its quads facing down (lit as back faces, so they look dark).
      // Probe the winding once and pass a negative width when needed, which mirrors the quad.
      const SW = (() => { const g = new HC.Geo(); g.strip(0, 0, 10, 0, 2, 0, '#FFFFFF'); const p = g.pos; return ((p[5] - p[2]) * (p[6] - p[0]) - (p[3] - p[0]) * (p[8] - p[2])) >= 0 ? 1 : -1; })();
      const strip = (x0, z0, x1, z1, w, y, color) => T.strip(x0, z0, x1, z1, w * SW, y, color);
      const tpath = (pts, w, y, color, closed = false) => { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; strip(a[0], a[1], b[0], b[1], w, y, color); T.disc(a[0], a[1], w / 2, y, color, 16); } if (!closed) { const e = pts[pts.length - 1]; T.disc(e[0], e[1], w / 2, y, color, 16); } };
      const pol = (r, deg) => [CX + r * Math.cos(deg * D), CZ + r * Math.sin(deg * D)];
      const rOut = (deg) => 1650 + 40 * Math.sin(4 * deg * D + 0.6);
      const faceC = (x, z) => Math.atan2(CX - x, CZ - z); // +z front faces the castle
      const tang = (deg) => Math.atan2(-Math.cos(deg * D), -Math.sin(deg * D)); // local +x along the ring
      const COL = { lawnA: '#86E0A0', lawnB: '#7DD898', plaza: '#FFE3F0', plazaRing: '#FFC2DF', moat: '#6FD3FF', moatEdge: '#FFFFFF', isle: '#F4ECFF',
        paths: ['#FFD9EC', '#E5DAFF', '#CFF5E6', '#FFF2B3', '#D3EEFF'], ring: '#FFF0A8', outer: '#FFD9EC', lot: '#8A90B8', ballast: '#E8D2B0', sleeper: '#B07A55', rail: '#7C6F96' };

      // Big objects: place + cover their whole footprint in the occupancy grid so scatter keeps out.
      const occRect = (x, z, w, d, rot, pad = 10) => {
        const c = Math.cos(rot), s = Math.sin(rot);
        const nu = Math.max(1, Math.ceil((w - 40) / 60)), nv = Math.max(1, Math.ceil((d - 40) / 60));
        for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const u = (i / nu - 0.5) * (w - 40), v = (j / nv - 0.5) * (d - 40); T.occupy(x + u * c + v * s, z - u * s + v * c, 42 + pad); }
        if (w < 60 || d < 60) T.occupy(x, z, Math.min(w, d) / 2 + pad);
      };
      const occDisc = (x, z, R, sx = 1) => { for (let u = -R * sx; u <= R * sx; u += 55) for (let v = -R; v <= R; v += 55) if ((u / sx) ** 2 + v * v <= R * R) T.occupy(x + u, z + v, 45); };
      const big = (kind, x, z, rot = 0) => { const k = HC.CATALOG[kind]; const o = T.put(kind, x, z, rot); occRect(x, z, k.w, k.d, rot); return o; };

      // ---- ground ----
      T.island({ ground: '#FFE3A1' });
      T.rect(-40, -40, 5040, 5040, 0, COL.lawnA);
      for (let i = 0; i < 26; i++) if (i % 2) T.rect(-40, -40 + i * 195.4, 5040, -40 + (i + 1) * 195.4, 0.2, COL.lawnB);

      // ---- path network ----
      const segs = [];
      const walk = (pts, w, color, closed = false, occ = true, y0 = 2.4) => {
        tpath(pts, w + 16, y0, COL.moatEdge, closed); tpath(pts, w, y0 + 0.2, color, closed);
        for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length]; segs.push([a, b, w / 2 + 8]);
          if (occ) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 40); for (let k = 0; k <= n; k++) T.occupy(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, w / 2 + 6); }
        }
      };
      // Props along a path's edges: lamps, bins, balloons, benches, flowerpots.
      const edgeProps = (pts, w, step, weights, closed = false) => {
        let side = 1;
        for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
          for (let s = step * 0.5; s < L - 20; s += step) {
            side = -side; const k = T.pick(weights); if (k === 'none') continue;
            const kd = HC.CATALOG[k], off = w / 2 + 9 + Math.max(kd.w, kd.d) / 2, x = a[0] + dx * s - dz * off * side, z = a[1] + dz * s + dx * off * side;
            if (!T.free(x, z, kd.radius * 0.75)) continue;
            T.put(k, x, z, k === 'bench' ? Math.atan2(dz * side, -dx * side) + PI / 2 : rng() * 6.28);
          }
        }
      };
      const EDGE = { lamp: 3, fun_trash: 3, fun_balloons: 3, bench: 2, flowerpot: 2, fun_kid: 1, none: 3 };
      const circle = (r, n, wob, deg0 = 0) => { const p = []; for (let i = 0; i < n; i++) { const a = deg0 + i / n * 360; p.push(pol(wob ? rOut(a) : r, a)); } return p; };

      // castle plaza + moat
      T.disc(CX, CZ, 600, 1.2, COL.plaza, 48); T.ring(CX, CZ, 560, 575, 1.4, COL.plazaRing, 48);
      for (let i = 0; i < 16; i++) { const [x, z] = pol(500, i * 22.5); T.disc(x, z, 18, 1.5, i % 2 ? '#FFC2DF' : '#FFF0A8', 12); }
      T.disc(CX, CZ, 432, 1.6, COL.moatEdge, 48); T.disc(CX, CZ, 422, 1.8, COL.moat, 48); T.disc(CX, CZ, 380, 2.0, COL.moatEdge, 48); T.disc(CX, CZ, 372, 2.2, COL.isle, 48);
      for (let i = 0; i < 4; i++) { const a = i * 90, [x0, z0] = pol(360, a), [x1, z1] = pol(600, a); strip(x0, z0, x1, z1, 80, 2.3, '#FFF6E8'); strip(x0, z0, x1, z1, 64, 2.35, '#E7B57E'); for (let k = 0; k <= 6; k++) T.occupy(x0 + (x1 - x0) * k / 6, z0 + (z1 - z0) * k / 6, 46); }
      big('fun_castle', CX, CZ, 0);
      occDisc(CX, CZ, 430);
      T.roamers('duck', CX, CZ + 401, 8, 2, { speed: [6, 10] }); T.roamers('duck', CX - 401, CZ, 8, 2, { speed: [6, 10] });

      // promenade ring, outer loop, spokes
      const hub = circle(640, 40, false);
      walk(hub, 90, COL.ring, true);
      const outer = circle(0, 64, true);
      walk(outer, 96, COL.outer, true);
      const spokes = [];
      for (let i = 0; i < 8; i++) {
        const th = i * 45, ro = rOut(th), pts = [];
        for (let k = 0; k <= 8; k++) { const t = k / 8, r = 640 + (ro - 640) * t, lat = 55 * Math.sin(t * 2 * PI) * (i % 2 ? 1 : -1); pts.push(pol(r, th + lat / r / D)); }
        spokes.push(pts); walk(pts, 74, COL.paths[i % 5], false, true, 2.5);
      }
      // side lanes: Spooky Lane (west), Coaster Walk (east), Main Street (north), entrance avenue (south)
      const westLane = [pol(rOut(210), 210), [700, 1320], [700, 3280], pol(rOut(150), 150)];
      const eastLane = [pol(rOut(-30), -30), [4330, 1320], [4330, 3280], pol(rOut(30), 30)];
      const mainSt = [[1100, 505], [3900, 505]];
      const avenue = [pol(rOut(90), 90), [CX, 4120], [CX, 4700]];
      walk(westLane, 64, '#E5DAFF'); walk(eastLane, 64, '#D3EEFF'); walk(mainSt, 50, '#FFD9EC'); walk(avenue, 120, '#FFF2B3');
      T.disc(CX, 4120, 150, 2.7, '#FFFFFF', 32); T.disc(CX, 4120, 140, 2.8, '#FFD9EC', 32); T.ring(CX, 4120, 90, 100, 2.9, '#FFF2B3', 32);
      occDisc(CX, 4120, 150);

      // ---- park train ----
      const TR0 = 170, TR1 = 4830, TRC = 380, track = [];
      for (const [cx, cz, a0] of [[TR1 - TRC, TR0 + TRC, -90], [TR1 - TRC, TR1 - TRC, 0], [TR0 + TRC, TR1 - TRC, 90], [TR0 + TRC, TR0 + TRC, 180]])
        for (let k = 0; k <= 6; k++) { const a = (a0 + k * 15) * D; track.push([cx + Math.cos(a) * TRC, cz + Math.sin(a) * TRC]); }
      tpath(track, 60, 2.4, COL.ballast, true);
      let tlen = 0;
      for (let i = 0; i < track.length; i++) {
        const a = track[i], b = track[(i + 1) % track.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L; tlen += L;
        for (let s = 10; s < L; s += 38) { const x = a[0] + dx * s, z = a[1] + dz * s; strip(x - dz * 24, z + dx * 24, x + dz * 24, z - dx * 24, 7, 2.6, COL.sleeper); T.occupy(x, z, 40); }
        for (const o of [-12, 12]) strip(a[0] - dz * o, a[1] + dx * o, b[0] - dz * o, b[1] + dx * o, 3.5, 2.8, COL.rail);
      }
      const trainLoop = { pts: track, kind: 'track' }; T.city.walkLoops.push(trainLoop);
      for (const t0 of [0.08, 0.58]) {
        const sp = 105, m = (t) => ({ mover: { type: 'walk', loop: trainLoop, t, dir: 1, speed: sp, lane: 0, bob: false } });
        T.put('fun_engine', 0, 0, 0, m(t0));
        for (let k = 1; k <= 4; k++) T.put('fun_carriage', 0, 0, 0, m(t0 - (78 + (k - 1) * 74) / tlen));
      }
      // station by the entrance
      T.rect(2280, 4725, 2720, 4790, 2.7, '#FFF6E8'); T.rect(2280, 4782, 2720, 4790, 2.8, '#FFE45C');
      for (const x of [2340, 2660]) T.put('busstop', x, 4760, PI);
      for (let k = 0; k < 6; k++) T.put(k % 2 ? 'fun_kid' : 'person', 2400 + k * 40, 4745, rng() * 6);

      // ---- parking lot (south) ----
      for (const [x0, x1] of [[1380, 2410], [2590, 3620]]) {
        T.rect(x0, 4230, x1, 4690, 2.4, COL.lot); occRect((x0 + x1) / 2, 4460, x1 - x0, 460, 0, 0);
        for (const zc of [4310, 4402, 4560, 4652]) for (let x = x0 + 30; x < x1 - 30; x += 54) {
          T.rect(x - 1.5, zc - 40, x + 1.5, zc + 40, 2.9, '#FFFFFF');
          const isBus = x0 > 2500 && zc === 4652 && x > x1 - 800;
          if (!isBus && x + 54 < x1 - 20 && rng.chance(0.88)) T.put(rng.chance(0.12) ? 'van' : 'car', x + 27, zc, PI / 2 + (zc < 4450 ? PI : 0) * (zc === 4310 || zc === 4560 ? 1 : 0));
        }
      }
      for (let k = 0; k < 3; k++) T.put('bus', 2990 + 60 + k * 240 - 60, 4652, 0);
      for (let k = 0; k < 10; k++) T.put('cone', 1400 + k * 20, 4482 + (k % 2) * 6);

      // ---- entrance ----
      for (const x of [2330, 2400, 2600, 2670]) T.put('fun_ticket', x, 4210, 0);
      for (let k = 0; k < 6; k++) { T.put('bollard', 2455 + k * 18, 4205); }
      for (let k = 0; k < 14; k++) T.put(T.pick({ person: 3, fun_kid: 2 }), 2390 + (k % 7) * 32 + (k > 6 ? 200 : 0), 4250 + (k % 3) * 12, rng() * 6);
      edgeProps(avenue, 120, 70, { fun_balloons: 3, lamp: 2, flowerpot: 3, fun_trash: 1 });

      // ---- the lands (8 sectors between the spokes) ----
      const queue = (x0, z0, x1, z1, sp = 16) => T.line(() => T.pick({ person: 3, fun_kid: 2 }), x0, z0, x1, z1, sp);
      const queueTo = (x, z, deg, len) => { const [ax, az] = [x, z], dx = Math.cos(deg * D), dz = Math.sin(deg * D); queue(ax, az, ax + dx * len, az + dz * len); };
      const shopsAt = (deg) => { for (const da of [-13, 13]) { const [x, z] = pol(1405, deg + da); big('fun_shop', x, z, faceC(x, z)); } };
      const cluster = (weights, x, z, r, n) => T.scatter(weights, { x, z, r }, n, { gap: 4 });
      const SECT = [
        (a) => { // Lagoon
          const [x, z] = pol(1120, a); T.disc(x, z, 200, 2.4, '#FFFFFF', 32, 1.12, 1); T.disc(x, z, 186, 2.6, '#5FD0F5', 32, 1.12, 1); T.disc(x + 40, z + 20, 44, 2.8, '#9BE8B0', 16);
          occDisc(x, z, 205, 1.12); T.put('blossom', x + 40, z + 20); T.roamers('duck', x - 60, z - 30, 90, 7, { speed: [10, 20] });
          for (let k = 0; k < 8; k++) { const b = k / 8 * 2 * PI; T.put(k % 2 ? 'bench' : 'lamp', x + Math.cos(b) * 245, z + Math.sin(b) * 222, -b + PI / 2 * 0 + (k % 2 ? Math.atan2(Math.cos(b), Math.sin(b)) + PI : 0)); }
          shopsAt(a); cluster({ cafeset: 2, fun_icecream: 1, fun_balloons: 2, person: 3 }, ...pol(1400, a), 120, 8);
        },
        (a) => { // Food court
          const [x, z] = pol(1080, a); T.disc(x, z, 250, 2.4, '#FFFFFF', 32); T.disc(x, z, 240, 2.5, '#FFF3C4', 32); T.ring(x, z, 200, 214, 2.6, '#FFC2DF', 32);
          big('kiosk', x, z - 10, faceC(x, z)); T.put('fountain', ...pol(1080, a + 9)); T.occupy(...pol(1080, a + 9), 60);
          for (let k = 0; k < 7; k++) { const b = k / 7 * 2 * PI + 0.3; T.put(['fun_popcorn', 'fun_cotton', 'fun_icecream', 'hotdog', 'fun_popcorn', 'fun_cotton', 'vending'][k], x + Math.cos(b) * 165, z + Math.sin(b) * 165, -b); }
          cluster({ cafeset: 4, person: 3, fun_kid: 2, fun_trash: 1 }, x, z, 235, 22);
          shopsAt(a);
        },
        (a) => { // Kiddie corner: carousel + teacups
          const [x, z] = pol(1000, a); T.disc(x, z, 112, 2.4, '#FFFFFF', 32); T.disc(x, z, 104, 2.5, '#E5DAFF', 32); big('fun_carousel', x, z, 0);
          queueTo(...pol(860, a + 6), a + 90, 90);
          teacups(...pol(1350, a));
          shopsAt(a);
        },
        (a) => { // Thrill west: pirate ship + drop tower
          const [x, z] = pol(1010, a); T.rect(x - 130, z - 70, x + 130, z + 70, 2.4, '#E5DAFF'); big('fun_pirate', x, z, 0); queue(x - 120, z + 90, x + 20, z + 90);
          const [tx, tz] = pol(1370, a); T.disc(tx, tz, 80, 2.4, '#FFD9EC', 24); big('fun_droptower', tx, tz, 0); queueTo(tx, tz + 90, 20, 100);
          shopsAt(a);
        },
        (a) => { // Teacup garden
          teacups(...pol(1040, a));
          shopsAt(a); cluster({ blossom: 2, bush: 3, flowerpot: 3, fun_kid: 2 }, ...pol(1400, a), 140, 12);
        },
        (a) => { // Carousel green
          const [x, z] = pol(1040, a); T.disc(x, z, 112, 2.4, '#FFFFFF', 32); T.disc(x, z, 104, 2.5, '#CFF5E6', 32); big('fun_carousel', x, z, 0);
          queueTo(...pol(890, a - 8), a - 90, 80);
          shopsAt(a); cluster({ fun_mascot: 1, fun_kid: 3, person: 2, fun_balloons: 2 }, ...pol(1380, a), 130, 10);
        },
        (a) => { // Thrill north: drop tower + pirate ship
          const [x, z] = pol(980, a); T.rect(x - 130, z - 70, x + 130, z + 70, 2.4, '#D3EEFF'); big('fun_pirate', x, z, 0); queue(x - 120, z + 90, x + 20, z + 90);
          const [tx, tz] = pol(1360, a); T.disc(tx, tz, 80, 2.4, '#FFD9EC', 24); big('fun_droptower', tx, tz, 0); queueTo(tx - 90, tz + 30, 160, 100);
          shopsAt(a);
        },
        (a) => { // Bumper cars
          const [x, z] = pol(1110, a);
          T.rect(x - 186, z - 126, x + 186, z + 126, 2.4, '#FFFFFF'); T.rect(x - 178, z - 118, x + 178, z + 118, 2.5, '#FFE45C'); T.rect(x - 168, z - 108, x + 168, z + 108, 2.6, '#7D6FB5');
          for (let i = 0; i < 6; i++) T.rect(x - 168 + i * 56, z - 108, x - 140 + i * 56, z + 108, 2.7, '#8A7CC4');
          occRect(x, z, 372, 252, 0, 0);
          T.line('fence', x - 182, z - 132, x + 182, z - 132, 31); T.line('fence', x - 182, z + 132, x + 182, z + 132, 31, { gapAt: 182, gapW: 70 });
          T.line('fence', x - 192, z - 126, x - 192, z + 126, 31); T.line('fence', x + 192, z - 126, x + 192, z + 126, 31);
          T.roamers('fun_bumper', x, z, 88, 10, { speed: [40, 75], bob: false });
          queue(x + 30, z + 150, x + 150, z + 150);
          shopsAt(a);
        },
      ];
      function teacups(x, z) {
        T.disc(x, z, 134, 2.4, '#FFFFFF', 32); T.disc(x, z, 126, 2.5, '#FFB8DA', 32);
        for (let i = 0; i < 12; i++) T.disc(x + Math.cos(i * PI / 6) * 108, z + Math.sin(i * PI / 6) * 108, 12, 2.7, '#FFFFFF', 10);
        T.disc(x, z, 26, 2.7, '#FFE45C', 16); occDisc(x, z, 136);
        T.roamers('fun_teacup', x, z, 80, 6, { speed: [30, 50], bob: false });
        for (let k = 0; k < 4; k++) { const b = k * PI / 2 + PI / 4; T.put('lamp', x + Math.cos(b) * 150, z + Math.sin(b) * 150, b); }
      }
      for (let s = 0; s < 8; s++) { const a = (s + 0.5) * 45; SECT[s](a); if (s !== 1) { const [x, z] = pol(790, a); big('fun_shop', x, z, faceC(x, z)); } }

      // ---- edges of the park ----
      // north: Main Street candy shops
      for (let i = 0; i < 9; i++) big('fun_shop', 1250 + i * 300, 380, 0);
      edgeProps(mainSt, 50, 75, { lamp: 2, fun_balloons: 2, bench: 2, flowerpot: 2, fun_popcorn: 1, fun_trash: 2 });
      // north-west: the big top; north-east: the ferris wheel
      T.disc(800, 720, 230, 2.4, '#FFF3C4', 40); big('fun_bigtop', 800, 720, 0);
      T.rect(3940, 500, 4420, 940, 2.4, '#FFD9EC'); big('fun_ferris', 4180, 720, 0);
      queue(4000, 960, 4180, 960); queue(780, 950, 780, 1080, 15);
      // west: Spooky Lane
      big('fun_haunted', 470, 1360, PI / 2); big('fun_funhouse', 470, 1980, PI / 2); big('fun_haunted', 470, 2620, PI / 2); big('fun_funhouse', 470, 3250, PI / 2);
      for (const z of [1360, 2620]) for (let k = 0; k < 6; k++) T.put('pumpkin', 625, z - 100 + k * 40);
      edgeProps(westLane, 64, 80, { lamp: 2, fun_trash: 1, fun_balloons: 1, bench: 1, pumpkin: 2, none: 1 });
      // east: the queue for the big coaster (built at the end, over the top of everything)
      // the ghost coaster rattles along behind Spooky Lane
      for (let i = 0; i < 9; i++) big('fun_coaster', 285, 1300 + i * 242, PI / 2);
      big('kiosk', 4390, 1150, -PI / 2); queue(4400, 1210, 4400, 1400, 16);
      edgeProps(eastLane, 64, 80, { lamp: 2, fun_trash: 1, fun_balloons: 2, bench: 2, fun_cotton: 1, none: 1 });
      // south-west: resort hotel + pool; south-east: log flume + splash pool
      big('fun_hotel', 780, 4200, 0);
      T.rect(620, 4470, 940, 4650, 2.4, '#FFFFFF'); T.rect(640, 4490, 920, 4630, 2.6, '#4DD6FF'); occRect(780, 4560, 320, 180, 0, 0);
      for (let k = 0; k < 6; k++) T.put(k % 2 ? 'parasol' : 'beachball', 980 + (k % 2) * 40, 4480 + k * 28);
      T.put('beachball', 720, 4540); T.put('beachball', 840, 4580);
      big('fun_flume', 4230, 4170, 0);
      T.disc(4230, 4495, 170, 2.4, '#FFFFFF', 32, 1.3, 1); T.disc(4230, 4495, 158, 2.6, '#5FD0F5', 32, 1.3, 1); occDisc(4230, 4495, 170, 1.3);
      T.roamers('duck', 4230, 4495, 110, 5, { speed: [10, 18] });

      // a kiddie coaster along the south lawn, either side of the entrance
      for (const x0 of [1570, 3430]) for (let k = 0; k < 3; k++) big('fun_coaster', x0 + (x0 < CX ? 1 : -1) * k * 242, 4110, 0);
      // corner lots between the outer loop and the big attractions
      big('fun_funhouse', 1250, 830, faceC(1250, 830)); big('fun_haunted', 3750, 830, faceC(3750, 830));
      big('fun_haunted', 1240, 3800, faceC(1240, 3800)); big('fun_funhouse', 3760, 3800, faceC(3760, 3800));

      // ---- plaza dressing ----
      for (let i = 0; i < 4; i++) { const a = 45 + i * 90, [x, z] = pol(505, a); T.put('fountain', x, z); T.occupy(x, z, 70); }
      for (let i = 0; i < 8; i++) { const a = 22.5 + i * 45, [x, z] = pol(505, a + (i % 2 ? 8 : -8)); T.put('blossom', x, z); }
      edgeProps(hub, 90, 85, EDGE, true);
      edgeProps(outer, 96, 95, EDGE, true);
      for (const sp of spokes) edgeProps(sp, 74, 90, EDGE);

      // ---- life ----
      const CROWD = { person: 6, fun_kid: 4, fun_mascot: 0.5, fun_balloonman: 0.5 };
      T.walkLoop(hub, 34, CROWD, { speed: [30, 50] });
      T.walkLoop(outer, 46, CROWD, { speed: [30, 50] });
      for (const sp of spokes) T.walkLoop(sp.concat(sp.slice(1, -1).reverse()), 4, CROWD, { speed: [30, 50], lane: 0 });
      T.walkLoop(westLane.concat(westLane.slice(1, -1).reverse()), 4, CROWD, { lane: 0 });
      T.walkLoop(eastLane.concat(eastLane.slice(1, -1).reverse()), 4, CROWD, { lane: 0 });
      T.walkLoop([[1100, 505], [3900, 505], [3900, 520], [1100, 520]], 6, CROWD, { lane: 0 });
      T.walkLoop(avenue.concat(avenue.slice(1, -1).reverse()), 6, CROWD);

      // ---- spawns, each with a little cloud of snacks around it ----
      const spawns = [pol(640, 45), pol(640, 135), pol(640, 225), pol(640, 315)];
      for (let i = 0; i < 8; i++) spawns.push(pol(rOut(i * 45 + 22.5), i * 45 + 22.5));
      spawns.push([CX, 4120], [CX, 505], [700, 2300], [4330, 2300]);
      for (const [x, z] of spawns) { T.spawnAt(x, z); cluster({ fun_kid: 3, person: 3, fun_balloons: 2, fun_trash: 1, flowerpot: 1 }, x, z, 230, 12); }

      // ---- greenery + scatter fill over every open lawn ----
      const inPlay = (x, z) => x < 230 || x > 4770 || z < 230 || z > 4770;
      T.scatter({ parktree: 1.3, blossom: 1.3, bush: 4, flowerpot: 2, fun_balloons: 1, fun_kid: 2, person: 2, bench: 1, fun_trash: 1, fun_popcorn: 0.35, fun_cotton: 0.35, fun_icecream: 0.35, cafeset: 0.4 }, { x0: 240, z0: 240, x1: 4760, z1: 4760 }, 1180, { gap: 10, avoid: inPlay });
      T.beach({ parasol: 3, beachball: 3, person: 3, fun_balloons: 1 }, 50);

      // ---- THE BIG COASTER (east side) ----
      // Station on Coaster Walk, a chain lift to 600, a screaming drop, airtime hill, a vertical loop by
      // the castle plaza, then a swoop back south. The circuit spans ~1450 × 2430 units.
      const CP = [
        [4560, 3330, 40], [4560, 3130, 40], [4560, 2950, 55], [4560, 2520, 320], [4560, 2120, 590], [4545, 1960, 610],
        [4470, 1780, 330], [4300, 1480, 45], [3980, 1230, 140], [3620, 1130, 400], [3270, 1270, 210], [3155, 1620, 50],
        [3160, 1950, 45], [3175, 2110, 200], [3192, 1950, 360], [3208, 1790, 200], [3225, 1950, 45],
        [3260, 2250, 70], [3330, 2650, 290], [3560, 3020, 110], [3900, 3330, 200], [4250, 3520, 60], [4520, 3560, 40],
      ];
      const cd = HC.Coaster.layout(T, CP, { lift: [2, 5], station: [22, 1], stop: 0 });
      // Clear anything the track would run through, and anything standing where a support goes.
      const objs = T.city.objects, keep = [];
      const hits = (o, k) => {
        for (const [x, z, y] of cd.samples) if (Math.abs(x - o.x) < 300 && Math.abs(z - o.z) < 300 && Math.hypot(x - o.x, z - o.z) < k.radius * 0.75 + 24 && k.h > y - 34) return true;
        for (const p of cd.posts) if (Math.hypot(p.x - o.x, p.z - o.z) < k.radius * 0.7 + 12) return true;
        return false;
      };
      for (const o of objs) { const k = HC.CATALOG[o.kind]; if (o.mover || o.kind === 'coaster_rail' || o.kind === 'coaster_car' || !hits(o, k)) keep.push(o); }
      objs.length = 0; for (const o of keep) objs.push(o);
      // Station platform, queue and riders waiting.
      T.rect(4500, 3170, 4620, 3380, 2.9, '#FFFFFF'); T.rect(4508, 3178, 4612, 3372, 3.0, '#FFD9EC');
      for (let k = 0; k < 8; k++) T.put(T.pick({ person: 3, fun_kid: 2 }), 4640, 3190 + k * 22, PI);
      T.put('fun_ticket', 4660, 3400, PI);
    },
  });
})();
