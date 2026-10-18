// Level 9 — Dino Valley: a prehistoric jungle valley. No road grid: grassy clearings joined by dirt
// trails, a river winding from a waterfall pool to the sea, herds of cartoon dinos roaming the
// meadows, a research camp with safari jeeps, a temple ruin, fossil digs and a smoking volcano.
(function () {
  const COL = {
    sand: '#F2D58E', jungle: '#43B54B', jungleD: '#35A444', jungleD2: '#3CAD48', glade: '#9BE365', glade2: '#84D85A',
    path: '#E2B57A', pathEdge: '#CF9F66', track: '#C99662', bank: '#EBD08F', water: '#3FC4F2', deep: '#2BA9E6', foam: '#BDF3FF',
    stone: '#B8B2C6', dig: '#EFCB8C', camp: '#DDB27C', plaza: '#E3D8BC', plazaRing: '#C9BFA4', basalt: '#6E5A6E', basalt2: '#5E4B5F', lava: '#FF8A2A',
    nest: '#B07A4F', nestIn: '#E6C07A', plank: '#B07A4F', plankLine: '#8D5A3B',
  };
  const GREENS = ['#2FB86E', '#4FD86A', '#24B47E', '#7DDB48'];
  const JUNGLE = ['#1FA463', '#2FB86E', '#38C55A', '#159957'];
  const DINO = ['#5FD3B8', '#A66CFF', '#7BD84A', '#FF9F43', '#4FA8FF', '#FF6FA8'];
  const BONE = '#FFF4E3', BONE2 = '#F1DDBB', CREAM = '#FFF4E3', DARK = '#2B2D42', TIRE = '#2B2D42', GLASS = '#9FE7FF', WOOD = '#8D5A3B', WOOD2 = '#B07A4F';

  // ---- drawing helpers ----
  const V3 = THREE.Vector3, UP = new V3(0, 1, 0), _d = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  // A (tapered) cylinder from point a to point b.
  function limb(g, a, b, r0, r1, seg, color, o = {}) {
    _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _d.length(); _d.normalize();
    _q.setFromUnitVectors(UP, _d); _e.setFromQuaternion(_q, 'XYZ');
    g.cyl((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - len / 2, (a[2] + b[2]) / 2, r1, r0, len, seg, color, Object.assign({ rx: _e.x, ry: _e.y, rz: _e.z }, o));
  }
  function chain(g, pts, radii, seg, color, o) { for (let i = 0; i < pts.length - 1; i++) limb(g, pts[i], pts[i + 1], radii[i], radii[i + 1], seg, color, o); }
  // A leaf: a flattened stretched icosphere from (x,y,z) pointing at heading `ang`, tilted up by `tilt`. Returns the tip.
  function leaf(g, x, y, z, len, wid, th, ang, tilt, color, o = {}) {
    const dx = Math.cos(tilt) * Math.cos(ang), dy = Math.sin(tilt), dz = Math.cos(tilt) * Math.sin(ang);
    g.ball(x + dx * len / 2, y + dy * len / 2, z + dz * len / 2, 1, color, Object.assign({ sx: len / 2, sy: th / 2, sz: wid / 2, ry: -ang, rz: tilt }, o));
    return [x + dx * len, y + dy * len, z + dz * len];
  }
  const eyes = (g, x, y, z, r, color = '#FFFFFF') => { for (const s of [-1, 1]) { g.ball(x, y, z * s, r, color); g.ball(x + r * 0.45, y + r * 0.1, (z + r * 0.55) * s, r * 0.55, DARK); } };
  const onEll = (c, ax, ph, th) => [c[0] + ax[0] * Math.cos(ph) * Math.cos(th), c[1] + ax[1] * Math.sin(ph), c[2] + ax[2] * Math.cos(ph) * Math.sin(th)];

  function longneck(g, s) {
    const S = (p) => p.map((v) => v * s);
    const c = S([-10, 115, 0]), ax = S([101, 55, 64]);
    for (const [x, z] of [[52, 40], [52, -40], [-66, 40], [-66, -40]]) { g.cyl(x * s, 0, z * s, 15 * s, 17 * s, 100 * s, 8, '#FFF', { tint: true }); g.cyl(x * s, 0, z * s, 19 * s, 19 * s, 6 * s, 8, CREAM); }
    g.ball(c[0], c[1], c[2], 70 * s, '#FFF', { tint: true, sx: 1.45, sy: 0.78, sz: 0.92, detail: 1 });
    g.ball(-5 * s, 98 * s, 0, 60 * s, CREAM, { sx: 1.35, sy: 0.62, sz: 0.86 });
    chain(g, [S([70, 140, 0]), S([100, 190, 0]), S([118, 235, 0]), S([128, 262, 0])], [26 * s, 20 * s, 15 * s, 12 * s], 8, '#FFF', { tint: true });
    g.ball(140 * s, 268 * s, 0, 15 * s, '#FFF', { tint: true, sx: 1.5, sy: 0.85 });
    eyes(g, 146 * s, 274 * s, 9 * s, 3.2 * s);
    for (const z of [-11, 11]) g.ball(152 * s, 264 * s, z * s, 3 * s, '#FF9FD2');
    chain(g, [S([-100, 120, 0]), S([-140, 95, 0]), S([-160, 60, 0]), S([-168, 32, 0])], [32 * s, 20 * s, 9 * s, 2 * s], 8, '#FFF', { tint: true });
    for (const [ph, th, r] of [[1.1, 0.6, 14], [1.25, 2.2, 12], [1.0, 3.6, 13], [1.2, 5.0, 11], [0.8, 1.6, 10], [0.85, 4.4, 10], [1.38, 0.2, 9]]) {
      const p = onEll(c, ax, ph, th); g.ball(p[0], p[1], p[2], r * s, '#FFE58A', { sy: 0.45 });
    }
  }

  function kinds(def) {
    // ---------- tiny food ----------
    def('dino_egg', { w: 8, d: 8, h: 12, points: 1, mass: 2, tints: ['#FFF4E3', '#C8F5E8', '#FFE1F0', '#F0F7B5', '#D9E8FF'],
      build(g) { g.ball(0, 5.7, 0, 4.2, '#FFF', { tint: true, sy: 1.35 }); g.ball(2.6, 7.2, 2.2, 1.2, '#FF9F43'); g.ball(-2.4, 8.6, -2.2, 1.1, '#6FCF97'); } });
    def('dino_mushroom', { w: 10, d: 10, h: 12, points: 1, mass: 1, tints: ['#FF4D6D', '#B26BFF', '#FF9F1C', '#2EC4F0'],
      build(g) { g.cyl(-0.8, 0, -0.8, 1.6, 2.2, 7, 5, CREAM); g.ball(-0.8, 7.5, -0.8, 4.6, '#FFF', { tint: true, sy: 0.62 });
        g.ball(0.8, 9.6, 0, 1, '#FFFFFF');
        g.cyl(2.8, 0, 2.6, 0.9, 1.2, 4, 4, CREAM); g.ball(2.8, 4.3, 2.6, 2.2, '#FFF', { tint: true, sy: 0.6 }); } });
    def('dino_flower', { w: 12, d: 12, h: 17, points: 1, mass: 1, tints: ['#FF5A8A', '#FFD23F', '#B388FF', '#FF8C42', '#5EE6FF'],
      build(g) { g.cyl(0, 0, 0, 0.8, 1, 12, 4, '#3E9E4F'); leaf(g, 0, 2, 0, 6, 3.4, 1, 0.5, 0.35, '#43C463');
        for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; g.ball(Math.cos(a) * 2.6, 13.4, Math.sin(a) * 2.6, 3, '#FFF', { tint: true, sy: 0.45 }); }
        g.ball(0, 14.4, 0, 1.9, '#7A4A2A'); } });
    def('dino_baby', { w: 19, d: 7, h: 16, points: 1, mass: 15, tints: DINO,
      build(g) { for (const [x, z] of [[2.8, 2], [2.8, -2], [-3.6, 2], [-3.6, -2]]) g.block(x, 0, z, 2.2, 4.5, 2.2, '#FFF', { tint: true });
        g.ball(-0.5, 6.6, 0, 4, '#FFF', { tint: true, sx: 1.35, sz: 0.9 }); g.ball(-0.4, 5.6, 0, 3.4, CREAM, { sx: 1.25, sz: 0.85 });
        limb(g, [3, 8, 0], [6.4, 12.8, 0], 1.7, 1.2, 5, '#FFF', { tint: true }); g.ball(7.6, 13.8, 0, 2.3, '#FFF', { tint: true, sx: 1.35 });
        for (const z of [-1.6, 1.6]) g.ball(8.6, 14.6, z, 0.6, DARK); limb(g, [-5, 7, 0], [-9.6, 3.6, 0], 2, 0.4, 4, '#FFF', { tint: true });
        g.ball(-1.5, 10.3, 1.2, 1, '#FFE58A'); g.ball(1, 10.1, -1.4, 0.9, '#FFE58A'); } });
    // ---------- small stuff ----------
    def('dino_raptor', { w: 34, d: 10, h: 24, points: 2, mass: 40, tints: DINO,
      build(g) {
        for (const z of [-2.6, 2.6]) { limb(g, [-1, 12, z], [1.4, 6, z], 2.3, 1.7, 5, '#FFF', { tint: true }); limb(g, [1.4, 6, z], [-0.6, 0.8, z], 1.5, 1.1, 5, '#FFF', { tint: true }); g.block(0.6, 0, z, 4.4, 1.2, 2, DARK); }
        g.ball(0, 13, 0, 5.5, '#FFF', { tint: true, sx: 1.7, sz: 0.85 }); g.ball(1.5, 11.4, 0, 4, CREAM, { sx: 1.45, sz: 0.8 });
        limb(g, [7, 15, 0], [10, 19, 0], 2.5, 2.1, 5, '#FFF', { tint: true }); g.ball(11.6, 20, 0, 3.1, '#FFF', { tint: true, sx: 1.6 });
        for (const z of [-2.3, 2.3]) g.ball(12.8, 21.4, z, 0.8, DARK); limb(g, [-8, 13.6, 0], [-17, 15.5, 0], 3.2, 0.4, 5, '#FFF', { tint: true });
        for (const z of [-3.4, 3.4]) limb(g, [6, 13, z], [8.6, 10, z * 1.1], 1, 0.7, 4, '#FFF', { tint: true });
        for (const x of [-4.5, -0.5, 3.5]) g.block(x, 17.5, 0, 1.7, 1.4, 6.4, DARK);
      } });
    def('dino_fern', { w: 24, d: 24, h: 12, points: 2, mass: 10, tints: GREENS,
      build(g) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; leaf(g, 0, 2, 0, 12.5, 6.4, 1.6, a, 0.5 + (i % 2) * 0.22, '#FFF', { tint: true }); }
        g.ball(0, 3, 0, 4, '#2E8B57'); g.ball(1, 7.6, 0.5, 1.5, '#9BE35A'); } });
    def('dino_cycad', { w: 22, d: 22, h: 30, points: 3, mass: 60, tints: GREENS,
      build(g) { g.cyl(0, 0, 0, 4.8, 5.6, 10, 6, '#7B4E35'); g.cyl(0, 10, 0, 4.4, 4.8, 10, 6, '#9A6343', { ry: 0.5 });
        for (let i = 0; i < 7; i++) leaf(g, 0, 20, 0, 12.5, 4.4, 1.6, i / 7 * Math.PI * 2, 0.7 + (i % 3) * 0.1, '#FFF', { tint: true });
        g.cone(0, 20, 0, 4, 10, 5, '#FFB01F'); } });
    def('dino_boulder', { w: 40, d: 34, h: 24, points: 3, mass: 900, tints: ['#B3AAC6', '#C2B49E', '#A39BB5', '#5E4B63'],
      build(g) { g.ball(0, 9, 0, 16, '#FFF', { tint: true, sx: 1.1, sy: 0.7, sz: 0.95 }); g.ball(10, 6, 7, 8.5, '#FFF', { tint: true, sy: 0.8 }); g.ball(-12, 5, -6, 7, '#FFF', { tint: true });
        g.ball(-3, 18, -1, 9, '#6FCF5A', { sy: 0.32 }); } });
    def('dino_amber', { w: 18, d: 18, h: 30, points: 2, mass: 80, tints: ['#FFB01F', '#FF7AC8', '#5EF0D0', '#B388FF'],
      build(g) { g.ball(0, 2, 0, 9.5, '#9C95B0', { sy: 0.45 });
        g.glowing(() => {
          for (const [x, z, h, r, lx, lz] of [[0, 0, 20, 4.2, 1.5, 0.8], [4.2, 2, 12, 3, 3, 2], [-3.8, -2, 10, 2.8, -3, -1.5], [-1.5, 4.2, 7, 2.2, -2, 2.5]]) {
            const top = [x + lx * 0.7, h, z + lz * 0.7], tip = [x + lx, h + r * 2, z + lz];
            limb(g, [x, 1, z], top, r, r, 5, '#FFF', { tint: true }); limb(g, top, tip, r, 0.01, 5, '#FFF', { tint: true });
          }
        }); } });
    // ---------- palms & trees ----------
    def('dino_palm', { w: 28, d: 28, h: 128, points: 5, mass: 500, tints: GREENS,
      build(g) {
        const tr = [[0, 0, 0], [2, 40, 0], [4.5, 80, 0], [4, 118, 0]];
        for (let i = 0; i < 3; i++) limb(g, tr[i], tr[i + 1], 5.2 - i * 0.3, 4.9 - i * 0.3, 5, i % 2 ? '#8D5A3B' : '#B07A4F');
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; const t1 = leaf(g, 4, 119, 0, 15, 9.5, 1.8, a, 0.28, '#FFF', { tint: true }); leaf(g, t1[0], t1[1], t1[2], 13, 7, 1.6, a + 0.1, -0.5, '#FFF', { tint: true }); }
        for (const a of [0.4, 3.2]) g.ball(4 + Math.cos(a) * 4, 114, Math.sin(a) * 4, 3, '#7B4E35'); } });
    def('dino_jtree', { w: 44, d: 44, h: 166, points: 8, mass: 1500, tints: JUNGLE,
      build(g) {
        for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.3; limb(g, [Math.cos(a) * 18, 0, Math.sin(a) * 18], [0, 26, 0], 4.5, 2.5, 4, '#7B4E35'); }
        g.cyl(0, 0, 0, 6, 9, 112, 7, WOOD);
        g.ball(0, 118, 0, 34, '#FFF', { tint: true, sy: 0.55 }); g.ball(18, 134, 10, 22, '#FFF', { tint: true, sy: 0.62 }); g.ball(-16, 138, -10, 22, '#FFF', { tint: true, sy: 0.62 }); g.ball(2, 150, 0, 18, '#FFF', { tint: true, sy: 0.7 });
        for (const [x, z, h] of [[24, 14, 30], [-22, 16, 38], [-12, -22, 34]]) g.block(x, 110 - h, z, 1.6, h, 1.6, '#7DDB48');
        for (const [x, z, c] of [[20, 20, '#FF5A8A'], [-24, 4, '#FFB01F']]) g.ball(x, 104, z, 3.2, c); } });
    // ---------- camp ----------
    def('dino_tent', { w: 66, d: 52, h: 46, points: 6, mass: 150, tints: ['#FF8C42', '#2EC4B6', '#FFD23F', '#FF5A8A'],
      build(g) { g.block(0, 0, 0, 66, 1.5, 52, '#C99A62'); g.gable(0, 1.5, 0, 62, 50, 36, '#FFF', { tint: true });
        g.gable(0, 1.5, 0, 63, 14, 4.2, '#FFFFFF'); g.panel('x+', 31.3, 12, 0, 16, 20, '#3A3F58');
        for (const x of [-32, 32]) g.block(x, 0, 0, 2, 39, 2, WOOD); g.block(0, 37.5, 0, 66, 2, 2, WOOD);
        g.block(32, 39, 0, 1, 7, 1, WOOD); g.block(28.5, 42, 0, 7, 4, 0.6, '#FF5A5F'); } });
    def('dino_jeep', { w: 88, d: 44, h: 44, points: 6, mass: 1400, tints: ['#FFB01F', '#2EC4B6', '#FF5A5F', '#7BD84A', '#A66CFF'],
      build(g) {
        g.block(0, 8, 0, 84, 16, 42, '#FFF', { tint: true }); g.block(26, 24, 0, 30, 6, 40, '#FFF', { tint: true });
        for (const z of [-21.3, 21.3]) g.block(0, 13, z, 84, 4, 0.6, '#FFFFFF'); g.block(26, 30, 0, 30, 0.6, 8, '#FFFFFF');
        for (const z of [-10, 10]) g.block(-4, 24, z, 12, 9, 14, '#5A3825'); g.block(-26, 24, 0, 14, 8, 36, '#5A3825');
        g.block(10, 24, 0, 2, 15, 40, '#3A3F58'); g.panel('x+', 11.2, 32, 0, 34, 10, GLASS);
        for (const z of [-19, 19]) { g.block(-16, 24, z, 2.5, 18, 2.5, '#3A3F58'); g.block(-3, 40.5, z, 26, 2.5, 2.5, '#3A3F58'); }
        g.block(-16, 40.5, 0, 2.5, 2.5, 40, '#3A3F58');
        for (const x of [-27, 27]) for (const z of [-19, 19]) { g.cyl(x, 6, z, 9, 9, 6, 10, TIRE, { rx: Math.PI / 2 }); g.cyl(x, 8.5, z * 1.17, 4, 4, 1, 8, '#FFD23F', { rx: Math.PI / 2 }); }
        g.cyl(-40, 24 - 3, 0, 8, 8, 6, 10, TIRE, { rz: Math.PI / 2 });
        for (const z of [-13, 13]) g.panel('x+', 42.3, 18, z, 6, 5, '#FFF7C2'); g.block(43, 4, 0, 2, 5, 40, '#3A3F58');
      } });
    def('dino_bigtree', { hs: 0.8, w: 150, d: 150, h: 320, points: 26, mass: 120000, tints: JUNGLE,
      build(g) {
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.4; limb(g, [Math.cos(a) * 70, 0, Math.sin(a) * 70], [Math.cos(a) * 22, 64, Math.sin(a) * 22], 14, 8, 5, '#7B4E35'); }
        g.cyl(0, 0, 0, 36, 50, 182, 9, WOOD); g.cyl(0, 70, 0, 41, 45, 9, 9, '#7B4E35'); g.cyl(0, 128, 0, 39, 41, 8, 9, '#7B4E35');
        g.ball(0, 36, 44, 14, '#4A3326', { sy: 1.35, sz: 0.5 }); g.glowing(() => { for (const x of [-5, 5]) g.ball(x, 40, 49, 2.6, '#FFD23F'); });
        for (const [x, z] of [[70, 20], [-60, -30], [-10, 70]]) limb(g, [0, 165, 0], [x, 228, z], 15, 9, 6, WOOD);
        g.ball(0, 214, 0, 95, '#FFF', { tint: true, sy: 0.5 }); g.ball(60, 248, 30, 60, '#FFF', { tint: true, sy: 0.55 }); g.ball(-55, 254, -25, 62, '#FFF', { tint: true, sy: 0.55 });
        g.ball(-22, 236, 58, 50, '#FFF', { tint: true, sy: 0.5 }); g.ball(10, 280, -5, 55, '#FFF', { tint: true, sy: 0.6 });
        for (const [a, h] of [[0.3, 70], [1.5, 54], [2.6, 80], [3.7, 60], [4.9, 74], [5.8, 50]]) g.block(Math.cos(a) * 82, 196 - h, Math.sin(a) * 82, 2.6, h, 2.6, '#7DDB48');
        for (const [a, c] of [[0.9, '#FF5A8A'], [2.1, '#FFB01F'], [3.3, '#FF5A8A'], [4.4, '#FFB01F'], [5.5, '#B388FF']]) g.ball(Math.cos(a) * 70, 182, Math.sin(a) * 70, 7, c);
        g.block(50, 150, 40, 50, 4, 40, WOOD2, { ry: 0.7 }); g.ball(52, 158, 40, 10, WOOD2, { sy: 0.4 }); g.ball(50, 162, 38, 4, '#C8F5E8', { sy: 1.3 }); g.ball(56, 162, 43, 3.6, '#FFE1F0', { sy: 1.3 });
      } });
    def('dino_lab', { w: 220, d: 170, h: 160, points: 24, mass: 50000, tints: ['#2EC4B6', '#FF8C42', '#FF5A8A'],
      build(g) {
        for (const x of [-100, 0, 100]) for (const z of [-75, 75]) g.cyl(x, 0, z, 5, 5, 20, 7, WOOD);
        g.block(0, 20, 0, 220, 6, 170, WOOD2);
        g.block(-10, 26, -12, 170, 70, 120, CREAM); g.block(-10, 26, -12, 173, 5, 123, '#5FD3B8');
        g.gable(-10, 96, -12, 188, 138, 44, '#FFF', { tint: true });
        for (const x of [-70, -30, 10]) { g.panel('z+', x, 64, 48.3, 26, 22, GLASS); g.panel('z-', x, 64, -72.3, 26, 22, GLASS); }
        g.panel('z+', 48, 50, 48.4, 22, 44, WOOD); g.panel('x+', 75.3, 64, -12, 30, 22, GLASS); g.panel('x-', -95.3, 64, -12, 30, 22, GLASS);
        g.panel('z+', -30, 90, 48.5, 76, 11, '#FFD23F'); g.panel('z+', -30, 90, 48.6, 60, 3.5, DARK);
        g.block(0, 26, 83, 218, 10, 2, WOOD); for (let i = 0; i < 9; i++) g.block(-104 + i * 26, 26, 83, 2.5, 12, 2.5, '#7B4E35');
        g.block(-102, 26, 60, 3, 44, 3, '#C9CCD9'); g.ball(-102, 72, 60, 13, '#FFFFFF', { sy: 0.35, rx: 0.7 }); g.cyl(-102, 70, 66, 1.5, 1.5, 10, 5, '#C9CCD9', { rx: 0.7 });
        g.block(30, 120, -12, 2, 40, 2, '#C9CCD9'); g.ball(30, 160, -12, 2.4, '#FF4757');
        g.cyl(90, 26, -50, 16, 16, 40, 10, '#5FD3B8'); g.cone(90, 66, -50, 17, 8, 10, '#3FAE9A');
        for (const [x, z, s] of [[-70, 66, 16], [-52, 70, 12], [70, 66, 18], [88, 70, 12]]) g.block(x, 26, z, s, s, s, '#C98F62');
      } });
    // ---------- dinos ----------
    def('dino_stego', { w: 134, d: 54, h: 74, points: 12, mass: 3000, tints: DINO,
      build(g) {
        for (const [x, z] of [[26, 15], [26, -15], [-30, 15], [-30, -15]]) { g.cyl(x, 0, z, 6.5, 7.5, 24, 7, '#FFF', { tint: true }); g.cyl(x, 0, z, 8.4, 8.4, 3, 7, CREAM); }
        g.ball(-4, 32, 0, 26, '#FFF', { tint: true, sx: 1.75, sy: 0.95, sz: 0.95, detail: 1 }); g.ball(-2, 26, 0, 22, CREAM, { sx: 1.7, sy: 0.72, sz: 0.88 });
        limb(g, [34, 30, 0], [50, 22, 0], 10, 7, 7, '#FFF', { tint: true }); g.ball(56, 20, 0, 8.5, '#FFF', { tint: true, sx: 1.35, sy: 0.85 });
        eyes(g, 60, 23.5, 6, 1.9);
        limb(g, [-46, 34, 0], [-66, 26, 0], 10, 3, 7, '#FFF', { tint: true });
        for (const z of [-1, 1]) for (const x of [-58, -64]) limb(g, [x, 28, z * 2], [x - 4, 37, z * 9], 2, 0.1, 5, CREAM);
        for (let i = 0; i < 7; i++) {
          const x = -36 + i * 10.5, f = (x + 4) / 45.5, top = 32 + 24.7 * Math.sqrt(Math.max(0, 1 - f * f)), k = 1 - Math.abs(f) * 0.8;
          g.ball(x, top + 3 + 6 * k, 0, 1, i % 2 ? '#FF8C42' : '#FFD23F', { sx: 5.5, sy: 6 + 7 * k, sz: 1.6 });
        }
      } });
    def('dino_trike', { w: 116, d: 56, h: 58, points: 10, mass: 4000, tints: DINO,
      build(g) {
        for (const [x, z] of [[14, 15], [14, -15], [-36, 15], [-36, -15]]) { g.cyl(x, 0, z, 7.5, 8, 20, 7, '#FFF', { tint: true }); g.cyl(x, 0, z, 9, 9, 3, 7, CREAM); }
        g.ball(-14, 28, 0, 24, '#FFF', { tint: true, sx: 1.65, sy: 0.9, sz: 1.0, detail: 1 }); g.ball(-12, 22, 0, 20, CREAM, { sx: 1.6, sy: 0.7, sz: 0.9 });
        limb(g, [-50, 28, 0], [-60, 16, 0], 9, 2, 6, '#FFF', { tint: true });
        g.cyl(22, 32, 0, 22, 22, 4, 10, '#FFD23F', { rz: Math.PI / 2 });
        for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI; g.ball(20.5, 34 + 21 * Math.sin(a), 21 * Math.cos(a), 3, '#FF5A8A'); }
        g.ball(32, 26, 0, 13, '#FFF', { tint: true, sx: 1.25 }); eyes(g, 40, 30, 9, 2.6);
        g.cone(48, 16, 0, 5, 9, 5, CREAM, { rz: -Math.PI / 2 });
        for (const z of [-6, 6]) limb(g, [38, 36, z], [54, 46, z * 1.2], 3, 0.1, 5, CREAM);
        limb(g, [44, 24, 0], [52, 30, 0], 2.6, 0.1, 5, CREAM);
      } });
    def('dino_rex', { w: 212, d: 86, h: 172, points: 16, mass: 7000, tints: ['#7BD84A', '#FF7A45', '#A66CFF', '#2EC4B6'],
      build(g) {
        for (const z of [-30, 30]) { g.ball(-12, 80, z, 20, '#FFF', { tint: true, sx: 1.3, sy: 1.2, sz: 0.6 }); limb(g, [-6, 64, z], [-14, 10, z], 9, 7, 7, '#FFF', { tint: true }); g.block(-6, 0, z, 30, 9, 16, '#E8A04A'); for (const dz of [-5, 0, 5]) g.cone(10, 1, z + dz, 2.4, 6, 4, CREAM, { rz: -Math.PI / 2 }); }
        g.ball(-10, 100, 0, 38, '#FFF', { tint: true, sx: 1.5, sy: 0.95, sz: 1.0, rz: 0.25, detail: 1 }); g.ball(4, 92, 0, 30, '#FFE58A', { sx: 1.2, sy: 0.9, sz: 0.9, rz: 0.3 });
        chain(g, [[-60, 104, 0], [-90, 88, 0], [-106, 68, 0]], [26, 15, 3], 7, '#FFF', { tint: true });
        limb(g, [25, 118, 0], [45, 140, 0], 22, 20, 7, '#FFF', { tint: true });
        g.ball(68, 150, 0, 24, '#FFF', { tint: true, sx: 1.45, sy: 0.8, sz: 0.9 }); g.ball(70, 134, 0, 20, '#FFF', { tint: true, sx: 1.3, sy: 0.45 });
        g.block(80, 137, 0, 34, 4, 26, '#B33951');
        for (let i = 0; i < 4; i++) for (const z of [-11, 11]) g.cone(66 + i * 9, 135.5, z, 2.2, 5, 4, '#FFFFFF', { rx: Math.PI });
        eyes(g, 72, 160, 15, 4.5); for (const z of [-15, 15]) g.block(74, 165, z, 10, 2.5, 6, DARK, { rz: -0.3 });
        for (const z of [-26, 26]) limb(g, [30, 105, z], [44, 96, z * 1.12], 4, 3, 5, '#FFF', { tint: true });
        for (let i = 0; i < 6; i++) { const x = -70 + i * 18; g.cone(x, 128 + (i < 4 ? i * 4 : 16 - (i - 4) * 6) - (i === 0 ? 18 : 0), 0, 5, 10, 4, '#FFD23F'); }
      } });
    def('dino_longs', { w: 340, d: 140, h: 290, points: 24, mass: 40000, tints: DINO, build(g) { longneck(g, 1); } });
    def('dino_longneck', { hs: 0.82, w: 483, d: 196, h: 412, points: 42, mass: 90000, tints: ['#5FD3B8', '#A66CFF', '#4FA8FF', '#7BD84A'], build(g) { longneck(g, 1.42); } });
    // ---------- scenery ----------
    def('dino_pillar', { hs: 0.75, w: 120, d: 120, h: 400, points: 18, mass: 200000,
      build(g) {
        const cols = ['#C98F62', '#B5784F', '#D9A673', '#C08455', '#D19A68', '#B87E52'];
        for (let k = 0; k < 6; k++) { const r = 58 - k * 6.5, jx = [0, 4, -3, 3, -4, 2][k], jz = [0, -3, 4, 2, -2, 3][k]; g.cyl(jx, k * 62, jz, r - 5, r, 63, 7, cols[k], { ry: k * 0.7 }); }
        g.ball(2, 374, 3, 30, '#5FCB4E', { sy: 0.32 }); g.ball(-10, 380, -6, 16, '#4FBF4A', { sy: 0.5 });
        for (let i = 0; i < 5; i++) leaf(g, 6, 378, 4, 22, 7, 2, i / 5 * Math.PI * 2, 0.45, '#7DDB48');
        g.ball(14, 381, 10, 8, WOOD2, { sy: 0.4 }); g.ball(12, 385, 9, 3.2, '#C8F5E8', { sy: 1.3 }); g.ball(16, 385, 12, 3, '#FFE1F0', { sy: 1.3 });
        for (const [a, h] of [[0.8, 90], [2.4, 70], [3.9, 110], [5.4, 60]]) { const r = 30; g.block(Math.cos(a) * r, 372 - h, Math.sin(a) * r, 2.2, h, 2.2, '#43C463'); }
        g.ball(34, 8, 26, 14, '#A88A70', { sy: 0.7 }); g.ball(-38, 6, -24, 12, '#A88A70', { sy: 0.7 });
      } });
    def('dino_falls', { w: 340, d: 160, h: 236, points: 30, mass: 400000,
      build(g) {
        g.block(-110, 0, -10, 120, 176, 140, '#A7957F'); g.block(0, 0, -15, 104, 220, 130, '#B5A28A'); g.block(110, 0, -10, 120, 166, 140, '#9E8C77');
        g.block(-110, 176, -10, 124, 8, 144, '#5FCB4E'); g.block(0, 220, -15, 108, 8, 134, '#5FCB4E'); g.block(110, 166, -10, 124, 8, 144, '#5FCB4E');
        g.block(-60, 150, 60, 30, 26, 10, '#9E8C77'); g.block(62, 120, 60, 28, 30, 10, '#A7957F');
        g.block(0, 0, 52, 60, 224, 5, '#6FD8FF', { shade: false }); g.block(0, 224, -15, 46, 4, 134, '#5CCCF5', { shade: false });
        for (const [x, y, h] of [[-20, 150, 60], [-6, 70, 80], [10, 170, 46], [22, 60, 70], [-24, 40, 50], [4, 200, 30]]) g.panel('z+', x, y, 54.8, 4, h, '#E8FBFF');
        for (const [x, z, r] of [[-22, 62, 14], [20, 64, 15], [0, 70, 13], [-38, 58, 9], [38, 58, 9]]) g.ball(x, 5, z, r, '#F2FCFF', { sy: 0.6 });
        for (const [x, y, h] of [[-150, 130, 70], [-120, 120, 60], [-75, 140, 50], [140, 120, 60], [96, 110, 70], [160, 130, 40]]) g.panel('z+', x, y, 60.4, 6, h, '#43C463');
        for (const [x, z, r] of [[-150, 66, 16], [150, 64, 18], [-92, 68, 12], [96, 70, 11]]) g.ball(x, 6, z, r, '#8F7E6B', { sy: 0.7 });
        for (const [x, z] of [[-130, -30], [-90, 20], [120, -40], [80, 10]]) { g.ball(x, 186 - (x > 0 ? 10 : 0), z, 14, '#38C55A'); }
      } });
    def('dino_temple', { hs: 0.85, w: 420, d: 420, h: 330, points: 140, mass: 2000000,
      build(g) {
        const sz = [420, 350, 280, 210], cols = ['#E0B77E', '#D4A86E', '#E0B77E', '#D4A86E'];
        for (let k = 0; k < 4; k++) { g.block(0, k * 55, 0, sz[k], 52, sz[k], cols[k]); g.block(0, k * 55 + 52, 0, sz[k] + 2, 3, sz[k] + 2, '#F0D6A8'); g.block(0, k * 55 + 36, 0, sz[k] + 1.2, 7, sz[k] + 1.2, '#2EC4B6'); }
        for (let i = 0; i < 8; i++) g.block(0, 0, 210 - i * 13.1 - 6.5, 76, (i + 1) * 27.5, 13.1, i % 2 ? '#F3DDB4' : '#EAD0A2');
        for (const s of [-1, 1]) g.block(s * 44, 0, 158, 12, 120, 104, '#C99A62');
        g.block(0, 220, 0, 120, 60, 120, '#EBCB94'); g.block(0, 280, 0, 140, 10, 140, '#2EC4B6'); g.cone(0, 290, 0, 84, 36, 4, '#E0B77E', { ry: Math.PI / 4 });
        g.panel('z+', 0, 242, 60.3, 40, 44, '#3A3F58'); g.block(0, 262, 60, 76, 18, 4, '#C99A62'); g.block(0, 252, 61, 30, 8, 6, '#B5844F');
        g.glowing(() => {
          for (const x of [-22, 22]) g.ball(x, 270, 62, 5, '#FFB01F');
          g.ball(0, 240, 52, 10, '#5EF0D0', { sy: 1.3 });
          for (const [x, z] of [[-88, -88], [88, -88], [-88, 88], [88, 88]]) g.cone(x, 232, z, 7, 15, 5, '#FF9A2E');
        });
        for (const [x, z] of [[-88, -88], [88, -88], [-88, 88], [88, 88]]) g.cyl(x, 220, z, 8, 5, 12, 6, '#7A6B5A');
        for (let k = 0; k < 4; k++) { const h = sz[k] / 2 + 0.4; for (const [o, len] of [[-0.62, 34], [-0.3, 22], [0.35, 30], [0.7, 18]]) { const t = o * sz[k] / 2, y = k * 55 + 52 - len / 2; g.panel('z+', t, y, h, 6, len, '#43C463'); g.panel('x+', h, y, t, 6, len, '#43C463'); g.panel('x-', -h, y, -t, 6, len, '#43C463'); } }
        for (const [x, z, r] of [[-150, 175, 16], [170, -120, 20], [130, 178, 13], [-185, -60, 14]]) g.ball(x, 8, z, r, '#A99E82', { sy: 0.7 });
      } });
    def('dino_fossil', { w: 380, d: 320, h: 250, points: 85, mass: 900000,
      build(g) {
        g.block(0, 0, 0, 380, 14, 320, '#E8C48A'); g.block(0, 0, 0, 386, 6, 326, '#D9AE70');
        for (const z of [-80, 0, 80]) g.block(0, 14, z, 370, 0.8, 1.4, '#FF5A5F'); for (const x of [-100, 0, 100]) g.block(x, 14, 0, 1.4, 0.8, 310, '#FF5A5F');
        for (const [x, z] of [[-150, 130], [150, -130], [150, 130], [-150, -130]]) { g.block(x, 14, z, 3, 16, 3, WOOD); g.block(x + 3, 26, z, 7, 5, 0.6, '#FFD23F'); }
        for (const [x0, x1] of [[95, 72], [-80, -66]]) for (const s of [-1, 1]) { chain(g, [[x0, 14, s * 120], [(x0 + x1) / 2 + 6, 90, s * 82], [x1, 168, s * 30]], [9, 7.5, 9], 6, BONE); g.ball(x0, 16, s * 120, 13, BONE2, { sy: 0.6 }); }
        chain(g, [[-130, 160, 0], [-80, 176, 0], [-20, 182, 0], [40, 180, 0], [95, 172, 0]], [10, 12, 12, 12, 10], 6, BONE);
        for (let i = 0; i < 9; i++) { const x = -120 + i * 26; g.block(x, 186 - Math.abs(x) * 0.05, 0, 6, 12, 5, BONE2); }
        for (let i = 0; i < 5; i++) { const x = -62 + i * 28, yS = 180; for (const s of [-1, 1]) chain(g, [[x, yS, 0], [x + 2, yS - 8, s * 62], [x + 4, yS - 60, s * 98], [x + 6, yS - 110, s * 92]], [5, 5, 4.4, 3], 5, BONE); }
        chain(g, [[95, 172, 0], [130, 196, 0], [150, 220, 0]], [10, 8, 7], 6, BONE);
        g.ball(162, 226, 0, 22, BONE, { sx: 1.4, sy: 0.75, sz: 0.9 }); g.ball(166, 212, 0, 16, BONE2, { sx: 1.3, sy: 0.4 });
        for (const z of [-11, 11]) g.ball(166, 232, z, 6, '#6B5444');
        for (let i = 0; i < 4; i++) for (const z of [-9, 9]) g.cone(150 + i * 10, 208, z, 1.8, 5, 4, '#FFFFFF', { rx: Math.PI });
        chain(g, [[-130, 160, 0], [-165, 120, 0], [-182, 70, 0], [-186, 22, 0]], [10, 8, 5, 2.5], 6, BONE);
        for (const [x, z, s] of [[-40, -110, 1], [40, 120, 1.2], [140, 30, 0.9]]) { g.block(x, 14, z, 12 * s, 9 * s, 10 * s, '#C9CCD9'); g.block(x + 14 * s, 14, z, 4, 2, 24 * s, WOOD, { ry: 0.5 }); }
      } });
    def('dino_volcano', { hs: 0.8, w: 560, d: 560, h: 800, points: 330, mass: 8000000,
      build(g) {
        g.cyl(0, 0, 0, 262, 280, 34, 11, '#4FBF4A'); g.cyl(0, 0, 0, 255, 272, 40, 11, '#3FAE4A', { ry: 0.28 });
        g.cyl(0, 34, 0, 152, 258, 236, 11, '#8A5A44'); g.cyl(0, 270, 0, 98, 152, 180, 11, '#7A4B3A'); g.cyl(0, 450, 0, 84, 98, 52, 11, '#6B3F33');
        g.cyl(0, 498, 0, 92, 86, 14, 11, '#5A3530');
        const R = (y) => y < 270 ? 258 - (y - 34) / 236 * 106 : y < 450 ? 152 - (y - 270) / 180 * 54 : 98 - (y - 450) / 52 * 14;
        g.glowing(() => {
          g.cyl(0, 500, 0, 78, 78, 14, 11, '#FF7A1A');
          for (const [x, z, r] of [[20, 10, 14], [-30, -20, 11], [10, -40, 9], [-14, 34, 10]]) g.ball(x, 514, z, r, '#FFD23F', { sy: 0.5 });
          for (const [a0, y1, wig] of [[Math.PI / 2, 120, 0.12], [Math.PI / 2 + 0.9, 220, -0.1], [Math.PI / 2 - 1.0, 170, 0.08], [Math.PI * 1.45, 260, 0.1], [0.15, 300, -0.12]]) {
            const pts = []; const n = 5;
            for (let i = 0; i <= n; i++) { const y = 504 - (504 - y1) * i / n, a = a0 + Math.sin(i * 1.7) * wig, r = R(y) + 2; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
            const rad = []; for (let i = 0; i <= n; i++) rad.push(13 - i * 1.4);
            chain(g, pts, rad, 6, i0(a0));
          }
        });
        function i0(a) { return a > 1.5 && a < 1.65 ? '#FF8A1F' : '#FF6A1A'; }
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.2; g.ball(Math.cos(a) * 250, 30, Math.sin(a) * 250, 24 + (i % 3) * 6, '#5E4B63', { sy: 0.65 }); }
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.5, r = 190; g.ball(Math.cos(a) * r, 120, Math.sin(a) * r, 16, '#6B4E40', { sy: 0.6 }); }
        for (const [x, y, z, r] of [[-40, 590, -40, 44], [-10, 640, -60, 40], [-50, 690, -40, 34], [-20, 735, -70, 28], [-50, 772, -50, 22]]) g.ball(x, y, z, r, '#EDE7F2', { sy: 0.72 });
        for (const [x, y, z, r] of [[-62, 548, -20, 26], [20, 610, -50, 24], [-70, 650, -70, 20]]) g.ball(x, y, z, r, '#D9D1E3', { sy: 0.7 });
      } });
  }

  // ---- layout helpers ----
  function segDist(px, pz, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz; let t = L ? ((px - a[0]) * dx + (pz - a[1]) * dz) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t); }
  function polyDist(px, pz, pts, closed) { let d = 1e9; for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) d = Math.min(d, segDist(px, pz, pts[i], pts[(i + 1) % pts.length])); return d; }
  function segX(a, b, c, d) {
    const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], den = rx * sz - rz * sx; if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den;
    return t < 0 || t > 1 || u < 0 || u > 1 ? null : { x: a[0] + rx * t, z: a[1] + rz * t, dx: rx, dz: rz };
  }
  function crossings(p, q, closedP) { const out = []; for (let i = 0; i < p.length - (closedP ? 0 : 1); i++) for (let j = 0; j < q.length - 1; j++) { const x = segX(p[i], p[(i + 1) % p.length], q[j], q[j + 1]); if (x) out.push(x); } return out; }
  // Walk a polyline by arc length, calling fn(x, z, nx, nz, i) every `step` units.
  function along(pts, step, fn, closed) {
    let carry = 0, i = 0;
    for (let s = 0; s < pts.length - (closed ? 0 : 1); s++) {
      const a = pts[s], b = pts[(s + 1) % pts.length], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (!l) continue;
      let t = carry; for (; t < l; t += step) fn(a[0] + dx * t / l, a[1] + dz * t / l, -dz / l, dx / l, i++);
      carry = t - l;
    }
  }
  function chaikin(pts, it, closed) {
    for (let k = 0; k < it; k++) {
      const out = closed ? [] : [pts[0]];
      for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      if (!closed) out.push(pts[pts.length - 1]); pts = out;
    }
    return pts;
  }

  // Map plan (x east, z south; camera looks north).
  const RIVER = chaikin([[700, 700], [900, 1000], [1250, 1350], [1450, 1800], [1350, 2300], [1600, 2750], [2100, 3020], [2600, 3150], [2900, 3600], [2800, 4100], [3050, 4600], [3300, 5262]], 3, false);
  const CL = {
    pool: { x: 700, z: 690, r: 190 }, north: { x: 2300, z: 1250, r: 430 }, west: { x: 560, z: 2000, r: 330 }, dig: { x: 2250, z: 2250, r: 330 },
    east: { x: 4250, z: 2350, r: 380 }, temple: { x: 850, z: 3420, r: 400 }, camp: { x: 3950, z: 3760, r: 420 }, south: { x: 1750, z: 4350, r: 400 },
    nests: { x: 2330, z: 3760, r: 250 }, dig2: { x: 4350, z: 4700, r: 290 }, volcano: { x: 3850, z: 950, r: 470 }, glade: { x: 3200, z: 2020, r: 200 }, sw: { x: 420, z: 4680, r: 210 },
  };
  const PATHS = [
    [[700, 880], [650, 1300], [560, 2000]], [[560, 2000], [760, 2700], [850, 3420]], [[850, 3420], [1300, 3900], [1750, 4350]],
    [[1750, 4350], [2100, 4020], [2330, 3760]], [[2330, 3760], [2900, 3880], [3250, 3830], [3530, 3790]], [[2300, 1250], [1500, 900], [700, 760]],
    [[2300, 1250], [2250, 2250]], [[2300, 1250], [3100, 1100], [3850, 950]], [[2250, 2250], [3200, 2020], [4250, 2350]],
    [[2250, 2250], [1400, 2100], [560, 2000]], [[4270, 4080], [4350, 4700]], [[1750, 4350], [900, 4650], [420, 4680]], [[2250, 2250], [2330, 3760]],
  ].map((p) => chaikin(p, 2, false));
  const TRACK = chaikin([[3650, 3350], [4250, 3330], [4650, 2900], [4520, 2250], [3700, 1640], [2900, 2240], [3250, 3120]], 3, true);

  HC.Levels.add({
    id: 'dino', num: 9, name: 'Dino Valley', tagline: 'Prehistoric jungle · herds, fossils & a volcano', icon: '🦖', colors: ['#3FD07A', '#FF7A1A'],
    theme: { sky: '#A4ECE4', fogNear: 9000, fogFar: 22000, sea: { show: true, deep: '#139FB8', shallow: '#56E3CF', foam: 1 }, skirt: '#B98352',
      hemiSky: '#E9FFF4', hemiGround: '#B9A6F0', hemi: 1.55, sun: '#FFF0D2', sunI: 2.35, glow: 0.35 },
    mods: { botSkill: -0.1 },
    milestones: [['dino_jeep', '🚙 Safari jeeps'], ['dino_stego', '🦕 Stegos'], ['dino_rex', '🦖 Big Chompers'], ['dino_pillar', '🗿 Rock pillars'], ['dino_longs', '🦕 Long-necks'],
      ['dino_lab', '🏕️ Research labs'], ['dino_longneck', '🦕 Giant long-necks'], ['dino_fossil', '🦴 Fossil digs'], ['dino_temple', '🛕 The jungle temple'], ['dino_volcano', '🌋 THE VOLCANO']],
    kinds,
    generate(T) {
      const rng = T.rng;
      // Remember the footprint of every big static thing so later clutter never lands inside one
      // (T.free alone only checks a circle, which misses box corners).
      const bigs = [], put0 = T.put, free0 = T.free;
      const inBig = (x, z, r) => { for (const b of bigs) { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < b.w + r && Math.abs(lz) < b.d + r) return true; } return false; };
      T.put = (kind, x, z, rot = 0, extra = {}) => { const o = put0(kind, x, z, rot, extra), k = HC.CATALOG[kind]; if (o && !extra.mover && k.minDim >= 100) bigs.push({ x, z, w: k.w / 2, d: k.d / 2, c: Math.cos(rot), s: Math.sin(rot) }); return o; };
      T.free = (x, z, r) => free0(x, z, r) && !inBig(x, z, r);
      T.island({ ground: COL.sand, edge: '#E2BC72' });
      // Jungle floor with a wavy shoreline.
      T.rect(-40, -40, 5040, 5040, 0, COL.jungle);
      for (let t = 0; t <= 5000; t += 160) for (const [x, z] of [[t, -40], [t, 5040], [-40, t], [5040, t]]) T.disc(x + rng.range(-30, 30), z + rng.range(-30, 30), rng.range(70, 130), 0.05, COL.jungle, 14);
      for (let i = 0; i < 70; i++) T.disc(rng.range(0, 5000), rng.range(0, 5000), rng.range(140, 360), 0.3, i % 2 ? COL.jungleD : COL.jungleD2, 16, rng.range(0.8, 1.3), rng.range(0.8, 1.3));
      // Clearings: lumpy lighter meadows.
      for (const k in CL) {
        const c = CL[k]; if (k === 'pool') continue;
        const base = k === 'volcano' ? COL.basalt : k === 'camp' ? COL.camp : k === 'dig' || k === 'dig2' ? COL.dig : COL.glade;
        const rim = k === 'volcano' ? COL.basalt2 : k === 'camp' || k === 'dig' || k === 'dig2' ? '#CDA06A' : COL.glade2;
        T.disc(c.x, c.z, c.r + 50, 0.6, rim, 30);
        for (let i = 0; i < 4; i++) { const a = rng() * 6.28; T.disc(c.x + Math.cos(a) * c.r * 0.55, c.z + Math.sin(a) * c.r * 0.55, c.r * 0.6, 0.6, rim, 20); }
        T.disc(c.x, c.z, c.r, 1.0, base, 30);
        for (let i = 0; i < 3; i++) { const a = rng() * 6.28; T.disc(c.x + Math.cos(a) * c.r * 0.4, c.z + Math.sin(a) * c.r * 0.4, c.r * 0.55, 1.0, base, 20); }
      }
      // Ribbons drawn as overlapping discs (T.strip quads currently face down and render dark).
      const ribbon = (pts, w, y, color, closed) => { along(pts, w * 0.3, (x, z) => T.disc(x, z, w / 2, y, color, 14), closed); if (!closed) { const e = pts[pts.length - 1]; T.disc(e[0], e[1], w / 2, y, color, 14); } };
      // Trails, jeep track, river.
      for (const p of PATHS) { ribbon(p, 92, 2.2, COL.pathEdge); ribbon(p, 74, 2.4, COL.path); }
      ribbon(TRACK, 128, 2.2, COL.pathEdge, true); ribbon(TRACK, 108, 2.4, COL.track, true);
      along(TRACK, 34, (x, z, nx, nz, i) => { for (const o of [-26, 26]) T.disc(x + nx * o, z + nz * o, 5, 2.5, '#B5844F', 6); }, true);
      T.disc(CL.pool.x, CL.pool.z, 250, 2.1, COL.bank, 30); T.disc(CL.pool.x, CL.pool.z, 205, 2.6, COL.water, 30); T.disc(CL.pool.x, CL.pool.z - 30, 120, 2.9, COL.deep, 24);
      ribbon(RIVER, 250, 2.1, COL.bank); ribbon(RIVER, 180, 2.6, COL.water); ribbon(RIVER, 80, 2.9, COL.deep);
      for (let i = 4; i < RIVER.length - 2; i += 7) { const [x, z] = RIVER[i]; T.disc(x + rng.range(-40, 40), z + rng.range(-40, 40), rng.range(6, 12), 3.1, COL.foam, 8, 2.4, 0.6); }
      for (const [x, z] of [[600, 560], [800, 570], [700, 610]]) T.disc(x, z, 30, 3.1, COL.foam, 12, 1.6, 0.7);
      // Stepping stones where trails ford the river.
      for (const p of PATHS) for (const c of crossings(p, RIVER, false)) {
        const l = Math.hypot(c.dx, c.dz), ux = c.dx / l, uz = c.dz / l;
        for (let s = -120; s <= 120; s += 40) T.disc(c.x + ux * s + rng.range(-6, 6), c.z + uz * s + rng.range(-6, 6), rng.range(15, 19), 3.2, s % 80 ? '#B8B2C6' : '#C9C3D6', 9);
      }
      // Wooden bridges where the jeep track crosses water.
      for (const c of crossings(TRACK, RIVER, true)) {
        const l = Math.hypot(c.dx, c.dz), ux = c.dx / l, uz = c.dz / l;
        along([[c.x - ux * 150, c.z - uz * 150], [c.x + ux * 150, c.z + uz * 150]], 20, (x, z) => T.disc(x, z, 62, 3.2, COL.plank, 16));
        
      }
      const nearRiver = (x, z, m) => polyDist(x, z, RIVER, false) < 125 + m || Math.hypot(x - CL.pool.x, z - CL.pool.z) < 230 + m;
      const nearPath = (x, z, m) => { for (const p of PATHS) if (polyDist(x, z, p, false) < 45 + m) return true; return polyDist(x, z, TRACK, true) < 66 + m; };
      const inCl = (x, z, m, skip) => { for (const k in CL) { if (k === skip) continue; const c = CL[k]; if (Math.hypot(x - c.x, z - c.z) < c.r + m) return true; } return false; };
      const blocked = (x, z, m) => nearRiver(x, z, m) || nearPath(x, z, m);
      const onLand = (x, z, m = 0) => x > -30 + m && x < 5030 - m && z > -30 + m && z < 5030 - m;
      // Try to place one kind near (x, z), nudging until it is clear.
      const place = (kind, x, z, rot, o = {}) => {
        const k = HC.CATALOG[kind], rr = k.radius * (o.k ?? 0.7);
        for (let i = 0; i < (o.tries ?? 14); i++) {
          const px = x + (i ? rng.range(-1, 1) * (o.jit ?? 120) : 0), pz = z + (i ? rng.range(-1, 1) * (o.jit ?? 120) : 0);
          if (!onLand(px, pz, 10) || !T.free(px, pz, rr + (o.gap ?? 4)) || blocked(px, pz, rr * (o.pathK ?? 1)) || (o.avoidCl && inCl(px, pz, rr, o.avoidCl === true ? null : o.avoidCl))) continue;
          return T.put(kind, px, pz, rot == null ? rng() * 6.28 : rot, o.extra || {});
        }
        return null;
      };
      const FOOD = { dino_egg: 3, dino_mushroom: 4, dino_flower: 4, dino_fern: 2, dino_amber: 1 };
      const sprinkle = (w, area, n, gap = 8) => T.scatter(w, area, n, { gap, avoid: (x, z) => nearRiver(x, z, 4) || !onLand(x, z, 10) });
      const sprinkleB = (w, area, n, gap = 8) => T.scatter(w, area, n, { gap, avoid: (x, z) => blocked(x, z, 14) || !onLand(x, z, 10) });
      // ---- Volcano (landmark) on its basalt field ----
      const V = CL.volcano;
      T.put('dino_volcano', V.x, V.z + 20, 0);
      for (let i = 0; i < 7; i++) { const a = Math.PI * 0.25 + i * 0.75, r = rng.range(340, 430); T.disc(V.x + Math.cos(a) * r, V.z + Math.sin(a) * r, rng.range(26, 40), 1.4, COL.lava, 12, 1.6, 0.8); T.ring(V.x + Math.cos(a) * r, V.z + Math.sin(a) * r, 40, 48, 1.3, '#4A3A4C', 14); }
      for (let i = 0; i < 16; i++) { const a = rng() * 6.28; place('dino_boulder', V.x + Math.cos(a) * rng.range(330, 450), V.z + Math.sin(a) * rng.range(330, 450), null, { extra: { tint: 3 }, jit: 40 }); }
      for (let i = 0; i < 18; i++) { const a = rng() * 6.28; place('dino_amber', V.x + Math.cos(a) * rng.range(320, 470), V.z + Math.sin(a) * rng.range(320, 470), null, { jit: 40 }); }
      sprinkle({ dino_egg: 1, dino_mushroom: 2, dino_amber: 1 }, { x: V.x, z: V.z, r: 500, r0: 320 }, 34);

      // ---- Waterfall + pool ----
      T.put('dino_falls', CL.pool.x, CL.pool.z - 290, 0);
      for (const [x, z] of [[430, 420], [990, 430], [1150, 260]]) place('dino_pillar', x, z, rng() * 6.28, { jit: 50 });
      T.roamers({ dino_baby: 1 }, CL.pool.x, CL.pool.z + 300, 80, 4, { speed: [20, 35] });

      // ---- Meadows with herds ----
      // Like T.roamers, but herd members start spread out instead of piled on each other.
      const beasts = [];
      const roam = (w, cx, cz, r, n, speed) => {
        for (let i = 0; i < n; i++) {
          const kind = T.pick(w), k = HC.CATALOG[kind]; let x = cx, z = cz;
          for (let t = 0; t < 30; t++) {
            const a = rng() * 6.28, d = Math.sqrt(rng()) * r; x = cx + Math.cos(a) * d; z = cz + Math.sin(a) * d;
            if (beasts.every((b) => Math.hypot(b.x - x, b.z - z) > (b.r + k.radius) * 0.55)) break;
          }
          beasts.push({ x, z, r: k.radius });
          T.put(kind, x, z, rng() * 6.28, { mover: { type: 'roam', cx, cz, r, speed: rng.range(speed[0], speed[1]), bob: true, spin: 0 } });
        }
      };
      const meadow = (c, herd, nFood) => {
        sprinkle({ dino_flower: 5, dino_egg: 2, dino_mushroom: 2, dino_fern: 2, bush: 1 }, { x: c.x, z: c.z, r: c.r - 20 }, nFood ?? Math.round(c.r * 0.12));
        sprinkleB({ dino_cycad: 2, dino_boulder: 2, dino_fern: 3, dino_amber: 1, dino_palm: 1 }, { x: c.x, z: c.z, r: c.r + 40, r0: c.r - 60 }, Math.round(c.r * 0.06), 12);
        for (const [w, n, sp, rr] of herd) roam(w, c.x, c.z, c.r * rr, n, sp);
      };
      meadow(CL.north, [[{ dino_longneck: 1 }, 3, [10, 22], 0.75], [{ dino_longs: 1 }, 2, [10, 22], 0.75], [{ dino_baby: 1 }, 8, [22, 40], 0.75], [{ dino_raptor: 1 }, 5, [45, 70], 0.8]]);
      meadow(CL.west, [[{ dino_stego: 1 }, 5, [15, 28], 0.65], [{ dino_longs: 1 }, 2, [10, 22], 0.6], [{ dino_baby: 1 }, 6, [22, 40], 0.75]]);
      meadow(CL.east, [[{ dino_trike: 1 }, 6, [15, 28], 0.65], [{ dino_rex: 1 }, 2, [18, 30], 0.5], [{ dino_longneck: 1 }, 2, [10, 22], 0.6], [{ dino_raptor: 1 }, 6, [45, 70], 0.8]]);
      meadow(CL.south, [[{ dino_longs: 1 }, 4, [12, 25], 0.75], [{ dino_longneck: 1 }, 1, [10, 20], 0.6], [{ dino_stego: 1, dino_trike: 1 }, 6, [15, 28], 0.8], [{ dino_baby: 1 }, 8, [22, 40], 0.75]]);
      meadow(CL.glade, [[{ dino_raptor: 1 }, 5, [45, 70], 0.8], [{ dino_rex: 1 }, 1, [15, 25], 0.4]]);
      meadow(CL.sw, [[{ dino_baby: 1 }, 5, [22, 40], 0.75], [{ dino_stego: 1 }, 2, [15, 25], 0.5]]);

      // ---- Nest grove: decal nests full of eggs ----
      const N = CL.nests;
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * 6.28 + rng.range(-0.2, 0.2), r = i % 3 === 0 ? 80 : rng.range(140, 210), x = N.x + Math.cos(a) * r, z = N.z + Math.sin(a) * r;
        if (blocked(x, z, 30)) continue;
        T.disc(x, z, 34, 2.5, COL.nest, 14); T.disc(x, z, 24, 2.7, COL.nestIn, 14);
        for (let e = 0; e < 4; e++) T.put('dino_egg', x + Math.cos(e * 1.57 + 0.4) * 11, z + Math.sin(e * 1.57 + 0.4) * 11, rng() * 6);
      }
      T.roamers({ dino_baby: 1 }, N.x, N.z, N.r, 12, { speed: [20, 38] });
      T.roamers({ dino_longs: 1 }, N.x - 170, N.z - 150, 50, 1, { speed: [8, 14] });
      sprinkle({ dino_flower: 3, dino_mushroom: 2, dino_fern: 1 }, { x: N.x, z: N.z, r: N.r + 60 }, 30);

      // ---- Dig sites with fossil skeletons ----
      const dig = (c, rot, lab) => {
        T.put('dino_fossil', c.x, c.z, rot);
        place('dino_tent', c.x - 250, c.z + 175, 0, { jit: 30 }); place('dino_tent', c.x + 255, c.z - 170, Math.PI / 2, { jit: 30 });
        if (lab) place('dino_lab', c.x + lab[0], c.z + lab[1], 0, { jit: 40 });
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; T.put('cone', c.x + Math.cos(a) * 262, c.z + Math.sin(a) * 262); }
        sprinkleB({ dino_amber: 2, dino_boulder: 1, bin: 1, dino_egg: 2, dino_mushroom: 2 }, { x: c.x, z: c.z, r: c.r + 60, r0: 250 }, 24);
        T.walkLoop([[c.x - 290, c.z - 280], [c.x + 290, c.z - 280], [c.x + 290, c.z + 280], [c.x - 290, c.z + 280]], 6, { person: 1 }, { speed: [28, 44] });
      };
      dig(CL.dig, 0, [-430, -170]); dig(CL.dig2, Math.PI, [-440, 30]);

      // ---- Temple ruin on a stone plaza ----
      const TP = CL.temple;
      T.rect(TP.x - 330, TP.z - 330, TP.x + 330, TP.z + 330, 1.6, COL.plazaRing); T.rect(TP.x - 310, TP.z - 310, TP.x + 310, TP.z + 310, 1.8, COL.plaza);
      for (let i = -2; i <= 2; i++) { T.rect(TP.x + i * 124 - 1.5, TP.z - 310, TP.x + i * 124 + 1.5, TP.z + 310, 1.9, '#D2C6A6'); T.rect(TP.x - 310, TP.z + i * 124 - 1.5, TP.x + 310, TP.z + i * 124 + 1.5, 1.9, '#D2C6A6'); }
      T.put('dino_temple', TP.x, TP.z, 0);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { T.put('dino_cycad', TP.x + sx * 270, TP.z + sz * 270); T.put('dino_amber', TP.x + sx * 235, TP.z + sz * 290); T.put('dino_amber', TP.x + sx * 290, TP.z + sz * 235); }
      for (let i = 0; i < 7; i++) { T.put('dino_flower', TP.x - 150 + i * 50, TP.z + 290); T.put('dino_mushroom', TP.x - 290, TP.z - 150 + i * 50); T.put('dino_mushroom', TP.x + 290, TP.z - 150 + i * 50); T.put('dino_egg', TP.x - 150 + i * 50, TP.z - 290); }
      T.walkLoop([[TP.x - 262, TP.z - 262], [TP.x + 262, TP.z - 262], [TP.x + 262, TP.z + 262], [TP.x - 262, TP.z + 262]], 8, { person: 1 }, { speed: [28, 44] });

      // ---- Research camp ----
      const C = CL.camp;
      T.disc(C.x, C.z + 60, 40, 2.6, '#8D5A3B', 12); T.ring(C.x, C.z + 60, 40, 50, 2.7, '#9C95B0', 12); T.disc(C.x, C.z + 60, 20, 2.8, '#FF8A2A', 10);
      T.put('dino_lab', C.x - 190, C.z - 160, 0); T.put('dino_lab', C.x + 200, C.z - 150, 0); T.put('dino_lab', C.x + 10, C.z + 390, Math.PI);
      for (let i = 0; i < 5; i++) T.put('dino_tent', C.x - 260 + i * 130, C.z + 235, 0);
      T.put('watertower', C.x - 360, C.z + 190, 0); T.put('watertower', C.x + 400, C.z + 60, 0);
      for (let i = 0; i < 3; i++) T.put('dino_jeep', C.x - 100 + i * 100, C.z + 20, Math.PI / 2);
      T.put('container', C.x + 200, C.z + 75, 0); T.put('container', C.x + 200, C.z + 130, 0); T.put('truck', C.x - 230, C.z + 90, 0, { tint: 1 });
      for (let k = 0; k < 6; k++) { T.put('cone', C.x - 60 + k * 24, C.z - 40); T.put(k % 2 ? 'bin' : 'dino_amber', C.x + 30 + k * 28, C.z + 165); }
      for (let k = 0; k < 4; k++) T.put('bench', C.x - 60 + (k % 2) * 120, C.z + 60 + (k < 2 ? -50 : 50), k < 2 ? 0 : Math.PI);
      for (const [x, z] of [[C.x - 330, C.z - 330], [C.x + 330, C.z - 330], [C.x - 330, C.z + 330], [C.x + 330, C.z + 330], [C.x - 410, C.z - 140], [C.x + 410, C.z - 140]]) T.put('lamp', x, z, 0);
      T.walkLoop([[C.x - 330, C.z - 40], [C.x + 330, C.z - 40], [C.x + 330, C.z + 165], [C.x - 330, C.z + 165]], 12, { person: 1 }, { speed: [30, 48], dogChance: 0.15 });
      sprinkle({ dino_mushroom: 2, dino_flower: 2, cone: 1, dino_egg: 1 }, { x: C.x, z: C.z, r: C.r + 50 }, 34);

      // ---- Life on the jeep track and trails ----
      T.loopVehicles({ dino_jeep: 1 }, TRACK, 8, [80, 120]);
      for (const p of [PATHS[1], PATHS[2], PATHS[4], PATHS[7]]) T.walkLoop(p.concat(p.slice(1, -1).reverse()), 3, { person: 2, dino_baby: 1 }, { speed: [30, 46], lane: 0 });

      // ---- Rock pillars out in the jungle ----
      for (const [x, z] of [[1500, 420], [300, 1450], [1900, 640], [2850, 430], [4720, 420], [4780, 1600], [4800, 3200], [2950, 1500], [180, 3000], [1550, 3150], [650, 4250], [2850, 4750], [4800, 4300], [3550, 2750], [1150, 2350], [3300, 4350]]) place('dino_pillar', x, z, rng() * 6.28, { jit: 120, avoidCl: true });
      // Trail-side snacks, like a sidewalk: tiny things in a row with ferns and palms between.
      const trail = (pts, closed, off) => along(pts, 54, (x, z, nx, nz, i) => {
        const s = i % 2 ? 1 : -1, ox = x + nx * off * s, oz = z + nz * off * s;
        if (nearRiver(ox, oz, 6) || !T.free(ox, oz, 9)) return;
        if (i % 11 === 5) { const px = x + nx * (off + 40) * s, pz = z + nz * (off + 40) * s; if (!nearRiver(px, pz, 20) && !nearPath(px, pz, 14) && T.free(px, pz, 18)) T.put(T.pick({ dino_palm: 3, dino_jtree: 1 }), px, pz, rng() * 6); return; }
        T.put(T.pick(i % 4 === 1 ? { dino_fern: 3, dino_cycad: 2, dino_amber: 1, dino_boulder: 1 } : { dino_mushroom: 3, dino_flower: 3, dino_egg: 2 }), ox, oz, rng() * 6);
      }, closed);
      for (const p of PATHS) trail(p, false, 54);
      trail(TRACK, true, 78);

      // ---- Spawn points: open spots with snacks around them ----
      const SP = [[CL.north.x - 40, CL.north.z + 400], [CL.west.x + 60, CL.west.z + 300], [CL.east.x - 40, CL.east.z + 340], [CL.south.x - 300, CL.south.z - 220], [CL.nests.x, CL.nests.z], [CL.camp.x, CL.camp.z + 110],
        [CL.temple.x, CL.temple.z + 420], [CL.dig.x, CL.dig.z + 400], [CL.dig2.x, CL.dig2.z - 380], [CL.glade.x, CL.glade.z], [CL.sw.x, CL.sw.z], [1500, 900], [3100, 1100], [1300, 3900], [3400, 3830], [760, 2700], [CL.pool.x + 40, CL.pool.z + 300]];
      for (const [x, z] of SP) { T.spawnAt(x, z); sprinkle({ dino_egg: 2, dino_mushroom: 1, dino_flower: 1 }, { x, z, r: 130, r0: 30 }, 10, 6); sprinkle(FOOD, { x, z, r: 300, r0: 130 }, 11); T.roamers({ dino_baby: 1 }, x, z, 150, 1, { speed: [20, 34] }); }

      // ---- The jungle: dense groves with a giant tree, palms, ferns and snacks ----
      const groves = [];
      for (let t = 0; t < 5000 && groves.length < 50; t++) {
        const x = rng.range(60, 4940), z = rng.range(60, 4940);
        if (blocked(x, z, 110) || inCl(x, z, 120) || groves.some((g) => Math.hypot(g[0] - x, g[1] - z) < 400)) continue;
        groves.push([x, z]);
      }
      groves.forEach(([x, z], gi) => {
        if (gi % 5 < 2) place('dino_bigtree', x, z, rng() * 6.28, { jit: 50, gap: 10 });
        const area = { x, z, r: 230, r0: 30 };
        T.scatter({ dino_jtree: 3, dino_palm: 4 }, area, 4, { gap: 22, avoid: (px, pz) => blocked(px, pz, 20) || !onLand(px, pz, 10) });
        T.scatter({ dino_fern: 5, dino_cycad: 3, bush: 2, dino_boulder: 2, dino_amber: 1 }, area, 5, { gap: 10, avoid: (px, pz) => blocked(px, pz, 8) || !onLand(px, pz, 10) });
        sprinkle({ dino_mushroom: 4, dino_flower: 3, dino_egg: 2 }, { x, z, r: 260 }, 7);
        if (gi % 4 === 1) T.roamers({ dino_raptor: 1 }, x, z, 160, 2, { speed: [40, 65] });
      });
      // Loose filler between groves.
      const jAvoid = (x, z) => blocked(x, z, 20) || inCl(x, z, -30) || !onLand(x, z, 10);
      T.scatter({ dino_jtree: 3, dino_palm: 5 }, { x0: -20, z0: -20, x1: 5020, z1: 5020 }, 60, { gap: 30, avoid: jAvoid });
      T.scatter({ dino_cycad: 3, dino_fern: 5, bush: 3, dino_boulder: 2 }, { x0: -20, z0: -20, x1: 5020, z1: 5020 }, 25, { gap: 10, avoid: jAvoid });
      // Riverbank reeds & rocks.
      for (let i = 2; i < RIVER.length - 1; i += 3) {
        const [x, z] = RIVER[i], [x2, z2] = RIVER[i + 1], dx = x2 - x, dz = z2 - z, l = Math.hypot(dx, dz) || 1;
        for (const s of [-1, 1]) { const ox = x - dz / l * 142 * s, oz = z + dx / l * 142 * s; if (onLand(ox, oz, 10) && T.free(ox, oz, 14) && !nearPath(ox, oz, 30) && Math.hypot(ox - CL.pool.x, oz - CL.pool.z) > 250) T.put(T.pick({ dino_fern: 3, dino_boulder: 1, dino_flower: 2, dino_mushroom: 2 }), ox, oz, rng() * 6); }
      }
      T.beach({ dino_egg: 5, dino_mushroom: 2, dino_flower: 1 }, 24, { inner: -150, outer: -50 });
      T.roamers({ dino_baby: 1 }, 2500, 5100, 200, 3, { speed: [20, 34] });
    },
  });
})();
