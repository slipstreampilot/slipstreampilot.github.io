# STARFALL Art Bible

Rules for every visual in the game. All art is original and drawn in code.
Reference screenshots inform *statistical principles only* (value structure,
saturation distribution) — never shapes, assets, or pixels.

## 1. Light
- Global light direction: **upper-left**, always. Highlights top/left edges,
  shadows bottom/right edges, on every panel, hull, and prop.
- Emissive sources (engines, weapons fire, shields, warning lights) glow with
  soft radial falloff; everything else is matte.

## 2. Value structure (measured targets, per full-frame screenshot)
| Scene            | Shadows (<0.22) | Mids (0.22–0.6) | Highs (>0.6) |
|------------------|-----------------|------------------|---------------|
| Space / combat   | 55–70%          | 22–35%           | 5–14%         |
| Main menu        | 60–75%          | 20–30%           | 5–10%         |
| Hangar           | 30–48%          | 38–50%           | 14–25%        |
| Beacon map       | 75–85%          | 12–20%           | 3–7%          |

- Space is never empty: layered nebula wisps, dust bands, and planetary
  features supply the mid-value band. Pure-black coverage above ~75% of a
  space frame is a defect.
- **Accent share** (saturation > 0.5 AND value > 0.45) stays between
  **1% and 3%** of the frame. Accents are small and earned: power pips,
  warning lights, engine cores, selection yellow.

## 3. Color
- UI text colors come exclusively from `Art.ROLE` (contrast-validated per
  surface). No raw hex at call sites.
- Backgrounds: desaturated (S < 0.35) except nebula scenes.
- Every hue used at scale gets light/mid/dark steps with the shadow step
  hue-shifted toward blue, never just darkened.
- Base space black is `#0B0A06` (slightly warm); star tints are cool.

## 4. Line & shape
- Outlines: 4px on ship hulls, 3px on rooms/panels, 2px on props, 1px on
  fine detail. Outline color `#141311`, never pure black.
- Panels are octagonal-cut parchment with a 3px dark outline and 1px inner
  light frame (existing `panel()` contract), plus §5 finishing.
- Silhouettes carry family character: each faction hull family keeps one
  signature motif (ring, claw, slab, shard...) readable at 100px.

## 5. Surface & texture
- Light UI surfaces get: 1px top/left inner highlight, 2px bottom/right
  inner shade, and faint surface grain (alpha ≤ 0.03). Never enough to move
  text contrast below the audited 4.5:1.
- Hulls get plating seams, rivets, vents, hatches, an antenna near the nose,
  and scorch streaks aft of the engine nacelles. Detail density: 3–7 greebles
  per ship; deterministic per hull style (no per-frame shimmer).
- Room floors keep the AO inset. Fires, breaches, low-O2 striping unchanged.

## 6. Motion (juice)
- Ships idle-drift ±3px on slow sine curves; player and enemy out of phase.
- Engine exhaust flickers continuously (already standard).
- Weapons: muzzle flash at fire, impact sparks on hull hits, expanding ring
  on shield hits, smoke puffs on 2+ damage, debris + flash on ship death.
- Modals ease in over ~180ms (scale 0.96 → 1.0, ease-out).
- All motion freezes on pause (sim-time driven), per the game spec.

## 7. Enforcement
- Contrast auditor (SF_AUDIT) must report **zero** violations after any art
  change.
- `imgstats.py` value-structure measurements must land inside the §2 table
  for the four key screens (combat, menu, hangar, map).
- Gallery harness re-renders all screen states each round; changes ship only
  after both checks pass.
