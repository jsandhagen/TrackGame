import test from "node:test";
import assert from "node:assert/strict";
import * as G from "./helpers/developed-club.js";
import { validateCampaign } from "../src/domain/campaign-save.js";

test("kit and stadium looks unlock through progress and cost club money", () => {
  const s = G.newGame(5);
  assert.equal(s.colors.kit, "plain");
  assert.equal(s.stadiumStyle.seats, "solid");
  assert.deepEqual(s.wardrobe.kit, ["plain"]);
  s.fans = 0;
  assert.match(G.customProblem(s, "kit", "stripes"), /120 fans/);
  s.fans = 500;
  s.money = 100;
  assert.equal(G.customProblem(s, "kit", "stripes"), "Not enough money");
  s.money = 1000;
  assert(G.buyCustom(s, "kit", "stripes"));
  assert.equal(s.money, 700);
  assert.equal(s.colors.kit, "stripes");
  assert(!G.buyCustom(s, "kit", "stripes"), "already owned");
  assert(G.useCustom(s, "kit", "plain") && s.colors.kit === "plain");
  assert(!G.useCustom(s, "kit", "hoops"), "not owned yet");
  assert.match(G.customLock(s, "seats", "stripes"), /covered main stand/);
  s.stadium.stands = 2;
  assert(G.buyCustom(s, "seats", "stripes"));
  assert.match(G.customLock(s, "track", "purple"), /championship track/);
  assert.match(G.customLock(s, "facade", "brick"), /stands all round/);
  assert.match(G.customLock(s, "towerStyle", "lattice"), /Olympic stadium/);
  s.stadium.stands = 4;
  s.money = 5000;
  assert(G.buyCustom(s, "towerStyle", "lattice") && s.stadiumStyle.towerStyle === "lattice");
  assert(G.buyCustom(s, "towerColors", "club") && s.stadiumStyle.towerColors === "club");
  assert(G.buyCustom(s, "facade", "brick") && s.stadiumStyle.facade === "brick");
  G.renameStadium(s, "  The <Ring>  Oval!! ");
  assert.equal(s.stadiumStyle.name, "The Ring Oval");
});

test("customisation survives saving, and older saves get the defaults", () => {
  const s = G.newGame(6);
  s.fans = 400;
  s.money = 2000;
  G.buyCustom(s, "shorts", "white");
  G.renameStadium(s, "Sector Park");
  const back = validateCampaign(JSON.parse(JSON.stringify(s)));
  assert.equal(back.colors.shorts, "white");
  assert.equal(back.stadiumStyle.name, "Sector Park");
  const old = JSON.parse(JSON.stringify(s));
  delete old.wardrobe;
  delete old.stadiumStyle;
  delete old.colors.kit;
  old.colors.shorts = "white";
  const migrated = validateCampaign(old);
  assert.equal(migrated.colors.shorts, "dark", "an unowned choice falls back to the default");
  assert.equal(migrated.stadiumStyle.track, "auto");
});

test('building and upgrading show the bill and what changes before anything is spent', async () => {
  const P = await import('../src/ui/pages.js');
  const s = G.newGame(60), free = G.unlockedPlots(s).find((i) => !s.plots[i]), money = s.money;
  const build = P.buildConfirmBody(s, free, 'cafe');
  assert.match(build, /Cost/); assert.match(build, /Upkeep/); assert.match(build, /Funds after/); assert.match(build, /data-building="cafe:1"/);
  const gym = s.plots.findIndex((p) => p?.type === 'gym');
  assert.match(P.upgradeConfirmBody(s, gym), /→/);
  assert.match(P.stadiumConfirmBody(s, 'discus'), /Cost/);
  assert.equal(s.money, money, 'showing a confirmation spends nothing');
  assert.deepEqual(s.plots[free], null);
});
