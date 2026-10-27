import test from 'node:test';
import assert from 'node:assert/strict';
import {RELEASE_ROOT,validateUpdate,mayRestart} from '../src/platform/update-policy.js';
const manifest=()=>({schema:1,saveSchema:3,version:'0.4.0+'+'b'.repeat(12),buildId:'b'.repeat(40),nativeCompatibility:'native',sha256:'c'.repeat(64),url:RELEASE_ROOT+'game-'+ 'b'.repeat(40)+'.zip'});
test('only supported saves and compatible native shells receive updates',()=>{
 assert.equal(validateUpdate(manifest(),'native','a'.repeat(40)),'compatible');
 assert.equal(validateUpdate(manifest(),'different','a'.repeat(40)),'native-required');
 assert.equal(validateUpdate(manifest(),'native','b'.repeat(40)),'current');
 assert.throws(()=>validateUpdate({...manifest(),saveSchema:4},'native','a'));
});
test('update downloads require the pinned repository, HTTPS and a complete SHA256 checksum',()=>{
 for(const url of ['http://github.com/jsandhagen/TrackGame/releases/download/game-updates/game-a.zip',RELEASE_ROOT+'../other.zip','https://example.com/game-a.zip',RELEASE_ROOT+'game-a.zip?redirect=evil'])assert.throws(()=>validateUpdate({...manifest(),url},'native','a'));
 assert.throws(()=>validateUpdate({...manifest(),sha256:'oops'},'native','a'));
});
test('explicit update restarts are unavailable while competing or training',()=>{
 assert(!mayRestart({match:{}},false));assert(!mayRestart({match:null},true));assert(mayRestart({match:null},false));
});
