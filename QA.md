# QA report

Build under test: branch `redesign`, commit `71a14e7`, served from `dist/` via
`astro preview`.

**Read the scope note first.** I verified everything below on this machine —
macOS 15.6, headless Chrome 152, viewport and touch emulation over the
DevTools Protocol. That covers Chromium behaviour and the responsive layout
well. It does **not** substitute for real Safari or real Android, and I have
not claimed results I could not produce. The untested rows are listed as
untested.

---

## Automated results

### Lighthouse — mobile, simulated throttling

| Route | Perf | A11y | Best Practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` | 99 | 96 | 100 | 100 | 1.4 s | 2.0 s | 0 ms | 0 |
| `/games/dead-air/` | 99 | 94 | 100 | 100 | 1.2 s | 1.9 s | 0 ms | 0.021 |
| `/about/` | 97 | 94 | 100 | 100 | 1.2 s | 2.5 s | 0 ms | 0 |
| `/support/dead-air/` | 98 | 96 | 100 | 100 | 1.2 s | 2.4 s | 0 ms | 0 |
| `/privacy/dead-air/` | 100 | 96 | 100 | 100 | 1.4 s | 1.7 s | 0 ms | 0 |
| `/contact/` | 97 | 94 | 100 | 100 | 1.2 s | 2.5 s | 0 ms | 0 |

Every route clears the ≥90 budget in all four categories.

### Budgets

| Budget | Target | Actual | |
|---|---|---|---|
| Game JS, gzipped | ≤ 50 KB | 8.7 KB | pass |
| Home LCP, mobile 4G | < 2.5 s | 2.0 s | pass |
| Lighthouse, all four, mobile | ≥ 90 | 94–100 | pass |
| Self-hosted fonts | ~95 KB | 102.1 KB | over by 7 KB |

Home page: 61 KB of HTML, 13 KB gzipped (the stylesheet is inlined into it).

---

## Behaviour verified

### Game loop
| Check | Result |
|---|---|
| Fixed 120 Hz accumulator + rAF render | pass |
| Freezes while the stage is scrolled out of view | pass — timer held at 0:59 across 2.5 s off screen |
| Resumes on scroll back | pass |
| Pauses on `visibilitychange` | pass |
| Canvas sized to CSS box × `min(dpr, 2)` | pass — at dpr 3, a 755 px stage produced a 1509 px bitmap |
| Rotation re-lays out with no reload | pass — portrait → landscape kept the round running at 0:58 |
| Zero allocations in the render loop | by construction — pre-allocated wave buffer, pooled signals, module-level dash arrays; no object, array or string literal in `draw` |

### Input
| Check | Result |
|---|---|
| Arrow / A / D hold to tune | pass |
| Space and Enter hold to log | pass |
| P pause, M mute | pass |
| Default prevented on those keys only, and only with the canvas focused | pass |
| Pointer Events used throughout, no Touch Events | pass |
| `touch-action: none` on stage and LOG | pass |
| Drag on the dial maps 1:1 | pass |
| LOG hold and release, no stuck state | pass |
| ◀ ▶ press-and-hold repeat, releases cleanly | pass |
| Second and later pointers ignored | pass — guarded by `dragId` |
| Mode detection via `(pointer: coarse)`, switching on first event | pass — coarse emulation set `is-touch`, showed the thumb zone, hid the keyboard hint |
| Focus loss mid-hold clears steer and hold | pass |

### Accessibility
| Check | Result |
|---|---|
| HUD is DOM, not text drawn into the bitmap | pass |
| `aria-live="polite"` announcing lock, 10 seconds, round end | pass — fires on events, not per frame |
| Canvas `aria-hidden`, stage `role="application"` | pass |
| Screens are `role="dialog" aria-modal="true"`, focus moves to the primary button, Tab trapped | pass |
| All controls keyboard-focusable | pass |
| Reduce-effects toggle defaults on under `prefers-reduced-motion` | pass |
| Skip link, `<html lang="en">` | pass |

### Reduced motion
Under `prefers-reduced-motion: reduce`, verified in the browser:
all five `--dur-*` tokens collapse to `0ms`; `.hero__title` animation is
`none` at opacity 1; hero and stage scanlines are `display: none`;
`scroll-behavior` is `auto`; the game's reduce-effects toggle reports
`aria-pressed="true"` and the stage carries `is-reduced`.

### Mobile menu
| Check | Result |
|---|---|
| `aria-expanded` tracks state | pass |
| `body { overflow: hidden }` while open, restored on close | pass |
| Focus moves into the overlay on open | pass — lands on Close |
| Tab wraps at both ends, never escapes | pass — 14 tabs, no escape |
| Escape closes and returns focus to the burger | pass |
| Current page marked | pass |
| Closes if the viewport grows past 820 while open | pass |

### URLs
`/support/dead-air/` and `/privacy/dead-air/` build to
`dist/support/dead-air/index.html` and `dist/privacy/dead-air/index.html` with
trailing slashes enforced. **Both URLs are unchanged.** Copy on both was
extracted from the comps programmatically, not retyped.

`public/CNAME` = `www.faisca.gg`. `public/.nojekyll` present. Sitemap and
`robots.txt` generated.

---

## Device matrix — NOT yet run

I have no access to these. Each needs a real device or a device-cloud session,
and the QA deliverable is not complete until someone runs them.

| Device / browser | Status | What to watch |
|---|---|---|
| iPhone, Safari, portrait | **untested** | `100dvh` on the hero and menu with the URL bar collapsing; `env(safe-area-inset-*)` on a notched device; Web Audio unlocking on first touch |
| iPhone, Safari, landscape | **untested** | the 16:9 stage in a short viewport; whether the HUD top row clears the notch |
| Android, Chrome | **untested** | Pointer Events on the dial; the ◀ ▶ repeat timing |
| iPad, Safari | **untested** | lands on the ≥820 landscape layout with a coarse pointer — the one case where the thumb zone shows alongside the wide stage |
| Desktop Safari | **untested** | `clip-path` on buttons; `backdrop-filter` on the stuck nav; variable-font weight range |
| Desktop Firefox | **untested** | `aspect-ratio` on the stage; inlined `<use>` referencing |
| Desktop Chrome | **pass** | the platform everything above was verified on |

Two I would prioritise: **iPhone Safari portrait**, because the dynamic
viewport and safe-area handling are the things most likely to be wrong and
least likely to show up in emulation; and **iPad Safari**, because it is the
only configuration that gets a coarse pointer *and* the wide layout, and
deviation D1 in `FIDELITY.md` is about exactly that overlap.

---

## Known issues

1. **Footer text below the contrast floor** — `--color-text-dim` at 4.33:1 on
   the footer ground, used for running copy against the kit's own written rule.
   Unchanged pending a decision. `FIDELITY.md` A1.
2. **Heading order skips `<h2>` on `/games/dead-air/`** — the kit's markup.
   Unchanged pending a decision. `FIDELITY.md` A2.
3. **Favicon at 16px is illegible** — the mark is a full lockup with a
   wordmark. `FIDELITY.md` A3.
4. **Portrait readout was moved to clear the HUD tools** — the kit places both
   and they overlap. `FIDELITY.md` D1, the one deviation worth a ruling.
5. **Three routes sit at the LCP line.** `/about/` and `/contact/` both
   measure 2.5 s and `/support/dead-air/` 2.4 s, on localhost with simulated
   throttling — at, not under, the 2.5 s budget. On all three the LCP element
   is the first heading, waiting on the display font. `/` is the page the
   budget names and it comes in at 2.0 s. Production is compressed and
   CDN-served so these should land below the line, but they are the numbers to
   re-measure after cutover.
6. **Fonts are 102 KB, not ~95 KB** — built to the kit's recipe exactly. Under
   7 KB over an estimate, not a hard budget.
7. **`←` `→` render in a fallback face** — outside the kit's subset range. One
   line in `scripts/build-fonts.sh` if you want them in Plex Mono.
