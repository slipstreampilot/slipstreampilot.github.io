# Architecture

Hole City is built from plain browser scripts with no build step. Every file adds one module to the
global `HC` namespace. `index.html` loads them in dependency order:

```
vendor/three.min.js  vendor/cannon.min.js      third-party (bundled locally, no CDN)
config → util → geo → catalog → gentools → levels/registry → levels/01…10 → world → movers
      → coaster → physics → holes → bots → progress → render → fx → audio → input → game → math → hud → menus → main
```

## Data flow per frame

```
main.js boots ─► Game.frame (requestAnimationFrame)
                   │
                   ├─ fixed 60 Hz Game.step(dt) ×N
                   │    ├─ Input.dir() / Bots.steer()  → Hole.move()
                   │    ├─ Movers.update()              pedestrians, ducks, traffic (+ walk-cycle phase)
                   │    ├─ Coaster.update()             the Funland roller coaster train
                   │    ├─ Physics.step()               rims, bodies, overflow swallow, consume
                   │    ├─ Physics.consumeInstant()     off-screen holes (no physics)
                   │    └─ hole-vs-hole, respawn, end-of-match checks
                   │         └─ emit events ──► HUD.onEvent ─► FX + Audio + popups + feed
                   │
                   ├─ Render.updateCamera / updateHoles / setFocus
                   ├─ HUD.frame()                       timer, leaderboard, labels, arrows
                   └─ Render.render()                   (FX.update runs inside)
```

## Modules

| File | Owns |
|---|---|
| `config.js` | Every tunable number: speeds, growth, physics, camera, bots, scoring. Start balancing here. |
| `util.js` | Seeded RNG, easing, a uniform spatial `Grid`. |
| `geo.js` | Low-poly geometry builder (boxes, cylinders, gables, window panels) that merges into one vertex-colored `BufferGeometry`. The `aTint` attribute marks the parts that take the per-instance color. `g.limb(swing, px, py, fn)` tags legs/arms for the walk cycle (attribute `aLeg`); `g.turned(yaw, fn)` rotates a sub-model. Every walking model faces +x. |
| `catalog.js` | Every swallowable kind: layout size (`w × d × h`, in units of 5 cm; the collision shape is derived from the mesh), mass, points, tint palette, mover type, and its `build()` mesh recipe. |
| `people.js` | Themed people for every level (doctors, beekeepers, moon engineers…) and `HC.PEOPLE`: which types each level uses. About half of each level's ordinary walkers are swapped for them as the level is built (`gentools` `T.put`, on its own random stream, so layouts don't change). |
| `citygen.js` | Seeded city layout as pure data: ground decals, object placements, sidewalk loops, roads, spawn points. Uses a 5×5 block plan (parks, homes, shops, apartments, downtown, landmark, parking, works). |
| `world.js` | Live object list and states (`static` → `active` → `captured` → `gone`), plus a spatial grid for queries. |
| `movers.js` | Scripted life: walk loops (people, trains, rovers, boats), roaming animals (with optional rolling), right-hand grid traffic that picks turns and brakes for the car ahead. Walkers feed their stride phase and "how much they're walking" (eases to 0 when they stop) to `Render.setWalk`. |
| `coaster.js` | The Funland roller coaster. `Coaster.layout()` turns control points into a closed 3D track of edible `coaster_rail` pieces (parallel-transported "up", so the vertical loop flips riders) plus support posts and a 4-car train. At runtime the train runs on energy physics (gravity along the slope, drag, chain lift, station brakes and dwell). A missing piece ahead at speed > 170 u/s, or under any car, derails it: the cars become tumbling physics bodies (`Physics.launch`) that wake and shove whatever they hit, then settle as ordinary edible objects. Slow trains stop at a gap on the safety brakes. |
| `physics.js` | The swallow engine; see below. |
| `holes.js` | `Hole` class: level/xp/score, eased radius, speed curve, respawn helpers. |
| `bots.js` | Rival AI: forage → eat a chosen target, hunt, flee, wander. Each bot has a personality. |
| `progress.js` | Skins catalog, save data (localStorage, fail-safe), rank stars, unlock rules, match recording. |
| `render.js` | three.js scene, lighting, the island, the sea shader, instanced objects, hole pits and rims (your own rim also draws faintly through anything in front of it), and the camera. Walkers' legs and arms swing in the vertex shader (per-instance `aWalk` = stride phase, walking amount); a matching depth material keeps their shadows in step. |
| `fx.js` | Particle bursts, dust, confetti, level-up shockwaves, screen shake. |
| `audio.js` | Web Audio synth: swallow bloops scaled by size and combo, level-up chime, kill, countdown, a music loop. |
| `input.js` | Drag-anywhere virtual joystick, plus WASD and arrow keys; optional mouse-wheel zoom override (0 or middle-click = automatic). |
| `game.js` | Modes, the simulation loop, hole-vs-hole eating, respawns, results, camera focus. |
| `hud.js` | HUD DOM plus the event director (routes game events to FX, Audio, the score tally, callouts and the kill feed). Score display: one running "+N" tally above your name tag (fades after a 0.75 s pause; moves beside the tag if the top HUD is in the way), and one callout banner at a time for the first of each big kind (25+ points) per match, giant landmarks (250+) and multi-eats (2+ holes within 8 s: DOUBLE/TRIPLE/MEGA/MONSTER EAT!). No per-object numbers and no combo banners. |
| `menus.js` | Home (over a live "attract" match of the selected level), level picker, skins, settings, pause, results. Every match goes through the Brain Boost gate. |
| `main.js` | Boot, URL and hash test flags, the greedy demo autopilot, `HC.sim()` headless simulation. |

## How swallowing works (`physics.js`)

The approach is the one hole.io uses, built with cannon-es. Physics runs in meters; world units × 0.05.

1. **Static by default.** About 2,200 objects are instanced meshes with no physics body.
2. **Collision shapes come from the meshes.** `Physics.shape(def)` slices each kind's model into five
   height bands and measures every band in 8 directions, giving an octagonal prism that hugs that
   slice. Similar bands merge, so a building is one piece and a tree is planter + trunk + canopy.
   Corners are softly rounded (`cornerRound` = 30% of the narrow side), so a square building drops
   through a hole about as wide as itself, while a long bus is still long. The cached shape also gives
   the footprint numbers everything else uses: `min`, `max` and `diag` (widest span of the outline).
   Level layout spacing still uses the catalog's `w × d`.
3. **Everything you can see is simulated.** Whatever a visible hole eats gets a real body and falls in by
   physics, tumbling and knocking into whatever else is going down with it. Bodies are woken nearest
   the opening first; small props (diag/2 < `captureRatio` × r) leave `bigReserve` bodies free for
   anything bigger. Only when the budget (`maxBodies`) is used up does tiny clutter that ends up inside
   the opening without a body take a short scripted drop instead (the *overflow swallow*, timed by
   the same gravity). Off-screen rivals eat without physics (`consumeInstant`).
4. **Physics swallow: a sandbox with real holes in the ground.** Anything whose narrow side fits the
   opening and that is at most twice as long as the opening is wide gets a compound body when it comes
   near. A fallen-over object is judged by how it's lying now (`Physics.footNow(o)`), so a toppled
   skyscraper is a long thing that tips in end-first once the hole is wider than half its length.
   - **The street is one still ground plane with the holes cut out of it.** Ground contacts at points
     over an opening are dropped (a wrapper around cannon's narrowphase), so the street holds up exactly
     the part of a base that's on solid ground. Each base carries a grid of small "feet" (up to 6×6)
     that touch only the street, so support follows the lip precisely instead of the base's corners.
     Ground contacts deeper than `groundSkin` belong to the shaft and are dropped too. The edge is
     rounded and crumbly: on the strip just beyond the opening (`lipBand`, at most `lipMax`) a contact
     only holds if the thing's middle is over solid street, so nothing hangs by a sliver. The hole is
     drawn at the physical opening size. A body that can't
     touch the street at all (all of it over the opening or down the shaft) leaves the street out of its
     collision mask, and drops its feet for good once it's wholly down the shaft: that keeps a busy
     hole cheap. Props under `propSize` across (not trees) collide as plain boxes. Everything else
     (buildings, trees, lamp posts, towers) has the top edge of its top part bevelled (`roofRound`).
   - **Below each opening is an Erlenmeyer flask cut into solid ground** (user's design, Nov 2026): a
     vertical neck as wide as the opening, flush with the street, `neckDepth` (25 cm) deep; then a cone
     widening at `flareAngle` (45° from vertical) for `flareLength` (10 m of slope: 7.1 m down and 7.1 m
     out); then nothing — no floor. The ground around it is solid: 22 thick wedges of earth (convex
     polyhedra) whose inner faces are the neck and the cone, from the street down past the cone's bottom
     and `earthBeyond` metres outward. Anything not in the flask or above the street is inside solid
     ground and is pushed back out. The walls move with the hole by velocity (not teleported), so a moving
     hole's edge hits things. Only the earth's top surface (the street, which holds things already) and
     the crumbly lip strip don't hold anything up. Walls are slippery (`wallFriction`). Things wholly above
     the street skip the wall checks.
   - **Buried = eaten:** anything wholly below the street with part of it out under the pavement (slid
     into the cone) counts as eaten at once, so nothing is left buried when the hole moves on.
   - So what's over the edge decides: under half over, it stands; over half (centre of mass over the
     void), it tips on the lip; if the hole slides under it mid-tip, nothing holds it and it falls at the
     tilt it reached (its spin dies away: `freeFallSpinDamp`), its upper floors hit the far wall and it
     scrapes down. Something longer than the opening can bridge it until you move so an end loses its edge.
   - **No help from the hole** (removed at the user's request, Nov 2026): no suction, no carry, no funnel,
     no riding along with the hole, no tree straightening. The moving shaft walls simply push whatever is
     down the shaft. What remains beyond plain physics: the tilt freeze above, the wedge shake/spit below,
     and the tuning (gravity 26 m/s², `inertiaScale`, slippery street near holes, shrunk colliders, caps).
   - **Wedged** (partly down a shaft, top dropping less than 2.5 m a second for a full second): while the
     player is *wiggling* (two or more direction reversals within a second — ordinary steering doesn't
     count), each change in the hole's speed jolts it (no automatic shake: removed at the user's
     request); at `wedgeSpit` (6 s) it's spat out (every stuck thing at once) up and away in a random direction (walls off until
     it lands) and can be eaten again. Rivals leave a spat item alone for 12 s.
   - **Eaten** once its top is `sinkDepth` hole radii below the street (at most `sinkMax` m), so things
     visibly fall a way down the pit first; sooner (as soon as it's under the street) if it's resting
     on a pile or more than `deepBudget` bodies are in play.
   - Bodies are 4% smaller than their meshes so tightly packed rows (townhouses) aren't held up by
     friction against each other; masses are square-root squashed but uncapped up to 30,000, so a
     skyscraper isn't shoved around by debris; objects turn 2.5× more readily than solid blocks
     (`inertiaScale`) so tipping reads at game speed; speeds and spins are capped (nothing explodes).
   - Crashed coaster cars fly as `G_SMASH` bodies: they hit the ground and objects (which wake up for a
     few seconds and get shoved) but never the shafts, and nothing is destroyed.
   - Scripted kinds (`def.scripted`, the coaster track) never get a body: a piece is eaten when its
     support stands inside an opening at least `minHole` across, and it drops from its height.
5. **Scoring.** An object scores when its top falls below street level. Points go to the hole it fell into.
6. **"Likely fits" rule.** `Physics.likelyFits(def, r)` (and `likelyFitsNow(o, r)` for an object as it's lying) says what reliably goes in, calibrated against
   `tools/fitprobe.js`: the outline diagonal is under 85% of the opening, or the object is slim
   (narrow side < 60%) and at most 1.2× as long. Bots and the demo autopilot use it to pick targets,
   the HUD uses it for "now fit!" toasts, and off-screen holes use it in place of physics: an object
   counts as eaten after it has sat inside the opening for about as long as the real fall would take.

The ground shader discards fragments inside each hole, and a dark cylinder below forms the pit. The
object shader darkens anything below street level. Objects are never made see-through: instead, your own
hole's rim draws faintly on top of everything, so you can find it behind a tall building. (The old
see-through dither is still in render.js behind `camera.seeThrough`, off.)

## Testing hooks

- URL query or hash tokens: `?mode=classic&auto=1&seed=7&view=1800&fps=1`, or `#auto.fps` where query
  strings are stripped. The autopilot gives control back on the first key press or drag, and
  autopilot rounds never write to your save.
- `HC.sim(mode, seconds, {seed, botPilot, allPhysical, nonePhysical})` runs a whole match headless.
  `tools/sim.js` wraps it; see `docs/PLAYTEST.md`.
