# Acceptance checklist — Brain Age browser recreation

Legend: [x] verified against build (headless walkthrough: 27 automated checks, zero console errors, zero network requests)

## Global / shell
- [x] Opens offline via index.html (file://), zero network requests, no console errors
- [x] Book layout: two side-by-side bordered panels (left = guide/status, right = interaction), light-gray/cream palette, black line borders, heavy serif numerals, sans UI text
- [x] Original polygonal professor head (SVG, no copied art) with 3 expressions (neutral/happy/think), appears as guide on the left panel
- [x] Minimal color: green correct / red wrong / one blue accent; no gradients or glossy chrome
- [x] Subtle synthesized SFX (tap, tick, correct, wrong, chime) with sound on/off toggle; no audio files
- [x] Scales to fit window (flex-shrink guarded); phone landscape touch play verified; portrait rotate hint

## Title / menu
- [x] Title screen with professor greeting; menu: Brain Age Check, Training, Sudoku, Records
- [x] Navigation works both ways (back/quit links on every screen)

## Exercise flow (all)
- [x] Instruction screen on left panel with rules; Begin button; best shown on intro
- [x] 3-2-1-Begin countdown; stopwatch (m:ss.t) + progress (n/total) on left panel during play
- [x] Wrong answer: red X + retry (calc/triangle/timelapse) or counted as error (score games); correct: green check
- [x] Results: time/score, errors, speed grade (Walking → Bicycle → Car → Train → Jet → Rocket with line-art icons), best persisted, professor comment, daily stamp
- [x] Keypad auto-submits at expected digit length; physical keyboard digits also work

## Exercises
- [x] Calculations x20: 20 problems, +/−/× with operands ≤9; timed — machine-solved end-to-end
- [x] Calculations x100: 100 problems, same generator; timed
- [x] Low to High (reworked to match original screenshots): circled trial card on both pages; memorise numbers in boxes on the LEFT page with visible per-second countdown; numbers vanish (box anchors remain) and the same 4×4-grid layout appears on the RIGHT page to tap low→high; correct taps reveal in place, a miss reveals the answers; starts at 4 boxes, +1/−1 (min 3, max 16); values 1–9 until 10 boxes then 1–16; graded by max numbers held — machine-played 8/8 reaching 11 boxes with >9 values confirmed at level 10
- [x] Head Count: stick figures walk in/out of a house (inside count never negative, single-digit answer); 5 rounds ramping event count and speed
- [x] Triangle Math: 3 top numbers, ± operators, final = (a∘b) ∘ (b∘c); intermediates non-negative, final 0–99; 10 problems — derived answers accepted
- [x] Time Lapse: two analog SVG clocks (5-minute resolution); hours → OK → minutes → OK; diff < 12 h; right clock carries over to next problem; wrong answer retries
- [x] Sudoku: generated puzzles with uniqueness-checked removals (easy 38 / medium 46 / hard 52 cells removed); givens locked; wrong entry rejected with +20 s penalty; completion stops clock

## Brain Age Check
- [x] Three tests in sequence with instructions between: Stroop (tap INK color, 20 trials, ~65% incongruent), Calculations x20, Number Cruncher (count-by-color/motion/value questions on scattered animated numbers, 8 rounds)
- [x] Brain age 20–80 from speed + accuracy (approximate formula in NOTES.md); big serif result + per-test breakdown + professor remark; history saved

## Records / meta
- [x] Records: bests per exercise with grade, brain age history, stamp calendar for current month (bigger stamp at 3+ exercises/day)
- [x] Persists via localStorage (verified across reload); in-memory fallback otherwise
