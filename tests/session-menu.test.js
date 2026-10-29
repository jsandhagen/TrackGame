import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as G from './helpers/developed-club.js';
import * as P from '../src/ui/pages.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';

async function platformModule(file,deps) {
 const id='platform_'+Math.random();globalThis[id]=deps;
 let source=readFileSync(new URL('../src/platform/'+file,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
 source=`const {Capacitor,App,ScreenOrientation,Preferences,document,window,localStorage,console}=globalThis[${JSON.stringify(id)}];\n`+source;
 const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 delete globalThis[id];return api;
}

test('device rotation is unlocked by default; orientation preferences and native exit use platform APIs',async()=>{
 const calls=[];const api=await platformModule('native.js',{
  Capacitor:{isNativePlatform:()=>true},document:{documentElement:{classList:{add(){}}}},
  ScreenOrientation:{unlock:async()=>calls.push('unlock'),lock:async value=>calls.push(value.orientation)},
  App:{addListener:async()=>{},exitApp:async()=>calls.push('exit')}
 });
 await api.initNative({pause(){},back(){}});assert.deepEqual(calls,['unlock']);
 await api.setOrientation('portrait');await api.setOrientation('landscape');await api.setOrientation('auto');
 assert.equal(await api.exitApp(),true);assert.deepEqual(calls,['unlock','portrait','landscape','unlock','exit']);
 const manifest=readFileSync(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
 assert.match(manifest,/screenOrientation="fullUser"/);
});

test('browser orientation and exit are safe no-ops',async()=>{
 const api=await platformModule('native.js',{Capacitor:{isNativePlatform:()=>false}});
 await api.setOrientation('portrait');assert.equal(await api.exitApp(),false);
});

test('native flush waits for durable saving, reports failure and recovers on a successful retry',async()=>{
 let finish,fail=false;const writes=[],errors=[];
 const api=await platformModule('persistence.js',{
  Capacitor:{isNativePlatform:()=>true},Preferences:{get:async()=>({value:null}),set:async({value})=>{writes.push(value);if(fail)throw Error('Disk unavailable');await new Promise(resolve=>finish=resolve);}},
  localStorage:{getItem:()=>null,setItem(){}},window:{dispatchEvent:e=>errors.push(e.type)},console:{error(){}}
 });
 const store=await api.createPersistence('club');store.write('one');let flushed=false;
 const pending=store.flush().then(()=>flushed=true);await Promise.resolve();await Promise.resolve();assert.equal(flushed,false);
 finish();await pending;assert.equal(flushed,true);
 fail=true;await store.write('two');await assert.rejects(store.flush(),/Disk unavailable/);assert.deepEqual(errors,['save-error']);
 fail=false;const retry=store.write('three');await Promise.resolve();await Promise.resolve();finish();await retry;await store.flush();assert.deepEqual(writes,['one','two','three']);
});

test('settings, save and exit are available from the menu and orientation survives a save',()=>{
 const s=G.newGame(11);assert.equal(s.settings.orientation,'auto');s.settings.orientation='portrait';
 assert.equal(validateCampaign(exportCampaign(s)).settings.orientation,'portrait');
 const menu=P.gameMenu(s);assert.match(menu,/Save & exit/);assert.match(menu,/Save game/);assert.match(menu,/Settings/);assert(!menu.includes('fullscreen'));
 assert.match(P.gameMenu(s,{page:'settings',native:true}),/Follow device/);
 assert.match(P.gameMenu(s,{page:'saved'}),/safely close this tab/);
});
