import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import { EVENT_IDS } from '../src/game-content.js';
import { createStadium } from '../src/render/stadium.js';
import { beatDuration, throwOffset, throwTiming } from '../src/render/meet-presentation.js';

// Record the production renderer's scene placement without rasterizing its pixel art.
class RecordingCanvas {
  constructor(width = 640, height = 360) {
    this.width = this.clientWidth = width;
    this.height = this.clientHeight = height;
    this.images = [];
    this.context = new Proxy({
      canvas: this,
      drawImage: (source, ...placement) => this.images.push({ source, placement }),
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    }, { get: (target, key) => target[key] ?? (() => {}) });
  }
  getContext() { return this.context; }
  scene() { return this.images.at(-2).placement; }
}

function fixture(event, mark = 70, extra = {}) {
  const s = G.newGame(721), i = EVENT_IDS.indexOf(event);
  for (const a of s.roster) {
    a.stats.fill(90);
    for (const ev of EVENT_IDS) a.mastery[ev] = 90;
  }
  G.enterCompetition(s, { kind: 'duel', tier: 0 });
  s.day = s.matchDay;
  G.startMatch(s);
  Object.assign(s.match, { eventIndex: i, entryIndex: 0, turnSide: 'home', phase: 'decide' });
  s.match.started[i] = true;
  const beat = G.decideThrow(s, 'balanced');
  Object.assign(beat, { mark, flightDistance: mark, ownBest: mark, newPb: false, worldRecord: false,
    tookLead: false, scoringSwing: 0, activations: [], ...extra });
  return { s, beat };
}

function renderer(width, height) {
  const canvas = new RecordingCanvas(width, height), stadium = createStadium(canvas);
  return {
    draw(s, now, view) {
      canvas.images.length = 0;
      stadium.draw(s, now, view);
      return canvas.scene();
    },
  };
}

function mockCanvas(t) {
  for (const [key, value] of Object.entries({ window: { devicePixelRatio: 1 }, OffscreenCanvas: RecordingCanvas })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  }
}

test('the next athlete is framed on the first setup frame after a full-distance result', t => {
  mockCanvas(t);
  for (const [width, height] of [[640, 360], [480, 645]]) {
    for (const [event, mark] of [['shot', 20], ['discus', 70], ['hammer', 85], ['jav', 100]]) {
      for (const extra of [{}, { newPb: true, previousPb: mark - 1 }, { foul: true, mark: null }]) {
        const { s, beat } = fixture(event, mark, extra), camera = renderer(width, height);
        const wide = camera.draw(s, 10000, { beat, elapsed: beatDuration(beat) - 1, pace: 1 });
        const next = { ...beat, side: 'away', athleteId: G.rivalAthlete(s).id, attempt: 0 };
        const setup = camera.draw(s, 10016, { beat: next, elapsed: 0, pace: 1 });
        const expected = renderer(width, height).draw(s, 10016, { beat: next, elapsed: 0, pace: 1 });
        assert.deepEqual(setup, expected, `${event}/${width}: setup must not inherit the sector camera`);
        assert(setup[2] > wide[2] * 1.5, `${event}: return to an athlete-sized frame`);
      }
    }
  }
});

test('a coaching decision cuts back immediately and the same athlete is ready for a later attempt', t => {
  mockCanvas(t);
  const { s, beat } = fixture('jav', 90);
  for (const next of [{ type: 'decide', eventIndex: beat.eventIndex }, { ...beat, attempt: beat.attempt + 1 }]) {
    const camera = renderer(640, 360);
    camera.draw(s, 10000, { beat, elapsed: beatDuration(beat) - 1, pace: 1 });
    const setup = camera.draw(s, 10016, { beat: next, elapsed: 0, pace: 1 });
    const expected = renderer(640, 360).draw(s, 10016, { beat: next, elapsed: 0, pace: 1 });
    assert.deepEqual(setup, expected, next.type);
  }
});

test('fast playback stays wide across athletes and switching back to watch frames the new throw', t => {
  mockCanvas(t);
  for (const pace of [2, 8]) {
    const { s, beat } = fixture('hammer', 85), camera = renderer(640, 360);
    const wide = camera.draw(s, 10000, { beat, elapsed: beatDuration(beat) - 1, pace });
    const next = { ...beat, attempt: beat.attempt + 1 };
    assert.deepEqual(camera.draw(s, 10016, { beat: next, elapsed: 0, pace }), wide);
    const setup = camera.draw(s, 10032, { beat: next, elapsed: 16, pace: 1 });
    const expected = renderer(640, 360).draw(s, 10032, { beat: next, elapsed: 16, pace: 1 });
    assert.deepEqual(setup, expected, 'a watched throw must not start in the fast overview');
  }
});

test('live flight and result pullback retain their eased movement within an attempt', t => {
  mockCanvas(t);
  const { s, beat } = fixture('jav', 90), camera = renderer(640, 360);
  const timing = throwTiming(beat), offset = throwOffset(beat);
  camera.draw(s, 10000, { beat, elapsed: offset + timing.releaseAt, pace: 1 });
  const moving = camera.draw(s, 10016, { beat, elapsed: offset + timing.landAt - 1, pace: 1 });
  const flightTarget = renderer(640, 360).draw(s, 10016, { beat, elapsed: offset + timing.landAt - 1, pace: 1 });
  assert.notDeepEqual(moving, flightTarget, 'flight still follows rather than cutting');
  const result = camera.draw(s, 10032, { beat, elapsed: beatDuration(beat) - 1, pace: 1 });
  const resultTarget = renderer(640, 360).draw(s, 10032, { beat, elapsed: beatDuration(beat) - 1, pace: 1 });
  assert.notDeepEqual(result, resultTarget, 'the full-distance result still pulls back');
});
