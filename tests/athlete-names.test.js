import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import {FIRST,LAST,EVENT_IDS} from '../src/game-content.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';
const reload=s=>validateCampaign(JSON.parse(JSON.stringify(exportCampaign(s))));
const everyone=s=>[...s.roster,...s.prospects,...Object.values(s.rivalClubs).flat().flatMap(c=>c.athletes)];

test('name pools are large and free of repeats',()=>{
  assert(FIRST.length>=150 && LAST.length>=150);
  assert.equal(new Set(FIRST).size,FIRST.length);
  assert.equal(new Set(LAST).size,LAST.length);
});

test('no two athletes in a career share a name, even after scouting again and again',()=>{
  for(const seed of [1,7,400,9001]) {
    const s=G.newGame(seed),seen=new Set(everyone(s).map(a=>a.name));
    for(let n=0;n<40;n++) {
      assert(G.scout(s,true));
      for(const a of s.prospects) {assert(!seen.has(a.name),a.name+' repeats');seen.add(a.name);}
    }
    const all=everyone(s).map(a=>a.name);
    assert.equal(new Set(all).size,all.length);
  }
});

test('names vary across careers instead of cycling a short list',()=>{
  const names=new Set();
  for(let seed=1;seed<=30;seed++) for(const c of G.newGame(seed).clubs) for(const a of c.athletes) names.add(a.name);
  assert(names.size>=80,`${names.size} distinct rival names`);
  const families=new Set([...names].map(n=>n.split(' ').slice(1).join(' ')));
  assert(families.size>=50);
});

test('the coach can rename an athlete; the name is cleaned, kept unique on the squad and saved',()=>{
  const s=G.newGame(12),[a,b]=s.roster;
  assert.equal(G.renameProblem(s,a.id,'   '),'A name needs at least one letter.');
  assert.equal(G.renameProblem(s,a.id,b.name.toUpperCase()),'Someone on the squad already has that name.');
  assert(!G.renameAthlete(s,a.id,b.name));
  assert(G.renameAthlete(s,a.id,'  Big\tLou <b>  Ferrari the Third of Ring  '));
  assert.equal(a.name,'Big Lou b Ferrari the Th');
  assert(a.name.length<=G.NAME_MAX);
  assert(G.renameAthlete(s,a.id,'Lou'));
  assert.equal(reload(s).roster[0].name,'Lou');
});

test('club records follow a renamed record holder',()=>{
  const s=G.newGame(12),a=s.roster[0];
  a.pb.shot=15.2;s.records.shot={mark:15.2,name:a.name,season:1};
  assert(G.renameAthlete(s,a.id,'Hana Rocket'));
  assert.equal(s.records.shot.name,'Hana Rocket');
});

test('the athlete page offers renaming',()=>{
  const s=G.newGame(5),a=s.roster[0];
  assert.match(P.squad(s,{athlete:a.id,tab:'stats'}),new RegExp(`data-act="rename-athlete" data-id="${a.id}"`));
  assert.match(P.renameBody(a),/id="athleteName"/);
});

test('changing entries shows portraits and stats, and the picker explains who cannot go',()=>{
  const s=G.newGame(31);s.money=99999;
  assert(G.recruit(s,s.prospects[0].id));assert(G.recruit(s,s.prospects[0].id));
  assert(G.enterCompetition(s,{kind:'duel',tier:0}));
  const lobby=P.lobby(s,{editLineup:true});
  assert.match(lobby,/data-act="pick-entry" data-event="shot" data-slot="0"/);
  assert.match(lobby,/class="entry-slot[^"]*"[^>]*>.*?data-portrait=/);
  assert.doesNotMatch(lobby,/<select data-change="entry"/);
  const ev='shot',picker=P.entryPicker(s,ev,0);
  for(const a of s.roster) assert(picker.includes(`data-pick="${a.id}"`)&&picker.includes(`data-portrait="${a.id}"`));
  assert.equal((picker.match(/class="sheet-stats"/g)||[]).length,s.roster.length);
  assert.match(picker,/data-pick="0"/);
  // Someone already in two other events is shown but can't be picked.
  const busy=s.roster.find(a=>!G.entriesOf(s,ev).includes(a.id));
  s.entries=Object.fromEntries(EVENT_IDS.map(e=>[e,[...G.entriesOf(s,e)].filter(id=>id!==busy.id)]));
  s.entries.discus.push(busy.id);s.entries.hammer.push(busy.id);
  const again=P.entryPicker(s,ev,0);
  assert.match(again,new RegExp(`data-pick="${busy.id}"[^>]*disabled`));
  assert.match(again,/Already in two events/);
  // PBs, not estimated distance, determine entry order.
  for(const [i,a] of s.roster.entries()) a.pb.shot=9+i;
  const withPbs=P.entryPicker(s,ev,0);
  const available=[...withPbs.matchAll(/<button class="pick-row entry-pick[^]*?<\/button>/g)].map(m=>m[0]).filter(row=>!/^<button[^>]*disabled/.test(row) && !row.includes("entry-clear"));
  const marks=available.map(row=>+row.match(/<b>PB ([\d.]+) m<\/b>/)[1]);
  assert(marks.length>=2);
  assert.deepEqual(marks,[...marks].sort((x,y)=>y-x));
});

test('nobody in view shares a given name: the squad, the scouting report and this league\'s rivals',()=>{
  for(const seed of [1,7,400,9001,31337]) {
    const s=G.newGame(seed);s.money=1e9;
    for(let n=0;n<30;n++) {
      assert(G.scout(s,true));
      if(n%4===0) G.recruit(s,s.prospects[0].id);
      const given=[...s.roster,...s.prospects,...s.clubs.flatMap(c=>c.athletes)].map(a=>a.name.split(' ')[0]);
      assert.equal(new Set(given).size,given.length,`seed ${seed}: ${given.join(', ')}`);
    }
  }
});
