# Growth pacing and squad depth across the ladder

A playtest reached National Division 3 (division 8 of 15) with several 99 OVR athletes throwing world records. The scripted careers in `scripts/rating-audit.mjs` showed the same pattern. The player's growth was still paced for the old five-tier ladder, so a club peaked with seven divisions left to play.

Run `node scripts/rating-audit.mjs <engaged|managed|shopper> [seeds] [seasons]`. On entering each division it reports the median best and third-best OVR, the number of 90+ athletes, the best rival's OVR, both sides' best forecast as a percentage of the world record, the best athlete's stats, mastery, level, rank and ceiling, and fixture and final win rates. The `shopper` policy also spends spare money on stat consumables, as an eager human might.

## Why the squad peaked early

1. **Mastery ran ahead of the rivals.** Rating is weighted stats × (0.6 + 0.4 × mastery/100). Each meet lifted an event's practice ceiling by 5, so the best athlete hit 100 mastery by County Premier (division 5). Rival mastery is 30 + 4.6 a division: 62 at National 3. That gap alone is worth about 15% of rating.
2. **Stats always sit on the ceiling.** Late coached sessions stack the fifth drill step (×4), facility levels, group, coach level, mood and quality, about 10–20 raw points a session. From County onwards the best athlete's stats equal their ceiling, so the ceiling, not training, sets the pace. Slowing gains near the top was tried and had no effect at any reasonable strength.
3. **The ceiling reached 100 too soon.** The ceiling is potential + a rank lift (Pro +6, Ace +12, Star +20, Legend +28). Potential inflates: Epic and secret characters arrive at 76–90 (Pip 90, Yuki and R-7 82), development milestones add up to 8, and two Talent Elixirs (+4 each) come with the District and Regional titles. An Ace (level 12) could already have a 100 ceiling.

## Changes

- **Mastery ceiling: +1.25 a meet** (`MASTERY_PER_MEET`, `src/domain/mastery.js`), still from 35 and still to 100. At about four meets a division this tracks rival mastery and reaches 100 after 52 meets, around Continental to International. Competing still grants mastery whatever the result.
- **Rank limits** (`RANKS[].limit`, `src/game-content.js`): Rookie 70, Pro 80, Ace 90, Star 96, Legend 100. The ceiling is now `min(limit, potential + rank lift)` (`rankCap`, `src/domain/core.js`), plus 4 per Legend star as before. Only a Legend can train a stat to 100; potential still matters below the limit. The rank card names the limit.
- **Nothing is taken away.** The limit stops growth only. A signing who arrives above it (secret characters, high-league recruits) keeps their stats, and every stat raise (training, items, stories, milestones, rank-ups, rebuild camp) goes through `raiseStat`, which never lowers a stat already above the ceiling. Mastery above the new ceiling is kept too, so existing careers keep their athletes as they are and simply grow more slowly from here.

The rival curve, distances, standards and economy are unchanged.

## Results

Engaged bot, six seeds, 30-season cap, medians on entering each division:

| Division | Best OVR before → after | Rival best OVR | Club best mark, % of WR before → after | Fixtures won before → after | Finals won before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| County | 63 → 52 | 50 | 67 → 62 | 100% → 100% | 100% → 100% |
| Regional | 84 → 72 | 65 | 82 → 75 | 100% → 78% | 100% → 100% |
| National 3 | 93 → 80 | 78 | 91 → 82 | 100% → 79% | 100% → 75% |
| National 1 | 100 → 91 | 86 | 96 → 90 | 100% → 61% | 100% → 55% |
| National Premier | 100 → 95 | 90 | 96 → 93 | 95% → 69% | 86% → 50% |
| Continental | 100 → 96 | 92 | 96 → 95 | 100% → 87% | 67% → 40% |
| World Tour | 100 → 100 | 97 | 97 → 97 | 85% → 76% | 2% → 0% |

Before, the bot won every fixture and final for the first ten divisions, and its leader was rated 100 by National 1. Now the leader stays a few points above the division's best rival all the way up, 90+ OVR arrives around National 1, and 100 OVR and world-record forecasts wait for Legend rank and the World Tour. The `shopper` policy follows the same curve: stat items deepen the squad but cannot pass the rank limits.

## Squad depth and the top finals

With growth paced, the scripted club still hit a wall in the late championship finals: International finals were won 3% of the time, World Tour 0%, and no career won the Diamond title. Replaying finals showed it was not the leader. The squad's forecasts led every event, yet it scored half the winner's points. Four causes:

1. **Signings were useless past the County leagues.** Prospects came from a fixed base per league at Rookie, level 1 and mastery 30. A Legend scouted in the International Division rated about 54 OVR against rivals at 93–97, so a club's depth was its starting six and the secret characters.
2. **New signings never entered.** Automatic lineups seed by recorded PB, and a signing has none, so they never threw in a league duel, never set a championship standard and never reached the final. The originals doubled up in second events instead.
3. **Rivals carry meet skills; the club barely can.** From County up, every rival thrower has up to three meet skills, Rare and Epic included (Clutch Gene, Big Stage, Rival Hunter, Momentum). Players learn those only from skill books, three a week. In a final, stacked skills put rivals' best throws 9–14% past their forecasts.
4. **Automatic tactics banked when nothing could be lost.** In field meets, Watch mode chose Bank it on later attempts with a mark already on the board, giving up distance for no gain.

### Changes

- **Seasoned signings** (`src/domain/signings.js`). A prospect arrives from the division the club has reached, placed in it exactly as rival throwers are: at a spot in the division's distance band (`RARITY[].signing.band`) on the kit an ordinary rival carries there (`divisionKit`). Common 0 (the bottom of the band), Rare 0.3, **Epic 0.6** (just above the middle: a championship's mid-table points), **Legend 0.95** (the top of the band, with the rival clubs' stars). They arrive without that kit, so equipping them from the shop is what puts them there. They come with the level, rank and skill points of that division (a level of 1.8 a division, at least the rank their stats need, never above Star), rival-level event mastery (more where the rating scale runs out at the top), meet skills like rivals (Common 1, Rare 1, Epic 2, Legend 3, no rarer than Epic, paid from their skill points) and a **circuit PB** at 98% of their forecast, so lineups seed them. Championship entry still needs a mark made in the league duels. Seasoning only ever improves a prospect: opening-division recruits and the fence tryout's teenager stay raw. It applies to scouting reports, the scout's tip and secret characters, and uses no random draws.
- **Headhunter's report.** A first title from National Division 3 upward (`HEADHUNTER_DIVISION`) makes the next free scouting report lead with a Legend.
- **No banking a banked mark.** In field meets, automatic tactics choose only Controlled or All out once the athlete has a valid mark (`autoTactic`, `src/domain/meet.js`).
- The rival tuning's maths is shared (`ratingForMark`, `markMultiplier` in `src/domain/competition.js`); rival forecasts are unchanged (`node scripts/division-audit.mjs 10`: 100% inside the bands).

### Results

`node scripts/depth-experiment.mjs <division> [seeds] [replays]` plays scripted careers to a division's final and replays it with the squad as played, then rebuilt as three specialists an event (keeping the club's own qualified athletes who are at least Epic standard and filling the rest with kitted-out Epic signings, with or without one Legend). It also prints the median winning mark in each event. Win rates over 40 replays per squad, three careers, with the meet-day bonuses below:

| Final | As played | Deep squad of Epics | One Legend and Epics |
| --- | ---: | ---: | ---: |
| National 1 | 3–100% | 63–100% | 78–100% |
| International | 3–45% | 65–100% | 73–100% |

The audit bot now builds depth as a coach would: it fills the dormitories with the best prospects, swaps its weakest athlete for a clearly better prospect, and buys meet-skill books from the shelf for its best athletes. It signs whatever its reports offer, mostly Commons, so a coach who hunts for Epics and the headhunter's Legends should do better than the bot.

## Meet-day bonuses

Replayed finals showed winning marks 9.5–12% past the top of the division's band, and world-record marks in 62% of International and 97% of Diamond event finals. Winners' forecasts sat at the band's top; the excess came from bonuses stacked on one throw, mostly by rivals, who carried three meet skills each from National 1 (every club style includes Clutch Gene) and a signature move on every star at the top.

Stacking stays, so a coach who builds a stack on purpose (skills, loadouts, the signature's timing, All out with High Roller, a home crowd, a captain) still gets it. Each bonus is smaller, and rivals no longer stack by default:

| Bonus | Before | Now |
| --- | ---: | ---: |
| Opening Salvo · Front Runner | +3% · +1.5% | +1.5% · +1% |
| Clutch Gene | +4%, twice in a championship | +2%, on the sixth throw only |
| Second Wind · Rival Hunter | +5% · +3% | +2.5% · +1.5% |
| Momentum | +1.5% a valid mark | +0.75% |
| Big Stage · Old Medal · Anchor | +3% · +3% · +2.5% | +1.5% · +1.5% · +1.5% |
| Showtime · High Roller | +4% · +2.5% | +2% · +1.5% |
| Signature moves (once a meet, no foul) | +8% | +3% |
| Showboat · Explosive competitor | +2% · +1.2% on All out | +1% · +0.6% |
| TIMBER! · Wind Reader · Avalanche | +4% · +5% · +7% | +2% · +2.5% · +3.5% |

Rival throwers carry their club style in one skill through the National tier and two from National 1; stars carry one more (at most three), plus their signature at the top. The draws that made those skills are unchanged, so seeded campaigns keep their other rolls.

Median winning mark in replayed finals (as-played squads), against the band and the world record:

| Final | Shot | Discus | Hammer | Javelin | Winner vs band top | Event finals over the WR |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| National 3 (band 15–17 · 49–55 · 60–68 · 62–72) | 18.89 | 56.92 | 70.90 | 77.84 | +6.8% (was +10.9%) | 0% |
| National 1 (17–19 · 55–61 · 68–75 · 70–79) | 20.48 | 65.01 | 79.91 | 84.61 | +7% (was +12%) | 0% |
| International (19–21 · 61–67 · 74–81 · 79–88) | 22.34 | 70.14 | 85.84 | 93.06 | +6–7% (was +11.3%) | 9% (was 62%) |
| Diamond (20–22 · 65–71 · 78–85 · 85–94) | 23.16 | 73.33 | 89.20 | 97.25 | +4.4% (was +9.5%) | 40% (was 97%) |

What remains is mostly not bonuses: the best of about fifteen throwers and six attempts lands about 3% over its forecast, and the club's own stars forecast a little above the band. At Diamond the bands sit just under the world record (hammer tops out at 85 m against 86.74), so a winner barely above the band breaks it.

Engaged bot over full careers (`node scripts/rating-audit.mjs engaged 6 30`), finals won: National 3 100%, National 1 55%, Continental 50%, International 29%, World Tour 13%, Diamond 36%. Four of six careers win the Diamond title within 30 seasons (median season 26); before the depth changes none did. The growth curve is unchanged: no 90+ OVR athletes entering National 3.

Still open: whether Diamond finals should break the world record as often as they do (lower the Diamond bands, or narrow throw spread), and whether late finals feel fair to a human. These are scripted bots, not people: they show the shape of the curve, not human campaign length.
