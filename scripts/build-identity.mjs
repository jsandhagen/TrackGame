import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
export const pkg=JSON.parse(readFileSync('package.json'));
const hash=createHash('sha256');
function add(path){hash.update(path);hash.update(readFileSync(path));}
function walk(path){for(const item of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path+'/'+item.name;if(p==='android/app/src/main/res/xml/config.xml')continue;if(item.isDirectory())walk(p);else add(p);}}
walk('android/app/src/main/java');
walk('android/app/src/main/res');
add('android/app/src/main/AndroidManifest.xml');
for(const p of ['capacitor.config.json','android/app/build.gradle','android/build.gradle','android/variables.gradle'])add(p);
const lock=JSON.parse(readFileSync('package-lock.json'));
for(const [name,info] of Object.entries(lock.packages).sort())if(name.startsWith('node_modules/@capacitor/') || name.startsWith('node_modules/@capgo/'))hash.update(name+info.version);
export const nativeCompatibility=hash.digest('hex');
export const buildId=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
export const bundleVersion=pkg.version+'+'+buildId.slice(0,12);
