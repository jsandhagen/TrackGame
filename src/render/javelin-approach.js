// Meet approaches use the field's metre scale. Extra carry strides build speed before the
// existing withdrawal, crossover, impulse and block. Compact club-map drills keep their layout.
export const JAVELIN_RUNWAY_METRES = 30;
export const JAVELIN_APPROACH = [
  { start: -128, extraSteps: 0, stepMs: 0, stepPx: 0, at: [-84, -30] },
  { start: -370, extraSteps: 6, stepMs: 255, stepPx: 26, at: [-192, -166, -140, -114, -88, -62, -32] },
  { start: -467, extraSteps: 8, stepMs: 245, stepPx: 28, at: [-221, -193, -165, -137, -109, -81, -29] },
  { start: -547, extraSteps: 10, stepMs: 230, stepPx: 30, at: [-225, -195, -165, -135, -105, -75, -29] },
];
export function javelinApproachExtraMs(form = 3) {
  const approach = JAVELIN_APPROACH[form] ?? JAVELIN_APPROACH[3];
  return approach.extraSteps * approach.stepMs;
}
