# Acceptance checklist — "Who Has The Biggest Brain?" recreation

Legend: [x] verified against build (headless-browser walkthrough + logic tests, zero console errors, zero network requests)

## Global / shell
- [x] Opens offline via `index.html` (file://) with zero network requests, no console errors
- [x] Game-show stage frame: dark backdrop, spotlight beams, audience silhouettes, pink polka-dot risers, grey stripe, host podium with bulbs
- [x] Bubble-letter logo "WHO HAS THE BIGGEST BRAIN?" with pink BRAIN and gold "PRO PLAYER CLUB" banner (original art, not copied)
- [x] Lab-coat host character (black spiky hair, blush cheeks, green tie) rendered as original SVG with 3 poses / 2 faces and speech bubble with tail
- [x] Top-right chrome: language chip (ENGLISH), eye button, sound toggle (mutes/unmutes SFX)
- [x] WebAudio SFX: correct ding, wrong buzz, tick, countdown, fanfare — all generated, no audio files

## Main menu
- [x] PLAY (4 colored category circles icon), CHALLENGE (boxing gloves), INVITE (sketch trio), TROPHIES (gold cup), PROFILE (ID card) — yellow outlined bubble-letter labels
- [x] Host welcome speech bubble on load
- [x] PLAY → mode select; TROPHIES → trophies screen; PROFILE → profile screen
- [x] CHALLENGE / INVITE show a friendly "offline recreation" host message instead of dead ends

## Mode select
- [x] Back button (blue rounded arrow) returns to menu
- [x] Three pinwheel icons: Classic Game (purple), Pro Game (orange), Practice (blue dumbbell) with bubble labels
- [x] Host speech: choose your game mode

## Practice grid
- [x] 4×3 grid of circular minigame icons, row-tinted by category (red=Analyse, yellow=Calculate, green=Memorise, blue=Visualise)
- [x] Host speech: choose the minigame to practice
- [x] Every icon launches its minigame in practice (single 60s round, result shown) — all 12 verified

## Round flow (all modes)
- [x] Intro: category-tinted backdrop + watermark, live preview of the actual game (input blocked), host + speech bubble with rules ending "Ready?", green check button starts
- [x] 3-2-1-GO countdown before play
- [x] Gameplay: circular timer top-left (dark disc, white seconds, red elapsed wedge, hurry state ≤10s), host hidden, red power/quit button top-right works
- [x] Correct answer: green feedback + ding + floating "+N"; wrong: red feedback + buzz + "−N"; score uses per-game FAQ values
- [x] Difficulty ramps within a round as answers accumulate (level = correct count + mode base)
- [x] Timer end → TIME'S UP banner → round result; next round or final results

## Minigames (each: playable, solvable, correct scoring, no dead states)
- [x] Balance (Analyse +24/−16): scale comparisons imply a total order; heavy pan drops; tap heaviest/lightest — logic-solved 6/6 by automated order-derivation test
- [x] Cube Counter (Analyse +49/−33): isometric staircase structure (hidden cubes inferable, never ambiguous); keypad digits; auto-submit at expected digit count
- [x] Car Path (Analyse +26/−17): tangled roads from car to garages, cones at dead ends; tap the right garage; ramps 3→5 garages
- [x] Missing Number (Calculate +27/−18): a ? b = c with one blank; keypad answer; ops and ranges ramp
- [x] Missing Sign (Calculate +20/−12): a ? b = c; tap +, −, ×, ÷ tile; ambiguous equations rejected at generation — auto-solved in test
- [x] Math Combination (Calculate +44/−29): tap the two tiles that ADD (later MULTIPLY) to the target; unique-pair generation
- [x] Card Pairs (Memorise +26/−18): face-up memorise phase, flip down, tap pairs; brain-back card design — pair-match auto-solved in test
- [x] Shape Order (Memorise +18/−12): framed animal portraits flash in sequence; tap frames in order — observe+replay auto-solved in test
- [x] Action Sequence (Memorise +13/−8): eggs hatch chicks one at a time; tap eggs in hatch order — observe+replay auto-solved in test
- [x] Asteroids (Visualise +11/−11): drifting, rotating asteroids with rotated numbers/letters; tap LOW→HIGH or A→Z — 8/8 correct pops in human-style automated play across two sets
- [x] Jigsaw (Visualise +19/−13): generated scene with puzzle-piece hole; one candidate clipped from the hole position, decoys from offsets
- [x] Hexagon Path (Visualise +40/−26): honeycomb of items; tap adjacent-connected path matching sequence; path embedded at generation so always solvable; wrong tap resets progress

## Modes & meta
- [x] Classic: 4 rounds, one random minigame per category (Analyse→Calculate→Memorise→Visualise) — full 4-round run verified end-to-end
- [x] Pro: 6 rounds from all 12 games (no repeats), higher starting difficulty (level base 3)
- [x] Results: brain size in cm³ with count-up + brain SVG scaled by size, per-round breakdown, Play Again / Menu
- [x] Trophies: cabinet of 12 earned/locked trophies (milestones incl. 4300 cm³ Pro Player Club + per-category + play-count)
- [x] Profile: best brain size, games played, trophies count, per-category best rounds
- [x] Stats persist across reloads via localStorage (verified) with in-memory fallback when storage is unavailable
