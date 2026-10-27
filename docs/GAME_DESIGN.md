# Game design — 0.5.0

This document records how 0.5.0 turns Ring & Sector into a Kairosoft-style management game, what each system is for, and where its rules live. [VISION.md](VISION.md) holds the longer-term philosophy; [LEAGUE_DESIGN.md](LEAGUE_DESIGN.md) the competition format.

## What we took from the genre

Kairosoft's management games (Pocket League Story 2, Game Dev Story and their siblings) are compelling for a handful of reasons. Each one maps onto a concrete system here.

| Genre quality | How it shows up in Ring & Sector |
| --- | --- |
| A tiny world that visibly works | The club's own stadium with a campus around it, filling the screen: athletes run laps, throw at their own circle or cage and lift in the gym according to their plan; stat gains, level-ups and visitor spending pop as numbers; spectators fill the stands, flags wave, the seasons change. |
| Numbers that go up constantly | Whole-number stats on a 1–100 scale with letter grades (a good day reads "+1 POW"), an overall rating per athlete, daily visitor income, fans, XP bars, PBs, club records. |
| Several progress tracks feeding each other | Training → levels → skill points → skills. Levels → ranks → higher caps and slots. Wins → money and fans → stadium upgrades, buildings and shop tiers → better training and gear. |
| Discovery | 14 combos (12 from neighbouring buildings, 2 from stadium milestones) with a hint-driven notebook, six secret characters gated behind milestones, rare item drops, a travelling merchant. |
| People you care about | Named athletes with backgrounds, rarity, mood faces, a rank-up ceremony with a new look, career moments, awards night, alumni and a hall of fame. |
| Unique special moves | Skills that fire with a full-width cut-in: Clutch Gene, Second Wind, High Roller, and event signatures like Meteor Put that can't foul. Rivals have skills too. |
| Short-, medium- and long-term goals on screen | The next three club goals sit on the home screen with rewards; the next meet countdown; the league journey; the World title. |
| Surprises that ask for a decision | 17 story events with choices and trade-offs (paid masterclass, photo shoot that tires the squad, tryouts, an altitude camp). |
| A match you watch and nudge | Beat-by-beat meets with animation for both sides, clutch pauses, a coach mode, and speed/skip controls. |

| The club is the screen | The world map is the main view: pan, pinch-zoom and tap anything to open it. Menus are pop-up windows over the scene, so the club stays visible behind them. |

What we deliberately did not take: premium currency, gacha, energy timers or anything that pressures attendance. Interface icons are hand-drawn pixel art in the same palette as the game; there are no emoji.

## Core loop

1. **Play** (play, fast, fastest): each day every athlete performs their plan. Focused plans train one stat at its place: Power in the Strength Room, Technique at the athlete's own circle, cage or runway, Speed on the track, Focus in the video room (+25% per level, −20% without one); All-round jogs laps; Sharpen lifts condition; Rest restores stamina (better with a Recovery Spa). Athletes rest automatically below 25 stamina and taper in the last two days before a meet.
2. **Invest**: upgrade the stadium, build or upgrade campus buildings, buy items, equip gear, learn skills, promote athletes, recruit.
3. **Compete**: pick a lineup in the lobby (OVR and projected marks against each rival, with an up/down edge per event), then watch or coach the meet.
4. **Reward**: prize money, fans, XP, PBs, an item chest on wins (two in finals), goals.
5. **Climb**: three fixtures and a top-two final per season; the final winner moves up. Five leagues; each opens plots, buildings and stadium upgrades.

Time stops for meet day and for story events. Nothing times out.

## Athletes

- **Stats**: Power, Technique, Speed, Focus on a 1–100 scale, shown as whole numbers with a letter grade: G (below 30), F (30), E (40), D (50), C (60), B (70), A (80), S (90+). Stat bars mark the athlete's cap. Each event weights the stats differently, and the **OVR** (overall rating) is the weighted rating for the athlete's main event, shown on squad cards, in the athlete window, the meet lobby and the meet bar.
- **Cap** = potential (by rarity) + rank bonus. Growth slows as a stat approaches its cap.
- **Stamina** (training load, performance −8% when empty) and **condition** (five moods, −5% to +4% distance and −20% to +20% training).
- **Levels** come from training and meets and grant skill points (two on every fifth level).
- **Ranks**: Pro (Lv 6), Ace (Lv 12), Star (Lv 20), Legend (Lv 30 and a title). Each costs a fee, raises the cap, may add a skill slot and changes the sprite (wristband → headband → gold headband and star → cape).
- **Backgrounds** give one identity each: Lumberjack (power growth), Poker Face (fewer fouls), Class Clown (lifts teammates' mood), Late Bloomer (XP)…
- **Rarity**: Common/Rare/Epic/Legend set potential and starting stats; non-commons arrive knowing a skill.

## Skills

Learn with SP, equip into rank-limited slots (1–3). Categories: training (stat growth, XP, stamina), meet (first/last attempt, after a foul, while trailing/leading, finals, home crowd, variance, ceiling), team (Captain, Mentor, Hype Engine, Anchor), signatures (Star rank, once per meet, +8%, cannot foul) and unique skills for secret characters. Activations are listed on the throw and shown as a cut-in.

## Meets

Four events; each pairs your athlete with a rival club athlete. In each round the rival throws first, then you; best mark wins the event (3 points, 1 each if tied). Two attempts in league fixtures, three in finals.

Approaches: **Bank it** (short, ~3% fouls), **Controlled**, **All out** (wider spread, ~25–35% fouls). A foul costs 8 condition (confidence) for the rest of the meet; a clean mark adds 2. Focus narrows the spread and lowers fouls. Manual release timing can add up to +2% and cut fouls; poor timing costs 5%.

Equal-strength duels (`tests/progression.test.js`): no fixed approach dominates. Over 500 duels against an adaptive rival, always-Controlled wins 34%, always-All-out 31%, and the "bank, then chase" policy 34% (the remainder are draws); always-Bank-it rarely wins. The interesting decision is the first attempt and the clutch moment, which Watch mode surfaces automatically.

## Stadium, campus and economy

The club is laid out like a real athletics venue: a stadium, with the club's buildings on the streets outside it.

**The stadium** never moves. Each installation upgrades in place, and higher levels need a higher league:

| Installation | Levels | Purpose |
| --- | --- | --- |
| Track | Gravel (start), Synthetic, Championship | Speed training |
| Shot put circle | Concrete circle (start), Twin circles, Competition circle | Shot technique |
| Discus cage, Hammer cage | Practice, Full, Competition cage | Discus and hammer technique |
| Javelin runway | Grass runway (start), Rubber, Competition runway | Javelin technique |
| Grandstand | Open field (start), Bleachers, Covered main stand, Stands all round, Olympic stadium | Visitors, weekly gate income, home crowd |
| Video room | Video room, Analysis suite, Press & data centre (in the press box) | Focus training |
| Floodlights | Floodlights, Stadium lights | Extra fans from home wins |

The grandstand is the stadium's growth path: a gravel track in a flat field with a rail round it, then metal bleachers on the home straight, then a covered main stand with bleachers opposite, then seated stands all round, and finally (World League) a two-tier Olympic bowl under a ring roof that is translucent over the near side so the track stays visible.

The throwing areas change visibly with each level. Shot put goes from a bare concrete circle with a wooden stop board and chalk lines on the grass, to twin circles with a clay landing sector, to a competition circle on a synthetic pad with a raked clay sector, distance boards, flags and a shot rack. The discus and hammer cages go from a practice net on wooden poles, to a taller steel cage, to a tall competition cage with weighted feet and gate panels; nets stay light, and the panels nearest the viewer are almost clear so throwers stay visible. The javelin goes from a mown grass strip with a wooden arc, to a rubber runway with check marks, to a full runway with foul-line extensions, flags and a wind sock. Competition-standard areas also get a TV camera and a digital distance board. The Olympic level takes cues from modern venues such as Hayward Field: a timber-slat facade and a slim corner tower faced with athlete panels and crowned with light.

**Customisation** (`CUSTOMISE` in `src/game-content.js`, rules in `src/domain/customize.js`) covers kit pattern, shorts, seat colours, roof and track surface. Each option has a requirement (fans, league, trophies, grandstand or track level) and a price; once bought it is owned for good and can be switched for free. The stadium name is free to change. Kit choices are stored with the club colours so every sprite picks them up; the stadium look is in `stadiumStyle`.

Stadium milestones are combos too: **Complete Arena** (all four throwing areas at level 2) and **Night Fever** (floodlights with a covered main stand). Home meets are drawn in the club's own stadium, with its stands, track colour, lights and crowd.

**The campus** sits outside the stadium like a real club site: a forecourt with ticket kiosks in front of the main gate, then 13 plots along three streets. Club Row runs across the forecourt (split by the main road), a footpath climbs past the practice field to the north lane, and the road runs south past the car parks to the boulevard. 7 plots are open in Community, 9 in County, 11 in Regional and all 13 from National; the later ones are the north lane and the far end of the boulevard. The clubhouse is fixed on Club Row. Buildings side by side on the same street are neighbours and form combos; the main road splits Club Row, but the footpath does not. Moving is free; clearing refunds half.

- Buildings: Clubhouse, Strength Room, Recovery Spa, Canteen Café, Merch Stand, Dormitory (squad cap 6 + 2 per level), Scout Office, Kit Workshop (forging), Sports Lab, a title-gated Champion Statue, and Club Garden and Fountain as repeatable decorations.
- Income: weekly sponsor + clubhouse + grandstand, minus wages (by rank, rarity and level); daily visitor spending at the café/merch stand; meet prizes; goals. Visitors grow with √fans and attractions.
- Sponsors unlock with fans and trade money for perks (free drinks, fan boosts, win bonuses, or a big contract with a loss penalty).

## Content tables

All tunable content is data in `src/game-content.js`. Story events, goals and secret-character conditions are in `src/domain/story.js` because they include small rules.

## Screen and interface

The world fills the screen. The HUD floats along the top (club, date, speed, fans, money); the menu (Club, Squad, Build, Shop, League, Office) and a context button (Train, Pause, To the meet, Season review) sit along the bottom. Windows pop up docked to the right on wide screens, centred for meet decisions and results, and as bottom sheets in portrait. Opening a building or athlete glides the camera so the thing you picked stays visible beside the window. Drag pans, pinch or the scroll wheel zooms, and a tap on an athlete, plot or stadium part opens it.

During a meet the stadium fills the screen; the score strip sits at the top and the two duelists with the speed controls at the bottom.

## Art direction

Everything is drawn in code at a low logical resolution (480×270) with integer rects and scanline polygons, then scaled with smoothing off so edges stay crisp. Characters are chibi: a large rounded head with small dot eyes and blush on a small body, with a 1px warm-dark outline, cached per look/pose/frame. Interface icons are 12×12 pixel drawings in the same outline style, scaled up crisply. The ground is drawn top-down and buildings show their front and an oblique side (depth up and to the right), with lit tops, shaded sides and soft shadows. The stadium is a height field: every point of the stands has an elevation, a point at ground (x, y) and height z is drawn at (x, y − z), and the stands are rendered back to front. Ground with nothing built on it stays flat, and the stadium's outer footprint follows the oval of the track, so a full set of stands forms a round bowl. Rows rise as real tiers with visible risers, the near stand shows its outer wall, wing walls close the ends of the main stand, and roofs float above the seats. Like a real athletics venue it has the main stand on the home straight (with the finish line and press box), the throwing cages and javelin runway in the two D's, pole vault and long jump areas on the infield, and corner floodlight masts. A hand-made 5×7 bitmap font replaces blurry canvas text. Colours stay in the established warm green/cream palette with saturated accents for rewards and rarity.
