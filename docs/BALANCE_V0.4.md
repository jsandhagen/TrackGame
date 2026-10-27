> Historical design/balance notes. See [current event development](EVENT_MASTERY.md) and [current balance](BALANCE_CURRENT.md) for 0.9.0.

# Progression and game feel: 0.4.0

Target: early victories teach the club loop; later leagues reward investment, preparation and athlete identity. Repeating a league should yield visible growth. A strong club should dominate an earlier league. Competition decisions wait indefinitely.

## Changes

- Tactics now have different variance as well as foul rates. Safe banks a steady mark, Controlled balances spread/risk, and All out chases a higher ceiling with a roughly 30% foul rate at the equal-stat benchmark. Rivals react to banked marks. Actual estimated foul risk appears before release.
- Focused training plans have equal load/form rules and growth multipliers; technique no longer combines the strongest development with the lightest load. Facility growth rises from 6% to 12% per level.
- New and upgraded stat facilities queue a one-time next-healthy-day clinic: +1 at construction, +1.5 for level 2, +2 for level 3. Clinics survive saves/injury and clearly report the stat gained.
- Six additional skills extend mastery through leagues. Conditional form, attack, comeback and captain bonuses lead to an explicit once-per-athlete-per-meet Signature release in World League. One equipped skill remains a meaningful choice.
- A failed season keeps rivals stable and grants a rebuild camp: key and weakest stat +1.5, increasing to +2.5 after repeated failures, plus 8 form. Career progress is retained.
- New PBs report the distance delta. Flights are shorter/skippable. Coach this event chooses tactics and stops on the event result. Full-meet simulation also makes reactive tactical choices. Stadium attendance and lighting increase through the leagues.

## Reproducible audit

Run `node scripts/balance-audit.mjs`. The JSON in `balance-results-v0.4.0.json` contains 100 seeded careers per policy and 1,000 equal-strength tactical duels per policy. These are scripted simulations, not human enjoyment scores. The baseline retains the original four athletes, uses all-round training and safe-then-controlled throws, with no purchases or skills. Investment buys equipment/facilities and selects the original combat skills. It deliberately does not exploit the new later-tier skills.

| Metric | 0.3.0 | 0.4.0 |
|---|---:|---:|
| Baseline median seasons to world title | 13 | 8 |
| Baseline 90th percentile | 14 | 9 |
| Investment median | 5 | 5 |
| Specialist plans median | 13 | 8 |
| Everyone on technique median | 8 | 9 |
| All out win rate vs equal controlled squad | 99.7% | 45.9% |
| All out foul rate | 14.1% | 30.1% |
| Gym level 2: shot improvement after a week | 0.0119m | 0.1358m |

All out still wins more equal-strength duels than Controlled, with appreciably more fouls; this is intentional for a chasing tactic. Safe is for protecting an advantage, not for beating an equal club on distance. Conditional tactics and the new skills need device playtesting across a range of club strengths. These results establish that the previous universal attack exploit and multi-season plateau were reduced, not that all choices are optimally balanced.

Money is still forgiving and heavy injuries are uncommon with auto-taper. This pass prioritizes legible progress over punitive management. Future tuning should use actual session feedback: where players stop, which upgrades they notice, whether late leagues feel distinct, and whether Coach mode preserves ownership of a result.
