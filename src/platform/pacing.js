// One means watching; two speeds the same sequence up; three is a Skip action.
export const WATCH_SPEED = 1;
export const FAST_SPEED = 2;
export const SKIP_ACTION = 3;
export const DAY_MS = [0, 30000, 15000];
export const playbackSpeed = speed => speed === FAST_SPEED ? FAST_SPEED : WATCH_SPEED;
