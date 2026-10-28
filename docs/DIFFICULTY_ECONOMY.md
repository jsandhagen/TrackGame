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

Gear, skills, approaches and conditions multiply on top of `max`. `realMark` (`src/domain/core.js`) then turns that raw performance into metres. Marks are unchanged up to 92% of the record. Above that the curve flattens to a square root: each extra metre costs more ability than the last, but growth never stops. Thrown marks, throw previews, forecasts, lineup edges and scouting all use the same conversion. The stadium sector stretches to just past the longest mark the event has seen.

Typical rival specialists throw like this:

| Level | Shot | Discus | Hammer | Javelin |
| --- | ---: | ---: | ---: | ---: |
| Community Open | ~9.5 m | ~27 m | ~31 m | ~34 m |
| National Open | ~19 m | ~60 m | ~73 m | ~79 m |
| World Championship | ~21 m | ~67 m | ~81 m | ~86 m |

### World records and the long game

A club throw that beats the current world record becomes the new record (`s.worldRecords`), with a stadium call-out, a toast, +$2,500, +400 fans, extra Insights and the Rewrite History goal. The next record has to beat that one. Breaking the real record takes a fully built club stacking its best gear, skills and approach. Going further is the endless game:

- **Legend stars.** A Legend can keep being promoted: ★1, ★2 and so on, with no last star. Each star lifts the athlete's ceiling 4 points past 100, adds a point to every stat and a skill point, and needs 3 more levels and 40% more money than the last (from $8,000). Grades continue past S: SS at 110, SSS at 130.
- **Buildings past level 3.** Every building except the Dormitory, Scout Office and Workshop (squad size and cost discounts) keeps levelling. Each level adds its effect again, while the price rises 50% a level. Every fifth level is a **landmark**: its effects count one extra level, so going all in on one building pays. Buildings past level 3 wear a ★ badge on the map.
- **Coached sessions** keep levelling past the five named levels: a ★ level every 15 more sessions, each worth another 8%.
- **Forging** has no top level; each level adds +0.6% distance and costs 40% more than the last after +3.

Rough scale for the javelin, assuming raw ability of about 86 × the athlete's multipliers: a raw 100 throws ~98.7 m (the record is 98.48), 120 throws ~111 m, 200 throws ~144 m and 260 throws ~162 m. Getting near 150 m takes many seasons of stars, landmark buildings and forged gear.

## Training, facilities and Insights

Daily plans keep a squad ticking over; facilities and coached sessions make the big gains. A plan's base gains are a third lower than before, each level of the facility it uses adds 40% (was 25%), and a plan with nowhere to train loses 40% (was 20%). Coached sessions gain 20% per facility level (was 12%).

Coaching Insights, the lightbulb that pays for coached sessions and advanced plans, now come mostly from buildings, every day, with fractions carried over:

| Building | Insights a day per level |
| --- | ---: |
| Coaches' Library (new, Community, $380) | 0.5 |
| Sports Science Institute (new, Regional, $2,400) | 1.5 |
| Sports Lab | 0.6 |
| Coaching Lodge, Equipment Testing Centre | 0.5, 0.6 |
| Video room, Indoor Training Hall | 0.4, 0.3 |
| Clubhouse, Strength Room | 0.15, 0.1 |

A **Think Tank** combo (library beside institute) adds 25%. Each training day still adds one Insight and each meet four to nine. The library and institute also take staff for extra Insights. The Training ground shows the club's daily rate.

## One difficulty curve

`RIVAL_RATING` (`src/domain/competition.js`) sets a typical rival specialist's event rating at each of the fifteen stages, Community Open to World Championship:

`21, 37, 49 · 63, 71, 76 · 79, 82, 85 · 87, 89, 91 · 93, 94, 97`

`rivalBase` and `rivalMastery` turn that into the stats and mastery `makeClubs` gives new clubs. Clubs that carry over between stages develop by the difference between their old and new stage. Each stage asks for about a season's growth from a well-run club, so the steps are large early, when athletes improve quickly, and small near the top. The flat County and Regional values allow for the deeper squads, gear and developed approaches rivals bring from Regional upwards.

Other changes that kept fixtures and finals consistent:

- Rival stars get their edge from club identity alone. Rarity no longer adds stats on top of the curve, and the Regional-and-up key-stat boost is +2, not +4.
- **Rival Hunter** in field meets means behind the *other club's* best mark in that event. It used to trigger behind anyone, teammates included, which gave rivals +3% on almost every throw.
- **Big Stage** is the clutch clubs' finals signature. Speed clubs bring High Roller instead, and no rival carries the Old Medal, so a final is a final against that rival, not a second difficulty layer.
- **Auto-pick best lineup** fills up to three entries per event, as rivals do. It used to stop at two, which decided many finals.

`node scripts/stage-audit.mjs <idle|engaged|managed> <seeds> <seasons>` reports seasons per stage and fixture and final win rates. The engaged bot trains for each athlete's most valuable stat, runs coached group sessions with its Insights, builds (research included), recruits, equips and saves for entry fees. The fully managed bot also directs event practice and developed approaches, and puts reserves to work on facility duties. Ten seeds, 40-season cap:

| Stage | Engaged: seasons | Fixtures won | Finals won | Managed: seasons | Idle: seasons |
| --- | ---: | ---: | ---: | ---: | ---: |
| Community Open | 1.0 | 83% | 100% | 1.0 | 1.9 |
| Community Challenger | 2.0 | 58% | 91% | 2.0 | 2.7 |
| Community Championship | 1.0 | 93% | 100% | 1.0 | 3.8 |
| County Open | 1.9 | 65% | 100% | 2.1 | 10.6 |
| County Challenger | 1.2 | 89% | 83% | 1.1 | 18.1 |
| County Championship | 1.0 | 100% | 100% | 1.0 | not cleared |
| Regional Open | 1.0 | 93% | 100% | 1.1 | — |
| Regional Challenger | 1.2 | 86% | 91% | 1.1 | — |
| Regional Championship | 1.0 | 93% | 100% | 1.0 | — |
| National Open | 1.8 | 74% | 63% | 1.1 | — |
| National Challenger | 1.1 | 94% | 91% | 1.0 | — |
| National Championship | 2.0 | 85% | 50% | 1.2 | — |
| World Open | 2.2 | 68% | 53% | 1.1 | — |
| World Challenger | 1.9 | 93% | 53% | 1.1 | — |
| World Championship | 1.5 | 78% | 77% | 1.2 | — |

The engaged bot's first World Championship comes in seasons 18–24 (median 22); the fully managed bot's in 17–20 (median 18). A club that goes all in pulls ahead, which is intended. An idle club is held at County. Before this update, an engaged club won every Community and County meet at the first attempt, an idle club cleared both tiers, and the National Open and World Challenger finals were multi-season walls. These are scripted bots, not people: they show the shape of the curve, not a promised human campaign length.

## Money

- **Café and merch stand** sell to a share of visitors, but each counter level serves a limited number of customers a day (café 30 +15 per level, stand 20 +10 per level). Takings at level 1 are as before; higher levels mostly add capacity, so late takings no longer grow without limit with fans.
- **Upkeep**: every building and stadium upgrade costs 3% of its price a week, paid on payday with wages. Build cards and stadium upgrades show the upkeep they add.
- **Wages** rise more steeply with rank (Pro $75, Ace $130, Star $220, Legend $340 a week, plus level and rarity).
- **Entry fees**: County $250, Regional $600, National $1,500, World $3,000 per league entry, refunded if you cancel before the first meet. Community leagues and all duels are free, so a short-of-cash club can always earn its way back.
- **Pricier late stadium work**: championship track $2,400, competition throwing areas $1,800–2,000, an Olympic stadium $10,000, stadium lights $3,000.
- **Facility duties** earn about a quarter less.
- The Clubhouse's **Weekly** figure is the true net: sponsor and club income plus a week of café and merch takings, minus wages and upkeep. The Office breaks it down.

An engaged club's median bank is about $1.8k after season 1, $5k after season 7, $15k after season 10 and $25–45k through the National and World years. Before, it reached $317k by season 19. A fully managed club, with reserves on facility duty, builds a bigger cushion ($98k by season 19): that is its reward for running the economy hard.

### Saves

Saves from before this update (no `balance` field) are lifted once when loaded: saved rival clubs keep their people but rise to the strength their stage now calls for, and lose the retired finals charm. Bookings made before the update paid no fee, so cancelling one refunds nothing.

## Landscape screens

On phones held sideways (height up to 520px, wider than tall), menus work like landscape mobile games:

- The menu is a slim icon rail down the left edge. Windows open as sheets filling the screen beside it, from the HUD to the bottom edge.
- Sheet content flows into balanced columns (two on most phones, three on wider ones). Card lists (squad, shop, kit bag, sessions, build options, plots, duels, sponsors, stadium parts) span the sheet in their own grids, and headings stay with the list they introduce.
- The athlete file has two panes: a compact profile with the tabs on the left, the tab's content in columns on the right.
- The Call room shows two events per row, each with all three entry pickers (forecasts and ★ for specialists) beside the rival's specialist. The meet-preparation card puts its toggle beside the group-plan form.
- The big action button sits bottom-right of the club and steps aside while a sheet is open. Toasts gather bottom-right while a sheet is open, and stay clear of the meet scoreboard.
- In coach mode the decision panel fits between the scoreboard and the bottom edge, with the three tactic buttons straight after the projection and target.
- Every pop-up keeps its header and buttons fixed and scrolls only its body, so nothing opens half-scrolled. On short screens the training-session animation is capped so the results show sooner.
