// Level 6 — Frostville: a snowy mountain village around a big frozen lake. Skaters and penguins
// on the ice, a lakeside promenade, winding lanes of log cabins and chalets, a Christmas market,
// a plowed road loop with snow plows, a ski slope with a grand lodge, an igloo camp, pine forests,
// and a sparkling ice palace on the north shore. The ground is slippery (grip 0.3).
(function () {
  const PI = Math.PI, D = PI / 180;
  const C = {
    snow: '#FFFFFF', snow2: '#EEF4FC', ice: '#A6E6FF', ice2: '#D4F4FF', ice3: '#7CD3F7', deep: '#4FB3E8',
    red: '#FF4757', red2: '#D7263D', gold: '#FFC83D', green: '#2E9D5B', green2: '#1F7A47', wood: '#A0643C', wood2: '#7A4A2E',
    stone: '#9AA3B8', dark: '#3A3F58', tire: '#2B2D42', glass: '#BDEBFF', warm: '#FFD98A', skin: '#FFD3B0', smoke: '#F2F4F8',
  };
  const JACKETS = ['#FF4757', '#1E90FF', '#2ED573', '#FFC312', '#A55EEA', '#FF6BB5', '#22D3EE', '#FF7F50'];

  const torus = (g, x, y, z, R, r, rs, ts, color, o = {}) => g._add(new THREE.TorusGeometry(R, r, rs, ts), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, 1, 1, 1, color, o.tint, o.shade);
  const octa = (g, x, y, z, r, color, o = {}) => g._add(new THREE.OctahedronGeometry(r, 0), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, o.sx || 1, o.sy || 1, o.sz || 1, color, o.tint, o.shade);
  const beamXY = (g, x0, y0, x1, y1, z, t, d, color, o = {}) => g.box((x0 + x1) / 2, (y0 + y1) / 2, z, Math.hypot(x1 - x0, y1 - y0), t, d, color, Object.assign({ rz: Math.atan2(y1 - y0, x1 - x0) }, o));
  const smoke = (g, x, y, z) => { g.ball(x, y + 6, z, 7, C.smoke); g.ball(x + 5, y + 18, z - 2, 9, '#E4E8F0'); g.ball(x + 12, y + 32, z - 4, 11, '#F7F8FB'); };
  // A pitched roof in a color with a snow blanket over its upper part (keeps colored eaves visible).
  const snowRoof = (g, x, base, z, w, d, h, color, o = {}) => {
    g.gable(x, base, z, w, d, h, color, o);
    g.gable(x, base + h * 0.42 + 1.8, z, w - 4, d * 0.58, h * 0.58, C.snow, o);
  };
  // A snow-capped pine tier: green cone + a slightly wider white cone on its tip.
  // Cone without its hidden base cap (half the triangles of g.cone) for the many pine tiers.
  const ocone = (g, x, base, z, r, h, seg, color, o = {}) => g._add(new THREE.ConeGeometry(r, h, seg, 1, true), x, base + h / 2, z, 0, o.ry || 0, 0, 1, 1, 1, color, o.tint, o.shade);
  const pineTier = (g, y, r, h, color, tint) => { ocone(g, 0, y, 0, r, h, 7, color, { tint }); ocone(g, 0, y + h * 0.48, 0, r * 0.58, h * 0.52, 7, C.snow); };

  function kinds(def) {
    // ---------- tiny ----------
    def('frost_skater', { w: 12, d: 10, h: 39, points: 1, mass: 70, tints: JACKETS, mover: 'walk',
      build(g) { // faces +x
        for (const z of [-2.4, 2.4]) g.limb(z > 0 ? 0.8 : -0.8, 0, 14, () => { g.block(0, 2, z, 3.4, 12, 3.4, '#3B4A6B'); g.block(0.5, 0, z, 9, 1, 1, '#C9D2E3'); g.block(0.5, 1, z, 6, 2.5, 3.6, C.dark); });
        g.block(0, 13, 0, 6.5, 13, 9, '#FFF', { tint: true }); g.block(0, 16, -7, 3, 3, 8, '#FFF', { tint: true }); g.block(0, 16, 7, 3, 3, 8, '#FFF', { tint: true });
        g.block(0.5, 25, 0, 7, 3, 9.6, C.snow); g.block(3.6, 20, 2.4, 1, 7, 2.4, C.red);
        g.ball(0, 30, 0, 4.8, C.skin, { detail: 1 }); g.ball(-0.4, 32.5, 0, 5, C.red, { sy: 0.7 }); g.block(-0.6, 36, 0, 3, 3, 3, C.snow);
      } });
    def('frost_skier', { w: 34, d: 12, h: 38, points: 1, mass: 75, tints: JACKETS, mover: 'walk',
      build(g) { // faces +x
        for (const z of [-3, 3]) { g.block(0, 0, z, 34, 1, 3, C.red2); g.block(15.5, 0.5, z, 4, 1, 3, C.red2, { rz: 0.4 }); g.block(-1, 1, z, 4, 11, 3.6, '#2B2D42'); }
        g.block(1, 11, 0, 7, 13, 9, '#FFF', { tint: true, rz: -0.2 }); g.ball(2.5, 28, 0, 4.6, C.skin, { detail: 1 }); g.block(4.4, 28.5, 0, 2, 2.4, 7, '#FFB400'); g.ball(2.2, 30.5, 0, 4.8, '#FFF', { tint: true, sy: 0.65 });
        for (const z of [-6.5, 6.5]) g.block(-3, 2, z, 1, 22, 1, '#7A8099', { rz: 0.35 });
      } });
    def('frost_penguin', { w: 10, d: 9, h: 19, points: 1, mass: 20, mover: 'walk',
      build(g) { // faces +x
        g.ball(0, 8, 0, 5, '#2B2D42', { sy: 1.4, sx: 0.9 }); g.ball(1.8, 7.5, 0, 3.8, C.snow, { sy: 1.3, sx: 0.7 });
        g.ball(0, 15.5, 0, 3.6, '#2B2D42'); g.block(3.8, 15, 0, 2.6, 1.2, 1.6, '#FF9F1C'); g.ball(2.6, 16.5, -1.5, 0.8, C.snow); g.ball(2.6, 16.5, 1.5, 0.8, C.snow);
        g.block(0, 6, -4.6, 2, 6, 1, '#2B2D42', { rx: 0.3 }); g.block(0, 6, 4.6, 2, 6, 1, '#2B2D42', { rx: -0.3 });
        g.limb(-0.7, 0, 3, () => g.block(1.5, 0, -1.6, 3, 1, 2, '#FF9F1C')); g.limb(0.7, 0, 3, () => g.block(1.5, 0, 1.6, 3, 1, 2, '#FF9F1C'));
      } });
    def('frost_snowman', { w: 18, d: 18, h: 44, points: 2, mass: 60, tints: ['#FF4757', '#1E90FF', '#2ED573', '#FFC312', '#A55EEA'],
      build(g) {
        g.ball(0, 8.5, 0, 9, C.snow, { detail: 1, sy: 0.95 }); g.ball(0, 21, 0, 7, C.snow); g.ball(0, 31, 0, 5.4, C.snow, { ry: 0.5 });
        g.cyl(0, 25.5, 0, 5.4, 6, 2.6, 8, '#FFF', { tint: true }); g.block(3, 18, 5.6, 2.4, 9, 1, '#FFF', { tint: true });
        g.cone(0, 28, 6.5, 1.4, 6, 5, '#FF8C1A', { rx: PI / 2 }); g.block(-2, 32.5, 4.8, 1.4, 1.4, 1, C.tire); g.block(2, 32.5, 4.8, 1.4, 1.4, 1, C.tire);
        for (const y of [17, 21]) g.block(0, y - 0.7, 6.6, 1.6, 1.6, 1, C.tire);
        g.cyl(0, 35.5, 0, 5.8, 5.8, 1, 6, C.tire); g.cyl(0, 36.5, 0, 3.8, 3.8, 7, 6, C.tire);
        g.block(-8, 22, 0, 8, 1, 1, '#7A4A2E', { rz: 0.5 }); g.block(8, 22, 0, 8, 1, 1, '#7A4A2E', { rz: -0.5 });
      } });
    def('frost_gift', { w: 14, d: 14, h: 15, points: 1, mass: 4, tints: ['#FF4757', '#1E90FF', '#2ED573', '#FFC312', '#A55EEA', '#FF6BB5'],
      build(g) {
        g.block(0, 0, 0, 13, 11, 13, '#FFF', { tint: true }); g.block(0, 0, 0, 13.4, 11.3, 3, C.gold); g.block(0, 0, 0, 3, 11.3, 13.4, C.gold);
        g.ball(-2.4, 12.6, 0, 2.6, C.gold, { sx: 1.2, sy: 0.7 }); g.ball(2.4, 12.6, 0, 2.6, C.gold, { sx: 1.2, sy: 0.7 });
      } });
    // ---------- small ----------
    def('frost_reindeer', { w: 34, d: 12, h: 38, points: 2, mass: 120, mover: 'walk',
      build(g) { // faces +x
        g.block(-2, 12, 0, 22, 10, 10, '#9A6343'); g.block(-13, 15, 0, 3, 4, 4, C.snow);
        for (const [x, z] of [[-9, -3], [-9, 3], [6, -3], [6, 3]]) g.limb(x * z > 0 ? 1 : -1, x, 13, () => g.block(x, 0, z, 2.6, 13, 2.6, '#6E4A33'));
        g.block(9, 20, 0, 5, 10, 6, '#9A6343', { rz: -0.4 }); g.block(14, 26, 0, 9, 6, 6, '#9A6343'); g.ball(18.8, 26.6, 0, 2.2, C.red);
        for (const z of [-2.5, 2.5]) { g.block(12, 31, z, 1.4, 7, 1.4, '#E9D4B0', { rx: z * 0.12 }); g.block(10, 35, z * 1.6, 6, 1.4, 1.4, '#E9D4B0', { rz: 0.4 }); }
        g.ball(15, 29.5, -2.5, 0.8, C.tire); g.ball(15, 29.5, 2.5, 0.8, C.tire); g.block(8, 18, 0, 2, 3, 10.4, C.red);
      } });
    def('frost_sled', { w: 32, d: 16, h: 24, points: 2, mass: 30, tints: JACKETS,
      build(g) {
        for (const z of [-6, 6]) { g.block(-1, 0, z, 26, 2, 2, C.red); g.block(13, 1, z, 6, 2, 2, C.red, { rz: 0.9 }); g.block(-6, 2, z, 2, 4, 2, C.red); g.block(6, 2, z, 2, 4, 2, C.red); }
        for (let i = 0; i < 4; i++) g.block(-9 + i * 6, 6, 0, 5, 1.6, 16, i % 2 ? '#C98A55' : '#B07A48');
        g.block(-3, 7.6, 0, 8, 7, 8, '#FFF', { tint: true }); g.ball(-3, 19, 0, 4.4, C.skin); g.ball(-3.4, 21, 0, 4.5, '#FFF', { tint: true, sy: 0.7 }); g.ball(-3.6, 25, 0, 1.6, C.snow);
        g.block(2, 9, 0, 6, 3, 7, '#3B4A6B');
      } });
    def('frost_lift', { w: 72, d: 18, h: 190, points: 2, mass: 900,
      build(g) {
        g.block(0, 0, 0, 14, 6, 14, C.stone); g.cyl(0, 6, 0, 4, 5, 166, 8, '#5A6378'); g.block(0, 168, 0, 72, 5, 6, '#5A6378');
        for (const x of [-32, 32]) { g.cyl(x, 172, 0, 5, 5, 4, 10, C.dark, { rx: PI / 2 }); g.block(x, 110, 0, 1.2, 60, 1.2, '#7A8099'); g.block(x, 104, 0, 14, 2, 12, C.red); g.block(x, 106, -5.5, 14, 10, 1.5, C.red); g.block(x, 112, 0, 16, 1, 1, '#7A8099'); }
        g.ball(-28, 114, 1, 4, C.skin); g.block(-28, 106, 1, 7, 7, 7, JACKETS[1]); g.ball(-28.4, 116, 1, 4.1, JACKETS[0], { sy: 0.6 });
      } });
    def('frost_xtree', { w: 27, d: 27, h: 104, points: 3, mass: 200,
      build(g) {
        g.cyl(0, 0, 0, 7, 8, 10, 8, C.red); g.cyl(0, 10, 0, 3, 3, 8, 6, C.wood);
        ocone(g, 0, 16, 0, 14, 34, 8, C.green); ocone(g, 0, 38, 0, 11.5, 30, 8, '#33AA62'); ocone(g, 0, 58, 0, 8.5, 30, 8, C.green);
        g.glowing(() => { for (let i = 0; i < 16; i++) { const t = i / 16, a = t * 6 * PI, y = 22 + t * 62, r = 13 - t * 10; g.block(Math.cos(a) * r, y, Math.sin(a) * r, 3, 3, 3, i % 2 ? C.snow : C.red); } });
        octa(g, 0, 94, 0, 6, C.gold, { sy: 1.3 }); g.block(-8, 0, 8, 7, 7, 7, '#1E90FF'); g.block(8, 0, -7, 6, 9, 6, '#FFC312');
      } });
    def('frost_pine', { w: 26, d: 26, h: 170, points: 5, mass: 700, tints: ['#1F8A50', '#2E9D5B', '#17734A', '#2A8F66'],
      build(g) {
        g.cyl(0, 0, 0, 4, 5, 30, 6, '#8D5A3B');
        pineTier(g, 22, 17, 56, '#FFF', true); pineTier(g, 62, 14, 52, '#FFF', true); pineTier(g, 100, 10.5, 52, '#FFF', true);
        g.ball(0, 2, 0, 12, C.snow, { sy: 0.3 });
      } });
    def('frost_snowmobile', { w: 48, d: 24, h: 30, points: 3, mass: 300, tints: JACKETS, mover: 'walk',
      build(g) { // faces +x
        for (const z of [-9, 9]) { g.block(14, 0, z, 18, 1.5, 4, '#2B2D42'); g.block(22, 1, z, 5, 1.5, 4, '#2B2D42', { rz: 0.6 }); g.block(13, 1.5, z, 2, 6, 2, '#5A6378'); }
        g.block(-10, 0, 0, 24, 8, 16, '#2B2D42'); g.block(4, 6, 0, 30, 9, 18, '#FFF', { tint: true }); g.block(14, 6, 0, 16, 6, 16, '#FFF', { tint: true, rz: -0.3 });
        g.block(-8, 10, 0, 18, 5, 12, C.tire); g.block(10, 15, 0, 2, 9, 14, C.glass, { rz: 0.5 }); g.block(6, 16, 0, 2, 2, 18, '#5A6378');
        g.block(-4, 15, 0, 7, 9, 9, JACKETS[3]); g.ball(-4, 27, 0, 4.4, C.skin); g.ball(-4, 28.4, 0, 4.7, C.tire, { sy: 0.75 }); g.block(-0.2, 27.6, 0, 1.6, 2, 7, '#7FD3FF');
      } });
    def('frost_cocoa', { w: 52, d: 34, h: 66, points: 3, mass: 300,
      build(g) {
        g.block(0, 0, 0, 50, 26, 32, C.wood); g.block(0, 26, 0, 52, 3, 34, C.snow); g.panel('z+', 0, 15, 16.3, 36, 10, '#F7E3C8');
        for (const [x, z] of [[-23, 14], [23, 14], [-23, -14], [23, -14]]) g.block(x, 29, z, 2.4, 12, 2.4, C.wood2);
        for (let i = 0; i < 6; i++) g.block(-21.7 + i * 8.7, 41, 0, 8.7, 3, 36, i % 2 ? C.snow : C.red, { rx: 0.0 });
        g.cyl(0, 44, 0, 9, 8, 15, 10, C.red); g.cyl(0, 52, 0, 9.3, 9.3, 3, 10, C.snow); torus(g, 9.5, 51, 0, 4, 1.4, 4, 8, C.red);
        g.ball(0, 60, 0, 8.2, '#FFF9F0', { sy: 0.6 }); g.block(-3, 61, 2, 3, 3, 3, '#FFD1E0'); g.block(3, 62, -1, 3, 3, 3, C.snow);
        g.block(-14, 29, 10, 6, 6, 6, '#F2E6D8'); g.block(12, 29, 10, 6, 6, 6, '#F2E6D8');
      } });
    // ---------- car-size ----------
    def('frost_stall', { w: 80, d: 46, h: 72, points: 5, mass: 900, tints: ['#FF4757', '#2ED573', '#1E90FF', '#FFC312', '#A55EEA'],
      build(g) {
        g.block(0, 0, -4, 76, 40, 36, C.wood); g.block(0, 20, 17, 74, 3, 12, '#C98A55'); g.panel('z+', 0, 32, 14.3, 68, 14, '#5A3A26');
        for (let i = 0; i < 6; i++) g.ball(-27 + i * 11, 26, 18, 3.6, ['#FF4757', '#FFC312', '#2ED573', '#1E90FF', '#FF6BB5', '#FF9F1C'][i]);
        g.block(-37, 0, 18, 3, 44, 3, C.wood2); g.block(37, 0, 18, 3, 44, 3, C.wood2);
        snowRoof(g, 0, 44, 0, 82, 46, 24, '#FFF', { tint: true });
        g.glowing(() => { for (let i = 0; i < 9; i++) g.block(-36 + i * 9, 43, 23.2, 2.4, 2.4, 1.4, i % 3 === 0 ? C.red : C.warm); });
        torus(g, 0, 54, 23.4, 5.5, 1.8, 4, 10, C.green);
      } });
    def('frost_fishhut', { w: 56, d: 46, h: 62, points: 5, mass: 700, tints: ['#FF4757', '#1E90FF', '#FFC312', '#2ED573'],
      build(g) {
        for (const z of [-15, 15]) g.block(0, 0, z, 50, 3, 4, '#7A8099');
        g.block(0, 3, 0, 44, 30, 34, '#FFF', { tint: true }); g.panel('z+', -9, 16, 17.3, 12, 22, '#5A3A26'); g.panel('z+', 10, 22, 17.3, 10, 9, C.warm);
        snowRoof(g, 0, 33, 0, 50, 40, 16, C.wood2); g.block(14, 40, -8, 6, 16, 6, C.stone); smoke(g, 14, 56, -8);
        g.cyl(-19, 0.5, 19, 6, 6, 0.6, 10, '#2F6FA8');
      } });
    def('frost_sleigh', { w: 82, d: 40, h: 54, points: 5, mass: 500,
      build(g) {
        for (const z of [-17, 17]) { g.block(-4, 0, z, 64, 3, 3, C.gold); g.block(30, 3, z, 3, 12, 3, C.gold, { rz: -0.5 }); torus(g, 34, 13, z, 6, 1.6, 4, 10, C.gold); g.block(-20, 3, z, 3, 8, 3, C.gold); g.block(10, 3, z, 3, 8, 3, C.gold); }
        g.block(-6, 11, 0, 52, 20, 34, C.red); g.block(-26, 31, 0, 12, 14, 34, C.red); g.block(16, 11, 0, 10, 12, 34, C.red, { rz: -0.5 });
        g.block(-6, 31, 0, 30, 2, 30, C.gold); g.ball(-10, 38, 0, 14, '#B0703F', { sy: 0.8 });
        g.block(4, 31, 8, 10, 10, 10, '#1E90FF'); g.block(6, 31, -9, 9, 13, 9, '#2ED573'); g.block(-22, 46, 8, 8, 8, 8, '#FFC312');
      } });
    // ---------- bus-size ----------
    def('frost_igloo', { w: 90, d: 82, h: 46, points: 14, mass: 20000,
      build(g) {
        g.ball(0, 0, -4, 40, '#F4FAFF', { detail: 1, sy: 1.1 });
        for (const [y, r] of [[12, 39.2], [26, 34.6], [37, 25.4]]) g.cyl(0, y, -4, r, r, 1.6, 16, '#CFE3F7');
        g.cyl(0, 0, 32, 16, 16, 18, 10, '#F4FAFF', { rx: PI / 2 }); g.panel('z+', 0, 8, 41.3, 18, 15, '#3A4A6B');
        g.cyl(0, 0, -4, 44, 44, 2, 16, '#E3EEF9'); g.glowing(() => g.ball(0, 6, 40.6, 4, C.warm, { sz: 0.2 }));
      } });
    def('frost_plow', { w: 152, d: 56, h: 72, points: 12, mass: 9000, tints: ['#FF9F1C', '#FFC312', '#FF6B3D'], mover: 'walk',
      build(g) { // faces +x
        for (const x of [-48, -18, 34]) for (const z of [-24, 24]) g.cyl(x, 0, z, 10, 10, 7, 12, C.tire, { rx: PI / 2 });
        g.block(-28, 10, 0, 84, 36, 52, '#FFF', { tint: true }); g.block(-28, 46, 0, 80, 6, 48, C.snow);
        g.block(32, 6, 0, 40, 50, 50, '#FFF', { tint: true }); g.panel('x+', 52.3, 40, 0, 40, 14, C.glass); g.panel('z+', 34, 40, 25.3, 22, 12, C.glass); g.panel('z-', 34, 40, -25.3, 22, 12, C.glass);
        g.glowing(() => { g.block(32, 56, -14, 10, 5, 8, '#FF9F1C'); g.block(32, 56, 14, 10, 5, 8, '#FF9F1C'); });
        g.block(66, 2, 0, 8, 22, 56, '#FFC312', { ry: 0.25 }); g.block(66, 22, 0, 8, 4, 56, C.dark, { ry: 0.25 }); g.block(58, 8, 0, 10, 6, 10, C.dark);
        g.ball(66, 2, -14, 8, C.snow, { sy: 0.6 }); g.ball(70, 2, 12, 9, C.snow, { sy: 0.6 });
      } });
    // ---------- buildings ----------
    def('frost_cabin', { w: 150, d: 130, h: 160, points: 20, mass: 40000, tints: ['#D7263D', '#2E9D5B', '#1E6FD9', '#8E44AD', '#E07A1F'],
      build(g) {
        g.block(0, 0, 0, 156, 8, 136, C.stone); g.block(0, 8, 0, 146, 72, 126, C.wood);
        for (let r = 0; r < 5; r++) { const y = 14 + r * 14; for (const f of ['z+', 'z-']) g.panel(f, 0, y, f === 'z+' ? 63.3 : -63.3, 146, 2.4, C.wood2); for (const f of ['x+', 'x-']) g.panel(f, f === 'x+' ? 73.3 : -73.3, y, 0, 126, 2.4, C.wood2); }
        for (const [x, z] of [[-73, -63], [73, -63], [-73, 63], [73, 63]]) g.block(x, 8, z, 9, 74, 9, '#C98A55');
        snowRoof(g, 0, 80, 0, 168, 150, 58, '#FFF', { tint: true });
        g.block(42, 100, -20, 18, 50, 18, C.stone); smoke(g, 42, 150, -20);
        g.panel('z+', -28, 32, 63.4, 24, 44, '#5A3A26');
        g.glowing(() => { for (const x of [22, 50]) g.panel('z+', x, 46, 63.4, 18, 18, C.warm); for (const z of [-30, 30]) { g.panel('x+', 73.4, 46, z, 18, 18, C.warm); g.panel('x-', -73.4, 46, z, 18, 18, C.warm); } g.panel('z-', 0, 46, -63.4, 30, 18, C.warm); });
        for (const x of [22, 50]) { g.panel('z+', x - 12, 46, 63.5, 5, 20, C.green2); g.panel('z+', x + 12, 46, 63.5, 5, 20, C.green2); }
        torus(g, -28, 62, 64.6, 7, 2.2, 4, 10, C.green); g.ball(-28, 56, 65, 2, C.red);
        for (const x of [-60, -20, 20, 60]) g.cone(x, 70, 70, 2.4, 9, 5, '#DDF4FF', { rx: PI });
      } });
    def('frost_chalet', { w: 190, d: 170, h: 200, points: 26, mass: 60000, tints: ['#FF6B6B', '#FFD166', '#4FB8FF', '#7BD389', '#FF9F68', '#C39BFF'],
      build(g) {
        g.block(0, 0, 0, 190, 50, 170, '#B8BFCF'); g.block(0, 50, 0, 180, 70, 160, '#FFF', { tint: true });
        g.block(0, 72, 88, 150, 4, 22, C.wood2); for (let i = 0; i < 11; i++) g.block(-70 + i * 14, 76, 98, 3, 14, 3, C.wood2); g.block(0, 90, 98, 150, 3, 3, C.wood2);
        g.gable(0, 120, 0, 214, 196, 66, C.wood2, { ry: PI / 2 }); g.gable(0, 120 + 66 * 0.42 + 1.8, 0, 210, 196 * 0.58, 66 * 0.58, C.snow, { ry: PI / 2 });
        g.block(-60, 140, 0, 20, 50, 20, '#B8BFCF'); smoke(g, -60, 190, 0);
        g.panel('z+', 0, 25, 85.3, 30, 44, '#5A3A26');
        g.glowing(() => { for (const x of [-55, 55]) g.panel('z+', x, 30, 85.3, 26, 22, C.warm); for (const x of [-50, 0, 50]) g.panel('z+', x, 100, 80.3, 24, 26, C.warm); g.windows(0, 0, 180, 160, 58, 112, 1, 3, C.warm, { fill: 0.4 }); });
        for (const x of [-50, 0, 50]) { g.block(x, 86, 82, 28, 5, 6, C.wood2); g.ball(x - 7, 92, 84, 3.2, C.red); g.ball(x + 7, 92, 84, 3.2, '#FF6BB5'); }
        g.panel('z+', 0, 160, 98.4, 0.01, 0.01, C.snow); torus(g, 0, 150, 92, 12, 3, 4, 12, C.green); g.block(0, 136, 93, 6, 5, 2, C.red);
      } });
    def('frost_bigtree', { hs: 0.8, w: 140, d: 140, h: 450, points: 24, mass: 30000,
      build(g) {
        g.cyl(0, 0, 0, 70, 70, 10, 16, C.snow); g.cyl(0, 10, 0, 12, 14, 40, 8, C.wood);
        const T = [[40, 66, 110], [120, 54, 100], [195, 42, 95], [270, 30, 90], [335, 19, 80]];
        for (const [y, r, h] of T) { ocone(g, 0, y, 0, r, h, 10, '#1F8A50'); ocone(g, 0, y + h * 0.5, 0, r * 0.56, h * 0.5, 10, C.snow); }
        const OC = [C.red, C.gold, '#1E90FF', '#FF6BB5', C.red, C.gold];
        g.glowing(() => {
          for (let i = 0; i < 18; i++) { const t = i / 18, a = i * 2.3, y = 70 + t * 290, r = 58 - t * 44; g.ball(Math.cos(a) * r, y, Math.sin(a) * r, 6, OC[i % 6]); }
          for (let i = 0; i < 24; i++) { const t = i / 24, a = t * 8 * PI, y = 60 + t * 320, r = 60 - t * 46; g.block(Math.cos(a) * r, y, Math.sin(a) * r, 4, 4, 4, i % 2 ? C.snow : C.warm); }
          octa(g, 0, 428, 0, 18, C.gold, { sy: 1.2 }); octa(g, 0, 428, 0, 14, '#FFE58A', { ry: PI / 4, sy: 1.25 });
        });
        for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * PI + 0.2; g.block(Math.cos(a) * 52, 10, Math.sin(a) * 52, 18, 16 + (i % 3) * 5, 18, ['#FF4757', '#1E90FF', '#2ED573', '#FFC312', '#A55EEA', '#FF6BB5', '#22D3EE', '#FF7F50'][i], { ry: a }); }
      } });
    def('frost_chapel', { hs: 0.8, w: 240, d: 230, h: 400, points: 48, mass: 150000,
      build(g) {
        g.block(0, 0, 0, 240, 8, 230, '#B8BFCF'); g.block(20, 8, -10, 190, 110, 170, '#FFF8EE');
        snowRoof(g, 20, 118, -10, 204, 186, 70, C.red2, { ry: PI / 2 });
        g.block(-80, 8, 40, 70, 250, 70, '#FFF8EE'); g.block(-80, 258, 40, 76, 8, 76, C.gold);
        g.cyl(-80, 266, 40, 30, 34, 40, 8, '#2E9D5B'); g.ball(-80, 318, 40, 32, '#2E9D5B', { sy: 0.9 }); g.cone(-80, 340, 40, 12, 46, 8, '#2E9D5B'); octa(g, -80, 392, 40, 7, C.gold, { sy: 1.4 });
        g.cyl(-80, 205, 75.6, 18, 18, 2, 12, C.snow, { rx: PI / 2 }); g.block(-80, 210, 77.5, 2, 12, 1, C.dark); g.block(-76, 205, 77.5, 9, 2, 1, C.dark);
        g.glowing(() => { for (let i = 0; i < 4; i++) { const x = -40 + i * 40; g.panel('z+', x + 20, 62, 75.4, 16, 44, ['#FF6B6B', '#4FB8FF', '#FFD166', '#7BD389'][i]); g.panel('z-', x + 20, 62, -95.4, 16, 44, ['#4FB8FF', '#FFD166', '#7BD389', '#FF6B6B'][i]); } g.panel('z+', -80, 150, 75.4, 20, 34, C.warm); });
        g.panel('z+', -80, 30, 75.4, 30, 44, '#5A3A26'); torus(g, -80, 64, 76.6, 10, 3, 4, 12, C.green);
      } });
    def('frost_gondola', { w: 260, d: 240, h: 200, points: 50, mass: 160000,
      build(g) {
        g.block(0, 0, 0, 260, 10, 240, '#B8BFCF');
        g.block(-70, 10, 0, 110, 120, 220, '#E9EEF6'); snowRoof(g, -70, 130, 0, 232, 124, 50, C.red2, { ry: PI / 2 });
        g.glowing(() => g.windows(-70, 0, 110, 220, 30, 110, 2, 4, C.warm, { fill: 0.5 }));
        g.panel('z+', -70, 112, 110.4, 90, 16, C.red2); g.panel('z+', -70, 112, 110.5, 80, 8, C.snow);
        g.block(55, 10, 0, 130, 14, 220, C.wood);
        for (const [x, z] of [[0, -100], [0, 100], [100, -100], [100, 100]]) g.block(x, 24, z, 8, 96, 8, '#5A6378');
        g.box(50, 124, 0, 120, 8, 226, C.red2, { rz: 0.1 }); g.box(50, 129, 0, 100, 3, 200, C.snow, { rz: 0.1 });
        g.cyl(55, 132, 0, 48, 48, 6, 16, '#FFC312'); g.cyl(55, 132, 0, 36, 36, 6.5, 16, '#5A6378'); g.cyl(55, 132, 0, 12, 12, 14, 8, C.red);
        for (const z of [-46, 46]) { g.block(95, 140, z, 70, 3, 3, C.dark); g.block(112, 118, z, 1.5, 22, 1.5, C.dark); }
        for (const [z, c] of [[-46, C.red], [46, '#1E90FF']]) { g.block(112, 80, z, 30, 38, 30, c); g.block(112, 118, z, 32, 4, 32, C.snow); g.panel('z+', 112, 102, z + 15.3, 24, 12, C.glass); g.panel('z-', 112, 102, z - 15.3, 24, 12, C.glass); g.panel('x+', 127.3, 102, z, 24, 12, C.glass); }
        g.ball(40, 30, 60, 6, C.skin); g.block(40, 24, 60, 8, 9, 9, '#FF4757'); g.ball(70, 30, -40, 6, C.skin); g.block(70, 24, -40, 8, 9, 9, '#2ED573');
      } });
    def('frost_hotel', { w: 340, d: 300, h: 320, points: 85, mass: 500000,
      build(g) {
        g.block(0, 0, 0, 340, 50, 300, '#B8BFCF'); g.block(0, 50, 0, 320, 160, 280, '#FFF4E6');
        for (let r = 0; r < 3; r++) { const y = 70 + r * 46; g.block(0, y, 145, 290, 4, 14, C.wood2); g.block(0, y + 10, 151, 290, 2, 2, C.wood2); g.block(0, y, -145, 290, 4, 14, C.wood2); }
        g.glowing(() => g.windows(0, 0, 320, 280, 60, 200, 3, 7, C.warm, { fill: 0.5, fillY: 0.5 }));
        g.windows(0, 0, 340, 300, 12, 44, 1, 8, '#9FE7FF', { fill: 0.5 });
        g.gable(0, 210, 0, 344, 304, 90, C.green2); g.gable(0, 210 + 90 * 0.42 + 1.8, 0, 340, 304 * 0.58, 90 * 0.58, C.snow);
        for (const x of [-100, 0, 100]) { g.block(x, 220, 120, 40, 40, 30, '#FFF4E6'); g.gable(x, 260, 120, 30, 50, 22, C.green2, { ry: PI / 2 }); g.glowing(() => g.panel('z+', x, 236, 135.3, 20, 20, C.warm)); }
        for (const x of [-120, 120]) { g.block(x, 260, -40, 24, 70, 24, C.stone); smoke(g, x, 330, -40); }
        g.block(0, 0, 160, 90, 44, 20, C.red2); g.panel('z+', 0, 22, 170.3, 50, 34, '#5A3A26'); g.block(0, 44, 160, 100, 4, 26, C.snow);
        for (const x of [-60, 60]) { g.block(x, 50, 160, 2, 40, 2, C.dark); g.block(x + 8, 80, 160, 14, 9, 1, x < 0 ? C.red : '#1E90FF'); }
      } });
    def('frost_lodge', { w: 420, d: 400, h: 360, points: 140, mass: 900000,
      build(g) {
        g.block(0, 0, 0, 420, 10, 400, '#B8BFCF');
        for (const x of [-140, 140]) {
          g.block(x, 10, -20, 130, 120, 300, C.wood);
          for (let r = 0; r < 7; r++) { g.panel('z+', x, 18 + r * 16, 130.3, 130, 3, C.wood2); g.panel(x < 0 ? 'x-' : 'x+', x + (x < 0 ? -65.3 : 65.3), 18 + r * 16, -20, 300, 3, C.wood2); }
          snowRoof(g, x, 130, -20, 320, 150, 70, C.red2, { ry: PI / 2 });
          g.glowing(() => { for (const z of [-120, -40, 40]) g.panel(x < 0 ? 'x-' : 'x+', x + (x < 0 ? -65.4 : 65.4), 70, z, 40, 30, C.warm); for (const xx of [-35, 35]) g.panel('z+', x + xx, 70, 130.4, 30, 30, C.warm); });
        }
        // the great A-frame hall with a glass gable facing the slopes
        g.block(0, 10, -10, 160, 150, 340, C.wood);
        g.gable(0, 40, -10, 340, 196, 290, C.red2, { ry: PI / 2 });
        g.gable(0, 40 + 290 * 0.4, -10, 336, 196 * 0.6, 290 * 0.6 + 2, C.snow, { ry: PI / 2 });
        g.glowing(() => { g.box(0, 120, 160.5, 120, 140, 1, '#FFE3A1'); });
        for (const y of [80, 140]) g.block(0, y, 162, 124, 4, 2, C.wood2); for (const x of [-30, 30]) g.block(x, 50, 162, 4, 140, 2, C.wood2);
        g.block(0, 10, 185, 200, 6, 30, '#C98A55'); for (let i = 0; i < 9; i++) g.block(-96 + i * 24, 16, 198, 3, 12, 3, C.wood2);
        for (const x of [-210, 210]) { g.block(x * 0.92, 10, 80, 30, 230, 30, C.stone); smoke(g, x * 0.92, 240, 80); }
        for (let i = 0; i < 6; i++) g.block(-60 + i * 24, 16, 200 - 6, 3, 30, 10, ['#FF4757', '#1E90FF', '#FFC312'][i % 3], { rz: 0.15 });
        g.panel('z+', 0, 200, 160.6, 70, 18, C.snow); g.panel('z+', 0, 200, 160.7, 60, 10, C.red);
      } });
    // ---------- landmark ----------
    def('frost_palace', { hs: 0.62, w: 560, d: 520, h: 1000, points: 340, mass: 7000000,
      build(g) {
        g.block(0, 0, 0, 560, 14, 520, C.snow); g.block(0, 14, -10, 500, 10, 460, C.ice2); g.block(0, 0, 250, 170, 10, 24, C.ice2);
        // courtyard walls
        for (const [x, z, w, d] of [[-135, 200, 150, 24], [135, 200, 150, 24], [0, -210, 420, 24], [-215, 0, 24, 400], [215, 0, 24, 400]]) { g.block(x, 24, z, w, 120, d, C.ice2); g.block(x, 144, z, w + 6, 8, d + 6, C.snow); }
        // main hall
        g.block(0, 24, -40, 340, 220, 250, '#92DBFA');
        for (let i = 0; i < 7; i++) { const x = -150 + i * 50; g.block(x, 24, 86, 14, 230, 6, C.ice2); }
        g.glowing(() => { for (let i = 0; i < 6; i++) { const x = -125 + i * 50; g.panel('z+', x, 130, 85.4, 26, 90, '#EAFBFF'); g.ball(x, 175, 85.4, 13, '#EAFBFF', { sz: 0.05 }); } });
        g.block(0, 244, -40, 350, 10, 260, C.ice2); g.block(0, 254, -40, 330, 6, 240, C.ice);
        for (const [x, z, r] of [[-110, 40, 18], [110, 40, 18], [-60, 60, 12], [60, 60, 12], [-120, -150, 16], [120, -150, 16]]) octa(g, x, 260 + r * 1.8, z, r, C.ice2, { sy: 2 });
        // gate
        g.block(0, 24, 120, 120, 170, 40, C.ice3); g.panel('z+', 0, 80, 140.4, 70, 112, C.deep); g.ball(0, 136, 140.4, 35, C.deep, { sz: 0.05, sy: 0.7 });
        for (const a of [0, PI / 3, -PI / 3]) g.box(0, 175, 141.5, 46, 4, 2, C.snow, { rz: a });
        g.block(0, 194, 120, 130, 8, 50, C.snow);
        for (const x of [-48, 48]) { g.cyl(x, 202, 120, 18, 20, 70, 6, C.ice2); g.cone(x, 272, 120, 24, 90, 6, C.ice3); octa(g, x, 370, 120, 7, C.snow, { sy: 2 }); }
        // corner towers
        for (const [x, z] of [[-215, -200], [215, -200], [-215, 200], [215, 200]]) {
          g.cyl(x, 14, z, 50, 58, 380, 6, C.ice2); g.cyl(x, 394, z, 66, 66, 14, 6, C.snow); g.cone(x, 408, z, 64, 230, 6, C.ice3); octa(g, x, 652, z, 14, C.snow, { sy: 2 });
          g.glowing(() => { g.panel('z+', x, 300, z + 53, 22, 50, '#EAFBFF'); g.panel('z+', x, 180, z + 56, 22, 50, '#EAFBFF'); });
        }
        // side towers on the hall
        for (const x of [-150, 150]) { g.cyl(x, 254, -100, 40, 44, 200, 6, C.ice); g.cone(x, 454, -100, 52, 200, 6, C.ice2); octa(g, x, 666, -100, 10, C.snow, { sy: 2 }); }
        // the great spire
        g.cyl(0, 254, -60, 74, 92, 340, 6, C.ice3); g.cyl(0, 594, -60, 100, 100, 16, 6, C.snow);
        g.cone(0, 610, -60, 86, 300, 6, C.ice); octa(g, 0, 940, -60, 26, C.ice2, { sy: 2.2 });
        g.glowing(() => { for (let i = 0; i < 6; i++) { const a = i / 6 * 2 * PI + PI / 6; g.box(Math.cos(a) * 82, 470, -60 + Math.sin(a) * 82, 24, 70, 4, '#EAFBFF', { ry: -a + PI / 2 }); } });
        // ice shards sparkling around the base
        for (const [x, z, r, t] of [[-250, 240, 26, 0.3], [250, 240, 26, -0.3], [-260, -40, 22, 0.2], [260, -40, 22, -0.2], [-170, 240, 16, -0.25], [170, 240, 16, 0.25]]) octa(g, x, 24 + r * 1.6, z, r, C.ice3, { sy: 2, rz: t });
      } });
  }

  HC.Levels.add({
    id: 'frost', num: 6, name: 'Frostville', tagline: 'Snowy village · skaters, cocoa & an ice palace', icon: '⛄', colors: ['#7CD3F7', '#2E6FD9'],
    theme: { sky: '#CFEAFF', fogNear: 8000, fogFar: 20000, hemiSky: '#EEF7FF', hemiGround: '#8FA9E0', hemi: 1.45, sun: '#FFF6EA', sunI: 2.25,
      sea: { show: true, deep: '#5DA9E2', shallow: '#C9F0FB', foam: 0.4 }, skirt: '#E6F0FA' },
    mods: { grip: 0.3, botSkill: -0.08 },
    milestones: [['car', '🚗 Cars'], ['frost_fishhut', '🎣 Ice-fishing huts'], ['frost_plow', '🚜 Snow plows'], ['frost_igloo', '🧊 Igloos'], ['frost_cabin', '🛖 Log cabins'],
      ['frost_bigtree', '🎄 The big tree'], ['frost_chalet', '🏡 Chalets'], ['frost_chapel', '⛪ The chapel'], ['frost_gondola', '🚡 Gondola station'], ['frost_hotel', '🏨 Grand hotels'], ['frost_lodge', '🎿 The ski lodge'], ['frost_palace', '❄️ THE ICE PALACE']],
    kinds,
    generate(T) {
      const rng = T.rng, CX = 2500, CZ = 2750;
      const ell = (rx, rz, deg) => [CX + rx * Math.cos(deg * D), CZ + rz * Math.sin(deg * D)];
      const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
      // Workaround: HC.Geo.strip winds its quads facing down (lit as back faces, so they look dark).
      const SW = (() => { const g = new HC.Geo(); g.strip(0, 0, 10, 0, 2, 0, '#FFFFFF'); const p = g.pos; return ((p[5] - p[2]) * (p[6] - p[0]) - (p[3] - p[0]) * (p[8] - p[2])) >= 0 ? 1 : -1; })();
      const strip = (x0, z0, x1, z1, w, y, color) => T.strip(x0, z0, x1, z1, w * SW, y, color);
      const tpath = (pts, w, y, color, closed = false) => { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; strip(a[0], a[1], b[0], b[1], w, y, color); T.disc(a[0], a[1], w / 2, y, color, 16); } if (!closed) { const e = pts[pts.length - 1]; T.disc(e[0], e[1], w / 2, y, color, 16); } };
      const occRect = (x, z, w, d, rot, pad = 10) => {
        const c = Math.cos(rot), s = Math.sin(rot), nu = Math.max(1, Math.ceil((w - 40) / 60)), nv = Math.max(1, Math.ceil((d - 40) / 60));
        for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const u = (i / nu - 0.5) * (w - 40), v = (j / nv - 0.5) * (d - 40); T.occupy(x + u * c + v * s, z - u * s + v * c, 42 + pad); }
      };
      const occEll = (x, z, rx, rz) => { for (let u = -rx; u <= rx; u += 55) for (let v = -rz; v <= rz; v += 55) if ((u / rx) ** 2 + (v / rz) ** 2 <= 1) T.occupy(x + u, z + v, 45); };
      const big = (kind, x, z, rot = 0) => { const k = HC.CATALOG[kind]; const o = T.put(kind, x, z, rot); occRect(x, z, k.w, k.d, rot); return o; };
      const tryBig = (kind, x, z, rot) => { const k = HC.CATALOG[kind]; if (!T.free(x, z, k.radius * 0.98)) return false; big(kind, x, z, rot); return true; };
      const cluster = (weights, x, z, r, n, gap = 5) => T.scatter(weights, { x, z, r }, n, { gap });
      const COL = { snowA: '#F5F9FF', snowB: '#ECF3FC', drift: '#E2ECF8', lane: '#DCE5F2', laneEdge: '#BFCDE3', road: '#95A1BA', roadEdge: '#E6EEF9',
        shore: '#FFFFFF', shore2: '#D3E5F6', ice: '#A9DDF5', ice2: '#C3E9F8', trail: '#E3F6FD', hole: '#2F6FA8', plaza: '#DDF1FF', plazaRing: '#B9E1F7', market: '#F3DFCB', marketRing: '#DDBB9A' };

      // ---- ground: snow with soft blue drifts ----
      T.island({ ground: '#DDEAF7', edge: '#C9DCEF' });
      T.rect(-40, -40, 5040, 5040, 0, COL.snowA);
      for (let i = 0; i < 70; i++) T.disc(rng.range(0, 5000), rng.range(0, 5000), rng.range(80, 260), 0.3, rng.chance(0.5) ? COL.snowB : COL.drift, 18, rng.range(1, 1.8), 1);

      // ---- frozen lake ----
      T.disc(CX, CZ, 640, 1.0, COL.shore, 64, 1.48, 1); T.disc(CX, CZ, 618, 1.2, COL.shore2, 64, 1.49, 1); T.disc(CX, CZ, 600, 1.4, COL.ice, 64, 1.5, 1);
      for (let i = 0; i < 14; i++) { const a = rng() * 2 * PI, r = Math.sqrt(rng()) * 0.8; T.disc(CX + Math.cos(a) * r * 880, CZ + Math.sin(a) * r * 560, rng.range(50, 140), 1.6, COL.ice2, 20, rng.range(1.2, 2), 1); }
      const SKATE = [[2120, 2760, 260], [2880, 2760, 260], [2500, 2520, 170], [2500, 3010, 170]];
      for (const [x, z, r] of SKATE) { T.ring(x, z, r - 6, r + 6, 1.8, COL.trail, 40); T.ring(x, z, r * 0.6 - 4, r * 0.6 + 4, 1.8, COL.trail, 32); }
      occEll(CX, CZ, 950, 640);

      // ---- path network ----
      const walk = (pts, w, color, edge, closed = false, y0 = 2.4) => {
        tpath(pts, w + 14, y0, edge, closed); tpath(pts, w, y0 + 0.2, color, closed);
        for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 40); for (let k = 0; k <= n; k++) T.occupy(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, w / 2 + 8); }
      };
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
      const ellPts = (rx, rz, n, wob = 0) => { const p = []; for (let i = 0; i < n; i++) { const a = i / n * 360, k = 1 + wob * Math.sin(5 * a * D + 1.1); p.push(ell(rx * k, rz * k, a)); } return p; };
      const prom = ellPts(1010, 710, 56, 0.015);
      walk(prom, 72, COL.lane, COL.laneEdge, true);
      const road = ellPts(1700, 1450, 72, 0.012);
      walk(road, 110, COL.road, COL.roadEdge, true, 2.3);
      for (let i = 0; i < road.length; i++) if (i % 2 === 0) { const a = road[i], b = road[(i + 1) % road.length]; strip(a[0] + (b[0] - a[0]) * 0.25, a[1] + (b[1] - a[1]) * 0.25, a[0] + (b[0] - a[0]) * 0.75, a[1] + (b[1] - a[1]) * 0.75, 5, 2.7, '#FFFFFF'); }
      const lanes = [];
      for (const th of [0, 40, 140, 180, 220, 320]) {
        const pts = [], i = lanes.length;
        for (let k = 0; k <= 7; k++) { const t = k / 7, rx = 1010 + 690 * t, rz = 710 + 740 * t, wig = 7 * Math.sin(t * 2 * PI) * (i % 2 ? 1 : -1); pts.push(ell(rx, rz, th + wig)); }
        lanes.push(pts); walk(pts, 60, COL.lane, COL.laneEdge, false, 2.5);
      }
      // north: palace plaza; south: market square + avenue
      T.disc(CX, 1760, 400, 2.4, '#FFFFFF', 48); T.disc(CX, 1760, 388, 2.5, COL.plaza, 48); T.ring(CX, 1760, 300, 316, 2.6, COL.plazaRing, 48);
      for (let i = 0; i < 12; i++) { const a = i * 30 * D; T.disc(CX + Math.cos(a) * 350, 1760 + Math.sin(a) * 350, 16, 2.7, '#FFFFFF', 6); }
      occEll(CX, 1760, 380, 380);
      const MZ = 3830;
      walk([[CX, 3440], [CX, MZ - 250]], 90, COL.market, COL.marketRing, false, 2.5); walk([[CX, MZ + 250], [CX, 4170]], 90, COL.market, COL.marketRing, false, 2.5);
      T.disc(CX, MZ, 272, 2.6, COL.marketRing, 40); T.disc(CX, MZ, 260, 2.7, COL.market, 40); T.ring(CX, MZ, 120, 132, 2.8, COL.marketRing, 32);
      occEll(CX, MZ, 262, 262);

      // ---- the ice palace ----
      big('frost_palace', CX, 1700, 0);
      for (const x of [-330, 330]) { T.put('frost_xtree', CX + x, 1960); T.put('frost_xtree', CX + x * 0.8, 2050); }
      for (const x of [-250, -170, 170, 250]) T.put('frost_snowman', CX + x, 2010, rng() * 0.6 - 0.3);
      for (const x of [-120, 120]) T.put('lamp', CX + x, 2040, 0);

      // ---- Christmas market ----
      T.put('frost_bigtree', CX, MZ, 0); occEll(CX, MZ, 80, 80);
      for (const zz of [3560]) for (const sd of [-1, 1]) T.put('frost_stall', CX + sd * 100, zz, sd * PI / 2 * -1);
      for (let i = 0; i < 10; i++) { const a = (i + 0.5) / 10 * 2 * PI; if (Math.abs(Math.sin(a)) > 0.95) continue; const x = CX + Math.cos(a) * 205, z = MZ + Math.sin(a) * 205; T.put('frost_stall', x, z, faceTo(x, z, CX, MZ)); }
      T.put('frost_cocoa', CX - 112, MZ + 10, PI / 2); T.put('frost_cocoa', CX + 112, MZ - 10, -PI / 2); T.put('frost_sleigh', CX, MZ - 118, 0);
      cluster({ frost_gift: 4, frost_skater: 3, person: 2, frost_snowman: 1 }, CX, MZ, 170, 26, 3);
      const mloop = []; for (let i = 0; i < 20; i++) { const a = i / 20 * 2 * PI; mloop.push([CX + Math.cos(a) * 140, MZ + Math.sin(a) * 140]); }
      T.walkLoop(mloop, 10, { frost_skater: 2, person: 1 }, { speed: [24, 40] });

      // ---- on the ice ----
      for (const [x, z, n] of [[2120, 2760, 8], [2880, 2760, 8], [2500, 2520, 6], [2500, 3010, 6]]) T.roamers({ frost_skater: 1 }, x, z, SKATE.find((s) => s[0] === x && s[1] === z)[2], n, { speed: [40, 70], bob: false });
      T.roamers('frost_penguin', 1720, 2540, 120, 6, { speed: [10, 18] }); T.roamers('frost_penguin', 3300, 2980, 110, 5, { speed: [10, 18] });
      for (const [x, z, r] of [[1770, 2860, 0.4], [3240, 2560, -0.5], [3320, 2830, 0.2], [1700, 2700, -0.2], [2240, 2330, 0.1], [2760, 2340, -0.3], [2230, 3180, 0.3], [2780, 3170, -0.1]]) { T.put('frost_fishhut', x, z, r); T.disc(x + 34, z + 30, 9, 1.9, COL.hole, 10); T.put('frost_skater', x + 40, z + 46, rng() * 6, { tint: 3 }); }
      for (let i = 0; i < 16; i++) { const a = rng() * 2 * PI, r = rng.range(0.82, 0.95); T.put(T.pick({ frost_snowman: 2, frost_gift: 1, frost_sled: 1 }), CX + Math.cos(a) * 900 * r, CZ + Math.sin(a) * 600 * r, rng() * 6); }

      // ---- outside the road: ski slope + lodge (NW), gondola + igloo camp (N/NE), hotels, chapel ----
      const piste = [[300, 170], [470, 480], [640, 820], [760, 1180]];
      tpath(piste, 300, 1.0, '#FFFFFF'); for (let i = 0; i < piste.length - 1; i++) for (const o of [-110, -40, 30, 100]) strip(piste[i][0] + o, piste[i][1], piste[i + 1][0] + o, piste[i + 1][1], 4, 1.2, '#E4EDF8');
      for (const p of piste) T.occupy(p[0], p[1], 140); for (let i = 0; i < piste.length - 1; i++) { const a = piste[i], b = piste[i + 1]; for (let k = 1; k < 4; k++) T.occupy(a[0] + (b[0] - a[0]) * k / 4, a[1] + (b[1] - a[1]) * k / 4, 140); }
      for (let i = 0; i < piste.length - 1; i++) { const a = piste[i], b = piste[i + 1]; for (let k = 0; k < 3; k++) { const t = (k + 0.5) / 3, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; T.put('cone', x - 160, z); T.put('cone', x + 160, z); } }
      T.roamers('frost_skier', 420, 380, 120, 4, { speed: [50, 80], bob: false }); T.roamers('frost_skier', 600, 750, 130, 4, { speed: [50, 80], bob: false }); T.roamers('frost_skier', 740, 1100, 110, 4, { speed: [40, 70], bob: false });
      for (let k = 0; k < 6; k++) { const x = 640 + k * 64, z = 220 + k * 172; T.put('frost_lift', x, z, Math.atan2(64, 172)); T.occupy(x, z, 40); }
      big('frost_lodge', 1260, 860, 0);
      T.disc(1260, 1130, 150, 2.4, COL.plaza, 32);
      cluster({ frost_skier: 3, frost_skater: 2, frost_sled: 1, frost_snowman: 1 }, 1000, 1200, 160, 14);
      // gondola station with its cable line toward the peaks
      big('frost_gondola', 3900, 960, 0);
      for (let k = 0; k < 4; k++) T.put('frost_lift', 4110 + k * 170, 830 - k * 170, 0.785);
      // igloo camp
      const IG = [2350, 760];
      T.disc(IG[0], IG[1], 300, 1.0, '#E7F1FC', 32);
      for (let i = 0; i < 7; i++) { const a = i / 7 * 2 * PI + 0.3, x = IG[0] + Math.cos(a) * 210, z = IG[1] + Math.sin(a) * 170; big('frost_igloo', x, z, faceTo(x, z, IG[0], IG[1])); }
      T.disc(IG[0], IG[1], 26, 1.3, '#FFB347', 12); occEll(IG[0], IG[1], 120, 90); T.roamers('frost_penguin', IG[0], IG[1], 100, 6, { speed: [10, 18] });
      // a second igloo camp by the gondola + parked snowmobiles at the lodge
      for (let i = 0; i < 5; i++) { const x = 3420 + i * 120, z = 1240 - (i % 2) * 110; big('frost_igloo', x, z, 0); }
      for (let i = 0; i < 6; i++) T.put('frost_snowmobile', 1500 + (i % 3) * 56, 1120 + Math.floor(i / 3) * 36, PI / 2);
      // reindeer paddock
      const RD = [3100, 600];
      T.rect(RD[0] - 170, RD[1] - 110, RD[0] + 170, RD[1] + 110, 0.8, '#EDE3D6');
      T.line('fence', RD[0] - 175, RD[1] - 115, RD[0] + 175, RD[1] - 115, 31); T.line('fence', RD[0] - 175, RD[1] + 115, RD[0] + 175, RD[1] + 115, 31, { gapAt: 175, gapW: 60 });
      T.line('fence', RD[0] - 180, RD[1] - 110, RD[0] - 180, RD[1] + 110, 31); T.line('fence', RD[0] + 180, RD[1] - 110, RD[0] + 180, RD[1] + 110, 31);
      occRect(RD[0], RD[1], 360, 240, 0, 0); T.roamers('frost_reindeer', RD[0], RD[1], 90, 6, { speed: [12, 22] });
      // hotels west + east, chapels
      big('frost_hotel', 420, 2250, PI / 2); big('frost_chapel', 430, 3300, PI / 2);
      big('frost_hotel', 4580, 3250, -PI / 2); big('frost_chapel', 4570, 2250, -PI / 2);
      // sledding hill (SW)
      T.disc(800, 4350, 330, 1.0, '#FFFFFF', 32, 1.2, 1); T.disc(800, 4350, 180, 1.2, '#F0F6FD', 24, 1.2, 1);
      for (let i = 0; i < 6; i++) strip(560 + i * 80, 4130, 600 + i * 70, 4560, 6, 1.4, '#E1EBF7');
      occEll(800, 4350, 330 * 1.2, 330);
      cluster({ frost_sled: 4, frost_skater: 4, frost_snowman: 2 }, 800, 4350, 300, 30, 4);
      T.roamers('frost_snowmobile', 1450, 4500, 220, 4, { speed: [50, 80], bob: false });
      // visitor parking (S)
      T.rect(1900, 4370, 3100, 4760, 2.4, '#C7D1E2'); occRect(2500, 4565, 1200, 390, 0, 0);
      for (const zc of [4440, 4532, 4640]) for (let x = 1930; x < 3080; x += 54) { if (Math.abs(x + 27 - CX) < 70) continue; T.rect(x - 1.5, zc - 40, x + 1.5, zc + 40, 2.8, '#FFFFFF'); if (rng.chance(0.82)) T.put(rng.chance(0.15) ? 'van' : 'car', x + 27, zc, PI / 2); }
      for (let k = 0; k < 2; k++) T.put('bus', 2150 + k * 700, 4720, 0);
      // snowmobile trail (SE)
      T.roamers('frost_snowmobile', 4300, 4300, 300, 5, { speed: [60, 90], bob: false });
      T.roamers('frost_snowmobile', 3950, 640, 160, 3, { speed: [50, 80], bob: false });

      // ---- the village: cabins & chalets along the lanes, between the promenade and the road ----
      const cand = [];
      for (let x = 250; x <= 4750; x += 110) for (let z = 250; z <= 4750; z += 110) cand.push([x + rng.range(-25, 25), z + rng.range(-25, 25)]);
      for (let i = cand.length - 1; i > 0; i--) { const j = rng.int(0, i); [cand[i], cand[j]] = [cand[j], cand[i]]; }
      const inRoad = (x, z) => ((x - CX) / 1700) ** 2 + ((z - CZ) / 1450) ** 2 < 1;
      let inner = 0, outer = 0;
      for (const [x, z] of cand) {
        const inside = inRoad(x, z);
        if (inside ? inner >= 64 : outer >= 34) continue;
        const kind = T.pick(inside ? { frost_cabin: 5, frost_chalet: 4 } : { frost_cabin: 6, frost_chalet: 3 });
        // face the nearest path: toward the lake inside the road, toward the road outside it
        const rot = faceTo(x, z, CX, CZ);
        const snap = Math.round(rot / (PI / 4)) * (PI / 4) + rng.range(-0.12, 0.12);
        if (tryBig(kind, x, z, snap)) {
          inside ? inner++ : outer++;
          const k = HC.CATALOG[kind], c = Math.cos(snap), s = Math.sin(snap), fx = x + s * 110, fz = z + c * 110;
          if (T.free(fx, fz, 12)) T.put(T.pick({ frost_snowman: 3, frost_xtree: 2, frost_sled: 2, frost_gift: 2, mailbox: 1 }), fx, fz, snap);
          // parked by the side of the house: a car or a snowmobile
          const sx = x + c * (k.w / 2 + 40), sz = z - s * (k.w / 2 + 40), veh = T.pick({ car: 5, van: 1, frost_snowmobile: 3, none: 2 });
          if (veh !== 'none' && T.free(sx, sz, 30)) T.put(veh, sx, sz, snap + PI / 2);
          // a little picket fence and a yard full of winter clutter
          const hw = k.w / 2 + 14, fd = k.d / 2 + 46;
          for (const u of [-hw + 16, -hw + 47, hw - 47, hw - 16]) { const px = x + u * c + fd * s, pz = z - u * s + fd * c; if (T.free(px, pz, 14)) T.put('fence', px, pz, snap); }
          cluster({ frost_snowman: 2, frost_gift: 3, frost_skater: 2, frost_sled: 1, frost_penguin: 0.5, dog: 0.5 }, x, z, k.radius + 90, 3, 4);
        }
      }

      // ---- road life: plows, trucks and cars, both directions ----
      const roadLoop = (pts, lane, kinds) => {
        const loop = { pts, kind: 'track' }; T.city.walkLoops.push(loop);
        kinds.forEach((k, i) => T.put(k, 0, 0, 0, { mover: { type: 'walk', loop, t: (i + rng() * 0.4) / kinds.length, dir: 1, speed: 95, lane, bob: false } }));
      };
      roadLoop(road, 26, ['frost_plow', 'car', 'van', 'car', 'truck', 'car', 'frost_plow', 'car']);
      roadLoop(road.slice().reverse(), 26, ['car', 'frost_plow', 'car', 'van', 'truck', 'car', 'car']);

      // ---- strollers ----
      const CROWD = { frost_skater: 5, person: 3, dog: 0.5 };
      T.walkLoop(prom, 48, CROWD, { speed: [28, 48] });
      for (const ln of lanes) T.walkLoop(ln.concat(ln.slice(1, -1).reverse()), 4, CROWD, { lane: 0 });

      // ---- path dressing ----
      const EDGE = { lamp: 3, frost_xtree: 2, bench: 2, frost_snowman: 2, frost_gift: 1, none: 3 };
      edgeProps(prom, 72, 80, EDGE, true);
      for (const ln of lanes) edgeProps(ln, 60, 85, { lamp: 2, frost_xtree: 1, frost_snowman: 2, mailbox: 1, frost_gift: 1, none: 3 });
      edgeProps(road, 110, 140, { lamp: 2, frost_xtree: 1, none: 4 }, true);

      // ---- spawns, each with a few snacks around ----
      const spawns = [];
      for (let i = 0; i < 8; i++) spawns.push(ell(1010, 710, 22.5 + i * 45));
      spawns.push([CX, MZ + 180], [IG[0] + 330, IG[1] + 120], [1000, 1250], [800, 4120], [620, 2750], [4380, 2750], [CX, 4300]);
      for (const [x, z] of spawns) { T.spawnAt(x, z); cluster({ frost_skater: 3, frost_snowman: 2, frost_gift: 3, frost_penguin: 1, person: 2, frost_pine: 1.5 }, x, z, 260, 22); }

      // ---- forests: dense snowy pines outside the road, sprinkled inside ----
      const notOn = (x, z) => x < 120 || x > 4880 || z < 120 || z > 4880;
      T.scatter({ frost_pine: 10, frost_snowman: 2, frost_gift: 1.5, frost_xtree: 0.6, frost_penguin: 0.6, frost_skater: 0.8 }, { x0: 120, z0: 120, x1: 4880, z1: 4880 }, 760, { gap: 8, avoid: (x, z) => notOn(x, z) || (inRoad(x, z) && rng.chance(0.55)) });
      T.scatter({ frost_snowman: 3, frost_gift: 3, frost_skater: 3, person: 1, bench: 1, frost_sled: 1, frost_cocoa: 0.5 }, { x0: 700, z0: 1200, x1: 4300, z1: 4300 }, 400, { gap: 6, avoid: (x, z) => !inRoad(x, z) });
      T.beach({ frost_penguin: 4, frost_snowman: 2, frost_pine: 1 }, 60);
    },
  });
})();
