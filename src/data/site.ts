/**
 * Site-wide copy and links.
 *
 * Everything here is lifted from the approved comps in design-kit/comps/.
 * Edit copy here for nav, footer and social links; page prose lives in the
 * .astro file for each route. See README.md → "Editing copy".
 */

export const SITE = {
  name: "Faisca Games",
  wordmark: "Faisca",
  tagline: "A spark, then a game.",
  email: "contact@faisca.gg",
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
  { href: "/games/dead-air/", label: "Games", match: ["/games/dead-air/"] },
  { href: "/about/", label: "About", match: ["/about/"] },
  { href: "/support/dead-air/", label: "Support", match: ["/support/dead-air/"] },
  { href: "/contact/", label: "Contact", match: ["/contact/"] },
];

/**
 * Instagram, X and LinkedIn at the playfaisca handles.
 * Discord was dropped in design-kit/README.md, decision 3.
 */
export const SOCIALS = [
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/playfaisca/" },
  { key: "x", label: "X", href: "https://x.com/playfaisca" },
  { key: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/company/playfaisca/" },
] as const;

export const FOOTER_COLS = [
  {
    heading: "Games",
    links: [
      { href: "/games/dead-air/", label: "Dead Air: Ashmere" },
      { href: "/#play", label: "Signal Lock" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/support/dead-air/", label: "Dead Air Support" },
      { href: "/privacy/dead-air/", label: "Dead Air Privacy" },
    ],
  },
] as const;

/** True when `href` is the route currently being rendered. */
export function isCurrent(link: NavLink, pathname: string): boolean {
  return link.match.includes(pathname);
}
