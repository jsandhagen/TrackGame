# Calendar, weather, away grounds and invitationals

## Calendar and clock

Day 1 is Monday 1 March, Year 1. Months are 14 days and a year is 168 days, so paydays (every seventh day) fall on Sundays. Spring is March to May, then summer, autumn and winter; the club map's scenery follows the calendar season. The HUD shows the date and a clock that runs from 06:00 to 22:00 across each training day and holds while paused. The map warms at dawn, turns golden in the evening and darkens at night, when floodlights, windows and street lamps glow. Night is softened at faster speeds and with Reduce motion.

Tap the date to open the **club calendar**: today's weather and its effects, a seven-day forecast, a four-week grid of meets, invitationals and paydays, and a list of what's coming up. Later league fixtures are projected from the booking's spacing.

## Weather

Each day's weather comes from the save's weather seed and the day number, with seasonal odds. It is a pure function, so the forecast is always right and replaying never changes it. Saves without a seed gain one derived from their RNG state on load.

| Weather | Training | Visitors | Meets |
| --- | --- | --- | --- |
| Sunny | — | +15% | — |
| Cloudy | — | — | — |
| Windy | — | −10% | Always a headwind or crosswind |
| Rain | Outdoor −20%, indoor +10% | −40% | Foul risk ×1.25 (wet circle) |
| Heatwave (summer) | Stamina use +25% | +25% | Stamina use +25% |
| Snow (winter) | Outdoor −35%, indoor +10% | −50% | Marks −1.5% (cold implements) |

Indoors means the Strength Room and the film room; laps, sprints and throwing are outdoors. On other days the meet wind is calm half the time. The map draws cloud shadows, rain, snow, gusts and heat haze; meets show the same weather, plus a windsock.

## Away grounds

Every rival club has a ground named for it, with a skyline read from its name (sea, mountains, city, trees, hills or town). Its size follows the level the meet is played at:

| Level | Ground |
| --- | --- |
| County | A park: grass banks, a small bleacher and a clubhouse hut |
| Regional | Metal bleachers with a press box |
| National | A covered stand under floodlight towers |
| International | Two tiers, a roof and a live big screen |
| Diamond | An Olympic bowl with a ring roof |

League finals go to the level's neutral showpiece venue, one size up. Duels and home fixtures use your own stadium. Bigger venues hold evening meets under the lights. The venue's name appears in the lobby, on the fixture card and in the opening banner.

## Meet markers

Every entrant's best gets a peg in its club colours, with its place. The current thrower's best is flagged. Lines mark the leader, the thrower's PB, the club record (dashed) and the scoring target. Labels stack in rows so close marks stay readable, and a mark still in the air stays hidden.

## Invitationals

The first invitation can arrive from day 18, then every 30 to 50 days. Each one names a seasonal showpiece (Blossom, Midsummer, Harvest or Frost Invitational), a date 9 to 16 days ahead and a winner's prize that isn't sold in shops, chosen for your current level. Accept with an open calendar from the Meets board; booking anything else in the meantime means missing it, and a missed date lapses until the next invitation. You can withdraw before the day.

You face the **All-Star Select**: the best specialist in each event from every club at the level, cloned with slightly sharper stats and mastery. It's one day in championship format, with three throws and three more for the top four; Big Stage effects apply, and a tied score goes to a distance tie-break. Meet money is ×1.5. The winner gets the headline prize plus a lucky item roll; every finisher gets a rare-or-better keepsake. Wins go into the trophy cabinet.
