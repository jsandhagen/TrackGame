import test from "node:test";
import assert from "node:assert/strict";
import * as G from "./helpers/developed-club.js";
import { STADIUM } from "../src/game-content.js";

test("the home stands fill in proportion to the fans, up to the grandstand's capacity", () => {
  const s = G.newGame(11);
  s.stadium.stands = 2;
  const cap = STADIUM.stands.capacity[2];
  s.fans = 0;
  assert(G.stadiumCrowd(s, { meet: true, weather: "cloudy" }).fill < 0.05, "an unknown club plays to near-empty stands");
  s.fans = 1000;
  const half = G.stadiumCrowd(s, { meet: true, weather: "cloudy" });
  s.fans = 2000;
  const more = G.stadiumCrowd(s, { meet: true, weather: "cloudy" });
  assert.equal(more.attendance, half.attendance * 2, "twice the fans, twice the crowd");
  s.fans = 100000;
  assert.equal(G.stadiumCrowd(s, { meet: true, weather: "cloudy" }).attendance, cap, "never more than the stands hold");
  s.fans = 1000;
  assert(G.stadiumCrowd(s, { meet: true, weather: "rain" }).attendance < half.attendance, "rain keeps people at home");
  assert(G.stadiumCrowd(s, { weather: "cloudy" }).attendance < half.attendance, "an ordinary day draws fewer than a meet");
  s.stadium.stands = 3;
  assert(G.stadiumCrowd(s, { meet: true, weather: "cloudy" }).fill < half.fill, "the same fans look sparse in a bigger stadium");
});
