/**
 * Sticky nav state — motion.md items 4 and 5: the bar gains a background and
 * border, and the mark shrinks 38 -> 30px, once the page scrolls past 64px.
 * Both transitions are CSS and read --dur-base, so reduced motion is already
 * handled by the token collapse. This only toggles the class.
 */
const STUCK_AT = 64;

export function initNav(): void {
  const nav = document.querySelector<HTMLElement>("[data-site-nav]");
  if (!nav) return;

  let stuck = false;
  let queued = false;

  const apply = (): void => {
    queued = false;
    const next = window.scrollY > STUCK_AT;
    if (next === stuck) return;
    stuck = next;
    nav.classList.toggle("is-stuck", stuck);
  };

  const onScroll = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  apply();
}
