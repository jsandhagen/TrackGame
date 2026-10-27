import {prepareUpdates} from './platform/updates.js';
(async()=>{
  try { if(await prepareUpdates())return; }
  catch(error){console.warn('Using installed game',error);}
  await import('./main.js');
})().catch((error) => {
  console.error(error);
  const box = document.querySelector('#bootStatus');
  box.textContent = 'Your club could not be loaded. Please restart the app. No save was replaced.';
  const button = document.createElement('button');
  button.textContent = 'Try again';
  button.style.marginTop = '16px';
  button.addEventListener('click', () => location.reload());
  box.append(button);
});
