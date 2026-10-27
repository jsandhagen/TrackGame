# A tiny club with a long story

## The aim

A welcoming sports management toy that grows into a thoughtful club simulation. You can enjoy watching an athlete train, understand why a decision worked, and care about the person who eventually wins a national title. Decisions belong to the player. The game fits a phone screen and rewards play rather than attendance or spending.

This is an original track-and-field game informed by management-design principles. Use original characters, artwork, names and presentation.

## What the Kairosoft references actually support

Kairosoft's official **Game Dev Story** description emphasizes developing staff, discovering useful genre/content combinations, unlocking advanced careers and eventually building your own hardware. Its official **Pocket League Story 2** description emphasizes individual player development, equippable learned skills, fatigue/injury management, escalating opposition and annual awards.

These establish the features. The explanation of why they are satisfying below is our design interpretation, not an empirical claim about all players or a claim to have played a full reference-game campaign during this review.

Sources:
- [Game Dev Story — official developer page](https://kairosoft.net/game/appli/gamedev.html)
- [Pocket League Story 2 — official developer page](https://kairosoft.net/game/appli/soccer2.html)

## 1. Interlocking progress gives each action more than one payoff

A good training session improves an athlete, advances a personal milestone and makes a meet feel more promising. A strong meet creates a career memory, club prestige, prize funds and an invitation. That invitation reveals a rival and gives the next training block a purpose. Progress in one system should unlock something interesting in another.

For Ring & Sector:

**Develop athlete → learn a skill → try a meet strategy → earn a result → improve the club → discover a new development route.**

Short loop: assign a session or item, watch an understandable result. Medium loop: prepare for a target meet and see the preparation pay off. Long loop: take a recognizable generation of athletes through a club career.

Modernize by showing the connection. A result card should explain the important factors: fresh legs, sharpened form, a safe opener, a skill activation. Avoid an opaque list of tiny bonuses. A loss should reveal a useful next decision, not just that the player needs a bigger number.

Current foundation: training blocks, equipment, explicit attempt plans, form/fatigue and earned skills. Still missing: rich post-meet explanation and unlocks that change the kinds of decisions available.

## 2. Build attachment to people

Kairosoft's staff/player growth makes a small roster memorable. In a sports game the reward should include “Mara finally beat her rival,” not only “overall rose to 52.”

Keep names, visual identity, strengths and personal records consistent. Add ambitions suited to each athlete, characteristic reactions, coaching preferences and occasional mentorship moments. Preserve the first medal, a comeback, a breakthrough and a season award in a compact career page. A less talented athlete can be worth keeping for reliability, mentorship or club loyalty rather than always being replaced by a higher-potential recruit.

Implemented first slice: a fixed trait, learned skills with one equipped slot, official-meet career moments, and rivals who persist by event/tier. This is not yet a relationship system or a fully simulated rival club economy.

Avoid turning personalities into twenty new meters. Two or three well-written behaviors are more memorable than another page of bars. Do not make fatigue or mood a recurring real-money pressure point.

## 3. Discovery is a reason to experiment

Facility combinations and skill routes create hypotheses: “What happens if I put video analysis next to the discus cage?” The surprise is strongest when the discovery makes sense and visibly changes the grounds or athlete behavior.

Keep a discovery notebook with partial hints, then reveal the exact benefit after success. A build preview should show legal placement and likely synergies. Moving a facility should be affordable or free outside an event, so experimentation is encouraged. Do not force the player to demolish an expensive building just to learn whether a layout works.

The present combos all grant the same multiplier. That creates collection, but limited strategy. Replace selected combos with distinct functions: shared technical sessions, reduced recovery congestion, mentoring opportunities or special drills. Keep broad stacking bonuses capped and legible.

Modernize with previews, undo for recent layout actions, a visible explanation of requirements and a search/filterable notebook. Preserve surprise in the outcome and animation rather than hiding basic rules.

## 4. Let the club become visibly different

The miniature place is part of the reward. A growing club should change its silhouette, traffic, equipment, training animations, spectators and trophy display. Facility upgrades deserve new artwork or activity rather than only an extra gold square.

A major upgrade should expose a new coaching choice. An analysis room can support video review; a proper recovery suite can make a demanding schedule viable; a youth program can change recruiting. Expanding the grounds becomes a chapter marker.

Art direction: crisp, original pixel characters; clear material shading; a restrained palette; readable silhouettes at actual phone size; consistent camera angle, scale, light and contact shadows. Use modern typography and touch controls around the pixel world. Do not make the entire interface tiny merely to look retro.

The current canvas art is a functional placeholder with some polish. It still needs a coherent sprite sheet, more frames, event-specific biomechanics and visibly different facility levels. A package wrapper does not solve those art limitations.

## 5. Make competitions worth watching

A simulation is satisfying when the outcome can be followed. Show the athlete, a recognizable opponent, the target, the attempt and the consequence. Keep an intelligible narrative across three attempts: bank a mark, respond to the leader, decide whether to risk the last throw.

The current meter is a small optional execution layer. It should never eclipse coaching decisions. Assisted timing remains available without a penalty beyond using the athlete's modeled performance. Every planning/result gate waits indefinitely, and simulation is deliberate.

Next: show a ghost marker for the PB and leader, a short outcome explanation, a camera/animation appropriate to each event, and a clear final-attempt moment. Compress routine rival attempts; allow replaying an important PB. In a later coach-only mode, pause for meaningful decisions and summarize routine action rather than requiring a confirmation for every insignificant beat.

Favor consistency over realism that players cannot read. Wind, implement characteristics, confidence and fatigue need clear direction and sensible limits before more physics are added.

## 6. Give the campaign chapters and a horizon

Local → county → regional → national → international should change the experience, not merely opponent strength. New invitations, venues, specialists, club expectations, rival storylines and annual awards create a reason to reach the next chapter.

Display the next concrete objective and what it unlocks. Keep short, medium and long goals visible together without filling the screen with quest banners. The first official meet should happen early in onboarding; beginning months before competition currently delays the core reward too much.

Plan a satisfying first campaign with a championship objective and an optional continuation. Endless rising multipliers and automatic rival inflation are not a substitute for an endgame. Optional future legacy play can preserve the club's history without requiring a grind reset or stat purchases.

## 7. Use a gentle, meaningful economy

Money creates an opportunity cost: sign a new event specialist, upgrade an implement, or build a recovery facility. Each choice should be viable for a different club philosophy. Better equipment should not simply invalidate the previous item; control, development and peak performance remain different roles.

Show monthly cash flow, the effect of an additional salary and the cost of a season plan before committing. Support recovery from mistakes with modest grants, resale/reassignment and lower-tier meets. Never sell the solution to a deliberately frustrating economy.

No premium currency, randomized paid recruitment, consumable energy charges, forced ads, purchase timers or daily-login streaks. If the game is commercialized, prefer an upfront purchase or substantial optional expansion; any future business model needs its own decision and balancing pass.

## 8. Modernize usability without removing the toy

The visible grounds provide warmth; concise controls provide access. Landscape is the native default, with a usable portrait browser fallback. Use sufficiently large buttons, tabbed athlete pages, consistent back behavior, safe areas and native backup sharing. Bulk-assigning training should be possible once the roster grows.

Keep core actions within one or two clear decisions. Avoid popup chains for minor rewards. Pause at important decisions, summarize small ones, and never advance a competition input while the player is choosing equipment or reading the standings.

Modern quality includes accessible contrast, reduced motion, adjustable effects/haptics, readable text, reliable autosave, export/import and eventual cloud backup. None should be sold as an unlock.

## Priority

The strongest next gameplay slice is **one athlete, one recognizable rival, one discoverable training route and one meaningful first championship**. Make those connections satisfying before expanding into every track-and-field event. Races and jumps will need their own tactics, pacing and visual language; adding them as differently labeled throw formulas would weaken the game.


## League rebuild implementation note

The current playable architecture and implemented team-sport adaptation are documented in [LEAGUE_DESIGN.md](LEAGUE_DESIGN.md). This vision retains longer-term design ideas; its future-facing sections should not be read as a feature checklist.
