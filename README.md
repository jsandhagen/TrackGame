# Ring & Sector — Club Athletics

An offline, landscape-first club management game inspired by the warmth, discovery and connected progression of classic miniature management games. Develop a team of throwers, build a home for them, and take the club from a community league to a repeatable world championship.

## Play loop

**Prepare → choose a four-event lineup → face a rival club → invest → reach the final → promote or try again.**

- Five leagues: Community, County, Regional, National and World.
- Three round-robin fixtures and a top-two final in each season. All earned club progress carries over.
- Shot put, discus, hammer and javelin contribute to one team score. Specialists and squad depth matter; double duty is possible with penalties.
- Two attempts per event in regular meets, three in finals. Choose a safe, controlled or aggressive approach. Handle the release or use assisted timing.
- No decision timeout. Training advances only when requested; competition and results wait for input. Interrupted attempts resume at planning without duplicating rewards.
- Athlete training, form, fatigue, recovery, traits, earned skills, personal bests, career moments and gradual long-term potential growth.
- Recruiting, up to eight athletes, contract release with club legacy, permanent equipment and tuning, weekly wages and season sponsor choices.
- Nine editable grounds plots, free facility moves/swaps, upgrades with visible art changes, and four synergies with different effects.
- Original procedural pixel scenery, shaded buildings, animated people, a stadium crowd, event-specific preparation/release gestures and projectile flights.
- No premium currency, real-money purchases, ads, energy sales or login streaks.

This is a substantial playable prototype. Campaign correctness and initial balance are tested, but long-term balance and native device behavior still need real playtesting. See [League design](docs/LEAGUE_DESIGN.md) and [design vision](docs/VISION.md).

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

Open **Club → Export club / Import club**. JSON backups transfer between browser and app. Imports validate the schema and require confirmation. Existing v2 HTML-prototype backups migrate into the league campaign; existing names, stats, funds and personal bests are retained where applicable, with a starter squad filling missing event roles. Old paid-equipment systems do not map one-to-one onto the redesigned kit rules.

Saves use the `ring-sector-leagues-v3` key. A damaged save stops loading instead of being silently replaced. Training, planning, recorded throws and settled rewards are saved. A reload during timing returns to the planning decision. A reload after release retains the recorded result. Browser/app storage is separate until transferred; cloud sync is not implemented.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/game-content.js` | Leagues, events, clubs, equipment, facilities, traits and skill definitions |
| `src/domain/game.js` | Seeded simulation, progression, economy, lineups and match state machine |
| `src/domain/campaign-save.js` | Campaign validation and migration |
| `src/domain/savegame.js` | Legacy v2 import validation |
| `src/render/art.js` | Cached grounds, buildings, people, stadium and flight animation |
| `src/main.js` | Game interface, deliberate training, inputs and navigation |
| `src/platform/` | Native lifecycle, saves and backup sharing |
| `android/` | Native shell, orientation, immersive view, icon and splash resources |
| `tests/` | Campaign, scoring, reward idempotence, economy constraints and save scenarios |
| `.github/workflows/` | Validation and development-APK build |

The native package ID is `io.github.jsandhagen.ringsector`. A web production bundle lives in `dist/` after building, but no public website deployment or app-store publication is configured.
