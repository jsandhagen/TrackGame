import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import * as P from '../src/ui/pages.js';
import { validateCampaign, exportCampaign } from '../src/domain/campaign-save.js';
import { SKILLS, ITEMS, BOOK_PRICES } from '../src/game-content.js';

test('every learnable skill has a rarity; common ones are learned with points, the rest from books', () => {
  for (const [id, k] of Object.entries(SKILLS)) {
    if (k.cat === 'unique') continue;
    assert(['common', 'rare', 'epic', 'legend'].includes(k.rarity), id);
    assert.equal(!!ITEMS['book_' + id], k.rarity !== 'common', id + ' has a book only if it is rarer than common');
    if (k.rarity !== 'common') assert.equal(ITEMS['book_' + id].price, BOOK_PRICES[k.rarity]);
  }
  assert(Object.values(SKILLS).filter((k) => k.rarity === 'common').every((k) => k.sp === 1 && k.rank === 0), 'common skills are the simple ones');
  const s = G.newGame(5);
  assert(G.skillUnlocked(s, 'metronome'));
  assert(!G.skillUnlocked(s, 'captain'));
});

test('reading a skill book teaches one athlete, costs their skill points and uses the book up', () => {
  const s = G.newGame(8), a = s.roster[0], b = s.roster[1];
  G.addItem(s, 'book_momentum');
  a.sp = 1;
  assert.equal(G.bookProblem(s, a, 'book_momentum'), 'Needs Pro');
  a.rank = 1;
  assert.equal(G.bookProblem(s, a, 'book_momentum'), '2 SP');
  a.sp = 3;
  assert(G.readBook(s, a.id, 'book_momentum'));
  assert(a.skills.includes('momentum'));
  assert.equal(a.sp, 1);
  assert(!s.bag.book_momentum);
  b.rank = 1; b.sp = 5;
  assert.equal(G.bookProblem(s, b, 'book_momentum'), 'None in the kit bag', 'one book, one athlete');
  G.addItem(s, 'book_meteor');
  const thrower = s.roster.find((x) => x.event === 'shot');
  thrower.rank = 3; thrower.sp = 9; thrower.mastery.shot = 40;
  assert.equal(G.bookProblem(s, thrower, 'book_meteor'), 'Shot put mastery 60');
});

test('the shop shelf shows three books a week, one copy each, and rarer books as the club grows', () => {
  const s = G.newGame(4);
  s.money = 1e5; s.fans = 0; s.day = 0;
  const first = G.bookShelf(s);
  assert.equal(first.length, 3); assert.equal(new Set(first).size, 3);
  assert(first.every((k) => ITEMS[k].kind === 'book' && ITEMS[k].rarity === 'rare'), 'a small club only sees rare books');
  assert(G.buyBook(s, first[0]));
  assert(!G.buyBook(s, first[0]), 'one copy a week');
  assert(G.bookSold(s, first[0]));
  assert(!G.buyBook(s, 'book_captain'), 'only what is on the shelf');
  s.day = G.BOOK_WEEK;
  assert(!G.bookSold(s, G.bookShelf(s)[0]), 'the shelf restocks each week');
  const seen = new Set();
  s.fans = 5000;
  for (let week = 0; week < 60; week++) { s.day = week * G.BOOK_WEEK; G.bookShelf(s).forEach((k) => seen.add(ITEMS[k].rarity)); }
  assert(seen.has('epic') && seen.has('legend'), 'bigger clubs see epic and legend books');
  const copy = validateCampaign(exportCampaign(s));
  assert.deepEqual(copy.bookShelf, s.bookShelf);
  const bad = structuredClone(copy); bad.bookShelf = { week: 1, sold: ['drink'] };
  assert.throws(() => validateCampaign(bad));
  for (let n = 0; n < 200; n++) assert.notEqual(ITEMS[G.randomItem(s, 'rare')].kind, 'book', 'books never drop as prizes');
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
