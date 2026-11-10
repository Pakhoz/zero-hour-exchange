import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newGame} from '../src/core.js';
const base='http://127.0.0.1:4175/zero-hour-exchange/';
await mkdir('test-results',{recursive:true});
let server;
async function startServer(){server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4175',BASE_PATH:'/zero-hour-exchange/'},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`server ${code}`)));});}
async function stopServer(){const stopped=new Promise(resolve=>server.once('exit',resolve));server.kill();await stopped;}
await startServer();
let count=0;const report=[];
const check=(name)=>{count++;report.push(name);console.log(`PASS ${name}`);};
const snapshot=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('zero-hour-exchange.v1')));
const clickTab=(page,name)=>page.locator(`[data-tab="${name}"]`).click();
const confirm=page=>page.locator('#confirm-modal').click();
const idle=page=>page.waitForFunction(()=>!document.querySelector('.scene')?.dataset.fx);
const legacy=JSON.parse(await readFile(new URL('./fixtures/v1-save.json',import.meta.url),'utf8'));
async function v2Scenario(browser,config){
 const context=await browser.newContext({viewport:config.viewport,hasTouch:config.touch,isMobile:config.touch,deviceScaleFactor:1,...(config.name==='chromium-desktop'?{recordVideo:{dir:'test-results/video',size:{width:1440,height:1080}}}:{})});
 context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(30000);
 await context.addInitScript(s=>{if(!localStorage.getItem('zero-hour-exchange.v1'))localStorage.setItem('zero-hour-exchange.v1',JSON.stringify(s));},legacy);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base);await page.locator('#cash').waitFor();await idle(page);
  const upgraded=await snapshot(page);assert.equal(upgraded.version,2);assert.equal(upgraded.cash,legacy.cash);assert.equal(upgraded.seed,legacy.seed);assert.deepEqual(upgraded.inventory,legacy.inventory);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('zero-hour-exchange.original-v1:zero-hour-exchange.v1'))),legacy);
  check(`${config.name}: V1 browser migration preserves state and original backup`);
  // Mark the DOM node, then prove it survives a conversation update (no whole-stage redraw).
  await page.evaluate(()=>{window.testStage=document.querySelector('.scene');window.testActor=document.querySelector('.customer-actor');});
  await page.locator('[data-interact="talk"]').click();assert.equal((await snapshot(page)).customer.interactions.talked,true);assert.equal(await page.locator('[data-interact="talk"]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.testStage===document.querySelector('.scene')&&window.testActor===document.querySelector('.customer-actor')),true);
  await page.locator('#counter-item').click();assert.equal((await snapshot(page)).customer.interactions.inspected,true);
  const cash=(await snapshot(page)).cash;await page.locator('[data-interact="tea"]').dblclick();assert.equal((await snapshot(page)).cash,cash-10);assert.equal(await page.locator('.tea-cup').isVisible(),true);
  await idle(page);await page.screenshot({path:`test-results/v2-${config.name}.png`,fullPage:true});
  const offer=page.locator('#offer');await offer.fill('120');await page.locator('[data-nudge="10"]').click();assert.equal(await offer.inputValue(),'130');await page.locator('[data-nudge="-10"]').click();assert.equal(await offer.inputValue(),'120');
  check(`${config.name}: touch props, persistent stage, chat, tea once and price nudges`);
  // Observe real rendered movement. Slow only this assertion's playback: Windows
  // WebKit can render fewer than three frames in the normal 900ms transition.
  // The separate interrupted-navigation assertion below uses production speed.
  await page.evaluate(()=>{window.motionSamples=[];const scene=document.querySelector('.scene');const observer=new MutationObserver(()=>{if(scene.dataset.fx!=='depart')return;observer.disconnect();scene.scrollIntoView({block:'center',behavior:'instant'});const actor=document.querySelector('.customer-actor');actor.getAnimations().forEach(animation=>{animation.playbackRate=.1;});const started=performance.now();const sample=()=>{window.motionSamples.push(actor.getBoundingClientRect().x);if(performance.now()-started<9000)requestAnimationFrame(sample);};requestAnimationFrame(sample);});observer.observe(scene,{attributes:true,attributeFilter:['data-fx']});});
  await page.locator('[data-action="reject"]').click();assert.equal((await snapshot(page)).customer.status,'left');
  try{await page.waitForFunction(()=>window.motionSamples.length>=3&&Math.max(...window.motionSamples)-Math.min(...window.motionSamples)>5);}catch(error){console.error('Motion diagnostics',await page.evaluate(()=>({samples:window.motionSamples,phase:document.querySelector('.scene').dataset.fx,visibility:document.visibilityState,scene:document.querySelector('.scene').getBoundingClientRect().toJSON()})));throw error;}const positions=await page.evaluate(()=>window.motionSamples);assert.ok(Math.max(...positions)-Math.min(...positions)>5,'customer must physically move during departure');
  // Refresh while the guest is walking out: no replay or resurrection.
  const departed=await snapshot(page);await page.reload();await page.locator('#cash').waitFor();assert.deepEqual(await snapshot(page),departed);assert.equal(await page.locator('.customer-actor').evaluate(e=>getComputedStyle(e).opacity),'0');
  await page.locator('#door-next').click();await page.waitForFunction(()=>document.querySelector('.scene')?.dataset.fx==='arrive');await idle(page);assert.equal((await snapshot(page)).customer.status,'active');
  assert.equal(await page.locator('.customer-actor').evaluate(e=>getComputedStyle(e).opacity),'1');
  const beforeInterrupted=await snapshot(page);
  await page.evaluate(()=>{document.querySelector('[data-action="reject"]').addEventListener('click',()=>setTimeout(()=>{sessionStorage.setItem('test-phase-at-refresh',document.querySelector('.scene').dataset.fx||'idle');location.reload();},100),{once:true});});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('[data-action="reject"]').click()]);await page.locator('#cash').waitFor();
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('test-phase-at-refresh')),'depart');assert.equal((await snapshot(page)).customer.status,'left');assert.equal((await snapshot(page)).served,beforeInterrupted.served+1);assert.equal((await snapshot(page)).cash,beforeInterrupted.cash);
  check(`${config.name}: animated exit/entrance, door interaction and reload mid-animation`);
  await page.locator('#radio').click();assert.equal(await page.locator('.story-current h2').innerText(),'雨夜的寄件人');await page.screenshot({path:`test-results/v2-story-${config.name}.png`,fullPage:true});
  const beforeStory=(await snapshot(page)).cash;await page.locator('[data-story-choice="help"]').click();await confirm(page);const storySave=await snapshot(page);assert.equal(storySave.cash,beforeStory-60);assert.equal(storySave.story.reputation,2);assert.equal(storySave.story.current.status,'resolved');
  await page.reload();await page.locator('#cash').waitFor();assert.deepEqual(await snapshot(page),storySave);await clickTab(page,'stories');assert.equal(await page.locator('[data-story-choice]').count(),0);
  await clickTab(page,'collection');assert.ok(await page.locator('.collection-card.discovered').count()>0);await page.locator('.collection-card.discovered').first().click();await page.locator('#close-modal').click();await page.screenshot({path:`test-results/v2-collection-${config.name}.png`,fullPage:true});
  for(const tab of ['stories','collection','inventory','upgrades','trade']){await clickTab(page,tab);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${config.name}/${tab}`);}
  check(`${config.name}: story decision persistence, collection detail and all new view layouts`);
  const audioState=()=>page.evaluate(async()=>{const {sound}=await import('./src/audio.js');return sound.getState();});
  const supportsAudio=await page.evaluate(()=>typeof (globalThis.AudioContext||globalThis.webkitAudioContext)==='function');
  assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');await page.locator('#sound-toggle').click();
  if(supportsAudio){await page.waitForFunction(()=>document.querySelector('#sound-toggle')?.getAttribute('aria-pressed')==='true');assert.equal((await audioState()).contextState,'running');}
  else{assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');assert.match(await page.locator('#toast').innerText(),/无法启动声音/);}
  await page.locator('#save-menu').click();await page.locator('#audio-ambience').click();assert.equal((await audioState()).ambientNodes>0,supportsAudio);await page.locator('#audio-volume').fill('25');assert.equal((await audioState()).volume,.25);await page.locator('#close-modal').click();
  if(supportsAudio)await page.locator('#sound-toggle').click();assert.equal((await audioState()).ambientNodes,0);assert.equal((await audioState()).enabled,false);
  await page.reload();await page.locator('#cash').waitFor();assert.equal((await audioState()).contextState,'uninitialized');assert.equal((await audioState()).volume,.25);
  check(`${config.name}: ${supportsAudio?'opt-in synthesized audio, ambience and mute':'Web Audio unavailable: explicit silent fallback'}; volume and preference restore`);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await stopServer();await assert.rejects(fetch(base));
  await page.reload();await page.locator('#cash').waitFor();await clickTab(page,'collection');assert.ok(await page.locator('.discovered').count()>0);await clickTab(page,'stories');assert.equal(await page.locator('.story-result').count(),1);await startServer();
  check(`${config.name}: V2 stories/collection/audio modules available without origin server`);
  await page.locator('#save-menu').click();const downloadPromise=page.waitForEvent('download');await page.locator('#export-legacy').click();const download=await downloadPromise;assert.deepEqual(JSON.parse(await readFile(await download.path(),'utf8')),legacy);
  await page.locator('#import-file').setInputFiles({name:'v1-save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await confirm(page);assert.equal((await snapshot(page)).version,2);assert.equal((await snapshot(page)).cash,legacy.cash);assert.equal((await snapshot(page)).seed,legacy.seed);
  check(`${config.name}: original V1 backup download and V1 JSON import through UI`);
  assert.deepEqual(errors,[]);
 }finally{await context.close();if(config.name==='chromium-desktop')await page.video().saveAs('test-results/v2-demo.webm');}
}
try{
 for(const config of [
  {name:'chromium-desktop',engine:chromium,viewport:{width:1440,height:1080},touch:false},
  {name:'webkit-ipad-landscape',engine:webkit,viewport:{width:1366,height:1024},touch:true},
  {name:'webkit-ipad-portrait',engine:webkit,viewport:{width:1024,height:1366},touch:true},
  {name:'webkit-small-tablet',engine:webkit,viewport:{width:768,height:1024},touch:true},
  {name:'chromium-phone',engine:chromium,viewport:{width:390,height:844},touch:true}
 ].filter(c=>!process.env.BROWSER_FILTER||c.name.includes(process.env.BROWSER_FILTER))){
  const browser=await config.engine.launch({headless:true});
  try{
   if(process.env.V2_ONLY){await v2Scenario(browser,config);continue;}
   const context=await browser.newContext({viewport:config.viewport,hasTouch:config.touch,isMobile:config.touch,deviceScaleFactor:1});
   context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(30000);
   await context.addInitScript(s=>{if(!localStorage.getItem('zero-hour-exchange.v1'))localStorage.setItem('zero-hour-exchange.v1',JSON.stringify(s));},newGame(42));
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base);await page.locator('#cash').waitFor();
   assert.equal((await snapshot(page)).cash,1000);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await idle(page);await page.screenshot({path:`test-results/${config.name}.png`,fullPage:true});
   const small=await page.locator('button').evaluateAll(els=>els.filter(e=>!e.disabled&&e.getBoundingClientRect().height<44).map(e=>e.outerHTML));assert.deepEqual(small,[]);
   check(`${config.name}: launch, layout, 44px controls and screenshot`);
   // A real double click must acquire only once; browser events traverse the public UI.
   const before=await snapshot(page);await page.locator('[data-action="accept"]').dblclick({delay:20});
   const after=await snapshot(page);assert.equal(after.cash,1000-before.customer.quote);assert.equal(after.inventory.length,1);assert.equal(after.stats.trades,1);
   await page.reload();await page.locator('#cash').waitFor();assert.deepEqual(await snapshot(page),after);
   check(`${config.name}: acquire, double click protection and refresh persistence`);
   await page.locator('#save-menu').click();await page.locator('#manual-save').click();await page.locator('#close-modal').click();
   await clickTab(page,'inventory');await page.locator('[data-detail]').click();await page.locator('#close-modal').click();await page.locator('#filter').selectOption(String(after.inventory[0].category));assert.equal(await page.locator('.item-card').count(),1);await page.locator('#sort').selectOption('value');
   await page.locator('[data-sell]').click();await confirm(page);const sold=await snapshot(page);assert.equal(sold.inventory.length,0);assert.ok(sold.cash>after.cash);
   await page.locator('#save-menu').click();await page.locator('#manual-load').click();await confirm(page);assert.deepEqual(await snapshot(page),after);
   check(`${config.name}: inventory details, filter, sort, sale and manual restore`);
   await clickTab(page,'upgrades');await page.locator('[data-upgrade="storage"]').click();await confirm(page);assert.equal((await snapshot(page)).upgrades.storage,1);
   await page.locator('#end-day').click();await confirm(page);assert.equal((await snapshot(page)).day,2);
   await clickTab(page,'records');assert.equal(await page.locator('tbody tr').count(),1);
   await page.locator('#save-menu').click();await page.locator('#new-game').click();await page.locator('#cancel-modal').click();assert.equal((await snapshot(page)).day,2);
   const beforeOrientation=await snapshot(page);await page.setViewportSize({width:config.viewport.height,height:config.viewport.width});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(await snapshot(page),beforeOrientation);
   check(`${config.name}: upgrade, end day, ledger, reset cancel and rotation`);
   await clickTab(page,'trade');await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   // WebKit's setOffline incorrectly rejects SW responses (playwright#42775).
   // Stop the actual origin instead; also use Chromium's network emulation there.
   await stopServer();await assert.rejects(fetch(base));if(config.engine===chromium)await context.setOffline(true);
   const offlineResponse=await page.reload();assert.equal(offlineResponse.fromServiceWorker(),true);await page.locator('#cash').waitFor();assert.deepEqual(await snapshot(page),beforeOrientation);
   await page.locator('[data-action="reject"]').click();assert.equal((await snapshot(page)).customer.status,'left');if(config.engine===chromium)await context.setOffline(false);await startServer();
   check(`${config.name}: origin stopped, service worker refresh and playable trade`);
   // Locks serialize tabs so another tab cannot overwrite the active game's state.
   const second=await context.newPage();await second.goto(base);await second.locator('#cash').waitFor();assert.equal(await second.locator('#end-day').isDisabled(),true);await second.close();
   assert.deepEqual(errors,[]);check(`${config.name}: second tab protection and no runtime errors`);
   await context.close();
   await v2Scenario(browser,config);
  }finally{await browser.close();}
 }
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext(),page=await context.newPage();
  await page.addInitScript(()=>localStorage.setItem('zero-hour-exchange.v1','{broken'));
  await page.goto(base);await page.locator('.warning').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('zero-hour-exchange.v1')),'{broken');
  await page.locator('[data-action="reject"]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('zero-hour-exchange.v1')),'{broken');check('corrupt saves preserved until explicit reset/import');await context.close();
  const blocked=await browser.newContext(),p=await blocked.newPage();await p.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');};});await p.goto(base);await p.locator('#cash').waitFor();await p.locator('[data-action="accept"]').click();assert.match(await p.locator('#save-note').innerText(),/无法保存/);check('storage failure remains playable and displays export guidance');await blocked.close();
  const reduced=await browser.newContext({reducedMotion:'reduce'}),rp=await reduced.newPage();await rp.goto(base);await rp.locator('#cash').waitFor();await idle(rp);assert.equal(await rp.locator('.portrait').evaluate(e=>getComputedStyle(e).animationName),'none');await rp.locator('[data-action="reject"]').click();await idle(rp);assert.equal((await snapshot(rp)).customer.status,'left');check('reduced-motion mode skips animation while completing transactions');await reduced.close();
 }finally{await browser.close();}
}finally{server.kill();await writeFile('test-results/browser-report.json',JSON.stringify({passed:count,checks:report},null,2));}
console.log(`Browser checks passed: ${count}`);
