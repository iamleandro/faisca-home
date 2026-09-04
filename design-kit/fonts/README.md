# Fonts — self-hosted, open-licensed

Three faces, all **SIL Open Font License 1.1** — free to self-host and to embed
in the game canvas. No webfont CDN: GitHub Pages serves these from `/fonts/`.

| Role | Family | Licence | Source |
|---|---|---|---|
| Display | Big Shoulders Display | SIL OFL 1.1 | github.com/xotypeco/big_shoulders |
| Text | IBM Plex Sans | SIL OFL 1.1 | github.com/IBM/plex |
| Mono | IBM Plex Mono | SIL OFL 1.1 | github.com/IBM/plex |

**Why these.** Big Shoulders is a condensed American-industrial grotesque —
it hits the bold-display hierarchy of the reference without borrowing its
typefaces. IBM Plex Sans is engineered rather than neutral, which suits a
studio page that sits next to radio equipment. IBM Plex Mono carries the HUD
numerals and the dispatch lines, and rhymes with the typewriter note in the
Dead Air key art.

## Files to ship

```
fonts/
  big-shoulders-display-var.woff2      variable 400..900, latin subset
  ibm-plex-sans-400.woff2
  ibm-plex-sans-500.woff2
  ibm-plex-sans-600.woff2
  ibm-plex-mono-400.woff2
  ibm-plex-mono-500.woff2
  OFL.txt                              one copy covers all three
```

Budget: **~95 KB total** over the wire, latin subset, variable display axis.

## Subsetting recipe

```sh
pip install fonttools brotli
pyftsubset BigShouldersDisplay[wght].ttf \
  --unicodes="U+0000-00FF,U+2013-2014,U+2018-201D,U+2026,U+00A0" \
  --layout-features="kern,liga,tnum" \
  --flavor=woff2 --output-file=big-shoulders-display-var.woff2
```

## @font-face block

Belongs in the global stylesheet, above `tokens.css`. `font-display: swap`
plus the metric overrides keep CLS at zero while the face loads.

```css
@font-face {
  font-family: "Big Shoulders Display";
  src: url("/fonts/big-shoulders-display-var.woff2") format("woff2-variations");
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "IBM Plex Sans";
  src: url("/fonts/ibm-plex-sans-400.woff2") format("woff2");
  font-weight: 400; font-style: normal; font-display: swap;
}
/* ...500, 600, and the two mono weights, same shape */
```

Preload only the display face — it paints the hero, so it is the one that
would otherwise flash:

```html
<link rel="preload" href="/fonts/big-shoulders-display-var.woff2"
      as="font" type="font/woff2" crossorigin>
```

## Export caveat

PNG/PDF export from the design canvas does not embed webfonts. Exported comps
show the fallback stack (`Arial Narrow` for display, system sans for text).
Headlines in the comps are sized with ~10% slack so the fallback does not
overflow. The shipped site is unaffected.
