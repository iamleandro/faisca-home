# Motion

Every animation in the kit, what triggers it, and what happens under
`prefers-reduced-motion: reduce`.

Two rules make this cheap to honour:

1. **Durations are tokens.** `tokens.css` collapses every `--dur-*` to `0ms`
   inside the reduced-motion media query, so any transition that reads its
   duration from a token is compliant with no extra code. The table below only
   lists a fallback where something more than "instant" is needed — a
   `transform` that must not run at all, a `@keyframes` that must not play.
2. **Nothing animates that carries meaning on its own.** Colour changes,
   number changes and state changes are all readable at the end state. Motion
   is only ever the transition between two legible frames.

---

## Site

| # | Element | Trigger | Duration | Easing | Reduced motion |
|---|---|---|---|---|---|
| 1 | `.hero__title` | page load | `--dur-scene` 620ms | `--ease-out` | `animation: none` — final state, no fade |
| 2 | `.hero__body` | page load, +80ms | `--dur-scene` | `--ease-out` | as above |
| 3 | `.hero__actions` | page load, +160ms | `--dur-scene` | `--ease-out` | as above |
| 4 | `.site-nav` background + border | scroll past 64px | `--dur-base` 220ms | `--ease-out` | instant via token |
| 5 | `.site-nav__mark` 38→30px | scroll past 64px | `--dur-base` | `--ease-out` | instant via token |
| 6 | `.site-nav__link` colour | hover / active | `--dur-fast` 140ms | `--ease-out` | instant via token |
| 7 | `.btn` background, colour, border | hover / active | `--dur-fast` | `--ease-out` | instant via token |
| 8 | `.social-links__link` colour + border | hover | `--dur-fast` | `--ease-out` | instant via token |
| 9 | `.card-game__media img` scale 1 → 1.035 | card hover | `--dur-slow` 380ms | `--ease-out` | **`transform: none`** — the scale is suppressed entirely, not just shortened |
| 10 | `.card-game__title` colour | card hover | `--dur-fast` | `--ease-out` | instant; the colour change is kept |
| 11 | `.card-game` border colour | card hover | `--dur-base` | `--ease-out` | instant via token |
| 12 | `.site-footer__link` colour | hover | `--dur-fast` | `--ease-out` | instant via token |
| 13 | `.menu-mobile` opacity + translateY(-8px) | menu opens | `--dur-base` | `--ease-out` | `animation: none` — appears in place |
| 14 | `html { scroll-behavior: smooth }` | `#play` anchor | browser default | — | `scroll-behavior: auto` |
| 15 | `.hero__scrim::after`, `.page-hero__scrim::after` scanlines | none — static gradient | — | — | `display: none` (removes the texture, which is high-frequency contrast) |

The scanline overlays are **static CSS gradients and never animate**. They are
listed here because reduced motion removes them anyway: a 1px repeating stripe
is exactly the kind of high-frequency pattern that triggers discomfort, even
when it is not moving.

---

## Signal Lock

The game has two independent switches, and they are not the same thing:

- **`prefers-reduced-motion`** — the OS setting. Removes decorative motion.
- **Reduce effects** — the third HUD toggle. Removes decorative *rendering*
  (scanlines, glow, spark) whether or not the OS setting is on.

**`prefers-reduced-motion` sets the reduce-effects toggle ON by default.** The
player can still switch it back off; the OS preference chooses the default, it
does not lock the control.

| # | Element | Trigger | Duration | Easing | Reduced motion |
|---|---|---|---|---|---|
| 16 | `.screen` veil fade in | any screen opens | `--dur-base` 220ms | `--ease-out` | `animation: none` |
| 17 | `.hud__meter-fill` width | every frame while locking | 60ms | `linear` | **kept** — it is a progress readout, not decoration, and 60ms is smoothing rather than animation |
| 18 | Lock window contraction, 7% → 2.5% of band | holding LOG inside the window | 1200ms, driven by the game loop | `linear` | **kept, unchanged** — this is the mechanic. Removing it would remove the game |
| 19 | Lock window stroke pulse | state `locking` | 500ms loop (2Hz) | `ease-in-out` | **no pulse** — stroke holds at full opacity |
| 20 | Needle `box-shadow` glow | state `near` / `locking` / `locked` | `--dur-fast` | `--ease-out` | **no glow** — needle keeps its state colour and 3px weight |
| 21 | Spark burst, scale 0.5 → 1.6 + fade out | a lead is logged | 460ms | `--ease-out` | **no burst** — window fills `--game-locked` instantly and holds 460ms |
| 22 | Phantom marker jitter ±2px | phantom is on the band | 125ms loop (8Hz) | `steps(2)` | **no jitter** — dashed diamond sits still; the dash pattern still distinguishes it |
| 23 | Timer colour → `--game-lost` | 10s remaining | instant, no transition | — | unchanged — never animated in the first place |
| 24 | `.hud__tool` colour + border | hover | `--dur-fast` | `--ease-out` | instant via token |
| 25 | Stage scanlines + vignette | none — static | — | — | scanlines `display: none`; vignette kept (it is a flat gradient, not a pattern) |

### What survives reduced motion in the game

Everything that carries state. After every fallback above is applied, a player
can still tell idle from near from locking from locked from lost, because each
one differs in **colour, marker shape and stroke pattern** — see the state
board in the canvas. Motion was never the channel.

### What the coder owns

```js
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduceFx = reduce.matches;            // OS preference sets the default
reduce.addEventListener('change', e => {  // ...and follows it if it changes
  if (!userTouchedTheToggle) reduceFx = e.matches;
});
```

Canvas-drawn motion (items 18–22) is **not** covered by the CSS media query —
`tokens.css` cannot reach into a `<canvas>`. Those five must branch on
`reduceFx` in the draw loop. Items 1–17 and 23–25 are CSS and are handled by
the token collapse.
