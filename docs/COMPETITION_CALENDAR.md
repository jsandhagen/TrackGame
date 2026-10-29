> Current progression and newly booked league rules: [Learning the club and competing in leagues](PROGRESSION_AND_CHAMPIONSHIPS.md). The original calendar rules below remain applicable to legacy bookings.

# Competition calendar — 0.6.0

The Meets board replaces automatic enrolment. Train with an open calendar, book a single duel, or enter a league tournament. Pick 3, 5, 7 or 10 preparation days and 4, 7 or 10 days between league fixtures. An unstarted booking can be cancelled before meet day. Sporting trophies unlock competitions; duels have optional first-win rewards.

Each of five levels has Open, Challenger and Championship trophies. First titles award a skill scroll, promotion letter and talent elixir respectively. Championship titles invite the club to the next level. Previous tournaments remain available with reduced title bonuses. Training speed is unchanged; the longer career contains fifteen trophies, career milestones and development rewards.

Duels and league fixtures give each athlete three throws. League finals use three qualifying throws, followed by three more for the top four athletes in each event; qualifying marks count toward the result. Each club may enter up to three athletes per event. Each athlete may enter two events; events can be left empty to concentrate resources elsewhere. Auto-pick fills two entries per event where the roster permits. Rivals field two entries per event.

Individual placings award 5, 3 and 1 points. Lower places and all-foul series score zero. Equal best distances use the next-best marks for countback. Identical complete series share the points for occupied places. Team scores sum individual points; championship team ties use a distance tie-break without adding artificial points.

Athletes earn eight permanent career milestones automatically through appearances, valid throws, personal bests and event wins. Saved training and meet skill setups switch automatically when enabled. Informational single-choice story events go directly into the journal; real choices still pause. Watch mode defaults to uninterrupted competition.

Save schema 6 migrates previous careers without removing trophies, athletes or active meets. An already-running legacy meet finishes in its original format. Existing current leagues become Championship entries with prior invitations credited.

Validation: deterministic simulation and save/resume tests cover the fifteen-trophy career, rewards, bookings, multi-entry scoring, ties, finalists, loadouts and migration. Scripted balance runs are not a substitute for device playtesting. The older balance documents describe the prior automatic calendar and head-to-head scoring.

Android downloads: the Android workflow builds the APK and uploads `ring-sector.apk` to the `android-latest` GitHub release. The README links to that stable asset URL.
