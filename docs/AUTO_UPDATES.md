# Automatic game updates

Ring & Sector 0.4.0 adds self-hosted game updates to the Android shell. Install this APK once. Later changes to the simulation, UI, CSS and art can arrive without reinstalling. Play works offline.

## Player flow

1. A healthy launch checks the repository's `game-updates/latest.json` release asset in the background.
2. Compatible game files download and have their SHA256 checked by the native updater. Gameplay continues.
3. The download is staged in native Preferences. It is **not** registered with the plugin's `next()` API: that API can activate on resume from the background.
4. The next cold launch backs up the current native save, clears the pending marker and activates the downloaded bundle. An optional **Club → Apply downloaded update** control saves and flushes first, and is unavailable during training or a meet.
5. The game validates the save and renders before acknowledging healthy startup. Save writes are disabled until the acknowledgment. The plugin reverts an unacknowledged startup after 20 seconds; an attempted build is not automatically retried.

Switching away from the app is not a cold launch. Finish and reopen the process, or use the Club control when idle. No background installation service runs while the app is closed. An internet connection is needed to check or download, not to play.

## Publishing

`.github/workflows/game-updates.yml` runs tests and builds on main, ZIPs the contents of `dist` at its root, publishes an immutable commit-named ZIP, then publishes `latest.json` last. This uses GitHub Releases and the open-source Capgo native plugin in manual mode; it does not use a paid update service. Plugin cloud auto-updates and telemetry endpoints are disabled.

The manifest pins the repository/release URL, save schema 3, exact bundle SHA256 and native compatibility fingerprint. The fingerprint includes native source/resources, Gradle configuration, Capacitor config and native package versions, excluding generated web assets. A web-only commit keeps the fingerprint; native changes require a new APK. Never manually point `latest.json` at files that did not pass checks. Repository write access controls publication. HTTPS and SHA256 provide transport/integrity checks; this setup does not add a separate offline code-signing authority.

App icon, plugins, native permissions and Android API changes require a new installer. The app currently reports this in Club; it cannot silently install a sideloaded native APK. Existing 0.3.0 installs cannot acquire the updater without this one-time shell upgrade.

## Saves and recovery

The career key remains `ring-sector-leagues-v3`. Existing v3 careers gain defaults for mastery/clinics and preserve matches. Prototype v2 imports still migrate. A native save snapshot is stored at `ring-sector-pre-update-backup` before activation. This is a developer recovery snapshot; normal transfers use Club → Export/Import. Uninstalling Android removes private app data, including this snapshot. Export before uninstalling.

APK builds use a development signing key. To allow subsequent native builds to replace each other, configure the repository's `ANDROID_DEBUG_KEYSTORE_BASE64` secret with a stable development keystore. Older installations signed with a different key may require export, uninstall, install and import. Production distribution needs a stable release-signing setup.

## Validation and limits

Automated tests exercise staging without activation, cold-start activation, save backup, failed-attempt suppression, offline/checksum failures, URL/schema/compatibility rejection and idle restart policy. Browser checks exercise game startup and the competition controls. GitHub Actions compiles the native updater into the APK. A physical Android download → restart → rollback test remains necessary before calling the OTA path production-ready; mocked bridge tests and an APK compile cannot establish device behavior.
