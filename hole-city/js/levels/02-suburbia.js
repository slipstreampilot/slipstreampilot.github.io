// Level 2 — Maple Hills: autumn suburbia. Small blocks of family homes with busy back yards
// (gnomes, trampolines, swing sets, pools), a playground park, a school and the Mega Mall.
// Tons of 1-point clutter makes it the easiest level to grow in.
(function () {
  const R = [125, 917, 1708, 2500, 3292, 4083, 4875];
  const RW = 140;
  const COL = { lawnA: '#86DF5F', lawnB: '#78D553', yard: '#8EE468', drive: '#D9DBE6', pool: '#4DD6FF', poolEdge: '#F4F1FA', path: '#FFE8C2',
    sand: '#FFE3A1', lot: '#7A8098', court: '#FF9B6B', mulch: '#B07A55' };
  const AUTUMN = ['#FF7A1A', '#FF4D3A', '#FFB01F', '#F2D024', '#E8572C'];

  function kinds(def) {
    def('gnome', { w: 8, d: 8, h: 18, points: 1, mass: 8, tints: ['#FF3B47', '#2F6BFF', '#2ED573'],
      build(g) { g.cyl(0, 0, 0, 3.6, 3.8, 8, 7, '#FFF', { tint: true }); g.ball(0, 9.5, 0, 2.8, '#FFD3B0'); g.ball(0, 7.5, 1.2, 2.4, '#FFFFFF', { sy: 1.2 }); g.cone(0, 11, 0, 3.4, 8, 7, '#FF3B47'); } });
    def('flamingo', { w: 8, d: 6, h: 22, points: 1, mass: 2,
      build(g) { g.block(-1, 0, 0, 1, 12, 1, '#2B2D42'); g.block(1, 0, 0, 1, 12, 1, '#2B2D42'); g.ball(0, 14, 0, 4.5, '#FF6FB5', { sx: 1.4 }); g.block(3.5, 15, 0, 1.6, 7, 1.6, '#FF6FB5'); g.ball(4.5, 21, 0, 2, '#FF6FB5'); g.block(6.5, 20.5, 0, 2.5, 1.2, 1.2, '#2B2D42'); } });
    def('pumpkin', { w: 10, d: 10, h: 9, points: 1, mass: 6,
      build(g) { g.ball(0, 4.5, 0, 5, '#FF8A1F', { sy: 0.8, detail: 1 }); g.block(0, 8, 0, 1.4, 3, 1.4, '#3E8E41'); } });
    def('leafpile', { w: 20, d: 20, h: 8, points: 1, mass: 3,
      build(g) { g.ball(0, 2, 0, 9, '#FF8A1F', { sy: 0.45 }); g.ball(4, 4, 3, 5, '#FF4D3A', { sy: 0.6 }); g.ball(-4, 4, -2, 5, '#FFC21F', { sy: 0.6 }); } });
    def('mower', { w: 24, d: 16, h: 18, points: 2, mass: 40, tints: ['#2ED573', '#FF4757'],
      build(g) { g.block(0, 3, 0, 18, 7, 15, '#FFF', { tint: true }); for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) g.cyl(x, 0, z, 3, 3, 2, 8, '#2B2D42', { rx: Math.PI / 2 });
        g.block(-12, 8, -5, 1.6, 14, 1.6, '#7A8099', { rz: -0.5 }); g.block(-12, 8, 5, 1.6, 14, 1.6, '#7A8099', { rz: -0.5 }); g.block(-16, 17, 0, 1.6, 1.6, 12, '#2B2D42'); } });
    def('bbq', { w: 20, d: 14, h: 26, points: 2, mass: 30,
      build(g) { for (const x of [-6, 6]) g.block(x, 0, 0, 1.6, 15, 1.6, '#3A3F58'); g.ball(0, 18, 0, 8, '#2B2D42', { sy: 0.7 }); g.block(0, 16, 0, 20, 1.5, 3, '#C9CCD9'); g.block(0, 24, 0, 3, 3, 3, '#7A8099'); } });
    def('doghouse', { w: 30, d: 26, h: 30, points: 3, mass: 60, tints: ['#FF7B72', '#5CC8FF', '#FFD95C', '#B79BFF'],
      build(g) { g.block(0, 0, 0, 28, 18, 24, '#FFF', { tint: true }); g.gable(0, 18, 0, 32, 28, 12, '#C0392B'); g.panel('z+', 0, 7, 12.2, 10, 12, '#2B2D42'); } });
    def('playhouse', { w: 40, d: 36, h: 46, points: 4, mass: 120, tints: ['#FFB3E0', '#AEEBFF', '#FFE58A'],
      build(g) { g.block(0, 0, 0, 38, 28, 34, '#FFF', { tint: true }); g.gable(0, 28, 0, 42, 38, 16, '#FF5A8A'); g.panel('z+', -8, 10, 17.2, 10, 18, '#FFFFFF'); g.panel('z+', 9, 16, 17.2, 10, 8, '#AEEBFF'); } });
    def('trampoline', { w: 62, d: 62, h: 22, points: 5, mass: 80,
      build(g) { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.block(Math.cos(a) * 28, 0, Math.sin(a) * 28, 2, 12, 2, '#3A3F58'); }
        g.cyl(0, 11, 0, 31, 31, 2.5, 16, '#2ED5FF'); g.cyl(0, 11.5, 0, 25, 25, 2.5, 16, '#2B2D42'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.block(Math.cos(a) * 30, 13, Math.sin(a) * 30, 1.4, 12, 1.4, '#7A8099'); } } });
    def('swingset', { w: 70, d: 30, h: 46, points: 5, mass: 90,
      build(g) { for (const x of [-32, 32]) { g.block(x, 0, -10, 3, 46, 3, '#FF5A5F', { rx: 0.25 }); g.block(x, 0, 10, 3, 46, 3, '#FF5A5F', { rx: -0.25 }); }
        g.block(0, 44, 0, 70, 3, 3, '#FFD23F'); for (const x of [-14, 14]) { g.block(x - 4, 18, 0, 0.8, 26, 0.8, '#3A3F58'); g.block(x + 4, 18, 0, 0.8, 26, 0.8, '#3A3F58'); g.block(x, 17, 0, 11, 1.5, 5, '#3D7BFF'); } } });
    def('slide', { w: 60, d: 18, h: 40, points: 4, mass: 90,
      build(g) { g.block(-18, 0, 0, 18, 30, 18, '#3D7BFF'); g.block(-18, 30, 0, 20, 4, 20, '#FFD23F'); g.block(10, 14, 0, 44, 2.5, 12, '#FF5A5F', { rz: -0.55 }); g.block(-30, 0, 0, 2, 30, 14, '#2ED573'); } });
    def('mapletree', { w: 16, d: 16, h: 96, points: 4, mass: 300, tints: AUTUMN,
      build(g) { g.cyl(0, 0, 0, 3.5, 5, 52, 7, '#8D5A3B'); g.ball(0, 64, 0, 24, '#FFF', { tint: true }); g.ball(12, 74, 6, 15, '#FFF', { tint: true }); g.ball(-11, 76, -8, 15, '#FFF', { tint: true }); g.ball(2, 86, 0, 12, '#FFF', { tint: true }); } });
    def('church', { w: 200, d: 150, h: 300, points: 34, mass: 80000,
      build(g) { g.block(0, 0, 0, 200, 110, 150, '#FFF4E3'); g.gable(0, 110, 0, 210, 160, 70, '#8D5A3B'); g.block(-70, 0, 0, 60, 200, 60, '#FFF4E3'); g.cone(-70, 200, 0, 46, 100, 4, '#8D5A3B', { ry: Math.PI / 4 });
        for (let i = 0; i < 4; i++) { g.panel('z+', -20 + i * 40, 55, 75.3, 18, 50, '#7FD4FF'); g.panel('z-', -20 + i * 40, 55, -75.3, 18, 50, '#7FD4FF'); } g.panel('x-', -100.3, 30, 0, 30, 60, '#8D5A3B'); g.ball(-70, 150, 30.5, 12, '#FFD23F'); } });
    def('school', { w: 420, d: 300, h: 190, points: 120, mass: 900000,
      build(g) { g.block(0, 0, 0, 420, 140, 300, '#FF9E7A'); g.block(0, 140, 0, 430, 10, 310, '#C0392B'); g.windows(0, 0, 420, 300, 25, 130, 3, 8, '#AEEBFF', { fill: 0.6 });
        g.block(0, 0, 160, 120, 90, 30, '#FFF4E3'); g.panel('z+', 0, 30, 175.3, 50, 60, '#8D5A3B'); g.block(0, 150, -40, 60, 40, 60, '#FFF4E3'); g.cyl(0, 165, 0, 18, 18, 3, 16, '#FFFFFF', { rx: Math.PI / 2 });
        g.panel('z+', 0, 112, 150.4, 220, 20, '#FFFFFF'); g.panel('z+', 0, 112, 150.5, 200, 12, '#2F6BFF'); } });
    def('mall', { hs: 0.85, w: 560, d: 450, h: 260, points: 320, mass: 3000000,
      build(g) { g.block(0, 0, 0, 560, 180, 450, '#FFF4E3'); g.block(0, 180, 0, 572, 14, 462, '#FF5A8A');
        g.block(-140, 0, 226, 130, 200, 6, '#AEEBFF'); g.block(140, 0, 226, 130, 200, 6, '#AEEBFF'); g.block(0, 0, 220, 160, 240, 22, '#FF5A8A');
        g.panel('z+', 0, 210, 231.3, 140, 40, '#FFFFFF'); g.panel('z+', 0, 210, 231.4, 120, 26, '#FFD23F');
        g.ball(0, 194, 0, 110, '#AEEBFF', { sy: 0.45, detail: 1 }); g.windows(0, 0, 560, 450, 40, 160, 3, 9, '#FFE58A', { fill: 0.5 });
        for (const [x, z] of [[-220, -170], [220, -170], [-220, 110], [220, 110]]) g.cyl(x, 194, z, 28, 28, 26, 10, '#C9CCD9'); } });
    def('townhouses', { w: 330, d: 160, h: 200, points: 46, mass: 250000, tints: ['#FFB45E', '#7BE0AD', '#B79BFF', '#5CC8FF'],
      build(g) { for (let i = 0; i < 4; i++) { const x = -124 + i * 83; g.block(x, 0, 0, 82, 130 + (i % 2) * 14, 160, i % 2 ? '#FFF4E3' : '#FFF', { tint: i % 2 === 0 }); g.gable(x, 130 + (i % 2) * 14, 0, 86, 166, 50, '#7A4A3A', { ry: Math.PI / 2 });
        g.panel('z+', x - 18, 26, 80.3, 20, 44, '#8D5A3B'); g.panel('z+', x + 18, 40, 80.3, 26, 26, '#AEEBFF'); g.panel('z+', x, 98, 80.3, 50, 26, '#AEEBFF'); } } });
  }

  function yard(T, lx, edge, f, rot, w) {
    // One family lot: house + driveway + front fence + garden clutter + back-yard toy.
    const rng = T.rng;
    T.put(rng.chance(0.55) ? 'house' : 'cottage', lx, edge - f * 150, rot);
    T.rect(lx + w / 2 - 48, Math.min(edge, edge - f * 80), lx + w / 2 - 12, Math.max(edge, edge - f * 80), 2.6, COL.drive);
    T.put(rng.chance(0.55) ? 'van' : 'car', lx + w / 2 - 30, edge - f * 45, Math.PI / 2);
    T.line('fence', lx - w / 2 + 6, edge - f * 8, lx + w / 2 - 54, edge - f * 8, 31, { gapAt: (w - 60) / 2, gapW: 40 });
    T.put('mailbox', lx - 6, edge - f * 24, rot);
    const front = T.pick({ gnome: 4, flamingo: 3, pumpkin: 3, leafpile: 3, bush: 2, flowerpot: 2 });
    for (let k = 0; k < 2; k++) T.put(T.rng.chance(0.5) ? front : T.pick({ gnome: 1, pumpkin: 1, leafpile: 1, flamingo: 1 }), lx - w / 2 + 30 + k * 20, edge - f * (40 + (k % 2) * 14), rng() * 6);
    const back = edge - f * 255;
    const toy = T.pick({ trampoline: 3, swingset: 3, pool: 3, playhouse: 2, doghouse: 2 });
    if (toy === 'pool') { T.rect(lx - 50, back - 30, lx + 30, back + 30, 2.4, COL.poolEdge); T.rect(lx - 44, back - 24, lx + 24, back + 24, 2.8, COL.pool); T.put('beachball', lx - 20, back); T.put(rng.chance(0.5) ? 'bbq' : 'flamingo', lx + 50, back); }
    else { T.put(toy, lx - 20, back, rng.chance(0.5) ? 0 : Math.PI / 2); T.put(T.pick({ bbq: 1, mower: 1, gnome: 1 }), lx + 55, back + 10, rng() * 6); }
    T.put('mapletree', lx + w / 2 - 25, back + f * 10);
    if (rng.chance(0.4)) T.put('dog', lx + 40, back - 30, rng() * 6);
    if (rng.chance(0.5)) T.put('bike', lx + w / 2 - 30, edge - f * 100, Math.PI / 2);
  }

  const BLOCKS = {
    homes(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.yard);
      for (const half of [0, 1]) {
        const f = half === 0 ? -1 : 1, rot = half === 0 ? Math.PI : 0, edge = half === 0 ? b.z0 : b.z1, n = 3, w = b.w / n;
        for (let l = 0; l < n; l++) yard(T, b.x0 + w * (l + 0.5), edge, f, rot, w);
      }
    },
    park(T, b) {
      T.stripes(b.x0, b.z0, b.x1, b.z1, 2, COL.lawnA, COL.lawnB, 8);
      T.path([[b.x0 + 40, b.z0 + 40], [b.x1 - 40, b.z0 + 40], [b.x1 - 40, b.z1 - 40], [b.x0 + 40, b.z1 - 40]], 36, 2.6, COL.path, true);
      T.walkLoop([[b.x0 + 40, b.z0 + 40], [b.x1 - 40, b.z0 + 40], [b.x1 - 40, b.z1 - 40], [b.x0 + 40, b.z1 - 40]], 9, { person: 1 }, { dogChance: 0.3 });
      // Playground on mulch, a pond with ducks.
      T.rect(b.x0 + 80, b.z0 + 80, b.cx - 20, b.cz - 20, 2.4, COL.mulch);
      T.put('slide', b.x0 + 140, b.z0 + 130, 0); T.put('swingset', b.x0 + 140, b.cz - 70, 0); T.put('playhouse', b.cx - 70, b.z0 + 130);
      T.scatter({ person: 3, beachball: 2, bike: 1 }, { x0: b.x0 + 90, z0: b.z0 + 90, x1: b.cx - 30, z1: b.cz - 30 }, 8);
      T.disc(b.cx + 120, b.cz + 110, 110, 2.8, '#E9E4F2', 32); T.disc(b.cx + 120, b.cz + 110, 98, 3.2, '#3FC4F2', 32);
      T.roamers('duck', b.cx + 120, b.cz + 110, 70, 7, { speed: [10, 20] });
      T.scatter({ mapletree: 5, pine: 1, bush: 2, leafpile: 4, pumpkin: 2 }, { x0: b.x0 + 60, z0: b.z0 + 60, x1: b.x1 - 60, z1: b.z1 - 60 }, 20, { gap: 10 });
      T.scatter({ bench: 1, lamp: 1, cafeset: 1 }, { x0: b.x0 + 50, z0: b.z0 + 50, x1: b.x1 - 50, z1: b.z1 - 50 }, 10, { gap: 14 });
    },
    school(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.lawnA);
      T.put('school', b.cx, b.z0 + 175, 0);
      T.rect(b.x0 + 30, b.z1 - 170, b.cx - 20, b.z1 - 30, 2.6, COL.court); T.rect(b.x0 + 40, b.z1 - 102, b.cx - 30, b.z1 - 98, 3, '#FFFFFF');
      T.put('bus', b.cx + 150, b.z1 - 140, 0, { tint: 0 }); T.put('bus', b.cx + 150, b.z1 - 70, 0, { tint: 0 });
      T.scatter({ person: 5, beachball: 2, bike: 2 }, { x0: b.x0 + 40, z0: b.z1 - 165, x1: b.cx - 30, z1: b.z1 - 35 }, 12);
      T.line('bike', b.x1 - 30, b.z0 + 340, b.x1 - 30, b.z0 + 420, 14, { rot: Math.PI / 2 });
    },
    mall(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.lot);
      T.put('mall', b.cx, b.cz, 0);
      for (let k = 0; k < 12; k++) T.put(T.pick({ car: 4, van: 2 }), b.x0 + 24 + k * 47, b.z0 + 10, Math.PI / 2);
    },
    shops(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.lot);
      T.put('shop', b.x0 + 115, b.z0 + 110, Math.PI); T.put('shop', b.x1 - 115, b.z0 + 110, Math.PI);
      for (let row = 0; row < 2; row++) for (let k = 0; k < 6; k++) {
        const x = b.x0 + 50 + k * 90, z = b.z1 - 150 + row * 100; T.rect(x - 2, z - 40, x + 2, z + 40, 2.8, '#FFFFFF');
        if (T.rng.chance(0.75)) T.put(T.pick({ car: 4, van: 2 }), x + 45, z, Math.PI / 2);
      }
      for (let k = 0; k < 8; k++) T.put(T.pick({ cafeset: 2, flowerpot: 2, vending: 1, pumpkin: 2 }), b.x0 + 40 + k * 65, b.z0 + 225);
    },
    church(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.lawnB);
      T.put('church', b.cx - 60, b.z0 + 140, 0);
      T.put('townhouses', b.cx, b.z1 - 100, 0);
      T.scatter({ mapletree: 3, leafpile: 3, pumpkin: 2, bench: 1, gnome: 1 }, { x0: b.x0 + 30, z0: b.z0 + 260, x1: b.x1 - 30, z1: b.z1 - 200 }, 14, { gap: 8 });
    },
    rows(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.yard);
      T.put('townhouses', b.cx, b.z0 + 100, Math.PI); T.put('townhouses', b.cx, b.z1 - 100, 0);
      T.scatter({ mapletree: 3, leafpile: 4, pumpkin: 3, bench: 1, bike: 2, flowerpot: 2 }, { x0: b.x0 + 20, z0: b.cz - 90, x1: b.x1 - 20, z1: b.cz + 90 }, 22, { gap: 6 });
    },
  };

  HC.Levels.add({
    id: 'suburbia', num: 2, name: 'Maple Hills', tagline: 'Autumn suburbia · yards full of goodies', icon: '🏡', colors: ['#FF8A1F', '#FF4D3A'],
    theme: { sky: '#9FE3FF', sun: '#FFE8C8', sunI: 2.4, hemiGround: '#C9A6FF' },
    mods: { botSkill: -0.12 },
    milestones: [['car', '🚗 Cars'], ['trampoline', '🤸 Trampolines'], ['bus', '🚌 School buses'], ['house', '🏠 Houses'], ['church', '⛪ The church'], ['townhouses', '🏘️ Townhouses'], ['school', '🏫 The school'], ['mall', '🛍️ THE MEGA MALL']],
    kinds,
    generate(T) {
      T.island({ ground: '#FFE3A1' });
      T.rect(R[0] - 120, R[0] - 120, R[6] + 120, R[6] + 120, 0, '#F3EEF8');
      T.roadGrid(R, { width: RW, colors: { road: '#6A7290', line: '#FFD23F', dash: null } });
      const plan = [
        ['homes', 'homes', 'shops', 'homes', 'homes', 'rows'],
        ['homes', 'park', 'homes', 'homes', 'church', 'homes'],
        ['shops', 'homes', 'school', 'homes', 'homes', 'homes'],
        ['homes', 'homes', 'homes', 'mall', 'homes', 'shops'],
        ['rows', 'church', 'homes', 'homes', 'park', 'homes'],
        ['homes', 'homes', 'rows', 'shops', 'homes', 'homes'],
      ];
      T.blocks(R, (b) => {
        BLOCKS[plan[b.bz][b.bx]](T, b);
        T.sidewalkProps(b, { tree: { mapletree: 1 }, step: 110, props: { hydrant: 2, leafpile: 3, pumpkin: 2, bin: 1, mailbox: 1, none: 5 } });
      }, { sidewalkWidth: 40, walkers: 6, dogChance: 0.25 });
      const o0 = R[0] - RW / 2 - 20, o1 = R[6] + RW / 2 + 20;
      T.walkLoop([[o0, o0], [o1, o0], [o1, o1], [o0, o1]], 30, { person: 1 }, { dogChance: 0.2 });
      T.beach({ parasol: 3, beachball: 3, person: 3, pumpkin: 1 }, 50);
      T.traffic({ car: 5, van: 4, police: 1 }, 40, { lane: 35 }); T.traffic({ bus: 1 }, 4, { lane: 35 });
      T.spawnGrid(R);
    },
  });
})();
