export const SCENE_HEIGHT = 360;
// The ring and people already use roughly this scale. Keep metres at that scale too:
// a long sector extends beyond the screen instead of shrinking to fit the current field.
export const METRE_PX = 20;
export const SECTOR_DEPTH = 0.14;
export const AIRSPACE = 420;
// How far the throwing direction climbs the screen per pixel forward. Level with the track and
// the stands, so the field reads as one ground plane under the camera.
export const GROUND_SLOPE = 0;
// Height change along that direction, in whole pixels (never -0).
export const groundRise = dx => Math.round(-dx * GROUND_SLOPE) || 0;
export const THROW_ORIGIN = { x: 96, y: 214 };
const JAVELIN_ORIGIN = { x: 128, y: 214 }; // room for the withdrawn run and long penultimate

// An oblique view of the ground plane. Angles and distances are measured on
// that plane first; the same projection draws sectors, arcs and landing marks.
export function throwingSector(event, width, span) {
  const origin = event === "jav" ? JAVELIN_ORIGIN : THROW_ORIGIN;
  const halfAngle = (event === "jav" ? 28.96 : 34.92) * Math.PI / 360;
  const ppm = METRE_PX;
  const point = (metres, angle = 0) => {
    const forward = metres * Math.cos(angle) * ppm;
    const sideways = metres * Math.sin(angle) * ppm;
    return [origin.x + forward, origin.y - forward * GROUND_SLOPE + sideways * SECTOR_DEPTH];
  };
  const arc = (metres, steps = 32) => Array.from({length:steps + 1}, (_,i) => point(metres, -halfAngle + 2 * halfAngle * i / steps));
  const centerY = x => origin.y - (x - origin.x) * GROUND_SLOPE;
  const upperY = x => centerY(x) - (x - origin.x) * Math.tan(halfAngle) * SECTOR_DEPTH;
  const lowerY = x => centerY(x) + (x - origin.x) * Math.tan(halfAngle) * SECTOR_DEPTH;
  return { origin, halfAngle, ppm, point, arc, centerY, upperY, lowerY,
    width: Math.max(width, Math.ceil(origin.x + span * ppm + 96)) };
}

// Size the logical viewport between overlays. The broadcast camera fits or travels along the
// larger physical field within it. CSS gives landscape a separate scoreboard column.
export function meetCamera(width, height, {insetTop = 0, insetBottom = 0, dpr = 1} = {}) {
  const available = Math.max(1, height - insetTop - insetBottom);
  const scale = Math.min(width / (width > height ? 640 : 480), available / SCENE_HEIGHT, dpr * 1.5);
  return { scale, width:Math.ceil(width / scale), height:Math.ceil(height / scale), top:(insetTop + (available - SCENE_HEIGHT * scale) / 2) / scale };
}
