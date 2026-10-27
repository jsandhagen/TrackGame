# Ring & Sector — Club Athletics

A cosy, offline club-management game about a tiny throwing club that grows into a world champion, in the spirit of Kairosoft's management games such as Pocket League Story 2 and Game Dev Story. Original characters, art and names; no premium currency, ads, energy or login streaks.

## The loop

**Press ▶ → watch the club train → build, equip and level up → take four throwers into a live head-to-head meet → collect prizes → climb five leagues.**

- **A living 2.5D grounds.** Each athlete walks to the facility for their training plan (Strength Room, Throws Centre, Sprint Lanes, Video Studio, Recovery Spa) and stat gains pop above their heads. Visitors wander the paths and spend money at the café and merch stand. Seasons change the scenery, snow included.
- **16 facilities on a 4×3 plot grid** that opens up as you climb leagues. Each has three visibly different levels. **14 neighbour combos** (Power Circuit, Fuel Station, Zen Corner, Tech Hub…) are discovered by placing buildings side by side; moving is free.
- **Characters worth keeping.** Rarity (Common → Legend), 12 backgrounds (Farm Kid, Chess Prodigy, Class Clown…), levels that grant **skill points**, **ranks** (Rookie → Pro → Ace → Star → Legend) that raise stat caps, add skill slots and change their look, mood and stamina, career moments and season awards.
- **34 skills**: 28 to learn across training, meet, team and event-specific signature moves (Meteor Put, Sky Spear…), each shown with a cut-in when it fires. **Six secret characters** with unique skills arrive when you hit milestones.
- **33 items**: consumables (Energy Drink, Protein Shake, Skill Scroll…), and implements, shoes and charms with rarities. A shop that stocks more as your fan base grows, meet prize drops, a travelling merchant and a workshop that forges gear.
- **Watchable meets.** Four events, rival throws first, then you. Watch mode lets athletes choose their approach and pauses only for clutch moments; Coach mode lets you call every throw, with optional manual release timing. Speed 1×/2×/4× or skip.
- **Always something next:** 36 club goals with rewards, 16 story events with choices (journalists, merchants, tryouts, rainy days, a dog stealing a javelin), sponsors that unlock with fans, awards night, a combo notebook, records and a trophy cabinet.

No decision times out. Time only moves while you press play and stops for meet day and story events. Progress saves after every day and every throw.

## Run on your computer

Requires Node 22.12+.

```sh
npm ci
npm run dev
```

Open the printed local URL. Use `npm run dev -- --host 0.0.0.0` to expose the development server to your own local network if your environment allows it. No database or game server is required. `npm run check` runs domain/save tests and a production build.

## Android app

The `android/` project packages the game locally with Capacitor. It opens in landscape, requests immersive presentation with swipe access to system controls, pauses on backgrounding, uses native Preferences for saves and the system share sheet for backup export.

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

Careers are stored under the `ring-sector-leagues-v3` key with an internal schema version. 0.5.0 writes schema v4 and migrates older saves on load: v3 league careers keep their roster, stats, personal bests, results, trophies, funds and facilities (mapped onto the new 12-plot grounds); old kit becomes gear in the bag, an equipped skill maps to its nearest new skill, and experienced athletes receive ranks and skill points for their levels. A meet that was interrupted under 0.4 restarts from the lobby, because the meet engine changed. v2 prototype backups still import. A damaged save stops loading instead of being silently replaced.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/game-content.js` | Events, ranks, rarities, backgrounds, skills, items, facilities, combos, leagues, clubs, sponsors, secret characters |
| `src/domain/core.js` | Seeded RNG, athlete model, effects aggregation, projections, XP, inventory helpers |
| `src/domain/game.js` | New game, daily training/visitor/economy simulation, grounds, items, skills, ranks, recruiting, seasons |
| `src/domain/meet.js` | Beat-by-beat meet engine, tactics and risk model, rival AI, settlement and rewards |
| `src/domain/story.js` | Club goals, story events, secret characters and season awards |
| `src/domain/campaign-save.js` | v4 validation and v3/v2 migration |
| `src/render/` | Pixel helpers, bitmap font, chibi sprites, item icons, buildings, grounds scene, stadium scene, synthesized sound |
| `src/ui/pages.js` | Panel pages (club desk, squad, athlete, recruit, grounds, shop, league, office, lobby, meet) |
| `src/main.js` | Wiring: day loop, meet presenter, dialogs, toasts, input, persistence |
| `src/platform/` | Native lifecycle, saves, backup sharing and game updates |
| `scripts/balance-audit.mjs` | Scripted careers for pacing and economy checks |
| `tests/` | Meets, campaign flow, facilities, training, items, skills, recruiting, events, migration and tactics balance |

The native package ID is `io.github.jsandhagen.ringsector`. A web production bundle lives in `dist/` after building, but no public website deployment or app-store publication is configured.

## 0.5.0: the club comes alive

A rebuild of the game around the Kairosoft loop: a living grounds, characters with skills and ranks, items and rarities, secret characters, story events, goals, sponsors and watchable meets, with all-new outlined pixel art and sound. See [game design](docs/GAME_DESIGN.md) and [balance notes](docs/BALANCE_V0.5.md).

The Android shell from 0.4.0 can receive this version as an automatic game update (no reinstall); see [update behavior](docs/AUTO_UPDATES.md). Export your career before uninstalling or switching devices.
