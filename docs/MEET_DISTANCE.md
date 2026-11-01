# Meet distance presentation

The meet uses 20 logical pixels per metre, matching the existing double-size throwers and roughly 2.5 m circles. An athlete is around 40–45 pixels tall; 70 m now covers 1,400 pixels. Squad ability and screen orientation change how much field the camera shows, without changing the size of a metre. The sector extends past the viewport, and its oblique depth projection keeps the landing area between the track and benches.

Flights use a ballistic presentation with gravity 9.81 m/s², a 2 m release height and approximate release angles: shot 37°, discus 35°, hammer 42°, javelin 34°. The measured mark remains the endpoint; this does not change results, foul probabilities, athlete stats, random draws or saves. A 9 m put takes about 1.34 s; 70 m takes about 3.2 s for discus/javelin and 3.64 s for hammer. The arc uses the same metre scale, with extra sky available for high throws.

At watch speed the camera opens over the thrower, makes room for the rising implement just before release, then leads its flight by 300 ms while easing along the sector. The circle leaves the frame. Fixed distance boards every 10 m (2 m for shot), near-side labels and five-metre mowing bands establish how much ground passes below the implement and shadow. The landing holds briefly before a wide result shot includes both the circle and the mark. Long results get extra reading time so that pullback can finish. Celebrations after a long chase use the wide result view instead of sending the camera straight back across the field.

Fast and very fast retain a steady full-sector shot. Reduce motion cuts to a field overview during flight instead of panning. Existing speed multipliers and manual pause controls still apply.

Run `npm run dev` and open `/scripts/meet-study.html` to inspect the production renderer. Choose an event and measured distance, scrub through release, apex, descent, landing and result, or compare playback speeds, fouls and reduced motion. The original throw study also gives the longer flights time to land.

Geometry tests verify that metres retain their scale across events and viewport widths. Camera tests step through real flights at 16 ms intervals, checking that the implement and ground stay visible and that the result includes both ends of a 70 m throw. Timing tests cover longer airtime and arcs, short puts, foul flights and playback speeds. These checks supplement browser review in portrait and landscape.
