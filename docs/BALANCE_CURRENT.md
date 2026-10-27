# Current balance — club variety update

Run `AUDIT_SEEDS=6 AUDIT_SEASONS=40 node scripts/balance-audit.mjs`. [Raw results](balance-results-club-variety.json). These six-seed scripted samples establish progression paths and regressions, not human enjoyment or a representative player win rate.

The engaged policy chooses physical training, skills, upgrades, recruits and equipment. The fully managed policy also directs secondary-event practice, coaches event delivery, selects developed approaches and assigns unused athletes to automatic economic duties. The idle policy auto-selects lineups and resolves events but never invests. All three enter the next available circuit tournament. The scripts retain their existing purchasing and building policies: they do not specifically buy the new event implements or optional specialist buildings, so these results are a conservative coverage check of the expanded content rather than a complete strategy comparison.

| Measure | Engaged | Fully managed | Idle |
| --- | ---: | ---: | ---: |
| First World Championship, median season | 23 | 19 | Not reached within 40 |
| Careers winning within 40 seasons | 6/6 | 6/6 | 0/6 |
| National meet win rate | 75% | 81% | Not reached |
| World meet win rate | 80% | 89% | Not reached |

A paired baseline on main at `0fc3705` with the same six seeds and policies had a fully managed median of 24 seasons; engaged managers won 2/6 careers within 40. The expanded draw makes the engaged path more consistently attainable while deeper event management still provides an advantage. Fifteen tournaments remains the theoretical minimum. Do not treat either bot median as a promise about human campaign length.

Each division has six persistent rival clubs, with three drawn per tournament. Club identity affects specialist events, competition profiles, skills, equipment and supporting-event mastery. National and World squads retain capable supporting scorers. Event-specific implement bonuses apply only to the relevant discipline, including forecasts and secondary-event entries; advanced implements reward earned mastery rather than buying experience.

Practice-only mastery stops at 35 in each event. Actual competition expands the practice ceiling even after a loss or all-foul series. The new indoor, peer-review and implement-trial sessions retain that ceiling. Open-calendar financial and club development remain available; there is no financial punishment for waiting.

Known limits remain generous early tiers and large late-game treasuries. Human playtesting should check repeat-season interest, rival recognition, building-space tradeoffs and whether event-equipment choices are readable. A 25–35-season human first-title journey remains a design hypothesis, not an enforced minimum or a verified result. This update adds variety and management choices without adding mandatory tournament rounds.

See [implements, rivals and campus improvements](CLUB_VARIETY.md) for equipment references, save behaviour and building functions. The prior [0.9.0 audit](balance-results-v0.9.0.json) remains available for historical comparison.
