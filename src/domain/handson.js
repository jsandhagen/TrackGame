// Hands-on throws, after Playman Track & Field: tap the pad that lights up, left or right, as
// quickly as you can to build speed; the speed carries the thrower to the line. Then press and
// hold to charge the throw, and let go with the needle on the gold.
//
// The tactic sets the difficulty. Bank it skips the run-up, and its needle swings back and forth
// with no foul line. Controlled is a short run-up that alternates sides. All out is longer, its
// speed drains faster and its pads shuffle. With either of those, holding the needle past the red
// line, or reaching the line and not throwing in time, is a foul.
// Athletes' stats shape the pattern: Speed makes each tap count for more, Technique widens the
// gold, Focus keeps an All out run-up from shuffling. Low stamina drains speed faster.
// A throw the game handles itself counts as "good", so playing by hand is never required.
//
// Everything here is pure and driven by explicit timestamps (ms), so it can be simulated.
import { EVENTS } from "../game-content.js";

export const HANDS_ON_MODES = ["off", "big", "all"];
export const HANDS_ON_LEVEL = { safe: "Easy", balanced: "Medium", attack: "Hard" };

// Whether this decision is played by hand: every one, or only clutch moments.
export function handsOnApplies(settings, beat) {
  const mode = settings?.handsOn;
  return mode === "all" || (mode === "big" && !!beat?.clutch);
}

// What the lit pad says, by event, and the call to throw.
export const STEP_WORDS = { shot: "DRIVE", discus: "TURN", hammer: "TURN", jav: "RUN" };
export const RELEASE_WORDS = { shot: "PUT!", discus: "THROW!", hammer: "THROW!", jav: "THROW!" };
// How long the run-up takes at full speed (ms). A stalled runner takes about three times as long.
const RUNUP_MS = {
  balanced: { shot: 1200, discus: 1500, hammer: 1700, jav: 1800 },
  attack: { shot: 1600, discus: 2000, hammer: 2300, jav: 2600 },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// stats: [Power, Technique, Speed, Focus]. rand: () => [0, 1).
export function buildPattern(event, tactic, { stats = [50, 50, 50, 50], stamina = 100, clutch = false, perfectSkill = false } = {}, rand = Math.random) {
  if (!EVENTS[event]) event = "jav";
  if (!["safe", "balanced", "attack"].includes(tactic)) tactic = "balanced";
  const [, technique, speed, focus] = stats,
    tired = stamina < 40,
    attack = tactic === "attack";
  const runup = tactic === "safe" ? null : {
    ms: RUNUP_MS[tactic][event],
    // Each tap closes part of the gap to top speed; quicker taps close more.
    gain: (attack ? 0.44 : 0.34) + speed * 0.0008,
    // Speed drains away between taps.
    decay: (attack ? 0.45 : 0.4) * (tired ? 1.25 : 1),
    // A tap this long after the pad lights still counts, but for less (ms).
    reach: attack ? 400 : 480,
    // The chance an All out pad lights on the same side again.
    shuffle: attack ? clamp(0.5 * (1 - focus / 200) + (clutch ? 0.15 : 0), 0.15, 0.65) : 0,
    first: rand() < 0.5 ? "L" : "R",
    // Run-up speed needed for a perfect or a clean release. All out asks a little less of a
    // harder, shuffled pattern.
    perfectAt: attack ? 0.68 : 0.75,
    goodAt: attack ? 0.4 : 0.45,
  };
  const bounce = tactic === "safe";
  const release = {
    bounce,
    // ms for the needle to charge from empty to the line.
    charge: bounce ? 1400 : attack ? 850 : 1100,
    center: bounce ? 0.62 : 0.78,
    perfect: clamp((bounce ? 0.06 : 0.035) + technique * 0.0006 + (perfectSkill ? 0.03 : 0), 0.03, 0.14) * (tired ? 0.85 : 1),
    good: clamp((bounce ? 0.2 : 0.12) + technique * 0.0012, 0.12, 0.34) * (tired ? 0.85 : 1),
    // Time to start the throw once the run-up reaches the line (ms).
    line: bounce ? Infinity : attack ? 700 : 1000,
  };
  return { event, tactic, runup, release, step: STEP_WORDS[event], word: RELEASE_WORDS[event] };
}

// A fresh attempt. Bank it starts at the line; the others start running.
export function startAttempt(pattern, now) {
  const r = pattern.runup;
  return { phase: r ? "runup" : "line", v: 0, d: 0, lit: r ? r.first : null, litAt: now, last: now, lineAt: r ? null : now, chargeAt: null,
    taps: 0, stumbles: 0, vSum: 0, wSum: 0, result: null };
}

// Move time on: speed drains, the thrower covers ground, a needle held too long crosses the line.
export function advanceAttempt(pattern, st, now) {
  const dt = Math.max(0, now - st.last);
  st.last = now;
  if (st.phase === "runup") {
    const r = pattern.runup;
    st.v = Math.max(0, st.v - r.decay * dt / 1000);
    const dd = dt / r.ms * (0.3 + 0.7 * st.v);
    // The speed that counts is the speed over the back half of the run-up.
    const counted = Math.max(0, Math.min(st.d + dd, 1) - Math.max(st.d, 0.4));
    st.vSum += st.v * counted;
    st.wSum += counted;
    st.d = Math.min(1, st.d + dd);
    if (st.d >= 1) (st.phase = "line"), (st.lineAt = now), (st.lit = null);
  } else if (st.phase === "line" && now - st.lineAt > pattern.release.line) {
    st.phase = "done";
    st.result = { ...gradeAttempt(pattern, st, null), late: true };
  } else if (st.phase === "charge" && !pattern.release.bounce && needleOf(pattern, st, now) >= 1) {
    st.phase = "done";
    st.result = gradeAttempt(pattern, st, needleOf(pattern, st, now));
  }
  return st;
}

// A tap on a pad during the run-up: "step" for the lit pad, "stumble" for the other one.
export function tapPad(pattern, st, side, now, rand = Math.random) {
  if (st.phase !== "runup") return null;
  advanceAttempt(pattern, st, now);
  if (st.phase !== "runup") return null;
  const r = pattern.runup;
  if (side !== st.lit) {
    st.v *= 0.7;
    st.stumbles++;
    return "stumble";
  }
  const quick = clamp(1 - 0.6 * (now - st.litAt) / r.reach, 0.3, 1);
  st.v += r.gain * quick * (1 - st.v);
  st.taps++;
  st.lit = rand() < r.shuffle ? st.lit : st.lit === "L" ? "R" : "L";
  st.litAt = now;
  return "step";
}

// Press and hold to charge the throw, once at the line.
export function pressThrow(pattern, st, now) {
  advanceAttempt(pattern, st, now);
  if (st.phase !== "line") return false;
  st.phase = "charge";
  st.chargeAt = now;
  return true;
}
// Let go: the needle's position decides the release.
export function releaseThrow(pattern, st, now) {
  advanceAttempt(pattern, st, now);
  if (st.phase !== "charge") return st.result;
  st.phase = "done";
  st.result = gradeAttempt(pattern, st, needleOf(pattern, st, now));
  return st.result;
}

// Where the needle is, from 0 to 1. Bank it's needle swings back; the others pass the line at 1.
export function needleOf(pattern, st, now) {
  if (st.chargeAt == null) return 0;
  return needleAt(pattern.release, now - st.chargeAt);
}
export function needleAt(release, elapsed) {
  const p = Math.max(0, elapsed) / release.charge;
  if (!release.bounce) return p;
  const q = p % 2;
  return q <= 1 ? q : 2 - q;
}

// How well the run-up went, from 0 to 1. Bank it has none to spoil.
export function runupScore(pattern, st) {
  if (!pattern.runup) return 1;
  return st.wSum > 0 ? st.vSum / st.wSum : st.v;
}

// "perfect", "good", "poor", or "scratch" for crossing the line.
export function gradeAttempt(pattern, st, needle) {
  const runup = runupScore(pattern, st), r = pattern.release;
  if (!r.bounce && (needle == null || needle >= 1)) return { quality: "scratch", runup, needle };
  const off = Math.abs(needle - r.center);
  const need = pattern.runup || { perfectAt: 0, goodAt: 0 };
  const quality = off <= r.perfect && runup >= need.perfectAt ? "perfect" : off <= r.good && runup >= need.goodAt ? "good" : "poor";
  return { quality, runup, needle };
}

// How far through the delivery the thrower is, for the animation on the field (0 to 1).
export function windupOf(pattern, st, now) {
  if (!st) return 0;
  if (st.phase === "runup") return 0.85 * st.d;
  if (st.phase === "line") return pattern.runup ? 0.85 + 0.05 * Math.min(1, (now - st.lineAt) / 400) : 0.6;
  if (st.phase === "charge") return (pattern.runup ? 0.9 : 0.6) + (pattern.runup ? 0.08 : 0.35) * Math.min(1, needleOf(pattern, st, now));
  return 0.98;
}
