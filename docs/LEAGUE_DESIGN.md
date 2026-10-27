> Historical design/balance notes. See [current event development](EVENT_MASTERY.md) and [current balance](BALANCE_CURRENT.md) for 0.9.0.

# Turning an individual sport into a club game

The campaign uses a deliberately fictional club-duel format. The objective is to make throwing a readable team-management game, rather than to reproduce every rule of a real athletics meet.

## The repeatable loop

1. **Prepare:** press play. Athletes train at their facilities, rest when tired and taper before a meet. Upgrade the stadium, build, upgrade and move campus buildings, learn skills, promote athletes, buy and equip items, and recruit.
2. **Field the team:** assign one athlete to each of four events. Specialists are strongest; a cross-event athlete performs at 90% of rating, and a second event costs another 3%. The lobby shows each projected mark against the rival athlete.
3. **Meet a rival club:** in each round the rival throws first, then you. Best mark wins the event: 3 meet points, or 1 each for a tie. Regular fixtures have two attempts; finals have three. Watch mode lets athletes choose their approach and pauses for clutch moments; Coach mode asks for every throw. Rivals use skills and adaptive tactics.
4. **React:** see the landing, the PB, the skills that fired and the event score. Club wins award league points and more money; every meet pays an appearance fee so defeat is recoverable. Wins drop an item chest.
5. **Finish a season:** three round-robin fixtures lead to a top-two final. Win it to promote, or repeat the league with everything you earned plus a rebuild camp. Awards night celebrates the season. World champions can keep defending against an improving field.

A tied final is decided by aggregate performance relative to each event's distance scale, awarding one tiebreak point. This is a transparent fictional cup rule, not an official athletics scoring standard.

## Five leagues

| League | Gameplay role | Opens |
| --- | --- | --- |
| Community | Learn the loop against a forgiving field; the first meet is after three days | 7 plots, starter buildings, discus and hammer cages, throwing areas to level 2, a main stand |
| County | Preparation and a first rank-up start to matter | 2 plots, video room, cinder track, covered stands, Scout Office, Kit Workshop |
| Regional | Stadium upgrades, combos and gear close the gap | 2 plots, competition throwing areas, floodlights, Sports Lab |
| National | A developed roster and economy | The last 2 plots, championship track, full bowl, stadium lights |
| World | The wall: Star ranks, rare recruits and skills needed | Title defences |

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
