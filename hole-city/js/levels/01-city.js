// Level 1 — Hole City: a downtown island. Parks and sidewalks for the opening, parking lots and
// traffic mid-game, a ring of towers and the landmark for the finale.
(function () {
  const COL = {
    lawnA: '#7EDC5E', lawnB: '#6DCF4F', path: '#FFE8C2', plaza: '#FFE0EF', plazaRing: '#FFC6E0', parking: '#6A7394',
    dirt: '#E7B57E', yard: '#8DE36A', drive: '#D4D6E3', pond: '#3FC4F2', pondEdge: '#E9E4F2',
  };
  const R = [125, 1075, 2025, 2975, 3925, 4875];

  const PROPS = { cluster: 28, hydrant: 12, bin: 12, bench: 10, newsbox: 8, mailbox: 8, bike: 8, meter: 7, busstop: 7 };
  function streetFurniture(T, b) {
    T.sidewalkProps(b, { tree: { streettree: 85, blossom: 15 }, lamp: 'lamp', props: PROPS, cluster: 'bollard' });
    T.put('trafficlight', b.x0 - 50, b.z0 - 50, Math.PI * 0.25); T.put('trafficlight', b.x1 + 50, b.z1 + 50, Math.PI * 1.25);
    T.put('hydrant', b.x1 + 46, b.z0 - 30); T.put('cone', b.x0 - 30, b.z1 + 46);
  }

  const BLOCKS = {
    park(T, b) { park(T, b, false); },
    park2(T, b) { park(T, b, true); },
    res(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.yard);
      for (const half of [0, 1]) {
        const f = half === 0 ? -1 : 1, rot = half === 0 ? Math.PI : 0, edge = half === 0 ? b.z0 : b.z1;
        for (let l = 0; l < 3; l++) {
          const lx = b.x0 + 105 + l * 210;
          T.put(T.rng.chance(0.6) ? 'house' : 'cottage', lx, edge - f * 160, rot);
          T.rect(lx + 72, Math.min(edge, edge - f * 95), lx + 112, Math.max(edge, edge - f * 95), 2.6, COL.drive);
          T.put(T.rng.chance(0.8) ? 'car' : 'van', lx + 92, edge - f * 50, Math.PI / 2);
          T.line('fence', lx - 100, edge - f * 10, lx + 62, edge - f * 10, 31, { gapAt: 90, gapW: 44 });
          T.put('mailbox', lx - 10, edge - f * 28, rot);
          T.put('bush', lx - 70, edge - f * 50); T.put('flowerpot', lx + 40, edge - f * 45);
          T.put(T.rng.chance(0.5) ? 'streettree' : 'blossom', lx - 70, edge - f * 285);
          if (T.rng.chance(0.5)) T.put('dog', lx + 60, edge - f * 270, T.rng() * 6);
          if (T.rng.chance(0.4)) T.put('bush', lx + 60, edge - f * 290);
        }
      }
    },
    com(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, '#F7E7FF');
      for (const half of [0, 1]) {
        const f = half === 0 ? -1 : 1, rot = half === 0 ? Math.PI : 0, edge = half === 0 ? b.z0 : b.z1;
        for (let l = 0; l < 3; l++) {
          const lx = b.x0 + 105 + l * 210;
          T.put('shop', lx, edge - f * 140, rot);
          const r = T.rng();
          if (r < 0.45) { T.put('cafeset', lx - 50, edge - f * 30); T.put('cafeset', lx + 10, edge - f * 30); }
          else if (r < 0.7) { T.put('hotdog', lx - 30, edge - f * 30, 0); T.put('vending', lx + 50, edge - f * 25, rot); }
          else for (let k = 0; k < 4; k++) T.put('flowerpot', lx - 60 + k * 40, edge - f * 25);
        }
      }
      for (let k = 0; k < 6; k++) T.put(k % 3 === 0 ? 'vending' : 'bin', b.x0 + 60 + k * 100, b.cz + T.rng.range(-20, 20), T.rng() * 6);
      T.put('kiosk', b.cx, b.cz, Math.PI / 2);
    },
    apt(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.yard);
      T.put('apartment', b.x0 + 160, b.z0 + 145, Math.PI); T.put('apartment', b.x1 - 160, b.z0 + 145, Math.PI);
      T.rect(b.x0 + 20, b.z1 - 180, b.x1 - 20, b.z1 - 20, 2.6, COL.parking);
      for (let k = 0; k < 7; k++) { const x = b.x0 + 60 + k * 85; T.rect(x - 2, b.z1 - 180, x + 2, b.z1 - 110, 3.1, '#FFFFFF'); if (T.rng.chance(0.7)) T.put(T.rng.chance(0.8) ? 'car' : 'van', x + 42, b.z1 - 140, Math.PI / 2); }
      for (let k = 0; k < 5; k++) T.put('streettree', b.x0 + 70 + k * 125, b.z1 - 60);
      T.put('bench', b.cx - 60, b.z1 - 40); T.put('bench', b.cx + 60, b.z1 - 40);
      T.put('bush', b.x0 + 40, b.cz + 40); T.put('bush', b.x1 - 40, b.cz + 40);
    },
    down(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.plaza);
      const v = T.rng.int(0, 2);
      if (v === 0) {
        T.put('tower', b.x0 + 210, b.z0 + 210, 0);
        T.put('statue', b.x1 - 90, b.z1 - 90); T.ring(b.x1 - 90, b.z1 - 90, 60, 72, 2.6, COL.plazaRing);
        for (let k = 0; k < 5; k++) { T.put('bollard', b.x0 + 40 + k * 22, b.z1 - 30); T.put('bollard', b.x1 - 30, b.z0 + 40 + k * 22); }
        T.put('blossom', b.x1 - 60, b.z0 + 60); T.put('blossom', b.x0 + 60, b.z1 - 60); T.put('bench', b.x1 - 170, b.z1 - 40); T.put('bench', b.x1 - 40, b.z1 - 170, Math.PI / 2);
      } else if (v === 1) {
        T.put('office', b.x0 + 170, b.z0 + 160, Math.PI); T.put('apartment', b.x1 - 145, b.z1 - 125, 0);
        T.put('fountain', b.x1 - 120, b.z0 + 110); T.put('kiosk', b.x0 + 120, b.z1 - 90);
        for (let k = 0; k < 4; k++) T.put('flowerpot', b.x0 + 230 + k * 30, b.z1 - 30);
      } else {
        T.put('office', b.x1 - 170, b.z1 - 160, 0); T.put('office', b.x0 + 170, b.z0 + 160, Math.PI);
        T.put('billboard', b.x0 + 120, b.z1 - 60, 0); T.put('statue', b.x1 - 90, b.z0 + 90);
        for (let k = 0; k < 6; k++) T.put('bollard', b.x0 + 240 + k * 20, b.z1 - 20);
      }
    },
    landmark(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.plaza); T.ring(b.cx, b.cz, 300, 312, 2.4, COL.plazaRing, 64);
      T.put('landmark', b.cx, b.cz, 0);
      for (const [x, z] of [[b.x0 + 20, b.z0 + 20], [b.x1 - 20, b.z0 + 20], [b.x0 + 20, b.z1 - 20], [b.x1 - 20, b.z1 - 20]]) T.put('flowerpot', x, z);
    },
    civic(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.lawnA);
      T.put('civic', b.cx, b.z0 + 190, 0); T.rect(b.cx - 40, b.z0 + 320, b.cx + 40, b.z1, 2.6, COL.path);
      T.put('statue', b.cx, b.z1 - 120);
      for (let k = 0; k < 4; k++) { T.put('blossom', b.x0 + 70, b.z0 + 380 + k * 70); T.put('blossom', b.x1 - 70, b.z0 + 380 + k * 70); }
      T.put('bus', b.x0 + 150, b.z1 - 50, 0, { tint: 0 }); T.put('bench', b.cx - 90, b.z1 - 180, Math.PI / 2); T.put('bench', b.cx + 90, b.z1 - 180, -Math.PI / 2);
      for (let k = 0; k < 10; k++) T.put('flowerpot', b.cx - 60 - k * 12, b.z0 + 340);
    },
    lot(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.parking);
      for (let row = 0; row < 3; row++) {
        const z = b.z0 + 110 + row * 200;
        for (let k = 0; k < 7; k++) {
          const x = b.x0 + 45 + k * 90; T.rect(x - 2, z - 60, x + 2, z + 60, 2.8, '#FFFFFF');
          if (k < 6 && T.rng.chance(0.78)) T.put(T.rng.chance(0.12) ? 'van' : T.rng.chance(0.1) ? 'taxi' : 'car', x + 45, z, Math.PI / 2 + (T.rng.chance(0.5) ? Math.PI : 0));
        }
      }
      T.put('bus', b.cx, b.z1 - 30, 0); T.put('kiosk', b.x1 - 50, b.z0 + 30, 0);
      for (let k = 0; k < 6; k++) T.put('cone', b.x0 + 20 + k * 18, b.z0 + 15);
    },
    works(T, b) {
      T.rect(b.x0, b.z0, b.x1, b.z1, 2, COL.dirt);
      T.put('watertower', b.x0 + 100, b.z0 + 100);
      for (let k = 0; k < 4; k++) T.put('container', b.x0 + 300 + (k % 2) * 140, b.z0 + 80 + Math.floor(k / 2) * 70, 0);
      T.put('truck', b.x0 + 150, b.z1 - 80, 0); T.put('van', b.x1 - 120, b.z1 - 80, Math.PI);
      for (let k = 0; k < 14; k++) T.put('cone', b.x0 + 40 + k * 40, b.cz + 30 + (k % 2) * 10);
      for (let k = 0; k < 10; k++) T.put('bollard', b.x1 - 40, b.z0 + 230 + k * 22);
      T.line('fence', b.x0 + 10, b.z1 - 10, b.x1 - 10, b.z1 - 10, 31, { gapAt: 315, gapW: 90 });
      for (let k = 0; k < 4; k++) T.put('person', b.x0 + 220 + k * 50, b.z1 - 150, T.rng() * 6, { tint: 1 });
    },
  };

  function park(T, b, pond) {
    T.stripes(b.x0, b.z0, b.x1, b.z1, 2, COL.lawnA, COL.lawnB, 9);
    T.rect(b.cx - 26, b.z0, b.cx + 26, b.z1, 2.6, COL.path); T.rect(b.x0, b.cz - 26, b.x1, b.cz + 26, 2.6, COL.path);
    if (pond) {
      T.disc(b.cx, b.cz, 150, 2.8, COL.pondEdge, 40); T.disc(b.cx, b.cz, 136, 3.2, COL.pond, 40);
      const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pts.push([b.cx + Math.cos(a) * 175, b.cz + Math.sin(a) * 175]); }
      T.walkLoop(pts, 5);
      T.roamers('duck', b.cx, b.cz, 100, 6, { speed: [12, 22] });
    } else {
      T.disc(b.cx, b.cz, 95, 2.9, COL.path, 32); T.put('fountain', b.cx, b.cz);
      T.walkLoop([[b.x0 + 60, b.z0 + 60], [b.x1 - 60, b.z0 + 60], [b.x1 - 60, b.z1 - 60], [b.x0 + 60, b.z1 - 60]], 8);
    }
    for (const qx of [-1, 1]) for (const qz of [-1, 1]) {
      const cx = b.cx + qx * 175, cz = b.cz + qz * 175;
      T.put(T.pick({ parktree: 2, pine: 1, blossom: 1 }), cx + qx * 40, cz + qz * 40);
      T.put(T.pick({ blossom: 1, streettree: 1 }), cx - qx * 40, cz + qz * 70);
      T.put('bush', cx + qx * 80, cz - qz * 50); T.put('bush', cx - qx * 70, cz - qz * 60);
      for (let k = 0; k < 4; k++) T.put('flowerpot', cx - 40 + k * 24, cz - qz * 10);
      T.put('bench', b.cx + qx * 50, cz, Math.PI / 2 * qx); T.put('lamp', b.cx + qx * 40, b.cz + qz * 110, 0);
      if (T.rng.chance(0.6)) T.put('person', cx + T.rng.range(-40, 40), cz + T.rng.range(-40, 40), T.rng() * 6);
      T.put('cafeset', cx + qx * 10, cz + qz * 110);
    }
    const h = b.w / 2;
    T.line('fence', b.x0 + 8, b.z0 + 8, b.x1 - 8, b.z0 + 8, 31, { gapAt: h, gapW: 80 }); T.line('fence', b.x0 + 8, b.z1 - 8, b.x1 - 8, b.z1 - 8, 31, { gapAt: h, gapW: 80 });
    T.line('fence', b.x0 + 8, b.z0 + 8, b.x0 + 8, b.z1 - 8, 31, { gapAt: h, gapW: 80 }); T.line('fence', b.x1 - 8, b.z0 + 8, b.x1 - 8, b.z1 - 8, 31, { gapAt: h, gapW: 80 });
  }

  HC.Levels.add({
    id: 'city', num: 1, name: 'Hole City', tagline: 'Downtown island · parks, traffic & towers', icon: '🏙️', colors: ['#38B6FF', '#FF4F9A'],
    milestones: [['car', '🚗 Cars'], ['bus', '🚌 Buses'], ['parktree', '🌳 Big trees'], ['fountain', '⛲ Fountains'], ['house', '🏠 Houses'], ['shop', '🏪 Shops'], ['apartment', '🏢 Apartments'], ['civic', '🏛️ City Hall'], ['office', '🏙️ Offices'], ['tower', '🌆 Skyscrapers'], ['landmark', '🗼 THE TOWER']],
    generate(T) {
      T.island();
      T.rect(R[0] - 160, R[0] - 160, R[5] + 160, R[5] + 160, 0, '#F3EEF8');
      T.roadGrid(R);
      const plan = [
        ['res', 'com', 'apt', 'park', 'res'],
        ['lot', 'down', 'apt', 'down', 'com'],
        ['park2', 'apt', 'landmark', 'down', 'civic'],
        ['com', 'down', 'apt', 'down', 'lot'],
        ['res', 'works', 'com', 'res', 'res'],
      ];
      T.blocks(R, (b) => { BLOCKS[plan[b.bz][b.bx]](T, b); streetFurniture(T, b); });
      const o0 = R[0] - 130, o1 = R[5] + 130;
      T.walkLoop([[o0, o0], [o1, o0], [o1, o1], [o0, o1]], 40, { person: 1 }, { dogChance: 0.12, kind: 'sidewalk' });
      T.beach({ parasol: 45, beachball: 30, person: 20, lifeguard: 5 }, 70);
      T.traffic({ car: 30, taxi: 7, police: 3, van: 6 }, 46); T.traffic({ bus: 1 }, 5); T.traffic({ truck: 1 }, 4);
      T.spawnGrid(R); for (let i = 0; i < 5; i++) T.spawnAt(R[i] + 475, T.rng.chance(0.5) ? R[0] : R[5]);
    },
  });
})();
