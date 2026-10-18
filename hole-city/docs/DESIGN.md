# Design: what makes hole.io great, and how Hole City matches or beats it

## 1. Research summary (hole.io, Voodoo 2018)

Sources: Jed Hartman's measured-threshold strategy post, LevelWinner, TouchTapPlay, PocketGamer,
MobileSyrup, Wikipedia, Voodoo job postings, Deconstructor of Fun, and our own session playing the web
build on Poki. Full links are at the end.

**What makes it great**
- **Ten-second readability.** One finger, one verb. You eat 1-point props in your first second.
- **Physics swallowing.** Objects are rigid bodies that teeter, tip and fall in. Long cars go in
  end-first, and trees topple. Voodoo's own tuning knobs are "friction, bounce, suction force, camera
  and movement easing."
- **The size ladder.** People, cones and posts, then benches and trees, then cars, buses, houses,
  apartments, offices and finally skyscrapers. Measured cumulative points to reach each size:
  10, 27, 51, 82, 120, 165, 217, so the step grows by +7 per level.
- **Snowball and danger.** Bigger holes eat smaller ones (≥25 points for a small hole, 50+ for a big
  one). You respawn small after a few seconds but keep your points.
- **Short rounds.** Classic is a strict 2:00 against 6 other holes. Rank points per finish:
  20 / 10 / 5 / 2 / 2 / 1 / 1.
- **Juice.** "+N" numbers pop out of the hole, haptics fire on every eat, and the camera zooms out
  smoothly as you grow.

**What players complained about** (and what we did)
| Complaint | Hole City |
|---|---|
| Fake multiplayer presented as real | Rivals are openly bots, with playful names. |
| Ads every round, lag | No ads, no network, instanced rendering (60 fps on a desktop GPU for the whole match). |
| Respawn at base size is too punishing | You respawn with 35% of your size progress. You pick the spot with a ghost circle, then get 3 s of protection. |
| Objects stuck on the rim | Jammed objects slip through after 0.9 s. The opening is 7% wider physically than it looks. |
| Small things need you to stop over them | Fast swallow: anything under ~⅓ of your radius drops in on contact, even at full speed. |
| Battle mode could stall forever | Battle is capped at 3:00, and the biggest hole wins at the cap. |
| Few maps, memorized layouts | The block plan stays the same, but props, traffic and spawns re-roll every match. |
| Predictable, unfair bots | Bots have personalities (greed, aggression, caution, focus), commit to targets, and give up chases. A gentle rubber band slows a bot that runs away with the lead. |
| No sense of what's next | "🚗 Cars now fit!" style toasts, a level bar under your name, and red/green edge arrows for nearby threats and prey. |

## 2. Hole City numbers (all in `js/config.js` / `js/catalog.js`)

- **Units:** 1 unit = 5 cm. The city is 5,000 units (250 m) square, with a beach ring around it.
- **Holes:** start radius 17 (a 1.7 m opening). Radius ×1.2 per level, max level 20 (r ≈ 540).
- **Speed:** you 250 u/s and bots 220 u/s at level 1 (as requested). Both scale with
  (r / 17)^0.32, so big holes cover more ground.
- **Levels:** step from level k to k+1 = 7k + 3 points (hole.io's measured ladder).
- **Points:** person / cone / post 1, bench 2, tree 3–6, car 5, van 6, bus 14, house 20–24, shop 28,
  apartment 46, city hall 52, office 85, tower 140, landmark 320.
  The map holds about 7,200 points.
- **What fits when** (physics opening = 1.07 × r):

| Level | Radius | Now fits |
|---|---|---|
| 1 | 17 | people, cones, hydrants |
| 2 | 20 | cars, end-first |
| 4 | 29 | buses |
| 9 | 73 | houses |
| 12 | 126 | apartments |
| 13 | 152 | offices |
| 15 | 218 | towers |
| 17 | 314 | the landmark |

- **Hole vs hole:** you need to be 10% bigger, and their center must be well inside your circle.
  A kill is worth max(25, 30% of the victim's score).
- **Camera:** 60° pitch, 42° FOV. The view shows 16 hole-diameters across at level 1, easing to 6.2 at
  max size. Downtown buildings are squashed vertically and dither see-through near your hole.

## 3. Look and feel

- **Visual identity:** a bright toy island. Saturated pastel buildings with colored roof rims, mowed
  lawn stripes, lavender-white sidewalks, a turquoise sea with foam, and warm sun with bluish fill.
- **The hole:** a real pit cut into the street, with a dark-to-black gradient wall. The rim shows
  your skin: solid, stripes, rainbow, pulse, waves or spinning segments.
- **UI:** a "toy sticker" style. Fredoka rounded type, ink-purple outlines, hard offset shadows and
  candy accents. Big tappable buttons, and one tap from results to the next round.
- **Sound:** all synthesized. Swallow pitch drops with object size and climbs with combos, and big
  buildings rumble. A bouncy I–V–vi–IV loop plays during matches.

## 4. Levels, math gate, modes and meta

Ten worlds (see README). Each has its own layout, 20–25 unique objects, a palette and theme, a
landmark worth 320–340 points to finish on, and sometimes a twist: ice (Frostville, grip 0.3), low
gravity (Lunar Base, 0.4), night glow (Neon Ward). Brain Boost math runs before every match (9/10
needed). Rivals default to Easy for kids: lower skill, they top out at level 16, they won't chase a
player at level 3 or below, they get a smaller cut when eating each other, and they slow down when
far ahead of you.


- **Classic:** 2:00 against 6 bots.
- **Battle:** last hole standing against 5 bots, 3:00 cap.
- **Solo:** eat as much as you can in 2:00. Stars at 20% / 35% / 50% of the city.
- **Meta:** rank stars (thresholds 50, then +50 more each step) and 14 skins. 4 are free; the rest
  unlock by rank points, wins, kills, max level, a Solo score or a Battle win.

## Sources

- https://www.kith.org/jed/2018/06/23/some-hole-io-strategy-tips/
- https://en.wikipedia.org/wiki/Hole.io
- https://www.levelwinner.com/?p=15910
- https://www.touchtapplay.com/hole-io-cheats-tips-strategy-guide/
- https://www.pocketgamer.com/hole-io/hole-io-cheats-and-tips-everything-you-need-to-know-about-hole-io/
- https://mobilesyrup.com/2018/09/16/hole-io-city-competitive-eating-game/
- https://deconstructoroffun.com/blog/2018/8/1/5-ways-voodoo-dominates-the-hyper-casual-market
- https://jobfluent.com/jobs/principal-game-designer-core-gameplay-hole-io-barcelona-975df9
- https://forum.godotengine.org/t/mobile-game-how-do-you-make-this-physic-in-godot/144386
- https://poki.com/en/g/hole-io (played for reference)
