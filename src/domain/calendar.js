// The club calendar, the clock during a training day, and the weather.
import { PLANS } from "../game-content.js";

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

// ── Weather ───────────────────────────────────────────────────────────
// Weather is a pure function of the save's weather seed and the day, so a forecast
// is always right and replaying a day never changes it.
export const FORECAST_DAYS = 7;
export const WEATHER = {
  sunny: { name: "Sunny", icon: "sun", desc: "Clear skies. Visitors +15%.", visitors: 1.15 },
  cloudy: { name: "Cloudy", icon: "cloud", desc: "Grey but dry. Nothing in the way.", visitors: 1 },
  windy: { name: "Windy", icon: "wind", desc: "Gusts across the infield. Meets get a headwind or crosswind. Visitors −10%.", visitors: 0.9 },
  rain: { name: "Rain", icon: "rain", desc: "Outdoor training −20%, indoor +10%. Visitors −40%. A wet circle raises foul risk 25% at meets.", visitors: 0.6, outdoor: 0.8, indoor: 1.1, foul: 1.25 },
  heat: { name: "Heatwave", icon: "heat", desc: "Training and throws use 25% more stamina. Visitors +25%: ice creams all round.", visitors: 1.25, stamina: 1.25 },
  snow: { name: "Snow", icon: "snow", desc: "Outdoor training −35%, indoor +10%. Cold implements: marks −1.5%. Visitors −50%.", visitors: 0.5, outdoor: 0.65, indoor: 1.1, mark: 0.985 },
};
export const WEATHER_IDS = Object.keys(WEATHER);
// Odds per season, in WEATHER_IDS order: sunny, cloudy, windy, rain, heat, snow.
const ODDS = [
  [32, 28, 14, 26, 0, 0],
  [44, 18, 10, 12, 16, 0],
  [22, 32, 24, 22, 0, 0],
  [16, 32, 16, 14, 0, 22],
];
function mix32(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}
export const weatherSeedFrom = (seed) => mix32((seed >>> 0) ^ 0x9e3779b9) || 1;
export function weatherOn(s, day) {
  const odds = ODDS[seasonOfDay(day)],
    roll = (mix32(((s.weatherSeed >>> 0) + Math.imul(day, 2654435761)) >>> 0) % 1000) / 10;
  let n = 0;
  for (let i = 0; i < odds.length; i++) if (roll < (n += odds[i])) return WEATHER_IDS[i];
  return "cloudy";
}
export const weatherToday = (s) => weatherOn(s, s.day);
export const forecastDays = (s, n = FORECAST_DAYS) => Array.from({ length: n }, (_, i) => ({ day: s.day + i, weather: weatherOn(s, s.day + i) }));
// Gyms and film rooms are indoors; laps, sprints and throwing are not.
export function planIndoors(planId) {
  const f = PLANS[planId]?.facility;
  return f === "gym" || f === "studio" ? true : f === "track" || f === "event" || planId === "balanced" ? false : null;
}
export function weatherTrainFactor(planId, weather) {
  const w = WEATHER[weather] || WEATHER.cloudy,
    inside = planIndoors(planId);
  return inside === true ? w.indoor || 1 : inside === false ? w.outdoor || 1 : 1;
}
