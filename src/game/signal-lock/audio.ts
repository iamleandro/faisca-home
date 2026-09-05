/**
 * Synthesised static and tones. No audio files.
 *
 * The AudioContext is not created until the first user gesture, so the page
 * never opens one on load. Muted by default — the kit's home page promises
 * "Audio is off until you ask for it".
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private muted = true;

  /** Safe to call on every gesture; only the first one does anything. */
  ensure(): void {
    if (this.ctx || this.muted) return;
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);

    // Two seconds of white noise on a loop, band-limited so it reads as
    // radio hiss rather than a hairdryer.
    const frames = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    src.connect(filter).connect(gain).connect(master);
    src.start();

    this.ctx = ctx;
    this.master = master;
    this.noiseGain = gain;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      }
    } else {
      this.ensure();
      if (this.master && this.ctx) {
        void this.ctx.resume();
        this.master.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.02);
      }
    }
  }

  /**
   * Hiss tracks how far off the signal the needle is: loud when lost in the
   * noise, near silent when locked on. `closeness` is 0..1.
   *
   * Called every frame, so it must not allocate.
   */
  setCloseness(closeness: number): void {
    if (!this.ctx || !this.noiseGain || this.muted) return;
    const target = 0.35 * (1 - closeness) ** 1.6;
    this.noiseGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  /** Short confirmation tone on a logged lead. */
  ping(ok: boolean): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = ok ? "sine" : "square";
    osc.frequency.setValueAtTime(ok ? 660 : 180, t);
    osc.frequency.exponentialRampToValueAtTime(ok ? 990 : 120, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(ok ? 0.3 : 0.22, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
  }
  wake(): void {
    if (this.ctx && !this.muted && this.ctx.state === "suspended") void this.ctx.resume();
  }
}
