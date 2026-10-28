# Event development and meets — 0.9.0

Power, Technique, Speed and Focus are shared physical and mental attributes. Each discipline applies a different weighting: shot emphasises force production; discus emphasises technical coordination; hammer combines force, technique and rotational speed; javelin combines delivery technique and approach speed. Focus also supports reliability. Event mastery is separate and directly influences usable performance and consistency.

Athletes choose a technical training event independently of their original specialism. Daily technical practice, video work and coached delivery sessions develop mastery in that selected event, using its appropriate throwing area. Practice alone has a ceiling of 35; each actual meet appearance in an event raises that ceiling by five, up to 100. Competition itself grants mastery regardless of placing; a legal series adds more. Advanced event coaching requires event appearances as well as facilities and Coaching Insights. High mastery also opens that event's signature skills, including for a secondary discipline.

Ordinary athletes retain a permanent competition profile: steady performers have tighter spread, explosive competitors obtain more from aggressive attempts, efficient movers use less energy, and quick adapters learn secondary-event technique faster. These traits do not occupy skill slots and remain relevant alongside rarity and potential.

Each event has an additional competitive approach. Shot athletes can develop a more demanding full delivery. Discus athletes choose controlled flight or exploit visible airflow, with headwinds and crosswinds producing different tradeoffs. Hammer athletes balance rhythmic turns against more demanding acceleration. Javelin athletes balance approach speed against mastery and technical control of the block. The demanding options have mastery requirements and different distance, reliability and energy implications. Choices can be saved in the lobby and changed when coaching a throw.

New meets rotate single attempts across all entered athletes before starting another round. Championship qualifiers and the subsequent three final throws use the same rotation. The full leaderboard determines meaningful point targets, qualification opportunities, leading/trailing effects, automatic tactics and clutch decisions. Exact tied series share points; countback uses the next-best marks. Older active meets can finish with their saved ordering.

Hype Engine now raises teammates' condition when its athlete wins an event. Both clubs pay attempt energy costs. Celebration text and audio use actual event points rather than obsolete three-point event wins. A live leaderboard and scoring target line make supporting performances visible. Highlights compress routine attempts while retaining opening marks, records, signatures, qualification opportunities and scoring swings. An athlete can be followed from their Stats tab to preserve all their attempts in highlights.

Rival clubs retain their athletes across stages and revisits. Later teams have deeper squads, authored approaches to equipment and skill selection, identifiable specialist stars and different supporting strengths. Beaten clubs improve the mastery of a weak-event specialist. Older careers infer initial event familiarity from existing appearances and personal bests, retain athletes and records, and migrate to save schema 8.

See [current balance](BALANCE_CURRENT.md) for the current seeded results, policy definitions and remaining tuning limits.

## Throwing form

How an athlete throws at meets follows their **form** in that event: the average of their Technique and event mastery (`formOf`, `FORMS` in `src/domain/mastery.js`). Form changes only the animation, never the distance. Thresholds are 34, 50 and 68.

| Form | Shot put | Discus | Hammer | Javelin |
| --- | --- | --- | --- | --- |
| 0 | Standing put | Standing throw (pre-swings) | Two winds, two turns | Short approach |
| 1 | Glide from the back of the circle | Half turn | Three turns | Full run-up and crossovers |
| 2 | Power glide with a reverse | One and a half turns | Four turns, keeps turning after release | Longer crossover phase and block |
| 3 | Rotational | Fast spin, accelerating | Four fast turns | Elite approach |

Form 3 leaves afterimages through the turns. Fouls carry the thrower over the front of the circle or the arc. The timelines are in `src/render/throw-motion.js` (pure and tested), and the extra technique frames are in `THROWS` in `sprites.js`. A coached session that lifts an athlete into a new form says so on the result card and in the club news. The athlete file's mastery card shows each event's current form and what unlocks the next.
