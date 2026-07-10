# NOTES — design decisions & faithful-interpretation calls

A fan recreation of Playfish's *Who Has The Biggest Brain?* (2007–2008), built from
the provided screenshots. **All art is original** — every sprite, icon, and background
is hand-drawn SVG/CSS made to match the aesthetic; nothing was copied from the game.
Vanilla HTML/CSS/JS, no build step, no network requests. Open `index.html` to play.

## Primary sources
- The 9 game screenshots (menu, mode select, practice grid, Cube Counter intro+play,
  Card Pairs intro ×2, Asteroids intro+play). Two additional screenshots in the folder
  are Brain Age references — used only to confirm the keypad-instead-of-handwriting approach.
- Per-minigame scoring values (+/− per answer) from a fan-maintained rankings FAQ for the
  original game: Balance 24/16, Shape Order 18/12, Cube Counter 49/33, Card Pairs 26/18,
  Car Path 26/17, Action Sequence 13/8, Missing Sign 20/12, Asteroids 11/11,
  Missing Number 27/18, Jigsaw 19/13, Math Combination 44/29, Hexagon Path 40/26.

## Ambiguities and the interpretations chosen
- **Grid → name mapping** (rows are categories, per the screenshots): row 1 Analyse =
  Balance, Cube Counter, Car Path; row 2 Calculate = Missing Number, Missing Sign,
  Math Combination; row 3 Memorise = Card Pairs, Shape Order (framed rabbit icon),
  Action Sequence (hatching chick icon); row 4 Visualise = Asteroids, Jigsaw, Hexagon Path.
  The rabbit-frame ↔ Shape Order and chick ↔ Action Sequence assignments are my best
  guess; both are implemented as order-memory games either way.
- **Shape Order**: framed portraits light up one at a time; repeat the order by tapping.
- **Action Sequence**: eggs hatch briefly one at a time; tap the eggs in hatch order.
- **Car Path**: follow-the-tangled-line puzzle — one car, several garages, decoy roads
  ending in traffic cones.
- **Math Combination**: tap the two tiles that ADD (at higher levels sometimes MULTIPLY)
  to the target; boards are generated so exactly one pair works.
- **Hexagon Path**: tap a connected chain of touching hexes matching the item sequence
  shown; a valid path is embedded at generation so every board is solvable; a wrong tap
  resets chain progress (one −26 per wrong tap).
- **Balance**: adjacent-pair scale comparisons that imply a full weight order; asks
  heaviest (lightest appears at higher difficulty).
- **Cube Counter**: structures are monotone "staircases" (heights never increase toward
  the viewer), so hidden cubes are always logically inferable — never a blind guess.
- **Keypad auto-submit**: answers submit when the typed digit count matches the answer's
  digit count (the original tapped single digits; this generalizes to 2-digit answers).
  Physical keyboard digits also work.
- **Timer**: 60 s per round in all modes, matching the 56/59-second timers visible in
  the gameplay screenshots. Red wedge = elapsed time.
- **Classic** = 4 rounds, one game per category in category order. **Pro** = 6 rounds
  drawn from all 12 games, starting at higher difficulty. **Practice** = one chosen game.
  (Exact original round counts unverifiable offline; these follow the mode descriptions.)
- **Brain size** = total points, displayed in cm³ (the original's ranking FAQ measures
  scores in cm³; 4300 cm³ = "Pro Player Club" trophy threshold, kept here).
- **Trophies** are invented names (originals unavailable): size milestones, per-category
  350-pt rounds, play-count, try-everything, 500-pt round.
- **Challenge / Invite** are social features; they show a friendly host message
  explaining they don't exist offline.
- **Intro preview** runs the real minigame behind the instruction bubble with input
  blocked — matching the screenshots where the actual board is visible pre-round.
- **Typeface**: the original's chunky rounded font is approximated with system fonts
  (Comic Sans MS / Chalkboard SE fallback chain) to stay offline with zero bundled
  assets; bubble lettering is done with CSS strokes/shadows.
- **Persistence**: localStorage when available (works on file:// in most browsers),
  silent in-memory fallback otherwise.
