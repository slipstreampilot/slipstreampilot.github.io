// Level 8 — Dusty Gulch: a cartoon wild-west frontier town. Main Street runs east–west with
// false-front shops on both boardwalks, a back street behind, and a steam railroad looping around
// the town. Out in the desert: tumbleweeds rolling, saguaros, red-rock mesas, a ranch, the gold mine
// with its minecarts, and the finale — the giant red-rock Thunder Butte.
(function () {
  const W = { wood: '#9A6A44', wood2: '#6B4A30', wood3: '#C08A5A', dark: '#3B2A22', cream: '#FFF1D6', sand: '#F2C98A', rock: '#C9573A', rock2: '#E07E4C', rock3: '#A9442F', rock4: '#F0A066',
    sage: '#8DB36A', sage2: '#6E9A55', cactus: '#4FA85A', cactus2: '#3E9150', turq: '#2EC4B6', gold: '#FFC23F', iron: '#4A4A5A', glass: '#9FD8E8', red: '#D23C2C' };
  const WALLS = ['#E8744A', '#7FBF9A', '#3FBFB2', '#F2B84B', '#C9583E', '#F7E3C0', '#B784C9', '#F29C6B'];
  const COL = {
    sand: '#F3C784', desert: '#EBB878', patch: '#E2A86A', patch2: '#F0CC90', sage: '#C4BE78', red: '#E39A68', street: '#D7955E', streetEdge: '#C9864F', plank: '#A8754A', plank2: '#94653F',
    ballast: '#B88A62', sleeper: '#6B4A30', rail: '#5E5A6E', platform: '#D9B48A', corral: '#DDB07A', pond: '#3FC4E8', pondEdge: '#E9D2A6', mine: '#B88060', trail: '#DDA36C',
  };

  function kinds(def) {
    // ---------- tiny ----------
    def('gulch_cowboy', { w: 9, d: 14, h: 40, points: 1, mass: 75, tints: ['#D23C2C', '#3D7BFF', '#F2B84B', '#2EC4B6', '#9B5DE5', '#FF8C42', '#F7E3C0'], mover: 'walk',
      build(g) { g.turned(Math.PI / 2, () => { // modeled facing +z, turned to walk along +x
        for (const s of [-1, 1]) g.limb(-s, 0, 15, () => { g.block(s * 3.2, 0, 0, 4.6, 4, 6, W.dark); g.block(s * 3.2, 4, 0, 4.6, 11, 5.5, '#3B5A8C'); });
        g.block(0, 14, 0, 12, 12, 7, '#FFF', { tint: true }); g.block(0, 14, 0, 12.4, 10, 7.4, '#7A4A2E', { }); g.block(0, 14, 3.8, 4, 10, 0.4, '#FFF', { tint: true });
        g.limb(-0.6, 0, 24, () => g.block(-7.4, 15, 0, 3, 10, 4, '#FFF', { tint: true })); g.limb(0.6, 0, 24, () => g.block(7.4, 15, 0, 3, 10, 4, '#FFF', { tint: true })); g.block(0, 14, 0, 12.6, 2, 7.6, W.dark); g.block(3, 14, 3.9, 2.4, 2, 0.4, W.gold);
        g.ball(0, 30, 0, 5, '#F2B48C', { detail: 1 }); g.block(0, 26, 3, 4, 2, 2, '#D23C2C');
        g.cyl(0, 33, 0, 9, 9, 1.2, 12, '#8A5A3B'); g.cyl(0, 34, 0, 4.4, 5, 5.5, 10, '#8A5A3B'); g.cyl(0, 34.4, 0, 5.1, 5.1, 1.2, 10, W.dark); }); } });
    def('gulch_barrel', { w: 14, d: 14, h: 20, points: 1, mass: 40,
      build(g) { g.cyl(0, 0, 0, 6, 6, 20, 10, W.wood); g.cyl(0, 6, 0, 7, 7, 8, 10, W.wood3); g.cyl(0, 3, 0, 6.6, 6.6, 1.6, 10, W.iron); g.cyl(0, 15.5, 0, 6.6, 6.6, 1.6, 10, W.iron); g.cyl(0, 19.6, 0, 5.4, 5.4, 0.6, 10, W.wood2); } });
    def('gulch_crate', { w: 16, d: 16, h: 16, points: 1, mass: 25,
      build(g) { g.block(0, 0, 0, 16, 16, 16, W.wood3); for (const f of ['z+', 'z-', 'x+', 'x-']) { const o = f[0] === 'z' ? [0, 8, f[1] === '+' ? 8.2 : -8.2] : [f[1] === '+' ? 8.2 : -8.2, 8, 0];
          g.panel(f, o[0], o[1], o[2], 16, 2.6, W.wood); g.panel(f, o[0], 2, o[2] + (f === 'z+' ? 0.05 : f === 'z-' ? -0.05 : 0), 16, 2.4, W.wood2); g.panel(f, o[0], 14, o[2], 16, 2.4, W.wood2); }
        g.block(0, 16, 0, 16, 0.6, 2.4, W.wood2); g.block(0, 16, 0, 2.4, 0.6, 16, W.wood2); } });
    def('gulch_cactus', { w: 14, d: 14, h: 22, points: 1, mass: 10, tints: ['#FF6FB5', '#FFD23F', '#FF8C42'],
      build(g) { g.ball(0, 7, 0, 7, W.cactus, { sy: 1.0, detail: 1 }); g.ball(-4, 12, 2, 3.6, W.cactus2); g.ball(4, 13, -1, 4, W.cactus);
        g.ball(0, 14, 0, 2.6, '#FFF', { tint: true }); g.ball(4, 17, -1, 1.8, '#FFF', { tint: true }); g.block(0, 0, 0, 12, 1, 12, '#D9A066'); } });
    def('gulch_skull', { w: 18, d: 12, h: 8, points: 1, mass: 3,
      build(g) { g.ball(0, 3.4, 0, 3.6, '#FFF8E8', { sx: 0.9, sz: 1.4 }); g.ball(0, 2.6, 4, 2.2, '#FFF8E8'); g.ball(-1.4, 4.2, 2.6, 0.9, W.dark); g.ball(1.4, 4.2, 2.6, 0.9, W.dark);
        g.block(-5.5, 4.2, -1.5, 7, 1.6, 1.6, '#FFF8E8', { rz: -0.35 }); g.block(5.5, 4.2, -1.5, 7, 1.6, 1.6, '#FFF8E8', { rz: 0.35 }); g.block(-8.6, 5.6, -1.5, 1.6, 3, 1.6, '#FFF8E8'); g.block(8.6, 5.6, -1.5, 1.6, 3, 1.6, '#FFF8E8'); } });
    // Tumbleweed: modeled centered on its own origin (it rolls).
    def('gulch_tumbleweed', { centered: true, w: 24, d: 24, h: 24, points: 1, mass: 2, mover: 'walk',
      build(g) { g.ball(0, 0, 0, 10.5, '#C9A26A', { detail: 1 }); g.ball(3, 3, 4, 6, '#B08A55'); g.ball(-4, -2, -4, 6, '#D9B47A'); g.ball(-3, 4, 3, 5.5, '#A88250'); g.ball(4, -4, -3, 5.5, '#C9A26A');
        g.block(0, 0, 0, 23, 1.4, 1.4, '#9A7445', { ry: 0.7, rz: 0.4 }); g.block(0, 0, 0, 22, 1.4, 1.4, '#9A7445', { ry: -0.9, rx: 0.8 }); g.block(0, 0, 0, 1.4, 22, 1.4, '#9A7445', { rx: 0.5 }); } });

    // ---------- small props ----------
    def('gulch_hitch', { w: 38, d: 7, h: 20, points: 2, mass: 30,
      build(g) { for (const x of [-16, 16]) { g.block(x, 0, 0, 4, 20, 4, W.wood2); g.block(x, 20, 0, 4.6, 1, 4.6, W.wood); } g.block(0, 14, 0, 38, 3, 3, W.wood); g.block(0, 6, 0, 36, 2.4, 2.4, W.wood); } });
    def('gulch_trough', { w: 40, d: 18, h: 14, points: 2, mass: 60,
      build(g) { g.block(0, 2, 0, 40, 10, 18, W.wood); g.block(0, 10.5, 0, 34, 1, 12, '#5CCDF0', { shade: false }); for (const x of [-16, 16]) g.block(x, 0, 0, 4, 4, 18, W.wood2);
        g.block(0, 12, 8.4, 40, 2, 1.6, W.wood2); g.block(0, 12, -8.4, 40, 2, 1.6, W.wood2); } });
    def('gulch_horse', { w: 66, d: 16, h: 46, points: 3, mass: 450, tints: ['#8A5A3B', '#5A3A28', '#C98B62', '#F4ECE0', '#2B2D42', '#B5713E'], mover: 'walk',
      build(g) { g.block(-2, 18, 0, 34, 14, 13, '#FFF', { tint: true }); g.ball(-18, 25, 0, 6.5, '#FFF', { tint: true });
        for (const [x, z] of [[-14, -4.5], [-14, 4.5], [10, -4.5], [10, 4.5]]) g.limb(x * z > 0 ? 0.8 : -0.8, x, 19, () => { g.block(x, 0, z, 3.6, 19, 3.6, '#FFF', { tint: true }); g.block(x, 0, z, 4, 3, 4, W.dark); });
        g.block(18, 26, 0, 8, 16, 7, '#FFF', { tint: true, rz: -0.55 }); g.block(25, 36, 0, 13, 7, 7, '#FFF', { tint: true, rz: -0.25 }); g.block(31, 34, 0, 4, 5, 6, '#5A3A28');
        g.block(21, 40, 1.6, 2, 4, 1.6, '#FFF', { tint: true }); g.block(21, 40, -1.6, 2, 4, 1.6, '#FFF', { tint: true });
        g.block(15, 30, 0, 14, 12, 2.6, W.dark, { rz: -0.55 }); g.block(-22, 17, 0, 4, 18, 3, W.dark, { rz: 0.35 });
        g.block(0, 31, 0, 14, 3, 15, '#8A2E1E'); g.block(-1, 34, 0, 9, 2, 10, W.dark); g.block(0, 22, 7, 2, 10, 1, W.dark); } });
    def('gulch_minecart', { w: 40, d: 26, h: 30, points: 3, mass: 400, mover: 'walk',
      build(g) { for (const x of [-12, 12]) for (const z of [-11, 11]) g.cyl(x, 2, z, 5, 5, 3, 8, W.iron, { rx: Math.PI / 2 });
        g.block(0, 6, 0, 36, 4, 22, W.wood2); g.cyl(0, 10, 0, 20, 16, 14, 4, '#7A6A5A', { ry: Math.PI / 4, sx: 1 }); g.block(0, 22, 0, 40, 2.4, 26, '#5A4A40');
        g.ball(-6, 24, -3, 5, W.gold, { sy: 0.7 }); g.ball(5, 24, 3, 5.5, '#FFD86B', { sy: 0.7 }); g.ball(0, 26, 0, 4.4, W.gold); g.ball(9, 23.5, -5, 3.4, '#E8B030'); } });
    def('gulch_saguaro', { w: 44, d: 18, h: 128, points: 5, mass: 400,
      build(g) { g.cyl(0, 0, 0, 7, 8, 112, 8, W.cactus); g.ball(0, 112, 0, 7, W.cactus, { sy: 1.1 });
        g.cyl(-12, 44, 0, 4.6, 4.6, 12, 8, W.cactus, { rz: Math.PI / 2 }); g.cyl(-17, 48, 0, 4.6, 5, 38, 8, W.cactus); g.ball(-17, 86, 0, 4.6, W.cactus);
        g.cyl(12, 60, 0, 4.6, 4.6, 12, 8, W.cactus2, { rz: Math.PI / 2 }); g.cyl(17, 64, 0, 4.6, 5, 28, 8, W.cactus2); g.ball(17, 92, 0, 4.6, W.cactus2);
        for (const y of [20, 50, 80]) g.cyl(0, y, 0, 8.4, 8.4, 2, 8, W.cactus2); g.ball(0, 120, 0, 3, '#FF6FB5'); g.ball(-17, 91, 0, 2.4, '#FFD23F'); } });
    def('gulch_wagon', { w: 120, d: 54, h: 74, points: 6, mass: 900, tints: ['#FFF8EA', '#F7E3C0', '#E8F2F0'], mover: 'walk',
      build(g) { g.block(-4, 16, 0, 80, 18, 40, W.wood); g.block(-4, 34, 0, 82, 2, 42, W.wood2);
        for (const [x, r] of [[-30, 16], [24, 12]]) for (const z of [-24, 24]) { g.cyl(x, r - 2, z, r, r, 3, 12, W.wood2, { rx: Math.PI / 2 }); g.cyl(x, r - 1.5 - 0.5, z, r * 0.3, r * 0.3, 4, 8, W.red, { rx: Math.PI / 2 }); }
        g.cyl(-4, 18, 0, 26, 26, 80, 12, '#FFF', { tint: true, rz: Math.PI / 2 }); for (const x of [-38, -14, 10, 30]) g.cyl(x, 18, 0, 26.6, 26.6, 3, 12, '#C9A26A', { rz: Math.PI / 2 });
        g.block(-4, 14, 0, 82, 22, 52, W.wood); g.block(48, 12, 0, 24, 2.4, 3, W.wood2); g.block(44, 16, 0, 12, 10, 34, W.wood3); } });
    def('gulch_boulder', { w: 84, d: 66, h: 52, points: 8, mass: 9000, tints: ['#E07E4C', '#C9573A', '#D9905E'],
      build(g) { g.ball(-8, 18, 0, 30, '#FFF', { tint: true, sy: 0.75, sz: 0.9 }); g.ball(20, 14, 6, 20, '#FFF', { tint: true, sy: 0.75 }); g.ball(-26, 10, -8, 15, W.rock3, { sy: 0.8 });
        g.ball(10, 30, -8, 16, W.rock4, { sy: 0.7 }); g.ball(28, 6, -14, 10, W.rock3); g.block(0, 0, 0, 80, 2, 60, '#D9A066'); } });
    def('gulch_windmill', { w: 54, d: 50, h: 176, points: 8, mass: 2000,
      build(g) { for (const [x, z] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) g.block(x * 0.62, 0, z * 0.62, 3.4, 128, 3.4, '#B9B2A8', { rx: -z * 0.0032, rz: x * 0.0032 });
        for (const y of [30, 70, 105]) g.block(0, y, 0, 30 - y * 0.12, 2, 30 - y * 0.12, '#9A938A');
        g.block(0, 128, 0, 14, 10, 14, '#8A5A3B'); g.block(-14, 132, 0, 22, 3, 3, W.iron); g.block(-26, 126, 0, 3, 16, 16, W.red);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.box(Math.cos(a) * 14, 134 + Math.sin(a) * 14, 8, 22, 4, 1.2, i % 2 ? '#F7E3C0' : W.red, { rz: a }); }
        g.cyl(0, 134 - 1, 8, 4, 4, 2.4, 8, W.iron, { rx: Math.PI / 2 }); g.cyl(0, 0, 0, 22, 22, 10, 12, '#9A6A44'); g.cyl(0, 9.5, 0, 20, 20, 0.8, 12, '#5CCDF0', { shade: false }); } });

    // ---------- railroad ----------
    def('gulch_engine', { w: 170, d: 56, h: 100, points: 14, mass: 30000,
      build(g) { g.block(0, 8, 0, 166, 10, 48, '#2B2D42'); for (const x of [-50, -18, 14, 46]) for (const z of [-25, 25]) { g.cyl(x, 4, z, 14, 14, 4, 12, W.red, { rx: Math.PI / 2 }); g.cyl(x, 4, z, 5, 5, 5, 8, W.gold, { rx: Math.PI / 2 }); }
        g.block(-2, 22, 26, 96, 2.4, 2, W.iron);
        g.cyl(18, 18, 0, 22, 22, 104, 12, '#2B2D42', { rz: Math.PI / 2 }); for (const x of [-20, 18, 52]) g.cyl(x, 17, 0, 23, 23, 4, 12, W.gold, { rz: Math.PI / 2 });
        g.cyl(56, 62, 0, 8, 6, 16, 10, '#2B2D42'); g.cyl(56, 76, 0, 15, 8, 18, 10, '#2B2D42'); g.ball(26, 64, 0, 9, W.gold); g.cyl(-2, 62, 0, 5, 6, 10, 8, W.gold);
        g.block(-58, 18, 0, 48, 64, 54, W.red); g.block(-58, 82, 0, 56, 5, 58, '#2B2D42'); g.panel('x+', -33.7, 60, 0, 30, 18, W.glass); g.panel('z+', -58, 60, 27.3, 26, 18, W.glass); g.panel('z-', -58, 60, -27.3, 26, 18, W.glass);
        g.block(78, 0, 0, 14, 16, 46, W.red, { rz: 0.5 }); g.cyl(76, 44, 0, 6, 6, 6, 8, '#FFF3B0', { rz: Math.PI / 2 }); g.block(85, 6, 0, 2, 8, 50, W.gold); } });
    def('gulch_traincar', { w: 150, d: 52, h: 74, points: 12, mass: 15000, tints: ['#2EC4B6', '#F2B84B', '#E8744A', '#7FBF9A', '#B784C9'],
      build(g) { g.block(0, 8, 0, 146, 8, 44, '#2B2D42'); for (const x of [-50, -30, 30, 50]) for (const z of [-22, 22]) g.cyl(x, 2.5, z, 8, 8, 4, 10, W.iron, { rx: Math.PI / 2 });
        g.block(0, 16, 0, 140, 46, 46, '#FFF', { tint: true }); g.block(0, 16, 23.3, 140, 6, 0.6, W.cream); g.block(0, 16, -23.3, 140, 6, 0.6, W.cream);
        for (let i = 0; i < 6; i++) { g.panel('z+', -55 + i * 22, 42, 23.4, 14, 14, W.glass); g.panel('z-', -55 + i * 22, 42, -23.4, 14, 14, W.glass); }
        g.block(0, 62, 0, 150, 4, 52, W.wood2); g.gable(0, 66, 0, 146, 48, 8, W.dark);
        for (const x of [-72, 72]) g.block(x, 8, 0, 6, 14, 30, W.wood); } });

    // ---------- buildings (front = +z with a porch over the boardwalk) ----------
    const porch = (g, w, z0, z1, col) => {
      g.block(0, 0, (z0 + z1) / 2, w, 3, z1 - z0, W.wood3);
      for (let x = -w / 2 + 6; x <= w / 2 - 6; x += (w - 12) / Math.max(1, Math.round((w - 12) / 50))) g.block(x, 3, z1 - 4, 4, 68, 4, W.wood2);
      g.block(0, 70, (z0 + z1) / 2, w + 4, 4, z1 - z0 + 4, col || W.wood, { rx: -0.08 });
    };
    const letters = (g, x, y, z, n, col) => { for (let i = 0; i < n; i++) g.panel('z+', x - (n - 1) * 6 + i * 12, y, z, 8, 10, col || W.dark); };
    def('gulch_store', { w: 160, d: 160, h: 150, points: 22, mass: 40000, tints: WALLS,
      build(g) { g.block(0, 0, -14, 150, 96, 128, '#FFF', { tint: true }); g.gable(0, 96, -14, 128, 150, 28, '#B59C8C', { ry: Math.PI / 2, tint: true });
        g.block(0, 0, 53, 158, 140, 6, '#FFF', { tint: true }); g.block(0, 134, 54, 162, 6, 10, W.wood2); g.block(0, 140, 54, 56, 10, 6, '#FFF', { tint: true }); g.block(0, 148, 54, 60, 2, 8, W.wood2);
        g.block(0, 100, 57.4, 116, 26, 2, W.cream); letters(g, 0, 113, 58.6, 7);
        g.panel('z+', -44, 40, 56.4, 40, 40, W.glass); g.panel('z+', 44, 40, 56.4, 40, 40, W.glass); g.panel('z+', 0, 32, 56.4, 30, 56, W.wood2); g.panel('z+', 0, 32, 56.5, 3, 56, W.dark);
        for (const x of [-44, 44]) g.panel('z+', x, 86, 56.4, 26, 16, W.glass);
        for (const z of [-50, -10]) { g.panel('x+', 75.4, 50, z, 26, 30, W.glass); g.panel('x-', -75.4, 50, z, 26, 30, W.glass); }
        porch(g, 158, 56, 80); g.block(0, 0, -14, 154, 4, 132, '#B9A08A'); } });
    def('gulch_saloon', { w: 210, d: 170, h: 170, points: 28, mass: 60000,
      build(g) { g.block(0, 0, -12, 200, 140, 146, '#C0562E'); g.block(0, 140, -12, 204, 6, 150, '#8A2E1E'); g.block(0, 146, -12, 190, 1.5, 136, '#B5543A');
        g.block(0, 0, 61, 208, 164, 6, '#D9693A'); g.block(0, 158, 62, 212, 6, 10, W.dark); g.block(0, 164, 62, 80, 6, 6, '#D9693A');
        g.block(0, 118, 65.4, 160, 32, 2, W.cream); letters(g, 0, 134, 66.6, 6, W.red); g.block(-90, 118, 65.4, 14, 32, 2, W.gold); g.block(90, 118, 65.4, 14, 32, 2, W.gold);
        g.panel('z+', 0, 30, 64.4, 46, 58, W.dark); g.panel('z+', -11, 32, 64.6, 20, 28, W.gold); g.panel('z+', 11, 32, 64.6, 20, 28, W.gold);
        for (const x of [-70, 70]) g.panel('z+', x, 40, 64.4, 40, 40, '#FFE3A1');
        for (const x of [-70, -24, 24, 70]) g.panel('z+', x, 98, 64.4, 28, 30, W.glass);
        porch(g, 206, 64, 85, '#8A2E1E');
        g.block(0, 74, 75, 206, 3, 22, W.wood3); for (let x = -98; x <= 98; x += 14) g.block(x, 77, 85, 2, 12, 2, W.cream); g.block(0, 89, 85, 206, 2.4, 2.4, W.cream);
        for (const z of [-60, -10]) { g.panel('x+', 100.4, 60, z, 30, 34, '#FFE3A1'); g.panel('x-', -100.4, 60, z, 30, 34, '#FFE3A1'); } } });
    def('gulch_sheriff', { w: 150, d: 150, h: 128, points: 20, mass: 40000,
      build(g) { g.block(0, 0, -12, 142, 90, 118, '#E6B07A'); g.block(0, 90, -12, 146, 6, 122, '#C98B62');
        g.block(0, 0, 48, 150, 122, 6, '#F0C090'); g.block(0, 118, 49, 154, 6, 10, W.wood2);
        g.block(0, 92, 52, 100, 22, 2, W.cream); letters(g, 0, 103, 53.2, 7);
        g.cyl(-50, 95, 53, 12, 12, 2, 5, W.gold, { rx: Math.PI / 2 }); g.cyl(-50, 95, 53.4, 12, 12, 2, 5, '#FFD86B', { rx: Math.PI / 2, ry: Math.PI });
        g.panel('z+', 20, 30, 51.4, 30, 54, W.wood2); g.panel('z+', -40, 40, 51.4, 36, 30, W.glass); for (let i = 0; i < 5; i++) g.panel('z+', -54 + i * 7, 40, 51.6, 2, 30, W.iron);
        for (const z of [-50, 0]) { g.panel('x+', 71.4, 50, z, 24, 26, W.glass); g.panel('x-', -71.4, 50, z, 24, 26, W.glass); for (let i = 0; i < 4; i++) g.panel('x+', 71.6, 50, z - 9 + i * 6, 1.6, 26, W.iron); }
        porch(g, 150, 51, 75); } });
    def('gulch_bank', { w: 166, d: 160, h: 150, points: 24, mass: 60000,
      build(g) { g.block(0, 0, -10, 160, 116, 136, '#B5543A'); g.block(0, 116, -10, 166, 8, 142, W.cream); g.block(0, 124, -10, 150, 2, 126, '#9A3A2A');
        g.block(0, 0, 58, 166, 134, 6, '#C2604A'); g.block(0, 128, 60, 170, 8, 10, W.cream); g.gable(0, 136, 60, 100, 10, 14, W.cream);
        for (const x of [-60, -20, 20, 60]) g.cyl(x, 0, 68, 5.5, 5.5, 104, 8, W.cream); g.block(0, 104, 68, 140, 8, 16, W.cream); g.block(0, 0, 68, 150, 4, 22, '#E9DCC8');
        g.block(0, 108, 62, 70, 14, 2, W.dark); letters(g, 0, 115, 63.2, 4, W.gold);
        g.panel('z+', 0, 30, 61.4, 34, 56, W.dark); g.cyl(0, 52, 61.6, 10, 10, 1, 12, W.gold, { rx: Math.PI / 2 });
        for (const x of [-48, 48]) { g.panel('z+', x, 50, 61.4, 26, 44, W.glass); for (let i = 0; i < 4; i++) g.panel('z+', x - 9 + i * 6, 50, 61.6, 1.6, 44, W.iron); }
        g.windows(0, -10, 160, 136, 30, 100, 1, 3, W.glass, { fill: 0.4 }); } });
    def('gulch_hotel', { hs: 0.9, w: 262, d: 220, h: 236, points: 48, mass: 300000, tints: ['#3FBFB2', '#F2B84B', '#E8744A', '#B784C9'],
      build(g) { g.block(0, 0, -12, 254, 196, 192, '#FFF', { tint: true }); g.block(0, 196, -12, 258, 6, 196, '#C9583E'); g.block(0, 202, -12, 240, 1.5, 180, '#E07E4C'); g.block(70, 202, -50, 20, 26, 20, '#9A3A2A'); g.block(-70, 202, -50, 20, 26, 20, '#9A3A2A');
        g.block(0, 0, 86, 262, 226, 6, '#FFF', { tint: true }); g.block(0, 222, 87, 266, 8, 10, W.dark); g.block(0, 0, 87, 264, 4, 8, W.wood2);
        g.block(0, 186, 90.4, 190, 30, 2, W.cream); letters(g, 0, 201, 91.6, 5, W.red);
        for (const y of [40, 104, 160]) for (const x of [-100, -60, -20, 20, 60, 100]) { if (y === 40 && Math.abs(x) < 30) continue; g.panel('z+', x, y, 89.4, 22, 30, y === 40 ? '#FFE3A1' : W.glass); }
        g.panel('z+', 0, 30, 89.4, 40, 56, W.wood2);
        g.windows(0, -12, 254, 192, 20, 190, 3, 6, W.glass, { fill: 0.4 });
        for (const y of [72, 136]) { g.block(0, y, 99, 262, 3, 20, W.wood3); for (let x = -126; x <= 126; x += 14) g.block(x, y + 3, 108, 2, 12, 2, W.cream); g.block(0, y + 15, 108, 262, 2, 2, W.cream); }
        for (const x of [-126, -63, 0, 63, 126]) g.block(x, 0, 107, 4, 150, 4, W.wood2); g.block(0, 150, 99, 266, 4, 22, '#8A2E1E'); } });
    def('gulch_station', { w: 300, d: 160, h: 150, points: 30, mass: 90000,
      build(g) { g.block(0, 0, -20, 220, 96, 110, '#F2D6A2'); g.gable(0, 96, -20, 232, 124, 40, '#2EA89C'); g.block(0, 0, -20, 226, 8, 116, '#C98B62');
        g.block(0, 96, 36, 60, 30, 6, '#F2D6A2'); g.cyl(0, 112, 39.5, 12, 12, 2, 14, '#FFFFFF', { rx: Math.PI / 2 }); g.block(0, 112, 41, 1.2, 9, 0.6, W.dark); g.block(3, 112, 41, 7, 1.2, 0.6, W.dark);
        g.block(0, 72, 37, 150, 18, 2, W.cream); letters(g, 0, 81, 38.2, 8, W.wood2);
        for (const x of [-80, -40, 40, 80]) g.panel('z+', x, 40, 35.4, 26, 36, W.glass); g.panel('z+', 0, 32, 35.4, 34, 56, W.wood2);
        g.block(0, 0, 58, 300, 6, 44, '#D9B48A'); for (let x = -140; x <= 140; x += 56) g.block(x, 6, 74, 5, 62, 5, W.wood2);
        g.block(0, 68, 58, 304, 4, 50, '#2EA89C', { rx: -0.06 }); g.block(0, 66, 82, 304, 3, 3, '#FFF1D6');
        g.block(-120, 0, -20, 50, 60, 70, '#E3BF88'); g.block(120, 0, -20, 50, 60, 70, '#E3BF88'); g.block(-120, 60, -20, 56, 4, 76, '#2EA89C'); g.block(120, 60, -20, 56, 4, 76, '#2EA89C');
        g.block(-100, 6, 66, 18, 14, 14, W.wood3); g.block(-80, 6, 66, 14, 10, 14, W.wood); } });
    def('gulch_mine', { w: 330, d: 300, h: 270, points: 86, mass: 1500000,
      build(g) { g.ball(0, 40, -20, 170, W.rock, { sy: 0.62, sz: 0.85, detail: 1 }); g.ball(-90, 60, -40, 90, W.rock3, { sy: 0.8 }); g.ball(80, 70, -60, 100, W.rock2, { sy: 0.75 });
        g.ball(20, 120, -40, 80, W.rock4, { sy: 0.6 }); g.block(0, 0, 0, 330, 4, 300, '#C98B62');
        g.block(0, 0, 112, 90, 92, 40, W.rock3); g.panel('z+', 0, 36, 132.4, 56, 70, '#1A1210');
        g.block(-31, 0, 134, 8, 78, 8, W.wood2); g.block(31, 0, 134, 8, 78, 8, W.wood2); g.block(0, 76, 134, 80, 10, 10, W.wood2); g.block(0, 88, 136, 66, 14, 3, W.cream); letters(g, 0, 95, 137.8, 4, W.red);
        for (const x of [-14, 14]) g.block(x, 0, 132, 3, 2, 36, W.iron); for (let z = 118; z < 150; z += 8) g.block(0, 0, z, 40, 1.6, 3, W.wood2);
        for (const x of [-30, 30]) g.block(x, 150, -40, 6, 110, 6, W.wood2, { rz: x > 0 ? 0.2 : -0.2 }); g.block(0, 250, -40, 50, 8, 10, W.wood2); g.cyl(0, 252, -40, 22, 22, 4, 14, W.iron, { rx: Math.PI / 2 });
        g.ball(110, 20, 110, 24, W.gold, { sy: 0.5 }); g.ball(-110, 16, 110, 20, '#E8B030', { sy: 0.5 }); g.block(-120, 0, 60, 30, 28, 30, W.wood3); } });
    def('gulch_mesa', { w: 400, d: 400, h: 300, points: 140, mass: 3000000,
      build(g) { const bands = [W.rock3, W.rock2, W.rock, W.rock4, W.rock2];
        g.cyl(0, 0, 0, 196, 200, 60, 9, W.rock2, { ry: 0.3 });
        let y = 50, r = 186; bands.forEach((c, i) => { const hh = 40 + (i % 2) * 10; g.cyl(0, y, 0, r - 2, r, hh, 9, c, { ry: 0.3 + i * 0.07 }); y += hh; r -= 2; });
        g.cyl(0, y, 0, r + 10, r, 10, 9, W.rock4, { ry: 0.6 }); g.cyl(0, y + 10, 0, r + 8, r + 10, 2, 9, '#E8B87A', { ry: 0.6 });
        for (const [x, z, s] of [[-60, -40, 18], [40, 50, 22], [90, -70, 15], [-30, 90, 14], [-110, 30, 17], [120, 60, 12]]) g.ball(x, y + 12, z, s, W.sage, { sy: 0.55 });
        g.cyl(30, y + 12, -20, 5, 6, 36, 8, W.cactus); g.cyl(22, y + 30, -20, 3, 3, 14, 6, W.cactus); g.ball(-70, y + 14, -90, 14, W.rock3, { sy: 0.6 });
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.2; g.block(Math.cos(a) * 184, 60, Math.sin(a) * 184, 6, y - 70, 6, W.rock3, { ry: -a }); }
        for (const [x, z] of [[-165, 135], [160, 150], [130, -170]]) g.ball(x, 10, z, 22, W.rock3, { sy: 0.6 }); } });
    def('gulch_butte', { hs: 0.66, w: 540, d: 540, h: 1260, points: 330, mass: 8000000,
      build(g) {
        g.cyl(0, 0, 0, 236, 270, 110, 10, W.rock2, { ry: 0.2 }); g.cyl(0, 0, 0, 268, 270, 16, 10, '#D9905E', { ry: 0.2 });
        // body narrows to a neck, then flares into a wide cap (a giant hoodoo)
        const prof = [[210, 70, W.rock3], [196, 64, W.rock], [182, 70, W.rock4], [168, 60, W.rock2], [156, 66, W.rock3], [146, 60, '#F7E3C0'], [140, 64, W.rock], [138, 60, W.rock3],
          [150, 50, W.rock2], [172, 46, W.rock4], [198, 44, W.rock], [222, 40, '#F7E3C0'], [236, 36, W.rock3]];
        let y = 100, r = 222;
        prof.forEach(([rt, hh, c], i) => { g.cyl(0, y, 0, rt, r, hh, 10, c, { ry: 0.2 + i * 0.05 }); y += hh; r = rt; });
        g.cyl(0, y, 0, r - 4, r, 14, 10, W.rock4, { ry: 0.7 }); y += 14; g.cyl(0, y, 0, r - 6, r - 4, 2, 10, '#F2C98A', { ry: 0.7 });
        for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.3; g.block(Math.cos(a) * 170, 150, Math.sin(a) * 170, 8, 300, 8, '#8E3624', { ry: -a }); }
        const top = y + 2;
        g.cyl(0, top, 0, 11, 13, 190, 10, W.cactus); g.ball(0, top + 192, 0, 12, W.cactus);
        for (const yy of [40, 90, 140]) g.cyl(0, top + yy, 0, 13.5, 13.5, 3, 10, W.cactus2);
        g.cyl(-30, top + 76, 0, 8, 8, 36, 8, W.cactus, { rz: Math.PI / 2 }); g.cyl(-46, top + 80, 0, 8, 8.5, 72, 8, W.cactus); g.ball(-46, top + 154, 0, 8, W.cactus);
        g.cyl(30, top + 104, 0, 8, 8, 36, 8, W.cactus2, { rz: Math.PI / 2 }); g.cyl(46, top + 108, 0, 8, 8.5, 56, 8, W.cactus2); g.ball(46, top + 166, 0, 8, W.cactus2);
        g.ball(0, top + 206, 0, 7, '#FF6FB5'); g.ball(-46, top + 162, 0, 6, '#FFD23F'); g.ball(46, top + 174, 0, 6, '#FF8C42');
        g.cyl(-130, top, 90, 3.5, 3.5, 140, 6, W.iron); g.block(-104, top + 108, 90, 50, 30, 2, W.red); g.block(-104, top + 115, 90.6, 44, 8, 1, W.cream); g.block(-104, top + 104, 90.6, 30, 6, 1, W.turq);
        g.cyl(120, top, -70, 30, 36, 12, 8, W.wood2); g.ball(120, top + 20, -70, 13, '#5A3A28'); g.ball(127, top + 32, -70, 8, '#F7F3EA'); g.block(137, top + 30, -70, 8, 3, 3, W.gold);
        for (const [x, z, s] of [[-90, -100, 24], [70, 120, 28], [160, 40, 20], [-160, -10, 22], [20, -160, 18], [-60, 160, 20], [130, -150, 16]]) g.ball(x, top + 6, z, s, W.sage, { sy: 0.55 });
        for (const [x, z] of [[-210, 220], [230, 170], [190, -230], [-240, -160]]) g.ball(x, 14, z, 40, W.rock3, { sy: 0.6 });
      } });
  }

  // ----------------------------------------------------------------- layout
  const MAIN = 2500, MW = 150, BW = 36, BACK = 3020, CROSS = 2500;
  const TL = { x0: 650, z0: 1750, x1: 4350, z1: 3250 }; // railroad loop

  function row(T, x0, x1, lane, side, seq, setback) {
    let x = x0, i = 0;
    while (x < x1 && i < 60) {
      let kind = seq[i % seq.length]; i++;
      if (typeof kind === 'object') kind = T.pick(kind);
      const k = HC.CATALOG[kind]; if (x + k.w > x1) { if (x + 160 <= x1) { kind = 'gulch_store'; } else break; }
      const kk = HC.CATALOG[kind];
      T.put(kind, x + kk.w / 2, lane + side * (setback + kk.d / 2), side < 0 ? 0 : Math.PI);
      x += kk.w + T.rng.range(14, 34);
    }
  }


  // Ground polyline that is lit from above. (T.strip/T.path quads wind downward, so under the
  // double-sided ground material they render as if lit from below; rects and discs are fine.)
  function seg(T, a, b, w, y, col) {
    if (a[0] === b[0] || a[1] === b[1]) { T.rect(Math.min(a[0], b[0]) - w / 2, Math.min(a[1], b[1]) - w / 2, Math.max(a[0], b[0]) + w / 2, Math.max(a[1], b[1]) + w / 2, y, col); return; }
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), wide = w >= 16, n = Math.ceil(L / (wide ? w * 0.3 : w * 0.6));
    for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; if (wide) T.disc(x, z, w / 2, y, col, 10); else T.rect(x - w / 2, z - w / 2, x + w / 2, z + w / 2, y, col); }
  }
  function poly(T, pts, w, y, col, closed) { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) seg(T, pts[i], pts[(i + 1) % pts.length], w, y, col); }

  function chamfer(x0, z0, x1, z1, c) { return [[x0 + c, z0], [x1 - c, z0], [x1, z0 + c], [x1, z1 - c], [x1 - c, z1], [x0 + c, z1], [x0, z1 - c], [x0, z0 + c]]; }
  // counter-clockwise (seen from above) so ground strips get lit from the top
  const ccw = (pts) => pts.slice().reverse();

  function boardwalkProps(T, x0, x1, z, rot) {
    for (let x = x0 + 16; x < x1 - 10; x += 26) {
      const k = T.pick({ gulch_barrel: 4, gulch_crate: 3, gulch_hitch: 3, gulch_trough: 1, none: 3, gulch_cactus: 1 });
      if (k !== 'none') T.put(k, x, z, rot + (k === 'gulch_hitch' || k === 'gulch_trough' ? 0 : T.rng() * 6));
    }
  }

  function corral(T, cx, cz, w, d, horses) {
    T.rect(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, 0.8, COL.corral);
    T.line('gulch_hitch', cx - w / 2, cz - d / 2, cx + w / 2, cz - d / 2, 40);
    T.line('gulch_hitch', cx - w / 2, cz + d / 2, cx + w / 2, cz + d / 2, 40, { gapAt: w / 2, gapW: 60 });
    T.line('gulch_hitch', cx - w / 2, cz - d / 2, cx - w / 2, cz + d / 2, 40);
    T.line('gulch_hitch', cx + w / 2, cz - d / 2, cx + w / 2, cz + d / 2, 40);
    T.put('gulch_trough', cx - w / 2 + 40, cz - d / 2 + 24, 0);
    T.roamers('gulch_horse', cx, cz, Math.min(w, d) / 2 - 40, horses, { speed: [14, 28] });
  }

  function generate(T) {
    const rng = T.rng;
    T.island({ ground: COL.sand, edge: '#E7AE6A' });
    T.rect(-60, -60, 5060, 5060, 0, COL.desert);
    for (let i = 0; i < 90; i++) { const x = rng.range(0, 5000), z = rng.range(0, 5000); T.disc(x, z, rng.range(80, 280), 0.2 + (i % 4) * 0.04, [COL.patch, COL.patch2, COL.sage, COL.red][i % 4], 12, rng.range(0.7, 1.5), rng.range(0.6, 1.2)); }
    // A turquoise creek winding from the oasis down to the sea.
    for (let z = 4250; z < 5290; z += 14) { const x = 2500 + Math.sin(z * 0.006) * 140 + Math.sin(z * 0.017) * 30, w = 46 + Math.sin(z * 0.02) * 8; T.disc(x, z, w + 14, 0.65, COL.pondEdge, 10); T.disc(x, z, w, 0.95, COL.pond, 10); }

    // ---------- trails & streets ----------
    T.rect(260, MAIN - MW / 2 - 10, 4740, MAIN + MW / 2 + 10, 0.5, COL.streetEdge); T.rect(260, MAIN - MW / 2, 4740, MAIN + MW / 2, 0.6, COL.street);
    for (let i = 0; i < 40; i++) T.disc(rng.range(400, 4600), MAIN + rng.range(-50, 50), rng.range(10, 26), 0.7, COL.streetEdge, 8, 1.6, 0.6);
    T.rect(CROSS - 70, 1700, CROSS + 70, 3300, 0.55, COL.street);
    T.rect(900, BACK - 55, 4100, BACK + 55, 0.55, COL.street);
    // Boardwalks.
    for (const [z0, z1] of [[MAIN - MW / 2 - BW, MAIN - MW / 2], [MAIN + MW / 2, MAIN + MW / 2 + BW], [BACK - 55 - BW, BACK - 55]]) for (const [x0, x1] of [[900, CROSS - 80], [CROSS + 80, 4100]]) {
      T.rect(x0, z0, x1, z1, 1.4, COL.plank); for (let x = x0 + 12; x < x1; x += 24) T.rect(x, z0, x + 2, z1, 1.6, COL.plank2);
    }
    // Wagon trail loop (out through the desert and back down Main Street).
    const trail = [[300, MAIN], [300, 4620], [4700, 4620], [4700, MAIN]];
    poly(T, trail, 110, 0.45, COL.trail, true);
    T.loopVehicles({ gulch_wagon: 3, gulch_horse: 2 }, trail, 7, [40, 60], { lane: 30 });
    T.loopVehicles({ gulch_wagon: 3, gulch_horse: 2 }, ccw(trail), 6, [40, 60], { lane: 30 });

    // ---------- railroad ----------
    const loop = chamfer(TL.x0, TL.z0, TL.x1, TL.z1, 140);
    poly(T, loop, 60, 0.9, COL.ballast, true);
    // sleepers on the straights
    for (let x = TL.x0 + 150; x < TL.x1 - 140; x += 26) for (const z of [TL.z0, TL.z1]) T.rect(x - 4, z - 24, x + 4, z + 24, 1.0, COL.sleeper);
    for (let z = TL.z0 + 150; z < TL.z1 - 140; z += 26) for (const x of [TL.x0, TL.x1]) T.rect(x - 24, z - 4, x + 24, z + 4, 1.0, COL.sleeper);
    poly(T, chamfer(TL.x0 - 12, TL.z0 - 12, TL.x1 + 12, TL.z1 + 12, 145), 4, 1.2, COL.rail, true); poly(T, chamfer(TL.x0 + 12, TL.z0 + 12, TL.x1 - 12, TL.z1 - 12, 135), 4, 1.2, COL.rail, true);
    const tl = T.loopVehicles({ gulch_engine: 1 }, loop, 0);
    let plen = 0; for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length]; plen += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    for (const t0 of [0.05, 0.55]) {
      T.put('gulch_engine', 0, 0, 0, { mover: { type: 'walk', loop: tl, t: t0, dir: 1, speed: 120, lane: 0, bob: false } });
      let off = 170 / 2 + 8;
      for (let i = 0; i < 4; i++) { off += 150 / 2 + (i ? 150 / 2 : 0) + (i ? 8 : 0); T.put('gulch_traincar', 0, 0, 0, { mover: { type: 'walk', loop: tl, t: t0 - off / plen, dir: 1, speed: 120, lane: 0, bob: false } }); }
    }
    // Crossings with warning posts.
    for (const x of [TL.x0, TL.x1]) { T.rect(x - 34, MAIN - 70, x + 34, MAIN + 70, 1.3, '#C9A07A'); T.put('gulch_hitch', x - 50, MAIN - 90, Math.PI / 2); T.put('gulch_hitch', x + 50, MAIN + 90, Math.PI / 2); }
    // Station (north of the track, facing the town).
    T.rect(CROSS - 190, TL.z0 - 110, CROSS + 190, TL.z0 - 34, 1.3, COL.platform);
    T.put('gulch_station', CROSS, TL.z0 - 34 - 80 - 30, 0);
    for (let k = 0; k < 8; k++) T.put(T.pick({ gulch_crate: 2, gulch_barrel: 2, person: 2, gulch_cowboy: 3 }), CROSS - 170 + k * 46, TL.z0 - 60, rng() * 6);
    T.put('watertower', CROSS + 300, TL.z0 - 110); T.put('watertower', 950, TL.z0 + 140);

    // ---------- town ----------
    const fn = MAIN - MW / 2 - BW, fs = MAIN + MW / 2 + BW;
    const STORE = { gulch_store: 1 };
    row(T, 920, CROSS - 90, MAIN, -1, ['gulch_bank', STORE, STORE, 'gulch_sheriff', STORE, 'gulch_saloon', STORE], MW / 2 + BW + 2);
    row(T, CROSS + 90, 4090, MAIN, -1, ['gulch_hotel', STORE, 'gulch_saloon', STORE, 'gulch_hotel', 'gulch_bank', STORE], MW / 2 + BW + 2);
    row(T, 920, CROSS - 90, MAIN, 1, [STORE, 'gulch_hotel', STORE, 'gulch_sheriff', 'gulch_saloon', STORE], MW / 2 + BW + 2);
    row(T, CROSS + 90, 4090, MAIN, 1, [STORE, STORE, 'gulch_saloon', STORE, 'gulch_hotel', STORE], MW / 2 + BW + 2);
    row(T, 920, CROSS - 90, BACK, -1, [STORE, STORE, 'gulch_bank', STORE, STORE], 55 + BW + 2);
    row(T, CROSS + 90, 4090, BACK, -1, [STORE, 'gulch_sheriff', STORE, STORE, STORE], 55 + BW + 2);
    for (const [x0, x1] of [[900, CROSS - 80], [CROSS + 80, 4100]]) {
      boardwalkProps(T, x0, x1, fn + 14, 0); boardwalkProps(T, x0, x1, fs - 14, 0); boardwalkProps(T, x0, x1, BACK - 55 - 14, 0);
      // townsfolk strolling the boardwalks
      T.walkLoop([[x0 + 10, fn + BW / 2 - 4], [x1 - 10, fn + BW / 2 - 4], [x1 - 10, fs - BW / 2 + 4], [x0 + 10, fs - BW / 2 + 4]], 12, { gulch_cowboy: 3, person: 1 }, { lane: 0, dogChance: 0.1 });
    }
    // Main street clutter: hitching rails and horses tied up, a few parked wagons.
    for (let x = 980; x < 4060; x += 140) { if (Math.abs(x - CROSS) < 120) continue; const side = (x / 140 | 0) % 2 ? -1 : 1; T.put('gulch_hitch', x, MAIN + side * 52, 0); if (rng.chance(0.55)) T.put('gulch_horse', x + rng.range(-8, 8), MAIN + side * 36, Math.PI / 2 + (side > 0 ? Math.PI : 0)); }
    for (let k = 0; k < 40; k++) { const x = rng.range(950, 4050), z = MAIN + rng.range(-60, 60); if (Math.abs(x - CROSS) > 90 && T.free(x, z, 8)) T.put(rng.chance(0.75) ? 'gulch_cowboy' : 'person', x, z, rng() * 6); }
    // Back street south side: cacti, barrels, crates up to the tracks.
    T.scatter({ gulch_cactus: 3, gulch_barrel: 2, gulch_crate: 2, gulch_skull: 1, gulch_cowboy: 1 }, { x0: 900, z0: BACK + 70, x1: 4100, z1: TL.z1 - 50 }, 60, { gap: 6 });
    T.walkLoop([[900, BACK + 20], [4100, BACK + 20]], 10, { gulch_cowboy: 3, person: 1, dog: 1 }, { lane: 12 });
    // Between the north row and the railroad: corrals, wagons, windmill, stacks.
    const nz0 = TL.z0 + 50, nz1 = fn - 170;
    corral(T, 1450, (nz0 + nz1) / 2, 420, nz1 - nz0 - 20, 6); corral(T, 3500, (nz0 + nz1) / 2, 520, nz1 - nz0 - 20, 7);
    T.put('gulch_windmill', 2050, nz0 + 110); T.put('gulch_trough', 2120, nz0 + 120, 0); T.put('gulch_trough', 1990, nz0 + 180, 0.3);
    T.put('watertower', 2900, nz0 + 100);
    for (let k = 0; k < 3; k++) T.put('gulch_wagon', 2780 + k * 10, nz0 + 230 + k * 64, 0.15 * k);
    T.scatter({ gulch_barrel: 3, gulch_crate: 3, gulch_cowboy: 2, gulch_cactus: 1, person: 1 }, { x0: TL.x0 + 60, z0: nz0, x1: TL.x1 - 60, z1: nz1 }, 70, { gap: 6 });
    // inside-loop west/east ends
    T.scatter({ gulch_cactus: 3, gulch_saguaro: 1, gulch_skull: 1, gulch_barrel: 1, gulch_boulder: 1 }, { x0: TL.x0 + 50, z0: TL.z0 + 60, x1: 880, z1: TL.z1 - 60 }, 18, { gap: 10 });
    T.scatter({ gulch_cactus: 3, gulch_saguaro: 1, gulch_skull: 1, gulch_barrel: 1, gulch_boulder: 1 }, { x0: 4120, z0: TL.z0 + 60, x1: TL.x1 - 50, z1: TL.z1 - 60 }, 18, { gap: 10 });

    // ---------- outskirts: Homestead Row (south) and North Road ----------
    const HOME = 3560, NORTH = 1420, RD = 110;
    T.rect(1700, HOME - RD / 2, 3350, HOME + RD / 2, 0.55, COL.street); T.rect(CROSS - 70, TL.z1, CROSS + 70, HOME, 0.55, COL.street);
    T.rect(1100, NORTH - RD / 2, 3900, NORTH + RD / 2, 0.55, COL.street); T.rect(CROSS - 70, NORTH, CROSS + 70, TL.z0 - 110, 0.55, COL.street);
    const HOMES = { gulch_store: 6, gulch_hotel: 1 };
    for (const [x0, x1] of [[1750, CROSS - 80], [CROSS + 80, 3300]]) { row(T, x0, x1, HOME, -1, [HOMES], RD / 2 + 12); row(T, x0, x1, HOME, 1, [HOMES], RD / 2 + 12);
      boardwalkProps(T, x0, x1, HOME - RD / 2 - 6, 0); boardwalkProps(T, x0, x1, HOME + RD / 2 + 6, 0); }
    for (const [x0, x1] of [[1150, 2160], [2840, 3850]]) { row(T, x0, x1, NORTH, -1, [HOMES], RD / 2 + 12); row(T, x0, x1, NORTH, 1, [HOMES], RD / 2 + 12);
      boardwalkProps(T, x0, x1, NORTH - RD / 2 - 6, 0); boardwalkProps(T, x0, x1, NORTH + RD / 2 + 6, 0); }
    for (const [rz, xa, xb] of [[HOME, 1760, 3300], [NORTH, 1160, 3850]]) for (let x = xa; x < xb; x += 130) {
      if (Math.abs(x - CROSS) < 110) continue; const side = (x / 130 | 0) % 2 ? -1 : 1;
      T.put('gulch_hitch', x, rz + side * 40, 0); if (rng.chance(0.6)) T.put(rng.chance(0.8) ? 'gulch_horse' : 'gulch_wagon', x + rng.range(-8, 8), rz + side * 22, Math.PI / 2 + (side > 0 ? Math.PI : 0));
      if (rng.chance(0.7)) T.put(T.pick({ gulch_cowboy: 3, person: 1, gulch_barrel: 1, gulch_cactus: 1 }), x + 60, rz + rng.range(-20, 20), rng() * 6);
    }
    T.walkLoop([[1700, HOME], [3350, HOME]], 10, { gulch_cowboy: 3, person: 1, dog: 1 }, { lane: 16 });
    T.walkLoop([[1100, NORTH], [3900, NORTH]], 12, { gulch_cowboy: 3, person: 1, dog: 1 }, { lane: 16 });
    T.loopVehicles({ gulch_wagon: 2, gulch_horse: 3 }, [[1100, NORTH], [3900, NORTH]], 5, [40, 60], { lane: 30 });

    // ---------- the desert ----------
    // North: Thunder Butte (landmark) flanked by two mesas.
    T.disc(2500, 760, 330, 0.3, '#E09A66', 20); T.put('gulch_butte', 2500, 760, 0);
    T.disc(880, 820, 250, 0.3, '#E09A66', 18); T.put('gulch_mesa', 880, 820, 0);
    T.disc(4150, 760, 250, 0.3, '#E09A66', 18); T.put('gulch_mesa', 4150, 760, 0.6);
    // South-east: the gold mine with minecarts looping out of it.
    const MX = 3950, MZ = 4050;
    T.disc(MX, MZ, 260, 0.3, COL.mine, 18); T.put('gulch_mine', MX, MZ, 0);
    const mloop = [[MX - 40, MZ + 160], [MX - 40, MZ + 420], [MX - 420, MZ + 420], [MX - 420, MZ + 220], [MX - 120, MZ + 220], [MX - 120, MZ + 160]];
    poly(T, mloop, 34, 0.9, COL.ballast, true);
    T.loopVehicles('gulch_minecart', mloop, 8, [24, 34]);
    for (let k = 0; k < 8; k++) T.put(k % 2 ? 'gulch_crate' : 'gulch_barrel', MX + 200 + (k % 4) * 22, MZ + 120 + (k >> 2) * 22, rng() * 6);
    T.rect(MX + 150, MZ - 330, MX + 560, MZ - 140, 0.5, COL.mine);
    T.put('gulch_store', MX + 240, MZ - 250, 0, { tint: 3 }); T.put('gulch_store', MX + 440, MZ - 250, 0, { tint: 6 });
    T.put('watertower', MX - 330, MZ - 260); T.put('gulch_windmill', MX + 330, MZ + 330);
    const m2 = [[MX + 180, MZ + 120], [MX + 520, MZ + 120], [MX + 520, MZ + 300], [MX + 180, MZ + 300]];
    poly(T, m2, 34, 0.9, COL.ballast, true); T.loopVehicles('gulch_minecart', m2, 6, [24, 34]);
    T.scatter({ gulch_crate: 3, gulch_barrel: 3, gulch_cowboy: 3, gulch_minecart: 1 }, { x0: MX + 150, z0: MZ - 140, x1: MX + 560, z1: MZ + 90 }, 30, { gap: 5 });
    T.scatter({ gulch_boulder: 2, gulch_cactus: 2, gulch_skull: 1, gulch_cowboy: 1, gulch_saguaro: 1 }, { x: MX, z: MZ, r: 640, r0: 300 }, 40, { gap: 10 });
    // South-west: a ranch.
    T.rect(700, 3650, 1700, 4400, 0.3, '#D9B07A');
    corral(T, 1000, 3950, 420, 420, 8);
    T.put('gulch_store', 1450, 3800, Math.PI / 2, { tint: 4 }); T.put('gulch_store', 1450, 4120, Math.PI / 2, { tint: 5 });
    T.put('gulch_windmill', 1300, 4300); T.put('gulch_trough', 1240, 4320, 0); T.put('gulch_wagon', 1600, 4320, 0.4);
    for (let k = 0; k < 10; k++) T.put(k % 3 ? 'gulch_crate' : 'gulch_barrel', 1580 + (k % 2) * 20, 3650 + k * 18, rng() * 6);
    corral(T, 520, 4500, 360, 300, 6); T.put('gulch_store', 900, 4480, 0, { tint: 4 }); T.put('watertower', 1200, 4520);
    T.scatter({ gulch_cowboy: 3, gulch_crate: 2, gulch_barrel: 2, gulch_cactus: 2, dog: 1 }, { x0: 700, z0: 3650, x1: 1700, z1: 4400 }, 40, { gap: 5 });
    // Oasis.
    T.disc(2500, 4180, 190, 0.6, COL.pondEdge, 24, 1.3, 1); T.disc(2500, 4180, 160, 0.9, COL.pond, 24, 1.3, 1);
    T.put('gulch_windmill', 2800, 4040); T.put('gulch_trough', 2780, 4110, 0.2);
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; T.put(k % 3 ? 'gulch_cactus' : 'gulch_saguaro', 2500 + Math.cos(a) * 270, 4180 + Math.sin(a) * 215); }
    T.walkLoop(Array.from({ length: 14 }, (_, i) => { const a = i / 14 * 6.283; return [2500 + Math.cos(a) * 225, 4180 + Math.sin(a) * 180]; }), 8, { gulch_cowboy: 2, person: 1 }, { speed: [24, 36] });
    // Saguaro forest, rocks, skulls everywhere outside town.
    const town = (x, z) => (x > TL.x0 - 80 && x < TL.x1 + 80 && z > TL.z0 - 80 && z < TL.z1 + 80) || (Math.abs(z - MAIN) < 90) || (Math.abs(z - HOME) < 260 && x > 1650 && x < 3400) || (Math.abs(z - NORTH) < 260 && x > 1050 && x < 3950) || (Math.abs(x - 300) < 80 && z > MAIN) || (Math.abs(x - 4700) < 80 && z > MAIN) || Math.abs(z - 4620) < 80;
    T.scatter({ gulch_saguaro: 6, gulch_boulder: 3, gulch_cactus: 6, gulch_skull: 3, gulch_barrel: 1 }, { x0: 60, z0: 60, x1: 4940, z1: 4940 }, 400, { gap: 16, avoid: town });
    T.scatter({ gulch_cactus: 4, gulch_skull: 2, gulch_cowboy: 2, gulch_crate: 1 }, { x0: 60, z0: 60, x1: 4940, z1: 4940 }, 240, { gap: 8, avoid: town });
    // Little clusters of snacks dotted around the desert (cacti, skulls, a lost crate).
    for (let i = 0; i < 46; i++) { const x = rng.range(150, 4850), z = rng.range(150, 4850); if (town(x, z)) continue; T.scatter({ gulch_cactus: 5, gulch_skull: 2, gulch_crate: 1, gulch_barrel: 1, gulch_cowboy: 1, gulch_saguaro: 1 }, { x, z, r: 100 }, 9, { gap: 4 }); }
    // Red-rock boulder fields.
    for (const [x, z, r, n] of [[1500, 600, 260, 9], [3500, 560, 260, 9], [300, 2300, 200, 6], [4720, 2300, 200, 6], [1300, 4700, 220, 6], [3600, 4750, 200, 6]]) T.scatter({ gulch_boulder: 3, gulch_saguaro: 1, gulch_cactus: 2, gulch_skull: 1 }, { x, z, r }, n * 2, { gap: 12 });
    // Tumbleweeds rolling across the open desert.
    for (const [x, z, r, n] of [[420, 1450, 300, 6], [4620, 1450, 300, 6], [1700, 300, 260, 5], [3300, 280, 260, 5], [2000, 4350, 300, 5], [3100, 4300, 280, 4], [480, 3300, 260, 4], [4560, 3300, 280, 5], [4550, 4300, 250, 3]]) T.roamers('gulch_tumbleweed', x, z, r, n, { speed: [40, 75], spin: 1, bob: false });

    // ---------- beach & spawns ----------
    T.beach({ gulch_cactus: 4, gulch_skull: 3, gulch_barrel: 2, gulch_tumbleweed: 0, gulch_cowboy: 2, gulch_crate: 1 }, 50);
    for (const [x, z] of [[1250, MAIN], [CROSS, MAIN], [3800, MAIN], [450, 700], [4600, 1100], [4300, 4700], [1600, 1150], [3400, 1150], [700, 4500], [2500, 4500], [3300, 3500], [400, 1950], [4600, 3000], [1700, BACK], [2000, HOME], [3000, NORTH], [1500, NORTH]]) { T.spawnAt(x, z); T.scatter({ gulch_cactus: 3, gulch_skull: 1, gulch_barrel: 1, gulch_crate: 1, gulch_cowboy: 2 }, { x, z, r: 160, r0: 50 }, 10, { gap: 4 }); }
  }

  HC.Levels.add({
    id: 'gulch', num: 8, name: 'Dusty Gulch', tagline: 'Saloons, tumbleweeds & a giant red butte', icon: '🌵', colors: ['#FF9A4D', '#C9573A'],
    theme: {
      sky: '#FFC8A0', fogNear: 9000, fogFar: 22000,
      sea: { show: true, deep: '#1FA0C8', shallow: '#6FE3D8', foam: 0.9 },
      skirt: '#C9573A', hemiSky: '#FFE6C4', hemiGround: '#E0946A', hemi: 1.5, sun: '#FFD9A6', sunI: 2.45, glow: 0,
    },
    mods: { botSkill: -0.1 },
    milestones: [['gulch_wagon', '🛞 Wagons'], ['gulch_engine', '🚂 Steam trains'], ['gulch_store', '🏚️ Storefronts'], ['gulch_saloon', '🍺 Saloons'],
      ['gulch_hotel', '🏨 Hotels'], ['gulch_mine', '⛏️ The gold mine'], ['gulch_mesa', '🏜️ Mesas'], ['gulch_butte', '🗿 THUNDER BUTTE']],
    kinds,
    generate,
  });
})();
