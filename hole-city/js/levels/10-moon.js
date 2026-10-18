// Level 10 — Lunar Base: a cheerful cartoon moon base under a starry sky. No road grid: a ring of
// habitat domes linked by tube corridors around Command HQ, districts (mine, telescopes, greenhouses,
// solar farm, landing pads) joined by dusty rover tracks, craters everywhere and a giant rocket on its
// launch tower. Low gravity: everything floats down slowly.
(function () {
  const COL = {
    ground: '#C6C8D5', edge: '#9EA2B4', mottleA: '#BCBECD', mottleB: '#D0D2DE', mare: '#B2B4C6',
    rim: '#DFE1EA', floor: '#B1B4C4', floorDark: '#A4A7B9', floorLight: '#BCBFCD',
    track: '#ADB0C1', trackEdge: '#BDC0CE', rut: '#9C9FB2', plaza: '#E8EAF2', plazaRing: '#2EC4B6', pad: '#B9BDCB', padLine: '#FFD23F',
    dust: '#B3ACC6', farm: '#BFC3D3',
  };
  const ACC = ['#FF8C42', '#2EC4B6', '#FF5AC8', '#FFD23F'];
  const WHITE = '#F4F6FF', SILVER = '#C9CCD9', GREY = '#8C91A8', DARK = '#2B2D42', GOLD = '#FFC845', GLASS = '#9FE7FF';

  const V3 = THREE.Vector3, UP = new V3(0, 1, 0), _d = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function limb(g, a, b, r0, r1, seg, color, o = {}) {
    _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _d.length(); _d.normalize();
    _q.setFromUnitVectors(UP, _d); _e.setFromQuaternion(_q, 'XYZ');
    g.cyl((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - len / 2, (a[2] + b[2]) / 2, r1, r0, len, seg, color, Object.assign({ rx: _e.x, ry: _e.y, rz: _e.z }, o));
  }
  // A glowing crystal: hex prism from a to `top` with a pointed tip.
  function crystal(g, x, z, h, r, lx, lz, color, o = { tint: true }, seg = 6) {
    const top = [x + lx * 0.7, h, z + lz * 0.7], tip = [x + lx, h + r * 2.2, z + lz];
    limb(g, [x, 0, z], top, r, r, seg, color, o); limb(g, top, tip, r, 0.01, seg, color, o);
  }

  function kinds(def) {
    // ---------- tiny ----------
    def('moon_astro', { w: 9, d: 12, h: 30, points: 1, mass: 90, tints: ['#FF8C42', '#2EC4B6', '#FF5AC8', '#FFD23F', '#7BD84A'],
      build(g) { g.turned(Math.PI / 2, () => { // modeled facing +z, turned to walk along +x
        for (const x of [-2.8, 2.8]) g.limb(x < 0 ? 1 : -1, 0, 11, () => { g.block(x, 0, 0, 4.4, 11, 5.6, WHITE); g.block(x, 0, 0.6, 4.8, 2.4, 6.4, GREY); });
        g.block(0, 10, 0, 10, 10, 7, WHITE); g.block(0, 11, -4.6, 8, 9, 3, SILVER); g.block(0, 14, 3.6, 4, 3, 0.6, '#FFF', { tint: true });
        for (const x of [-6, 6]) g.limb(x < 0 ? -0.6 : 0.6, 0, 18, () => g.block(x, 11, 0, 2.6, 8, 3.4, WHITE));
        g.ball(0, 24, 0, 5.6, WHITE);
        g.glowing(() => g.ball(0, 24, 2.3, 4.2, '#FFF', { tint: true, sz: 0.75 }));
        g.block(2.5, 29, -2, 0.8, 4, 0.8, GREY); });
      } });
    def('moon_bot', { w: 10, d: 10, h: 17, points: 1, mass: 40, tints: ['#FF8C42', '#2EC4B6', '#FF5AC8', '#FFD23F'],
      build(g) {
        for (const z of [-3.6, 3.6]) g.block(0, 0, z, 10, 3.6, 2.8, DARK);
        g.block(0, 3.6, 0, 8.4, 6, 7.4, '#FFF', { tint: true }); g.ball(0, 11, 0, 3.8, WHITE, { detail: 1 });
        g.glowing(() => { for (const z of [-1.5, 1.5]) g.ball(3.2, 11.4, z, 0.95, '#5EF0FF'); g.ball(0, 16.4, 0, 1.1, '#FF5A5F'); });
        g.block(0, 14, 0, 0.6, 2.4, 0.6, GREY);
      } });
    def('moon_rock', { w: 8, d: 8, h: 6, points: 1, mass: 30, tints: ['#9EA2B4', '#B7B9C9', '#8B86A8', '#A89BB8'],
      build(g) { g.ball(0, 2.6, 0, 3.8, '#FFF', { tint: true, sx: 1.05, sy: 0.7, sz: 0.95 }); g.ball(2, 1.7, 1.7, 1.9, '#FFF', { tint: true }); g.ball(-0.8, 4.3, -0.5, 1.1, '#7C8096', { sy: 0.4 }); } });
    def('moon_crystal', { w: 8, d: 8, h: 15, points: 1, mass: 10, tints: ['#5EF0FF', '#FF5AC8', '#B388FF', '#7BFFB0'],
      build(g) { g.ball(0, 1, 0, 3.9, '#8C91A8', { sy: 0.4 }); g.glowing(() => { crystal(g, 0, 0, 8.5, 2, 0.7, 0.4, '#FFF', { tint: true }, 4); crystal(g, 2.1, 1, 4.6, 1.5, 1.4, 0.8, '#FFF', { tint: true }, 4); crystal(g, -2, -0.8, 3.8, 1.4, -1.3, -0.6, '#FFF', { tint: true }, 4); }); } });
    def('moon_beacon', { w: 6, d: 6, h: 22, points: 1, mass: 15, tints: ['#FF8C42', '#2EC4B6', '#FF5AC8', '#FFD23F'],
      build(g) { g.cyl(0, 0, 0, 2.8, 3.2, 2, 6, GREY); g.cyl(0, 0, 0, 1, 1.2, 17, 6, SILVER); g.glowing(() => g.ball(0, 19, 0, 2.6, '#FFF', { tint: true })); } });
    // ---------- small ----------
    def('moon_crate', { w: 22, d: 22, h: 20, points: 2, mass: 120, tints: ACC,
      build(g) {
        g.block(0, 0, 0, 20, 19, 20, '#FFF', { tint: true });
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.block(x * 9.6, 0, z * 9.6, 2.6, 20, 2.6, WHITE);
        g.block(0, 18.6, 0, 21, 1.4, 21, '#FFF', { tint: true }); g.block(0, 19.4, 0, 21.4, 1, 3, WHITE); g.block(0, 19.4, 0, 3, 1, 21.4, WHITE); g.panel('z+', 0, 10, 10.3, 12, 5, DARK); g.panel('x+', 10.3, 10, 0, 12, 5, DARK);
      } });
    def('moon_boulder', { w: 34, d: 30, h: 22, points: 3, mass: 900, tints: ['#A5A9BA', '#B5B2C6', '#9A95B0'],
      build(g) { g.ball(0, 8, 0, 14, '#FFF', { tint: true, sx: 1.15, sy: 0.75, sz: 1.0 }); g.ball(9, 5, 7, 7, '#FFF', { tint: true });
        g.ball(-4, 15.6, -2, 3.4, '#868AA0', { sy: 0.3 }); g.ball(5, 14, 4, 2.4, '#868AA0', { sy: 0.3 }); g.ball(-10, 4, -6, 5.6, '#FFF', { tint: true }); } });
    def('moon_panel', { w: 44, d: 24, h: 26, points: 3, mass: 60,
      build(g) {
        g.block(0, 0, 0, 4, 14, 4, GREY); g.block(0, 0, 0, 10, 2, 10, SILVER);
        g.box(0, 18, 0, 44, 2, 24, SILVER, { rx: -0.45 });
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.box(-15.6 + i * 10.4, 19.1 + (j - 0.5) * -4.8, (j - 0.5) * 10.8, 9.4, 0.6, 10, '#3557E0', { rx: -0.45 });
      } });
    def('moon_cargo', { w: 46, d: 46, h: 42, points: 6, mass: 600, tints: ACC,
      build(g) {
        g.block(0, 0, 0, 46, 4, 46, GREY);
        for (const [x, z, y, s] of [[-11, -11, 4, 21], [11, -10, 4, 20], [-10, 11, 4, 20], [10, 10, 4, 18], [-6, -4, 25, 17]]) { g.block(x, y, z, s, s, s, '#FFF', { tint: true }); g.block(x, y + s - 1, z, s + 0.6, 1.4, 3, WHITE); g.panel('z+', x, y + s / 2, z + s / 2 + 0.3, s * 0.5, s * 0.25, DARK); }
      } });
    def('moon_light', { w: 16, d: 16, h: 112, points: 4, mass: 300,
      build(g) {
        g.block(0, 0, 0, 14, 4, 14, GREY); g.cyl(0, 4, 0, 2, 2.6, 96, 6, SILVER); g.block(0, 98, 0, 4, 3, 28, GREY);
        g.glowing(() => { for (const z of [-10, 10]) g.box(1.5, 104, z, 7, 7, 9, '#FFF7C2', { rz: -0.5 }); g.ball(0, 109, 0, 2.2, '#FF3B47'); });
        g.block(0, 100, 0, 1.2, 8, 1.2, GREY);
      } });
    def('moon_antenna', { w: 16, d: 16, h: 100, points: 4, mass: 200,
      build(g) {
        const P = [[6, 0], [-3, 5.2], [-3, -5.2]];
        for (const [x, z] of P) limb(g, [x, 0, z], [x * 0.3, 88, z * 0.3], 1, 0.7, 4, '#E2503F');
        for (let y = 16; y < 88; y += 24) { const k = 1 - y / 88 * 0.7; for (let i = 0; i < 3; i++) { const a = P[i], b = P[(i + 1) % 3]; limb(g, [a[0] * k, y, a[1] * k], [b[0] * k, y, b[1] * k], 0.6, 0.6, 3, WHITE); } }
        g.cyl(0, 88, 0, 0.8, 0.8, 8, 4, GREY); g.ball(4, 76, 0, 5, WHITE, { sx: 0.35, rz: 0.4 });
        g.glowing(() => g.ball(0, 97, 0, 2.6, '#FF3B47', { detail: 1 }));
      } });
    // ---------- vehicles & medium ----------
    def('moon_rover', { w: 80, d: 46, h: 42, points: 6, mass: 1500, tints: ACC,
      build(g) {
        for (const x of [-26, 0, 26]) for (const z of [-19, 19]) { g.cyl(x, 4, z, 8, 8, 8, 10, DARK, { rx: Math.PI / 2 }); g.cyl(x, 7.5, z * 1.13, 3.6, 3.6, 1, 8, SILVER, { rx: Math.PI / 2 }); }
        g.block(0, 9, 0, 76, 10, 34, '#FFF', { tint: true }); g.block(0, 9, 0, 78, 3, 36, WHITE);
        g.ball(14, 19, 0, 15, GLASS, { sy: 0.75, detail: 1 }); g.block(14, 17, 0, 32, 4, 30, WHITE);
        g.box(-22, 26, 0, 28, 1.5, 30, '#3557E0', { rz: 0.25 }); g.block(-22, 19, 0, 3, 6, 3, GREY);
        g.block(-34, 19, 12, 1.2, 20, 1.2, GREY); g.ball(-34, 39, 12, 2, '#FFF', { tint: true });
        g.glowing(() => { for (const z of [-11, 11]) g.panel('x+', 39.3, 14, z, 7, 4, '#FFF7C2'); g.block(14, 31, 0, 6, 2.4, 14, '#FF3B47'); });
      } });
    def('moon_dish', { w: 60, d: 60, h: 72, points: 8, mass: 2000,
      build(g) {
        g.block(0, 0, 0, 30, 6, 30, SILVER); g.cyl(0, 6, 0, 4, 5, 30, 8, GREY);
        g.cyl(0, 30, 6, 30, 6, 12, 14, WHITE, { rx: 0.65 }); g.cyl(0, 36, 10, 24, 24, 0.8, 14, '#E3E7F5', { rx: 0.65 });
        limb(g, [0, 37, 9], [0, 56, 26], 1, 1, 4, GREY); g.glowing(() => g.ball(0, 57, 27, 3, '#5EF0FF'));
      } });
    def('moon_lander', { w: 92, d: 92, h: 96, points: 10, mass: 4000,
      build(g) {
        for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { limb(g, [x * 22, 40, z * 22], [x * 40, 4, z * 40], 2, 2, 5, SILVER); g.cyl(x * 40, 0, z * 40, 6, 6, 3, 8, GREY); }
        g.cyl(0, 22, 0, 30, 30, 30, 8, GOLD, { ry: Math.PI / 8 }); g.cone(0, 10, 0, 12, 14, 8, GREY, { rx: Math.PI });
        g.block(0, 52, 0, 40, 26, 36, WHITE); g.block(-12, 78, 0, 18, 10, 20, SILVER);
        g.glowing(() => { g.panel('z+', 8, 66, 18.3, 12, 9, '#5EF0FF'); g.ball(16, 84, 10, 2.2, '#FF3B47'); });
        g.block(16, 78, 10, 1, 8, 1, GREY); g.ball(20, 90, -8, 6, WHITE, { sx: 0.3, rz: 0.6 }); g.block(-20, 60, 18.3, 10, 6, 0.6, '#FF5AC8');
      } });
    def('moon_tube', { w: 110, d: 40, h: 40, points: 6, mass: 3000, tints: ACC,
      build(g) {
        for (const x of [-38, 38]) g.block(x, 0, 0, 8, 10, 30, GREY);
        g.cyl(0, 22 - 55, 0, 17, 17, 110, 12, WHITE, { rz: Math.PI / 2 });
        for (const x of [-48, 0, 48]) g.cyl(x, 22 - 3, 0, 19, 19, 6, 12, '#FFF', { tint: true, rz: Math.PI / 2 });
        g.glowing(() => { for (const x of [-24, 24]) { g.panel('z+', x, 24, 17.2, 26, 6, '#5EF0FF'); g.panel('z-', x, 24, -17.2, 26, 6, '#5EF0FF'); } });
      } });
    def('moon_tank', { w: 70, d: 70, h: 120, points: 12, mass: 8000, tints: ACC,
      build(g) {
        for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.block(x * 22, 0, z * 22, 6, 22, 6, GREY);
        g.block(0, 16, 0, 56, 6, 56, SILVER);
        g.cyl(0, 22, 0, 30, 30, 70, 12, WHITE); g.ball(0, 92, 0, 30, WHITE, { sy: 0.6 });
        g.cyl(0, 40, 0, 31, 31, 10, 12, '#FFF', { tint: true }); g.cyl(0, 74, 0, 31, 31, 5, 12, '#FFF', { tint: true });
        g.block(0, 108, 0, 4, 10, 4, GREY); g.glowing(() => g.ball(0, 118, 0, 2.6, '#FF3B47'));
        limb(g, [28, 30, 0], [34, 4, 0], 2, 2, 5, GREY);
      } });
    def('moon_module', { w: 130, d: 130, h: 206, points: 18, mass: 30000, tints: ACC,
      build(g) {
        for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { limb(g, [x * 52, 0, z * 52], [x * 34, 44, z * 34], 3, 3, 5, SILVER); g.cyl(x * 52, 0, z * 52, 8, 8, 3, 8, GREY); }
        g.cyl(0, 38, 0, 52, 52, 72, 12, WHITE); g.cyl(0, 60, 0, 53, 53, 10, 12, '#FFF', { tint: true });
        g.cyl(0, 110, 0, 44, 52, 14, 12, SILVER); g.cyl(0, 124, 0, 44, 44, 54, 12, WHITE); g.cyl(0, 150, 0, 45, 45, 6, 12, '#FFF', { tint: true });
        g.ball(0, 178, 0, 30, WHITE, { sy: 0.6 }); g.block(12, 190, 0, 2, 12, 2, GREY);
        for (const s of [-1, 1]) { g.block(s * 50, 140, 0, 14, 3, 3, GREY); g.box(s * 63, 141, 0, 2, 36, 52, '#3557E0'); }
        g.glowing(() => { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; g.ball(Math.cos(a) * 51, 90, Math.sin(a) * 51, 6, '#FFE58A'); } for (const a of [1.57, 3.7, 5.8]) g.ball(Math.cos(a) * 43, 138, Math.sin(a) * 43, 5, '#5EF0FF'); g.ball(12, 204, 0, 2.4, '#FF3B47'); });
        g.block(0, 38, 50, 26, 34, 10, SILVER); g.glowing(() => g.panel('z+', 0, 56, 55.3, 14, 22, '#5EF0FF'));
      } });
    def('moon_bigcrystal', { w: 90, d: 90, h: 150, points: 14, mass: 20000, tints: ['#5EF0FF', '#FF5AC8', '#B388FF', '#7BFFB0'],
      build(g) {
        g.ball(0, 4, 0, 44, '#8C91A8', { sy: 0.3 });
        g.glowing(() => { for (const [x, z, h, r, lx, lz] of [[0, 0, 100, 16, 6, 3], [24, 14, 62, 11, 14, 8], [-22, -12, 54, 11, -14, -6], [-14, 22, 44, 9, -8, 12], [18, -22, 40, 9, 10, -12]]) crystal(g, x, z, h, r, lx, lz, '#FFF'); });
      } });
    // ---------- buildings ----------
    def('moon_hab', { w: 170, d: 170, h: 112, points: 24, mass: 60000, tints: ACC,
      build(g) {
        g.cyl(0, 0, 0, 85, 85, 16, 16, SILVER); g.cyl(0, 16, 0, 80, 82, 14, 16, '#FFF', { tint: true });
        g.ball(0, 30, 0, 78, WHITE, { sy: 0.92, detail: 1 }); g.ball(0, 100, 0, 16, '#FFF', { tint: true, sy: 0.5 });
        g.glowing(() => {
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; g.ball(Math.cos(a) * 71, 58, Math.sin(a) * 71, 8, '#FFE58A', { sx: 1, sy: 1, sz: 1 }); }
          g.panel('z+', 0, 30, 88.3, 30, 22, '#5EF0FF');
        });
        g.block(0, 0, 76, 40, 44, 24, WHITE); g.block(0, 44, 76, 44, 4, 26, '#FFF', { tint: true });
        g.block(30, 104, 0, 2, 10, 2, GREY); g.glowing(() => g.ball(30, 115, 0, 2.4, '#FF3B47'));
      } });
    def('moon_greenhouse', { w: 200, d: 200, h: 122, points: 28, mass: 70000, tints: ['#7BD84A', '#3FD07A', '#9BE35A'],
      build(g) {
        g.cyl(0, 0, 0, 100, 100, 12, 18, SILVER); g.cyl(0, 12, 0, 92, 92, 3, 18, '#5FCB4E'); g.block(0, 12, 0, 184, 3.6, 16, '#E8EAF2'); g.block(0, 12, 0, 16, 3.6, 184, '#E8EAF2');
        for (const [x, z, r] of [[0, 0, 24], [-44, 40, 22], [44, -42, 22], [42, 44, 20], [-46, -42, 20], [0, 62, 13], [62, 0, 13], [-62, 0, 13], [0, -62, 13]]) { g.cyl(x, 12, z, 2.4, 3, r * 1.3, 5, '#8A5A44'); g.ball(x, 12 + r * 1.6, z, r, '#FFF', { tint: true }); }
        for (const [x, z, c] of [[-24, 56, '#FF5A8A'], [56, 22, '#FFD23F'], [-60, -22, '#FF8C42'], [22, -58, '#FF5AC8'], [24, 24, '#FFD23F'], [-24, -24, '#FF5A8A'], [70, -40, '#FF5AC8'], [-70, 40, '#FFD23F']]) g.ball(x, 20, z, 6, c);
        const R = 92, ph = [0.15, 0.5, 0.85, 1.2, 1.5];
        for (let m = 0; m < 6; m++) { const a = m / 6 * Math.PI * 2 + 0.26; for (let i = 0; i < ph.length - 1; i++) { const p0 = ph[i], p1 = ph[i + 1]; limb(g, [Math.cos(a) * Math.cos(p0) * R, 12 + Math.sin(p0) * R * 1.15, Math.sin(a) * Math.cos(p0) * R], [Math.cos(a) * Math.cos(p1) * R, 12 + Math.sin(p1) * R * 1.15, Math.sin(a) * Math.cos(p1) * R], 1.6, 1.6, 4, WHITE); } }
        for (const p of [0.6]) { const r = Math.cos(p) * R, y = 12 + Math.sin(p) * R * 1.15, n = 12; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; limb(g, [Math.cos(a0) * r, y, Math.sin(a0) * r], [Math.cos(a1) * r, y, Math.sin(a1) * r], 1.6, 1.6, 4, WHITE); } }
        g.ball(0, 12 + R * 1.15 - 2, 0, 10, WHITE, { sy: 0.5 });
        g.glowing(() => { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.ball(Math.cos(a) * 99, 8, Math.sin(a) * 99, 3, '#7BFFB0'); } });
      } });
    def('moon_bigdish', { hs: 0.9, w: 260, d: 260, h: 290, points: 48, mass: 150000,
      build(g) {
        g.block(0, 0, 0, 200, 20, 200, SILVER); g.block(0, 20, 0, 120, 30, 120, WHITE); g.cyl(0, 50, 0, 26, 34, 70, 12, GREY);
        for (const s of [-1, 1]) g.block(s * 50, 110, 0, 14, 60, 30, WHITE);
        g.cyl(0, 120, 26, 128, 26, 40, 18, WHITE, { rx: 0.75 }); g.cyl(0, 140, 40, 112, 112, 1, 18, '#E3E7F5', { rx: 0.75 });
        for (const a of [0, 2.1, 4.2]) { const x = Math.cos(a) * 100, y = Math.sin(a) * 100; limb(g, [x, 140 + y * 0.73, 40 + -y * 0.68 + 0], [0, 215, 120], 2.2, 2.2, 4, GREY); }
        g.glowing(() => { g.ball(0, 217, 122, 9, '#5EF0FF', { detail: 1 }); for (const [x, z] of [[-96, 96], [96, 96], [-96, -96], [96, -96]]) g.ball(x, 22, z, 3, '#FF5AC8'); });
        g.panel('z+', 0, 35, 60.3, 60, 14, '#FF8C42');
      } });
    def('moon_mine', { hs: 0.9, w: 300, d: 260, h: 270, points: 52, mass: 200000,
      build(g) {
        g.block(0, 0, 0, 300, 18, 260, '#8C91A8'); g.block(0, 18, 0, 290, 4, 250, '#FFD23F'); g.block(0, 18.5, 0, 270, 4, 230, '#9CA0B6');
        for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) limb(g, [-60 + x * 45, 22, z * 45], [-60 + x * 10, 250, z * 10], 3.6, 2.6, 5, '#FF8C42');
        for (let y = 60; y < 250; y += 45) { const k = 45 - (y - 22) / 228 * 35; for (const s of [-1, 1]) { g.block(-60, y, s * k, k * 2, 3, 3, '#FF8C42'); g.block(-60 + s * k, y, 0, 3, 3, k * 2, '#FF8C42'); } }
        g.block(-60, 250, 0, 30, 14, 30, '#E2503F'); g.cyl(-60, 22, 0, 6, 6, 228, 8, SILVER); g.cone(-60, 22, 0, 20, 40, 8, GREY, { rx: Math.PI });
        g.glowing(() => { g.ball(-60, 268, 0, 4, '#FF3B47'); g.cyl(-60, 22, 0, 30, 30, 2, 12, '#5EF0FF'); });
        g.block(70, 22, -40, 110, 80, 90, WHITE); g.block(70, 102, -40, 116, 6, 96, '#FF8C42'); g.glowing(() => g.panel('z+', 70, 70, 5.3, 80, 14, '#5EF0FF'));
        g.box(30, 80, 70, 150, 8, 26, GREY, { rz: 0.42 }); for (const x of [-30, 20, 70]) g.block(x, 22, 70, 5, 30 + (x + 30) * 0.42, 5, SILVER);
        g.block(110, 22, 80, 60, 40, 60, '#FFD23F'); g.glowing(() => { for (const [x, z] of [[100, 75], [118, 88], [110, 70]]) g.ball(x, 64, z, 9, '#5EF0FF'); });
        for (const [x, z] of [[-130, -100], [-130, 100], [130, 100]]) g.cyl(x, 22, z, 14, 14, 50, 10, '#FF5AC8');
      } });
    def('moon_hangar', { w: 340, d: 320, h: 180, points: 85, mass: 500000, tints: ['#FF8C42', '#2EC4B6', '#FF5AC8'],
      build(g) {
        g.block(0, 0, 0, 340, 12, 320, SILVER);
        const n = 9, R = 160;
        for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI, a1 = (i + 1) / n * Math.PI, am = (a0 + a1) / 2, c = 2 * R * Math.sin(Math.PI / n / 2);
          g.box(Math.cos(am) * R * 0.99, 12 + Math.sin(am) * R * 1.0 * 0.99, 0, c + 1, 8, 300, i % 2 ? WHITE : '#FFF', { rz: am - Math.PI / 2 + Math.PI, tint: i % 2 === 0 }); }
        g.block(0, 12, 152, 280, 110, 8, '#E3E7F5'); g.block(0, 12, -150, 300, 120, 8, '#E3E7F5');
        g.panel('z+', 0, 60, 156.3, 200, 96, DARK); for (let i = 0; i < 9; i++) g.panel('z+', -96 + i * 24, 108, 156.4, 12, 6, i % 2 ? '#FFD23F' : DARK);
        g.glowing(() => { g.panel('z+', 0, 130, 156.4, 120, 16, '#5EF0FF'); for (const x of [-140, 140]) g.ball(x, 128, 156, 5, '#FFE58A'); });
        g.block(0, 172, 0, 30, 8, 260, SILVER);
      } });
    def('moon_hq', { w: 400, d: 400, h: 250, points: 140, mass: 1500000,
      build(g) {
        g.cyl(0, 0, 0, 200, 200, 30, 24, SILVER); g.cyl(0, 30, 0, 186, 190, 26, 24, '#FF8C42');
        g.ball(0, 56, 0, 168, WHITE, { sy: 0.78, detail: 1 });
        g.glowing(() => { g.cyl(0, 74, 0, 166, 166, 14, 24, '#5EF0FF'); g.cyl(0, 150, 0, 112, 112, 8, 24, '#FF5AC8'); g.ball(0, 232, 0, 6, '#FF3B47'); });
        g.cyl(0, 186, 0, 34, 40, 10, 12, SILVER); g.cyl(0, 196, 0, 4, 4, 34, 6, GREY);
        g.cyl(70, 175, -40, 30, 8, 10, 12, WHITE, { rx: -0.5 }); g.block(70, 160, -40, 4, 18, 4, GREY);
        for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; g.block(Math.cos(a) * 180, 0, Math.sin(a) * 180, 46, 54, 46, WHITE, { ry: -a }); g.block(Math.cos(a) * 180, 54, Math.sin(a) * 180, 50, 5, 50, '#2EC4B6', { ry: -a }); }
        g.block(0, 0, 190, 70, 60, 30, WHITE); g.glowing(() => g.panel('z+', 0, 26, 205.3, 40, 40, '#5EF0FF')); g.block(0, 60, 192, 76, 6, 34, '#FFD23F');
      } });
    def('moon_rocket', { hs: 0.62, w: 560, d: 560, h: 1120, points: 340, mass: 6000000,
      build(g) {
        g.block(0, 0, 0, 560, 20, 560, '#A7ACBE'); g.block(0, 20, 0, 520, 3, 520, '#C5C9D6');
        for (let i = 0; i < 12; i++) { const t = -253 + i * 46 + 23; const c = i % 2 ? DARK : '#FFD23F';
          g.block(t, 20, 266, 46, 4, 14, c); g.block(t, 20, -266, 46, 4, 14, c); g.block(266, 20, t, 14, 4, 46, c); g.block(-266, 20, t, 14, 4, 46, c); }
        const X = -50;
        g.glowing(() => { g.cyl(X, 20, 0, 110, 110, 4, 20, '#FFB01F'); g.cyl(X, 21, 0, 84, 84, 4, 20, '#FF6A1A'); });
        g.cyl(X, 24, 0, 72, 86, 40, 14, SILVER);
        g.cyl(X, 64, 0, 72, 72, 620, 14, WHITE); g.cyl(X, 290, 0, 73.5, 73.5, 44, 14, '#FF8C42'); g.cyl(X, 560, 0, 73.5, 73.5, 26, 14, '#2EC4B6');
        g.cyl(X, 684, 0, 62, 72, 50, 14, WHITE); g.cyl(X, 734, 0, 62, 62, 120, 14, WHITE); g.cyl(X, 804, 0, 63.5, 63.5, 14, 14, '#FF5AC8');
        g.cone(X, 854, 0, 62, 210, 14, '#FF5A5F'); g.ball(X, 1066, 0, 8, '#FFD23F');
        for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; g.box(X + Math.cos(a) * 96, 120, Math.sin(a) * 96, 52, 150, 8, '#FF5AC8', { ry: -a }); g.box(X + Math.cos(a) * 120, 54, Math.sin(a) * 120, 8, 40, 8, '#FF5AC8', { ry: -a }); }
        for (const z of [-114, 114]) { g.cyl(X, 40, z, 36, 36, 470, 12, '#E8EAF4'); g.cyl(X, 360, z, 37, 37, 20, 12, '#FF8C42'); g.cone(X, 510, z, 36, 90, 12, '#2EC4B6'); g.cone(X, 24, z, 26, 18, 10, GREY); limb(g, [X, 200, z * 0.66], [X, 200, z * 0.86], 4, 4, 6, SILVER); limb(g, [X, 470, z * 0.66], [X, 470, z * 0.86], 4, 4, 6, SILVER); }
        g.glowing(() => { for (const [y, r] of [[630, 14], [770, 12], [700, 10]]) g.ball(X, y, 71, r, '#FFE58A', { sz: 0.35 }); for (const z of [-114, 114]) g.ball(X, 26, z, 18, '#FFB01F', { sy: 0.4 }); });
        for (const [y, r] of [[630, 14], [770, 12], [700, 10]]) g.cyl(X, y - 2, 69, r + 4, r + 4, 4, 12, SILVER, { rx: Math.PI / 2 });
        // Launch tower.
        const TX = 170, TW = 34;
        for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.block(TX + sx * TW, 20, sz * TW, 10, 1000, 10, '#E2503F');
        for (let y = 80; y <= 1000; y += 100) { for (const s of [-1, 1]) { g.block(TX, y, s * TW, TW * 2, 6, 6, '#E2503F'); g.block(TX + s * TW, y, 0, 6, 6, TW * 2, '#E2503F'); } if (y < 1000) { limb(g, [TX - TW, y, TW + 1], [TX + TW, y + 100, TW + 1], 2.4, 2.4, 4, '#C83E30'); limb(g, [TX - TW, y, -TW - 1], [TX + TW, y + 100, -TW - 1], 2.4, 2.4, 4, '#C83E30'); } }
        g.block(TX, 1020, 0, 90, 12, 90, '#E2503F'); g.block(TX, 1032, 0, 4, 60, 4, GREY);
        for (const y of [450, 800]) { g.block(X + 70 + (TX - TW - X - 70) / 2, y, 0, TX - TW - X - 70, 14, 22, SILVER); g.block(X + 70 + (TX - TW - X - 70) / 2, y + 14, 0, TX - TW - X - 70, 3, 22, '#FFD23F'); }
        g.glowing(() => { g.ball(TX, 1094, 0, 7, '#FF3B47'); for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.ball(TX + sx * 44, 1036, sz * 44, 5, '#FF3B47'); for (let y = 200; y < 1000; y += 200) g.ball(TX + TW + 6, y, TW + 6, 4, '#FFE58A'); });
        g.block(TX + 80, 20, 140, 60, 40, 60, WHITE); g.glowing(() => g.panel('z+', TX + 80, 30, 170.3, 40, 12, '#5EF0FF'));
      } });
  }

  // ---- layout helpers ----
  function segDist(px, pz, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz; let t = L ? ((px - a[0]) * dx + (pz - a[1]) * dz) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t); }
  function polyDist(px, pz, pts, closed) { let d = 1e9; for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) d = Math.min(d, segDist(px, pz, pts[i], pts[(i + 1) % pts.length])); return d; }
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
  const circle = (cx, cz, r, n, a0 = 0) => { const p = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; p.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return p; };

  // Districts (x east, z south; camera looks north).
  const D = {
    hub: { x: 2500, z: 2650, r: 720 }, launch: { x: 2500, z: 680, r: 430 }, mine: { x: 850, z: 950, r: 400 }, scope: { x: 4150, z: 950, r: 500 },
    green: { x: 820, z: 2580, r: 420 }, solar: { x: 4180, z: 2650, r: 380 }, padW: { x: 1000, z: 4200, r: 420 }, padE: { x: 4000, z: 4200, r: 420 }, crater: { x: 2500, z: 4400, r: 430 },
  };
  const LOOP = chaikin([[1500, 1550], [2500, 1350], [3500, 1550], [3750, 2650], [3500, 3700], [2500, 3800], [1500, 3700], [1250, 2650]], 3, true);
  const SOUTH = chaikin([[1000, 3680], [1700, 3900], [2500, 3880], [3300, 3900], [4000, 3680], [4760, 4250], [4000, 4840], [2500, 4930], [1000, 4840], [240, 4250]], 3, true);
  const SPURS = [[[2500, 1350], [2500, 1110]], [[1500, 1550], [1100, 1250]], [[3500, 1550], [3900, 1270]], [[1250, 2650], [1180, 2650]], [[3750, 2650], [3800, 2650]]].map((p) => chaikin(p, 1, false));

  HC.Levels.add({
    id: 'moon', num: 10, name: 'Lunar Base', tagline: 'Moon base · low gravity, rovers & a rocket', icon: '🚀', colors: ['#3B3B8F', '#FF5AC8'],
    theme: { sky: '#06061A', fogNear: 15000, fogFar: 32000, sea: { show: true, deep: '#07071A', shallow: '#1B1B3A', foam: 0 }, stars: true, skirt: '#8E92A6',
      hemiSky: '#E2E8FF', hemiGround: '#8A80C8', hemi: 1.45, sun: '#FFFFFF', sunI: 2.6, glow: 0.6 },
    mods: { gravity: 0.4, botSkill: -0.1 },
    milestones: [['moon_rover', '🛻 Moon rovers'], ['moon_lander', '🛸 Landers'], ['moon_tank', '🛢️ Fuel tanks'], ['moon_bigcrystal', '💎 Giant crystals'], ['moon_hab', '🏠 Habitat domes'], ['moon_greenhouse', '🌱 Greenhouses'],
      ['moon_bigdish', '📡 Radio telescopes'], ['moon_mine', '⛏️ The mine'], ['moon_hangar', '🛰️ Hangars'], ['moon_hq', '🌐 Command HQ'], ['moon_rocket', '🚀 THE ROCKET']],
    kinds,
    generate(T) {
      const rng = T.rng;
      // Remember the footprint of every big static thing so later clutter never lands inside one
      // (T.free alone only checks a circle, which misses box corners).
      const bigs = [], put0 = T.put, free0 = T.free;
      const inBig = (x, z, r) => { for (const b of bigs) { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < b.w + r && Math.abs(lz) < b.d + r) return true; } return false; };
      T.put = (kind, x, z, rot = 0, extra = {}) => { const o = put0(kind, x, z, rot, extra), k = HC.CATALOG[kind]; if (o && !extra.mover && k.minDim >= 60) bigs.push({ x, z, w: k.w / 2, d: k.d / 2, c: Math.cos(rot), s: Math.sin(rot) }); return o; };
      let trackBlock = null;
      T.free = (x, z, r) => free0(x, z, r) && !inBig(x, z, r) && !(trackBlock && r > 12 && trackBlock(x, z, r));
      T.island({ ground: COL.ground, edge: COL.edge });
      for (let i = 0; i < 26; i++) { const r = rng.range(260, 560); T.disc(rng.range(r * 1.25 - 250, 5250 - r * 1.25), rng.range(r * 1.25 - 250, 5250 - r * 1.25), r, 0.1, COL.mare, 20, rng.range(0.75, 1.25), rng.range(0.75, 1.25)); }
      for (let i = 0; i < 60; i++) { const r = rng.range(80, 210); T.disc(rng.range(r * 1.2 - 250, 5250 - r * 1.2), rng.range(r * 1.2 - 250, 5250 - r * 1.2), r, 0.2, i % 2 ? COL.mottleA : COL.mottleB, 14, rng.range(0.8, 1.2), rng.range(0.8, 1.2)); }
      const ribbon = (pts, w, y, color, closed) => { along(pts, w * 0.3, (x, z) => T.disc(x, z, w / 2, y, color, 14), closed); if (!closed) { const e = pts[pts.length - 1]; T.disc(e[0], e[1], w / 2, y, color, 14); } };
      const tracks = [[LOOP, true], [SOUTH, true], ...SPURS.map((p) => [p, false])];
      for (const [p, c] of tracks) { ribbon(p, 104, 2.2, COL.trackEdge, c); ribbon(p, 88, 2.4, COL.track, c); along(p, 30, (x, z, nx, nz) => { for (const o of [-22, 22]) T.disc(x + nx * o, z + nz * o, 4.5, 2.6, COL.rut, 6); }, c); }
      const nearTrack = (x, z, m) => { for (const [p, c] of tracks) if (polyDist(x, z, p, c) < 52 + m) return true; return false; };
      trackBlock = (x, z, r) => nearTrack(x, z, r * 0.85);
      const inD = (x, z, m, skip) => { for (const k in D) { if (k === skip) continue; const c = D[k]; if (Math.hypot(x - c.x, z - c.z) < c.r + m) return true; } return false; };
      const onLand = (x, z, m = 0) => x > -200 + m && x < 5200 - m && z > -200 + m && z < 5200 - m;
      const place = (kind, x, z, rot, o = {}) => {
        const k = HC.CATALOG[kind], rr = k.radius * (o.k ?? 0.7);
        for (let i = 0; i < (o.tries ?? 14); i++) {
          const px = x + (i ? rng.range(-1, 1) * (o.jit ?? 100) : 0), pz = z + (i ? rng.range(-1, 1) * (o.jit ?? 100) : 0);
          if (!onLand(px, pz, 40) || !T.free(px, pz, rr + (o.gap ?? 4)) || nearTrack(px, pz, rr) || (o.avoidD && inD(px, pz, rr))) continue;
          return T.put(kind, px, pz, rot == null ? rng() * 6.28 : rot, o.extra || {});
        }
        return null;
      };
      // Like T.line, but skips spots that are already taken.
      const lineFree = (kind, x0, z0, x1, z1, step, rotOff = 0) => { const k = HC.CATALOG[kind], len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.floor(len / step)), rot = Math.atan2(-(z1 - z0), x1 - x0) + rotOff;
        const ux = (x1 - x0) / len, uz = (z1 - z0) / len, e = Math.max(0, (k.w - k.d) / 2), r = k.d / 2;
        for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if ([-1, 0, 1].every((s) => T.free(x + ux * e * s, z + uz * e * s, r) && !nearTrack(x + ux * e * s, z + uz * e * s, r))) T.put(kind, x, z, rot); } };
      const sprinkle = (w, area, n, gap = 8, o = {}) => T.scatter(w, area, n, { gap, avoid: (x, z) => !onLand(x, z, 40) || (o.track && nearTrack(x, z, 4)) || (o.avoidD && inD(x, z, 0)) });
      // Crater decal: lit rim, shaded bowl.
      const crater = (x, z, r) => {
        T.disc(x, z, r * 1.16, 0.5, COL.rim, 24); T.disc(x, z, r * 0.96, 0.7, COL.floor, 24);
        T.disc(x - r * 0.1, z - r * 0.12, r * 0.8, 0.8, COL.floorDark, 20); T.disc(x + r * 0.1, z + r * 0.1, r * 0.66, 0.9, COL.floorLight, 20);
      };
      const ROCKS = { moon_rock: 6, moon_crystal: 2 };

      // ---- Launch complex (landmark) ----
      const L = D.launch;
      T.disc(L.x, L.z, L.r + 30, 1.2, '#9EA2B4', 40); T.disc(L.x, L.z, L.r, 1.4, COL.pad, 40);
      T.ring(L.x, L.z, L.r - 26, L.r - 12, 1.6, COL.padLine, 48);
      T.put('moon_rocket', L.x, L.z, 0);
      for (const [dx, dz] of [[-345, -150], [345, -150], [-345, 120], [345, 120]]) T.put('moon_tank', L.x + dx, L.z + dz, 0);
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; if (Math.sin(a) > 0.95) continue; T.put('moon_beacon', L.x + Math.cos(a) * 405, L.z + Math.sin(a) * 405); }
      for (const a of [1.2, 1.95]) T.put('moon_antenna', L.x + Math.cos(a) * 340, L.z + Math.sin(a) * 340);
      sprinkle({ moon_crate: 3, moon_astro: 1, moon_beacon: 1, moon_cargo: 2 }, { x: L.x, z: L.z, r: L.r - 30, r0: 300 }, 26);
      T.walkLoop(circle(L.x, L.z, 335, 16), 8, { moon_astro: 1 }, { speed: [24, 36] });

      place('moon_hangar', L.x - 730, L.z + 60, 0, { jit: 60 });
      // ---- Command hub: HQ, ring of habitat domes linked by tube corridors ----
      const H = D.hub;
      T.disc(H.x, H.z, 330, 1.4, COL.plaza, 40); T.ring(H.x, H.z, 316, 330, 1.6, COL.plazaRing, 48); T.ring(H.x, H.z, 250, 258, 1.6, '#FF8C42', 48);
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; T.disc(H.x + Math.cos(a) * 290, H.z + Math.sin(a) * 290, 8, 1.7, i % 2 ? '#FF5AC8' : '#FFD23F', 8); }
      T.put('moon_hq', H.x, H.z, 0);
      for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * 6.28; T.put('moon_light', H.x + Math.cos(a) * 345, H.z + Math.sin(a) * 345, -a); }
      const HAB = circle(H.x, H.z, 600, 6, Math.PI / 6);
      HAB.forEach(([x, z], i) => {
        T.disc(x, z, 112, 1.3, '#B9BCCB', 24); T.put('moon_hab', x, z, Math.atan2(x - H.x, z - H.z), { tint: i % 4 });
        const [nx, nz] = HAB[(i + 1) % 6], ux = (nx - x) / 600, uz = (nz - z) / 600;
        T.line('moon_tube', x + ux * 98, z + uz * 98, nx - ux * 98, nz - uz * 98, 112);
        const sx = (H.x - x) / 600, sz = (H.z - z) / 600;
        if (i % 2 === 0) T.line('moon_tube', x + sx * 96, z + sz * 96, H.x - sx * 236, H.z - sz * 236, 112);
      });
      for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * 6.28 + Math.PI / 6; const x = H.x + Math.cos(a) * 470, z = H.z + Math.sin(a) * 470;
        sprinkle({ moon_crate: 3, moon_beacon: 2, moon_rock: 2, moon_panel: 1 }, { x, z, r: 110 }, 7); }
      for (let i = 0; i < 6; i += 2) { const a = (i + 0.5) / 6 * 6.28 + Math.PI / 6; place('moon_module', H.x + Math.cos(a) * 640, H.z + Math.sin(a) * 640, rng() * 6, { jit: 40 }); }
      T.walkLoop(circle(H.x, H.z, 280, 20), 14, { moon_astro: 1 }, { speed: [22, 36] });
      T.roamers({ moon_bot: 1 }, H.x, H.z, 420, 10, { speed: [26, 42] });
      sprinkle({ moon_crate: 2, moon_beacon: 3, moon_astro: 1 }, { x: H.x, z: H.z, r: 320, r0: 225 }, 18);

      // ---- Crystal mine ----
      const M = D.mine;
      T.disc(M.x, M.z, M.r + 40, 0.9, '#B8B0CC', 30); T.disc(M.x, M.z, M.r - 40, 1.0, COL.dust, 30);
      T.put('moon_mine', M.x, M.z - 40, 0);
      for (const [dx, dz] of [[-250, 160], [230, 190], [-260, -190], [40, 260], [260, -150]]) place('moon_bigcrystal', M.x + dx, M.z + dz, rng() * 6, { jit: 40 });
      place('moon_hangar', M.x + 60, M.z + 560, 0, { jit: 60 });
      sprinkle({ moon_crystal: 5, moon_rock: 3, moon_boulder: 1, moon_cargo: 1 }, { x: M.x, z: M.z, r: M.r + 60, r0: 150 }, 56);
      T.roamers({ moon_bot: 1 }, M.x, M.z + 60, 280, 7, { speed: [24, 40] });
      T.loopVehicles({ moon_rover: 1 }, circle(M.x, M.z - 40, 230, 14), 2, [50, 70]);

      // ---- Radio telescope array ----
      const S = D.scope;
      T.disc(S.x, S.z, S.r + 30, 1.0, '#D3D5E0', 30);
      for (const [dx, dz] of [[-300, -190], [0, -230], [300, -190], [-160, 140], [160, 140]]) { T.disc(S.x + dx, S.z + dz, 140, 1.2, COL.pad, 24); T.put('moon_bigdish', S.x + dx, S.z + dz, 0); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + 0.4; place('moon_dish', S.x + Math.cos(a) * 470, S.z + Math.sin(a) * 430, 0, { jit: 40 }); }
      place('moon_module', S.x, S.z + 380, 0, { jit: 40 });
      for (const [dx, dz] of [[-330, 150], [330, 150], [0, -360], [-340, -300], [340, -300]]) place('moon_antenna', S.x + dx, S.z + dz, 0, { jit: 30 });
      sprinkle({ moon_rock: 3, moon_beacon: 2, moon_crate: 1, moon_astro: 1 }, { x: S.x, z: S.z, r: S.r + 40, r0: 120 }, 36);
      T.walkLoop(circle(S.x, S.z, 300, 14), 6, { moon_astro: 1 }, { speed: [22, 34] });

      // ---- Greenhouse village ----
      const G = D.green;
      T.disc(G.x, G.z, G.r + 30, 1.0, '#D3D5E0', 30);
      const GH = [[G.x - 160, G.z - 170], [G.x + 160, G.z - 170], [G.x - 160, G.z + 150], [G.x + 160, G.z + 150], [G.x - 160, G.z + 470], [G.x + 160, G.z + 470]];
      GH.forEach(([x, z]) => T.put('moon_greenhouse', x, z, 0));
      T.line('moon_tube', GH[0][0] + 104, GH[0][1], GH[1][0] - 104, GH[1][1], 72); T.line('moon_tube', GH[2][0] + 104, GH[2][1], GH[3][0] - 104, GH[3][1], 72);
      T.line('moon_tube', GH[0][0], GH[0][1] + 104, GH[2][0], GH[2][1] - 104, 72);
      T.put('moon_hab', G.x + 30, G.z - 440, 0, { tint: 1 }); T.line('moon_tube', GH[2][0], GH[2][1] + 104, GH[4][0], GH[4][1] - 104, 72); T.line('moon_tube', GH[4][0] + 104, GH[4][1], GH[5][0] - 104, GH[5][1], 72);
      sprinkle({ moon_crate: 3, moon_astro: 1, moon_bot: 1, moon_beacon: 1 }, { x: G.x, z: G.z, r: G.r + 60 }, 34);
      T.walkLoop([[G.x - 300, G.z - 320], [G.x + 300, G.z - 320], [G.x + 300, G.z + 610], [G.x - 300, G.z + 610]], 7, { moon_astro: 1 }, { speed: [22, 34] });

      // ---- Solar farm ----
      const F = D.solar;
      T.rect(F.x - 330, F.z - 300, F.x + 330, F.z + 300, 1.0, COL.farm);
      for (let r = 0; r < 7; r++) T.line('moon_panel', F.x - 320, F.z - 255 + r * 85, F.x + 320, F.z - 255 + r * 85, 48, { rot: 0 });
      for (let r = 0; r < 6; r++) T.rect(F.x - 320, F.z - 213 + r * 85 - 2, F.x + 320, F.z - 213 + r * 85 + 2, 1.2, '#FFD23F');
      T.roamers({ moon_bot: 1 }, F.x, F.z, 300, 6, { speed: [22, 36] });
      for (const [dx, dz] of [[-380, -340], [380, -340], [380, 340], [-380, 340]]) place('moon_antenna', F.x + dx, F.z + dz, 0, { jit: 20 });
      place('moon_tank', F.x + 420, F.z, 0, { jit: 40 }); place('moon_tank', F.x - 420, F.z + 40, 0, { jit: 40 });

      // ---- Landing pads with hangars ----
      const pads = (P, flip) => {
        T.disc(P.x, P.z, P.r + 30, 1.0, '#D3D5E0', 30);
        T.put('moon_hangar', P.x + flip * 220, P.z + 20, 0);
        for (const [dx, dz] of [[-flip * 170, -190], [-flip * 190, 160]]) {
          const x = P.x + dx, z = P.z + dz;
          T.disc(x, z, 112, 1.4, COL.pad, 28); T.ring(x, z, 96, 104, 1.6, '#FF8C42', 28); T.rect(x - 50, z - 6, x + 50, z + 6, 1.7, COL.padLine); T.rect(x - 6, z - 50, x + 6, z + 50, 1.7, COL.padLine);
          T.put('moon_lander', x, z, rng() * 6);
          for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; T.put('moon_beacon', x + Math.cos(a) * 120, z + Math.sin(a) * 120); }
        }
        for (let i = 0; i < 3; i++) T.put('moon_rover', P.x + flip * 100 + i * 70 * flip, P.z + 250, Math.PI / 2);
        for (let i = 0; i < 5; i++) place('moon_cargo', P.x + flip * 60 + i * 60 * flip, P.z - 220, 0, { jit: 20 });
        place('moon_tank', P.x - flip * 380, P.z, 0, { jit: 30 });
        sprinkle({ moon_crate: 4, moon_astro: 1, moon_beacon: 1 }, { x: P.x, z: P.z, r: P.r + 60 }, 40);
        T.walkLoop(circle(P.x - flip * 180, P.z, 260, 14), 6, { moon_astro: 1 }, { speed: [22, 34] });
      };
      pads(D.padW, -1); pads(D.padE, 1);

      // ---- Crater park: one giant crater with explorers ----
      const C = D.crater;
      crater(C.x, C.z, C.r - 40);
      for (const [dx, dz] of [[-120, -60], [140, 40], [0, 160]]) place('moon_bigcrystal', C.x + dx, C.z + dz, rng() * 6, { jit: 30 });
      sprinkle({ moon_rock: 5, moon_crystal: 4, moon_boulder: 2 }, { x: C.x, z: C.z, r: C.r - 60 }, 60);
      T.walkLoop(circle(C.x, C.z, C.r - 20, 18), 10, { moon_astro: 1 }, { speed: [20, 32] });
      T.roamers({ moon_bot: 1 }, C.x, C.z, 300, 5, { speed: [22, 36] });

      // ---- Rovers on the dusty tracks; marker beacons along them ----
      T.loopVehicles({ moon_rover: 1 }, LOOP, 9, [70, 105]);
      T.loopVehicles({ moon_rover: 1 }, SOUTH, 7, [70, 105]);
      for (const [p, c] of tracks.slice(0, 2)) along(p, 70, (x, z, nx, nz, i) => { const s = i % 2 ? 1 : -1, kind = i % 3 === 0 ? 'moon_light' : T.pick({ moon_rock: 2, moon_crystal: 2, moon_crate: 2, moon_beacon: 1, moon_cargo: 1 }), off = 56 + HC.CATALOG[kind].radius * 0.8, ox = x + nx * off * s, oz = z + nz * off * s; if (!inD(ox, oz, 10) && T.free(ox, oz, HC.CATALOG[kind].radius * 0.75 + 4)) T.put(kind, ox, oz, rng() * 6); }, c);

      // ---- Spawn points on open regolith ----
      const SP = [[H.x - 380, H.z + 140], [H.x + 380, H.z + 140], [H.x, H.z - 400], [L.x - 40, L.z + 520], [M.x + 60, M.z + 480], [S.x - 60, S.z + 500], [G.x + 470, G.z - 120], [F.x - 480, F.z + 100],
        [D.padW.x + 60, D.padW.z - 520], [D.padE.x - 60, D.padE.z - 520], [C.x, C.z - 420], [1650, 1950], [3350, 1950], [1650, 3350], [3350, 3350], [600, 4850], [4400, 4850], [2500, 2000]];
      for (const [x, z] of SP) { T.spawnAt(x, z); sprinkle({ moon_rock: 3, moon_crystal: 2 }, { x, z, r: 140, r0: 30 }, 13, 5); sprinkle({ moon_rock: 3, moon_crystal: 2, moon_crate: 2, moon_beacon: 1 }, { x, z, r: 300, r0: 130 }, 9); sprinkle({ moon_cargo: 2, moon_light: 1, moon_crate: 2 }, { x, z, r: 320, r0: 120 }, 4, 10); T.roamers({ moon_bot: 1, moon_astro: 1 }, x, z, 140, 1, { speed: [20, 32] }); }

      // ---- Crater fields across the open regolith ----
      const craters = [];
      for (let t = 0; t < 6000 && craters.length < 46; t++) {
        const r = craters.length < 12 ? rng.range(160, 260) : rng.range(55, 130), x = rng.range(100, 4900), z = rng.range(100, 4900);
        if (inD(x, z, r + 20) || nearTrack(x, z, r) || craters.some((c) => Math.hypot(c[0] - x, c[1] - z) < c[2] + r + 120)) continue;
        craters.push([x, z, r]);
      }
      craters.forEach(([x, z, r], i) => {
        crater(x, z, r);
        sprinkle(ROCKS, { x, z, r: r * 0.85 }, Math.round(1 + r / 32));
        sprinkle({ moon_boulder: 3, moon_rock: 2 }, { x, z, r: r * 1.35, r0: r * 1.02 }, Math.round(1 + r / 70), 10);
        if (r > 150) place('moon_bigcrystal', x, z, rng() * 6, { jit: r * 0.4 });
        else if (i % 3 === 0) place('moon_dish', x + r * 1.5, z, 0, { jit: 40 });
      });
      // Supply depots dotted over the open regolith: cargo, crates, a light mast and something bigger.
      const depots = [];
      for (let t = 0; t < 5000 && depots.length < 34; t++) {
        const x = rng.range(150, 4850), z = rng.range(150, 4850);
        if (inD(x, z, 120) || nearTrack(x, z, 90) || craters.some((c) => Math.hypot(c[0] - x, c[1] - z) < c[2] + 90) || depots.some((d) => Math.hypot(d[0] - x, d[1] - z) < 380)) continue;
        depots.push([x, z]);
      }
      depots.forEach(([x, z], i) => {
        T.disc(x, z, 150, 1.0, i % 2 ? COL.mottleB : '#D3D5E0', 20); T.ring(x, z, 150, 158, 1.1, ACC[i % 4], 24);
        const big = ['moon_tank', 'moon_lander', 'moon_module', 'moon_dish', 'moon_bigcrystal'][i % 5]; place(big, x, z, rng() * 6, { jit: 30 });
        T.scatter({ moon_cargo: 3, moon_crate: 3, moon_light: 1, moon_antenna: 1, moon_panel: 1 }, { x, z, r: 175, r0: 50 }, 9, { gap: 8 });
        sprinkle({ moon_rock: 2, moon_crystal: 2, moon_beacon: 1, moon_astro: 1 }, { x, z, r: 200 }, 4);
      });
      // Loose regolith clutter between everything.
      sprinkle({ moon_rock: 4, moon_crystal: 2, moon_boulder: 2, moon_crate: 2 }, { x0: -150, z0: -150, x1: 5150, z1: 5150 }, 35, 10, { track: true, avoidD: true });
      for (let i = 0; i < 20; i++) place('moon_antenna', rng.range(200, 4800), rng.range(200, 4800), 0, { avoidD: true, jit: 200 });
      for (let i = 0; i < 10; i++) place('moon_tank', rng.range(300, 4700), rng.range(300, 4700), 0, { avoidD: true, jit: 200 });
      for (let i = 0; i < 9; i++) place('moon_module', rng.range(300, 4700), rng.range(300, 4700), rng() * 6, { avoidD: true, jit: 300, gap: 20, tries: 30 });
      // Little outposts: a dome or greenhouse, a tank, a solar row, a corridor stub and some cargo.
      const OUT = [[1550, 700], [3450, 700], [250, 1850], [4750, 1850], [1700, 2350], [3300, 2350], [250, 3550], [4750, 3550], [1700, 3000], [3300, 3000], [2500, 3500], [1600, 4500], [3400, 4500], [250, 300], [4750, 300], [1900, 1700], [3100, 1700]];
      for (const [ox, oz] of OUT) {
        const k = rng.chance(0.65) ? 'moon_hab' : 'moon_greenhouse', o = place(k, ox, oz, rng.int(0, 3) * Math.PI / 2, { avoidD: true, jit: 320, gap: 20, tries: 40 }); if (!o) continue;
        const a = rng() * 6.28, cx = Math.cos(a), cz = Math.sin(a), r0 = k === 'moon_hab' ? 92 : 108;
        T.disc(o.x, o.z, r0 + 30, 1.1, '#D3D5E0', 24);
        lineFree('moon_tube', o.x + cx * r0, o.z + cz * r0, o.x + cx * (r0 + 224), o.z + cz * (r0 + 224), 112);
        place('moon_tank', o.x + cx * (r0 + 290), o.z + cz * (r0 + 290), 0, { jit: 40 });
        const px = o.x - cz * 170, pz = o.z + cx * 170; lineFree('moon_panel', px - cx * 130, pz - cz * 130, px + cx * 130, pz + cz * 130, 52);
        sprinkle({ moon_crate: 3, moon_beacon: 2, moon_cargo: 2, moon_light: 1 }, { x: o.x, z: o.z, r: 280, r0: 110 }, 10);
        T.roamers({ moon_astro: 2, moon_bot: 1 }, o.x, o.z, 220, 2, { speed: [20, 32] });
      }
      for (let i = 0; i < 6; i++) place('moon_lander', rng.range(300, 4700), rng.range(300, 4700), rng() * 6, { avoidD: true, jit: 300 });
      T.beach({ moon_rock: 5, moon_crystal: 2, moon_boulder: 1 }, 10, { inner: -170, outer: -60 });
    },
  });
})();
