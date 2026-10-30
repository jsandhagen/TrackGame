// A broadcast camera for the meet. The scene is drawn once at its own logical size; the camera
// picks which part of it fills the screen. Shots are rectangles in scene coordinates: the camera
// zooms until the rectangle fits the space between the overlays, never past the scene's edges.

export const ZOOM_MAX = 2.6;

// view: { width, height } is the visible area in scene units at zoom 1; sceneHeight is the
// height of the drawn scene. Zoom 1 is the full venue the meet has always shown.
export function clampCamera(cam, view) {
  const z = Math.max(1, cam.z),
    halfW = view.width / (2 * z),
    halfH = view.height / (2 * z),
    x = Math.max(halfW, Math.min(view.width - halfW, cam.x)),
    y = halfH * 2 >= view.sceneHeight ? view.sceneHeight / 2 : Math.max(halfH, Math.min(view.sceneHeight - halfH, cam.y));
  return { x, y, z };
}

// The camera that fits a shot: [x0, y0, x1, y1] in scene coordinates.
export function frameShot(rect, view, cap = ZOOM_MAX) {
  const w = Math.max(1, rect[2] - rect[0]),
    h = Math.max(1, rect[3] - rect[1]),
    z = Math.max(1, Math.min(cap, view.width / w, view.height / h));
  return clampCamera({ x: (rect[0] + rect[2]) / 2, y: (rect[1] + rect[3]) / 2, z }, view);
}

// Ease towards the target. Zoom moves in log space so pulling out feels as even as pushing in.
// rate is per second; dt in milliseconds.
export function followCamera(cam, target, dt, rate, view) {
  if (!cam) return { ...target };
  const k = 1 - Math.exp((-Math.max(0, dt) * rate) / 1000),
    z = Math.exp(Math.log(cam.z) + (Math.log(target.z) - Math.log(cam.z)) * k);
  return clampCamera({ x: cam.x + (target.x - cam.x) * k, y: cam.y + (target.y - cam.y) * k, z }, view);
}

// Which shot each moment of a throw deserves.
//  - Before release: tight on the thrower, with room in front of them.
//  - In flight: follow the implement, keeping it and its shadow in frame.
//  - Just landed: on the mark.
//  - Reading the result: from the circle out past the mark and the leader.
// Anything else (meet and event openings, results, decisions) sees the whole venue or thrower.
export function throwShot(phase, f) {
  if (phase === "thrower") {
    const [x, y] = f.thrower;
    return { rect: [x - 80, y - 104, x + 96, y + 24], rate: 4 };
  }
  if (phase === "flight") {
    const [ix, iy] = f.implement, [gx, gy] = f.ground,
      top = Math.min(iy, gy) - 30, bottom = Math.max(gy + 28, top + 120),
      left = Math.min(gx - 100, ix - 60), right = Math.max(gx + 130, left + 230);
    return { rect: [left, top, right, bottom], rate: 8, cap: 2.2 };
  }
  if (phase === "landing") {
    const [ex, ey] = f.landing;
    return { rect: [ex - 120, ey - 74, ex + 110, ey + 40], rate: 5, cap: 2.2 };
  }
  if (phase === "result") {
    const [ox, oy] = f.origin,
      far = Math.max(f.landing?.[0] ?? ox, f.lead ?? ox) + 80;
    return { rect: [ox - 60, Math.min(oy - 110, f.upperAt(far) - 30), far, oy + 34], rate: 2.5 };
  }
  return { rect: null, rate: 3 };
}
