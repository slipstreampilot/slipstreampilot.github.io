# Level authoring guide

Each level is a single file, `js/levels/NN-name.js`, loaded by `index.html`. A level registers
itself with `HC.Levels.add({...})`. Use `js/levels/01-city.js` and `js/levels/02-suburbia.js` as
the reference examples.

```js
(function () {
  function kinds(def) { /* def('id', {...}) for this level's own objects */ }
  HC.Levels.add({
    id: 'farm', num: 4, name: 'Cluckington Farm', tagline: 'Short line shown on the level card', icon: '🐄',
    colors: ['#hexA', '#hexB'],           // gradient for the level card
    theme: { ... },                       // look (see below); missing keys fall back to defaults
    mods: { gravity: 1, grip: 1, botSkill: 0 },
    milestones: [['car', '🚗 Cars'], …],  // a toast appears when each kind first fits; order small → big; end with the landmark
    kinds,
    generate(T) { … },                    // lay out the level with the T toolkit
  });
})();
```

## World scale

- 1 unit = 5 cm. The play area is x, z ∈ [0, 5000]. Land runs from −260 to 5260, so there is a beach ring.
- y is up. Objects sit at y = 0, and the camera looks north (−z).
- Ground decals stack by `y`: base ground 0, roads 0.8, curb 1.0, sidewalk 1.6, block surface 2,
  paths and decor 2.4–3.2, markings 1.4–3.1. Keep everything between 0 and 3.5.
- Holes start at radius 17 (diameter 34). The radius grows ×1.2 per level, up to level 20 (r ≈ 540).
  A kind fits when its narrow side `min(w, d) < 2.07 × r`.

| Level | r | Now fits (narrow side up to) |
|---|---|---|
| 1 | 17 | 35 |
| 2 | 20 | 42 |
| 3 | 24.5 | 50 |
| 4 | 29 | 61 |
| 5 | 35 | 73 |
| 6 | 42 | 88 |
| 7 | 51 | 105 |
| 8 | 61 | 126 |
| 9 | 73 | 151 |
| 10 | 88 | 182 |
| 11 | 105 | 218 |
| 12 | 126 | 262 |
| 13 | 152 | 314 |
| 14 | 182 | 377 |
| 15 | 218 | 452 |
| 16 | 262 | 543 |
| 17 | 314 | 651 |

## Kinds: `def(id, { w, d, h, points, mass, tints?, hs?, build(g) })`

- `w`, `d`, `h` are the collider box in units: x (length), z (depth), y (height). Draw the mesh to
  match the box closely, with its origin at the center of the footprint on the ground.
- `points` follows the size ladder:

| Size | Examples | Points |
|---|---|---|
| tiny (≤ 15) | people, cones | 1 |
| small (15–40) | benches, bikes | 2–3 |
| car-size (40–60) | vehicles | 5–6 |
| bus-size (50–80 narrow side, long) | buses, trucks | 12–15 |
| small building (130–180) | houses | 20–28 |
| medium building (230–260) | apartments | 45–55 |
| large (300–350) | offices | 80–90 |
| very large (400) | towers | 130–150 |
| landmark (480–560) | the level's finale | 300–350 |

- `mass` in kg is rough: a person is 70, a car 1,200, a building 10⁵–10⁶.
- `tints` is a list of hex colors. Parts drawn with `{ tint: true }` take one of these per instance.
  Draw tinted parts in `'#FFF'`.
- `hs` (optional) squashes very tall things vertically so the camera can see past them (0.6–0.85).
- Reuse shared kinds from `js/catalog.js` freely:
  person, dog, cone, hydrant, bin, bollard, mailbox, flowerpot, bush, newsbox, meter, duck, fence,
  beachball, parasol, lifeguard, bench, bike, lamp, trafficlight, streettree, cafeset, hotdog, vending,
  scooter, busstop, car, taxi, police, van, bus, truck, parktree, pine, blossom, kiosk, statue,
  fountain, billboard, container, house, cottage, shop, watertower, apartment, civic, office, tower,
  landmark.
  `js/levels/02-suburbia.js` also adds gnome, flamingo, pumpkin, leafpile, mower, bbq, doghouse,
  playhouse, trampoline, swingset, slide, mapletree, church, school, mall and townhouses.
- Kind ids are global, so prefix new ones if they might collide.

### Geo drawing API (`g` inside `build`)

- `g.block(x, base, z, w, h, d, color, o)`: a box resting on y = base.
- `g.box(cx, cy, cz, w, h, d, color, o)`: a box by its center.
- `g.cyl(x, base, z, rTop, rBot, h, segments, color, o)`
- `g.cone(x, base, z, r, h, segments, color, o)`
- `g.ball(x, y, z, r, color, { detail, sx, sy, sz })`: an icosphere. detail 0 is chunky, 1 is smoother.
- `g.gable(x, base, z, w, d, h, color, { ry })`: a pitched roof whose ridge runs along x.
- `g.panel(face, x, y, z, w, h, color)`: a flat rectangle on a wall. `face` is `'z+'`, `'z-'`,
  `'x+'` or `'x-'`; offset it 0.3 outside the wall.
- `g.windows(x, z, w, d, y0, y1, rows, cols, color, { litColor, fill, fillY })`: windows on all
  four sides. Lit windows glow at night automatically.
- `g.flat(x, y, z, w, d, color)`: a decal lying flat.
- `g.glowing(() => { … })`: everything drawn inside glows on night levels (neon, lanterns, screens).
- `g.limb(swing, px, py, () => { … })`: a leg or arm for the walk cycle. It swings around the hip or
  shoulder at (px, py) in the x-y plane; use +1 / −1 for legs in opposite phase (diagonal pairs on
  four-legged animals), and about ∓0.6 for arms (opposite to the leg on the same side). Anything that
  walks must face **+x**; wrap an older model in `g.turned(Math.PI / 2, () => { … })` if it faced +z.
- `HC.buildSupertall(g, { h, r, seg: 24 | 8, twist, glow, glass, lit, accent, ledge })`: a round
  (seg 24) or octagonal (seg 8) supertall with setbacks, window bands, a crown and a spire.
- `o` options: `{ tint: true }`, `{ rx, ry, rz }` rotations, `{ shade: false }`.

Keep each kind under about 400 triangles. Spheres cost 20 triangles at detail 0 and 80 at detail 1.

## Toolkit `T` (inside `generate`)

- Randomness: `T.rng()`, `T.rng.range(a, b)`, `T.rng.int(a, b)`, `T.rng.chance(p)`.
- `T.pick({ kind: weight, … })` returns a weighted random kind.
- Ground:
  - `T.island({ ground, edge })` draws the base land and beach. Call it first.
  - `T.rect(x0, z0, x1, z1, y, color)`, `T.disc(x, z, r, y, color, seg, sx, sz)`, `T.ring(x, z, r0, r1, y, color, seg)`.
  - `T.strip(x0, z0, x1, z1, width, y, color)`, `T.path(pts, width, y, color, closed)`.
  - `T.stripes(x0, z0, x1, z1, y, colorA, colorB, n, alongX)`.
- Roads:
  - `T.roadGrid(R, { width, colors: { road, line, dash, zebra }, markings, crosswalks })` draws a road
    grid at the positions in array R (both axes) and enables grid traffic.
  - `T.blocks(R, fn(b), { sidewalkWidth, walkers, dogChance, sidewalk, curb, sidewalkColor, walk })`
    iterates the blocks between roads. `b` has x0, x1, z0, z1, cx, cz, w, d, bx, bz.
  - `T.sidewalkProps(b, { tree: {…}, lamp: 'lamp', step, props: {kind: w, cluster: w, none: w}, cluster: 'bollard', clusterN })`.
- Placing objects:
  - `T.put(kind, x, z, rotY, extra)` places one object (`extra.tint` forces a tint index).
  - `T.line(kind, x0, z0, x1, z1, spacing, { gapAt, gapW, chance, rot })` makes rows: fences, crops, posts.
  - `T.scatter(weights, { x0, z0, x1, z1 } | { x, z, r, r0 }, n, { gap, avoid(x, z), rot })` places n
    things without overlap.
  - `T.free(x, z, r)` and `T.occupy(x, z, r)` handle manual overlap control.
- Life:
  - `T.walkLoop(pts, n, weights, { speed: [a, b], lane, dogChance, bob })`: walkers along a closed polyline.
  - `T.loopVehicles(weights, pts, n, [speedA, speedB])`: trains, rovers or boats, one way, no bob.
  - `T.roamers(weights, cx, cz, r, n, { speed: [a, b], bob, spin })`: animals wandering a circle.
    Use `spin: 1` to roll (tumbleweeds; model those centered at their own middle).
  - `T.traffic(weights, n, { lane })`: cars on the road grid. Lane offset is about 0.25 × road width.
- Spawns:
  - `T.spawnAt(x, z)` or `T.spawnGrid(R)`. Give at least 12 spawn points spread over the map, on
    open ground near small food.
- `T.beach(weights, n)` scatters things on the beach ring.

## Theme (look) keys, with defaults

```
sky '#8FDCFF', fogNear 9000, fogFar 22000,
sea { show: true, deep: '#1A9EED', shallow: '#5CE0FF', foam: 1 },
skirt '#E9B96B'  (island side walls),
hemiSky '#E4F6FF', hemiGround '#B7A6FF', hemi 1.55, sun '#FFF1DC', sunI 2.3,
glow 0  (1 = night: glowing parts light up), stars false (twinkling dots in the "sea" for space)
```

## Mods

- `gravity`: 0.4 on the moon makes falls float.
- `grip`: 0.25 on ice makes the hole slide.
- `botSkill`: −0.15 to +0.1 shifts rival difficulty.

## Quality bar for every level

1. **Distinct.** Its own layout idea (not just the city grid recolored), palette, 12–25 new kinds,
   and a memorable landmark worth 300+ points to finish on.
2. **A full size ladder.** Lots of 1-point food near every spawn, then 2–6-point props, car-sized
   things, buildings, 2–4 very large structures and the landmark. Total points between 6,500 and
   9,000. Total objects at most 2,600.
3. **Alive.** Walkers, roamers or vehicles: 80–200 movers.
4. **Charming and vibrant.** Saturated, cheerful colors, chunky toy-like shapes, little details.
5. **Balanced.** `HC.sim` with `botPilot: 0.85` should reach level ~10 by 70–90 s and level 15+ by
   about 110 s. In Classic, a 0.85-skill player should usually finish top 2.
