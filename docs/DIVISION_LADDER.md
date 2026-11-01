# One division ladder

Community → Local → District → County → County Premier → Regional → Regional Premier → National Division 3 → National Division 2 → National Division 1 → National Premier → Continental → International → World Tour → Diamond.

Each of the fifteen divisions is one competition: three club duels, then a championship. Win its championship to earn promotion to the next division. Earlier divisions remain replayable; Diamond champions can defend their title. There are no Open, Challenger or Championship sub-leagues. The championship is the final meet of each division.

The Meets board displays the ladder, each division's typical rival marks and the four entry standards before booking. The HUD, bookings, season messages, save-slot labels and trophy cabinet use division names. Club facilities and venue upgrades still open at milestones along the ladder: County, Regional Premier, National Division 1 and International. Each successive division has a larger title bonus; replay bonuses remain half the first-title amount.

## Event distances

These are tunable game ranges, not official athletics classifications. Each event has its own range and championship qualifying standard in `DIVISIONS` in `src/game-content.js`.

| Division | Shot | Discus | Hammer | Javelin |
| --- | ---: | ---: | ---: | ---: |
| Community | 8–10 | 20–28 | 22–32 | 24–34 |
| Local | 9–11 | 25–33 | 28–38 | 30–40 |
| District | 10–12 | 30–38 | 34–44 | 36–46 |
| County | 11–13 | 35–42 | 42–51 | 44–54 |
| County Premier | 12–14 | 39–46 | 47–56 | 49–59 |
| Regional | 13–15 | 43–49 | 52–60 | 54–64 |
| Regional Premier | 14–16 | 46–52 | 56–64 | 58–68 |
| National 3 | 15–17 | 49–55 | 60–68 | 62–72 |
| National 2 | 16–18 | 52–58 | 64–72 | 66–76 |
| National 1 | 17–19 | 55–61 | 68–75 | 70–79 |
| National Premier | 18–20 | 57–63 | 70–77 | 73–82 |
| Continental | 18.5–20.5 | 59–65 | 72–79 | 76–85 |
| International | 19–21 | 61–67 | 74–81 | 79–88 |
| World Tour | 19.5–21.5 | 63–69 | 76–83 | 82–91 |
| Diamond | 20–22 | 65–71 | 78–85 | 85–94 |

All values are metres. Rival attributes are calibrated against their actual equipment, mastery and condition so forecasts fit the booked division. Attribute strengths, club identities and named athletes remain. Replaying an earlier division uses that division's distances. These ranges describe typical forecasts: tactics, fouls, weather, skills and throw variation still affect a measured series, and marks are never clamped to the table.

The former single rating curve remains solely for legacy-save migration and the standards of already-booked legacy seasons. New bookings snapshot the four standards from the chosen division. Tuning a future standard therefore does not revoke qualifications earned in an ongoing season.

## Existing careers

Save coordinates and completed invitation keys retain their original mapping, in order, to the fifteen divisions. Old titles become the corresponding named division titles. Earned invitations stay available, including legacy saves that already reached a later level. Rosters, names, stats, gear, PBs, records, money and facilities are retained. An ongoing legacy competition keeps its existing rivals, recorded marks and qualifying standards until it finishes; the next booking uses the new division settings. Saves remain schema v8, with an optional standards snapshot on new division bookings.

## Validation and tuning

`node scripts/division-audit.mjs 10` samples equipped rival forecasts in every division and reports per-event medians and the proportion within the advertised bands. It also rejects routine world-record forecasts. `node scripts/stage-audit.mjs engaged 2 30` checks promotion pacing and fixture/championship win rates across scripted careers. These are game-balance diagnostics, not predictions of human play time.

Tests cover ordered promotion, locked divisions and duels, direct division booking, event ranges across seeds, replay strength, unchanged rival identities and player rosters, independent distance tuning without random draws, frozen booking standards, legacy titles and qualification, and the flat booking UI.
