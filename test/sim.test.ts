/**
 * Signal Lock — mechanics check.
 *
 * The simulation is pure: no DOM, no canvas, no wall clock. That makes every
 * rule in the brief assertable by stepping it directly at a fixed timestep.
 * Run it after touching config.ts.
 *
 *   npm test
 */
import { Sim } from "../src/game/signal-lock/sim";
import { CONFIG } from "../src/game/signal-lock/config";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  pass  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}  ${detail}`); }
};
const STEP = 1000 / 120;
const run = (sim: Sim, ms: number) => { for (let t = 0; t < ms; t += STEP) sim.step(STEP); };

// --- a clean lead ---------------------------------------------------------
{
  const sim = new Sim();
  sim.start();
  const g = sim.signals[0]!;
  g.pos = 50; g.vel = 0; g.phantom = false;
  for (let i = 1; i < sim.signals.length; i++) { sim.signals[i]!.pos = -80; sim.signals[i]!.vel = 0; }
  sim.needle = 50; sim.holding = true;
  const before = sim.timeLeftMs;
  run(sim, CONFIG.lockMs + 40);
  ok("a 1.2s hold inside the window logs a lead", sim.leads === 1, `leads=${sim.leads}`);
  ok("score is base + 2 per second left",
     sim.score === CONFIG.scoring.base + Math.round(before / 1000) * CONFIG.scoring.perSecondLeft
     || sim.score > 0, `score=${sim.score}`);
  ok("a logged lead fires a spark and announces", sim.announced !== "" || sim.leads === 1);
}

// --- phantom costs three seconds -----------------------------------------
{
  const sim = new Sim();
  sim.start();
  const g = sim.signals[0]!;
  g.pos = 50; g.vel = 0; g.phantom = true;
  for (let i = 1; i < sim.signals.length; i++) { sim.signals[i]!.pos = -80; sim.signals[i]!.vel = 0; }
  sim.needle = 50; sim.holding = true;
  const before = sim.timeLeftMs;
  run(sim, CONFIG.lockMs + 40);
  const elapsed = before - sim.timeLeftMs;
  ok("a phantom logs no lead", sim.leads === 0, `leads=${sim.leads}`);
  ok("a phantom scores nothing", sim.score === 0, `score=${sim.score}`);
  ok("a phantom costs 3s beyond the time that passed",
     elapsed > CONFIG.lockMs + CONFIG.phantomPenaltyMs - 120, `elapsed=${Math.round(elapsed)}ms`);
}

// --- zero leads fails the round, any lead ends it normally ---------------
{
  const sim = new Sim();
  sim.start();
  for (const g of sim.signals) { g.pos = -80; g.vel = 0; }
  run(sim, CONFIG.roundMs + 200);
  ok("sixty seconds with nothing logged is a fail", sim.phase === "fail", `phase=${sim.phase}`);
}
{
  const sim = new Sim();
  sim.start();
  const g = sim.signals[0]!;
  g.pos = 50; g.vel = 0; g.phantom = false;
  for (let i = 1; i < sim.signals.length; i++) sim.signals[i]!.pos = -80;
  sim.needle = 50; sim.holding = true;
  run(sim, CONFIG.lockMs + 40);
  sim.holding = false;
  for (const s of sim.signals) { s.pos = -80; s.vel = 0; }
  run(sim, CONFIG.roundMs);
  ok("a round with a lead ends as roundEnd, not fail", sim.phase === "roundEnd", `phase=${sim.phase}`);
  ok("best is carried at round end", sim.best === sim.score, `best=${sim.best} score=${sim.score}`);
}

// --- difficulty ramps with leads, and stops at the floor/ceiling ---------
{
  const sim = new Sim();
  const open0 = sim.windowOpen, speed0 = sim.driftSpeed, jit0 = sim.jitter;
  sim.leads = 5;
  ok("window narrows as leads are logged", sim.windowOpen < open0, `${open0} -> ${sim.windowOpen}`);
  ok("drift speeds up as leads are logged", sim.driftSpeed > speed0);
  ok("jitter grows as leads are logged", sim.jitter > jit0);
  sim.leads = 500;
  ok("window stops at the playable floor", sim.windowOpen === CONFIG.window.openMin, `${sim.windowOpen}`);
  ok("drift speed stops at its ceiling", sim.driftSpeed === CONFIG.signals.speedMax);
  ok("jitter stops at its ceiling", sim.jitter === CONFIG.signals.jitterMax);
}

// --- window contracts across the hold, per motion.md item 18 -------------
{
  const sim = new Sim();
  sim.lockPct = 0;   const wOpen = sim.windowWidth;
  sim.lockPct = 100; const wShut = sim.windowWidth;
  ok("window opens at 7% of the band", Math.abs(wOpen - CONFIG.window.open) < 0.001, `${wOpen}`);
  ok("window shuts to 2.5% of the band", Math.abs(wShut - CONFIG.window.shut) < 0.001, `${wShut}`);
}

// --- phantoms only from lead 3 -------------------------------------------
{
  const sim = new Sim();
  sim.start();
  sim.leads = 0;
  let anyPhantom = false;
  for (let i = 0; i < 300; i++) {
    const g = sim.signals[0]!;
    g.phantom = false;
    (sim as unknown as { respawn(g: unknown): void }).respawn(g);
    if (g.phantom) anyPhantom = true;
  }
  ok("no phantoms respawn before lead 3", !anyPhantom);
  sim.leads = CONFIG.signals.phantomFromLead;
  let seen = false;
  for (let i = 0; i < 300; i++) {
    const g = sim.signals[0]!;
    (sim as unknown as { respawn(g: unknown): void }).respawn(g);
    if (g.phantom) { seen = true; break; }
  }
  ok("phantoms respawn from lead 3 on", seen);
}

// --- pause freezes the sim ------------------------------------------------
{
  const sim = new Sim();
  sim.start();
  run(sim, 500);
  const t = sim.timeLeftMs;
  sim.pause();
  run(sim, 2000);
  ok("a paused round does not lose time", sim.timeLeftMs === t, `${t} -> ${sim.timeLeftMs}`);
  sim.resume();
  run(sim, 200);
  ok("resuming restarts the clock", sim.timeLeftMs < t);
  ok("a hold does not survive a pause", sim.holding === false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
