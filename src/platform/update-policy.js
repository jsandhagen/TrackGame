export const RELEASE_ROOT='https://github.com/jsandhagen/TrackGame/releases/download/game-updates/';
export function validateUpdate(m,nativeCompatibility,currentBuild){
  if(!m || m.schema!==1 || m.saveSchema!==3 || typeof m.version!=='string' || !/^\d+\.\d+\.\d+\+[a-f0-9]{12}$/.test(m.version) || !/^[a-f0-9]{40}$/.test(m.buildId || '') || !/^[a-f0-9]{64}$/.test(m.sha256 || '') || typeof m.url!=='string' || !m.url.startsWith(RELEASE_ROOT) || !/^game-[a-zA-Z0-9.+-]+\.zip$/.test(m.url.slice(RELEASE_ROOT.length))) throw Error('The update manifest is invalid. Keeping the installed game.');
  if(m.nativeCompatibility!==nativeCompatibility) return 'native-required';
  if(m.buildId===currentBuild) return 'current';
  return 'compatible';
}
export const mayRestart=(state,training)=>!state.match && !training;
