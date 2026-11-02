import { systemUnlocked } from "./progression.js";
import { EVENTS, EVENT_IDS, ITEMS, SKILLS, SECRETS, LEAGUES, RARITY, CLUBS } from "../game-content.js";
import {
  clamp,
  random,
  pick,
  note,
  count,
  addItem,
  createAthlete,
  grantXp,
  randomItem,
  rosterCap,
  facilityLevel,
  statTotal,
  capOf,
  ledgerAdd,
  reconcileLedger,
} from "./core.js";
import { weatherToday, dateOf } from "./calendar.js";
import { clubVersusWorld } from "./world.js";

// ── Club goals: a steady stream of short- and long-term targets ───────────
const bestMark = (s, ev) => s.records?.[ev]?.mark || 0;
const plotCount = (s) => s.plots.filter((p) => p && p.type !== "club").length;
const throwAreas = (s) => ["shot", "discus", "hammer", "jav"].filter((k) => s.stadium[k] > 0).length;
export const GOALS = [
  { id: "train3", name: "First Sessions", desc: "Complete 3 training days", target: 3, progress: (s) => s.counters.days || 0, reward: { money: 100 } },
  { id: "event1", name: "On the Board", desc: "Win an event at a meet", target: 1, progress: (s) => s.counters.eventWins || 0, reward: { items: { drink: 2 } } },
  { id: "build1", name: "Groundbreaking", desc: "Build a new facility", target: 1, progress: (s) => s.counters.built || 0, reward: { money: 150 } },
  { id: "cage", name: "Every Event at Home", desc: "Build all four throwing areas in the stadium", target: 4, progress: throwAreas, reward: { money: 300 } },
  { id: "combo1", name: "Good Neighbours", desc: "Discover a facility combo", target: 1, progress: (s) => s.discovered.length, reward: { items: { manual: 1 } } },
  { id: "win1", name: "Club Victory", desc: "Win a meet", target: 1, progress: (s) => s.counters.meetWins || 0, reward: { money: 250 } },
  { id: "learn1", name: "New Trick", desc: "Learn a skill with skill points", target: 1, progress: (s) => s.counters.skillsLearned || 0, reward: { items: { notebook: 1 } } },
  { id: "use3", name: "Care Package", desc: "Use 3 items", target: 3, progress: (s) => s.counters.itemsUsed || 0, reward: { items: { cake: 2 } } },
  { id: "fans100", name: "Local Favourites", desc: "Reach 100 fans", target: 100, progress: (s) => s.fans, reward: { money: 300 } },
  { id: "sign1", name: "New Blood", desc: "Sign a recruit", target: 1, progress: (s) => s.counters.signed || 0, reward: { items: { sock: 1 } } },
  { id: "pro", name: "Turning Pro", desc: "Promote an athlete to Pro", target: 1, progress: (s) => Math.max(0, ...s.roster.map((a) => a.rank)), reward: { money: 400 } },
  { id: "combo3", name: "Master Planner", desc: "Discover 3 combos", target: 3, progress: (s) => s.discovered.length, reward: { items: { notebook: 2 } } },
  { id: "pb10", name: "Record Setter", desc: "Set 10 personal bests", target: 10, progress: (s) => s.counters.pbs || 0, reward: { items: { goldchalk: 1 } } },
  { id: "county", name: "Moving Up", desc: "Reach the County Division", target: 1, progress: (s) => s.league, reward: { money: 500 } },
  { id: "learn6", name: "Bag of Tricks", desc: "Learn 6 skills", target: 6, progress: (s) => s.counters.skillsLearned || 0, reward: { items: { scroll: 1 } } },
  { id: "rare", name: "Rare Find", desc: "Sign a Rare-or-better athlete", target: 1, progress: (s) => s.counters.rareSigned || 0, reward: { money: 500 } },
  { id: "fans500", name: "Town Talk", desc: "Reach 500 fans", target: 500, progress: (s) => s.fans, reward: { items: { scroll: 1 } } },
  { id: "stand", name: "Take a Seat", desc: "Put up some bleachers", target: 1, progress: (s) => s.stadium.stands, reward: { fans: 60 } },
  { id: "upgrade3", name: "Top Floor", desc: "Take any facility to level 3", target: 3, progress: (s) => Math.max(...s.plots.map((p) => (p && p.type !== "club" ? p.level : 0)), s.stadium.shot, s.stadium.discus, s.stadium.hammer, s.stadium.jav, s.stadium.stands, s.stadium.studio), reward: { money: 400 } },
  { id: "title1", name: "Silverware", desc: "Win a league title", target: 1, progress: (s) => s.trophies.length, reward: { items: { medal: 1 } } },
  { id: "shot15", name: "Fifteen Metres", desc: "Club shot put record of 15 m", target: 15, progress: (s) => bestMark(s, "shot"), reward: { money: 600 } },
  { id: "disc50", name: "Discus Fifty", desc: "Club discus record of 50 m", target: 50, progress: (s) => bestMark(s, "discus"), reward: { money: 600 } },
  { id: "ham60", name: "Hammer Sixty", desc: "Club hammer record of 60 m", target: 60, progress: (s) => bestMark(s, "hammer"), reward: { money: 600 } },
  { id: "jav65", name: "Javelin Sixty-Five", desc: "Club javelin record of 65 m", target: 65, progress: (s) => bestMark(s, "jav"), reward: { money: 600 } },
  { id: "roster8", name: "Full Squad", desc: "Have 8 athletes", target: 8, progress: (s) => s.roster.length, reward: { items: { feast: 2 } } },
  { id: "regional", name: "Regional Contenders", desc: "Reach the Regional Premier Division", target: 2, progress: (s) => s.league, reward: { money: 800 } },
  { id: "combo6", name: "Grand Designer", desc: "Discover 6 combos", target: 6, progress: (s) => s.discovered.length, reward: { items: { compass: 1 } } },
  { id: "star", name: "Star Power", desc: "Promote an athlete to Star", target: 3, progress: (s) => Math.max(0, ...s.roster.map((a) => a.rank)), reward: { items: { thunder: 1 } } },
  { id: "secret2", name: "Curious Characters", desc: "Sign 2 secret characters", target: 2, progress: (s) => s.counters.secretsSigned || 0, reward: { items: { headband: 1 } } },
  { id: "fans2000", name: "Region's Darlings", desc: "Reach 2,000 fans", target: 2000, progress: (s) => s.fans, reward: { money: 2000 } },
  { id: "national", name: "National Contenders", desc: "Reach National Division 1", target: 3, progress: (s) => s.league, reward: { money: 1500 } },
  { id: "learn15", name: "Encyclopaedia", desc: "Learn 15 skills", target: 15, progress: (s) => s.counters.skillsLearned || 0, reward: { items: { elixir: 1 } } },
  { id: "arena", name: "World-Class Arena", desc: "Every throwing area at level 2", target: 4, progress: (s) => ["shot", "discus", "hammer", "jav"].filter((k) => s.stadium[k] >= 2).length, reward: { items: { compass: 1 } } },
  { id: "plots", name: "Every Plot Used", desc: "Build on all 12 free plots", target: 12, progress: plotCount, reward: { items: { elixir: 1 } } },
  { id: "world", name: "International Circuit", desc: "Reach the International Division", target: 4, progress: (s) => s.league, reward: { items: { scroll: 2 } } },
  { id: "legend", name: "Living Legend", desc: "Promote an athlete to Legend", target: 4, progress: (s) => Math.max(0, ...s.roster.map((a) => a.rank)), reward: { items: { elixir: 1 } } },
  { id: "worldtitle", name: "Champions of the World", desc: "Win the Diamond Division", target: 1, progress: (s) => s.trophies.filter((t) => t.league === 4 && (t.stage ?? 2) === 2).length, reward: { items: { hermes: 1 } } },
  { id: "fans10000", name: "Global Following", desc: "Reach 10,000 fans", target: 10000, progress: (s) => s.fans, reward: { items: { comet: 1 } } },
  { id: "secret6", name: "The Whole Gang", desc: "Sign all 6 secret characters", target: 6, progress: (s) => s.counters.secretsSigned || 0, reward: { money: 10000 } },
  { id: "worldrecord", name: "Rewrite History", desc: "Break a world record", target: 1, progress: (s) => s.counters.worldRecords || 0, reward: { money: 5000 } },
];
export function goalProgress(s, g) {
  return Math.min(g.target, g.progress(s));
}
export function rewardText(r) {
  const parts = [];
  if (r.money) parts.push("$" + r.money.toLocaleString());
  for (const [id, n] of Object.entries(r.items || {})) parts.push((n > 1 ? n + "× " : "") + ITEMS[id].name);
  if (r.fans) parts.push(r.fans + " fans");
  return parts.join(" + ");
}
export function grantReward(s, r) {
  if (r.money) s.money += r.money;
  if (r.fans) s.fans += r.fans;
  ledgerAdd(s, "money", "Goals", r.money || 0);
  ledgerAdd(s, "fans", "Goals", r.fans || 0);
  for (const [id, n] of Object.entries(r.items || {})) addItem(s, id, n);
}
export function checkGoals(s) {
  const done = [];
  for (const g of GOALS) {
    if (s.goals.includes(g.id) || g.progress(s) < g.target) continue;
    s.goals.push(g.id);
    grantReward(s, g.reward);
    note(s, "Goal complete: " + g.name + "! Reward: " + rewardText(g.reward), "goal");
    done.push(g);
  }
  return done;
}
export const openGoals = (s, n = 3) => GOALS.filter((g) => !s.goals.includes(g.id)).slice(0, n);

// ── Secret characters ─────────────────────────────────────────────────
const SECRET_WHEN = {
  olga: (s) => s.fans >= 250,
  bjorn: (s) => s.plots.some((p) => p?.type === "gym" && p.level >= 3),
  r7: (s) => facilityLevel(s, "workshop") >= 2 && facilityLevel(s, "studio") >= 2,
  yuki: (s) => (s.counters.meetWins || 0) >= 10,
  yeti: (s) => s.league >= 4,
  pip: (s) => s.discovered.length >= 6,
};
export const secretFee = (s, key) => SECRETS[key].fee + 150 * s.league;
export function signSecret(s, key) {
  if (!systemUnlocked(s, "recruit")) return false;
  const d = SECRETS[key];
  if (!d || !s.secretsOffered.includes(key) || s.roster.some((a) => a.secret === key) || (s.secretsSigned || []).includes(key)) return false;
  if (s.roster.length >= rosterCap(s) || s.money < secretFee(s, key)) return false;
  s.money -= secretFee(s, key);
  ledgerAdd(s, "money", "Signings", -secretFee(s, key));
  const a = createAthlete(s, d.event, {
    name: d.name,
    rarity: "legend",
    base: LEAGUES[s.league].rating + d.stats,
    potential: d.potential,
    background: d.background,
    type: d.type,
    look: { ...d.look },
    secret: key,
    skill: d.skill,
  });
  s.roster.push(a);
  (s.secretsSigned ??= []).push(key);
  count(s, "secretsSigned");
  count(s, "signed");
  note(s, d.name + " joined the club! Unique skill: " + SKILLS[d.skill].name + ".", "secret");
  return a;
}

// ── Story events: small choices that keep each week surprising ───────────
const someone = (s) => pick(s, s.roster.filter((a) => !a.injury).length ? s.roster.filter((a) => !a.injury) : s.roster);
const byId = (s, id) => s.roster.find((a) => a.id === id);
const team = (s, fn) => s.roster.forEach(fn);
const cond = (a, n) => (a.condition = clamp(a.condition + n, 0, 100));
const stam = (a, n) => (a.stamina = clamp(a.stamina + n, 0, 100));
const active = (s) => s.roster.filter((a) => !a.injury);
const available = (s, id) => { const a = byId(s, id); return a && !a.injury; };
const mentorPair = (s) => {
  const athletes = [...active(s)].sort((a, b) => a.level - b.level),
    learner = athletes[0], mentor = athletes.at(-1);
  return mentor && mentor.level - learner.level >= 3 ? { mentor: mentor.id, learner: learner.id } : null;
};

// Ordinary stories sit out the next three draws, including automatic news.
export const STORY_RECENT_LIMIT = 3;
export const STORY_GAP = 7;

export const STORY = {
  secret: {
    title: (s, d) => "A special visitor!",
    text: (s, d) => SECRETS[d.key].story + " " + SECRETS[d.key].name + " would like to join for " + "$" + secretFee(s, d.key).toLocaleString() + ".",
    choices: [
      { label: (s, d) => "Sign " + SECRETS[d.key].name.replace(/ “.*”/, ""), ok: (s, d) => s.roster.length < rosterCap(s) && s.money >= secretFee(s, d.key), run: (s, d) => (signSecret(s, d.key) ? SECRETS[d.key].name + " is officially part of the club!" : "Not possible right now.") },
      { label: () => "Maybe later", run: (s, d) => "They leave a card. Sign them any time from the Squad window (Scout)." },
    ],
  },
  journalist: {
    weight: 3,
    setup: (s) => ({ id: [...s.roster].sort((a, b) => b.level - a.level)[0].id }),
    title: () => "The local paper calls",
    text: (s, d) => "A reporter wants a feature on " + byId(s, d.id)?.name + ". Good for the club's profile, but it eats into rest time.",
    choices: [
      { label: () => "Do the interview", run: (s, d) => { const f = 15 + 10 * s.league; s.fans += f; const a = byId(s, d.id); if (a) { cond(a, 12); stam(a, -10); } return "The story runs on the back page. +" + f + " fans."; } },
      { label: () => "Politely decline", run: () => "The reporter promises to come back after your next win." },
    ],
  },
  merchant: {
    weight: 2,
    setup: (s) => {
      const rarity = random(s) < 0.2 + s.league * 0.05 ? "epic" : "rare",
        item = randomItem(s, rarity);
      return { item, price: Math.round((ITEMS[item].price || (rarity === "epic" ? 900 : 380)) * (0.8 + random(s) * 0.4)) };
    },
    title: () => "A travelling merchant",
    text: (s, d) => "A cart rattles up to the gate. “" + ITEMS[d.item].name + ", one of a kind. " + ITEMS[d.item].desc + " Yours for $" + d.price + ".”",
    choices: [
      { label: (s, d) => "Buy for $" + d.price, ok: (s, d) => s.money >= d.price, run: (s, d) => { s.money -= d.price; addItem(s, d.item); return ITEMS[d.item].name + " added to the bag."; } },
      { label: () => "No thanks", run: () => "The merchant tips their hat and trundles on." },
    ],
  },
  tryout: {
    weight: 2,
    when: (s) => s.roster.length < rosterCap(s),
    setup: (s) => {
      const ev = pick(s, EVENT_IDS),
        a = createAthlete(s, ev, { base: LEAGUES[s.league].rating - 6, rarity: random(s) < 0.3 ? "rare" : "common" });
      a.potential = Math.min(90, a.potential + 6);
      return { athlete: a };
    },
    title: () => "A tryout at the fence",
    text: (s, d) => "A teenager has been watching practice for weeks. " + d.athlete.name + " (" + EVENTS[d.athlete.event].name + ", " + RARITY[d.athlete.rarity].name + ", potential " + Math.round(d.athlete.potential) + ") asks for a chance. No signing fee.",
    choices: [
      { label: () => "Welcome aboard!", ok: (s) => s.roster.length < rosterCap(s), run: (s, d) => { s.roster.push(d.athlete); count(s, "signed"); if (d.athlete.rarity !== "common") count(s, "rareSigned"); return d.athlete.name + " joined the squad."; } },
      { label: () => "Not this time", run: () => "They promise to keep practising." },
    ],
  },
  rain: {
    weight: 2,
    title: () => "Rain, rain, rain",
    text: () => "A storm rolls over the grounds. How should the squad spend the afternoon?",
    choices: [
      { label: () => "Gym circuit", run: (s) => { team(s, (a) => { a.stats[0] = Math.min(capOf(a), a.stats[0] + 1); stam(a, -10); }); return "Everyone lifts in the dry. +1 Power, −10 stamina."; } },
      { label: () => "Movie night", run: (s) => { team(s, (a) => cond(a, 12)); return "Popcorn and old championship tapes. Condition up!"; } },
    ],
  },
  bakery: {
    weight: 2,
    title: () => "A gift from next door",
    text: () => "The bakery sends over a tray of warm cinnamon buns for the team.",
    choices: [{ label: () => "Share them out", run: (s) => { team(s, (a) => cond(a, 10)); return "Morale is sky high. Condition +10 for everyone."; } }],
  },
  masterclass: {
    weight: 2,
    setup: (s) => ({ price: 180 + 120 * s.league, ev: pick(s, EVENT_IDS) }),
    title: () => "A masterclass offer",
    text: (s, d) => "A retired " + EVENTS[d.ev].name.toLowerCase() + " champion offers a day with the squad for $" + d.price + ".",
    choices: [
      { label: (s, d) => "Book it ($" + d.price + ")", ok: (s, d) => s.money >= d.price, run: (s, d) => { s.money -= d.price; team(s, (a) => grantXp(s, a, a.event === d.ev ? 90 : 45)); return "Everyone soaks it up. +45 XP, +90 for " + EVENTS[d.ev].name + " specialists."; } },
      { label: () => "Not now", run: () => "Maybe next season." },
    ],
  },
  photoshoot: {
    weight: 2,
    setup: (s) => ({ pay: 180 + 120 * s.league }),
    title: () => "Photo shoot request",
    text: (s, d) => "A sports drink brand wants the squad for an advert. They'll pay $" + d.pay + ", but it's a long, tiring day.",
    choices: [
      { label: (s, d) => "Smile! (+$" + d.pay + ")", run: (s, d) => { s.money += d.pay; team(s, (a) => stam(a, -12)); return "The ad looks great. Everyone is exhausted."; } },
      { label: () => "Protect training", run: (s) => { team(s, (a) => cond(a, 4)); return "The squad appreciates the quiet day."; } },
    ],
  },
  birthday: {
    weight: 2,
    setup: (s) => ({ id: someone(s).id }),
    title: (s, d) => "Happy birthday!",
    text: (s, d) => "It's " + byId(s, d.id)?.name + "'s birthday today.",
    choices: [
      { label: () => "Team party ($60)", ok: (s) => s.money >= 60, run: (s, d) => { s.money -= 60; team(s, (a) => cond(a, 10)); cond(byId(s, d.id) || {}, 10); return "Balloons, cake and a terrible singalong."; } },
      { label: () => "A quiet cake", run: (s, d) => { const a = byId(s, d.id); if (a) cond(a, 20); return a?.name.split(" ")[0] + " is touched."; } },
    ],
  },
  dog: {
    weight: 1,
    setup: (s) => ({ id: someone(s).id }),
    title: () => "Dog on the field!",
    text: () => "A scruffy dog has run off with a javelin. The whole squad stops to watch.",
    choices: [
      { label: (s, d) => "Send " + byId(s, d.id)?.name.split(" ")[0] + " after it", run: (s, d) => { const a = byId(s, d.id); if (a) a.stats[2] = Math.min(capOf(a), a.stats[2] + 1); s.fans += 8; return "A heroic sprint! +1 Speed. Someone filmed it: +8 fans."; } },
      { label: () => "Let it go", run: (s) => { s.fans += 20; return "The dog trots off proudly. The video goes viral: +20 fans."; } },
    ],
  },
  tvcrew: {
    weight: 2,
    when: (s) => s.fans >= 300,
    title: () => "Cameras at the club",
    text: () => "A TV crew wants to film a training day for the evening sports show.",
    choices: [
      { label: () => "Lights, camera!", run: (s) => { const f = 40 + 25 * s.league; s.fans += f; team(s, (a) => cond(a, -6)); return "Nervy, but it airs well. +" + f + " fans."; } },
      { label: () => "Closed doors", run: () => "Some secrets stay at the club." },
    ],
  },
  sale: {
    weight: 1,
    title: () => "Clearance sale!",
    text: () => "The sports shop in town is clearing stock: 30% off everything in the shop today.",
    choices: [{ label: () => "Great!", run: (s) => { s.saleDay = s.day; return "Shop prices are 30% lower today."; } }],
  },
  knitting: {
    weight: 2,
    setup: (s) => ({ id: someone(s).id, item: random(s) < 0.5 ? "sock" : "sweatband" }),
    title: () => "A gift from a fan",
    text: (s, d) => "A fan knitted a " + ITEMS[d.item].name.toLowerCase() + " for " + byId(s, d.id)?.name + ". It's a bit lumpy.",
    choices: [{ label: () => "How kind!", run: (s, d) => { addItem(s, d.item); const a = byId(s, d.id); if (a) cond(a, 8); return ITEMS[d.item].name + " added to the bag."; } }],
  },
  wallet: {
    weight: 1,
    title: () => "Lost and found",
    text: () => "A wallet turns up on the track. It belongs to the local mayor.",
    choices: [
      { label: () => "Return it in person", run: (s) => { s.fans += 15 + 5 * s.league; return "The mayor tells everyone. Fans up!"; } },
      { label: () => "Hand it to reception", run: (s) => { s.money += 50; return "A small thank-you reward arrives: +$50."; } },
    ],
  },
  taunt: {
    weight: 2,
    setup: (s) => ({ club: CLUBS[s.league][Math.min(2, s.fixture)].name }),
    title: () => "Trash talk",
    text: (s, d) => d.club + " told the local paper your club is “a hobby with a car park”.",
    choices: [
      { label: () => "Fire up the squad", run: (s) => { team(s, (a) => { cond(a, 14); stam(a, -6); }); return "Extra reps, extra fire. Condition +14."; } },
      { label: () => "Rise above it", run: (s) => { team(s, (a) => cond(a, 4)); return "Calm heads. Condition +4."; } },
    ],
  },
  tip: {
    weight: 1,
    setup: (s) => {
      const a = createAthlete(s, pick(s, EVENT_IDS), { base: LEAGUES[s.league].rating - 2, rarity: random(s) < 0.25 ? "epic" : "rare" });
      return { athlete: a };
    },
    title: () => "A scout's tip",
    text: (s, d) => "An old scout says a " + RARITY[d.athlete.rarity].name.toLowerCase() + " " + EVENTS[d.athlete.event].name.toLowerCase() + " thrower is looking for a club.",
    choices: [{ label: () => "Add to the scouting list", run: (s, d) => { s.prospects.unshift(d.athlete); s.prospects = s.prospects.slice(0, 4); return d.athlete.name + " is on your scouting list."; } }],
  },
  camp: {
    weight: 1,
    when: (s) => s.league >= 1,
    setup: (s) => ({ price: 300 + 150 * s.league }),
    title: () => "Altitude camp invitation",
    text: (s, d) => "A mountain camp has space for the whole squad this week. $" + d.price + ". Hard work, big gains.",
    choices: [
      { label: (s, d) => "Go! ($" + d.price + ")", ok: (s, d) => s.money >= d.price, run: (s, d) => { s.money -= d.price; team(s, (a) => { a.stats = a.stats.map((v) => Math.min(capOf(a), v + 1)); stam(a, -25); }); return "+1 to every stat. Everyone sleeps for a week."; } },
      { label: () => "Stay home", run: () => "Home cooking wins today." },
    ],
  },
  friendlyChallenge: {
    weight: 1,
    when: (s) => new Set(active(s).map((a) => a.event)).size >= 2,
    setup: (s) => {
      const a = pick(s, active(s)), b = pick(s, active(s).filter((b) => b.event !== a.event));
      return { first: a.id, second: b.id };
    },
    title: () => "The cone challenge",
    text: (s, d) => byId(s, d.first)?.name + " and " + byId(s, d.second)?.name + " have set up a footwork course with the last six cones. Both insist their event has the quickest feet.",
    choices: [
      { label: () => "A friendly contest (+24 XP each, −8 stamina)", ok: (s, d) => [d.first, d.second].every((id) => available(s, id) && byId(s, id).stamina >= 8), run: (s, d) => { for (const id of [d.first, d.second]) { const a = byId(s, id); stam(a, -8); grantXp(s, a, 24); } return "Two very different techniques. One suspiciously moved cone. Both athletes gain 24 XP and use 8 stamina."; } },
      { label: () => "Call it a draw (+8 condition each)", run: (s, d) => { for (const id of [d.first, d.second]) { const a = byId(s, id); if (a) cond(a, 8); } return "They agree the real winner is whoever puts the cones away. Condition +8 for both."; } },
    ],
  },
  mentoring: {
    weight: 1,
    when: (s) => !!mentorPair(s),
    setup: mentorPair,
    title: () => "One small coaching tip",
    text: (s, d) => byId(s, d.mentor)?.name + " spots " + byId(s, d.learner)?.name + " practising alone and offers to explain a warm-up routine learned the hard way.",
    choices: [
      { label: () => "Try it together (+40 learner XP, mentor −8 stamina)", ok: (s, d) => available(s, d.mentor) && available(s, d.learner) && byId(s, d.mentor).stamina >= 8, run: (s, d) => { stam(byId(s, d.mentor), -8); grantXp(s, byId(s, d.learner), 40); return byId(s, d.learner).name + " leaves with a new routine and 40 XP. The mentor uses 8 stamina."; } },
      { label: () => "Just swap stories (+8 condition each)", run: (s, d) => { for (const id of [d.mentor, d.learner]) { const a = byId(s, id); if (a) cond(a, 8); } return "It turns out even the experienced athletes once threw backwards. Condition +8 for both."; } },
    ],
  },
  communityClinic: {
    weight: 1,
    when: (s) => s.fans >= 100 && active(s).length > 0,
    setup: (s) => ({ id: pick(s, active(s)).id, fans: 20 + 5 * s.league }),
    title: () => "Little coaches at the gate",
    text: (s, d) => "A local school asks " + byId(s, d.id)?.name + " to demonstrate a warm-up. The children have brought a clipboard each and some very serious questions.",
    choices: [
      { label: (s, d) => "Lead the clinic (+" + d.fans + " fans, −10 stamina)", ok: (s, d) => available(s, d.id) && byId(s, d.id).stamina >= 10, run: (s, d) => { stam(byId(s, d.id), -10); s.fans += d.fans; return "Everyone leaves knowing how to warm up, and nobody agrees who was coaching whom. +" + d.fans + " fans; the demonstrator uses 10 stamina."; } },
      { label: () => "Answer questions from the bench (+8 condition)", run: (s, d) => { const a = byId(s, d.id); if (a) cond(a, 8); return "The most popular question is still “how far could you throw a sandwich?” Condition +8."; } },
    ],
  },
  libraryNotes: {
    weight: 1,
    when: (s) => facilityLevel(s, "library") > 0 && active(s).length > 0,
    setup: (s) => ({ id: pick(s, active(s)).id }),
    title: () => "Notes in the margins",
    text: (s, d) => byId(s, d.id)?.name + " finds a battered meet programme in the Coaches' Library. An old coach has filled every margin with warm-up notes and tiny drawings of terrible throws.",
    choices: [
      { label: () => "Study the notes (+30 XP)", ok: (s, d) => available(s, d.id), run: (s, d) => { grantXp(s, byId(s, d.id), 30); return "The diagrams make more sense on the second reading. " + byId(s, d.id).name + " gains 30 XP."; } },
      { label: () => "Share the drawings (+5 team condition)", run: (s) => { team(s, (a) => cond(a, 5)); return "The drawing labelled “absolutely do not do this” goes on the noticeboard. Team condition +5."; } },
    ],
  },
  cafeRecipe: {
    weight: 1,
    when: (s) => facilityLevel(s, "cafe") > 0,
    title: () => "The café's secret recipe",
    text: () => "The café has made a trial batch of oat bars. The squad claims it needs a thorough taste test. The visitors are already asking for the recipe.",
    choices: [
      { label: () => "Squad taste test (+8 team condition)", run: (s) => { team(s, (a) => cond(a, 8)); return "A unanimous verdict, apart from a long debate about raisins. Team condition +8."; } },
      { label: () => "Put them on the counter (+$60)", run: (s) => { s.money += 60; return "The little batch sells out before the kettle boils. +$60."; } },
    ],
  },
  snowSculpture: {
    weight: 1,
    when: (s) => weatherToday(s) === "snow" && active(s).length > 0,
    setup: (s) => ({ id: pick(s, active(s)).id }),
    title: () => "A champion made of snow",
    text: (s, d) => byId(s, d.id)?.name + " has started a snow sculpture beside the gate. It has a champion's pose, a pinecone medal and, so far, only one arm.",
    choices: [
      { label: () => "Finish the sculpture (+15 fans, −6 stamina)", ok: (s, d) => available(s, d.id) && byId(s, d.id).stamina >= 6, run: (s, d) => { stam(byId(s, d.id), -6); s.fans += 15; return "The finished champion becomes the neighbourhood's favourite photo stop. +15 fans; the sculptor uses 6 stamina."; } },
      { label: () => "Admire it over hot drinks (+8 team condition)", run: (s) => { team(s, (a) => cond(a, 8)); return "One arm is plenty when you're holding a mug. Team condition +8."; } },
    ],
  },
};
export function rollStoryEvent(s) {
  if (!systemUnlocked(s, "stories")) return null;
  if (s.pendingEvent) return null;
  const due = Object.keys(SECRET_WHEN).find((k) => !s.secretsOffered.includes(k) && SECRET_WHEN[k](s));
  if (due) {
    if (s.secretsOffered.length && s.day-(s.lastEventDay||0)<STORY_GAP) return null;
    s.secretsOffered.push(due);
    s.pendingEvent = { id: "secret", data: { key: due } };
    s.lastEventDay = s.day;
    return s.pendingEvent;
  }
  if (s.day - (s.lastEventDay || 0) < STORY_GAP || (s.matchDay != null && s.day >= s.matchDay) || random(s) > 0.12) return null;
  const eligible = Object.entries(STORY).filter(([id, e]) => e.weight && (!e.when || e.when(s))),
    recent = s.recentStoryEvents || [],
    fresh = eligible.filter(([id]) => !recent.includes(id)),
    pool = fresh.length ? fresh : eligible;
  if (!pool.length) return null;
  let r = random(s) * pool.reduce((n, [, e]) => n + e.weight, 0),
    id = pool[0][0];
  for (const [k, e] of pool) if ((r -= e.weight) < 0) { id = k; break; }
  s.pendingEvent = { id, data: STORY[id].setup?.(s) || {} };
  s.recentStoryEvents = [...recent.filter((k) => k !== id), id].slice(-STORY_RECENT_LIMIT);
  s.lastEventDay = s.day;
  // Gifts and announcements have no choice to make: keep the world running.
  if (STORY[id].choices.length === 1 && !STORY[id].choices[0].ok) {
    resolveEvent(s, 0);
    return null;
  }
  return s.pendingEvent;
}
export function eventView(s) {
  const p = s.pendingEvent,
    e = p && STORY[p.id];
  if (!e) return null;
  return {
    id: p.id,
    title: e.title(s, p.data),
    text: e.text(s, p.data),
    choices: e.choices.map((c) => ({ label: c.label(s, p.data), ok: !c.ok || c.ok(s, p.data) })),
  };
}
export function resolveEvent(s, index) {
  const p = s.pendingEvent,
    e = p && STORY[p.id],
    c = e?.choices[index];
  if (!c || (c.ok && !c.ok(s, p.data))) return null;
  // A story's choice can move money and fans in many ways; book whatever it changed.
  reconcileLedger(s);
  const message = c.run(s, p.data);
  reconcileLedger(s, "Club stories");
  s.pendingEvent = null;
  note(s, message, "story");
  checkGoals(s);
  return message;
}

// ── Season awards ─────────────────────────────────────────────────────
// ── Awards night ─────────────────────────────────────────────────────────
// Each calendar year keeps its own tally per athlete: event points, PBs, meets and where their
// stats stood when the year began. On the first day of a new year the club holds awards night.
export function yearStat(s, a) {
  s.yearStats ??= { year: dateOf(s.day).year, athletes: {} };
  return (s.yearStats.athletes[a.id] ??= { points: 0, pbs: 0, meets: 0, start: +statTotal(a).toFixed(2) });
}
export function closeYear(s) {
  const year = dateOf(s.day).year;
  s.yearStats ??= { year, athletes: {} };
  if (s.yearStats.year >= year) return null;
  s.ceremony = yearAwards(s, s.yearStats.year);
  s.yearStats = { year, athletes: {} };
  for (const a of s.roster) yearStat(s, a);
  return s.ceremony;
}
export function yearAwards(s, year) {
  const st = (a) => s.yearStats?.athletes?.[a.id] || { points: 0, pbs: 0, meets: 0, start: statTotal(a) };
  const top = (fn, ok) => [...s.roster].filter(ok).sort((a, b) => fn(b) - fn(a))[0];
  const list = [];
  const mvp = top((a) => st(a).points * 10 + st(a).pbs, (a) => st(a).meets > 0);
  if (mvp) list.push({ award: "Most Valuable Athlete", id: mvp.id, name: mvp.name, value: st(mvp).points + " event points in " + st(mvp).meets + " meet" + (st(mvp).meets === 1 ? "" : "s"), reward: "+1 SP", sp: 1, mvp: true });
  const growth = (a) => statTotal(a) - st(a).start;
  const breakout = top(growth, (a) => growth(a) > 0.5 && a !== mvp);
  if (breakout) list.push({ award: "Breakout Athlete", id: breakout.id, name: breakout.name, value: "+" + Math.round(growth(breakout)) + " stat points this year", reward: "+1 SP", sp: 1 });
  const records = top((a) => st(a).pbs, (a) => st(a).pbs > 0);
  if (records) list.push({ award: "Record Breaker", id: records.id, name: records.name, value: st(records).pbs + " personal best" + (st(records).pbs === 1 ? "" : "s"), reward: ITEMS.goldchalk.name, item: "goldchalk" });
  for (const w of list) {
    const a = s.roster.find((x) => x.id === w.id);
    if (w.sp) a.sp += w.sp;
    if (w.item) addItem(s, w.item);
    a.condition = 100;
    a.career.unshift({ season: s.season, label: (w.mvp ? "MVP" : w.award) + " · Year " + year });
    a.career = a.career.slice(0, 40);
  }
  s.awardHistory.unshift(...list.map((w) => ({ season: s.season, year, award: w.award, name: w.name })));
  s.awardHistory = s.awardHistory.slice(0, 60);
  const totals = Object.values(s.yearStats?.athletes || {}).reduce((t, x) => ({ points: t.points + x.points, pbs: t.pbs + x.pbs }), { points: 0, pbs: 0 });
  // The world's best, as they stood when the year closed, and how far the club's best has to go.
  const world = clubVersusWorld(s, year).map((r) => ({ event: r.event, id: r.athlete?.id ?? null, name: r.athlete?.name ?? null, mark: r.mark, rank: r.rank, gap: r.gap, leader: { id: r.leader.elite?.id ?? null, name: r.leader.name, nation: r.leader.nation, mark: r.leader.mark } }));
  note(s, "Awards night for Year " + year + (mvp ? ": " + mvp.name + " is the club's MVP." : "."), "story");
  return { year, list, totals, world };
}

