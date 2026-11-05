# Growth pacing across the ladder

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

## Known issue: the top finals

From International upwards, championship finals are a wall **in both versions**: International finals 18% → 3%, World Tour 2% → 0%, and no engaged bot wins the Diamond title within 30 seasons. Fixtures are still won 76–89% of the time. The cause is depth, not the leader. A championship scores every qualified thrower from all the division clubs (10-8-6-5-4-3-2-1), the club enters at most three per event with each athlete in at most two events, and the late rival squads are deep and carry developed secondary events. A small roster has to double up in secondary events at low mastery. This needs its own change (championship entry rules, roster size, or secondary-event development) and a re-run of this audit. These are scripted bots, not people: they show the shape of the curve, not human campaign length.
