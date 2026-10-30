import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import * as P from '../src/ui/pages.js';
import { throwResult } from '../src/render/meet-presentation.js';
import { EVENT_IDS } from '../src/game-content.js';

function established(seed) {
  const s = G.newGame(seed);
  delete s.onboarding;
  return s;
}

test('the scoreboard marks a personal best only when it beats the best from before the meet', () => {
  const s = established(81);
  assert(G.enterCompetition(s, { kind: 'duel', tier: 0 }));
  s.day = s.matchDay; assert(G.startMatch(s));
  const f = s.match.fields[0], entry = f.home[0], a = s.roster.find(x => x.id === entry.id);
  a.pb.shot = 10;
  entry.marks = [9.5];
  let row = G.scoreboard(s, 0).rows.find(r => r.side === 'home' && r.id === a.id);
  assert.equal(row.pb, false);
  entry.marks = [9.5, 10.4];
  row = G.scoreboard(s, 0).rows.find(r => r.side === 'home' && r.id === a.id);
  assert.equal(row.pb, true); assert.equal(row.firstMark, false);
  delete a.pb.shot;
  assert.equal(G.scoreboard(s, 0).rows.find(r => r.id === a.id && r.side === 'home').firstMark, true);
  assert(G.scoreboard(s, 0).rows.filter(r => r.side === 'away').every(r => !r.pb), 'rival bests are not known');
  assert.equal(G.scoreboard(s, 0).standard, null); assert.equal(G.scoreboard(s, 0).cut, null);
  const html = P.meetBar(s, {});
  assert.match(html, /class="badge pb"/);
});

test('league duels show the championship standard and who has reached it', () => {
  const s = established(82);
  assert(G.enterCompetition(s, { kind: 'league', tier: 0 }));
  s.day = s.matchDay; assert(G.startMatch(s));
  const board = G.scoreboard(s, 0), standard = G.qualifyingStandard(s, 'shot');
  assert.equal(board.standard, standard);
  const [first] = s.match.fields[0].home, rival = s.match.fields[0].away[0];
  first.marks = [standard + 0.2]; rival.marks = [standard - 0.5];
  const rows = G.scoreboard(s, 0).rows;
  const ours = rows.find(r => r.side === 'home' && r.id === first.id), theirs = rows.find(r => r.side === 'away' && r.id === rival.id);
  assert(ours.qualified && ours.newlyQualified);
  assert(!theirs.qualified);
  // A standard earned in an earlier duel still counts, but is not news.
  G.recordQualifier(s, rival.id, 'shot', [standard + 1]);
  const again = G.scoreboard(s, 0).rows.find(r => r.side === 'away' && r.id === rival.id);
  assert(again.qualified && !again.newlyQualified);
  const html = P.meetBar(s, {});
  assert.match(html, /standard-line/);
  assert.match(html, /class="badge q/);
});

test('a throw that first reaches the standard says so', () => {
  assert.equal(throwResult({ type: 'throw', mark: 12, madeStandard: true, ownBest: 12, place: 2, previousPlace: 2 }).headline, 'Championship standard!');
  assert.equal(throwResult({ type: 'throw', mark: 12, qualified: true, finalistLimit: 6, ownBest: 12, place: 5, previousPlace: 8 }).headline, 'Into the final!');
  assert.equal(throwResult({ type: 'throw', mark: 12, newPb: true, previousPb: 11, pbDelta: 1, qualified: true, finalistLimit: 6, ownBest: 12, place: 5 }).headline, 'Personal best!', 'a PB still leads, with the final in the detail');
});

test('championship prelims draw the final cut, and after it the rest of the field is out', () => {
  const s = established(83);
  s.circuit.cleared = ['0:0', '0:1'];
  assert(G.enterCompetition(s, { kind: 'league', tier: 0 }));
  for (const a of [...s.roster, ...G.championshipClubs(s).flatMap(c => c.athletes)]) for (const ev of EVENT_IDS) G.recordQualifier(s, a.id, ev, [G.qualifyingStandard(s, ev) + a.id / 1000 + 1]);
  s.fixture = 3; s.day = s.matchDay;
  assert(G.startMatch(s));
  assert(s.match.leagueChampionship);
  const f = s.match.fields[0], all = [...f.home, ...f.away];
  all.forEach((e, n) => { e.marks = [10 + n * 0.1]; });
  const board = G.scoreboard(s, 0);
  assert.equal(board.cut, 6);
  assert.equal(board.cutMark, board.rows[5].mark);
  assert.deepEqual(board.rows.map(r => r.inFinal), board.rows.map((r, n) => n < 6));
  assert.match(P.meetBar(s, {}), /cut-line/);
  // Play to the cut, then the final round leaves only six in.
  s.settings.clutch = false;
  for (let guard = 0; !s.match.finalRound && guard < 500; guard++) G.advanceMatch(s);
  assert(s.match.finalRound);
  const after = G.scoreboard(s, 0);
  assert.equal(after.cut, null); assert(after.finals);
  assert.equal(after.rows.filter(r => !r.out).length, 6);
  assert.match(P.meetBar(s, {}), /class="standing[^"]* out"/);
});
