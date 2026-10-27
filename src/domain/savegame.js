const EVENTS = new Set(["shot", "discus", "jav", "hammer"]);
const FACILITIES = new Set([
  "club",
  "shot",
  "discus",
  "jav",
  "hammer",
  "weights",
  "sprint",
  "medball",
  "film",
  "physio",
  "ice",
  "kitchen",
  "stand",
  "trees",
  "statue",
]);
const PLANS = new Set(["base", "technique", "sharpen", "taper"]);
const TRAITS = new Set([
  "technician",
  "powerhouse",
  "explosive",
  "composed",
  "durable",
]);
function fail() {
  throw new Error("This is not a compatible Ring & Sector save.");
}
function integer(n, min, max) {
  return Number.isInteger(n) && n >= min && n <= max;
}
function number(n, min, max) {
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
}
export function validateSave(input) {
  const s = structuredClone(
    input?.format === "ring-sector-save" ? input.state : input,
  );
  if (
    !s ||
    s.v !== 2 ||
    !integer(s.day, 1, 28) ||
    !integer(s.month, 0, 11) ||
    !integer(s.year, 1, 10000) ||
    !number(s.money, -1e9, 1e12) ||
    !number(s.fame, 0, 1e12)
  )
    fail();
  if (
    !Array.isArray(s.grid) ||
    s.grid.length !== 30 ||
    !s.grid.some((f) => f?.t === "club") ||
    !Array.isArray(s.athletes) ||
    s.athletes.length > 6
  )
    fail();
  for (const f of s.grid)
    if (f && (!FACILITIES.has(f.t) || !integer(f.lv, 1, 5))) fail();
  const ids = new Set();
  for (const a of s.athletes) {
    if (
      !integer(a.id, 1, 1e9) ||
      ids.has(a.id) ||
      typeof a.name !== "string" ||
      a.name.length > 100 ||
      !EVENTS.has(a.evt)
    )
      fail();
    ids.add(a.id);
    for (const k of ["pow", "tec", "spd", "foc", "energy", "talent"])
      if (!number(a[k], 0, 100)) fail();
    if (
      !integer(a.lv, 1, 100000) ||
      !number(a.xp, 0, 1e12) ||
      !number(a.salary, 0, 1e9) ||
      !integer(a.inj, 0, 10000)
    )
      fail();
    if (a.plan && !PLANS.has(a.plan)) fail();
    if (a.trait && !TRAITS.has(a.trait)) fail();
    if (a.fatigue != null && !number(a.fatigue, 0, 100)) fail();
    if (a.form != null && !number(a.form, 0, 100)) fail();
    a.st = "idle";
    a.x = 24;
    a.y = 47;
    a.timer = 0;
  }
  if (
    !Array.isArray(s.league) ||
    s.league.length > 30 ||
    !s.league.some((c) => c.mine) ||
    s.league.some(
      (c) =>
        typeof c.name !== "string" ||
        c.name.length > 100 ||
        !number(c.pts, 0, 1e12),
    )
  )
    fail();
  if (
    !s.counters ||
    !Array.isArray(s.counters.tierWins) ||
    s.counters.tierWins.length !== 5 ||
    !Array.isArray(s.log) ||
    !Array.isArray(s.history) ||
    !Array.isArray(s.combos) ||
    !Array.isArray(s.goalsDone) ||
    !s.records
  )
    fail();
  for (const [event, record] of Object.entries(s.records))
    if (
      !EVENTS.has(event) ||
      !record ||
      !number(record.m, 0, 1000) ||
      typeof record.name !== "string" ||
      record.name.length > 100
    )
      fail();
  if (
    s.log.some(
      (l) =>
        typeof l.t !== "string" ||
        typeof l.d !== "string" ||
        l.t.length > 3000 ||
        l.d.length > 100,
    )
  )
    fail();
  if (
    s.history.some((h) => typeof h.label !== "string" || !Array.isArray(h.res))
  )
    fail();
  if (s.counters.tierWins.some((n) => !integer(n, 0, 1e9))) fail();
  if (
    s.athletes.some(
      (a) =>
        a.development &&
        (!integer(a.development.sessions, 0, 1e9) ||
          !integer(a.development.meets, 0, 1e9)),
    )
  )
    fail();
  s.nextId = Math.max(
    Number(s.nextId) || 1,
    ...s.athletes.map((a) => a.id + 1),
  );
  s.speed = 0;
  s.playRate = 1;
  s.log = s.log.slice(0, 60);
  s.history = s.history.slice(0, 14);
  return s;
}
export function makeExport(state) {
  return {
    format: "ring-sector-save",
    version: 1,
    exportedAt: new Date().toISOString(),
    state: validateSave(state),
  };
}
