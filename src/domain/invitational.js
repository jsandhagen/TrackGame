// Invitationals: rare one-day meets that turn up on the calendar every month or two.
// The club is invited to a showpiece venue to face an All-Star Select, the best
// specialists from every club at its level, for a prize money can't buy. Accepting
// needs an open calendar; miss the date and the invitation lapses until the next one.
import { EVENT_IDS, LEAGUES, ITEMS } from "../game-content.js";
import { random, note, rawMark, count, rollRarity, randomItem, addItem } from "./core.js";
import { shortDate, seasonOfDay } from "./calendar.js";
import { switchTier, competitionTier } from "./competition.js";

export const ALL_STAR_ID = 99;
export const INVITATIONALS = [
  { name: "Blossom Invitational", venue: "Cherry Hill Stadium", backdrop: "hills" },
  { name: "Midsummer Invitational", venue: "Bayfront Arena", backdrop: "sea" },
  { name: "Harvest Invitational", venue: "Maple Ridge Stadium", backdrop: "trees" },
  { name: "Frost Invitational", venue: "Glacier Park Arena", backdrop: "mountains" },
];
// Headline prizes by level: none of these are sold in the shop.
export const INVITE_PRIZES = [
  ["compass", "goldchalk", "letter"],
  ["compass", "goldchalk", "letter", "hermes"],
  ["hermes", "compass", "elixir"],
  ["hermes", "comet", "elixir", "headband"],
  ["comet", "headband", "hermes", "elixir"],
];
const FIRST_OFFER_DAY = 18;
const gap = (s) => 30 + Math.floor(random(s) * 21);

export function ensureInvitations(s) {
  s.invitations ??= { next: Math.max(s.day + 6, FIRST_OFFER_DAY), offer: null, won: [], offered: 0 };
  return s.invitations;
}
export const invitation = (s) => s.invitations?.offer || null;
export const clubById = (s, id) => (id === ALL_STAR_ID ? invitation(s)?.club : s.clubs.find((c) => c.id === id));

// Once a day: lapse a missed invitation, or send a new one when it's due.
export function invitationDay(s) {
  const inv = ensureInvitations(s);
  if (inv.offer && s.day > inv.offer.day && s.competition?.kind !== "cup") {
    note(s, "The " + inv.offer.name + " went ahead without us. Another invitation will come.", "info");
    inv.offer = null;
    inv.next = s.day + gap(s);
  }
  if (inv.offer || s.day < inv.next) return null;
  const day = s.day + 9 + Math.floor(random(s) * 8),
    style = INVITATIONALS[seasonOfDay(day)],
    tier = s.league,
    pool = INVITE_PRIZES[tier],
    prize = pool[Math.floor(random(s) * pool.length)];
  inv.offered++;
  inv.offer = { id: inv.offered, ...style, day, tier, prize, sent: s.day, club: null };
  note(s, "Invitation! The " + style.name + " at " + style.venue + " on " + shortDate(day) + ". Winner's prize: " + ITEMS[prize].name + ".", "story");
  return inv.offer;
}

export function invitationProblem(s) {
  const o = invitation(s);
  if (!o) return "No invitation right now.";
  if (s.competition?.kind === "cup") return "Already accepted.";
  if (s.phase !== "planning" || s.match || s.competition) return "Finish your current competition first.";
  if (s.pendingEvent) return "Resolve the club decision first.";
  if (s.day > o.day) return "The date has passed.";
  return null;
}

// The best specialist in each event from every club at the level, a little sharper for the occasion.
function allStars(s, tier) {
  const pool = (s.rivalClubs[tier] || s.clubs).flatMap((c) => c.athletes);
  const picks = [];
  for (const ev of EVENT_IDS) {
    const ranked = pool.filter((a) => !picks.includes(a)).sort((a, b) => (b.event === ev) - (a.event === ev) || rawMark(b, ev) - rawMark(a, ev));
    picks.push(ranked[0]);
  }
  if (tier >= 2) for (const ev of [EVENT_IDS[tier % 4], EVENT_IDS[(tier + 2) % 4]]) {
    const extra = pool.filter((a) => !picks.includes(a)).sort((a, b) => rawMark(b, ev) - rawMark(a, ev))[0];
    if (extra) picks.push(extra);
  }
  const athletes = picks.map((a, i) => {
    const b = structuredClone(a);
    b.id = s.nextId++;
    if (i < 4) b.event = EVENT_IDS[i];
    b.stats = b.stats.map((v) => Math.min(100, v + 2));
    b.mastery[b.event] = Math.min(100, b.mastery[b.event] + 3);
    return b;
  });
  return { id: ALL_STAR_ID, name: "All-Star Select", color: "#c9a227", style: "The best of the " + LEAGUES[tier].name, points: 0, diff: 0, played: 0, developedStage: 2, athletes };
}

export function acceptInvitation(s) {
  if (invitationProblem(s)) return false;
  const o = invitation(s);
  switchTier(s, o.tier, 0, true);
  o.club = allStars(s, o.tier);
  s.competition = { kind: "cup", tier: o.tier, stage: 0, rival: 0, spacing: 7, startDay: o.day };
  s.phase = "season";
  s.fixture = 0;
  s.results = [];
  s.champion = false;
  s.lastAwards = null;
  s.finalOpponent = null;
  s.matchDay = o.day;
  s.sponsorLocked = false;
  note(s, "Accepted the " + o.name + ". See you at " + o.venue + " on " + shortDate(o.day) + ".", "meet");
  return true;
}

// Rewards on top of the usual meet money: the headline prize for the winner, and a
// rare-or-better keepsake for everyone who turns up.
export function settleInvitation(s, win, rewards) {
  const o = invitation(s);
  if (!o) return;
  const keepsake = rollRarity(s, win ? 1.2 : 0.8);
  const items = win ? [o.prize, randomItem(s, keepsake)] : [randomItem(s, keepsake === "common" ? "rare" : keepsake)];
  for (const k of items) addItem(s, k);
  rewards.items.push(...items);
  rewards.invitational = { name: o.name, won: win, prize: o.prize };
  if (win) {
    s.invitations.won.push({ name: o.name, tier: competitionTier(s), season: s.season, day: s.day });
    count(s, "invitationals");
  }
}
export function closeInvitation(s) {
  const inv = ensureInvitations(s);
  inv.offer = null;
  inv.next = s.day + gap(s);
}
