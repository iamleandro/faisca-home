# Sign-off — Faisca Games design kit

Hand-off from design to implementation. Target stack: Astro + plain CSS custom
properties + vanilla TypeScript Canvas 2D, static, on GitHub Pages.

---

## Checklist

- [x] **Palette extracted from brand assets, contrast verified**
      `logo.png` and `deadair.png` decoded and sampled by pixel frequency per
      region; the "Extracted" blocks in `tokens.css` carry every raw value with
      its provenance in a comment. All 20 semantic colours measured against all
      three grounds — **zero failures**. Two corrections to the live site:
      `--ember #C4621C` (4.48:1, under the body floor) → `#FB793E` (7.04:1),
      and `--signal #247A54` → the key art's real CRT green `#2C941B`.
      The game state ramp was retuned after `locked`/`lost` measured 1.58:1
      against *each other*; now 3.01:1 apart plus shape differentiation.

- [x] **Type scale and self-hosted fonts with licences**
      Big Shoulders Display, IBM Plex Sans, IBM Plex Mono — all **SIL OFL 1.1**,
      zero licence cost, ~95 KB subset. `fonts/README.md` carries the sources,
      the `pyftsubset` recipe, the `@font-face` block and the preload tag.
      Ten fluid steps, `clamp()` interpolated 390 → 1440.

- [x] **All components render at 390/820/1440 with all states**
      Nine components, each self-contained, each linking `../tokens.css`, each
      opening in a browser with no build step. Default, hover, focus-visible,
      active and disabled are all drawn — `.x:hover` and `.x.is-hover` share one
      rule, so the static demos show exactly what the browser renders.
      Breakpoints: 900 / 820 / 600.

- [x] **Game HUD, mobile controls, four screens, sprites delivered**
      `game/hud.html`, `game/controls-mobile.html`, `game/screens.html`,
      `game/sprites.svg` (15 symbols, all `currentColor`). Two artboards on the
      canvas are **playable**, not comps — hold-to-log confirmed as the mechanic.

- [x] **motion.md complete with reduced-motion fallbacks**
      25 animations documented with element, trigger, duration, easing and
      fallback. `tokens.css` collapses every `--dur-*` to `0ms` under
      `prefers-reduced-motion`, so CSS motion is compliant by construction; the
      five canvas-drawn cases the media query cannot reach are called out
      separately with the JS the implementation needs.

- [x] **Comps for every route incl. 404**
      All seven routes. Home additionally at 1440 / 820 / 390. The comps are
      rendered from `comps/_site.css`, which is **assembled verbatim from the
      component files** — so a comp cannot drift from its components.

- [x] **Assets: favicons, OG image, logo variants**
      `assets/` carries the mark at 120 px, the untouched logo source, the hero
      crop (1400×547, 51 KB), the card crop (760×507, 21 KB) and the 1200×630
      OG base. Both key-art crops are cut clear of the typewriter note baked
      into `deadair.png` — the note's bounding box was measured, not eyeballed.
      *Favicon set (16/32/180/512 + `site.webmanifest`) is a mechanical export
      from `faisca-mark-120.png` and is the one asset not yet generated.*

- [x] **Open questions listed with proposed defaults**
      See below. All resolved.

- [x] **Leo approval: approved 2026-09-04**

---

## Open questions — all resolved

| # | Question | Resolution |
|---|---|---|
| 1 | Typeface licensing budget | Open-licensed only. Big Shoulders + IBM Plex Sans/Mono, SIL OFL 1.1. |
| 2 | Press kit / devlog / newsletter | None. Site map as briefed. |
| 3 | Analytics | None. No script, no consent banner, no cookie policy delta. |
| 4 | Static mockups or working prototype | Working tuner prototype. |
| 5 | Text baked into `deadair.png` | Cropped out of every shipped crop; the line is set as real HTML. |
| 6 | Log mechanic: tap or hold | Hold. The meter fills only while inside the window *and* holding. |
| 7 | Social accounts | Instagram, X, LinkedIn at `playfaisca`. Discord dropped. |
| 8 | Support and privacy copy | Real copy poured in from `faisca-landing`, verified word for word. |

---

## What the implementation still owns

Design decisions are settled; these are behaviours a stylesheet cannot express.

1. **Focus management** — trap Tab inside the mobile menu and inside every game
   screen; return focus to the trigger on close; `aria-expanded` on the burger.
2. **Scroll lock** — `body { overflow: hidden }` while the overlay menu is open.
3. **Reduced motion in canvas** — items 18–22 in `motion.md` are drawn into the
   bitmap and must branch on the `reduceFx` flag in the draw loop. The OS
   preference sets that flag's default; the player can still override it.
4. **`aria-live`** — score and timer announce on a lock and at 10 seconds, not
   every frame.
5. **Image pipeline** — ship the two key-art crops as AVIF and WebP inside a
   `<picture>`, with the delivered JPEGs as fallback.
6. **Favicon export** — 16/32/180/512 from `assets/faisca-mark-120.png`.
7. **Signal Lock is a design prototype, not shippable game code.** It proves the
   feel, the state colours and the control scheme. The real thing is Canvas 2D
   with a fixed-timestep loop; the prototype is DOM with `requestAnimationFrame`.

---

## Content still needing a human

The inline `[draft copy]` markers were removed at Leo's request so the comps do
not read as unfinished. The copy behind them is still mine and still wants his
voice over it:

- `/` — hero body line, three feature cells, both studio paragraphs
- `/games/dead-air/` — opening two paragraphs, three feature cells
- `/about/` — all of it, including the claim that *faísca* is Portuguese for
  spark, which is the obvious reading of the studio name but is Leo's story
  to tell
- `/contact/` — the press and support lines

The `.draft` class is left in `comps/_site.css` so the markers can be dropped
back in while revising.

`/support/dead-air/` and `/privacy/dead-air/` carry **real, final copy** and are
marked as such. Nothing in them is drafted.
