// The club calendar and the clock during a training day.
export const DAYS_PER_MONTH = 14;
export const MONTHS = ["March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February"];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"];
export const YEAR_DAYS = DAYS_PER_MONTH * MONTHS.length;

// Day 1 is Monday 1 March, Year 1. Paydays (every seventh day) fall on Sundays.
export function dateOf(day) {
  const d = Math.max(0, day - 1),
    month = Math.floor((d % YEAR_DAYS) / DAYS_PER_MONTH);
  return { day, year: Math.floor(d / YEAR_DAYS) + 1, month, date: (d % DAYS_PER_MONTH) + 1, weekday: d % 7, season: Math.floor(month / 3) };
}
export const seasonOfDay = (day) => dateOf(day).season;
export const shortDate = (day) => {
  const t = dateOf(day);
  return WEEKDAYS[t.weekday] + " " + t.date + " " + MONTHS[t.month].slice(0, 3);
};
export const longDate = (day) => {
  const t = dateOf(day);
  return WEEKDAYS[t.weekday] + " " + t.date + " " + MONTHS[t.month] + ", Year " + t.year;
};
export const isPayday = (day) => day % 7 === 0;

// A training day runs from 06:00 to 22:00 while the clock is playing.
export const DAY_START = 6 * 60,
  DAY_END = 22 * 60;
export const clockMinutes = (progress) => Math.round(DAY_START + Math.max(0, Math.min(1, progress)) * (DAY_END - DAY_START));
export function clockLabel(progress) {
  const m = clockMinutes(progress);
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(Math.floor((m % 60) / 10) * 10).padStart(2, "0");
}
// 0 = full daylight, 1 = full night; dawn and dusk blend smoothly.
export function nightness(progress) {
  const h = clockMinutes(progress) / 60;
  if (h < 7) return Math.max(0, (7 - h) / 1.5);
  if (h > 19) return Math.min(1, (h - 19) / 2.5);
  return 0;
}
