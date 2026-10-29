import {Capacitor,CapacitorHttp} from '@capacitor/core';
import {Preferences} from '@capacitor/preferences';
import {CapacitorUpdater} from '@capgo/capacitor-updater';
import {RELEASE_ROOT,validateUpdate} from './update-policy.js';
export const GAME_VERSION=__GAME_VERSION__;
const native=Capacitor.isNativePlatform(), pendingKey='game-update-pending', shellKey='game-native-compatibility', lastKey='game-last-version';
// Every career slot is backed up before a new bundle takes over.
const SAVE_KEYS=['ring-sector-leagues-v3','ring-sector-leagues-v3-slot2','ring-sector-leagues-v3-slot3'];
// Check again on resume and while playing, but not more often than this.
const RECHECK_MS=10*60*1000;
let pending=null, busy=false, lastCheck=0, updated=null, status=native?'Automatic checks are enabled.':'Automatic game updates are available in the Android app.';
// phase: idle | checking | downloading | ready | current | unavailable. percent while downloading.
let progress={phase:'idle',percent:0};
const listeners=new Set();
const changed=()=>{for(const fn of listeners)try{fn(updateInfo());}catch(error){console.warn(error);}};
const set=(phase,text,percent=0)=>{progress={phase,percent};if(text)status=text;changed();};
export const updateStatus=()=>status;
export const hasPendingUpdate=()=>!!pending;
export const updateInfo=()=>({...progress,status,pending:!!pending,version:GAME_VERSION,pendingVersion:pending?.manifest?.version||null,updated});
export function onUpdateChange(fn){listeners.add(fn);return()=>listeners.delete(fn);}
const get=async key=>(await Preferences.get({key})).value;
// onApplying lets the boot screen say an update is being installed before the WebView reloads.
export async function prepareUpdates(onApplying){
  if(!native)return false;
  const current=await CapacitorUpdater.current();
  if(current.bundle.id==='builtin')await Preferences.set({key:shellKey,value:__NATIVE_COMPAT__});
  pending=JSON.parse(await get(pendingKey) || 'null');
  if(pending){onApplying?.(pending.manifest?.version);return applyPendingUpdate();}
  return false;
}
// Updates are optional: if the updater plugin can't answer, play on with the installed game.
export async function markGameHealthy(){
  if(!native)return;
  try{await CapacitorUpdater.notifyAppReady();}
  catch(error){console.warn('Updater unavailable; playing the installed game',error);status='Update service unavailable. Your installed game and save remain available.';changed();return;}
  // A first healthy start on a new version: tell the player it arrived.
  try{
    const last=await get(lastKey);
    if(last && last!==GAME_VERSION)updated={from:last,to:GAME_VERSION};
    await Preferences.set({key:lastKey,value:GAME_VERSION});
    if(updated){status='Updated to '+GAME_VERSION+'.';changed();}
  }catch(error){console.warn('Could not record the game version',error);}
}
export async function applyPendingUpdate(){
  if(!native || !pending)return false;
  const item=pending;
  // Clear before switching so a broken bundle cannot be retried in a loop.
  await Preferences.remove({key:pendingKey});pending=null;
  const compatibility=await get(shellKey);
  if(validateUpdate(item.manifest,compatibility,__BUILD_ID__)!=='compatible'){set('idle','The downloaded update no longer fits this app. Keeping the installed game.');return false;}
  const list=await CapacitorUpdater.list();
  const bundle=list.bundles.find(b=>b.id===item.id);
  if(!bundle || ['error','deleted'].includes(bundle.status)){set('idle','The downloaded update could not be found. It will download again.');return false;}
  const saved=await get(SAVE_KEYS[0]);
  if(saved)await Preferences.set({key:'ring-sector-pre-update-backup',value:saved});
  for(const key of SAVE_KEYS.slice(1)){const value=await get(key);if(value)await Preferences.set({key:key+'-pre-update-backup',value});}
  // This is a terminal call: the WebView reloads. Never use next(), which can
  // activate on background/resume and interrupt an active competition.
  await CapacitorUpdater.set({id:item.id});
  return true;
}
export async function checkForUpdates({force=false}={}){
  if(!native || busy)return;
  if(!force && Date.now()-lastCheck<RECHECK_MS)return;
  busy=true;lastCheck=Date.now();
  let listener=null;
  try{
    if(pending){set('ready','An update is downloaded and ready to install.');return;}
    set('checking','Checking for updates…');
    const response=await CapacitorHttp.get({url:RELEASE_ROOT+'latest.json',connectTimeout:10000,readTimeout:15000,headers:{'Cache-Control':'no-cache'}});
    if(response.status!==200){set('unavailable','No published update is available. Your installed game is ready to play.');return;}
    const manifest=typeof response.data==='string'?JSON.parse(response.data):response.data;
    const compatibility=await get(shellKey);
    const verdict=validateUpdate(manifest,compatibility,__BUILD_ID__);
    if(verdict==='native-required'){set('current','A newer version needs a new Android installer. Your current game still works.');return;}
    if(verdict==='current'){set('current','Your game is up to date.');return;}
    const failed=JSON.parse(await get('game-update-attempted') || '[]');
    if(failed.includes(manifest.buildId)){set('current','This update was already tried and did not start. Keeping the working game until a newer update is published.');return;}
    set('downloading','Downloading the update. You can keep playing.',0);
    try{listener=await CapacitorUpdater.addListener('download',({percent})=>{if(progress.phase==='downloading')set('downloading',null,Math.max(0,Math.min(100,Math.round(percent||0))));});}catch{}
    const bundle=await CapacitorUpdater.download({url:manifest.url,version:manifest.version,checksum:manifest.sha256});
    pending={id:bundle.id,manifest};
    await Preferences.set({key:'game-update-attempted',value:JSON.stringify([...failed,manifest.buildId].slice(-20))});
    await Preferences.set({key:pendingKey,value:JSON.stringify(pending)});
    set('ready','Update downloaded. Restart to install it; it also installs the next time the app starts.');
  }catch(error){console.warn('Update check unavailable',error);set('unavailable','Update check unavailable. Your installed game and save remain available offline.');}
  finally{busy=false;try{await listener?.remove();}catch{}}
}
