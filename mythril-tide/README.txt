MYTHRIL TIDE
An age-of-exploration roguelike in the spirit of FTL.
Pixel-art + painted HD-2D visuals (hand-coded engine, AI-generated art baked in).
No internet needed, ever.

HOW TO RUN
  Double-click index.html. That's it.
  Works straight from this folder in any modern browser (Chrome, Edge,
  Firefox, Safari). You can zip and email this whole folder - it will
  run the same way on any computer.

THE STORY
  The Old World is mined hollow. You hold the only chart to the New World
  and the fabled City of Mythril. Your ship, the Dawnchaser, has no magic
  at all - yet. Cross 8 seas, trade and fight with merfolk, fire djinn,
  storm elves, deep dwarves, lizardfolk and sirens, bolt their magic onto
  your hull, outrun the Imperial Armada, and sink the Warden of the Veil
  for the biggest mythril haul in history.

LORE
  The LORE button on the title screen opens an illustrated encyclopedia
  of the world: the Mythril Age, how magic works, all seven peoples,
  Grand Admiral Vey, the Warden, and the City itself.

CONTROLS
  Mouse        - everything is clickable
  SPACE        - pause/resume battle (orders can be given while paused)
  1-4          - select a weapon, then click an enemy room to target it
                 (LANCES: press and DRAG a line to sweep several rooms;
                  self-cast bombs like Mending Tide target YOUR rooms)
  Right-click  - remove mana from a system / toggle a weapon off
  Click sailor - select crew (shift-click for more), then click a room
  R            - all hands return to battle stations
  Right-click  - on YOUR hull rooms (bottom row, bow, stern): open or
                 shut their SEA DOOR (deliberate flooding - drowns
                 boarders, douses fires). Sump Pumps drain water back out.
  M            - mute,  ESC - cancel selection
  U            - toggle the HD combat view / the classic 512x288 view
  Q            - quit to title (from combat)
  S (on map)   - open the SHIP window (tabbed: HEARTHSTONE refit, LOADOUT, CREW)
  DECKS (map)  - manage your crew underway, FTL-style: fires, leaks and
                 floods persist after battle and the sea never pauses.
                 The ship and crew can be lost between battles.

TIPS
  - Keep the helm manned or you will dodge nothing.
  - 2 mana in Wards = 1 ward layer. Bombs and torpedoes ignore wards
    but cost runeshot.
  - Fires burn systems; flooded rooms can't burn. Merfolk love water.
  - Cannonfire punches hull breaches - send a sailor to patch them
    or install Sump Pumps to keep the water down.
  - Capture ships (clear ALL enemy crew - killed or charmed over) for
    60% bigger hauls. A CAPTURED ship does NOT sink - you take her as a
    prize. Recall your boarding party safely through the Brine Gate.
  - FAMILIARS (FTL drones): buy bound spirits at shops (3 max), install a
    BINDING SHRINE, and power it. OFFENSIVE familiars must be DEPLOYED
    each battle (press F / the panel button) and burn a Summoner's Candle
    to do so - they don't wake automatically, so conserve candles.
    Defensive/onboard ones run free. Squall sprites deflect torpedoes;
    counter-sigils erase enemy bombs mid-conjure.
  - SHIP SYSTEMS (FTL-style): your hull has 5 core systems plus 2 "Open"
    mounts. Buy advanced systems at anchorages to fill them - Binding
    Shrine, Brine Gate, Fog Veil, Storm Conduit (storm-elf lightning that
    jams an enemy system), or Siren's Song (charm an enemy sailor). You
    can only fit 2 of the 5, so choose your ship's character.
  - The red tide on the map is the Armada. Don't dawdle.
  - Auto-saves after every island. Death deletes the save. That's the sea.

FOLDER
  index.html     - the game
  js/            - engine, music, content (all hand-rolled)
  assets/        - art the game loads (baked + any imported AI art) - REQUIRED
  ART_PROMPTS.md - prompt pack: generate art with any AI image tool,
                   drop it in assets_src/, run: node dev/import_art.js
  assets_src/    - drop zone for your generated images
  dev/           - optional tooling: bake.js (built-in art), import_art.js
                   (AI art importer), smoke.js (tests), screenshots.
                   Safe to delete - the game only needs index.html + js/ + assets/.

CREDITS
  Crew sprites from the 16-Bit Fantasy, 16-Bit Sci-Fi, and Ultimate
  Fantasy sets by Oryx Design Lab (oryxdesignlab.com), used under
  their commercial license.
  Ship cutaways, backdrops, and portraits generated with AI.
  Fonts: Cinzel (Natanael Gama) and Spectral (Production Type),
  both under the SIL Open Font License.
  Everything else: engine, music, and remaining art made in code.

SHARING
  Mythril-Tide.zip (in this folder) is a ready-to-send build
  (~160 MB - it bundles all the AI art): send it via Dropbox Transfer,
  recipient unzips and double-clicks index.html. Done.
  (The full project folder also contains assets_src/ - the original AI
  images - and dev/ tooling and screenshots, which you don't need to send.)

PUTTING IT ON THE WEB (GITHUB PAGES)
  The game is 100% static - it works on GitHub Pages as-is:
  1. Create a repo and copy in: index.html, js/, assets/, README.txt
     (a .gitignore is already included that skips the heavy extras)
  2. Repo Settings -> Pages -> Source: "Deploy from a branch",
     branch: main, folder: / (root)
  3. Your game is live at https://<username>.github.io/<repo>/
  Saves use the browser's localStorage, so progress is per-browser.

CHEATS
  Starting a NEW VOYAGE shows optional cheat checkboxes:
  - ONE-SHOT EM RAIL GUN (destroys any ship in one hit)
  - START WITH 15,000 SHARDS
  - MAGIC TELEPORT (every island is always reachable)
  - FULLY UPGRADED SHIP (core systems maxed + powered; the 2 advanced
    mounts stay Open for you to choose)
  Leave them unchecked for a fair-difficulty run.
