import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
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
try{
 for(const config of [
  {name:'chromium-desktop',engine:chromium,viewport:{width:1440,height:1080},touch:false},
  {name:'webkit-ipad-landscape',engine:webkit,viewport:{width:1366,height:1024},touch:true},
  {name:'webkit-ipad-portrait',engine:webkit,viewport:{width:1024,height:1366},touch:true},
  {name:'webkit-small-tablet',engine:webkit,viewport:{width:768,height:1024},touch:true},
  {name:'chromium-phone',engine:chromium,viewport:{width:390,height:844},touch:true}
 ]){
  const browser=await config.engine.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:config.viewport,hasTouch:config.touch,isMobile:config.touch,deviceScaleFactor:1});
   await context.addInitScript(s=>{if(!localStorage.getItem('zero-hour-exchange.v1'))localStorage.setItem('zero-hour-exchange.v1',JSON.stringify(s));},newGame(42));
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base);await page.locator('#cash').waitFor();
   assert.equal((await snapshot(page)).cash,1000);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:`test-results/${config.name}.png`,fullPage:true});
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
  }finally{await browser.close();}
 }
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext(),page=await context.newPage();
  await page.addInitScript(()=>localStorage.setItem('zero-hour-exchange.v1','{broken'));
  await page.goto(base);await page.locator('.warning').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('zero-hour-exchange.v1')),'{broken');
  await page.locator('[data-action="reject"]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('zero-hour-exchange.v1')),'{broken');check('corrupt saves preserved until explicit reset/import');await context.close();
  const blocked=await browser.newContext(),p=await blocked.newPage();await p.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');};});await p.goto(base);await p.locator('#cash').waitFor();await p.locator('[data-action="accept"]').click();assert.match(await p.locator('#save-note').innerText(),/无法保存/);check('storage failure remains playable and displays export guidance');await blocked.close();
 }finally{await browser.close();}
}finally{server.kill();await writeFile('test-results/browser-report.json',JSON.stringify({passed:count,checks:report},null,2));}
console.log(`Browser checks passed: ${count}`);
