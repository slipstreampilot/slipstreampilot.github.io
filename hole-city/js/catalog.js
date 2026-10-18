// Object catalog: every swallowable thing in the city.
// w/d/h = collider box in world units (x, z, y). Whether a hole can swallow it is decided by physics:
// it has to physically tip and fall through the opening, exactly like hole.io.
// `build(g)` draws the low-poly mesh (origin = center of the footprint on the ground).
// Parts drawn with {tint:true} take each instance's color from `tints`.
(function () {
  const P = {
    skin: ['#FFD3B0', '#F2B48C', '#C98B62', '#8D5A3B', '#FFE0C7'],
    shirts: ['#FF5A5F', '#FFB400', '#00A699', '#3D7BFF', '#9B5DE5', '#F15BB5', '#00BBF9', '#FEE440', '#00F5D4', '#FF8C42', '#7AE582'],
    cars: ['#FF4757', '#FFC312', '#1E90FF', '#2ED573', '#F8F8FF', '#FF7F50', '#A55EEA', '#22D3EE', '#FF6BB5'],
    walls: ['#FF7B72', '#FFB45E', '#FFD95C', '#7BE0AD', '#5CC8FF', '#B79BFF', '#FF9FD2', '#4FD1C5', '#FFF4E3', '#FF9E7A'],
    towers: ['#7CC6FF', '#9AE3D9', '#B3A6FF', '#FFC1D9', '#A6E3FF', '#C9F2C7'],
    trees: ['#38C55A', '#4FD86A', '#2FB86E', '#7DDB48', '#24B47E'],
    blossoms: ['#FF9FD2', '#FFB3E0', '#FFD1E8'],
    flowers: ['#FF5A8A', '#FFD23F', '#B388FF', '#FF8C42', '#5EE6FF'],
  };
  const WIN = '#AEEBFF', LIT = '#FFF1A8', DARK = '#3A3F58', TIRE = '#2B2D42', GLASS = '#9FE7FF';

  const K = {};
  // Register a kind. Levels call HC.defKind() to add their own objects.
  // o.hs squashes a tall building vertically (mesh and collider) so the camera can see past it.
  const def = (id, o) => {
    const k = K[id] = Object.assign({ id, mass: 1, points: 1, tints: null, mover: null, cast: true }, o);
    if (k.hs) k.h *= k.hs;
    k.minDim = Math.min(k.w, k.d); k.maxDim = Math.max(k.w, k.d); k.radius = Math.hypot(k.w, k.d) / 2; k.fitRadius = k.minDim * 0.52;
    return k;
  };
  HC.defKind = def;

  // ---------- tiny street stuff (level 1) ----------
  def('person', { w: 12, d: 8, h: 34, points: 1, mass: 70, tints: P.shirts, mover: 'walk',
    build(g) {
      g.block(-3.2, 0, 0, 5, 15, 6, '#3B4A6B'); g.block(3.2, 0, 0, 5, 15, 6, '#3B4A6B');
      g.block(0, 14, 0, 12, 12, 7, '#FFFFFF', { tint: true });
      g.block(-7.4, 15, 0, 3, 10, 4, '#FFFFFF', { tint: true }); g.block(7.4, 15, 0, 3, 10, 4, '#FFFFFF', { tint: true });
      g.ball(0, 30, 0, 5, '#FFD3B0', { detail: 1 }); g.ball(0, 32.5, -0.6, 5.1, '#5A3825', { sy: 0.6 });
    } });
  def('dog', { w: 16, d: 6, h: 12, points: 1, mass: 20, tints: ['#C8873E', '#F4E1C1', '#3B3B3B', '#E9B872'], mover: 'walk',
    build(g) { g.block(0, 4, 0, 12, 6, 6, '#FFF', { tint: true }); g.block(7, 7, 0, 5, 5, 5, '#FFF', { tint: true });
      for (const [x, z] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) g.block(x, 0, z, 2, 4, 2, '#5A3E2B'); g.block(-7, 8, 0, 4, 1.5, 1.5, '#FFF', { tint: true }); } });
  def('cone', { w: 12, d: 12, h: 18, points: 1, mass: 3,
    build(g) { g.block(0, 0, 0, 12, 2, 12, '#FF6B2C'); g.cone(0, 2, 0, 5, 16, 8, '#FF7A30'); g.cyl(0, 8, 0, 3.4, 4, 3, 8, '#FFFFFF'); } });
  def('hydrant', { w: 10, d: 10, h: 18, points: 1, mass: 60,
    build(g) { g.cyl(0, 0, 0, 3.6, 4, 14, 8, '#FF3B47'); g.ball(0, 14.5, 0, 3.6, '#FF3B47'); g.block(0, 8, 0, 11, 3, 3, '#E02B37'); g.block(0, 0, 0, 9, 1.5, 9, '#C51F2B'); } });
  def('bin', { w: 14, d: 14, h: 22, points: 1, mass: 20, tints: ['#2ED573', '#1E90FF', '#7BED9F'],
    build(g) { g.cyl(0, 0, 0, 6.5, 5.5, 19, 10, '#FFFFFF', { tint: true }); g.cyl(0, 19, 0, 7.2, 7.2, 3, 10, '#3A3F58'); } });
  def('bollard', { w: 6, d: 6, h: 20, points: 1, mass: 25,
    build(g) { g.cyl(0, 0, 0, 2.6, 2.8, 20, 8, '#FFD23F'); g.cyl(0, 13, 0, 2.75, 2.75, 3, 8, '#2B2D42'); g.ball(0, 20, 0, 2.6, '#FFD23F'); } });
  def('mailbox', { w: 12, d: 10, h: 24, points: 1, mass: 40,
    build(g) { g.block(0, 0, 0, 3, 10, 3, '#3A3F58'); g.block(0, 10, 0, 12, 11, 10, '#2F6BFF'); g.cyl(0, 19.5, 0, 5, 5, 10, 10, '#2F6BFF', { rx: Math.PI / 2 }); } });
  def('flowerpot', { w: 18, d: 18, h: 18, points: 1, mass: 30, tints: P.flowers,
    build(g) { g.cyl(0, 0, 0, 9, 7, 10, 8, '#E07A5F'); g.ball(0, 13, 0, 7.5, '#43C463'); for (let i = 0; i < 5; i++) { const a = i * 1.256; g.ball(Math.cos(a) * 5, 16, Math.sin(a) * 5, 2.4, '#FFF', { tint: true }); } } });
  def('bush', { w: 24, d: 24, h: 18, points: 1, mass: 30, tints: P.trees,
    build(g) { g.ball(0, 9, 0, 11, '#FFF', { tint: true, sy: 0.85 }); g.ball(6, 12, 3, 6, '#FFF', { tint: true }); g.ball(-5, 12, -4, 6, '#FFF', { tint: true }); } });
  def('newsbox', { w: 12, d: 11, h: 20, points: 1, mass: 30, tints: ['#FF4757', '#1E90FF', '#FFC312'],
    build(g) { g.block(0, 0, 0, 2, 6, 2, '#3A3F58'); g.block(0, 6, 0, 12, 13, 11, '#FFF', { tint: true }); g.panel('z+', 0, 13, 5.6, 8, 5, GLASS); } });
  def('meter', { w: 6, d: 6, h: 26, points: 1, mass: 15,
    build(g) { g.block(0, 0, 0, 2.4, 18, 2.4, '#7A8099'); g.block(0, 18, 0, 6, 8, 5, '#B8C0D9'); g.panel('z+', 0, 22, 2.6, 4, 3, GLASS); } });
  def('duck', { w: 8, d: 5, h: 8, points: 1, mass: 2, mover: 'walk',
    build(g) { g.ball(0, 3.5, 0, 3.5, '#FFFFFF', { sx: 1.3 }); g.ball(3.5, 6.5, 0, 2.2, '#3FBF6A'); g.block(6, 6.2, 0, 2.4, 1, 1.6, '#FFB400'); } });

  def('fence', { w: 30, d: 4, h: 16, points: 1, mass: 15, tints: ['#FFFFFF', '#FFF4E3', '#FFE3F1'],
    build(g) { for (const x of [-12, -4, 4, 12]) { g.block(x, 0, 0, 4, 13, 3, '#FFF', { tint: true }); g.cone(x, 13, 0, 2.6, 3, 4, '#FFF', { tint: true, ry: Math.PI / 4 }); } g.block(0, 4, 0, 30, 2.4, 2, '#FFF', { tint: true }); g.block(0, 10, 0, 30, 2.4, 2, '#FFF', { tint: true }); } });
  def('beachball', { w: 10, d: 10, h: 10, points: 1, mass: 1,
    build(g) { g.ball(0, 5, 0, 5, '#FFFFFF', { detail: 1 }); g.ball(0, 5, 0, 5.08, '#FF5A5F', { detail: 0, sx: 0.35 }); g.ball(0, 5, 0, 5.08, '#00BBF9', { detail: 0, sz: 0.35 }); } });
  def('parasol', { w: 22, d: 22, h: 46, points: 2, mass: 10, tints: ['#FF5A5F', '#00BBF9', '#FEE440', '#F15BB5', '#00F5D4', '#FF8C42'],
    build(g) { g.cyl(0, 0, 0, 1.2, 1.2, 42, 6, '#FFFFFF'); g.cone(0, 34, 0, 24, 10, 8, '#FFF', { tint: true }); g.ball(0, 44.5, 0, 1.8, '#FFFFFF'); g.flat(14, 0.6, 6, 18, 34, '#FFF', { tint: true }); } });
  def('lifeguard', { w: 40, d: 40, h: 80, points: 5, mass: 300,
    build(g) { for (const [x, z] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) g.block(x, 0, z, 4, 50, 4, '#FFFFFF');
      g.block(0, 50, 0, 40, 4, 40, '#FFFFFF'); g.block(0, 54, 0, 36, 18, 36, '#FF5A5F'); g.gable(0, 72, 0, 44, 44, 10, '#FFFFFF'); g.block(0, 0, 26, 12, 50, 3, '#FFD23F', { rx: 0.45 }); } });

  // ---------- street furniture (levels 2–4) ----------
  def('bench', { w: 40, d: 14, h: 18, points: 2, mass: 60, tints: ['#FF8C42', '#3D7BFF', '#2ED573', '#FF5A8A'],
    build(g) { g.block(0, 8, 0, 40, 2.5, 12, '#FFF', { tint: true }); g.block(0, 10.5, -5.5, 40, 8, 2, '#FFF', { tint: true });
      for (const x of [-16, 16]) { g.block(x, 0, -3, 2.5, 8, 2.5, DARK); g.block(x, 0, 3, 2.5, 8, 2.5, DARK); } } });
  def('bike', { w: 34, d: 8, h: 20, points: 2, mass: 15, tints: P.cars,
    build(g) { for (const x of [-11, 11]) g.cyl(x, 0, 0, 6.5, 6.5, 2, 12, TIRE, { rx: Math.PI / 2 });
      g.block(0, 10, 0, 24, 2, 2, '#FFF', { tint: true }); g.block(-2, 8, 0, 2, 10, 2, '#FFF', { tint: true }); g.block(-3, 16, 0, 7, 1.5, 4, DARK); g.block(10, 15, 0, 2, 7, 8, DARK); } });
  def('lamp', { w: 10, d: 10, h: 82, points: 2, mass: 120,
    build(g) { g.cyl(0, 0, 0, 2.2, 3, 76, 8, '#4C5372'); g.block(5, 74, 0, 12, 2.4, 3, '#4C5372'); g.block(10, 70, 0, 7, 4, 6, '#FFF3B0'); g.cyl(0, 0, 0, 5, 5, 3, 8, '#4C5372'); } });
  def('trafficlight', { w: 12, d: 12, h: 92, points: 3, mass: 150,
    build(g) { g.cyl(0, 0, 0, 2.6, 3, 70, 8, '#3A3F58'); g.block(0, 66, 0, 10, 26, 9, '#2B2D42');
      g.ball(0, 86, 5, 3, '#FF4757'); g.ball(0, 79, 5, 3, '#FFC312'); g.ball(0, 72, 5, 3, '#2ED573'); } });
  def('streettree', { w: 14, d: 14, h: 80, points: 3, mass: 200, tints: P.trees,
    build(g) { g.cyl(0, 0, 0, 3, 4, 44, 7, '#9A6343'); g.ball(0, 52, 0, 19, '#FFF', { tint: true, detail: 0 }); g.ball(7, 62, 4, 12, '#FFF', { tint: true }); g.ball(-6, 64, -5, 11, '#FFF', { tint: true });
      g.block(0, 0, 0, 22, 1.5, 22, '#8A6A4E'); } });
  def('cafeset', { w: 34, d: 34, h: 46, points: 3, mass: 40, tints: ['#FF5A5F', '#00BBF9', '#FEE440', '#9B5DE5', '#00F5D4'],
    build(g) { g.cyl(0, 0, 0, 1.5, 1.5, 44, 6, '#F1F1F1'); g.cone(0, 34, 0, 20, 10, 8, '#FFF', { tint: true }); g.cyl(0, 13, 0, 9, 9, 2, 10, '#FFFFFF'); g.cyl(0, 0, 0, 1.6, 1.6, 13, 6, '#C9CCD9');
      for (const x of [-13, 13]) { g.block(x, 7, 0, 7, 1.5, 7, '#FF8C42'); g.block(x + Math.sign(x) * 3, 8, 0, 1.5, 9, 7, '#FF8C42'); } } });
  def('hotdog', { w: 40, d: 22, h: 40, points: 3, mass: 120,
    build(g) { g.block(0, 8, 0, 36, 18, 20, '#FFFFFF'); g.block(0, 8, 10.2, 36, 6, 0.6, '#FF4757'); for (const x of [-12, 12]) g.cyl(x, 0, 11, 5, 5, 2, 10, TIRE, { rx: Math.PI / 2 });
      g.block(0, 26, 0, 2, 12, 2, '#C9CCD9'); g.block(0, 38, 0, 38, 2, 24, '#FFC312'); g.block(0, 26, 0, 14, 4, 6, '#E07A5F'); } });
  def('vending', { w: 20, d: 16, h: 36, points: 2, mass: 250, tints: ['#FF4757', '#1E90FF', '#2ED573'],
    build(g) { g.block(0, 0, 0, 20, 36, 16, '#FFF', { tint: true }); g.panel('z+', -3, 22, 8.2, 11, 18, GLASS); g.panel('z+', 6, 18, 8.2, 4, 6, DARK); } });
  def('scooter', { w: 34, d: 12, h: 24, points: 3, mass: 110, tints: P.cars,
    build(g) { for (const x of [-11, 11]) g.cyl(x, 0, 0, 5, 5, 4, 10, TIRE, { rx: Math.PI / 2 });
      g.block(-2, 5, 0, 22, 8, 9, '#FFF', { tint: true }); g.block(-5, 13, 0, 12, 3, 8, DARK); g.block(10, 8, 0, 3, 14, 3, '#FFF', { tint: true }); g.block(10, 21, 0, 2, 2, 12, DARK); } });
  def('busstop', { w: 70, d: 24, h: 46, points: 4, mass: 300,
    build(g) { for (const x of [-32, 32]) g.block(x, 0, -9, 3, 44, 3, '#4C5372'); g.block(0, 44, 0, 72, 3, 26, '#5CC8FF');
      g.panel('z+', 0, 24, -10, 60, 30, '#BFF3FF'); g.block(0, 8, -6, 50, 2.5, 8, '#FF8C42'); g.block(26, 6, 9, 16, 36, 2, '#FFD23F'); } });

  // ---------- vehicles & medium objects (levels 3–9) ----------
  const carBody = (g, len, wid, hgt, cabinLen, cabinOff, extra) => {
    g.block(0, 5, 0, len, hgt * 0.5, wid, '#FFF', { tint: true });
    g.block(cabinOff, 5 + hgt * 0.5, 0, cabinLen, hgt * 0.42, wid * 0.86, '#FFF', { tint: true });
    g.panel('x+', cabinOff + cabinLen / 2 + 0.3, 5 + hgt * 0.71, 0, wid * 0.74, hgt * 0.3, GLASS);
    g.panel('x-', cabinOff - cabinLen / 2 - 0.3, 5 + hgt * 0.71, 0, wid * 0.74, hgt * 0.3, GLASS);
    g.panel('z+', cabinOff, 5 + hgt * 0.71, wid * 0.43 + 0.3, cabinLen * 0.8, hgt * 0.28, GLASS);
    g.panel('z-', cabinOff, 5 + hgt * 0.71, -wid * 0.43 - 0.3, cabinLen * 0.8, hgt * 0.28, GLASS);
    for (const x of [-len * 0.32, len * 0.32]) for (const z of [-wid * 0.45, wid * 0.45]) g.cyl(x, 0, z, 6.5, 6.5, 5, 10, TIRE, { rx: Math.PI / 2 });
    g.panel('x+', len / 2 + 0.2, 10, wid * 0.32, 6, 4, '#FFF7C2'); g.panel('x+', len / 2 + 0.2, 10, -wid * 0.32, 6, 4, '#FFF7C2');
    g.panel('x-', -len / 2 - 0.2, 10, wid * 0.32, 6, 4, '#FF3B47'); g.panel('x-', -len / 2 - 0.2, 10, -wid * 0.32, 6, 4, '#FF3B47');
    if (extra) extra(g);
  };
  def('car', { w: 84, d: 40, h: 30, points: 5, mass: 1200, tints: P.cars, mover: 'drive', build(g) { carBody(g, 84, 40, 30, 42, -4); } });
  def('taxi', { w: 84, d: 40, h: 34, points: 5, mass: 1200, tints: ['#FFD23F'], mover: 'drive',
    build(g) { carBody(g, 84, 40, 30, 42, -4, (g) => { g.block(-4, 30, 0, 14, 4, 8, '#FFFFFF'); g.block(0, 12, 20.3, 70, 3, 0.5, '#2B2D42'); }); } });
  def('police', { w: 86, d: 40, h: 36, points: 6, mass: 1300, tints: ['#F8F8FF'], mover: 'drive',
    build(g) { carBody(g, 86, 40, 30, 42, -4, (g) => { g.block(-4, 30, -5, 14, 4, 8, '#FF3B47'); g.block(-4, 30, 5, 14, 4, 8, '#1E90FF'); g.block(0, 8, 20.4, 60, 6, 0.5, '#1E3A8A'); g.block(0, 8, -20.4, 60, 6, 0.5, '#1E3A8A'); }); } });
  def('van', { w: 96, d: 44, h: 46, points: 6, mass: 2000, tints: ['#F8F8FF', '#FF7F50', '#22D3EE', '#FFC312', '#2ED573'], mover: 'drive',
    build(g) { g.block(-6, 5, 0, 84, 40, 44, '#FFF', { tint: true }); g.block(38, 5, 0, 18, 26, 42, '#FFF', { tint: true }); g.panel('x+', 47.3, 24, 0, 34, 12, GLASS);
      g.panel('z+', 36, 30, 22.3, 14, 10, GLASS); g.panel('z-', 36, 30, -22.3, 14, 10, GLASS);
      for (const x of [-32, 32]) for (const z of [-20, 20]) g.cyl(x, 0, z, 7, 7, 5, 10, TIRE, { rx: Math.PI / 2 }); } });
  def('bus', { w: 230, d: 52, h: 66, points: 14, mass: 9000, tints: ['#FFC312', '#FF4757', '#1E90FF'], mover: 'drive',
    build(g) { g.block(0, 7, 0, 230, 56, 52, '#FFF', { tint: true }); g.block(0, 63, 0, 210, 3, 46, '#F1F1F1');
      for (let i = 0; i < 8; i++) { const x = -95 + i * 25; g.panel('z+', x, 42, 26.3, 18, 16, GLASS); g.panel('z-', x, 42, -26.3, 18, 16, GLASS); }
      g.panel('x+', 115.3, 40, 0, 44, 24, GLASS); for (const x of [-75, 75]) for (const z of [-24, 24]) g.cyl(x, 0, z, 9, 9, 6, 12, TIRE, { rx: Math.PI / 2 }); } });
  def('truck', { w: 170, d: 52, h: 72, points: 12, mass: 8000, tints: ['#FF7F50', '#2ED573', '#A55EEA', '#1E90FF'], mover: 'drive',
    build(g) { g.block(-22, 10, 0, 124, 62, 52, '#F8F8FF'); g.block(-22, 40, 26.4, 100, 18, 0.5, '#FFF', { tint: true }); g.block(-22, 40, -26.4, 100, 18, 0.5, '#FFF', { tint: true });
      g.block(62, 6, 0, 44, 46, 50, '#FFF', { tint: true }); g.panel('x+', 84.3, 38, 0, 40, 14, GLASS);
      for (const x of [-60, -30, 62]) for (const z of [-24, 24]) g.cyl(x, 0, z, 9, 9, 6, 12, TIRE, { rx: Math.PI / 2 }); } });
  def('parktree', { w: 26, d: 26, h: 140, points: 6, mass: 900, tints: P.trees,
    build(g) { g.cyl(0, 0, 0, 5, 7, 70, 7, '#9A6343'); g.ball(0, 92, 0, 38, '#FFF', { tint: true }); g.ball(18, 105, 10, 22, '#FFF', { tint: true }); g.ball(-16, 110, -12, 22, '#FFF', { tint: true }); g.ball(4, 124, -2, 18, '#FFF', { tint: true }); } });
  def('pine', { w: 22, d: 22, h: 150, points: 5, mass: 700, tints: ['#2FB86E', '#1FA463', '#38C55A'],
    build(g) { g.cyl(0, 0, 0, 4, 5, 30, 6, '#9A6343'); g.cone(0, 22, 0, 34, 52, 7, '#FFF', { tint: true }); g.cone(0, 56, 0, 27, 46, 7, '#FFF', { tint: true }); g.cone(0, 88, 0, 19, 50, 7, '#FFF', { tint: true }); } });
  def('blossom', { w: 22, d: 22, h: 120, points: 5, mass: 600, tints: P.blossoms,
    build(g) { g.cyl(0, 0, 0, 4, 6, 60, 7, '#8D5A3B'); g.ball(0, 78, 0, 32, '#FFF', { tint: true }); g.ball(15, 88, 8, 18, '#FFF', { tint: true }); g.ball(-13, 92, -9, 18, '#FFF', { tint: true }); } });
  def('kiosk', { w: 70, d: 56, h: 64, points: 8, mass: 1500, tints: ['#FF8FCB', '#7BE0AD', '#FFD95C', '#5CC8FF'],
    build(g) { g.block(0, 0, 0, 64, 44, 50, '#FFF', { tint: true }); g.panel('z+', 0, 24, 25.3, 46, 20, GLASS); g.block(0, 44, 0, 72, 4, 58, '#FFFFFF');
      g.gable(0, 48, 0, 72, 58, 16, '#FF5A5F'); g.block(0, 28, 30, 70, 2, 10, '#FF5A5F'); } });
  def('statue', { w: 50, d: 50, h: 118, points: 9, mass: 4000,
    build(g) { g.block(0, 0, 0, 50, 26, 50, '#E9E4F2'); g.block(0, 26, 0, 40, 8, 40, '#D3CDE2'); g.block(-4, 34, 0, 10, 40, 12, '#5FD3B8'); g.block(5, 34, 0, 10, 40, 12, '#5FD3B8');
      g.block(0, 70, 0, 22, 26, 14, '#5FD3B8'); g.ball(0, 102, 0, 8, '#5FD3B8'); g.block(13, 88, 0, 6, 26, 6, '#5FD3B8'); g.cone(13, 112, 0, 5, 8, 6, '#FFC312'); } });
  def('fountain', { w: 110, d: 110, h: 48, points: 10, mass: 6000,
    build(g) { g.cyl(0, 0, 0, 55, 55, 12, 16, '#E9E4F2'); g.cyl(0, 2, 0, 48, 48, 11, 16, '#4FC3F7', { shade: false }); g.cyl(0, 0, 0, 10, 12, 30, 10, '#E9E4F2');
      g.cyl(0, 30, 0, 22, 18, 5, 12, '#E9E4F2'); g.cyl(0, 32, 0, 19, 19, 3.5, 12, '#7FDBFF'); g.cone(0, 34, 0, 6, 14, 8, '#BFF3FF'); } });
  def('billboard', { w: 120, d: 12, h: 150, points: 10, mass: 3000, tints: ['#FF5A8A', '#3D7BFF', '#FFC312', '#2ED573', '#9B5DE5'],
    build(g) { for (const x of [-35, 35]) g.block(x, 0, 0, 7, 90, 7, '#7A8099'); g.block(0, 88, 0, 120, 60, 6, '#FFFFFF'); g.panel('z+', 0, 118, 3.2, 110, 52, '#FFF', { tint: true });
      g.panel('z+', -20, 124, 3.4, 40, 12, '#FFFFFF'); g.panel('z+', 20, 108, 3.4, 50, 10, '#2B2D42'); } });
  def('container', { w: 120, d: 48, h: 50, points: 9, mass: 4000, tints: ['#FF4757', '#1E90FF', '#2ED573', '#FFC312', '#FF7F50'],
    build(g) { g.block(0, 0, 0, 120, 50, 48, '#FFF', { tint: true }); for (let i = 0; i < 9; i++) { g.panel('z+', -52 + i * 13, 25, 24.3, 3, 44, '#000000'); } } });

  // ---------- buildings (levels 9+) ----------
  def('house', { w: 170, d: 150, h: 160, points: 24, mass: 40000, tints: P.walls,
    build(g) { g.block(0, 0, 0, 170, 96, 150, '#FFF', { tint: true }); g.block(0, 0, 0, 176, 6, 156, '#E3DCEB');
      g.gable(0, 96, 0, 186, 166, 62, '#E84A5F'); g.block(45, 120, -30, 18, 40, 18, '#B33951');
      g.panel('z+', 0, 32, 75.4, 30, 52, '#8D5A3B'); for (const x of [-52, 52]) { g.panel('z+', x, 56, 75.4, 34, 30, WIN); g.panel('z-', x, 56, -75.4, 34, 30, WIN); }
      for (const z of [-40, 40]) { g.panel('x+', 85.4, 56, z, 30, 30, WIN); g.panel('x-', -85.4, 56, z, 30, 30, WIN); } } });
  def('cottage', { w: 150, d: 130, h: 140, points: 20, mass: 32000, tints: P.walls,
    build(g) { g.block(0, 0, 0, 150, 84, 130, '#FFF', { tint: true }); g.gable(0, 84, 0, 164, 146, 56, '#3D7BFF');
      g.panel('z+', -30, 30, 65.4, 26, 50, '#FFFFFF'); g.panel('z+', 35, 48, 65.4, 40, 28, WIN); g.panel('z-', 0, 48, -65.4, 60, 28, WIN);
      g.panel('x+', 75.4, 48, 0, 40, 28, WIN); g.panel('x-', -75.4, 48, 0, 40, 28, WIN); } });
  def('shop', { w: 210, d: 170, h: 140, points: 28, mass: 60000, tints: P.walls,
    build(g) { g.block(0, 0, 0, 210, 128, 170, '#FFF', { tint: true }); g.block(0, 128, 0, 216, 10, 176, '#A8A3BD', { tint: true }); g.block(0, 138, 0, 196, 1.5, 156, '#F6F2FC');
      g.panel('z+', 0, 32, 85.4, 170, 56, GLASS); g.panel('z+', 0, 32, 85.5, 6, 56, '#FFFFFF');
      for (let i = 0; i < 7; i++) g.block(-90 + i * 30, 62, 92, 30, 4, 18, i % 2 ? '#FFFFFF' : '#FF5A5F', { rx: 0.25 });
      g.panel('z+', 0, 104, 85.4, 120, 24, '#2B2D42'); g.panel('z+', 0, 104, 85.5, 108, 14, '#FFD23F');
      g.windows(0, 0, 210, 170, 84, 124, 1, 4, WIN, { fill: 0.6 }); g.block(60, 138, -40, 40, 20, 40, '#C9CCD9'); } });
  def('watertower', { hs: 0.85, w: 90, d: 90, h: 230, points: 18, mass: 20000,
    build(g) { for (const [x, z] of [[-32, -32], [32, -32], [-32, 32], [32, 32]]) g.block(x, 0, z, 6, 150, 6, '#8C93B0');
      g.cyl(0, 150, 0, 44, 44, 52, 12, '#FF8C42'); g.cone(0, 202, 0, 48, 28, 12, '#E9673A'); g.cyl(0, 150, 0, 45, 45, 6, 12, '#FFFFFF'); } });
  def('apartment', { hs: 0.82, w: 280, d: 240, h: 360, points: 46, mass: 300000, tints: P.walls,
    build(g) { g.block(0, 0, 0, 280, 340, 240, '#FFF', { tint: true }); g.block(0, 340, 0, 288, 12, 248, '#A8A3BD', { tint: true }); g.block(0, 352, 0, 264, 1.5, 224, '#F6F2FC');
      g.windows(0, 0, 280, 240, 40, 330, 8, 5, WIN, { litColor: LIT, fill: 0.62, fillY: 0.58 });
      for (let r = 0; r < 8; r++) g.block(0, 40 + r * 36.25, 121, 220, 3, 6, '#FFFFFF');
      g.panel('z+', 0, 22, 120.4, 50, 44, '#2B2D42'); g.block(0, 46, 128, 70, 4, 18, '#FF5A5F');
      g.block(-70, 352, 40, 60, 30, 50, '#C9CCD9'); g.cyl(80, 352, -50, 20, 20, 36, 10, '#8C93B0'); } });
  def('civic', { w: 340, d: 260, h: 240, points: 52, mass: 400000,
    build(g) { g.block(0, 0, 0, 340, 150, 260, '#FFF4E3'); g.block(0, 150, 0, 350, 12, 270, '#FFFFFF');
      for (let i = 0; i < 6; i++) g.cyl(-110 + i * 44, 0, 134, 9, 9, 150, 10, '#FFFFFF');
      g.gable(0, 162, 60, 300, 120, 50, '#5FD3B8'); g.block(0, 162, -40, 160, 30, 120, '#FFF4E3'); g.cyl(0, 192, -40, 46, 50, 20, 14, '#FFFFFF'); g.ball(0, 214, -40, 44, '#5FD3B8', { sy: 0.8, detail: 1 });
      g.windows(0, 0, 340, 260, 30, 140, 2, 6, WIN, { fill: 0.45 }); g.block(0, 0, 150, 200, 8, 30, '#E9E4F2'); } });
  def('office', { hs: 0.7, w: 330, d: 300, h: 640, points: 85, mass: 900000, tints: P.towers,
    build(g) { g.block(0, 0, 0, 330, 70, 300, '#E9E4F2'); g.panel('z+', 0, 32, 150.4, 220, 56, GLASS);
      g.block(0, 70, 0, 300, 540, 270, '#FFF', { tint: true }); g.windows(0, 0, 300, 270, 80, 600, 13, 6, '#E8FBFF', { litColor: '#FFF6C9', fill: 0.7, fillY: 0.62 });
      g.block(0, 610, 0, 310, 14, 280, '#A8A3BD', { tint: true }); g.block(0, 624, 0, 286, 1.5, 256, '#F6F2FC'); g.block(-60, 624, 30, 80, 20, 80, '#C9CCD9'); g.cyl(70, 624, -50, 4, 4, 30, 6, '#FF4757'); } });
  def('tower', { hs: 0.6, w: 400, d: 400, h: 1080, points: 140, mass: 2000000, tints: P.towers,
    build(g) { g.block(0, 0, 0, 400, 90, 400, '#E9E4F2'); g.panel('z+', 0, 40, 200.4, 260, 70, GLASS);
      g.block(0, 90, 0, 360, 560, 360, '#FFF', { tint: true }); g.windows(0, 0, 360, 360, 110, 640, 12, 7, '#E8FBFF', { litColor: '#FFF6C9', fill: 0.72, fillY: 0.6 });
      g.block(0, 650, 0, 300, 300, 300, '#FFF', { tint: true }); g.windows(0, 0, 300, 300, 670, 940, 6, 6, '#E8FBFF', { litColor: '#FFF6C9', fill: 0.72, fillY: 0.6 });
      g.block(0, 950, 0, 220, 14, 220, '#A8A3BD', { tint: true }); g.block(0, 964, 0, 200, 56, 200, '#F6F2FC'); g.block(0, 650, 0, 362, 8, 362, '#A8A3BD', { tint: true }); g.cyl(0, 1020, 0, 3, 6, 70, 6, '#C9CCD9'); g.ball(0, 1086, 0, 6, '#FF4757'); } });
  def('landmark', { hs: 0.6, w: 560, d: 560, h: 1750, points: 320, mass: 6000000,
    build(g) { g.block(0, 0, 0, 560, 120, 560, '#FFF4E3'); g.block(0, 120, 0, 480, 360, 480, '#FF9FD2'); g.windows(0, 0, 480, 480, 140, 460, 7, 8, '#FFFFFF', { fill: 0.6 });
      g.block(0, 480, 0, 380, 420, 380, '#B79BFF'); g.windows(0, 0, 380, 380, 500, 880, 8, 7, '#FFFFFF', { fill: 0.6 });
      g.block(0, 900, 0, 270, 360, 270, '#5CC8FF'); g.windows(0, 0, 270, 270, 920, 1240, 7, 5, '#FFFFFF', { fill: 0.6 });
      g.block(0, 1260, 0, 170, 160, 170, '#7BE0AD'); g.cone(0, 1420, 0, 110, 260, 4, '#FFD23F', { ry: Math.PI / 4 }); g.ball(0, 1700, 0, 22, '#FF5A5F', { detail: 1 }); } });

  HC.CATALOG = K;
  HC.PALETTE = P;
})();
