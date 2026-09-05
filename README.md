# faisca.gg

The Faisca Games site and the embedded mini-game **Signal Lock**, built to the
approved kit in [`design-kit/`](design-kit/) (signed off 2026-09-04).

Astro, static output, plain CSS custom properties, vanilla TypeScript Canvas 2D.
No client framework, no Tailwind, no CSS-in-JS.

---

## Local development

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run preview    # serve dist/ exactly as it will ship
npm run check      # astro check: types + template diagnostics
npm test           # Signal Lock mechanics — run this after touching config.ts
```

Node 22 or newer. `npm install` needs its install scripts approved for `sharp`
and `esbuild` (`npm install-scripts approve sharp esbuild`).

## Deployment

**The site is not live from this repo and must not be deployed from here
without working through the cutover checklist.** faisca.gg is currently served
from a separate repository. The checklist, the QA report and the
design-fidelity review are kept out of this repository on purpose — see
`.gitignore`.

`.github/workflows/deploy.yml` ships with a `workflow_dispatch` trigger only.
It cannot fire on a push. Adding a `push:` trigger is the last step of the
cutover checklist, not the first.

### Staging preview

`.github/workflows/preview.yml` runs on every PR to `main` and on demand. It
builds the site and uploads `dist/` as a workflow artifact. It has no `pages:`
permission and no deploy step, so it cannot touch production.

```sh
# Download "faisca-site-preview" from the run summary, then:
unzip faisca-site-preview.zip -d preview && npx serve preview
```

## Structure

```
design-kit/                the approved source of truth — do not edit
public/
  CNAME                    www.faisca.gg
  .nojekyll
  fonts/                   self-hosted WOFF2 subsets + OFL.txt
  favicon*, icon-512.png, apple-touch-icon.png, site.webmanifest
scripts/
  build-fonts.sh           reproduces design-kit/fonts/README.md's recipe
  build-icons.mjs          favicon export from the kit's logo source
src/
  data/site.ts             nav, footer, socials, tagline, email
  layouts/BaseLayout.astro nav, footer, meta/OG, favicons, skip link
  components/              SiteNav, SiteFooter, MenuMobile, SocialLinks,
                           SignalLock, Sprites, Chevron
  pages/                   one file per route
  scripts/                 nav.ts (sticky), menu.ts (overlay + focus trap)
  styles/
    fonts.css              @font-face, verbatim from the kit
    tokens.css             byte-for-byte copy of design-kit/tokens.css
    site.css               assembled from design-kit/comps/_site.css
    game.css               the three "SHIP THIS BLOCK" sections
  game/signal-lock/        config, sim, render, loop, input, audio, index
```

### Routes

`/`, `/games/dead-air/`, `/about/`, `/support/dead-air/`, `/privacy/dead-air/`,
`/contact/`, `/404`. Trailing slashes are enforced, so
**`/support/dead-air/` and `/privacy/dead-air/` keep the exact URLs they have
today.** Sitemap and `robots.txt` are generated at build.

---

## Editing copy

| What | Where |
|---|---|
| Nav labels and order, footer columns, social links, tagline, email, copyright | `src/data/site.ts` |
| Page prose | the `.astro` file for that route in `src/pages/` |
| Game dispatch lines, screen copy | `src/game/signal-lock/config.ts` and `src/components/SignalLock.astro` |
| Page titles and meta descriptions | the `<BaseLayout title=... description=...>` call on each page |

`/support/dead-air/` and `/privacy/dead-air/` carry **real, final, legally
meaningful copy**, extracted word for word from the approved comps. Do not
reword them without Leo.

## Editing styles

Don't, without a kit change. `src/styles/tokens.css` is a byte-for-byte copy of
`design-kit/tokens.css`; `site.css` and `game.css` are assembled from the kit's
component files and carry a header naming every mechanical edit. If a colour,
size or spacing needs to change, change it in the kit first and re-copy.

## Tuning the game

Every gameplay number lives in **`src/game/signal-lock/config.ts`**. Nothing
else hard-codes a constant. The knobs you are most likely to want:

| Field | Effect |
|---|---|
| `roundMs` | round length (60 s) |
| `lockMs` | how long a hold must survive inside the window (1.2 s) |
| `drainMs` | how fast the meter empties when the hold breaks |
| `window.open` / `window.shut` | the window's width at the start and end of a hold, as a percent of the band |
| `window.openPerLead` / `window.openMin` | how much narrower each lead makes the starting window, and the floor it stops at |
| `window.nearFactor` | catch radius for the `near` state, as a multiple of the open width |
| `signals.speedBase` / `speedPerLead` / `speedMax` | drift speed and how it ramps per lead |
| `signals.jitterPerLead` / `jitterMax` | how erratic the drift gets |
| `signals.phantomFromLead` | how many leads before phantoms can spawn |
| `signals.respawnPhantomChance` | how often a respawn is a phantom |
| `needle.accel` / `friction` | steering feel |
| `scoring.base` / `perSecondLeft` | points per lead |
| `phantomPenaltyMs` | time lost to a phantom (3 s) |

`npm test` asserts the rules against the simulation directly — a 1.2 s hold
logs a lead, a phantom costs three seconds and scores nothing, zero leads fails
the round, the window contracts 7% → 2.5% and stops at its floor, phantoms only
appear from lead 3, and a pause loses no time. Run it after changing any
number above.

`DISPATCH_LINES` in the same file holds the one-line radio dispatches. They are
original, spoiler-free and carry no Case 001 plot facts — keep them that way.

### How the game is put together

- `sim.ts` — pure state and a fixed-timestep `step(dt)`. No DOM, no canvas.
- `loop.ts` — 120 Hz accumulator, rAF render. Pauses on `visibilitychange` and
  whenever the stage leaves the viewport.
- `render.ts` — draws the band only, in the kit's own 960×176 (landscape) and
  330×60 (portrait) viewBox coordinates, meet-scaled onto the measured
  `.hud__band` rect. Allocation-free per frame.
- `input.ts` — keyboard, Pointer Events, and the thumb-zone buttons.
- `audio.ts` — synthesised hiss and tones, Web Audio only, no files. The
  context is not created until the first gesture and starts muted.
- `index.ts` — owns the DOM: HUD, the four screens, focus, `aria-live`.

Everything except the band is DOM, so score, timer, meter, dispatch line and
every screen stay selectable, translatable, zoomable and readable to a screen
reader.

## Regenerating assets

Both outputs are committed; a normal build never runs these.

```sh
./scripts/build-fonts.sh   # WOFF2 subsets, to design-kit/fonts/README.md's recipe
npm run icons              # favicons + site.webmanifest from the kit's logo
```

## Known conflicts

The implementation departs from the kit in four documented places, each
commented at the point of change — search the stylesheets and components for
`DEVIATION`. The full review, the accessibility findings and the QA report are
working documents kept out of this repository; see `.gitignore`.
