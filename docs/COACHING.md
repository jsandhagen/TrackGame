# Coaching and training facilities — 0.7.0

Coaching Insights are shared club knowledge, separate from athlete skill points and money. New and migrated careers start with 8. A productive training day earns one Insight; a Sports Lab adds one every third productive day. Meet reviews earn four plus up to three for personal bests; a Video room adds two. Meet rewards settle once, including after resuming a saved meet.

Athlete → Training offers five coached sessions: strength, acceleration and bounds, event delivery drills, video/routine rehearsal, and medicine-ball delivery throws. Sessions consume 5–10 Insights and 10–28 stamina before recovery-facility savings. An athlete may complete one per day, must finish with at least 20 stamina, and cannot use these sessions while injured or on meet day. Gains respect current stat caps; a fully capped session cannot consume resources.

Delivery drills differ by discipline: standing puts and glide/rotational connections; discus standing releases and South African drills; hammer winds and linked turns; javelin crossover rhythm and blocking. Use the athlete’s own circle, cage or runway. Medicine balls support coordinated force delivery rather than replacing technical work with the event implement.

Six permanent daily plans unlock by spending Insights after developing the appropriate facilities: maximum strength (Strength Room 2), elastic strength (Track 2 plus Strength Room), event technique (own throwing area 2), video feedback (Video room), event rhythm (own area 2 plus Track 2), and competition rehearsal (own area 3 plus Video room). Workloads, recovery requirements and primary/secondary stat gains differ. Unlocks are club-wide; each athlete still needs the appropriate event facility. If a required building is removed, daily activity falls back to general preparation until facilities return.

Facility levels improve coached gains. Recovery Spa levels reduce coached stamina costs up to 18%. Facility descriptions explain training connections. Basic daily plans remain available. The roster and bulk selectors enforce the same unlock requirements as the athlete screen.

Save schema 7 migrates earlier careers without replacing their active meet, roster or progression. Coaching balances, plan unlocks and completed daily sessions persist. Deterministic tests cover atomic costs, duplicate prevention, facilities, stat limits, recovery, meet-day restrictions and migration. Device playtesting remains needed for pacing and feel.

## Training ground and items (0.9.x)

Coaching Insights sit in the top bar next to fans and money; the counter pulses and shows +N whenever Insights arrive, and tapping it opens the **Train** window. The Train window works like a sports-sim training menu: pick an athlete from the strip (a tick marks today's completed session), see their stats, and choose a session card. Each card lists the stats it raises *for that athlete* (coloured pills with the expected gain), its Insight and stamina cost, and the reason it is locked if it is. Finishing a session opens a result card where the bars fill from the old value to the new one.

Consumables are previewed on each athlete before use (Power 29 → 31, Stamina 40 → 80) and athletes they would not help are greyed out with the reason (stamina already full, stat at its limit…), so items are never wasted. The shop offers **Buy & use** for consumables (pick the athlete, pay, apply), **+1 bag** to stock up, and for gear **Buy** followed by an optional immediate equip. The same result card shows what the item did.
