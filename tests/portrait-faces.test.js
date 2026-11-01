import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPRESSIONS, expressionOf } from '../src/render/portrait.js';
import { ELITES, SECRETS, SHOPKEEPER, HELPER_LOOK, BACKGROUNDS } from '../src/game-content.js';

test('characters wear their own expressions, and every one is drawable', () => {
  for (const look of [...ELITES.map((e) => e.look), ...Object.values(SECRETS).map((x) => x.look), SHOPKEEPER.look, HELPER_LOOK])
    assert(EXPRESSIONS[look.expression], JSON.stringify(look));
  assert(new Set(ELITES.map((e) => e.look.expression)).size >= 6, 'the elites do not all pull the same face');
});

test('a squad of athletes varies in expression, and mood shows on a low day', () => {
  const faces = new Set();
  for (const background of Object.keys(BACKGROUNDS)) for (const id of [1, 2]) faces.add(expressionOf({ id, background, condition: 70, look: {} }));
  assert(faces.size >= 8, [...faces].join(', '));
  assert.equal(expressionOf({ id: 3, background: 'clown', condition: 10, look: {} }), 'sad');
  assert.equal(expressionOf({ id: 3, background: 'clown', condition: 30, look: {} }), 'tired');
  assert.equal(expressionOf({ id: 3, background: 'clown', condition: 70, look: {} }, 'happy'), 'happy', 'a scene can ask for a face');
});
