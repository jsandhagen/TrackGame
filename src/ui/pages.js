import * as G from "../domain/game.js";
import { line as voiceLine } from "../domain/voice.js";
import { throwResult } from "../render/meet-presentation.js";
import {
  SHOPKEEPER,
  HELPER,
  ELITES,
  EVENTS,
  EVENT_IDS,
  LEAGUES,
  CLUBS,
  PLANS,
  RANKS,
  RARITY,
  BACKGROUNDS,
  ATHLETE_TYPES,
  GROWTH,
  SKILLS,
  ITEMS,
  FACILITIES,
  STADIUM,
  STADIUM_IDS,
  COMBOS,
  TACTICS,
  SPONSORS,
  SECRETS,
  SHOP_TIERS,
  STAT_NAMES,
  STAT_SHORT,
  STAT_COLORS,
  GEAR_SLOTS,
  SLOT_NAMES,
  CLUB_PALETTES,
  CLUB_PLOT,
  PLOT_ORDER,
  showStat,
  gradeOf,
  CUSTOMISE,
  CUSTOM_IDS,
  SHORTS_COLORS,
  trackColorOf,
  roofColorOf,
  towerColorsOf,
} from "../game-content.js";
import { ico, moodIco } from "../render/uiicons.js";
import { playbackRate } from "../platform/pacing.js";

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const cash = (n) => (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString();
export const mark = (n) => (n == null ? "FOUL" : n.toFixed(2) + " m");
export const portrait = (a, size = "", extra = "") => `<canvas class="portrait ${size}" width="${size === "large" ? 96 : 48}" height="${size === "large" ? 96 : 48}" data-portrait="${a.id}" ${extra} aria-hidden="true"></canvas>`;
const rivalPortrait = (clubId, i) => `<canvas class="portrait" width="48" height="48" data-rival="${clubId}:${i}" aria-hidden="true"></canvas>`;
export const icon = (id, size = 32) => `<canvas class="icon" width="${size}" height="${size}" data-icon="${id}" aria-hidden="true"></canvas>`;
const btn = (label, act, extra = "", kind = "primary") => `<button class="button ${kind}" data-act="${act}" ${extra}>${label}</button>`;
const chip = (text, color = "", cls = "") => `<span class="chip ${cls}" ${color ? `style="--chip:${esc(color)}"` : ""}>${esc(text)}</span>`;
const heading = (eyebrow, title, sub = "") => `<header class="page-head"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</header>`;
const bar = (value, max, color) => `<span class="bar"><i style="width:${Math.max(0, Math.min(100, (value / max) * 100))}%;--bar:${color}"></i></span>`;
export const grade = (v) => {
  const [letter, , color] = gradeOf(showStat(v));
  return `<b class="grade" style="--g:${color}">${letter}</b>`;
};
// How fast a stat grows for this athlete's type, as a meter of five bars (five is fast, one is very
// slow). Bars rather than arrows: a slow stat still only ever goes up.
const rateMeter = (g, label = `${GROWTH[g].name} growth (×${GROWTH[g].mult})`) =>
  `<em class="rate r${5 - g}" title="${label}" aria-label="${label}">${"<i></i>".repeat(5)}</em>`;
export const growthMark = (a, i) => rateMeter((ATHLETE_TYPES[a.type] || ATHLETE_TYPES.allrounder).growth[i]);
const typeName = (a) => (ATHLETE_TYPES[a.type] || ATHLETE_TYPES.allrounder).name;
const typeChip = (a) => chip(typeName(a), "#c99a4a");
const ovrBadge = (a) => `<span class="ovr"><small>OVR</small><b>${G.overall(a)}</b>${grade(G.overall(a))}</span>`;
export const mood = (a) => `<span class="mood-wrap" title="${G.MOODS[G.moodOf(a)]} condition">${moodIco(G.moodOf(a))}</span>`;
const rankChip = (a) => chip(G.rankName(a), ["#9aa58f", "#5aa4c8", "#8cc152", "#e2b04a", "#b060d0"][a.rank], "rank");
const rarityChip = (a) => (a.rarity !== "common" ? chip(RARITY[a.rarity].name, RARITY[a.rarity].color, "rarity") : "");
const eventChip = (ev) => chip(EVENTS[ev].short, EVENTS[ev].color);
const stamina = (a) => `<span class="mini-stat" title="Stamina ${Math.round(a.stamina)}">${ico("bolt")}${bar(a.stamina, 100, a.stamina < 30 ? "#e0604a" : "#6ac08a")}</span>`;
function alerts(s, a) {
  const out = [];
  if (a.injury) out.push(chip("Injured " + a.injury + "d", "#e0604a"));
  if (G.systemUnlocked(s,"skills") && a.sp > 0 && Object.keys(SKILLS).some((k) => G.skillAvailable(a, k) && SKILLS[k].sp <= a.sp && SKILLS[k].rank <= a.rank)) out.push(chip(a.sp + " SP", "#a465d6", "pulse"));
  if (!G.promoteProblem(s, a)) out.push(chip("Rank up!", "#e2b04a", "pulse"));
  return out.join("");
}
// Tabs inside a window, so long pages split into short ones instead of scrolling. The choice is
// remembered per window while the game runs.
export const pageTab = (view, page, tabs) => (tabs.some(([id]) => id === view.tabs?.[page]) ? view.tabs[page] : tabs[0][0]);
function pageTabs(page, tabs, current, extra = "") {
  return `<nav class="tabs page-tabs">${tabs.map(([id, label]) => `<button data-act="page-tab" data-page="${page}" data-tab="${id}" class="${current === id ? "active" : ""}" aria-pressed="${current === id}">${label}</button>`).join("")}${extra}</nav>`;
}
export const WINDOW_TITLES = { home: "Clubhouse", squad: "The squad", train: "Training ground", recruit: "Scouting report", build: "Groundskeeping", shop: "Kit shop", league: "Meet calendar", club: "Club office", lobby: "Call room", calendar: "Club calendar" };

export function lockedSystem(s, id) {
  return `<article class="card"><h2>One step at a time</h2><p>${esc(G.systemProblem(s,id))} Compete to discover the next club system.</p></article>`;
}
export function speedButtons(speed, action, { pause = false, disabled = false } = {}) {
  return (pause ? [0,1,2,3] : [1,2,3]).map(n => {
    const label = n ? ["", "Watch", "Fast", "Very fast"][n] + " · " + playbackRate(n) + "× speed" : "Pause";
    return `<button class="${speed === n ? "active" : ""}" data-act="${action}" data-speed="${n}" aria-label="${label}" title="${label}" aria-pressed="${speed === n}" ${disabled ? "disabled" : ""}>${n ? `<span class="speed-arrows" aria-hidden="true">${"▸".repeat(n)}</span>` : ico("pause")}</button>`;
  }).join("");
}

export function opening(s) {
  return `<p class="opening-pitch">Four throwers. One patchy field. A club to build.</p>
    <div class="opening-squad">${s.roster.map(a=>`<div>${portrait(a)}<b>${esc(a.name.split(" ")[0])}</b><small>${EVENTS[a.event].short}</small></div>`).join("")}</div>
    <p><b>First challenge: ${esc(CLUBS[0][0].name)}.</b><br>Your squad is ready. Let's put a mark on the board.</p>`;
}

export function introductionCard(s) {
  const next = G.nextIntroduction(s);
  if (!next) return "";
  const latest = G.INTRODUCTIONS[G.introductionCount(s)-1];
  return `<article class="card introduction-card"><span class="eyebrow">${latest ? "TRY SOMETHING NEW" : "FIRST CHALLENGE"}</span>${latest ? `<h2>New: ${esc(latest.name)}</h2><p>${esc(latest.desc)}</p>${btn("Explore " + esc(latest.name.toLowerCase()), "page", `data-page="${latest.page}"`, "subtle")}` : `<h2>Your first duel</h2><p>Your four throwers are ready. Take on ${esc(CLUBS[0][0].name)} today.</p>`}<p class="hint">${latest ? `Next: ${esc(next.name)} after meet ${G.introductionCount(s)+1}.` : "Finish the duel to unlock daily training plans. Every result counts."}</p></article>`;
}

// The card that introduces a new signing.
export function newcomer(s, a) {
  return `<div class="newcomer">${portrait(a, "large")}<div><div class="newcomer-tags">${eventChip(a.event)} ${rarityChip(a)} ${chip(BACKGROUNDS[a.background].name, "#88b0d0")} ${typeChip(a)}</div>
    <p class="quote">“${esc(voiceLine(a, "join", a.id + 1).toLowerCase().replace(/^./, (c) => c.toUpperCase()))}”</p>
    <p class="newcomer-story">${esc(BACKGROUNDS[a.background].story)} <em>${esc(BACKGROUNDS[a.background].desc)}.</em></p>
    <div class="newcomer-stats">${statRows(a, true)}</div><p class="hint">OVR ${G.overall(a)} in ${EVENTS[a.event].name} · wage ${cash(G.wageOf(a))}/wk</p></div></div>`;
}

// ── Club desk ───────────────────────────────────────────────────────────
export function home(s, view) {
  if (s.phase === "seasonEnd") return seasonEnd(s);
  if (G.firstMeet(s)) return `${introductionCard(s)}${s.competition && s.day < s.matchDay ? `<p>Your first duel is booked. Finish practice, then head to the call room.</p>${btn("Finish preparations", "play")}` : btn(s.competition ? "To the call room" : "Start your first duel", "first-duel")}`;
  const opp = G.opponent(s),
    days = s.matchDay == null ? null : s.matchDay - s.day,
    ready = days != null && days <= 0;
  return `
  ${introductionCard(s)}
  ${G.championshipBooking(s) ? `<article class="card qualification-summary"><span class="eyebrow">CHAMPIONSHIP QUALIFICATION</span><p>${new Set(EVENT_IDS.flatMap(ev=>G.qualificationProgress(s,ev).filter(r=>r.qualified).map(r=>r.id))).size} athletes have a qualifying mark. Review each standard and who qualified before the next meet.</p>${btn("Standards & qualified athletes", "qualification", "", "subtle")}</article>` : ""}
  ${s.phase === "planning" ? `<article class="card calendar-welcome"><span class="eyebrow">OFF-SEASON · NOTHING ON THE CALENDAR</span><h2>Where do we throw next?</h2><p>${G.firstMeet(s) ? 'Your first duel is a short introduction. Your four throwers are ready to compete.' : 'Enter a league for three duels and a championship, or book a single duel.'}</p>${btn("Open the meet calendar", "page", 'data-page="league"')}<div class="inline">${btn(view.playing ? "Pause training" : "Keep training", view.playing ? "pause" : "play", "", "subtle")}${btn("Next day", "day", view.playing ? "disabled" : "", "subtle")}</div></article>` : `
  <article class="fixture-card ${ready ? "ready" : ""}" style="--rival:${opp?.color || "#888"}">
    ${!ready && days <= 14 ? `<div class="fixture-pips" aria-hidden="true">${Array.from({ length: days }, (_, n) => `<i class="${n === 0 ? "next" : ""}"></i>`).join("")}<i class="meet">${ico("stadium")}</i></div>` : ""}
    <div class="fixture-top"><span>${s.competition?.kind === "cup" ? "INVITATIONAL" : s.competition?.kind === "duel" ? "DUEL MEET" : s.fixture === 3 ? "LEAGUE CHAMPIONSHIP" : "LEAGUE DUEL " + (s.fixture + 1) + " / 3"} · ${esc(G.competitionName(s))}</span><b>${ready ? "MEET DAY" : days + (days === 1 ? " DAY" : " DAYS") + " TO GO"}</b></div>
    <div class="versus"><span class="crest home">${esc(s.clubName.slice(0, 1))}</span><div><small>NEXT UP · ${esc(G.shortDate(s.matchDay))}</small><h2>${esc(opp?.name)}</h2><p>${esc(opp?.style || "")}</p></div><span class="crest away">${esc(opp?.name.slice(0, 1))}</span></div>
    <p class="meet-forecast">${weatherChip(G.weatherOn(s, s.matchDay))} <span>Meet-day forecast · ${esc(G.venueLabel(G.meetVenue(s)))}</span></p>
    ${ready ? btn(ico("stadium") + " Report to the call room", "lobby") : btn(view.playing ? ico("pause") + " Pause" : ico("play") + " Train · " + days + (days === 1 ? " day" : " days") + " to the meet", view.playing ? "pause" : "play")}
    <div class="split">${btn("Next day", "day", ready || view.playing ? "disabled" : "", "subtle")}${btn(ico("league") + " Meets", "page", 'data-page="league"', "subtle")}</div>
  </article>`}
  <div class="budget">${G.systemUnlocked(s,"sessions") ? `<span>${ico("idea")} Insights <b>${s.coaching.insights}</b></span>` : ""}<span>${ico("coin")} Weekly <b class="${G.weeklyNet(s) < 0 ? "neg" : ""}">${G.weeklyNet(s) >= 0 ? "+" : ""}${cash(G.weeklyNet(s))}</b></span><span>${ico("heart")} Visitors <b>${G.visitorsPerDay(s)}/day</b></span></div>
  ${G.systemUnlocked(s,"office") ? `<section class="card"><div class="card-title"><h2>${ico("target")} Season targets</h2>${btn("All goals", "page", 'data-page="club"', "text")}</div>
    ${G.openGoals(s, 3).map((g) => goalRow(s, g)).join("") || "<p class='hint'>Every target hit. Legendary.</p>"}
  </section>` : ""}
  <div class="roster-glance">${s.roster.map((a) => `<button class="glance" data-act="athlete" data-id="${a.id}">${portrait(a)}<span><strong>${esc(shortName(a.name))}</strong><small>${EVENTS[a.event].short} · OVR ${G.overall(a)}</small></span>${alerts(s, a)}</button>`).join("")}</div>
  ${G.systemUnlocked(s,"plans") ? `<p class="hint">${btn("Training plans and sessions", "page", 'data-page="train"', "text")}</p>` : ""}
  <section class="card journal"><div class="card-title"><h2>${ico("news")} Bulletin board</h2></div>${s.log.slice(0, 5).map((l) => `<p class="log ${l.kind}">${esc(l.text)}</p>`).join("")}</section>`;
}
function goalRow(s, g) {
  const p = G.goalProgress(s, g);
  return `<div class="goal"><div><strong>${esc(g.name)}</strong><small>${esc(g.desc)}</small>${bar(p, g.target, "#e2b04a")}</div><span class="reward">${esc(G.rewardText(g.reward))}</span></div>`;
}
function dutyReward(out) {
  return [out.money ? cash(out.money) : "",out.insights ? out.insights+" Insights" : "",out.fans ? out.fans+" fans" : "",out.recovery ? "+"+out.recovery+" recovery for resting teammates" : ""].filter(Boolean).join(" · ");
}
function facilityStaffPicker(s,key) {
  if (!G.systemUnlocked(s,"duties")) return "";
  const site=G.dutySite(s,key);
  if(!site) return "";
  const d=G.DUTIES[site.type],out=G.dutyYield(s,key,G.visitorsPerDay(s));
  return `<div class="facility-staff"><strong>${d.name}</strong><p>${d.desc}</p><label>Assigned athlete<select data-change="facility-staff" data-site="${key}" ${s.match ? "disabled" : ""}><option value="0">Unstaffed</option>${s.roster.map(a=>`<option value="${a.id}" ${s.facilityDuties?.[key]===a.id ? "selected" : ""} ${a.injury ? "disabled" : ""}>${esc(a.name)} · ${cash(G.wageOf(a))}/week${G.athleteDuty(s,a.id) && G.athleteDuty(s,a.id)!==key ? " · reassigned from another facility" : ""}</option>`).join("")}</select></label><small>At today's audience: ${dutyReward(out)} per working day · ${out.stamina} stamina. One athlete per facility.</small></div>`;
}
function athleteDutyPicker(s,a) {
  const key=G.athleteDuty(s,a.id),site=key && G.dutySite(s,key);
  return `<section class="card duty-card"><label>Daily role<select data-change="athlete-duty" data-id="${a.id}"><option value="">Follow daily plan automatically</option><option value="auto" ${!key && a.plan === "facilities" ? "selected" : ""}>Use facilities automatically</option>${G.dutySites(s).map(site=>`<option value="${site.key}" ${key===site.key ? "selected" : ""}>${site.name} · ${G.DUTIES[site.type].name}</option>`).join("")}</select></label>${a.plan === "facilities" ? `<label>Automatic facility priority<select data-change="facility-focus" data-id="${a.id}">${["balanced","money","insights"].map(f=>`<option value="${f}" ${(a.facilityFocus||"balanced")===f ? "selected" : ""}>${f === "balanced" ? "Balanced club needs" : f === "money" ? "Earn money" : "Generate Coaching Insights"}</option>`).join("")}</select></label>` : ""}<small>${site ? "On duty instead of training. Their plan picks up again when you take them off." : "Training plans send them to the right spot. Pick a facility to put them to work for the club instead."} Tired or hurt athletes rest, and meet entrants taper on their own.</small></section>`;
}
function facilityBoard(s) {
  const assigned=Object.keys(s.facilityDuties||{}).length;
  return `<details class="card"><summary>Facility roster · ${assigned} manual · ${s.roster.filter(a=>a.plan === "facilities" && !G.athleteDuty(s,a.id)).length} automatic</summary><p>Put squad depth to work: assign athletes to community services, coaching support or recovery. Duties replace daily training, consume stamina and still incur wages. Money can fund buildings and recruitment; Insights can develop the competition squad.</p><p>Earned through staff: ${cash(s.counters.facilityMoney||0)} · ${s.counters.facilityInsights||0} Insights · ${s.counters.facilityFans||0} fans.</p>${G.dutySites(s).map(site=>facilityStaffPicker(s,site.key)).join("")}</details>`;
}

// ── Squad ───────────────────────────────────────────────────────────────
export function squad(s, view) {
  if (view.athlete) {
    const a = s.roster.find((x) => x.id === view.athlete);
    if (a) return athletePage(s, a, view);
  }
  return `<div class="row-head"><p>${s.roster.length} / ${G.rosterCap(s)} athletes · a Dormitory makes room for more</p>${G.systemUnlocked(s,"recruit") ? btn(ico("plus") + " Scout", "page", 'data-page="recruit"', "small") : ""}</div>
  ${G.systemUnlocked(s,"duties") ? facilityBoard(s) : ""}
  <div class="squad-grid">${s.roster
    .map(
      (a) => `<button class="athlete-card rarity-${a.rarity}" data-act="athlete" data-id="${a.id}">
      ${portrait(a)}<span class="info"><strong>${esc(a.name)}</strong><small>${eventChip(a.event)} ${rankChip(a)} Lv ${a.level}</small>
      <span class="statline">${a.stats.map((v, i) => `<i style="--c:${STAT_COLORS[i]}" title="${STAT_NAMES[i]}">${STAT_SHORT[i]} ${showStat(v)}</i>`).join("")}</span></span>
      <span class="side">${ovrBadge(a)}<span class="row">${mood(a)}${stamina(a)}</span>${alerts(s, a)}</span></button>`,
    )
    .join("")}</div>
  <p class="hint">Stats run 1–100 and grade from G up to S (90+). OVR is the rating in their main event.</p>`;
}
export function statRows(a, compact = false) {
  const cap = G.capOf(a);
  return `<div class="stats">${a.stats
    .map(
      (v, i) => `<div class="stat"><span>${STAT_NAMES[i]}</span><span class="track ${v > 100 ? "beyond" : ""}"><i style="width:${Math.min(100, v)}%;--c:${STAT_COLORS[i]}"></i><s style="left:${Math.min(100, cap)}%" title="Current limit ${Math.floor(cap)}"></s></span><b>${showStat(v)}</b>${grade(v)}${growthMark(a, i)}</div>`,
    )
    .join("")}${compact ? "</div>" : `<div class="scale"><span>1</span><span>50</span><span>100</span></div><p class="hint">The notch is their current ceiling (${Math.floor(cap)}); rank-ups lift it. The bars show how fast each stat grows for a ${esc(typeName(a))}. What wins the ${EVENTS[a.event].name.toLowerCase()}: ${EVENTS[a.event].weights.map((w, i) => STAT_SHORT[i] + " " + Math.round(w * 100) + "%").join(", ")}.</p></div>`}`;
}
function athletePage(s, a, view) {
  const tabs = [
    ["stats", "Stats"],
    ["train", "Training"],
    ["skills", "Skills" + (a.sp ? " · " + a.sp + " SP" : "")],
    ["gear", "Gear"],
    ["career", "Career"],
  ].filter(([id]) => !({train:"plans",skills:"skills",gear:"kit"}[id]) || G.systemUnlocked(s,{train:"plans",skills:"skills",gear:"kit"}[id]));
  const tab = tabs.some(([id]) => id === view.tab) ? view.tab : "stats";
  let body = "";
  if (tab === "stats") {
    const next = RANKS[a.rank + 1],
      problem = G.promoteProblem(s, a);
    body = `<div class="vitals"><div><span>${ico("bolt")} Stamina</span>${bar(a.stamina, 100, a.stamina < 30 ? "#e0604a" : "#6ac08a")}<b>${Math.round(a.stamina)}</b></div><div><span>${mood(a)} Condition</span>${bar(a.condition, 100, "#f0b04a")}<b>${G.MOODS[G.moodOf(a)]}</b></div><div><span>${ico("levelup")} Level ${a.level}</span>${bar(a.xp, G.xpNeeded(a.level), "#a465d6")}<b>${Math.floor(a.xp)}/${G.xpNeeded(a.level)}</b></div></div>${levelRoad(s, a)}
    ${statRows(a)}
    ${G.systemUnlocked(s,"skills") ? `<p class="skill-line"><span>${a.equipped.length ? a.equipped.map((k) => esc(SKILLS[k].name)).join(" · ") : "No skills equipped"}${a.secret ? " · Unique: " + esc(SKILLS[SECRETS[a.secret].skill].name) : ""}</span>${btn("Manage skills", "tab", 'data-tab="skills"', "subtle small")}</p>` : ""}
    <label class="primary-event">Primary event<select data-change="athlete-event" data-id="${a.id}" ${s.match ? "disabled" : ""}>${EVENT_IDS.map(ev => `<option value="${ev}" ${a.event === ev ? "selected" : ""}>${EVENTS[ev].name} · OVR ${Math.round(G.eventRating(a, ev))}</option>`).join("")}</select><small>Also sets the technical training event. Mastery and PBs are kept.</small></label>
    ${G.systemUnlocked(s,"duties") ? athleteDutyPicker(s,a) : ""}
    <details class="card"><summary>Event attribute scaling</summary><p>Attribute weights before mastery, condition and equipment bonuses.</p>${EVENT_IDS.map(ev => `<p><b>${EVENTS[ev].name}</b> · ${EVENTS[ev].weights.map((w,i) => `${STAT_NAMES[i]} ${Math.round(w*100)}%`).join(" · ")}</p>`).join("")}</details>
    ${G.systemUnlocked(s,"skills") ? `<article class="card rank-card"><div class="card-title"><h2>${G.rankName(a)}${next ? " to " + next.name : " · stars"}</h2>${rankChip(a)}</div>
      ${next ? `<p>Raises the limit to <b>${Math.floor(Math.min(100, a.potential + next.cap))}</b>${next.slots > RANKS[a.rank].slots ? ", adds a <b>skill slot</b>" : ""}, +1 to every stat, 1 SP and a new look. Needs level ${next.level}${next.title ? " and a league title" : ""}. ${a.promoteFree ? "<b>Promotion Letter ready: free!</b>" : "Fee " + cash(next.cost) + "."}</p>${btn(problem ? esc(problem) : ico("star") + " Promote to " + next.name, "promote", `data-id="${a.id}" ${problem ? "disabled" : ""}`)}` : `<p>Every star lifts the ceiling to <b>${Math.floor(G.capOf(a) + G.STAR_CAP)}</b>, +1 to every stat and 1 SP. There is no last star. Needs level ${G.starLevel(a)}. ${a.promoteFree ? "<b>Promotion Letter ready: free!</b>" : "Fee " + cash(G.starCost(a)) + "."}</p>${btn(problem ? esc(problem) : ico("star") + " Earn ★" + ((a.stars || 0) + 1), "promote", `data-id="${a.id}" ${problem ? "disabled" : ""}`)}`}
    </article>` : ""}
    <div class="explain"><b>${BACKGROUNDS[a.background].name}</b>: ${esc(BACKGROUNDS[a.background].story)} <em>${esc(BACKGROUNDS[a.background].desc)}.</em>${a.secret ? "<br><b>Secret character.</b> " + esc(SECRETS[a.secret].story) : ""}<br><b>${esc(typeName(a))}</b>: ${esc(ATHLETE_TYPES[a.type]?.desc || "")} <em>Growth: ${STAT_NAMES.map((n, i) => n + " " + GROWTH[ATHLETE_TYPES[a.type]?.growth[i] ?? 2].name.toLowerCase()).join(" · ")}.</em></div>
    <div class="facts"><span>Wage <b>${cash(G.wageOf(a))}/wk</b></span><span>Potential <b>${Math.floor(a.potential)}</b></span><span>Projected <b>${mark(G.forecast(s, a, a.event))}</b></span></div>`;
  }
  if (tab === "stats" && G.systemUnlocked(s,"plans")) body += btn(s.settings.followAthlete===a.id ? "Following in highlights · stop" : "Follow this athlete in highlights","follow-athlete",`data-id="${a.id}"`,"subtle")+masteryCard(s,a)+developmentCard(a);
  if (tab === "train") {
    // Sessions live in the Train window; this tab is the athlete's own routine.
    body = `${G.systemUnlocked(s,"sessions") ? `<div class="coach-cta">${a.coachedDay === s.day ? `<span>${ico("check")} Session done today. Back tomorrow.</span>` : a.injury ? `<span>${ico("bandage")} Injured: no sessions until recovered.</span>` : `<span>${ico("dumbbell")} Coached sessions make the big gains. <b>${s.coaching.insights}</b> Insights ready.</span>${btn("Coach a session", "coach-athlete", `data-id="${a.id}"`, "small")}`}</div>
    ` : ""}<h3>Daily plan</h3><div class="plan-grid compact">${Object.entries(PLANS).filter(([id,p]) => (!p.course || G.systemUnlocked(s,"sessions")) && (id !== "facilities" || G.systemUnlocked(s,"duties")))
      .map(([id, p]) => {
        const at = p.facility === "event" ? (a.trainingEvent||a.event) : p.facility;
        const lvl = at ? G.facilityLevel(s, at) : 0,
          name = at ? (STADIUM[at] || FACILITIES[at]).name : null;
        const where = at ? (lvl ? name + " Lv " + lvl + (p.stat != null ? " · +" + lvl * 40 + "%" : "") : p.stat != null ? "No " + name + " yet · −40%" : "Clubhouse") : id === "balanced" ? "Laps of the track" : "Light drills";
        const problem = G.planProblem(s,a,id);
        const unlockable = p.course && !s.coaching.unlocked.includes(id);
        const unlockProblem = G.planRequirements(s,a,id) || (s.coaching.insights < p.cost ? "Not enough Insights" : null);
        return `<button class="plan ${a.plan === id ? "selected" : ""}" data-act="${unlockable ? "unlock-plan" : "plan"}" data-id="${a.id}" data-value="${id}" ${(unlockable ? unlockProblem : problem) ? "disabled" : ""} title="${esc(p.desc)}"><strong>${p.name}</strong><em>${unlockable ? "Unlock & apply · " + p.cost + " Insights · " : ""}${problem && (!unlockable || unlockProblem) ? esc(unlockProblem || problem) : where}</em></button>`;
      })
      .join("")}</div>
    <p class="hint">${planForecast(s, a)}</p>
    <label class="toggle"><input type="checkbox" data-change="autorest" data-id="${a.id}" ${a.autoRest ? "checked" : ""}> Rest automatically: keep energy for coached sessions on All-round; rest below 25 stamina on focused plans</label>
    <label class="toggle"><input type="checkbox" data-change="autotaper" data-id="${a.id}" ${a.autoTaper ? "checked" : ""}> Taper in the two days before a meet</label>
    ${G.systemUnlocked(s,"duties") ? athleteDutyPicker(s,a) : ""}${masteryCard(s,a)}`;
  }
  if (tab === "skills") {
    const slots = G.slotsOf(a);
    const learnable = Object.keys(SKILLS).filter((k) => G.skillAvailable(a, k));
    body = `<div class="slots">${Array.from({ length: slots }, (_, i) => {
      const k = a.equipped[i];
      return k ? `<div class="slot on">${skillIcon(k)}<span><strong>${SKILLS[k].name}</strong><small>${SKILLS[k].desc}</small></span></div>` : `<div class="slot"><span class="skill-icon">${ico("plus")}</span><span><strong>Empty slot</strong><small>Equip a learned skill below.</small></span></div>`;
    }).join("")}${RANKS[a.rank + 1] && RANKS[a.rank + 1].slots > slots ? `<div class="slot locked"><span class="skill-icon">${ico("lock")}</span><span><strong>${RANKS[a.rank + 1].name} slot</strong><small>Unlocks at ${RANKS[a.rank + 1].name} rank.</small></span></div>` : ""}</div>
    <details class="card loadout-card"><summary>Saved skill setups${a.loadouts?.enabled ? " · switching automatically" : ""}</summary><p>Arrange the skills below, then save a setup. Athletes use the training setup at the club and the meet setup in competition.</p>
    ${["training", "meet"].map((mode) => `<div class="loadout-row"><span><strong>${mode === "training" ? "Training" : "Meet"}</strong><small>${a.loadouts?.[mode] == null ? "Not saved" : a.loadouts[mode].map((k) => esc(SKILLS[k].name)).join(" · ") || "No skills equipped"}</small></span>${btn("Save current", "save-loadout", `data-id="${a.id}" data-mode="${mode}"`, "subtle small")}</div>`).join("")}
    <label class="toggle"><input type="checkbox" data-change="loadouts" data-id="${a.id}" ${a.loadouts?.enabled ? "checked" : ""} ${a.loadouts?.training && a.loadouts?.meet ? "" : "disabled"}> Switch setups automatically</label>
    <small>${a.loadouts?.enabled ? "Saved setups are active. Save again after changing skills below." : "Save both setups to enable automatic switching."}</small></details>
    <div class="card-title"><h2>Learned</h2><span class="sp">${a.sp} SP</span></div>
    ${a.skills.map((k) => skillRow(a, k, a.equipped.includes(k) ? "Unequip" : a.equipped.length < slots ? "Equip" : "Slots full", "skill-toggle", !a.equipped.includes(k) && a.equipped.length >= slots)).join("") || "<p class='hint'>Nothing yet. Levels earn skill points.</p>"}
    <div class="card-title"><h2>Learn with skill points</h2></div>
    ${learnable.filter((k) => G.skillUnlocked(s, k))
      .sort((x, y) => SKILLS[x].rank - SKILLS[y].rank || SKILLS[x].sp - SKILLS[y].sp)
      .map((k) => {
        const lock = G.learnProblem(s, a, k);
        return skillRow(a, k, lock || "Learn · " + SKILLS[k].sp + " SP", "learn", !!lock);
      })
      .join("") || "<p class='hint'>Every common skill learned.</p>"}
    ${athleteBooks(s, a)}`;
  }
  if (tab === "gear") {
    body = `<div class="gear-slots">${GEAR_SLOTS.map((slot) => {
      const id = a.gear[slot],
        d = ITEMS[id];
      const options = Object.keys(s.bag).filter((k) => ITEMS[k].kind === "gear" && ITEMS[k].slot === slot);
      return `<div class="gear-slot">${d ? icon(id, 40) : `<span class="empty-icon">${ico(slot === "implement" ? "ball" : slot === "shoes" ? "shoe" : "charm")}</span>`}<div><span class="eyebrow">${SLOT_NAMES[slot]}</span><strong>${d ? d.name + (s.forge[id] ? " +" + s.forge[id] : "") : slot === "implement" ? "Club issue" : "Nothing"}</strong><small>${d ? d.desc + (d.event ? " Other events use club-issue equipment; bonuses apply only in " + EVENTS[d.event].name + "." : "") : "No bonus."}</small>
        <div class="inline">${d ? btn("Unequip", "gear-off", `data-id="${a.id}" data-slot="${slot}"`, "subtle small") : ""}${options.map((k) => btn(icon(k, 16) + " " + ITEMS[k].name, "gear-on", `data-id="${a.id}" data-item="${k}"`, "subtle small")).join("")}</div></div></div>`;
    }).join("")}</div>
    <div class="card-title"><h2>Use an item</h2>${btn("Shop", "page", 'data-page="shop"', "text")}</div>
    ${boostItems(s, a)}`;
  }
  if (tab === "career") {
    body = `<div class="records">${EVENT_IDS.map((ev) => `<span>${EVENTS[ev].name}<b>${a.pb[ev] ? mark(a.pb[ev]) : "—"}</b></span>`).join("")}</div>
    <div class="facts"><span>Meets <b>${a.meets}</b></span><span>Sessions <b>${a.sessions}</b></span><span>This season <b>${a.seasonPoints} pts · ${a.seasonPbs} PBs</b></span></div>
    ${developmentCard(a, true)}
    <div class="card-title"><h2>Career moments</h2></div>${a.career.length ? a.career.map((c) => `<div class="history"><span>Season ${c.season} · ${esc(c.label)}</span><b>${c.mark ? mark(c.mark) : ico("star")}</b></div>`).join("") : "<p class='hint'>The first official meet starts the story.</p>"}
    <details class="danger"><summary>Release contract</summary><p class="hint">${esc(a.name)} leaves the squad; their gear returns to the bag and their marks stay in club history.</p>${btn("Release " + esc(a.name.split(" ")[0]), "release-contract", `data-id="${a.id}" ${s.roster.length <= 4 ? "disabled" : ""}`, "subtle")}</details>`;
  }
  return `<div class="athlete-page"><aside class="athlete-side">${btn("‹ Squad", "back-squad", "", "text")}
  <div class="profile rarity-${a.rarity}">${portrait(a, "large")}<div>${eventChip(a.event)} ${rankChip(a)} ${rarityChip(a)}<h1>${esc(a.name)}</h1><p>Level ${a.level} · ${BACKGROUNDS[a.background].name} · ${esc(typeName(a))} ${mood(a)}</p>${alerts(s, a)}</div>${ovrBadge(a)}</div>
  <nav class="tabs athlete-tabs">${tabs.map(([id, name]) => `<button data-act="tab" data-tab="${id}" class="${tab === id ? "active" : ""}">${name}</button>`).join("")}</nav></aside><div class="athlete-body">${body}</div></div>`;
}
// ── Training ground ─────────────────────────────────────────────────────
const DRILL_ICONS = { sandbag: "dumbbell", ladder: "shoe", shadow: "eye", visualise: "idea", recovery: "heart", contest: "trophy", indoor: "target", peer: "video", trial: "ball", lifting: "dumbbell", acceleration: "track", delivery: "target", review: "video", medicine: "ball" };
const plus = (n) => "+" + (Math.round(n * 10) / 10).toString();
const vital = (c) => (c.stat != null ? showStat(c.from) + " → " + showStat(c.to) : Math.round(c.from) + " → " + Math.round(c.to));
export const previewText = (changes) => changes.map((c) => (c.from != null ? c.label + " " + vital(c) : c.label)).join(" · ");
function planForecast(s, a) {
  if(G.autoPrepActivity(s,a)) return "Standard auto prep is active: "+PLANS[G.autoPrepActivity(s,a)].name+" now. Your saved "+PLANS[a.plan].name+" plan resumes when auto prep is turned off.";
  if (a.plan === "facilities") return "Automatic duties replace stat training. Rewards and stamina costs depend on the selected facility; athletes recover when no suitable site is available.";
  const perWeek = G.trainingGains(s, a, a.plan).map((g) => g * 5);
  return `Five days of ${esc(PLANS[a.plan].name)} add about ${perWeek.map((g, i) => (g >= 0.5 ? "+" + Math.round(g) + " " + STAT_NAMES[i] : "")).filter(Boolean).join(", ") || "less than one point"} and cost ${a.plan === "rest" ? "no" : Math.round(PLANS[a.plan].load * 13 * G.effects(s, a).stamina)} stamina a day.`;
}
function shortForecast(s, a) {
  if (a.plan === "facilities") return "Club duties";
  if (a.plan === "rest") return "Recovering";
  const week = G.trainingGains(s, a, a.plan).map((g) => g * 5).map((g, i) => (g >= 0.5 ? "+" + Math.round(g) + " " + STAT_SHORT[i] : "")).filter(Boolean);
  return week.length ? week.join(" ") + " a week" : "Light work";
}
// Training menu: each session is one tap. Cards show the step on the drill's ladder, what it raises
// for the chosen group (chemistry included) and the bill; sessions waiting on a building are listed
// underneath.
const stars = (tier) => `<span class="tier" title="Step ${tier} of 5">${"★".repeat(tier)}<i>${"★".repeat(5 - tier)}</i></span>`;
// The step on the drill's ladder: stars, then pips (or a bar) to the next step.
function drillLadder(s, id) {
  const level = G.drillLevel(s, id), next = G.drillThreshold(level), xp = G.drillXp(s, id), prev = G.drillThreshold(level - 1);
  return `<span class="drill-lv">${stars(G.tierOf(level))}${next == null ? "" : next - prev <= 8 ? `<span class="xp">${Array.from({ length: next - prev }, (_, k) => `<i class="${k < xp - prev ? "on" : ""}"></i>`).join("")}</span>` : `<span class="xp-bar">${bar(xp - prev, next - prev, "#e2a92a")}</span>`}</span>`;
}
function drillTip(s, id) {
  const level = G.drillLevel(s, id), next = G.drillThreshold(level), xp = G.drillXp(s, id),
    upcoming = level < G.DRILL_NAMES[id].length ? G.DRILL_NAMES[id][level] : null;
  return [G.DRILLS[id].desc || "", upcoming ? `Next step: ${upcoming} in ${next - xp} more session${next - xp === 1 ? "" : "s"}.` : ""].filter(Boolean).join(" ");
}
const billChips = (s, cost, energy) =>
  `${cost.money ? `<span class="cost money ${s.money < cost.money ? "short" : ""}">${ico("coin")}${cash(cost.money)}</span>` : `<span class="cost ${s.coaching.insights < cost.insights ? "short" : ""}">${ico("idea")}${cost.insights}</span>`}${energy ? `<span class="cost energy">${ico("bolt")}${energy}</span>` : ""}`;
// Use the same gain scale for every drill and athlete, regardless of the family filter or roster.
// Keep the actual points a surprise until the session's rating lands.
const SIZES = [["+", "Light"], ["++", "Moderate"], ["+++", "Strong"]];
function gainPills(gains, chem = null) {
  return gains
    .map((g, i) => {
      if (g <= 0.05) return "";
      const [mark, label] = SIZES[g >= 0.9 ? 2 : g >= 0.45 ? 1 : 0],
        tip = `${STAT_NAMES[i]}: ${label.toLowerCase()} training emphasis`;
      return `<span class="gain ${chem && G.chemistryMult(chem)[i] > 1 ? "chem" : ""}" style="--c:${STAT_COLORS[i]}" title="${tip}" aria-label="${tip}">${STAT_SHORT[i]} ${mark}</span>`;
    })
    .join("");
}
const extraPills = (id, d, ev) =>
  (["delivery", "review"].includes(id) || d.mastery ? `<span class="gain" style="--c:${ev ? EVENTS[ev].color : "#c8a050"}">Mastery</span>` : "") +
  (d.recover ? `<span class="gain" style="--c:#6ac08a">+${d.recover} stamina</span>` : "") +
  (d.xp ? `<span class="gain" style="--c:#a465d6">+XP</span>` : "");
// Training menu, step one: pick a session. Each card shows its step on the ladder, the stats it
// works, the bill for one athlete and how many of the squad can do it today. Sessions waiting on a
// building are listed underneath.
function drillGrid(s, family = "all") {
  const card = ([id, d]) => {
    const able = s.roster.filter((a) => !G.drillProblem(s, a, id, 1)),
      problem = !able.length ? "No one can do this today" : able.length < (d.minGroup || 1) ? `Needs ${d.minGroup} athletes free` : null,
      base = d.gains.map((g, i) => (G.tierOf(G.drillLevel(s, id)) >= 3 && d.broad === i ? g + Math.max(...d.gains) * 0.25 : g));
    return `<button class="drill fam-${d.family} ${problem ? "locked" : ""} ${G.tierOf(G.drillLevel(s, id)) >= 4 ? "high-tier" : ""}" data-act="pick-drill" data-drill="${id}" ${problem ? "disabled" : ""} title="${esc(drillTip(s, id))}">
        <span class="drill-top"><span class="drill-ico">${ico(DRILL_ICONS[id] || "levelup")}</span><span class="drill-name"><strong>${esc(G.drillName(s, id))}</strong>${drillLadder(s, id)}</span><span class="drill-cost">${billChips(s, G.sessionCost(s, id, 1), G.drillEnergy(s, id))}</span></span>
        <span class="gains">${gainPills(base)}${extraPills(id, d, null)}</span>
        <small class="${problem ? "why" : "able"}">${problem ? esc(problem) : `${able.length} of ${s.roster.length} can train${d.minGroup ? ` · ${d.minGroup}+ together` : ""}`}</small>
      </button>`;
  };
  const order = G.DRILL_FAMILIES.map(([f]) => f),
    entries = Object.entries(G.DRILLS).filter(([, d]) => family === "all" || d.family === family).sort(([, x], [, y]) => order.indexOf(x.family) - order.indexOf(y.family)),
    waiting = ([, d]) => s.roster.every((a) => G.facilityProblem(s, a, d.needs)),
    ready = entries.filter((e) => !waiting(e)),
    later = entries.filter(waiting);
  return `<p class="hint">Training emphasis: + light · ++ moderate · +++ strong. The session's rating decides the final gains.</p>
  <div class="drill-grid">${ready.map(card).join("") || `<p class="hint">Nothing in this family yet: see the buildings below.</p>`}</div>
  ${later.length ? `<details class="drill-later"><summary>${ico("lock")} ${later.length} more session${later.length > 1 ? "s" : ""} unlock with new buildings</summary><ul>${later.map(([id, d]) => `<li title="${esc(d.desc || "")}">${ico(DRILL_ICONS[id] || "levelup")}<span><strong>${esc(G.drillName(s, id))}</strong><small>${esc(G.facilityProblem(s, s.roster[0], d.needs))}</small></span></li>`).join("")}</ul></details>` : ""}`;
}
// Step two: who does it. Every athlete is listed with their event, type, stats and growth, and what
// this session would give them in the current group. The stats their event leans on are outlined.
function drillPicker(s, view, id) {
  const d = G.DRILLS[id], ids = trainees(s, view), n = ids.length, chem = G.chemistryOf(s, ids),
    problem = G.groupProblem(s, ids, id), cost = G.sessionCost(s, id, Math.max(1, n));
  const preview = new Map(s.roster.map((a) => {
      const group = ids.includes(a.id) ? ids : [...ids, a.id].slice(-G.MAX_GROUP);
      return [a.id, G.drillProblem(s, a, id, 1) ? [0, 0, 0, 0] : G.drillGains(s, a, id, group.length, G.chemistryOf(s, group))];
    }));
  const row = (a) => {
    const at = ids.indexOf(a.id), why = G.drillProblem(s, a, id, 1), ev = a.trainingEvent || a.event, w = EVENTS[ev].weights, cap = G.capOf(a),
      gains = preview.get(a.id);
    return `<button class="pick-row ${at >= 0 ? "on" : ""}" data-act="trainee" data-id="${a.id}" aria-pressed="${at >= 0}" ${why && at < 0 ? "disabled" : ""}>
      <span class="pick-who">${portrait(a)}${at >= 0 ? `<i class="order">${at + 1}</i>` : ""}<span><b>${esc(a.name.split(" ")[0])}</b> ${eventChip(ev)}<small>Lv ${a.level} · ${esc(typeName(a))} · OVR ${Math.round(G.eventRating(a, ev))}</small>${bar(a.stamina, 100, a.stamina < 30 ? "#e0604a" : "#6ac08a")}</span></span>
      <span class="sheet-stats">${a.stats.map((v, i) => `<span class="sheet-stat ${w[i] >= 0.25 ? "key" : ""}" style="--c:${STAT_COLORS[i]}" title="${STAT_NAMES[i]}: ${Math.round(w[i] * 100)}% of ${esc(EVENTS[ev].name)} · ceiling ${Math.floor(cap)}"><small>${STAT_SHORT[i]}</small><b>${showStat(v)}</b>${growthMark(a, i)}<i style="width:${Math.min(100, (v / cap) * 100)}%"></i></span>`).join("")}</span>
      <span class="pick-gains">${why ? `<small class="why">${esc(why)}</small>` : gainPills(gains, chem && s.coaching.chemistry?.includes(chem.key) ? chem : null) || `<small>${["delivery", "review"].includes(id) || d.mastery ? "Mastery only" : "Little to gain"}</small>`}</span>
    </button>`;
  };
  const tip = id === "delivery" && ids.length ? [...new Set(ids.map((x) => s.roster.find((a) => a.id === x)?.trainingEvent || s.roster.find((a) => a.id === x)?.event))].map((ev) => G.EVENT_DRILLS[ev]).join(" ") : drillTip(s, id);
  return `<div class="drill-pick">
  <div class="pick-head fam-${d.family}">${btn("‹ Sessions", "pick-drill", 'data-drill=""', "text")}<span class="drill-ico">${ico(DRILL_ICONS[id] || "levelup")}</span><span class="drill-name"><strong>${esc(G.drillName(s, id))}</strong>${drillLadder(s, id)}<small>${esc(tip)}</small></span><span class="gains">${extraPills(id, d, null)}</span></div>
  <p class="session-hint">${n > 1 ? `<b>Group of ${n}: +${(n - 1) * 10}%.</b> ` : `Pick up to ${G.MAX_GROUP} to train together; each partner adds 10%. `}${chemistryLine(s, ids)}</p>
  <div class="pick-list">${s.roster.map(row).join("")}</div>
  <p class="sheet-key"><span class="k-key">Key stat for their event</span><span>Growth speed ${rateMeter(0, "Fast")} fast · ${rateMeter(4, "Very slow")} slow</span><span>Training emphasis: + light · ++ moderate · +++ strong. Every session rolls its own result.</span></p>
  <div class="session-run"><span class="run-bill">${n ? billChips(s, cost, G.drillEnergy(s, id)) : ""}</span>${btn(problem ? esc(problem) : `${ico("play")} Run session${n > 1 ? " · " + n + " athletes" : ""}`, "coach-session", `data-ids="${ids.join(",")}" data-drill="${id}" ${problem ? "disabled" : ""}`)}</div>
</div>`;
}
// What the chosen group's chemistry looks like: named once discovered, a hint before then.
function chemistryLine(s, ids) {
  const c = G.chemistryOf(s, ids);
  if (!c) return "";
  const known = s.coaching.chemistry?.includes(c.key);
  return `<span class="chem-line ${known ? "known" : "hunch"}">${ico("spark")} ${known ? `<b>${esc(c.name)}</b> · ${c.stat == null ? "all stats" : STAT_NAMES[c.stat]} +${c.pct}%` : "This group has a good feeling about it…"}</span>`;
}
const bgName = (k) => BACKGROUNDS[k].name;
function chemistryBook(s) {
  const found = s.coaching.chemistry || [],
    have = new Set(s.roster.map((a) => a.background));
  return `<p class="hint">Some backgrounds click when they train together. The best match in a group boosts everyone's gains; matches don't stack. ${found.length} of ${G.CHEMISTRY.length} found.</p>
  <div class="chem-book">${G.CHEMISTRY.map((c) => {
    const known = found.includes(c.key), possible = c.needs.every((b) => have.has(b));
    return `<div class="chem ${known ? "known" : ""}"><strong>${known ? esc(c.name) : "???"}</strong><small>${known ? c.needs.map(bgName).join(" + ") : [bgName(c.needs[0]), ...c.needs.slice(1).map(() => "?")].join(" + ")}</small><em>${known ? (c.stat == null ? "All stats" : STAT_NAMES[c.stat]) + " +" + c.pct + "%" : possible ? "Your squad could find this one" : c.needs.length + " athletes"}</em></div>`;
  }).join("")}</div>`;
}
const canTrain = (s, a) => !a.injury && a.coachedDay !== s.day;
export function trainees(s, view, auto = false) {
  const picked = (view.trainees || []).filter((id) => s.roster.some((a) => a.id === id && canTrain(s, a)));
  if (picked.length || !auto) return picked;
  const first = s.roster.find((a) => canTrain(s, a));
  return first ? [first.id] : [];
}
// Consumables in the bag, previewed on this athlete.
function boostItems(s, a) {
  const ids = Object.keys(s.bag).filter((k) => ITEMS[k].kind === "use");
  if (!ids.length) return `<p class="hint">The bag has no consumables. Energy Drinks, Protein Shakes and manuals are in the ${btn("Shop", "page", 'data-page="shop"', "text")}.</p>`;
  return `<div class="use-grid">${ids
    .map((k) => {
      const d = ITEMS[k],
        problem = G.itemProblem(s, k, a.id),
        effect = d.team ? "Whole squad: " + d.desc : previewText(G.itemPreview(s, k, a.id));
      return `<button class="use-item rarity-${d.rarity}" data-act="use" data-item="${k}" ${d.team ? "" : `data-id="${a.id}"`} ${problem ? "disabled" : ""}>${icon(k, 32)}<span><strong>${d.name} ×${s.bag[k]}</strong><small>${esc(problem || effect)}</small></span></button>`;
    })
    .join("")}</div>`;
}
function preparationToggle(s) {
  return `<label class="toggle"><input type="checkbox" data-change="auto-prep" ${s.settings.autoMeetPrep?"checked":""} ${s.match||s.pendingEvent?"disabled":""}> Standard auto meet prep</label><p class="hint">Entrants: light all-round training, recovery to keep energy for coached sessions, a full rest day before each meet, and rest on meet day. Bench plans and duties continue. No automatic spending or item use. Manual coaching can achieve better results.</p>`;
}
function coachingPlanControls(s,view) {
  const scope=view.planScope||"entrants", plan=PLANS[view.groupPlan]?view.groupPlan:"balanced";
  const ids=G.coachingTargets(s,scope,trainees(s,view,true)), preview=G.trainingPlanPreview(s,ids,plan);
  return `<section class="card prep-controls"><div class="card-title"><h2>${ico("calendar")} Meet preparation</h2><span class="chip">${s.settings.autoMeetPrep?"Standard auto":"Manual"}</span></div>${preparationToggle(s)}
  ${s.settings.autoMeetPrep ? `<p class="prep-active">${s.phase === "season" && s.matchDay != null ? `Next meet: ${esc(G.shortDate(s.matchDay))} · Rest day: ${esc(G.shortDate(Math.max(1,s.matchDay-1)))}.` : "Book a meet to start the standard routine."} Saved manual plans resume when you turn this off.</p>` : ""}
  <details class="group-plans" ${(view.showGroupPlans ?? !s.settings.autoMeetPrep)?"open":""}><summary>Apply a coaching plan to a group</summary><div class="group-plan-fields"><label>Athletes<select data-change="plan-scope">${[["entrants","Meet entrants"],["squad","Whole squad"],["group","Selected training group"]].map(([id,label])=>`<option value="${id}" ${scope===id?"selected":""}>${label}</option>`).join("")}</select></label><label>Daily plan<select data-change="group-plan">${Object.entries(PLANS).filter(([id]) => id !== "facilities" || G.systemUnlocked(s,"duties")).map(([id,p])=>`<option value="${id}" ${plan===id?"selected":""}>${p.name}${p.course&&!s.coaching.unlocked.includes(id)?" · unlock "+p.cost+" Insights":""}</option>`).join("")}</select></label></div><p class="hint">${esc(PLANS[plan].desc)} ${preview.eligible.length} / ${ids.length} athletes qualify. ${preview.cost ? "Unlock once for the club, then apply to eligible athletes." : "No Insights spent to assign this plan."}</p>
  ${preview.skipped.length?`<p class="plan-skips">${preview.skipped.map(a=>`${esc(a.name)}: ${esc(a.reason)}`).join(" · ")}</p>`:""}
  ${btn(preview.problem?esc(preview.problem):`${preview.cost?"Unlock & apply · "+preview.cost+" Insights":"Apply to "+preview.eligible.length+" athletes"}`,"apply-group-plan",`data-scope="${scope}" data-plan="${plan}" ${preview.problem?"disabled":""}`,"subtle")}
  <small class="hint">${s.settings.autoMeetPrep?"Applying a plan switches back to manual preparation. ":""}Facility staff and injured athletes are skipped. Plans repeat each day; coached sessions make the big gains.</small></details></section>`;
}
// Three tabs, sessions first: the coached session is the main way to grow an athlete, daily plans
// are the background routine, and the kit bag holds the consumables.
const TRAIN_TABS = [["sessions", "Sessions"], ["chemistry", "Chemistry"], ["plans", "Daily plans"], ["bag", "Kit bag"]];
export function train(s, view) {
  if (!G.systemUnlocked(s,"plans")) return lockedSystem(s,"plans");
  const available = TRAIN_TABS.filter(([id]) => G.systemUnlocked(s, {sessions:"sessions",chemistry:"chemistry",plans:"plans",bag:"kit"}[id]));
  const tab = available.some(([id]) => id === view.trainTab) ? view.trainTab : available[0][0];
  const items = Object.keys(s.bag).filter((k) => ITEMS[k].kind === "use");
  const tabs = `<nav class="tabs train-tabs">${available.map(([id, label]) => `<button data-act="train-tab" data-tab="${id}" class="${tab === id ? "active" : ""}" aria-pressed="${tab === id}">${label}${id === "bag" && items.length ? " · " + items.reduce((n, k) => n + s.bag[k], 0) : ""}${id === "chemistry" ? " · " + (s.coaching.chemistry?.length || 0) : ""}</button>`).join("")}</nav>`;
  if (tab === "plans") return tabs + dailyPlans(s, view);
  if (tab === "chemistry") return tabs + chemistryBook(s);
  if (tab === "bag") return tabs + (items.length ? `<div class="use-grid">${items.map((k) => `<button class="use-item rarity-${ITEMS[k].rarity}" data-act="use" data-item="${k}">${icon(k, 32)}<span><strong>${ITEMS[k].name} ×${s.bag[k]}</strong><small>${esc(ITEMS[k].desc)}</small></span></button>`).join("")}</div>` : `<p class="hint">Kit bag's empty. Drinks and shakes are in the ${btn("Kit shop", "page", 'data-page="shop"', "text")}.</p>`);
  const family = ["all", ...G.DRILL_FAMILIES.map(([f]) => f)].includes(view.drillFamily) ? view.drillFamily : "all";
  if (G.DRILLS[view.drill]) return tabs + drillPicker(s, view, view.drill);
  const free = s.roster.filter((a) => canTrain(s, a)).length;
  return `${tabs}<div class="session-list">
  <div class="session-tools"><nav class="fam-filter" aria-label="Session family">${[["all", "All"], ...G.DRILL_FAMILIES.map(([f, label]) => [f, label])].map(([f, label]) => `<button data-act="drill-family" data-value="${f}" class="${family === f ? "active" : ""} fam-${f}" aria-pressed="${family === f}">${label}</button>`).join("")}</nav>${coachBadge(s)}</div>
  ${free ? "" : `<p class="hint">Everyone has had a session today. Press Train to roll on to tomorrow.</p>`}
  ${drillGrid(s, family)}</div>`;
}
function coachBadge(s) {
  const level = G.coachLevel(s), done = s.counters?.coachedSessions || 0, from = G.coachThreshold(level - 1), to = G.coachThreshold(level);
  return `<span class="coach-badge" title="Head coach level ${level}: +${(level - 1) * 3}% to session gains. ${to - done} more athletes coached to level ${level + 1}.">${ico("clipboard")} Coach Lv ${level}${bar(done - from, to - from, "#f2c94c")}</span>`;
}
function dailyPlans(s, view) {
  return `${G.systemUnlocked(s,"sessions") ? coachingPlanControls(s, view) : ""}
  <div class="card-title"><h2>Individual daily plans</h2></div>
  <div class="plan-rows">${s.roster
    .map((a) => `<label class="plan-row">${portrait(a)}<span><strong>${esc(a.name.split(" ")[0])}</strong><small>${esc(G.autoPrepActivity(s,a) ? "Auto now: "+PLANS[G.autoPrepActivity(s,a)].short+" · saved: "+PLANS[a.plan].short : shortForecast(s, a))}</small></span><select data-change="plan" data-id="${a.id}" aria-label="Daily plan for ${esc(a.name)}">${Object.entries(PLANS).filter(([id]) => !G.planProblem(s, a, id)).map(([id, p]) => `<option value="${id}" ${a.plan === id ? "selected" : ""}>${p.short || p.name}</option>`).join("")}</select></label>`)
    .join("")}</div>
  <p class="hint">${G.systemUnlocked(s,"sessions") ? "Daily plans keep everyone ticking over between sessions. Auto prep overrides meet entrants while a meet is booked; turn it off for individual control." : "Choose a daily routine, then press Train. Athletes rest automatically and ease off before meet day."}</p>`;
}
// What each athlete says after a session. Their background colours the best moments.
const QUOTES = {
  excellent: ["Did you feel that block? That was a bomb!", "Hips through, all the way. Finally!", "Coach, that PB is in trouble.", "Something just clicked!"],
  great: ["Good rhythm today, coach.", "That felt snappy.", "One step closer to a new PB.", "Same again tomorrow?"],
  good: ["Heavy legs. I'll take it.", "Grinding it out.", "Not pretty, but it counts.", "My legs are jelly."],
};
const BG_QUOTES = {
  farm: "Easier than hauling hay bales!", lumberjack: "Like splitting logs, but shinier.", gymnast: "Stuck the landing!", dancer: "Like a pirouette, but heavier.",
  sprinter: "My old sprint coach would be proud!", chess: "Exactly as I calculated.", poker: "…Not bad.", marathon: "Is that it? Let's do another set.",
  clown: "Ta-da! Hold your applause.", bloomer: "Better every day, just like I said!", showboat: "Somebody get a camera on me!", prodigy: "That's what I was born for.",
};
function quoteFor(s, a, quality, k) {
  const pool = [...QUOTES[quality], ...(quality !== "good" && BG_QUOTES[a.background] ? [BG_QUOTES[a.background], BG_QUOTES[a.background]] : [])];
  return pool[(s.day * 7 + k * 5 + (quality === "good" ? 0 : a.id)) % pool.length];
}
// Results under the training stage. Hidden until the ratings land.
export function trainingStage(s, session, befores) {
  const QUAL = G.QUALITY;
  const rows = session.results
    .map((r, k) => {
      const a = s.roster.find((x) => x.id === r.id),
        before = befores.get(r.id);
      const ups = a.stats
        .map((v, i) => {
          const was = gradeOf(showStat(before.stats[i]))[0],
            now = gradeOf(showStat(v))[0];
          return was !== now ? `${STAT_NAMES[i]} grade ${was} → <b>${now}</b>!` : "";
        })
        .filter(Boolean);
      if (G.overall(a) > before.ovr) ups.push(`OVR ${before.ovr} → <b>${G.overall(a)}</b>`);
      if (r.form) ups.unshift(`<span class="form-up">New ${esc(EVENTS[r.form.event].name.toLowerCase())} technique: <b>${esc(r.form.name)}</b>!</span>`);
      return `<article class="result-row q-${r.quality}" style="--d:${k * 0.22}s">
        <div class="result-who">${portrait(a)}<div><strong>${esc(a.name)}</strong><span class="qbadge" style="--q:${QUAL[r.quality].color}">${QUAL[r.quality].name}</span></div></div>
        <div class="grows compact">${growRows(a, before)}</div>
        <p class="quote">“${esc(quoteFor(s, a, r.quality, k))}”</p>
        ${ups.length || r.mastery > 0 ? `<p class="ups">${[...ups, r.mastery > 0 ? `${EVENTS[a.trainingEvent || a.event].name} mastery +${r.mastery.toFixed(1)}` : ""].filter(Boolean).join(" · ")}</p>` : ""}
      </article>`;
    })
    .join("");
  const level = session.level,
    next = G.drillThreshold(level),
    prev = G.drillThreshold(level - 1);
  return `<div class="stage"><canvas class="stage-canvas" width="480" height="240" aria-label="Training scene"></canvas><span class="stage-tap">Tap to skip ▸</span></div>
  <div class="stage-results">
    ${session.tierUp ? `<div class="levelup-banner upgrade">${ico("levelup")}<span><small>TRAINING UPGRADED</small>${esc(session.name)} → <b>${esc(session.levelUp)}</b> ${stars(G.tierOf(level))}<em>Bigger gains${G.tierOf(level) >= 3 && G.DRILLS[session.drill].broad != null ? ", now works " + STAT_NAMES[G.DRILLS[session.drill].broad] + " too" : ""}${G.tierOf(level) === G.PAID_TIER ? ". This step is a camp the club pays for" : ""}.</em></span></div>` : session.levelUp ? `<div class="levelup-banner">${ico("levelup")} ${esc(session.levelUp)}: +8% gains</div>` : ""}
    ${session.chemistry ? `<div class="chem-banner ${session.chemistry.discovered ? "new" : ""}">${ico("spark")}<span>${session.chemistry.discovered ? "<small>NEW TRAINING CHEMISTRY</small>" : ""}<b>${esc(session.chemistry.name)}</b> · ${session.chemistry.stat == null ? "all stats" : STAT_NAMES[session.chemistry.stat]} +${session.chemistry.pct}%</span></div>` : ""}
    ${session.coachLevelUp ? `<div class="levelup-banner coach">${ico("clipboard")} Head coach reached <b>level ${session.coachLevel}</b>: sessions give ${(session.coachLevel - 1) * 3}% more.</div>` : ""}
    ${rows}
    <div class="drill-xp">${ico("dumbbell")} <span>${esc(session.levelUp || session.name)} ${stars(G.tierOf(level))}</span>${next != null ? `<span class="bar"><i style="width:${((session.xp - prev) / (next - prev)) * 100}%;--bar:#f2c94c"></i></span><small>${next - session.xp} more to ${level < G.DRILL_NAMES[session.drill].length ? esc(G.DRILL_NAMES[session.drill][level]) : "the next ★"}</small>` : "<small>Mastered</small>"}<small>${session.money ? ico("coin") + " −" + cash(session.money) : ico("idea") + " −" + session.cost}</small></div>
  </div>`;
}
function growRows(a, before) {
  return a.stats
    .map((v, i) => {
      const d = v - before.stats[i];
      return `<div class="grow ${d > 1e-6 ? "up" : ""}"><span>${STAT_NAMES[i]}</span><span class="track"><i style="width:${before.stats[i]}%;--c:${STAT_COLORS[i]}"></i>${d > 1e-6 ? `<em style="left:${before.stats[i]}%;--w:${d}%;--c:${STAT_COLORS[i]};--n:${i}"></em>` : ""}</span><b>${showStat(v)}</b><span class="delta">${d > 1e-6 ? plus(d) : ""}</span></div>`;
    })
    .join("");
}
// Kairosoft-style result card: bars fill from the old value to the new one.
export function growth(a, before, extra = []) {
  const rows = growRows(a, before);
  const notes = [
    Math.round(a.stamina) !== Math.round(before.stamina) ? `${ico("bolt")} Stamina ${Math.round(before.stamina)} → <b>${Math.round(a.stamina)}</b>` : "",
    Math.round(a.condition) !== Math.round(before.condition) ? `${mood(a)} Condition ${Math.round(before.condition)} → <b>${Math.round(a.condition)}</b>` : "",
    a.level > before.level ? `${ico("levelup")} <b>Level ${a.level}!</b>` : "",
    a.sp > before.sp ? `${ico("spark")} <b>+${a.sp - before.sp} SP</b>` : "",
    a.injury < before.injury ? `${ico("bandage")} Injury healed` : "",
    ...extra,
  ].filter(Boolean);
  return `<div class="growth">${portrait(a, "large")}<div class="grows">${rows}</div></div>${notes.length ? `<p class="growth-notes">${notes.join("<br>")}</p>` : ""}`;
}
// Using an item, Kairosoft style: the item drops onto the athlete with a burst of sparkles,
// then each change slides in, its bar filling from the old value to the new as the number
// counts up and a "+N" pops. A whole-squad item lands on the squad instead. The timing lives
// in CSS (--i staggers the rows); main.js counts the numbers and closes it.
export function itemFx(s, id, a, before) {
  const d = ITEMS[id],
    rows = [];
  const bar = (label, color, from, to, max, fmt = (v) => String(Math.round(v))) =>
    rows.push(`<div class="ifx-row"><span class="ifx-label">${esc(label)}</span><span class="ifx-track"><i style="width:${Math.min(100, (from / max) * 100)}%;--c:${color}"></i><em style="--from:${Math.min(100, (from / max) * 100)}%;--to:${Math.min(100, (to / max) * 100)}%;--c:${color}"></em></span><b data-from="${fmt(from)}" data-to="${fmt(to)}">${fmt(from)}</b><span class="ifx-plus">+${+fmt(to) - +fmt(from) || plus(to - from).slice(1)}</span></div>`);
  const chip = (icn, html) => rows.push(`<div class="ifx-row ifx-chip">${ico(icn)}<span>${html}</span></div>`);
  if (!a) {
    chip("heart", `Whole squad · condition <b>+${d.teamCond || 0}</b>${d.teamStamina ? ` · stamina <b>+${d.teamStamina}</b>` : ""}`);
  } else {
    // Stats fill against the athlete's own limit, so a +2 visibly moves the bar.
    a.stats.forEach((v, i) => showStat(v) > showStat(before.stats[i]) && bar(STAT_NAMES[i], STAT_COLORS[i], showStat(before.stats[i]), showStat(v), Math.max(showStat(v), G.capOf(a))));
    if (Math.round(a.stamina) > Math.round(before.stamina)) bar("Stamina", "#e2b04a", before.stamina, a.stamina, 100);
    if (Math.round(a.condition) > Math.round(before.condition)) bar("Condition", "#6ac08a", before.condition, a.condition, 100);
    if (a.potential > before.potential) bar("Potential", "#a465d6", before.potential, a.potential, 100);
    if (a.level > before.level) chip("levelup", `<b>Level up!</b> Lv. ${before.level} → <b>${a.level}</b>`);
    else if (a.xp > before.xp) bar("XP", "#4f8fd6", before.xp, a.xp, G.xpNeeded(a.level));
    if (a.sp > before.sp) chip("spark", `<b>+${a.sp - before.sp} skill point${a.sp - before.sp > 1 ? "s" : ""}</b>`);
    if (a.injury < before.injury) chip("bandage", "<b>Injury healed</b>");
    if (d.buff) chip("bolt", `<b>+${Math.round((d.buff - 1) * 100)}%</b> at the next meet`);
    if (d.promote) chip("star", "<b>Next rank-up is free</b>");
  }
  if (!rows.length) chip("check", "Used");
  const who = a ? `<span class="ifx-portrait">${portrait(a, "large")}</span>` : `<span class="ifx-squad">${s.roster.slice(0, 5).map((b) => portrait(b)).join("")}</span>`;
  return `<div class="ifx-card"><div class="ifx-stage">${who}<span class="ifx-item">${icon(id, 40)}</span><span class="ifx-burst">${"<i></i>".repeat(8)}</span></div>
    <div class="ifx-title"><small>${esc(d.name)}</small><strong>${esc(a ? a.name : "The squad")}</strong></div>
    <div class="ifx-rows">${rows.map((r, i) => r.replace('class="ifx-row', `style="--i:${i}" class="ifx-row`)).join("")}</div></div>`;
}
// Athlete picker for an item: previews the effect on each athlete and blocks wasted uses.
export function itemTargets(s, id) {
  const d = ITEMS[id];
  return `<p>${esc(d.desc)}</p><div class="pick-list">${s.roster
    .map((a) => {
      const problem = d.kind === "use" ? G.itemProblem(s, id, a.id) : null,
        info = d.kind === "use" ? previewText(G.itemPreview(s, id, a.id)) : a.gear[d.slot] ? "Wearing " + ITEMS[a.gear[d.slot]].name + (s.forge[a.gear[d.slot]] ? " +" + s.forge[a.gear[d.slot]] : "") : "Empty " + SLOT_NAMES[d.slot].toLowerCase() + " slot";
      return `<button class="pick" data-pick="${a.id}" ${problem ? "disabled" : ""}>${portrait(a)}<span><strong>${esc(a.name)}</strong><small>${EVENTS[a.event].short} · ${esc(problem || info)}</small></span></button>`;
    })
    .join("")}</div>`;
}

// Who a skill book is for, and what reading it costs.
const bookNeeds = (k) => { const d = SKILLS[ITEMS[k].skill]; return [d.sp + " SP to read", d.rank ? RANKS[d.rank].name + " rank" : "", d.event ? EVENTS[d.event].name + " mastery 60" : ""].filter(Boolean).join(" · "); };
// The shop's skill-book shelf: three books a week, one copy of each.
export function bookShelfPanel(s) {
  const shelf = G.bookShelf(s), days = G.shelfRestock(s);
  return `<div class="card-title"><h2>This week's skill books</h2><span class="restock">New books in ${days} day${days === 1 ? "" : "s"}</span></div><p class="hint">Common skills are learned with skill points. Rarer skills come only from books: each teaches one athlete, then it's gone. One copy of each book per week.</p>
  <div class="item-grid">${shelf.map((k) => {
    const d = ITEMS[k], sold = G.bookSold(s, k), price = G.itemPrice(s, k), owned = G.ownedCount(s, k);
    return `<div class="item-card shop-item book rarity-${d.rarity} ${sold ? "sold" : ""}">${icon(k, 40)}<span><strong>${d.name}</strong><small>${esc(SKILLS[d.skill].desc)}</small><span class="owned">${chip(RARITY[d.rarity].name, RARITY[d.rarity].color, "rarity")} <small class="skill-needs">${esc(bookNeeds(k))}</small>${owned ? " · Have " + owned : ""}</span></span><span class="buy-actions">${sold ? `<span class="sold-tag">Sold</span>` : btn("Buy · " + `${price < d.price ? `<s>${cash(d.price)}</s> ` : ""}${cash(price)}`, "buy-book", `data-item="${k}" ${s.money < price ? "disabled" : ""}`, "small")}</span></div>`;
  }).join("")}</div>`;
}
// Books in the kit bag that this athlete could read.
function athleteBooks(s, a) {
  const books = Object.keys(s.bag).filter((k) => ITEMS[k].kind === "book" && !a.skills.includes(ITEMS[k].skill) && (!SKILLS[ITEMS[k].skill].event || SKILLS[ITEMS[k].skill].event === a.event));
  const intro = G.systemUnlocked(s, "kit") ? "Rarer skills come from skill books in the shop, a few each week." : "Rarer skills come from skill books, once the club has a kit shop.";
  return `<div class="card-title"><h2>Skill books</h2></div>${books.length ? books.map((k) => {
    const d = ITEMS[k], problem = G.bookProblem(s, a, k);
    return `<div class="skill-row book rarity-${d.rarity}">${skillIcon(d.skill)}<span><strong>${SKILLS[d.skill].name} ${chip(RARITY[d.rarity].name, RARITY[d.rarity].color, "rarity")}</strong><small>${esc(SKILLS[d.skill].desc)}</small><small class="skill-needs">${esc(bookNeeds(k))} · ${s.bag[k]} in the bag</small></span>${btn(problem || "Read · " + SKILLS[d.skill].sp + " SP", "read-book", `data-id="${a.id}" data-item="${k}" ${problem ? "disabled" : ""}`, problem ? "subtle small" : "primary small")}</div>`;
  }).join("") : ""}<p class="hint">${intro}</p>`;
}
const skillIcon = (k) => `<span class="skill-icon c-${SKILLS[k].cat}">${ico({ train: "levelup", meet: "target", team: "heart", signature: "spark", unique: "star" }[SKILLS[k].cat])}</span>`;
function skillRow(a, k, label, act, disabled) {
  const d = SKILLS[k];
  return `<div class="skill-row ${a.equipped.includes(k) ? "on" : ""}">${skillIcon(k)}<span><strong>${d.name}</strong><small>${d.desc}</small></span>${btn(label, act, `data-id="${a.id}" data-skill="${k}" ${disabled ? "disabled" : ""}`, act === "learn" ? "primary small" : "subtle small")}</div>`;
}

// ── Scouting ────────────────────────────────────────────────────────────
export function recruit(s) {
  if (!G.systemUnlocked(s,"recruit")) return lockedSystem(s,"recruit");
  const full = s.roster.length >= G.rosterCap(s);
  const secrets = s.secretsOffered.filter((k) => !s.secretsSigned.includes(k));
  return `${btn("‹ Squad", "page", 'data-page="squad"', "text")}<p class="hint">Squad ${s.roster.length} / ${G.rosterCap(s)}. Rarer athletes have a higher potential and arrive knowing a skill.</p>
  ${secrets.length ? `<section class="card secret-card"><div class="card-title"><h2>${ico("star")} Special visitors</h2></div>${secrets.map((k) => `<div class="secret"><canvas class="portrait" width="48" height="48" data-secret="${k}" aria-hidden="true"></canvas><span><strong>${SECRETS[k].name}</strong><small>${EVENTS[SECRETS[k].event].name} · ${SKILLS[SECRETS[k].skill].name}: ${SKILLS[SECRETS[k].skill].desc}</small></span>${btn("Sign · " + cash(G.secretFee(s, k)), "sign-secret", `data-key="${k}" ${full || s.money < G.secretFee(s, k) ? "disabled" : ""}`, "small")}</div>`).join("")}</section>` : ""}
  <div class="prospects">${s.prospects
    .map((a) => {
      const cost = G.signCost(s, a);
      return `<article class="prospect rarity-${a.rarity}"><div class="prospect-head">${portrait(a)}<div>${eventChip(a.event)} ${rarityChip(a)}<h2>${esc(a.name)}</h2><small>${BACKGROUNDS[a.background].name} · ${esc(typeName(a))} · potential ${Math.floor(a.potential)}</small></div>${ovrBadge(a)}</div>
      <div class="statline big">${a.stats.map((v, i) => `<i style="--c:${STAT_COLORS[i]}">${STAT_SHORT[i]} ${showStat(v)} ${growthMark(a, i)}</i>`).join("")}</div>
      ${a.skills.length ? `<p class="hint">Knows <b>${SKILLS[a.skills[0]].name}</b>: ${SKILLS[a.skills[0]].desc}</p>` : ""}
      <div class="prospect-foot"><span>Wage ${cash(G.wageOf(a))}/wk</span>${btn("Sign · " + cash(cost), "recruit", `data-id="${a.id}" ${full || s.money < cost ? "disabled" : ""}`, "small")}</div></article>`;
    })
    .join("")}</div>
  ${btn("Scout three more · " + cash(G.scoutCost(s)), "scout", s.money < G.scoutCost(s) ? "disabled" : "", "subtle")}
  <p class="hint">${full ? "The squad is full. Build or upgrade a Dormitory, or release a contract." : "A Scout Office and the Scouting Network combo improve rarity."} Secret characters appear when you reach certain milestones.</p>`;
}

// ── Build: stadium and plots ────────────────────────────────────────────
const STADIUM_ICON = { track: "track", shot: "ball", discus: "cage", hammer: "cage", jav: "runway", stands: "stands", studio: "video", lights: "lights" };
const pips = (lvl, max) => `<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? "on" : ""}"></i>`).join("")}</span>`;
// Who fills the grandstand: its capacity, and how many of the club's fans come to a home meet.
function standsCrowd(s) {
  const { attendance, capacity } = G.stadiumCrowd(s, { meet: true, weather: "cloudy" }),
    next = STADIUM.stands.capacity[s.stadium.stands + 1];
  return `<p class="hint">Capacity <b>${capacity.toLocaleString()}</b> · a home meet draws about <b>${attendance.toLocaleString()}</b> of your ${s.fans.toLocaleString()} fans${attendance >= capacity ? " · <b>sold out</b>" : ""}.${next ? ` The next stand holds ${next.toLocaleString()}.` : ""}</p>`;
}
function stadiumCard(s, key, open) {
  const d = STADIUM[key],
    lvl = s.stadium[key],
    problem = G.stadiumProblem(s, key),
    cost = d.cost[lvl];
  return `<div class="stadium-row ${open ? "open" : ""}"><button class="stadium-head" data-act="spot" data-key="${key}">${ico(STADIUM_ICON[key])}<span><strong>${d.name}</strong><small>${esc(d.levels[lvl])}</small></span>${pips(lvl, d.max)}</button>
  ${open ? `<div class="stadium-detail"><p>${d.desc}</p>${key === "stands" ? standsCrowd(s) : ""}${key === "studio" && lvl ? facilityStaffPicker(s,"studio") : ""}${lvl < d.max ? `<p class="next">Next: <b>${esc(d.levels[lvl + 1])}</b> · +${cash(Math.round(cost * 0.03))}/wk upkeep</p>` : ""}${btn(problem === "Fully upgraded" ? "Fully upgraded" : problem ? esc(problem) : (lvl ? "Upgrade" : "Build") + " · " + cash(cost), "upgrade-spot", `data-key="${key}" ${problem ? "disabled" : ""}`)}</div>` : ""}</div>`;
}
// A sales building's books, to judge whether it is worth it: profit per week after upkeep,
// how much of its cost it has paid back, whether visitors or the counter limit today's trade,
// and what the next level would add.
const SALES_PERKS = { cafe: "Also lifts the squad's condition every day.", shop: "Also wins new fans every day." };
function salesBooks(s, i) {
  const r = G.salesReport(s, i);
  if (!r) return "";
  const signed = (n) => (n > 0 ? "+" : "") + cash(n),
    // A label and its amount, kept on one line.
    item = (label, n) => `<i class="amt">${label} ${cash(n)}</i>`,
    pct = Math.round(r.paidBack * 100),
    payoff = r.net >= 0 ? `<b class="pos">Paid off</b> · ${signed(r.net)} profit so far` : r.weeksToPayOff ? `Pays for itself in about <b>${r.weeksToPayOff} week${r.weeksToPayOff === 1 ? "" : "s"}</b>` : `<b class="neg">Not covering its upkeep</b> at today's trade`,
    t = r.today,
    trade = t.full
      ? `The counter is <b>full</b>: ${t.buyers} of today's ${t.visitors} visitors want to buy but it serves ${t.capacity}. An upgrade sells to more of them.`
      : `${t.buyers} of today's ${t.visitors} visitors buy; the counter could serve ${t.capacity}. <b>Visitors are the limit</b>: more fans (or a Picnic Lawn) help more than an upgrade.`,
    next = r.next
      ? r.next.gain > 0
        ? `Level ${s.plots[i].level + 1}: <b>${signed(r.next.gain)}/week</b> at today's crowds for ${cash(r.next.cost)}, paying back in about ${r.next.weeks} week${r.next.weeks === 1 ? "" : "s"}.`
        : `Level ${s.plots[i].level + 1} would add <b>nothing</b> at today's crowds: its extra upkeep outweighs the extra sales.`
      : "";
  return `<section class="sales-books"><h3>${ico("coin")} The books</h3>
    <div class="books-grid">
      <div><small>${r.days ? (r.days < 7 ? "Last " + r.days + " day" + (r.days === 1 ? "" : "s") + ", per week" : "Last 7 days") : "Expected per week"}</small><b class="${r.weekly >= 0 ? "pos" : "neg"}">${signed(r.weekly)}</b><span>${r.days ? [item("Sales", r.sales), r.staff ? item("staff", r.staff) : "", item("upkeep", -r.upkeep)].filter(Boolean).join(" · ") : `At today's ${t.visitors} visitors, less ${item("upkeep", -r.upkeep)}`}</span></div>
      <div><small>${r.since != null ? "Since day " + r.since : "Since the books began"}</small><b class="${r.net >= 0 ? "pos" : "neg"}">${signed(r.net)}</b><span>${[item("Takings", r.earned), item("upkeep", -r.upkeepPaid), item("cost", -r.spent)].join(" · ")}</span></div>
    </div>
    <div class="payback"><span class="bar"><i style="width:${Math.min(100, pct)}%;--bar:${r.net >= 0 ? "#3a9a5a" : "#e2b04a"}"></i></span><small>${pct}% of its ${cash(r.spent)} cost paid back · ${payoff}</small></div>
    <p class="hint">${trade} ${SALES_PERKS[s.plots[i].type] || ""}</p>
    ${next ? `<p class="hint">${next}</p>` : ""}</section>`;
}
// The club ledger behind the top-bar counters: what came in and went out for each currency
// over the last week or four weeks, biggest first, with what's coming next.
export const LEDGER_CURRENCIES = { money: { name: "Money", icon: "coin", color: "#e2b04a", fmt: (n) => cash(n) }, fans: { name: "Fans", icon: "heart", color: "#f6a0a8", fmt: (n) => Math.round(n).toLocaleString() }, insights: { name: "Coaching Insights", icon: "idea", color: "#9fd0f0", fmt: (n) => Math.round(n).toLocaleString() } };
export function ledger(s, cur = "money", days = 7) {
  const C = LEDGER_CURRENCIES[cur],
    balance = cur === "insights" ? s.coaching.insights : s[cur],
    from = s.day - days,
    totals = {};
  for (const d of s.ledger?.days || []) if (d.day > from) for (const [k, v] of Object.entries(d[cur] || {})) totals[k] = (totals[k] || 0) + v;
  const rows = Object.entries(totals).filter(([, v]) => Math.round(v) !== 0),
    ins = rows.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]),
    outs = rows.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]),
    total = (list) => list.reduce((n, [, v]) => n + v, 0),
    inSum = total(ins), outSum = total(outs), net = inSum + outSum,
    biggest = Math.max(1, ...rows.map(([, v]) => Math.abs(v))),
    signed = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + C.fmt(Math.abs(n)).replace(/^[−-]/, "");
  const list = (title, entries, sign) => `<section class="ledger-list ${sign}"><h3>${title}<b>${entries.length ? signed(total(entries)) : "—"}</b></h3>${entries.length ? entries.map(([k, v]) => `<div class="ledger-row"><span>${esc(k)}</span><i class="ledger-bar"><em style="width:${Math.max(3, (Math.abs(v) / biggest) * 100)}%"></em></i><b>${signed(v)}</b></div>`).join("") : `<p class="hint">Nothing in the last ${days} days.</p>`}</section>`;
  // What happens next, so the coach can plan around it.
  const upcoming =
    cur === "money" ? (() => { const inc = G.weeklyIncome(s), out = G.wages(s) + G.upkeep(s), next = 7 - (s.day % 7 || 7) + s.day; return `Next payday, ${esc(G.shortDate(next))}: ${cash(inc)} income − ${cash(G.wages(s))} wages − ${cash(G.upkeep(s))} upkeep = <b>${signed(inc - out)}</b>.`; })()
    : cur === "insights" ? `Your buildings add about <b>${(Math.round(G.insightRate(s) * 10) / 10).toLocaleString()}</b> a day, +${G.PRACTICE_INSIGHTS} for each day of training and +4 to +9 from each meet review.`
    : `Fans fill your stands, bring visitors to the café and merch stand, and grow from meets, the merch stand, the statue and club stories.`;
  return `<div class="ledger">
    <nav class="tabs ledger-tabs">${Object.entries(LEDGER_CURRENCIES).filter(([k]) => k !== "insights" || G.systemUnlocked(s, "sessions")).map(([k, c]) => `<button data-ledger-cur="${k}" class="${k === cur ? "active" : ""}" aria-pressed="${k === cur}">${ico(c.icon)} ${c.name}</button>`).join("")}</nav>
    <div class="ledger-head"><div><small>Balance</small><b style="--c:${C.color}">${C.fmt(balance)}</b></div><div><small>Last ${days} days</small><b class="${net >= 0 ? "pos" : "neg"}">${signed(net)}</b></div>
      <span class="seg ledger-days">${[7, 28].map((n) => `<button data-ledger-days="${n}" class="${n === days ? "active" : ""}" aria-pressed="${n === days}">${n === 7 ? "Week" : "4 weeks"}</button>`).join("")}</span></div>
    ${list("In", ins, "in")}${list("Out", outs, "out")}
    <p class="hint ledger-next">${upcoming}</p></div>`;
}
// What a construction or upgrade will cost and do, shown before any money is spent.
export function constructionConfirm(s, o) {
  const after = s.money - o.cost;
  return `<div class="confirm-build">${o.picture || ""}<div><p>${o.desc}</p>
    <div class="confirm-facts"><span>Cost <b>${cash(o.cost)}</b></span>${o.upkeep != null ? `<span>Upkeep <b>${o.upkeepFrom ? cash(o.upkeepFrom) + " → " : ""}${cash(o.upkeep)}/wk</b></span>` : ""}<span>Funds after <b class="${after < 300 ? "neg" : ""}">${cash(after)}</b></span></div>
    ${o.note ? `<p class="hint">${o.note}</p>` : ""}</div></div>`;
}
// Shop purchases ask first, like building does: what it is, the price, and the money left after.
export function itemConfirmBody(s, id, note = "") {
  const d = ITEMS[id];
  return constructionConfirm(s, { cost: G.itemPrice(s, id), desc: `<b>${esc(d.name)}</b> · ${esc(d.desc)}`, picture: `<span class="confirm-picture">${icon(id, 56)}</span>`, note });
}
export function lookConfirmBody(s, cat, key) {
  const o = CUSTOMISE[cat].options[key];
  return constructionConfirm(s, { cost: o.cost, desc: `<b>${esc(o.name)}</b> · ${esc(CUSTOMISE[cat].name)}. It goes on straight away.`, picture: `<span class="confirm-picture"><i class="sw big" style="background:${swatch(s, cat, key)}"></i></span>`, note: "Bought once: switch between your looks any time for free." });
}
export function buildConfirmBody(s, i, type) {
  const d = FACILITIES[type],
    // Combos this spot would complete, named only if the club has already found them.
    pairs = COMBOS.filter((c) => !c.stadium && (c.a === type || c.b === type) && G.neighbours(i).some((j) => [c.a, c.b].includes(s.plots[j]?.type) && s.plots[j]?.type !== type)),
    known = pairs.filter((c) => s.discovered.includes(c.key));
  return constructionConfirm(s, { cost: d.cost, upkeep: G.upkeepOf(type, 1), desc: d.desc, picture: `<canvas class="building" width="104" height="66" data-building="${type}:1"></canvas>`,
    note: known.length ? `${ico("spark")} Next door: ${known.map((c) => esc(c.name)).join(", ")}.` : pairs.length ? `${ico("spark")} Something good might happen next to the neighbours here…` : "" });
}
export function upgradeConfirmBody(s, i) {
  const p = s.plots[i], d = FACILITIES[p.type];
  return constructionConfirm(s, { cost: G.upgradeCost(p.type, p.level), upkeepFrom: p.type === "club" ? null : G.upkeepOf(p.type, p.level), upkeep: p.type === "club" ? null : G.upkeepOf(p.type, p.level + 1), desc: d.desc,
    picture: `<canvas class="building" width="104" height="66" data-building="${p.type}:${Math.min(3, p.level + 1)}"></canvas>`, note: (p.level + 1) % 5 === 0 ? "Level " + (p.level + 1) + " makes it a landmark." : "" });
}
export function stadiumConfirmBody(s, key) {
  const d = STADIUM[key], lvl = s.stadium[key], cost = d.cost[lvl];
  return constructionConfirm(s, { cost, upkeep: Math.round(cost * 0.03), desc: `<b>${esc(d.levels[lvl + 1])}</b>. ${d.desc}` });
}
export function build(s, view) {
  if (!G.systemUnlocked(s,"build")) return lockedSystem(s,"build");
  const sel = view.selected;
  let focus = "";
  if (sel?.kind === "plot") {
    const i = sel.index,
      p = s.plots[i];
    if (!G.plotUnlocked(s, i)) focus = `<article class="card"><h2>${ico("lock")} Locked plot</h2><p>This land opens as the club climbs the leagues.</p></article>`;
    else if (p) {
      const d = FACILITIES[p.type],
        cost = G.upgradeCost(p.type, p.level),
        combos = G.combos(s).filter((c) => !c.stadium && (c.a === p.type || c.b === p.type) && G.neighbours(i).some((j) => [c.a, c.b].includes(s.plots[j]?.type)));
      focus = `<article class="card facility"><div class="facility-head"><canvas class="building" width="104" height="66" data-building="${p.type}:${p.level}"></canvas><div><span class="eyebrow">LEVEL ${p.level}${G.maxLevelOf(p.type) <= 3 ? " / 3" : p.level >= 5 ? " · LANDMARK +" + Math.floor(p.level / 5) : p.level >= 3 ? " · LANDMARK AT 5" : ""}${p.type !== "club" ? " · UPKEEP " + cash(G.upkeepOf(p.type, p.level)) + "/WK" : ""}</span><h2>${d.name}</h2><p>${d.desc}</p></div></div>
        ${salesBooks(s, i)}
        ${facilityStaffPicker(s,"plot:"+i)}
        ${combos.length ? `<p class="combo-line">${combos.map((c) => ico("spark") + " " + c.name + ": " + c.desc).join("<br>")}</p>` : ""}
        <div class="inline">${btn(p.level >= G.maxLevelOf(p.type) ? "Fully upgraded" : (p.level >= 3 ? "Push to Lv " + (p.level + 1) + " · " : "Upgrade · ") + cash(cost), "upgrade", `data-index="${i}" ${p.level >= G.maxLevelOf(p.type) || s.money < cost ? "disabled" : ""}`)}${i !== CLUB_PLOT ? btn(view.moving === i ? "Cancel move" : "Move / swap", "move", `data-index="${i}"`, "subtle") : ""}${i !== CLUB_PLOT ? btn("Clear · +" + cash(d.cost / 2), "sell", `data-index="${i}"`, "subtle") : ""}</div></article>`;
    } else
      focus = `<div class="card-title"><h2>Build on this plot</h2>${btn("Close", "deselect", "", "text")}</div><div class="build-list">${Object.entries(FACILITIES)
        .filter(([id, d]) => id !== "club" && (d.decor || !s.plots.some((q) => q?.type === id)))
        .map(([id, d]) => {
          const lock = s.league < d.league ? "Unlocks in the " + LEAGUES[d.league].name : d.needsTitle && !s.trophies.length ? "Needs a title" : null;
          return `<button class="build" data-act="build" data-index="${i}" data-type="${id}" ${lock || s.money < d.cost ? "disabled" : ""}><canvas class="building" width="104" height="66" data-building="${id}:1"></canvas><span><strong>${d.name}</strong><small>${d.desc}</small><b>${lock || cash(d.cost) + " · " + cash(G.upkeepOf(id, 1)) + "/wk upkeep"}</b></span></button>`;
        })
        .join("")}</div>`;
  }
  const openKey = sel?.kind === "stadium" ? sel.key : null;
  return `${view.moving != null ? `<p class="banner-note">${ico("build")} Tap a plot on the map to move or swap. Moving is free.</p>` : ""}${focus}
  <div class="card-title"><h2>${ico("stadium")} The stadium</h2><span class="hint-inline">Tap a part to upgrade</span></div>
  <div class="stadium-list">${STADIUM_IDS.map((k) => stadiumCard(s, k, k === openKey)).join("")}</div>
  <div class="card-title"><h2>${ico("build2")} Around the stadium</h2><span class="hint-inline">${G.unlockedPlots(s).length} of 13 plots open</span></div>
  <div class="plot-list">${PLOT_ORDER
    .map((n) => {
      const q = s.plots[n],
        open = G.plotUnlocked(s, n);
      return `<button class="plot ${sel?.kind === "plot" && sel.index === n ? "selected" : ""} ${q ? "built" : ""} ${open ? "" : "locked"}" data-act="plot" data-index="${n}">${q ? `<canvas class="building tiny" width="104" height="66" data-building="${q.type}:${q.level}"></canvas><small>${FACILITIES[q.type].name}${q.level > 1 ? " Lv" + q.level : ""}</small>` : open ? ico("plus") + "<small>Build</small>" : ico("lock") + "<small>Locked</small>"}</button>`;
    })
    .join("")}</div>
  <details class="card notebook"><summary>${ico("spark")} Combo notebook · ${s.discovered.length} / ${COMBOS.length}</summary>${COMBOS.map((c) => {
    const found = s.discovered.includes(c.key),
      seen = !c.stadium && s.plots.some((q) => q?.type === c.a || q?.type === c.b);
    const pair = c.stadium ? "Stadium milestone" : FACILITIES[c.a].name + " + " + FACILITIES[c.b].name;
    return `<div class="combo ${found ? "found" : ""}"><strong>${found ? c.name : "? ? ?"}</strong><small>${found ? pair + " — " + c.desc + (G.combos(s).some((x) => x.key === c.key) ? "" : " (inactive)") : c.stadium ? c.hint : seen ? "Something pairs well next to the " + FACILITIES[s.plots.some((q) => q?.type === c.a) ? c.a : c.b].name + "…" : "Undiscovered."}</small></div>`;
  }).join("")}</details>`;
}

// ── Shop & bag ──────────────────────────────────────────────────────────
// What the shopkeeper has to say, most useful first: a sale, fresh books, an empty shelf, the
// next delivery of stock, then a bit of chat that changes with the day.
export function shopkeeperLine(s) {
  const shelf = G.bookShelf(s), left = shelf.filter((k) => !G.bookSold(s, k)), days = G.shelfRestock(s);
  const nextTier = SHOP_TIERS.find((t) => t > s.fans);
  const cheapest = Math.min(...G.shopStock(s).map((k) => G.itemPrice(s, k)));
  if (s.saleDay === s.day) return "Clearance day! Thirty percent off everything, today only.";
  if (left.length && days === G.BOOK_WEEK) return `Fresh delivery this morning: ${left.map((k) => SKILLS[ITEMS[k].skill].name).join(", ")}. One copy each!`;
  if (!left.length && shelf.length) return `Skill books are all gone. Next delivery in ${days} day${days === 1 ? "" : "s"}.`;
  if (s.money < cheapest) return "Window shopping is free. Win a meet and come back!";
  if (left.length) return `${left.length} skill book${left.length === 1 ? "" : "s"} still on the shelf. New ones in ${days} day${days === 1 ? "" : "s"}.`;
  if (nextTier) return `Bring in ${nextTier.toLocaleString()} fans and I'll stock the good stuff.`;
  return ["Chalk, spikes, the lot. What'll it be?", "Mind the shot rack, it bites.", "Fresh sweatbands, still warm from the wash."][s.day % 3];
}
const shopkeeperBanner = (s) => `<div class="shopkeeper"><span class="medallion"><canvas width="64" height="64" data-shopkeeper class="portrait"></canvas></span><p class="speech"><b>${SHOPKEEPER.name} · ${SHOPKEEPER.role}</b>${esc(shopkeeperLine(s))}</p></div>`;
const SHOP_TABS = [["fuel"], ["implements"], ["wear"], ["books"], ["bag"]];
export function shop(s, view) {
  if (!G.systemUnlocked(s,"kit")) return lockedSystem(s,"kit");
  // The counter is split into aisles so each one fits on a screen or so.
  const tab = SHOP_TABS.some(([id]) => id === view.shopTab) ? view.shopTab : "fuel";
  const stock = G.shopStock(s);
  const nextTier = SHOP_TIERS.find((t) => t > s.fans);
  let body;
  if (tab === "books") body = bookShelfPanel(s);
  else if (tab !== "bag") {
    const groups = {
      fuel: [["Fuel & recovery", "Handed over at the side of the track.", (d) => d.kind === "use"]],
      implements: [
        ...EVENT_IDS.map(ev => [EVENTS[ev].name + " implements", "", d => d.slot === "implement" && d.event === ev]),
        ["General implements", "One per thrower. Swap any time from the kit bag.", d => d.slot === "implement" && !d.event],
      ],
      wear: [
        ["Throwing shoes & spikes", "", (d) => d.slot === "shoes"],
        ["Lucky charms", "", (d) => d.slot === "charm"],
      ],
    }[tab];
    body = `${s.saleDay === s.day ? `<div class="sale">Clearance day: 30% off everything!</div>` : ""}${groups
      .map(([name, sub, f]) => {
        const items = stock.filter((k) => f(ITEMS[k]));
        return items.length ? `<div class="card-title"><h2>${name}</h2></div>${sub ? `<p class="hint">${sub}</p>` : ""}<div class="item-grid">${items.map((k) => shopCard(s, k)).join("")}</div>` : "";
      })
      .join("")}${tab === "implements" ? `<p class="hint">Event implements only help in their own event; other events use club issue.</p>` : ""}<p class="hint">${nextTier ? "New stock arrives at " + nextTier.toLocaleString() + " fans (you have " + s.fans.toLocaleString() + ")." : "Full catalogue in stock."} The rarest gear can't be bought: win it at meets, from merchants and through goals.</p>`;
  } else {
    const ids = Object.keys(s.bag);
    const uses = ids.filter((k) => ITEMS[k].kind === "use"),
      gear = ids.filter((k) => ITEMS[k].kind === "gear"),
      books = ids.filter((k) => ITEMS[k].kind === "book");
    const worn = s.roster.flatMap((a) => GEAR_SLOTS.map((slot) => a.gear[slot] && [a.gear[slot], a]).filter(Boolean));
    body = `${ids.length ? "" : "<p class='hint'>The kit bag is empty.</p>"}
    ${uses.length ? `<div class="card-title"><h2>Fuel & recovery</h2></div><div class="item-grid">${uses.map((k) => itemCard(s, k, "use")).join("")}</div>` : ""}
    ${books.length ? `<div class="card-title"><h2>Skill books</h2></div><p class="hint">Read a book from an athlete's Skills tab.</p><div class="item-grid">${books.map((k) => `<div class="item-card rarity-${ITEMS[k].rarity}">${icon(k)}<span><strong>${ITEMS[k].name} ×${s.bag[k]}</strong><small>${esc(bookNeeds(k))}</small></span></div>`).join("")}</div>` : ""}
    ${gear.length ? `<div class="card-title"><h2>Spare gear</h2></div><div class="item-grid">${gear.map((k) => itemCard(s, k, "equip")).join("")}</div>` : ""}
    ${worn.length ? `<div class="card-title"><h2>Being worn</h2></div>${worn.map(([k, a]) => `<div class="history"><span>${esc(ITEMS[k].name)}${s.forge[k] ? " +" + s.forge[k] : ""}</span><b>${esc(a.name)}</b></div>`).join("")}` : ""}
    ${G.facilityLevel(s, "workshop") ? `<div class="card-title"><h2>Kit Workshop · forging</h2></div><p class="hint">Each forge level adds +0.6% distance to every copy of that item.</p><div class="item-grid">${[...new Set([...gear, ...worn.map(([k]) => k)])].map((k) => `<div class="item-card rarity-${ITEMS[k].rarity}">${icon(k)}<span><strong>${ITEMS[k].name}${s.forge[k] ? " +" + s.forge[k] : ""}</strong><small>Next: +${(s.forge[k] || 0) + 1}</small></span>${btn("Forge · " + cash(G.forgeCost(s, k)), "forge", `data-item="${k}" ${s.money < G.forgeCost(s, k) ? "disabled" : ""}`, "subtle small")}</div>`).join("")}</div>` : `<p class="hint">Build a Kit Workshop to forge your gear.</p>`}`;
  }
  const count = (f) => stock.filter((k) => f(ITEMS[k])).length;
  const labels = { fuel: "Fuel · " + count((d) => d.kind === "use"), implements: "Implements · " + count((d) => d.slot === "implement"), wear: "Shoes & charms · " + count((d) => d.slot === "shoes" || d.slot === "charm"), books: "Books · " + G.bookShelf(s).filter((k) => !G.bookSold(s, k)).length, bag: "Kit bag · " + Object.values(s.bag).reduce((n, v) => n + v, 0) };
  return `${shopkeeperBanner(s)}<nav class="tabs shop-tabs">${SHOP_TABS.map(([id]) => `<button data-act="shop-tab" data-tab="${id}" class="${tab === id ? "active" : ""}" aria-pressed="${tab === id}">${labels[id]}</button>`).join("")}</nav>${body}`;
}
// One-line effect label: stat items get a coloured stat pill so they read at a glance.
function effectLine(d) {
  return d.stat ? `<span class="gain" style="--c:${STAT_COLORS[d.stat[0]]}">${STAT_NAMES[d.stat[0]]} +${d.stat[1]}</span>` : "";
}
function shopCard(s, k) {
  const d = ITEMS[k],
    price = G.itemPrice(s, k),
    poor = s.money < price,
    owned = G.ownedCount(s, k);
  const priceTag = `${price < d.price ? `<s>${cash(d.price)}</s> ` : ""}${cash(price)}`;
  const actions =
    d.kind === "use"
      ? btn((d.team ? "Buy & serve · " : "Buy & use · ") + priceTag, "buy-use", `data-item="${k}" ${poor ? "disabled" : ""}`, "small") + btn("Stock 1", "buy", `data-item="${k}" ${poor ? "disabled" : ""}`, "subtle small")
      : btn("Buy · " + priceTag, "buy-gear", `data-item="${k}" ${poor ? "disabled" : ""}`, "small");
  return `<div class="item-card shop-item rarity-${d.rarity}">${icon(k, 40)}<span><strong>${d.name}</strong><small>${effectLine(d) || esc(d.desc)}</small><span class="owned">${chip(RARITY[d.rarity].name, RARITY[d.rarity].color, "rarity")}${owned ? " Have " + owned : ""}</span></span><span class="buy-actions">${actions}</span></div>`;
}
function itemCard(s, k, mode) {
  const d = ITEMS[k];
  const action = mode === "use" ? btn(d.team ? "Serve the squad" : "Use…", "use", `data-item="${k}"`, "small") : btn("Equip…", "equip", `data-item="${k}"`, "subtle small");
  return `<div class="item-card rarity-${d.rarity}">${icon(k)}<span><strong>${d.name} ×${s.bag[k]}</strong><small>${effectLine(d) || esc(d.desc)}</small></span>${action}</div>`;
}

// The technique an athlete throws with, and what unlocks the next one (mastery and Technique).
function formLine(a, ev) {
  const level = G.formOf(a, ev), next = G.FORM_STEPS[level + 1];
  return `<small class="form-line">Form: <b>${esc(G.FORMS[ev][level])}</b>${next ? ` · ${esc(G.FORMS[ev][level + 1])} at form ${next} (now ${Math.floor(G.formScore(a, ev))}: average of Technique and mastery)` : " · top form"}</small>`;
}
function masteryCard(s,a) {
  return `<section class="card"><h3>Event mastery</h3><p>${G.PROFILES[a.profile].name}: ${G.PROFILES[a.profile].desc}</p><label>Technical training event<select data-change="training-event" data-id="${a.id}">${EVENT_IDS.map(ev=>`<option value="${ev}" ${(a.trainingEvent||a.event)===ev?"selected":""}>${EVENTS[ev].name}</option>`).join("")}</select></label><p>Physical attributes transfer. Technique practice builds mastery in the selected event; competing raises its practice ceiling, even after a loss.</p>${EVENT_IDS.map(ev=>`<div class="goal"><div><strong>${EVENTS[ev].name}</strong><small>Mastery ${Math.floor(G.masteryOf(a,ev))} · practice ceiling ${G.masteryCap(a,ev)} · ${a.eventMeets[ev]} meets</small>${bar(G.masteryOf(a,ev),100,EVENTS[ev].color)}${formLine(a,ev)}</div></div>`).join("")}</section>`;
}
function targetText(t) {
  if(!t)return "No scoring place to chase; bank a mark or protect the lead.";
  if(t.legal)return "Establish a legal mark to join the scoring.";
  return `Target ${mark(t.mark)}${t.delta!=null?" (+"+t.delta.toFixed(2)+" m)":""} for place ${t.place}${t.qualification?" and the final places":""}${t.swing>0?" · team-point swing +"+t.swing:""}.`;
}
function developmentCard(a, all = false) {
  const earned = a.development?.claimed || [];
  const upcoming = G.DEVELOPMENT.filter((d) => !earned.includes(d.id));
  const list = all ? G.DEVELOPMENT : upcoming.slice(0, 2);
  const labels = { meets: "meets", clean: "valid throws", pbs: "personal bests", wins: "event wins" };
  return `<section class="card development-card"><div class="card-title"><h3>A career built here</h3><small>${earned.length} / ${G.DEVELOPMENT.length}</small></div>
  ${list.map((d) => `<div class="goal ${earned.includes(d.id) ? "done" : ""}"><div><strong>${earned.includes(d.id) ? "✓ " : ""}${d.name}</strong><small>${G.developmentProgress(a, d)} / ${d.target} ${labels[d.field]}</small>${bar(G.developmentProgress(a, d), d.target, "#8cc152")}</div><span class="reward">${d.reward}</span></div>`).join("") || "<p>A club great. Every milestone earned.</p>"}<p class="hint">Milestones are awarded automatically through competition.</p></section>`;
}
// The rare invitation, pinned above the regular circuit while it's open.
function invitationCard(s) {
  const o = G.invitation(s);
  if (!o) return "";
  const accepted = s.competition?.kind === "cup",
    problem = G.invitationProblem(s),
    days = o.day - s.day,
    p = ITEMS[o.prize];
  return `<section class="card invitation-card"><span class="eyebrow">${ico("star")} RARE INVITATION · ${esc(LEAGUES[o.tier].name.toUpperCase())}</span><h2>${esc(o.name)}</h2>
    <p>${esc(G.longDate(o.day))} at <b>${esc(o.venue)}</b>${days > 0 ? " · in " + days + (days === 1 ? " day" : " days") : " · today"}. One day, championship format: three throws, then three more for the top four. You face the <b>All-Star Select</b>, the best specialist in each event from every club at this level.</p>
    <div class="invite-prize">${icon(o.prize, 40)}<span><small>WINNER'S PRIZE · NOT SOLD IN SHOPS</small><strong>${esc(p.name)}</strong><em>${esc(RARITY[p.rarity].name)} · ${esc(p.desc)}</em></span></div>
    ${accepted ? `<p class="booking-summary">Accepted. ${days > 0 ? "Train up and report on " + esc(G.shortDate(o.day)) + "." : "Report to the call room."}</p>${btn("Withdraw", "cancel-booking", s.day < s.matchDay ? "" : "disabled", "subtle")}` : `${btn(ico("star") + " Accept invitation", "accept-invite", problem ? "disabled" : "")}${problem ? `<p class="hint">${esc(problem)} The invitation lapses after ${esc(G.shortDate(o.day))}.</p>` : `<p class="hint">Every finisher takes home a rare-or-better keepsake.</p>`}`}
  </section>`;
}
function championshipStandards(s) {
  return `<details class="card" open><summary>Championship entry standards</summary><p>Earn these marks in this league’s duels. Training forecasts and lifetime PBs do not qualify.</p><table><thead><tr><th>Event</th><th>Minimum</th><th>Your best</th></tr></thead><tbody>${EVENT_IDS.map(ev=>`<tr><td>${EVENTS[ev].name}</td><td>${mark(G.qualifyingStandard(s,ev))}</td><td>${mark(Math.max(0,...s.roster.map(a=>G.qualifyingMark(s,a.id,ev))))}</td></tr>`).join("")}</tbody></table></details>`;
}
export const SCOREBOARD_LIMIT = 10;
// ── How meets work ─────────────────────────────────────────────────────
// The full guide, opened from the meet toolbar, the call room and How to play. It follows the
// meet in progress where that changes the rules (championship scoring, finals).
export function meetGuide(s) {
  const m = s?.match, champs = !!m?.prelimFinals || !!m?.leagueChampionship;
  const swatch = (c, dashed) => `<i class="guide-line${dashed ? " dashed" : ""}" style="--c:${c}"></i>`;
  return `<div class="meet-guide">
  <section><h3>The score</h3><ol class="howto">
    <li>A meet is <b>four events</b>: shot put, discus, hammer and javelin.</li>
    <li>Each thrower gets <b>three throws</b>. Only their <b>best legal throw</b> counts.</li>
    <li>${champs ? "Places score <b>10–8–6–5–4–3–2–1</b> points. After three throws the <b>top six</b> get three more; all marks carry forward." : "Places score <b>5–3–1</b> points for the club. Lower places score nothing."}</li>
    <li>Event points add up to the <b>meet score</b> at the top. Most points after four events wins.</li>
  </ol><p class="hint">While an event is running its points are <b>provisional</b>: what each club would score if it ended now. Equal bests go to the next-best throw.</p></section>
  <section><h3>Reading the field</h3><ul class="guide-legend">
    <li>${swatch("#f2c94c")}<span><b>LEAD</b> · the mark to beat</span></li>
    <li>${swatch("#ffe69a")}<span><b>TARGET</b> · what your thrower needs for a better place</span></li>
    <li>${swatch("#9fe0ff", true)}<span><b>PB</b> · your thrower's personal best</span></li>
    <li>${swatch("#8fe08a", true)}<span><b>STANDARD</b> · in league duels, the mark that qualifies for the league championship</span></li>
    <li>${swatch("#ffad5f")}<span><b>FINAL CUT</b> · in championships, the mark to beat to stay in the top ${champs ? 6 : "places"} for the final throws</span></li>
    <li>${swatch("#d8b0ff", true)}<span><b>CLUB REC</b> · your club record</span></li>
    <li><i class="guide-peg"></i><span><b>Pegs</b> · everyone else's best, numbered by place</span></li>
    <li><i class="guide-x">X</i><span><b>Foul</b> · stepped out, or landed outside the sector lines. It scores nothing, but an earlier legal mark still counts. <b>NM</b> means no mark yet.</span></li>
  </ul></section>
  <section><h3>The scoreboard</h3><ul class="guide-legend">
    <li><i class="badge pb">PB</i><span>a personal best for one of your athletes today</span></li>
    <li><i class="badge q new">Q</i><span>reached the championship standard today (outlined if it was reached in an earlier duel)</span></li>
    <li><span class="guide-cut">FINAL CUT</span><span>everyone above the orange line is in the final; after the cut the rest are <b>OUT</b></span></li>
  </ul><p class="hint">Under the thrower, the goals they are chasing (PB, standard, final cut) fill in with a tick once done.</p></section>
  <section><h3>Watch or Coach</h3><ul class="howto">
    <li><b>Watch</b>: your athletes pick their own tactics. ${s && !G.firstMeet(s) ? "You still get a call at clutch moments, when a last throw decides a place (switch this off in Settings)." : "From your second meet you'll also get a call at clutch moments."}</li>
    <li><b>Coach</b>: you choose a tactic before every throw.<ul>
      <li><b>${TACTICS.safe.name}</b> · shortest but almost never fouls. Use it to get a first mark on the board.</li>
      <li><b>${TACTICS.balanced.name}</b> · the usual range and risk.</li>
      <li><b>${TACTICS.attack.name}</b> · a little further on average with a wider spread, but fouls far more often and costs stamina. Best once a mark is banked.</li></ul></li>
  </ul></section>
  <section><h3>What changes a throw</h3><ul class="howto">
    <li><b>The athlete</b>: their event rating (stats and event mastery), mood and stamina. Tired or unhappy athletes throw shorter.</li>
    <li><b>Weather</b>: a wet circle raises foul risk; cold implements cost about 1.5%; heat drains stamina faster.</li>
    <li><b>Wind</b> (the windsock): matters in the discus. A headwind gives the disc a little lift; a crosswind costs a little distance.</li>
    <li><b>Skills</b> can fire during a throw. On the big moments a cut-in names the skill.</li>
  </ul></section>
  <section><h3>Pace</h3><p>One, two or three arrows play the meet at normal, fast or very fast. <b>Highlights</b> lingers on the big moments; <b>Every throw</b> gives each result the same time. Pause any time. Decisions always wait for you.</p></section>
  </div>`;
}
// One-time pointers during a club's first meets, keyed by the moment they explain.
export const MEET_TIPS = {
  start: ["How a meet works", "Four events, three throws each. Only a thrower's best legal throw counts. Places score 5–3–1, and event points add up to the meet score at the top."],
  champs: ["Championship scoring", "Places score 10–8–6–5–4–3–2–1. After three throws the top six get three more."],
  field: ["Reading the field", "The gold line is the lead to beat. A dashed blue line is the thrower's PB, and pegs mark everyone else's best."],
  foul: ["Foul", "X means a foul: no mark for that throw. An earlier legal mark still counts."],
  eventEnd: ["Event over", "The event's points are now in the meet score. Most points after four events wins."],
  clutch: ["Clutch moment", "A last throw that decides a place. You make the call even in Watch mode."],
  skill: ["Skill!", "An equipped skill fired. Learn and equip skills in the athlete file."],
};
export function meetTip(id) {
  const [title, body] = MEET_TIPS[id];
  return `<div><b>${esc(title)}</b><span>${esc(body)}</span></div><div class="meet-tip-actions"><button data-act="meet-guide">How meets work</button><button data-act="tip-ok">Got it</button></div>`;
}

export function leagueTutorial() {
  return `<details class="card league-tutorial"><summary>How league qualification and finals work</summary><ol><li>Compete in <b>three league duels</b>, with three throws per athlete.</li><li>Earn the event's <b>minimum qualifying mark</b> in those duels. Open <b>Meets → Qualification</b> to see standards, marks and qualified athletes.</li><li>At the multi-club championship, every qualified entry gets <b>three preliminary throws</b>. The <b>top six</b> earn three more in the final; all marks carry forward.</li></ol><p>The scoreboard shows the top ten. Countback settles equal best throws; an exact tie at the final cut advances together. Set the pace with one, two or three arrows: normal, fast or very fast. Coaching decisions always wait for you.</p></details>`;
}
export function qualifications(s, view = {}, event = null) {
  if (!G.championshipBooking(s)) return `<article class="card"><h2>Championship qualification</h2><p>Enter a league to earn qualifying marks in its three duels.</p></article>${leagueTutorial()}`;
  const events=event ? [event] : EVENT_IDS;
  return `<section class="qualification-board"><div class="card-title"><h2>Championship qualification</h2></div>${event ? "" : `<p>Earn these standards in this league's duels. Recorded league marks count; training forecasts and lifetime PBs do not.</p>`}${events.map(ev=>`<article class="card qualification-event"><header><h3>${EVENTS[ev].name}</h3><span>Standard <b>${mark(G.qualifyingStandard(s,ev))}</b></span></header><div class="qualification-rows">${G.qualificationProgress(s,ev,view.hide).map(row=>`<div class="qualification-row ${row.qualified ? "qualified" : ""}"><strong>${esc(row.name)}</strong><b>${row.mark ? mark(row.mark) : "No league mark"}</b><span class="qualification-status">${row.qualified ? "✓ Qualified" : row.mark ? (row.standard-row.mark).toFixed(2)+" m to qualify" : "Not qualified yet"}</span></div>`).join("")}</div></article>`).join("")}</section>`;
}

function competitionBoard(s, view) {
  if (G.firstMeet(s)) return `${introductionCard(s)}${btn(s.competition ? "Back to your first duel" : "Start your first duel", "first-duel")}`;
  const planning = s.phase === "planning";
  const active = s.competition;
  // What to enter comes first; how it works and the scheduling options sit at the bottom.
  const foot = `<div class="circuit-foot"><details class="circuit-help"><summary>How the circuit works</summary><p>Duels are single meets. Leagues draw three opponents from six division clubs, with three duels followed by a league championship. Qualified throwers from every division club take three preliminary attempts; the top six earn three final throws, with all marks retained. Draws change across stages and seasons. Win Open, Challenger, then Championship to earn the next level's invitation.</p><p>County leagues and duels are free; higher leagues charge an entry fee. Training carries on between meets (so do wages and upkeep), and every earlier competition stays open.</p></details>
    <details class="calendar-options-wrap"><summary>Schedule options</summary><div class="calendar-options"><label>Prepare before the first meet<select data-change="booking-preparation" ${planning ? "" : "disabled"}>${[3,5,7,10].map((n) => `<option value="${n}" ${(view.preparation || 5) === n ? "selected" : ""}>${n} days</option>`).join("")}</select></label><label>Days between league meets<select data-change="booking-spacing" ${planning ? "" : "disabled"}>${[4,7,10].map((n) => `<option value="${n}" ${(view.spacing || 7) === n ? "selected" : ""}>${n} days</option>`).join("")}</select></label></div></details></div>`;
  const board = `${G.championshipBooking(s) ? championshipStandards(s) : ""}${invitationCard(s)}${active ? `<section class="card booking-card"><p class="booking-summary"><b>${esc(G.competitionName(s))}</b> · ${s.phase === "seasonEnd" ? "Complete — review your season to book again." : "Next meet: " + esc(G.shortDate(s.matchDay)) + (active.kind === "league" ? " · " + active.spacing + " days between fixtures" : "")}</p><div class="inline">${btn(s.phase === "seasonEnd" ? "Season review" : "Back to preparations", "page", 'data-page="home"', "subtle small")}${s.fixture === 0 && !s.results.length && s.day < s.matchDay ? btn("Cancel booking", "cancel-booking", "", "subtle small") : ""}</div></section>` : ""}
  ${LEAGUES.map((tier, i) => i > s.league + 1 ? "" : i === s.league + 1 ? `<p class="hint next-tier">${ico("lock")} Next: <b>${tier.name}</b>. Win the ${LEAGUES[i - 1].name} Championship for the invitation.</p>` : `<details class="card circuit-tier" ${i === s.league ? "open" : ""}><summary>${tier.name} <span>${i > s.league ? "Invitation locked" : s.circuit.cleared.filter((k) => k.startsWith(i + ":")).length + " / 3 trophies"}</span></summary>
    ${i > s.league ? `<p>Win the ${LEAGUES[i - 1].name} Championship to earn this invitation. ${esc(LEAGUES[i].unlock)}</p>` : `<div class="competition-grid">${G.CIRCUIT_STAGES.map((stage, j) => {
      const problem = G.entryProblem(s, "league", i, j), cleared = s.circuit.cleared.includes(G.circuitKey(i, j));
      return `<article class="competition-card ${cleared ? "completed" : ""}">${cleared ? `<span class="eyebrow">TROPHY WON · REPLAYABLE</span>` : ""}<h3>${stage}</h3><p>${G.CIRCUIT_FORMATS[j]}</p><small>${cleared ? "" : `${ico("gift")} ${ITEMS[G.TITLE_GIFTS[j]].name} · `}${j < 2 ? "unlocks " + G.CIRCUIT_STAGES[j + 1] : i < 4 ? "unlocks " + LEAGUES[i + 1].name : "Become champions of the world"}</small>${btn((cleared ? "Enter again" : "Enter league") + (G.entryFee("league", i) ? " · " + cash(G.entryFee("league", i)) : ""), "book-league", `data-tier="${i}" data-stage="${j}" ${problem ? "disabled" : ""}`)}${problem && planning ? `<p class="hint">${esc(problem)}</p>` : ""}</article>`;
    }).join("")}</div><h3>Duel meets</h3><p class="hint">${ico("gift")} A first win over a club earns a bonus and a skill scroll.</p><div class="duel-list">${CLUBS[i].map((c, j) => `<article class="duel-card"><span><strong>${esc(c.name)}${s.circuit.duels.includes(i + ":" + j) ? "" : ` <em class="first-win" title="First-win reward available">${ico("gift")}</em>`}</strong><small>${esc(c.style)}</small></span>${btn("Book duel", "book-duel", `data-tier="${i}" data-rival="${j}" ${G.entryProblem(s, "duel", i, 0, j) ? "disabled" : ""}`, "subtle")}</article>`).join("")}</div>`}</details>`).join("")}${foot}`;
  if (s.onboarding && G.nextIntroduction(s) && planning) {
    const next = G.nextCircuitEntry(s), problem = G.entryProblem(s,"league",next.tier,next.stage);
    return `<article class="card"><span class="eyebrow">NEXT CHALLENGE</span><h2>${esc(LEAGUES[next.tier].name)} · ${G.CIRCUIT_STAGES[next.stage]}</h2><p>Three club duels, then a championship against the best throwers in the division. Keep learning one system after each meet.</p>${leagueTutorial()}${btn("Enter league", "book-league", `data-tier="${next.tier}" data-stage="${next.stage}" ${problem ? "disabled" : ""}`)}${problem ? `<p class="hint">${esc(problem)}</p>` : ""}</article><details class="card"><summary>Other meets and schedule options</summary>${board}</details>`;
  }
  return board;
}

// ── Calendar ────────────────────────────────────────────────────────────
export const weatherChip = (w) => `<span class="weather-chip w-${w}">${ico(G.WEATHER[w].icon)}${esc(G.WEATHER[w].name)}</span>`;
// Everything that falls on a given day: meets, invitations and paydays.
function dayMarks(s, day, meets) {
  const out = [];
  for (const m of meets) if (m.day === day) out.push({ icon: "league", cls: "meet", text: m.label + (m.rival ? " vs " + m.rival : "") + (m.projected ? " · projected" : "") });
  const inv = s.invitations?.offer;
  if (inv && inv.day === day) out.push({ icon: "star", cls: "cup", text: inv.name + (s.competition?.kind === "cup" ? " · accepted" : " · invitation") });
  if (G.isPayday(day)) out.push({ icon: "coin", cls: "pay", text: "Payday" });
  return out;
}
export function calendar(s) {
  const today = G.dateOf(s.day),
    w = G.weatherToday(s),
    meets = G.upcomingMeets(s),
    start = s.day - today.weekday,
    forecast = G.forecastDays(s),
    known = new Map(forecast.map((f) => [f.day, f.weather]));
  const cells = Array.from({ length: 28 }, (_, i) => {
    const day = start + i,
      t = G.dateOf(day),
      marks = day >= 1 ? dayMarks(s, day, meets) : [],
      past = day < s.day;
    return `<div class="cal-day ${day === s.day ? "today" : ""} ${past ? "past" : ""} ${marks.some((m) => m.cls === "meet") ? "has-meet" : ""} ${marks.some((m) => m.cls === "cup") ? "has-cup" : ""}" title="${esc(G.longDate(day))}${marks.map((m) => " · " + esc(m.text)).join("")}">
      <span class="num">${t.date === 1 || i === 0 ? G.MONTHS[t.month].slice(0, 3) + " " : ""}${t.date}</span>
      ${known.has(day) ? ico(G.WEATHER[known.get(day)].icon, "cal-weather") : ""}
      <span class="marks">${marks.map((m) => ico(m.icon, m.cls)).join("")}</span></div>`;
  }).join("");
  const ahead = [];
  for (let day = s.day; day < s.day + 28; day++) for (const m of dayMarks(s, day, meets)) if (m.cls !== "pay") ahead.push({ day, ...m });
  return `<section class="card cal-today"><div><span class="eyebrow">${esc(G.SEASON_NAMES[today.season].toUpperCase())} · YEAR ${today.year}</span><h2>${esc(G.longDate(s.day))}</h2><p>${esc(G.WEATHER[w].desc)}</p></div>${weatherChip(w)}</section>
  <div class="card-title"><h2>${ico("sun")} Seven-day forecast</h2></div>
  <div class="forecast">${forecast.map((f) => {
    const meet = dayMarks(s, f.day, meets).find((m) => m.cls !== "pay");
    return `<div class="fc ${f.day === s.day ? "today" : ""} ${meet ? "meet" : ""}"><small>${f.day === s.day ? "Today" : G.WEEKDAYS[G.dateOf(f.day).weekday]}</small>${ico(G.WEATHER[f.weather].icon)}<b>${esc(G.WEATHER[f.weather].name)}</b>${meet ? `<em>${ico(meet.icon)} ${meet.cls === "cup" ? "Invitational" : "Meet"}</em>` : ""}</div>`;
  }).join("")}</div>
  <p class="hint">Rain and snow slow outdoor work (laps, sprints, throwing) but not the gym or film room. Meet-day weather sets the conditions in the circle.</p>
  <div class="card-title"><h2>${ico("calendar")} Next four weeks</h2></div>
  <div class="cal-grid">${G.WEEKDAYS.map((d) => `<span class="cal-head">${d}</span>`).join("")}${cells}</div>
  <div class="cal-legend"><span>${ico("league")} Meet</span><span>${ico("star")} Invitational</span><span>${ico("coin")} Payday</span></div>
  <section class="card"><h3>Coming up</h3>${ahead.length ? ahead.map((m) => `<p class="cal-item ${m.cls}">${ico(m.icon)} <b>${esc(G.shortDate(m.day))}</b> · ${esc(m.text)}${known.has(m.day) ? " · " + esc(G.WEATHER[known.get(m.day)].name) : ""}</p>`).join("") : `<p class="hint">Nothing booked. ${s.phase === "planning" ? "Open the Meets board to book a duel or a league." : ""}</p>`}</section>`;
}

// ── League ──────────────────────────────────────────────────────────────
const MEET_TABS = [["compete", "Compete"], ["qualification", "Qualification"], ["rivals", "Rivals"], ["records", "Records & trophies"]];
export function league(s, view) {
  const tab = pageTab(view, "league", MEET_TABS),
    tabs = pageTabs("league", MEET_TABS, tab);
  if (tab === "compete") return tabs + competitionBoard(s, view);
  if (tab === "qualification") return tabs + qualifications(s, view) + leagueTutorial();
  if (tab === "records") return tabs + leagueRecords(s);
  return `${tabs}<div class="journey">${LEAGUES.map((l, i) => `<div class="${i === s.league ? "current" : i < s.league ? "passed" : ""}"><span>${i < s.league ? ico("check") : i + 1}</span><small>${l.name.replace(" League", "")}</small></div>`).join("")}</div>
  ${s.competition?.kind === "league" ? `<h3>${esc(G.competitionName(s))} standings</h3><div class="table-wrap"><table><thead><tr><th>Club</th><th>P</th><th>+/−</th><th>Pts</th></tr></thead><tbody>${G.table(s).map((c, i) => `<tr class="${c.id === "us" ? "us" : ""}"><td><span class="pos">${i + 1}</span><i class="dot" style="--c:${c.id === "us" ? s.colors.primary : c.color}"></i>${esc(c.name)}</td><td>${c.played}</td><td>${c.diff > 0 ? "+" : ""}${c.diff}</td><td><b>${c.points}</b></td></tr>`).join("")}</tbody></table></div>
  <p class="hint">Three club duels build the league standings. The last meet is the league championship: entry standards are earned in the duels; the top six after three attempts earn three more. Individual places earn points for their own club.</p>` : ""}
  <div class="card-title"><h2>Scouted rivals</h2></div>
  ${s.clubs
    .map((c, ci) => {
      const r = s.results.find((x) => x.kind === "league" && x.name === c.name);
      const open = view.rival === c.id;
      return `<div class="rival ${open ? "open" : ""}" style="--c:${c.color}"><button class="rival-head" data-act="rival" data-id="${c.id}"><span class="crest" style="--rival:${c.color}">${esc(c.name[0])}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.style)}</small></span><b>${r ? (r.win ? "W " : r.draw ? "D " : "L ") + r.score + "–" + r.against : ci === s.fixture ? "NEXT" : ci < s.fixture ? "—" : "Fixture " + (ci + 1)}</b></button>
      ${open ? `<div class="rival-squad">${c.athletes.map((a, i) => `<div class="rival-athlete">${rivalPortrait(c.id, i)}<span><strong>${esc(a.name)}${nationTag(a)}</strong><small>${EVENTS[a.event].name} · ~${mark(G.rawMark(a, a.event))}</small>${a.elite ? `<small class="elite-line">${esc(ELITES.find((e) => e.id === a.elite)?.blurb || "")}</small>` : ""}<small>${a.skills.map((k) => SKILLS[k].name).join(" · ") || "No skills"} · ${esc(G.PROFILES[a.profile].name)} · mastery ${Math.floor(G.masteryOf(a,a.event))} · ${Object.values(a.gear).filter(Boolean).map(k=>ITEMS[k].name).join(" / ")}</small></span>${ovrBadge(a)}</div>`).join("")}</div>` : ""}</div>`;
    })
    .join("")}`;
}
function leagueRecords(s) {
  return `${worldBoard(s)}<div class="card-title"><h2>Club records</h2></div><div class="records">${EVENT_IDS.map((ev) => `<span>${EVENTS[ev].name}<b>${s.records[ev] ? mark(s.records[ev].mark) : "—"}</b><small>${s.records[ev] ? esc(s.records[ev].name) + " · S" + s.records[ev].season : ""}</small><small class="${s.worldRecords?.[ev] ? "wr-ours" : ""}">World record ${G.worldRecord(s, ev).toFixed(2)}${s.worldRecords?.[ev] ? " · " + esc(s.worldRecords[ev].name) : ""}</small></span>`).join("")}</div>
  <div class="card-title"><h2>${ico("trophy")} Trophy cabinet</h2></div><div class="trophies">${s.trophies.length || s.invitations?.won.length ? s.trophies.map((t) => `<div>${ico("trophy", "big")}<strong>${LEAGUES[t.league].name} · ${G.CIRCUIT_STAGES[t.stage ?? 2]}</strong><small>Season ${t.season}</small></div>`).join("") + (s.invitations?.won || []).map((t) => `<div class="invite-trophy">${ico("star", "big")}<strong>${esc(t.name)}</strong><small>${LEAGUES[t.tier].name} · ${esc(G.shortDate(t.day))}</small></div>`).join("") : "<p class='hint'>A space is waiting for the first one.</p>"}</div>`;
}

// ── Office ──────────────────────────────────────────────────────────────
// Kit and stadium customisation: a swatch per option, its unlock or price, and a name for the ground.
function swatch(s, cat, key) {
  const p = s.colors.primary,
    t = s.colors.secondary;
  if (cat === "kit")
    return { plain: p, stripes: `repeating-linear-gradient(90deg, ${p} 0 4px, ${t} 4px 8px)`, hoops: `repeating-linear-gradient(0deg, ${p} 0 5px, ${t} 5px 10px)`, sash: `linear-gradient(135deg, ${p} 38%, ${t} 38% 62%, ${p} 62%)`, halves: `linear-gradient(90deg, ${p} 50%, ${t} 50%)` }[key];
  if (cat === "shorts") return key === "dark" ? "#2a3a32" : key === "trim" ? t : SHORTS_COLORS[key];
  if (cat === "seats") return { solid: p, stripes: `repeating-linear-gradient(0deg, ${p} 0 4px, ${t} 4px 8px)`, twotone: `linear-gradient(0deg, ${p} 50%, ${t} 50%)`, blocks: `repeating-linear-gradient(90deg, ${p} 0 8px, ${t} 8px 16px)` }[key];
  if (cat === "roof") return roofColorOf({ ...s, stadiumStyle: { ...s.stadiumStyle, roof: key } });
  if (cat === "facade")
    return { auto: "repeating-linear-gradient(45deg, #dcdcd6 0 4px, #a8aeb4 4px 5px)", brick: "repeating-linear-gradient(0deg, #a8503a 0 4px, #c8b8a0 4px 5px)", glass: "linear-gradient(135deg, #6a96bc 40%, #cfe4f2 40% 55%, #527ea4 55%)", timber: "repeating-linear-gradient(90deg, #8a5a34 0 2px, #b47a48 2px 4px, #a06c3e 4px 6px)", club: `repeating-linear-gradient(90deg, ${p} 0 8px, ${t} 8px 16px)` }[key];
  if (cat === "standStyle")
    return { classic: `repeating-linear-gradient(0deg, ${p} 0 4px, #3a4a4a 4px 6px)`, terrace: "repeating-linear-gradient(0deg, #c8c4b8 0 4px, #8a8e92 4px 5px)", timber: "repeating-linear-gradient(0deg, #b47a48 0 4px, #6a4428 4px 6px)", cantilever: `linear-gradient(170deg, #e8eef2 28%, ${p} 28% 34%, #6a96bc 34%)` }[key];
  if (cat === "backdrop")
    return { town: "linear-gradient(0deg, #6a9454 30%, #d8c8a8 30% 55%, #a8503a 55% 62%, #8ccbe8 62%)", trees: "linear-gradient(0deg, #6a9454 30%, #3e7a3a 30% 62%, #8ccbe8 62%)", hills: "linear-gradient(0deg, #6a9454 35%, #7aa060 35% 60%, #8ccbe8 60%)", sea: "linear-gradient(0deg, #6a9454 30%, #4a8ab8 30% 48%, #8ccbe8 48%)", mountains: "linear-gradient(0deg, #6a9454 30%, #8a96a8 30% 58%, #f4f6f8 58% 66%, #8ccbe8 66%)", city: "linear-gradient(0deg, #6a9454 30%, #5a6a7a 30% 70%, #8ccbe8 70%)" }[key];
  if (cat === "towerStyle") return { spiral: `repeating-linear-gradient(135deg, #2e3640 0 5px, #c8563e 5px 9px)`, lattice: "repeating-linear-gradient(45deg, #dfe4e8 0 3px, #5a6066 3px 4px)", clock: "radial-gradient(circle, #f4f0e4 0 35%, #d8d0c0 36%)" }[key];
  if (cat === "towerColors") {
    const c = towerColorsOf({ ...s, stadiumStyle: { ...s.stadiumStyle, towerColors: key } });
    return `linear-gradient(135deg, ${c[0]} 50%, ${c[1]} 50%)`;
  }
  return key === "auto" ? `linear-gradient(90deg, ${trackColorOf(2)} 50%, ${trackColorOf(3)} 50%)` : trackColorOf(2, key);
}
function lookCard(s) {
  const face = s.roster[0];
  return `<div class="card-title"><h2>${ico("star")} Kit & stadium</h2></div>
  <p class="hint">New looks unlock as the club grows. Buy one once, then switch between your looks for free.</p>
  ${face ? `<div class="look-preview">${portrait(face, "large")}<span><strong>${esc(face.name)}</strong><small>Home kit</small></span></div>` : ""}
  ${CUSTOM_IDS.map((cat) => `<h3 class="look-title">${CUSTOMISE[cat].name}</h3>${CUSTOMISE[cat].note ? `<p class="hint">${esc(CUSTOMISE[cat].note)}</p>` : ""}<div class="look-row">${Object.entries(CUSTOMISE[cat].options).map(([key, o]) => {
    const owned = G.ownsCustom(s, cat, key),
      used = G.selectedCustom(s, cat) === key,
      lock = G.customLock(s, cat, key),
      problem = G.customProblem(s, cat, key);
    return `<button class="look-opt ${used ? "selected" : ""} ${lock ? "locked" : ""}" data-act="${owned ? "use-look" : "buy-look"}" data-cat="${cat}" data-key="${key}" ${!owned && problem ? "disabled" : ""}><i class="sw" style="background:${swatch(s, cat, key)}"></i><strong>${esc(o.name)}</strong><small>${owned ? (used ? "In use" : "Owned") : lock ? ico("lock") + " " + esc(lock) : cash(o.cost)}</small></button>`;
  }).join("")}</div>`).join("")}
  <label class="stadium-name">Stadium name<input data-change="stadium-name" maxlength="24" placeholder="${esc(s.clubName)}" value="${esc(s.stadiumStyle.name)}"></label>`;
}
export function gameMenu(s, {page = "main", native = false} = {}) {
  const toggle = (key, label, help = "") => `<label class="toggle"><input type="checkbox" data-change="setting" data-key="${key}" ${s.settings[key] ? "checked" : ""}> ${label}${help ? `<small>${help}</small>` : ""}</label>`;
  const title = page === "saved" ? "Club saved" : page === "settings" ? "Settings" : "Game menu";
  return `<header class="game-menu-head"><div><small>RING & SECTOR</small><h1 id="gameMenuTitle">${title}</h1></div>${page !== "saved" ? '<button data-act="menu-close" aria-label="Close menu">×</button>' : ""}</header><div class="game-menu-body">
  ${page === "saved" ? `<div class="saved-club"><b>All progress saved.</b><p>${esc(s.clubName)} is ready for your next visit. You can safely close this tab.</p>${btn("Resume game", "menu-close")}</div>` : page === "settings" ? `
    <label>Screen orientation<select data-change="orientation" ${native ? "" : "disabled"}>${[["auto","Follow device"],["portrait","Portrait"],["landscape","Landscape"]].map(([id,name])=>`<option value="${id}" ${(s.settings.orientation||"auto")===id?"selected":""}>${name}</option>`).join("")}</select><small>${native ? "Follow device respects your phone’s rotation setting." : "In your browser, rotate the device or resize the window."}</small></label>
    <label>Default meet mode<select data-change="menu-meet-mode">${["watch","coach"].map(mode=>`<option value="${mode}" ${s.settings.meetMode===mode?"selected":""}>${mode==="watch"?"Watch":"Coach every throw"}</option>`).join("")}</select></label>
    ${toggle("quietMode", "Quiet notifications", "Keep routine rewards, levels and goals in the journal and panels. Coached sessions still play out.")}${toggle("highlights", "Meet highlights", "Emphasise big throws without speeding up 1×.")}${toggle("clutch", "Pause for clutch moments")}${toggle("manualRelease", "Manual release timing")}${toggle("sound", "Sound effects")}${toggle("reducedMotion", "Reduce motion")}
    ${btn("Back to menu", "game-menu", "", "subtle")}
  ` : `<p class="menu-club">${esc(s.clubName)} <span>Season ${s.season} · Day ${s.day}</span></p><div class="game-menu-actions">${btn("Resume game", "menu-close")}${btn("Settings", "menu-settings", "", "subtle")}${btn("Save game", "save-game", "", "subtle")}${btn("Main menu", "main-menu", "", "subtle")}${btn("Save & exit", "save-exit", "", "subtle")}</div><div class="game-menu-links">${btn("Export backup", "export", "", "text")}${btn("How to play", "menu-help", "", "text")}</div><p class="hint">Progress also saves automatically after each day and throw.</p>`}
  <p id="menuSaveStatus" role="status" aria-live="polite"></p></div>`;
}
// The update line shared by the main menu and the update badge: what is happening, a bar while
// downloading, and a restart button once an update is ready.
export function updateBlock(u, native) {
  if (!native) return `<p class="mm-update-line">${esc(u.status)}</p>`;
  const action = u.pending ? btn("Restart to install update", "install-update") : u.phase === "checking" || u.phase === "downloading" ? "" : btn("Check for updates", "check-update", "", "text");
  return `<p class="mm-update-line">${u.updated ? `<b>Updated to ${esc(u.updated.to)}.</b> ` : ""}${esc(u.status)}</p>${u.phase === "downloading" ? `<span class="mm-progress" role="progressbar" aria-valuenow="${u.percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${u.percent}%"></i><b>${u.percent}%</b></span>` : ""}${action}`;
}
const ago = (t) => {
  if (!t) return "";
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago";
};
// The title screen: continue the last club, play or start another slot, import a backup, and see
// whether an update is on its way.
export function mainMenu(slots, { active, update, native }) {
  const current = slots[active];
  const card = (sl, n) => {
    const here = n === active ? " active" : "";
    if (!sl) return `<div class="slot empty${here}"><span class="slot-n">${n + 1}</span><div><strong>Empty slot</strong><small>Start a new club here.</small></div><div class="slot-actions">${btn("New club", "mm-new", `data-slot="${n}"`, "subtle")}</div></div>`;
    if (sl.broken) return `<div class="slot broken${here}"><span class="slot-n">${n + 1}</span><div><strong>Unreadable save</strong><small>This slot could not be opened.</small></div><div class="slot-actions">${btn("Delete", "mm-delete", `data-slot="${n}"`, "text")}</div></div>`;
    return `<div class="slot${here}"><span class="crest" style="--p:${esc(sl.colors.primary)};--s:${esc(sl.colors.secondary)}">${esc(sl.clubName[0] || "?")}</span><div><strong>${esc(sl.clubName)}</strong><small>${esc(LEAGUES[sl.league]?.name || "")} · Season ${sl.season} · ${esc(G.shortDate(sl.day))}</small><small>${cash(sl.money)} · ${sl.fans.toLocaleString()} fans${sl.savedAt ? " · " + ago(sl.savedAt) : ""}</small></div><div class="slot-actions">${btn(n === active ? "Continue" : "Play", "mm-load", `data-slot="${n}"`, n === active ? "primary" : "subtle")}${btn("Delete", "mm-delete", `data-slot="${n}"`, "text")}</div></div>`;
  };
  const first = current && !current.broken ? btn(`Continue · ${esc(current.clubName)}`, "mm-load", `data-slot="${active}"`) : btn("Start a new club", "mm-new", `data-slot="${slots.findIndex((x) => !x) === -1 ? active : slots.findIndex((x) => !x)}"`);
  return `<header class="mm-head"><small>CLUB ATHLETICS</small><h1 id="mainMenuTitle">Ring &amp; Sector</h1></header>
  <div class="mm-body"><div class="mm-first">${first}</div>
  <h2 class="mm-section">Clubs</h2><div class="slots">${slots.map(card).join("")}</div>
  <div class="mm-links">${btn("Import club", "mm-import", "", "text")}${btn("Settings", "mm-settings", "", "text")}${btn("How to play", "mm-help", "", "text")}</div>
  <div class="mm-update" id="mmUpdate">${updateBlock(update, native)}</div>
  <p class="mm-version">Game ${esc(update.version)}</p></div>`;
}
const OFFICE_TABS = [["club", "Club"], ["looks", "Kit & stadium"], ["goals", "Goals"], ["history", "Hall of fame"], ["save", "Save & settings"]];
export function club(s, meta, view = {}) {
  if (!G.systemUnlocked(s,"office")) return lockedSystem(s,"office");
  const done = G.GOALS.filter((g) => s.goals.includes(g.id)).length,
    tab = pageTab(view, "club", OFFICE_TABS),
    tabs = pageTabs("club", OFFICE_TABS.map(([id, label]) => [id, id === "goals" ? `Goals · ${done}/${G.GOALS.length}` : label]), tab);
  if (tab === "looks") return tabs + lookCard(s);
  if (tab === "goals") return tabs + G.GOALS.map((g) => (s.goals.includes(g.id) ? `<div class="goal done"><div><strong>${ico("check")} ${esc(g.name)}</strong><small>${esc(g.desc)}</small></div><span class="reward">${esc(G.rewardText(g.reward))}</span></div>` : goalRow(s, g))).sort((x, y) => x.includes("goal done") - y.includes("goal done")).join("");
  if (tab === "history") return tabs + (s.awardHistory.length ? s.awardHistory.slice(0, 20).map((w) => `<div class="history"><span>Season ${w.season} · ${esc(w.award)}</span><b>${esc(w.name)}</b></div>`).join("") : "<p class='hint'>Season awards appear here.</p>") + (s.alumni.length ? `<div class="card-title"><h2>Alumni</h2></div>${s.alumni.map((a) => `<div class="history"><span>${esc(a.name)} · ${EVENTS[a.event].name}</span><b>${a.pb[a.event] ? mark(a.pb[a.event]) : "—"}</b></div>`).join("")}` : "");
  if (tab === "save") return `${tabs}${btn("Settings & saving", "game-menu", "", "subtle")}
  <div class="card-title"><h2>Save & transfer</h2></div><div class="inline">${btn("Export club", "export", "", "subtle")}${btn("Import club", "import", "", "subtle")}${btn("How to play", "help", "", "subtle")}</div>
  <p class="hint">Export before switching devices. Game ${esc(meta.version)} · ${esc(meta.status)}</p>
  <div class="inline">${btn("Check for updates", "check-update", "", "subtle")}${btn("Restart to install update", "install-update", meta.pending ? "" : "disabled", "subtle")}</div>`;
  return `${tabs}<form id="clubNameForm" class="name-form"><label>Club name<input maxlength="24" name="name" value="${esc(s.clubName)}" required></label><button class="button subtle" type="submit">Save</button></form>
  <div class="card-title"><h2>Club colours</h2></div><div class="palettes">${CLUB_PALETTES.map((p, i) => `<button class="palette ${s.colors.primary === p.primary && s.colors.secondary === p.secondary ? "selected" : ""}" data-act="palette" data-index="${i}" title="${p.name}"><i style="background:${p.primary}"></i><i style="background:${p.secondary}"></i></button>`).join("")}</div>
  <div class="card-title"><h2>Sponsor</h2>${s.sponsorLocked ? chip("Locked this season", "#9aa58f") : chip("Choose before the first meet", "#e2b04a")}</div>
  <div class="sponsors">${Object.entries(SPONSORS).map(([id, d]) => `<button class="sponsor ${s.sponsor === id ? "selected" : ""}" data-act="sponsor" data-value="${id}" ${s.sponsorLocked || s.fans < d.fans ? "disabled" : ""}><strong>${d.name}</strong><small>${d.desc}</small>${s.fans < d.fans ? `<em>${d.fans.toLocaleString()} fans</em>` : ""}</button>`).join("")}</div>
  <p class="hint">Weekly: sponsor and club ${cash(G.weeklyIncome(s))}, café and merch about ${cash(G.weeklyTakings(s))}, wages ${cash(G.wages(s))}, upkeep ${cash(G.upkeep(s))}. Wages and upkeep are paid every Sunday.</p>`;
}

// ── Meet lobby ──────────────────────────────────────────────────────────
// "Mara Kowal" → "Mara K." for tight pickers.
const shortName = (name) => name.replace(/^(\S+)\s+(\p{L}).*$/u, "$1 $2.");
function meetModes(s) {
  return `<div class="modes" aria-label="Meet mode">${["watch", "coach"].map(mode => `<button class="mode ${s.settings.meetMode === mode ? "selected" : ""}" data-act="meet-mode" data-value="${mode}" aria-pressed="${s.settings.meetMode === mode}"><strong>${ico(mode === "watch" ? "eye" : "clipboard")} ${mode === "watch" ? "Watch" : "Coach"}</strong><small>${mode === "watch" ? (!G.firstMeet(s) && s.settings.clutch ? "Athletes handle the throws; you call clutch moments." : "Your athletes handle every throw.") : "Choose a tactic before each of your throws."}</small></button>`).join("")}</div>`;
}

function firstMeetLobby(s, problem) {
  return `<section class="card first-meet-brief"><span class="eyebrow">FIRST CHALLENGE · vs ${esc(G.opponent(s).name)}</span><h2>Make your best throw count</h2><p><b>Four events. Three throws each.</b> Only your best legal mark counts. Places earn club points; most points wins.</p><p class="hint">X means a foul: that throw scores no mark.</p>${btn("How meets work", "meet-guide", "", "text")}</section>
    <h2>Watch or coach?</h2>${meetModes(s)}
    <p class="hint">Change modes anytime. One, two or three arrows set the pace.</p>
    <details class="card"><summary>Your starting four · lineup ready</summary><div class="opening-squad">${s.roster.map(a=>`<div>${portrait(a)}<b>${esc(a.name.split(" ")[0])}</b><small>${EVENTS[a.event].short}</small></div>`).join("")}</div></details>
    ${problem ? `<p class="warning">${esc(problem)}</p>` : ""}${btn(ico("stadium") + " Let's throw!", "enter", problem ? "disabled" : "")}`;
}

export function lobby(s, view = {}) {
  const m = G.opponent(s),
    problem = G.lineupProblem(s);
  if (G.firstMeet(s)) return firstMeetLobby(s, problem);
  const championship = G.isLeagueChampionship(s), field = championship ? G.championshipEntries(s) : null;
  const sky = G.weatherToday(s);
  // A lineup that needs fixing opens straight into the entry pickers.
  view = { ...view, editLineup: view.editLineup || !!problem };
  return `${championship ? championshipStandards(s) : ""}<p class="lobby-sub"><b>vs ${esc(m.name)}</b> · ${esc(m.style)} · ${G.isLeagueChampionship(s) ? "3 preliminary throws · top six earn 3 more · marks carry forward" : s.fixture === 3 ? "3 qualifying throws + 3 final throws for the top four" : "3 throws per athlete"} · ${esc(G.venueLabel(G.meetVenue(s)))}${G.meetVenue(s)?.home ? (({ attendance, capacity }) => ` · crowd ~${attendance.toLocaleString()} of ${capacity.toLocaleString()}`)(G.stadiumCrowd(s, { meet: true, weather: s.match?.weather || G.weatherOn(s, s.matchDay) })) : ""}</p>
  <p class="meet-forecast">${weatherChip(sky)} <span>${esc(G.WEATHER[sky].desc)}</span></p>
  <div class="lineup">${EVENT_IDS.map((ev, i) => {
    // Every entry slot for the event sits in one row, beside the rival's specialist.
    const ids = G.entriesOf(s, ev),
      a = s.roster.find((x) => x.id === ids[0]),
      r = championship ? [...field[ev]].sort((a,b) => G.rawMark(b.athlete,ev)-G.rawMark(a.athlete,ev))[0]?.athlete : m.athletes[i],
      fc = (x) => G.forecast(s, x, ev, { doubleDuty: G.usesOf(s, x.id) > 1 }),
      mine = ids.reduce((n, id) => Math.max(n, fc(s.roster.find((x) => x.id === id))), 0),
      theirs = r ? G.rawMark(r, ev) * G.MOOD_MARK[2] : 0;
    const edge = mine / theirs - 1;
    const slot = (k) => `<select data-change="entry" data-event="${ev}" data-slot="${k}" aria-label="${EVENTS[ev].name} entry ${k + 1}"><option value="0" ${ids[k] == null ? "selected" : ""}>No entry</option>${s.roster.map((x) => `<option value="${x.id}" ${ids[k] === x.id ? "selected" : ""} ${x.injury || championship && !G.championshipQualified(s,x.id,ev) ? "disabled" : ""}>${esc(shortName(x.name))} · ${mark(fc(x))}${x.event === ev ? " ★" : ""}${x.injury ? " (injured)" : championship && !G.championshipQualified(s,x.id,ev) ? " (standard not met)" : ""}</option>`).join("")}</select>`;
    // Entries read as names until the coach asks to change them.
    const names = ids.map((id) => s.roster.find((x) => x.id === id)).filter(Boolean).map((x) => `<b>${esc(shortName(x.name))}</b> ${mark(fc(x))}${x.event === ev ? " ★" : ""}`).join("<br>");
    return `<div class="lineup-row"><div class="lineup-event">${eventChip(ev)}<span class="edge ${edge > 0.01 ? "up" : edge < -0.01 ? "down" : ""}" title="Your best entry against their specialist">${edge > 0.01 ? "Ahead" : edge < -0.01 ? "Behind" : "Level"}</span></div>
      <div class="lineup-us">${a ? portrait(a) : ""}<span class="entry-slots">${view.editLineup ? [0, 1, 2].filter((k) => k <= ids.length).map(slot).join("") : `<span class="entry-names">${names || "No entry yet"}</span>`}<small>${a ? mood(a) + " Stamina " + Math.round(a.stamina) : ""}</small></span></div>
      <div class="lineup-them">${championship ? `<span>${field[ev].map(({athlete,club}) => `<span class="championship-entry"><strong>${esc(athlete.name)}</strong><small>${esc(club.name)} · ~${mark(G.rawMark(athlete,ev))}</small></span>`).join("")}</span>` : `${rivalPortrait(m.id, i)}<span><strong>${esc(r.name)}</strong><small>OVR ${G.overall(r)} · ~${mark(theirs)}${r.skills.length ? " · " + r.skills.length + " skill" + (r.skills.length > 1 ? "s" : "") : ""}</small></span>`}</div></div>`;
  }).join("")}</div>
  ${problem ? `<p class="warning">${esc(problem)}</p>` : ""}
  <p class="hint">${championship ? "Championship places score 10–8–6–5–4–3–2–1." : "Places score 5–3–1."} ★ marks a specialist. ${btn("How meets work", "meet-guide", "", "text")}${view.editLineup ? " Up to three entries per event and two events per athlete; all-foul entries score zero, and ties go to the next-best throw." : ""}</p>
  <div class="inline">${btn(view.editLineup ? "Done changing entries" : "Change entries", "edit-lineup", "", "subtle")}${btn("Auto-pick best lineup", "autolineup", "", "subtle")}${s.roster.some((a) => a.injury) ? btn("Medical postponement (+1 day)", "medical", "", "subtle") : ""}</div>
  ${G.systemUnlocked(s,"kit") ? `<div class="quick-items">${["drink", "cake", "feast", "icebath", "goldchalk"].filter((k) => s.bag[k]).map((k) => `<button class="use-item" data-act="use" data-item="${k}">${icon(k, 24)}<span><strong>${ITEMS[k].name} ×${s.bag[k]}</strong><small>${ITEMS[k].desc}</small></span></button>`).join("")}</div>
  ` : ""}<div class="card-title"><h2>How do you want to run it?</h2></div>${meetModes(s)}
  ${btn(ico("stadium") + " Start the meet", "enter", problem ? "disabled" : "")}`;
}

// ── Live meet ───────────────────────────────────────────────────────────
// The strip along the bottom of the stadium during a meet.
function meetAthlete(s, side, id) {
  const athletes = side === "home" ? s.roster : (G.matchClub(s)?.athletes || []);
  const athlete = athletes.find(a => a.id === id);
  const club = side === "away" && s.match.leagueChampionship ? G.championshipClubs(s).find(c => c.athletes.some(a => a.id === id)) : G.clubById(s,s.match.opponentId);
  return { athlete, club, face: !athlete ? "" : side === "home" ? portrait(athlete) : rivalPortrait(club.id, club.athletes.indexOf(athlete)) };
}
function resultTable(s, event) {
  const rows = event.placings.length ? event.placings : ["home", "away"].map((side, i) => {
    const a = side === "home" ? G.homeAthlete(s, EVENT_IDS.indexOf(event.event)) : G.rivalAthlete(s, EVENT_IDS.indexOf(event.event));
    const marks = (side === "home" ? s.match.homeMarks : s.match.awayMarks)[EVENT_IDS.indexOf(event.event)];
    return { side, id: a.id, marks, mark: G.best(marks), points: side === "home" ? event.h : event.a, place: null };
  });
  return `<article class="event-scorebook" style="--event-color:${EVENTS[event.event].color}">
    <header><h3>${EVENTS[event.event].name}</h3><span aria-label="Event points">${event.h} <small>–</small> ${event.a}</span></header>
    <table class="placing-table"><caption class="sr-only">${EVENTS[event.event].name} individual results</caption><colgroup><col class="col-place"><col><col class="col-mark"><col class="col-points"></colgroup><thead><tr><th scope="col">Pl.</th><th scope="col">Athlete</th><th scope="col">Best (m)</th><th scope="col">Pts</th></tr></thead><tbody>${rows.slice(0,SCOREBOARD_LIMIT).map(row => {
      const {athlete, face, club} = meetAthlete(s, row.side, row.id);
      const pb = s.match.rewards?.pbs?.some(p => p.id === row.id && p.event === event.event);
      return `<tr class="${row.side === "home" ? "our-athlete" : ""}"><td><b class="place place-${row.place}">${row.place || "—"}</b></td><th scope="row"><span class="result-athlete">${face}<span>${esc(athlete?.name || "Unknown athlete")}${nationTag(athlete)}<small>${row.side === "home" ? "Your club" : esc(club?.name || s.match.name)}${s.match.rewards?.worldRecords?.some((w) => w.id === row.id && w.event === event.event) ? ' <em class="pb-tag">WR</em>' : pb ? ' <em class="pb-tag pb-mark">PB</em>' : ""}${s.match.kind === "league" && G.championshipBooking(s) && G.championshipQualified(s, row.id, event.event) ? ' <em class="pb-tag q-tag" title="Championship standard reached">Q</em>' : ""}${s.match.championship && row.finalist ? ' <em class="pb-tag final-tag">FINAL</em>' : ""}</small></span></span></th><td class="result-mark">${row.mark == null ? "NM" : row.mark.toFixed(2)}</td><td>${row.points}</td></tr>`;
    }).join("")}</tbody></table>
    ${rows.length>SCOREBOARD_LIMIT ? `<p class="hint scoreboard-truncation">Top ${SCOREBOARD_LIMIT} of ${rows.length}. All attempts remain in the throw series.</p>` : ""}
    <details class="throw-series"><summary>Throw series <span>${rows.length} athletes</span></summary>${rows.map(row => {
      const {athlete} = meetAthlete(s,row.side,row.id);
      return `<div class="series-row ${row.side === "home" ? "our-athlete" : ""}"><strong>${esc(athlete?.name)}</strong><span>${row.marks.map((v,i) => `<b title="Throw ${i+1}" class="${v == null ? "foul" : v === row.mark ? "best" : ""}">${v == null ? "X" : v.toFixed(2)}</b>`).join("") || "No throws"}</span></div>`;
    }).join("")}</details></article>`;
}
// Badges for the marks that matter beyond the place, in the colours the field uses for them.
const BADGES = {
  pb: (r) => `<i class="badge pb" title="${r.firstMark ? "First mark: a personal best" : "Personal best"}">PB</i>`,
  q: (r) => `<i class="badge q${r.newlyQualified ? " new" : ""}" title="${r.newlyQualified ? "Reached the championship standard today" : "Championship standard reached"}">Q</i>`,
  out: () => `<i class="badge out" title="Missed the final">OUT</i>`,
};
function standingRows(s, board, rows, side, id) {
  const m = s.match, out = [];
  const divider = (cls, label, value) => `<div class="standing-divider ${cls}"><span>${label}</span><b>${value == null ? "" : mark(value)}</b></div>`;
  let standardShown = board.standard == null;
  // The cut sits under the last place in the final, or under the last mark while places are still open.
  const marked = rows.filter(r => r.mark != null).length, cutAfter = board.cut == null ? -1 : Math.max(0, Math.min(board.cut, marked)) - 1,
    open = board.cut == null ? 0 : board.cut - Math.min(board.cut, marked);
  if (board.cut != null && cutAfter < 0) out.push(divider("cut-line", `FINAL CUT · TOP ${board.cut} · ${open} OPEN`, null));
  rows.forEach((row, n) => {
    if (!standardShown && (row.mark == null || row.mark < board.standard)) { out.push(divider("standard-line", "CHAMPIONSHIP STANDARD", board.standard)); standardShown = true; }
    const {athlete,club}=meetAthlete(s,row.side,row.id);
    const badges = (row.out ? BADGES.out() : "") + (row.pb ? BADGES.pb(row) : "") + (row.qualified ? BADGES.q(row) : "");
    out.push(`<div class="standing ${row.side === "home" ? "our-athlete" : ""} ${row.side === side && row.id === id ? "throwing" : ""} ${row.inFinal ? "in-final" : ""} ${row.out ? "out" : ""}"><b class="place place-${row.place}">${row.place || "—"}</b><span title="${esc(athlete?.name)}">${esc(athlete?.name)}${nationTag(athlete)}${row.side === "home" ? '<small class="club-tag">YOU</small>' : m.leagueChampionship ? `<small class="club-tag">${esc(club?.name)}</small>` : ""}</span><span class="badges">${badges}</span><strong>${row.mark == null ? "NM" : row.mark.toFixed(2)}</strong></div>`);
    if (n === cutAfter) out.push(divider("cut-line", `FINAL CUT · TOP ${board.cut}${open ? ` · ${open} OPEN` : ""}`, null));
  });
  if (!standardShown) out.push(divider("standard-line", "CHAMPIONSHIP STANDARD", board.standard));
  return out.join("");
}
// What the thrower in the circle is chasing beyond the place: their PB, the championship standard
// in a league duel, the final cut in a championship. Each lights up once it's done.
function throwerGoals(s, board, row, athlete, ev) {
  const goals = [];
  if (athlete) goals.push(athlete.pb?.[ev] ? `<span class="goal pb ${row?.pb ? "done" : ""}">PB <b>${athlete.pb[ev].toFixed(2)}</b></span>` : `<span class="goal pb ${row?.pb ? "done" : ""}">First PB</span>`);
  if (board.standard != null) goals.push(`<span class="goal q ${row?.qualified ? "done" : ""}">Standard <b>${board.standard.toFixed(2)}</b></span>`);
  if (board.cut != null) goals.push(`<span class="goal cut ${row?.inFinal ? "done" : ""}">${row?.inFinal ? "In the final" : "Final cut"}${board.cutMark != null && !row?.inFinal ? ` <b>${board.cutMark.toFixed(2)}</b>` : ""}</span>`);
  if (board.finals && row && !row.out) goals.push(`<span class="goal cut done">Finalist</span>`);
  return goals.length ? `<div class="thrower-goals">${goals.join("")}</div>` : "";
}
// One of the world's elite wears their nation beside their name.
const nationTag = (a) => (a?.nation ? flag(a.nation) : "");
// A meet toolbar button: an icon always, its label when there's room for it.
const toolButton = (icon, label, act, extra = "", aria = label) => `<button class="button subtle small tool" data-act="${act}" ${extra} aria-label="${aria}" title="${aria}">${ico(icon)}<span class="lbl">${label}</span></button>`;
// Watch or Coach, highlights, the league standards and the guide: in the toolbar where there's
// room, behind "⋯" on a phone.
function meetOptions(s, view, leagueDuel) {
  return `<span class="meet-options"><span class="seg" role="group" aria-label="Meet mode">${["watch","coach"].map(mode=>`<button class="${s.settings.meetMode === mode ? "active" : ""}" data-act="meet-mode" data-value="${mode}" aria-pressed="${s.settings.meetMode === mode}" aria-label="${mode === "watch" ? "Watch" : "Coach"}" title="${mode === "watch" ? "Watch" : "Coach"}">${ico(mode === "watch" ? "eye" : "clipboard")}<span class="lbl">${mode === "watch" ? "Watch" : "Coach"}</span></button>`).join("")}</span>${toolButton("spark", s.settings.highlights ? "Highlights" : "Every throw", "highlights", `aria-pressed="${s.settings.highlights}"`)}${leagueDuel ? toolButton("target", view.meetStandards ? "Standings" : "Standards", "meet-standards", `aria-pressed="${!!view.meetStandards}"`) : ""}<button class="button subtle small meet-help" data-act="meet-guide" aria-label="How meets work" title="How meets work">?</button></span>`;
}
export function meetBar(s, view) {
  const m = s.match, i = m.eventIndex, ev = EVENT_IDS[i];
  const side = view.hide?.side || m.turnSide || (m.phase === "decide" ? "home" : m.last?.side) || "away";
  const a = side === "home" ? G.homeAthlete(s,i) : G.rivalAthlete(s,i);
  const {face, club: activeClub} = meetAthlete(s,side,a.id);
  let marks = (side === "home" ? m.homeMarks : m.awayMarks)[i];
  if(view.hide?.side === side && view.hide.eventIndex === i) marks = marks.slice(0,view.hide.attempt);
  const board = G.scoreboard(s,i,view.hide), fullRows = board.rows, rows=fullRows.slice(0,SCOREBOARD_LIMIT);
  const leagueDuel=G.championshipBooking(s) && m.kind==="league";
  const beat = m.last;
  const throwing = beat?.type === "throw" && beat.eventIndex === i;
  const result = throwing && !view.hide ? throwResult(beat) : null;
  const attempt = throwing ? beat.attempt + 1 : Math.min(m.attempts, marks.length + 1);
  const thrower = fullRows.find(r => r.side === side && r.id === a.id);
  const liveHome = rows.filter(r=>r.side === "home").reduce((n,r)=>n+r.points,0);
  const liveAway = rows.filter(r=>r.side === "away").reduce((n,r)=>n+r.points,0);
  return `<header class="meet-rail-score" aria-label="Club meet score"><small>MEET SCORE · ${i + 1} / 4 EVENTS<button class="meet-help rail" data-act="meet-guide" aria-label="How meets work">?</button></small><div><span><i class="dot" style="--c:${s.colors.primary}"></i>${esc(s.clubName)}</span><b>${m.score}</b></div><div><span><i class="dot" style="--c:${m.color}"></i>${esc(m.leadingClub || m.name)}</span><b>${m.against}</b></div><nav aria-label="Event progress">${G.eventScores(m).map((e,n)=>`<span class="${n === i ? "current" : ""}">${EVENTS[e.event].short} ${e.done ? e.h + '–' + e.a : n === i ? 'LIVE' : '·'}</span>`).join("")}</nav></header><div class="meet-moment ${result ? "landed" : ""} ${beat?.foul && result ? "foul" : ""}" role="status" aria-live="polite" aria-atomic="true">
    ${result ? `<div><small>${esc(beat.name)} · ${EVENTS[ev].name} · Throw ${attempt}</small><strong>${esc(result.headline)}</strong><span>${esc(result.detail)}</span></div><b>${beat.mark == null ? "X" : beat.mark.toFixed(2) + '<small>m</small>'}</b>` : throwing || m.phase === "decide" ? `<div><small>${m.phase === "decide" ? "YOUR CALL" : "UP NOW"} · Throw ${attempt} / ${m.attempts}</small><strong>${esc(a.name)}</strong><span>${esc(targetText(beat.target))}</span></div>` : `<div><small>${EVENTS[ev].name}</small><strong>${beat?.type === "eventEnd" ? "Event complete · " + beat.h + "–" + beat.a + " points" : beat?.finals ? `Top ${beat.finalistLimit || 4} · three final throws` : m.leagueChampionship ? "Championship · three preliminary throws" : "Three throws. Make your best one count."}</strong><span>${beat?.finals ? "Qualifying marks carry into the final." : m.prelimFinals ? "Points score 10–8–6–5–4–3–2–1 for each club." : "Places score 5–3–1 for the club."}</span></div>`}
  </div><div class="meet-desk">
    <section class="current-thrower ${side === "home" ? "our-athlete" : ""}" aria-label="Current thrower">
      <div class="thrower-heading"><b>${EVENTS[ev].name}</b><span>Throw ${attempt} / ${m.attempts}${m.finalRound ? " · Final" : ""}</span></div>
      <div class="thrower-identity">${face}<span><small>${side === "home" ? "YOUR CLUB" : esc(activeClub?.name || m.name)}</small><strong>${esc(a.name)}${nationTag(a)}</strong><small>${G.equippedSkills(a,"meet").map(k=>esc(SKILLS[k].name)).join(" · ") || "OVR " + Math.round(G.eventRating(a,ev))}</small></span><b class="thrower-best">${G.best(marks) == null ? "—" : G.best(marks).toFixed(2)}<small>BEST · m</small></b></div>
      <div class="thrower-attempts" aria-label="Throw attempts">${Array.from({length:m.attempts},(_,k)=>`<span class="${k >= marks.length ? "pending" : marks[k] == null ? "foul" : marks[k] === G.best(marks) ? "best" + (thrower?.pb ? " pb" : "") : ""}"><small>${k+1}</small><b>${k >= marks.length ? "·" : marks[k] == null ? "X" : marks[k].toFixed(2)}</b></span>`).join("")}</div>
      ${throwerGoals(s, board, thrower, side === "home" ? a : null, ev)}
    </section>
    ${leagueDuel && view.meetStandards ? qualifications(s,view,ev) : `<section class="live-standings" aria-label="Live standings"><header><strong>${m.prelimFinals ? "Event standings" : "Event points " + liveHome + "–" + liveAway} <small class="standings-state" title="${m.closed[i] ? "These points are in the meet score" : "Points if the event ended now"}">${m.closed[i] ? "FINAL" : m.prelimFinals ? "LIVE" : "IF IT ENDED NOW"}</small></strong><small>${m.prelimFinals ? m.finalRound ? "Final · preliminary marks retained" : "Preliminaries · top six advance" : m.finalRound ? "Final throws" : m.championship ? "Qualifying" : "Three-throw series"}${m.weather ? " · " + esc(G.WEATHER[m.weather].name) : ""}${ev === "discus" ? " · " + esc(m.wind || "calm") : ""}</small></header><div class="standings-list">${standingRows(s, board, rows, side, a.id)}</div>${fullRows.length>SCOREBOARD_LIMIT ? `<small class="scoreboard-truncation">Top ${SCOREBOARD_LIMIT} of ${fullRows.length}</small>` : ""}</section>`}
  </div><div class="meet-toolbar">${toolButton(view.meetPaused ? "play" : "pause", view.meetPaused ? "Resume" : "Pause", "meet-pause", `aria-pressed="${!!view.meetPaused}"`, view.meetPaused ? "Resume meet" : "Pause meet")}<div class="seg" role="group" aria-label="Meet speed">${speedButtons(view.meetSpeed || s.settings.meetSpeed || 1, "meet-speed")}</div>${toolButton("skip", "My next throw", "meet-skip", `data-to="mine" ${m.phase === "decide" ? "disabled" : ""}`, "Skip to my next throw")}${toolButton("finish", "End of event", "meet-skip", `data-to="event" ${m.phase === "decide" ? "disabled" : ""}`, "Skip to the end of this event")}${meetOptions(s, view, leagueDuel)}<details class="meet-more"><summary class="button subtle small" aria-label="More meet options" title="More">⋯</summary><div class="meet-more-menu">${meetOptions(s, view, leagueDuel)}</div></details></div>`;
}
export function meetScore(s) {
  const m = s.match,
    scores = G.eventScores(m);
  return `<div class="meet-score"><span class="side"><i class="dot" style="--c:${s.colors.primary}"></i>${esc(s.clubName)}</span><b>${m.score}</b><div class="event-chips">${scores.map((e, n) => `<span class="ev ${n === m.eventIndex && m.phase !== "complete" ? "now" : ""} ${e.done ? (e.h > e.a ? "won" : e.a > e.h ? "lost" : "tied") : ""}" style="--c:${EVENTS[e.event].color}">${EVENTS[e.event].short}<em>${e.done ? e.h + ":" + e.a : n === m.eventIndex ? "LIVE" : "·"}</em></span>`).join("")}</div><b>${m.against}</b><span class="side">${esc(m.leadingClub || m.name)}<i class="dot" style="--c:${m.color}"></i></span></div>`;
}
// The decision window for one of your throws.
// The standings as they are while you choose, since the call covers the scoreboard on a phone:
// the top three and your thrower, with the standard or the cut where they apply.
function decideStandings(s, a) {
  const board = G.scoreboard(s), rows = board.rows;
  if (!rows.length) return "";
  const mine = rows.findIndex((r) => r.side === "home" && r.id === a.id);
  const shown = rows.filter((r, n) => n < 3 || n === mine);
  const line = (r) => { const {athlete} = meetAthlete(s, r.side, r.id); return `<li class="${r.side === "home" ? "our-athlete" : ""} ${r.side === "home" && r.id === a.id ? "throwing" : ""}"><b>${r.place || "—"}</b><span>${esc(athlete?.name || "")}</span>${r.pb ? BADGES.pb(r) : ""}${r.qualified ? BADGES.q(r) : ""}<strong>${r.mark == null ? "NM" : r.mark.toFixed(2)}</strong></li>`; };
  const note = board.standard != null ? `Standard ${mark(board.standard)}` : board.cut != null ? `Final cut: top ${board.cut}${board.cutMark != null ? " · " + mark(board.cutMark) : ""}` : "";
  return `<ol class="decide-standings">${shown.map(line).join("")}</ol>${note ? `<p class="hint decide-note">${note}</p>` : ""}`;
}
export function decide(s, view) {
  const m = s.match,
    a = G.homeAthlete(s),
    P = G.projected(s, "home"),
    sigReady = G.canSignature(s, "home");
  if (view.meter)
    return `<div class="meter-panel"><span class="eyebrow">RELEASE ON THE GOLD</span><div class="meter"><span class="zone good"></span><span class="zone perfect" style="--w:${G.effects(s, a).perfect ? 22 : 14}%"></span><span id="needle"></span></div>${btn("Release!", "release")}<small>Tap Release, or press Space.</small></div>`;
  return `<div class="decide ${m.last?.clutch ? "clutch" : ""}">${G.firstMeet(s) && m.eventIndex === 0 && !m.homeMarks[0].length ? '<p class="hint">Your call: Bank it is safest. Controlled balances distance and risk. All out chases distance with more foul risk.</p>' : ""}<p>${m.last?.clutch ? ico("bolt") + " <b>Clutch moment.</b> " : ""}<b>${esc(a.name)}</b> · projected ${mark(P)}. ${chip("Suggested: " + TACTICS[m.last?.recommended || "balanced"].name, "#88b0d0")}</p>
    <p class="scoring-target">${esc(targetText(G.fieldTarget(s)))}</p>
    ${decideStandings(s, a)}
    <div class="tactics">${Object.entries(TACTICS)
      .map(([id, t]) => {
        const p = G.throwPreview(s, id, "good", view.sig);
        return `<button class="tactic t-${id}" data-act="tactic" data-value="${id}" title="${esc(t.desc)}"><strong>${t.name}</strong><small>${mark(p.low)} – ${mark(p.high)}</small><em>${Math.round(p.foul * 100)}% foul risk</em></button>`;
      })
      .join("")}</div>
    <p class="hint">${m.homeMarks[m.eventIndex].some((x) => x != null) ? "A mark is banked, so a foul now only costs this throw." : "No mark yet: a foul here could cost the event."} The range is the likely distance.</p>
    ${G.effects(s, a).sig ? `<label class="toggle sig"><input type="checkbox" data-change="sig" ${view.sig ? "checked" : ""} ${sigReady ? "" : "disabled"}> Use signature skill${sigReady ? "" : " (already used)"}</label>` : ""}</div>`;
}
// Under the level bar: what the next level brings and the next bigger milestone.
function levelRoad(s, a) {
  const next = G.levelRewards(a, a.level + 1), milestone = G.nextMilestone(a);
  const later = milestone && milestone.level !== a.level + 1 ? ` · <b>Lv. ${milestone.level}</b> ${esc(milestone.rewards.join(" · "))}` : "";
  return `<p class="level-road"><span>Next level</span> ${esc(next.join(" · "))}${later}${G.systemUnlocked(s, "skills") && a.sp ? ` · <b class="sp-ready">${a.sp} SP ready</b>` : ""}</p>`;
}
function meetGrowth(s) {
  const r = s.match.rewards || {};
  const recorded = Array.isArray(r.athleteProgress);
  const ids = [...new Set(s.match.fields ? s.match.fields.flatMap(f => f.home.map(e => e.id)) : Object.values(s.match.lineup).filter(Boolean))];
  const progress = recorded ? r.athleteProgress : ids.map(id => ({id, name: s.roster.find(a=>a.id===id)?.name}));
  return `<section class="meet-growth"><header class="growth-intro"><h2>Every meet builds your athletes</h2><p>XP follows how each athlete threw: clean throws, places, PBs and the team result. Mastery grows in each event they entered.</p></header>${!recorded ? '<p class="hint">This older meet has no XP or attribute breakdown. Recorded mastery, PBs and milestones are shown below.</p>' : ""}<div class="growth-grid">${progress.map(p=>{
    const a=s.roster.find(a=>a.id===p.id), before=p.before, after=p.after;
    const levels=after ? after.level-before.level : 0;
    const levelUp=(r.levelUps||[]).find(d=>d.id===p.id);
    const mastery=(r.mastery||[]).filter(d=>d.id===p.id);
    const milestones=(r.development||[]).filter(d=>d.id===p.id);
    const pbs=(r.pbs||[]).filter(d=>d.id===p.id);
    return `<article class="athlete-growth ${levels || levelUp ? "leveled-up" : ""}"><header>${a ? portrait(a) : ""}<div><h3>${esc(p.name)}</h3><span>${after ? levels ? `Lv. ${before.level} → <b>Lv. ${after.level}</b>` : `Lv. ${after.level}` : levelUp ? `Reached Lv. ${levelUp.level}` : "Meet completed"}</span></div>${levels || levelUp ? '<strong class="level-up-tag">LEVEL UP!</strong>' : ""}</header>
    ${after ? `<div class="meet-xp"><div><b>+${Number(p.xpGained.toFixed(1))} XP</b><span>${Math.floor(after.xp)} / ${G.xpNeeded(after.level)} XP to Lv. ${after.level+1}</span></div><progress value="${after.xp}" max="${G.xpNeeded(after.level)}" aria-label="${esc(p.name)} progress to level ${after.level+1}"></progress><small>${Math.ceil(G.xpNeeded(after.level)-after.xp)} XP to next level${levels ? ` · ${levels} level${levels===1?"":"s"} gained` : " · Building toward the next level"}</small></div>` : ""}
    ${after && (after.sp>before.sp || after.potential>before.potential || after.stats.some((v,i)=>v>before.stats[i])) ? `<div class="growth-gains">${after.sp>before.sp ? `<b>+${after.sp-before.sp} skill point${after.sp-before.sp===1?"":"s"}</b>` : ""}${after.stats.map((v,i)=>v-before.stats[i]>0.001 ? `<span>${STAT_NAMES[i]} <b>+${Number((v-before.stats[i]).toFixed(1))}</b></span>` : "").join("")}${after.potential>before.potential ? `<span>Potential <b>+${after.potential-before.potential}</b></span>` : ""}</div>` : ""}
    <div class="growth-mastery">${mastery.map(d=>`<div><span>${EVENTS[d.event].name} mastery</span><b>+${d.gain.toFixed(1)}</b><small>${(d.mastery-d.gain).toFixed(1)} → ${d.mastery.toFixed(1)}</small></div>`).join("")}</div>
    ${after && levels && Array.from({length: levels}, (_, n) => G.levelRewards(a || after, before.level + n + 1)).flat().some((r) => !r.includes("skill point")) ? `<p class="level-rewards">${Array.from({length: levels}, (_, n) => G.levelRewards(a || after, before.level + n + 1)).flat().filter((r) => !r.includes("skill point")).map(r => `<span>${esc(r)}</span>`).join("")}</p>` : ""}
    ${a && a.sp > 0 && G.systemUnlocked(s, "skills") ? btn(a.sp + " SP to spend · skills", "leave", `data-page="squad" data-athlete="${a.id}"`, "subtle small") : ""}
    ${pbs.map(d=>`<p class="growth-pb">PB · ${EVENTS[d.event].name} <b>${mark(d.mark)}</b>${d.delta ? ` (+${d.delta.toFixed(2)} m)` : " · First mark"}</p>`).join("")}
    ${milestones.map(d=>`<p class="growth-milestone"><b>${esc(d.milestone)}</b> · ${esc(d.reward)}</p>`).join("")}
    </article>`;
  }).join("")}</div></section>`;
}
function meetHighlights(s) {
  const m = s.match, rewards = m.rewards || {};
  return `<section class="meet-highlights" aria-label="Your meet highlights">${G.eventScores(m).map(event => {
    const ours = event.placings.filter(row => row.side === "home");
    const row = ours[0];
    const {athlete, face} = row ? meetAthlete(s, "home", row.id) : {};
    const pb = (rewards.pbs || []).find(p => p.id === row?.id && p.event === event.event);
    const wr = (rewards.worldRecords || []).some(p => p.id === row?.id && p.event === event.event);
    const sweep = ours.filter(r => r.place != null && r.place <= 3).length === 3;
    const title = wr ? "World record!" : sweep ? "Podium sweep!" : row?.place === 1 ? "Event winner" : pb?.delta > 0 ? "Personal best!" : "Club best";
    return `<article class="meet-highlight ${row?.place === 1 ? "event-winner" : ""}" style="--event-color:${EVENTS[event.event].color}"><header>${eventChip(event.event)}<b>${event.h}–${event.a} pts</b></header><strong>${row ? title : "No club entry"}</strong>${athlete ? `<div>${face}<span><b>${esc(athlete.name)}</b><small>${row.mark == null ? "No legal mark" : mark(row.mark)}${row.place ? " · Place " + row.place : ""}</small></span></div>` : ""}${pb ? `<small class="highlight-pb">${pb.delta > 0 ? "PB +" + pb.delta.toFixed(2) + " m" : "First official mark"}</small>` : ""}</article>`;
  }).join("")}</section>`;
}
export function meetComplete(s, view = {}) {
  const m = s.match,
    r = m.rewards || { items: [], pbs: [], levelUps: [], goals: [] },
    win = G.meetOutcome(m) > 0,
    draw = G.meetOutcome(m) === 0;
  const growth = view.resultView === "progress", standards=view.resultView === "standards" && m.kind==="league" && G.championshipBooking(s);
  const selected = EVENT_IDS.includes(view.resultEvent) ? view.resultEvent : "all";
  return `<header class="meet-verdict ${win ? "win" : draw ? "draw" : "loss"}"><div><span class="eyebrow">${m.kind === "final" ? "THE FINAL" : m.kind === "duel" ? "CLUB DUEL" : m.kind === "cup" ? esc(r.invitational?.name || "INVITATIONAL").toUpperCase() : "LEAGUE FIXTURE"} · COMPLETE</span><h1>${win ? "Victory!" : draw ? "Honours even" : "Defeat"}</h1></div><div class="verdict-score"><span>${esc(s.clubName)}</span><b><span data-count="${m.score}">${m.score}</span> <small>–</small> <span data-count="${m.against}">${m.against}</span></b><span>${esc(m.name)}</span></div>${win ? `<div class="confetti" aria-hidden="true">${Array.from({ length: 16 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${((i * 13) % 9) / 10}s;--r:${(i * 71) % 360}deg;--c:${["#f2c94c", s.colors.primary, "#e0506a", "#5aa4c8", "#8cc152"][i % 5]}"></i>`).join("")}</div>` : ""}</header>
  <div class="meet-payout"><span>${ico("coin")} <b>+<span data-count="${r.money || 0}" data-cash>${cash(r.money || 0)}</span></b></span><span>${ico("heart")} +<span data-count="${r.fans || 0}">${r.fans || 0}</span> fans</span>${G.systemUnlocked(s,"sessions") ? `<span>${ico("idea")} +<span data-count="${r.insights || 0}">${r.insights || 0}</span> Insights</span>` : ""}${r.mvp ? `<span class="meet-mvp">${ico("mvp")} MVP <b>${esc(r.mvp.name)}</b></span>` : ""}${(r.worldRecords || []).map((w) => `<span class="meet-mvp wr-ours">${ico("trophy")} WORLD RECORD <b>${esc(w.name)} ${mark(w.mark)}</b></span>`).join("")}</div>
  ${m.leagueChampionship ? championshipTable(s) : ""}
  ${r.introduction ? (() => { const d = G.INTRODUCTIONS.find(d => d.id === r.introduction); return `<article class="card introduction-card"><span class="eyebrow">NEW CLUB SYSTEM</span><h2>${esc(d.name)}</h2><p>${esc(d.desc)}</p>${btn("Try " + esc(d.name.toLowerCase()), "leave", `data-page="${d.page}"`, "subtle")}</article>`; })() : ""}
  ${m.tieBreak ? '<p class="hint">Decided on distance tie-break.</p>' : ""}
  <nav class="meet-result-tabs" aria-label="Meet report"><button class="report-menu" data-act="game-menu">Menu</button><button data-act="result-view" data-value="results" aria-pressed="${!growth && !standards}" class="${!growth && !standards?"active":""}">Results</button>${m.kind==="league" && G.championshipBooking(s) ? `<button data-act="result-view" data-value="standards" aria-pressed="${standards}" class="${standards?"active":""}">Qualification</button>` : ""}<button data-act="result-view" data-value="progress" aria-pressed="${growth}" class="${growth?"active":""}">Athlete growth${r.levelUps.length ? `<b>${r.levelUps.length} level-up${r.levelUps.length===1?"":"s"}</b>` : ""}</button></nav>
  ${standards ? qualifications(s,view) : growth ? meetGrowth(s) : `
  ${meetHighlights(s)}
  <nav class="result-filters" aria-label="Filter event results">${[["all","All events"],...EVENT_IDS.map(ev=>[ev,EVENTS[ev].name])].map(([id,label])=>`<button data-act="result-event" data-event="${id}" aria-pressed="${selected === id}" class="${selected === id ? "active" : ""}">${label}</button>`).join("")}<small><i></i> Your athletes · NM = no mark</small></nav>
  <div class="scorebook-grid ${selected !== "all" ? "single-event" : ""}">${G.eventScores(m).filter(e=>selected === "all" || e.event === selected).map(e=>resultTable(s,e)).join("")}</div>
  `}
  <details class="meet-reward-details"><summary>Meet rewards & development <span>${r.items.length} items · ${r.pbs.length} PBs · ${r.levelUps.length} level-ups</span></summary>
  <section class="card rewards"><div class="card-title"><h2>${ico("gift")} Rewards</h2></div>

    ${r.items.length ? `<div class="drops">${r.items.map((k, n) => `<div class="drop rarity-${ITEMS[k].rarity}" style="--delay:${n * 0.35 + 0.3}s">${icon(k, 40)}<strong>${ITEMS[k].name}</strong><small>${RARITY[ITEMS[k].rarity].name}</small></div>`).join("")}</div>` : ""}
    ${r.firstDuel ? `<p class="pb-line">First victory over this club! Bonus funds and a skill scroll earned.</p>` : ""}
    ${r.invitational ? `<p class="pb-line">${ico("star")} ${r.invitational.won ? esc(r.invitational.name) + " champions! The " + esc(ITEMS[r.invitational.prize].name) + " is ours." : "Thanks for coming to the " + esc(r.invitational.name) + ". A keepsake for the trip; the " + esc(ITEMS[r.invitational.prize].name) + " stays with the winners."}</p>` : ""}
    ${(r.mastery || []).map(d=>`<p class="pb-line">${esc(d.name)} · ${EVENTS[d.event].name} mastery +${d.gain.toFixed(1)} (${Math.floor(d.mastery)})</p>`).join("")}
    ${(r.development || []).map((d) => `<p class="pb-line">${ico("star")} ${esc(d.name)} · ${esc(d.milestone)} · ${esc(d.reward)}</p>`).join("")}
    ${(r.worldRecords || []).map((w) => `<p class="pb-line wr-line">${ico("trophy")} WORLD RECORD · ${esc(w.name)} · ${EVENTS[w.event].name} ${mark(w.mark)} (was ${w.previous.toFixed(2)}) · +$2,500, +400 fans</p>`).join("")}
    ${r.pbs.map((p) => `<p class="pb-line">${ico("medal")} ${esc(p.name)} · ${EVENTS[p.event].name} PB ${mark(p.mark)}${p.delta ? " (+" + p.delta.toFixed(2) + ")" : ""}</p>`).join("")}
    ${r.levelUps.map((l) => `<p class="pb-line">${ico("levelup")} ${esc(l.name)} reached level ${l.level}</p>`).join("")}
    ${r.goals.map((id) => `<p class="pb-line">${ico("target")} Goal: ${esc(G.GOALS.find((g) => g.id === id)?.name)}</p>`).join("")}
  </section></details>
  ${growth ? btn(m.kind !== "duel" && (m.kind === "final" || s.fixture === 2) ? "See what comes next" : "Back to the club", "leave") : btn("Athlete growth →", "meet-progress")}`;
}

function championshipTable(s) {
  return `<section class="card"><h2>League championship standings</h2><div class="table-wrap"><table><thead><tr><th>Club</th><th>Points</th></tr></thead><tbody>${G.championshipScores(s.match).map((c,i) => `<tr class="${c.id === "us" ? "us" : ""}"><td>${i+1}. ${esc(c.id === "us" ? s.clubName : c.name)}</td><td>${c.points}</td></tr>`).join("")}</tbody></table></div></section>`;
}

// ── The world's best ────────────────────────────────────────────────────
const elitePortrait = (e, size = 40) => `<canvas class="portrait elite-portrait" width="${size}" height="${size}" data-elite="${e.id}"></canvas>`;
const flag = (nation) => `<span class="nation">${esc(nation)}</span>`;
export function worldBoard(s) {
  const year = G.yearOf(s), club = G.clubVersusWorld(s);
  return `<div class="card-title"><h2>${ico("star")} The world's best · Year ${year}</h2></div><p class="hint">The marks to aim for. Your athletes join this list when they throw far enough.</p>
  <div class="world-board">${EVENT_IDS.map((ev, i) => {
    const rows = G.worldList(s, ev), mine = club[i];
    return `<article class="world-event" style="--event-color:${EVENTS[ev].color}"><header>${EVENTS[ev].name}</header><ol>${rows.map((r, n) => `${n && r.rank > rows[n - 1].rank + 1 ? `<li class="world-gap" aria-hidden="true">⋯</li>` : ""}<li class="${r.athlete ? "our-athlete" : ""}"><b>${r.rank.toLocaleString()}</b>${r.elite ? elitePortrait(r.elite, 28) : portrait(r.athlete)}<span>${esc(r.name)} ${flag(r.nation)}</span><strong>${mark(r.mark)}</strong></li>`).join("")}</ol>
    <p class="world-you">${mine.athlete ? `Your best: <b>${esc(mine.athlete.name)}</b> ${mark(mine.mark)} · world #${mine.rank.toLocaleString()}${mine.gap > 0 ? ` · ${mine.gap.toFixed(2)} m to the top` : " · <b>world leader!</b>"}` : "No mark yet."}</p></article>`;
  }).join("")}</div>`;
}
// Awards night, one step at a time: Juno's welcome, each award, then the world's best.
export function ceremonySteps(s) {
  const c = s.ceremony;
  if (!c) return [];
  const steps = [{ title: "Awards night · Year " + c.year, eyebrow: HELPER + " · your host", body: `<div class="ceremony-intro"><p>Welcome, everyone, to the ${esc(s.clubName)} awards for Year ${c.year}!</p><div class="facts"><span>Event points <b>${c.totals.points}</b></span><span>Personal bests <b>${c.totals.pbs}</b></span><span>Fans <b>${s.fans.toLocaleString()}</b></span></div><p>${c.list.length ? "Before we look at the world's best, let's celebrate our own." : "A quiet year on the field. Next year the stage is yours."}</p></div>` }];
  for (const w of c.list) {
    const a = s.roster.find((x) => x.id === w.id);
    steps.push({ title: w.award, eyebrow: (w.mvp ? "AND THE MVP IS…" : "THE AWARD GOES TO…"), cls: w.mvp ? "ceremony-mvp" : "", body: `<div class="award-reveal ${w.mvp ? "mvp" : ""}">${w.mvp ? `<div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${((i * 13) % 9) / 10}s;--r:${(i * 71) % 360}deg;--c:${["#f2c94c", s.colors.primary, "#e0506a", "#5aa4c8", "#8cc152"][i % 5]}"></i>`).join("")}</div>` : ""}${a ? `<span class="award-portrait">${portrait(a)}</span>` : ""}<strong>${esc(w.name)}</strong><p>${esc(w.value)}</p><em>${ico("spark")} ${esc(w.reward)}</em></div>` });
  }
  steps.push({ title: "The world's best", eyebrow: "WHERE WE'RE HEADED", body: `<div class="world-tease"><p>Out there, the best throwers on the planet are waiting. One day, one of ours could stand with them.</p>${c.world.map((r) => {
    const e = ELITES.find((x) => x.id === r.leader.id);
    return `<div class="tease-row" style="--event-color:${EVENTS[r.event].color}"><small>${EVENTS[r.event].short}</small>${e ? elitePortrait(e, 48) : ""}<span><b>${esc(r.leader.name)} ${flag(r.leader.nation)}</b><em>${e ? esc(e.blurb) : "That's us!"}</em></span><strong>${mark(r.leader.mark)}</strong><p class="tease-you">${r.name ? `${esc(r.name)} ${mark(r.mark)} · world #${r.rank.toLocaleString()}${r.gap > 0 ? " · " + r.gap.toFixed(2) + " m to go" : ""}` : "No club mark yet"}</p></div>`;
  }).join("")}</div>` });
  return steps;
}
// ── Season end & awards ─────────────────────────────────────────────────
function seasonEnd(s) {
  const won = s.champion,
    aw = s.lastAwards;
  return `<div class="season-end ${won ? "won" : ""}"><div class="trophy">${ico(won ? "trophy" : "sprout", "huge")}</div>${heading("SEASON " + s.season + " COMPLETE", won ? G.competitionName(s) + " champions!" : "The next chapter is yours.", won ? "Title bonus " + cash(s.lastTitlePrize || 0) + " added." + (s.lastTitleGift ? " First-title gift: " + ITEMS[s.lastTitleGift].name + "." : "") : "Everything you built stays. A rebuild camp boosts key stats.")}
  <p class="hint awards-teaser">${ico("medal")} Awards night closes Year ${G.yearOf(s)}, in ${168 - ((s.day - 1) % 168)} days. MVP, breakout and record breaker, and a look at the world's best.</p>
  ${aw?.list.length ? `<section class="card awards"><div class="card-title"><h2>${ico("medal")} Awards night</h2></div>${aw.list.map((w) => {
    const a = s.roster.find((x) => x.id === w.id);
    return `<div class="award">${a ? portrait(a) : ""}<span><small>${esc(w.award)}</small><strong>${esc(w.name)}</strong><em>${esc(w.value)}${w.sp ? " · +1 SP" : ""}${w.item ? " · " + ITEMS[w.item].name : ""}</em></span></div>`;
  }).join("")}</section>` : ""}
  ${s.competition?.format === "championship" && s.results.length === 3 ? `<p class="hint">The squad did not meet a championship entry standard in the league duels. Rebuild and earn a qualifying mark in the next league season.</p>` : ""}
  <div class="facts"><span>Meet wins <b>${s.results.filter((r) => r.win).length}</b></span><span>Fans <b>${s.fans.toLocaleString()}</b></span><span>Titles <b>${s.trophies.length}</b></span></div>
  ${btn("Choose the next chapter", "season")}
  <p class="hint">${won ? "Your trophy stays. Return to the Meets board to see your invitations, replay a league or book a duel." : "Rebuild camp helps the squad recover. Choose when and where to compete again."}</p></div>`;
}
