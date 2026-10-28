import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import * as P from '../src/ui/pages.js';
import {ITEMS,SKILLS} from '../src/game-content.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';
import {athleteLook} from '../src/render/sprites.js';

const forms=Object.entries(ITEMS).filter(([,d])=>d.teaches);
test('shop transformation items teach permanent skills without SP, auto-equip and produce real temporary performance boosts',()=>{
 assert.equal(forms.length,5);
 for(const [item,d] of forms){
  const s=G.newGame(31),a=s.roster[0];s.fans=100000;s.money=100000;a.skills=[];a.equipped=[];
  assert(G.shopStock(s).includes(item));const stats=[...a.stats],sp=a.sp,forecast=G.forecast(s,a,a.event),price=G.itemPrice(s,item);
  assert(!G.learnSkill(s,a.id,d.teaches));assert(!G.skillAvailable(a,d.teaches));
  assert(G.buyItem(s,item));assert.equal(s.money,100000-price);assert.match(G.itemPreview(s,item,a.id)[0].label,/Learns/);
  assert(G.useItem(s,item,a.id));assert(a.skills.includes(d.teaches));assert(a.equipped.includes(d.teaches));assert.equal(a.sp,sp);assert.equal(s.counters.skillsLearned,1);assert.equal(s.bag[item]||0,0);
  assert.deepEqual(a.stats,stats);assert(G.forecast(s,a,a.event)>forecast);
  assert.equal(athleteLook(a,s.colors).costume,SKILLS[d.teaches].costume);
  assert(G.toggleSkill(s,a.id,d.teaches));assert.equal(G.appearanceSkill(a),null);assert.equal(G.forecast(s,a,a.event),forecast);assert(a.skills.includes(d.teaches));
  assert(G.toggleSkill(s,a.id,d.teaches));assert(G.buyItem(s,item));const before=structuredClone(s);assert(!G.useItem(s,item,a.id));assert.deepEqual(s,before);
  const copy=validateCampaign(exportCampaign(s));assert.equal(G.appearanceSkill(copy.roster[0]),d.teaches);
 }
});
test('full skill slots keep a new transformation learned without replacing existing skills',()=>{
 const s=G.newGame(32),a=s.roster[0];a.skills=['icevein'];a.equipped=['icevein'];s.bag.foxmask=1;
 assert.match(G.itemPreview(s,'foxmask',a.id)[0].label,/slots are full/);
 assert(G.useItem(s,'foxmask',a.id));assert.deepEqual(a.equipped,['icevein']);assert(a.skills.includes('foxform'));assert.equal(G.appearanceSkill(a),null);
 assert(!G.toggleSkill(s,a.id,'foxform'));G.toggleSkill(s,a.id,'icevein');assert(G.toggleSkill(s,a.id,'foxform'));
});
test('transformation setups preserve their own appearances and bonuses, and stacking displays the strongest form',()=>{
 const s=G.newGame(33),a=s.roster[0];a.rank=1;a.stats=[40,50,60,70];a.skills=['foxform','ironform','owlform'];a.equipped=['foxform','ironform'];
 const snapshot=[...a.stats];const boost=G.performanceStats(a);for(let i=0;i<4;i++)assert(Math.abs(boost[i]-snapshot[i]*1.13)<1e-9);
 assert.equal(G.appearanceSkill(a),'ironform');a.loadouts={enabled:true,training:['owlform'],meet:['ironform','foxform']};
 assert.equal(athleteLook(a,s.colors).costume,'owl');assert.equal(athleteLook(a,s.colors,{mode:'meet'}).costume,'iron');
 assert.equal(G.effects(s,a,true,'training').xp/G.effects(s,{...a,loadouts:{enabled:false},equipped:[]},true,'training').xp,1.15);
 a.stats=[99,100,98,100];assert(G.performanceStats(a).every(v=>v<=100));assert.deepEqual(snapshot,[40,50,60,70]);
 const copy=validateCampaign(exportCampaign(s));assert.deepEqual(copy.roster[0].loadouts,a.loadouts);
});
test('transformation items respect shop tiers, cannot be taught mid-meet, and UI describes the shop-to-skill flow',()=>{
 const s=G.newGame(34),a=s.roster[0];assert(G.shopStock(s).includes('foxmask'));assert(!G.shopStock(s).includes('cometcrown'));
 s.bag.foxmask=1;G.enterCompetition(s,{kind:'duel',tier:0});s.day=s.matchDay;G.startMatch(s);const before=structuredClone(s);
 assert(!G.useItem(s,'foxmask',a.id));assert.deepEqual(s,before);
 const fresh=G.newGame(35);assert.match(P.shop(fresh,{}),/Headgear & transformations/);assert.match(P.shop(fresh,{}),/Buy & teach/);
 assert.match(P.squad(fresh,{athlete:fresh.roster[0].id,tab:'skills'}),/normal skill slot/);
});
