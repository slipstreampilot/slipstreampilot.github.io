// Themed people: every level gets its own crowd (city doctors and firefighters, farm beekeepers, moon
// engineers…). About half of each level's ordinary walkers are swapped for these when the level is
// built (see HC.PEOPLE and gentools T.put); the rest stay as they were.
// Each type is told apart by silhouette — hat, outfit, a prop in hand — so it reads from the game camera.
(function () {
  const def = HC.defKind;
  const SKIN = ['#FFD3B0', '#F2B48C', '#C98B62', '#8D5A3B', '#FFE0C7'];
  const HAIR = '#5A3825', DARK = '#3A3F58', WHITE = '#FFFFFF', TIRE = '#2B2D42';
  const BRIGHT = ['#FF5A5F', '#FFB400', '#00A699', '#3D7BFF', '#9B5DE5', '#F15BB5', '#00BBF9', '#FEE440', '#00F5D4', '#FF8C42', '#7AE582'];

  // A walking person, modeled facing +z and turned to walk along +x like the stock 'person'.
  // o: s (scale), legs, shoes, torso ('tint' = per-instance colour), arms, skin, hair (null = none),
  //    hat(b), chest(b) (on the front of the torso), back(b), hand(b) (in the right hand, swings),
  //    left(b) (in the left hand), held(b) (carried at the right side, not swinging), extra(b) (anything
  //    else that doesn't swing), skirt (colour), bulk (torso width factor). `b` draws scaled parts.
  //    Model axes: +z is forward (the way it walks), +x is its right side, y is up.
  function human(g, o) {
    const s = o.s || 1, T = (c) => (c === 'tint' ? WHITE : c), tint = (c) => (c === 'tint' ? { tint: true } : {});
    const b = {
      block: (x, y, z, w, h, d, c, op = {}) => g.block(x * s, y * s, z * s, w * s, h * s, d * s, T(c), Object.assign(tint(c), op)),
      ball: (x, y, z, r, c, op = {}) => g.ball(x * s, y * s, z * s, r * s, T(c), Object.assign(tint(c), op)),
      cyl: (x, y, z, r0, r1, h, n, c, op = {}) => g.cyl(x * s, y * s, z * s, r0 * s, r1 * s, h * s, n, T(c), Object.assign(tint(c), op)),
      cone: (x, y, z, r, h, n, c, op = {}) => g.cone(x * s, y * s, z * s, r * s, h * s, n, T(c), Object.assign(tint(c), op)),
      box: (x, y, z, w, h, d, c, op = {}) => g.box(x * s, y * s, z * s, w * s, h * s, d * s, T(c), Object.assign(tint(c), op)),
      torus: (x, y, z, R, r, c, op = {}) => g._add(new THREE.TorusGeometry(R * s, r * s, 5, 14), x * s, y * s, z * s, op.rx || 0, op.ry || 0, op.rz || 0, 1, 1, 1, T(c), c === 'tint', op.shade),
      // A thin bar between two points (leashes, ropes, handles).
      bar: (x0, y0, z0, x1, y1, z1, t, c) => { const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz); g.box((x0 + x1) / 2 * s, (y0 + y1) / 2 * s, (z0 + z1) / 2 * s, L * s, t * s, t * s, T(c), Object.assign(tint(c), { ry: -Math.atan2(dz, dx), rz: Math.atan2(dy, Math.hypot(dx, dz)) })); },
    };
    const legs = o.legs || '#3B4A6B', torso = o.torso || 'tint', arms = o.arms || torso, skin = o.skin || '#FFD3B0', bulk = o.bulk || 1;
    g.turned(Math.PI / 2, () => {
      for (const x of [-3.2, 3.2]) g.limb(x < 0 ? 1 : -1, 0, 15 * s, () => { b.block(x, 0, 0, 5, 15, 6, legs); if (o.shoes) b.block(x, 0, 0.8, 5.4, 2.4, 7.4, o.shoes); });
      if (o.skirt) b.cyl(0, 6, 0, 6.5 * bulk, 8.5, 9, 8, o.skirt);
      b.block(0, 14, 0, 12 * bulk, 12, 7, torso);
      if (o.chest) o.chest(b);
      if (o.back) o.back(b);
      if (o.held) o.held(b);
      if (o.extra) o.extra(b);
      g.limb(0.6, 0, 24 * s, () => { b.block(-7.4 * bulk, 15, 0, 3, 10, 4, arms); if (o.left) o.left(b); });
      g.limb(-0.6, 0, 24 * s, () => { b.block(7.4 * bulk, 15, 0, 3, 10, 4, arms); if (o.hand) o.hand(b); });
      b.ball(0, 30, 0, 5, skin, { detail: 1 });
      if (o.hair !== null) b.ball(0, 32.5, -0.6, 5.1, o.hair || HAIR, { sy: 0.6 });
      if (o.hat) o.hat(b);
    });
  }
  // Each type: footprint like a person (w 8 forward, d 12 across, h ~34); kids are smaller.
  const person = (id, o, extra = {}) => def(id, Object.assign({ w: 8, d: 12, h: 36, points: 1, mass: 70, tints: o.tints || BRIGHT, mover: 'walk', build(g) { human(g, o); } }, extra));
  const kid = (id, o, extra = {}) => person(id, Object.assign({ s: 0.72 }, o), Object.assign({ w: 7, d: 9, h: 27, mass: 30 }, extra));

  // Common bits.
  const cap = (c, peak = '#2B2D42') => (b) => { b.cyl(0, 33.2, 0, 5.4, 5.4, 2.6, 10, c); b.block(0, 33.2, 4.6, 8, 0.8, 4, peak); };
  const brim = (c, r = 8, top = 3.5, tr = 4.6) => (b) => { b.cyl(0, 33, 0, r, r, 0.9, 12, c); b.cyl(0, 33.5, 0, tr, tr * 0.95, top, 10, c); };
  const helmet = (c) => (b) => { b.ball(0, 32, 0, 5.8, c, { sy: 0.8 }); };

  // ---------------- Hole City ----------------
  person('pp_business', { torso: '#2F3546', arms: '#2F3546', legs: '#2F3546', shoes: '#151515', tints: ['#FF5A5F', '#3D7BFF', '#FFB400', '#9B5DE5'],
    chest: (b) => { b.block(0, 18, 3.6, 3, 8, 0.6, WHITE); b.block(0, 18.5, 3.9, 1.4, 7, 0.6, 'tint'); },
    hand: (b) => { b.block(8.2, 10.5, 0, 2, 5.5, 8, '#6B4226'); b.block(8.2, 15, 0, 0.8, 1.5, 3, '#2B2D42'); } });
  person('pp_doctor', { torso: WHITE, arms: WHITE, legs: '#5FB4C9', shoes: WHITE, tints: SKIN,
    chest: (b) => { b.block(0, 22, 3.7, 6, 1.2, 0.5, '#2B2D42'); b.ball(2.6, 17.5, 3.9, 1, '#9AA3B8'); },
    hat: null, hair: '#3B2A20', left: (b) => b.block(-8.4, 12, 1.5, 1, 6, 5, '#CFE8F2') });
  person('pp_jogger', { torso: 'tint', arms: '#FFD3B0', legs: '#2B2D42', shoes: '#FF3B5C',
    hat: (b) => b.block(0, 33, 0, 10.6, 1.6, 10.6, 'tint'), chest: (b) => b.block(0, 14, 0, 12.4, 3, 7.4, '#2B2D42') });
  person('pp_police', { torso: '#2348A8', arms: '#2348A8', legs: '#1C2C5E', shoes: '#151515', tints: ['#FFD23F'],
    hat: (b) => { b.cyl(0, 33, 0, 5.9, 5.6, 3.6, 10, '#1C2C5E'); b.block(0, 33, 4.4, 9, 0.8, 4.4, '#151515'); b.block(0, 35, 5.3, 1.8, 1.8, 0.6, 'tint'); },
    chest: (b) => { b.block(-2.8, 21.5, 3.7, 1.8, 2, 0.5, 'tint'); b.block(0, 14, 0, 12.4, 1.6, 7.4, '#151515'); } });
  person('pp_firefighter', { torso: '#FFC93D', arms: '#FFC93D', legs: '#FFC93D', shoes: '#151515', bulk: 1.1, tints: ['#E6342C'],
    chest: (b) => { b.block(0, 16, 0, 13.6, 1.4, 7.6, '#C7E9F2'); b.block(0, 21, 0, 13.6, 1.4, 7.6, '#C7E9F2'); },
    back: (b) => b.cyl(0, 15, -5.2, 2.6, 2.6, 9, 8, '#B8C0D9'),
    hat: (b) => { b.ball(0, 32.5, 0, 6, 'tint', { sy: 0.75 }); b.block(0, 32, -3, 12, 1, 8, 'tint'); } });
  person('pp_builder', { torso: '#3D7BFF', arms: '#3D7BFF', legs: '#4A5A80', shoes: '#6B4226', tints: ['#FF8C1A', '#C6FF2E'],
    chest: (b) => { b.block(0, 14.5, 0, 12.6, 11, 7.6, 'tint'); b.block(0, 19, 0, 12.8, 1.4, 7.8, '#E8E8E8'); },
    hat: (b) => { b.ball(0, 33, 0, 5.8, '#FFD23F', { sy: 0.7 }); b.cyl(0, 32.6, 0, 7, 7, 0.7, 12, '#FFD23F'); } });

  // ---------------- Maple Hills ----------------
  person('pp_mail', { torso: '#5B8FD9', arms: '#5B8FD9', legs: '#2C3E6B', tints: ['#5B8FD9'],
    hat: cap('#2C3E6B'), back: (b) => { b.block(-6.6, 11, 0, 3, 8, 8, '#8A5A33'); b.box(0, 21, 0, 1, 1, 14, '#6B4226', { rz: 0.7 }); } });
  person('pp_dogwalker', { torso: 'tint', legs: '#4A6B8A', shoes: WHITE,
    extra: (b) => { b.bar(9, 14, 1, 15, 6.5, 6, 0.7, '#E63946'); b.block(15, 1.5, 1, 4, 5, 9, '#C8873E'); b.block(15, 4.5, 6, 4, 4, 4, '#C8873E'); for (const z of [-2, 4]) b.block(15, 0, z, 3, 2, 1.4, '#5A3E2B'); } });
  person('pp_gardener', { torso: '#6BAF4A', arms: '#F2B48C', legs: '#8A6A3B', skin: '#F2B48C', tints: ['#FF9FD2', '#FFD23F'],
    hat: brim('#F3D27A', 8.5, 3, 4.4), left: (b) => { b.cyl(-9, 9, 0, 2.8, 2.4, 5, 8, '#3DA35D'); b.box(-9, 12, 3, 1, 1, 5, '#3DA35D', { rx: -0.6 }); },
    chest: (b) => b.block(0, 14, 3.6, 9, 9, 0.6, '#3F6E2A') });
  kid('pp_skater', { torso: 'tint', legs: '#3B4A6B', shoes: '#151515', hat: cap('tint', '#2B2D42'),
    chest: (b) => b.block(0, -3, 0, 10, 1, 20, '#7A3E9D') }, { h: 30 });
  def('pp_stroller', { w: 26, d: 12, h: 36, points: 1, mass: 80, tints: BRIGHT, mover: 'walk',
    build(g) {
      human(g, { torso: 'tint', legs: '#3B4A6B', extra: (b) => { b.bar(-5, 15, 4, -5, 17, 10, 1, '#555'); b.bar(5, 15, 4, 5, 17, 10, 1, '#555'); b.bar(-5, 17, 10, 5, 17, 10, 1, '#555'); } });
      g.block(16, 4, 0, 11, 7, 9, '#4FB3E8'); g.ball(16, 11, -2, 5, '#4FB3E8', { sy: 0.8 });
      for (const [x, z] of [[12, -4.5], [20, -4.5], [12, 4.5], [20, 4.5]]) g.cyl(x, 0, z, 2, 2, 1.2, 8, TIRE, { rx: Math.PI / 2 });
    } });
  kid('pp_paperkid', { torso: 'tint', legs: '#4A6B8A', hat: cap('tint'),
    back: (b) => { b.block(-6.8, 11, 0, 3, 8, 8, '#E9E2D0'); b.block(-6.8, 18.5, 0, 3.2, 2, 7, '#BFB8A6'); } });

  // ---------------- Sunny Shores ----------------
  person('pp_surfer', { torso: '#F2B48C', arms: '#F2B48C', legs: 'tint', skin: '#F2B48C', hair: '#F2D16B',
    held: (b) => { b.box(10.5, 17, 0, 1.6, 32, 7, '#FFFFFF', { rx: 0.08 }); b.box(10.6, 17, 0, 1.7, 26, 1.4, 'tint', { rx: 0.08 }); }, chest: (b) => b.block(0, 14, 0, 12.4, 3, 7.4, 'tint') });
  def('pp_icecream', { w: 30, d: 14, h: 40, points: 1, mass: 90, tints: ['#FF9FD2', '#8FD3FF', '#9BF0CF'], mover: 'walk',
    build(g) {
      human(g, { torso: WHITE, arms: WHITE, legs: '#5FB4C9', hat: (b) => b.cyl(0, 33.5, 0, 4.4, 5, 4, 10, WHITE) });
      g.block(17, 6, 0, 14, 12, 11, '#FFF', { tint: true }); g.block(17, 18, 0, 14.6, 1.4, 11.6, '#FFFFFF');
      g.cyl(17, 19.4, 0, 0.6, 0.6, 16, 6, '#B8C0D9'); g.cone(17, 34, 0, 10, 4, 8, '#FF5FA2');
      for (const z of [-5.6, 5.6]) g.cyl(17, 0, z, 3, 3, 1.4, 10, TIRE, { rx: Math.PI / 2 });
    } });
  person('pp_snorkeler', { torso: 'tint', arms: '#FFD3B0', legs: '#FFD3B0', shoes: '#22C3B5',
    hat: (b) => { b.block(0, 29.5, 4, 8, 3.4, 1.6, '#9FE7FF'); b.block(0, 29.5, 3.2, 9, 4.2, 1, '#FF8C42'); b.cyl(3.6, 30, 3.8, 0.7, 0.7, 8, 6, '#FF8C42'); },
    chest: (b) => b.block(0, 14, 0, 12.4, 4, 7.4, 'tint') }, );
  kid('pp_beachkid', { torso: 'tint', arms: '#FFD3B0', legs: '#FFD3B0', hat: brim('tint', 6.5, 2.5, 4.6),
    hand: (b) => { b.cyl(9.5, 7, 0, 3, 2.4, 5, 8, '#FFD23F'); }, left: (b) => b.block(-9, 6, 0, 1, 10, 3, '#3D7BFF') });
  person('pp_volley', { torso: 'tint', arms: '#FFD3B0', legs: '#FFD3B0', shoes: WHITE, hat: (b) => b.block(0, 33, 0, 10.6, 1.4, 10.6, 'tint'),
    hand: (b) => b.ball(9.5, 13, 3, 4, '#FFF4E3'), chest: (b) => b.block(0, 14, 0, 12.4, 3, 7.4, '#3D7BFF') });

  // ---------------- Cluckington Farm ----------------
  person('pp_farmer', { torso: '#E9473C', arms: '#E9473C', legs: '#3D6BC9', tints: ['#3D6BC9'], skin: '#F2B48C',
    chest: (b) => { b.block(0, 14, 3.6, 9, 9, 0.6, 'tint'); b.block(-3, 23, 3.6, 1.4, 3, 0.6, 'tint'); b.block(3, 23, 3.6, 1.4, 3, 0.6, 'tint'); },
    hat: brim('#E8C66B', 9, 3.5, 4.8), held: (b) => { b.block(9.5, 2, 1, 1, 30, 1, '#8A5A33'); b.block(9.5, 31, 1, 0.8, 0.8, 6, '#B8C0D9'); for (const z of [-2, 1, 4]) b.block(9.5, 31.4, z, 0.6, 5, 0.6, '#B8C0D9'); } });
  person('pp_milkmaid', { torso: '#5FA8E8', arms: '#FFF4E3', legs: '#FFF4E3', skirt: '#5FA8E8', tints: ['#5FA8E8'], hair: '#C98B3A',
    hat: (b) => b.ball(0, 33, -0.5, 5.6, WHITE, { sy: 0.6 }), chest: (b) => b.block(0, 10, 4, 8, 12, 0.6, WHITE),
    hand: (b) => { b.cyl(9.5, 6, 0, 3, 2.6, 6, 10, '#B8C0D9'); b.cyl(9.5, 11.5, 0, 2.6, 2.6, 0.6, 10, '#FFFFFF'); } });
  person('pp_beekeeper', { torso: WHITE, arms: WHITE, legs: WHITE, shoes: '#3B3B3B', bulk: 1.1, tints: ['#FFD23F'],
    hat: (b) => { b.cyl(0, 32, 0, 8.4, 8.4, 0.8, 12, '#F2EBD9'); b.cyl(0, 25.5, 0, 6.2, 7.4, 6.5, 12, '#CFC7B2'); b.block(0, 27, 6.6, 7, 4, 0.4, '#3A3F58'); b.cyl(0, 32.6, 0, 4.6, 4.6, 3, 10, '#F2EBD9'); },
    hand: (b) => { b.cyl(9.5, 9, 0, 2.4, 2.4, 6, 8, '#B8C0D9'); b.cone(9.5, 15, 0, 1.6, 3, 6, '#9AA3B8'); b.ball(13, 22, 2, 1.2, 'tint'); } });
  kid('pp_feedkid', { torso: 'tint', legs: '#3D6BC9', hat: cap('#E9473C'),
    left: (b) => { b.block(-9, 8, 0, 4, 7, 6, '#E8C66B'); }, hand: (b) => { for (let i = 0; i < 4; i++) b.ball(9.5 + i * 1.4, 10 - i * 2.4, i % 2 - 0.5, 0.8, '#F3D27A'); } });
  person('pp_vet', { torso: '#3FA37A', arms: '#3FA37A', legs: '#3FA37A', shoes: '#151515', tints: SKIN,
    chest: (b) => { b.block(0, 22, 3.7, 6, 1.2, 0.5, '#2B2D42'); b.ball(2.6, 17.5, 3.9, 1, '#9AA3B8'); },
    hand: (b) => { b.block(8.8, 9, 0, 3, 5, 8, '#B04A3B'); b.block(8.8, 14, 0, 1, 1.5, 4, '#2B2D42'); } });

  // ---------------- Funland ----------------
  person('pp_clown', { torso: 'tint', arms: '#FFD23F', legs: '#3D7BFF', shoes: '#FF3B5C', bulk: 1.15, hair: null,
    chest: (b) => { for (const y of [17, 21]) b.ball(0, y, 4, 1.2, WHITE); b.block(0, 25.5, 0, 14, 1.6, 9, WHITE); },
    hat: (b) => { b.ball(0, 30, 5, 1.6, '#FF3B5C'); b.ball(-4.4, 31, -0.5, 3.6, '#FF5FA2'); b.ball(4.4, 31, -0.5, 3.6, '#5CC8FF'); b.ball(0, 34, -1, 3.8, '#7BE0AD'); } });
  person('pp_juggler', { torso: 'tint', legs: '#2B2D42', shoes: '#151515',
    hat: (b) => { b.cyl(0, 33.5, 0, 3, 5, 4, 8, '#9B5DE5'); b.ball(0, 37.8, 0, 1.2, '#FFD23F'); },
    extra: (b) => { b.ball(6, 40, 3, 1.6, '#FF3B5C'); b.ball(0, 44, 3, 1.6, '#FFD23F'); b.ball(-6, 40, 3, 1.6, '#3D7BFF'); } }, { h: 46 });
  person('pp_operator', { torso: 'tint', legs: '#2B2D42', tints: ['#FF5FA2', '#5CC8FF'],
    chest: (b) => { for (const y of [15.5, 19, 22.5]) b.block(0, y, 0, 12.4, 1.4, 7.4, WHITE); }, hat: cap('#FF3B5C', '#FF3B5C'),
    hand: (b) => b.block(8.8, 10, 2, 1.2, 4, 2.2, '#2B2D42') });
  kid('pp_candykid', { torso: 'tint', legs: '#3B4A6B', hand: (b) => { b.block(9.5, 8, 0, 0.8, 16, 0.8, WHITE); b.ball(9.5, 27, 0, 4.6, '#FF9FD2'); } }, { h: 32 });

  // ---------------- Frostville ----------------
  person('pp_snowboarder', { torso: 'tint', arms: 'tint', legs: '#3B4A6B', bulk: 1.1, hat: helmet('#2B2D42'),
    chest: (b) => b.block(0, 29.5, 4, 8, 2.6, 1.4, '#FFB400'), held: (b) => b.box(10.5, 18, 0, 1.4, 34, 8.5, '#FF5A5F', { rx: 0.05 }) });
  person('pp_iceskater', { torso: 'tint', legs: '#F2EBD9', skirt: 'tint', shoes: '#FFFFFF', hair: '#C98B3A',
    chest: (b) => { b.block(0, 24, 0, 13, 2.4, 8, '#E63946'); b.block(4, 18, 4, 2.4, 7, 0.8, '#E63946'); },
    hat: (b) => { b.ball(0, 32.5, 0, 5.4, '#E63946', { sy: 0.8 }); b.ball(0, 37, 0, 1.8, WHITE); } });
  kid('pp_sledkid', { torso: 'tint', arms: 'tint', legs: 'tint', bulk: 1.25, hat: (b) => { b.ball(0, 32.5, 0, 5.4, '#FFFFFF', { sy: 0.8 }); b.ball(0, 37, 0, 1.6, '#E63946'); },
    extra: (b) => { b.bar(9, 13, 0, 4, 3, -12, 0.7, '#8A5A33'); b.block(2, 0, -20, 9, 2.4, 16, '#E63946'); b.block(2, 2.4, -26, 9, 3, 2, '#E63946'); } }, { w: 22, h: 30 });
  person('pp_skipatrol', { torso: '#E6342C', arms: '#E6342C', legs: '#2B2D42', bulk: 1.1, tints: [WHITE],
    chest: (b) => { b.block(0, 18.5, 3.8, 6, 2, 0.6, 'tint'); b.block(0, 16.5, 3.8, 2, 6, 0.6, 'tint'); }, hat: helmet('#E6342C'),
    back: (b) => b.block(0, 14, -5, 9, 10, 3, '#B0262A') });
  person('pp_icefisher', { torso: 'tint', arms: 'tint', legs: '#4A5A80', bulk: 1.2, tints: ['#7A5230', '#3E6B8C', '#6B3E8C'],
    hat: (b) => { b.ball(0, 32, 0, 6.2, '#E9DCC5', { sy: 0.85 }); for (const x of [-5.2, 5.2]) b.block(x, 27.5, 0, 1.6, 5, 4, '#E9DCC5'); },
    held: (b) => { b.bar(9, 13, 2, 9, 30, 16, 0.9, '#8A5A33'); b.block(9, 4, 16, 0.3, 26, 0.3, '#DDDDDD'); b.block(9, 0, 16, 5, 0.4, 5, '#BFE6F2'); } }, { h: 36 });

  // ---------------- Neon Ward ----------------
  person('pp_gamer', { torso: 'tint', arms: 'tint', legs: '#2B2D42', shoes: WHITE, tints: ['#9B5DE5', '#2B2D42', '#FF3FA4', '#00BBF9'],
    hat: (b) => { b.ball(0, 31.5, -1.4, 5.8, 'tint', { sy: 0.9 }); b.box(0, 34.5, 0, 12, 1.2, 1.6, '#151515'); for (const x of [-5.6, 5.6]) b.block(x, 28.5, 0, 1.6, 4, 4, '#00F5D4'); },
    hand: (b) => b.block(8.5, 13, 3, 2.2, 1.4, 5, '#151515') });
  person('pp_cook', { torso: WHITE, arms: WHITE, legs: '#2B2D42', tints: ['#FF3FA4', '#FFB400'],
    hat: (b) => { b.cyl(0, 33, 0, 4.6, 4.6, 3, 10, WHITE); b.ball(0, 38, 0, 5.2, WHITE, { sy: 0.6 }); }, chest: (b) => b.block(0, 22.5, 0, 12.4, 1.6, 7.4, 'tint'),
    hand: (b) => { b.cyl(11, 13, 2, 4.4, 2.6, 2.4, 12, '#2B2D42'); b.block(8, 14, 2, 4, 0.8, 0.8, '#2B2D42'); b.ball(11, 15.5, 2, 1.6, '#FFB400'); } }, { h: 42 });
  def('pp_cyclist', { w: 26, d: 8, h: 38, points: 1, mass: 85, tints: ['#00F5D4', '#FF3FA4', '#FFE45C', '#7DF9FF'], mover: 'walk',
    build(g) {
      for (const x of [-8, 8]) { g.cyl(x, 5, 0, 5.4, 5.4, 1, 14, TIRE, { rx: Math.PI / 2 }); g.cyl(x, 5, 0, 5.8, 5.8, 0.6, 14, '#FFF', { rx: Math.PI / 2, tint: true }); }
      g.box(0, 9, 0, 16, 1.2, 1.2, '#B8C0D9', {}); g.box(-3, 8, 0, 1.2, 8, 1.2, '#B8C0D9', { rz: 0.4 }); g.block(8, 9, 0, 1.2, 9, 1.2, '#B8C0D9'); g.block(7, 17, 0, 1.2, 1.2, 8, '#2B2D42');
      g.block(-3, 12, 0, 5, 1.2, 3, '#151515');
      g.block(-3, 13, 0, 6, 8, 8, '#3B4A6B'); g.box(1, 19, 0, 10, 6, 8, '#FFF', { tint: true, rz: -0.6 });
      g.ball(5, 26, 0, 4.6, '#FFD3B0'); g.ball(5, 28, 0, 5.4, '#FFF', { tint: true, sy: 0.7 });
    } });
  person('pp_umbrella', { torso: '#2F3546', arms: '#2F3546', legs: '#2F3546', shoes: '#151515', tints: ['#FF3FA4', '#00F5D4', '#FFE45C', '#7A5CFF'],
    held: (b) => { b.block(8.5, 12, 1, 0.8, 30, 0.8, '#151515'); b.cone(4, 38, 1, 13, 6, 10, 'tint'); } }, { h: 46 });
  person('pp_idol', { torso: 'tint', arms: 'tint', legs: WHITE, shoes: 'tint', skirt: 'tint', hair: '#FF9FD2', tints: ['#FF3FA4', '#7A5CFF', '#00F5D4'],
    hat: (b) => { b.ball(-5, 31, -1, 2.8, '#FF9FD2'); b.ball(5, 31, -1, 2.8, '#FF9FD2'); b.block(0, 34.5, 0, 6, 1.2, 1.2, '#FFE45C'); },
    hand: (b) => { b.block(8.4, 22, 3, 1, 6, 1, '#151515'); b.ball(8.4, 28, 3, 1.6, '#B8C0D9'); } });
  def('pp_robot', { w: 14, d: 12, h: 28, points: 1, mass: 60, tints: ['#00F5D4', '#FF3FA4', '#FFE45C'], mover: 'walk',
    build(g) {
      for (const [x, z] of [[-4, -4.5], [4, -4.5], [-4, 4.5], [4, 4.5]]) g.cyl(x, 0, z, 2.6, 2.6, 1.6, 10, TIRE, { rx: Math.PI / 2 });
      g.block(0, 2.4, 0, 13, 12, 11, '#E8ECF4'); g.block(0, 14.4, 0, 13.4, 1.2, 11.4, '#FFF', { tint: true });
      g.block(0, 15.6, 0, 9, 7, 8, '#E8ECF4'); g.panel('x+', 4.6, 18, 0, 6, 3, '#151515'); g.ball(4.8, 19, -1.6, 0.8, '#FFF', { tint: true }); g.ball(4.8, 19, 1.6, 0.8, '#FFF', { tint: true });
      g.block(0, 22.6, 0, 0.6, 4, 0.6, '#9AA3B8'); g.ball(0, 27, 0, 1.2, '#FFF', { tint: true });
    } });

  // ---------------- Dusty Gulch ----------------
  const stetson = (c) => (b) => { b.cyl(0, 33, 0, 8.6, 8.6, 0.9, 12, c); b.cyl(0, 33.5, 0, 4.6, 5, 4.4, 10, c); b.block(0, 34, 0, 9.6, 1, 9.6, '#2B2D42'); };
  person('pp_sheriff', { torso: '#C9B48A', arms: '#C9B48A', legs: '#4A3A2A', shoes: '#3B2A20', tints: ['#FFD23F'], hat: stetson('#2B2D42'),
    chest: (b) => { b.cone(-2.8, 20.5, 3.8, 1.8, 0.6, 5, 'tint'); b.block(0, 14, 0, 12.4, 1.6, 7.4, '#5A3825'); b.block(5.2, 11, 2, 2, 4, 2.4, '#3B2A20'); } });
  person('pp_prospector', { torso: '#8A6A3B', arms: '#C98B62', legs: '#5A4632', shoes: '#3B2A20', hair: '#BFBFBF', tints: ['#BFBFBF'],
    hat: (b) => { b.ball(0, 32, 0, 5.4, '#7A5230', { sy: 0.8 }); b.cyl(0, 32, 0, 7, 7, 0.6, 10, '#7A5230'); b.ball(0, 26.5, 3, 3.8, 'tint', { sy: 1.2 }); },
    held: (b) => { b.block(9.5, 4, 1, 1, 22, 1, '#8A5A33'); b.box(9.5, 26, 1, 1.2, 1.2, 9, '#9AA3B8', { rx: 0.4 }); },
    left: (b) => b.cyl(-9.5, 12, 2, 4, 3, 1.4, 12, '#B8C0D9') });
  person('pp_pianist', { torso: '#7A2E3B', arms: WHITE, legs: '#2B2D42', shoes: '#151515', tints: ['#7A2E3B'],
    chest: (b) => { b.block(0, 18, 3.6, 3, 8, 0.6, WHITE); b.block(0, 23.5, 3.9, 3, 1, 0.6, '#151515'); },
    hat: (b) => { b.cyl(0, 33, 0, 6.6, 6.6, 0.8, 12, '#2B2D42'); b.ball(0, 33.5, 0, 4.6, '#2B2D42', { sy: 0.8 }); } });
  person('pp_rancher', { torso: 'tint', legs: '#3D5A8A', shoes: '#5A3825', tints: ['#D23C2C', '#3D7BFF', '#E6A23C'], hat: stetson('#C98B3A'),
    chest: (b) => b.block(0, 22, 3.6, 9, 4, 0.6, '#F2EBD9'),
    held: (b) => { b.torus(10, 13, 2, 4.6, 0.6, '#C9A66B', { rx: 0.3 }); b.torus(10.3, 12.5, 2, 3.8, 0.6, '#C9A66B', { rx: 0.4 }); } });
  person('pp_bonnet', { torso: 'tint', arms: 'tint', legs: 'tint', skirt: 'tint', shoes: '#3B2A20', hair: '#8A5A33', tints: ['#9BC4E2', '#E8A5C2', '#B7D99B', '#F2D16B'],
    hat: (b) => { b.ball(0, 31.5, -1.5, 5.8, '#F2EBD9', { sy: 0.9 }); b.cyl(0, 30, 3, 6.4, 6.4, 0.8, 12, '#F2EBD9', { rx: Math.PI / 2 }); },
    chest: (b) => b.block(0, 13, 4, 8, 12, 0.6, WHITE) });

  // ---------------- Dino Valley ----------------
  const pith = (c) => (b) => { b.ball(0, 32.5, 0, 6, c, { sy: 0.7 }); b.cyl(0, 32, 0, 8, 8, 0.6, 12, c); };
  person('pp_paleo', { torso: '#C9B48A', arms: '#C9B48A', legs: '#8A6A3B', shoes: '#5A3825', tints: ['#C9B48A'], hat: pith('#E8DDBF'),
    chest: (b) => { b.block(-3, 20, 3.7, 3, 3, 0.6, '#A89670'); b.block(3, 20, 3.7, 3, 3, 0.6, '#A89670'); },
    hand: (b) => { b.block(9, 11, 2, 1, 6, 1, '#8A5A33'); b.block(9, 9, 2, 2.2, 2.6, 1.6, '#E8C66B'); }, left: (b) => b.block(-9, 7, 0, 3, 6, 5, '#F2EBD9') });
  person('pp_ranger', { torso: '#7A8A4A', arms: '#7A8A4A', legs: '#5A6436', shoes: '#3B2A20', tints: ['#E6A23C'], hat: brim('#8A6A3B', 8.5, 3.5, 4.8),
    chest: (b) => { b.cone(-2.8, 20.5, 3.8, 1.6, 0.6, 6, 'tint'); }, hand: (b) => b.block(9, 8, 2.5, 1.6, 6, 2, '#2B2D42') });
  person('pp_tourist', { torso: 'tint', arms: '#FFD3B0', legs: '#E8DDBF', shoes: WHITE, tints: ['#FF5A8A', '#00BBF9', '#FFB400', '#7BE0AD'],
    chest: (b) => { for (const [x, y] of [[-3, 22], [2, 18], [-2, 15.5], [3.5, 23.5]]) b.ball(x, y, 3.8, 1.2, '#FFE45C'); b.block(0, 17, 4.6, 4, 3, 2, '#2B2D42'); b.cyl(0, 17.6, 5.8, 1, 1, 1.4, 8, '#9FE7FF', { rx: Math.PI / 2 }); },
    hat: cap('#FFFFFF', '#FF5A8A'), back: (b) => b.block(0, 14, -5, 8, 10, 3, '#3D7BFF') });
  kid('pp_dinokid', { torso: '#5ACB6B', arms: '#5ACB6B', legs: '#5ACB6B', tints: ['#5ACB6B'], hair: null,
    hat: (b) => { b.ball(0, 32, 0, 6.4, 'tint', { sy: 0.95 }); b.block(0, 30.5, 5.5, 6, 3, 3, 'tint'); for (let i = 0; i < 3; i++) b.cone(0, 35 - i * 3.5, -3 - i * 1.6, 1.8, 2.6, 4, '#FFB400'); },
    back: (b) => { b.box(0, 10, -8, 3, 3, 9, '#5ACB6B', { rx: 0.5 }); for (let i = 0; i < 3; i++) b.cone(0, 22 - i * 4, -4.5, 1.6, 2.4, 4, '#FFB400'); } });
  person('pp_scientist', { torso: WHITE, arms: WHITE, legs: '#3B4A6B', shoes: '#151515', tints: SKIN, hair: '#BFBFBF',
    hat: (b) => b.block(0, 30, 4.8, 8, 1.6, 1, '#2B2D42'), left: (b) => b.block(-8.6, 11, 2, 1, 7, 5, '#F2EBD9'),
    chest: (b) => { b.block(0, 22, 3.7, 6, 1, 0.5, '#5FB4C9'); b.block(-2.8, 19, 3.8, 0.6, 3, 0.6, '#3D7BFF'); } });
  person('pp_driver', { torso: '#7A8A4A', arms: '#7A8A4A', legs: '#8A6A3B', shoes: '#3B2A20', tints: ['#E6342C', '#FFB400'], hair: '#3B2A20',
    hat: (b) => { b.block(0, 30.5, 4.4, 9.6, 2.4, 1.4, '#3B3B3B'); b.block(-2.2, 30.5, 5.2, 3, 1.8, 0.6, '#9FE7FF'); b.block(2.2, 30.5, 5.2, 3, 1.8, 0.6, '#9FE7FF'); },
    chest: (b) => { b.block(0, 24.5, 0, 13, 2.4, 8, 'tint'); b.box(-5, 18, 4, 2, 9, 1, 'tint', { rz: -0.2 }); } });

  // ---------------- Lunar Base ----------------
  const spaceSuit = (o) => Object.assign({ torso: WHITE, arms: WHITE, legs: WHITE, shoes: '#9AA3B8', hair: null, bulk: 1.12,
    hat: (b) => { b.ball(0, 30.5, 0, 6.6, '#E8ECF4'); b.ball(0, 30.5, 1.8, 5.4, o.visor || '#FFC83D', { sy: 0.8 }); },
    back: (b) => b.block(0, 13, -5.4, 10, 12, 4, '#C9CED9') }, o);
  person('pp_engineer', spaceSuit({ torso: 'tint', arms: 'tint', legs: 'tint', tints: ['#FF8C42', '#3D7BFF'], visor: '#9FE7FF',
    chest: (b) => { b.block(0, 14, 0, 14.4, 2.4, 9, '#5A3825'); for (const x of [-4, 0, 4]) b.block(x, 11.4, 4.2, 1.6, 3, 1, '#9AA3B8'); },
    hand: (b) => { b.block(9, 9, 2, 1.4, 7, 1.4, '#B8C0D9'); b.block(9, 15, 2, 3, 1.6, 3, '#B8C0D9'); } }));
  person('pp_roverdriver', spaceSuit({ torso: '#FF8C1A', arms: '#FF8C1A', legs: '#FF8C1A', tints: ['#FF8C1A'], visor: '#FFC83D',
    chest: (b) => { b.block(0, 21, 4.4, 6, 3, 0.8, '#2B2D42'); b.block(0, 21, 4.8, 3, 1.4, 0.6, '#22DD88'); },
    hand: (b) => b.block(9, 11, 3, 2.6, 4, 3, '#2B2D42') }));
  person('pp_moonsci', { torso: WHITE, arms: WHITE, legs: '#9AA3B8', shoes: '#151515', tints: SKIN, hair: '#3B2A20',
    hat: (b) => b.block(0, 30, 4.8, 8, 1.6, 1, '#151515'), chest: (b) => b.block(0, 14, 0, 12.4, 2, 7.4, '#5A5AFF'),
    hand: (b) => { b.block(9.2, 7, 0, 3.4, 6, 7, '#C9CED9'); b.block(9.2, 13, 0, 1, 1.6, 3, '#2B2D42'); b.block(9.8, 9, 0, 0.4, 2, 2.4, '#5A5AFF'); } });
  person('pp_spacetourist', { torso: 'tint', arms: '#FFD3B0', legs: '#4A6B8A', shoes: WHITE, tints: ['#FF5AC8', '#FFD23F', '#2EC4B6'],
    chest: (b) => { b.ball(0, 19.5, 3.8, 2.6, '#E8ECF4', { sy: 0.4 }); b.block(0, 16, 3.8, 6, 1.4, 0.5, '#2B2D42'); },
    hat: (b) => { b.torus(0, 30.5, 0, 6.6, 0.7, '#CDEFFF', { rx: Math.PI / 2 }); b.torus(0, 30.5, 0, 6.6, 0.7, '#CDEFFF'); b.ball(0, 37, 0, 1.2, '#CDEFFF'); }, hand: (b) => b.block(9.2, 13, 3, 2.4, 3, 1, '#151515') });
  def('pp_moonbot', { w: 14, d: 14, h: 22, points: 1, mass: 60, tints: ['#FF5AC8', '#2EC4B6', '#FFD23F'], mover: 'walk',
    build(g) {
      for (const z of [-5.6, 5.6]) { g.block(0, 0, z, 13, 4, 3, '#3A3F58'); g.cyl(-5, 2, z, 2, 2, 3, 10, '#5A6080', { rx: Math.PI / 2 }); g.cyl(5, 2, z, 2, 2, 3, 10, '#5A6080', { rx: Math.PI / 2 }); }
      g.block(0, 4, 0, 11, 9, 9, '#E8ECF4'); g.block(0, 13, 0, 11.4, 1.2, 9.4, '#FFF', { tint: true });
      g.cyl(0, 14.2, 0, 1, 1, 4, 8, '#9AA3B8'); g.ball(0, 19.5, 0, 3.6, '#E8ECF4'); g.panel('x+', 3.2, 19.5, 0, 4, 2, '#151515');
      g.ball(3.4, 20, -1.1, 0.6, '#FFF', { tint: true }); g.ball(3.4, 20, 1.1, 0.6, '#FFF', { tint: true });
      g.block(0, 9, 5.8, 2, 2, 5, '#9AA3B8');
    } });

  // Which people each level adds, and which of its existing walkers ~half get swapped for them.
  HC.PEOPLE = {
    city: { base: ['person'], share: 0.5, types: ['pp_business', 'pp_doctor', 'pp_jogger', 'pp_police', 'pp_firefighter', 'pp_builder'] },
    suburbia: { base: ['person'], share: 0.5, types: ['pp_mail', 'pp_dogwalker', 'pp_gardener', 'pp_skater', 'pp_stroller', 'pp_paperkid'] },
    beach: { base: ['person'], share: 0.5, types: ['pp_surfer', 'pp_icecream', 'pp_snorkeler', 'pp_beachkid', 'pp_volley'] },
    farm: { base: ['person'], share: 0.5, types: ['pp_farmer', 'pp_milkmaid', 'pp_beekeeper', 'pp_feedkid', 'pp_vet'] },
    funland: { base: ['person'], share: 0.5, types: ['pp_clown', 'pp_juggler', 'pp_operator', 'pp_candykid'] },
    frost: { base: ['person'], share: 0.5, types: ['pp_snowboarder', 'pp_iceskater', 'pp_sledkid', 'pp_skipatrol', 'pp_icefisher'] },
    neon: { base: ['person'], share: 0.5, types: ['pp_gamer', 'pp_cook', 'pp_cyclist', 'pp_umbrella', 'pp_idol', 'pp_robot'] },
    gulch: { base: ['person', 'gulch_cowboy'], share: 0.5, types: ['pp_sheriff', 'pp_prospector', 'pp_pianist', 'pp_rancher', 'pp_bonnet'] },
    dino: { base: ['person'], share: 0.5, types: ['pp_paleo', 'pp_ranger', 'pp_tourist', 'pp_dinokid', 'pp_scientist', 'pp_driver'] },
    moon: { base: ['moon_astro'], share: 0.5, types: ['pp_engineer', 'pp_roverdriver', 'pp_moonsci', 'pp_spacetourist', 'pp_moonbot'] },
  };
})();
