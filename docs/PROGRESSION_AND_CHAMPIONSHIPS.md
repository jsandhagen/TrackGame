# Learning the club and competing in leagues

New clubs meet their four throwers in a short opening card, then go straight to a Community duel available today. There is no mandatory preparation wait or training before the first meet. One thrower per club enters each of the four events, taking three attempts each. The first call room explains best legal marks, club points and fouls, then offers Watch or Coach. The starting lineup is ready and tucked into an optional detail. League qualification is introduced later, when it becomes relevant.

Each completed meet introduces one system, whether the club wins or loses:

| Meet completed | System introduced |
| --- | --- |
| 1 | Daily training plans |
| 2 | Coached sessions and Coaching Insights |
| 3 | Skills, saved skill setups and rank promotions |
| 4 | Facility construction and stadium upgrades |
| 5 | Equipment, consumables and the kit shop |
| 6 | Scouting and recruitment |
| 7 | Training chemistry |
| 8 | Facility duties |
| 9 | Club office: sponsors, finances and goals |
| 10 | Club stories and decisions |
| 11 | Invitationals |

Menus, athlete tabs and action handlers share these requirements. Rewards and skill points earned early remain saved for their later introduction. Insights do not accumulate before coached sessions open. The first duel defaults to uninterrupted watching at the two-arrow pace. Coach is available in the first call room and during the meet; the first coaching decision briefly explains the three tactics. The clubhouse and meet report explain each new system, with a direct action from the report to try it at the club. Established careers without onboarding state retain access to all systems.

## League schedule and qualification

New leagues have three duels followed by a multi-club championship. Earn the published event minimum in that league's duels to qualify; training forecasts and lifetime PBs do not count. The game scales standards with the division and tournament stage. Other division clubs compete in simulated three-attempt meets during the duel weeks and record measured series too. A club with no qualified athlete finishes its season and can rebuild; a qualifying club can enter even after losing its duels.

Six division clubs attend the championship, with up to two qualified rival entries per event. Player limits remain three entries per event and two events per athlete. All entrants take three preliminary throws. The top six advance to three final throws in reverse preliminary order, retaining every mark. Countback decides the cut; exact full-series ties at the boundary advance together. All-foul series do not advance from a larger field. Fields of six or fewer continue after the preliminary rounds.

Championship points are 10–8–6–5–4–3–2–1 for each athlete's own club. Identical complete series share points and all-foul entries score zero. Team totals remain separate; a team points tie uses the existing normalized-distance tiebreak. Duels retain 5–3–1 scoring. Existing circuit titles and promotion rewards remain in place.

The game deliberately uses a six-athlete final for a tighter field. [World Athletics](https://worldathletics.org/disciplines/throws/javelin-throw) normally advances eight after three attempts. League details vary: the [Middle Atlantic Conference handbook](https://static.gomacsports.com/FactBooks/31.%20Outdoor%20Track%20%26%20Field.pdf), section III K–L, advances nine, scores eight places, retains preliminary marks and publishes championship entry standards. The game's distance standards are balance values, not a reproduction of a real league's marks.

## Watching the sport

One, two and three arrows select continuous playback at 1×, 2× and 8×. A training day lasts 30, 15 or 3.75 seconds respectively. Every speed presents setup, flight, landing and results, updates the scoreboard and can be paused or changed mid-sequence. Coach/clutch decisions always wait for the player. Highlights never secretly accelerate the one-arrow pace. There is no Skip control; three arrows runs the normal sequence very fast. Training still stops at meet day and real club decisions.

Quiet notifications default on. Routine goals, levels and discoveries stay in journals and reports. Coached results appear inline in Training; items and promotions use brief confirmations rather than growth dialogs. Real choices still pause, while ordinary stories have a seven-day minimum gap and a reduced daily chance. Settings can restore detailed celebrations.

Every visiting club has a separate bench/standing area and pennant, with its own colours. Captain and celebration effects remain within that club. The MVP award has a dedicated solid, shaded five-point star.

## Explaining progress without pop-ups

The opening explains only the first duel. An optional league guide explains entry standards, the 3+3 structure, six-athlete cut, countback and retained marks when league play opens. Meets → Qualification shows each minimum, each athlete's recorded mark and who qualified. It remains available between meets, with a direct link from the clubhouse.

During league duels, the live panel shows the current event standard and a Standards toggle opens named qualification progress. An incoming mark stays concealed until it lands. The meet report also has a Qualification tab. Scoreboards show at most ten athletes; all attempts remain available in the expandable throw series.

## Compact grounds and buildings

The city strip in front of the stadium is about a third shallower, with the boulevard and lower building row moved 60 map pixels closer. The thirteen save slots keep their identities. Gates, walking routes, parking, the bus stop, selection and drawing share the compact geometry.

Map facilities and neighbouring houses use oblique building volumes with shaded side walls, roof planes, brick, timber or metal courses, and tiled or seamed roofs. Doors connect to courtyard paths and parcel gates. Lawns, paving and asphalt have their own textures. Courtyards, driveways and cast shadows stop at parcel boundaries; only narrow gate aprons connect to the public sidewalk. Selection bounds also stop before the sidewalk.

Buildings, trees, fences and people share depth ordering, so people walking behind a structure are hidden by its walls. Animated flags, café steam and fountain water belong to their building. Menu previews remain independent of the map architecture.

Ground-paint regression checks exercise every facility, upgrade, plot and season, including residential driveways, and reject any paint on the carriageways. Native browser Canvas checks also compare every asphalt pixel before and after those ground layers. Browser reviews cover all facilities, level-one and level-three buildings, close views, winter and all thirteen selection targets.

## Saves and verification

The new fields are optional additions to schema 8. Established careers retain unlocked systems; existing booked leagues and active legacy finals finish with their original rules. New championships preserve qualifiers, preliminary marks, final order and affiliations across saves. Scores are recomputed from throw series on import. All three arrow levels survive saving and loading. Unsupported legacy levels such as 4 load as the one-arrow pace.

Regression coverage includes the fifteen-title circuit, sequential unlocks after wins and losses, immediate first-duel entry, Watch/Coach choices, blocked spending, qualification records and eligibility, the 3+3 cut, exact cutoff ties, retained preliminary marks, six-person finals, ten-row scoreboards, live mark concealment, corrupt saves, deterministic resume, quiet defaults and continuous playback at all three arrow speeds. Existing mechanic tests use an established-career fixture to isolate them from onboarding.
