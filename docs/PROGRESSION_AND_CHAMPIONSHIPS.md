# Learning the club and competing in leagues

New clubs begin with four throwers, a preset lineup and automatic daily practice. The Meets board offers one Community duel, scheduled for day 4. Up to three practice days are available before it; waiting or cancelling and rebooking cannot turn the introduction into an unlimited training camp.

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

Menus, athlete tabs and action handlers share these requirements. Rewards and skill points earned early remain saved for their later introduction. Insights do not accumulate before coached sessions open. The first duel defaults to uninterrupted watching; coaching remains available if explicitly chosen in Settings. The clubhouse and meet report explain each new system and the next introduction. Established careers without onboarding state retain access to all systems.

## League schedule

Every newly booked Open, Challenger or Championship tournament has three club duels followed by a league championship. Duels use the existing three-attempt, individual placing format. The regular-season table records duel results; a low table position no longer eliminates the player before the final meet.

The championship brings all six clubs in the division, including clubs outside that season's three duel opponents. Each rival club nominates its strongest available thrower per event, respecting the two-event limit. The player's existing entry limits remain three athletes per event and two events per athlete. Every championship entrant receives six attempts; there is no additional mid-meet qualifying cut.

Individual places score 5–3–1 points for the athlete's own club. Countback compares the next-best throw, identical full series share place points, and all-foul entries score zero. Club totals are ranked separately, so the player competes against six clubs rather than a combined opposition. A team points tie uses the existing normalized-distance tiebreak across the four events. The championship winner earns the tournament title and existing circuit progression rewards.

The call room lists every rival entrant and club. Live standings, uniforms, individual results and the championship table retain club affiliations. Captain and celebration effects stay within each club. All division clubs develop to the booked stage's difficulty.

## Saves and validation

The additions are optional fields in schema 8. Existing booked leagues and active legacy finals finish with their original top-two/top-four rules. Newly booked leagues use the championship format. New onboarding state and multi-club fields are validated on import; championship scores are recalculated from the saved throw series. Mid-meet saves preserve all entrants and attempts.

Regression checks cover the complete fifteen-trophy circuit, sequential introductions after wins and losses, first-duel preparation, blocked spending, legacy careers, six-club fields in every stage, six attempts for every entrant, points attribution, corrupt fields and deterministic save/resume while the sixth rival is throwing. Existing mechanic tests use an explicitly established club fixture so they can test those systems independently of onboarding.
