import * as G from '../src/domain/game.js';
import { FACILITIES } from '../src/game-content.js';
for(const [name,fans,level] of [['small club',20,1],['established club',2000,3]]) {
 const s=G.newGame(200);s.fans=fans;s.money=10000;
 G.build(s,11,'cafe');G.build(s,12,'shop');
 let buildingInvestment=FACILITIES.cafe.cost+FACILITIES.shop.cost;
 for(const plot of [11,12]) while(s.plots[plot].level<level) { buildingInvestment+=G.upgradeCost(s.plots[plot].type,s.plots[plot].level); G.upgrade(s,plot); }
 const staff=[G.createAthlete(s,'shot'),G.createAthlete(s,'discus')];s.roster.push(...staff);
 G.assignDuty(s,'plot:11',staff[0].id);G.assignDuty(s,'plot:12',staff[1].id);
 let wages=0,work=0,rest=0;
 for(let i=0;i<28;i++) {
  while(s.pendingEvent) G.resolveEvent(s,G.eventView(s).choices.length-1);
  const r=G.advanceDay(s);work+=r.duties.length;
  rest+=r.athletes.filter(e=>staff.some(a=>a.id===e.id)&&e.activity==='rest').length;
  if(r.week) wages+=staff.reduce((n,a)=>n+G.wageOf(a),0);
 }
 console.log(JSON.stringify({name,staffRevenue:s.counters.facilityMoney||0,staffWages:wages,netStaffContribution:(s.counters.facilityMoney||0)-wages,workDays:work,recoveryDays:rest,buildingInvestment}));
}
