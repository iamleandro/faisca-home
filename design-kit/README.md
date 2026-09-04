# Faisca Games — design kit

Hand-off package for the faisca.gg rebuild. Target stack: **Astro + plain CSS
custom properties + vanilla TypeScript Canvas 2D**, static, on GitHub Pages.
No framework, no Tailwind, no build step required to open anything in here.

## Status

| Step | Deliverable | State |
|---|---|---|
| 01 | Blocking questions | answered |
| 02 | `tokens.css`, type scale, palette + contrast report | approved |
| 03 | `components/`, `game/` | approved |
| 04 | `comps/`, `motion.md` | approved |
| 05 | `SIGN-OFF.md` | **complete — approved 2026-09-04** |

## Decisions locked in step 01

- **Typefaces** — Big Shoulders Display / IBM Plex Sans / IBM Plex Mono, all
  SIL OFL 1.1, self-hosted WOFF2. Zero licence cost. See `fonts/README.md`.
- **Routes** — the site map as briefed. No press kit, no devlog, no newsletter.
- **Socials** — Instagram, X and LinkedIn at the `playfaisca` handles. No Discord.
- **Analytics** — none. No script, no consent banner, no cookie policy delta.
- **Signal Lock artboards** — a working tuner prototype, not static frames.

## Structure

```
design-kit/
  README.md          this file
  tokens.css         the single source of truth for colour, type, space, motion
  fonts/             licences, subsetting recipe, @font-face block
  components/        nav, footer, button, card-game, feature-strip, hero,
                     section-heading, social-links, menu-mobile
  game/              hud.html, controls-mobile.html, screens.html, sprites.svg
  comps/             one responsive comp per route + _site.css
  motion.md          every animation: element, trigger, duration, easing, RM fallback
  assets/            logo variants, favicons, OG image 1200x630, key-art crops
  SIGN-OFF.md        the checklist
  .canvas/           working sources for the visual canvas (not a deliverable)
```

## How the colour was decided

Nothing was invented. `logo.png` and `deadair.png` were decoded and sampled by
pixel frequency per region; the "Extracted" blocks at the top of `tokens.css`
carry the raw results with their provenance in comments. The neutral ramp is
derived from the logo plate hue (240deg, 8% sat) so the mark never shows a seam
against the page ground.

Two corrections to the values currently live on faisca.gg:

- `--ember: #C4621C` measured **4.48:1** on the panel ground — under the 4.5:1
  floor for body text. The logo's actual ray orange is `#FB793E`, which
  measures **7.04:1**. Same hue family, legal for running copy.
- `--signal: #247A54` is a blue-green that appears nowhere in the key art, and
  measured 3.49:1. The oscilloscope trace is a true green, `#2C941B`.

`--ink`, `--mute` and the 0.16em cap tracking carry over unchanged.

## Accessibility floor

- Body text >= 4.5:1. Non-text UI and game state markers >= 3:1.
- `--color-text-dim` (4.20:1) is the one token under the floor. Disabled
  controls only, never running copy. It is commented as such in `tokens.css`.
- Every game state carries a **marker shape and a luminance step** as well as a
  colour. Three pairs sit close in luminance and are separated by form instead;
  they are listed explicitly on the state-colour board so the implementation
  does not drop the form and keep only the token.
- Focus is restyled, never removed — `tokens.css` ships a `:focus-visible`
  base rule.
- Motion tokens collapse to `0ms` under `prefers-reduced-motion: reduce`, so an
  animation that reads its duration from a token is compliant by construction.

## How the comps work

`comps/*.html` are not pictures. Each one links `tokens.css` and `_site.css`,
and `_site.css` is **assembled verbatim from the component files** by a script
— every rule in it is copied out of the `components/` file that owns it. So a
comp shows what the components actually do, and changing a component changes
the comp. Resize the window to check 390 / 820 / 1440; there is nothing to
rebuild.

Breakpoints: **900** (feature strip 3-up → 2-up), **820** (nav collapses to
the overlay menu, footer stacks), **600** (feature strip → 1-up).

## Open questions

1. ~~`deadair.png` has copy baked into the artwork.~~ **Resolved** — the note
   is cropped out of every shipped crop (`assets/dead-air-hero-1400.jpg`,
   `assets/dead-air-card-760.jpg`); the line is set as real HTML over the art.
   The uncropped frame stays available for `/games/dead-air/` decoration only.
2. **Studio copy for `/about/` does not exist yet.** Anything drafted is marked
   `[draft copy]` inline, in both the components and the canvas.
3. ~~Social handles are unknown.~~ **Resolved** — Instagram, X and LinkedIn
   are wired to the real `playfaisca` URLs with `target="_blank"` and
   `rel="me noopener"`. Discord is removed.
4. ~~The privacy page is structure, not policy.~~ **Resolved** — real copy
   poured in from `faisca-landing`, verified word for word against the source.
   Same for `/support/dead-air/`.
5. **`/about/` claims _faísca_ is Portuguese for spark.** That is the obvious
   reading of the studio name, but it is your story to tell — confirm or
   rewrite that paragraph.
