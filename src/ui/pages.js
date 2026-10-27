import * as G from "../domain/game.js";
import {
  EVENTS,
  EVENT_IDS,
  LEAGUES,
  PLANS,
  RANKS,
  RARITY,
  BACKGROUNDS,
  SKILLS,
  SKILL_ICONS,
  ITEMS,
  FACILITIES,
  COMBOS,
  TACTICS,
  SPONSORS,
  SECRETS,
  SHOP_TIERS,
  STAT_NAMES,
  STAT_COLORS,
  GEAR_SLOTS,
  SLOT_NAMES,
  CLUB_PALETTES,
  showStat,
} from "../game-content.js";

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const cash = (n) => (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString();
export const mark = (n) => (n == null ? "FOUL" : n.toFixed(2) + " m");
const MOOD_FACE = ["😫", "😕", "😐", "🙂", "😄"];
export const moodFace = (a) => `<span class="mood m${G.moodOf(a)}" title="${G.MOODS[G.moodOf(a)]} condition">${MOOD_FACE[G.moodOf(a)]}</span>`;
export const portrait = (a, size = "", extra = "") => `<canvas class="portrait ${size}" width="${size === "large" ? 96 : 54}" height="${size === "large" ? 96 : 54}" data-portrait="${a.id}" ${extra} aria-hidden="true"></canvas>`;
const rivalPortrait = (clubId, i) => `<canvas class="portrait" width="54" height="54" data-rival="${clubId}:${i}" aria-hidden="true"></canvas>`;
export const icon = (id, size = 32) => `<canvas class="icon" width="${size}" height="${size}" data-icon="${id}" aria-hidden="true"></canvas>`;
const btn = (label, act, extra = "", kind = "primary") => `<button class="button ${kind}" data-act="${act}" ${extra}>${label}</button>`;
const chip = (text, color = "", cls = "") => `<span class="chip ${cls}" ${color ? `style="--chip:${esc(color)}"` : ""}>${esc(text)}</span>`;
const heading = (eyebrow, title, sub = "") => `<header class="page-head"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</header>`;
const bar = (value, max, color, label = "") => `<span class="bar" ${label ? `title="${esc(label)}"` : ""}><i style="width:${Math.max(0, Math.min(100, (value / max) * 100))}%;--bar:${color}"></i></span>`;
const rankChip = (a) => chip(RANKS[a.rank].name, ["#9aa58f", "#5aa4c8", "#8cc152", "#e2b04a", "#d070f0"][a.rank], "rank");
const rarityChip = (a) => (a.rarity !== "common" ? chip(RARITY[a.rarity].name, RARITY[a.rarity].color, "rarity") : "");
const eventChip = (ev) => chip(EVENTS[ev].short, EVENTS[ev].color);

function staminaBar(a) {
  return `<span class="mini-stat" title="Stamina ${Math.round(a.stamina)}">⚡${bar(a.stamina, 100, a.stamina < 30 ? "#e0604a" : "#6ac08a")}</span>`;
}
function athleteAlerts(s, a) {
  const out = [];
  if (a.injury) out.push(chip("Injured " + a.injury + "d", "#e0604a"));
  if (a.sp > 0 && Object.keys(SKILLS).some((k) => G.skillAvailable(a, k) && SKILLS[k].sp <= a.sp && SKILLS[k].rank <= a.rank)) out.push(chip(a.sp + " SP", "#b48ad8", "pulse"));
  if (!G.promoteProblem(s, a)) out.push(chip("Rank up!", "#e2b04a", "pulse"));
  return out.join("");
}

// ── Home: the coach's desk ──────────────────────────────────────────────
export function home(s, view) {
  if (s.phase === "seasonEnd") return seasonEnd(s);
  const opp = G.opponent(s),
    days = s.matchDay - s.day,
    ready = days <= 0;
  const goals = G.openGoals(s, 3);
  const playLabel = view.playing ? "❚❚ Pause training" : "▶ Train · " + days + (days === 1 ? " day" : " days") + " to the meet";
  return `
  ${heading("THE COACH'S DESK", ready ? "It's meet day!" : "Season " + s.season + " · " + LEAGUES[s.league].name, ready ? "Choose your four throwers and head to the stadium." : LEAGUES[s.league].tag)}
  <article class="fixture-card ${ready ? "ready" : ""}" style="--rival:${opp?.color || "#888"}">
    <div class="fixture-top"><span>${s.fixture === 3 ? "★ LEAGUE FINAL" : "FIXTURE " + (s.fixture + 1) + " / 3"}</span><b>${ready ? "MEET DAY" : days + (days === 1 ? " DAY" : " DAYS") + " TO GO"}</b></div>
    <div class="versus"><span class="crest home">${esc(s.clubName.slice(0, 1))}</span><div><small>NEXT OPPONENT</small><h2>${esc(opp?.name)}</h2><p>${esc(opp?.style || "")}</p></div><span class="crest away">${esc(opp?.name.slice(0, 1))}</span></div>
    ${ready ? btn("To the stadium →", "lobby") : btn(playLabel, view.playing ? "pause" : "play")}
    <div class="split">${btn("Advance one day", "day", ready || view.playing ? "disabled" : "", "subtle")}${btn("League table", "page", 'data-page="league"', "subtle")}</div>
  </article>
  <div class="budget"><span>Weekly <b class="${G.weeklyIncome(s) < G.wages(s) ? "neg" : ""}">${G.weeklyIncome(s) >= G.wages(s) ? "+" : ""}${cash(G.weeklyIncome(s) - G.wages(s))}</b> after wages</span><span>Visitors <b>${G.visitorsPerDay(s)}/day</b></span><span>Shop tier <b>${G.shopStock(s).length} items</b></span></div>
  <section class="card goals-card"><div class="card-title"><h2>Club goals</h2>${btn("All goals →", "page", 'data-page="club"', "text")}</div>
    ${goals.map((g) => goalRow(s, g)).join("") || "<p class='hint'>Every goal complete. Legendary!</p>"}
  </section>
  <div class="section-title"><h2>Squad training</h2><label class="bulk">Everyone <select data-change="bulk">${new Set(s.roster.map((a) => a.plan)).size > 1 ? "<option disabled selected>Mixed</option>" : ""}${Object.entries(PLANS).map(([id, p]) => `<option value="${id}" ${s.roster.every((a) => a.plan === id) ? "selected" : ""}>${p.name}</option>`).join("")}</select></label></div>
  <div class="roster-strip">${s.roster.map((a) => rosterRow(s, a)).join("")}</div>
  <p class="hint">Focused plans send athletes to their facility. Low stamina? They rest automatically. The two days before a meet are a taper.</p>
  <section class="card journal"><div class="card-title"><h2>Club journal</h2></div>${s.log.slice(0, 5).map((l) => `<p class="log ${l.kind}">${esc(l.text)}</p>`).join("")}</section>`;
}
function goalRow(s, g) {
  const p = G.goalProgress(s, g);
  return `<div class="goal"><div><strong>${esc(g.name)}</strong><small>${esc(g.desc)}</small>${bar(p, g.target, "#e2b04a")}</div><span class="reward">${esc(G.rewardText(g.reward))}</span></div>`;
}
function rosterRow(s, a) {
  const act = G.plannedActivity(s, a);
  return `<div class="roster-row rarity-${a.rarity}">
    <button class="who" data-act="athlete" data-id="${a.id}">${portrait(a)}<span><strong>${esc(a.name)}</strong><small>${EVENTS[a.event].name} · Lv ${a.level} ${moodFace(a)}</small></span></button>
    ${staminaBar(a)}
    <select data-change="plan" data-id="${a.id}" aria-label="Training plan for ${esc(a.name)}">${Object.entries(PLANS).map(([id, p]) => `<option value="${id}" ${a.plan === id ? "selected" : ""}>${p.name}</option>`).join("")}</select>
    <span class="doing">${act !== a.plan ? chip(act === "rest" ? "Resting" : act === "sharpen" ? "Tapering" : act === "injured" ? "Injured" : PLANS[act]?.short || act, "#88b0d0") : ""}${athleteAlerts(s, a)}</span>
  </div>`;
}

// ── Squad ───────────────────────────────────────────────────────────────
export function squad(s, view) {
  if (view.athlete) {
    const a = s.roster.find((x) => x.id === view.athlete);
    if (a) return athletePage(s, a, view);
  }
  return `${heading("PEOPLE MAKE A CLUB", "Your squad", s.roster.length + " / " + G.rosterCap(s) + " athletes · build a Dormitory for more room")}
  ${btn("Scout & recruit →", "page", 'data-page="recruit"')}
  <div class="squad-grid">${s.roster
    .map(
      (a) => `<button class="athlete-card rarity-${a.rarity}" data-act="athlete" data-id="${a.id}">
      ${portrait(a)}<span class="info"><strong>${esc(a.name)}</strong><small>${eventChip(a.event)} ${rankChip(a)} Lv ${a.level}</small>
      <span class="statline">${a.stats.map((v, i) => `<i style="--c:${STAT_COLORS[i]}">${showStat(v)}</i>`).join("")}</span></span>
      <span class="side">${moodFace(a)}${staminaBar(a)}${athleteAlerts(s, a)}</span></button>`,
    )
    .join("")}</div>
  <p class="hint">Specialists are strongest in their own event. Anyone can cover a second event at −10%. Mood (😫→😄) changes distance by up to ±5% and training by ±20%.</p>`;
}
function statRows(s, a) {
  const cap = G.capOf(a);
  return `<div class="stats">${a.stats
    .map(
      (v, i) => `<div class="stat"><span>${STAT_NAMES[i]}</span><span class="track"><i style="width:${v}%;--c:${STAT_COLORS[i]}"></i><s style="left:${cap}%" title="Cap ${showStat(cap)}"></s></span><b>${showStat(v)}</b></div>`,
    )
    .join("")}<p class="hint">Weights for ${EVENTS[a.event].name}: ${EVENTS[a.event].weights.map((w, i) => STAT_NAMES[i] + " " + Math.round(w * 100) + "%").join(" · ")}. The notch is this athlete's cap (${showStat(cap)}); rank-ups raise it.</p></div>`;
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
    body = `<div class="vitals"><div><span>Stamina</span>${bar(a.stamina, 100, a.stamina < 30 ? "#e0604a" : "#6ac08a")}<b>${Math.round(a.stamina)}</b></div><div><span>Condition ${moodFace(a)}</span>${bar(a.condition, 100, "#f0b04a")}<b>${G.MOODS[G.moodOf(a)]}</b></div><div><span>Level ${a.level}</span>${bar(a.xp, G.xpNeeded(a.level), "#b48ad8")}<b>${Math.floor(a.xp)}/${G.xpNeeded(a.level)}</b></div></div>
    ${statRows(s, a)}
    <article class="card rank-card"><div class="card-title"><h2>${RANKS[a.rank].name}${next ? " → " + next.name : ""}</h2>${rankChip(a)}</div>
      ${next ? `<p>Promotion raises the stat cap to <b>${showStat(Math.min(100, a.potential + next.cap))}</b>${next.slots > RANKS[a.rank].slots ? ", adds a <b>skill slot</b>" : ""}, gives +10 to every stat, 1 SP and a new look. Needs level ${next.level}${next.title ? " and a league title" : ""}. ${a.promoteFree ? "<b>Promotion Letter ready: free!</b>" : "Fee " + cash(next.cost) + "."}</p>${btn(problem ? problem : "Promote to " + next.name + " ✦", "promote", `data-id="${a.id}" ${problem ? "disabled" : ""}`)}` : "<p>The highest honour in the sport. A true Legend.</p>"}
    </article>
    <div class="explain"><b>${BACKGROUNDS[a.background].name}</b> — ${esc(BACKGROUNDS[a.background].story)} <em>${esc(BACKGROUNDS[a.background].desc)}.</em>${a.secret ? "<br><b>★ Secret character.</b> " + esc(SECRETS[a.secret].story) : ""}</div>
    <div class="facts"><span>Wage <b>${cash(G.wageOf(a))}/wk</b></span><span>Potential <b>${showStat(a.potential)}</b></span><span>Projected ${EVENTS[a.event].short} <b>${mark(G.forecast(s, a, a.event))}</b></span></div>`;
  }
  if (tab === "train") {
    const gains = G.trainingGains(s, a, a.plan);
    body = `<div class="plan-grid">${Object.entries(PLANS)
      .map(([id, p]) => {
        const lvl = p.facility ? G.facilityLevel(s, p.facility) : 0;
        const where = p.facility ? (lvl ? FACILITIES[p.facility].name + " Lv" + lvl + (p.stat != null ? " · +" + lvl * 25 + "%" : "") : p.stat != null ? "No " + FACILITIES[p.facility].name + " · −20%" : "Clubhouse") : id === "balanced" ? "Laps of the track" : "Throws drills";
        return `<button class="plan ${a.plan === id ? "selected" : ""}" data-act="plan" data-id="${a.id}" data-value="${id}"><strong>${p.name}</strong><small>${p.desc}</small><em>${where}</em></button>`;
      })
      .join("")}</div>
    <p class="hint">Today's plan earns about ${gains.map((g, i) => (g > 0.004 ? "+" + showStat(g) + " " + STAT_NAMES[i] : "")).filter(Boolean).join(", ") || "no stat growth"} and costs ${a.plan === "rest" ? "no" : Math.round(PLANS[a.plan].load * 13 * G.effects(s, a).stamina)} stamina.</p>
    <label class="toggle"><input type="checkbox" data-change="autorest" data-id="${a.id}" ${a.autoRest ? "checked" : ""}> Rest automatically below 25 stamina</label>
    <label class="toggle"><input type="checkbox" data-change="autotaper" data-id="${a.id}" ${a.autoTaper ? "checked" : ""}> Taper in the two days before a meet</label>`;
  }
  if (tab === "skills") {
    const slots = G.slotsOf(a);
    const learnable = Object.keys(SKILLS).filter((k) => G.skillAvailable(a, k));
    body = `<div class="slots">${Array.from({ length: slots }, (_, i) => {
      const k = a.equipped[i];
      return k ? `<div class="slot on"><span class="skill-icon c-${SKILLS[k].cat}">${SKILL_ICONS[SKILLS[k].cat]}</span><span><strong>${SKILLS[k].name}</strong><small>${SKILLS[k].desc}</small></span></div>` : `<div class="slot"><span class="skill-icon">+</span><span><strong>Empty slot</strong><small>Equip a learned skill below.</small></span></div>`;
    }).join("")}${RANKS[a.rank + 1] && RANKS[a.rank + 1].slots > slots ? `<div class="slot locked"><span class="skill-icon">🔒</span><span><strong>${RANKS[a.rank + 1].name} slot</strong><small>Unlocks at ${RANKS[a.rank + 1].name} rank.</small></span></div>` : ""}</div>
    <div class="card-title"><h2>Learned</h2><span class="sp">${a.sp} SP</span></div>
    ${a.skills.map((k) => skillRow(a, k, a.equipped.includes(k) ? "Unequip" : a.equipped.length < slots ? "Equip" : "Slots full", "skill-toggle", !a.equipped.includes(k) && a.equipped.length >= slots)).join("") || "<p class='hint'>Nothing yet. Level up to earn skill points.</p>"}
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
      return `<div class="gear-slot">${d ? icon(id, 40) : `<span class="empty-icon">${slot === "implement" ? "◉" : slot === "shoes" ? "👟" : "✧"}</span>`}<div><span class="eyebrow">${SLOT_NAMES[slot]}</span><strong>${d ? d.name + (s.forge[id] ? " +" + s.forge[id] : "") : slot === "implement" ? "Club issue" : "Nothing"}</strong><small>${d ? d.desc : "No bonus."}</small>
        <div class="inline">${d ? btn("Unequip", "gear-off", `data-id="${a.id}" data-slot="${slot}"`, "subtle") : ""}${options.map((k) => btn(icon(k, 16) + " " + ITEMS[k].name, "gear-on", `data-id="${a.id}" data-item="${k}"`, "subtle small")).join("")}</div></div></div>`;
    }).join("")}</div>
    <div class="card-title"><h2>Use an item</h2>${btn("Shop →", "page", 'data-page="shop"', "text")}</div>
    <div class="use-grid">${Object.keys(s.bag).filter((k) => ITEMS[k].kind === "use" && !ITEMS[k].team).map((k) => `<button class="use-item" data-act="use" data-item="${k}" data-id="${a.id}">${icon(k, 32)}<span><strong>${ITEMS[k].name} ×${s.bag[k]}</strong><small>${ITEMS[k].desc}</small></span></button>`).join("") || "<p class='hint'>No usable items in the bag.</p>"}</div>`;
  }
  if (tab === "career") {
    body = `<div class="records">${EVENT_IDS.map((ev) => `<span>${EVENTS[ev].name}<b>${a.pb[ev] ? mark(a.pb[ev]) : "—"}</b></span>`).join("")}</div>
    <div class="facts"><span>Meets <b>${a.meets}</b></span><span>Sessions <b>${a.sessions}</b></span><span>This season <b>${a.seasonPoints} pts · ${a.seasonPbs} PBs</b></span></div>
    <div class="card-title"><h2>Career moments</h2></div>${a.career.length ? a.career.map((c) => `<div class="history"><span>Season ${c.season} · ${esc(c.label)}</span><b>${c.mark ? mark(c.mark) : "★"}</b></div>`).join("") : "<p class='hint'>The first official meet starts the story.</p>"}
    <details class="danger"><summary>Release contract</summary><p class="hint">${esc(a.name)} leaves the active squad; their gear returns to the bag and their marks stay in club history.</p>${btn("Release " + esc(a.name.split(" ")[0]), "release-contract", `data-id="${a.id}" ${s.roster.length <= 4 ? "disabled" : ""}`, "subtle")}</details>`;
  }
  return `${btn("← Squad", "back-squad", "", "text")}
  <div class="profile rarity-${a.rarity}">${portrait(a, "large")}<div>${eventChip(a.event)} ${rankChip(a)} ${rarityChip(a)}<h1>${esc(a.name)}</h1><p>Level ${a.level} · ${BACKGROUNDS[a.background].name} ${moodFace(a)}</p>${athleteAlerts(s, a)}</div></div>
  <nav class="tabs">${tabs.map(([id, name]) => `<button data-act="tab" data-tab="${id}" class="${tab === id ? "active" : ""}">${name}</button>`).join("")}</nav>${body}`;
}
function skillRow(a, k, label, act, disabled) {
  const d = SKILLS[k];
  return `<div class="skill-row ${a.equipped.includes(k) ? "on" : ""}"><span class="skill-icon c-${d.cat}">${SKILL_ICONS[d.cat]}</span><span><strong>${d.name}</strong><small>${d.desc}</small></span>${btn(label, act, `data-id="${a.id}" data-skill="${k}" ${disabled ? "disabled" : ""}`, act === "learn" ? "primary small" : "subtle small")}</div>`;
}

// ── Recruiting ──────────────────────────────────────────────────────────
export function recruit(s) {
  const full = s.roster.length >= G.rosterCap(s);
  const secrets = s.secretsOffered.filter((k) => !s.secretsSigned.includes(k));
  return `${btn("← Squad", "page", 'data-page="squad"', "text")}${heading("THE SCOUT'S NOTEBOOK", "New talent", "Squad " + s.roster.length + " / " + G.rosterCap(s) + ". Rarer athletes have higher potential and arrive with a skill.")}
  ${secrets.length ? `<section class="card secret-card"><div class="card-title"><h2>★ Special visitors</h2></div>${secrets.map((k) => `<div class="secret"><canvas class="portrait" width="54" height="54" data-secret="${k}" aria-hidden="true"></canvas><span><strong>${SECRETS[k].name}</strong><small>${EVENTS[SECRETS[k].event].name} · ${SKILLS[SECRETS[k].skill].name}: ${SKILLS[SECRETS[k].skill].desc}</small></span>${btn("Sign · " + cash(G.secretFee(s, k)), "sign-secret", `data-key="${k}" ${full || s.money < G.secretFee(s, k) ? "disabled" : ""}`)}</div>`).join("")}</section>` : ""}
  <div class="prospects">${s.prospects
    .map((a) => {
      const cost = G.signCost(s, a);
      return `<article class="prospect rarity-${a.rarity}"><div class="prospect-head">${portrait(a)}<div>${eventChip(a.event)} ${rarityChip(a)}<h2>${esc(a.name)}</h2><small>${BACKGROUNDS[a.background].name} · potential ${showStat(a.potential)}</small></div></div>
      <div class="statline big">${a.stats.map((v, i) => `<i style="--c:${STAT_COLORS[i]}">${showStat(v)}</i>`).join("")}</div>
      ${a.skills.length ? `<p class="hint">Knows <b>${SKILLS[a.skills[0]].name}</b>: ${SKILLS[a.skills[0]].desc}</p>` : ""}
      <div class="prospect-foot"><span>Wage ${cash(G.wageOf(a))}/wk</span>${btn("Sign · " + cash(cost), "recruit", `data-id="${a.id}" ${full || s.money < cost ? "disabled" : ""}`)}</div></article>`;
    })
    .join("")}</div>
  ${btn("Scout three more · " + cash(G.scoutCost(s)), "scout", s.money < G.scoutCost(s) ? "disabled" : "", "subtle")}
  <p class="hint">${full ? "The squad is full. Build or upgrade a Dormitory, or release a contract." : "A Scout Office and the Scouting Network combo improve rarity."} Secret characters appear when you hit certain milestones…</p>`;
}

// ── Grounds ─────────────────────────────────────────────────────────────
export function grounds(s, view) {
  const i = view.plot,
    p = s.plots[i],
    unlocked = i >= 0 && G.plotUnlocked(s, i);
  let detail = "";
  if (i < 0) detail = `<p class="hint">Tap a plot here or on the grounds. Facilities next to each other can form combos.</p>`;
  else if (!unlocked) detail = `<article class="card"><h2>Locked plot</h2><p>Opens as the club climbs the leagues. ${s.league < 3 ? "Next plots: " + LEAGUES[s.league + 1].name + "." : ""}</p></article>`;
  else if (p) {
    const d = FACILITIES[p.type],
      cost = G.upgradeCost(p.type, p.level),
      combos = G.combos(s).filter((c) => (c.a === p.type || c.b === p.type) && G.neighbours(i).some((j) => [c.a, c.b].includes(s.plots[j]?.type)));
    detail = `<article class="card facility"><div class="facility-head"><canvas class="building" width="104" height="66" data-building="${p.type}:${p.level}"></canvas><div><span class="eyebrow">LEVEL ${p.level} / 3</span><h2>${d.name}</h2><p>${d.desc}</p></div></div>
      ${combos.length ? `<p class="combo-line">${combos.map((c) => "✦ " + c.name + ": " + c.desc).join("<br>")}</p>` : ""}
      <div class="inline">${btn(p.level >= 3 ? "Fully upgraded" : "Upgrade · " + cash(cost), "upgrade", `data-index="${i}" ${p.level >= 3 || s.money < cost ? "disabled" : ""}`)}${!d.fixed ? btn(view.moving === i ? "Cancel move" : "Move / swap", "move", `data-index="${i}"`, "subtle") : ""}${!d.fixed ? btn("Clear · +" + cash(d.cost / 2), "sell", `data-index="${i}"`, "subtle") : ""}</div></article>`;
  } else
    detail = `<div class="build-list">${Object.entries(FACILITIES)
      .filter(([id]) => id !== "club" && !s.plots.some((q) => q?.type === id))
      .map(([id, d]) => {
        const lock = s.league < d.league ? "Unlocks in " + LEAGUES[d.league].name : d.needsTitle && !s.trophies.length ? "Needs a title" : null;
        return `<button class="build" data-act="build" data-index="${i}" data-type="${id}" ${lock || s.money < d.cost ? "disabled" : ""}><canvas class="building" width="104" height="66" data-building="${id}:1"></canvas><span><strong>${d.name}</strong><small>${d.desc}</small><b>${lock || cash(d.cost)}</b></span></button>`;
      })
      .join("")}</div>`;
  const total = COMBOS.length;
  return `${heading("A CLUB THAT GROWS WITH YOU", view.moving != null ? "Pick a destination" : "The grounds", view.moving != null ? "Tap any open plot to move or swap. Moving is free." : G.unlockedPlots(s).length + " of 12 plots open · " + s.discovered.length + " / " + total + " combos found")}
  <div class="plot-grid">${s.plots
    .map((q, n) => {
      const open = G.plotUnlocked(s, n);
      return `<button class="plot ${n === i ? "selected" : ""} ${q ? "built" : ""} ${open ? "" : "locked"}" data-act="plot" data-index="${n}">${q ? `<canvas class="building tiny" width="104" height="66" data-building="${q.type}:${q.level}"></canvas><small>${FACILITIES[q.type].name}${q.level > 1 ? " " + "★".repeat(q.level - 1) : ""}</small>` : open ? "<span>+</span><small>Build</small>" : "<span>🔒</span><small>Locked</small>"}</button>`;
    })
    .join("")}</div>${detail}
  <details class="card notebook" ${view.notebook ? "open" : ""}><summary>Combo notebook · ${s.discovered.length} / ${total}</summary>${COMBOS.map((c) => {
    const found = s.discovered.includes(c.key),
      seen = s.plots.some((q) => q?.type === c.a || q?.type === c.b);
    return `<div class="combo ${found ? "found" : ""}"><strong>${found ? "✦ " + c.name : "? ? ?"}</strong><small>${found ? FACILITIES[c.a].name + " + " + FACILITIES[c.b].name + " — " + c.desc + (G.combos(s).some((x) => x.key === c.key) ? "" : " (inactive)") : seen ? "Something pairs well with the " + FACILITIES[s.plots.some((q) => q?.type === c.a) ? c.a : c.b].name + "…" : "Undiscovered."}</small></div>`;
  }).join("")}</details>`;
}

// ── Shop & bag ──────────────────────────────────────────────────────────
export function shop(s, view) {
  const tab = view.shopTab || "shop";
  const tier = G.shopStock(s);
  const nextTier = SHOP_TIERS.find((t) => t > s.fans);
  const sale = s.saleDay === s.day;
  let body;
  if (tab === "shop") {
    const groups = [
      ["Consumables", (d) => d.kind === "use"],
      ["Implements", (d) => d.slot === "implement"],
      ["Shoes", (d) => d.slot === "shoes"],
      ["Charms", (d) => d.slot === "charm"],
    ];
    body = `${sale ? `<div class="sale">CLEARANCE SALE · 30% off today!</div>` : ""}${groups
      .map(([name, f]) => {
        const items = tier.filter((k) => f(ITEMS[k]));
        return items.length ? `<div class="card-title"><h2>${name}</h2></div><div class="item-grid">${items.map((k) => itemCard(s, k, "buy")).join("")}</div>` : "";
      })
      .join("")}<p class="hint">${nextTier ? "New stock arrives at " + nextTier.toLocaleString() + " fans (" + s.fans.toLocaleString() + " now)." : "The full catalogue is in stock."} The rarest gear is only found: meet prizes, merchants and goals.</p>`;
  } else {
    const ids = Object.keys(s.bag);
    const equipped = s.roster.flatMap((a) => GEAR_SLOTS.map((slot) => a.gear[slot] && [a.gear[slot], a]).filter(Boolean));
    body = `${ids.length ? `<div class="item-grid">${ids.map((k) => itemCard(s, k, ITEMS[k].kind === "use" ? "use" : "equip")).join("")}</div>` : "<p class='hint'>The bag is empty.</p>"}
    ${G.facilityLevel(s, "workshop") ? `<div class="card-title"><h2>Kit Workshop · forging</h2></div><p class="hint">Each forge level adds +0.6% distance to every copy of that item.</p><div class="item-grid">${[...new Set([...ids.filter((k) => ITEMS[k].kind === "gear"), ...equipped.map(([k]) => k)])].map((k) => `<div class="item-card rarity-${ITEMS[k].rarity}">${icon(k)}<span><strong>${ITEMS[k].name}${s.forge[k] ? " +" + s.forge[k] : ""}</strong><small>${(s.forge[k] || 0) >= 3 ? "Fully forged." : "Next: +" + ((s.forge[k] || 0) + 1)}</small></span>${btn((s.forge[k] || 0) >= 3 ? "Max" : "Forge · " + cash(G.forgeCost(s, k)), "forge", `data-item="${k}" ${(s.forge[k] || 0) >= 3 || s.money < G.forgeCost(s, k) ? "disabled" : ""}`, "subtle small")}</div>`).join("")}</div>` : `<p class="hint">Build a Kit Workshop to forge your gear.</p>`}
    ${equipped.length ? `<div class="card-title"><h2>Being worn</h2></div>${equipped.map(([k, a]) => `<div class="history"><span>${esc(ITEMS[k].name)}</span><b>${esc(a.name)}</b></div>`).join("")}` : ""}`;
  }
  return `${heading("THE CLUB SHOP", tab === "shop" ? "Sports shop" : "Your bag", tab === "shop" ? "Stock grows with your fan base." : "Use items on athletes, equip gear, forge upgrades.")}
  <nav class="tabs"><button data-act="shop-tab" data-tab="shop" class="${tab === "shop" ? "active" : ""}">Shop</button><button data-act="shop-tab" data-tab="bag" class="${tab === "bag" ? "active" : ""}">Bag · ${Object.values(s.bag).reduce((n, v) => n + v, 0)}</button></nav>${body}`;
}
function itemCard(s, k, mode) {
  const d = ITEMS[k];
  const action =
    mode === "buy"
      ? btn(cash(G.itemPrice(s, k)), "buy", `data-item="${k}" ${s.money < G.itemPrice(s, k) ? "disabled" : ""}`, "small")
      : mode === "use"
        ? btn(d.team ? "Use on team" : "Use…", "use", `data-item="${k}"`, "small")
        : btn("Equip…", "equip", `data-item="${k}"`, "subtle small");
  return `<div class="item-card rarity-${d.rarity}">${icon(k)}<span><strong>${d.name}${mode !== "buy" ? " ×" + s.bag[k] : ""}</strong><small>${d.desc}</small>${chip(RARITY[d.rarity].name, RARITY[d.rarity].color, "rarity")}</span>${action}</div>`;
}

// ── League ──────────────────────────────────────────────────────────────
export function league(s, view) {
  const rows = G.table(s);
  return `${heading("ONE CLUB. FOUR EVENTS.", LEAGUES[s.league].name, esc(LEAGUES[s.league].tag))}
  <div class="journey">${LEAGUES.map((l, i) => `<div class="${i === s.league ? "current" : i < s.league ? "passed" : ""}"><span>${i < s.league ? "✓" : i + 1}</span><small>${l.name.replace(" League", "")}</small></div>`).join("")}</div>
  <div class="table-wrap"><table><thead><tr><th>Club</th><th>P</th><th>+/−</th><th>Pts</th></tr></thead><tbody>${rows.map((c, i) => `<tr class="${c.id === "us" ? "us" : ""}"><td><span class="pos">${i + 1}</span><i class="dot" style="--c:${c.id === "us" ? s.colors.primary : c.color}"></i>${esc(c.name)}</td><td>${c.played}</td><td>${c.diff > 0 ? "+" : ""}${c.diff}</td><td><b>${c.points}</b></td></tr>`).join("")}</tbody></table></div>
  <p class="hint">Three fixtures, then the top two meet in a best-of-three final. Event wins earn 3 meet points; a meet win earns 3 league points. ${s.league < 4 ? "Win the final to reach the " + LEAGUES[s.league + 1].name + " (" + LEAGUES[s.league].unlock + ")." : "Win the final to become world champions."}</p>
  <div class="card-title"><h2>Rival clubs</h2></div>
  ${s.clubs
    .map((c, ci) => {
      const r = s.results.find((x) => x.kind === "league" && x.name === c.name);
      const open = view.rival === c.id;
      return `<div class="rival ${open ? "open" : ""}" style="--c:${c.color}"><button class="rival-head" data-act="rival" data-id="${c.id}"><span class="crest" style="--rival:${c.color}">${esc(c.name[0])}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.style)}</small></span><b>${r ? (r.win ? "W " : r.draw ? "D " : "L ") + r.score + "–" + r.against : ci === s.fixture ? "NEXT" : ci < s.fixture ? "—" : "Fixture " + (ci + 1)}</b></button>
      ${open ? `<div class="rival-squad">${c.athletes.map((a, i) => `<div class="rival-athlete">${rivalPortrait(c.id, i)}<span><strong>${esc(a.name)}</strong><small>${EVENTS[a.event].name} · ~${mark(G.rawMark(a, a.event))}</small><small>${a.skills.map((k) => SKILLS[k].name).join(" · ") || "No skills"}</small></span></div>`).join("")}</div>` : ""}</div>`;
    })
    .join("")}
  <div class="card-title"><h2>Club records</h2></div><div class="records">${EVENT_IDS.map((ev) => `<span>${EVENTS[ev].name}<b>${s.records[ev] ? mark(s.records[ev].mark) : "—"}</b><small>${s.records[ev] ? esc(s.records[ev].name) + " · S" + s.records[ev].season : ""}</small></span>`).join("")}</div>
  <div class="card-title"><h2>Trophy cabinet</h2></div><div class="trophies">${s.trophies.length ? s.trophies.map((t) => `<div><span>🏆</span><strong>${LEAGUES[t.league].name}</strong><small>Season ${t.season}</small></div>`).join("") : "<p class='hint'>A space is waiting for the first one.</p>"}</div>`;
}

// ── Club office ─────────────────────────────────────────────────────────
export function club(s, meta) {
  const set = s.settings;
  const toggle = (key, label, help) => `<label class="toggle"><input type="checkbox" data-change="setting" data-key="${key}" ${set[key] ? "checked" : ""}> ${label}${help ? `<small>${help}</small>` : ""}</label>`;
  const done = G.GOALS.filter((g) => s.goals.includes(g.id)).length;
  return `${heading("A PLACE TO CALL HOME", "Club office", "Fans " + s.fans.toLocaleString() + " · Titles " + s.trophies.length + " · Goals " + done + " / " + G.GOALS.length)}
  <form id="clubNameForm" class="name-form"><label>Club name<input maxlength="24" name="name" value="${esc(s.clubName)}" required></label><button class="button subtle" type="submit">Save</button></form>
  <div class="card-title"><h2>Club colours</h2></div><div class="palettes">${CLUB_PALETTES.map((p, i) => `<button class="palette ${s.colors.primary === p.primary && s.colors.secondary === p.secondary ? "selected" : ""}" data-act="palette" data-index="${i}" title="${p.name}"><i style="background:${p.primary}"></i><i style="background:${p.secondary}"></i></button>`).join("")}</div>
  <div class="card-title"><h2>Sponsor</h2>${s.sponsorLocked ? chip("Locked for this season", "#9aa58f") : chip("Choose before the first meet", "#e2b04a")}</div>
  <div class="sponsors">${Object.entries(SPONSORS).map(([id, d]) => `<button class="sponsor ${s.sponsor === id ? "selected" : ""}" data-act="sponsor" data-value="${id}" ${s.sponsorLocked || s.fans < d.fans ? "disabled" : ""}><strong>${d.name}</strong><small>${d.desc}</small>${s.fans < d.fans ? `<em>${d.fans.toLocaleString()} fans</em>` : ""}</button>`).join("")}</div>
  <p class="hint">Weekly: income ${cash(G.weeklyIncome(s))}, wages ${cash(G.wages(s))}. Visitors spend at the café and merch stand every day (${G.visitorsPerDay(s)} a day now).</p>
  <details class="card"><summary>All club goals · ${done} / ${G.GOALS.length}</summary>${G.GOALS.map((g) => (s.goals.includes(g.id) ? `<div class="goal done"><div><strong>✓ ${esc(g.name)}</strong><small>${esc(g.desc)}</small></div><span class="reward">${esc(G.rewardText(g.reward))}</span></div>` : goalRow(s, g))).join("")}</details>
  <details class="card"><summary>Hall of fame</summary>${s.awardHistory.length ? s.awardHistory.slice(0, 20).map((w) => `<div class="history"><span>Season ${w.season} · ${esc(w.award)}</span><b>${esc(w.name)}</b></div>`).join("") : "<p class='hint'>Season awards appear here.</p>"}${s.alumni.length ? `<div class="card-title"><h2>Alumni</h2></div>${s.alumni.map((a) => `<div class="history"><span>${esc(a.name)} · ${EVENTS[a.event].name}</span><b>${a.pb[a.event] ? mark(a.pb[a.event]) : "—"}</b></div>`).join("")}` : ""}</details>
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
  return `${btn("← Back to the club", "page", 'data-page="home"', "text")}${heading(s.fixture === 3 ? "THE LEAGUE FINAL" : "MEET LOBBY", "vs " + m.name, esc(m.style) + " · " + (s.fixture === 3 ? "three" : "two") + " attempts per event")}
  <div class="lineup">${EVENT_IDS.map((ev, i) => {
    const a = s.roster.find((x) => x.id === s.lineup[ev]),
      r = m.athletes[i],
      mine = a ? G.forecast(s, a, ev, { doubleDuty: G.usesOf(s, a.id) > 1 }) : 0,
      theirs = G.rawMark(r, ev) * G.MOOD_MARK[2];
    const edge = mine / theirs - 1;
    return `<div class="lineup-row"><div class="lineup-event">${eventChip(ev)}<span class="edge ${edge > 0.01 ? "up" : edge < -0.01 ? "down" : ""}">${edge > 0.01 ? "▲" : edge < -0.01 ? "▼" : "="} ${Math.abs(edge * 100).toFixed(1)}%</span></div>
      <div class="lineup-us">${a ? portrait(a) : ""}<span><select data-change="lineup" data-event="${ev}">${s.roster.map((x) => `<option value="${x.id}" ${x.id === s.lineup[ev] ? "selected" : ""} ${x.injury ? "disabled" : ""}>${esc(x.name)}${x.event === ev ? " ★" : ""}${x.injury ? " (injured)" : ""}</option>`).join("")}</select><small>${a ? moodFace(a) + " ⚡" + Math.round(a.stamina) + " · ~" + mark(mine) : ""}</small></span></div>
      <div class="lineup-them">${rivalPortrait(m.id, i)}<span><strong>${esc(r.name)}</strong><small>~${mark(theirs)}${r.skills.length ? " · " + r.skills.length + " skill" + (r.skills.length > 1 ? "s" : "") : ""}</small></span></div></div>`;
  }).join("")}</div>
  ${problem ? `<p class="warning">${esc(problem)}</p>` : ""}
  <div class="inline">${btn("Auto-pick best lineup", "autolineup", "", "subtle")}${s.roster.some((a) => a.injury) ? btn("Medical postponement (+1 day)", "medical", "", "subtle") : ""}</div>
  <div class="quick-items">${["drink", "cake", "feast", "icebath", "goldchalk"].filter((k) => s.bag[k]).map((k) => `<button class="use-item" data-act="use" data-item="${k}">${icon(k, 24)}<span><strong>${ITEMS[k].name} ×${s.bag[k]}</strong><small>${ITEMS[k].desc}</small></span></button>`).join("")}</div>
  <div class="card-title"><h2>How do you want to run it?</h2></div>
  <div class="modes">${["watch", "coach"].map((mode) => `<button class="mode ${s.settings.meetMode === mode ? "selected" : ""}" data-act="meet-mode" data-value="${mode}"><strong>${mode === "watch" ? "👀 Watch" : "📋 Coach"}</strong><small>${mode === "watch" ? "Athletes choose their approach. You step in for clutch moments." : "You choose the approach for every one of your throws."}</small></button>`).join("")}</div>
  ${btn("Start the meet →", "enter", problem ? "disabled" : "")}`;
}

// ── Live meet ───────────────────────────────────────────────────────────
export function match(s, view) {
  const m = s.match;
  if (m.phase === "complete") return meetComplete(s);
  const hide = view.hide;
  const marksOf = (side, i) => {
    const list = (side === "home" ? m.homeMarks : m.awayMarks)[i];
    return hide && hide.side === side && hide.eventIndex === i ? list.slice(0, hide.attempt) : list;
  };
  const scores = G.eventScores(m);
  const i = m.eventIndex,
    ev = EVENT_IDS[i],
    a = G.homeAthlete(s, i),
    r = G.rivalAthlete(s, i);
  const attempts = (side) => Array.from({ length: m.attempts }, (_, k) => {
    const list = marksOf(side, i);
    return `<b class="${k < list.length ? (list[k] == null ? "foul" : "") : "pending"}">${k < list.length ? (list[k] == null ? "✕" : list[k].toFixed(2)) : "·"}</b>`;
  }).join("");
  let controls = "";
  if (m.phase === "decide") {
    const P = G.projected(s, "home");
    const sigReady = G.canSignature(s, "home");
    controls = `<section class="decide ${m.last?.clutch ? "clutch" : ""}"><div class="card-title"><h2>${m.last?.clutch ? "⚡ Clutch moment" : "Your call, coach"}</h2>${chip("Suggested: " + TACTICS[m.last?.recommended || "balanced"].name, "#88b0d0")}</div>
      ${view.meter ? `<div class="meter-panel"><span class="eyebrow">RELEASE ON THE GOLD</span><div class="meter"><span class="zone good"></span><span class="zone perfect" style="--w:${G.effects(s, a).perfect ? 22 : 14}%"></span><span id="needle"></span></div>${btn("Release!", "release")}<small>Tap Release, or press Space.</small></div>` : `<div class="tactics">${Object.entries(TACTICS)
        .map(([id, t]) => {
          const p = G.throwPreview(s, id, "good", view.sig);
          return `<button class="tactic t-${id}" data-act="tactic" data-value="${id}"><strong>${t.name}</strong><small>${mark(p.low)} – ${mark(p.high)}</small><em>${Math.round(p.foul * 100)}% foul risk</em></button>`;
        })
        .join("")}</div>
      ${G.effects(s, a).sig ? `<label class="toggle sig"><input type="checkbox" data-change="sig" ${view.sig ? "checked" : ""} ${sigReady ? "" : "disabled"}> ✦ Use signature skill${sigReady ? "" : " (already used)"}</label>` : ""}
      <p class="hint">Projected ${mark(P)}. ${m.homeMarks[i].some((x) => x != null) ? "A banked mark always counts, so a foul now only costs confidence (−8 condition)." : "No mark yet: a foul here could cost the event."}</p>`}</section>`;
  }
  return `<div class="meet-head"><div class="event-chips">${scores.map((e, n) => `<span class="ev ${n === i ? "now" : ""} ${e.done ? (e.h > e.a ? "won" : e.a > e.h ? "lost" : "tied") : ""}" style="--c:${EVENTS[e.event].color}">${EVENTS[e.event].short}<b>${e.done ? e.h + ":" + e.a : n === i ? "LIVE" : "·"}</b></span>`).join("")}</div><div class="score"><b>${m.score}</b><small>–</small><b>${m.against}</b></div></div>
  <div class="duel"><div class="duelist home">${portrait(a)}<span><strong>${esc(a.name)}</strong><small>${moodFace(a)} ⚡${Math.round(a.stamina)} · ${a.equipped.map((k) => SKILLS[k].name).join(", ") || "no skills"}</small><span class="attempts">${attempts("home")}</span></span></div>
  <div class="duelist away" style="--c:${m.color}">${rivalPortrait(m.opponentId, i)}<span><strong>${esc(r.name)}</strong><small>${esc(m.name)} · ${r.skills.map((k) => SKILLS[k].name).join(", ") || "no skills"}</small><span class="attempts">${attempts("away")}</span></span></div></div>
  ${controls}
  <div class="meet-controls"><div class="seg">${[1, 2, 4].map((n) => `<button class="${(view.meetSpeed || 1) === n ? "active" : ""}" data-act="meet-speed" data-speed="${n}">${n}×</button>`).join("")}</div><div class="seg">${["watch", "coach"].map((mode) => `<button class="${s.settings.meetMode === mode ? "active" : ""}" data-act="meet-mode" data-value="${mode}">${mode === "watch" ? "Watch" : "Coach"}</button>`).join("")}</div>${btn(view.skipConfirm ? "Confirm skip" : "Skip to result", "skip", "", "subtle small")}</div>
  <p class="hint">${EVENTS[ev].hint}</p>`;
}
function meetComplete(s) {
  const m = s.match,
    r = m.rewards || { items: [], pbs: [], levelUps: [], goals: [] },
    win = m.score > m.against,
    draw = m.score === m.against;
  return `<div class="result ${win ? "win" : draw ? "draw" : "loss"}"><span class="eyebrow">${m.kind === "final" ? "THE FINAL" : "CLUB DUEL"} · FULL TIME</span><h1>${win ? "Victory!" : draw ? "Honours even" : "Defeat"}</h1><p>${esc(s.clubName)} ${m.score} – ${m.against} ${esc(m.name)}${m.tieBreak ? " (tie-break on distance)" : ""}</p></div>
  <div class="event-results">${G.eventScores(m).map((e) => `<div class="${e.h > e.a ? "won" : e.a > e.h ? "lost" : ""}"><span>${EVENTS[e.event].name}</span><b>${mark(e.home)}</b><small>vs ${mark(e.away)}</small><strong>${e.h}:${e.a}</strong></div>`).join("")}</div>
  <section class="card rewards"><div class="card-title"><h2>Rewards</h2></div>
    <div class="reward-line"><span>💰 ${cash(r.money)}</span><span>♥ +${r.fans} fans</span>${r.mvp ? `<span>⭐ MVP ${esc(r.mvp.name)}</span>` : ""}</div>
    ${r.items.length ? `<div class="drops">${r.items.map((k, n) => `<div class="drop rarity-${ITEMS[k].rarity}" style="--delay:${n * 0.35 + 0.3}s">${icon(k, 40)}<strong>${ITEMS[k].name}</strong><small>${RARITY[ITEMS[k].rarity].name}</small></div>`).join("")}</div>` : ""}
    ${r.pbs.map((p) => `<p class="pb-line">🎉 ${esc(p.name)} · ${EVENTS[p.event].name} PB ${mark(p.mark)}${p.delta ? " (+" + p.delta.toFixed(2) + ")" : ""}</p>`).join("")}
    ${r.levelUps.map((l) => `<p class="pb-line">⬆ ${esc(l.name)} reached level ${l.level}</p>`).join("")}
    ${r.goals.map((id) => `<p class="pb-line">🎯 Goal: ${esc(G.GOALS.find((g) => g.id === id)?.name)}</p>`).join("")}
  </section>
  ${btn(m.kind === "final" || s.fixture === 2 ? "See what comes next →" : "Back to the club →", "leave")}`;
}

// ── Season end & awards ─────────────────────────────────────────────────
function seasonEnd(s) {
  const won = s.champion,
    aw = s.lastAwards;
  return `<div class="season-end ${won ? "won" : ""}"><div class="trophy">${won ? "🏆" : "🌱"}</div>${heading("SEASON " + s.season + " COMPLETE", won ? LEAGUES[s.league].name + " champions!" : "The next chapter is yours.", won ? "Championship bonus " + cash(LEAGUES[s.league].prize) + " added." : "Everything you built stays. A rebuild camp boosts key stats.")}
  ${aw?.list.length ? `<section class="card awards"><div class="card-title"><h2>Awards night</h2></div>${aw.list.map((w) => {
    const a = s.roster.find((x) => x.id === w.id);
    return `<div class="award">${a ? portrait(a) : ""}<span><small>${esc(w.award)}</small><strong>${esc(w.name)}</strong><em>${esc(w.value)}${w.sp ? " · +1 SP" : ""}${w.item ? " · " + ITEMS[w.item].name : ""}</em></span></div>`;
  }).join("")}</section>` : ""}
  <div class="facts"><span>Meet wins <b>${s.results.filter((r) => r.win).length}</b></span><span>Fans <b>${s.fans.toLocaleString()}</b></span><span>Titles <b>${s.trophies.length}</b></span></div>
  ${btn(won && s.league < 4 ? "Enter the " + LEAGUES[s.league + 1].name + " →" : won ? "Defend the world title →" : "Start a fresh season →", "season")}
  ${won && s.league < 4 ? btn("Stay and defend this league", "defend", "", "subtle") : ""}
  <p class="hint">${won && s.league < 4 ? "Next: " + LEAGUES[s.league].unlock + "." : "A new season brings fresh prospects and a sponsor choice."}</p></div>`;
}
