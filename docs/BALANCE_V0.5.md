> Historical design/balance notes. See [current event development](EVENT_MASTERY.md) and [current balance](BALANCE_CURRENT.md) for 0.9.0.

# Balance notes — 0.5.0

Run `AUDIT_SEEDS=30 node scripts/balance-audit.mjs`. Raw output: [balance-results-v0.5.0.json](balance-results-v0.5.0.json). These are scripted bots, not people: they show that progress is possible and roughly paced, not that it is fun.

## Policies

- **Engaged**: trains each athlete's most valuable stat with room to grow, learns skills from a priority list, promotes when affordable, builds campus buildings and upgrades the stadium in a sensible order, buys and equips gear, signs a recruit when comfortable, uses stamina and condition items. Watch-mode tactics.
- **Idle**: never changes plans, never spends. Auto lineup only.

## Results (30 careers each, 40-season cap)

| | Engaged | Idle |
| --- | ---: | ---: |
| Median season reaching County / Regional / National / World | 2 / 4 / 6 / 7 | 2 / 5 / 9 / — |
| Median season of first World title | 10 | not within 40 |
| 90th percentile | 12 | — |
| Meet win rate: Community / County / Regional / National / World | 97% / 61% / 54% / 50% / 31% | 83% / 41% / 32% / 7% / 0% |
| Club goals completed (median) | 34 of 39 | 16 |

Reading: the Community League teaches the loop and is usually won first time. County and Regional need investment. The World League is a deliberate wall: Ace-rank commons are not enough, so the engaged bot needs Star ranks, rare recruits, gear and skills, and typically three or four World seasons. The stadium layout (installations upgrade in place and cost a little more than the old separate buildings) added about one season to the engaged median compared with the earlier grid layout. An idle club stalls around the National League; engagement is required to reach the end.

## Tuning levers and where they live

- League rival ratings (`LEAGUES[].rating`): 24 / 38 / 52 / 66 / 80.
- Training base gain (`trainingGains` in `src/domain/game.js`): 0.38 per day, ×2 on the focused stat, training place (gym, own throwing area, track or video room) +25% per level, mood ±20%, slowing near the cap.
- Rank caps (`RANKS[].cap`): +6 / +12 / +20 / +28.
- Stadium costs and league gates (`STADIUM` in `src/game-content.js`), and the plot count per league (`PLOTS_BY_LEAGUE`: 7 / 9 / 11 / 13 / 13).
- Stats accumulate as fractions internally and display as whole numbers, so a day's "+1" appears when a stat crosses the next whole point.
- Tactics (`TACTICS`): Bank it 0.97×, sd 1.2%, fouls ×0.3; Controlled 1.00×, sd 2.4%; All out 1.005×, sd 3.2%, fouls ×3.6. A foul costs 8 condition.

## Known gaps

- All-round is light daily maintenance and automatically recovers before stamina would fall below the coached-session reserve. Focused plans retain their heavier costs and rest below 25 stamina. Turning auto-rest off permits deeper fatigue.
- Money becomes plentiful late in a run (engaged bots hold ~$7.4k after the title; idle bots hoard ~$55k). Late sinks are Legend promotions, forging, epic shop items and secret characters.
- Human playtesting on devices is still needed for session length, readability at phone scale and whether Watch mode's clutch pauses come at the right moments.
