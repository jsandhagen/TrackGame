import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {RELEASE_ROOT} from '../src/platform/update-policy.js';
const manifest={schema:1,saveSchema:3,version:'0.4.0+'+'b'.repeat(12),buildId:'b'.repeat(40),nativeCompatibility:'native',sha256:'c'.repeat(64),url:RELEASE_ROOT+'game-'+ 'b'.repeat(40)+'.zip'};
let counter=0;
async function harness({offline=false,pending=null,compat='native',downloadError=false,response=null,readyError=false}={}){
 const values=new Map([['ring-sector-leagues-v3','original-save'],['game-native-compatibility',compat]]),calls=[];
 if(pending)values.set('game-update-pending',JSON.stringify(pending));
 const id='updaterTest'+counter++;
 globalThis[id]={
  Capacitor:{isNativePlatform:()=>true},
  CapacitorHttp:{get:async()=>{if(offline)throw Error('offline');return response||{status:200,data:manifest};}},
  Preferences:{get:async({key})=>({value:values.get(key)||null}),set:async({key,value})=>values.set(key,value),remove:async({key})=>values.delete(key)},
  CapacitorUpdater:{
   current:async()=>({bundle:{id:'working'}}),
   list:async()=>({bundles:[{id:'downloaded',status:'pending'}]}),
   download:async options=>{calls.push(['download',options]);if(downloadError)throw Error('checksum rejected');return {id:'downloaded'};},
   set:async options=>{calls.push(['set',options]);},notifyAppReady:async()=>{if(readyError)throw Error('plugin missing');calls.push(['healthy']);}
  }
 };
 let source=readFileSync(new URL('../src/platform/updates.js',import.meta.url),'utf8');
 source=source.replace(/import \{Capacitor,CapacitorHttp\}[^\n]+\n/,'').replace(/import \{Preferences\}[^\n]+\n/,'').replace(/import \{CapacitorUpdater\}[^\n]+\n/,'');
 source=source.replace("'./update-policy.js'",JSON.stringify(pathToFileURL(process.cwd()+'/src/platform/update-policy.js').href));
 source=source.replaceAll('__GAME_VERSION__',"'0.4.0+aaaaaaaaaaaa'").replaceAll('__NATIVE_COMPAT__',"'native'").replaceAll('__BUILD_ID__',"'"+'a'.repeat(40)+"'");
 source=`const console={warn:()=>{}}; const {Capacitor,CapacitorHttp,Preferences,CapacitorUpdater}=globalThis[${JSON.stringify(id)}];\n`+source;
 const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 return {api,values,calls,cleanup:()=>delete globalThis[id]};
}
test('background checks stage verified downloads without activating; cold launch backs up and switches once',async()=>{
 const h=await harness();try{
  await h.api.markGameHealthy();await h.api.checkForUpdates();
  assert(h.api.hasPendingUpdate());assert(!h.calls.some(c=>c[0]==='set'));
  assert.equal(h.calls.find(c=>c[0]==='download')[1].checksum,manifest.sha256);
  await h.api.prepareUpdates();
  assert.equal(h.values.get('ring-sector-pre-update-backup'),'original-save');
  assert(!h.values.has('game-update-pending'));assert.equal(h.calls.filter(c=>c[0]==='set').length,1);
  await h.api.prepareUpdates();assert.equal(h.calls.filter(c=>c[0]==='set').length,1);
 }finally{h.cleanup();}
});
test('offline checks and checksum rejection keep the installed game and never stage or activate a bundle',async()=>{
 for(const options of [{offline:true},{downloadError:true}]){
  const h=await harness(options);try{await h.api.checkForUpdates();assert(!h.api.hasPendingUpdate());assert(!h.calls.some(c=>c[0]==='set'));assert.equal(h.values.get('ring-sector-leagues-v3'),'original-save');}finally{h.cleanup();}
 }
});
test('a failed attempted bundle is not downloaded or activated again; incompatible pending bundles are discarded',async()=>{
 const h=await harness();try{
  h.values.set('game-update-attempted',JSON.stringify([manifest.buildId]));await h.api.checkForUpdates();assert.equal(h.calls.length,0);
 }finally{h.cleanup();}
 const other=await harness({pending:{id:'downloaded',manifest},compat:'different'});try{
  assert.equal(await other.api.prepareUpdates(),false);assert(!other.values.has('game-update-pending'));assert(!other.calls.some(c=>c[0]==='set'));
 }finally{other.cleanup();}
});
test('an unavailable update service is skipped: no release, a malformed manifest or a broken updater never block play',async()=>{
 for(const response of [{status:404,data:'Not Found'},{status:200,data:'{"schema":1'},{status:200,data:{...manifest,url:'https://example.com/game.zip'}}]){
  const h=await harness({response});try{
   await h.api.checkForUpdates();
   assert(!h.api.hasPendingUpdate());assert(!h.calls.some(c=>c[0]==='download'||c[0]==='set'));
   assert.match(h.api.updateStatus(),/No published update|unavailable/);
  }finally{h.cleanup();}
 }
 const broken=await harness({readyError:true});try{
  await broken.api.markGameHealthy();
  assert.match(broken.api.updateStatus(),/unavailable/);
 }finally{broken.cleanup();}
});
test('progress is visible: checking, downloading with a percentage, then ready to install',async()=>{
 const h=await harness();try{
  const seen=[];h.api.onUpdateChange(u=>seen.push(u.phase+(u.phase==='downloading'?':'+u.percent:'')));
  await h.api.checkForUpdates();
  assert.deepEqual(seen.slice(0,2),['checking','downloading:0']);
  const u=h.api.updateInfo();
  assert.equal(u.phase,'ready');assert(u.pending);assert.equal(u.pendingVersion,manifest.version);
  assert.match(u.status,/Restart to install/);
 }finally{h.cleanup();}
});
test('checks repeat on resume without hammering the release, and a forced check always runs',async()=>{
 const h=await harness({response:{status:404,data:'Not Found'}});try{
  let gets=0;const http=globalThis[Object.keys(globalThis).find(k=>k.startsWith('updaterTest')&&globalThis[k].CapacitorHttp)].CapacitorHttp,get=http.get;http.get=async(...a)=>{gets++;return get(...a);};
  await h.api.checkForUpdates();await h.api.checkForUpdates();assert.equal(gets,1,'a second automatic check soon after is skipped');
  await h.api.checkForUpdates({force:true});assert.equal(gets,2,'Check for updates always asks');
 }finally{h.cleanup();}
});
test('the first healthy start on a new version says it was updated, once',async()=>{
 const h=await harness();try{
  h.values.set('game-last-version','0.3.9+'+'f'.repeat(12));
  await h.api.markGameHealthy();
  assert.deepEqual(h.api.updateInfo().updated,{from:'0.3.9+'+'f'.repeat(12),to:'0.4.0+aaaaaaaaaaaa'});
  assert.equal(h.values.get('game-last-version'),'0.4.0+aaaaaaaaaaaa');
 }finally{h.cleanup();}
});
