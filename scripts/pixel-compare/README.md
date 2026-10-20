# pixel-compare

Pixel tooling for Phase 4 (and later phases): render the app's Gallery on Expo web, screenshot it at the
reference size, and diff it against the design lab or a reference PNG. No npm dependencies are added to the
workspace: Playwright is found on disk, and the image diff runs inside Chromium (canvas).

Source of truth: `docs/design/phase-4-feed/feed-lab.html` (`?bare=1&screen=<name>` renders one 390x844 screen)
and `docs/design/phase-4-feed/reference/*.png` (390x844, so `deviceScaleFactor` is 1).

## One-time setup

- **Playwright** is resolved from, in order: `$PLAYWRIGHT_MODULE`, the workspace, `~/.npm/_npx/*/node_modules/playwright`.
  If none exists, run `npx -y playwright@1.64.1 --version` once (it lands in the npx cache).
- **A Chromium build.** The package's own browser is used if present; otherwise the newest Chromium in
  `~/.cache/ms-playwright` (a version mismatch between package and browser is tolerated). Override with
  `PLAYWRIGHT_CHROMIUM=/path/to/chrome`.
- **System libraries.** On a bare box Chromium needs `libnspr4`, `libnss3`, `libasound2`. Without root:
  `apt-get download libnspr4 libnss3 libasound2t64`, `dpkg-deb -x` each into a folder, and run the scripts with
  `LD_LIBRARY_PATH=<folder>/usr/lib/x86_64-linux-gnu`.

## 1. Serve the app on a free port

```bash
node scripts/pixel-compare/serve-web.mjs [--port 8099]
# prints: READY http://localhost:8099   (foreground; Ctrl-C to stop)
```

Runs `npx expo start --web` in `apps/mobile`. The Gallery needs no backend, so dummy Supabase env values are
injected unless you set them. Metro watches files, so edits to `packages/ui` show up on the next page load.

## 2. Screenshot, diff, compare

```bash
CLI=scripts/pixel-compare/pixel-compare.mjs

# (a)+(b) screenshot, optionally clipped to a selector
node $CLI shot --url "http://localhost:8099/gallery?screen=feed" \
     --selector "[data-testid=lab-feed]" --out /tmp/pc/feed.app.png

# (c) diff two PNGs -> mismatch %, diff image (mismatches red over a faded copy); exit 1 above threshold
node $CLI diff --a ref.png --b shot.png --diff /tmp/pc/d.png --threshold-pct 0.5

# shot + diff against a reference PNG in one go
node $CLI compare --url "http://localhost:8099/gallery?screen=feed" --selector "[data-testid=lab-feed]" \
     --ref docs/design/phase-4-feed/reference/feed.png --diff /tmp/pc/feed.diff.png

# every lab screen: lab (ground truth) vs Gallery, plus both vs the reference PNGs
node $CLI suite --cases scripts/pixel-compare/cases.json --base http://localhost:8099 \
     --out-dir /tmp/pc --threshold-pct 0.5 --ref-dir docs/design/phase-4-feed/reference [--only feed,post]
```

- Emulation: 390x844, `deviceScaleFactor` 1, `isMobile`, touch, `prefers-reduced-motion: reduce`, locale `he-IL`.
- Metric: per-pixel YIQ distance, threshold 0.1 (the pixelmatch metric, without its anti-alias pass).
  The percentage is mismatched pixels over all pixels of the crop. Differently sized images count the overhang as mismatch.
- `--disable-lcd-text` is set on both renders. The lab (plain DOM) otherwise gets sub-pixel LCD text and
  react-native-web's composited layers get grayscale, which alone costs 2-3% on text-heavy screens.
- `suite` writes `<name>.lab.png`, `<name>.app.png`, `<name>.diff.png` (and `<name>.ref.diff.png`) and `report.json`.

## Gallery hooks

`/gallery?screen=<name>` renders one lab screen bare at the top-left, tagged `data-testid="lab-<name>"`
(names in `cases.json`). `&rtl=0` and `&motion=off` set the initial toggle state. Without `screen` the page is
the full component gallery with RTL and motion toggles.

## Known residuals

- Emoji in post text render as tofu in this sandbox (no emoji font) in both lab and app; the glyph boxes differ by a pixel or two.
- Sub-pixel layout: Chromium snaps layout to 1/64px, so a fractional line-height (e.g. 13.5 x 1.45) can land 0.016px apart
  between the lab's DOM and react-native-web's, shifting anti-aliasing on everything below it.
