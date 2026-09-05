/**
 * Mobile menu overlay.
 *
 * design-kit/components/menu-mobile.html lists what the stylesheet cannot
 * express, and this is all of it:
 *   - aria-expanded on the burger
 *   - body { overflow: hidden } while open
 *   - Tab trapped inside the overlay
 *   - Esc closes and returns focus to the burger
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function initMenu(): void {
  const menu = document.querySelector<HTMLElement>("[data-menu]");
  const openBtn = document.querySelector<HTMLButtonElement>("[data-menu-open]");
  const closeBtn = document.querySelector<HTMLButtonElement>("[data-menu-close]");
  if (!menu || !openBtn || !closeBtn) return;

  let open = false;
  let scrollLocked = "";

  const focusables = (): HTMLElement[] =>
    Array.from(menu.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );

  function setOpen(next: boolean): void {
    if (next === open) return;
    open = next;

    menu!.hidden = !open;
    openBtn!.setAttribute("aria-expanded", String(open));

    if (open) {
      scrollLocked = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // Focus the close button, the first thing in the overlay's own order.
      closeBtn!.focus();
      document.addEventListener("keydown", onKeydown, true);
    } else {
      document.body.style.overflow = scrollLocked;
      document.removeEventListener("keydown", onKeydown, true);
      openBtn!.focus();
    }
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key !== "Tab") return;

    const items = focusables();
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;

    // Wrap at both ends, and pull focus back in if it has escaped the overlay.
    if (e.shiftKey && (active === first || !menu!.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !menu!.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  openBtn.addEventListener("click", () => setOpen(true));
  closeBtn.addEventListener("click", () => setOpen(false));

  // Following a link inside the overlay is a navigation, not a close, but the
  // in-page #play anchor needs the overlay out of the way to be seen.
  menu.addEventListener("click", (e) => {
    const link = (e.target as Element | null)?.closest?.("a");
    if (link && link.getAttribute("href")?.includes("#")) setOpen(false);
  });

  // The overlay only exists under 820px; if the viewport grows past that
  // while it is open, close it so the scroll lock cannot strand the page.
  const wide = window.matchMedia("(min-width: 820px)");
  wide.addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
}
