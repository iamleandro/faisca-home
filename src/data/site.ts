/**
 * Site-wide copy and links.
 *
 * Everything here is lifted from the approved comps in design-kit/comps/.
 * Edit copy here for nav, footer and email; page prose lives in the
 * .astro file for each route. See README.md → "Editing copy".
 */

export const SITE = {
  name: "Faisca Games",
  wordmark: "Faisca",
  tagline: "A spark, then a game.",
  email: "playfaiscagames@gmail.com",
  /** design-kit/comps/* all carry this same meta description. */
  description: "Faisca Games. A spark, then a game.",
  legal: "© Faisca Games Inc. · Proudly made with ❤️ in Toronto, Canada",
} as const;

export interface NavLink {
  href: string;
  label: string;
  /** Routes that should light the current-page indicator for this link. */
  match: string[];
}

/** Primary nav, in the order design-kit/components/nav.html draws it. */
export const NAV: NavLink[] = [
  { href: "/about/", label: "About", match: ["/about/"] },
  { href: "/contact/", label: "Contact", match: ["/contact/"] },
];

export const FOOTER_COLS = [
  {
    heading: "Play",
    links: [{ href: "/#play", label: "Signal Lock" }],
  },
] as const;

/** True when `href` is the route currently being rendered. */
export function isCurrent(link: NavLink, pathname: string): boolean {
  return link.match.includes(pathname);
}
