import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Load the browser persistence module with a fake localStorage.
async function persistence(storage) {
 const id='slots_'+Math.random();globalThis[id]={Capacitor:{isNativePlatform:()=>false},Preferences:{},localStorage:storage,window:{dispatchEvent(){}},console};
 let source=readFileSync(new URL('../src/platform/persistence.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
 source=`const {Capacitor,Preferences,localStorage,window,console}=globalThis[${JSON.stringify(id)}];\n`+source;
 const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 delete globalThis[id];return api;
}
const fakeStorage=(entries={})=>{const m=new Map(Object.entries(entries));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};

test('only the first slot picks up prototype saves; extra slots start empty', async () => {
 const storage=fakeStorage({'ring-sector-club-v2':'old club'});
 const {createPersistence}=await persistence(storage);
 assert.equal((await createPersistence('ring-sector-leagues-v3')).read(),'old club');
 assert.equal((await createPersistence('ring-sector-leagues-v3-slot2',{legacy:false})).read(),null);
});

test('clearing a slot empties it and leaves the others alone', async () => {
 const storage=fakeStorage({'a':'club a','b':'club b'});
 const {createPersistence}=await persistence(storage);
 const a=await createPersistence('a',{legacy:false}),b=await createPersistence('b',{legacy:false});
 await a.clear();
 assert.equal(a.read(),null);assert(!storage.m.has('a'));assert.equal(b.read(),'club b');
 a.write('fresh');assert.equal(storage.m.get('a'),'fresh');
});

test('the first slot keeps the original career key the updater backs up', () => {
 const slots=readFileSync(new URL('../src/platform/slots.js',import.meta.url),'utf8'),updates=readFileSync(new URL('../src/platform/updates.js',import.meta.url),'utf8');
 const keys=JSON.parse(slots.match(/SLOT_KEYS = (\[[^\]]+\])/)[1]);
 assert.equal(keys[0],'ring-sector-leagues-v3');
 for(const key of keys)assert(updates.includes(`'${key}'`),`${key} is backed up before an update`);
});
