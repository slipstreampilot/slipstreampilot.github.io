# Dino Drop

A falling-blocks puzzle game for kids, with dinosaurs. It is plain HTML and JavaScript: no libraries, no build step, no internet needed once installed.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `style.css` | Look and layout |
| `game.js` | The game, controls, sound and music |
| `dinos.js` | The dinosaur drawings, including Pip |
| `puzzle-core.js` | Puzzle-mode rules (Pip, the spiked ceiling, scoring) |
| `puzzle-levels.js` | The 100 puzzle levels |
| `manifest.webmanifest`, `icons/` | Home-screen app name and icon |
| `sw.js` | Offline support |

## Put it on GitHub Pages

1. Sign in at github.com and create a new **public** repository, for example `dino-drop`.
2. On the repository page, click **Add file → Upload files**. Drag in everything from this folder, including the `icons` folder, and click **Commit changes**.
3. Go to **Settings → Pages**. Under "Branch", choose `main` and `/ (root)`, then click **Save**.
4. After a minute or two, the game is live at `https://YOUR-USERNAME.github.io/dino-drop/`.

## Add it to the home screen

- **iPhone or iPad (Safari):** open the link, tap the **Share** button, then tap **Add to Home Screen**.
- **Android (Chrome):** open the link and tap **Install on this phone** on the menu screen. You can also use Chrome's **⋮ menu → Add to Home screen**.

Once installed, it opens full-screen like an app and works offline. On iPhone, high scores saved by the home-screen app are kept separately from scores saved in Safari.

## Changing the game later

Upload the changed files to GitHub. Also open `sw.js` and bump the version, for example `dino-drop-v1` → `dino-drop-v2`. Phones pick up the new version the *second* time the game is opened after the change. The first open loads instantly from the saved copy while it downloads the update.

## How to play

- **◀ ▶** move the piece. Hold to slide.
- **⟳** turns it.
- **⬇** makes it fall faster while held.
- Fill a whole row to clear it.
- **Easy:** slow, with an outline showing where the piece will land and a preview of the next dino. If the blocks reach the top, a T. rex stomps away the bottom rows and play continues.
- **Medium:** speeds up gradually and shows the next dino.
- **Hard:** fast, no helpers.
- On a computer: arrow keys, Space to drop instantly, E to use a power (arrows to aim, Enter to fire), and P to pause.
- **Easy mode's save:** one Dino Stomp per game clears the bottom 5 rows the first time the blocks reach the top. The egg in the side panel cracks once it's used. The next time the blocks reach the top, the game is over.

## Game options

After picking Easy, Medium or Hard, two switches can be turned on. The choice is remembered between games.

- **Powers:** every 2,000 points you earn one power, holding at most one. "Power Available!" appears, along with a glowing button in the side panel, and play carries on until you choose to use it. Tapping the button freezes the falling blocks, and the bottom buttons change to ◀ ▶ and a big **FIRE!** button. Aim with the arrows, then FIRE. Tap the power button again to cancel and keep it for later.
  - *Meteor* smashes every block in the column you aim at.
  - *Egg Bomb* drops an egg down the column you aim at. It blows up a 3×3 area centred on the block it lands on.
  - *Volcano* melts the bottom row. There's nothing to aim, so just tap FIRE.
- **Cascade:** after rows clear, loose clumps of blocks tumble down. If that completes more rows, they clear as a chain, and each step of the chain multiplies the points.

## Puzzle mode

Inspired by the Puzzle Mode in Tetris Plus. Each level starts with a pile of blocks. Pip, a baby dino, walks back and forth on top of it. Get him down to the nest at the bottom of the well by clearing rows.

- Pip is 2×2 blocks. He walks until he bumps into something, then turns around. He drops through gaps at least 2 wide, gets dizzy after long falls, and climbs onto any block that lands on his head.
- A spiked ceiling comes down one row every 18 seconds, destroying blocks in its way. After 125 seconds it speeds up. Clearing 3 or more rows at once pushes it back up. If it reaches Pip, the level is lost.
- Score: time bonus of 20,000 for finishing in 10 seconds or less, minus 100 for every extra quarter-second. Stars: 3 for beating the level's par time, 2 for under twice par, 1 otherwise.
- 5 zones × 20 levels. Fern Forest, Volcano Valley, Tar Pit Swamp and Crystal Ice Cave are open from the start, and levels unlock one at a time. Secret Egg Island, the hardest zone, unlocks after the other 80 are beaten.
- Every level was generated and then play-tested 16 times by a computer player using the same rules as the game. All 100 were beaten at least once, and they are ordered by how often the computer player won and how long it took.
