# Dino Drop

A falling-blocks puzzle game for kids, with dinosaurs. It is plain HTML and JavaScript: no libraries, no build step, no internet needed once installed.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `style.css` | Look and layout |
| `game.js` | The game, controls, sound and music |
| `dinos.js` | The dinosaur drawings |
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
- On a computer: arrow keys, Space to drop instantly, and P to pause.
