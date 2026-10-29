// Animation speed and reading time are separate: highlights may shorten the
// delivery, but never flash a result past the coach.
export const CUTIN_MS = 1000;
export const SETUP_MS = 1500;
export const LAND_MS = 2800;
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
export function beatDuration(beat) {
  if (!beat) return 0;
  if (beat.type === "throw") return throwOffset(beat) + LAND_MS + (isHighlight(beat) ? HIGHLIGHT_MS : RESULT_MS);
  return { meetStart: 3200, eventStart: 2800, eventEnd: 4000, complete: 0, decide: 0 }[beat.type] ?? 1000;
}

// Highlight preferences never secretly accelerate routine throws at 1×.
export function advanceBeatClock(beat, elapsed, dt, speed = 1, settings = {}) {
  const rate = speed === 2 ? 2 : 1;
  return elapsed + dt * rate;
}

const placeName = n => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
export function throwResult(beat) {
  if (beat?.type !== "throw") return null;
  const headline = beat.worldRecord ? "World record!" : beat.newPb && beat.previousPb > 0 ? "Personal best!" :
    beat.foul ? "Foul" : beat.tookLead ? "Into the lead!" : beat.place && (!beat.previousPlace || beat.place < beat.previousPlace) ? `Up to ${placeName(beat.place)}` :
    beat.improvement > 0 ? "Series best" : beat.ownBest === beat.mark ? "Mark on the board" : "Best mark stands";
  const detail = [];
  if (beat.foul) detail.push(beat.ownBest == null ? "Still needs a legal mark" : `${beat.ownBest.toFixed(2)} m still counts`);
  if (beat.place) detail.push(`${placeName(beat.place)} place`);
  if (beat.scoringSwing > 0) detail.push(`+${beat.scoringSwing} team-point swing`);
  if (beat.qualified) detail.push(beat.finalistLimit ? "Inside the top " + beat.finalistLimit + " final cut" : "Into the top four");
  if (beat.newPb && beat.previousPb > 0) detail.push(`PB +${beat.pbDelta.toFixed(2)} m`);
  else if (beat.improvement > 0) detail.push(`Improved by ${beat.improvement.toFixed(2)} m`);
  if (!detail.length) detail.push(beat.foul ? (beat.ownBest == null ? "Still needs a legal mark" : `${beat.ownBest.toFixed(2)} m still counts`) : `${beat.ownBest.toFixed(2)} m still counts`);
  return { headline, detail: detail.join(" · ") };
}
