# Turning an individual sport into a club game

The campaign uses a deliberately fictional club-duel format. The objective is to make throwing a readable team-management game, rather than to reproduce every rule of a real athletics meet.

## The repeatable loop

1. **Prepare:** select team or individual training; balance growth, form and recovery. Advance one day or train explicitly to the next fixture.
2. **Shape the club:** choose equipment, develop an earned skill, sign a reserve, or build/move/upgrade a facility. Distinct adjacency effects reward an evolving layout.
3. **Field the team:** assign one athlete to each of four events. Specialists are strongest. A person can cover at most two events, with specialization and workload penalties.
4. **Meet a rival club:** each event compares best throws. Event wins award three meet points, ties award one each. Regular fixtures have two attempts; finals have three. Manual release is optional; assisted throws preserve the management game.
5. **React:** see the mark, opponent, timing feedback and major modeled factors. All decisions wait indefinitely. Club wins award league points and additional income; every meet pays an appearance amount so defeat is recoverable.
6. **Finish a season:** three round-robin fixtures lead to a top-two final. Win it to promote, or repeat the league with your earned progress. You can also defend a title at the current level. World champions can continue defending against a gradually improving field.

A tied final is decided by aggregate performance relative to each event's distance scale, awarding one tiebreak point. This is a transparent fictional cup rule, not an official athletics scoring standard.

## Five leagues

| League | Gameplay role | New club option |
| --- | --- | --- |
| Community | Learn the loop with a forgiving first opponent and a meet after three training days | Basic facilities, training, equipment and skill discovery |
| County | More demanding opposition makes preparation and reliability matter | Video studio and the release-lab synergy |
| Regional | Continued development and tuning help close the gap | Workshop discounts on permanent equipment tuning |
| National | A developed roster and a bigger club economy support the campaign | Grandstand income and the home-advantage synergy |
| World | Endgame title and repeatable defenses | Keep developing a club with a long career history |

Every league has three named clubs with different event strengths: a power-first squad, technical throwers, and a fast-turning hammer/javelin squad. Rival athletes persist across repeat seasons at the same level. Promotion introduces a new field. Failed seasons do not automatically inflate the opposition away from the player.

## The intended Kairosoft qualities

The official Kairosoft descriptions of Game Dev Story and Pocket League Story 2 support a design built around developing a small cast, equippable learned skills, combinations, expanding opportunities and escalating opposition. Our interpretation is that their appeal comes from several progress tracks feeding each other and giving players a miniature place and people to care about.

This implementation therefore joins athlete growth to learned skills, club results to permanent investment, facilities to visible changes, and league success to new opportunities. It preserves a named roster and recognizable opponents. It modernizes access with a persistent main-action area, native landscape presentation, readable typography, explicit input gates, recoverable seasons and portable saves.

No premium currency, paid recruitment rolls, energy sales, purchase timers, forced ads or daily-login obligation are included. Scouting and equipment use earned club money.

## Balancing and limits

The first opponent is intentionally forgiving. Later leagues should require preparation or investment. Automated scenarios exercise progression through all five leagues, failed seasons, repeated rewards, interrupted attempts and low-budget paths. These are correctness and initial balance checks, not evidence of a fully playtested commercial campaign.

Athlete levels raise the long-term talent ceiling as well as stats, so keeping an original teammate is viable. Recruiting offers an alternative route, rather than making every old athlete obsolete. The active roster caps at eight; releasing a contract makes room while preserving career memories in the club history.

The current camera is a stylized side view. Athletes have distinct preparation/release gestures, moving projectiles, landing feedback and a rival marker. A larger hand-authored sprite atlas, richer celebrations, sound, haptics, athlete relationships, accessibility settings and a deeper league-specific narrative are future work. The current release is a substantial playable foundation, not a claim that those systems already exist.

Sources: [Kairosoft Game Dev Story](https://kairosoft.net/game/appli/gamedev.html), [Kairosoft Pocket League Story 2](https://kairosoft.net/game/appli/soccer2.html).
