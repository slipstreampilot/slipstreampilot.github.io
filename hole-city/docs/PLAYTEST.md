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

## Final-requests pass

- **Walk cycle.** Every person and animal that walks or roams strides: legs (and arms on people) swing
  in step with how fast it moves and settle back to standing when it stops. Checked in side-on
  close-ups of people, cowboys, astronauts, cows, horses, chickens, raptors, the T. rex and crabs.
  People, cowboys and astronauts used to walk sideways; they now face where they're going.
- **Supertalls.** Hole City gets a round needle and a twisted octagon (2,100 units, twice THE TOWER);
  Neon Ward gets glowing ones (1,800, twice the pagoda). 260 points each; every solo test run on
  those levels ate both.
- **Townhouse district.** Two blocks in south-east Hole City: 144 tall, narrow row houses, 4 points
  each, packed back to back. A row house reliably drops into a level-7 hole.
- **Roller coaster (Funland).** The track spans 1,415 × 2,444 units (the island is 5,520 across) and
  climbs to 620. One lap takes about 42 s: out of the station at 55, chain lift at 120, a peak of
  about 570 at the bottom of the first drop, and about 180 on average including the station stop. The
  park train runs at 105. Eating track at the bottom of the drop sends the train flying (it crashed
  at 465 and shoved about 70 nearby things around, which had all settled about 7 s later); eating track on the
  lift strands the train safely at the gap. Crashed cars become ordinary edible objects.
- **Easy / Normal** on the title screen: rivals move at 187 instead of 220 on Easy; nothing else
  changes. Classic on Normal, skill 0.85, four levels × 3 seeds: won 7 of 12 (8 of 12 before these
  additions; within run-to-run variation).
- The title screen still fits without scrolling on iPhone SE, iPhone, iPhone landscape, iPad (both
  ways), desktop and a small desktop window.

## Brain Boost and difficulty update

- 20,000 generated sets: each number in + and − problems was 1, 2 or 3 digits about 33.3% of the time
  each; no negative answers, every answer among its 5 choices, choices always ascending. Even/odd and
  place-value numbers now range up to 9,999,999.
- Difficulty: Hard = the original game; Normal starts you at level 2; Easy also slows rivals by 15%.

## Solo goal lowered to 95%

Solo now clears at 95% of the level's items (`match.soloGoal`), so you no longer have to hunt down the
last scattered people and beach balls. On autopilot, 95% came at 184 s (city), 146 s (neon), 176 s
(beach) and 131 s (moon), against 208/171/195/153 s for 99%. The star times (under 5:00 ★★, under
3:30 ★★★) are unchanged, so stars come a little easier.

## Score display and skyscrapers

- **Score pop-ups.** Replaced the number-per-object pop-ups (up to 40 at once) and the COMBO ×N
  banners (which never added points) with: one running "+N" tally above your name tag; one callout at
  a time near the top of the screen (at the bottom on short landscape phones) for the first of each
  big kind per match (25+ points) and giant landmarks (250+); and DOUBLE/TRIPLE/MEGA EAT! for eating
  rival holes within 8 s of each other. Checked in iPhone portrait and landscape screenshots; at
  level 20 on autopilot there's never more than the tally and one callout on screen.
- **Skyscrapers toppling.** Reported: skyscrapers always tip over. Cause: a tower hanging over the
  lip pivots and its top swings far past the hole, so it lands lying across the street, too long to
  eat. Driving across towers at full speed (6 tries each, real city with neighbours): before, the
  tower was eaten 0/5 at levels 15–16 and toppled 5/5; after, towers, supertalls and offices are
  eaten every time from the size where their whole outline fits (tower and supertalls from level
  15, the landmark from 17), and parked or a little off-centre they go in within 0.1–2.5 s. Solo
  still clears 99% (city 208 s, neon 171 s, beach 195 s, moon 153 s on autopilot).

## Camera framing

The camera keeps your hole at a set share of the screen's short side, by level: 12% at level 1, 18%
at 5, 25% at 10, 33% at 15 and 46% at 20 (`camera.holeShare` in config.js; never more than 2,700
units across). That's a middle ground between hole.io (about 25% at size 1 and about 60% from size 6
on, measured from screenshots) and our first camera (6% at level 1 to 40% at level 20, which showed
far too much of the map mid-game).

## Easy rivals

Easy rivals are also less skilled (−0.16) and "dazed": now and then they wander off for a second or
two, they notice bigger holes late, and they chase less and give up sooner. Against a weak simulated
player (skill 0.55, Classic, 4 levels × 3 seeds) the best rival's score fell from about 800–1,500 to
about 250–750, and the player won 12 of 12 (11 of 12 before).

## Solo clear-the-level and Brain Boost retries

- Solo now has no time limit and ends at 99% of the level's items (by count). Long runs with the bot
  pilot cleared every level: skill 0.85 took 2:23–3:41 (Frostville slowest), skill 0.7 took
  2:28–3:18 on the six levels tried. The last 1% is mostly stray beach balls, parasols and walkers.
- Brain Boost: a scripted set with 4 deliberate misses ran 14 problems; each extra problem matched the
  one missed (same times table, same 7-digit length for even/odd, same place, same 3-digit + 2-digit
  shape) and the set ended at 10 right.

## Fixed from playtesting

- **Things went see-through near a big hole (a dinosaur nearly vanished).** Cause: the see-through
  effect for tall objects in front of your hole covered a circle 2.6× your hole's size on screen, so at
  big sizes it faded half the screen. Fix: the effect is off; nothing is ever translucent. Your own
  rim draws faintly through anything blocking it instead.

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

Solo, 2:00, skill 0.85, one seed per level (after the townhouses, supertalls and coaster went in):

| Level | L5 | L10 | L15 | L20 |
|---|---|---|---|---|
| Hole City | 34 s | 77 s | 97 s | 105 s |
| Maple Hills | 39 s | 69 s | 83 s | 87 s |
| Sunny Shores | 36 s | 78 s | 95 s | 103 s |
| Cluckington Farm | 27 s | 62 s | 76 s | 82 s |
| Funland | 39 s | 80 s | 96 s | 102 s |
| Frostville | 49 s | 98 s | 116 s | (L16) |
| Neon Ward | 27 s | 65 s | 82 s | 87 s |
| Dusty Gulch | 35 s | 70 s | 86 s | 90 s |
| Dino Valley | 23 s | 63 s | 80 s | 84 s |
| Lunar Base | 27 s | 60 s | 78 s | 83 s |

Classic, standard rivals (now "Normal" on the title screen; Hole City, Maple Hills, Neon Ward, Lunar Base × 3 seeds): skill 0.85 won 8 of 12
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
