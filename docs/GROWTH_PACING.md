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

- **Seasoned signings** (`src/domain/signings.js`). A prospect arrives from the division the club has reached, placed in it exactly as rival throwers are: at a spot in the division's distance band (`RARITY[].signing.band`) on the kit an ordinary rival carries there (`divisionKit`). Common 0.1 (the bottom of the band), Rare 0.45, **Epic 0.8** (the upper band, where a championship's mid-table points are), **Legend 1.1** (with the rival clubs' stars). They arrive without that kit, so equipping them from the shop is what puts them there. They come with the level, rank and skill points of that division (a level of 1.8 a division, at least the rank their stats need, never above Star), rival-level event mastery (more where the rating scale runs out at the top), meet skills like rivals (Common 1, Rare 1, Epic 2, Legend 3, no rarer than Epic, paid from their skill points) and a **circuit PB** at 98% of their forecast, so lineups seed them. Championship entry still needs a mark made in the league duels. Seasoning only ever improves a prospect: opening-division recruits and the fence tryout's teenager stay raw. It applies to scouting reports, the scout's tip and secret characters, and uses no random draws.
- **Headhunter's report.** A first title from National Division 3 upward (`HEADHUNTER_DIVISION`) makes the next free scouting report lead with a Legend.
- **No banking a banked mark.** In field meets, automatic tactics choose only Controlled or All out once the athlete has a valid mark (`autoTactic`, `src/domain/meet.js`).
- The rival tuning's maths is shared (`ratingForMark`, `markMultiplier` in `src/domain/competition.js`); rival forecasts are unchanged (`node scripts/division-audit.mjs 10`: 100% inside the bands).

### Results

`node scripts/depth-experiment.mjs <division> [seeds] [replays]` plays scripted careers to a division's final and replays it with the squad as played, then rebuilt as three specialists an event (keeping the club's own qualified athletes who are at least Epic standard and filling the rest with kitted-out Epic signings, with or without one Legend). Win rates over 60 replays per squad, three careers:

| Final | As played | Deep squad of Epics | One Legend and Epics |
| --- | ---: | ---: | ---: |
| National 3 | 13–82% | 95–100% | 95–100% |
| National 1 | 0–27% | 40–85% | 55–95% |
| International | 3–57% | 20–87% | 38–93% |
| Diamond | 3–70% | 10–85% | 10–85% |

At Diamond the rating scale saturates for everyone: Epic and Legend signings both arrive at 100 OVR, level with the median rival, and kit and skills decide the rest.

The audit bot now builds depth as a coach would: it fills the dormitories with the best prospects, swaps its weakest athlete for a clearly better prospect, and buys meet-skill books from the shelf for its best athletes. Engaged bot, six seeds, 30-season cap, finals won (`node scripts/rating-audit.mjs engaged 6 30`):

| Division | Growth pacing only | With depth changes |
| --- | ---: | ---: |
| National 3 | 75% | 86% |
| National 1 | 29% | 35% |
| Continental | 24% | 25% |
| International | 28% | 20% |
| World Tour | 18% | 31% |
| Diamond | 0% | 17% |
| Diamond titles within 30 seasons | 0 / 6 | 2 / 6 (seasons 25, 28) |

The growth curve is unchanged: no 90+ OVR athletes entering National 3, and 99–100 OVR waits for the World Tour and Diamond. The bot signs whatever its reports offer, mostly Commons, so a coach who hunts for Epics and the headhunter's Legends should do better than these figures.

Still open: rivals' meet-skill stacking makes finals swingy. The club can now match it through books and signings, but a human playtest should judge whether late finals feel fair. These are scripted bots, not people: they show the shape of the curve, not human campaign length.
