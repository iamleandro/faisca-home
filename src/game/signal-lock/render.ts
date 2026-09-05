/**
 * Canvas renderer for the band.
 *
 * Everything drawn here is traced from design-kit/game/hud.html (landscape,
 * viewBox 960x176) and design-kit/game/controls-mobile.html (portrait,
 * viewBox 330x60). The renderer works in those coordinates and maps them onto
 * the measured .hud__band rect exactly as an <svg> with the default
 * xMidYMid meet would, so the geometry matches the comp at any width.
 *
 * Zero allocations per frame: colours are resolved once, the waveform is
 * baked into a Float32Array at construction, and nothing in `draw` creates an
 * object, array or string.
 */
import { CONFIG } from "./config";
import type { BandState, Sim } from "./sim";

/** The kit's two band coordinate systems. */
interface BandGeom {
  vbW: number;
  vbH: number;
  /** Band runs from x0 to x1 in viewBox units; 0% -> x0, 100% -> x1. */
  x0: number;
  x1: number;
  baselineY: number;
  tickMajor: number;
  tickMinor: number;
  tickCount: number;
  /** Signal lozenge: half width, top and bottom y, corner radius. */
  sigHalfW: number;
  sigTop: number;
  sigBottom: number;
  sigR: number;
  /** Phantom diamond half-diagonal and centre y. */
  phHalf: number;
  phCy: number;
  /** Window box top and height. */
  winTop: number;
  winH: number;
  /** Needle line, and the head triangle (portrait has none). */
  needleTop: number;
  needleBottom: number;
  headW: number;
  headTop: number;
  headH: number;
  /** Waveform band: vertical centre and amplitude scale. */
  waveCy: number;
  waveH: number;
}

const LANDSCAPE: BandGeom = {
  vbW: 960, vbH: 176,
  x0: 20, x1: 940, baselineY: 150,
  tickMajor: 14, tickMinor: 9, tickCount: 9,
  sigHalfW: 5, sigTop: 60, sigBottom: 94, sigR: 5,
  phHalf: 14, phCy: 76,
  winTop: 20, winH: 112,
  needleTop: 14, needleBottom: 134,
  headW: 14, headTop: 8, headH: 10,
  waveCy: 87, waveH: 78,
};

const PORTRAIT: BandGeom = {
  vbW: 330, vbH: 60,
  x0: 8, x1: 322, baselineY: 50,
  tickMajor: 10, tickMinor: 6, tickCount: 5,
  sigHalfW: 4, sigTop: 18, sigBottom: 40, sigR: 4,
  phHalf: 12, phCy: 30,
  winTop: 10, winH: 46,
  needleTop: 4, needleBottom: 56,
  headW: 0, headTop: 0, headH: 0,
  waveCy: 29, waveH: 30,
};

/** Resolved once from the stylesheet, so tokens.css stays the only source. */
interface Palette {
  line: string;
  crt: string;
  idle: string;
  near: string;
  locking: string;
  locked: string;
  lost: string;
  phantom: string;
}

/** spr-waveform: the kit's deterministic noise, 240x60 with baseline 30. */
const WAVE_PATH =
  "39.2 26.0 19.7 21.9 31.3 21.9 20.0 24.1 38.6 28.2 35.5 41.7 29.0 39.8 13.9 28.0 40.4 37.4 38.9 41.2 40.9 36.1 25.9 46.4 22.3 22.6 15.0 34.8 37.0 13.1 47.1 41.2 22.7 11.6 23.6 41.8 35.8 46.8 32.3 24.7 34.5 40.0 31.5 24.6 21.9 31.8 38.2 17.7 18.5 34.3 34.0 33.3 45.0 20.8 19.8 46.7 31.6 14.8 36.5 38.1 44.2 36.5 43.9 34.1 16.4 35.7 23.3 45.6 41.8 37.5 42.3 18.5 22.5 23.4 17.0 17.9 27.7 27.3 39.3 18.3 32.9";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private pal: Palette;
  private wave: Float32Array;

  /** Device pixels per CSS pixel, capped at 2. */
  private dpr = 1;
  /** The band rect in CSS pixels, relative to the canvas. */
  private bx = 0;
  private by = 0;
  private bw = 0;
  private bh = 0;
  private geom: BandGeom = LANDSCAPE;
  /** viewBox unit -> CSS px, and the meet-centring offsets. */
  private scale = 1;
  private ox = 0;
  private oy = 0;

  /** Spark burst, driven by the sim's sparkAt. -1 when idle. */
  private sparkPos = -1;
  private sparkLeft = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    styleSource: Element,
  ) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Signal Lock: no 2D context");
    this.ctx = ctx;
    this.pal = readPalette(styleSource);

    const parts = WAVE_PATH.split(" ");
    this.wave = new Float32Array(parts.length);
    for (let i = 0; i < parts.length; i++) this.wave[i] = Number(parts[i]);
  }

  /** Called from the ResizeObserver. Sizes the bitmap and remaps the band. */
  resize(cssW: number, cssH: number, band: DOMRect, canvasRect: DOMRect, portrait: boolean): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(cssW * this.dpr));
    const h = Math.max(1, Math.round(cssH * this.dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;

    this.bx = band.left - canvasRect.left;
    this.by = band.top - canvasRect.top;
    this.bw = band.width;
    this.bh = band.height;
    this.geom = portrait ? PORTRAIT : LANDSCAPE;

    // xMidYMid meet, exactly what the kit's inline <svg> does.
    const g = this.geom;
    this.scale = Math.min(this.bw / g.vbW, this.bh / g.vbH);
    this.ox = this.bx + (this.bw - g.vbW * this.scale) / 2;
    this.oy = this.by + (this.bh - g.vbH * this.scale) / 2;
  }

  /** Re-read tokens, e.g. after a font or stylesheet swap. */
  refreshPalette(el: Element): void {
    this.pal = readPalette(el);
  }

  fireSpark(pos: number): void {
    this.sparkPos = pos;
    this.sparkLeft = 460;
  }

  draw(sim: Sim, reduceFx: boolean, dtMs: number): void {
    const ctx = this.ctx;
    const s = this.scale;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    if (s <= 0) return;

    // Work in viewBox units from here on.
    ctx.save();
    ctx.translate(this.ox, this.oy);
    ctx.scale(s, s);
    // Strokes are given in viewBox units, matching the kit's stroke-width.
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";

    this.drawWaveform(reduceFx);
    this.drawRuler();
    this.drawSignals(sim, reduceFx, dtMs);
    this.drawWindow(sim, reduceFx);
    this.drawNeedle(sim, reduceFx);

    if (this.sparkLeft > 0) {
      this.sparkLeft -= dtMs;
      if (reduceFx) this.sparkLeft = 0;
      else this.drawSpark();
    }

    ctx.restore();
  }

  private xOf(pct: number): number {
    const g = this.geom;
    return g.x0 + (g.x1 - g.x0) * (pct / 100);
  }
  private wOf(pct: number): number {
    const g = this.geom;
    return (g.x1 - g.x0) * (pct / 100);
  }
  private colourFor(state: BandState): string {
    switch (state) {
      case "near": return this.pal.near;
      case "locking": return this.pal.locking;
      case "locked": return this.pal.locked;
      case "lost": return this.pal.lost;
      default: return this.pal.idle;
    }
  }

  /** spr-waveform, stretched across the band. comps/index.html draws it at 0.2. */
  private drawWaveform(reduceFx: boolean): void {
    const ctx = this.ctx;
    const g = this.geom;
    const n = this.wave.length;
    ctx.save();
    ctx.globalAlpha = reduceFx ? 0.12 : 0.2;
    ctx.strokeStyle = this.pal.crt;
    ctx.lineWidth = 1.25 / this.scale;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = g.x0 + ((g.x1 - g.x0) * i) / (n - 1);
      // Sprite baseline is 30 in a 60-unit box; map that onto waveH.
      const y = g.waveCy + ((this.wave[i]! - 30) / 60) * g.waveH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** Baseline plus alternating major/minor ticks. */
  private drawRuler(): void {
    const ctx = this.ctx;
    const g = this.geom;
    ctx.strokeStyle = this.pal.line;
    ctx.lineWidth = 1 / this.scale;

    ctx.beginPath();
    ctx.moveTo(g.x0, g.baselineY);
    ctx.lineTo(g.x1, g.baselineY);
    for (let i = 0; i < g.tickCount; i++) {
      const x = g.x0 + ((g.x1 - g.x0) * i) / (g.tickCount - 1);
      const up = i % 2 === 0 ? g.tickMajor : g.tickMinor;
      ctx.moveTo(x, g.baselineY);
      ctx.lineTo(x, g.baselineY - up);
    }
    ctx.stroke();
  }

  private drawSignals(sim: Sim, reduceFx: boolean, dtMs: number): void {
    const ctx = this.ctx;
    const g = this.geom;

    for (let i = 0; i < sim.signals.length; i++) {
      const sig = sim.signals[i]!;
      const x = this.xOf(sig.pos);

      if (sig.phantom) {
        // Hollow dashed diamond, never filled — spr-phantom.
        let jx = 0;
        if (!reduceFx) {
          // motion.md item 22: +/-2px at 8Hz, steps(2).
          this.phantomPhase += dtMs;
          jx = Math.floor((this.phantomPhase / 125) % 2) === 0 ? -2 : 2;
        }
        ctx.save();
        ctx.strokeStyle = this.pal.phantom;
        ctx.lineWidth = 1.8 / this.scale;
        ctx.setLineDash(DASH_4);
        ctx.beginPath();
        ctx.moveTo(x + jx, g.phCy - g.phHalf);
        ctx.lineTo(x + jx + g.phHalf, g.phCy);
        ctx.lineTo(x + jx, g.phCy + g.phHalf);
        ctx.lineTo(x + jx - g.phHalf, g.phCy);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash(DASH_NONE);
        ctx.restore();
      } else {
        // Filled lozenge — spr-signal, the shape that means "this counts".
        ctx.save();
        ctx.globalAlpha = 0.62;
        ctx.fillStyle = this.pal.near;
        roundedBar(ctx, x, g.sigTop, g.sigBottom, g.sigHalfW, g.sigR);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private phantomPhase = 0;
  private pulsePhase = 0;

  private drawWindow(sim: Sim, reduceFx: boolean): void {
    const ctx = this.ctx;
    const g: BandGeom = this.geom;
    const state = sim.bandState;
    if (state === "idle") return;

    const cx = this.xOf(sim.needle);
    const outerW = this.wOf(sim.windowOpen * CONFIG.window.nearFactor);

    const box = (w: number, stroke: string, lw: number, alpha: number, fill: string | null, fillA = 0): void => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lw / this.scale;
      ctx.strokeStyle = stroke;
      if (fill) {
        ctx.globalAlpha = fillA;
        ctx.fillStyle = fill;
        ctx.fillRect(cx - w / 2, g.winTop, w, g.winH);
        ctx.globalAlpha = alpha;
      }
      ctx.strokeRect(cx - w / 2, g.winTop, w, g.winH);
      ctx.restore();
    };

    if (state === "near") {
      box(outerW, this.pal.near, 1.5, 0.55, null);
    } else if (state === "locking") {
      box(outerW, this.pal.locking, 1, 0.25, null);
      // motion.md item 19: stroke pulses at 2Hz; reduced motion holds it full.
      let a = 1;
      if (!reduceFx) {
        this.pulsePhase += 1;
        a = 0.65 + 0.35 * (0.5 + 0.5 * Math.sin((performance.now() / 500) * Math.PI * 2));
      }
      box(this.wOf(sim.windowWidth), this.pal.locking, 2, a, this.pal.locking, 0.07);
    } else if (state === "locked") {
      box(this.wOf(CONFIG.window.lockedWidth), this.pal.locked, 2.5, 1, this.pal.locked, 0.16);
    } else if (state === "lost") {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = this.pal.lost;
      ctx.lineWidth = 2 / this.scale;
      ctx.setLineDash(DASH_7);
      ctx.strokeRect(cx - outerW / 2, g.winTop, outerW, g.winH);
      ctx.setLineDash(DASH_NONE);
      ctx.restore();
    }
  }

  private drawNeedle(sim: Sim, reduceFx: boolean): void {
    const ctx = this.ctx;
    const g = this.geom;
    const state = sim.bandState;
    const colour = this.colourFor(state);
    const x = this.xOf(sim.needle);

    ctx.save();
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;

    // motion.md item 20: glow on near / locking / locked, never under reduce.
    if (!reduceFx && (state === "near" || state === "locking" || state === "locked")) {
      ctx.shadowColor = colour;
      ctx.shadowBlur = 14 / this.scale;
    }

    if (state === "lost") {
      // The needle breaks into dashes and loses its head.
      ctx.lineWidth = 2 / this.scale;
      ctx.setLineDash(DASH_5);
      ctx.beginPath();
      ctx.moveTo(x, g.needleTop + 8);
      ctx.lineTo(x, g.needleBottom - 4);
      ctx.stroke();
      ctx.setLineDash(DASH_NONE);
    } else {
      ctx.lineWidth = 3 / this.scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, g.needleTop);
      ctx.lineTo(x, g.needleBottom);
      ctx.stroke();
      ctx.lineCap = "butt";
      if (g.headW > 0) {
        ctx.beginPath();
        ctx.moveTo(x - g.headW / 2, g.headTop);
        ctx.lineTo(x + g.headW / 2, g.headTop);
        ctx.lineTo(x, g.headTop + g.headH);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** spr-spark, eight rays, scale 0.5 -> 1.6 with a fade. motion.md item 21. */
  private drawSpark(): void {
    const ctx = this.ctx;
    const g = this.geom;
    const t = 1 - this.sparkLeft / 460;
    const k = 0.5 + 1.1 * t;
    const size = (g.vbH / 176) * 48;

    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = this.pal.locked;
    ctx.translate(this.xOf(this.sparkPos), g.phCy);
    ctx.scale((k * size) / 48, (k * size) / 48);
    ctx.translate(-24, -24);
    ctx.beginPath();
    for (let i = 0; i < SPARK.length; i += 2) {
      const px = SPARK[i]!;
      const py = SPARK[i + 1]!;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** spr-spark's 16 points, flattened. */
const SPARK = [
  24, 0, 27.5, 17, 38, 6, 31, 20, 48, 24, 31, 28, 38, 42, 27.5, 31,
  24, 48, 20.5, 31, 10, 42, 17, 28, 0, 24, 17, 20, 10, 6, 20.5, 17,
];

// Pre-allocated so setLineDash never builds an array in the loop.
const DASH_NONE: number[] = [];
const DASH_4 = [4, 4];
const DASH_5 = [5, 5];
const DASH_7 = [7, 7];

/** The kit's rounded lozenge: a bar with fully rounded caps. */
function roundedBar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  bottom: number,
  halfW: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.arcTo(cx + halfW, top, cx + halfW, top + r, r);
  ctx.lineTo(cx + halfW, bottom - r);
  ctx.arcTo(cx + halfW, bottom, cx, bottom, r);
  ctx.arcTo(cx - halfW, bottom, cx - halfW, bottom - r, r);
  ctx.lineTo(cx - halfW, top + r);
  ctx.arcTo(cx - halfW, top, cx, top, r);
  ctx.closePath();
}

function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const v = (name: string, fallback: string): string => {
    const raw = cs.getPropertyValue(name).trim();
    return raw.length > 0 ? raw : fallback;
  };
  return {
    line: v("--color-line", "#28282F"),
    crt: v("--color-crt", "#2C941B"),
    idle: v("--game-idle", "#6E7A70"),
    near: v("--game-near", "#DA8D23"),
    locking: v("--game-locking", "#FBB924"),
    locked: v("--game-locked", "#6BE04D"),
    lost: v("--game-lost", "#C4402A"),
    phantom: v("--game-phantom", "#6B655C"),
  };
}
