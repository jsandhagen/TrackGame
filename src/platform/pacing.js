// Arrow counts select playback levels, rather than literal multipliers.
export const WATCH_SPEED = 1;
export const FAST_SPEED = 2;
export const VERY_FAST_SPEED = 3;
export const SPEED_RATES = [0, 1, 2, 8];
export const DAY_MS = SPEED_RATES.map(rate => rate ? 30000 / rate : 0);
export const playbackSpeed = speed => [1, 2, 3].includes(speed) ? speed : WATCH_SPEED;
export const playbackRate = speed => SPEED_RATES[playbackSpeed(speed)];
