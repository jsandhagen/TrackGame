import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeCompatibility,buildId,bundleVersion} from './build-identity.mjs';
const file=process.argv[2];
const name=file.split('/').at(-1);
writeFileSync('latest.json',JSON.stringify({schema:1,saveSchema:3,version:bundleVersion,buildId,nativeCompatibility,sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),url:'https://github.com/jsandhagen/TrackGame/releases/download/game-updates/'+name},null,2)+'\n');
