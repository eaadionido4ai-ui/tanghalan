# TANGHALAN

**Three-dimensional Animated Gallery Highlighting Youth-Generated Artworks, Learnings and Disaster Narratives**

**Play it online:** https://eaadionido4ai-ui.github.io/tanghalan/ (published from `main`; see "Running it")

TANGHALAN is a walk-in 3D museum where children's drawings, stories, poems, comics and letters about disasters
become lessons for other children. You pick an animal visitor, walk the halls with Bayani as your guide, and stop at
each work to look at it or have it read aloud in Filipino or English. The rooms follow the four thematic areas of the
National Disaster Risk Reduction and Management Plan: Stop Hazards Early, Get Ready, Act Fast and Bounce Back.

Two rooms are places you play in, not just look at:

- **Go Bag Room.** Take an empty go bag from the packing table and it goes on your character's back. Walk to the
  tables (Easy) or open the cabinet, the drawers, the crate and the cooler (Difficult), tap a thing to read its note,
  and pack it or leave it. Each thing you pack flies into the bag, and the bag swells as it fills. Pack too much and
  you walk slower until you take something out. Zip it up at the packing table to see your stars.
- **Fire Safety Room.** Press the fire alarm by the door, take the extinguisher off the wall, and carry it to a safe
  spot with the way out behind you. Then do P, A, S, S: pull the pin (it drops to the floor), aim low at the base,
  squeeze, and sweep from side to side. The fire shrinks as you do it right. On Difficult it grows back when you aim
  too high and the extinguisher runs out, and if the fire is still burning by then, the lesson is the real one: get out.

TANGHALAN is part of the BAYANIHanda Game Library of the University of the Philippines Resilience Institute. This
repository is the standalone version: it runs on its own, fully offline, with no link to the library needed.

> 🧪 Subject for code and content validation. Version 0.1.0 is a working prototype for review. The artworks and
> stories are samples of how the museum is envisioned; learners' own works, shared with their parents' consent, will
> replace them.

## Install it and use it with no internet

TANGHALAN is an installable web app (a PWA). Open the link above once with internet and wait a moment: the whole
museum (about 3 MB) is saved on the device, and Settings shows "No internet needed: Ready". From then on it opens and
plays with the internet off.

- **Android, Chrome:** Settings in the app, then Install (or the browser menu, then Install app or Add to Home screen).
- **iPhone and iPad, Safari:** tap Share, then Add to Home Screen.
- **Computer, Chrome or Edge:** the install icon in the address bar, or Settings in the app, then Install.

When a newer version is published, the next visit with internet saves it in the background and the home page shows
"A new version of TANGHALAN is ready" with Update and Later. Nothing changes in the middle of a visit.

## Where the game rules come from

The Go Bag and Fire Safety rooms bring two games of the BAYANIHanda Game Library into the museum: Go Bag Packing 3D
and Fire Extinguisher 3D. Their rules are copied as they are into `src/rooms/logic.js`: the 24 go bag items with
their notes and weights, a bag that holds 14 weight units, a round of 9 useful things and 5 that could stay home, the
star ratings, and the extinguisher numbers (how fast the fire drops for each technique, how fast it grows back, how
fast a Difficult extinguisher empties). The item models in `src/rooms/items3d.js` come from the same game. What
changed is how you play: your own character does the packing and holds the extinguisher, inside the room.

## Running it

You need Node.js 20.19 or newer.

```bash
npm ci                 # install, exactly as locked in package-lock.json
npm run dev            # work on it at http://localhost:5173
npm test               # check the game rules (tests/logic.test.mjs)
npm run build          # a web version in dist/, for any static host such as GitHub Pages, installable as an app
npm run build:single   # one file, dist-single/index.html, that opens offline with a double-click
python3 pwa/make_icons.py   # remakes the app icons and the tab icon from public/icon.svg (logo H4)
```

Every push to `main` runs the rules checks, builds `dist/` and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`; in the repository's Settings, Pages has its source set to GitHub Actions).

`dist/` uses relative paths, so it works from any folder of a site. It also holds the app manifest, the icons and
`sw.js`, the service worker that keeps the app on the device; the build writes `sw.js` with the list of every built
file and a version made from their contents, so each change replaces the old copy on devices. The service worker
needs `https://` (or `localhost`), so a copy opened from a folder on disk runs online only.
`dist-single/index.html` holds everything inside it (code, fonts, pictures; about 3.7 MB), makes no network
requests, and can be copied to a phone, a tablet or a USB stick and opened in a browser. It has no install files
because it needs none.

### Browser checks

`tests/e2e/` has checks that play the game rooms in Chromium, the way a child would, and save screenshots to
`tests/shots/`. They need Python 3 with Playwright (`pip install playwright` then `playwright install chromium`).
WebGL runs in software, so they work without a graphics card, only slowly.

```bash
npm run build
python3 tests/e2e/play_easy.py        # both rooms on Easy
python3 tests/e2e/play_difficult.py   # both rooms on Difficult, plus the map and a drawing's "Try it" link
python3 tests/e2e/layouts.py          # phone, tablet and a phone held sideways
python3 tests/e2e/peeks.py            # remakes the two game-room pictures on the Home card
python3 tests/e2e/pwa.py              # installable, plays with the internet off, offers and applies a new version
TANGHALAN_DIST=dist-single python3 tests/e2e/play_easy.py   # the same checks on the one-file version
```

The Difficult run picks its round at random, and its "tapped ... in 3D" check can miss when the small spare
batteries are the first thing it taps. Run it again if that is the only failure.

## How it is put together

```
src/
  main.jsx, App.jsx        start-up, settings, About, user manual and walkthrough sheets
  pwa.js                   installing the app, keeping it on the device, offering a new version
  screens/Home.jsx         the About page that opens first: abstract, credits, visitor picker
  screens/Museum.jsx       the museum screen: buttons, joystick, map, works, game sheets
  screens/GameHud.jsx      what you see while playing: bag bar, tray, item card, fire meters, P-A-S-S buttons, results
  museum/runtime.js        the 3D loop: walking, camera, Bayani, what you are next to, and the kit the game rooms use
  museum/world.js          builds the halls, the works on the walls and the story stands
  museum/characters.js     your character and Bayani; the go bag on the back and the hands that hold things
  museum/content.js        rooms, doors, works and their text, the two games' names and tips
  museum/store.js          each visitor's progress, kept on this device
  rooms/gobag.js           the Go Bag Room: packing table, tables, cabinet, drawers, crate, cooler
  rooms/fire.js            the Fire Safety Room: alarm, extinguisher, fire, smoke, spray, P-A-S-S
  rooms/logic.js           the two games' rules (see above)
  rooms/items3d.js         the go bag items' 3D models
  rooms/sfx.js             small sounds made in the browser, no audio files
  assets/                  the works' pictures and the room pictures for the Home card
public/
  manifest.webmanifest     the app's name, colors and icons for installing
  icon.svg, icon-*.png     logo H4, "Mata", as the app icon (made by pwa/make_icons.py)
pwa/
  plugin.js                build step: adds the install tags to index.html and writes dist/sw.js
  sw.js                    the service worker: keeps every file of this version, answers from that copy first
  make_icons.py            makes the PNG icons and the tab icon from public/icon.svg
tests/
  logic.test.mjs           rules checks, run by npm test
  e2e/                     browser checks (see above)
.github/workflows/
  deploy.yml               checks, builds and publishes the web version to GitHub Pages
```

A game room is a function that receives a small kit from the runtime (the scene, your character, ways to add things
you can walk up to or tap, and to borrow the joystick and the camera) and returns a controller with `update(dt)`.
Adding another room that you play in follows the same pattern.

three.js stays at 0.128.0, the version the BAYANIHanda Game Library uses, so the two can share models and code.

## Privacy

Nothing leaves the device. There are no accounts, no names (visitors are animals), no analytics and no network
requests. Each visitor's progress (works seen, stickers, best stars and badges) is saved in the browser's local
storage on that device only, so classmates can share a tablet, and Settings can start a visitor over. This follows
the Data Privacy Act of 2012 (RA 10173) by keeping personal data off the app entirely. Read-aloud uses the voices
already on the device. The service worker keeps a copy of the app's own files (code, pictures, fonts, icons) in the
browser's storage so it opens with no internet; it holds nothing about the visitor and sends nothing anywhere.

## Credits

Conceptualized and developed with AI assistance by Edward Andrew A. Dionido, Science Research Specialist II,
UP Resilience Institute, University of the Philippines.

Fonts: Baloo 2 and Nunito, under the SIL Open Font License, through Fontsource. 3D: three.js (MIT). Interface: React (MIT).

## License

No license has been chosen yet, so all rights are reserved by the author for now. Please ask before reusing the code
or the content.
