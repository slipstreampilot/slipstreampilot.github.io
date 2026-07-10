# STARFALL Sprite Assets

Drop PNG ship sprites in `assets/ships/`, then add each filename (without
`.png`) to the list in `assets/ships/manifest.js` — e.g.
`var SHIP_SPRITE_MANIFEST = ["kestrel", "rebel"];`. Ships without a sprite
keep the built-in code-drawn hull, so partial sets are fine — add ships one
at a time as you generate them.

## File list

All sprites: **top-down view, ship facing RIGHT, transparent background,
no text or watermark.** The engine mirrors enemies automatically.

Player cruiser hulls (long ships, aspect ratio ~2.4:1, suggest 240x100 px):

| File | Ship family | Character brief |
|---|---|---|
| `ships/kestrel.png`  | Kestrel Cruiser    | dependable federation workhorse, boxy spine, orange trim stripes |
| `ships/kestrel2.png` | Kestrel B (Red-Tail) | same silhouette family, deep red trim |
| `ships/fed.png`      | Federation Cruiser | broad military cruiser, triple engines, orange/white livery |
| `ships/stealth.png`  | Stealth Cruiser    | sleek dart, matte gunmetal, thin blue edge lighting |
| `ships/engi.png`     | Engi Cruiser       | asymmetric industrial pod with a ring/lattice structure, teal accents |
| `ships/zoltan.png`   | Zoltan Cruiser     | smooth luminous ovoid, glowing green seams |
| `ships/mantis.png`   | Mantis Cruiser     | aggressive clawed silhouette, purple/green chitin plating |
| `ships/slug.png`     | Slug Cruiser       | organic rounded hull, violet iridescent shell |
| `ships/rock.png`     | Rock Cruiser       | massive slab armor, craggy edges, rust-red seams |
| `ships/crystal.png`  | Crystal Cruiser    | faceted translucent crystal hull, teal glow |

Enemy hulls (smaller craft, aspect ~2:1, suggest 160x80 px):

| File | Archetype brief |
|---|---|
| `ships/rebel.png`   | crisp military fighter, gold/charcoal livery |
| `ships/pirate.png`  | patched-together raider, mismatched plates, scrap welds |
| `ships/mantisE.png` | small clawed insectoid fighter, purple/green |
| `ships/engiE.png`   | utilitarian drone-carrier pod, teal |
| `ships/zoltanE.png` | smooth glowing fighter, green energy seams |
| `ships/rockE.png`   | heavy stone slab gunship, rust accents |
| `ships/slugE.png`   | rounded organic interceptor, violet |
| `ships/auto.png`    | crewless angular drone ship, red sensor eye, no windows |
| `ships/boss.png`    | huge fortress dreadnought, wide winged slab, red/charcoal (aspect ~2.6:1, suggest 320x120) |

## Style prompt template

Use the SAME style block for every generation (and your tool's style-reference
feature, seeded with your first accepted ship) so the fleet stays coherent:

> Top-down spaceship sprite for a 2D sci-fi roguelike, facing right,
> orthographic top view, clean readable silhouette, chunky sci-fi plating
> with visible panel seams and rivets, subtle weathering, light source from
> the upper left, dark outline, limited palette, flat shading with 3-4 value
> steps per hue, transparent background, centered, no text, no watermark.
> [CHARACTER BRIEF FROM THE TABLE ABOVE]

Palette anchors to include where the brief mentions a color:
hull grays `#C9C5BD / #7B7871 / #57544E`, federation orange `#CF7C20`,
teal `#99DDDC`, warning red `#C33D32`.

## Rules

- Original art only. Describe the style you want; never ask the generator to
  imitate a named game or artist, and never trace existing game assets.
- Check your generator's commercial-use license before producing the full set.
- PNG with real alpha (not white background). If your tool exports oversized
  images, don't worry — the engine scales with hard pixels; native pixel-art
  resolution close to the suggested sizes will look crispest.
- Interior room grids draw ON TOP of the hull sprite, centered. Keep the
  middle ~70% of the hull relatively calm (plating rather than huge machinery)
  so rooms sit naturally on it.
