import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import { CLUB_PLOT } from '../src/game-content.js';

// A canvas that accepts every drawing call, so the whole map can be drawn without a browser.
const context = () => new Proxy({}, {
  get: (t, k) => k in t ? t[k] : k === 'getImageData' ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => ({ addColorStop() {} }),
  set: (t, k, v) => (t[k] = v, true),
});
class FakeCanvas { constructor(w = 800, h = 600) { this.width = this.clientWidth = w; this.height = this.clientHeight = h; } getContext() { return context(); } getBoundingClientRect() { return { left: 0, top: 0, width: this.width, height: this.height }; } }

test('the whole town map draws in every season, by day and by night, at every level', async (t) => {
  for (const [key, value] of Object.entries({ window: { devicePixelRatio: 1 }, OffscreenCanvas: FakeCanvas })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  }
  const { createWorld } = await import('../src/render/world.js');
  const types = ['gym', 'spa', 'lab', 'institute', 'indoor', 'testing', 'lodge', 'library', 'workshop', null, 'dorm', 'scout', 'cafe'];
  for (const level of [1, 3]) for (let season = 0; season < 4; season++) {
    const s = G.newGame(721); s.league = 4;
    s.plots = types.map((type, i) => i === CLUB_PLOT ? { type: 'club', level } : { type, level });
    let day = 1; while (G.seasonOfDay(day) !== season && day < 400) day++;
    s.day = day;
    const world = createWorld(new FakeCanvas());
    for (const dayProgress of [0.3, 0.97]) assert.doesNotThrow(() => world.draw(s, 1000 + season, { dayProgress }), `level ${level}, season ${season}, ${dayProgress}`);
  }
});
