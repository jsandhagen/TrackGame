import {Capacitor,CapacitorHttp} from '@capacitor/core';
import {Preferences} from '@capacitor/preferences';
import {CapacitorUpdater} from '@capgo/capacitor-updater';
import {RELEASE_ROOT,validateUpdate} from './update-policy.js';
export const GAME_VERSION=__GAME_VERSION__;
const native=Capacitor.isNativePlatform(), pendingKey='game-update-pending', shellKey='game-native-compatibility';
let pending=null, busy=false, status=native?'Automatic checks are enabled. Updates apply on a cold launch.':'Automatic game updates are available in the Android app.';
export const updateStatus=()=>status;
export const hasPendingUpdate=()=>!!pending;
const get=async key=>(await Preferences.get({key})).value;
export async function prepareUpdates(){
  if(!native)return false;
  const current=await CapacitorUpdater.current();
  if(current.bundle.id==='builtin')await Preferences.set({key:shellKey,value:__NATIVE_COMPAT__});
  pending=JSON.parse(await get(pendingKey) || 'null');
  if(pending)return applyPendingUpdate();
  return false;
}
export async function markGameHealthy(){
  if(native)await CapacitorUpdater.notifyAppReady();
}
export async function applyPendingUpdate(){
  if(!native || !pending)return false;
  const item=pending;
  // Clear before switching so a broken bundle cannot be retried in a loop.
  await Preferences.remove({key:pendingKey});pending=null;
  const compatibility=await get(shellKey);
  if(validateUpdate(item.manifest,compatibility,__BUILD_ID__)!=='compatible')return false;
  const list=await CapacitorUpdater.list();
  const bundle=list.bundles.find(b=>b.id===item.id);
  if(!bundle || ['error','deleted'].includes(bundle.status))return false;
  const saved=await get('ring-sector-leagues-v3');
  if(saved)await Preferences.set({key:'ring-sector-pre-update-backup',value:saved});
  // This is a terminal call: the WebView reloads. Never use next(), which can
  // activate on background/resume and interrupt an active competition.
  await CapacitorUpdater.set({id:item.id});
  return true;
}
export async function checkForUpdates(){
  if(!native || busy)return;
  busy=true;
  try{
    if(pending){status='An update is downloaded. It will apply on your next cold launch, or use Apply from Club.';return;}
    const response=await CapacitorHttp.get({url:RELEASE_ROOT+'latest.json',connectTimeout:10000,readTimeout:15000,headers:{'Cache-Control':'no-cache'}});
    if(response.status!==200){status='No published update is available. Your installed game is ready to play.';return;}
    const manifest=typeof response.data==='string'?JSON.parse(response.data):response.data;
    const compatibility=await get(shellKey);
    const verdict=validateUpdate(manifest,compatibility,__BUILD_ID__);
    if(verdict==='native-required'){status='A newer version needs a new Android installer. Your current game still works.';return;}
    if(verdict==='current'){status='Your game is up to date.';return;}
    const failed=JSON.parse(await get('game-update-attempted') || '[]');
    if(failed.includes(manifest.buildId)){status='This update was already attempted. Keeping the working game until a newer update is published.';return;}
    status='Downloading a game update. You can keep playing.';
    const bundle=await CapacitorUpdater.download({url:manifest.url,version:manifest.version,checksum:manifest.sha256});
    pending={id:bundle.id,manifest};
    await Preferences.set({key:'game-update-attempted',value:JSON.stringify([...failed,manifest.buildId].slice(-20))});
    await Preferences.set({key:pendingKey,value:JSON.stringify(pending)});
    status='Update downloaded. It will apply on the next cold launch. Your meet will not be interrupted.';
  }catch(error){console.warn('Update check unavailable',error);status='Update check unavailable. Your installed game and save remain available offline.';}
  finally{busy=false;}
}
