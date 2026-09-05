/**
 * Signal Lock — entry point.
 *
 * Owns the DOM: reads the markup SignalLock.astro renders, drives the HUD,
 * the four screens and the thumb zone, and hands the band to the canvas
 * renderer. The simulation itself knows nothing about any of this.
 */
import { CONFIG, IDLE_LINE } from "./config";
import { Sim, type Phase } from "./sim";
import { Renderer } from "./render";
import { startLoop } from "./loop";
import { GameAudio } from "./audio";
import { bindInput } from "./input";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function mount(): void {
  const root = document.querySelector<HTMLElement>("[data-signal-lock]");
  if (!root) return;

  const stage = root.querySelector<HTMLElement>("[data-stage]")!;
  const canvas = root.querySelector<HTMLCanvasElement>("[data-canvas]")!;
  const hud = root.querySelector<HTMLElement>("[data-hud]")!;
  const band = root.querySelector<HTMLElement>("[data-band]")!;
  const controls = root.querySelector<HTMLElement>("[data-controls]")!;
  const live = root.querySelector<HTMLElement>("[data-live]")!;

  const el = {
    score: root.querySelector<HTMLElement>("[data-score]")!,
    time: root.querySelector<HTMLElement>("[data-time]")!,
    best: root.querySelector<HTMLElement>("[data-best]")!,
    state: root.querySelector<HTMLElement>("[data-state]")!,
    meter: root.querySelector<HTMLElement>("[data-meter]")!,
    dispatch: root.querySelector<HTMLElement>("[data-dispatch]")!,
    dispatchText: root.querySelector<HTMLElement>("[data-dispatch-text]")!,
    endScore: root.querySelector<HTMLElement>("[data-end-score]")!,
    endLeads: root.querySelector<HTMLElement>("[data-end-leads]")!,
    endBest: root.querySelector<HTMLElement>("[data-end-best]")!,
  };
  const screens = new Map<string, HTMLElement>();
  for (const s of root.querySelectorAll<HTMLElement>("[data-screen]")) {
    screens.set(s.dataset.screen!, s);
  }

  const sim = new Sim();
  sim.best = readBest();
  const renderer = new Renderer(canvas, stage);
  const audio = new GameAudio();

  // ---- reduce effects ----------------------------------------------------
  // motion.md: the OS preference chooses the default; the player can still
  // override it, and the toggle wins once they have touched it.
  const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceFx = rm.matches;
  let userSetFx = false;
  rm.addEventListener("change", (e) => {
    if (!userSetFx) setReduceFx(e.matches);
  });

  let muted = true;
  let portrait = false;

  // ---- HUD wiring --------------------------------------------------------
  const toolMute = root.querySelector<HTMLButtonElement>("[data-tool-mute]")!;
  const toolPause = root.querySelector<HTMLButtonElement>("[data-tool-pause]")!;
  const toolFx = root.querySelector<HTMLButtonElement>("[data-tool-fx]")!;

  function setReduceFx(next: boolean): void {
    reduceFx = next;
    stage.classList.toggle("is-reduced", next);
    toolFx.setAttribute("aria-pressed", String(next));
    setIcon(toolFx, next ? "spr-fx-off" : "spr-fx-on");
  }

  function setMuted(next: boolean): void {
    muted = next;
    audio.setMuted(next);
    toolMute.setAttribute("aria-pressed", String(!next));
    toolMute.setAttribute("aria-label", next ? "Unmute" : "Mute");
    setIcon(toolMute, next ? "spr-sound-off" : "spr-sound-on");
  }

  toolMute.addEventListener("click", () => setMuted(!muted));
  toolFx.addEventListener("click", () => {
    userSetFx = true;
    setReduceFx(!reduceFx);
  });
  toolPause.addEventListener("click", () => togglePause());

  setReduceFx(reduceFx);
  setMuted(true);

  // ---- screens -----------------------------------------------------------
  let lastFocus: HTMLElement | null = null;

  function showScreen(phase: Phase | null): void {
    for (const [key, s] of screens) s.hidden = key !== phase;
    hud.hidden = phase === "idle";
    if (phase === null) return;

    const s = screens.get(phase);
    if (!s) return;
    // Re-run the veil fade: motion.md item 16, and a no-op under reduce.
    const primary = s.querySelector<HTMLElement>(".btn--primary");
    primary?.focus();
  }

  function trapTab(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;
    const open = [...screens.values()].find((s) => !s.hidden);
    if (!open) return;
    const items = [...open.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && (document.activeElement === first || !open.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !open.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  }
  root.addEventListener("keydown", trapTab, true);

  // Escape pauses out of play, and resumes from the pause screen.
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (sim.phase === "playing") {
      e.preventDefault();
      togglePause();
    } else if (sim.phase === "paused") {
      e.preventDefault();
      togglePause();
    }
  });

  function togglePause(): void {
    if (sim.phase === "playing") {
      lastFocus = document.activeElement as HTMLElement | null;
      sim.pause();
      audio.suspend();
      toolPause.setAttribute("aria-pressed", "true");
      setIcon(toolPause, "spr-play");
      toolPause.setAttribute("aria-label", "Resume");
      showScreen("paused");
    } else if (sim.phase === "paused") {
      sim.resume();
      audio.wake();
      toolPause.setAttribute("aria-pressed", "false");
      setIcon(toolPause, "spr-pause");
      toolPause.setAttribute("aria-label", "Pause");
      showScreen(null);
      for (const s of screens.values()) s.hidden = true;
      (lastFocus ?? stage).focus();
    }
  }

  for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-action]")) {
    btn.addEventListener("click", () => {
      switch (btn.dataset.action) {
        case "start":
        case "again":
          audio.ensure();
          sim.start();
          for (const s of screens.values()) s.hidden = true;
          hud.hidden = false;
          stage.focus();
          break;
        case "resume":
          togglePause();
          break;
        case "giveup":
          sim.phase = "idle";
          sim.dispatch = IDLE_LINE;
          showScreen("idle");
          break;
        case "share":
          void share();
          break;
      }
    });
  }

  /** navigator.share, clipboard fallback. */
  async function share(): Promise<void> {
    const text = `I logged ${sim.leads} leads on the Ashmere band for ${sim.score} on Signal Lock.`;
    const url = "https://www.faisca.gg/#play";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Signal Lock", text, url });
        return;
      }
    } catch {
      // A cancelled share is not a failure; fall through to the clipboard.
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      say("Score copied to the clipboard.");
    } catch {
      say("Could not share this score.");
    }
  }

  // ---- input -------------------------------------------------------------
  bindInput(stage, band, controls, {
    setSteer: (dir) => {
      sim.steer = dir;
    },
    setHolding: (h) => {
      sim.holding = h;
    },
    setNeedle: (pct) => {
      sim.needle = pct;
      sim.needleVel = 0;
    },
    nudge: (dir) => {
      sim.needle = Math.max(
        CONFIG.band.needleMin,
        Math.min(CONFIG.band.needleMax, sim.needle + dir * CONFIG.needle.nudgeStep),
      );
      sim.needleVel = 0;
    },
    togglePause,
    toggleMute: () => setMuted(!muted),
    onGesture: () => {
      if (!muted) audio.ensure();
    },
    onModeChange: (next) => {
      root.classList.toggle("is-touch", next === "pointer");
      controls.hidden = next !== "pointer";
      measure();
    },
  });

  // ---- sizing ------------------------------------------------------------
  function measure(): void {
    const r = stage.getBoundingClientRect();
    if (r.width === 0) return;
    portrait = window.matchMedia("(max-width: 819px)").matches;
    stage.classList.toggle("stage--portrait", portrait);
    renderer.resize(r.width, r.height, band.getBoundingClientRect(), canvas.getBoundingClientRect(), portrait);
  }

  const ro = new ResizeObserver(() => measure());
  ro.observe(stage);
  ro.observe(band);
  window.addEventListener("orientationchange", () => requestAnimationFrame(measure));
  measure();

  // ---- HUD text, only when it changes -----------------------------------
  let lastScore = -1;
  let lastTime = "";
  let lastBest = -1;
  let lastState = "";
  let lastMeter = -1;
  let lastDispatch = "";
  let lastPhase: Phase | "" = "";
  let urgent = false;

  function paintHud(): void {
    if (sim.score !== lastScore) {
      lastScore = sim.score;
      el.score.textContent = pad(sim.score);
    }
    if (sim.best !== lastBest) {
      lastBest = sim.best;
      el.best.textContent = pad(sim.best);
    }
    const t = clock(sim.timeLeftMs);
    if (t !== lastTime) {
      lastTime = t;
      el.time.textContent = t;
    }
    const nowUrgent = sim.timeLeftMs <= CONFIG.urgentAtMs && sim.phase === "playing";
    if (nowUrgent !== urgent) {
      urgent = nowUrgent;
      el.time.classList.toggle("hud__value--urgent", nowUrgent);
    }
    if (sim.bandState !== lastState) {
      lastState = sim.bandState;
      el.state.textContent = sim.bandState;
      el.state.style.color = `var(--game-${sim.bandState})`;
      el.meter.style.background = `var(--game-${sim.bandState === "idle" ? "locking" : sim.bandState})`;
    }
    const pct = Math.round(sim.lockPct);
    if (pct !== lastMeter) {
      lastMeter = pct;
      el.meter.style.width = `${pct}%`;
    }
    if (sim.dispatch !== lastDispatch) {
      lastDispatch = sim.dispatch;
      el.dispatchText.textContent = sim.dispatch;
      el.dispatch.classList.toggle("hud__dispatch--phantom", sim.dispatchIsPhantom);
    }
  }

  function say(msg: string): void {
    live.textContent = msg;
  }

  // ---- the loop ----------------------------------------------------------
  startLoop(
    stage,
    (dt) => {
      sim.step(dt);
      if (sim.announced) say(sim.announced);
      if (sim.sparkAt >= 0) {
        renderer.fireSpark(sim.sparkAt);
        audio.ping(true);
      } else if (sim.flash === "lost" && sim.dispatchIsPhantom && sim.dispatch !== lastDispatch) {
        audio.ping(false);
      }
      if (sim.phase !== lastPhase) {
        const prev = lastPhase;
        lastPhase = sim.phase;
        if (sim.phase === "roundEnd" || sim.phase === "fail") {
          writeBest(sim.best);
          el.endScore.textContent = pad(sim.score);
          el.endLeads.textContent = String(sim.leads).padStart(2, "0");
          el.endBest.textContent = pad(sim.best);
          // The kit turns Best green only when this round beat it.
          el.endBest.style.color = sim.score >= sim.best && sim.score > 0 ? "var(--game-locked)" : "";
          showScreen(sim.phase);
          audio.suspend();
        } else if (sim.phase === "idle" && prev !== "") {
          showScreen("idle");
        }
      }
    },
    () => {
      paintHud();
      if (sim.phase === "playing" && !muted) {
        const w = sim.windowOpen * CONFIG.window.nearFactor;
        audio.setCloseness(Math.max(0, 1 - sim.nearestDist / (w / 2)));
      }
      renderer.draw(sim, reduceFx, 1000 / 60);
    },
  );

  // Start on the idle screen with the HUD hidden, as the kit's start comp shows.
  showScreen("idle");
  el.best.textContent = pad(sim.best);
  el.dispatchText.textContent = IDLE_LINE;

  // ---- helpers -----------------------------------------------------------
  function setIcon(btn: HTMLElement, id: string): void {
    btn.querySelector("use")?.setAttribute("href", `#${id}`);
  }
}

/** The kit prints score as five digits with a thin space: "01 240". */
function pad(n: number): string {
  const s = String(Math.max(0, Math.round(n))).padStart(5, "0");
  return `${s.slice(0, 2)} ${s.slice(2)}`;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function readBest(): number {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeBest(best: number): void {
  try {
    localStorage.setItem(CONFIG.storageKey, String(best));
  } catch {
    // Private mode or blocked storage: the score just does not persist.
  }
}
