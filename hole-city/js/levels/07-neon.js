// Level 7 — Neon Ward: a cozy neon night district. An L-shaped canal with little red bridges splits
// the island into three quarters: a dense night-market street grid (south-east), the old-town
// lanes and the temple garden with the giant glowing pagoda (north), and the tower quarter ringed by
// an elevated-style train loop (west). Everything that glows is drawn inside g.glowing().
(function () {
  const N = { pink: '#FF3FA4', cyan: '#36E8FF', violet: '#B07CFF', lemon: '#FFE45C', orange: '#FF9A3D', lime: '#7DFF7A', red: '#FF3B3B',
    warm: '#FFD98A', paper: '#FFE9B8', ink: '#2B2D42', dark: '#2A2547', wood: '#7A4A33', wood2: '#5A3E2B', stone: '#B4B0C8', stone2: '#8F8AA8', lacquer: '#E0353F', roof: '#2C3A63' };
  const NEON = [N.pink, N.cyan, N.lemon, N.violet, N.lime, N.orange];
  const LANTERN = ['#FF3B30', '#FF7A2E', '#FF4F9A', '#FFC93C'];
  const GLASS = '#7FB8E8';
  const COL = {
    sand: '#CDAA94', base: '#5E5498', road: '#2F2A5C', line: '#FF6FD8', zebra: '#EDE8FF', curb: '#4E4682', walk: '#A094DA',
    block: '#A86A9E', blockB: '#9468B2', lane: '#E6BFD9', town: '#6E5F9C', moss: '#4FA683', gravel: '#DCD4F0', gravelB: '#CFC6EA', path: '#F6EEFF',
    pondEdge: '#B3AECB', pond: '#3D8CF0', canalEdge: '#A39DC2', canal: '#3A84EA', glint: '#A8D8FF', plaza: '#6A78C2', alley: '#B9AEE8',
    ballast: '#45407A', rail: '#E0DAF6', market: '#C66F86', marketB: '#B8637D', lot: '#57508A', pool: '#A98BC8',
  };

  // Many-lit windows on all four faces (night buildings glow from inside).
  function litWin(g, w, d, y0, y1, rows, cols, dark, lits, p, seed) {
    const ww = (w / cols) * 0.56, dw = (d / cols) * 0.56, hh = ((y1 - y0) / rows) * 0.56;
    for (let r = 0; r < rows; r++) {
      const y = y0 + (r + 0.5) * (y1 - y0) / rows;
      for (let c = 0; c < cols; c++) {
        const fx = -w / 2 + (c + 0.5) * w / cols, fz = -d / 2 + (c + 0.5) * d / cols;
        for (let f = 0; f < 4; f++) {
          const hsh = ((r * 73 + c * 151 + f * 37 + (seed || 0) * 11) % 100) / 100, lit = hsh < p, col = lit ? lits[(r + c + f) % lits.length] : dark;
          const put = () => {
            if (f === 0) g.panel('z+', fx, y, d / 2 + 0.6, ww, hh, col); else if (f === 1) g.panel('z-', fx, y, -d / 2 - 0.6, ww, hh, col);
            else if (f === 2) g.panel('x+', w / 2 + 0.6, y, fz, dw, hh, col); else g.panel('x-', -w / 2 - 0.6, y, fz, dw, hh, col);
          };
          if (lit) g.glowing(put); else put();
        }
      }
    }
  }

  // Neon outline around a flat roof (reads beautifully from the top-down camera).
  function outline(g, cx, cz, w, d, y, col, o = {}) {
    g.glowing(() => { const t = o.t || 3, hh = o.h || 3;
      g.block(cx, y, cz - d / 2, w, hh, t, col, o); g.block(cx, y, cz + d / 2, w, hh, t, col, o); g.block(cx - w / 2, y, cz, t, hh, d, col, o); g.block(cx + w / 2, y, cz, t, hh, d, col, o); });
  }

  function kinds(def) {
    // ---------- tiny (1 pt) ----------
    def('neon_lantern', { w: 10, d: 10, h: 24, points: 1, mass: 4, tints: LANTERN,
      build(g) { g.block(0, 0, 0, 7, 1.5, 7, N.ink); g.block(0, 0, 0, 1.6, 12, 1.6, N.wood2);
        g.cyl(0, 10.8, 0, 2.4, 2.4, 1.4, 8, N.ink); g.cyl(0, 22.4, 0, 2.4, 2.4, 1.4, 8, N.ink);
        g.glowing(() => g.ball(0, 17.2, 0, 4.6, '#FFF', { tint: true, sy: 1.22, detail: 1 })); g.block(0, 8.6, 0, 1, 2.4, 1, '#FFD23F'); } });
    def('neon_stool', { w: 10, d: 10, h: 12, points: 1, mass: 3, tints: ['#FF4F5E', '#36C9E8', '#FFC93C', '#B07CFF'],
      build(g) { for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) g.block(x, 0, z, 1.3, 10, 1.3, '#C9CCD9'); g.block(0, 4, 0, 7, 1, 7, '#C9CCD9');
        g.cyl(0, 10, 0, 5, 4.6, 2.2, 10, '#FFF', { tint: true }); } });
    def('neon_cat', { w: 10, d: 9, h: 15, points: 1, mass: 2, tints: ['#FFFFFF', '#FFD86B', '#FFB3D1'],
      build(g) { g.ball(0, 4.4, 0, 4.4, '#FFF', { tint: true, sy: 1.0 }); g.ball(0, 10.4, 0.6, 3.7, '#FFF', { tint: true });
        g.cone(-2.2, 12.8, 0.6, 1.4, 2.6, 4, '#FFF', { tint: true }); g.cone(2.2, 12.8, 0.6, 1.4, 2.6, 4, '#FFF', { tint: true });
        g.block(3.8, 8.6, 1.4, 1.8, 5.5, 1.8, '#FFF', { tint: true }); g.block(0, 6.9, 3.4, 5, 1.2, 1.2, '#FF3B3B');
        g.glowing(() => g.ball(0, 6, 4, 1.4, '#FFD23F')); g.ball(-1.3, 10.8, 4, 0.6, N.ink); g.ball(1.3, 10.8, 4, 0.6, N.ink); } });
    def('neon_aboard', { w: 14, d: 9, h: 20, points: 1, mass: 5, tints: NEON,
      build(g) { g.block(0, 0, -2.2, 13, 19, 1.2, N.dark, { rx: -0.2 }); g.block(0, 0, 2.2, 13, 19, 1.2, N.dark, { rx: 0.2 });
        g.glowing(() => { g.box(0, 9.8, 3.3, 10.5, 14, 0.4, '#FFF', { tint: true, rx: 0.2 }); g.box(0, 9.8, -3.3, 10.5, 14, 0.4, '#FFF', { tint: true, rx: -0.2 }); });
        g.box(0, 12, 3.6, 7, 1.6, 0.4, '#FFFFFF', { rx: 0.2 }); g.box(0, 8, 3.0, 5, 1.6, 0.4, '#FFFFFF', { rx: 0.2 }); } });

    // ---------- small props (2 pt) ----------
    def('neon_stonelantern', { w: 16, d: 16, h: 34, points: 2, mass: 150,
      build(g) { g.block(0, 0, 0, 14, 3, 14, N.stone2); g.cyl(0, 3, 0, 3, 3.6, 12, 6, N.stone); g.block(0, 15, 0, 13, 3, 13, N.stone2);
        g.block(0, 18, 0, 9, 8, 9, N.stone);
        g.glowing(() => { g.panel('z+', 0, 22, 4.6, 5, 5, '#FFC85A'); g.panel('z-', 0, 22, -4.6, 5, 5, '#FFC85A'); g.panel('x+', 4.6, 22, 0, 5, 5, '#FFC85A'); g.panel('x-', -4.6, 22, 0, 5, 5, '#FFC85A'); });
        g.cone(0, 26, 0, 11, 6, 4, N.stone2, { ry: Math.PI / 4 }); g.ball(0, 32.5, 0, 1.8, N.stone); } });
    def('neon_vend', { w: 22, d: 16, h: 42, points: 2, mass: 250, tints: ['#FF3B5C', '#2F8BFF', '#F4F4FF', '#2ED573', '#FF9A3D'],
      build(g) { g.block(0, 0, 0, 22, 42, 16, '#FFF', { tint: true }); g.block(0, 42, 0, 23, 1.5, 17, N.ink);
        g.glowing(() => { g.panel('z+', 0, 29, 8.3, 18, 18, '#D6F7FF'); g.panel('z+', 0, 39.5, 8.3, 18, 3, '#FFFFFF');
          const bc = ['#FF3B3B', '#2F8BFF', '#FFC93C', '#2ED573'];
          for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.panel('z+', -6.6 + c * 4.4, 23 + r * 5.5, 8.5, 2.4, 3.6, bc[(r + c) % 4]); });
        g.panel('z+', 0, 8, 8.3, 14, 5, '#1B1D2E'); g.panel('z+', 7, 16, 8.3, 3, 4, '#C9CCD9'); } });
    def('neon_lamp', { w: 12, d: 12, h: 74, points: 2, mass: 120,
      build(g) { g.cyl(0, 0, 0, 5, 5.5, 3, 8, N.ink); g.cyl(0, 0, 0, 1.8, 2.4, 62, 6, '#3C3A5E');
        g.glowing(() => g.cyl(0, 61, 0, 5.4, 4.2, 8, 6, '#FFEBB0')); g.cone(0, 69, 0, 6.2, 4.5, 6, N.ink); g.ball(0, 73.5, 0, 1.2, N.ink);
        g.glowing(() => { g.block(4.5, 40, 0, 2, 16, 6, N.pink); }); } });

    // ---------- trees & small structures (3–8 pt) ----------
    def('neon_pine', { w: 36, d: 30, h: 82, points: 4, mass: 400,
      build(g) { g.cyl(-2, 0, 0, 3, 4.5, 44, 6, '#6B4A3A', { rz: 0.18 }); g.cyl(4, 34, 2, 2.4, 3, 26, 6, '#6B4A3A', { rz: -0.5 });
        g.ball(-7, 44, -2, 12, '#2E8B60', { sy: 0.42, sx: 1.2 }); g.ball(10, 56, 4, 10, '#3BA272', { sy: 0.42, sx: 1.2 }); g.ball(-2, 70, -1, 9, '#2E8B60', { sy: 0.45, sx: 1.25 });
        g.ball(-12, 54, 5, 7, '#3BA272', { sy: 0.45 }); g.block(0, 0, 0, 20, 1.5, 20, '#5A4A40'); } });
    def('neon_torii', { w: 76, d: 16, h: 68, points: 4, mass: 300,
      build(g) { for (const x of [-27, 27]) { g.cyl(x, 0, 0, 3.4, 4, 60, 8, N.lacquer); g.block(x, 0, 0, 10, 6, 14, N.ink); }
        g.block(0, 46, 0, 64, 3.5, 5, N.lacquer); g.block(0, 57, 0, 70, 3.5, 7, N.lacquer); g.block(0, 60.5, 0, 74, 4, 8, N.ink);
        g.block(-35, 61, 0, 6, 3, 8, N.ink, { rz: 0.3 }); g.block(35, 61, 0, 6, 3, 8, N.ink, { rz: -0.3 }); g.block(0, 49.5, 0, 3, 8, 3, N.lacquer);
        g.glowing(() => g.block(0, 50, 1.8, 7, 6, 1, '#FFD23F')); } });
    def('neon_ramencart', { w: 62, d: 36, h: 58, points: 4, mass: 250,
      build(g) { g.block(0, 8, 0, 48, 22, 30, '#A33A2E'); g.block(0, 30, 0, 52, 3, 34, '#C98B62');
        for (const z of [-16.5, 16.5]) g.cyl(-8, 6.5, z, 8, 8, 3, 10, N.ink, { rx: Math.PI / 2 });
        g.block(27, 14, -9, 10, 2, 2, N.wood2); g.block(27, 14, 9, 10, 2, 2, N.wood2);
        for (const [x, z] of [[-22, -14], [22, -14], [-22, 14], [22, 14]]) g.block(x, 33, z, 2, 17, 2, N.wood2);
        g.gable(0, 49, 0, 56, 36, 8, '#3A2A1E'); g.panel('z+', 0, 45, 17.4, 46, 7, '#20306A'); g.panel('z+', 0, 19, 15.3, 30, 10, '#FFE3A1');
        for (const x of [-12, 0, 12]) { g.cyl(x, 33, -4, 4.5, 3.5, 3.5, 8, '#FFFFFF'); g.cyl(x, 36.4, -4, 3.6, 3.6, 0.4, 8, '#FFB45E'); }
        g.glowing(() => { g.ball(24, 40, 17, 4.4, N.red, { sy: 1.3 }); g.ball(-24, 40, 17, 4.4, N.red, { sy: 1.3 }); g.panel('z+', 0, 19, 15.4, 22, 6, '#FFF3C4'); }); } });
    def('neon_boat', { w: 66, d: 24, h: 18, points: 4, mass: 300, tints: ['#FF3B3B', '#FF4FA0', '#36C9E8', '#FFC93C'],
      build(g) { g.block(-2, 0, 0, 52, 7, 22, N.wood); g.block(24, 1, 0, 12, 6, 12, N.wood, { ry: Math.PI / 4 }); g.block(-2, 7, 0, 54, 2, 24, '#C98B62');
        g.glowing(() => g.block(0, 9, 0, 26, 4, 16, '#FFE3A1'));
        g.gable(0, 9, 0, 30, 22, 8, '#FFF', { tint: true }); g.block(-22, 9, 0, 6, 3, 10, N.wood2);
        g.block(26, 7, 0, 1.4, 9, 1.4, N.wood2); g.glowing(() => { g.ball(26, 14, 0, 3, '#FFB23C', { sy: 1.25 }); g.ball(-26, 12, 0, 2.6, '#FF4136', { sy: 1.25 }); }); } });
    def('neon_stall', { w: 64, d: 42, h: 58, points: 5, mass: 300, tints: ['#FF3B3B', '#FF4FA0', '#36C9E8', '#FFC93C', '#7DFF7A', '#B07CFF'],
      build(g) { g.block(0, 0, 6, 60, 22, 28, N.wood); g.block(0, 22, 6, 62, 2.5, 30, '#E0B58A'); g.block(0, 0, -15, 56, 30, 10, N.wood2);
        for (const [x, z] of [[-29, -19], [29, -19], [-29, 19], [29, 19]]) g.block(x, 0, z, 2.5, 46, 2.5, N.wood2);
        g.block(0, 46, 0, 64, 3, 42, '#FFF', { tint: true }); g.gable(0, 49, 0, 64, 42, 7, '#FFF', { tint: true });
        g.panel('z+', 0, 42.5, 21.3, 62, 6, '#FFFFFF');
        for (const x of [-16, 0, 16]) { g.cyl(x, 24.5, 4, 5, 4, 4, 8, '#C9CCD9'); }
        g.glowing(() => { for (const x of [-24, -8, 8, 24]) g.ball(x, 38, 20, 3.4, '#FF5A3B', { sy: 1.3 }); g.panel('z+', 0, 32, -9.8, 40, 8, '#FFF3C4'); g.panel('z+', 0, 11, 20.3, 50, 9, '#FFE3A1'); });
        for (const x of [-16, 0, 16]) g.ball(x, 29.5, 4, 3, '#FFFFFF', { sy: 0.6 }); } });
    def('neon_minicar', { w: 66, d: 38, h: 40, points: 5, mass: 900, tints: ['#FFB3C7', '#9FE7FF', '#FFE58A', '#B8F5A0', '#FFFFFF', '#C9B6FF', '#FF8C8C'], mover: 'drive',
      build(g) { g.block(0, 5, 0, 64, 18, 36, '#FFF', { tint: true }); g.block(-3, 23, 0, 48, 15, 34, '#FFF', { tint: true }); g.block(-3, 38, 0, 40, 1.5, 28, '#E9E4F2');
        g.panel('x+', 21.3, 31, 0, 28, 10, GLASS); g.panel('x-', -27.3, 31, 0, 28, 10, GLASS); g.panel('z+', -3, 31, 17.3, 40, 9, GLASS); g.panel('z-', -3, 31, -17.3, 40, 9, GLASS);
        for (const x of [-21, 21]) for (const z of [-17, 17]) g.cyl(x, 3.5, z, 5.5, 5.5, 4, 8, N.ink, { rx: Math.PI / 2 });
        g.block(0, 5, 0, 66, 3, 37, '#5A5A70');
        g.glowing(() => { g.panel('x+', 32.3, 14, 11, 7, 5, '#FFF7C2'); g.panel('x+', 32.3, 14, -11, 7, 5, '#FFF7C2'); g.panel('x-', -32.3, 14, 12, 5, 4, '#FF3B47'); g.panel('x-', -32.3, 14, -12, 5, 4, '#FF3B47'); }); } });
    def('neon_bridge', { w: 150, d: 46, h: 42, points: 8, mass: 4000,
      build(g) {
        const H = 22, NS = 6, y = (t) => H * (1 - (2 * t - 1) * (2 * t - 1)), X = (t) => -72 + 144 * t;
        for (let i = 0; i < NS; i++) {
          const t0 = i / NS, t1 = (i + 1) / NS, x0 = X(t0), x1 = X(t1), y0 = y(t0), y1 = y(t1), L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
          g.box((x0 + x1) / 2, (y0 + y1) / 2 + 2, 0, L + 1.5, 4, 40, N.lacquer, { rz: a }); g.box((x0 + x1) / 2, (y0 + y1) / 2 + 4.2, 0, L + 1.5, 0.6, 34, '#C98B62', { rz: a });
          for (const z of [-19, 19]) g.box((x0 + x1) / 2, (y0 + y1) / 2 + 14, z, L + 1, 2.4, 2.4, N.lacquer, { rz: a });
        }
        for (let i = 0; i <= NS; i++) { const t = i / NS; for (const z of [-19, 19]) { g.block(X(t), y(t) + 2, z, 3, 13, 3, N.lacquer); if (i === 0 || i === NS) g.ball(X(t), y(t) + 16, z, 2.2, '#FFC23F'); } }
        g.glowing(() => { for (const z of [-19, 19]) { g.ball(X(2 / 6), y(2 / 6) + 18, z, 3.2, '#FFB23C', { sy: 1.3 }); g.ball(X(4 / 6), y(4 / 6) + 18, z, 3.2, '#FFB23C', { sy: 1.3 }); } });
        for (const x of [-70, 70]) g.block(x, 0, 0, 12, 4, 46, N.stone2);
      } });
    def('neon_bigtorii', { w: 230, d: 60, h: 205, points: 15, mass: 20000,
      build(g) { for (const x of [-80, 80]) { g.cyl(x, 0, 0, 10, 12, 180, 10, N.lacquer); g.block(x, 0, 0, 28, 14, 28, N.ink);
          for (const z of [-24, 24]) { g.cyl(x, 0, z, 4, 4.5, 70, 6, N.lacquer); g.block(x, 0, z, 10, 8, 12, N.ink); } g.block(x, 52, 0, 6, 5, 50, N.lacquer); }
        g.block(0, 136, 0, 196, 10, 14, N.lacquer); g.block(0, 168, 0, 214, 10, 20, N.lacquer); g.block(0, 178, 0, 226, 12, 24, N.ink);
        g.block(-106, 180, 0, 20, 8, 24, N.ink, { rz: 0.3 }); g.block(106, 180, 0, 20, 8, 24, N.ink, { rz: -0.3 }); g.block(0, 146, 0, 8, 22, 8, N.lacquer);
        g.glowing(() => { g.block(0, 145, 4.5, 22, 18, 2, '#FFD23F'); for (const x of [-60, -20, 20, 60]) g.ball(x, 124, 0, 6, '#FF4136', { sy: 1.3 }); }); } });
    def('neon_train', { w: 200, d: 50, h: 60, points: 13, mass: 20000,
      build(g) { g.block(0, 8, 0, 196, 46, 48, '#ECEAF6'); g.block(0, 4, 0, 190, 6, 44, '#4A4470'); g.block(0, 54, 0, 186, 6, 40, '#B9B2D6');
        g.block(-50, 60, 0, 40, 3, 22, '#8F8AA8'); g.block(50, 60, 0, 40, 3, 22, '#8F8AA8');
        for (const x of [-70, 70]) g.block(x, 0, 0, 34, 8, 40, N.ink);
        g.glowing(() => { for (const s of [1, -1]) { for (let i = 0; i < 7; i++) g.panel(s > 0 ? 'z+' : 'z-', -78 + i * 26, 38, s * 24.3, 18, 13, '#FFF1B8');
            g.panel(s > 0 ? 'z+' : 'z-', 0, 22, s * 24.4, 196, 4, N.pink); g.panel(s > 0 ? 'z+' : 'z-', 0, 17, s * 24.4, 196, 2, N.cyan); }
          for (const s of [1, -1]) { g.panel(s > 0 ? 'x+' : 'x-', s * 98.3, 38, 0, 34, 14, '#FFF1B8'); g.panel(s > 0 ? 'x+' : 'x-', s * 98.4, 16, 15, 6, 5, '#FFF7C2'); g.panel(s > 0 ? 'x+' : 'x-', s * 98.4, 16, -15, 6, 5, '#FFF7C2'); } }); } });

    // ---------- buildings ----------
    def('neon_shophouse', { w: 130, d: 120, h: 176, points: 20, mass: 40000, tints: NEON,
      build(g) { g.block(0, 0, -4, 128, 150, 110, '#A9A3C4', { tint: true }); g.block(0, 0, -4, 130, 4, 112, '#5A5478');
        g.panel('z+', 0, 20, 51.4, 108, 34, '#3A3050');
        g.glowing(() => { g.panel('z+', -14, 20, 51.6, 70, 30, N.paper); g.panel('z+', 0, 54, 51.6, 104, 13, '#FFF', { tint: true }); g.block(50, 66, 57, 12, 70, 6, N.lemon);
          for (const x of [-48, -24, 0, 24, 48]) g.ball(x, 37, 58, 3, '#FF5A3B', { sy: 1.3 }); });
        for (let i = 0; i < 4; i++) g.panel('z+', 50, 76 + i * 16, 60.2, 7, 9, N.ink);
        g.panel('z+', 40, 20, 51.6, 18, 32, '#5A3E2B'); g.block(0, 42, 55, 128, 3, 8, '#FFFFFF');
        litWin(g, 128, 110, 70, 146, 2, 3, '#3D3A66', ['#FFD98A', '#FFF3C4', '#FFB9E0'], 0.65, 3);
        g.block(0, 98, 52, 100, 2.5, 6, '#7F7A99'); g.block(0, 150, -4, 132, 6, 114, '#7F7A99');
        g.block(0, 150, -4, 122, 7, 104, '#D9D2F2', { tint: true }); outline(g, 0, -4, 130, 112, 156, '#FFF', { tint: true });
        g.cyl(-36, 157, -30, 12, 12, 18, 8, '#C9CCD9'); g.block(28, 157, -24, 26, 12, 22, '#9A96B0'); g.glowing(() => g.ball(28, 172, -24, 3, N.red)); } });
    def('neon_izakaya', { w: 150, d: 136, h: 120, points: 22, mass: 50000, tints: ['#20306A', '#B3202A', '#F4F1FA', '#2E6B4A'],
      build(g) { g.block(0, 0, 0, 146, 8, 128, '#6E6A80'); g.block(0, 8, 0, 140, 62, 120, '#8A5A3B');
        for (const x of [-68, -24, 24, 68]) g.block(x, 8, 61, 5, 62, 3, '#5A3E2B');
        g.gable(0, 70, 0, 156, 136, 40, '#4A5888'); g.block(0, 106, 0, 150, 6, 8, '#262A3E');
        g.glowing(() => { g.block(0, 110, 0, 146, 3, 4, '#FFB23C'); for (let i = 0; i < 8; i++) { const x = -66 + i * 18.9; g.ball(x, 66, 69, 3.4, i % 2 ? '#FF3B30' : '#FFB23C', { sy: 1.3 }); g.ball(x, 66, -69, 3.4, i % 2 ? '#FFB23C' : '#FF3B30', { sy: 1.3 }); } });
        g.panel('z+', 0, 30, 60.4, 34, 44, '#3A2A1E'); g.panel('z+', 0, 46, 60.7, 34, 16, '#FFF', { tint: true });
        g.glowing(() => { g.panel('z+', -46, 38, 60.5, 34, 26, '#FFE3A1'); g.panel('z+', 46, 38, 60.5, 34, 26, '#FFE3A1');
          g.panel('x+', 70.4, 38, 0, 70, 24, '#FFE3A1'); g.panel('x-', -70.4, 38, 0, 70, 24, '#FFE3A1'); g.panel('z-', 0, 38, -60.4, 90, 24, '#FFE3A1');
          g.ball(-26, 50, 64, 7, '#FF3B30', { sy: 1.35 }); g.ball(26, 50, 64, 7, '#FF3B30', { sy: 1.35 }); g.block(0, 72, 64, 64, 12, 3, '#FFF5DA'); });
        for (let i = 0; i < 4; i++) g.panel('z+', -21 + i * 14, 78, 65.7, 8, 7, N.ink);
        g.cyl(-26, 59.5, 64, 3, 3, 1.5, 6, N.ink); g.cyl(26, 59.5, 64, 3, 3, 1.5, 6, N.ink); } });
    def('neon_shrine', { w: 170, d: 150, h: 134, points: 24, mass: 60000,
      build(g) { g.block(0, 0, 0, 170, 14, 150, N.stone2); g.block(0, 14, -8, 130, 60, 104, N.lacquer); g.block(0, 14, -8, 134, 6, 108, '#F4E9D8');
        for (const x of [-60, -20, 20, 60]) g.cyl(x, 14, 52, 4, 4, 62, 8, N.lacquer);
        g.gable(0, 74, -4, 176, 156, 48, '#3F5A8C'); g.block(0, 120, -4, 160, 7, 12, '#1E2440'); g.glowing(() => g.block(0, 127, -4, 156, 2.5, 5, '#FFC23F'));
        for (const x of [-80, 80]) g.block(x, 118, -4, 6, 16, 6, '#FFC23F', { rz: x > 0 ? -0.5 : 0.5 });
        g.block(0, 14, 60, 30, 12, 14, N.wood); g.cyl(0, 11, 56, 3, 3, 110, 6, '#E8D9A8', { rz: Math.PI / 2 });
        for (const x of [-36, -12, 12, 36]) g.panel('z+', x, 57, 59.2, 4, 9, '#FFFFFF');
        g.glowing(() => { g.panel('z+', 0, 42, 44.4, 90, 40, '#FFE3A1'); g.ball(-42, 60, 64, 6, '#FFF4D6', { sy: 1.4 }); g.ball(42, 60, 64, 6, '#FFF4D6', { sy: 1.4 });
          g.panel('x+', 65.4, 42, -8, 70, 30, '#FFE3A1'); g.panel('x-', -65.4, 42, -8, 70, 30, '#FFE3A1'); }); } });
    def('neon_arcade', { w: 190, d: 150, h: 188, points: 26, mass: 70000, tints: NEON,
      build(g) { g.block(0, 0, 0, 190, 130, 150, '#8F88B0', { tint: true }); g.block(0, 130, 0, 194, 6, 154, N.dark); g.block(0, 136, 0, 182, 1.5, 142, '#C9C0E8', { tint: true }); outline(g, 0, 0, 192, 152, 136, '#FFF', { tint: true, t: 4 });
        g.glowing(() => {
          g.panel('z+', 0, 28, 75.4, 150, 48, '#FFE6F6'); g.block(0, 62, 77, 190, 24, 6, '#FFF', { tint: true });
          for (let i = 0; i < 10; i++) { g.ball(-86 + i * 19, 89, 79, 2.5, N.lemon); g.ball(-86 + i * 19, 60, 79, 2.5, N.lemon); }
          const cc = [N.cyan, N.pink, N.lemon, N.lime];
          for (let i = 0; i < 6; i++) { g.panel('z+', -75 + i * 30, 110, 75.4, 22, 22, cc[i % 4]); g.panel('z-', -75 + i * 30, 100, -75.4, 22, 30, cc[(i + 1) % 4]); }
          for (let i = 0; i < 5; i++) { g.panel('x+', 95.4, 100, -60 + i * 30, 22, 30, cc[(i + 2) % 4]); g.panel('x-', -95.4, 100, -60 + i * 30, 22, 30, cc[(i + 3) % 4]); }
          g.cyl(0, 157, 10, 28, 28, 6, 14, N.lemon, { rx: Math.PI / 2 }); g.cyl(0, 157, 13.3, 18, 18, 1, 14, N.pink, { rx: Math.PI / 2 });
        });
        g.panel('z+', -50, 28, 75.6, 30, 40, '#3A3050'); g.panel('z+', 50, 28, 75.6, 30, 40, '#3A3050');
        for (const x of [-30, 30]) g.block(x, 136, 10, 4, 24, 4, N.ink); } });
    def('neon_capsule', { hs: 0.82, w: 240, d: 220, h: 400, points: 48, mass: 300000, tints: ['#FF8FCB', '#7FE3FF', '#B9A2FF', '#8FFFC9', '#FFC98F'],
      build(g) { g.block(0, 0, 0, 232, 340, 212, '#B8B0D6', { tint: true }); g.block(0, 340, 0, 238, 10, 218, N.dark); g.block(0, 350, 0, 226, 1.5, 206, '#9C94C8'); outline(g, 0, 0, 236, 216, 350, N.cyan, { t: 5, h: 4 });
        g.glowing(() => g.panel('z+', 0, 26, 106.4, 120, 44, '#FFF0D0'));
        litWin(g, 232, 212, 60, 330, 9, 6, '#3D3A66', ['#FFE7A8', '#C8F4FF', '#FFC8E8', '#FFF6D6'], 0.72, 5);
        g.glowing(() => { g.block(-104, 90, 108, 22, 220, 8, N.lemon); g.block(0, 50, 108, 232, 10, 4, N.cyan); g.block(0, 362, 0, 170, 38, 8, N.pink); g.block(0, 362, 4.4, 140, 14, 1, '#FFFFFF'); });
        for (let i = 0; i < 6; i++) g.panel('z+', -104, 110 + i * 34, 112.2, 12, 18, N.ink);
        for (const x of [-60, 60]) g.block(x, 350, 0, 6, 14, 6, N.ink); g.block(70, 350, -60, 50, 22, 50, '#9A96B0'); } });
    def('neon_karaoke', { hs: 0.84, w: 260, d: 230, h: 380, points: 50, mass: 320000,
      build(g) { g.block(0, 0, 0, 252, 300, 222, '#3A3466'); g.block(0, 300, 0, 258, 8, 228, '#26224A'); outline(g, 0, 0, 256, 226, 308, N.pink, { t: 6, h: 4 }); outline(g, 0, 0, 220, 190, 308, N.lemon, { t: 4, h: 2 });
        const cc = [N.pink, N.cyan, N.lemon, N.violet, N.lime, N.orange, N.pink];
        g.glowing(() => {
          for (let i = 0; i < 7; i++) {
            const y = 44 + i * 37, col = cc[i];
            for (let k = 0; k < 5; k++) { g.panel('z+', -100 + k * 50, y, 111.4, 40, 22, col); g.panel('z-', -100 + k * 50, y, -111.4, 40, 22, col);
              g.panel('x+', 126.4, y, -88 + k * 44, 34, 22, col); g.panel('x-', -126.4, y, -88 + k * 44, 34, 22, col); }
          }
          g.panel('z+', 0, 14, 111.4, 120, 24, '#FFF0D0');
          g.cyl(0, 308, 0, 9, 7, 40, 8, '#E9E4F2'); g.ball(0, 356, 0, 22, '#FF8FE0', { detail: 1 }); g.cyl(0, 340, 0, 15, 15, 6, 10, N.cyan);
        });
        g.block(0, 0, 118, 140, 4, 10, '#26224A'); } });
    def('neon_tower', { hs: 0.7, w: 330, d: 300, h: 712, points: 86, mass: 900000, tints: NEON,
      build(g) { g.block(0, 0, 0, 330, 80, 300, '#4A4470'); g.block(0, 80, 0, 290, 560, 260, '#2E3360');
        g.glowing(() => { g.panel('z+', 0, 36, 150.4, 260, 54, '#FFE9C8'); g.panel('x+', 165.4, 36, 0, 220, 54, '#FFE9C8'); g.panel('x-', -165.4, 36, 0, 220, 54, '#FFE9C8'); g.block(0, 72, 150, 330, 8, 6, '#FFF', { tint: true }); });
        litWin(g, 290, 260, 100, 630, 14, 7, '#3E4680', ['#CFE8FF', '#FFE7A8', '#FFFFFF'], 0.55, 9);
        g.glowing(() => {
          g.panel('z+', 0, 440, 130.9, 230, 150, '#FFF', { tint: true }); g.panel('z+', 0, 470, 131.2, 170, 30, '#FFFFFF'); g.panel('z+', -40, 415, 131.2, 70, 50, N.ink);
          g.panel('x+', 145.9, 300, 0, 180, 120, N.cyan); g.panel('x-', -145.9, 300, 0, 180, 120, N.pink); g.panel('x+', 146.2, 300, 0, 120, 24, '#FFFFFF');
          for (const [x, z] of [[-145, -130], [145, -130], [-145, 130], [145, 130]]) g.block(x, 80, z, 6, 560, 6, N.violet);
          g.block(0, 654, 0, 250, 20, 220, '#FFF', { tint: true });
          g.ball(90, 708, 70, 6, N.red);
        });
        g.block(0, 640, 0, 300, 14, 270, '#1E2240'); g.block(0, 674, 0, 230, 4, 200, '#3A3F6A'); g.glowing(() => { g.cyl(0, 678, 0, 70, 70, 1.5, 20, N.lemon); g.cyl(0, 678.2, 0, 60, 60, 1.6, 20, '#3A3F6A'); g.block(0, 678.4, 0, 12, 1.6, 50, N.lemon); g.block(-18, 678.4, 0, 6, 1.6, 50, N.lemon); g.block(18, 678.4, 0, 6, 1.6, 50, N.lemon); }); g.cyl(90, 678, 70, 3, 5, 26, 6, '#C9CCD9'); } });
    def('neon_skytower', { hs: 0.6, w: 400, d: 400, h: 1110, points: 140, mass: 2000000, tints: [N.cyan, N.pink, N.lime, N.lemon],
      build(g) { g.block(0, 0, 0, 400, 100, 400, '#4A4470'); g.block(0, 100, 0, 360, 520, 360, '#2B2F5E'); g.block(0, 620, 0, 290, 300, 290, '#353A70'); g.block(0, 920, 0, 190, 100, 190, '#2B2F5E');
        g.glowing(() => { for (const f of ['z+', 'z-']) g.panel(f, 0, 46, f === 'z+' ? 200.4 : -200.4, 300, 70, '#FFE9C8'); for (const f of ['x+', 'x-']) g.panel(f, f === 'x+' ? 200.4 : -200.4, 46, 0, 300, 70, '#FFE9C8'); });
        litWin(g, 360, 360, 130, 600, 12, 8, '#3A4280', ['#CFE8FF', '#FFE7A8', '#FFFFFF', '#FFC8E8'], 0.5, 2);
        litWin(g, 290, 290, 640, 900, 7, 6, '#3A4280', ['#CFE8FF', '#FFE7A8', '#FFFFFF'], 0.5, 6);
        g.glowing(() => {
          for (const [x, z] of [[-180, -180], [180, -180], [-180, 180], [180, 180]]) g.block(x, 100, z, 8, 520, 8, '#FFF', { tint: true });
          for (const [x, z] of [[-145, -145], [145, -145], [-145, 145], [145, 145]]) g.block(x, 620, z, 7, 300, 7, '#FFF', { tint: true });
          g.panel('z+', 0, 360, 180.9, 250, 170, N.pink); g.panel('z+', 0, 360, 181.2, 210, 120, N.violet); g.panel('z+', 0, 380, 181.5, 150, 30, '#FFFFFF'); g.panel('z+', 0, 330, 181.5, 100, 20, N.lemon);
          g.panel('x+', 180.9, 360, 0, 200, 140, N.cyan); g.panel('x-', -180.9, 360, 0, 200, 140, N.lime);
          g.ball(0, 1104, 0, 7, N.red);
        });
        g.cyl(0, 1020, 0, 4, 8, 82, 6, '#C9CCD9'); g.glowing(() => { g.cyl(0, 1022, 0, 80, 80, 1.5, 20, '#FFF', { tint: true }); g.cyl(0, 1022.2, 0, 66, 66, 1.6, 20, '#353A70'); }); outline(g, 0, 0, 366, 366, 612, '#FFF', { tint: true, t: 8, h: 10 }); outline(g, 0, 0, 296, 296, 912, '#FFF', { tint: true, t: 7, h: 10 }); outline(g, 0, 0, 196, 196, 1010, '#FFF', { tint: true, t: 6, h: 10 });
        g.block(0, 620, 0, 352, 1.5, 352, '#4A4F88'); g.block(0, 920, 0, 282, 1.5, 282, '#4A4F88'); } });
    // Supertalls: twice the pagoda's height, glowing bands all the way up.
    def('neon_needle', { w: 340, d: 340, h: 1800, points: 260, mass: 4000000, tints: ['#2B2F5E', '#352B66', '#23345E'],
      build(g) { HC.buildSupertall(g, { h: 1800, r: 150, seg: 24, glow: true, glass: N.cyan, lit: N.lemon, accent: N.pink, ledge: '#4A4470' }); } });
    def('neon_octa', { w: 340, d: 340, h: 1800, points: 260, mass: 4000000, tints: ['#2E3360', '#3A2B5E', '#26405E'],
      build(g) { HC.buildSupertall(g, { h: 1800, r: 150, seg: 8, twist: true, glow: true, glass: N.pink, lit: '#FFFFFF', accent: N.lime, ledge: '#4A4470' }); } });
    def('neon_pagoda', { hs: 0.66, w: 540, d: 540, h: 1360, points: 330, mass: 6000000,
      build(g) {
        g.block(0, 0, 0, 540, 30, 540, '#9A96B0'); g.block(0, 30, 0, 500, 14, 500, '#B4B0C8');
        for (const [x, z] of [[0, 255], [0, -255], [255, 0], [-255, 0]]) g.block(x, 0, z, x ? 30 : 120, 36, x ? 120 : 30, '#B4B0C8');
        const tiers = [[400, 210, 500, 60], [340, 180, 436, 54], [284, 160, 372, 48], [232, 145, 312, 44], [184, 130, 256, 40]];
        let y = 44;
        tiers.forEach(([bw, bh, rw, rh], i) => {
          g.block(0, y, 0, bw, bh, bw, '#E8414B'); g.block(0, y + bh - 16, 0, bw + 6, 16, bw + 6, '#F4E9D8');
          for (const s of [-1, 1]) for (const k of [-1, 1]) { g.block(s * bw * 0.48, y, k * bw * 0.48, 10, bh, 10, '#8E1F2A'); }
          g.glowing(() => {
            const ww = bw * 0.17, wh = bh * 0.42, wy = y + bh * 0.45;
            for (const k of [-1, 0, 1]) { g.panel('z+', k * bw * 0.28, wy, bw / 2 + 0.6, ww, wh, '#FFD27A'); g.panel('z-', k * bw * 0.28, wy, -bw / 2 - 0.6, ww, wh, '#FFD27A');
              g.panel('x+', bw / 2 + 0.6, wy, k * bw * 0.28, ww, wh, '#FFD27A'); g.panel('x-', -bw / 2 - 0.6, wy, k * bw * 0.28, ww, wh, '#FFD27A'); }
          });
          const ys = y + bh;
          g.block(0, ys, 0, rw, 10, rw, '#2A4A6A');
          g.cone(0, ys + 10, 0, rw * 0.66, rh, 4, '#3AA3A0', { ry: Math.PI / 4 });
          g.glowing(() => { const D = rw * 0.66, L = Math.hypot(D, rh), tilt = -Math.atan2(rh, D);
            for (let k = 0; k < 4; k++) { const th = -Math.PI / 4 + k * Math.PI / 2; g.box(Math.cos(th) * D / 2, ys + 10 + rh / 2 + 2, -Math.sin(th) * D / 2, L, 5, 5, '#FFC23F', { ry: th, rz: tilt }); } });
          g.glowing(() => {
            const h2 = rw / 2;
            g.block(0, ys + 3, h2, rw + 4, 5, 4, '#FFC23F'); g.block(0, ys + 3, -h2, rw + 4, 5, 4, '#FFC23F'); g.block(h2, ys + 3, 0, 4, 5, rw + 4, '#FFC23F'); g.block(-h2, ys + 3, 0, 4, 5, rw + 4, '#FFC23F');
            for (const s of [-1, 1]) for (const k of [-1, 1]) g.ball(s * h2 * 0.94, ys - 14, k * h2 * 0.94, 10 - i, '#FF4136', { sy: 1.35 });
            for (let q = -2; q <= 2; q++) { const a = q * h2 * 0.36; for (const [x, z] of [[a, h2 - 8], [a, -h2 + 8], [h2 - 8, a], [-h2 + 8, a]]) g.ball(x, ys + 14, z, 5.5, q % 2 ? '#FF5AA8' : '#FFB23C', { sy: 1.3 }); }
            if (i === 0) for (const k of [-0.45, 0, 0.45]) { g.ball(k * rw * 0.9, ys - 14, h2 * 0.97, 9, '#FF6A3D', { sy: 1.35 }); g.ball(k * rw * 0.9, ys - 14, -h2 * 0.97, 9, '#FF6A3D', { sy: 1.35 }); g.ball(h2 * 0.97, ys - 14, k * rw * 0.9, 9, '#FF6A3D', { sy: 1.35 }); g.ball(-h2 * 0.97, ys - 14, k * rw * 0.9, 9, '#FF6A3D', { sy: 1.35 }); }
          });
          for (const s of [-1, 1]) for (const k of [-1, 1]) g.block(s * rw * 0.5, ys + 4, k * rw * 0.5, 22, 10, 22, '#FFC23F', { ry: Math.PI / 4 });
          y = ys + 10 + rh * 0.45;
        });
        g.glowing(() => {
          g.cyl(0, y, 0, 7, 10, 290, 8, '#FFC23F');
          for (let k = 0; k < 8; k++) g.cyl(0, y + 70 + k * 22, 0, 26 - k * 1.5, 26 - k * 1.5, 5, 12, '#FFD86B');
          g.ball(0, y + 300, 0, 20, '#FF5AA8', { detail: 1 });
        });
      } });
  }

  // ----------------------------------------------------------------- layout
  const R = [1950, 2535, 3120, 3705, 4290, 4875], RW = 110;
  const CANAL = 1760, CW = 100;

  // Place a row of buildings along a lane. axis 'x' = lane runs along x at z = lane; 'z' = along z at x = lane.
  // side −1 = north/west of the lane, +1 = south/east. Buildings face the lane.
  function row(T, axis, a0, a1, lane, side, weights, o = {}) {
    const setback = o.setback ?? 10, gap = o.gap ?? 8;
    let a = a0;
    const out = [];
    while (a < a1) {
      let kind = T.pick(weights), k = HC.CATALOG[kind];
      if (a + k.w > a1) { kind = o.filler || 'neon_shophouse'; k = HC.CATALOG[kind]; if (a + k.w > a1) break; }
      const along = a + k.w / 2, perp = lane + side * (setback + k.d / 2);
      const rot = axis === 'x' ? (side < 0 ? 0 : Math.PI) : (side < 0 ? Math.PI / 2 : -Math.PI / 2);
      const x = axis === 'x' ? along : perp, z = axis === 'x' ? perp : along;
      T.put(kind, x, z, rot);
      out.push({ kind, along, w: k.w, front: lane + side * setback });
      a += k.w + gap + (o.extraGap ? T.rng.range(0, o.extraGap) : 0);
    }
    // Frontage clutter between the building fronts and the lane.
    if (o.front !== false) for (const b of out) {
      const at = (al, off) => axis === 'x' ? [al, lane + side * off] : [lane + side * off, al];
      const fr = setback - 9;
      const n = T.rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        const [x, z] = at(b.along + T.rng.range(-b.w / 2 + 8, b.w / 2 - 8), Math.max(4, fr + T.rng.range(-2, 2)));
        const kind = T.pick(o.frontKinds || { neon_lantern: 4, neon_aboard: 3, neon_cat: 2, neon_stool: 2, bike: 1, flowerpot: 1 });
        if (T.free(x, z, HC.CATALOG[kind].radius * 0.6)) T.put(kind, x, z, axis === 'x' ? (side < 0 ? 0 : Math.PI) + (kind === 'bike' ? 0 : 0) : (side < 0 ? Math.PI / 2 : -Math.PI / 2));
      }
    }
    return out;
  }

  function stallRow(T, x0, x1, z, rot, step = 76) {
    for (let x = x0; x <= x1; x += step) {
      T.put(T.rng.chance(0.82) ? 'neon_stall' : 'neon_ramencart', x, z, rot);
      const f = rot === 0 ? 1 : -1;
      for (const dx of [-16, 0, 16]) if (T.rng.chance(0.45)) T.put('neon_stool', x + dx, z + f * 34);
      if (T.rng.chance(0.5)) T.put('person', x + T.rng.range(-20, 20), z + f * 48, rot + Math.PI + T.rng.range(-0.5, 0.5));
      if (T.rng.chance(0.4)) T.put('neon_lantern', x + step / 2, z + f * 8);
    }
  }

  function crowd(T, x, z, n, r = 26) {
    for (let i = 0; i < n; i++) { const a = T.rng() * 6.283, d = Math.sqrt(T.rng()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (T.free(px, pz, 6)) T.put('person', px, pz, T.rng() * 6.283); }
  }

  // ---- market grid blocks (inner ~407 × 407) ----
  const SHOPS = { neon_shophouse: 6, neon_izakaya: 2 };
  const BLOCKS = {
    shops(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.block);
      row(T, 'x', b.x0, b.x1, b.z0, 1, SHOPS, { setback: 8, gap: 6, front: false });
      row(T, 'x', b.x0, b.x1, b.z1, -1, SHOPS, { setback: 8, gap: 6, front: false });
      // Lantern-lit back alley with a few stalls.
      T.rect(b.x0, b.cz - 40, b.x1, b.cz + 40, 2.4, COL.lane);
      for (let x = b.x0 + 40; x < b.x1 - 20; x += 70) {
        const r = T.rng();
        if (r < 0.35) { T.put('neon_ramencart', x, b.cz - 6, 0); T.put('neon_stool', x - 14, b.cz + 22); T.put('neon_stool', x + 14, b.cz + 22); }
        else if (r < 0.6) { T.put('neon_vend', x - 10, b.cz - 24, 0); T.put('neon_vend', x + 14, b.cz - 24, 0); T.put('neon_cat', x, b.cz + 20); }
        else if (r < 0.8) { T.put(T.rng.chance(0.5) ? 'bike' : 'scooter', x, b.cz, 0); T.put('neon_lantern', x + 24, b.cz + 26); }
        else crowd(T, x, b.cz, 4, 22);
        T.put('neon_lantern', x + 34, b.cz - 32);
      }
    },
    izakaya(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.blockB);
      row(T, 'x', b.x0, b.x1, b.z0, 1, { neon_izakaya: 3, neon_shophouse: 1 }, { setback: 8, gap: 10, front: false });
      row(T, 'x', b.x0, b.x1, b.z1, -1, { neon_izakaya: 3, neon_shophouse: 1 }, { setback: 8, gap: 10, front: false });
      T.rect(b.x0, b.cz - 35, b.x1, b.cz + 35, 2.4, COL.lane);
      for (let x = b.x0 + 30; x < b.x1 - 20; x += 46) { T.put(T.pick({ neon_lantern: 3, neon_stool: 2, neon_cat: 1, neon_aboard: 1 }), x, b.cz - 20); T.put(T.pick({ neon_stool: 2, person: 2, neon_lantern: 1 }), x + 20, b.cz + 18, T.rng() * 6); }
    },
    market(T, b) {
      T.stripes(b.x0, b.z0, b.x1, b.z1, 2, COL.market, COL.marketB, 8);
      stallRow(T, b.x0 + 40, b.x1 - 40, b.z0 + 40, 0); stallRow(T, b.x0 + 40, b.x1 - 40, b.cz + 10, 0); stallRow(T, b.x0 + 40, b.x1 - 40, b.z1 - 30, Math.PI);
      for (const x of [b.x0 + 12, b.x1 - 12]) for (const z of [b.z0 + 12, b.z1 - 12]) T.put('neon_vend', x, z, x < b.cx ? Math.PI / 2 : -Math.PI / 2);
      crowd(T, b.cx, b.cz - 70, 6, 60); crowd(T, b.cx, b.cz + 100, 5, 60);
      T.scatter({ neon_lantern: 3, neon_cat: 1, neon_aboard: 1 }, { x0: b.x0 + 10, z0: b.z0 + 10, x1: b.x1 - 10, z1: b.z1 - 10 }, 12, { gap: 3 });
    },
    arcade(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.blockB);
      T.put('neon_arcade', b.x0 + 100, b.z0 + 82, Math.PI); T.put('neon_arcade', b.x1 - 100, b.z0 + 82, Math.PI);
      T.put('neon_shophouse', b.x0 + 70, b.z1 - 66, 0); T.put('neon_shophouse', b.x1 - 70, b.z1 - 66, 0);
      // Game-centre plaza: rows of capsule-toy machines and a crowd.
      for (let k = 0; k < 8; k++) T.put('neon_vend', b.x0 + 70 + k * 38, b.z0 + 190, 0, { tint: k % 5 });
      crowd(T, b.cx, b.cz + 20, 7, 50);
      for (let k = 0; k < 6; k++) T.put(T.pick({ neon_aboard: 2, neon_cat: 1, neon_lantern: 2 }), b.cx - 30 + k * 12, b.z1 - 140);
    },
    capsule(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.block);
      T.put('neon_capsule', b.cx - 70, b.z0 + 122, Math.PI);
      for (let k = 0; k < 5; k++) T.put('bike', b.x1 - 50, b.z0 + 30 + k * 16, 0);
      for (let k = 0; k < 4; k++) T.put('scooter', b.x1 - 50, b.z0 + 130 + k * 20, 0);
      row(T, 'x', b.x0, b.x1, b.z1, -1, { neon_shophouse: 3, neon_izakaya: 1 }, { setback: 8, gap: 6, front: false });
      for (let k = 0; k < 7; k++) T.put(T.pick({ neon_lantern: 2, neon_vend: 1, neon_stool: 1 }), b.x0 + 30 + k * 55, b.cz + 50);
    },
    karaoke(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.block);
      T.put('neon_karaoke', b.cx, b.z0 + 128, Math.PI);
      for (let k = 0; k < 6; k++) T.put(T.pick({ neon_minicar: 3, taxi: 1 }), b.x0 + 40 + k * 66, b.z1 - 56, Math.PI / 2);
      for (let k = 0; k < 9; k++) T.put(T.pick({ neon_lantern: 3, person: 2, neon_aboard: 1 }), b.x0 + 26 + k * 44, b.z0 + 266, T.rng() * 6);
    },
    shrine(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.moss); T.rect(b.cx - 30, b.cz, b.cx + 30, b.z1, 2.4, COL.gravel);
      T.put('neon_shrine', b.cx, b.z0 + 110, 0);
      for (const z of [b.z1 - 50, b.z1 - 110]) T.put('neon_torii', b.cx, z, 0);
      for (let z = b.cz + 20; z < b.z1 - 10; z += 44) { T.put('neon_stonelantern', b.cx - 46, z); T.put('neon_stonelantern', b.cx + 46, z); }
      for (const x of [b.x0 + 40, b.x1 - 40]) for (const z of [b.z0 + 40, b.cz + 60, b.z1 - 40]) T.put(T.rng.chance(0.6) ? 'blossom' : 'neon_pine', x, z);
      for (let k = 0; k < 6; k++) T.put('neon_cat', b.cx - 90 + k * 36, b.cz + 6);
    },
    lot(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.lot);
      for (let r = 0; r < 3; r++) {
        const z = b.z0 + 70 + r * 130;
        for (let k = 0; k < 6; k++) { const x = b.x0 + 34 + k * 68; T.rect(x - 34, z - 40, x - 32, z + 40, 2.6, '#E9E4FF'); if (T.rng.chance(0.8)) T.put(T.pick({ neon_minicar: 5, taxi: 1 }), x, z, Math.PI / 2 + (T.rng.chance(0.5) ? Math.PI : 0)); }
      }
      for (let k = 0; k < 10; k++) T.put('scooter', b.x0 + 20 + k * 38, b.z1 - 12, Math.PI / 2);
    },
    apt(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.block);
      T.put('neon_karaoke', b.cx, b.z0 + 128, Math.PI);
      for (let k = 0; k < 7; k++) T.put(T.pick({ neon_lantern: 2, neon_vend: 1, bike: 1, blossom: 1 }), b.x0 + 30 + k * 58, b.z1 - 90);
      for (let k = 0; k < 5; k++) T.put(T.pick({ neon_minicar: 3, scooter: 1 }), b.x0 + 40 + k * 80, b.z1 - 38, Math.PI / 2);
    },
  };

  const PLAN = [
    ['shops', 'izakaya', 'market', 'shops', 'capsule'],
    ['izakaya', 'arcade', 'shops', 'shrine', 'shops'],
    ['market', 'shops', 'karaoke', 'izakaya', 'market'],
    ['shops', 'lot', 'shops', 'arcade', 'izakaya'],
    ['capsule', 'shops', 'market', 'shops', 'apt'],
  ];


  // Ground polyline that is lit from above. (T.strip/T.path quads wind downward, so under the
  // double-sided ground material they render as if lit from below; rects and discs are fine.)
  function seg(T, a, b, w, y, col) {
    if (a[0] === b[0] || a[1] === b[1]) { T.rect(Math.min(a[0], b[0]) - w / 2, Math.min(a[1], b[1]) - w / 2, Math.max(a[0], b[0]) + w / 2, Math.max(a[1], b[1]) + w / 2, y, col); return; }
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), wide = w >= 16, n = Math.ceil(L / (wide ? w * 0.3 : w * 0.6));
    for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; if (wide) T.disc(x, z, w / 2, y, col, 10); else T.rect(x - w / 2, z - w / 2, x + w / 2, z + w / 2, y, col); }
  }
  function poly(T, pts, w, y, col, closed) { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) seg(T, pts[i], pts[(i + 1) % pts.length], w, y, col); }

  function chamfer(x0, z0, x1, z1, c) { return [[x0 + c, z0], [x1 - c, z0], [x1, z0 + c], [x1, z1 - c], [x1 - c, z1], [x0 + c, z1], [x0, z1 - c], [x0, z0 + c]]; }

  function generate(T) {
    T.island({ ground: COL.sand, edge: '#C49E7C' });
    T.rect(-70, -70, 5070, 5070, 0, COL.base);

    // ---------- canal (L-shaped, into the sea on the east and south) ----------
    const E = CW / 2 + 14, Wt = CW / 2;
    T.rect(CANAL - E, CANAL - E, 5279, CANAL + E, 2.2, COL.canalEdge); T.rect(CANAL - E, CANAL - E, CANAL + E, 5279, 2.2, COL.canalEdge);
    T.rect(CANAL - Wt, CANAL - Wt, 5279, CANAL + Wt, 2.6, COL.canal); T.rect(CANAL - Wt, CANAL - Wt, CANAL + Wt, 5279, 2.6, COL.canal);
    for (let t = 1900; t < 5200; t += 170) { T.rect(t, CANAL - 8, t + 60, CANAL - 4, 2.9, COL.glint); T.rect(CANAL + 4, t + 80, CANAL + 8, t + 140, 2.9, COL.glint); }
    // Canal promenades with lanterns.
    T.rect(1830, 1830, 5000, 1890, 1.2, COL.walk); T.rect(1830, 1830, 1890, 5000, 1.2, COL.walk);
    const BR = [2240, 2700, 3412, 4000, 4580], nearBr = (t) => BR.some((x) => Math.abs(x - t) < 44);
    for (let t = 1940, i = 0; t < 4980; t += 90, i++) { if (nearBr(t)) continue; const k = i % 3 === 1 ? 'neon_lamp' : 'neon_lantern'; T.put(k, t, 1840); T.put(k, 1840, t); if (k === 'neon_lamp') { T.disc(t, 1850, 40, 1.3, COL.pool, 16); T.disc(1850, t, 40, 1.3, COL.pool, 16); } }
    T.walkLoop([[5000, 1868], [1868, 1868], [1868, 5000], [1868, 1868]], 11, { person: 1 }, { dogChance: 0.2, lane: 6 });
    // Bridges and lantern boats.
    for (const x of BR) { T.put('neon_bridge', x, CANAL, Math.PI / 2); T.rect(x - 24, CANAL - 120, x + 24, CANAL - 64, 2.4, COL.path); }
    for (const z of [2240, 2830, 3412, 4000, 4580]) { T.put('neon_bridge', CANAL, z, 0); T.rect(CANAL - 160, z - 24, CANAL - 64, z + 24, 2.4, COL.path); }
    T.loopVehicles('neon_boat', [[5150, CANAL], [CANAL, CANAL], [CANAL, 5150], [CANAL, CANAL]], 10, [28, 45], { lane: 24 });

    // ---------- market grid (south-east) ----------
    T.roadGrid(R, { width: RW, colors: { road: COL.road, line: COL.line, dash: null, zebra: COL.zebra } });
    T.blocks(R, (b) => {
      BLOCKS[PLAN[b.bz][b.bx]](T, b);
      T.sidewalkProps(b, { lamp: 'neon_lamp', step: 82, props: { neon_lantern: 4, neon_vend: 2, bike: 2, neon_aboard: 1, bin: 1, blossom: 1, cluster: 1, none: 3 }, cluster: 'neon_lantern', clusterN: 2 });
    }, { sidewalkWidth: 34, walkers: 2, dogChance: 0.15, curb: COL.curb, sidewalkColor: COL.walk });
    // Crosswalk crowds waiting at the corners.
    for (let i = 0; i < R.length; i++) for (let j = 0; j < R.length; j++) {
      if (T.rng.chance(0.5)) continue;
      const sx = T.rng.chance(0.5) ? 1 : -1, sz = T.rng.chance(0.5) ? 1 : -1;
      crowd(T, R[i] + sx * 74, R[j] + sz * 74, T.rng.int(3, 5), 14);
    }
    T.traffic({ neon_minicar: 6, taxi: 2 }, 30, { lane: 27 }); T.traffic({ bus: 1 }, 3, { lane: 27 });

    // ---------- tower quarter (west) with the train loop ----------
    T.rect(200, 2000, 1530, 4800, 0.3, COL.plaza);
    const loop = chamfer(150, 1950, 1580, 4850, 90);
    poly(T, loop, 56, 0.5, COL.ballast, true); poly(T, chamfer(138, 1938, 1592, 4862, 90), 5, 0.7, COL.rail, true); poly(T, chamfer(162, 1962, 1568, 4838, 93), 5, 0.7, COL.rail, true);
    for (let t = 260; t < 4760; t += 34) { if (t < 1480) { T.rect(t - 3, 1950 - 20, t + 3, 1950 + 20, 0.6, '#6A6298'); T.rect(t - 3, 4850 - 20, t + 3, 4850 + 20, 0.6, '#6A6298'); } if (t > 2060) { T.rect(150 - 20, t - 3, 150 + 20, t + 3, 0.6, '#6A6298'); T.rect(1580 - 20, t - 3, 1580 + 20, t + 3, 0.6, '#6A6298'); } }
    const tl = T.loopVehicles({ neon_train: 1 }, loop, 0);
    let plen = 0; for (let i = 0; i < loop.length; i++) { const a = loop[i], b2 = loop[(i + 1) % loop.length]; plen += Math.hypot(b2[0] - a[0], b2[1] - a[1]); }
    for (const t0 of [0.1, 0.6]) for (let i = 0; i < 4; i++) T.put('neon_train', 0, 0, 0, { mover: { type: 'walk', loop: tl, t: t0 - i * 206 / plen, dir: 1, speed: 150, lane: 0, bob: false } });
    // Alleys.
    T.rect(830, 2000, 900, 4800, 1.2, COL.alley);
    for (const z of [2715, 3405, 4085]) T.rect(200, z - 35, 1530, z + 35, 1.2, COL.alley);
    const cols = [[240, 830], [900, 1490]], rows = [[2040, 2680], [2750, 3370], [3440, 4050], [4120, 4760]];
    const WPLAN = [['sky', 'capsule'], ['needle', 'tower'], ['octa', 'karaoke'], ['capsule', 'sky']];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) westCell(T, WPLAN[r][c], cols[c][0], rows[r][0], cols[c][1], rows[r][1]);
    for (const z of [2715, 3405, 4085]) for (let x = 230; x < 1520; x += 72) T.put(T.pick({ neon_lantern: 4, neon_stool: 1, neon_cat: 1, person: 2, none: 3 }) === 'none' ? 'neon_lantern' : T.pick({ neon_lantern: 4, person: 2, neon_cat: 1, neon_aboard: 1 }), x, z + (x % 144 < 72 ? -24 : 24), T.rng() * 6);
    T.walkLoop([[865, 2010], [865, 4790], [215, 4790], [215, 4085], [1515, 4085], [1515, 3405], [215, 3405], [215, 2715], [1515, 2715], [1515, 2010]], 18, { person: 1 }, { dogChance: 0.15 });

    // ---------- north: old town lanes (west), temple garden (centre), neon heights (east) ----------
    T.rect(40, 40, 1700, 1880, 0.3, COL.town);
    for (const z of [380, 1000, 1620]) T.rect(40, z - 40, 1700, z + 40, 1.2, COL.lane);
    T.rect(815, 40, 885, 1880, 1.3, COL.lane);
    const OLD = { neon_shophouse: 4, neon_izakaya: 3 }, SB = 52;
    for (const [a0, a1] of [[70, 800], [900, 1660]]) {
      for (const z of [380, 1000, 1620]) {
        if (z > 400) row(T, 'x', a0, a1, z, -1, OLD, { setback: SB, gap: 10, extraGap: 110 });
        if (z < 1600) row(T, 'x', a0, a1, z, 1, OLD, { setback: SB, gap: 10, extraGap: 110 });
        for (let x = a0 + 20; x < a1; x += 120) { const lz = z + (x % 240 < 120 ? -34 : 34); T.put('neon_lamp', x, lz); T.disc(x, lz, 46, 1.3, COL.pool, 16); }
      }
      T.scatter({ blossom: 2, neon_pine: 2, neon_stonelantern: 1, neon_cat: 2, neon_lantern: 3 }, { x0: a0, z0: 60, x1: a1, z1: 330 }, 30, { gap: 10 });
      stallRow(T, a0 + 50, a1 - 40, 1712, Math.PI, 84);
      // back courtyards between the rows
      for (const [z0, z1] of [[578, 802], [1198, 1422]]) {
        T.scatter({ neon_pine: 2, blossom: 2, neon_vend: 2, bike: 2, scooter: 1, neon_cat: 2, neon_stool: 2, neon_lantern: 3, person: 2, bin: 1 }, { x0: a0 + 10, z0, x1: a1 - 10, z1 }, 34, { gap: 4 });
      }
    }
    T.walkLoop([[60, 380], [1690, 380], [1690, 1000], [60, 1000], [60, 1620], [1690, 1620], [850, 1620], [850, 380]], 18, { person: 1 }, { dogChance: 0.2 });

    // Temple garden.
    const PX = 2700, PZ = 700;
    T.rect(1820, 40, 3560, 1690, 0.3, COL.moss);
    T.stripes(PX - 470, PZ - 470, PX + 470, PZ + 470, 0.6, COL.gravel, COL.gravelB, 14, false);
    T.rect(PX - 46, PZ + 420, PX + 46, 1700, 1.4, COL.path); T.ring(PX, PZ, 398, 422, 1.0, COL.path, 64);
    T.put('neon_pagoda', PX, PZ, 0);
    T.put('neon_bigtorii', PX, 1600, 0);
    for (const z of [1480, 1400, 1320, 1240, 1160]) T.put('neon_torii', PX, z, 0);
    for (let z = 1150; z < 1540; z += 70) { T.put('neon_stonelantern', PX - 70, z); T.put('neon_stonelantern', PX + 70, z); }
    for (const [x, z] of [[PX - 400, PZ - 400], [PX + 400, PZ - 400], [PX - 400, PZ + 400], [PX + 400, PZ + 400]]) { T.put('neon_pine', x, z); T.put('neon_stonelantern', x + (x < PX ? 40 : -40), z); T.put('neon_stonelantern', x, z + (z < PZ ? 40 : -40)); }
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; if (Math.abs(Math.sin(a) - 1) < 0.02) continue; T.put(k % 2 ? 'neon_lantern' : 'neon_stonelantern', PX + Math.cos(a) * 444, PZ + Math.sin(a) * 444); }
    T.walkLoop(Array.from({ length: 20 }, (_, i) => { const a = i / 20 * Math.PI * 2; return [PX + Math.cos(a) * 410, PZ + Math.sin(a) * 410]; }), 14, { person: 1 }, { speed: [26, 40] });
    // Pond with ducks and a bridge.
    T.disc(2160, 1300, 210, 0.9, COL.pondEdge, 40, 1.25, 1); T.disc(2160, 1300, 192, 1.6, COL.pond, 40, 1.25, 1);
    T.put('neon_bridge', 2160, 1300, 0); T.roamers('duck', 2160, 1300, 150, 7, { speed: [10, 18] });
    // Shrines and blossom groves.
    T.put('neon_shrine', 3300, 1300, -Math.PI / 2); T.put('neon_shrine', 2050, 400, Math.PI / 2);
    const avoidTemple = (x, z) => Math.hypot(x - PX, z - PZ) < 500 || (Math.abs(x - PX) < 140 && z > PZ) || Math.hypot((x - 2160) / 1.25, z - 1300) < 225;
    T.scatter({ blossom: 6, neon_pine: 2, bush: 2, neon_stonelantern: 2, neon_cat: 1, flowerpot: 1 }, { x0: 1860, z0: 70, x1: 3530, z1: 1640 }, 80, { gap: 12, avoid: avoidTemple });
    T.scatter({ person: 3, neon_lantern: 3, neon_cat: 1 }, { x0: 1860, z0: 70, x1: 3530, z1: 1640 }, 50, { gap: 4, avoid: (x, z) => Math.hypot(x - PX, z - PZ) < 470 || Math.hypot((x - 2160) / 1.25, z - 1300) < 200 });

    // Neon heights (north-east): two neon towers, a night market plaza, karaoke and capsule.
    T.rect(3600, 40, 4980, 1690, 0.3, COL.plaza);
    T.put('neon_tower', 3930, 340, 0); T.put('neon_tower', 4640, 340, 0);
    T.rect(3620, 520, 4960, 600, 1.2, COL.alley);
    for (let x = 3640; x < 4960; x += 44) T.put(T.pick({ neon_vend: 2, bike: 2, scooter: 1, neon_lantern: 3, person: 2 }), x, 560 + (x % 88 < 44 ? -18 : 18), x % 88 < 44 ? 0 : Math.PI);
    T.stripes(3640, 660, 4440, 1650, 0.6, COL.market, COL.marketB, 10);
    for (const z of [740, 1040, 1340]) { stallRow(T, 3680, 4400, z, 0, 80); }
    crowd(T, 4040, 900, 8, 120); crowd(T, 4040, 1200, 8, 120); crowd(T, 4040, 1520, 8, 120);
    T.put('neon_karaoke', 4720, 860, -Math.PI / 2); T.put('neon_capsule', 4720, 1330, -Math.PI / 2);
    for (let z = 660; z < 1640; z += 60) T.put(T.pick({ neon_lantern: 3, neon_vend: 1, neon_minicar: 1 }), 4520, z, Math.PI / 2);
    T.walkLoop([[3640, 640], [4460, 640], [4460, 1650], [3640, 1650]], 12, { person: 1 }, { speed: [24, 40] });

    // ---------- beach ----------
    T.beach({ person: 3, neon_lantern: 4, beachball: 1, parasol: 1, neon_cat: 1 }, 44);

    // ---------- spawns ----------
    for (const [i, j] of [[1, 2], [3, 1], [2, 3], [4, 3], [1, 4], [3, 4]]) T.spawnAt(R[i] + T.rng.range(-30, 30), R[j] + T.rng.range(-30, 30));
    for (const [x, z] of [[850, 1000], [430, 1620], [1300, 380], [865, 3405], [520, 4085], [1250, 2715], [PX, 1100], [2300, 900], [4040, 1200], [3300, 560]]) T.spawnAt(x, z);
  }

  // A tower-quarter cell (~590 × 620).
  function westCell(T, type, x0, z0, x1, z1) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const edge = (n, weights) => { for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; T.put(T.pick(weights), x0 + 16 + (x1 - x0 - 32) * t, z1 - 16, 0); } };
    if (type === 'needle' || type === 'octa') {
      T.ring(cx, cz, 200, 214, 1.0, COL.alley, 48); T.disc(cx, cz, 196, 0.8, COL.plaza, 48);
      T.put(type === 'needle' ? 'neon_needle' : 'neon_octa', cx, cz, 0);
      for (const [x, z] of [[x0 + 36, z0 + 36], [x1 - 36, z0 + 36], [x0 + 36, z1 - 36], [x1 - 36, z1 - 36]]) { T.put('neon_lamp', x, z); T.disc(x, z, 46, 1.3, COL.pool, 16); }
      edge(12, { neon_vend: 2, neon_lantern: 3, bike: 2, person: 2, neon_aboard: 1 });
      T.walkLoop(Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return [cx + Math.cos(a) * 248, cz + Math.sin(a) * 248]; }), 8, { person: 1 });
    } else if (type === 'sky') {
      T.ring(cx, cz - 40, 230, 246, 1.0, COL.alley, 48);
      T.put('neon_skytower', cx, cz - 40, 0);
      for (const [x, z] of [[x0 + 30, z0 + 30], [x1 - 30, z0 + 30], [x0 + 30, z1 - 90], [x1 - 30, z1 - 90]]) T.put('blossom', x, z);
      edge(12, { neon_vend: 2, neon_lantern: 3, bike: 2, person: 2, neon_aboard: 1 });
    } else if (type === 'tower') {
      T.put('neon_tower', cx, z0 + 170, 0);
      stallRow(T, x0 + 50, x1 - 50, z1 - 140, 0, 80);
      edge(10, { neon_lantern: 3, person: 2, neon_cat: 1 });
    } else if (type === 'capsule') {
      T.put('neon_capsule', x0 + 140, z0 + 130, 0); T.put('neon_karaoke', x1 - 140, z0 + 130, 0);
      for (let k = 0; k < 10; k++) T.put(k % 3 ? 'bike' : 'scooter', x0 + 40 + k * 52, z1 - 200, Math.PI / 2);
      for (let k = 0; k < 6; k++) T.put(T.pick({ neon_minicar: 4, taxi: 1 }), x0 + 60 + k * 90, z1 - 110, Math.PI / 2);
      edge(10, { neon_vend: 2, neon_lantern: 3, person: 2 });
    } else if (type === 'arcade') {
      T.put('neon_arcade', x0 + 110, z0 + 90, 0); T.put('neon_arcade', x1 - 110, z0 + 90, 0);
      T.put('neon_shophouse', x0 + 80, z0 + 320, 0); T.put('neon_shophouse', x0 + 230, z0 + 320, 0); T.put('neon_izakaya', x1 - 90, z0 + 320, 0);
      crowd(T, cx, z0 + 205, 10, 80);
      edge(14, { neon_vend: 3, neon_aboard: 2, neon_lantern: 2, neon_cat: 1 });
      T.scatter({ neon_lantern: 3, person: 2, neon_stool: 1 }, { x0: x0 + 10, z0: z0 + 400, x1: x1 - 10, z1: z1 - 40 }, 18, { gap: 4 });
    } else if (type === 'karaoke') {
      T.put('neon_karaoke', x0 + 150, z0 + 140, 0); T.put('neon_shophouse', x1 - 80, z0 + 80, 0); T.put('neon_shophouse', x1 - 80, z0 + 230, 0);
      stallRow(T, x0 + 50, x1 - 50, z1 - 170, 0, 78);
      edge(12, { neon_lantern: 3, neon_vend: 1, person: 2 });
    } else if (type === 'park') {
      T.rect(x0, z0, x1, z1, 0.6, COL.moss); T.disc(cx, cz, 150, 1.0, COL.gravel, 32);
      T.put('neon_shrine', cx, cz - 20, 0); T.put('neon_torii', cx, cz + 160, 0); T.put('neon_torii', cx, cz + 230, 0);
      T.scatter({ blossom: 4, neon_pine: 2, neon_stonelantern: 2, bench: 1, neon_cat: 1 }, { x0: x0 + 20, z0: z0 + 20, x1: x1 - 20, z1: z1 - 20 }, 30, { gap: 8, avoid: (x, z) => Math.hypot(x - cx, z - cz) < 160 || (Math.abs(x - cx) < 60 && z > cz) });
      T.scatter({ person: 2, neon_lantern: 2 }, { x0: x0 + 20, z0: z0 + 20, x1: x1 - 20, z1: z1 - 20 }, 16, { gap: 4 });
    }
  }

  HC.Levels.add({
    id: 'neon', num: 7, name: 'Neon Ward', tagline: 'Night market lanes, lanterns & a glowing pagoda', icon: '🏮', colors: ['#3A1C8C', '#FF3FA4'],
    theme: {
      sky: '#24175A', fogNear: 8000, fogFar: 21000,
      sea: { show: true, deep: '#0E1748', shallow: '#22408A', foam: 0.35 },
      skirt: '#3A2F6A', hemiSky: '#B9A8FF', hemiGround: '#3E2A78', hemi: 1.6, sun: '#B4C6FF', sunI: 1.3, glow: 1,
    },
    mods: { botSkill: -0.1 },
    milestones: [['neon_minicar', '🚗 Kei cars'], ['neon_train', '🚆 Trains'], ['neon_bigtorii', '⛩️ Shrine gates'], ['neon_shophouse', '🏮 Shophouses'], ['neon_arcade', '🕹️ Arcades'],
      ['neon_capsule', '🏨 Capsule towers'], ['neon_tower', '🌃 Neon towers'], ['neon_skytower', '🌆 Sky towers'], ['neon_needle', '🌇 Supertalls'], ['neon_pagoda', '🏯 THE PAGODA']],
    kinds,
    generate,
  });
})();
