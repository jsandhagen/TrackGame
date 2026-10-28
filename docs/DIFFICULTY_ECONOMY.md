# Distances, difficulty, money and landscape screens

This update makes marks read like real athletics, puts every rival on one difficulty curve, gives money a job from the first season to the last, and reworks the screens for phones held sideways.

## Distances

Each event has three anchors in `EVENTS` (`src/game-content.js`):

| Event | `min` (raw beginner) | `max` (top rating, before bonuses) | `record` (senior men's world record) |
| --- | ---: | ---: | ---: |
| Shot put | 7 m | 20.5 m | 23.56 m |
| Discus | 18 m | 66 m | 74.35 m |
| Hammer | 20 m | 79 m | 86.74 m |
| Javelin | 22 m | 86 m | 98.48 m |

Gear, skills, approaches and conditions multiply on top of `max`. `realMark` (`src/domain/core.js`) then turns that raw performance into metres. Marks are unchanged up to 92% of the record; above that each extra bit of ability buys fewer centimetres, so no throw ever passes the world record. Thrown marks, throw previews, forecasts, lineup edges and scouting all use the same conversion. The stadium draws its sector out to the record.

Typical rival specialists now throw like this:

| Level | Shot | Discus | Hammer | Javelin |
| --- | ---: | ---: | ---: | ---: |
| Community Open | ~9.5 m | ~27 m | ~31 m | ~34 m |
| National Open | ~19 m | ~60 m | ~73 m | ~79 m |
| World Championship | ~21 m | ~67 m | ~81 m | ~86 m |

A club's best-ever athletes can go further (low 23s in the shot, mid-90s in the javelin), but never past the record.

## One difficulty curve

`RIVAL_RATING` (`src/domain/competition.js`) sets a typical rival specialist's event rating at each of the fifteen stages, Community Open to World Championship:

`21, 37, 49 · 63, 71, 76 · 76, 79, 82 · 82, 84, 86 · 88, 90, 92`

`rivalBase` and `rivalMastery` turn that into the stats and mastery `makeClubs` gives new clubs. Clubs that carry over between stages develop by the difference between their old and new stage. Each stage asks for about a season's growth from a well-run club, so the steps are large early, when athletes improve quickly, and small near the top. The flat County and Regional values allow for the deeper squads, gear and developed approaches rivals bring from Regional upwards.

Other changes that kept fixtures and finals consistent:

- Rival stars get their edge from club identity alone. Rarity no longer adds stats on top of the curve, and the Regional-and-up key-stat boost is +2, not +4.
- **Rival Hunter** in field meets means behind the *other club's* best mark in that event. It used to trigger behind anyone, teammates included, which gave rivals +3% on almost every throw.
- **Big Stage** is the clutch clubs' finals signature. Speed clubs bring High Roller instead, and no rival carries the Old Medal, so a final is a final against that rival, not a second difficulty layer.
- **Auto-pick best lineup** fills up to three entries per event, as rivals do. It used to stop at two, which decided many finals.

`node scripts/stage-audit.mjs <idle|engaged|managed> <seeds> <seasons>` reports seasons per stage and fixture and final win rates. Ten seeds, 40-season cap:

| Stage | Engaged: seasons | Fixtures won | Finals won | Idle: seasons |
| --- | ---: | ---: | ---: | ---: |
| Community Open | 1.0 | 90% | 100% | 1.5 |
| Community Challenger | 1.9 | 56% | 77% | 2.7 |
| Community Championship | 1.1 | 76% | 100% | 2.3 |
| County Open | 2.5 | 43% | 91% | 9.6 |
| County Challenger | 1.8 | 61% | 91% | 15.5 |
| County Championship | 1.0 | 100% | 100% | not cleared |
| Regional Open | 1.5 | 71% | 71% | — |
| Regional Challenger | 1.4 | 74% | 77% | — |
| Regional Championship | 1.0 | 90% | 100% | — |
| National Open | 1.2 | 78% | 83% | — |
| National Challenger | 1.8 | 83% | 56% | — |
| National Championship | 1.5 | 91% | 67% | — |
| World Open | 1.1 | 91% | 91% | — |
| World Challenger | 1.7 | 92% | 59% | — |
| World Championship | 1.3 | 74% | 91% | — |

The engaged bot's first World Championship comes in seasons 19–26 (median 22); the fully managed bot's in 17–22 (median 18). Before this update, an engaged club won every Community and County meet at the first attempt, an idle club cleared both tiers, and the National Open and World Challenger finals were multi-season walls. These are scripted bots, not people: they show the shape of the curve, not a promised human campaign length.

## Money

- **Café and merch stand** sell to a share of visitors, but each counter level serves a limited number of customers a day (café 30 +15 per level, stand 20 +10 per level). Takings at level 1 are as before; higher levels mostly add capacity, so late takings no longer grow without limit with fans.
- **Upkeep**: every building and stadium upgrade costs 3% of its price a week, paid on payday with wages. Build cards and stadium upgrades show the upkeep they add.
- **Wages** rise more steeply with rank (Pro $75, Ace $130, Star $220, Legend $340 a week, plus level and rarity).
- **Entry fees**: County $250, Regional $600, National $1,500, World $3,000 per league entry, refunded if you cancel before the first meet. Community leagues and all duels are free, so a short-of-cash club can always earn its way back.
- **Pricier late stadium work**: championship track $2,400, competition throwing areas $1,800–2,000, an Olympic stadium $10,000, stadium lights $3,000.
- **Facility duties** earn about a quarter less.
- The Clubhouse's **Weekly** figure is the true net: sponsor and club income plus a week of café and merch takings, minus wages and upkeep. The Office breaks it down.

An engaged club's median bank is about $1.7k after season 1, $4k after season 7, $15k after season 10 and $30–45k through the National years. It then falls as Legend wages and upkeep bite. Before, it reached $317k by season 19.

### Saves

Saves from before this update (no `balance` field) are lifted once when loaded: saved rival clubs keep their people but rise to the strength their stage now calls for, and lose the retired finals charm. Bookings made before the update paid no fee, so cancelling one refunds nothing.

## Landscape screens

On phones held sideways (height up to 520px, wider than tall):

- The menu is a slim icon rail down the left edge, so windows run from under the HUD to the bottom of the screen. That's about 40% more room than when they sat above a bottom menu bar. Windows are up to 62% of the screen wide, and lists of cards (shop, kit bag, build options, duels) sit two to a row.
- The big action button sits bottom-right of the club and steps aside while a window is open; zoom buttons sit beside the rail.
- Window title bars are slimmer. Toasts start right of the rail and stay clear of an open window and the meet scoreboard.
- The athlete file opens on a compact header with tabs that stay pinned while the file scrolls. The primary-event picker sits under the stats, the event-weighting table folds away, and equipped skills show as one line with a shortcut to the Skills tab.
- The Call room has one lineup control: each event row holds all three entry pickers (with each athlete's forecast and ★ for specialists) beside the rival's specialist.
- The meet calendar folds its explanation under "How the circuit works", so booking options come first.
- In coach mode the decision panel fits between the scoreboard and the bottom edge, with the three tactic buttons straight after the projection and target.
- Every pop-up keeps its header and buttons fixed and scrolls only its body, so nothing opens half-scrolled. On short screens the training-session animation is capped so the results show sooner.
