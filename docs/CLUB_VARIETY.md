# Implements, rivals and a more developed club

Eight new implements complement the existing general equipment. Shots use steel or brass construction; discus options vary rim-weight distribution; hammers use a steel head or a machined iron competition head; javelins offer aluminium training equipment or a stiffer competition shaft. These are generic equipment types, not licensed products.

The physical references are [Gill's shots catalogue](https://gillathletics.com/gill/track-field/shot-put/shots/), [discus catalogue](https://gillathletics.com/gill/track-field/discus/discus/), [turned iron hammers](https://gillathletics.com/turned-iron-hammers/), [javelins](https://gillathletics.com/gill/track-field/javelin/javelins/) and [training javelins](https://gillathletics.com/gill/track-field/javelin/javelin-training/). Competition specifications should follow [World Athletics technical information](https://worldathletics.org/about-iaaf/documents/technical-information). The percentage effects are game tuning, not measured advantages of one material over another; implement mass classes are not simulated.

An event-specific implement only contributes in its event. In a second discipline the athlete uses club issue, with no bonus from the mismatched implement or its forge levels. Practice effects follow the selected training event. Competition equipment with a mastery bonus develops gradually across the mastery range shown on its card; purchasing it does not grant mastery. Existing general implements remain useful for athletes covering two events.

Every division now has six clubs. A tournament still contains three fixtures and a final. Draws rotate across stages and every three seasons; duels allow selecting any of the six clubs. Club IDs and their athletes persist when a club sits out a draw. Existing active tournaments retain their opponents and ordering; the additional clubs are created on the next booking. JSON save reloads reconcile the active squads back into the division registry before choosing a new draw.

Club identities determine specialist events, supporting familiarity, competition profiles and skills. Power teams threaten shot and hammer; speed teams threaten hammer and javelin; control teams emphasise legal series; adaptable teams have stronger secondary-event familiarity; deep squads and clutch performers have their own supporting strengths. International and Diamond teams retain developed supporting scorers. They do not simply receive the same bonus under different names.

Three optional buildings extend the development choices through later divisions:

| Building | Available | Purpose |
| --- | --- | --- |
| Indoor Training Hall | National | Low-energy technical rehearsal, including event mastery within its practice ceiling |
| Coaching Lodge | International | Peer review and extra training XP for lower-level athletes alongside a higher-level teammate training the same event |
| Equipment Testing Centre | Diamond | Implement trials with equipment matched to the selected event; develops technique and mastery |

The new sessions use the existing group-training system: daily limits, shared group costs, session quality, drill levels, animations and saved progress. They do not remove competition requirements or mastery ceilings. Upgrading the buildings improves session gains; the Lodge's XP benefit increases by level.

All facility art shares deeper facades, window sills and glazing, roof seams and gutters, entrance steps and courtyards. Gardens, fountains and monuments receive additional edging and foundations. Each new building has its own silhouette and upgrade details. The campus adds slab paving, entrance borders, drainage, a bus shelter, cycle parking and wayfinding. A connected street loop links Town Lane, Club Avenue, North Lane, Club Row and Stadium Boulevard. Eight residential parcels have front gates, gardens, drives and garages, with a corner bakery and a pond-side pocket park. Smaller parking parcels have entrances onto Club Row. Club parcels have clear boundaries and front gates; walking routes use those gates and the marked crossings, including the practice-field perimeter and bus stop. The north plots are spaced to keep the road clear, with the same thirteen plot IDs and saved buildings. Street lamps and house windows join the evening lighting.

Validation includes the domain/save suite, production build, a six-seed career comparison and Chromium rendering of the facility levels, seasonal campus, equipment catalogue, new group-training scenes and phone layouts. See [current balance](BALANCE_CURRENT.md) for measured career results and limitations.
