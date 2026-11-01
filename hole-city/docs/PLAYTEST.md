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

## Themed people

- Asked: at least five people types per level that fit its theme; swap about half of the current people.
- `js/people.js`: 54 new types, 4–6 per level on top of the level's existing ones (city: businessperson,
  doctor, jogger, police officer, firefighter, construction worker; … moon: engineer, rover driver,
  scientist, space tourist, robot helper). Each reads by silhouette — hat, outfit, prop. All 1 point;
  kids are smaller and lighter.
- Swap: on each level about half of the plain `person` walkers (Dusty Gulch: also cowboys; Lunar Base:
  astronauts) become a random themed type. Layouts are unchanged (same object positions on every level,
  checked with seed 7). Lineup renders and in-game shots checked; 40 s solo runs on all levels, no errors.

## Mouse-wheel zoom

- Asked: the mouse wheel can optionally override the zoom, while the automatic zoom keeps progressing.
- The wheel scales the automatic view (0.35× to 3×, eased quickly while turning); growing still zooms out
  underneath it. 0 or middle-click returns to automatic. A small tag shows the override (not on touch
  screens). Settings → "Mouse-wheel zoom" turns it off. Checked in a rendered match: wheel out ×5 took
  the view from 302 to 770 units, back to automatic with 0; growing to size 8 under a 1.4× override
  zoomed out from 417 to 633.

## Solid ground around the hole (eighth pass)

- Reported: a lamp post with its bottom in the hole wasn't pushed by the hole's wall; it ended up
  partly underground and vanished. Contact logging found three causes: (1) no solid ground — under the
  pavement there was only a 20 cm street "skin" and thin wall slabs, so anything past them hung in empty
  space, sank, and was then eaten by the buried rule; (2) the 25 cm neck band: a thin pole inside it was
  pushed up/down (the shortest way out), and those pushes were switched off to stop the neck acting as a
  shelf, so it slid through; (3) walls teleported 23 cm per step at size 3, so a pole could land on the far
  side of a thin slab. In 24 tries 3 lamps ended up to 38 cm inside the ground.
- Fix: solid earth wedges forming the neck and cone; walls move by velocity; the shelf rule only covers
  the street-level top surface and the lip strip. Same test: worst case 20–25 cm below the street outside
  the flask, transiently while being shoved, and every one ends up back on the street.
- Bug found while testing: a kinematic body that sits still for a second falls asleep and then ignores
  its velocity, so a parked hole's walls stopped following it (they reached 79 m/s chasing it). Walls
  never sleep now, and each step starts exactly where the last one aimed them.
- Effects: full speed over small things improved (moving edge carries what's dropped in): size 6 inner
  and middle thirds 13/13 (were 2/13); size 10 outer third 31/58 (was 15/61). The townhouse jam is gone
  (8 eaten, none spat) but a hole driving into a row at full speed knocks houses over (13 in that test).
  Lamp posts at full speed: still knocked over, 16/16. Cliff rule, cafe set, supertalls (24/24), street
  tree, blossom, maple, park tree (20/20) fine; pine still 5/20. Physics step ~1 ms at sizes 14–20.

## Neck 25 cm, rounded roofs, no automatic shake (seventh pass)

- User's calls: neck 1 m → 25 cm; round the roof edges; no automatic shake; spit-out stays all at once.
- Ground skin lowered to 20 cm (below the neck) so nothing in the flare is pushed up through the street.
- Full speed over small things: no measurable change from the shallower neck. Tracing a lamp at size 6
  showed why: its base had dropped 0.8 m when the trailing rim arrived, but the rim hits the part of a
  tall thing still standing up through the opening. What matters is the thing's whole height falling
  before the rim gets there, not the neck depth.
- Townhouse jam (10 houses over a size-12 hole): still happens with rounded roofs. Contacts show it isn't
  an arch at the roofs: the row is wider than the hole, so it's squeezed against the neck from all sides
  and held by friction between whole walls (a cork in a bottle). Object-to-object friction 0.08 → 0.02
  cleared it in the same test (11 eaten, 1 spat, none knocked over); 0 made rows slide and topple (18
  knocked over). Not changed yet — offered to the user.
- Trees after the helpers came out (published flask build): pine 2/20, frost pine 1/20 in the edge-start
  test (were 20/20 and 19/20 with straightening). Maple 20/20, park and street tree 19/20.
- Supertalls at size 20 (stop under it): 24/24.

## The flask (sixth pass)

- User's design: under the opening, a 1 m vertical neck flush with the street, then a 45° flare for 10 m of
  slope, then nothing. Anything wholly under the street and partly under the pavement counts as eaten.
  Flasks of nearby holes may bump; the user doesn't mind.
- Was: a straight tube as wide as the opening, starting 30 cm below the street, at least 120 m deep.
- Checks: cliff rule unchanged (City tower, size 17: 45% and 55% over stand at 5°, 65% tips). Cafe set at
  size 3: 16/16 in 0.8–0.9 s. Lamp posts at full speed at size 6 are still knocked over (the neck
  can't save something whose base dropped only ~20 cm), as expected.
- "Stop under it" on every building ≥250 tall in City + Neon (150 tries): 140 eaten (straight tube with
  helpers: 94; quick-swallow build: 88). Supertalls at size 20: 32/32.

## Hung by a sliver; drawing the real opening

- Reported: a cafe set (umbrella, table, chairs) stuck in a size-3 hole that looked like it should fall.
  It was hanging by about 1 cm of its umbrella rim on the street, chairs leaning on the shaft wall. That
  overlap was hidden: the physical opening was 2% wider than the drawn one and under the pink rim.
- Fix (user's choice of two): (1) a rounded, crumbly lip — the outer strip just beyond the opening
  (`lipBand` 8% of the radius, at most `lipMax` 25 cm) can't hold anything whose middle is over the
  opening; things with their middle over solid street still rest on it, so the cliff rule is unchanged
  (City tower at size 17: 45% and 55% over stand at 5°, 65% tips — same as without the strip).
  (2) The hole is drawn at the physical opening size.
- Cafe set at size 3, stop under it, 48 tries on three levels: all eaten in 0.9–1.8 s (before: all eaten,
  but about 1 in 6 hung 2.5–5 s until the auto-shake).

## Helpers removed: physics only (fifth pass)

- Reported: "if I barely bring something to the edge of my hole, it kind of launches toward the center"
  — not just physics. True: suction pulled small things from 1.25 radii out (18 m/s² against ~6.5 m/s² of
  friction), and the carry snapped things to the hole's speed plus a pull toward the middle.
- User's call: remove suction, carry, funnel, following the hole, tree straightening and the size
  pass-through. Keep the tilt freeze, wedge shake/spit and the tuning. Impact on ease is accepted for now;
  the user wants to play it first.
- First numbers (autopilot, City, 20 s): eaten at size 1: 18 (was ~35); size 5: 21; size 10: 60 (was
  ~120–160); size 14: ~300 (was ~610). Physics step is cheaper (size 14: 1.3 ms).

## Smooth motion and real physics for everything (fourth pass)

- Reported: at size 1 movement looked jittery. The game simulates at 60 Hz; on a 120 Hz iPad/iPhone each
  step was shown for two frames while the camera eased smoothly, so the hole wobbled against the city.
  Drawn frames now blend the last two simulated poses of the hole, the camera target and every moving
  object (`Render.interpolate`). Measured with a fake 120 Hz clock: the hole's frame-to-frame screen
  wobble went from 5.3 px to 0.01 px (60 Hz: 0.11 → 0.02).
- Reported: things falling in should collide with each other; quick swallow everywhere looked fake.
  Measured first: quick swallow handled 12% of what you ate at size 1, 38% at 5, 93% at 10 and 99–100% at
  15–20. Now every visible object gets real physics; quick swallow is only an overflow valve for tiny
  clutter when the body budget is full (user's choice). Things fall up to 0.8 hole radii (max 10 m) down
  the pit before they count, so you see them tumble and knock together.
- Cost: first try, step time at size 14 rose to 9 ms average with 480 slow steps in 40 s. Profiling found
  85% of contacts were street contacts thrown away for things already in the shaft, then the feet grid
  in every shape-pair check, then convex SAT. Fixes: street left out of the mask when unreachable, feet
  dropped down the shaft and only the outline ring on big bases, unique SAT axes for octagons, props as
  boxes, cheaper `footNow`, and eat-on-sight once under the street if resting on a pile or over
  `deepBudget`; pairs that pass through each other (below) are dropped before contact generation.
  Result at sizes 14–20 (City/Neon): 2.0–2.7 ms average, 0–2 steps over 16 ms in 40 s (quick swallow:
  0.2–0.6 ms).
- Balance (bot pilot): Classic Normal 12/12 wins (city, suburbia, neon × 4 seeds; quick-swallow build
  11/12). Solo clears all 10 levels in 2:09–3:12 (quick-swallow build 2:02–2:55).
- Driving straight across the map at full speed with a fixed-size hole (`sweep.js`): 99–100% of what fits
  and passes under the middle is eaten at sizes 10–18; total eaten on the same path is equal or higher
  than with quick swallow (size 14: 815 vs 756).
- "Stop under it" on big buildings (City + Neon, 150 tries) first dropped from 88 to 67 eaten: the now
  physical clutter and mid-rises around a supertall knocked it diagonal and it wedged. A size
  pass-through rule brought it to 94/150 (removed again in the fifth pass).
- Trees (20 tries each, edge start then steer and stop): frost pine 19/20 (quick-swallow build 18/20),
  frost x-tree 20/20 (19/20), park tree 19/20 (19/20), pine, maple, palm and street tree 20/20.
  Trees keep octagonal colliders: as boxes, pines and palms dropped to 6/8.

## Trees, wiggling and fall speed (after the sandbox pass)

- Reported: trees too hard to eat; steering to line up under a half-fallen tree was treated as a
  wiggle and kicked it around. Now a wiggle is two or more direction reversals within a second;
  ordinary steering never jolts anything. Slender things slip over the lip once their base is in and
  the pit straightens them head- or foot-first. Test (tree at the hole's edge, then steer over at half
  stick and stop; sizes where it first fits and +1, 4 tries each): maple 8/8, pine 0–2/8 → 8/8, street
  tree 3/8 → 8/8, park tree 8/8, blossom 7–8/8, lamp 8/8, palm 8/8, frost pine 7/8, frost x-tree 7/8,
  big frost tree 1/8 → 8/8, drop tower 7/8.
- Reported: at big sizes things fell faster than gravity. The quick-swallow clip dropped a fixed
  distance in a fixed short time (a house fell about 3× faster than gravity). It now falls under the
  same gravity as the physics.
- Classic Normal after both: 11/12 wins (city, suburbia, neon); Solo still 2:19–2:47 on the levels rechecked.

## Physics sandbox: cliff edges and shafts (third pass)

Reported: the straight-drop fix worked but looked wrong — things jumped into the hole and fell like an
elevator, worst in the townhouse rows. Wanted: a more realistic sandbox (a skyscraper 51% over the
edge starts to tip; slide the hole under it mid-tip and it falls at that angle, its upper floors
hitting the far wall). Agreed with the user: a knocked-over building lies on the street and can be
eaten end-first once the hole is wider than half its length; bridging is allowed; "stop under it" must
work for skyscrapers with good technique; wedged items rattle when you wiggle, shake by themselves at
3 s and are spat out at 6 s (and can be eaten again).

Built (see ARCHITECTURE "Physics swallow"): street with holes cut out of it + base feet, moving shaft
walls, spin dying away once unsupported, gentle pull and pit carry for small things only, wedge
handling. Checks (all scratchpad/tools scripts, headless):
- Cliff rule (City tower, size 17): 45% over stands; 55% leans slowly; 60–80% tips 25–36° in 1.4 s;
  slid under mid-tip it falls at that angle and scrapes down (frame strips sent to the user).
- "Stop under it" (drive in at full speed, coast to a stop like a player) for every tower, supertall,
  big building and tall dinosaur on all 10 levels, from the size the game says it fits, +2 and 20,
  3 tries each: 358/414 eaten (86%), mostly in 2–4 s. Failures cluster on supertalls and slender towers
  at their first sizes (they wedge diagonally and get spat), the Neon twin supertalls (they bump each
  other) and the long dinosaurs (sometimes topple and need eating end-first).
- Bridging: a fallen tower centred over a smaller hole stays put; slide toward an end and it tips in.
- Wedges at a bare fit: shake at 3–6 s, spit at 6–9 s, the item lands clear of the hole.
- Classic Normal (bot pilot 0.7, 4 levels × 3 seeds): 12/12 wins, size 20 at 61–94 s (old 66–88 s).
  An intermediate version without the small-thing carry won 2/12 (things knocked over and left: 18
  maples in 90 s) — the carry restored it.
- Solo clears 95% on all 10 levels on autopilot in 2:06–3:11 (before: 2:10–2:56).
- Physics step at size 20: avg under 1 ms, p99 ≤ 7 ms (unchanged).

## Tall things fall in straight (second pass, superseded by the third)

Reported: Neon skyscrapers still fell over. Two causes:
1. At sizes 19–20 they were small enough for the quick-swallow animation, which tipped everything up
   to 86° around its base, so a supertall's top swung out to about 3× the hole's radius before it
   vanished. It was scored, but looked like it fell over.
2. Mid-height buildings, tall dinosaurs, trees and tall props weren't in the tower rule yet, so they
   still teetered on the lip and could topple onto the street.

Fixes: every tall thing (see ARCHITECTURE "Tall things") drops straight in at every size and never
takes the shortcut; the shortcut clip keeps every top inside the hole; standing props no longer keel
over by themselves; an object gliding or dropping toward the centre no longer flies off when the hole
stops dead.

Checked with tools-style probe (scratchpad tallcheck.js): every object 60+ tall on all 10 levels, at
the size it first fits, two sizes later, and 15/17/19/20, parked on and driven across at full speed,
2 instances each (1,900+ runs). Every tall thing: eaten every time, tilt ≤15° while going in, top always
inside the hole (≤0.85 r), nothing toppled outside. Remaining: long low vehicles parked dead-centre at
the exact size they first fit stay bridged across the hole (unchanged design: approach end-on).
Cost: long tall things need a hole as wide as they're long (longneck ~size 16, cruise ship ~17,
townhouse row ~15; about 2 sizes later than before). Physics bodies at size 20 peak at 20–50 (cap 170),
step time unchanged (p99 4–10 ms). Solo still clears 95% on all 10 levels (2:10–2:56 on autopilot).
Screenshots of a supertall, a skyscraper and a longneck mid-fall confirmed they sink straight down.

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
