# Hole City

A bright, toy-like 3D "hole" game in the spirit of hole.io. Steer a hole through a little island
city and swallow everything that fits: people, cones, cars, trees, houses, skyscrapers, and the
giant tower downtown. Grow bigger than the six rival holes before the 2-minute timer runs out.

## Play

- **Quickest:** double-click `index.html`. It runs from the file, with no install or server.
- **Best (and installable / offline):** serve the folder and open it in a browser:
  ```sh
  cd hole-city
  python3 -m http.server 8080
  # then open http://localhost:8080
  ```
- **Controls:** drag anywhere to move (a joystick appears under your finger or mouse).
  On a keyboard, use WASD or the arrow keys. Esc or P pauses; Enter starts the next round.

## Levels (all unlocked; best ★★★ saved per level)

| # | Level | World | Finale |
|---|---|---|---|
| 1 | 🏙️ Hole City | downtown island, parks, traffic, a townhouse district, two supertalls (round and octagonal) | the giant tower |
| 2 | 🏡 Maple Hills | autumn suburbia, yards full of toys (easiest) | the Mega Mall |
| 3 | 🏖️ Sunny Shores | crescent bay, boardwalk, hotels, marina | the lighthouse |
| 4 | 🐄 Cluckington Farm | patchwork fields, animals, tractors | the windmill |
| 5 | 🎡 Funland | theme park, rides, crowds, park train, a giant looping roller coaster (eat its track and it may fly off!) | the castle |
| 6 | ⛄ Frostville | snowy village on a frozen lake (the hole slides on ice) | the ice palace |
| 7 | 🏮 Neon Ward | night market city, canals, glowing signs, two glowing supertalls | the pagoda |
| 8 | 🌵 Dusty Gulch | wild-west town, steam trains, tumbleweeds | Thunder Butte |
| 9 | 🦖 Dino Valley | jungle river, dinosaur herds, research camp | the volcano |
| 10 | 🚀 Lunar Base | moon domes and rovers (low gravity) | the rocket |

## Brain Boost (math gate)

A set starts with ten multiple-choice problems, two of each kind, shuffled:
- addition: 1-, 2- or 3-digit numbers (each size equally likely, picked separately for each number)
- subtraction: the same sizes, larger number on top, so the answer is never negative
- times tables: 0–12 × 0–12
- even or odd: a number from 0 to 9,999,999 (two choices: Even / Odd)
- place value: one digit of a number up to 9,999,999 is underlined in pink; pick its place
  (ones, tens, hundreds, …)

Answers are always listed lowest to highest (place names from ones upward). Problems use the
browser's cryptographic random generator with unbiased sampling.

You need **10 right** to play. Every miss puts another problem of the same kind on the end of the set
(same digit sizes for + and −, the same times table, the same number length for even/odd, the same
place for place value), so a set can run past 10 but always ends; the results list the ones missed.
 Addition and subtraction are shown stacked in columns like on paper. Wrong
answers are built from common mistakes (forgetting to carry or borrow, off by 10, the neighboring
times-table fact). Results show a speed rating and best time. To turn it off, open Settings (⚙︎) and untick **🧠 Brain Boost before each match** (it's on by default).
A quick grown-up check (a two-digit multiplication) keeps kids from switching it off themselves; ticking
it back on needs no check. The choice is saved on the device.

The title screen has **Rivals: 🐢 Easy / 🐇 Normal / 🔥 Hard**.
- Hard: the original game (you and the rivals all start at level 1).
- Normal: you start one size up, at level 2 (and never respawn smaller than that). Rivals unchanged.
- Easy: like Normal, and the rival holes move 15% slower and play dumber: they're less skilled,
  sometimes wander off for a moment, notice danger late and give up chases sooner.

## Modes

| Mode | Rules |
|---|---|
| Classic | 2:00 against 6 rival holes. The highest score wins. Getting eaten costs size, not points; you respawn in 4 s at a spot you steer to. |
| Battle | Last hole standing against 5 rivals. If you're eaten, you're out. The round is capped at 3:00, and the biggest hole wins at the cap. |
| Solo | No rivals and no time limit: the clock counts up, and the level is cleared when you've eaten 95% of its items. Stars by time: clearing ★, under 5:00 ★★, under 3:30 ★★★. Best time saved per level. |

Rank points (Classic: 20 / 10 / 5 / 2 / 2 / 1 / 1) earn rank stars and unlock hole skins.

## Folder map

```
index.html            page shell, HUD and menu markup
css/style.css         all UI styling ("toy sticker" look)
js/                   game code (plain scripts, no build step), see docs/ARCHITECTURE.md
js/levels/            one file per level (layout, objects, theme); see docs/LEVEL_GUIDE.md
vendor/               three.js r159 and cannon-es 0.20 (bundled locally, MIT)
fonts/                Fredoka (OFL)
assets/icons/         app icons
docs/                 design research, architecture, playtest log
tools/                headless simulation and screenshot scripts used for balancing
archive/              zip of the original v1 game
sw.js, manifest.webmanifest   offline install support
```

## Tuning

Every gameplay number lives in `js/config.js`: speeds, growth, physics, camera and bots.
Shared object sizes and point values are in `js/catalog.js`. Collision shapes are derived from each object's model (`Physics.shape` in `js/physics.js`); whether something falls in is decided purely by physics. Each level adds its own objects in `js/levels/`.
