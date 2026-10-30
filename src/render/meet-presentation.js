import { playbackRate } from "../platform/pacing.js";
import { EVENTS, EVENT_IDS } from "../game-content.js";

// Animation speed and reading time are separate: highlights may shorten the
// delivery, but never flash a result past the coach.
export const CUTIN_MS = 1000;
export const SETUP_MS = 700;
export const RESULT_MS = 3200;
export const HIGHLIGHT_MS = 4000;
export const ROUTINE_MS = RESULT_MS;

export function isHighlight(beat) {
  return beat?.type === "throw" && !!(beat.worldRecord || beat.signature ||
    (beat.newPb && beat.previousPb > 0) ||
    (beat.attempt > 0 && (beat.scoringSwing > 0 || beat.tookLead || beat.qualified)));
}
export function hasCutIn(beat) {
  return beat?.type === "throw" && !!beat.activations?.length && isHighlight(beat);
}
export const throwOffset = beat => SETUP_MS + (hasCutIn(beat) ? CUTIN_MS : 0);

// Short techniques drop the standing start a full event window would leave them, so every thrower
// gets going within a moment of stepping up. Ms trimmed, by form.
const TECHNIQUE_TRIM = { shot: [400, 250, 200, 0], jav: [1000, 75, 165, 235], discus: [800, 500, 0, 0] };
export const techniqueTrim = (event, form) => TECHNIQUE_TRIM[event]?.[form] ?? 0;
// Give the delivery time to build speed. Flight depends on the actual mark,
// rather than stretching a short put across the same time as a long javelin.
export function throwTiming(beat = {}) {
  const event = EVENTS[beat?.event] ? beat.event : EVENT_IDS[beat?.eventIndex] || "shot";
  const measured = Number.isFinite(beat?.mark) && beat.mark > 0 ? beat.mark : beat?.flightDistance;
  const distance = Number.isFinite(measured) && measured > 0 ? measured : EVENTS[event].min;
  const releaseAt = { shot: 2000, discus: 2400, hammer: 3000, jav: 2600 }[event] - techniqueTrim(event, beat?.form);
  const flightMs = Math.round(Math.max(400, Math.min(1400, Math.sqrt(distance) * 140)));
  return {
    readyMs: 300, releaseAt, releaseMs: event === "hammer" || event === "jav" ? 120 : 180,
    recoveryMs: 900, flightMs, landAt: releaseAt + flightMs, distance,
    arcHeight: Math.max(8, { shot: 34, discus: 60, hammer: 72, jav: 80 }[event] * Math.min(1.25, distance / EVENTS[event].max)),
  };
}

export function throwPhase(timing, elapsed) {
  if (elapsed < timing.readyMs) return ["ready", Math.max(0, elapsed) / timing.readyMs];
  if (elapsed < timing.releaseAt) return ["technique", (elapsed - timing.readyMs) / (timing.releaseAt - timing.readyMs)];
  if (elapsed < timing.releaseAt + timing.releaseMs) return ["release", (elapsed - timing.releaseAt) / timing.releaseMs];
  return ["follow", Math.min(1, (elapsed - timing.releaseAt - timing.releaseMs) / timing.recoveryMs)];
}

// Constant downward acceleration gives the implement weight, including at impact.
export function flightPoint(start, end, progress, height) {
  const p = Math.max(0, Math.min(1, progress));
  return [start[0] + (end[0] - start[0]) * p, start[1] + (end[1] - start[1]) * p - 4 * p * (1 - p) * height];
}

export function beatDuration(beat) {
  if (!beat) return 0;
  if (beat.type === "throw") return throwOffset(beat) + throwTiming(beat).landAt + (isHighlight(beat) ? HIGHLIGHT_MS : RESULT_MS);
  return { meetStart: 3200, eventStart: 2800, eventEnd: 4000, complete: 0, decide: 0 }[beat.type] ?? 1000;
}

// Highlight preferences never secretly accelerate routine throws at 1×.
export function advanceBeatClock(beat, elapsed, dt, speed = 1, settings = {}) {
  return elapsed + dt * playbackRate(speed);
}

const placeName = n => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
export function throwResult(beat) {
  if (beat?.type !== "throw") return null;
  const headline = beat.worldRecord ? "World record!" : beat.newPb && beat.previousPb > 0 ? "Personal best!" :
    beat.foul ? "Foul" : beat.qualified && beat.finalistLimit ? "Into the final!" : beat.madeStandard ? "Championship standard!" : beat.tookLead ? "Into the lead!" : beat.place && (!beat.previousPlace || beat.place < beat.previousPlace) ? `Up to ${placeName(beat.place)}` :
    beat.improvement > 0 ? "Series best" : beat.ownBest === beat.mark ? "Mark on the board" : "Best mark stands";
  const detail = [];
  if (beat.foul) detail.push(beat.ownBest == null ? "Still needs a legal mark" : `${beat.ownBest.toFixed(2)} m still counts`);
  if (beat.place) detail.push(`${placeName(beat.place)} place`);
  if (beat.scoringSwing > 0) detail.push(`+${beat.scoringSwing} team-point swing`);
  if (beat.qualified) detail.push(beat.finalistLimit ? "Inside the top " + beat.finalistLimit + " final cut" : "Into the top four");
  if (beat.madeStandard) detail.push("Qualified for the championship");
  if (beat.newPb && beat.previousPb > 0) detail.push(`PB +${beat.pbDelta.toFixed(2)} m`);
  else if (beat.improvement > 0) detail.push(`Improved by ${beat.improvement.toFixed(2)} m`);
  if (!detail.length) detail.push(beat.foul ? (beat.ownBest == null ? "Still needs a legal mark" : `${beat.ownBest.toFixed(2)} m still counts`) : `${beat.ownBest.toFixed(2)} m still counts`);
  return { headline, detail: detail.join(" · ") };
}
