> Historical design/balance notes. See [current event development](EVENT_MASTERY.md) and [current balance](BALANCE_CURRENT.md) for 0.9.0.

# Balance and game-feel audit — v0.3.0

Game source evaluated: `7cca97a67dc549814d5f3fa1b465ec617c779dca`.

## Verdict

The club campaign works and has a strong route to player power, but the current balance is not ready to call polished. Tactical aggression is overwhelmingly dominant; the default development route becomes repetitive in later leagues; a small set of early skills leaves a long middle without new capabilities; and several investments are difficult to feel in the short term.

The target should be **struggle, learn a build, dominate a familiar league, then earn a new challenge**. Preserve the ability to become powerful. Give that power recognizable causes and satisfying feedback.

This audit records findings and proposed priorities. It does not change the game balance or replace the v0.3.0 Android installer.

## Method and limits

Run from the repository root:

```sh
AUDIT_SEEDS=100 node scripts/balance-audit.mjs > docs/balance-results-v0.3.0.json
```

- Ten scripted campaign policies, each starting from seeds 1–100: 1,000 campaigns, capped at 35 seasons each. All tested policies eventually reached a world title within the cap.
- Five tactical policies, each across 1,000 equal-strength club duels. All stats were 40, the player had no equipment/form advantage, both sides used normal release quality, and opponents used Controlled.
- Paired one-week development comparisons across 100 seeds, changing one facility investment while keeping initial state and training the same.
- Formula and interface review of skill timing, feedback, native packaging, persistent controls and input requirements.

These are scripted simulations, not human playtesting or measured enjoyment. Campaign policies share initial seeds but their later random sequences diverge with outcomes. The investment policy combines equipment, facilities and equipped skills; its result must not be attributed to spending alone. It is a simple reference strategy, not proof of optimal play. The low-effort baseline keeps the starting four, uses all-round training and auto-taper, buys nothing, equips no skills and banks a first mark before a controlled final attempt.

The raw output is [balance-results-v0.3.0.json](balance-results-v0.3.0.json); the harness is [scripts/balance-audit.mjs](../scripts/balance-audit.mjs).

## 1. Attack is a solved choice — urgent

| Player approach | Meet wins | Draws | Foul rate per throw |
| --- | ---: | ---: | ---: |
| Safe on both attempts | 0.0% | 0.6% | 3.35% |
| Controlled on both | 31.6% | 36.0% | 7.46% |
| Safe, then Controlled | 10.6% | 29.9% | 5.79% |
| All out on both | 99.7% | 0.3% | 14.06% |
| Safe, then All out | 90.5% | 8.4% | 8.99% |

With four equally matched events, a symmetric controlled match can draw; a 31.6% win rate plus 36% draws is approximately fair. All out is nowhere near that baseline.

The distance randomizer spans 0.970–1.005. All out multiplies that by 1.035, yielding approximately 1.004–1.040. Consequently, a valid aggressive mark almost always beats a valid normal controlled mark. Two attempts also make the higher foul rate much easier to absorb. Safe's 2.5% distance penalty is excessive relative to the narrow normal spread.

**Priority:** redesign the risk/consistency/ceiling relationship and let rivals use sensible approaches. Test stronger, equal and weaker squads, plus different numbers of remaining attempts. Safe should be useful for protecting a lead; aggression should offer a genuine comeback ceiling; focus, skills and equipment should make demanding approaches more reliable. Do not tune solely to equalize three unconditional button policies: their roles should depend on the competitive situation.

## 2. Progression can feel powerful, but the default route is too repetitive

| Campaign policy | Median seasons to world title | 90th percentile |
| --- | ---: | ---: |
| Default all-round, auto-taper, no purchases/skills | 13 | 14 |
| All out throughout, otherwise default | 11 | 12 |
| Event-focused training, otherwise default | 13 | 15 |
| Technical work for everyone, otherwise default | 8 | 9 |
| Equipment, facility investment and equipped skills | 5 | 6 |
| Same investment plus scripted sharpening blocks | 6 | 7 |

The baseline's average seasons spent in each league were 1.00 Community, 1.00 County, 1.96 Regional, 3.14 National and 5.79 World. Its meet win rate dropped from 98% in Community and 96.8% in County to 33.6% National and 23.5% World.

The investment/skill route retained roughly 98–100% win rates in the first four leagues and reached a 63.1% win rate in World. This is a real, strong route to dominance. It also means that a player who understands the system can sweep much of the campaign while someone following the default can spend repeated seasons waiting for growth.

A positive finding: every baseline campaign kept the original athletes and eventually won. Projected shot-put distance approximately doubled from the starting club to the title. The game supports developing a beloved original squad rather than requiring replacement at each tier.

**Priority:** make the effective development routes easier to discover, add visible progress within failed seasons, and give later leagues new development opportunities instead of relying mainly on steeper stats. Repeated losses need a short, understandable objective and a route to a near-term payoff. Preserve optional lower-league domination and title defenses.

## 3. Training does not consistently reward the obvious sporting choices

Technical work for every event reached the title five median seasons sooner than the default. The reference event-focused policy—power for shot, technique for discus, speed for hammer/javelin—did not improve the median over all-round training and produced injury days.

Technical work combines relatively strong total weighted growth, lower load and better form. It is therefore stronger than its apparently specialized role suggests. Conversely, the event-focused choices can accumulate more fatigue without a sufficiently strong campaign advantage. Individual event weights and traits complicate the picture; this result is not evidence that every specialized schedule is weak.

**Priority:** compare equally invested policies and tune programme advantages around actual event contributions. A player should understand why a particular athlete benefits from a block. Recovery should enable genuinely rewarding high-intensity development, rather than becoming a compulsory tax added merely to make fatigue matter.

## 4. Some upgrades are hard to feel

For the starting club, with identical all-round/auto-taper training for seven days, upgrading the existing strength room from level 1 to level 2 increased projected shot put by an average **0.0119 m**, approximately **1.2 cm**, at week's end.

This measures a short-term, one-athlete effect. The room helps all athletes and compounds over a longer career, so it is not a complete return-on-investment comparison. Nevertheless, a bigger building and a paid upgrade suggest a more immediately perceptible benefit than a one-centimetre change hidden inside throw variance.

A competition implement gives a direct 2% distance bonus; tuning adds 0.4% per level. These are mechanically meaningful but are not reliably distinguishable from normal variation on one throw without comparison feedback.

**Priority:** make upgrades expose new training capabilities or explicit development milestones, and show their contribution. Combine persistent compound growth with some understandable near-term reward. More currencies or blanket stat inflation are not required.

## 5. The middle of the campaign lacks fresh capabilities

The complete skill catalogue contains three skills. All can be unlocked by the second meet: Good habits after three sessions, Steady hands after one event, and Last-throw nerve after two events plus level 2. A normal first season can therefore exhaust the entire skill-unlock ladder.

The later leagues introduce a few facilities, but the World league does not add a new development system. Equipment choices are available from the beginning, and permanent tuning has a low ceiling. Most later progression is the same statistics and choices getting stronger.

**Priority:** stage distinctive skill choices and training routes through the campaign. Examples worth prototyping include a signature release, a specialist coach, a captain's influence on club preparation and athlete mastery that changes how a risky attempt works. These are design proposals, not implemented features. Prefer a few coherent build identities over dozens of small passive bonuses.

## 6. Fatigue and money need better roles, not harsher punishment

Neither the default baseline nor the investment policy experienced an injury in these campaigns. Their observed peak fatigue stayed below 40. High-load event-focused schedules and disabling taper did generate injuries, but they were not consistently faster routes to a title.

Thus recovery facilities and support footwear have little urgency in common default play, while their supported high-load route is not especially rewarding. Make recovery unlock a useful training opportunity; do not raise fatigue everywhere just to create a problem players must pay to solve.

At the title, the baseline held about $42,130 on average; the investment policy held about $13,206 after its purchases. Hoarding under a no-purchase policy is expected and is not itself a bug. The investment policy's remaining surplus, combined with finite upgrade caps, nevertheless suggests that late money needs more interesting optional uses. Fame income snowballs while veteran wages remain fixed.

**Priority:** use money to open exciting new options, staff, facilities or club expression. Avoid introducing recurring bills that merely confiscate the player's earned sense of power.

## 7. Game feel under-communicates real growth

The release result chiefly celebrates timing quality: “A beautiful release” or “Mark recorded.” Personal bests are recorded at meet settlement and stored in career history, without an immediate new-record headline or a clear old-versus-new comparison on the throw result. Investment explanations are mostly generic labels rather than a visible contribution breakdown.

The stadium crowd is already packed in Community and uses the same broad presentation in later leagues. Venue labels change, and facility upgrades visibly change the club grounds, but the sense of moving from a small local meet to a world stage is limited. There are no signature-skill activation sequences, distinct record celebrations or sound/haptic rewards yet.

**Priority:** visibly show the player's new strength. A record should get a short highlight, a PB delta and a marker; an activated skill should look distinctive; a familiar rival should be easier to beat for an understandable reason; a new league should feel like a bigger occasion. Celebrations must be skippable and should not delay routine play.

## 8. Repetition risks turning development into administration

A complete winning season contains 36 manual throws: three fixtures with eight attempts each, plus a twelve-attempt final. Starting, releasing and continuing imply at least 108 throw actions before lineup, menus and preparation. The simulation counted a median floor of 1,204 manual actions for the baseline world-title campaign versus 580 for the investment policy. This is a mechanical lower bound, not a measured playtime or usability score.

Assisted timing reduces interactions. Whole-meet simulation is much faster but removes most of the sporting drama. There is room for a middle mode that batches routine execution while preserving close finishes and explicit coaching decisions.

**Priority:** keep all meaningful decisions untimed. Support reusable plans, clear team presets and optional concise coach-mode presentation. Do not reintroduce automatic progression through a screen where the player needs to decide.

## Recommended next pass, in order

1. Fix the tactical dominance and verify state-dependent risk/reward.
2. Give the campaign a staged mastery/skill ladder and a visible payoff every few meets.
3. Make facility and equipment milestones clearer, with near-term effects the player can recognize.
4. Smooth later-league recovery from a weak season without making all opponents scale away from progress.
5. Add immediate PB, skill and promotion feedback; grow the sporting occasion with the league.
6. Reduce routine interaction overhead while preserving player-controlled decisions.

Success is a player understanding and enjoying the cause of a dominant performance: **“I developed this athlete and built this club to do that.”**
