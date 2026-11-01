// A broadcast camera for the meet. The scene is drawn once at its own logical size; the camera
// picks which part of it fills the screen. Shots are rectangles in scene coordinates: the camera
// zooms until the rectangle fits the space between the overlays, never past the scene's edges.

export const ZOOM_MAX = 2.6;

// width/height describe the viewport at zoom 1; sceneWidth/sceneHeight describe the venue.
// A physical sector can span several screens. minZoom fits that field, while sceneTop leaves
// sky above the usual venue for high flights.
export function clampCamera(cam, view) {
  const floor = view.minZoom ?? 1, sceneWidth = view.sceneWidth ?? view.width, top = view.sceneTop ?? 0,
    z = Math.max(floor, cam.z),
    halfW = view.width / (2 * z),
    halfH = view.height / (2 * z),
    x = Math.max(halfW, Math.min(sceneWidth - halfW, cam.x)),
    y = halfH * 2 >= view.sceneHeight ? top + view.sceneHeight / 2 : Math.max(top + halfH, Math.min(top + view.sceneHeight - halfH, cam.y));
  return { x, y, z };
}

// The camera that fits a shot: [x0, y0, x1, y1] in scene coordinates.
export function frameShot(rect, view, cap = ZOOM_MAX) {
  const w = Math.max(1, rect[2] - rect[0]),
    h = Math.max(1, rect[3] - rect[1]),
    z = Math.max(view.minZoom ?? 1, Math.min(cap, view.width / w, view.height / h));
  return clampCamera({ x: (rect[0] + rect[2]) / 2, y: (rect[1] + rect[3]) / 2, z }, view);
}

// The fastest the camera may move: zoom by at most this factor per second, and pan by at most
// this many screen-widths per second. Beyond that a move reads as a jump, not a camera.
export const MAX_ZOOM_RATE = 1.9;
export const MAX_PAN_RATE = 0.9;
// Ease towards the target, within those limits. Zoom moves in log space so pulling out feels as
// even as pushing in. rate is per second; dt in milliseconds.
// pan overrides the pan limit for one shot: a chase keeps up with the implement in flight.
export function followCamera(cam, target, dt, rate, view, pan = MAX_PAN_RATE) {
  if (!cam) return { ...target };
  const t = Math.max(0, dt) / 1000, k = 1 - Math.exp(-t * rate);
  const dz = Math.max(-1, Math.min(1, (Math.log(target.z) - Math.log(cam.z)) * k / (Math.log(MAX_ZOOM_RATE) * t || 1))) * Math.log(MAX_ZOOM_RATE) * t;
  const z = Math.exp(Math.log(cam.z) + (t ? dz : 0));
  let dx = (target.x - cam.x) * k, dy = (target.y - cam.y) * k;
  const limit = (pan * view.width / z) * t, d = Math.hypot(dx, dy);
  if (d > limit) (dx *= limit / d), (dy *= limit / d);
  return clampCamera({ x: cam.x + dx, y: cam.y + dy, z }, view);
}

// Which shot each moment of a throw deserves.
//  - Before release: tight on the thrower, with room in front of them.
//  - In flight: from the circle out past the implement and its shadow.
//  - Just landed: the circle and the mark.
//  - Reading the result: the same, out to the leader's line.
// Anything else (meet and event openings, results, decisions) sees the whole venue or thrower.
//
// Short flights widen from the thrower shot to include the mark. Long flights transition to
// a chase, hold on the landing, then pull back to show the circle, mark and lead line together.
//
// f.expect, when set, is where the throw should land (the shot put's short flight): every shot
// of that throw reaches out to it, so the athlete and the landing area share the frame from the
// start rather than the camera opening tight on the thrower.
const SPACE = { back: 80, ahead: 96, above: 104, below: 40, lead: 86, expect: 40 };
const ahead = (x, expect) => Math.max(x + SPACE.ahead, expect != null ? expect + SPACE.expect : -Infinity);
const reach = (origin, x, y, upperAt, ground = origin[1], expect) => [origin[0] - SPACE.back, Math.min(origin[1] - SPACE.above, y - 30, upperAt ? upperAt(x) - 24 : Infinity), Math.max(ahead(origin[0], expect), x + SPACE.lead), Math.max(origin[1] + SPACE.below, ground + SPACE.below)];
// f.chase (discus, hammer, javelin): once the flight outgrows CHASE_WIDTH the camera stops pulling
// back to keep the circle and runs with the implement instead, so a long throw carries the eye
// down the sector, past the distance lines, and lands well away from the circle. The landing
// holds that frame on the mark; the result then pulls back to show how far it went.
export const CHASE_WIDTH = 240;
export const FLIGHT_LEAD_MS = 300;
const chase = (rect, f) => (f.chase && rect[2] - rect[0] > CHASE_WIDTH ? [rect[2] - CHASE_WIDTH, rect[1], rect[2], rect[3]] : rect);
export function throwShot(phase, f) {
  if (phase === "thrower") {
    const [x, y] = f.thrower;
    return { rect: [x - SPACE.back, Math.min(y - SPACE.above, f.anticipate ? f.anticipate[1] - 30 : Infinity), ahead(x, f.expect), y + SPACE.below], rate: 4 };
  }
  if (phase === "flight") {
    const [ix, iy] = f.implement, [gx, gy] = f.ground, [ax, ay] = f.anticipate || f.implement;
    // Lead the rising implement a fraction of a second, so easing never leaves it above or
    // ahead of the camera. The measured landing stays concealed until impact.
    return { rect: chase(reach(f.origin, Math.max(ix, gx, ax), Math.min(iy, ay), f.upperAt, gy, f.expect), f), rate: 6, pan: f.chase ? 2 : undefined };
  }
  if (phase === "landing") return { rect: chase(reach(f.origin, f.landing[0], f.landing[1], f.upperAt, f.landing[1], f.expect), f), rate: 4 };
  if (phase === "result") {
    const far = Math.max(f.landing?.[0] ?? f.origin[0], f.lead ?? f.origin[0]);
    return { rect: reach(f.origin, far, f.landing?.[1] ?? f.origin[1], f.upperAt, f.landing?.[1], f.expect), rate: 2.5 };
  }
  return { rect: null, rate: 3 };
}
// At top speed throws pass in under a second: hold one steady frame per event, from the circle
// to the far end of the sector.
export function eventShot(origin, sectorEnd, upperAt) {
  return { rect: reach(origin, sectorEnd - SPACE.lead + 10, origin[1], upperAt), rate: 3 };
}
