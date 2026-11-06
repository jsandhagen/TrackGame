import test from 'node:test';
import assert from 'node:assert/strict';

// A canvas whose context records what is painted, so baking can be checked without a browser.
class Recorder {
  constructor(canvas) {
    Object.assign(this, { canvas, calls: [], fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over', imageSmoothingEnabled: true, transform: [0, 0] });
  }
  fillRect(x, y, w, h) { this.calls.push(['fillRect', this.fillStyle, x - this.transform[0], y - this.transform[1], w, h]); }
  drawImage(img, x, y) { this.calls.push(['drawImage', img, x, y]); }
  setTransform(a, b, c, d, e, f) { this.transform = [-e, -f]; }
  save() { this.calls.push(['save']); }
  restore() { this.calls.push(['restore']); }
  beginPath() {}
  closePath() {}
  rect(...a) { this.calls.push(['rect', ...a]); }
  moveTo() {}
  lineTo() {}
  clip() { this.calls.push(['clip']); }
  fill() { this.calls.push(['fill']); }
}
class FakeCanvas {
  constructor(w = 1, h = 1) { this.width = w; this.height = h; this.ctx = new Recorder(this); }
  getContext() { return this.ctx; }
}
globalThis.OffscreenCanvas = FakeCanvas;
const { bakePiece, tracer, skipping } = await import('../src/render/world.js');
const { rect, px } = await import('../src/render/pixel.js');
const paints = (sprite) => sprite.getContext().calls.filter(([op]) => op === 'fillRect');
const bake = (draw) => bakePiece({ y: 5, draw }, tracer());

test('scenery that never changes is baked whole into a sprite around what it paints', () => {
  const piece = bake((g) => { rect(g, 10, 20, 5, 5, '#ff0000'); rect(g, 30, 40, 2, 2, '#00ff00'); });
  assert.equal(piece.live, null);
  assert.deepEqual([piece.x, piece.y0, piece.x1, piece.y1], [9, 19, 33, 43]);
  // Painted where they were, relative to the sprite's corner.
  assert.deepEqual(paints(piece.sprite), [['fillRect', '#ff0000', 1, 1, 5, 5], ['fillRect', '#00ff00', 21, 21, 2, 2]]);
});

test('a moving detail stays live, and only what comes before it is baked', () => {
  const piece = bake((g, now) => { rect(g, 10, 20, 5, 5, '#ff0000'); px(g, 12 + (Math.floor(now / 500) % 6), 18, '#ffffff'); rect(g, 30, 40, 2, 2, '#00ff00'); });
  assert.equal(piece.skip, 1);
  assert.equal(typeof piece.live, 'function');
  assert.deepEqual(paints(piece.sprite), [['fillRect', '#ff0000', 1, 1, 5, 5]]);
});

test('a detail that changes only now and then (a twinkle, a gust) is still found', () => {
  const twinkle = bake((g, now) => { rect(g, 0, 0, 4, 4, '#336699'); px(g, 2, 2, Math.floor(now / 600) % 5 ? '#ffe08a' : '#fff6c8'); });
  const gust = bake((g, now) => { rect(g, 0, 0, 4, 4, '#336699'); rect(g, 0, 4 + (Math.sin(now / 900 + 3) > 0.7 ? 1 : 0), 4, 1, '#aa0000'); });
  for (const piece of [twinkle, gust]) assert.equal(piece.skip, 1);
});

test('a clip that changes with time ends the baked part before it', () => {
  const piece = bake((g, now) => {
    rect(g, 0, 0, 4, 4, '#336699');
    g.save(); g.beginPath(); g.rect(0, 0, 2 + (Math.floor(now / 700) % 3), 4); g.clip();
    rect(g, 0, 0, 8, 8, '#ffffff');
    g.restore();
  });
  assert.equal(piece.skip, 1);
});

test('drawing the tracer cannot follow keeps the piece fully live, and blank pieces are dropped', () => {
  const draw = (g) => { rect(g, 0, 0, 4, 4, '#336699'); g.fill(); };
  assert.deepEqual(bake(draw), { y: 5, live: draw });
  assert.equal(bake(() => {}), null);
});

test('the live remainder skips baked paints but keeps the colours they set', () => {
  const g = new FakeCanvas(100, 100).getContext(), ctx = skipping(g, 2);
  for (let frame = 0; frame < 2; frame++) {
    g.calls = [];
    ctx.restart();
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, 1, 1);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(1, 0, 1, 1);
    ctx.fillRect(2, 0, 1, 1);
    assert.deepEqual(g.calls, [['fillRect', '#123456', 2, 0, 1, 1]]);
    assert.equal(g.globalAlpha, 0.5);
  }
});
