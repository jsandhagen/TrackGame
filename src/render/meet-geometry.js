export const SCENE_HEIGHT = 360;
export const THROW_ORIGIN = { x: 96, y: 266 };

// An oblique view of the ground plane. Angles and distances are measured on
// that plane first; the same projection draws sectors, arcs and landing marks.
export function throwingSector(event, width, span) {
  const origin = THROW_ORIGIN;
  const halfAngle = (event === "jav" ? 28.96 : 34.92) * Math.PI / 360;
  const ppm = Math.min(570, width - origin.x - 36) / span;
  const point = (metres, angle = 0) => {
    const forward = metres * Math.cos(angle) * ppm;
    const sideways = metres * Math.sin(angle) * ppm;
    return [origin.x + forward, origin.y - forward * 0.10 + sideways * 0.45];
  };
  const arc = (metres, steps = 32) => Array.from({length:steps + 1}, (_,i) => point(metres, -halfAngle + 2 * halfAngle * i / steps));
  const centerY = x => origin.y - (x - origin.x) * 0.10;
  const upperY = x => centerY(x) - (x - origin.x) * Math.tan(halfAngle) * 0.45;
  const lowerY = x => centerY(x) + (x - origin.x) * Math.tan(halfAngle) * 0.45;
  return { origin, halfAngle, ppm, point, arc, centerY, upperY, lowerY };
}

// Fit the full venue between overlays; never crop the field to preserve a
// minimum sprite size. CSS gives landscape a separate scoreboard column.
export function meetCamera(width, height, {insetTop = 0, insetBottom = 0, dpr = 1} = {}) {
  const available = Math.max(1, height - insetTop - insetBottom);
  const scale = Math.min(width / (width > height ? 640 : 480), available / SCENE_HEIGHT, dpr * 1.5);
  return { scale, width:Math.ceil(width / scale), height:Math.ceil(height / scale), top:(insetTop + (available - SCENE_HEIGHT * scale) / 2) / scale };
}
