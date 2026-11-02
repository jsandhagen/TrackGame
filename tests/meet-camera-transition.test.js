import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import { EVENT_IDS } from '../src/game-content.js';
import { createStadium } from '../src/render/stadium.js';
import { beatDuration, throwOffset, throwTiming, throwPhase, LANDING_HOLD_MS } from '../src/render/meet-presentation.js';
import { meetCamera, throwingSector } from '../src/render/meet-geometry.js';
import { throwMotion } from '../src/render/throw-motion.js';

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
    scale() {
      const scene = canvas.images.at(-2);
      return scene.placement[2] / scene.source.width;
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

test('the production shot put camera opens close, tracks the put, then zooms out for the result', t => {
  mockCanvas(t);
  for (const [width, height] of [[640, 360], [480, 645]]) {
    for (const mark of [9, 23]) {
      const { s, beat } = fixture('shot', mark), camera = renderer(width, height);
      const setup = camera.draw(s, 0, { beat, elapsed: 0, pace: 1 });
      assert(camera.scale() / meetCamera(width, height).scale >= 2.4,
        `${mark} m/${width}: preparation must zoom in on the athlete`);
      const timing = throwTiming(beat), landingAt = throwOffset(beat) + timing.landAt + LANDING_HOLD_MS - 1;
      let landing;
      for (let at = 50; at <= landingAt; at += 50) {
        landing = camera.draw(s, at, { beat, elapsed: at, pace: 1 });
      }
      assert(landing[0] < setup[0] - 5, `${mark} m/${width}: the camera pans downfield with the put`);
      const landingScale = camera.scale();
      for (let at = landingAt + 50; at < beatDuration(beat); at += 50) {
        camera.draw(s, at, { beat, elapsed: at, pace: 1 });
      }
      assert(camera.scale() < landingScale * 0.9, `${mark} m/${width}: zoom out after the landing hold`);
    }
  }
});

test('the camera follows the whole javelin run-up and fast or reduced views include the runway', t => {
  mockCanvas(t);
  const origin = throwingSector('jav', 480, 110).origin;
  for (const [width, height] of [[640, 360], [480, 645]]) for (const form of [0, 1, 2, 3]) {
    for (const view of [{ pace: 1 }, { pace: 2 }, { pace: 8 }, { pace: 1, reduced: true }]) {
      const { s, beat } = fixture('jav', 80, { form }), camera = renderer(width, height);
      const timing = throwTiming(beat), end = throwOffset(beat) + timing.releaseAt;
      const setup = camera.draw(s, 0, { ...view, beat, elapsed: 0 });
      let last = setup;
      for (let at = 50; at < end; at += 50) {
        last = camera.draw(s, at, { ...view, beat, elapsed: at });
        const motion = throwMotion('jav', form, ...throwPhase(timing, at - throwOffset(beat)));
        const x = last[0] + (origin.x + motion.dx) * camera.scale();
        assert(x - 54 * camera.scale() >= -1 && x + 40 * camera.scale() <= width + 1,
          `form ${form}/${width}/${view.pace}/${!!view.reduced}: the athlete and carried javelin stay in view at ${at} ms`);
        if (view.pace > 1 || view.reduced) assert.deepEqual(last, setup, 'the approach overview stays still');
      }
      if (form > 0 && view.pace === 1 && !view.reduced) {
        assert(last[0] < setup[0] - 200 * camera.scale(), 'the camera travels down the runway with the athlete');
        assert(camera.scale() / meetCamera(width, height).scale > 2, 'the run-up keeps an athlete close-up');
      }
    }
  }
});
