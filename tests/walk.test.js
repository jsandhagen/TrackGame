import test from 'node:test';
import assert from 'node:assert/strict';
import { feetOf, walkFrame, runFrame, WALK_STRIDE, RUN_STRIDE } from '../src/render/sprites.js';

// Walking forward d pixels, a foot on the ground must stay where it is in the world.
for (const [pose, frameAt, stride] of [['walk', walkFrame, WALK_STRIDE], ['run', runFrame, RUN_STRIDE]])
  test(`${pose} frames step by distance and keep the planted foot still`, () => {
    for (let d = 0; d < stride * 12; d += stride) {
      const a = feetOf({ pose, frame: frameAt(d) }), b = feetOf({ pose, frame: frameAt(d + stride) });
      const planted = [0, 1].filter((k) => a[k][1] === -1 && b[k][1] === -1);
      if (pose === 'walk') assert(planted.length >= 1, `walk frame ${frameAt(d)} → ${frameAt(d + stride)} keeps a foot down`);
      for (const k of planted) assert(Math.abs(a[k][0] - stride - b[k][0]) <= 1, `${pose}: the planted foot slides from ${a[k][0]} to ${b[k][0]}`);
    }
  });
