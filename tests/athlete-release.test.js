import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import { EVENT_IDS } from '../src/game-content.js';
import { validateCampaign, exportCampaign } from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';

const withReserve = () => {
  const s = G.newGame(721);
  s.money = 10000;
  assert(G.recruit(s, s.prospects[0].id));
  return s;
};

test('athlete releases explain their limits and rejected releases leave the club untouched', () => {
  const checks = [
    [G.newGame(1), null, /at least four/],
    [withReserve(), s => { s.match = { phase: 'choose' }; }, /current meet/],
    [withReserve(), s => { s.onboarding = { meets: 0 }; }, /unlock with scouting/],
    [withReserve(), null, /not on the squad/, -1],
  ];
  for (const [s, change, reason, id = s.roster[0].id] of checks) {
    change?.(s);
    const before = structuredClone(s);
    assert.match(G.releaseProblem(s, id), reason);
    assert.equal(G.releaseAthlete(s, id), false);
    assert.deepEqual(s, before);
  }
});

test('releasing returns all gear, preserves history and removes live assignments across a save', () => {
  const s = withReserve(), a = s.roster[0], backup = s.roster.at(-1);
  a.gear = { implement: 'steelshot', shoes: 'support', charm: 'chalk' };
  a.pb.shot = 15.25;
  a.career = [{ season: 1, label: 'Club record', mark: 15.25 }];
  s.records.shot = { name: a.name, mark: 15.25, season: 1 };
  s.settings.followAthlete = a.id;
  s.facilityDuties['plot:10'] = a.id;
  s.entries.shot = [a.id, backup.id];
  s.lineup.shot = a.id;
  const beforeBag = { ...s.bag }, otherEntries = structuredClone(s.entries);
  const record = { ...s.records.shot }, wage = G.wageOf(a);
  const wages = s.roster.reduce((n, athlete) => n + G.wageOf(athlete), 0);
  assert.equal(G.releaseProblem(s, a.id), null);
  assert(G.releaseAthlete(s, a.id));
  for (const item of Object.values(a.gear)) assert.equal(s.bag[item], (beforeBag[item] || 0) + 1);
  assert.deepEqual(s.records.shot, record);
  assert.deepEqual(s.alumni[0], { name: a.name, event: a.event, career: a.career, pb: a.pb, season: s.season, rank: a.rank });
  assert.equal(s.settings.followAthlete, null);
  assert.equal(s.facilityDuties['plot:10'], undefined);
  assert.deepEqual(s.entries.shot, [backup.id]);
  assert.equal(s.lineup.shot, backup.id);
  for (const ev of EVENT_IDS.filter(ev => ev !== 'shot')) assert.deepEqual(s.entries[ev], otherEntries[ev].filter(id => id !== a.id), 'remaining event selections are retained');
  assert.equal(s.roster.reduce((n, athlete) => n + G.wageOf(athlete), 0), wages - wage);
  const copy = validateCampaign(exportCampaign(s));
  assert(!copy.roster.some(athlete => athlete.id === a.id));
  assert.deepEqual(copy.records.shot, record);
  assert.deepEqual(copy.alumni, s.alumni);
  assert.deepEqual(copy.entries, s.entries);
  const after = structuredClone(s);
  assert.equal(G.releaseAthlete(s, a.id), false, 'cannot return the gear twice');
  assert.deepEqual(s, after);
});

test('releasing the only entrant clears their slot without changing the other events', () => {
  const s = withReserve(), a = s.roster[0];
  s.entries.shot = [a.id];
  s.lineup.shot = a.id;
  assert(G.releaseAthlete(s, a.id));
  assert.deepEqual(s.entries.shot, []);
  assert.equal(s.lineup.shot, null);
  assert.doesNotThrow(() => validateCampaign(exportCampaign(s)));
});

test('release is visible from every athlete tab and shows the same availability as the domain', () => {
  const s = withReserve(), a = s.roster[0];
  for (const tab of ['stats', 'train', 'skills', 'gear', 'career']) {
    const html = P.squad(s, { athlete: a.id, tab });
    assert.match(html, new RegExp(`data-act="release-contract" data-id="${a.id}"`));
    assert.match(html, />Release athlete<\/button>/);
    assert.doesNotMatch(html, /data-act="release-contract"[^>]*disabled/);
  }
  assert(G.releaseAthlete(s, s.roster.at(-1).id));
  assert.match(P.squad(s, { athlete: a.id }), /data-act="release-contract"[^>]*disabled/);
  assert.match(P.squad(s, { athlete: a.id }), /at least four/);
  s.match = { phase: 'choose' };
  assert.match(P.squad(s, { athlete: a.id }), /Finish the current meet/);
});
