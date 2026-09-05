/**
 * Keyboard, pointer and the thumb-zone buttons.
 *
 * Pointer Events only, never Touch Events. The first pointer wins; anything
 * after it is ignored until that one lifts. Default is prevented on the tune
 * and log keys only, and only while the stage has focus.
 */
import { CONFIG } from "./config";

export type InputMode = "pointer" | "keyboard";

export interface InputHooks {
  setSteer(dir: -1 | 0 | 1): void;
  setHolding(held: boolean): void;
  setNeedle(pct: number): void;
  nudge(dir: -1 | 1): void;
  togglePause(): void;
  toggleMute(): void;
  onGesture(): void;
  onModeChange(mode: InputMode): void;
}

const TUNE_KEYS = new Set(["ArrowLeft", "ArrowRight", "a", "A", "d", "D"]);
const HOLD_KEYS = new Set([" ", "Spacebar", "Enter"]);

export function bindInput(
  stage: HTMLElement,
  band: HTMLElement,
  controls: HTMLElement,
  hooks: InputHooks,
): () => void {
  const off: Array<() => void> = [];
  const on = <K extends keyof HTMLElementEventMap>(
    el: HTMLElement | Document | Window,
    type: K | string,
    fn: (e: never) => void,
    opts?: AddEventListenerOptions,
  ): void => {
    el.addEventListener(type, fn as EventListener, opts);
    off.push(() => el.removeEventListener(type, fn as EventListener, opts));
  };

  let mode: InputMode = window.matchMedia("(pointer: coarse)").matches ? "pointer" : "keyboard";
  hooks.onModeChange(mode);
  const setMode = (next: InputMode): void => {
    if (next === mode) return;
    mode = next;
    hooks.onModeChange(next);
  };

  // ---- keyboard ----------------------------------------------------------
  const held = new Set<string>();

  const steerFromKeys = (): void => {
    const left = held.has("ArrowLeft") || held.has("a") || held.has("A");
    const right = held.has("ArrowRight") || held.has("d") || held.has("D");
    hooks.setSteer(left === right ? 0 : left ? -1 : 1);
  };

  on(stage, "keydown", (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    setMode("keyboard");
    hooks.onGesture();

    if (TUNE_KEYS.has(e.key)) {
      e.preventDefault();
      held.add(e.key);
      steerFromKeys();
      return;
    }
    if (HOLD_KEYS.has(e.key)) {
      e.preventDefault();
      if (!e.repeat) hooks.setHolding(true);
      return;
    }
    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      hooks.togglePause();
    } else if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      hooks.toggleMute();
    }
  });

  on(stage, "keyup", (e: KeyboardEvent) => {
    if (TUNE_KEYS.has(e.key)) {
      held.delete(e.key);
      steerFromKeys();
    } else if (HOLD_KEYS.has(e.key)) {
      hooks.setHolding(false);
    }
  });

  // Losing focus mid-hold must not leave the needle running.
  on(stage, "blur", () => {
    held.clear();
    hooks.setSteer(0);
    hooks.setHolding(false);
  });
  on(window, "blur", () => {
    held.clear();
    hooks.setSteer(0);
    hooks.setHolding(false);
  });

  // ---- pointer: drag the band 1:1 ----------------------------------------
  let dragId: number | null = null;

  const posFromEvent = (e: PointerEvent): number => {
    const r = band.getBoundingClientRect();
    if (r.width === 0) return 50;
    const pct = ((e.clientX - r.left) / r.width) * 100;
    return Math.max(CONFIG.band.needleMin, Math.min(CONFIG.band.needleMax, pct));
  };

  on(stage, "pointerdown", (e: PointerEvent) => {
    // Ignore every pointer after the first, and let the HUD buttons work.
    if (dragId !== null) return;
    if ((e.target as Element).closest("button, a, .screen")) return;
    setMode("pointer");
    hooks.onGesture();
    dragId = e.pointerId;
    stage.setPointerCapture(e.pointerId);
    hooks.setNeedle(posFromEvent(e));
    // The dial doubles as the log control: drag to tune, keep holding to log.
    hooks.setHolding(true);
    e.preventDefault();
  });

  on(stage, "pointermove", (e: PointerEvent) => {
    if (e.pointerId !== dragId) return;
    hooks.setNeedle(posFromEvent(e));
  });

  const endDrag = (e: PointerEvent): void => {
    if (e.pointerId !== dragId) return;
    dragId = null;
    hooks.setHolding(false);
    if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
  };
  on(stage, "pointerup", endDrag);
  on(stage, "pointercancel", endDrag);

  // ---- thumb zone: LOG holds, arrows repeat ------------------------------
  const log = controls.querySelector<HTMLButtonElement>("[data-log]");
  if (log) {
    on(log, "pointerdown", (e: PointerEvent) => {
      e.preventDefault();
      setMode("pointer");
      hooks.onGesture();
      log.setPointerCapture(e.pointerId);
      log.classList.add("is-held");
      hooks.setHolding(true);
    });
    const release = (e: PointerEvent): void => {
      log.classList.remove("is-held");
      hooks.setHolding(false);
      if (log.hasPointerCapture(e.pointerId)) log.releasePointerCapture(e.pointerId);
    };
    on(log, "pointerup", release);
    on(log, "pointercancel", release);
    // Keyboard users get the same control without the pointer path.
    on(log, "keydown", (e: KeyboardEvent) => {
      if (HOLD_KEYS.has(e.key) && !e.repeat) {
        e.preventDefault();
        hooks.setHolding(true);
      }
    });
    on(log, "keyup", (e: KeyboardEvent) => {
      if (HOLD_KEYS.has(e.key)) hooks.setHolding(false);
    });
  }

  for (const btn of controls.querySelectorAll<HTMLButtonElement>("[data-nudge]")) {
    const dir = Number(btn.dataset.nudge) as -1 | 1;
    let delay = 0;
    let repeat = 0;

    const stop = (): void => {
      window.clearTimeout(delay);
      window.clearInterval(repeat);
      delay = 0;
      repeat = 0;
      btn.classList.remove("is-active");
    };
    on(btn, "pointerdown", (e: PointerEvent) => {
      e.preventDefault();
      setMode("pointer");
      hooks.onGesture();
      btn.setPointerCapture(e.pointerId);
      btn.classList.add("is-active");
      hooks.nudge(dir);
      delay = window.setTimeout(() => {
        repeat = window.setInterval(() => hooks.nudge(dir), CONFIG.needle.repeatEveryMs);
      }, CONFIG.needle.repeatDelayMs);
    });
    on(btn, "pointerup", stop);
    on(btn, "pointercancel", stop);
    on(btn, "pointerleave", stop);
    on(btn, "keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") hooks.nudge(dir);
    });
    off.push(stop);
  }

  return () => {
    for (const fn of off) fn();
  };
}
