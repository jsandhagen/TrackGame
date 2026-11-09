# Wind, records, medals and rivals

This update adds the things a throws meet keeps count of beyond the team score, and fixes two balance problems the scripted careers showed at the top of the ladder. Rules live in `src/domain/honours.js`, `src/domain/mastery.js` (wind), `src/domain/calendar.js` (the wind forecast) and `src/domain/meet.js`.

## Wind

Before, wind was calm, headwind or crosswind, touched only the discus and affected every thrower alike, so it was never a decision.

- **Forecast.** `windOn(s, day)` gives each day a direction (headwind, tailwind, crosswind or calm) and a speed in metres a second, from the save's weather seed. Windy days always blow at 2.8–5 m/s; other days are calm four times in ten and otherwise carry a 0.8–2.6 m/s breeze. The call room and the club calendar show the day's wind and what it does, so entries can be chosen around it.
- **Who feels it.** The discus and the javelin fly on their shape and feel the wind; the shot and the hammer do not (`windFelt`).
- **It takes technique.** `windEffect(event, wind, speed, mastery)` scales with the speed (4 m/s is the reference) and the thrower's event mastery:

| | Headwind | Tailwind | Crosswind |
| --- | --- | --- | --- |
| Discus | −1% at no mastery to +2.5% at full mastery | −2% to −1.2% | −0.8%, more sector fouls |
| Javelin | −2.2% at no mastery to 0 at full mastery | +0.6% to +1.8% | −0.6%, more sector fouls |

  Figures are at 4 m/s. A crosswind raises foul risk by 5% per m/s (`windFoul`). At equal mastery both clubs are affected alike, so the wind does not shift the balance between the club and its rivals. It rewards entering the right thrower: on a headwind day a discus specialist with high mastery gains on a second-event entrant, and a strong tailwind makes the javelin the event to load.
- **Gusts.** Each throw gets its own reading within 1.2 m/s of the day's wind (`gust`), fixed by the meet and the attempt so a reloaded save reads the same gauge. The reading is shown with the mark ("Tailwind 3.1 m/s"), and the windsock lifts with the speed. The coach's decision panel shows the wind and its effect for the athlete about to throw.

Meets no longer draw the wind from the campaign's random stream, so seeded careers differ from earlier builds from their first meet. A meet saved mid-way before this update reads its wind as 2 m/s.

## Season's bests

Each athlete keeps a best per event for the calendar year (`seasonBest`). The first mark of a year sets it quietly. A later throw that beats it without being a personal best is called a season's best: an **SB** badge on the scoreboard, a tag on the field, a headline when nothing bigger happened, and a line in the meet report. It gives established athletes something to chase in a year when their lifetime best is out of reach, including athletes whose bests were set before distances were lowered.

## Division records

Every division keeps a record in each event (`divisionRecord`). It starts 3% past the top of the division's distance band, a little further than a typical final's winning throw. Any throw in a league duel or the league championship that beats it becomes the record at once, for either club.

- **Yours:** prize money of 20% of the division's title prize ($65 in the Community Division, $800 in the Diamond Division), 20 + 8 fans a division, an extra Coaching Insight, a career moment and a line in the club news.
- **A rival's:** a line in the news and a new mark to beat.

The thrower's goals in the meet bar show the record beside the PB and the standard, and Meets → Records lists the current division's records and holders. Duels and invitationals are not league meets and do not count.

## Championship medals and prize money

The first three in each event of a championship (the league championship or an invitational) take gold, silver and bronze. Medals are counted on the athlete's file and shown in the meet report.

In a league championship the purse now pays below first place:

| | Share of the division's title prize |
| --- | ---: |
| Gold · silver · bronze | 6% · 3.5% · 2% each |
| Club placed second on points | 30% |
| Club placed third on points | 15% |

The champions still take the title prize itself. Before this, a club that lost a Diamond final took home about $700 for the season's biggest meet and paid a $3,000 entry fee to try again.

## Head-to-head rivals

Rival clubs keep their people, and a tier's six clubs stay together for three divisions, so the same throwers meet repeatedly. After each event every home entrant gets a win or a loss against each rival thrower in it (a mark beats no mark; level places settle nothing), with the gap between their best marks.

Once two throwers have met twice (`RIVALRY_MEETINGS`), one opponent becomes the athlete's **rival** (`rivalOf`): the one they have traded the most wins with, then the one who finishes closest to them, then the one met most. A rival not seen for 90 days gives way to one who has been.

- The call room shows the head-to-head score for any entrant whose rival is in the event, and the meet bar shows it under the thrower.
- A throw that goes past the rival's best is a highlight ("Past rival Okoye!").
- Finishing ahead of the rival lifts the athlete's condition by 5, earns 4 XP and 3 fans, and the report gives the new score. Losing costs nothing extra.

Rivalries do not change distances. Released athletes' records are dropped.

## Balance

`node scripts/rating-audit.mjs engaged 6 30` on the previous build showed two things.

**1. The scripted club stalled at the top.** It won every final for nine divisions, then took about eight seasons to clear the World Tour Division (9% of finals) and won the Diamond title in one career of six. Tracing a World Tour final showed why:

- Rival throwers landed 3.5% further against their own forecasts than the club's did. Stars carried up to five equipped skills (three style skills, the captaincy and a signature), although the club's athletes have three slots at most.
- The club's best athletes sat on the Ace stat limit of 90 for ten divisions because it could never afford Star promotions: weekly wages and upkeep ran to about $3,700, and a lost final paid almost nothing.

Changes:

- **Rivals keep to three skill slots** (`rivalLoadout`, `RIVAL_SLOTS` in `src/domain/core.js`): signature and captaincy first, then the club's style in order. Saved clubs trim their loadouts when a meet starts. Skills, stats and forecasts are unchanged.
- **Medal and placing prize money**, as above.
- The audit bot now learns the common meet skills (Opening Salvo, Front Runner) that any coach would. This is a change to the measuring tool, so the comparison below runs the old game with the same improved bot.

Engaged bot, 30-season cap, six careers each:

| Division | Seasons to clear, before → after | Finals won, before → after |
| --- | ---: | ---: |
| National Division 1 | 1.5 → 2.2 | 67% → 46% |
| National Premier | 1.3 → 1.3 | 75% → 75% |
| Continental | 1.5 → 1.2 | 67% → 86% |
| International | 2.2 → 1.3 | 46% → 75% |
| World Tour | 5.0 → 4.8 | 17% → 21% |
| Diamond | 10.2 → 5.5 | 0% → 9% |
| Careers winning the Diamond title | 0 of 6 | 3 of 6 |

Six careers is a small sample: an earlier run of the same seeds, differing only in which opponent counted as a rival, won five of six. Read the direction, not the decimals.

The top two divisions are still the hardest part of the game, as they should be, and remain a multi-season campaign for the bot. Winning a seven-club championship at level strength is a one-in-seven result by construction, so a club has to be clearly better than the field: a deep squad, meet skills from books (a Captain above all, which every top rival club has) and Star and Legend promotions. These are scripted bots, not people.

**2. The first nine divisions are a procession** for the scripted club: every fixture and final won, one season a division, with league finals around 80–19 on points. This update does not change that curve, which was tuned recently and may be the intended cosy start. Division records, medals and rivals give a dominant club more to play for in those seasons. If playtests agree the early game lacks tension, the place to look is how far the club's best forecast runs ahead of the division's best rival (4–11% from the District to the Regional Premier Division).

## Saves

No schema change. Season's bests, medals, division records and head-to-heads are created as they are earned, and older saves load as they are. Seeded campaigns differ from earlier builds because the wind is no longer drawn from the campaign's random stream.
