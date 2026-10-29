// Mechanic tests use an established career so onboarding is tested independently.
export * from '../../src/domain/game.js';
import * as G from '../../src/domain/game.js';
export function newGame(seed) {
  const s = G.newGame(seed);
  delete s.onboarding;
  G.scout(s, true);
  return s;
}
