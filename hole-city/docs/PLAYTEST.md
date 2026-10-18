# Playtest log

How we test:
- **Headless match simulations** (`tools/sim.js`). Your hole is driven by the bot AI at a chosen skill:
  0.7 ≈ an average player, 0.85–0.9 ≈ a strong one.
- **Physics probes** (`tools/phys.js`, and `tools/fitprobe.js` for what fits through which hole).
- **Screenshots** (`tools/shot.js`, `tools/flow.js`).
- **Live checks** in real Chrome with `#auto.fps`.

## What fits through which hole (`tools/fitprobe.js`, physics only)

One object, every neighbour cleared, hole of a fixed size. Each object gets six tries: park on it,
drive through slowly end-on and side-on, drive through fast, and wiggle over it end-on and side-on.
Hole diameter by level: L1 34 · L2 41 · L3 49 · L4 59 · L5 71 · L6 85 · L7 102 · L8 122 · L9 147 · L10 176 · L11 211.

| Object (outline) | Stays out | Falls in |
|---|---|---|
| bench 40×13 | parked dead-centre on an L1 hole (bridges the hole) | L1 when you drive over it end-on or wiggle |
| street tree (canopy 33) | L1 | L2 when parked; reliably from L3 |
| pine (canopy 33, very tall) | L2 unless parked | L4 every time |
| blossom tree (canopy 59) | L4 | L5 |
| car 84×41 | L1–L3 | L4 only with wiggling; L5 end-first or wiggling |
| bus 230×54 | L5–L8 (the old timer let an L5 hole eat it) | L9 end-first; most ways from L10 |
| truck 168×54 | up to L7 | L8 with wiggling |
| house 186×166 | up to L10 | L11 every time |

Parking dead-centre under something longer than the hole leaves it bridged across. That's real: move
so one end hangs over the void and it tips in.

## Fixed from playtesting

- **The invisible ring around the player pushed things away.** Cause: overly wide physics activation
  plus a rim that moved with velocity. Fix: only things over the opening wake up; resting objects
  don't collide with each other; the rim moves without dragging anything.
- **The demo autopilot (`#auto`) kept steering after the player touched the controls.** It now yields
  on the first key press or drag, and its rounds no longer write to your save.
- **You had to stop over small props when big.** Added fast swallow (`captureRatio` in `config.js`).
- **Holes swallowed things far too big for them (a bus into a level-5 hole) just by waiting.** Cause: a
  0.9 s "unstick" timer let anything stuck on the lip fall through, and trees, lamps and signs only had
  trunk/pole colliders. Fix: the timer is gone; collision shapes are built from each model (trunk +
  canopy, rounded noses); the lip is thin so long things can tip in end-first when the geometry allows;
  the opening slack went from 7% to 2%. Bots, off-screen rivals and the "now fit!" toasts share one
  calibrated "likely fits" rule. XP per level went from `7k+3` to `5.5k+2` to keep the pacing.

## Open questions / next tuning knobs

- Difficulty feel for real humans: `bots.rubberMin` / `growMin` in `config.js`, and the bot skill spread in `game.js`.
- Solo star thresholds (`scoring.soloStars`).
- Whether a max-size hole empties the city too early. If so, raise `levelStep` or lower `radiusGrowth`.

## Physics-only pass (current tuning)

Solo, 2:00, skill 0.85, one seed per level:

| Level | L5 | L10 | L15 | L20 |
|---|---|---|---|---|
| Hole City | 38 s | 78 s | 101 s | 108 s |
| Maple Hills | 39 s | 77 s | 94 s | 100 s |
| Sunny Shores | 38 s | 92 s | 106 s | 113 s |
| Cluckington Farm | 25 s | 74 s | 94 s | 100 s |
| Funland | 43 s | 89 s | 108 s | 114 s |
| Frostville | 60 s | 98 s | 113 s | (L19) |
| Neon Ward | 33 s | 84 s | 97 s | 104 s |
| Dusty Gulch | 30 s | 80 s | 100 s | 103 s |
| Dino Valley | 27 s | 62 s | 76 s | 82 s |
| Lunar Base | 27 s | 64 s | 81 s | 87 s |

Classic on Easy (Hole City, Maple Hills, Neon Ward, Lunar Base × 3 seeds): skill 0.85 won 8 of 12
and skill 0.7 won 8 of 12. Before this change it was 6 of 12 for both. Losses are almost always from
being eaten early.

Headless physics cost with all 7 holes on full physics: about 1.8 ms per step (it was 0.9 ms with
plain boxes). On device only on-screen holes run physics.

## Ten-level pass

Each level file was built against `docs/LEVEL_GUIDE.md` and checked with solo pacing sims: level 10
by about 70–90 s and level 15 by about 95–115 s on every map. Totals per level are about 2,000–2,550
objects, 6,700–8,500 points and 140–195 movers.

Real Chrome (desktop GPU): Frostville, the heaviest level at about 486k triangles, holds 60 fps.

Classic difficulty: with the bot cap and mercy rules, a 0.7-skill player won 9 of 12 mixed-level runs
(mostly Easy); the other three finished 3rd, 3rd and 5th. Snowballing is the main source of variance: whoever gets big first
tends to stay big.

Engine fixes found during the level build:
- ground strips were drawn facing down, so paths looked dark;
- rolling tumbleweeds sank into the ground when swallowed;
- bots avoided food on the outer beach.
