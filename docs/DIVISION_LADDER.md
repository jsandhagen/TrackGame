# One division ladder

Community → Local → District → County → County Premier → Regional → Regional Premier → National Division 3 → National Division 2 → National Division 1 → National Premier → Continental → International → World Tour → Diamond.

Each of the fifteen divisions is one competition: three club duels, then a championship. Win its championship to earn promotion to the next division. Earlier divisions remain replayable; Diamond champions can defend their title. There are no Open, Challenger or Championship sub-leagues. The championship is the final meet of each division.

The Meets board displays the ladder, each division's typical rival marks and the four entry standards before booking. The HUD, bookings, season messages, save-slot labels and trophy cabinet use division names. Club facilities and venue upgrades still open at milestones along the ladder: County, Regional Premier, National Division 1 and International. Each successive division has a larger title bonus; replay bonuses remain half the first-title amount.

## Event distances

These are tunable game ranges, not official athletics classifications. Each event has its own range and championship qualifying standard in `DIVISIONS` in `src/game-content.js`.

| Division | Shot | Discus | Hammer | Javelin |
| --- | ---: | ---: | ---: | ---: |
| Community | 7.6–10 | 19–28 | 21–32 | 23–34 |
| Local | 8.5–11 | 24–33 | 26.5–38 | 28.5–40 |
| District | 9.5–12 | 28.5–38 | 32.5–44 | 34–46 |
| County | 10.4–13 | 33–42 | 40–51 | 42–54 |
| County Premier | 11.4–14 | 37–46 | 44.5–56 | 46.5–59 |
| Regional | 12.3–15 | 41–49 | 49.5–60 | 51.5–64 |
| Regional Premier | 13.3–16 | 43.5–52 | 53–64 | 55–68 |
| National 3 | 14.2–17 | 46.5–55 | 57–68 | 59–72 |
| National 2 | 15.2–18 | 49.5–58 | 61–72 | 62.5–76 |
| National 1 | 16.1–19 | 52–61 | 64.5–75 | 66.5–79 |
| National Premier | 17.1–20 | 54–63 | 66.5–77 | 69.5–82 |
| Continental | 17.6–20.5 | 56–65 | 68.5–79 | 72–85 |
| International | 18.1–21 | 58–67 | 70.5–81 | 75–88 |
| World Tour | 18.5–21.5 | 60–69 | 72–83 | 78–91 |
| Diamond | 19–22 | 62–71 | 74–85 | 81–94 |

All values are metres. A band runs from an ordinary thrower's forecast up to a typical winning mark: rival forecasts fill it up to 95% of its top (`FORECAST_TOP`, `bandMark` in `src/domain/competition.js`), and the rest is left to meet-day winners, so a final's best throws reach the top and a big day goes slightly past it (see [growth pacing](GROWTH_PACING.md)). Rival attributes are calibrated against their actual equipment, mastery and condition so forecasts fit the booked division. Attribute strengths, club identities and named athletes remain. Replaying an earlier division uses that division's distances. These ranges describe typical forecasts: tactics, fouls, weather, skills and throw variation still affect a measured series, and marks are never clamped to the table.

The former single rating curve remains solely for legacy-save migration and the standards of already-booked legacy seasons. New bookings snapshot the four standards from the chosen division. Tuning a future standard therefore does not revoke qualifications earned in an ongoing season.

## Existing careers

Save coordinates and completed invitation keys retain their original mapping, in order, to the fifteen divisions. Old titles become the corresponding named division titles. Earned invitations stay available, including legacy saves that already reached a later level. Rosters, names, stats, gear, PBs, records, money and facilities are retained. An ongoing legacy competition keeps its existing rivals, recorded marks and qualifying standards until it finishes; the next booking uses the new division settings. Saves remain schema v8, with an optional standards snapshot on new division bookings.

## Validation and tuning

`node scripts/division-audit.mjs 10` samples equipped rival forecasts in every division and reports per-event medians and the proportion within the advertised bands. It also rejects routine world-record forecasts. `node scripts/stage-audit.mjs engaged 2 30` checks promotion pacing and fixture/championship win rates across scripted careers. These are game-balance diagnostics, not predictions of human play time.

Tests cover ordered promotion, locked divisions and duels, direct division booking, event ranges across seeds, replay strength, unchanged rival identities and player rosters, independent distance tuning without random draws, frozen booking standards, legacy titles and qualification, and the flat booking UI.
