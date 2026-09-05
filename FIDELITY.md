# Fidelity check

Implementation against `design-kit/`, signed off 2026-09-04.

Captured in headless Chrome 152 at **390 / 820 / 1440 px**, comparing each
route against its comp in `design-kit/comps/`, and the game against
`design-kit/game/hud.html`, `screens.html` and `controls-mobile.html`.

**Nothing in the kit was restyled.** `src/styles/tokens.css` is byte-for-byte
identical to `design-kit/tokens.css` (verified with `cmp`). `site.css` and
`game.css` are assembled from the kit's own files and each carries a header
naming every mechanical edit.

---

## Summary

| Route | 390 | 820 | 1440 | Notes |
|---|---|---|---|---|
| `/` | pass | pass | pass | section heights match the comp exactly |
| `/games/dead-air/` | pass | pass | pass | — |
| `/about/` | pass | pass | pass | — |
| `/support/dead-air/` | pass | pass | pass | copy extracted verbatim |
| `/privacy/dead-air/` | pass | pass | pass | copy extracted verbatim |
| `/contact/` | pass | pass | pass | — |
| `/404` | pass | pass | pass | — |
| Game — 5 band states | pass | pass | pass | see D4 |
| Game — 4 screens | pass | pass | pass | veil opacities 0.80 / 0.87 / 0.93 as specified |
| Mobile menu | pass | n/a | n/a | trap, Esc, scroll lock, current page all verified |

After the fixes in `71a14e7`, every `main > section` on `/` reports the **same
height as the comp at all three widths** (hero 860, play 1089, features 280,
studio 317, workshop 739).

---

## Deviations

Four. Each is mechanical, each is documented at the point of change, and none
alters a colour, size, spacing value or piece of copy.

### D1 — portrait readout clears the HUD tools
`src/styles/game.css`

`controls-mobile.html` puts the meter and dispatch at `bottom: 16px`, but that
demo draws **no `.hud__tools`**. At the tools' specified position
(`right: --space-xl; bottom: --space-lg`) the two overlap in portrait.

The tools keep their specified position. The readout group clears them by one
tool height plus the kit's own 10px control gap:
`bottom: calc(var(--space-lg) + var(--tap-min) + 10px)`.

*This is the one deviation that moves something the kit did place.* An
alternative — moving the tools instead — would contradict `hud.html`, which
does place them. **Worth a designer's ruling.**

### D2 — the sprite sheet is inlined
`src/components/Sprites.astro`

`sprites.svg` documents its own usage as an external reference:

```html
<svg class="spr"><use href="/game/sprites.svg#spr-needle"></use></svg>
```

No shipping browser resolves `<use>` against an external document — Chrome and
Safari refuse it outright — so **every icon rendered blank**. The file is read
at build time and injected verbatim; ids, artwork and `currentColor` behaviour
are untouched. Only the `href` loses its path.

### D3 — HUD value sizes below 820
`src/styles/game.css`

`hud.html` sizes the stats at `--step-5` (`--step-6` for the timer). At 390 the
three stats do not fit on one line and `00 000` wraps onto two.

`comps/index.html` draws the same row one step down — score and best at
`--step-4`, timer at `--step-5`. Below 820 the row takes the comp's sizes. No
new values; the two kit files simply disagree and the comp is the one that fits.

The keyboard hint goes with it. It is anchored bottom-left, the tools
bottom-right, and under 820 they overlap; `controls-mobile.html` draws no
in-stage hint at that width, so it is hidden there.

### D4 — the carrier waveform is drawn in every band state
`src/game/signal-lock/render.ts`

`hud.html`'s five state boards draw **no waveform**. `comps/index.html` — the
actual home page — draws one across the stage at `opacity: 0.2` in
`--color-crt`, and `sprites.svg` ships `spr-waveform` for exactly this.

The implementation draws it, using the sprite's own deterministic path data, on
the grounds that the comp is the page and the board is a component study.
`motion.md` does not list it as animated, so it is static. **Flagging it in
case the boards were the intent.**

---

## Differences that are not deviations

- **Type.** The comps render in fallback faces — `fonts/README.md` says so
  ("PNG/PDF export from the design canvas does not embed webfonts"). The site
  serves the real subsets, so headline widths and wrapping differ from a comp
  screenshot. The site is the correct one.
- **Arrow glyphs.** `←` and `→` in the HUD hint and start screen fall back to a
  system face: the kit's own subset recipe covers
  `U+0000-00FF, U+2013-2014, U+2018-201D, U+2026, U+00A0` and does not include
  `U+2190`/`U+2192`. Adding the two codepoints to `scripts/build-fonts.sh` is a
  one-line change if you want them in IBM Plex Mono.
- **Font budget.** 102.1 KB of WOFF2 against the kit's "~95 KB" estimate,
  built to its recipe exactly.
- **The `locking` window width.** The comp's `locking` board draws the inner
  window at 68/920 units with the meter at 62%. `motion.md` item 18 says the
  window contracts 7% → 2.5% across the hold, which puts it at ~4.2% at 62%.
  The implementation follows `motion.md`, because that is the mechanic.
- **The start screen on `/`.** The home comp shows a mid-round frame; the live
  game opens on the start screen, as `screens.html` specifies.

---

## Accessibility findings

Three were reported, **two are now fixed** (Leo approved 2026-09-04) and one
new one was found and fixed alongside them. Mobile Lighthouse accessibility is
now **100 on four routes and 98 on two**, up from 94–96.

### A1 — footer text below the contrast floor — **FIXED**

`--color-text-dim` `#7E7767` measures:

| Ground | Ratio |
|---|---|
| `--color-panel` `#121215` | 4.20:1 |
| `--color-surface` `#0E0E11` | 4.33:1 |
| `--color-bg` `#09090B` | 4.47:1 |

`design-kit/README.md` is explicit: *"`--color-text-dim` (4.20:1) is the one
token under the floor. **Disabled controls only, never running copy.**"* But
`components/footer.html` uses it for `.site-footer__head` and
`.site-footer__legal`, and the privacy comp uses it for the "Last updated"
line. All three are running copy. The kit contradicts its own rule.

**Applied.** `.site-footer__head`, `.site-footer__legal` and the "Last
updated" line on both `/support/dead-air/` and `/privacy/dead-air/` now take
`--color-text-mute` `#9A9388` (6.34:1 on surface). An existing token, no new
value, no layout change. Each edit is noted in its file's header.

The game HUD uses the same token for `.hud__label`, `.hud__hint` and
`.screen__hint`, but those sit on `--color-void` `#010101` and measure
**4.69:1** — above the floor. Left alone.

**Fold this back into `design-kit/components/footer.html`** so the kit stops
disagreeing with its own README.

### A2 — heading order skips a level on `/games/dead-air/` — **FIXED**

`comps/games-dead-air.html` goes `<h1>` (page hero) → prose with no heading →
`<h3>` on the three feature cells. No `<h2>`.

**Applied.** The three `.feature-strip__title` elements are `<h2>`.
`.feature-strip__title` is styled entirely by class, so this changed the
document outline and **nothing visual**. `/games/dead-air/` is now 100.

On `/` the same component sits under an `<h2>`, so its `<h3>`s are correct
there and were left alone.

### A4 — links outside `.prose` fell back to browser blue — **FIXED**

Found while verifying A1. The kit styles `.prose a`, the nav, the footer,
`.linklist`, `.bigmail` and `.social-links`, but **never a bare `<a>`**. Any
link outside those contexts therefore rendered as the UA default `#0000EE` —
**2.12:1** on `--color-bg`.

It was shipping on the `support@faisca.gg` link in the support page's callout,
which is a standalone `<p>` rather than `.prose`. The kit's own comp has the
same bug. A second latent case is the `.card-game` anchor on `/`, where every
child sets its own colour so nothing showed.

**Applied.** One base rule, `a { color: var(--color-accent) }` — the same
colour `.prose a` already uses, **7.49:1** on `--color-bg`. It only ever
applies where the kit set nothing; every styled context still wins on
specificity. **Fold this into the kit too.**

### A5 — `/about/` and `/contact/` skip a heading level — **CLOSED, won't fix**

**Leo's decision, 2026-09-04: leave it.** Recorded here so it does not get
raised again.

The same defect as A2 in a different component. Both pages go `<h1>` →
`<h3>`, where the `<h3>`s come from `.prose h3`.

Unlike A2 the fix is not free: `.prose h2` is `--step-4` against `--step-3`,
so promoting them would make "WHY THE NAME", "WHAT WE ARE BUILDING", "PRESS
AND CREATORS" and "SUPPORT" visibly larger — and on `/about/` the same size as
the "GET IN TOUCH" `<h2>` beneath them. The visual hierarchy the kit draws is
correct; only the document outline is imperfect.

Both pages score **98** on mobile accessibility, above the ≥90 budget, and the
headings are still correctly ordered *within* `.prose`. Screen-reader users
get a flat rather than a wrong outline.

The markup is unchanged. If it is ever revisited, the option that costs
nothing visually is a `.prose` variant that keeps `--step-3` at `<h2>` level —
but that is a kit change, not an implementation one.

### A3 — favicon at 16px

`SIGN-OFF.md` calls the favicon "a mechanical export from
`assets/faisca-mark-120.png`", and that mark is the full lockup — star plus the
FAISCA wordmark. Exported at 16px the wordmark is an unreadable smear and the
star loses its rays; 32px is borderline.

`scripts/build-icons.mjs` does the export as specified, from the 300px source
rather than the 120px one so the larger sizes are not upscaled twice. The
512px icon is still a 1.7× upscale from 300px.

**Two things worth a decision:** whether 16/32 should crop to the star alone,
and whether there is a vector or a ≥512px original to export from.

---

## Budgets

| Budget | Target | Actual |
|---|---|---|
| Game JS, gzipped | ≤ 50 KB | **8.7 KB** |
| Home LCP, throttled mobile | < 2.5 s | **0.35 s** — measured, see below |
| Lighthouse mobile, Performance | ≥ 90 | 97–100 |
| Lighthouse mobile, Accessibility | ≥ 90 | **98–100** |
| Lighthouse mobile, Best Practices | ≥ 90 | **100** |
| Lighthouse mobile, SEO | ≥ 90 | **100** |

### A correction on LCP

I earlier reported home LCP as 2.0 s from Lighthouse. That figure is not
reliable and the real number is far better.

Lighthouse intermittently fails on `/` with `NO_LCP`, and the cause is the
kit's own hero animation: `motion.md` items 1–3 fade `.hero__title`,
`.hero__body` and `.hero__actions` up from `opacity: 0`, and **Chrome excludes
an element that is transparent at first paint from ever becoming an LCP
candidate**. The headline — by far the largest thing on the page — is
therefore invisible to the metric, which leaves Lantern's simulation picking
between small leftovers and sometimes failing outright.

Measured directly with a `PerformanceObserver` under 4× CPU throttling and
4G (150 ms RTT, 1.6 Mbps):

| Route | FCP | LCP | LCP element |
|---|---|---|---|
| `/` | 348 ms | **348 ms** | `IMG.hero__art` / `DIV.hero__eyebrow` |
| `/games/dead-air/` | 300 ms | **364 ms** | `IMG.page-hero__art` |
| `/about/` | 296 ms | **296 ms** | first prose `<p>` |
| `/contact/` | 304 ms | **304 ms** | first prose `<p>` |
| `/support/dead-air/` | 300 ms | **300 ms** | `P.section-heading__body` |
| `/privacy/dead-air/` | 320 ms | **320 ms** | first prose `<p>` |
| `/404` | 216 ms | **216 ms** | `H1` |

Under `prefers-reduced-motion` the animation is off and `H1.hero__title`
becomes the LCP element at 344 ms, which confirms the diagnosis.

Every route is an order of magnitude inside the 2.5 s budget. The earlier
worry that `/about/` and `/contact/` were "at the line" was a simulation
artifact — they paint in under 310 ms.

**Nothing was changed to chase this.** The animation is approved motion and
the site is fast; only the measurement is awkward.
