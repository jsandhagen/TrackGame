# City and facility pixel art

The club map is drawn procedurally at its logical resolution and scaled up with smoothing off. This pass applies a short set of pixel-art principles to the buildings, plots and streets around the stadium.

## Principles

- **One light, upper left.** Lit faces are the front and roof tops, with highlights on top and left edges. Shadow faces are the right-hand sides. Cast shadows fall down and to the right. A shadow that disagrees with the light is the error viewers notice most.
- **Hue-shifted ramps.** `tone(c, f)` in `src/render/pixel.js` moves shadows toward a cool blue-violet and highlights toward a warm cream, rather than only darkening or lightening one hue. That keeps shadows from going muddy brown. The older `shade` is unchanged for sprites and the meet.
- **Selective outlines.** `selOut(c)` gives each edge a dark taken from the surface beside it, darkest on the shadow side and softest on the lit left. Buildings stand off grass and paving without a flat black line.
- **Clusters, not noise.** Walls are textured in brick courses, stone blocks, timber boards or metal ribs. Roads carry sealed cracks and patches in small clusters. Single-pixel random speckle is gone from both.
- **Contact shadows.** A dark contact line sits where a wall meets the ground, and the shadow side darkens toward the ground. Cast shadows share one cool, translucent colour (`CAST`). A hedge shades the lawn below it, and the north kerb shades the road.
- **Readable upgrades.** Each level adds something visible:

  | Level | What appears on the building |
  | --- | --- |
  | 1 | The plain building with a timber nameboard |
  | 2 | A canopy in club colours over the door, planters, a chimney or rooftop plant, and a framed nameboard |
  | 3 | Club banners at both corners, solar panels or roof lights, a nameboard plated in club colours (with ink chosen for contrast), a kerbed apron and a lamp at the gate |

  Existing level steps stay: extra height, annexes and more glass roof lights.

## Reviewing

Run `npm run dev` and open `/scripts/city-study.html`. It renders the whole production map with every plot built at a chosen level, in any season, with two plot layouts. Open it on a high-density screen or zoom the browser to see individual pixels. `tests/city-art.test.js` checks that the ramps shift hue as described and that every facility paints more at each level.

## Sources

The full guides could not be fetched from this environment, so these principles come from search summaries of them and from common practice:

- [Pixnote, Shading & Lighting](https://pixnote.net/en/learn/shading)
- [Lospec, Pixel art outlines part 2: using color](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- [Pixel Art fundamentals](https://caioraphael1.github.io/studies/Art/Pixel%20Art/Pixel%20Art-fundamentals.html)
- [Slynyrd, Pixelblog 6: Light and Shadow](https://www.slynyrd.com/blog/2018/6/15/pixelblog-6-light-and-shadow)
- [Pixel Joint, A Wee Tutorial](https://pixeljoint.com/projects/wee/tutorial.asp)
- [Common pixel art mistakes](https://pixelpadpro.pages.dev/pixel-art-mistakes.html)
