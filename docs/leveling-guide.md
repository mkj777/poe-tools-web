# PoE Leveling Guide

Live at <https://www.pathoftools.app/leveling>. The app itself lives in its own
repository: <https://github.com/mkj777/poe-leveling-app>.

The PoE Leveling Guide is a free Windows overlay that draws the next Path of
Exile campaign step inside the game window and advances on its own when you
change zone.

## What the app does

- Reads the zone changes the game writes to its `Client.txt` log and moves the
  guide to the next step by itself. The path to `Client.txt` is taken from the
  running game; if the game is not running it can be picked by hand.
- Shows the walkthrough from the [Exile Leveling](https://heartofphos.github.io/exile-leveling/)
  project. It is downloaded on first start, stored locally and kept up to
  date, so no build has to be imported.
- Places the overlay inside the game window and follows it. Position, size and
  opacity are set in the app's settings.
- Hotkeys: `Ctrl+Shift+Alt+Right` next step, `Ctrl+Shift+Alt+Left` previous
  step, `Ctrl+Shift+Alt+O` move the overlay on or off, `Ctrl+Alt+0` close the
  overlay and return to the main window.
- Updates itself in the background and installs the new version on the next
  start.

It is built with Tauri, React and TypeScript on
[Kazte/path-of-levelling](https://github.com/Kazte/path-of-levelling), and is
MIT licensed.

## What this site does for it

`/leveling` is the download page: a screenshot of the overlay in game, the
three steps to the first run (run the installer, start the game and the app,
click Start), the installer and portable zip links, a short guide and the
common questions. It carries no league and nothing on it comes from the
network, so it is built once and served as is.

Which release the page hands out lives in `src/lib/leveling-app.ts`: one
`RELEASE` constant that both download URLs are built from, so a new version is
a one line change. `test/leveling-app.test.ts` checks that both downloads point at the release the page names.

The page marks itself up as a `SoftwareApplication` (Windows, free, MIT, with
the download URL and version) plus a breadcrumb and an `FAQPage`.

Source: `src/app/leveling/page.tsx`, `src/app/leveling/header.tsx`,
`src/lib/leveling-app.ts`.
