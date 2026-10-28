import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import * as P from '../src/ui/pages.js';
import { line, idleSituation, emoteFor, throwSituation } from '../src/domain/voice.js';
import { measure } from '../src/render/font.js';
import { BACKGROUNDS } from '../src/game-content.js';

test('every athlete has short lines in their own voice for every situation', () => {
  const situations = ['idle', 'tired', 'happy', 'low', 'rest', 'meetSoon', 'levelUp', 'pb', 'lead', 'good', 'meh', 'foul', 'join'];
  for (const background of Object.keys(BACKGROUNDS))
    for (const situation of situations)
      for (let seed = 0; seed < 12; seed++) {
        const said = line({ background }, situation, seed);
        assert(said && said.length <= 18, `${background}/${situation}: "${said}"`);
        assert(measure(said) < 120, 'fits a pixel bubble');
      }
  assert.equal(line({ background: 'chess' }, 'pb', 0), 'AS CALCULATED.');
  assert.match(line({ background: 'farm', secret: 'r7' }, 'idle', 0), /BEEP|CALIBRATING/);
});

test('what athletes say follows how they are doing', () => {
  const s = G.newGame(40), a = s.roster[0];
  a.stamina = 20; assert.equal(idleSituation(s, a), 'tired'); assert.equal(emoteFor(s, a), '~');
  a.stamina = 90; a.injury = 2; assert.equal(idleSituation(s, a), 'rest');
  a.injury = 0; a.condition = 95; assert.equal(idleSituation(s, a), 'happy'); assert.equal(emoteFor(s, a), '♥');
  assert.equal(throwSituation({ mark: null }), 'foul');
  assert.equal(throwSituation({ mark: 12, newPb: true, previousPb: 11 }), 'pb');
  assert.equal(throwSituation({ mark: 12, tookLead: true }), 'lead');
});

test('a new teammate is introduced with their background and first words', () => {
  const s = G.newGame(41), a = s.roster[2];
  const html = P.newcomer(s, a);
  assert.match(html, /Ballet Dancer/); assert.match(html, /quote/); assert.match(html, /OVR/);
});
