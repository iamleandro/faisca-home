// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Static output for GitHub Pages. No client framework: the only two islands
// are the game and the mobile menu, both plain <script> hydrated by Astro.
export default defineConfig({
  site: "https://www.faisca.gg",
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()],
  build: {
    // /about/ -> /about/index.html, so every route keeps its trailing slash.
    format: "directory",
    // The whole stylesheet gzips to ~5 KB. Inlining it removes a render-
    // blocking round trip, which was costing ~720 ms of LCP on simulated 4G.
    inlineStylesheets: "always",
  },
  image: {
    // AVIF + WebP variants come from astro:assets at build time.
    responsiveStyles: true,
  },
  vite: {
    build: {
      // The game is one entry; keep it in its own chunk so the pages that do
      // not embed it never pay for it.
      assetsInlineLimit: 2048,
    },
  },
});
