import * as G from "../domain/game.js";
import {
  EVENTS,
  EVENT_IDS,
  LEAGUES,
  CLUBS,
  PLANS,
  RANKS,
  RARITY,
  BACKGROUNDS,
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
const ovrBadge = (a) => `<span class="ovr"><small>OVR</small><b>${G.overall(a)}</b>${grade(G.overall(a))}</span>`;
export const mood = (a) => `<span class="mood-wrap" title="${G.MOODS[G.moodOf(a)]} condition">${moodIco(G.moodOf(a))}</span>`;
const rankChip = (a) => chip(RANKS[a.rank].name, ["#9aa58f", "#5aa4c8", "#8cc152", "#e2b04a", "#b060d0"][a.rank], "rank");
const rarityChip = (a) => (a.rarity !== "common" ? chip(RARITY[a.rarity].name, RARITY[a.rarity].color, "rarity") : "");
const eventChip = (ev) => chip(EVENTS[ev].short, EVENTS[ev].color);
const stamina = (a) => `<span class="mini-stat" title="Stamina ${Math.round(a.stamina)}">${ico("bolt")}${bar(a.stamina, 100, a.stamina < 30 ? "#e0604a" : "#6ac08a")}</span>`;
function alerts(s, a) {
  const out = [];
  if (a.injury) out.push(chip("Injured " + a.injury + "d", "#e0604a"));
  if (a.sp > 0 && Object.keys(SKILLS).some((k) => G.skillAvailable(a, k) && SKILLS[k].sp <= a.sp && SKILLS[k].rank <= a.rank)) out.push(chip(a.sp + " SP", "#a465d6", "pulse"));
  if (!G.promoteProblem(s, a)) out.push(chip("Rank up!", "#e2b04a", "pulse"));
  return out.join("");
}
export const WINDOW_TITLES = { home: "Clubhouse", squad: "The squad", train: "Training ground", recruit: "Scouting report", build: "Groundskeeping", shop: "Kit shop", league: "Meet calendar", club: "Club office", lobby: "Call room" };

// ── Club desk ───────────────────────────────────────────────────────────
export function home(s, view) {
  if (s.phase === "seasonEnd") return seasonEnd(s);
  const opp = G.opponent(s),
    days = s.matchDay == null ? null : s.matchDay - s.day,
    ready = days != null && days <= 0;
  return `
  ${s.phase === "planning" ? `<article class="card calendar-welcome"><span class="eyebrow">OFF-SEASON · NOTHING ON THE CALENDAR</span><h2>Where do we throw next?</h2><p>Book a duel to test the squad, or enter a league and chase some hardware. The infield stays open until you're ready.</p>${btn("Open the meet calendar", "page", 'data-page="league"')}<div class="inline">${btn(view.playing ? "Pause training" : "Keep training", view.playing ? "pause" : "play", "", "subtle")}${btn("Next day", "day", view.playing ? "disabled" : "", "subtle")}</div></article>` : `
  <article class="fixture-card ${ready ? "ready" : ""}" style="--rival:${opp?.color || "#888"}">
    <div class="fixture-top"><span>${s.competition?.kind === "duel" ? "DUEL MEET" : s.fixture === 3 ? "LEAGUE FINAL" : "FIXTURE " + (s.fixture + 1) + " / 3"} · ${esc(G.competitionName(s))}</span><b>${ready ? "MEET DAY" : days + (days === 1 ? " DAY" : " DAYS") + " TO GO"}</b></div>
    <div class="versus"><span class="crest home">${esc(s.clubName.slice(0, 1))}</span><div><small>NEXT UP</small><h2>${esc(opp?.name)}</h2><p>${esc(opp?.style || "")}</p></div><span class="crest away">${esc(opp?.name.slice(0, 1))}</span></div>
    ${ready ? btn(ico("stadium") + " Report to the call room", "lobby") : btn(view.playing ? ico("pause") + " Pause" : ico("play") + " Train · " + days + (days === 1 ? " day" : " days") + " to the meet", view.playing ? "pause" : "play")}
    <div class="split">${btn("Next day", "day", ready || view.playing ? "disabled" : "", "subtle")}${btn(ico("league") + " Meets", "page", 'data-page="league"', "subtle")}</div>
  </article>`}
  <div class="budget"><span>${ico("idea")} Insights <b>${s.coaching.insights}</b></span><span>${ico("coin")} Weekly <b class="${G.weeklyIncome(s) < G.wages(s) ? "neg" : ""}">${G.weeklyIncome(s) >= G.wages(s) ? "+" : ""}${cash(G.weeklyIncome(s) - G.wages(s))}</b></span><span>${ico("heart")} Visitors <b>${G.visitorsPerDay(s)}/day</b></span></div>
  <section class="card"><div class="card-title"><h2>${ico("target")} Season targets</h2>${btn("All goals", "page", 'data-page="club"', "text")}</div>
    ${G.openGoals(s, 3).map((g) => goalRow(s, g)).join("") || "<p class='hint'>Every target hit. Legendary.</p>"}
  </section>
  <div class="section-title"><h2>Training</h2><label class="bulk">Everyone <select data-change="bulk">${new Set(s.roster.map((a) => a.plan)).size > 1 ? "<option disabled selected>Mixed</option>" : ""}${Object.entries(PLANS).filter(([id]) => s.roster.every((a) => !G.planProblem(s,a,id))).map(([id, p]) => `<option value="${id}" ${s.roster.every((a) => a.plan === id) ? "selected" : ""}>${p.name}</option>`).join("")}</select></label></div>
  <div class="roster-strip">${s.roster.map((a) => rosterRow(s, a)).join("")}</div>
  <p class="hint">Plans send everyone where the work happens: Power to the Strength Room, Technique to their ring or runway, Speed to the track, Focus to the film room. Tired legs rest on their own.</p>
  <section class="card journal"><div class="card-title"><h2>${ico("news")} Bulletin board</h2></div>${s.log.slice(0, 5).map((l) => `<p class="log ${l.kind}">${esc(l.text)}</p>`).join("")}</section>`;
}
function goalRow(s, g) {
  const p = G.goalProgress(s, g);
  return `<div class="goal"><div><strong>${esc(g.name)}</strong><small>${esc(g.desc)}</small>${bar(p, g.target, "#e2b04a")}</div><span class="reward">${esc(G.rewardText(g.reward))}</span></div>`;
}
function rosterRow(s, a) {
  const act = G.plannedActivity(s, a);
  const label = { rest: "Resting", sharpen: "Tapering", injured: "Injured", facility:"Helping at facility" }[act];
  return `<div class="roster-row rarity-${a.rarity}">
    <button class="who" data-act="athlete" data-id="${a.id}">${portrait(a)}<span><strong>${esc(a.name)}</strong><small>${EVENTS[a.event].short} · OVR ${G.overall(a)} ${mood(a)}</small></span></button>
    ${stamina(a)}
    <select data-change="plan" data-id="${a.id}" aria-label="Training plan for ${esc(a.name)}">${Object.entries(PLANS).filter(([id]) => !G.planProblem(s,a,id)).map(([id, p]) => `<option value="${id}" ${a.plan === id ? "selected" : ""}>${p.name}</option>`).join("")}</select>
    <span class="doing">${label && act !== a.plan ? chip(label, "#88b0d0") : ""}${alerts(s, a)}</span>
  </div>`;
}

function dutyReward(out) {
  return [out.money ? cash(out.money) : "",out.insights ? out.insights+" Insights" : "",out.fans ? out.fans+" fans" : "",out.recovery ? "+"+out.recovery+" recovery for resting teammates" : ""].filter(Boolean).join(" · ");
}
function facilityStaffPicker(s,key) {
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
  return `<div class="row-head"><p>${s.roster.length} / ${G.rosterCap(s)} athletes · a Dormitory makes room for more</p>${btn(ico("plus") + " Scout", "page", 'data-page="recruit"', "small")}</div>
  ${facilityBoard(s)}
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
      (v, i) => `<div class="stat"><span>${STAT_NAMES[i]}</span><span class="track"><i style="width:${v}%;--c:${STAT_COLORS[i]}"></i><s style="left:${cap}%" title="Current limit ${Math.floor(cap)}"></s></span><b>${showStat(v)}</b>${grade(v)}</div>`,
    )
    .join("")}${compact ? "</div>" : `<div class="scale"><span>1</span><span>50</span><span>100</span></div><p class="hint">The notch is their current ceiling (${Math.floor(cap)}); rank-ups lift it. What wins the ${EVENTS[a.event].name.toLowerCase()}: ${EVENTS[a.event].weights.map((w, i) => STAT_SHORT[i] + " " + Math.round(w * 100) + "%").join(", ")}.</p></div>`}`;
}
function athletePage(s, a, view) {
  const tabs = [
    ["stats", "Stats"],
    ["train", "Training"],
    ["skills", "Skills" + (a.sp ? " · " + a.sp + " SP" : "")],
    ["gear", "Gear"],
    ["career", "Career"],
  ];
  const tab = view.tab || "stats";
  let body = "";
  if (tab === "stats") {
    const next = RANKS[a.rank + 1],
      problem = G.promoteProblem(s, a);
    body = `<div class="vitals"><div><span>${ico("bolt")} Stamina</span>${bar(a.stamina, 100, a.stamina < 30 ? "#e0604a" : "#6ac08a")}<b>${Math.round(a.stamina)}</b></div><div><span>${mood(a)} Condition</span>${bar(a.condition, 100, "#f0b04a")}<b>${G.MOODS[G.moodOf(a)]}</b></div><div><span>${ico("levelup")} Level ${a.level}</span>${bar(a.xp, G.xpNeeded(a.level), "#a465d6")}<b>${Math.floor(a.xp)}/${G.xpNeeded(a.level)}</b></div></div>
    ${athleteDutyPicker(s,a)}
    ${statRows(a)}
    <section class="card"><h3>Event attribute scaling</h3><p>Attribute weights before mastery, approach, condition and equipment bonuses.</p>${EVENT_IDS.map(ev => `<p><b>${EVENTS[ev].name}</b> · ${EVENTS[ev].weights.map((w,i) => `${STAT_NAMES[i]} ${Math.round(w*100)}%`).join(" · ")}</p>`).join("")}</section>
    <section class="card"><h3>Skills & unique abilities</h3>${a.skills.map(k => `<p><b>${esc(SKILLS[k].name)}</b>${a.equipped.includes(k) ? " · Equipped" : " · Learned"}<br>${esc(SKILLS[k].desc)}</p>`).join("") || "<p>No learned skills yet.</p>"}${a.secret ? `<p><b>Unique: ${esc(SKILLS[SECRETS[a.secret].skill].name)}</b> · ${esc(SKILLS[SECRETS[a.secret].skill].desc)}</p>` : ""}${btn("Manage skills", "tab", 'data-tab="skills"', "subtle")}</section>
    <article class="card rank-card"><div class="card-title"><h2>${RANKS[a.rank].name}${next ? " to " + next.name : ""}</h2>${rankChip(a)}</div>
      ${next ? `<p>Raises the limit to <b>${Math.floor(Math.min(100, a.potential + next.cap))}</b>${next.slots > RANKS[a.rank].slots ? ", adds a <b>skill slot</b>" : ""}, +1 to every stat, 1 SP and a new look. Needs level ${next.level}${next.title ? " and a league title" : ""}. ${a.promoteFree ? "<b>Promotion Letter ready: free!</b>" : "Fee " + cash(next.cost) + "."}</p>${btn(problem ? esc(problem) : ico("star") + " Promote to " + next.name, "promote", `data-id="${a.id}" ${problem ? "disabled" : ""}`)}` : "<p>The highest honour in the sport.</p>"}
    </article>
    <div class="explain"><b>${BACKGROUNDS[a.background].name}</b>: ${esc(BACKGROUNDS[a.background].story)} <em>${esc(BACKGROUNDS[a.background].desc)}.</em>${a.secret ? "<br><b>Secret character.</b> " + esc(SECRETS[a.secret].story) : ""}</div>
    <div class="facts"><span>Wage <b>${cash(G.wageOf(a))}/wk</b></span><span>Potential <b>${Math.floor(a.potential)}</b></span><span>Projected <b>${mark(G.forecast(s, a, a.event))}</b></span></div>`;
  }
  if (tab === "stats") body += btn(s.settings.followAthlete===a.id ? "Following in highlights · stop" : "Follow this athlete in highlights","follow-athlete",`data-id="${a.id}"`,"subtle")+masteryCard(s,a)+developmentCard(a);
  if (tab === "train") {
    body = `${insightBanner(s)}<div class="card-title"><h2>${ico("dumbbell")} Coached sessions</h2><small class="hint">One a day</small></div>${drillGrid(s, a.injury || a.coachedDay === s.day ? [] : [a.id])}${a.coachedDay === s.day ? "<p class='hint'>Session done for today. Back tomorrow.</p>" : ""}
    <h3>Daily plans</h3><div class="plan-grid">${Object.entries(PLANS)
      .map(([id, p]) => {
        const at = p.facility === "event" ? (a.trainingEvent||a.event) : p.facility;
        const lvl = at ? G.facilityLevel(s, at) : 0,
          name = at ? (STADIUM[at] || FACILITIES[at]).name : null;
        const where = at ? (lvl ? name + " Lv " + lvl + (p.stat != null ? " · +" + lvl * 25 + "%" : "") : p.stat != null ? "No " + name + " yet · −20%" : "Clubhouse") : id === "balanced" ? "Laps of the track" : "Light drills";
        const problem = G.planProblem(s,a,id);
        const unlockable = p.course && !s.coaching.unlocked.includes(id);
        const unlockProblem = (p.facility === "event" && (a.eventMeets[a.trainingEvent||a.event]||0)<(p.cost>=24?4:2) ? "Compete in this event to qualify for advanced coaching" : null) || G.facilityProblem(s,a,p.needs) || (s.coaching.insights < p.cost ? "Not enough Insights" : null);
        return `<button class="plan ${a.plan === id ? "selected" : ""}" data-act="${unlockable ? "unlock-plan" : "plan"}" data-id="${a.id}" data-value="${id}" ${(unlockable ? unlockProblem : problem) ? "disabled" : ""}><strong>${p.name}</strong><small>${p.desc}</small><em>${unlockable ? "Unlock · " + p.cost + " Insights · " : ""}${problem && (!unlockable || unlockProblem) ? esc(unlockProblem || problem) : where}</em></button>`;
      })
      .join("")}</div>
    <p class="hint">${planForecast(s, a)}</p>
    <label class="toggle"><input type="checkbox" data-change="autorest" data-id="${a.id}" ${a.autoRest ? "checked" : ""}> Rest automatically below 25 stamina</label>
    <label class="toggle"><input type="checkbox" data-change="autotaper" data-id="${a.id}" ${a.autoTaper ? "checked" : ""}> Taper in the two days before a meet</label>
    ${athleteDutyPicker(s,a)}${masteryCard(s,a)}`;
  }
  if (tab === "skills") {
    const slots = G.slotsOf(a);
    const learnable = Object.keys(SKILLS).filter((k) => G.skillAvailable(a, k));
    body = `<div class="slots">${Array.from({ length: slots }, (_, i) => {
      const k = a.equipped[i];
      return k ? `<div class="slot on">${skillIcon(k)}<span><strong>${SKILLS[k].name}</strong><small>${SKILLS[k].desc}</small></span></div>` : `<div class="slot"><span class="skill-icon">${ico("plus")}</span><span><strong>Empty slot</strong><small>Equip a learned skill below.</small></span></div>`;
    }).join("")}${RANKS[a.rank + 1] && RANKS[a.rank + 1].slots > slots ? `<div class="slot locked"><span class="skill-icon">${ico("lock")}</span><span><strong>${RANKS[a.rank + 1].name} slot</strong><small>Unlocks at ${RANKS[a.rank + 1].name} rank.</small></span></div>` : ""}</div>
    <section class="card loadout-card"><h3>Saved skill setups</h3><p>Arrange the skills below, then save a setup. Athletes use the training setup at the club and the meet setup in competition.</p>
    ${["training", "meet"].map((mode) => `<div class="loadout-row"><span><strong>${mode === "training" ? "Training" : "Meet"}</strong><small>${a.loadouts?.[mode] == null ? "Not saved" : a.loadouts[mode].map((k) => esc(SKILLS[k].name)).join(" · ") || "No skills equipped"}</small></span>${btn("Save current", "save-loadout", `data-id="${a.id}" data-mode="${mode}"`, "subtle small")}</div>`).join("")}
    <label class="toggle"><input type="checkbox" data-change="loadouts" data-id="${a.id}" ${a.loadouts?.enabled ? "checked" : ""} ${a.loadouts?.training && a.loadouts?.meet ? "" : "disabled"}> Switch setups automatically</label>
    <small>${a.loadouts?.enabled ? "Saved setups are active. Save again after changing skills below." : "Save both setups to enable automatic switching."}</small></section>
    <div class="card-title"><h2>Learned</h2><span class="sp">${a.sp} SP</span></div>
    ${a.skills.map((k) => skillRow(a, k, a.equipped.includes(k) ? "Unequip" : a.equipped.length < slots ? "Equip" : "Slots full", "skill-toggle", !a.equipped.includes(k) && a.equipped.length >= slots)).join("") || "<p class='hint'>Nothing yet. Levels earn skill points.</p>"}
    <div class="card-title"><h2>Learn with skill points</h2></div>
    ${learnable
      .sort((x, y) => SKILLS[x].rank - SKILLS[y].rank || SKILLS[x].sp - SKILLS[y].sp)
      .map((k) => {
        const d = SKILLS[k],
          lock = d.rank > a.rank ? "Needs " + RANKS[d.rank].name : d.sp > a.sp ? d.sp + " SP" : null;
        return skillRow(a, k, lock || "Learn · " + d.sp + " SP", "learn", !!lock);
      })
      .join("")}`;
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
  return `${btn("‹ Squad", "back-squad", "", "text")}
  <div class="profile rarity-${a.rarity}">${portrait(a, "large")}<div>${eventChip(a.event)} ${rankChip(a)} ${rarityChip(a)}<h1>${esc(a.name)}</h1><p>Level ${a.level} · ${BACKGROUNDS[a.background].name} ${mood(a)}</p>${alerts(s, a)}</div>${ovrBadge(a)}</div>
  <label>Primary event<select data-change="athlete-event" data-id="${a.id}" ${s.match ? "disabled" : ""}>${EVENT_IDS.map(ev => `<option value="${ev}" ${a.event === ev ? "selected" : ""}>${EVENTS[ev].name} · OVR ${Math.round(G.eventRating(a, ev))}</option>`).join("")}</select></label>
  <p class="hint">Switching also selects the technical training event. Mastery and personal bests are kept; choose meet entries in the meet lobby.</p>
  <nav class="tabs">${tabs.map(([id, name]) => `<button data-act="tab" data-tab="${id}" class="${tab === id ? "active" : ""}">${name}</button>`).join("")}</nav>${body}`;
}
// ── Training ground ─────────────────────────────────────────────────────
const DRILL_ICONS = { indoor: "target", peer: "video", trial: "ball", lifting: "dumbbell", acceleration: "track", delivery: "target", review: "video", medicine: "ball" };
const plus = (n) => "+" + (Math.round(n * 10) / 10).toString();
const vital = (c) => (c.stat != null ? showStat(c.from) + " → " + showStat(c.to) : Math.round(c.from) + " → " + Math.round(c.to));
export const previewText = (changes) => changes.map((c) => (c.from != null ? c.label + " " + vital(c) : c.label)).join(" · ");
export function insightBanner(s) {
  return `<div class="insight-banner">${ico("idea")}<div><b>${s.coaching.insights}</b> Coaching Insights<small>The coach's notebook. +1 for every day of training, +4 to +9 from each meet review.</small></div></div>`;
}
function planForecast(s, a) {
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
// Training menu: each drill shows its level, what it raises for the chosen group and the shared bill.
function drillGrid(s, ids) {
  const group = ids.map((id) => s.roster.find((a) => a.id === id)).filter(Boolean),
    n = Math.max(1, group.length),
    lead = group[0];
  return `<div class="drill-grid">${Object.entries(G.DRILLS)
    .map(([id, d]) => {
      const problem = G.groupProblem(s, ids, id),
        level = G.drillLevel(s, id),
        next = G.DRILL_LEVELS[level],
        xp = G.drillXp(s, id),
        prev = G.DRILL_LEVELS[level - 1];
      const avg = [0, 1, 2, 3].map((i) => (group.length ? group.reduce((sum, a) => sum + G.drillGains(s, a, id, n)[i], 0) / group.length : 0));
      const ev = lead ? EVENTS[lead.trainingEvent || lead.event] : null;
      const pills = avg.map((g, i) => (d.gains[i] ? `<span class="gain" style="--c:${STAT_COLORS[i]}">${STAT_SHORT[i]} ${!group.length ? "↑" : g > 0.05 ? plus(g) : "max"}</span>` : "")).join("") + (["delivery", "review"].includes(id) ? `<span class="gain" style="--c:${ev?.color || "#c8a050"}">Mastery</span>` : "");
      return `<article class="drill ${problem ? "locked" : ""}" title="${esc(id === "delivery" && lead ? G.EVENT_DRILLS[lead.trainingEvent || lead.event] : d.desc || "")}">
        <div class="drill-top"><span class="drill-ico">${ico(DRILL_ICONS[id] || "levelup")}</span><span><strong>${esc(G.drillName(s, id))}</strong><span class="drill-lv">Lv ${level}${next != null ? `<span class="xp">${Array.from({ length: next - prev }, (_, k) => `<i class="${k < xp - prev ? "on" : ""}"></i>`).join("")}</span>` : " · MAX"}</span></span></div>
        <div class="gains">${pills}${n > 1 ? `<span class="gain bonus">Group +${(n - 1) * 10}%</span>` : ""}</div>
        <div class="drill-foot"><span class="cost ${s.coaching.insights < G.groupCost(id, n) ? "short" : ""}">${ico("idea")}${G.groupCost(id, n)}</span><span class="cost">${ico("bolt")}${G.drillEnergy(s, id)}</span>${btn("Go!", "coach-session", `data-ids="${ids.join(",")}" data-drill="${id}" ${problem ? "disabled" : ""}`, "small")}</div>
        ${problem && group.length ? `<small class="why">${esc(problem)}</small>` : ""}
      </article>`;
    })
    .join("")}</div>`;
}
const canTrain = (s, a) => !a.injury && a.coachedDay !== s.day;
export function trainees(s, view) {
  const picked = (view.trainees || []).filter((id) => s.roster.some((a) => a.id === id && canTrain(s, a)));
  if (picked.length) return picked;
  const first = s.roster.find((a) => canTrain(s, a));
  return first ? [first.id] : [];
}
function traineeCard(s, a) {
  return `<div class="mini-card">${portrait(a)}<div><strong>${esc(a.name)}</strong><small>${eventChip(a.trainingEvent || a.event)} ${mood(a)} ${ico("bolt")}${Math.round(a.stamina)}</small><span class="mini-stats">${a.stats.map((v, i) => `<i style="--c:${STAT_COLORS[i]}">${STAT_SHORT[i]} <b>${showStat(v)}</b>${grade(v)}</i>`).join("")}</span></div></div>`;
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
export function train(s, view) {
  const ids = trainees(s, view);
  const picked = ids.map((id) => s.roster.find((a) => a.id === id));
  const items = Object.keys(s.bag).filter((k) => ITEMS[k].kind === "use");
  return `${insightBanner(s)}
  <div class="card-title step"><h2><span class="step-no">1</span> Training group</h2><small class="hint">Up to 3. Each partner adds 10%</small></div>
  <div class="trainee-strip">${s.roster
    .map((b) => {
      const at = ids.indexOf(b.id),
        why = b.injury ? "Injured" : b.coachedDay === s.day ? "Done today" : "";
      return `<button class="trainee ${at >= 0 ? "on" : ""}" data-act="trainee" data-id="${b.id}" aria-pressed="${at >= 0}" ${why ? "disabled" : ""}>${portrait(b)}<span>${esc(b.name.split(" ")[0])}</span>${bar(b.stamina, 100, b.stamina < 30 ? "#e0604a" : "#6ac08a")}${at >= 0 ? `<i class="order">${at + 1}</i>` : ""}${why ? `<i class="done">${ico(b.injury ? "bandage" : "check")}</i><small>${why}</small>` : ""}</button>`;
    })
    .join("")}</div>
  ${picked.length ? `<div class="mini-cards">${picked.map((a) => traineeCard(s, a)).join("")}</div>` : `<p class="hint">Everyone has done their session. Press Train to roll on to tomorrow.</p>`}
  <div class="card-title step"><h2><span class="step-no">2</span> Today's session</h2><small class="hint">Sessions level up with reps</small></div>
  ${drillGrid(s, ids)}
  <div class="card-title"><h2>${ico("gift")} From the kit bag</h2>${btn("Kit shop", "page", 'data-page="shop"', "text")}</div>
  ${items.length ? `<div class="use-grid">${items.map((k) => `<button class="use-item rarity-${ITEMS[k].rarity}" data-act="use" data-item="${k}">${icon(k, 32)}<span><strong>${ITEMS[k].name} ×${s.bag[k]}</strong><small>${esc(ITEMS[k].desc)}</small></span></button>`).join("")}</div>` : `<p class="hint">Kit bag's empty. Drinks and shakes are in the kit shop.</p>`}
  <div class="card-title"><h2>${ico("calendar")} Daily plans</h2></div>
  <div class="plan-rows">${s.roster
    .map((a) => `<label class="plan-row">${portrait(a)}<span><strong>${esc(a.name.split(" ")[0])}</strong><small>${esc(shortForecast(s, a))}</small></span><select data-change="plan" data-id="${a.id}" aria-label="Daily plan for ${esc(a.name)}">${Object.entries(PLANS).filter(([id]) => !G.planProblem(s, a, id)).map(([id, p]) => `<option value="${id}" ${a.plan === id ? "selected" : ""}>${p.short || p.name}</option>`).join("")}</select></label>`)
    .join("")}</div>
  <p class="hint">Plans run every day the clock is ticking. Advanced blocks unlock with Insights on each athlete file.</p>`;
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
      return `<article class="result-row q-${r.quality}" style="--d:${k * 0.22}s">
        <div class="result-who">${portrait(a)}<div><strong>${esc(a.name)}</strong><span class="qbadge" style="--q:${QUAL[r.quality].color}">${QUAL[r.quality].name}</span></div></div>
        <div class="grows compact">${growRows(a, before)}</div>
        <p class="quote">“${esc(quoteFor(s, a, r.quality, k))}”</p>
        ${ups.length || r.mastery > 0 ? `<p class="ups">${[...ups, r.mastery > 0 ? `${EVENTS[a.trainingEvent || a.event].name} mastery +${r.mastery.toFixed(1)}` : ""].filter(Boolean).join(" · ")}</p>` : ""}
      </article>`;
    })
    .join("");
  const level = session.level,
    next = G.DRILL_LEVELS[level],
    prev = G.DRILL_LEVELS[level - 1];
  return `<div class="stage"><canvas class="stage-canvas" width="480" height="240" aria-label="Training scene"></canvas><span class="stage-tap">Tap to skip ▸</span></div>
  <div class="stage-results">
    ${session.levelUp ? `<div class="levelup-banner">${ico("levelup")} New session unlocked: <b>${esc(session.levelUp)}</b> (Lv ${level}, +8% gains)</div>` : ""}
    ${rows}
    <div class="drill-xp">${ico("dumbbell")} <span>${esc(G.DRILL_NAMES[session.drill][level - 1])} · Lv ${level}</span>${next != null ? `<span class="bar"><i style="width:${((session.xp - prev) / (next - prev)) * 100}%;--bar:#f2c94c"></i></span><small>${next - session.xp} reps to Lv ${level + 1}</small>` : "<small>Mastered</small>"}<small>${ico("idea")} −${session.cost}</small></div>
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

const skillIcon = (k) => `<span class="skill-icon c-${SKILLS[k].cat}">${ico({ train: "levelup", meet: "target", team: "heart", signature: "spark", unique: "star" }[SKILLS[k].cat])}</span>`;
function skillRow(a, k, label, act, disabled) {
  const d = SKILLS[k];
  return `<div class="skill-row ${a.equipped.includes(k) ? "on" : ""}">${skillIcon(k)}<span><strong>${d.name}</strong><small>${d.desc}</small></span>${btn(label, act, `data-id="${a.id}" data-skill="${k}" ${disabled ? "disabled" : ""}`, act === "learn" ? "primary small" : "subtle small")}</div>`;
}

// ── Scouting ────────────────────────────────────────────────────────────
export function recruit(s) {
  const full = s.roster.length >= G.rosterCap(s);
  const secrets = s.secretsOffered.filter((k) => !s.secretsSigned.includes(k));
  return `${btn("‹ Squad", "page", 'data-page="squad"', "text")}<p class="hint">Squad ${s.roster.length} / ${G.rosterCap(s)}. Rarer athletes have a higher potential and arrive knowing a skill.</p>
  ${secrets.length ? `<section class="card secret-card"><div class="card-title"><h2>${ico("star")} Special visitors</h2></div>${secrets.map((k) => `<div class="secret"><canvas class="portrait" width="48" height="48" data-secret="${k}" aria-hidden="true"></canvas><span><strong>${SECRETS[k].name}</strong><small>${EVENTS[SECRETS[k].event].name} · ${SKILLS[SECRETS[k].skill].name}: ${SKILLS[SECRETS[k].skill].desc}</small></span>${btn("Sign · " + cash(G.secretFee(s, k)), "sign-secret", `data-key="${k}" ${full || s.money < G.secretFee(s, k) ? "disabled" : ""}`, "small")}</div>`).join("")}</section>` : ""}
  <div class="prospects">${s.prospects
    .map((a) => {
      const cost = G.signCost(s, a);
      return `<article class="prospect rarity-${a.rarity}"><div class="prospect-head">${portrait(a)}<div>${eventChip(a.event)} ${rarityChip(a)}<h2>${esc(a.name)}</h2><small>${BACKGROUNDS[a.background].name} · potential ${Math.floor(a.potential)}</small></div>${ovrBadge(a)}</div>
      <div class="statline big">${a.stats.map((v, i) => `<i style="--c:${STAT_COLORS[i]}">${STAT_SHORT[i]} ${showStat(v)}</i>`).join("")}</div>
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
function stadiumCard(s, key, open) {
  const d = STADIUM[key],
    lvl = s.stadium[key],
    problem = G.stadiumProblem(s, key),
    cost = d.cost[lvl];
  return `<div class="stadium-row ${open ? "open" : ""}"><button class="stadium-head" data-act="spot" data-key="${key}">${ico(STADIUM_ICON[key])}<span><strong>${d.name}</strong><small>${esc(d.levels[lvl])}</small></span>${pips(lvl, d.max)}</button>
  ${open ? `<div class="stadium-detail"><p>${d.desc}</p>${key === "studio" && lvl ? facilityStaffPicker(s,"studio") : ""}${lvl < d.max ? `<p class="next">Next: <b>${esc(d.levels[lvl + 1])}</b></p>` : ""}${btn(problem === "Fully upgraded" ? "Fully upgraded" : problem ? esc(problem) : (lvl ? "Upgrade" : "Build") + " · " + cash(cost), "upgrade-spot", `data-key="${key}" ${problem ? "disabled" : ""}`)}</div>` : ""}</div>`;
}
export function build(s, view) {
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
      focus = `<article class="card facility"><div class="facility-head"><canvas class="building" width="104" height="66" data-building="${p.type}:${p.level}"></canvas><div><span class="eyebrow">LEVEL ${p.level} / 3</span><h2>${d.name}</h2><p>${d.desc}</p></div></div>
        ${facilityStaffPicker(s,"plot:"+i)}
        ${combos.length ? `<p class="combo-line">${combos.map((c) => ico("spark") + " " + c.name + ": " + c.desc).join("<br>")}</p>` : ""}
        <div class="inline">${btn(p.level >= 3 ? "Fully upgraded" : "Upgrade · " + cash(cost), "upgrade", `data-index="${i}" ${p.level >= 3 || s.money < cost ? "disabled" : ""}`)}${i !== CLUB_PLOT ? btn(view.moving === i ? "Cancel move" : "Move / swap", "move", `data-index="${i}"`, "subtle") : ""}${i !== CLUB_PLOT ? btn("Clear · +" + cash(d.cost / 2), "sell", `data-index="${i}"`, "subtle") : ""}</div></article>`;
    } else
      focus = `<div class="card-title"><h2>Build on this plot</h2>${btn("Close", "deselect", "", "text")}</div><div class="build-list">${Object.entries(FACILITIES)
        .filter(([id, d]) => id !== "club" && (d.decor || !s.plots.some((q) => q?.type === id)))
        .map(([id, d]) => {
          const lock = s.league < d.league ? "Unlocks in the " + LEAGUES[d.league].name : d.needsTitle && !s.trophies.length ? "Needs a title" : null;
          return `<button class="build" data-act="build" data-index="${i}" data-type="${id}" ${lock || s.money < d.cost ? "disabled" : ""}><canvas class="building" width="104" height="66" data-building="${id}:1"></canvas><span><strong>${d.name}</strong><small>${d.desc}</small><b>${lock || cash(d.cost)}</b></span></button>`;
        })
        .join("")}</div>`;
  }
  const openKey = sel?.kind === "stadium" ? sel.key : null;
  return `${view.moving != null ? `<p class="banner-note">${ico("build")} Tap a plot on the map to move or swap. Moving is free.</p>` : ""}${focus}
  <div class="card-title"><h2>${ico("stadium")} The stadium</h2><span class="hint-inline">Tap a part to upgrade</span></div>
  <div class="stadium-list">${STADIUM_IDS.map((k) => stadiumCard(s, k, k === openKey)).join("")}</div>
  <div class="card-title"><h2>${ico("build2")} Around the stadium</h2><span class="hint-inline">${G.unlockedPlots(s).length} of 13 plots open</span></div>
  <div class="plot-list">${s.plots
    .map((q, n) => {
      const open = G.plotUnlocked(s, n);
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
export function shop(s, view) {
  const tab = view.shopTab || "shop";
  const stock = G.shopStock(s);
  const nextTier = SHOP_TIERS.find((t) => t > s.fans);
  let body;
  if (tab === "shop") {
    const groups = [
      ["Fuel & recovery", "Handed over at the side of the track.", (d) => d.kind === "use"],
      ...EVENT_IDS.map(ev => [EVENTS[ev].name + " implements", "Bonuses apply only to this event. Other events use club issue.", d => d.slot === "implement" && d.event === ev]),
      ["General implements", "One per thrower. Swap any time from the kit bag.", d => d.slot === "implement" && !d.event],
      ["Throwing shoes & spikes", "", (d) => d.slot === "shoes"],
      ["Lucky charms", "", (d) => d.slot === "charm"],
    ];
    body = `${s.saleDay === s.day ? `<div class="sale">Clearance day: 30% off everything!</div>` : ""}${groups
      .map(([name, sub, f]) => {
        const items = stock.filter((k) => f(ITEMS[k]));
        return items.length ? `<div class="card-title"><h2>${name}</h2></div>${sub ? `<p class="hint">${sub}</p>` : ""}<div class="item-grid">${items.map((k) => shopCard(s, k)).join("")}</div>` : "";
      })
      .join("")}<p class="hint">${nextTier ? "New stock arrives at " + nextTier.toLocaleString() + " fans (you have " + s.fans.toLocaleString() + ")." : "Full catalogue in stock."} The rarest gear can't be bought: win it at meets, from merchants and through goals.</p>`;
  } else {
    const ids = Object.keys(s.bag);
    const uses = ids.filter((k) => ITEMS[k].kind === "use"),
      gear = ids.filter((k) => ITEMS[k].kind === "gear");
    const worn = s.roster.flatMap((a) => GEAR_SLOTS.map((slot) => a.gear[slot] && [a.gear[slot], a]).filter(Boolean));
    body = `${ids.length ? "" : "<p class='hint'>The kit bag is empty.</p>"}
    ${uses.length ? `<div class="card-title"><h2>Fuel & recovery</h2></div><div class="item-grid">${uses.map((k) => itemCard(s, k, "use")).join("")}</div>` : ""}
    ${gear.length ? `<div class="card-title"><h2>Spare gear</h2></div><div class="item-grid">${gear.map((k) => itemCard(s, k, "equip")).join("")}</div>` : ""}
    ${worn.length ? `<div class="card-title"><h2>Being worn</h2></div>${worn.map(([k, a]) => `<div class="history"><span>${esc(ITEMS[k].name)}${s.forge[k] ? " +" + s.forge[k] : ""}</span><b>${esc(a.name)}</b></div>`).join("")}` : ""}
    ${G.facilityLevel(s, "workshop") ? `<div class="card-title"><h2>Kit Workshop · forging</h2></div><p class="hint">Each forge level adds +0.6% distance to every copy of that item.</p><div class="item-grid">${[...new Set([...gear, ...worn.map(([k]) => k)])].map((k) => `<div class="item-card rarity-${ITEMS[k].rarity}">${icon(k)}<span><strong>${ITEMS[k].name}${s.forge[k] ? " +" + s.forge[k] : ""}</strong><small>${(s.forge[k] || 0) >= 3 ? "Fully forged." : "Next: +" + ((s.forge[k] || 0) + 1)}</small></span>${btn((s.forge[k] || 0) >= 3 ? "Max" : "Forge · " + cash(G.forgeCost(s, k)), "forge", `data-item="${k}" ${(s.forge[k] || 0) >= 3 || s.money < G.forgeCost(s, k) ? "disabled" : ""}`, "subtle small")}</div>`).join("")}</div>` : `<p class="hint">Build a Kit Workshop to forge your gear.</p>`}`;
  }
  return `<div class="wallet"><span>${ico("coin")} <b>${cash(s.money)}</b></span><span>${ico("idea")} <b>${s.coaching.insights}</b> Insights</span></div><nav class="tabs"><button data-act="shop-tab" data-tab="shop" class="${tab === "shop" ? "active" : ""}">Shop</button><button data-act="shop-tab" data-tab="bag" class="${tab === "bag" ? "active" : ""}">Kit bag · ${Object.values(s.bag).reduce((n, v) => n + v, 0)}</button></nav>${body}`;
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

function masteryCard(s,a) {
  return `<section class="card"><h3>Event mastery</h3><p>${G.PROFILES[a.profile].name}: ${G.PROFILES[a.profile].desc}</p><label>Technical training event<select data-change="training-event" data-id="${a.id}">${EVENT_IDS.map(ev=>`<option value="${ev}" ${(a.trainingEvent||a.event)===ev?"selected":""}>${EVENTS[ev].name}</option>`).join("")}</select></label><p>Physical attributes transfer. Technique practice builds mastery in the selected event; competing raises its practice ceiling, even after a loss.</p>${EVENT_IDS.map(ev=>`<div class="goal"><div><strong>${EVENTS[ev].name}</strong><small>Mastery ${Math.floor(G.masteryOf(a,ev))} · practice ceiling ${G.masteryCap(a,ev)} · ${a.eventMeets[ev]} meets</small>${bar(G.masteryOf(a,ev),100,EVENTS[ev].color)}</div></div>`).join("")}</section>`;
}
function approachPicker(a,ev) {
  return `<label>${EVENTS[ev].name} approach<select data-change="approach" data-id="${a.id}" data-event="${ev}">${G.APPROACHES[ev].map(d=>`<option value="${d.id}" ${a.approaches[ev]===d.id?"selected":""} ${G.approachProblem(a,ev,d.id)?"disabled":""}>${d.name}${d.needs?" · mastery "+d.needs:""}</option>`).join("")}</select></label>`;
}
function targetText(t) {
  if(!t)return "No scoring place to chase; bank a mark or protect the lead.";
  if(t.legal)return "Establish a legal mark to join the scoring.";
  return `${t.delta!=null?"Another "+t.delta.toFixed(2)+" m":"Target "+mark(t.mark)} moves into place ${t.place}${t.qualification?" and reaches the final":""}${t.swing>0?" · team-point swing +"+t.swing:""}.`;
}
function developmentCard(a, all = false) {
  const earned = a.development?.claimed || [];
  const upcoming = G.DEVELOPMENT.filter((d) => !earned.includes(d.id));
  const list = all ? G.DEVELOPMENT : upcoming.slice(0, 2);
  const labels = { meets: "meets", clean: "valid throws", pbs: "personal bests", wins: "event wins" };
  return `<section class="card development-card"><div class="card-title"><h3>A career built here</h3><small>${earned.length} / ${G.DEVELOPMENT.length}</small></div>
  ${list.map((d) => `<div class="goal ${earned.includes(d.id) ? "done" : ""}"><div><strong>${earned.includes(d.id) ? "✓ " : ""}${d.name}</strong><small>${G.developmentProgress(a, d)} / ${d.target} ${labels[d.field]}</small>${bar(G.developmentProgress(a, d), d.target, "#8cc152")}</div><span class="reward">${d.reward}</span></div>`).join("") || "<p>A club great. Every milestone earned.</p>"}<p class="hint">Milestones are awarded automatically through competition.</p></section>`;
}
function competitionBoard(s, view) {
  const planning = s.phase === "planning";
  const active = s.competition;
  return `<section class="card calendar-intro"><span class="eyebrow">THE COMPETITION CIRCUIT</span><h2>Choose your next challenge</h2><p>Duels are single meets. Leagues draw three opponents from six division clubs, with three fixtures and a final for the top two. Draws change across stages and seasons. Win Open, Challenger, then Championship to earn the next level's invitation.</p>
    <div class="calendar-options"><label>Prepare before the first meet<select data-change="booking-preparation" ${planning ? "" : "disabled"}>${[3,5,7,10].map((n) => `<option value="${n}" ${(view.preparation || 5) === n ? "selected" : ""}>${n} days</option>`).join("")}</select></label><label>Days between league meets<select data-change="booking-spacing" ${planning ? "" : "disabled"}>${[4,7,10].map((n) => `<option value="${n}" ${(view.spacing || 7) === n ? "selected" : ""}>${n} days</option>`).join("")}</select></label></div>
    ${active ? `<p class="booking-summary"><b>${esc(G.competitionName(s))}</b> · ${s.phase === "seasonEnd" ? "Complete — review your season to book again." : "Next meet: day " + s.matchDay + (active.kind === "league" ? " · " + active.spacing + " days between fixtures" : "")}</p><div class="inline">${btn(s.phase === "seasonEnd" ? "Season review" : "Back to preparations", "page", 'data-page="home"', "subtle")}${s.fixture === 0 && !s.results.length && s.day < s.matchDay ? btn("Cancel booking", "cancel-booking", "", "subtle") : ""}</div>` : "<p class='hint'>Entry's free. Training carries on between meets (so do wages), and every earlier competition stays open.</p>"}
  </section>
  ${LEAGUES.map((tier, i) => `<details class="card circuit-tier" ${i === s.league ? "open" : ""}><summary>${tier.name} <span>${i > s.league ? "Invitation locked" : s.circuit.cleared.filter((k) => k.startsWith(i + ":")).length + " / 3 trophies"}</span></summary>
    ${i > s.league ? `<p>Win the ${LEAGUES[i - 1].name} Championship to earn this invitation. ${esc(LEAGUES[i].unlock)}</p>` : `<div class="competition-grid">${G.CIRCUIT_STAGES.map((stage, j) => {
      const problem = G.entryProblem(s, "league", i, j), cleared = s.circuit.cleared.includes(G.circuitKey(i, j));
      return `<article class="competition-card ${cleared ? "completed" : ""}"><span class="eyebrow">${cleared ? "TROPHY WON · REPLAYABLE" : "LEAGUE TOURNAMENT"}</span><h3>${stage}</h3><p>${G.CIRCUIT_FORMATS[j]}</p><small>First title gift: ${ITEMS[G.TITLE_GIFTS[j]].name}</small><small>${j < 2 ? "First title: " + G.CIRCUIT_STAGES[j + 1] + " invitation" : i < 4 ? "First title: " + LEAGUES[i + 1].name + " invitation" : "Become champions of the world"}</small>${btn(cleared ? "Enter again" : "Enter league", "book-league", `data-tier="${i}" data-stage="${j}" ${problem ? "disabled" : ""}`)}${problem && planning ? `<p class="hint">${esc(problem)}</p>` : ""}</article>`;
    }).join("")}</div><h3>Duel meets</h3><p class="hint">A first win over each club earns a bonus and a skill scroll. Repeat duels offer smaller match rewards and experience; league invitations come from trophies.</p><div class="duel-list">${CLUBS[i].map((c, j) => `<article class="duel-card"><span><strong>${esc(c.name)}</strong><small>${esc(c.style)}</small><small>${s.circuit.duels.includes(i + ":" + j) ? "First-win reward earned" : "First-win reward available"}</small></span>${btn("Book duel", "book-duel", `data-tier="${i}" data-rival="${j}" ${G.entryProblem(s, "duel", i, 0, j) ? "disabled" : ""}`, "subtle")}</article>`).join("")}</div>`}</details>`).join("")}`;
}

// ── League ──────────────────────────────────────────────────────────────
export function league(s, view) {
  return `${competitionBoard(s, view)}<div class="journey">${LEAGUES.map((l, i) => `<div class="${i === s.league ? "current" : i < s.league ? "passed" : ""}"><span>${i < s.league ? ico("check") : i + 1}</span><small>${l.name.replace(" League", "")}</small></div>`).join("")}</div>
  ${s.competition?.kind === "league" ? `<h3>${esc(G.competitionName(s))} standings</h3><div class="table-wrap"><table><thead><tr><th>Club</th><th>P</th><th>+/−</th><th>Pts</th></tr></thead><tbody>${G.table(s).map((c, i) => `<tr class="${c.id === "us" ? "us" : ""}"><td><span class="pos">${i + 1}</span><i class="dot" style="--c:${c.id === "us" ? s.colors.primary : c.color}"></i>${esc(c.name)}</td><td>${c.played}</td><td>${c.diff > 0 ? "+" : ""}${c.diff}</td><td><b>${c.points}</b></td></tr>`).join("")}</tbody></table></div>
  <p class="hint">Three fixtures. The top two clubs qualify for a championship: three qualifying throws, then three more for the top four athletes per event. Marks carry forward.</p>` : ""}
  <div class="card-title"><h2>Scouted rivals</h2></div>
  ${s.clubs
    .map((c, ci) => {
      const r = s.results.find((x) => x.kind === "league" && x.name === c.name);
      const open = view.rival === c.id;
      return `<div class="rival ${open ? "open" : ""}" style="--c:${c.color}"><button class="rival-head" data-act="rival" data-id="${c.id}"><span class="crest" style="--rival:${c.color}">${esc(c.name[0])}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.style)}</small></span><b>${r ? (r.win ? "W " : r.draw ? "D " : "L ") + r.score + "–" + r.against : ci === s.fixture ? "NEXT" : ci < s.fixture ? "—" : "Fixture " + (ci + 1)}</b></button>
      ${open ? `<div class="rival-squad">${c.athletes.map((a, i) => `<div class="rival-athlete">${rivalPortrait(c.id, i)}<span><strong>${esc(a.name)}</strong><small>${EVENTS[a.event].name} · ~${mark(G.rawMark(a, a.event))}</small><small>${a.skills.map((k) => SKILLS[k].name).join(" · ") || "No skills"} · ${esc(G.PROFILES[a.profile].name)} · mastery ${Math.floor(G.masteryOf(a,a.event))} · ${Object.values(a.gear).filter(Boolean).map(k=>ITEMS[k].name).join(" / ")}</small></span>${ovrBadge(a)}</div>`).join("")}</div>` : ""}</div>`;
    })
    .join("")}
  <div class="card-title"><h2>Club records</h2></div><div class="records">${EVENT_IDS.map((ev) => `<span>${EVENTS[ev].name}<b>${s.records[ev] ? mark(s.records[ev].mark) : "—"}</b><small>${s.records[ev] ? esc(s.records[ev].name) + " · S" + s.records[ev].season : ""}</small></span>`).join("")}</div>
  <div class="card-title"><h2>${ico("trophy")} Trophy cabinet</h2></div><div class="trophies">${s.trophies.length ? s.trophies.map((t) => `<div>${ico("trophy", "big")}<strong>${LEAGUES[t.league].name} · ${G.CIRCUIT_STAGES[t.stage ?? 2]}</strong><small>Season ${t.season}</small></div>`).join("") : "<p class='hint'>A space is waiting for the first one.</p>"}</div>`;
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
  ${CUSTOM_IDS.map((cat) => `<h3 class="look-title">${CUSTOMISE[cat].name}</h3><div class="look-row">${Object.entries(CUSTOMISE[cat].options).map(([key, o]) => {
    const owned = G.ownsCustom(s, cat, key),
      used = G.selectedCustom(s, cat) === key,
      lock = G.customLock(s, cat, key),
      problem = G.customProblem(s, cat, key);
    return `<button class="look-opt ${used ? "selected" : ""} ${lock ? "locked" : ""}" data-act="${owned ? "use-look" : "buy-look"}" data-cat="${cat}" data-key="${key}" ${!owned && problem ? "disabled" : ""}><i class="sw" style="background:${swatch(s, cat, key)}"></i><strong>${esc(o.name)}</strong><small>${owned ? (used ? "In use" : "Owned") : lock ? ico("lock") + " " + esc(lock) : cash(o.cost)}</small></button>`;
  }).join("")}</div>`).join("")}
  <label class="stadium-name">Stadium name<input data-change="stadium-name" maxlength="24" placeholder="${esc(s.clubName)}" value="${esc(s.stadiumStyle.name)}"></label>`;
}
export function club(s, meta) {
  const set = s.settings;
  const toggle = (key, label, help) => `<label class="toggle"><input type="checkbox" data-change="setting" data-key="${key}" ${set[key] ? "checked" : ""}> ${label}${help ? `<small>${help}</small>` : ""}</label>`;
  const done = G.GOALS.filter((g) => s.goals.includes(g.id)).length;
  return `<form id="clubNameForm" class="name-form"><label>Club name<input maxlength="24" name="name" value="${esc(s.clubName)}" required></label><button class="button subtle" type="submit">Save</button></form>
  <div class="card-title"><h2>Club colours</h2></div><div class="palettes">${CLUB_PALETTES.map((p, i) => `<button class="palette ${s.colors.primary === p.primary && s.colors.secondary === p.secondary ? "selected" : ""}" data-act="palette" data-index="${i}" title="${p.name}"><i style="background:${p.primary}"></i><i style="background:${p.secondary}"></i></button>`).join("")}</div>
  ${lookCard(s)}
  <div class="card-title"><h2>Sponsor</h2>${s.sponsorLocked ? chip("Locked this season", "#9aa58f") : chip("Choose before the first meet", "#e2b04a")}</div>
  <div class="sponsors">${Object.entries(SPONSORS).map(([id, d]) => `<button class="sponsor ${s.sponsor === id ? "selected" : ""}" data-act="sponsor" data-value="${id}" ${s.sponsorLocked || s.fans < d.fans ? "disabled" : ""}><strong>${d.name}</strong><small>${d.desc}</small>${s.fans < d.fans ? `<em>${d.fans.toLocaleString()} fans</em>` : ""}</button>`).join("")}</div>
  <p class="hint">Weekly: income ${cash(G.weeklyIncome(s))}, wages ${cash(G.wages(s))}. Visitors spend at the café and merch stand every day.</p>
  <details class="card" open><summary>${ico("target")} Club goals · ${done} / ${G.GOALS.length}</summary>${G.GOALS.map((g) => (s.goals.includes(g.id) ? `<div class="goal done"><div><strong>${ico("check")} ${esc(g.name)}</strong><small>${esc(g.desc)}</small></div><span class="reward">${esc(G.rewardText(g.reward))}</span></div>` : goalRow(s, g))).join("")}</details>
  <details class="card"><summary>${ico("trophy")} Hall of fame</summary>${s.awardHistory.length ? s.awardHistory.slice(0, 20).map((w) => `<div class="history"><span>Season ${w.season} · ${esc(w.award)}</span><b>${esc(w.name)}</b></div>`).join("") : "<p class='hint'>Season awards appear here.</p>"}${s.alumni.length ? `<div class="card-title"><h2>Alumni</h2></div>${s.alumni.map((a) => `<div class="history"><span>${esc(a.name)} · ${EVENTS[a.event].name}</span><b>${a.pb[a.event] ? mark(a.pb[a.event]) : "—"}</b></div>`).join("")}` : ""}</details>
  <div class="card-title"><h2>Settings</h2></div>
  ${toggle("clutch", "Pause for clutch moments", "Your last attempt when behind, even while watching.")}
  ${toggle("manualRelease", "Manual release timing", "Tap on the gold zone for up to +2% when you coach a throw.")}
  ${toggle("sound", "Sound effects")}
  ${toggle("reducedMotion", "Reduce motion", "Fewer particles and shorter celebrations.")}
  <div class="card-title"><h2>Save & transfer</h2></div><div class="inline">${btn("Export club", "export", "", "subtle")}${btn("Import club", "import", "", "subtle")}${btn("How to play", "help", "", "subtle")}</div>
  <p class="hint">Export before switching devices. Game ${esc(meta.version)} · ${esc(meta.status)}</p>
  <div class="inline">${btn("Check for updates", "check-update", "", "subtle")}${btn("Apply downloaded update", "apply-update", meta.pending ? "" : "disabled", "subtle")}</div>`;
}

// ── Meet lobby ──────────────────────────────────────────────────────────
export function lobby(s) {
  const m = G.opponent(s),
    problem = G.lineupProblem(s);
  return `<p class="lobby-sub"><b>vs ${esc(m.name)}</b> · ${esc(m.style)} · ${s.fixture === 3 ? "3 qualifying throws + 3 final throws for the top four" : "3 throws per athlete"} · ${s.fixture === 3 ? "neutral venue" : s.competition?.kind === "duel" ? "at home" : (s.competition?.stage === 2 ? s.fixture !== 2 : s.fixture === 1) ? "away" : "at home"}</p>
  <div class="lineup">${EVENT_IDS.map((ev, i) => {
    const a = s.roster.find((x) => x.id === s.lineup[ev]),
      r = m.athletes[i],
      mine = a ? G.forecast(s, a, ev, { doubleDuty: G.usesOf(s, a.id) > 1 }) : 0,
      theirs = G.rawMark(r, ev) * G.MOOD_MARK[2];
    const edge = mine / theirs - 1;
    return `<div class="lineup-row"><div class="lineup-event">${eventChip(ev)}<span class="edge">${ico(edge > 0.01 ? "up" : edge < -0.01 ? "down" : "even")} ${Math.abs(edge * 100).toFixed(1)}%</span></div>
      <div class="lineup-us">${a ? portrait(a) : ""}<span><select data-change="lineup" data-event="${ev}">${s.roster.map((x) => `<option value="${x.id}" ${x.id === s.lineup[ev] ? "selected" : ""} ${x.injury ? "disabled" : ""}>${esc(x.name)}${x.event === ev ? " (specialist)" : ""}${x.injury ? " (injured)" : ""}</option>`).join("")}</select><small>${a ? mood(a) + " Stamina " + Math.round(a.stamina) + " · ~" + mark(mine) : ""}</small></span></div>
      <div class="lineup-them">${rivalPortrait(m.id, i)}<span><strong>${esc(r.name)}</strong><small>OVR ${G.overall(r)} · ~${mark(theirs)}${r.skills.length ? " · " + r.skills.length + " skill" + (r.skills.length > 1 ? "s" : "") : ""}</small></span></div></div>`;
  }).join("")}</div>
  ${problem ? `<p class="warning">${esc(problem)}</p>` : ""}
  ${s.roster.filter(a=>EVENT_IDS.some(ev=>G.entriesOf(s,ev).includes(a.id))).map(a=>`<details class="card"><summary>${esc(a.name)} · event approaches</summary>${EVENT_IDS.filter(ev=>G.entriesOf(s,ev).includes(a.id)).map(ev=>approachPicker(a,ev)).join("")}</details>`).join("")}
  <p class="hint">Individual places score 5–3–1; all-foul entries score zero. Ties use the second-best throw, then the next; identical series share points. Enter up to three athletes per event, two events per athlete. Leave events empty to concentrate your squad.</p>
  <div class="entry-grid">${EVENT_IDS.map((ev) => `<section class="card"><h3>${EVENTS[ev].name} entries</h3>${[0,1,2].map((slot) => `<label>Entry ${slot+1}<select data-change="entry" data-event="${ev}" data-slot="${slot}"><option value="0">No entry</option>${s.roster.map((a) => `<option value="${a.id}" ${G.entriesOf(s,ev)[slot] === a.id ? "selected" : ""} ${a.injury ? "disabled" : ""}>${esc(a.name)}</option>`).join("")}</select></label>`).join("")}</section>`).join("")}</div>
  <div class="inline">${btn("Auto-pick best lineup", "autolineup", "", "subtle")}${s.roster.some((a) => a.injury) ? btn("Medical postponement (+1 day)", "medical", "", "subtle") : ""}</div>
  <div class="quick-items">${["drink", "cake", "feast", "icebath", "goldchalk"].filter((k) => s.bag[k]).map((k) => `<button class="use-item" data-act="use" data-item="${k}">${icon(k, 24)}<span><strong>${ITEMS[k].name} ×${s.bag[k]}</strong><small>${ITEMS[k].desc}</small></span></button>`).join("")}</div>
  <div class="card-title"><h2>How do you want to run it?</h2></div>
  <div class="modes">${["watch", "coach"].map((mode) => `<button class="mode ${s.settings.meetMode === mode ? "selected" : ""}" data-act="meet-mode" data-value="${mode}"><strong>${ico(mode === "watch" ? "eye" : "clipboard")} ${mode === "watch" ? "Watch" : "Coach"}</strong><small>${mode === "watch" ? "Athletes choose their approach. Clutch pauses are optional in Settings." : "You choose the approach for every one of your throws."}</small></button>`).join("")}</div>
  ${btn(ico("stadium") + " Start the meet", "enter", problem ? "disabled" : "")}`;
}

// ── Live meet ───────────────────────────────────────────────────────────
// The strip along the bottom of the stadium during a meet.
function meetAthlete(s, side, id) {
  const athletes = side === "home" ? s.roster : (s.clubs.find(c => c.id === s.match.opponentId)?.athletes || []);
  const athlete = athletes.find(a => a.id === id);
  return { athlete, face: !athlete ? "" : side === "home" ? portrait(athlete) : rivalPortrait(s.match.opponentId, athletes.indexOf(athlete)) };
}
function resultTable(s, event) {
  const rows = event.placings.length ? event.placings : ["home", "away"].map((side, i) => {
    const a = side === "home" ? G.homeAthlete(s, EVENT_IDS.indexOf(event.event)) : G.rivalAthlete(s, EVENT_IDS.indexOf(event.event));
    const marks = (side === "home" ? s.match.homeMarks : s.match.awayMarks)[EVENT_IDS.indexOf(event.event)];
    return { side, id: a.id, marks, mark: G.best(marks), points: side === "home" ? event.h : event.a, place: null };
  });
  return `<article class="event-scorebook" style="--event-color:${EVENTS[event.event].color}">
    <header><h3>${EVENTS[event.event].name}</h3><span aria-label="Event points">${event.h} <small>–</small> ${event.a}</span></header>
    <table class="placing-table"><caption class="sr-only">${EVENTS[event.event].name} individual results</caption><colgroup><col class="col-place"><col><col class="col-mark"><col class="col-points"></colgroup><thead><tr><th scope="col">Pl.</th><th scope="col">Athlete</th><th scope="col">Best (m)</th><th scope="col">Pts</th></tr></thead><tbody>${rows.map(row => {
      const {athlete, face} = meetAthlete(s, row.side, row.id);
      const pb = s.match.rewards?.pbs?.some(p => p.id === row.id && p.event === event.event);
      return `<tr class="${row.side === "home" ? "our-athlete" : ""}"><td><b class="place place-${row.place}">${row.place || "—"}</b></td><th scope="row"><span class="result-athlete">${face}<span>${esc(athlete?.name || "Unknown athlete")}<small>${row.side === "home" ? "Your club" : esc(s.match.name)}${pb ? ' <em class="pb-tag">PB</em>' : ""}</small></span></span></th><td class="result-mark">${row.mark == null ? "NM" : row.mark.toFixed(2)}</td><td>${row.points}</td></tr>`;
    }).join("")}</tbody></table>
    <details class="throw-series"><summary>Throw series <span>${rows.length} athletes</span></summary>${rows.map(row => {
      const {athlete} = meetAthlete(s,row.side,row.id);
      return `<div class="series-row ${row.side === "home" ? "our-athlete" : ""}"><strong>${esc(athlete?.name)}</strong><span>${row.marks.map((v,i) => `<b title="Throw ${i+1}" class="${v == null ? "foul" : v === row.mark ? "best" : ""}">${v == null ? "X" : v.toFixed(2)}</b>`).join("") || "No throws"}</span></div>`;
    }).join("")}</details></article>`;
}
export function meetBar(s, view) {
  const m = s.match, i = m.eventIndex, ev = EVENT_IDS[i];
  const side = view.hide?.side || m.turnSide || (m.phase === "decide" ? "home" : m.last?.side) || "away";
  const a = side === "home" ? G.homeAthlete(s,i) : G.rivalAthlete(s,i);
  const {face} = meetAthlete(s,side,a.id);
  let marks = (side === "home" ? m.homeMarks : m.awayMarks)[i];
  if(view.hide?.side === side && view.hide.eventIndex === i) marks = marks.slice(0,view.hide.attempt);
  const rows = G.fieldLeaderboard(s,i,view.hide);
  return `<div class="meet-desk">
    <section class="current-thrower ${side === "home" ? "our-athlete" : ""}" aria-label="Current thrower">
      <div class="thrower-heading"><b>${EVENTS[ev].name}</b><span>${m.finalRound ? "Final round" : "Round " + Math.min(m.attempts,marks.length+1) + " / " + m.attempts}</span></div>
      <div class="thrower-identity">${face}<span><small>${side === "home" ? "YOUR CLUB" : esc(m.name)}</small><strong>${esc(a.name)}</strong><small>${G.equippedSkills(a,"meet").map(k=>esc(SKILLS[k].name)).join(" · ") || "OVR " + Math.round(G.eventRating(a,ev))}</small></span><b class="thrower-best">${G.best(marks) == null ? "—" : G.best(marks).toFixed(2)}<small>BEST · m</small></b></div>
      <div class="thrower-attempts" aria-label="Throw attempts">${Array.from({length:m.attempts},(_,k)=>`<span class="${k >= marks.length ? "pending" : marks[k] == null ? "foul" : ""}"><small>${k+1}</small><b>${k >= marks.length ? "·" : marks[k] == null ? "X" : marks[k].toFixed(2)}</b></span>`).join("")}</div>
    </section>
    <section class="live-standings" aria-label="Live standings"><header><strong>Event standings</strong><small>${m.finalRound ? "Final throws" : "Qualifying"}${ev === "discus" ? " · " + esc(m.wind || "calm") : ""} · 5–3–1 pts</small></header><div class="standings-list">${rows.map(row=>{
      const {athlete}=meetAthlete(s,row.side,row.id);
      return `<div class="standing ${row.side === "home" ? "our-athlete" : ""} ${row.side === side && row.id === a.id ? "throwing" : ""}"><b class="place place-${row.place}">${row.place || "—"}</b><span title="${esc(athlete?.name)}">${esc(athlete?.name)}${row.side === "home" ? '<small class="club-tag">YOU</small>' : ""}</span><strong>${row.mark == null ? "NM" : row.mark.toFixed(2)}</strong></div>`;
    }).join("")}</div></section>
  </div><div class="meet-toolbar"><div class="seg">${[1,2,4].map(n=>`<button class="${(view.meetSpeed||1) === n ? "active" : ""}" data-act="meet-speed" data-speed="${n}" aria-label="Meet speed ${n} times" aria-pressed="${(view.meetSpeed||1) === n}">${n}×</button>`).join("")}</div><div class="seg">${["watch","coach"].map(mode=>`<button class="${s.settings.meetMode === mode ? "active" : ""}" data-act="meet-mode" data-value="${mode}" aria-pressed="${s.settings.meetMode === mode}">${ico(mode === "watch" ? "eye" : "clipboard")} ${mode === "watch" ? "Watch" : "Coach"}</button>`).join("")}</div><button class="button subtle small" data-act="highlights" aria-pressed="${s.settings.highlights}">${s.settings.highlights ? "Highlights" : "Every throw"}</button>${btn(view.skipConfirm ? "Confirm skip" : "Skip", "skip", "", "subtle small")}</div>`;
}
export function meetScore(s) {
  const m = s.match,
    scores = G.eventScores(m);
  return `<div class="meet-score"><span class="side"><i class="dot" style="--c:${s.colors.primary}"></i>${esc(s.clubName)}</span><b>${m.score}</b><div class="event-chips">${scores.map((e, n) => `<span class="ev ${n === m.eventIndex && m.phase !== "complete" ? "now" : ""} ${e.done ? (e.h > e.a ? "won" : e.a > e.h ? "lost" : "tied") : ""}" style="--c:${EVENTS[e.event].color}">${EVENTS[e.event].short}<em>${e.done ? e.h + ":" + e.a : n === m.eventIndex ? "LIVE" : "·"}</em></span>`).join("")}</div><b>${m.against}</b><span class="side">${esc(m.name)}<i class="dot" style="--c:${m.color}"></i></span></div>`;
}
// The decision window for one of your throws.
export function decide(s, view) {
  const m = s.match,
    a = G.homeAthlete(s),
    P = G.projected(s, "home"),
    sigReady = G.canSignature(s, "home");
  if (view.meter)
    return `<div class="meter-panel"><span class="eyebrow">RELEASE ON THE GOLD</span><div class="meter"><span class="zone good"></span><span class="zone perfect" style="--w:${G.effects(s, a).perfect ? 22 : 14}%"></span><span id="needle"></span></div>${btn("Release!", "release")}<small>Tap Release, or press Space.</small></div>`;
  return `<div class="decide ${m.last?.clutch ? "clutch" : ""}"><p>${m.last?.clutch ? ico("bolt") + " <b>Clutch moment.</b> " : ""}${esc(a.name)} · projected ${mark(P)}. ${chip("Suggested: " + TACTICS[m.last?.recommended || "balanced"].name, "#88b0d0")}</p>
    <p class="scoring-target">${esc(targetText(G.fieldTarget(s)))}</p>${approachPicker(a,EVENT_IDS[m.eventIndex])}<p>${esc(G.APPROACHES[EVENT_IDS[m.eventIndex]].find(d=>d.id===a.approaches[EVENT_IDS[m.eventIndex]])?.desc)}${EVENT_IDS[m.eventIndex] === "discus" ? " · Conditions: "+esc(m.wind||"calm") : ""}</p>
    <div class="tactics">${Object.entries(TACTICS)
      .map(([id, t]) => {
        const p = G.throwPreview(s, id, "good", view.sig);
        return `<button class="tactic t-${id}" data-act="tactic" data-value="${id}"><strong>${t.name}</strong><small>${mark(p.low)} – ${mark(p.high)}</small><em>${Math.round(p.foul * 100)}% foul risk</em></button>`;
      })
      .join("")}</div>
    ${G.effects(s, a).sig ? `<label class="toggle sig"><input type="checkbox" data-change="sig" ${view.sig ? "checked" : ""} ${sigReady ? "" : "disabled"}> Use signature skill${sigReady ? "" : " (already used)"}</label>` : ""}
    <p class="hint">${m.homeMarks[m.eventIndex].some((x) => x != null) ? "A banked mark always counts, so a foul now only costs confidence." : "No mark yet: a foul here could cost the event."}</p></div>`;
}
function meetGrowth(s) {
  const r = s.match.rewards || {};
  const recorded = Array.isArray(r.athleteProgress);
  const ids = [...new Set(s.match.fields ? s.match.fields.flatMap(f => f.home.map(e => e.id)) : Object.values(s.match.lineup).filter(Boolean))];
  const progress = recorded ? r.athleteProgress : ids.map(id => ({id, name: s.roster.find(a=>a.id===id)?.name}));
  return `<section class="meet-growth"><header class="growth-intro"><h2>Every meet builds your athletes</h2><p>XP is earned once per athlete. Mastery grows in each event they entered.</p></header>${!recorded ? '<p class="hint">This older meet has no XP or attribute breakdown. Recorded mastery, PBs and milestones are shown below.</p>' : ""}<div class="growth-grid">${progress.map(p=>{
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
    ${pbs.map(d=>`<p class="growth-pb">PB · ${EVENTS[d.event].name} <b>${mark(d.mark)}</b>${d.delta ? ` (+${d.delta.toFixed(2)} m)` : " · First mark"}</p>`).join("")}
    ${milestones.map(d=>`<p class="growth-milestone"><b>${esc(d.milestone)}</b> · ${esc(d.reward)}</p>`).join("")}
    </article>`;
  }).join("")}</div></section>`;
}
export function meetComplete(s, view = {}) {
  const m = s.match,
    r = m.rewards || { items: [], pbs: [], levelUps: [], goals: [] },
    win = G.meetOutcome(m) > 0,
    draw = G.meetOutcome(m) === 0;
  const growth = view.resultView === "progress";
  const selected = EVENT_IDS.includes(view.resultEvent) ? view.resultEvent : "all";
  return `<header class="meet-verdict ${win ? "win" : draw ? "draw" : "loss"}"><div><span class="eyebrow">${m.kind === "final" ? "THE FINAL" : m.kind === "duel" ? "CLUB DUEL" : "LEAGUE FIXTURE"} · COMPLETE</span><h1>${win ? "Victory!" : draw ? "Honours even" : "Defeat"}</h1></div><div class="verdict-score"><span>${esc(s.clubName)}</span><b>${m.score} <small>–</small> ${m.against}</b><span>${esc(m.name)}</span></div></header>
  <div class="meet-payout"><span>${ico("coin")} <b>+${cash(r.money || 0)}</b></span><span>${ico("heart")} +${r.fans || 0} fans</span><span>${ico("idea")} +${r.insights || 0} Insights</span>${r.mvp ? `<span class="meet-mvp">${ico("star")} MVP <b>${esc(r.mvp.name)}</b></span>` : ""}</div>
  ${m.tieBreak ? '<p class="hint">Decided on distance tie-break.</p>' : ""}
  <nav class="meet-result-tabs" aria-label="Meet report"><button data-act="result-view" data-value="results" aria-pressed="${!growth}" class="${!growth?"active":""}">Results</button><button data-act="result-view" data-value="progress" aria-pressed="${growth}" class="${growth?"active":""}">Athlete growth${r.levelUps.length ? `<b>${r.levelUps.length} level-up${r.levelUps.length===1?"":"s"}</b>` : ""}</button></nav>
  ${growth ? meetGrowth(s) : `
  <nav class="result-filters" aria-label="Filter event results">${[["all","All events"],...EVENT_IDS.map(ev=>[ev,EVENTS[ev].name])].map(([id,label])=>`<button data-act="result-event" data-event="${id}" aria-pressed="${selected === id}" class="${selected === id ? "active" : ""}">${label}</button>`).join("")}<small><i></i> Your athletes · NM = no mark</small></nav>
  <div class="scorebook-grid ${selected !== "all" ? "single-event" : ""}">${G.eventScores(m).filter(e=>selected === "all" || e.event === selected).map(e=>resultTable(s,e)).join("")}</div>
  `}
  <details class="meet-reward-details"><summary>Meet rewards & development <span>${r.items.length} items · ${r.pbs.length} PBs · ${r.levelUps.length} level-ups</span></summary>
  <section class="card rewards"><div class="card-title"><h2>${ico("gift")} Rewards</h2></div>

    ${r.items.length ? `<div class="drops">${r.items.map((k, n) => `<div class="drop rarity-${ITEMS[k].rarity}" style="--delay:${n * 0.35 + 0.3}s">${icon(k, 40)}<strong>${ITEMS[k].name}</strong><small>${RARITY[ITEMS[k].rarity].name}</small></div>`).join("")}</div>` : ""}
    ${r.firstDuel ? `<p class="pb-line">First victory over this club! Bonus funds and a skill scroll earned.</p>` : ""}
    ${(r.mastery || []).map(d=>`<p class="pb-line">${esc(d.name)} · ${EVENTS[d.event].name} mastery +${d.gain.toFixed(1)} (${Math.floor(d.mastery)})</p>`).join("")}
    ${(r.development || []).map((d) => `<p class="pb-line">${ico("star")} ${esc(d.name)} · ${esc(d.milestone)} · ${esc(d.reward)}</p>`).join("")}
    ${r.pbs.map((p) => `<p class="pb-line">${ico("medal")} ${esc(p.name)} · ${EVENTS[p.event].name} PB ${mark(p.mark)}${p.delta ? " (+" + p.delta.toFixed(2) + ")" : ""}</p>`).join("")}
    ${r.levelUps.map((l) => `<p class="pb-line">${ico("levelup")} ${esc(l.name)} reached level ${l.level}</p>`).join("")}
    ${r.goals.map((id) => `<p class="pb-line">${ico("target")} Goal: ${esc(G.GOALS.find((g) => g.id === id)?.name)}</p>`).join("")}
  </section></details>
  ${growth ? btn(m.kind !== "duel" && (m.kind === "final" || s.fixture === 2) ? "See what comes next" : "Back to the club", "leave") : btn("Athlete growth →", "meet-progress")}`;
}

// ── Season end & awards ─────────────────────────────────────────────────
function seasonEnd(s) {
  const won = s.champion,
    aw = s.lastAwards;
  return `<div class="season-end ${won ? "won" : ""}"><div class="trophy">${ico(won ? "trophy" : "sprout", "huge")}</div>${heading("SEASON " + s.season + " COMPLETE", won ? G.competitionName(s) + " champions!" : "The next chapter is yours.", won ? "Title bonus " + cash(s.lastTitlePrize || 0) + " added." + (s.lastTitleGift ? " First-title gift: " + ITEMS[s.lastTitleGift].name + "." : "") : "Everything you built stays. A rebuild camp boosts key stats.")}
  ${aw?.list.length ? `<section class="card awards"><div class="card-title"><h2>${ico("medal")} Awards night</h2></div>${aw.list.map((w) => {
    const a = s.roster.find((x) => x.id === w.id);
    return `<div class="award">${a ? portrait(a) : ""}<span><small>${esc(w.award)}</small><strong>${esc(w.name)}</strong><em>${esc(w.value)}${w.sp ? " · +1 SP" : ""}${w.item ? " · " + ITEMS[w.item].name : ""}</em></span></div>`;
  }).join("")}</section>` : ""}
  <div class="facts"><span>Meet wins <b>${s.results.filter((r) => r.win).length}</b></span><span>Fans <b>${s.fans.toLocaleString()}</b></span><span>Titles <b>${s.trophies.length}</b></span></div>
  ${btn("Choose the next chapter", "season")}
  <p class="hint">${won ? "Your trophy stays. Return to the Meets board to see your invitations, replay a league or book a duel." : "Rebuild camp helps the squad recover. Choose when and where to compete again."}</p></div>`;
}
