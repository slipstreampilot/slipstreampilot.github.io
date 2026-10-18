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
                   │    ├─ Physics.step()               rims, fast-swallow, bodies, consume
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
| `input.js` | Drag-anywhere virtual joystick, plus WASD and arrow keys. |
| `game.js` | Modes, the simulation loop, hole-vs-hole eating, respawns, results, camera focus. |
| `hud.js` | HUD DOM plus the event director (routes game events to FX, Audio, popups and the kill feed). |
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
3. **Fast swallow.** If an object's outline is tiny next to the hole (`diag / 2 < captureRatio × r`)
   and it has been inside the circle for 0.06 s, it is *captured*. A short scripted fall makes it tip,
   drift toward the middle, ride along with the moving hole and drop into the pit. Large holes never
   need to stop for small things.
4. **Physics swallow (nothing is ever forced through).** Anything whose narrow side fits the opening
   and that is short enough that it could tip in end-first (`max < 2.1 × opening`) gets a compound
   body when it overlaps the opening. The opening is the drawn hole + 2% (`holeSlack`).
   - Collision groups decide what touches what:
     - Resting bodies touch only the ground plane and falling bodies.
     - Bodies over a hole stop touching the ground and touch that hole's kinematic **rim** instead: a
       thin (0.5 m) lip of boxes flush with the street, so long things can tip in end-first.
   - Whether it falls is up to the collision: things bridge across the hole, teeter, tip, wedge or drop.
   - Only things that already fit flat are pulled toward the middle (suction). Centring something
     longer than the hole would just park it bridged across.
   - The downward pull is applied at the point of the footprint nearest the hole's centre, so a car
     nosing over the edge is pulled down by the nose and tips in end-first if the geometry allows.
   - Once something is falling down the pit, it is carried along with the hole, so the lip doesn't
     clip it as you drive on.
   - Jams: something sunk into the pit and barely moving for 1 s gets a small physical jostle. If its
     whole outline fits the opening, it is only snagged under the thin lip, so it slips past it.
     Nothing whose outline doesn't fit is ever let through.
   - Crashed coaster cars fly as `G_SMASH` bodies: they hit the ground and resting objects (which wake
     up for a few seconds and get shoved) but never hole rims, and nothing is destroyed.
   - Scripted kinds (`def.scripted`, the coaster track) never get a body: a piece is eaten when its
     support stands inside an opening at least `minHole` across, and it drops from its height.
5. **Scoring.** An object scores when its top falls below street level. Points go to the hole it fell into.
6. **"Likely fits" rule.** `Physics.likelyFits(def, r)` says what reliably goes in, calibrated against
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
