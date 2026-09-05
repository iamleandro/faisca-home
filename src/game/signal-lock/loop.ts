/**
 * Fixed-timestep accumulator at 120Hz, rendered on rAF.
 *
 * Pauses on `visibilitychange` and whenever the stage leaves the viewport, so
 * a tab in the background and a game scrolled off screen both cost nothing.
 */
const STEP_MS = 1000 / 120;
/** Never simulate more than this much wall clock in one frame. */
const MAX_FRAME_MS = 250;

export interface LoopHandle {
  stop(): void;
}

export function startLoop(
  el: Element,
  step: (dt: number) => void,
  render: (alpha: number) => void,
): LoopHandle {
  let raf = 0;
  let last = 0;
  let acc = 0;
  let running = false;
  let visible = !document.hidden;
  let onScreen = false;

  const frame = (now: number): void => {
    raf = requestAnimationFrame(frame);
    if (last === 0) last = now;
    let elapsed = now - last;
    last = now;
    if (elapsed > MAX_FRAME_MS) elapsed = MAX_FRAME_MS;

    acc += elapsed;
    while (acc >= STEP_MS) {
      step(STEP_MS);
      acc -= STEP_MS;
    }
    render(acc / STEP_MS);
  };

  const sync = (): void => {
    const want = visible && onScreen;
    if (want === running) return;
    running = want;
    if (running) {
      last = 0;
      acc = 0;
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const onVisibility = (): void => {
    visible = !document.hidden;
    sync();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[entries.length - 1];
      if (!e) return;
      onScreen = e.isIntersecting;
      sync();
    },
    { threshold: 0 },
  );
  io.observe(el);

  return {
    stop() {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
