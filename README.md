# Ring & Sector — Club Athletics

[**Download the Android APK**](https://github.com/jsandhagen/TrackGame/releases/download/android-latest/ring-sector.apk) · [Android releases](https://github.com/jsandhagen/TrackGame/releases/tag/android-latest)

The APK is refreshed after a successful Android build on `main`.

Current design: [distances, difficulty, money and landscape screens](docs/DIFFICULTY_ECONOMY.md) · [calendar, weather, away grounds and invitationals](docs/CALENDAR_WEATHER.md) · [implements, rival variety and campus improvements](docs/CLUB_VARIETY.md) · [event mastery and throwing development](docs/EVENT_MASTERY.md) · [balance and validation](docs/BALANCE_CURRENT.md).


A cosy, offline club-management game about a tiny throwing club that grows into a world champion, in the spirit of Kairosoft's management games such as Pocket League Story 2 and Game Dev Story. Original characters, art and names; no premium currency, ads, energy or login streaks.

## The loop

**Press play → watch the club train → build, equip and level up → take four throwers into a live head-to-head meet → collect prizes → climb five leagues.**

- **Your own stadium, from field to Olympic bowl.** The club starts with a gravel track in a grassy field. The track becomes synthetic and then championship standard. The grandstand grows from an open field with a rail round the track to metal bleachers, a covered main stand, stands all round and finally an Olympic stadium with a ring roof. The stands are drawn with real height: tiered rows, outer walls, wing walls and roofs. The infield is all track and field, with throwing cages and runways in the D's and pole vault and long jump areas. Home meets are held in your stadium.
- **Kit and stadium customisation.** Kit patterns (stripes, hoops, sash, halves), shorts, seat colours, roof and track colours, the stadium facade and the Olympic tower's design and colours unlock through fans, leagues, trophies and stadium upgrades. You buy each one once with club money, then switch freely. You can also name your stadium.
- **A campus around it.** The club's buildings line three streets outside the stadium: Club Row across the forecourt, a north lane past the practice field, and the boulevard by the car parks. Thirteen plots hold the clubhouse, Strength Room, Recovery Spa, café, merch stand, dorms, scouting, workshop, lab and decorations. More plots open as you climb leagues. **15 combos**: thirteen come from buildings side by side on the same street (Fuel Station, Spa Day, Tech Hub…) and two from stadium milestones (Complete Arena, Night Fever). Moving a building is free.
- **A full-screen club.** The world fills the screen. Drag to pan, pinch or scroll to zoom, and tap an athlete, building or part of the stadium to open it. Menus pop up as windows over the scene, docked to the side on wide screens (full height beside a slim menu rail on phones held sideways) and as bottom sheets in portrait. Athletes walk to the right place for their training plan (laps on the track, throws at their own circle, weights in the gym) and gains pop above their heads. Visitors arrive by bus, fill the stands and spend at the café. A clock in the HUD runs each training day from 06:00 to 22:00: warm dawns, golden evenings, then night with the floodlights and windows glowing. Days follow a calendar (Monday 1 March, Year 1; paydays on Sundays), and the scenery follows its seasons, snow included.
- **Weather and a calendar.** Every day has a forecast you can see a week ahead: rain and snow slow outdoor work but not the gym, heat costs stamina, sunshine brings visitors, and meet-day weather sets the conditions in the circle (wet circles, cold implements, gusts). Tap the date for the club calendar.
- **Away grounds that grow with the league.** Each rival club has its own ground, from a park with a grass bank in the Community League to an Olympic bowl in the World League. Finals go to neutral showpiece venues, and the big ones hold evening meets under the lights. Pegs, flags and lines across the sector mark every best, the leader, the PB, the club record and the scoring target.
- **Rare Invitationals.** Every month or two an invitation arrives for a one-day meet against the All-Star Select at a seasonal showpiece venue. Win it for a prize you can't buy.
- **A clear stat scale.** Power, Technique, Speed and Focus run from 1 to 100 with letter grades (G below 30, then F, E, D, C, B, A, and S at 90+), and each athlete shows an overall rating (OVR) for their event, also in the meet lobby against each rival.
- **Real distances, no ceiling.** Marks follow real athletics, from novice club throws (around 9 m in the shot, 33 m in the javelin) to world-class ones. A fully built club can break the world records, and growth then slows but never stops: Legends earn stars past 100, buildings level past 3 with landmark bonuses every fifth level, and sessions and forging keep levelling. Rivals climb one steady curve from Community Open to the World Championship. Money stays tight: counters serve a limited crowd, buildings cost upkeep, wages rise with rank and higher leagues charge entry. Daily plans lean on facilities, and research buildings such as the Coaches' Library and Sports Science Institute produce the Coaching Insights that pay for coached sessions.
- **Characters worth keeping.** Rarity (Common → Legend), 12 backgrounds (Farm Kid, Chess Prodigy, Class Clown…), levels that grant **skill points**, **ranks** (Rookie → Pro → Ace → Star → Legend) that raise stat caps, add skill slots and change their look, mood and stamina, career moments and season awards.
- **34 skills**: 28 to learn across training, meet, team and event-specific signature moves (Meteor Put, Sky Spear…), each shown with a cut-in when it fires. **Six secret characters** with unique skills arrive when you hit milestones.
- **33 items**: consumables (Energy Drink, Protein Shake, Skill Scroll…), and implements, shoes and charms with rarities. A shop that stocks more as your fan base grows, meet prize drops, a travelling merchant and a workshop that forges gear.
- **Watchable meets.** Four events, with attempts rotating through the field. Each throw has a short introduction and a result that stays readable at every speed: 1.8 seconds normally, 2.8 for PBs and major scoring changes. Highlights shorten routine deliveries; 1×/2×/4× controls delivery speed. Pause to study the standings, or skip to the report. Live results show places, improvements and team-point swings; the report celebrates event winners, podium sweeps and PBs. Watch mode lets athletes choose their approach, with optional clutch pauses; Coach mode lets you call every throw, with optional manual release timing.
- **A clear view of the field.** Landscape meets use a vertical scoreboard beside the arena. Athletes and officials share a consistent scale, and the entire venue fits the available space. Throwing sectors use the event's angle (34.92° for the circles, 28.96° for javelin), with curved distance arcs and landing marks on the same projected ground plane.
- **Always something next:** 40 club goals with rewards, 17 story events with choices (journalists, merchants, tryouts, rainy days, a dog stealing a javelin), sponsors that unlock with fans, awards night, a combo notebook, records and a trophy cabinet.

No decision times out. Time only moves while you press play and stops for meet day and story events. Progress saves after every day and every throw.

## Run on your computer

Requires Node 22.12+.

```sh
npm ci
npm run dev
```

Open the printed local URL. Use `npm run dev -- --host 0.0.0.0` to expose the development server to your own local network if your environment allows it. No database or game server is required. `npm run check` runs domain/save tests and a production build.

## Android app

The `android/` project packages the game locally with Capacitor. It follows the device orientation by default (with portrait and landscape preferences in Settings), requests immersive presentation with swipe access to system controls, pauses on backgrounding, uses native Preferences for saves and the system share sheet for backup export.

Local native development requires Java 21, Android Studio 2025.2.1+ and Android SDK 36:

```sh
npm ci
npm run android:sync
npm run android:open
```

Run on a connected device from Android Studio. `npm run android:debug` builds `android/app/build/outputs/apk/debug/app-debug.apk` when the Android toolchain is installed.

The **Build Android APK** GitHub Actions workflow runs on pushes to `main` and can be started manually. Its `ring-sector-android-debug` artifact contains a development APK. Download and extract the artifact, then install the APK on your Android device. This is not a Play Store release. The workflow result, rather than native-project generation alone, determines whether APK compilation succeeded.

### Stable signing for development updates

Android requires the same signing key for an in-place update. For repeated distributed development builds, set repository secret `ANDROID_DEBUG_KEYSTORE_BASE64` to the base64 encoding of your persistent debug keystore. The workflow restores it in Android's standard debug-keystore location. Never commit signing keys. Without that secret, fresh runners can generate different keys and an uninstall may be necessary. **Export your club before uninstalling.** Production signing and store publication are separate tasks.

## Saves

Open **Office → Export club / Import club**. JSON backups transfer between browser and app. Imports validate the schema and require confirmation.

Careers are stored under the `ring-sector-leagues-v3` key with an internal schema version. 0.5.0 writes schema v5 and migrates older saves on load. Grid-layout saves from earlier 0.5 builds (v4) keep everything: throwing and sprint buildings become the matching stadium installations at the same level, the studio and grandstand move into the stadium, other buildings go onto the new plot ring, and anything that no longer fits is refunded at half its cost. v3 league careers keep their roster, stats, personal bests, results, trophies, funds and facilities; old kit becomes gear in the bag, an equipped skill maps to its nearest new skill, and experienced athletes receive ranks and skill points for their levels. A meet that was interrupted under 0.4 restarts from the lobby, because the meet engine changed. v2 prototype backups still import. A damaged save stops loading instead of being silently replaced.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/game-content.js` | Events, ranks, rarities, backgrounds, skills, items, facilities, combos, leagues, clubs, sponsors, secret characters |
| `src/domain/core.js` | Seeded RNG, athlete model, effects aggregation, projections, XP, inventory helpers |
| `src/domain/game.js` | New game, daily training/visitor/economy simulation, grounds, items, skills, ranks, recruiting, seasons |
| `src/domain/meet.js` | Beat-by-beat meet engine, tactics and risk model, rival AI, settlement and rewards |
| `src/domain/story.js` | Club goals, story events, secret characters and season awards |
| `src/domain/campaign-save.js` | v5 validation and v4/v3/v2 migration (grid layouts move into the stadium) |
| `src/render/` | Pixel helpers, bitmap font, chibi sprites, item icons, hand-drawn UI icons, campus buildings, the club stadium (`arena.js`), the world map and camera, the meet stadium, synthesized sound |
| `src/ui/pages.js` | Pop-up window pages (club desk, squad, athlete, recruit, build, shop, league, office, lobby, meet) |
| `src/main.js` | Wiring: full-screen shell, HUD and menu, windows, map input (pan, zoom, tap), day loop, meet presenter, dialogs, toasts, persistence |
| `src/platform/` | Native lifecycle, saves, backup sharing and game updates |
| `scripts/icon.html`, `scripts/render-icons.cjs` | App icon artwork (drawn with the game's sprites) and the exporter for web, Android adaptive and legacy icons |
| `scripts/balance-audit.mjs` | Scripted careers for pacing and economy checks |
| `tests/` | Meets, campaign flow, facilities, training, items, skills, recruiting, events, migration and tactics balance |

The native package ID is `io.github.jsandhagen.ringsector`. A web production bundle lives in `dist/` after building, but no public website deployment or app-store publication is configured.

## 0.5.0: the club comes alive

A rebuild of the game around the Kairosoft loop: a club stadium with a campus around it, a full-screen world with pop-up menus, hand-drawn pixel icons, graded 1–100 stats, characters with skills and ranks, items and rarities, secret characters, story events, goals, sponsors and watchable meets, with all-new outlined pixel art and sound. See [game design](docs/GAME_DESIGN.md) and [balance notes](docs/BALANCE_V0.5.md).

The Android shell from 0.4.0 can receive this version as an automatic game update (no reinstall); see [update behavior](docs/AUTO_UPDATES.md). Export your career before uninstalling or switching devices.
