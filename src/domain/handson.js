// Hands-on throws: a run-up of lit buttons (left or right), then a release needle.
// The tactic sets the difficulty. Bank it has no run-up and a wide, bouncing needle that can't
// foul. Controlled has a short run-up that alternates sides, and All out has a long, fast,
// shuffled one. With either of those, a needle that runs past the line is a foul.
// Athletes' stats shape the pattern: Technique widens the window, Speed gives more time per
// step, Focus keeps an All out run-up from shuffling. Low stamina tightens everything.
// A throw the game handles itself counts as "good", so playing hands-on is never required.
import { EVENTS } from "../game-content.js";

export const HANDS_ON_MODES = ["off", "big", "all"];

// Whether this decision is played by hand: every one, or only clutch moments.
export function handsOnApplies(settings, beat) {
  const mode = settings?.handsOn;
  return mode === "all" || (mode === "big" && !!beat?.clutch);
}

// Steps in the run-up by event and tactic. Bank it has none.
const STEPS = {
  balanced: { shot: 3, discus: 4, hammer: 5, jav: 6 },
  attack: { shot: 5, discus: 6, hammer: 8, jav: 10 },
};
// What each step is called on the button, by event.
export const STEP_WORDS = {
  shot: ["DRIVE"],
  discus: ["TURN"],
  hammer: ["WIND", "WIND", "TURN"],
  jav: ["STRIDE"],
};
export const RELEASE_WORDS = { shot: "PUT!", discus: "RELEASE!", hammer: "RELEASE!", jav: "THROW!" };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// stats: [Power, Technique, Speed, Focus]. rand: () => [0, 1).
export function buildPattern(event, tactic, { stats = [50, 50, 50, 50], stamina = 100, clutch = false, perfectSkill = false } = {}, rand = Math.random) {
  if (!EVENTS[event]) event = "jav";
  const [, technique, speed, focus] = stats,
    tired = stamina < 40 ? 0.85 : 1,
    count = tactic === "safe" ? 0 : STEPS[tactic === "attack" ? "attack" : "balanced"][event];
  // Controlled alternates sides. All out shuffles, less often with high Focus, more in a clutch moment.
  const shuffle = tactic === "attack" ? clamp(0.5 * (1 - focus / 200) + (clutch ? 0.15 : 0), 0.15, 0.65) : 0;
  const steps = [];
  let side = rand() < 0.5 ? "L" : "R";
  for (let i = 0; i < count; i++) {
    if (i > 0) side = rand() < shuffle ? side : side === "L" ? "R" : "L";
    const words = STEP_WORDS[event];
    steps.push({ side, word: words[Math.min(i, words.length - 1)] });
  }
  // Time to hit each lit button, in ms. The hammer's turns speed up as it goes.
  const base = (tactic === "attack" ? 620 : 900) + speed * 3;
  const windows = steps.map((_, i) => Math.round(base * tired * (event === "hammer" ? 1 - (0.25 * i) / Math.max(1, count - 1) : 1)));
  // The release: Bank it bounces back and forth with no foul line; the others sweep once to the line.
  const bounce = tactic === "safe";
  const sweep = Math.round((bounce ? 1500 : tactic === "attack" ? 950 : 1250) * (tired === 1 ? 1 : 0.9));
  const perfect = clamp((bounce ? 0.06 : 0.035) + technique * 0.0006 + (perfectSkill ? 0.03 : 0), 0.03, 0.14) * tired,
    good = clamp((bounce ? 0.2 : 0.12) + technique * 0.0012, 0.12, 0.34) * tired;
  return { event, tactic, steps, windows, release: { bounce, sweep, center: bounce ? 0.62 : 0.78, perfect, good }, word: RELEASE_WORDS[event] };
}

// Score one step: 1 for an instant, correct tap, down to 0.35 at the end of the window. A wrong
// button or no tap at all scores 0.
export function stepScore(window, reaction, correct) {
  if (!correct || reaction == null || reaction > window) return 0;
  return clamp(1 - 0.65 * (reaction / window), 0.35, 1);
}

// Where the needle is, from 0 to 1. A sweeping needle past 1 has crossed the line.
export function needleAt(release, elapsed) {
  const p = Math.max(0, elapsed) / release.sweep;
  if (!release.bounce) return p;
  const q = p % 2;
  return q <= 1 ? q : 2 - q;
}

// The overall result: "perfect", "good", "poor", or "scratch" for crossing the line.
export function gradeThrow(pattern, stepScores, needle) {
  const runup = pattern.steps.length ? stepScores.reduce((n, v) => n + v, 0) / pattern.steps.length : 1;
  const r = pattern.release;
  if (!r.bounce && (needle == null || needle >= 1)) return { quality: "scratch", runup };
  const off = Math.abs(needle - r.center);
  const quality = off <= r.perfect && runup >= 0.75 ? "perfect" : off <= r.good && runup >= 0.4 ? "good" : "poor";
  return { quality, runup };
}

// Tactic difficulty labels for the tactic buttons.
export const HANDS_ON_LEVEL = { safe: "Easy", balanced: "Medium", attack: "Hard" };
