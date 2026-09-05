/**
 * Signal Lock — simulation.
 *
 * Pure state plus a fixed-timestep `step`. No DOM, no canvas, no timing: the
 * loop owns those. Allocation-free once constructed — signals are a
 * pre-allocated pool and `step` never creates an object.
 */
import { CONFIG, DISPATCH_LINES, IDLE_LINE, PHANTOM_LINE } from "./config";

export type Phase = "idle" | "playing" | "paused" | "roundEnd" | "fail";
/** The five band states the kit draws. design-kit/game/hud.html. */
export type BandState = "idle" | "near" | "locking" | "locked" | "lost";

export interface Signal {
  pos: number;
  vel: number;
  phantom: boolean;
}

/** Deterministic LCG, same constants as the prototype. */
export class Rng {
  private seed: number;
  constructor(seed = 1337) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  /** −1..1 */
  bipolar(): number {
    return this.next() * 2 - 1;
  }
}

export class Sim {
  phase: Phase = "idle";

  needle = 50;
  needleVel = 0;
  /** −1, 0 or 1: which way the player is currently steering. */
  steer = 0;
  holding = false;

  readonly signals: Signal[] = [];
  /** Index of the signal nearest the needle, or −1. */
  nearest = -1;
  nearestDist = Infinity;

  lockPct = 0;
  score = 0;
  best = 0;
  leads = 0;
  timeLeftMs: number = CONFIG.roundMs;

  bandState: BandState = "idle";
  /** Non-empty while a locked/lost flash is on screen. */
  flash: "" | "locked" | "lost" = "";
  flashLeftMs = 0;
  dispatch: string = IDLE_LINE;
  dispatchIsPhantom = false;
  private dispatchN = 0;

  /** Set for one step after something an aria-live region should announce. */
  announced = "";
  /** Set for one step when a lead is logged, so the renderer can fire a spark. */
  sparkAt = -1;
  /** True once the 10-second warning has been announced this round. */
  private warned = false;

  private rng = new Rng();

  constructor() {
    for (let i = 0; i < CONFIG.signals.count; i++) {
      this.signals.push({ pos: 0, vel: 0, phantom: false });
    }
    this.resetSignals();
  }

  private resetSignals(): void {
    const { signals: S } = CONFIG;
    for (let i = 0; i < this.signals.length; i++) {
      const g = this.signals[i]!;
      g.pos = 14 + i * 22 + this.rng.next() * 8;
      g.vel = this.rng.bipolar() * S.speedBase;
      g.phantom = S.initialPhantoms.includes(i as never);
    }
  }

  /** Difficulty ramps with leads logged, not with the clock. */
  get driftSpeed(): number {
    const { signals: S } = CONFIG;
    return Math.min(S.speedMax, S.speedBase + this.leads * S.speedPerLead);
  }
  get jitter(): number {
    const { signals: S } = CONFIG;
    return Math.min(S.jitterMax, S.jitterBase + this.leads * S.jitterPerLead);
  }
  /** Window width at the start of a hold, before it contracts. */
  get windowOpen(): number {
    const { window: W } = CONFIG;
    return Math.max(W.openMin, W.open - this.leads * W.openPerLead);
  }
  /** Current window width, contracting as the meter fills. motion.md item 18. */
  get windowWidth(): number {
    const open = this.windowOpen;
    return open - (open - CONFIG.window.shut) * (this.lockPct / 100);
  }

  start(): void {
    this.phase = "playing";
    this.needle = 50;
    this.needleVel = 0;
    this.steer = 0;
    this.holding = false;
    this.lockPct = 0;
    this.score = 0;
    this.leads = 0;
    this.timeLeftMs = CONFIG.roundMs;
    this.bandState = "idle";
    this.flash = "";
    this.flashLeftMs = 0;
    this.dispatch = IDLE_LINE;
    this.dispatchIsPhantom = false;
    this.dispatchN = 0;
    this.warned = false;
    this.rng = new Rng();
    this.resetSignals();
    this.announced = "Round started. Sixty seconds.";
  }

  pause(): void {
    if (this.phase === "playing") this.phase = "paused";
  }
  resume(): void {
    if (this.phase === "paused") {
      this.phase = "playing";
      // A hold cannot survive a pause; the key or thumb may be long gone.
      this.holding = false;
      this.steer = 0;
    }
  }

  /** One fixed step. `dt` is milliseconds. */
  step(dt: number): void {
    this.announced = "";
    this.sparkAt = -1;

    if (this.flashLeftMs > 0) {
      this.flashLeftMs -= dt;
      if (this.flashLeftMs <= 0) this.flash = "";
    }

    if (this.phase !== "playing") {
      if (this.lockPct > 0) this.lockPct = 0;
      return;
    }

    const k = dt / 16;
    const { band: B, needle: N } = CONFIG;

    // --- needle: velocity + friction -------------------------------------
    if (this.steer !== 0) {
      this.needleVel = this.steer * N.accel;
    } else {
      this.needleVel *= Math.pow(N.friction, k);
      if (Math.abs(this.needleVel) < N.restSpeed) this.needleVel = 0;
    }
    if (this.needleVel !== 0) {
      this.needle += this.needleVel * k;
      if (this.needle <= B.needleMin) {
        this.needle = B.needleMin;
        this.needleVel = 0;
      } else if (this.needle >= B.needleMax) {
        this.needle = B.needleMax;
        this.needleVel = 0;
      }
    }

    // --- signals: drift, jitter, reflect at the edges ---------------------
    const speed = this.driftSpeed;
    const jit = this.jitter;
    for (let i = 0; i < this.signals.length; i++) {
      const g = this.signals[i]!;
      if (jit > 0) {
        g.vel += this.rng.bipolar() * jit * k;
        if (g.vel > speed) g.vel = speed;
        else if (g.vel < -speed) g.vel = -speed;
      }
      g.pos += g.vel * k;
      if (g.pos < B.signalMin) {
        g.pos = B.signalMin;
        g.vel = -g.vel;
      } else if (g.pos > B.signalMax) {
        g.pos = B.signalMax;
        g.vel = -g.vel;
      }
    }

    // --- nearest ----------------------------------------------------------
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < this.signals.length; i++) {
      const d = Math.abs(this.signals[i]!.pos - this.needle);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    this.nearest = best;
    this.nearestDist = bestD;

    // --- lock meter -------------------------------------------------------
    const inside = best >= 0 && bestD <= this.windowWidth / 2;
    this.timeLeftMs -= dt;

    if (inside && this.holding) {
      this.lockPct += (dt / CONFIG.lockMs) * 100;
    } else {
      if (this.lockPct > CONFIG.lostFlashAbove) this.setFlash("lost");
      this.lockPct -= (dt / CONFIG.drainMs) * 100;
      if (this.lockPct < 0) this.lockPct = 0;
    }

    if (this.lockPct >= 100 && best >= 0) {
      this.lockPct = 0;
      this.logLead(best);
    }

    // --- band state -------------------------------------------------------
    this.bandState = this.deriveState(inside, bestD);

    // --- clock ------------------------------------------------------------
    if (!this.warned && this.timeLeftMs <= CONFIG.urgentAtMs) {
      this.warned = true;
      this.announced = "Ten seconds left.";
    }
    if (this.timeLeftMs <= 0) {
      this.timeLeftMs = 0;
      this.endRound();
    }
  }

  private deriveState(inside: boolean, dist: number): BandState {
    if (this.flash === "locked") return "locked";
    if (this.flash === "lost") return "lost";
    if (inside && this.holding) return "locking";
    if (dist <= (this.windowOpen * CONFIG.window.nearFactor) / 2) return "near";
    return "idle";
  }

  private setFlash(kind: "locked" | "lost"): void {
    this.flash = kind;
    this.flashLeftMs = CONFIG.flashMs;
  }

  private logLead(index: number): void {
    const g = this.signals[index]!;
    if (g.phantom) {
      this.timeLeftMs -= CONFIG.phantomPenaltyMs;
      this.setFlash("lost");
      this.dispatch = PHANTOM_LINE;
      this.dispatchIsPhantom = true;
      this.announced = "Phantom. Three seconds lost.";
    } else {
      const secondsLeft = Math.round(Math.max(0, this.timeLeftMs) / 1000);
      this.score += CONFIG.scoring.base + secondsLeft * CONFIG.scoring.perSecondLeft;
      this.leads += 1;
      this.setFlash("locked");
      this.dispatch = DISPATCH_LINES[this.dispatchN % DISPATCH_LINES.length]!;
      this.dispatchIsPhantom = false;
      this.dispatchN += 1;
      this.sparkAt = g.pos;
      this.announced = `Lead logged. Score ${this.score}.`;
    }
    this.respawn(g);
  }

  private respawn(g: Signal): void {
    const { band: B, signals: S } = CONFIG;
    let p = B.signalMin + this.rng.next() * (B.signalMax - B.signalMin);
    if (Math.abs(p - this.needle) < S.respawnClearance) {
      p = p > this.needle ? p + S.respawnClearance : p - S.respawnClearance;
    }
    g.pos = Math.max(B.signalMin, Math.min(B.signalMax, p));
    g.vel = this.rng.bipolar() * S.respawnSpeed;
    g.phantom =
      this.leads >= S.phantomFromLead && this.rng.next() < S.respawnPhantomChance;
  }

  private endRound(): void {
    // The kit has one fail screen and it reads "Sixty seconds, nothing
    // logged" — the round always runs its full length, and zero leads is
    // what fails it.
    this.phase = this.leads === 0 ? "fail" : "roundEnd";
    if (this.score > this.best) this.best = this.score;
    this.holding = false;
    this.steer = 0;
    this.announced =
      this.phase === "fail"
        ? "Dead air. Nothing logged."
        : `Round over. Score ${this.score}, ${this.leads} leads.`;
  }
}
