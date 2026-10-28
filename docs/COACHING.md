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

## Training ladders and chemistry (after Pocket League Story 2)

Pocket League Story 2's training, as described by its manual and fan wikis: a training menu split by stat (Stamina, Kick, Speed, Tech, Body, Keeper). Each family is a ladder of named drills (Kick: Mitt Punching → Kickboxing → Banana Shots → Straight Shot → Training Cast) that upgrades with repeated use. Bills rise with each step (7 → 12 → 24 → 40 → 70 bulbs, and one step is paid in coins), and higher steps raise more stats. Sessions take three players. Certain trios of player types share a compatibility bonus to one stat (+15% to +60%) that you discover by trying them and that is logged in a list. Training gains shrink as a stat gets high, and the coach's level adds to training experience. Ring & Sector now follows the same shape:

- **Families and filter.** Fourteen drills in Power, Technique, Speed, Focus, Recovery and Club families. Chips above the cards filter by family. Six need no building: Sandbag carries, Agility ladder and Shadow throws were added beside the three earlier starters.
- **Five-step ladders.** A drill climbs a step at 3, 8, 15 and 25 sessions, and the card shows its step as stars. Each step is a new named session (`DRILL_NAMES`). Bills scale by `TIER_COST` (1 / 1.3 / 1.7 / 2.3 / 3.2) and gains by `TIER_GAIN` (1 / 1.5 / 2.1 / 2.9 / 4), so a higher step is always better value per Insight. From step three a drill also works a second stat (`broad`, a quarter of its main gain). Past step five, each ★ adds 8% without raising the bill. A money-paid camp step, like Pocket League's coin step, was tried and removed: in the balance audit the bots paid for camps almost daily, median final funds fell by more than half and promotions slowed. `PAID_TIER` can turn it back on for experiments.
- **Chemistry.** Fifteen matches (`CHEMISTRY`) of two or three backgrounds, from Double Act (all stats +15%) to Hard Graft (Power +50%). The best match in the group applies to everyone and matches don't stack; a trio beats a pair. Before a match is discovered, the group hint only says the group "has a good feeling about it". The first session reveals it with sparks in the scene and a banner, and records it in the Chemistry tab. That tab shows found matches, a one-background hint for the rest, and which ones the current squad could make. The starting four can find Body Control, Light Feet, Spring Loaded, Fast Hands and All-Rounders. Discoveries save in `coaching.chemistry`; older saves start with none.
- **Head coach.** Every athlete coached counts towards the head coach's level (thresholds 10, 30, 60, 100…). Each level adds 3% to session gains, and every session now gives each athlete experience (2 + coach level, scaled by the rating). The Clipboard badge beside the filter shows progress.
- **Diminishing returns.** In the last 30% below its current limit, a stat trains more slowly in sessions, down to half the normal gain right at the limit. An earlier, steeper curve (starting at half the limit, down to 35%) stalled the Regional League in the audit.
- **Polish.** Step-ups stamp TRAINING UPGRADED in the scene and lead the result card with the old → new name, the new stars and what changed. Chemistry shows as a purple banner (NEW TRAINING CHEMISTRY the first time), and a head-coach level-up gets its own line. Each new drill has a scene: sandbags on the lawn, a rope ladder on the track, and shadow deliveries in the circle.

## Sessions first (0.9.x playtest pass)

Playtesting found coached sessions felt like an optional extra next to the daily plans, and the Train window made you scroll past the plans to reach them. Sessions are now the main way an athlete grows:

- **Train window tabs.** *Sessions* opens first: the squad stands beside the session cards (in a column on landscape phones, a row on portrait), and each card is one tap to run. Sessions still waiting on a building are listed in one line underneath. *Daily plans* holds meet preparation, group plans and each athlete's routine. *Kit bag* holds consumables. The athlete file's Training tab keeps the athlete's own plan and a *Coach a session* button that opens the Train window with them picked.
- **Balance.** A day of practice earns 3 Insights (was 1), coached-session gains are 25% larger, and daily-plan gains are about 45% smaller. In a scripted 60-day opening with a duel every six days, sessions now supply about 62% of stat growth (was 33%), total growth is about 10% higher, and the bot runs a session about every other day. The long balance audit (12 seeds) keeps its pacing: the engaged bot's median world title moves from season 21 to 20. A bot that never coaches climbs more slowly (second league at season 12, was 9).
- **Starter sessions.** Three sessions need no building, so there is a real choice on day one alongside strength, acceleration and event drills:
  - *Breathing & visualisation* (4 Insights, 6 stamina): Focus, a little Technique.
  - *Mobility & recovery* (3 Insights): gives back 30 stamina and adds a little Speed, Focus and Technique. It works even when legs are too heavy for anything else.
  - *Club throw-off* (6 Insights, 18 stamina, two or more athletes): a little of every stat, event mastery, and 18 experience each, scaled by the rating.

## Special training (PLS2-style)

Modelled on Pocket League Story 2, where research points pay for a drill that up to three players train together and drills level up with use.

- **Who and what.** The Train window is two steps: pick up to three athletes (numbered badges; anyone injured or already trained today is greyed out), then pick a drill. Each drill card shows the average gain for the group, the shared Insight bill and stamina cost, and the first reason it is blocked.
- **Group bill and partners.** A group pays once: the base cost plus half again for each extra athlete (lifting: 6 / 9 / 12). Each training partner adds 10% to everyone's gains.
- **Drill levels.** Every session adds one to that drill's count. Levels 2–5 arrive at 3, 8, 15 and 25 sessions, rename the drill (Coached strength session → Squat & pull complex → Olympic lifts → …) and add 8% per level. Counts are club-wide and saved in `coaching.drills`.
- **Ratings.** Each athlete rolls Good (×0.9), Great! (×1.15) or Excellent!! (×1.5) from the seeded RNG; better mood improves the odds (Excellent 5–15%, Great 28–40%). A first Excellent session is recorded as a career moment.
- **Scene.** `src/render/training.js` plays a ~4.5 s pixel scene on a backdrop for the drill: the Strength Room (one rack per level), the track in the club's surface colour, each athlete's own circle, cage or runway, the Video room replay screen, or a medicine-ball target wall. The athletes jog in, the coach whistles, they work through the drill with sweat, dust and flying implements, then rating stamps drop and gains float up. Tap to skip; reduced motion jumps straight to the result.
- **Results.** Under the scene, each athlete gets a row with their rating, the stats that rose (bars filling from old to new), a line of dialogue (some flavoured by background), and any grade or OVR change. The drill's progress to its next level and the Insight cost close the card.

New careers start with 16 Insights so a three-athlete session is affordable on day one. Migrated careers keep their balance.

All pop-ups share one framed style with a header band by tone: news (green, with Juno's medallion), celebration (gold rays), shop (blue) and warning (brick red).
