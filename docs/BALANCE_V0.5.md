# Balance notes — 0.5.0

Run `AUDIT_SEEDS=30 node scripts/balance-audit.mjs`. Raw output: [balance-results-v0.5.0.json](balance-results-v0.5.0.json). These are scripted bots, not people: they show that progress is possible and roughly paced, not that it is fun.

## Policies

- **Engaged**: trains each athlete's most valuable stat with room to grow, learns skills from a priority list, promotes when affordable, builds facilities in a sensible order, upgrades, buys and equips gear, signs a recruit when comfortable, uses stamina and condition items. Watch-mode tactics.
- **Idle**: never changes plans, never spends. Auto lineup only.

## Results (30 careers each, 40-season cap)

| | Engaged | Idle |
| --- | ---: | ---: |
| Median season reaching County / Regional / National / World | 2 / 3 / 5 / 6 | 2 / 5 / 9 / — |
| Median season of first World title | 9 | not within 40 |
| 90th percentile | 11 | — |
| Meet win rate: Community / County / Regional / National / World | 98% / 76% / 54% / 71% / 36% | 83% / 41% / 30% / 7% / 0% |
| Club goals completed (median) | 29 of 36 | 17 |

Reading: the Community League teaches the loop and is usually won first time. County and Regional need investment. The World League is a deliberate wall: Ace-rank commons are not enough, so the engaged bot needs Star ranks, rare recruits, gear and skills, and typically three or four World seasons. An idle club stalls around the National League; engagement is required to reach the end.

## Tuning levers and where they live

- League rival ratings (`LEAGUES[].rating`): 24 / 38 / 52 / 66 / 80.
- Training base gain (`trainingGains` in `src/domain/game.js`): 0.38 per day, ×2 on the focused stat, facility +25% per level, mood ±20%, slowing near the cap.
- Rank caps (`RANKS[].cap`): +6 / +12 / +20 / +28.
- Tactics (`TACTICS`): Bank it 0.97×, sd 1.2%, fouls ×0.3; Controlled 1.00×, sd 2.4%; All out 1.005×, sd 3.2%, fouls ×3.6. A foul costs 8 condition.

## Known gaps

- Injuries are rare because athletes rest automatically below 25 stamina. Turning auto-rest off is the risky, faster route.
- Money becomes plentiful late in a run (engaged bots hold ~$7k after the title; idle bots hoard ~$55k). Late sinks are Legend promotions, forging, epic shop items and secret characters.
- Human playtesting on devices is still needed for session length, readability at phone scale and whether Watch mode's clutch pauses come at the right moments.
