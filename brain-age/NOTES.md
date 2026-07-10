# NOTES — design decisions, approximations, omissions

A fan recreation of the *Brain Age / Brain Training* concept (Nintendo DS, 2005–06),
built with vanilla HTML/CSS/JS. **All art is original** — the polygonal professor is
my own generic design (not a copy of the game's guide or any real person's likeness),
and every icon/prop is hand-drawn SVG. No Nintendo assets, text, or passages are
reproduced. Open `index.html` to play; fully offline.

## Sources used for rules
- Gameplay FAQs describing each exercise and the check tests (GameFAQs guides for the
  original game), plus the game's Wikipedia page. The two provided screenshots guided
  the look only (two-panel book layout, serif numerals, bordered panels).

## Faithful bits
- Book orientation: left page = guide/status, right page = interaction.
- Calculations x20/x100 use operands ≤ 9 (per the original's design).
- Low to High: rebuilt against gameplay screenshots of the original. Memorise happens on
  the LEFT page (instruction strip + per-second countdown), then the numbers vanish and
  the same box layout appears on the RIGHT page to touch low → high; correct taps reveal
  the number in place, a miss reveals where everything was. Circled trial number card
  between rounds. Starts at 4 boxes, +1 when right, −1 when wrong (floor 3), on a 4×4
  grid capped at 16 boxes. Values run 1–9 until the board reaches 10 boxes, then 1–16.
  Graded by the most numbers held in one round. One deliberate deviation, by request:
  box outlines stay visible as anchors during memorisation (the original shows bare
  numerals with no boxes until the answer phase).
- Head Count: people walk in/out; you answer how many are inside; later rounds busier.
- Triangle Math: three numbers, two ± steps, answer the final only.
- Time Lapse: elapsed time between two analog clocks; the right clock becomes the left
  clock of the next problem (a detail from the original).
- Sudoku: wrong entries are rejected and cost a 20-second time penalty, echoing the
  original's easy-mode behavior; puzzles are generated with a uniqueness check
  (backtracking solution counter), so every puzzle has exactly one solution.
- Results graded as Walking/Bicycle/Car/Train/Jet/Rocket speeds; daily stamp calendar
  (stamp per training day, bigger stamp at 3+ exercises).

## Approximations (by design)
- **Handwriting → keypad.** The original reads handwritten digits; per the carve-out I
  used an on-screen keypad (physical keyboard also works). Answers auto-submit when
  the typed digit count matches the answer's length, keeping the rapid-fire feel.
- **Stroop test → tap version.** The original is spoken; here you tap the button
  matching the ink color. Used as check test #1.
- **Brain Age Check composition.** The original rotates several tests and requires a
  mic for some. This check always runs: Stroop (tap), Calculations x20, and Number
  Cruncher. The Number Cruncher here is the count-by-property test (color/motion/value
  questions) adapted to keypad answers.
- **Brain age formula is invented** (the real one is unpublished): starts at 20 and
  adds penalties for Stroop average response time and errors, Calc x20 time and
  errors, and Number Cruncher misses/time; clamped to 20–80. Tuned so a fast, clean
  run scores near 20.
- **Speed-grade thresholds** per exercise are my calibration, not Nintendo's.
- **Stamps don't gate content.** In the original, stamps unlock exercises over days;
  here everything is available immediately (noted deviation, friendlier for a demo).
  The stamp calendar itself is kept.
- Time Lapse uses 5-minute clock resolution for readability; hours entered first,
  then minutes, via an OK key (the one exercise with explicit submit).

## Omissions (and why)
- **Reading Aloud / Speed Counting / Voice Calculation** — require a microphone and
  speech recognition; also Reading Aloud would require literature passages. Omitted.
- **Syllable Count** — heavily language-dependent and originally hand-written; omitted
  in favor of the six implemented exercises plus Sudoku.
- **Word Memory / Connect Maze** from the check battery — writing words needs
  handwriting/typing free-recall UI that changes the feel; the three implemented check
  tests keep the check under ~3 minutes as in the original.
- **Multiplayer/versus and download play** — out of scope for an offline single file.

## Tech notes
- Fixed 1160×690 stage scaled to the window (`flex:none` guards against the flex-shrink
  double-scaling pitfall); portrait phones get a dismissible rotate hint.
- All SFX are WebAudio-synthesized; no external requests of any kind.
- Persistence via localStorage (`brain_age_recreation_save`) with silent in-memory
  fallback; stores bests, brain-age history, and daily stamps.
