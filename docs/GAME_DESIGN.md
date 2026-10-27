# Game design — 0.5.0

This document records how 0.5.0 turns Ring & Sector into a Kairosoft-style management game, what each system is for, and where its rules live. [VISION.md](VISION.md) holds the longer-term philosophy; [LEAGUE_DESIGN.md](LEAGUE_DESIGN.md) the competition format.

## What we took from the genre

Kairosoft's management games (Pocket League Story 2, Game Dev Story and their siblings) are compelling for a handful of reasons. Each one maps onto a concrete system here.

| Genre quality | How it shows up in Ring & Sector |
| --- | --- |
| A tiny world that visibly works | The grounds scene: athletes walk to the facility for their plan and train there; stat gains, level-ups and visitor spending pop as numbers; flags wave, the fountain sprays, the seasons change. |
| Numbers that go up constantly | Stats display ×10 (a good day reads "+14 POW"), daily visitor income, fans, XP bars, PBs, club records. |
| Several progress tracks feeding each other | Training → levels → skill points → skills. Levels → ranks → higher caps and slots. Wins → money and fans → facilities and shop tiers → better training and gear. |
| Discovery | 14 neighbour combos with a hint-driven notebook, six secret characters gated behind milestones, rare item drops, a travelling merchant. |
| People you care about | Named athletes with backgrounds, rarity, mood faces, a rank-up ceremony with a new look, career moments, awards night, alumni and a hall of fame. |
| Unique special moves | Skills that fire with a full-width cut-in: Clutch Gene, Second Wind, High Roller, and event signatures like Meteor Put that can't foul. Rivals have skills too. |
| Short-, medium- and long-term goals on screen | The next three club goals sit on the home screen with rewards; the next meet countdown; the league journey; the World title. |
| Surprises that ask for a decision | 16 story events with choices and trade-offs (paid masterclass, photo shoot that tires the squad, tryouts, an altitude camp). |
| A match you watch and nudge | Beat-by-beat meets with animation for both sides, clutch pauses, a coach mode, and speed/skip controls. |

What we deliberately did not take: premium currency, gacha, energy timers or anything that pressures attendance.

## Core loop

1. **Play** (▶ / ▶▶ / ▶▶▶): each day every athlete performs their plan. Focused plans train one stat at its facility (+25% per facility level, −20% without one); All-round jogs laps; Sharpen lifts condition; Rest restores stamina (better with a Recovery Spa). Athletes rest automatically below 25 stamina and taper in the last two days before a meet.
2. **Invest**: build or upgrade facilities, buy items, equip gear, learn skills, promote athletes, recruit.
3. **Compete**: pick a lineup in the lobby (projected marks against each rival, ▲/▼ edge), then watch or coach the meet.
4. **Reward**: prize money, fans, XP, PBs, an item chest on wins (two in finals), goals.
5. **Climb**: three fixtures and a top-two final per season; the final winner moves up. Five leagues; each opens plots and facilities.

Time stops for meet day and for story events. Nothing times out.

## Athletes

- **Stats**: Power, Technique, Speed, Focus (stored 0–100, displayed ×10). Each event weights them differently.
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

## Grounds and economy

- 12 plots on a 4×3 grid: 6 open in Community, 8 County, 10 Regional, 12 National. Moving and swapping is free; clearing refunds half.
- Facilities: four training buildings, Recovery Spa, Club Garden, Canteen Café, Merch Stand, Dormitory (squad cap 6 + 2 per level), Scout Office, Kit Workshop (forging), Grandstand, Sports Lab, Fountain and a title-gated Champion Statue.
- Income: weekly sponsor + clubhouse + grandstand, minus wages (by rank, rarity and level); daily visitor spending at the café/merch stand; meet prizes; goals. Visitors grow with √fans and attractions.
- Sponsors unlock with fans and trade money for perks (free drinks, fan boosts, win bonuses, or a big contract with a loss penalty).

## Content tables

All tunable content is data in `src/game-content.js`. Story events, goals and secret-character conditions are in `src/domain/story.js` because they include small rules.

## Art direction

Everything is drawn in code at a low logical resolution (480×270) with integer rects and scanline polygons, then scaled with smoothing off so edges stay crisp. Characters are chibi (big heads) with a 1px warm-dark outline, cached per look/pose/frame. Buildings use a consistent oblique projection (depth up and to the right) with lit tops and shaded sides. A hand-made 5×7 bitmap font replaces blurry canvas text. Colours stay in the established warm green/cream palette with saturated accents for rewards and rarity.
