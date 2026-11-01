// Audit the advertised division distance bands against generated, equipped rival squads.
// Run: node scripts/division-audit.mjs [seeds=10]
import * as G from '../src/domain/game.js';
import { EVENT_IDS, EVENTS } from '../src/game-content.js';
const seeds=Number(process.argv[2]||10);
if(!Number.isInteger(seeds)||seeds<1||seeds>100)throw Error('Use 1–100 seeds.');
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
console.log('Division                    Shot        Discus      Hammer      Javelin     Within bands');
let all=0,inside=0;
for(const d of G.DIVISIONS) {
  const marks=Object.fromEntries(EVENT_IDS.map(ev=>[ev,[]]));let hits=0,count=0;
  for(let seed=1;seed<=seeds;seed++) {
    const s=G.newGame(seed),clubs=G.makeClubs(s,d.tier,d.stage,[0,1,2,3,4,5]);
    for(const a of clubs.flatMap(c=>c.athletes)) {
      const mark=G.forecast(s,a,a.event,{club:false}),[low,high]=d.marks[a.event];
      marks[a.event].push(mark);count++;
      if(mark>=low-0.05 && mark<=high+0.05)hits++;
      if(mark>=EVENTS[a.event].record)throw Error(d.name+' routinely exceeds the '+a.event+' record.');
    }
  }
  const row=EVENT_IDS.map(ev=>median(marks[ev]).toFixed(2).padEnd(12)).join('');
  console.log(d.name.padEnd(28)+row+(100*hits/count).toFixed(1)+'%');
  all+=count;inside+=hits;
}
console.log(`${inside}/${all} forecasts inside the advertised bands (${(100*inside/all).toFixed(2)}%).`);
if(inside/all<0.98)process.exitCode=1;
