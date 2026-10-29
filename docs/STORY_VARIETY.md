# Club life: more stories, fewer repeats

Six new everyday stories use the existing club-news decision window. They appear through the normal seeded story draw, with one weight each, rather than adding another daily prompt or a new progression system.

| Story | Available when | Choices |
| --- | --- | --- |
| The cone challenge | Two healthy athletes with different main events | Both earn 24 base XP and spend 8 stamina each, or both gain 8 condition |
| One small coaching tip | A healthy veteran is at least three levels above a healthy learner | Learner earns 40 base XP and mentor spends 8 stamina, or both gain 8 condition |
| Little coaches at the gate | At least 100 fans and a healthy athlete | Gain 20 fans plus 5 per league and spend 10 stamina, or the athlete gains 8 condition |
| Notes in the margins | Coaches' Library and a healthy athlete | Athlete earns 30 base XP, or everyone gains 5 condition |
| The café's secret recipe | Canteen Café | Everyone gains 8 condition, or earn $60 |
| A champion made of snow | Actual snowy weather and a healthy athlete | Gain 15 fans and spend 6 stamina, or everyone gains 8 condition |

XP follows existing athlete and facility multipliers. Normal level-up rewards still apply. Condition stays within 0–100. Stamina-spending choices require enough stamina and a healthy participant; every story has a free alternative, including when a participant has left the club. No new story grants mastery, meet experience, rare gear or Coaching Insights, or changes the calendar, training plans, entries or competition requirements.

## Repeat spacing and saves

The last three ordinary stories sit out the next draw. This includes gifts and announcements that resolve automatically, so automatic news cannot repeat in a loop either. If a future content pool has no fresh eligible story, the draw falls back to eligible stories without getting stuck. Existing weights still apply within the available pool.

Story frequency remains a 24% daily chance after the existing two-day minimum gap. Ordinary stories still wait on meet day. Special-character visits retain priority and do not use or displace ordinary-story memory. Single-choice gifts and announcements still resolve without stopping play; genuine decisions wait for the player.

The optional `recentStoryEvents` field stores up to three unique ordinary event IDs, oldest first. Older careers load with empty memory, with no schema-version change. Import validation rejects malformed memory. Pending decisions keep their original participant IDs and rewards across reloads. The seeded RNG remains deterministic for the same save and player choices; adding stories changes future random draws compared with the previous build.

## Verification

- Full domain/save suite and production build.
- Both choices for every new story, saved pending decisions, one-time rewards, eligibility, exhaustion, departed participants and reward bounds.
- Seeded draws across twelve clubs and 500 days each, checking repeat spacing, automatic news, contextual eligibility and reloads.
- Eighteen Chromium browser checks: all six dialogs at 390×844 portrait, 844×390 landscape and 1280×800 desktop. Both buttons remain within the viewport; choices resolve and persist; no page errors. Screenshots were inspected in the two phone layouts.
- Paired career simulation against main at `84cf699`, using seeds 1–6, a 40-season cap and the existing engaged, fully managed and idle policies. [Raw comparison](story-variety-audit.json).

| Policy | Before: median first World title | After: median first World title | Before / after finishing within 40 seasons |
| --- | --- | --- | --- |
| Engaged | Season 21 | Season 18 | 5/6 → 6/6 |
| Fully managed | Season 18 | Season 18 | 6/6 → 6/6 |
| Idle | Not reached | Not reached | 0/6 → 0/6 |

These small scripted samples check that careers still progress; they do not establish human enjoyment or unchanged balance. The engaged sample finishes sooner, and the changed story pool also changes subsequent random outcomes. Human playtesting should assess repetition and whether the new choices feel worthwhile. Native Android build and physical-device playtesting are separate checks.
