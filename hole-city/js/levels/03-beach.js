// Level 3 — Sunny Shores: a beach resort on a crescent bay. A curved boardwalk with snack stalls
// hugs the sand, a promenade road and a strip of pastel hotels follow the curve, a little town grid
// sits inland, a marina cuts in from the east and a striped lighthouse stands on its own islet.
(function () {
  const D2R = Math.PI / 180;
  const BAY = [2500, 6400];                       // centre of the crescent bay (south of the island)
  const pol = (r, deg) => [BAY[0] + r * Math.sin(deg * D2R), BAY[1] - r * Math.cos(deg * D2R)];
  const rAt = (x, z) => Math.hypot(x - BAY[0], z - BAY[1]);
  const thAt = (x, z) => Math.atan2(x - BAY[0], BAY[1] - z) / D2R;

  const COL = {
    sand: '#FFE6A3', sandEdge: '#F6CF84', dune: '#F8D88F', wet: '#F2C987', foam: '#FFFFFF',
    shallow: '#8CF4E4', water: '#46E0DF', deep: '#22C8E4', deeper: '#14B2DE',
    plank: '#E5AE70', plankLine: '#C88A52', plankEdge: '#B9784A',
    road: '#7A7F9E', roadLine: '#FFFFFF', walk: '#FFF0DA', curb: '#F2DCC0', plaza: '#FFE1EC', plazaRing: '#FFC6DC',
    lawn: '#8FE36A', lawn2: '#7FD65C', path: '#FFE8C2', lot: '#8A8FAE', court: '#FF9B6B', pool: '#4FE3F0', poolEdge: '#FFFFFF', quay: '#EDE6F4',
  };
  const PASTEL = ['#FF9EC7', '#7FE7D0', '#FFD65C', '#8FD3FF', '#C3A6FF', '#FFA98A', '#A8F07A', '#FFB86B'];
  const BRIGHT = ['#FF5A5F', '#00BBF9', '#FEE440', '#F15BB5', '#00F5D4', '#FF8C42', '#9B5DE5', '#2ED573'];
  const SKIN = '#FFD3B0', GLASS = '#9FE7FF', DGLASS = '#2E5A86', TIRE = '#2B2D42', DARK = '#3A3F58', WOOD = '#C98B55', WOOD2 = '#A86E3E', SANDC = '#F2CB7E';

  function kinds(def) {
    // ---------------- tiny beach life (1 pt) ----------------
    def('beach_sunbather', { w: 18, d: 36, h: 9, points: 1, mass: 70, tints: BRIGHT,
      build(g) {
        g.block(0, 0, 0, 18, 0.8, 36, '#FFF', { tint: true }); g.block(0, 0.6, -12, 18.2, 0.4, 4, '#FFFFFF'); g.block(0, 0.6, 12, 18.2, 0.4, 4, '#FFFFFF');
        g.block(0, 0.8, 1, 9, 4, 12, '#FF4D6D'); g.block(-2.4, 0.8, 12, 3.6, 3, 11, SKIN); g.block(2.4, 0.8, 12, 3.6, 3, 11, SKIN);
        g.block(-6.4, 0.8, 0, 3, 2.6, 10, SKIN); g.block(6.4, 0.8, 0, 3, 2.6, 10, SKIN);
        g.ball(0, 3.6, -8.5, 3.8, SKIN, { detail: 1 }); g.ball(0, 5.6, -9, 5, '#FFE08A', { sy: 0.22 }); g.block(0, 4.4, -12.1, 5, 1.2, 0.6, '#2B2D42');
      } });
    def('beach_sandcastle', { w: 24, d: 24, h: 28, points: 1, mass: 40,
      build(g) {
        g.block(0, 0, 0, 24, 8, 24, SANDC);
        for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) { g.cyl(x, 8, z, 3.4, 3.8, 7, 6, '#F6D894'); g.cone(x, 15, z, 4.2, 4.5, 6, '#E9BD6A'); }
        g.block(0, 8, 0, 12, 9, 12, '#F6D894'); g.cyl(0, 17, 0, 3.2, 3.6, 4, 6, '#F6D894');
        g.block(0, 21, 0, 0.8, 7, 0.8, '#FFFFFF'); g.block(2.4, 25, 0, 4, 2.8, 0.4, '#FF4D6D'); g.panel('z+', 0, 3, 12.3, 4, 5, '#D9A55A');
      } });
    def('beach_surfboard', { w: 13, d: 6, h: 46, points: 1, mass: 6, tints: BRIGHT,
      build(g) {
        g.ball(0, 22, 0, 23, '#FFF', { tint: true, detail: 1, sx: 0.27, sz: 0.11 }); g.ball(0, 22, 0, 23.3, '#FFFFFF', { detail: 1, sx: 0.07, sz: 0.125 });
        g.ball(0, 0, 0, 6, '#F6D894', { sy: 0.3 });
      } });
    def('beach_crab', { w: 13, d: 9, h: 7, points: 1, mass: 1, mover: 'walk',
      build(g) {
        g.ball(0, 3, 0, 4, '#FF5A3C', { sx: 1.3, sy: 0.6 });
        for (const s of [-1, 1]) {
          g.block(s * 1.6, 3.5, 2, 0.8, 3, 0.8, '#FF5A3C'); g.ball(s * 1.6, 6.6, 2, 1.1, '#FFFFFF'); g.ball(s * 1.6, 6.8, 2.8, 0.5, '#2B2D42');
          g.ball(s * 5.4, 3, 3.4, 1.9, '#FF7A5C', { sx: 1.2 });
          for (let i = 0; i < 3; i++) g.limb((i % 2 ? 0.7 : -0.7) * s, s * 3.6, 1, () => g.block(s * 5.2, 0, -2 + i * 1.8, 3.4, 1, 0.8, '#E8452C', { rz: s * 0.5 }));
        }
      } });
    def('beach_gull', { w: 13, d: 7, h: 11, points: 1, mass: 1, mover: 'walk',
      build(g) {
        g.ball(0, 6, 0, 3.6, '#FFFFFF', { sx: 1.5, sy: 0.9 }); g.ball(4.4, 8.6, 0, 2.4, '#FFFFFF');
        g.block(7, 8, 0, 2.8, 1, 1.2, '#FFC21F'); g.ball(5.4, 9.4, 1.5, 0.5, '#2B2D42'); g.ball(5.4, 9.4, -1.5, 0.5, '#2B2D42');
        g.block(-1, 6.4, 3, 8, 1.2, 2.6, '#B8C2D9'); g.block(-1, 6.4, -3, 8, 1.2, 2.6, '#B8C2D9'); g.block(-6, 6, 0, 3, 1.2, 3, '#3A3F58');
        g.limb(1, 0, 3.6, () => g.block(0, 0, 1, 0.8, 3.6, 0.8, '#FF9B3D')); g.limb(-1, 0, 3.6, () => g.block(0, 0, -1, 0.8, 3.6, 0.8, '#FF9B3D'));
      } });
    def('beach_swimmer', { w: 15, d: 15, h: 11, points: 1, mass: 60, tints: ['#FF5A5F', '#FEE440', '#00F5D4', '#FF8C42', '#F15BB5'], mover: 'walk',
      build(g) {
        g.cyl(0, 0, 0, 7.4, 7.4, 3.6, 10, '#FFF', { tint: true });
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; g.block(Math.cos(a) * 5.8, 0, Math.sin(a) * 5.8, 3, 3.8, 3, '#FFFFFF', { ry: -a }); }
        g.cyl(0, 3.6, 0, 4.2, 4.2, 0.3, 10, '#3ED6E2');
        g.ball(0, 6.4, 0, 2.8, SKIN, { detail: 1 }); g.ball(0, 7.6, -0.4, 3, '#5A3825', { sy: 0.55 });
        g.block(4, 3.6, 0, 5, 1.4, 1.6, SKIN); g.block(-4, 3.6, 0, 5, 1.4, 1.6, SKIN);
      } });

    // ---------------- beach props (2–3 pts) ----------------
    def('beach_lounger', { w: 36, d: 16, h: 16, points: 2, mass: 15, tints: BRIGHT,
      build(g) {
        for (const x of [-13, 9]) for (const z of [-6, 6]) g.block(x, 0, z, 1.6, 6, 1.6, '#E8E2F0');
        g.block(-4, 6, 0, 22, 1.6, 14, '#FFF', { tint: true }); g.block(-4, 7.5, 0, 22, 0.3, 3, '#FFFFFF');
        g.box(11, 10.2, 0, 12, 1.6, 14, '#FFF', { tint: true, rz: 0.75 }); g.box(13.6, 13, 0, 4, 2, 10, '#FFFFFF', { rz: 0.75 });
      } });
    def('beach_hut', { w: 30, d: 30, h: 52, points: 3, mass: 300, tints: ['#FF5A8A', '#2EB6FF', '#FFC21F', '#2ED5A0', '#9B6BFF', '#FF8C42'],
      build(g) {
        g.block(0, 0, 0, 28, 34, 28, '#FFFFFF');
        for (let i = 0; i < 4; i++) g.block(-10.5 + i * 7, 0, 0, 3.5, 34, 28.6, '#FFF', { tint: true });
        g.gable(0, 34, 0, 32, 32, 12, '#FFFFFF'); g.panel('z+', 0, 13, 14.6, 10, 18, '#FFF7E0'); g.ball(0, 27, 14.6, 2, '#FFD23F');
        g.block(0, 45, 0, 0.8, 7, 0.8, '#FFFFFF'); g.block(2.4, 49, 0, 4, 2.6, 0.4, '#FF4D6D');
      } });

    // ---------------- boardwalk stalls & bars ----------------
    def('beach_icecreamhut', { w: 64, d: 56, h: 92, points: 8, mass: 2500, tints: ['#FFB3D9', '#B8F2E6', '#FFE38A', '#CDB8FF'],
      build(g) {
        g.block(0, 0, 0, 60, 42, 52, '#FFF', { tint: true }); g.block(0, 0, 0, 62, 5, 54, '#FFFFFF');
        g.panel('z+', 0, 24, 26.3, 40, 14, '#FFF6E0'); g.block(0, 16, 28, 46, 3, 4, '#FFFFFF');
        for (let i = 0; i < 8; i++) g.box(-26.25 + i * 7.5, 36, 28, 7.5, 1.6, 8, i % 2 ? '#FFFFFF' : '#FF5A8A', { rx: 0.35 });
        g.block(0, 42, 0, 64, 4, 56, '#FFFFFF'); g.panel('x+', 30.3, 22, 0, 30, 18, '#FFFFFF'); g.panel('x-', -30.3, 22, 0, 30, 18, '#FFFFFF');
        g.cyl(0, 46, 0, 12, 1, 24, 8, '#E8A955'); g.ball(0, 72, 0, 10.5, '#FF8FC7', { detail: 1 }); g.ball(0, 82, 0, 7.5, '#FFF3D6', { detail: 1 }); g.ball(0, 90, 0, 2.4, '#FF3B47');
      } });
    def('beach_tikihut', { w: 64, d: 56, h: 66, points: 8, mass: 2000,
      build(g) {
        for (const [x, z] of [[-27, -23], [27, -23], [-27, 23], [27, 23]]) g.cyl(x, 0, z, 2.6, 2.6, 40, 6, WOOD2);
        g.block(0, 0, 18, 56, 20, 12, WOOD); g.block(0, 20, 18, 60, 3, 16, '#8D5A3B'); g.block(0, 0, -20, 56, 40, 8, WOOD);
        for (let i = 0; i < 5; i++) g.block(-22 + i * 11, 0, 24.3, 3, 20, 0.6, '#B07A4A');
        g.cone(0, 38, 0, 44, 20, 4, '#E8C15A', { ry: Math.PI / 4 }); g.cone(0, 50, 0, 26, 16, 4, '#F5D57A', { ry: Math.PI / 4 });
        g.block(0, 27, 26, 40, 9, 1.5, '#FFD23F'); g.panel('z+', 0, 31.5, 26.9, 30, 3.5, '#FF5A5F');
        g.ball(-12, 25, 20, 2.6, '#8D5A3B'); g.block(-11, 26, 20, 0.6, 6, 0.6, '#FF5A8A'); g.ball(10, 25, 20, 2.6, '#7BE36A');
        g.glowing(() => { g.cone(-30, 30, 26, 2.4, 6, 5, '#FF9B2F'); g.cone(30, 30, 26, 2.4, 6, 5, '#FF9B2F'); });
        g.cyl(-30, 0, 26, 1, 1, 30, 5, '#8D5A3B'); g.cyl(30, 0, 26, 1, 1, 30, 5, '#8D5A3B');
      } });
    def('beach_cabana', { w: 108, d: 100, h: 92, points: 12, mass: 6000,
      build(g) {
        g.cyl(0, 0, 0, 54, 54, 4, 12, '#D9A066');
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.cyl(Math.cos(a) * 44, 4, Math.sin(a) * 44, 2.6, 2.6, 46, 6, WOOD2); }
        g.cyl(0, 4, 0, 24, 24, 22, 10, WOOD); g.cyl(0, 26, 0, 28, 28, 3, 10, '#8D5A3B');
        g.cyl(0, 29, 0, 4, 4, 22, 6, WOOD2); g.block(0, 32, 0, 14, 8, 14, '#FF8C42'); g.ball(0, 44, 0, 4, '#FFD23F');
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.3; g.cyl(Math.cos(a) * 34, 4, Math.sin(a) * 34, 3.4, 3, 13, 6, BRIGHT[i % BRIGHT.length]); }
        g.cone(0, 48, 0, 72, 30, 4, '#E8C15A', { ry: Math.PI / 4 }); g.cone(0, 66, 0, 40, 22, 4, '#F5D57A', { ry: Math.PI / 4 });
        g.cyl(0, 86, 0, 1, 1, 6, 4, WOOD2); g.block(3, 88, 0, 6, 4, 0.5, '#FF5A8A');
        g.glowing(() => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; g.ball(Math.cos(a) * 48, 47, Math.sin(a) * 48, 2, i % 2 ? '#FFE58A' : '#FF8FC7'); } });
      } });

    // ---------------- vehicles & boats ----------------
    def('beach_convertible', { w: 84, d: 40, h: 32, points: 5, mass: 1100, tints: ['#FF4D6D', '#00C2FF', '#FFC312', '#2ED5A0', '#FF8C42', '#C77DFF', '#FFFFFF'], mover: 'drive',
      build(g) {
        g.block(0, 5, 0, 84, 13, 40, '#FFF', { tint: true }); g.block(28, 18, 0, 26, 1.5, 38, '#FFF', { tint: true }); g.block(-34, 18, 0, 14, 1.5, 38, '#FFF', { tint: true });
        g.block(-6, 18, 0, 46, 0.4, 34, '#8D5A3B');
        for (const x of [-20, 2]) for (const z of [-8, 8]) { g.block(x, 14, z, 9, 6, 12, '#FFF3DC'); g.block(x - 4, 18, z, 3, 10, 12, '#FFF3DC'); }
        g.box(14, 23, 0, 1.4, 9, 36, GLASS, { rz: 0.45 });
        g.block(-1, 18, 8, 6, 7, 8, '#FFC21F'); g.ball(-1, 29, 8, 3.6, SKIN); g.block(1.5, 29.4, 8, 2, 1.2, 6, '#2B2D42');
        for (const x of [-27, 27]) for (const z of [-18, 18]) g.cyl(x, 0, z, 6.5, 6.5, 5, 10, TIRE, { rx: Math.PI / 2 });
        g.panel('x+', 42.2, 12, 13, 6, 4, '#FFF7C2'); g.panel('x+', 42.2, 12, -13, 6, 4, '#FFF7C2'); g.panel('x-', -42.2, 12, 13, 6, 4, '#FF3B47'); g.panel('x-', -42.2, 12, -13, 6, 4, '#FF3B47');
        g.block(0, 9, 20.3, 76, 2, 0.4, '#FFFFFF'); g.block(0, 9, -20.3, 76, 2, 0.4, '#FFFFFF');
      } });
    def('beach_surfvan', { w: 96, d: 44, h: 58, points: 6, mass: 1800, tints: ['#FF8FA3', '#5CD6FF', '#FFC94D', '#6FE3B4', '#FF9F5A'], mover: 'drive',
      build(g) {
        g.block(0, 5, 0, 94, 20, 44, '#FFF', { tint: true }); g.block(-3, 25, 0, 86, 19, 42, '#FFFFFF'); g.block(-3, 44, 0, 80, 2, 38, '#FFFFFF');
        g.panel('x+', 40.4, 34, 0, 34, 12, GLASS); g.cyl(47.4, 13, 0, 6, 6, 0.8, 10, '#FFFFFF', { rz: Math.PI / 2 });
        for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) g.panel(s > 0 ? 'z+' : 'z-', -30 + i * 22, 35, s * 21.3, 16, 10, GLASS); g.block(-3, 23, s * 22.2, 88, 2, 0.4, '#FFFFFF'); }
        g.panel('x+', 47.3, 16, 15, 5, 5, '#FFF7C2'); g.panel('x+', 47.3, 16, -15, 5, 5, '#FFF7C2');
        for (const x of [-30, 30]) for (const z of [-20, 20]) g.cyl(x, 0, z, 7, 7, 5, 10, TIRE, { rx: Math.PI / 2 });
        g.block(-3, 46, -9, 60, 1.5, 2, DARK); g.block(-3, 46, 9, 60, 1.5, 2, DARK);
        g.ball(-3, 50, -9, 40, '#FFD23F', { sx: 1, sy: 0.05, sz: 0.16 }); g.ball(-3, 52.5, 9, 38, '#00BBF9', { sx: 1, sy: 0.05, sz: 0.16 });
      } });
    def('beach_jetski', { w: 40, d: 16, h: 26, points: 3, mass: 300, tints: ['#FF4D6D', '#FFC312', '#00C2FF', '#2ED573'],
      build(g) {
        g.block(-4, 0, 0, 30, 7, 15, '#FFFFFF'); g.box(12, 3.5, 0, 11, 7, 11, '#FFFFFF', { ry: Math.PI / 4 });
        g.block(-4, 4, 0, 30.4, 3, 15.4, '#FFF', { tint: true }); g.box(12, 5.5, 0, 11.4, 3, 11.4, '#FFF', { tint: true, ry: Math.PI / 4 });
        g.block(-7, 7, 0, 14, 3, 7, '#2B2D42'); g.block(5, 7, 0, 7, 5, 11, '#FFF', { tint: true }); g.block(5, 12, 0, 2, 1.4, 13, '#2B2D42');
        g.block(-5, 10, 0, 6, 9, 8, '#FF8C1A'); g.ball(-4, 22, 0, 3, SKIN); g.ball(-4.2, 23.4, 0, 3.1, '#5A3825', { sy: 0.5 });
        g.block(1, 15, 3, 7, 1.6, 1.6, SKIN); g.block(1, 15, -3, 7, 1.6, 1.6, SKIN);
      } });
    def('beach_speedboat', { w: 92, d: 36, h: 32, points: 6, mass: 1500, tints: ['#FF4D6D', '#00A6FF', '#FFC312', '#2ED573', '#9B5DE5'],
      build(g) {
        g.block(-12, 0, 0, 64, 12, 34, '#FFFFFF'); g.box(20, 6, 0, 24, 12, 24, '#FFFFFF', { ry: Math.PI / 4 });
        g.block(-12, 5, 0, 64.4, 4, 34.4, '#FFF', { tint: true }); g.box(20, 7, 0, 24.4, 4, 24.4, '#FFF', { tint: true, ry: Math.PI / 4 });
        g.block(-12, 12, 0, 60, 1, 30, '#E8D3B0'); g.box(20, 12.5, 0, 22, 1, 22, '#E8D3B0', { ry: Math.PI / 4 });
        g.box(6, 17, 0, 2, 9, 26, GLASS, { rz: 0.5 }); g.block(-6, 13, -7, 8, 6, 8, '#FFFFFF'); g.block(-6, 13, 7, 8, 6, 8, '#FFFFFF');
        g.block(-34, 13, 0, 10, 6, 28, '#FFFFFF'); g.block(-46, 4, 0, 6, 16, 8, '#2B2D42'); g.block(-6, 19, -7, 2, 8, 6, '#FFFFFF');
      } });
    def('beach_sailboat', { hs: 0.82, w: 130, d: 56, h: 196, points: 12, mass: 4000, tints: ['#FF5A5F', '#00BBF9', '#FEE440', '#F15BB5', '#2ED5A0', '#FF8C42'],
      build(g) {
        g.block(-14, 0, 0, 90, 14, 46, '#FFFFFF'); g.box(31, 7, 0, 32, 14, 32, '#FFFFFF', { ry: Math.PI / 4 });
        g.block(-14, 6, 0, 90.4, 4, 46.4, '#FFF', { tint: true }); g.box(31, 8, 0, 32.4, 4, 32.4, '#FFF', { tint: true, ry: Math.PI / 4 });
        g.block(-14, 14, 0, 86, 1, 42, '#E8D3B0'); g.block(-22, 15, 0, 38, 11, 28, '#FFFFFF'); g.panel('z+', -22, 21, 14.3, 28, 4, DGLASS); g.panel('z-', -22, 21, -14.3, 28, 4, DGLASS);
        g.cyl(6, 15, 0, 1.6, 2, 175, 6, '#E8E2F0'); g.block(-14, 30, 0, 42, 2.4, 2.4, '#E8E2F0');
        g.gable(6, 26, 0, 1.4, 92, 160, '#FFF', { ry: Math.PI / 2, tint: true }); g.gable(6, 136, 0, 2, 26, 50, '#FFFFFF', { ry: Math.PI / 2 });
        g.block(10, 190, 0, 6, 3, 0.5, '#FF5A8A');
      } });
    def('beach_yacht', { w: 250, d: 90, h: 112, points: 20, mass: 40000, tints: ['#1E5BD9', '#18B6C9', '#2B2D42', '#E8455C'],
      build(g) {
        g.block(-20, 0, 0, 170, 26, 86, '#FFFFFF'); g.box(65, 13, 0, 60, 26, 60, '#FFFFFF', { ry: Math.PI / 4 });
        g.block(-20, 8, 0, 170.4, 6, 86.4, '#FFF', { tint: true }); g.box(65, 11, 0, 60.4, 6, 60.4, '#FFF', { tint: true, ry: Math.PI / 4 });
        g.block(-20, 26, 0, 166, 1, 82, '#E8D3B0'); g.box(65, 26.5, 0, 57, 1, 57, '#E8D3B0', { ry: Math.PI / 4 });
        g.block(-30, 27, 0, 120, 26, 66, '#FFFFFF'); g.block(-30, 35, 0, 121, 9, 66.6, DGLASS); g.box(34, 38, 0, 14, 22, 62, DGLASS, { rz: 0.7 });
        g.block(-42, 53, 0, 84, 20, 56, '#FFFFFF'); g.block(-42, 60, 0, 85, 7, 56.6, DGLASS); g.box(4, 62, 0, 10, 16, 52, DGLASS, { rz: 0.7 });
        g.block(-36, 73, 0, 48, 3, 48, '#FFFFFF'); g.block(-48, 76, 0, 6, 22, 40, '#FFFFFF'); g.ball(-48, 103, 0, 6, '#FFFFFF');
        g.cyl(48, 27, 0, 13, 13, 2.5, 10, '#3ED6E2'); for (const z of [-14, 14]) g.block(-94, 27, z, 18, 3, 11, '#FF8FA3');
      } });
    def('beach_cruise', { hs: 0.85, w: 620, d: 140, h: 250, points: 50, mass: 900000,
      build(g) {
        g.block(-40, 0, 0, 500, 62, 136, '#FFFFFF'); g.box(210, 31, 0, 96, 62, 96, '#FFFFFF', { ry: Math.PI / 4 });
        g.block(-40, 0, 0, 500.6, 22, 136.6, '#1F3A7B'); g.box(210, 11, 0, 96.6, 22, 96.6, '#1F3A7B', { ry: Math.PI / 4 });
        g.block(-40, 22, 0, 500.6, 5, 136.6, '#FF3B5C'); g.box(210, 24.5, 0, 96.6, 5, 96.6, '#FF3B5C', { ry: Math.PI / 4 });
        g.block(-40, 38, 0, 470, 6, 137, '#BFEFFF');
        g.block(-60, 62, 0, 420, 40, 120, '#FFFFFF'); g.block(-60, 72, 0, 421, 16, 121, DGLASS);
        g.block(-70, 102, 0, 360, 38, 110, '#FFFFFF'); g.block(-70, 112, 0, 361, 14, 111, DGLASS);
        g.block(-100, 140, 0, 260, 26, 96, '#FFFFFF'); g.block(-100, 147, 0, 261, 10, 97, DGLASS);
        g.block(130, 102, 0, 40, 46, 126, '#FFFFFF'); g.block(150.4, 132, 0, 1, 10, 110, DGLASS);
        g.block(-60, 166, 0, 120, 1, 60, '#3ED6E2');
        for (const x of [-170, -110]) { g.cyl(x, 166, 0, 18, 22, 56, 10, '#FF3B5C'); g.cyl(x, 222, 0, 18.4, 18.4, 10, 10, '#2B2D42'); }
        for (let i = 0; i < 6; i++) for (const s of [-1, 1]) g.block(-220 + i * 70, 82, s * 62, 34, 11, 9, '#FF8C1A');
        g.box(10, 190, 0, 60, 6, 6, '#FFD23F', { rz: -0.6 }); g.box(-20, 175, 0, 50, 6, 6, '#FFD23F', { rz: 0.6 });
      } });

    // ---------------- buildings ----------------
    def('beach_cottage', { w: 150, d: 140, h: 146, points: 22, mass: 30000, tints: ['#FF6F61', '#2EC4FF', '#FFC93D', '#2ED5A0', '#A98BFF', '#FF8FB1'],
      build(g) {
        for (const x of [-62, -20, 20, 62]) for (const z of [-58, 58]) g.block(x, 0, z, 6, 30, 6, '#EDE6F4');
        g.block(0, 30, -8, 132, 62, 110, '#FFF8EC'); g.block(0, 30, 0, 150, 5, 138, '#E5AE70'); g.block(0, 86, -8, 134, 6, 112, '#FFF', { tint: true });
        g.gable(0, 92, -8, 146, 128, 46, '#FFF', { tint: true }); g.gable(0, 137, -8, 150, 6, 3, '#FFFFFF');
        for (let i = 0; i < 9; i++) g.block(-72 + i * 18, 35, 67, 2, 11, 2, '#FFFFFF'); g.block(0, 44, 67, 148, 2, 2, '#FFFFFF');
        g.panel('z+', -24, 54, 47.4, 22, 36, '#FFF', { tint: true }); g.panel('z+', 26, 62, 47.4, 36, 24, GLASS);
        g.panel('z+', 5, 62, 47.5, 6, 24, '#FFF', { tint: true }); g.panel('z+', 47, 62, 47.5, 6, 24, '#FFF', { tint: true });
        g.panel('x+', 66.4, 62, -8, 40, 22, GLASS); g.panel('x-', -66.4, 62, -8, 40, 22, GLASS); g.panel('z-', 0, 62, -63.4, 60, 22, GLASS);
        g.cyl(0, 108, 56.5, 9, 9, 1, 10, '#FFFFFF', { rx: Math.PI / 2 }); g.cyl(0, 108, 57.2, 6.5, 6.5, 1, 10, GLASS, { rx: Math.PI / 2 });
        g.box(70, 16, 40, 10, 3, 40, '#C88A52', { rx: -0.7 });
        g.cyl(-50, 66, 47.6, 7, 7, 2, 10, '#FF4D4D', { rx: Math.PI / 2 }); g.cyl(-50, 66, 48.4, 4, 4, 1, 10, '#FFFFFF', { rx: Math.PI / 2 });
      } });
    def('beach_hotel', { hs: 0.82, w: 250, d: 210, h: 330, points: 50, mass: 300000, tints: PASTEL,
      build(g) {
        g.block(0, 0, 0, 250, 40, 210, '#FFFFFF'); g.panel('z+', 0, 20, 105.4, 170, 30, GLASS); g.block(0, 38, 108, 120, 3, 8, '#FF5A8A');
        g.block(0, 40, 0, 240, 260, 200, '#FFF', { tint: true });
        for (let r = 0; r < 8; r++) {
          const y = 44 + r * 32;
          g.panel('z+', 0, y + 15, 100.3, 214, 20, DGLASS); g.block(0, y, 104, 224, 3, 9, '#FFFFFF'); g.block(0, y + 3, 108, 224, 7, 1.2, '#CFF7FF');
          for (const s of [-1, 1]) for (const z of [-55, 0, 55]) g.panel(s > 0 ? 'x+' : 'x-', s * 120.4, y + 15, z, 30, 18, GLASS);
        }
        g.windows(0, 0, 240, 200, 44, 296, 4, 3, GLASS, { fill: 0.6, fillY: 0.5 });
        g.block(0, 300, 0, 248, 8, 208, '#FFFFFF'); g.block(-40, 308, -20, 120, 2, 80, '#FFFFFF'); g.block(-40, 309.5, -20, 108, 0.8, 68, '#3ED6E2');
        for (const x of [50, 90]) { g.cyl(x, 308, 30, 1, 1, 18, 5, '#FFFFFF'); g.cone(x, 320, 30, 14, 6, 6, '#FF5A5F'); }
        g.block(0, 308, 92, 120, 20, 4, '#FFFFFF'); g.panel('z+', 0, 318, 94.3, 108, 12, '#FF5A8A');
      } });
    def('beach_resort', { hs: 0.75, w: 330, d: 300, h: 400, points: 85, mass: 800000, tints: ['#FFF1E0', '#FFE3EE', '#E3FFF6', '#FFF6CC'],
      build(g) {
        const tiers = [[0, 330, 300, 0], [110, 310, 220, -40], [220, 290, 140, -80]];
        tiers.forEach(([y0, w, d, cz], i) => {
          g.block(0, y0, cz, w, 110, d, '#FFF', { tint: true }); g.block(0, y0 + 110, cz, w + 6, 5, d + 6, '#FFFFFF');
          for (let f = 0; f < 3; f++) { const y = y0 + 12 + f * 33; g.panel('z+', 0, y + 14, cz + d / 2 + 0.4, w - 30, 18, DGLASS); g.block(0, y, cz + d / 2 + 4, w - 20, 3, 8, '#FFFFFF');
            g.panel('x+', w / 2 + 0.4, y + 14, cz, d - 40, 16, GLASS); g.panel('x-', -w / 2 - 0.4, y + 14, cz, d - 40, 16, GLASS); g.panel('z-', 0, y + 14, cz - d / 2 - 0.4, w - 40, 16, GLASS); }
          for (let k = 0; k < 6; k++) g.block(-w / 2 + 20 + k * (w - 40) / 5, y0 + 115, cz + d / 2 - 8, 10, 10, 10, '#3FC86A');
        });
        g.block(-80, 115, 110, 120, 1.2, 60, '#3ED6E2'); for (const x of [40, 90, 130]) { g.cyl(x, 115, 110, 1, 1, 16, 5, '#FFFFFF'); g.cone(x, 127, 110, 13, 5, 6, BRIGHT[(x / 10) % 8 | 0]); }
        for (const x of [-120, 120]) { g.cyl(x, 225, 40, 3, 4, 30, 6, '#B07A4A'); g.ball(x, 260, 40, 14, '#3FC86A', { sy: 0.6 }); }
        g.block(0, 330, -110, 200, 40, 80, '#FFFFFF'); g.panel('z+', 0, 352, -69.6, 180, 20, DGLASS); g.block(0, 370, -110, 220, 6, 100, '#FF7A6B');
        g.block(0, 376, -100, 120, 18, 4, '#FFFFFF'); g.panel('z+', 0, 385, -97.7, 110, 12, '#00BBF9');
      } });
    def('beach_grand', { hs: 0.72, w: 420, d: 400, h: 520, points: 145, mass: 2000000, tints: ['#FF9EC7', '#8FF0D2', '#FFE07A', '#B9A6FF'],
      build(g) {
        g.block(0, 0, 0, 420, 22, 400, '#FFFFFF'); g.block(0, 22, 0, 400, 240, 380, '#FFF', { tint: true }); g.block(0, 262, 0, 412, 12, 392, '#FFFFFF'); g.block(0, 274, 0, 384, 0.6, 364, '#FFF', { tint: true });
        for (let f = 0; f < 6; f++) {
          const y = 40 + f * 36;
          g.panel('z+', 0, y + 12, 190.4, 360, 18, '#FFF8E8'); g.panel('z-', 0, y + 12, -190.4, 360, 18, GLASS);
          g.panel('x+', 200.4, y + 12, 0, 340, 18, GLASS); g.panel('x-', -200.4, y + 12, 0, 340, 18, GLASS); g.block(0, y, 0, 404, 2.5, 384, '#FFFFFF');
        }
        for (let i = 0; i < 11; i++) g.block(-175 + i * 35, 22, 191, 6, 240, 3, '#FFFFFF');
        for (let i = 0; i < 10; i++) g.box(-157.5 + i * 35, 64, 196, 28, 1.6, 12, i % 2 ? '#FFFFFF' : '#FF4F8A', { rx: 0.4 });
        g.block(0, 274, 40, 150, 120, 150, '#FFF', { tint: true }); g.block(0, 394, 40, 158, 8, 158, '#FFFFFF');
        g.panel('z+', 0, 340, 115.4, 100, 26, '#FFD23F'); g.panel('z+', 0, 340, 115.5, 86, 14, '#FF4F8A');
        for (let i = 0; i < 3; i++) { g.panel('x+', 75.4, 300 + i * 30, 40, 110, 14, GLASS); g.panel('x-', -75.4, 300 + i * 30, 40, 110, 14, GLASS); }
        g.ball(0, 402, 40, 66, '#FFFFFF', { sy: 0.78, detail: 1 }); g.cyl(0, 450, 40, 3, 6, 40, 6, '#FFD23F'); g.ball(0, 492, 40, 6, '#FFD23F');
        for (const x of [-180, 180]) { g.cyl(x, 0, 170, 34, 34, 310, 10, '#FFF', { tint: true }); g.cyl(x, 310, 170, 38, 38, 8, 10, '#FFFFFF'); g.cone(x, 318, 170, 40, 70, 10, '#FF4F8A'); g.panel('z+', x, 200, 204.4, 22, 40, GLASS); g.panel('z+', x, 120, 204.4, 22, 40, GLASS); }
        for (const x of [-180, 180]) { g.cyl(x, 262, -150, 28, 28, 60, 8, '#FFF', { tint: true }); g.cone(x, 322, -150, 32, 46, 8, '#FF4F8A'); }
        g.block(0, 0, 196, 130, 80, 8, '#FFFFFF'); for (const x of [-48, -16, 16, 48]) g.cyl(x, 0, 198, 5, 5, 80, 8, '#FFFFFF');
        g.block(0, 80, 194, 150, 6, 12, '#FF3B6B'); g.panel('z+', 0, 30, 200.4, 60, 50, '#FFD9A8');
        for (let k = 0; k < 4; k++) { const x = -140 + k * 93; g.cyl(x, 274, -80, 1.6, 1.6, 30, 5, '#FFFFFF'); g.block(x + 7, 296, -80, 14, 8, 0.6, BRIGHT[k]); }
        g.block(110, 274, -60, 140, 1.5, 120, '#3ED6E2');
      } });

    // ---------------- big set pieces ----------------
    def('beach_palm', { w: 26, d: 26, h: 150, points: 5, mass: 500, tints: ['#2FCB5A', '#3EDB6A', '#22B86A', '#5AD84A', '#1FBF7A'],
      build(g) {
        let x = -9, y = 0;
        for (let i = 0; i < 5; i++) {
          const lean = 0.06 + i * 0.06, h = 25, cx = x + Math.sin(lean) * h / 2, cy = y + Math.cos(lean) * h / 2;
          g.cyl(cx, cy - h / 2, 0, 3.3 - i * 0.25, 4 - i * 0.25, h, 6, i % 2 ? '#C08F5E' : '#A5733F', { rz: -lean });
          x += Math.sin(lean) * h; y += Math.cos(lean) * h;
        }
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2 + 0.3, droop = 0.3 + (i % 2) * 0.22, L = 36, c = Math.cos(droop), s = Math.sin(droop);
          g.box(x + Math.cos(a) * L / 2 * c, y + 2 - L / 2 * s, -Math.sin(a) * L / 2 * c, L, 1.6, 11, '#FFF', { tint: true, ry: a, rz: -droop });
        }
        g.ball(x, y + 2, 0, 5, '#FFF', { tint: true });
        for (let i = 0; i < 3; i++) { const a = i * 2.1; g.ball(x + Math.cos(a) * 3.6, y - 2.4, Math.sin(a) * 3.6, 2.8, '#7A4A2A'); }
      } });
    def('beach_ferris', { hs: 0.88, w: 300, d: 140, h: 330, points: 30, mass: 60000,
      build(g) {
        const R = 128, cy = 170, RAIN = ['#FF5A5F', '#FF9F1C', '#FEE440', '#2ED573', '#00BBF9', '#9B5DE5'];
        g.block(0, 0, 0, 300, 6, 140, '#FFFFFF'); g.block(0, 6, 46, 120, 10, 30, '#FF8FC7'); g.block(0, 16, 46, 100, 30, 20, '#FFF3DC');
        for (const z of [-30, 30]) { g.box(48, cy / 2, z, 8, Math.hypot(96, cy), 8, '#EDE6F4', { rz: Math.atan2(96, cy) }); g.box(-48, cy / 2, z, 8, Math.hypot(96, cy), 8, '#EDE6F4', { rz: -Math.atan2(96, cy) }); }
        g.cyl(0, cy - 34, 0, 12, 12, 68, 8, '#FF5A8A', { rx: Math.PI / 2 });
        for (let i = 0; i < 12; i++) { const m = (i + 0.5) / 12 * Math.PI * 2; for (const z of [-20, 20]) g.box(Math.cos(m) * R, cy + Math.sin(m) * R, z, 2 * R * Math.sin(Math.PI / 12) + 3, 6, 4, i % 2 ? '#FF5A8A' : '#FFFFFF', { rz: m + Math.PI / 2 }); }
        for (let i = 0; i < 6; i++) for (const z of [-20, 20]) g.box(0, cy, z, 2 * R, 2.6, 2.6, '#FFFFFF', { rz: i / 6 * Math.PI });
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.block(Math.cos(a) * R, cy + Math.sin(a) * R - 22, 0, 18, 18, 22, RAIN[i % 6]); g.block(Math.cos(a) * R, cy + Math.sin(a) * R - 4, 0, 20, 3, 24, '#FFFFFF'); }
        g.glowing(() => { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.ball(Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6), 22, 2.4, '#FFF3A8'); } });
      } });
    def('beach_lighthouse', { hs: 0.72, w: 520, d: 520, h: 1210, points: 330, mass: 5000000,
      build(g) {
        const ROCK = ['#B9B3C9', '#A49DB8', '#CBC5D9'];
        for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, r = 200 + (i % 3) * 14; g.ball(Math.cos(a) * r, 8, Math.sin(a) * r, 52 + (i % 4) * 8, ROCK[i % 3], { sy: 0.55 }); }
        g.cyl(0, 0, 0, 208, 232, 40, 16, '#8FE36A'); g.cyl(0, 40, 0, 150, 160, 26, 14, '#F5EEDF'); g.cyl(0, 66, 0, 152, 152, 4, 14, '#E2D8C4');
        // keeper's cottage + flower beds + pennant
        g.block(-120, 40, 110, 96, 56, 66, '#FFFFFF'); g.gable(-120, 96, 110, 104, 74, 34, '#FF3B47'); g.panel('z+', -136, 60, 143.4, 18, 30, '#3D7BFF'); g.panel('z+', -98, 70, 143.4, 22, 18, GLASS);
        g.block(-90, 104, 100, 12, 30, 12, '#E8E2F0');
        for (let i = 0; i < 9; i++) { const a = 0.2 + i * 0.14; g.ball(Math.cos(a) * 185, 44, Math.sin(a) * 185, 9, ['#FF5A8A', '#FFD23F', '#B388FF'][i % 3]); }
        g.cyl(150, 40, -120, 2, 2, 120, 5, '#FFFFFF'); g.block(166, 140, -120, 30, 16, 1, '#2ED5A0');
        // striped tower
        for (let i = 0; i < 7; i++) { const y0 = 70 + i * 128, rb = 122 - i * 7.5, rt = 122 - (i + 1) * 7.5; g.cyl(0, y0, 0, rt, rb, 128, 14, i % 2 ? '#FFFFFF' : '#FF3B47'); }
        g.panel('z+', 0, 70, 123, 34, 60, '#2B3A5C'); g.block(0, 128, 128, 44, 5, 12, '#2B3A5C');
        for (const y of [330, 590, 820]) g.panel('z+', 0, y, 124 - (y - 70) / 128 * 7.5 + 2, 18, 30, '#2B3A5C');
        // gallery, lantern, dome
        g.cyl(0, 966, 0, 108, 88, 18, 14, '#2B2D42'); g.cyl(0, 984, 0, 106, 106, 3, 14, '#2B2D42');
        for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.block(Math.cos(a) * 103, 987, Math.sin(a) * 103, 3, 20, 3, '#FFFFFF'); }
        g.cyl(0, 1005, 0, 105, 105, 3, 14, '#FFFFFF');
        g.glowing(() => { g.cyl(0, 984, 0, 62, 62, 88, 12, '#FFF3A0'); g.ball(0, 1028, 0, 30, '#FFFFFF'); });
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.block(Math.cos(a) * 63, 984, Math.sin(a) * 63, 5, 88, 5, '#2B2D42'); }
        g.cyl(0, 1072, 0, 76, 70, 12, 12, '#FF3B47'); g.ball(0, 1084, 0, 66, '#FF3B47', { sy: 0.65, detail: 1 });
        g.cyl(0, 1124, 0, 3, 8, 60, 6, '#2B2D42'); g.ball(0, 1190, 0, 11, '#FFD23F');
      } });
  }

  // ---------------- layout helpers ----------------
  // HC.Geo.strip winds its quads clockwise (seen from above) while flat()/disc() wind counter-clockwise,
  // so strips render back-facing and darker. Detect the winding once and flip the width to compensate.
  let STRIP_SIGN = 0;
  function stripSign() {
    if (STRIP_SIGN) return STRIP_SIGN;
    const g = new HC.Geo(); g.strip(0, 0, 10, 0, 2, 0, '#FFFFFF'); const p = g.pos;
    STRIP_SIGN = ((p[5] - p[2]) * (p[6] - p[0]) - (p[3] - p[0]) * (p[8] - p[2])) >= 0 ? 1 : -1;
    return STRIP_SIGN;
  }
  const strip = (T, x0, z0, x1, z1, w, y, color) => T.strip(x0, z0, x1, z1, w * stripSign(), y, color);
  const path = (T, pts, w, y, color, closed = false) => { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; strip(T, a[0], a[1], b[0], b[1], w, y, color); T.disc(a[0], a[1], w / 2, y, color, 16); } };
  // A water (or wet sand) layer: the part of the disc of radius R around BAY that lies on the island.
  // Vertical slices fill the inside; strips along the chords smooth the curved shoreline.
  function bayLayer(T, R, y, color) {
    const zMax = 5278, step = 24, zt = (x) => BAY[1] - Math.sqrt(Math.max(0, R * R - (x - BAY[0]) ** 2));
    const half = Math.sqrt(R * R - (BAY[1] - zMax) ** 2), xa = BAY[0] - half, xb = BAY[0] + half, n = Math.ceil((xb - xa) / step), s = (xb - xa) / n;
    for (let i = 0; i < n; i++) {
      const x0 = xa + i * s, x1 = x0 + s, z0 = zt(x0), z1 = zt(x1);
      T.rect(x0, Math.max(z0, z1), x1, zMax, y, color);
      const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz); let nx = -dz / L, nz = dx / L;
      if (nx * (BAY[0] - x0) + nz * (BAY[1] - z0) < 0) { nx = -nx; nz = -nz; }
      if (Math.max(z0, z1) > zMax - 40) continue;
      const w = 30; strip(T, x0 + nx * w / 2, z0 + nz * w / 2, x1 + nx * w / 2, z1 + nz * w / 2, w, y, color);
    }
  }
  const arcPts = (r, a0, a1, step = 2) => { const out = [], n = Math.max(1, Math.round(Math.abs(a1 - a0) / step)); for (let i = 0; i <= n; i++) out.push(pol(r, a0 + (a1 - a0) * i / n)); return out; };
  const ellipse = (cx, cz, rx, rz, n = 28) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; out.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]); } return out; };
  // Closed racetrack around an arc (out along r+lane, U-turn, back along r-lane) for two-way traffic on an open road.
  function arcTrack(r, a0, a1, lane) {
    const fwd = arcPts(r + lane, a0, a1, 2), back = arcPts(r - lane, a1, a0, 2), out = fwd.slice();
    for (let k = 1; k < 6; k++) { const ph = k / 6 * Math.PI, rr = r + lane * Math.cos(ph), a = a1 + Math.sin(ph) * (lane / r) / D2R * 1.6; out.push(pol(rr, a)); }
    out.push(...back);
    for (let k = 1; k < 6; k++) { const ph = k / 6 * Math.PI, rr = r - lane * Math.cos(ph), a = a0 - Math.sin(ph) * (lane / r) / D2R * 1.6; out.push(pol(rr, a)); }
    return out;
  }
  // Evenly space the movers of the last call so loop traffic never starts stacked up.
  function spread(T, n0) { const list = T.city.objects.slice(n0).filter((o) => o.mover); list.forEach((o, i) => { o.mover.t = i / list.length + 0.37 / list.length; }); }
  function loopFleet(T, weights, pts, n, speed, lane) { const n0 = T.city.objects.length; T.loopVehicles(weights, pts, n, [speed, speed], { lane }); spread(T, n0); }

  // Rects of open ground that scatter() may use, with an avoid() test for the curved zones.
  const inBay = (x, z, pad = 0) => rAt(x, z) < 2265 + pad && z < 5300;
  const inIsland = (x, z, pad = 0) => Math.hypot(x - 2500, z - 4910) < 320 + pad;

  // ---------------- town blocks ----------------
  const GX = [900, 1700, 2500, 3300], GZ = [700, 1450, 2200], RW = 120, SW = 40;
  const BLOCKS = {
    shops(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, '#FFF1F6');
      T.put('shop', b.x0 + 130, b.z0 + 110, Math.PI); T.put('shop', b.x1 - 130, b.z0 + 110, Math.PI);
      T.put('shop', b.x0 + 130, b.z1 - 110, 0); T.put('shop', b.x1 - 130, b.z1 - 110, 0);
      for (let k = 0; k < 6; k++) T.put(k % 2 ? 'cafeset' : 'beach_palm', b.x0 + 60 + k * 96, b.cz, T.rng() * 6);
      for (let k = 0; k < 5; k++) { T.put(T.pick({ scooter: 2, bike: 2, beach_surfboard: 3 }), b.x0 + 40 + k * 30, b.z1 - 12, Math.PI / 2); T.put(T.pick({ flowerpot: 2, beach_surfboard: 2, vending: 1 }), b.x1 - 40 - k * 30, b.z0 + 12); }
    },
    plaza(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.plaza);
      T.disc(b.cx, b.cz, 150, 2.4, COL.plazaRing, 40); T.disc(b.cx, b.cz, 130, 2.6, '#FFF6E8', 40); T.put('fountain', b.cx, b.cz);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; T.put('beach_palm', b.cx + Math.cos(a) * 200, b.cz + Math.sin(a) * 175, T.rng() * 6); }
      for (const [x, z, r] of [[b.x0 + 70, b.z0 + 60, 0], [b.x1 - 70, b.z0 + 60, 0], [b.x0 + 70, b.z1 - 60, Math.PI], [b.x1 - 70, b.z1 - 60, Math.PI]]) T.put(T.pick({ beach_icecreamhut: 1, beach_tikihut: 1 }), x, z, r);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; T.put('bench', b.cx + Math.cos(a) * 112, b.cz + Math.sin(a) * 112, -a + Math.PI / 2); }
      T.scatter({ person: 4, beach_gull: 3, flowerpot: 2, beachball: 1 }, { x0: b.x0 + 20, z0: b.z0 + 20, x1: b.x1 - 20, z1: b.z1 - 20 }, 26, { gap: 4 });
      T.walkLoop(ellipse(b.cx, b.cz, 140, 140, 16), 4);
    },
    condos(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, '#E8FFF4');
      T.put('beach_hotel', b.x0 + 140, b.z0 + 120, Math.PI); T.put('beach_hotel', b.x1 - 140, b.z0 + 120, Math.PI);
      const pz = b.z1 - 150; T.rect(b.x0 + 60, pz - 80, b.x1 - 60, pz + 80, 2.4, COL.poolEdge); T.rect(b.x0 + 90, pz - 55, b.x1 - 90, pz + 55, 2.8, COL.pool);
      for (let k = 0; k < 8; k++) T.put('beach_lounger', b.x0 + 80 + k * 62, b.z1 - 40, Math.PI / 2);
      for (let k = 0; k < 4; k++) T.put('parasol', b.x0 + 110 + k * 125, b.z1 - 30);
      T.put('beachball', b.cx - 60, pz); T.put('beachball', b.cx + 80, pz + 20);
      T.roamers('beach_swimmer', b.cx, pz, 40, 2, { speed: [8, 14] });
      for (const x of [b.x0 + 30, b.x1 - 30]) for (let k = 0; k < 3; k++) T.put('beach_palm', x, b.z0 + 290 + k * 80);
    },
    market(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, '#FFF4D6');
      for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
        const x = b.x0 + 90 + k * 140, z = b.z0 + 90 + r * 180;
        T.put(T.pick({ beach_tikihut: 3, beach_icecreamhut: 1, hotdog: 1, kiosk: 1 }), x, z, Math.PI * (r % 2));
      }
      T.scatter({ person: 6, cafeset: 2, bin: 1, beach_gull: 3, flowerpot: 1 }, { x0: b.x0 + 20, z0: b.z0 + 20, x1: b.x1 - 20, z1: b.z1 - 20 }, 34, { gap: 4 });
    },
    lot(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.lot);
      for (let row = 0; row < 3; row++) {
        const z = b.z0 + 90 + row * 185;
        for (let k = 0; k < 7; k++) {
          const x = b.x0 + 30 + k * 90; T.rect(x - 2, z - 55, x + 2, z + 55, 2.8, '#FFFFFF');
          if (k < 6 && T.rng.chance(0.8)) T.put(T.pick({ beach_convertible: 4, beach_surfvan: 3, car: 2, van: 1 }), x + 45, z, Math.PI / 2 + (T.rng.chance(0.5) ? Math.PI : 0));
        }
      }
      for (let k = 0; k < 4; k++) T.put('beach_palm', b.x0 + 75 + k * 150, b.z1 - 25);
    },
  };

  function townBlock(T, bx, bz, type) {
    const x0 = GX[bx] + RW / 2 + SW, x1 = GX[bx + 1] - RW / 2 - SW, z0 = GZ[bz] + RW / 2 + SW, z1 = GZ[bz + 1] - RW / 2 - SW;
    const b = { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
    T.rect(x0 - SW, z0 - SW, x1 + SW, z1 + SW, 1.0, COL.curb); T.rect(x0 - SW + 3, z0 - SW + 3, x1 + SW - 3, z1 + SW - 3, 1.6, COL.walk);
    T.walkLoop([[x0 - SW / 2, z0 - SW / 2], [x1 + SW / 2, z0 - SW / 2], [x1 + SW / 2, z1 + SW / 2], [x0 - SW / 2, z1 + SW / 2]], 3, { person: 1 }, { dogChance: 0.1 });
    BLOCKS[type](T, b);
    // sidewalk palms + street furniture
    for (let x = x0 + 30; x <= x1 - 20; x += 100) { T.put(((x - x0) / 100 | 0) % 2 ? 'lamp' : 'beach_palm', x, z0 - 22, 0); T.put(((x - x0) / 100 | 0) % 2 ? T.pick({ hydrant: 1, bin: 1, beach_surfboard: 1, none: 1 }) === 'none' ? 'bin' : 'hydrant' : 'beach_palm', x, z1 + 22, 0); }
    for (let z = z0 + 60; z <= z1 - 40; z += 120) { T.put(T.pick({ bin: 1, hydrant: 1, bench: 1, flowerpot: 2 }), x0 - 24, z, Math.PI / 2); T.put(T.pick({ bin: 1, newsbox: 1, flowerpot: 2, bench: 1 }), x1 + 24, z, -Math.PI / 2); }
  }

  function roads(T) {
    // Town grid.
    for (const x of GX) T.rect(x - RW / 2, GZ[0] - RW / 2, x + RW / 2, GZ[2] + RW / 2, 0.8, COL.road);
    for (const z of GZ) T.rect(GX[0] - RW / 2, z - RW / 2, GX[3] + RW / 2, z + RW / 2, 0.8, COL.road);
    for (const x of GX) for (let j = 0; j < GZ.length - 1; j++) for (let z = GZ[j] + 100; z < GZ[j + 1] - 120; z += 70) T.rect(x - 2, z, x + 2, z + 36, 1.4, COL.roadLine);
    for (const z of GZ) for (let j = 0; j < GX.length - 1; j++) for (let x = GX[j] + 100; x < GX[j + 1] - 120; x += 70) T.rect(x, z - 2, x + 36, z + 2, 1.4, COL.roadLine);
    for (const x of GX) for (const z of GZ) { const h = RW / 2; for (let s = -h + 16; s <= h - 16; s += 22) { T.rect(x + s - 6, z - h - 50, x + s + 6, z - h - 4, 1.4, '#FFFFFF'); T.rect(x + s - 6, z + h + 4, x + s + 6, z + h + 50, 1.4, '#FFFFFF'); T.rect(x - h - 50, z + s - 6, x - h - 4, z + s + 6, 1.4, '#FFFFFF'); T.rect(x + h + 4, z + s - 6, x + h + 50, z + s + 6, 1.4, '#FFFFFF'); } }
    // Connectors down to the promenade.
    for (const x of [1700, 3300]) { const z1 = BAY[1] - Math.sqrt(2870 ** 2 - (x - BAY[0]) ** 2); T.rect(x - RW / 2, GZ[2], x + RW / 2, z1, 0.8, COL.road); for (let z = GZ[2] + 100; z < z1 - 60; z += 70) T.rect(x - 2, z, x + 2, z + 36, 1.4, COL.roadLine); }
    // Promenade road along the bay with cul-de-sacs at both ends.
    path(T, arcPts(2870, -52, 52, 1), 140, 0.8, COL.road);
    for (let a = -51; a < 51; a += 1.6) { const p = pol(2870, a), q = pol(2870, a + 0.7); strip(T, p[0], p[1], q[0], q[1], 4, 1.4, '#FFD23F'); }
    for (const a of [-52, 52]) { const p = pol(2870, a); T.disc(p[0], p[1], 110, 0.8, COL.road, 24); T.disc(p[0], p[1], 40, 1.4, '#8FE36A', 16); }
    path(T, arcPts(2967, -52, 52, 1), 54, 1.0, COL.walk);
  }

  function bay(T) {
    bayLayer(T, 2265, 0.2, COL.wet); bayLayer(T, 2215, 0.45, COL.foam); bayLayer(T, 2190, 0.7, COL.shallow);
    bayLayer(T, 2060, 0.95, COL.water); bayLayer(T, 1840, 1.2, COL.deep); bayLayer(T, 1520, 1.45, COL.deeper);
    // Lighthouse islet.
    T.disc(2500, 4910, 330, 1.6, COL.shallow, 40); T.disc(2500, 4910, 300, 1.8, COL.foam, 40); T.disc(2500, 4910, 285, 2.0, COL.wet, 40);
  }

  function boardwalk(T) {
    path(T, arcPts(2620, -57, 57, 1), 120, 1.8, COL.plank);
    for (let a = -56.6; a <= 56.6; a += 0.75) { const p = pol(2563, a), q = pol(2677, a); strip(T, p[0], p[1], q[0], q[1], 3, 2.0, COL.plankLine); }
    path(T, arcPts(2560, -57, 57, 1), 6, 2.1, COL.plankEdge); path(T, arcPts(2680, -57, 57, 1), 6, 2.1, COL.plankEdge);
    path(T, arcPts(2745, -55, 55, 1), 110, 1.0, '#FFE3C6');
    // Stalls between boardwalk and road, facing the sea.
    for (let a = -53; a <= 53; a += 2.6) {
      if (Math.abs(a + 40) < 2.2) continue;
      const [x, z] = pol(2745, a), k = T.pick({ beach_icecreamhut: 3, beach_tikihut: 3, hotdog: 1, kiosk: 1, cafeset: 1 });
      T.put(k, x, z, -a * D2R);
      const [bx, bz] = pol(2745, a + 1.3); T.put(T.pick({ vending: 1, bin: 1, flowerpot: 2, lamp: 2, beach_surfboard: 2 }), bx, bz, -a * D2R);
    }
    // Benches looking out to sea and lamps along the rail.
    for (let a = -55; a <= 55; a += 3.2) { if (Math.abs(a + 40) < 2.5) continue; const [x, z] = pol(2578, a); T.put(a % 6.4 < 3.2 ? 'bench' : 'lamp', x, z, -a * D2R + (a % 6.4 < 3.2 ? Math.PI : Math.PI / 2)); }
    // Palms lining the sand edge.
    for (let a = -56; a <= 56; a += 2.4) { if (Math.abs(a + 40) < 2.5) continue; const [x, z] = pol(2530, a + T.rng.range(-0.4, 0.4)); T.put('beach_palm', x, z, T.rng() * 6); }
    const lane = [...arcPts(2600, -56, 56, 1), ...arcPts(2645, 56, -56, 1)];
    T.walkLoop(lane, 20, { person: 1 }, { dogChance: 0.12, lane: 0 });
  }

  function beachBand(T) {
    // Lifeguard towers, beach bars and changing huts.
    for (const a of [-48, -26, -9, 12, 31, 50]) { const [x, z] = pol(2330, a); T.put('lifeguard', x, z, -a * D2R); }
    for (const a of [-17, 22]) { const [x, z] = pol(2420, a); T.put('beach_cabana', x, z, -a * D2R); }
    for (const a0 of [-55, 44.5]) for (let i = 0; i < 6; i++) { const a = a0 + i * 0.9; const [x, z] = pol(2485, a); T.put('beach_hut', x, z, -a * D2R); }
    // Family spots: a parasol with towels, loungers and toys around it.
    for (let a = -56; a <= 56; a += 1.9) {
      if (Math.abs(a + 40) < 2.6) continue;
      const r = T.rng.range(2300, 2470), aa = a + T.rng.range(-0.5, 0.5), [x, z] = pol(r, aa);
      if (!T.free(x, z, 30)) continue;
      T.put('parasol', x, z, T.rng() * 6);
      const n = T.rng.int(2, 4);
      for (let k = 0; k < n; k++) {
        const ang = T.rng() * Math.PI * 2, d = T.rng.range(26, 44), px = x + Math.cos(ang) * d, pz = z + Math.sin(ang) * d;
        const kind = T.pick({ beach_sunbather: 4, beach_lounger: 3, beachball: 1, beach_sandcastle: 1 });
        if (T.free(px, pz, 12)) T.put(kind, px, pz, -aa * D2R + (kind === 'beach_lounger' ? Math.PI / 2 : 0));
      }
    }
    // Sandcastles and surfboards near the waterline.
    for (let a = -56; a <= 56; a += 1.3) {
      if (Math.abs(a + 40) < 2.6) continue;
      const [x, z] = pol(T.rng.range(2228, 2290), a + T.rng.range(-0.3, 0.3));
      const k = T.pick({ beach_sandcastle: 5, beach_surfboard: 3, beachball: 1, none: 2 });
      if (k !== 'none' && T.free(x, z, 10)) T.put(k, x, z, -a * D2R);
    }
    T.scatter({ beach_sunbather: 3, beach_surfboard: 2, beachball: 1, person: 2, beach_sandcastle: 2 }, { x0: 0, z0: 3700, x1: 5000, z1: 5250 }, 90, { gap: 6, avoid: (x, z) => { const r = rAt(x, z); return r < 2240 || r > 2520 || Math.abs(thAt(x, z) + 40) < 2.6; } });
    // Crabs and gulls on the wet sand, swimmers in the shallows, beachgoers strolling.
    for (let i = 0; i < 8; i++) { const a = -49 + i * 14, [x, z] = pol(2245, a); T.roamers('beach_crab', x, z, 45, 2, { speed: [10, 18] }); }
    for (let i = 0; i < 7; i++) { const a = -46 + i * 15, [x, z] = pol(2380, a); T.roamers('beach_gull', x, z, 70, 2, { speed: [14, 24] }); }
    for (let i = 0; i < 8; i++) { const a = -44 + i * 12.5, [x, z] = pol(2140, a); T.roamers('beach_swimmer', x, z, 45, 2, { speed: [8, 14] }); }
    for (let i = 0; i < 5; i++) { const a = -42 + i * 21, [x, z] = pol(2400, a); T.roamers('person', x, z, 90, 1, { speed: [20, 34] }); }
  }

  function pier(T) {
    // A long plank pier at 40° west with a Ferris wheel on its end platform.
    const A = -40, vx = Math.cos(A * D2R), vz = Math.sin(A * D2R);
    const P = (r, lat = 0) => { const [x, z] = pol(r, A); return [x + vx * lat, z + vz * lat]; };
    const cross = (r, half, y, col) => { const a = P(r, -half), b = P(r, half); strip(T, a[0], a[1], b[0], b[1], 3, y, col); };
    const p0 = P(2700), p1 = P(1960); strip(T, p0[0], p0[1], p1[0], p1[1], 110, 2.3, COL.plank);
    for (let r = 1975; r < 2700; r += 26) cross(r, 55, 2.5, COL.plankLine);
    const e0 = P(1975), e1 = P(1640); strip(T, e0[0], e0[1], e1[0], e1[1], 340, 2.3, COL.plank);
    for (let r = 1650; r < 1975; r += 26) cross(r, 170, 2.5, COL.plankLine);
    for (const lat of [-52, 52]) { const a = P(2250, lat), b = P(1985, lat); T.line('fence', a[0], a[1], b[0], b[1], 31, { chance: 0.85 }); }
    for (let r = 2050; r < 2560; r += 120) for (const lat of [-46, 46]) { const [x, z] = P(r, lat); T.put('lamp', x, z, -A * D2R + (lat > 0 ? 0 : Math.PI)); }
    const [fx, fz] = P(1805); T.put('beach_ferris', fx, fz, 0);
    for (const lat of [-140, 140]) { const [x, z] = P(1950, lat); T.put('bench', x, z, -A * D2R); }
    T.walkLoop([P(2650, -18), P(1990, -18), P(1990, 18), P(2650, 18)], 5, { person: 1 }, { lane: 0 });
    const g = P(2150); T.roamers('beach_gull', g[0], g[1], 25, 2, { speed: [10, 18] });
  }

  function hotels(T) {
    // [kind, depth, width] along the curve; gaps where the two connector roads pass.
    const slots = [];
    const put = (kind, a, d) => slots.push([kind, a, d]);
    put('beach_grand', 0, 400);
    let a = 4.6; for (const [k, w, d] of [['beach_hotel', 250, 210]]) { a += (w / 2 + 30) / 2990 / D2R; put(k, a, d); put(k, -a, d); }
    const side = [['beach_resort', 330, 300], ['beach_hotel', 250, 210], ['beach_resort', 330, 300], ['beach_hotel', 250, 210], ['beach_cottage', 150, 140]];
    for (const s of [-1, 1]) {
      let aa = 18.4;
      for (const [k, w, d] of side) { aa += (w / 2) / 2990 / D2R; put(k, s * aa, d); aa += (w / 2 + 45) / 2990 / D2R; }
    }
    for (const [k, ang, d] of slots) { const [x, z] = pol(2995 + d / 2, ang); T.put(k, x, z, -ang * D2R); }
    // Hotel fronts: flower pots and parked convertibles on the sidewalk.
    for (let ang = -51; ang <= 51; ang += 1.7) { if (Math.abs(Math.abs(ang) - 15) < 2.2) continue; const [x, z] = pol(2955, ang); T.put(T.pick({ flowerpot: 3, bin: 1, beach_palm: 2, bench: 1 }), x, z, -ang * D2R); }
  }

  function gardens(T) {
    // Resort gardens between the town and the hotel strip: lagoon pools, tennis, palms.
    const avoid = (x, z) => rAt(x, z) < 3420 || z < GZ[2] + RW / 2 + 20 || Math.abs(x - 1700) < 90 || Math.abs(x - 3300) < 90 || (x > 3700 && z < 3060);
    // central lagoon pool
    T.disc(2500, 2620, 260, 2.2, COL.poolEdge, 40, 1.5, 0.75); T.disc(2500, 2620, 236, 2.6, COL.pool, 40, 1.5, 0.75); T.disc(2500, 2620, 70, 2.8, '#FFE6A3', 20);
    T.put('beach_palm', 2490, 2615); T.put('beach_palm', 2525, 2635);
    T.roamers('beach_swimmer', 2350, 2620, 60, 2, { speed: [8, 14] }); T.roamers('beach_swimmer', 2660, 2620, 60, 2, { speed: [8, 14] });
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, x = 2500 + Math.cos(a) * 420, z = 2620 + Math.sin(a) * 215; if (!avoid(x, z) && T.free(x, z, 14)) T.put(i % 3 === 0 ? 'parasol' : 'beach_lounger', x, z, -a); }
    // tennis courts (west) and a palm grove (east)
    for (const cx of [1060, 1380]) { T.rect(cx - 110, 2330, cx + 110, 2700, 2.2, '#FFFFFF'); T.rect(cx - 100, 2340, cx + 100, 2690, 2.4, COL.court); T.rect(cx - 104, 2513, cx + 104, 2517, 2.6, '#FFFFFF'); T.line('fence', cx - 100, 2515, cx + 100, 2515, 31); T.put('beachball', cx + 30, 2420); }
    T.scatter({ beach_palm: 5, bush: 3, flowerpot: 2, bench: 1, beach_gull: 1, person: 2 }, { x0: 300, z0: 2280, x1: 3700, z1: 3900 }, 120, { gap: 10, avoid });
    T.walkLoop(ellipse(2500, 2620, 450, 240, 20), 5, { person: 1 }, { dogChance: 0.15 });
  }

  function marina(T) {
    const X0 = 3750, X1 = 5278, Z0 = 2000, Z1 = 3000;
    T.rect(X0 - 30, Z0 - 30, X1, Z1 + 30, 0.2, COL.quay); T.rect(X0, Z0, X1, Z1, 0.4, COL.water); T.rect(X0 + 40, Z0 + 50, X1, Z1 - 50, 0.5, COL.deep);
    // pontoons with moored boats
    for (const px of [3920, 4200, 4480, 4760]) {
      T.rect(px - 15, Z0 - 10, px + 15, Z0 + 440, 1.85, COL.plank);
      for (const s of [-1, 1]) {
        let z = Z0 + 20;
        while (z < Z0 + 420) {
          const k = T.pick({ beach_speedboat: 5, beach_sailboat: 3, beach_yacht: 1, none: 1 }), L = k === 'none' ? 80 : HC.CATALOG[k].w, W = k === 'none' ? 0 : HC.CATALOG[k].d;
          if (k !== 'none' && z + L <= Z0 + 470) T.put(k, px + s * (16 + W / 2 + 4), z + L / 2, -Math.PI / 2);
          z += L + 18;
        }
      }
    }
    T.put('beach_cruise', 4480, Z1 - 92, 0);
    loopFleet(T, { beach_speedboat: 2, beach_jetski: 2, beach_sailboat: 1 }, stadium(3900, 5160, 2590, 70), 3, 110, 0);
    // quay life
    for (let x = X0 + 30; x < X1 - 120; x += 60) { T.put(T.pick({ bollard: 3, bench: 1, lamp: 1, beach_gull: 2, bin: 1 }), x, Z1 + 18, 0); T.put(T.pick({ bollard: 3, person: 1, beach_gull: 2, flowerpot: 1 }), x + 30, Z0 - 18, 0); }
    T.walkLoop([[X0 - 15, Z0 - 15], [X1 - 60, Z0 - 15], [X1 - 60, Z0 - 40], [X0 - 15, Z0 - 40]], 4);
  }
  function stadium(x0, x1, zc, r) {
    const out = [];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI; out.push([x1 + Math.cos(a) * r, zc + Math.sin(a) * r]); }
    for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 + i / 8 * Math.PI; out.push([x0 + Math.cos(a) * r, zc + Math.sin(a) * r]); }
    return out;
  }

  function harbor(T) {
    // Harbour district north of the marina.
    T.rect(3420, 640, 5180, 1950, 0.3, '#FFF0DA');
    T.put('beach_grand', 4560, 1020, 0, { tint: 1 });
    T.put('beach_resort', 3700, 1060, 0, { tint: 2 });
    for (let i = 0; i < 6; i++) T.put('beach_cottage', 3900 + i * 220, 1760, 0);
    T.rect(3460, 1380, 5160, 1640, 0.5, COL.lot);
    for (let k = 0; k < 17; k++) { const x = 3500 + k * 98; T.rect(x - 2, 1400, x + 2, 1480, 0.7, '#FFFFFF'); if (k < 16 && T.rng.chance(0.75)) T.put(T.pick({ beach_surfvan: 3, beach_convertible: 3, van: 2, truck: 1, car: 2 }), x + 49, 1440, Math.PI / 2); }
    for (let k = 0; k < 8; k++) T.put(k % 3 === 2 ? 'container' : T.pick({ beach_tikihut: 2, kiosk: 1, hotdog: 1 }), 3560 + k * 200, 1575, 0);
    T.scatter({ person: 3, beach_gull: 3, cafeset: 2, flowerpot: 1, beach_palm: 2 }, { x0: 3440, z0: 660, x1: 5160, z1: 1940 }, 70, { gap: 6 });
    T.walkLoop([[3440, 1360], [5160, 1360], [5160, 1660], [3440, 1660]], 5, { person: 1 }, { dogChance: 0.2 });
  }

  function outerBeaches(T) {
    // North beach: dunes, a row of changing huts, sunbathers, surfers.
    for (let i = 0; i < 26; i++) T.disc(T.rng.range(-150, 5150), T.rng.range(-180, 480), T.rng.range(60, 140), 0.2, COL.dune, 14, 1.6, 0.7);
    for (let x = 300; x < 5000; x += 64) { if ((x / 64 | 0) % 9 === 0) continue; if (x > 2200 && x < 2800) continue; T.put('beach_hut', x, 470, 0); }
    for (let x = 150; x < 5000; x += 190) T.put('beach_palm', x + T.rng.range(-30, 30), 560 + T.rng.range(-15, 15), T.rng() * 6);
    for (const x of [600, 1900, 3200, 4500]) T.put('lifeguard', x, 120, Math.PI);
    T.put('beach_cabana', 2500, 360, 0);
    for (let x = -30; x < 5040; x += 95) {
      if (T.rng.chance(0.15)) continue;
      const z = T.rng.range(-10, 360); if (!T.free(x, z, 20)) continue; T.put('parasol', x, z, T.rng() * 6);
      for (let k = 0; k < 3; k++) { const a = T.rng() * Math.PI * 2, px = x + Math.cos(a) * T.rng.range(26, 44), pz = z + Math.sin(a) * T.rng.range(26, 44); if (T.free(px, pz, 12)) T.put(T.pick({ beach_sunbather: 4, beach_lounger: 3, beach_surfboard: 2, beach_sandcastle: 2, beachball: 1 }), px, pz, T.rng() * 6); }
    }
    T.scatter({ beach_sandcastle: 3, beach_surfboard: 2, beachball: 2, beach_sunbather: 2, person: 2, beach_gull: 1 }, { x0: -30, z0: -30, x1: 5040, z1: 420 }, 110, { gap: 8 });
    T.scatter({ beach_crab: 2, beach_sandcastle: 3, beach_surfboard: 2, beach_gull: 2 }, { x0: -220, z0: -230, x1: 5200, z1: -60 }, 24, { gap: 6 });
    for (let i = 0; i < 6; i++) T.roamers('beach_gull', 400 + i * 800, 200, 80, 1, { speed: [14, 24] });
    for (let i = 0; i < 5; i++) T.roamers('person', 600 + i * 900, 150, 120, 1, { speed: [20, 34] });
    // East shore above and below the marina.
    T.scatter({ parasol: 3, beach_sunbather: 4, beach_surfboard: 2, beach_sandcastle: 2, beach_lounger: 2, beach_palm: 2 }, { x0: 4900, z0: 640, x1: 5200, z1: 1950 }, 24, { gap: 6 });
    T.scatter({ parasol: 3, beach_sunbather: 4, beach_surfboard: 2, beach_sandcastle: 2, beach_palm: 2, beach_hut: 1 }, { x0: 4300, z0: 3060, x1: 5050, z1: 5050 }, 70, { gap: 8, avoid: (x, z) => rAt(x, z) < 3420 || inBay(x, z, 10) });
    // West shore + beach cottages + palm park.
    T.scatter({ parasol: 3, beach_sunbather: 4, beach_surfboard: 2, beach_sandcastle: 2, beach_lounger: 2 }, { x0: -60, z0: 640, x1: 110, z1: 4300 }, 55, { gap: 6, avoid: (x, z) => rAt(x, z) < 3420 });
    for (let z = 800; z < 3700; z += 230) T.put('beach_cottage', 250, z, -Math.PI / 2);
    T.rect(380, 660, 820, 3800, 0.4, COL.lawn);
    path(T, [[600, 700], [600, 3700]], 50, 0.6, COL.path);
    T.scatter({ beach_palm: 6, bush: 3, flowerpot: 2, bench: 1, person: 1, beach_gull: 1, bike: 1 }, { x0: 400, z0: 680, x1: 800, z1: 3780 }, 110, { gap: 8, avoid: (x, z) => Math.abs(x - 600) < 30 || rAt(x, z) < 3420 });
    T.walkLoop([[600, 720], [600, 3680], [580, 3680], [580, 720]], 6, { person: 1 }, { dogChance: 0.25, lane: 0 });
    // SW corner dunes.
    T.scatter({ parasol: 3, beach_sunbather: 4, beach_surfboard: 2, beach_sandcastle: 2, beach_palm: 3, beach_hut: 1 }, { x0: -40, z0: 4300, x1: 700, z1: 5040 }, 50, { gap: 8, avoid: (x, z) => rAt(x, z) < 3420 && rAt(x, z) > 2240 || inBay(x, z, 10) });
  }

  function boats(T) {
    loopFleet(T, { beach_sailboat: 3, beach_speedboat: 2, beach_yacht: 1 }, ellipse(2500, 4905, 590, 300, 30), 5, 70, 0);
    loopFleet(T, { beach_jetski: 1 }, arcTrack(2000, -28, 28, 40), 3, 150, 0);
    loopFleet(T, { beach_speedboat: 1, beach_jetski: 1 }, arcTrack(1980, 33, 52, 35), 3, 120, 0);
    loopFleet(T, { beach_sailboat: 1, beach_jetski: 1 }, arcTrack(1980, -53, -46, 35), 2, 100, 0);
  }

  function traffic(T) {
    const zA = BAY[1] - Math.sqrt(2870 ** 2 - 800 ** 2), a0 = -Math.asin(800 / 2870) / D2R;
    const loopA = [...arcPts(2870, a0, -a0, 2), [3300, zA], [3300, GZ[2]], [1700, GZ[2]], [1700, zA]];
    const cars = { beach_convertible: 5, beach_surfvan: 3, car: 2, taxi: 1 };
    loopFleet(T, Object.assign({ bus: 1 }, cars), loopA, 7, 125, 30);
    loopFleet(T, Object.assign({ bus: 1 }, cars), loopA.slice().reverse(), 7, 125, 30);
    const G1 = [[GX[0], GZ[0]], [GX[3], GZ[0]], [GX[3], GZ[1]], [GX[0], GZ[1]]];
    loopFleet(T, cars, G1, 5, 120, 30); loopFleet(T, cars, G1.slice().reverse(), 5, 120, 30);
    const G2 = [[GX[0], GZ[1]], [GX[2], GZ[1]], [GX[2], GZ[2]], [GX[0], GZ[2]]];
    loopFleet(T, cars, G2, 2, 115, 30);
    loopFleet(T, cars, arcTrack(2870, -51, -19, 32), 3, 120, 0);
    loopFleet(T, cars, arcTrack(2870, 19, 51, 32), 3, 120, 0);
  }

  HC.Levels.add({
    id: 'beach', num: 3, name: 'Sunny Shores', tagline: 'Crescent bay · boardwalk, boats & a lighthouse', icon: '🏖️', colors: ['#2EE6D6', '#FF8C6B'],
    theme: { sky: '#86E3FF', sea: { show: true, deep: '#0F9FD6', shallow: '#2FD4E8', foam: 1 }, skirt: '#F2C77E', hemiSky: '#EAFBFF', hemiGround: '#FFC9A6', hemi: 1.6, sun: '#FFF3D2', sunI: 2.45 },
    mods: { botSkill: -0.08 },
    milestones: [['beach_convertible', '🚗 Convertibles'], ['beach_sailboat', '⛵ Sailboats'], ['beach_yacht', '🛥️ Yachts'], ['beach_cabana', '🍹 Beach bars'], ['beach_ferris', '🎡 Ferris wheel'], ['beach_cruise', '🚢 Cruise ship'], ['beach_cottage', '🏠 Beach houses'], ['beach_hotel', '🏨 Hotels'], ['beach_resort', '🏝️ Resorts'], ['beach_grand', '🏰 Grand hotels'], ['beach_lighthouse', '🌅 THE LIGHTHOUSE']],
    kinds,
    generate(T) {
      T.island({ ground: COL.sand, edge: COL.sandEdge });
      bay(T); roads(T); boardwalk(T);
      // Lighthouse first so nothing scatters onto its islet.
      T.put('beach_lighthouse', 2500, 4910, 0);
      hotels(T); pier(T);
      const plan = [['shops', 'plaza', 'condos'], ['condos', 'market', 'lot']];
      for (let bz = 0; bz < 2; bz++) for (let bx = 0; bx < 3; bx++) townBlock(T, bx, bz, plan[bz][bx]);
      marina(T); harbor(T); gardens(T); beachBand(T); outerBeaches(T);
      boats(T); traffic(T);
      // Spawns: open sand and plazas next to lots of little snacks.
      for (const a of [-45, -31, -4, 6, 27, 41]) { const [x, z] = pol(2400, a); T.spawnAt(x, z); }
      for (const [x, z] of [[1300, 200], [2500, 230], [3900, 200], [GX[1], GZ[1]], [GX[2], GZ[0]], [GX[3], GZ[1]], [GX[0], GZ[2]], [600, 2600], [4300, 1900], [4800, 3200]]) T.spawnAt(x, z);
    },
  });
})();
