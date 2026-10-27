import "./styles.css";
import * as G from "./domain/game.js";
import {
  EVENTS,
  EVENT_IDS,
  LEAGUES,
  PLANS,
  TRAITS,
  SKILLS,
  KIT,
  FACILITIES,
  COMBOS,
  TACTICS,
} from "./game-content.js";
import { drawWorld, drawPortrait, drawStadium, hitPlot } from "./render/art.js";
import { createPersistence } from "./platform/persistence.js";
import { exportBackup } from "./platform/backups.js";
import { initNative } from "./platform/native.js";
import { validateCampaign, exportCampaign } from "./domain/campaign-save.js";
const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const cash = (n) => "$" + Math.round(n).toLocaleString(),
  mark = (n) => (n == null ? "FOUL" : n.toFixed(2) + " m");
const store = await createPersistence("ring-sector-leagues-v3");
let state = store.read()
  ? validateCampaign(JSON.parse(store.read()))
  : G.newGame();
const view = {
  page: "home",
  athlete: null,
  tab: "overview",
  plot: -1,
  moving: null,
  training: false,
  simConfirm: false,
};
let animation = null,
  meterStart = 0,
  trainingTimer = null,
  toastTimer = null,
  lastDraw = 0;
const world = $("#world"),
  stadium = $("#stadium");
function save() {
  try {
    store.write(JSON.stringify(state));
  } catch {
    toast("Could not save. Export a backup from Club.");
  }
}
function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}
function portrait(a, large = false) {
  return `<canvas class="portrait ${large ? "large" : ""}" width="${large ? 112 : 48}" height="${large ? 140 : 66}" data-athlete="${a.id}" aria-hidden="true"></canvas>`;
}
const badge = (text, color = "") =>
  `<span class="badge" ${color ? 'style="--badge:' + esc(color) + '"' : ""}>${esc(text)}</span>`;
const button = (label, act, extra = "", type = "primary") =>
  `<button class="button ${type}" data-act="${act}" ${extra}>${label}</button>`;
const heading = (eyebrow, title, sub = "") =>
  `<div class="section-heading"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}</div>`;
function stats(a) {
  return `<div class="stats">${["Power", "Technique", "Speed", "Focus"].map((name, i) => `<div><span>${name}</span><div class="stat-track"><i style="width:${a.stats[i]}%"></i><s style="left:${a.talent}%"></s></div><b>${Math.round(a.stats[i])}</b></div>`).join("")}</div>`;
}
function metrics(a) {
  return `<div class="metrics"><div><strong>${G.readiness(a)}<small>%</small></strong><span>Readiness</span></div><div><strong>${Math.round(a.fatigue)}</strong><span>Fatigue</span></div><div><strong>${Math.round(a.form)}</strong><span>Form</span></div></div>`;
}
function athleteRow(a) {
  return `<button class="athlete-row" data-act="athlete" data-id="${a.id}">${portrait(a)}<span><strong>${esc(a.name)}</strong><small>${EVENTS[a.event].name} · ${PLANS[a.plan].short}${a.injury ? " · Resting" : ""}</small></span><span class="row-end"><b>${G.readiness(a)}%</b><small>READY</small></span></button>`;
}
function header() {
  const league = LEAGUES[state.league];
  $("#topbar").innerHTML =
    `<div class="brand"><span class="brand-symbol">◎</span><span><strong>${esc(state.clubName)}</strong><small>CLUB ATHLETICS</small></span></div><div class="top-season">${badge(league.name, league.color)}<small>Season ${state.season} · Day ${state.day}</small></div><div class="resource"><small>CLUB FUNDS</small><b>${cash(state.money)}</b></div><button class="icon-button" data-act="fullscreen" aria-label="Full screen" title="Full screen"><span class="fullscreen-glyph" aria-hidden="true"></span></button><button class="icon-button help" data-act="help" aria-label="How to play">?</button>`;
}
function navigation() {
  const blocked = !!state.match;
  $("#navigation").innerHTML = blocked
    ? `<span class="quiet">${state.match.phase === "complete" ? "Meet complete · your rewards are saved" : "Your decisions wait. Every attempt is saved."}</span>${button(view.simConfirm ? "Confirm simulation" : "Simulate meet", "sim", "", "subtle")}`
    : `${[
        ["home", "⌂", "Clubhouse"],
        ["squad", "♟", "Athletes"],
        ["facilities", "▦", "Grounds"],
        ["league", "⚑", "League"],
        ["club", "✦", "Club"],
      ]
        .map(
          ([id, icon, name]) =>
            `<button class="nav-item ${view.page === id || (view.page === "recruit" && id === "squad") ? "active" : ""}" data-act="page" data-page="${id}"><span aria-hidden="true">${icon}</span>${name}</button>`,
        )
        .join("")}`;
}
function scene() {
  const meeting = !!state.match;
  world.hidden = meeting;
  stadium.hidden = !meeting;
  $("#scene").classList.toggle("meeting", meeting);
  $("#sceneLabel").innerHTML = meeting
    ? `<span class="eyebrow">${state.match.kind === "final" ? "LEAGUE FINAL" : "CLUB DUEL"}</span><strong>${esc(state.clubName)} <span>vs</span> ${esc(state.match.name)}</strong>`
    : `<span class="eyebrow">YOUR LITTLE CORNER OF THE WORLD</span><strong>${LEAGUES[state.league].venue}</strong>`;
  $("#sceneFoot").innerHTML = meeting
    ? matchScoreboard()
    : `<span>${badge(LEAGUES[state.league].name)} <span class="scene-season">Season ${state.season}</span></span><span class="world-tip">${view.moving != null ? "Select a destination to move or swap." : "Tap a building to explore."}</span>`;
}
function matchScoreboard() {
  const m = state.match,
    scores = G.eventScores(m);
  return `<div class="scoreboard"><span><small>YOUR CLUB</small><b>${m.score}</b></span><div>${scores.map((e, i) => `<span class="event-score ${m.eventIndex === i ? "current" : ""}" style="--event-color:${EVENTS[e.event].color}"><small>${EVENTS[e.event].short}</small><b>${e.done ? e.h + " : " + e.a : "—"}</b></span>`).join("")}</div><span><small>OPPONENT</small><b>${m.against}</b></span></div>`;
}
function home() {
  if (state.phase === "seasonEnd") return seasonEnd();
  const opp = G.opponent(state),
    days = state.matchDay - state.day,
    ready = days <= 0;
  return (
    heading(
      "THE COACH’S DESK",
      ready ? "It’s meet day." : "Build something worth cheering for.",
      ready
        ? "Four events. One club. Choose your lineup and go."
        : "Develop your people, improve the grounds, and take on the next club.",
    ) +
    `<article class="fixture-card"><div class="card-kicker">${state.fixture === 3 ? "THE FINAL" : `LEAGUE FIXTURE ${state.fixture + 1} / 3`}<span>${ready ? "READY TO PLAY" : days + " DAYS TO GO"}</span></div><div class="versus"><span class="club-crest">R<span>&</span>S</span><div><small>NEXT OPPONENT</small><h2>${esc(opp?.name || "League final")}</h2><p>${state.fixture === 3 ? "Win the final to earn promotion." : opp?.style || "Best of two throws in each event."}</p></div><span class="opponent-crest" style="--rival:${opp?.color}">${esc(opp?.name.slice(0, 1))}</span></div>${view.training ? button("Training… tap to pause", "stop") : ready ? button("Choose lineup & compete →", "lobby") : button(`Train ${days} ${days === 1 ? "day" : "days"} to the meet →`, "train")}<div class="split-actions">${button("Advance one day", "day", ready ? "disabled" : "", "subtle")}${button("Meet & league details", "page", 'data-page="league"', "subtle")}</div></article><div class="mini-budget"><span>Weekly income <b>${cash(G.weeklyIncome(state))}</b></span><span>Wages <b>${cash(G.wages(state))}</b></span><span class="${G.weeklyIncome(state) < G.wages(state) ? "warning" : ""}">Net <b>${cash(G.weeklyIncome(state) - G.wages(state))}</b></span></div><div class="section-title"><h2>Your athletes</h2>${button("Recruit →", "page", 'data-page="recruit"', "text")}</div><label class="bulk-plan">Team training <select data-change="bulk">${new Set(state.roster.map((a) => a.plan)).size > 1 ? "<option disabled selected>Individual plans</option>" : ""}${Object.entries(
      PLANS,
    )
      .map(
        ([id, p]) =>
          `<option value="${id}" ${state.roster.every((a) => a.plan === id) ? "selected" : ""}>${p.name}</option>`,
      )
      .join(
        "",
      )}</select></label><p class="hint">A team choice applies to everyone. Individual plans are in Athletes. Auto-taper protects the last two days.</p>${state.roster.map(athleteRow).join("")}<div class="news"><span class="eyebrow">CLUB JOURNAL</span><p>${esc(state.log[0]?.text || "A fresh start.")}</p></div>`
  );
}
function squad() {
  if (view.athlete) {
    const a = state.roster.find((a) => a.id === view.athlete);
    if (!a) {
      view.athlete = null;
      return squad();
    }
    const tabs = `<div class="profile-tabs">${[
      ["overview", "Overview"],
      ["training", "Training"],
      ["kit", "Kit"],
      ["skills", "Career"],
    ]
      .map(
        ([id, name]) =>
          `<button data-act="tab" data-tab="${id}" class="${view.tab === id ? "active" : ""}">${name}</button>`,
      )
      .join("")}</div>`;
    const intro = `<div class="profile-top">${portrait(a, true)}<div>${badge(EVENTS[a.event].name, EVENTS[a.event].color)}<h1>${esc(a.name)}</h1><p>Level ${a.level} · ${TRAITS[a.trait].name}</p></div></div>`;
    let body = "";
    if (view.tab === "overview")
      body =
        metrics(a) +
        stats(a) +
        `<div class="explanation">${TRAITS[a.trait].desc}. ${a.event === "shot" ? "A strong foundation for a club’s opening event." : EVENTS[a.event].hint}</div><h2 class="subheading">Personal bests</h2><div class="record-grid">${EVENT_IDS.map((ev) => `<span>${EVENTS[ev].name}<b>${a.pb[ev] ? mark(a.pb[ev]) : "No mark yet"}</b></span>`).join("")}</div><div class="xp-line">${Math.floor(a.xp)} / ${45 + a.level * 15} XP to level ${a.level + 1}<span>Club wage ${cash(a.wage)} / week</span></div><details class="discovery-book"><summary>Contract & club legacy</summary><p class="hint">Release this contract to make room for a new teammate. Career memories stay in the club journal. Keep at least four athletes.</p>${button("Release contract", "retire", `data-id="${a.id}" ${state.roster.length <= 4 ? "disabled" : ""}`, "subtle")}</details>`;
    if (view.tab === "training")
      body =
        metrics(a) +
        `<div class="choice-grid">${Object.entries(PLANS)
          .map(
            ([id, p]) =>
              `<button class="choice ${a.plan === id ? "selected" : ""}" data-act="plan" data-id="${a.id}" data-value="${id}"><strong>${p.name}</strong><span>${p.desc}</span></button>`,
          )
          .join(
            "",
          )}</div><label class="toggle"><input type="checkbox" data-change="taper" data-id="${a.id}" ${a.autoTaper ? "checked" : ""}> Auto-taper in the final two days</label><p class="hint">Energy is short-term fuel. Fatigue lasts longer. Form rewards preparation. Recovery keeps your roster sustainable.</p>`;
    if (view.tab === "kit")
      body = `<p class="hint">Permanent gear, bought with club funds. Development, consistency and peak distance are different choices. Tuning adds +0.4% distance per level, up to two levels.</p>${Object.entries(
        KIT,
      )
        .map(([id, k]) => {
          const owned = a.owned.includes(id),
            on = a.kit[k.slot] === id,
            level = a.tuning[id] || 0;
          return `<article class="kit-card ${on ? "equipped" : ""}"><span class="kit-icon">${k.slot === "shoes" ? "◭" : "◉"}</span><div><span class="eyebrow">${k.slot === "shoes" ? "FOOTWEAR" : "EVENT IMPLEMENT"}${level ? " · TUNED " + level : ""}</span><h3>${k.name}</h3><p>${k.desc}</p><div class="inline-actions">${button(on ? "Equipped" : owned ? "Equip" : cash(k.cost) + " · buy & equip", "kit", `data-id="${a.id}" data-item="${id}" ${on || (!owned && state.money < k.cost) ? "disabled" : ""}`, on ? "subtle" : "primary")}${owned && k.cost && level < 2 ? button("Tune · " + cash(Math.round((100 + level * 90) * (1 - 0.1 * G.facilityLevel(state, "workshop")))), "tune", `data-id="${a.id}" data-item="${id}"`, "subtle") : ""}</div></div></article>`;
        })
        .join("")}`;
    if (view.tab === "skills")
      body = `<div class="explanation">One signature skill at a time. Learn through play; switch freely between meets.</div>${Object.entries(
        SKILLS,
      )
        .map(
          ([id, k]) =>
            `<article class="skill-card ${a.skill === id ? "equipped" : ""}"><span class="skill-icon">${id === "student" ? "✧" : id === "steady" ? "◎" : "⚑"}</span><div><h3>${k.name}</h3><p>${k.desc}</p><small>${Math.min(a.sessions, k.sessions)} / ${k.sessions} sessions · ${Math.min(a.meets, k.meets)} / ${k.meets} events · level ${k.level}</small>${button(a.skill === id ? "Unequip" : G.skillUnlocked(a, id) ? "Equip skill" : "Keep developing", "skill", `data-id="${a.id}" data-skill="${id}" ${G.skillUnlocked(a, id) ? "" : "disabled"}`, "subtle")}</div></article>`,
        )
        .join(
          "",
        )}<h2 class="subheading">Career moments</h2>${a.career.length ? a.career.map((c) => `<div class="history-row"><span>Season ${c.season} · ${esc(c.label)}</span><b>${mark(c.mark)}</b></div>`).join("") : '<p class="hint">The first official meet starts your story.</p>'}`;
    return (
      button("← All athletes", "back-squad", "", "text") + intro + tabs + body
    );
  }
  return (
    heading(
      "PEOPLE MAKE A CLUB",
      "Your athletes",
      `${state.roster.length} / 8 athletes · specialists, reserves and future champions.`,
    ) +
    button("Find a new teammate →", "page", 'data-page="recruit"') +
    state.roster.map(athleteRow).join("") +
    `<p class="hint">Every event needs an athlete. A person can cover two events, with a cross-event and workload penalty. A balanced roster leaves everyone fresher.</p>`
  );
}
function recruits() {
  return (
    button("← Athletes", "page", 'data-page="squad"', "text") +
    heading(
      "THE SCOUT’S NOTEBOOK",
      "A new teammate?",
      `A signing bonus is paid once. Wages are weekly. Roster ${state.roster.length} / 8.`,
    ) +
    state.prospects
      .map((a) => {
        const cost =
          260 + state.league * 90 + Math.round(G.eventRating(a, a.event) * 3);
        return `<article class="recruit-card"><div class="recruit-head">${portrait(a)}<div>${badge(EVENTS[a.event].name, EVENTS[a.event].color)}<h2>${esc(a.name)}</h2><small>${TRAITS[a.trait].name} · potential ${a.talent}</small></div></div>${stats(a)}<div class="recruit-foot"><span>Wage ${cash(a.wage)} / week</span>${button("Sign · " + cash(cost), "recruit", `data-id="${a.id}" ${state.money < cost || state.roster.length >= 8 ? "disabled" : ""}`)}</div></article>`;
      })
      .join("") +
    button(
      "Scout three more · $45",
      "scout",
      state.money < 45 ? "disabled" : "",
      "subtle",
    )
  );
}
function facilities() {
  const index = view.plot,
    p = state.plots[index],
    d = p && FACILITIES[p.type];
  return (
    heading(
      "A CLUB THAT GROWS WITH YOU",
      view.moving != null ? "Choose a destination" : "The training grounds",
      view.moving != null
        ? "Select any unlocked plot. Moving or swapping is free."
        : "Choose a plot below or tap a building on the grounds.",
    ) +
    `<div class="plot-grid">${state.plots.map((p, i) => `<button data-act="plot" data-index="${i}" class="plot ${i === index ? "selected" : ""} ${p ? "built" : ""}"><span>${p ? ["⌂", "◎", "▰", "▤", "✚", "♧", "▣", "⚒", "▥"][Object.keys(FACILITIES).indexOf(p.type)] : "+"}</span><strong>${p ? FACILITIES[p.type].name : "Empty plot"}</strong><small>${p ? "LEVEL " + p.level : "BUILD HERE"}</small></button>`).join("")}</div>` +
    (index < 0
      ? '<p class="hint">Your clubhouse and starter facilities are already open. Build around them to discover connections.</p>'
      : p
        ? `<article class="facility-detail"><div class="section-title"><h2>${d.name}</h2>${badge("Level " + p.level)}</div><p>${d.desc}</p><div class="inline-actions">${button(p.level >= 3 ? "Fully upgraded" : "Upgrade · " + cash(Math.round((d.cost || 240) * (0.65 + 0.35 * p.level))), "upgrade", `data-index="${index}" ${p.level >= 3 ? "disabled" : ""}`)}${!d.fixed ? button(view.moving === index ? "Cancel move" : "Move / swap", "move", `data-index="${index}"`, "subtle") : ""}</div><p class="hint">Upgrades change the building as well as its effect.</p></article>`
        : `<div class="build-list">${Object.entries(FACILITIES)
            .filter(
              ([id]) =>
                id !== "club" && !state.plots.some((p) => p?.type === id),
            )
            .map(
              ([id, d]) =>
                `<button class="build-card" data-act="build" data-index="${index}" data-type="${id}" ${state.money < d.cost || state.league < d.league ? "disabled" : ""}><span class="building-swatch" style="background:${d.color}">+</span><span><strong>${d.name}</strong><small>${d.desc}</small><b>${state.league < d.league ? "Unlock: " + LEAGUES[d.league].name : cash(d.cost)}</b></span></button>`,
            )
            .join("")}</div>`) +
    `<details class="discovery-book"><summary>Discovery notebook · ${state.discovered.length} / ${COMBOS.length}</summary>${COMBOS.map((c) => `<div class="discovery"><strong>${state.discovered.includes(c.key) ? "✦ " + c.name : "? A useful connection"}</strong><span>${FACILITIES[c.a].name} + ${FACILITIES[c.b].name}</span><small>${state.discovered.includes(c.key) ? c.desc : "Try placing these next to each other."}${state.discovered.includes(c.key) && !G.combos(state).some((x) => x.key === c.key) ? " · currently inactive" : ""}</small></div>`).join("")}</details>`
  );
}
function league() {
  return (
    heading(
      "ONE CLUB. FOUR EVENTS.",
      LEAGUES[state.league].name,
      LEAGUES[state.league].tag,
    ) +
    `<div class="league-journey">${LEAGUES.map((l, i) => `<div class="${i === state.league ? "current" : i < state.league ? "passed" : ""}" title="${l.name}"><span>${i < state.league ? "✓" : i + 1}</span><small>${l.name.replace(" League", "")}</small></div>`).join("")}</div><div class="explanation">Three fixtures, then a top-two final. Event wins earn 3 meet points; a meet win earns 3 league points. ${state.league < 4 ? "Win the final to earn promotion." : "Win the final to become world champions, then defend your title."}</div><div class="table-wrap"><table><thead><tr><th>Club</th><th>P</th><th>Diff</th><th>Pts</th></tr></thead><tbody>${G.table(
      state,
    )
      .map(
        (c, i) =>
          `<tr class="${c.id === "us" ? "your-club" : ""}"><td><span>${i + 1}</span>${esc(c.name)}</td><td>${c.played}</td><td>${c.diff > 0 ? "+" : ""}${c.diff}</td><td><b>${c.points}</b></td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><div class="section-title"><h2>Season ${state.season} fixtures</h2>${badge("TOP 2 → FINAL")}</div>${state.clubs
      .map((c, i) => {
        const r = state.results.find(
          (r) => r.kind === "league" && r.name === c.name,
        );
        return `<div class="fixture-row"><span class="fixture-number">0${i + 1}</span><span><strong>${esc(c.name)}</strong><small>${r ? (r.win ? "Club victory" : r.draw ? "Draw" : "Club defeat") : i === state.fixture ? "Next fixture" : "Coming up"}</small></span><b>${r ? r.score + "–" + r.against : "—"}</b></div>`;
      })
      .join(
        "",
      )}<div class="fixture-row final"><span class="fixture-number">⚑</span><span><strong>League final</strong><small>Best of three · championship & promotion</small></span><b>${state.fixture === 3 ? "NEXT" : "TOP 2"}</b></div>${state.phase === "seasonEnd" ? button("Season review →", "page", 'data-page="home"') : button(state.day >= state.matchDay ? "Set lineup & enter meet →" : "Prepare for the next meet →", state.day >= state.matchDay ? "lobby" : "page", state.day >= state.matchDay ? "" : 'data-page="home"')}<p class="hint">Next league: ${state.league < 4 ? LEAGUES[state.league + 1].unlock : "A world title to defend. Repeat seasons with your established club."}</p>`
  );
}
function club() {
  return (
    heading(
      "A PLACE TO CALL YOUR OWN",
      "Club office",
      "Build a club you want to come back to.",
    ) +
    `<form id="clubNameForm" class="club-name-form"><label>Club name<input maxlength="28" name="name" value="${esc(state.clubName)}" required></label><button class="button subtle" type="submit">Save name</button></form><h2 class="subheading">This season’s sponsor</h2><div class="choice-grid">${[
      [
        "community",
        "Community partner",
        "Reliable income: $190 / week, plus fame.",
      ],
      [
        "performance",
        "Performance partner",
        "$100 / week, plus $120 for each meet win.",
      ],
    ]
      .map(
        ([id, name, desc]) =>
          `<button class="choice ${state.sponsor === id ? "selected" : ""}" data-act="sponsor" data-value="${id}" ${state.sponsorLocked ? "disabled" : ""}><strong>${name}</strong><span>${desc}</span></button>`,
      )
      .join(
        "",
      )}</div><p class="hint">Choose before your first meet. The contract then lasts for the season. Weekly wages: ${cash(G.wages(state))}.</p><h2 class="subheading">The trophy cabinet</h2><div class="trophy-cabinet">${state.trophies.length ? state.trophies.map((t) => `<div><span>♜</span><strong>${LEAGUES[t.league].name}</strong><small>Season ${t.season}</small></div>`).join("") : "<p>Your first trophy has a place waiting.</p>"}</div><h2 class="subheading">Save & transfer</h2><div class="inline-actions">${button("Export club", "export", "", "subtle")}${button("Import club", "import", "", "subtle")}</div><p class="hint">Export before switching devices or uninstalling. Your app and browser saves are separate until transferred.</p><h2 class="subheading">Recent club stories</h2>${state.log
      .slice(0, 12)
      .map(
        (l) =>
          `<div class="history-row"><span>${esc(l.text)}</span><small>Day ${l.day}</small></div>`,
      )
      .join("")}`
  );
}
function seasonEnd() {
  const won = state.champion;
  return `<div class="season-finish"><div class="trophy-hero">${won ? "♜" : "⚑"}</div>${heading("SEASON " + state.season + " COMPLETE", won ? "You built a champion." : "The next chapter is yours.", won ? LEAGUES[state.league].name + " title earned. The club keeps everything it has built." : "Keep your athletes, facilities and equipment. Develop a new strategy and take another run at the league.")}<div class="metrics"><div><strong>${state.results.filter((r) => r.win).length}</strong><span>Meet wins</span></div><div><strong>${state.fame}</strong><span>Club fame</span></div><div><strong>${state.trophies.length}</strong><span>Titles</span></div></div>${won ? `<p class="reward">Championship bonus ${cash(LEAGUES[state.league].prize)} already added.</p>` : ""}${button(won && state.league < 4 ? "Enter " + LEAGUES[state.league + 1].name + " →" : state.league === 4 && won ? "Defend the world title →" : "Start a fresh season →", "season")} ${won && state.league < 4 ? button("Stay and defend this league", "defend", "", "subtle") : ""}<p class="hint">A fresh season brings new prospects, a sponsor choice and five days to the first meet.</p></div>`;
}
function lobby() {
  const m = G.opponent(state);
  return (
    heading(
      state.fixture === 3 ? "CHAMPIONSHIP FINAL" : "THE MEET LOBBY",
      "Four events. One team.",
      `Your club faces ${m.name}. Specialists are strongest; covering a second event costs some sharpness.`,
    ) +
    `<div class="lineup-list">${EVENT_IDS.map((ev) => {
      const a = state.roster.find((a) => a.id === state.lineup[ev]);
      return `<label class="lineup-card">${badge(EVENTS[ev].short, EVENTS[ev].color)}<span><strong>${EVENTS[ev].name}</strong><select data-change="lineup" data-event="${ev}">${state.roster.map((a) => `<option value="${a.id}" ${a.id === state.lineup[ev] ? "selected" : ""} ${a.injury ? "disabled" : ""}>${esc(a.name)}${a.event === ev ? " ★" : ""}${a.injury ? " (resting)" : ""}</option>`).join("")}</select><small>${a ? G.readiness(a) + "% ready · projected " + mark(G.forecast(state, a, ev)) : ""}</small></span></label>`;
    }).join(
      "",
    )}</div><div class="explanation">${m.style ? esc(m.style) + ". " : ""}${state.fixture === 3 ? "Three" : "Two"} attempts per athlete. Best mark wins the event. No decision timer. You can handle the release or let your athlete do it.</div>${state.roster.some((a) => a.injury) ? button("Medical postponement: recover one day", "medical", "", "subtle") : ""}${button("Take the club to the stadium →", "enter")}${button("Back to preparations", "page", 'data-page="home"', "subtle")}`
  );
}
function match() {
  const m = state.match,
    a = G.currentAthlete(state),
    r = G.currentRival(state),
    ev = EVENT_IDS[m.eventIndex],
    e = EVENTS[ev];
  if (m.phase === "complete") {
    const win = m.score > m.against;
    return `<div class="meet-complete">${heading(m.kind === "final" ? "THE FINAL WHISTLE" : "THE CLUB RESULT", win ? "A team worth cheering for." : m.score === m.against ? "Nothing between you." : "Something to build on.", `${state.clubName} ${m.score} — ${m.against} ${m.name}`)}<div class="result-medallion ${win ? "won" : ""}">${win ? "VICTORY" : m.score === m.against ? "DRAW" : "FULL TIME"}</div><div class="event-results">${G.eventScores(
      m,
    )
      .map(
        (x) =>
          `<div><span>${EVENTS[x.event].name}</span><b>${mark(x.home)}</b><small>vs ${mark(x.away)}</small><strong>${x.h} : ${x.a}</strong></div>`,
      )
      .join(
        "",
      )}</div>${m.tieBreak ? '<p class="hint">The tied final was settled on combined marks relative to each event’s distance scale.</p>' : ""}<p class="reward">${cash(m.prize)} earned · progress saved</p>${button(m.kind === "final" || state.fixture === 2 ? "See what comes next →" : "Back to the clubhouse →", "leave")}</div>`;
  }
  const intro = `<div class="match-kicker">${badge(e.name, e.color)}<span>${m.kind === "final" ? "LEAGUE FINAL" : "CLUB DUEL"} · BEST OF ${m.attempts}</span></div><div class="match-athletes">${portrait(a)}<div><h1>${esc(a.name)}</h1><p>vs ${esc(r.name)}</p><small>Attempt ${m.attempt + 1} / ${m.attempts} · ${G.readiness(a)}% ready</small></div></div>`;
  const marks = `<div class="attempt-board"><div><small>YOUR ATTEMPTS</small><span>${Array.from({ length: m.attempts }, (_, i) => `<b>${i < m.homeMarks[m.eventIndex].length ? mark(m.homeMarks[m.eventIndex][i]) : "—"}</b>`).join("")}</span></div><div><small>RIVAL ATTEMPTS</small><span>${Array.from({ length: m.attempts }, (_, i) => `<b>${i < m.awayMarks[m.eventIndex].length ? mark(m.awayMarks[m.eventIndex][i]) : "—"}</b>`).join("")}</span></div></div>`;
  if (m.phase === "intro")
    return (
      intro +
      `<div class="explanation"><strong>This is a club duel.</strong> Win an event for 3 meet points. Your four athletes’ results add up to the club score. Each planning screen waits for you.</div><p class="hint">${e.hint}</p>${button("Plan your opening throw →", "plan-attempt")}`
    );
  if (m.phase === "timing")
    return (
      intro +
      marks +
      `<div class="release-panel"><span class="eyebrow">FIND YOUR RHYTHM</span><h2>Release on the gold.</h2><p>The meter repeats. There is no timeout.</p><div class="timing-track"><span class="zone outer"></span><span class="zone inner"></span><span id="needle"></span></div>${button("Release!", "release")}<small>Tap Release, or press Space / Enter.</small></div>`
    );
  if (m.phase === "result") {
    const result = m.last,
      final = m.attempt === m.attempts - 1;
    return (
      intro +
      `<div class="throw-result ${result.mark == null ? "foul" : ""}"><span class="eyebrow">${result.mark == null ? "NO MARK THIS TIME" : result.quality === "perfect" ? "A BEAUTIFUL RELEASE" : "MARK RECORDED"}</span><strong>${mark(result.mark)}</strong><span>Rival: ${mark(result.away)}</span></div>` +
      marks +
      `<div class="throw-feedback">${result.reasons.length ? result.reasons.map((x) => `<p>✦ ${esc(x)}</p>`).join("") : "<p>A controlled, workmanlike attempt. Every mark contributes.</p>"}${result.mark == null ? "<p>A safe approach lowers foul risk on your next attempt.</p>" : ""}</div>${button(animation ? "Watching the flight…" : final ? (m.eventIndex === 3 ? "Finish the meet →" : "Next event →") : "Plan the next throw →", "next-attempt", animation ? "disabled" : "")}`
    );
  }
  const projection = G.forecast(state, a, ev);
  return (
    intro +
    marks +
    `<div class="projection"><span>Projected controlled mark</span><b>${mark(projection * 0.97)} – ${mark(projection * 1.03)}</b></div><h2 class="subheading">Choose the approach</h2><div class="tactic-grid">${Object.entries(
      TACTICS,
    )
      .map(
        ([id, t]) =>
          `<button class="choice ${m.tactic === id ? "selected" : ""}" data-act="tactic" data-value="${id}"><strong>${t.name}</strong><span>${t.desc}</span></button>`,
      )
      .join(
        "",
      )}</div><p class="hint">${m.attempt === m.attempts - 1 ? "This is your last attempt in this event. A banked mark gives you room to take a risk." : "A safe opener can bank points before you chase distance."}</p>${button("Start the attempt →", "start-attempt")}${button("Let athlete handle the release", "assisted", "", "subtle")}`
  );
}
function render(preserve = false) {
  const scroll = preserve ? $("#panel").scrollTop : 0;
  header();
  scene();
  navigation();
  $("#panel").innerHTML = state.match
    ? match()
    : view.page === "home"
      ? home()
      : view.page === "squad"
        ? squad()
        : view.page === "recruit"
          ? recruits()
          : view.page === "facilities"
            ? facilities()
            : view.page === "league"
              ? league()
              : view.page === "lobby"
                ? lobby()
                : club();
  $("#panel").scrollTop = scroll;
  quickActions();
  $("#panel")
    .querySelectorAll("[data-athlete]")
    .forEach((c) => {
      const a = [
        ...state.roster,
        ...state.prospects,
        ...state.clubs.flatMap((c) => c.athletes),
      ].find((a) => a.id === +c.dataset.athlete);
      if (a) drawPortrait(c, a, c.classList.contains("large") ? 3.1 : 1.5);
    });
}
function quickActions() {
  const shell = $("#quickAction");
  shell.innerHTML = "";
  let actions = [];
  if (state.match) {
    const phase = state.match.phase;
    actions =
      phase === "intro"
        ? ["plan-attempt"]
        : phase === "planning"
          ? ["start-attempt", "assisted"]
          : phase === "timing"
            ? ["release"]
            : phase === "result"
              ? ["next-attempt"]
              : ["leave"];
  } else if (view.page === "home") {
    actions =
      state.phase === "seasonEnd"
        ? ["season"]
        : view.training
          ? ["stop"]
          : state.day >= state.matchDay
            ? ["lobby"]
            : ["train"];
  } else if (view.page === "lobby") actions = ["enter"];
  for (const act of actions) {
    const el = $("#panel").querySelector('[data-act="' + act + '"]');
    if (el) shell.append(el);
  }
  shell.hidden = !shell.children.length;
  $("#panelShell").classList.toggle("has-actions", !shell.hidden);
}
function navigate(page) {
  if (state.match) return;
  stopTraining();
  view.page = page;
  view.athlete = null;
  view.moving = null;
  view.simConfirm = false;
  render();
}
function doDay() {
  const result = G.advanceDay(state);
  if (result.ok) {
    save();
    render(true);
  }
  return result.ok;
}
function stopTraining() {
  view.training = false;
  clearTimeout(trainingTimer);
}
function train() {
  if (view.training) {
    stopTraining();
    render();
    return;
  }
  if (state.match || state.day >= state.matchDay) return;
  view.training = true;
  render();
  const step = () => {
    if (!view.training) return;
    if (!doDay() || state.day >= state.matchDay) {
      stopTraining();
      render();
      toast("Meet day. Your club is ready to choose a lineup.");
      return;
    }
    trainingTimer = setTimeout(step, 420);
  };
  trainingTimer = setTimeout(step, 350);
}
function chooseDialog(title, body, choices) {
  const dlg = $("#dialog");
  dlg.innerHTML = `<div class="dialog-header"><span class="eyebrow">RING & SECTOR</span><h1>${esc(title)}</h1></div><div class="dialog-body">${body}</div><div class="dialog-actions">${choices.map((c, i) => `<button class="button ${c.secondary ? "subtle" : "primary"}" data-dialog="${i}">${esc(c.label)}</button>`).join("")}</div>`;
  dlg.querySelectorAll("[data-dialog]").forEach(
    (b) =>
      (b.onclick = () => {
        dlg.close();
        choices[+b.dataset.dialog].fn?.();
      }),
  );
  dlg.showModal();
}
function help() {
  stopTraining();
  chooseDialog(
    "A little club. A long story.",
    `<p>Train your squad, choose a lineup, and face three rival clubs. Finish in the top two to reach the league final.</p><ol><li><strong>Prepare:</strong> training grows stats; sharpening improves form; recovery clears fatigue. Auto-taper rests athletes before a meet.</li><li><strong>Compete:</strong> each event win earns 3 meet points. Choose an approach, then release or use assisted timing.</li><li><strong>Grow:</strong> use winnings for new teammates, equipment and facilities. Discover combinations and learn skills.</li><li><strong>Promote:</strong> win the final to reach the next league. Your club keeps what it has earned.</li></ol><p>Nothing advances while you make a competition decision. Landscape gives the grounds and controls more room.</p>`,
    [
      {
        label: "Meet your club",
        fn: () => {
          state.welcomed = true;
          save();
        },
      },
    ],
  );
}
function throwNow(quality) {
  if (state.match?.phase !== "timing") return;
  const result = G.resolveThrow(state, quality);
  animation = { ...result, start: performance.now(), duration: 1800 };
  save();
  render();
}
function simulate() {
  const m = state.match;
  if (!m) return;
  if (m.phase === "complete") {
    toast("The meet is already complete.");
    return;
  }
  if (!view.simConfirm) {
    view.simConfirm = true;
    navigation();
    toast("Tap Confirm simulation to finish the remaining attempts.");
    return;
  }
  animation = null;
  clearTimeout(toastTimer);
  $("#toast").hidden = true;
  for (let i = 0; i < 40 && m.phase !== "complete"; i++) {
    if (m.phase === "intro") m.phase = "planning";
    if (m.phase === "planning") G.beginAttempt(state);
    if (m.phase === "timing") G.resolveThrow(state, "good");
    if (m.phase === "result") G.nextAttempt(state);
  }
  view.simConfirm = false;
  save();
  render();
}
$("#app").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  const act = b.dataset.act,
    id = +b.dataset.id,
    a = state.roster.find((a) => a.id === id);
  if (act !== "sim") {
    view.simConfirm = false;
    clearTimeout(toastTimer);
    $("#toast").hidden = true;
  }
  switch (act) {
    case "page":
      navigate(b.dataset.page);
      return;
    case "help":
      help();
      return;
    case "fullscreen":
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else
          await document.documentElement.requestFullscreen({
            navigationUI: "hide",
          });
      } catch {
        toast(
          "Fullscreen is unavailable in this preview. The Android app opens without browser controls.",
        );
      }
      return;
    case "day":
      doDay();
      return;
    case "train":
      train();
      return;
    case "stop":
      stopTraining();
      render();
      return;
    case "athlete":
      stopTraining();
      view.page = "squad";
      view.athlete = id;
      view.tab = "overview";
      render();
      return;
    case "back-squad":
      view.athlete = null;
      render();
      return;
    case "tab":
      view.tab = b.dataset.tab;
      render();
      return;
    case "plan":
      if (a && PLANS[b.dataset.value]) a.plan = b.dataset.value;
      break;
    case "kit":
      if (!G.buyKit(state, id, b.dataset.item)) toast("Not enough club funds.");
      break;
    case "tune":
      if (!G.tuneKit(state, id, b.dataset.item))
        toast("Not enough funds, or this kit is fully tuned.");
      break;
    case "skill":
      if (a && G.skillUnlocked(a, b.dataset.skill))
        a.skill = a.skill === b.dataset.skill ? null : b.dataset.skill;
      break;
    case "retire":
      if (a && state.roster.length > 4) {
        chooseDialog(
          "A new chapter?",
          `<p>Release ${esc(a.name)} from the active roster? Their career stays part of your club story. There is no transfer fee or refund.</p>`,
          [
            {
              label: "Release contract",
              fn: () => {
                G.releaseAthlete(state, id);
                view.athlete = null;
                save();
                render();
              },
            },
            { label: "Keep at club", secondary: true },
          ],
        );
        return;
      }
      break;
    case "scout":
      if (!G.scout(state)) toast("Scouting costs $45.");
      break;
    case "recruit":
      if (G.recruit(state, id)) toast("Welcome to the club!");
      else toast("Check your budget and available roster spaces.");
      break;
    case "plot": {
      const i = +b.dataset.index;
      if (view.moving != null) {
        G.moveFacility(state, view.moving, i);
        view.moving = null;
      }
      view.plot = i;
      break;
    }
    case "build":
      if (!G.build(state, +b.dataset.index, b.dataset.type))
        toast("Check the unlock, cost and empty plot.");
      else toast("A new home for progress.");
      break;
    case "upgrade":
      if (!G.upgrade(state, +b.dataset.index))
        toast("Not enough funds, or maximum level reached.");
      else toast("Facility upgraded.");
      break;
    case "move":
      view.moving = view.moving === +b.dataset.index ? null : +b.dataset.index;
      break;
    case "sponsor":
      if (!state.sponsorLocked) state.sponsor = b.dataset.value;
      break;
    case "lobby":
      if (state.day < state.matchDay) {
        toast("Prepare until meet day first.");
        return;
      }
      navigate("lobby");
      return;
    case "medical":
      if (!G.medicalDay(state))
        toast(
          "A postponement is only available for an injured squad on meet day.",
        );
      break;
    case "enter":
      stopTraining();
      if (!G.startMatch(state))
        toast(
          "Each event needs an available athlete. Maximum two events per person.",
        );
      break;
    case "plan-attempt":
      if (state.match?.phase === "intro") state.match.phase = "planning";
      break;
    case "tactic":
      if (state.match?.phase === "planning" && TACTICS[b.dataset.value])
        state.match.tactic = b.dataset.value;
      break;
    case "start-attempt":
      if (G.beginAttempt(state)) meterStart = performance.now();
      break;
    case "assisted":
      if (G.beginAttempt(state)) {
        throwNow("good");
        return;
      }
      break;
    case "release": {
      const p = timingPosition(performance.now());
      throwNow(
        Math.abs(p - 0.58) < 0.075
          ? "perfect"
          : Math.abs(p - 0.58) < 0.18
            ? "good"
            : "poor",
      );
      return;
    }
    case "next-attempt":
      if (animation) return;
      G.nextAttempt(state);
      break;
    case "leave":
      G.leaveMatch(state);
      view.page = "home";
      break;
    case "season":
      G.nextSeason(state);
      view.page = "home";
      break;
    case "defend":
      G.nextSeason(state, true);
      view.page = "home";
      break;
    case "sim":
      simulate();
      return;
    case "export":
      await exportBackup(JSON.stringify(exportCampaign(state), null, 2)).catch(
        () => toast("Export failed. Please try again."),
      );
      return;
    case "import": {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = async () => {
        try {
          if (!input.files[0]) return;
          if (input.files[0].size > 2000000)
            throw Error("The save is too large.");
          const incoming = validateCampaign(
            JSON.parse(await input.files[0].text()),
          );
          chooseDialog(
            "Restore this club?",
            `<p>${esc(incoming.clubName)} · Season ${incoming.season} · ${LEAGUES[incoming.league].name}</p><p>This replaces the current club. Export it first if you want to keep it.</p>`,
            [
              {
                label: "Restore club",
                fn: () => {
                  state = incoming;
                  view.page = "home";
                  view.athlete = null;
                  animation = null;
                  save();
                  render();
                  toast("Club restored.");
                },
              },
              { label: "Cancel", secondary: true },
            ],
          );
        } catch (error) {
          toast(error.message);
        }
      };
      input.click();
      return;
    }
  }
  save();
  render(true);
});
$("#app").addEventListener("change", (e) => {
  const el = e.target,
    kind = el.dataset.change;
  if (kind === "bulk" && PLANS[el.value]) {
    state.roster.forEach((a) => (a.plan = el.value));
    toast("Team training updated.");
  }
  if (kind === "taper") {
    const a = state.roster.find((a) => a.id === +el.dataset.id);
    if (a) a.autoTaper = el.checked;
  }
  if (kind === "lineup" && !G.assign(state, el.dataset.event, +el.value))
    toast("An athlete can cover at most two events and must be healthy.");
  save();
  render(true);
});
$("#app").addEventListener("submit", (e) => {
  if (e.target.id === "clubNameForm") {
    e.preventDefault();
    state.clubName =
      new FormData(e.target).get("name").trim().slice(0, 28) || "Ring & Sector";
    save();
    render(true);
    toast("The club has a name.");
  }
});
world.addEventListener("pointerup", (e) => {
  if (state.match) return;
  const i = hitPlot(world, e.clientX, e.clientY);
  if (i < 0) return;
  stopTraining();
  view.page = "facilities";
  if (view.moving != null) {
    G.moveFacility(state, view.moving, i);
    view.moving = null;
    save();
  }
  view.plot = i;
  render();
});
function timingPosition(now) {
  const p = ((now - meterStart) / 2400) % 2;
  return p <= 1 ? p : 2 - p;
}
document.addEventListener("keydown", (e) => {
  if (
    (e.code === "Space" || e.key === "Enter") &&
    state.match?.phase === "timing" &&
    !$("#dialog").open
  ) {
    e.preventDefault();
    $('#app [data-act="release"]')?.click();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopTraining();
    if (state.match?.phase === "timing") {
      state.match.phase = "planning";
      render();
    }
    save();
  }
});
window.addEventListener("save-error", () =>
  toast("Save failed. Export your club before leaving."),
);
window.addEventListener("pagehide", save);
initNative({
  pause: () => {
    stopTraining();
    if (state.match?.phase === "timing") state.match.phase = "planning";
    save();
    render();
  },
  back: () => {
    if ($("#dialog").open) {
      $("#dialog").close();
      return true;
    }
    if (state.match) {
      toast("Meet progress is saved. Continue when you’re ready.");
      return true;
    }
    navigate("home");
    return true;
  },
}).catch(console.error);
function frame(now) {
  if (now - lastDraw > 33 && !document.hidden) {
    lastDraw = now;
    if (state.match) {
      drawStadium(stadium, state, now, animation);
      if (animation && now - animation.start >= animation.duration) {
        animation = null;
        render(true);
      }
      if (state.match.phase === "timing") {
        const needle = $("#needle");
        if (needle) needle.style.left = timingPosition(now) * 100 + "%";
      }
    } else
      drawWorld(
        world,
        state,
        now,
        view.page === "facilities" ? view.plot : -1,
        view.training,
      );
  }
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
$("#bootStatus").hidden = true;
if (!state.welcomed) help();
save();
