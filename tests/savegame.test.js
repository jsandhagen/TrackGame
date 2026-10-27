import test from "node:test";
import assert from "node:assert/strict";
import { validateSave, makeExport } from "../src/domain/savegame.js";
const club = () => ({
  v: 2,
  money: 3000,
  fame: 0,
  year: 1,
  month: 0,
  day: 1,
  speed: 3,
  nextId: 2,
  grid: [{ t: "club", lv: 1 }, ...Array(29).fill(null)],
  athletes: [
    {
      id: 1,
      name: "Mara",
      evt: "shot",
      pow: 25,
      tec: 24,
      spd: 20,
      foc: 23,
      energy: 100,
      talent: 76,
      lv: 1,
      xp: 0,
      salary: 180,
      inj: 0,
    },
  ],
  league: [{ name: "Ring & Sector", mine: true, pts: 0 }],
  counters: { wins: 0, tierWins: [0, 0, 0, 0, 0] },
  log: [],
  history: [],
  combos: [],
  goalsDone: [],
  records: {},
});
test("old prototype saves migrate and importing is paused without mutating the backup", () => {
  const old = club();
  assert.equal(validateSave(old).speed, 0);
  assert.equal(old.speed, 3);
  assert.equal(validateSave(makeExport(old)).athletes[0].name, "Mara");
});
test("bad imports cannot replace a working club", () => {
  const data = club();
  data.athletes[0].evt = "injected";
  assert.throws(() => validateSave(data));
  data.athletes[0].evt = "shot";
  data.athletes[0].energy = NaN;
  assert.throws(() => validateSave(data));
  assert.throws(() => validateSave({ v: 2 }));
});
test("duplicate athletes and malformed record data are rejected", () => {
  const data = club();
  data.athletes.push(structuredClone(data.athletes[0]));
  assert.throws(() => validateSave(data));
  data.athletes.pop();
  data.records.shot = { m: "bad", name: "Mara" };
  assert.throws(() => validateSave(data));
});
