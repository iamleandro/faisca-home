/**
 * Signal Lock — every tunable number, in one place.
 *
 * The baseline values are the ones in the approved playable prototype,
 * design-kit/.canvas/SignalLock.dc.html. Where that prototype held a value
 * constant and the brief asks for it to scale per lead logged, the constant
 * became a `base` plus a `perLead` step with a floor or ceiling.
 *
 * See README.md → "Tuning the game".
 */

export const CONFIG = {
  /** Round length. 60 seconds, per the kit's start screen. */
  roundMs: 60_000,

  /** Milliseconds of continuous hold inside the window to log a lead. */
  lockMs: 1200,

  /** Milliseconds for a full meter to drain from 100 to 0 when not holding. */
  drainMs: 380,

  /**
   * Meter above this percentage when the hold breaks flashes the `lost`
   * state. Below it, slipping off is not worth a red flash.
   */
  lostFlashAbove: 34,

  /** How long a state flash (locked / lost) stays on the band. */
  flashMs: 460,

  band: {
    /** The needle cannot reach the very edges. Percent of the band. */
    needleMin: 3,
    needleMax: 97,
    /** Signals turn around inside these. Percent of the band. */
    signalMin: 6,
    signalMax: 94,
  },

  needle: {
    /** Percent of the band per 16ms frame while a tune key is held. */
    accel: 0.62,
    /**
     * Velocity retained per 16ms frame once the key is released. The
     * prototype stopped dead; the brief asks for velocity plus friction, so
     * the needle now coasts briefly. 0 would reproduce the prototype.
     */
    friction: 0.78,
    /** Speed below this is treated as a stop, so the needle never creeps. */
    restSpeed: 0.004,
    /** Percent of the band per press of a ◀ ▶ button. */
    nudgeStep: 1.15,
    /** Press-and-hold on ◀ ▶: delay before repeat, then repeat interval. */
    repeatDelayMs: 320,
    repeatEveryMs: 55,
  },

  signals: {
    /** How many markers sit on the band at once. */
    count: 4,
    /** Which indexes start as phantoms, from the prototype. */
    initialPhantoms: [1, 3],
    /**
     * Drift. `speed` is percent of the band per 16ms frame; it grows with
     * each lead logged and stops growing at `speedMax`.
     */
    speedBase: 0.22,
    speedPerLead: 0.026,
    speedMax: 0.52,
    /**
     * Jitter is a random nudge applied to a signal's velocity each tick, so
     * drift stops being perfectly linear as the round goes on.
     */
    jitterBase: 0,
    jitterPerLead: 0.0065,
    jitterMax: 0.052,
    /** Speed given to a marker that respawns after being logged. */
    respawnSpeed: 0.3,
    /** A respawned marker keeps this far away from the needle. */
    respawnClearance: 18,
    /** Chance a respawned marker is a phantom. */
    respawnPhantomChance: 0.4,
    /**
     * Phantoms only start appearing once this many leads are logged. Below
     * it, a respawn is always a real signal. The prototype opened with two
     * phantoms already on the band; the brief asks for them from lead 3.
     */
    phantomFromLead: 3,
  },

  window: {
    /**
     * Lock window width, as a percentage of the band. It contracts from
     * `open` to `shut` across the 1.2s hold — motion.md item 18, "this is the
     * mechanic". `openPerLead` narrows the starting width each lead, and
     * `openMin` is the playable floor it never goes below.
     */
    open: 7,
    shut: 2.5,
    openPerLead: 0.22,
    openMin: 4.4,
    /**
     * Catch radius for the `near` state, as a multiple of the open width.
     * 2.17 puts the outer box at the 140/920 units design-kit/game/hud.html
     * draws it at when the window is open at 7%.
     */
    nearFactor: 2.17,
    /**
     * Width of the flash frame on a logged lead, percent of the band. The
     * kit draws it 56/920 units wide — wider than the shut window, because it
     * is the snap, not the window. hud.html, the `locked` board.
     */
    lockedWidth: 6.087,
  },

  scoring: {
    /** Prototype: 100 flat, plus 2 per whole second left on the clock. */
    base: 100,
    perSecondLeft: 2,
  },

  /** A phantom logged costs this much time. The kit's start screen says three seconds. */
  phantomPenaltyMs: 3000,

  /** The timer turns --game-lost at or below this. hud.html. */
  urgentAtMs: 10_000,

  /** localStorage key for the best score. */
  storageKey: "faisca.signalLock.best",
} as const;

/**
 * Dispatch lines — original, spoiler-free, and carrying no Case 001 plot
 * facts. Copied from the approved prototype.
 */
export const DISPATCH_LINES: readonly string[] = [
  "Ashmere docks. Two voices, one radio.",
  "Somebody is counting numbers on the harbour band.",
  "The night bus driver called it in. Nobody answered.",
  "Weather station, but the wind is wrong.",
  "A child reading street names, slowly.",
  "Same message. Fourth time tonight.",
  "The ferry never left. Someone is still aboard.",
  "Static, then a name, then static.",
];

export const PHANTOM_LINE = "Phantom. Nothing on that channel.";
export const IDLE_LINE = "Waiting on the band.";
