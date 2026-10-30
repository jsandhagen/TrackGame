import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import * as P from '../src/ui/pages.js';
import { validateCampaign, exportCampaign } from '../src/domain/campaign-save.js';
import { SKILLS, SKILL_PRICES } from '../src/game-content.js';

test('every learnable skill has a rarity; only common ones are free to learn', () => {
  for (const [id, k] of Object.entries(SKILLS)) {
    if (k.cat === 'unique') continue;
    assert(['common', 'rare', 'epic', 'legend'].includes(k.rarity), id);
    assert.equal(G.skillPrice(id), k.rarity === 'common' ? null : SKILL_PRICES[k.rarity]);
  }
  assert(Object.values(SKILLS).filter((k) => k.rarity === 'common').every((k) => k.sp === 1 && k.rank === 0), 'common skills are the simple ones');
  const s = G.newGame(5);
  assert.deepEqual(s.skillLibrary, []);
  assert(G.skillUnlocked(s, 'metronome'));
  assert(!G.skillUnlocked(s, 'captain'));
  assert.match(P.skillLibrary(s), /Add · \$3,600/);
});

test('older saves keep every rarer skill their athletes already know', () => {
  const s = G.newGame(6), a = s.roster[0];
  a.skills.push('clutch', 'gymrat');
  delete s.skillLibrary;
  const copy = validateCampaign(exportCampaign(s));
  const known = [...new Set([...s.roster, ...s.prospects].flatMap((x) => x.skills).filter((k) => SKILLS[k].rarity !== 'common' && SKILLS[k].cat !== 'unique'))];
  assert.deepEqual([...copy.skillLibrary].sort(), known.sort());
  assert(copy.skillLibrary.includes('clutch') && !copy.skillLibrary.includes('gymrat'), 'common skills are never stored');
  const bad = structuredClone(copy); bad.skillLibrary = ['wonderkid'];
  assert.throws(() => validateCampaign(bad), 'unique skills cannot be bought');
});

test('levels show what they bring: skill points every level, two every fifth, and the ranks they open', () => {
  const s = G.newGame(7), a = s.roster[0];
  a.level = 3; a.rank = 0;
  assert.deepEqual(G.levelRewards(a, 4), ['+1 skill point']);
  assert.deepEqual(G.levelRewards(a, 5), ['+2 skill points']);
  assert.deepEqual(G.levelRewards(a, 6), ['+1 skill point', 'Pro rank available']);
  assert.deepEqual(G.nextMilestone(a), { level: 5, rewards: ['+2 skill points'] });
  a.level = 5;
  assert.deepEqual(G.nextMilestone(a), { level: 6, rewards: ['+1 skill point', 'Pro rank available'] });
  a.rank = 1;
  assert.deepEqual(G.levelRewards(a, 6), ['+1 skill point'], 'a rank already held is not news');
});

test('meet XP follows the performance and stays near the old flat amount', () => {
  let total = 0, n = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = G.newGame(seed); s.settings.clutch = false;
    assert(G.enterCompetition(s, { kind: 'duel', tier: 0 }));
    s.day = s.matchDay; assert(G.startMatch(s)); assert(G.simulateMatch(s));
    for (const p of s.match.rewards.athleteProgress) {
      const raw = p.sources.reduce((x, [, v]) => x + v, 0);
      assert.equal(p.sources.filter(([l]) => l === 'Competed').length, 1);
      const legal = s.match.fields.flatMap((f) => f.home.filter((e) => e.id === p.id)).reduce((x, e) => x + e.marks.filter((v) => v != null).length, 0);
      assert.equal(p.sources.filter(([l]) => /clean throw/.test(l)).reduce((x, [, v]) => x + v, 0), legal * G.MEET_XP.legal);
      total += raw; n++;
    }
  }
  assert(total / n > 24 && total / n < 36, 'average ' + (total / n).toFixed(1));
});
