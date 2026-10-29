# Throw animation references

The sprites are original pixel art. Athlete references guide the mechanics; proportions, poses and timing are adapted for the game's big-headed characters. No photographs, footage, athlete likenesses or branded kit are included as game assets.

## Reference cues by technique

| Event and game technique | Athlete reference | Movement carried into the animation |
| --- | --- | --- |
| Shot: standing put | The delivery portion of David Storl's glide | Load the right leg, drive through the hips, keep the shot at the jaw and strike late. The beginner omits the glide. |
| Shot: glide / power glide | David Storl | Stay low through the drive, catch on the right foot with closed shoulders, plant the left and rise into the put. Power glide adds a reverse after release. |
| Shot: rotational | Ryan Crouser | Wide entry sweep, low travel across the circle, a closed right-foot catch, left-foot plant and late strike. This is a compact conventional rotation, not a recreation of Crouser's individual slide variant. |
| Discus: standing / half turn | Delivery and centre-pivot portions of Sandra Perković's throw | Keep a long trailing arm while the feet and hips lead. Beginners use an abbreviated entry. |
| Discus: full turn / fast spin | Sandra Perković (now Sandra Elkasević) | Wide leg sweep, low travel, right-foot pivot, left-foot plant and an unwinding chest before the arm comes through. |
| Hammer: winds and turns | Yuriy Sedykh | Two winds, alternating double and single support, lowered hips against the pull, and a final planted lift. Four wind poses replace the abrupt low/overhead switch. |
| Javelin: short / full approach | Neeraj Chopra | Withdrawal, crossover, a visible left-leg block, hip drive, elbow-led delivery, downward arm sweep and right-leg catch. |
| Javelin: crossover / elite approach | Neeraj Chopra | Add a longer impulse stride before the block. The chest and throwing arm stay back while the lower body leads. |

These are selected movement cues, not motion capture or measured reproductions of those athletes. Standing and half-turn variants are game teaching progressions derived from parts of a full throw. Sedykh's documented throw uses three turns; the game's existing two/three/four-turn progression is retained. Similarly, a glide is a valid elite technique; the form ladder is a game convention, not a ranking of real techniques.

## Sources

- [Peter Taylor / Australian Athletics, coaching the shot put](https://coachathletics.com.au/coaching-education/coaching-aspects-of-the-shot-put-technique-for-young-athletes). The illustrated five phases separate the low glide, closed transition, leg-driven delivery and late recovery. The article includes Storl photographs.
- [Ryan Crouser preparing his rotational delivery](https://img.3cat.cat/multimedia/jpg/9/5/1624090907459_1200x677.jpg), carried by [Esport3's 2021 US Trials report](https://www.3cat.cat/esport3/ryan-crouser-bat-el-record-de-llancament-de-pes-que-no-es-movia-des-de-1990/noticia/3105586/). The shot remains tucked at the neck through the loaded position.
- [Sandra Perković's delivery photograph](https://assets.aws.worldathletics.org/large/77db50bc-39f3-47b3-8121-1bac238a2221.jpg), from [World Athletics' 2014 European Championships report](https://worldathletics.org/news/report/sandra-perkovic-day-five-european-athletics-c). The long arm trails the braced lower body. [World Athletics' discus technique guide](https://worldathletics.org/disciplines/throwing-event/discus-throw) supports the general entry, pivot and release sequence.

- [Yuriy Sedykh world-record photosequence, Ralf Otto / New Studies in Athletics](https://www.hammerthrow.org/wp-content/uploads/photosequences/otto_sedykh_wr.pdf). Pages 10–12 show the alternating foot contacts, lowered hips, final double support and release. Hammer keeps its original side/front/back turning sequence, including the turn after release for advanced form. The arms sweep across, the feet replant, and the body settles instead of freezing with elongated raised arms. Recovery turns use empty hands.
- [World Athletics men's javelin biomechanical report, London 2017](https://worldathletics.org/download/download?filename=8540e126-0766-428e-8a04-fcedbf63b167.pdf&urlslug=Men%27s+javelin+throw+-+2017+IAAF+World+Championships+Biomechanical+report) and [Neeraj Chopra's Tokyo delivery photograph](https://img.etimg.com/photo/msid-85266739/the-epic-moment-.jpg). Javelin moves from withdrawal and crossover into a planted left-leg block, elbow-led delivery, forward/downward arm sweep and right-leg catch. Compact arm segments fit the game's large-headed proportions.

## Animation and review

Contact timings in `src/render/throw-motion.js` separate preparation, travel, catch, leg drive and the strike. Shot and discus no longer hold a release pose throughout their release interval: the empty arm sweeps across before the recovery settles. Hammer feet stay on the circle through planted support; the knee bend lives in the sprite pose rather than moving the whole character off the floor. Advanced hammer recovery still turns after release.

Javelin movement reserves space for the complete outlined shoe at the game's double sprite scale. A legal throw stays behind the near edge of the arc through release, recovery and the subsequent reaction; a foul still travels over it. Phase boundaries join at the same body position. Shot, discus and javelin launch from the release hand; hammer launches from the final orbit's head, at the end of its wire.

Run `npm run dev` and open `/scripts/throw-study.html` for all four events at every form level, with pause, speed, time scrubbing and foul controls. It uses the production sprites and motion functions. Review at half speed, then 1×; inspect the catch, delivery and follow-through as well as the run/turn. The meet keeps its existing duration, speed controls, afterimage reduction and result holds. The animation changes do not alter distance, stats, saves or form unlocks.

`tests/throw-motion.test.js` checks frame validity, approach and phase continuity, ordered contact/drive poses, planted hammer turns, implement launch positions, follow-throughs and legal/foul javelin foot clearance.
