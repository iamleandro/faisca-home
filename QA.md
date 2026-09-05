# QA report

Build under test: branch `redesign`, served from `dist/` via `astro preview`.
Updated after the approved accessibility fixes (`FIDELITY.md` A1, A2, A4).

**Read the scope note first.** I verified everything below on this machine —
macOS 15.6, headless Chrome 152, viewport and touch emulation over the
DevTools Protocol. That covers Chromium behaviour and the responsive layout
well. It does **not** substitute for real Safari or real Android, and I have
not claimed results I could not produce. The untested rows are listed as
untested.

---

## Automated results

### Lighthouse — mobile, simulated throttling

| Route | Perf | A11y | Best Practices | SEO | Remaining a11y failure |
|---|---|---|---|---|---|
| `/` | 99* | **100** | 100 | 100 | none |
| `/games/dead-air/` | 99 | **100** | 100 | 100 | none |
| `/about/` | 97 | 98 | 100 | 100 | `heading-order` — `FIDELITY.md` A5 |
| `/contact/` | 100 | 98 | 100 | 100 | `heading-order` — `FIDELITY.md` A5 |
| `/support/dead-air/` | 98 | **100** | 100 | 100 | none |
| `/privacy/dead-air/` | 97 | **100** | 100 | 100 | none |

Every route clears the ≥90 budget in all four categories. Accessibility went
from 94–96 to 98–100 with the A1, A2 and A4 fixes.

\* Lighthouse intermittently returns `NO_LCP` on `/` and scores performance 0
when it does. This is a measurement artifact of the kit's hero fade-in, not a
regression — see **Largest Contentful Paint** below.

### Largest Contentful Paint — measured directly

Lighthouse's simulated LCP is unreliable on this site. `motion.md` items 1–3
fade the hero heading up from `opacity: 0`, and Chrome never admits an element
that is transparent at first paint as an LCP candidate, so the largest thing on
the page is invisible to the metric.

Measured with a `PerformanceObserver` under 4× CPU throttling and 4G
(150 ms RTT, 1.6 Mbps down):

| Route | FCP | LCP | LCP element |
|---|---|---|---|
| `/` | 348 ms | **348 ms** | `IMG.hero__art` |
| `/games/dead-air/` | 300 ms | **364 ms** | `IMG.page-hero__art` |
| `/about/` | 296 ms | **296 ms** | first prose `<p>` |
| `/contact/` | 304 ms | **304 ms** | first prose `<p>` |
| `/support/dead-air/` | 300 ms | **300 ms** | `P.section-heading__body` |
| `/privacy/dead-air/` | 320 ms | **320 ms** | first prose `<p>` |
| `/404` | 216 ms | **216 ms** | `H1` |

Under `prefers-reduced-motion` the animation is off and `H1.hero__title`
becomes the LCP element at 344 ms, confirming the cause.

Every route is an order of magnitude inside the 2.5 s budget.

### Budgets

| Budget | Target | Actual | |
|---|---|---|---|
| Game JS, gzipped | ≤ 50 KB | 8.7 KB | pass |
| Home LCP, throttled mobile | < 2.5 s | 0.35 s measured | pass |
| Lighthouse, all four, mobile | ≥ 90 | 97–100 | pass |
| Self-hosted fonts | ~95 KB | 102.1 KB | over by 7 KB |

Home page: 61 KB of HTML, 13 KB gzipped (the stylesheet is inlined into it).

---

## Behaviour verified

### Game mechanics — `npm test`, 22 assertions, all passing

The simulation is pure, so every rule in the brief is asserted by stepping it
at a fixed timestep rather than inferred from play: a 1.2 s hold logs a lead;
score is `100 + 2 × seconds left`; a phantom logs nothing, scores nothing and
costs three seconds; sixty seconds with nothing logged is a fail while one lead
ends the round normally; the window contracts 7% → 2.5% and stops at its
playable floor; drift speed and jitter ramp per lead and stop at their
ceilings; phantoms only respawn from lead 3; a pause loses no time and does not
survive a held key.

### Full round, played end to end

Driven through the real UI in the browser, tracking the signal by reading the
band out of the canvas:

```
LOGGED  score=00 190  t=0:45  "Ashmere docks. Two voices, one radio."
LOGGED  score=00 374  t=0:43  "Somebody is counting numbers on the harbour band."
LOGGED  score=00 544  t=0:36  "The night bus driver called it in. Nobody answered."
round over -> screen: roundEnd | score 00 544 | leads 03 | best 00 544
aria-live: "Round over. Score 544, 3 leads."
localStorage["faisca.signalLock.best"] = 544
```

Scoring matches the formula exactly, dispatch lines advance in order, the
round-end screen carries the right stats and the best score persists under the
key the brief specifies.

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

1. ~~Footer text below the contrast floor~~ — **fixed**, `FIDELITY.md` A1.
2. ~~Heading order on `/games/dead-air/`~~ — **fixed**, `FIDELITY.md` A2.
3. ~~Links outside `.prose` rendering browser blue at 2.12:1~~ — **fixed**,
   `FIDELITY.md` A4.
4. **`/about/` and `/contact/` skip a heading level** — same defect as A2 but
   in `.prose`, where `h2` and `h3` are different sizes, so the fix is not
   free. Needs a designer's call. `FIDELITY.md` A5.
5. **Favicon at 16px is illegible** — the mark is a full lockup with a
   wordmark. `FIDELITY.md` A3.
6. **Portrait readout was moved to clear the HUD tools** — the kit places both
   and they overlap. `FIDELITY.md` D1, the one deviation worth a ruling.
7. **Lighthouse cannot compute LCP on `/`** and scores performance 0 when it
   fails. Measurement artifact of the approved hero fade-in; directly measured
   LCP is 348 ms. Nothing to fix, but do not be alarmed by a 0.
8. **Fonts are 102 KB, not ~95 KB** — built to the kit's recipe exactly. Under
   7 KB over an estimate, not a hard budget.
9. **`←` `→` render in a fallback face** — outside the kit's subset range. One
   line in `scripts/build-fonts.sh` if you want them in Plex Mono.
