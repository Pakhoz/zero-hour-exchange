import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,act,migrate,validate,quickPrice,PERSONAS,CATALOG} from '../src/core.js';
import {load,save,SAVE_KEY,MANUAL_KEY,LEGACY_KEY} from '../src/storage.js';
const legacy=JSON.parse(readFileSync(new URL('./fixtures/v1-save.json',import.meta.url),'utf8'));
const action=(s,type,extra={})=>act(s,{type,customerId:s.customer?.id,day:s.day,...extra});
const choose=(s,choiceId)=>action(s,'storyChoice',{eventId:s.story.current?.id,choiceId});
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('real V1 fixture migrates without losing cash, RNG, inventory, rent or active negotiation',()=>{
 const original=structuredClone(legacy),s=migrate(legacy);assert.ok(validate(s));assert.equal(s.version,2);assert.deepEqual(legacy,original);
 for(const key of ['cash','day','seed','nextId','inventory','upgrades','rent','served','market','stats','ledger','history','gameOver'])assert.deepEqual(s[key],legacy[key],key);
 const {interactions,...customer}=s.customer;assert.deepEqual(customer,legacy.customer);assert.deepEqual(interactions,{talked:false,tea:false,inspected:false});assert.equal(s.collection.find(x=>CATALOG[x.key][0]===s.inventory[0].name).owned,true);
 assert.deepEqual(migrate(s),s);const done=action(s,'accept');assert.equal(action(done,'accept').cash,done.cash);
});
test('automatic and manual V1 saves back up exact original bytes once before V2 overwrite',()=>{
 const storage=memory(),bytes=JSON.stringify(legacy);
 for(const key of [SAVE_KEY,MANUAL_KEY]){storage.setItem(key,bytes);const s=load(storage,key);assert.equal(storage.getItem(key),bytes);save(s,storage,key);assert.equal(storage.getItem(`${LEGACY_KEY}:${key}`),bytes);save(action(s,'talk'),storage,key);assert.equal(storage.getItem(`${LEGACY_KEY}:${key}`),bytes);assert.equal(load(storage,key).version,2);}
});
test('failed V1 backup leaves original untouched',()=>{const bytes=JSON.stringify(legacy);const storage={getItem:k=>k===SAVE_KEY?bytes:null,setItem(){throw Error('quota');}};assert.throws(()=>save(migrate(legacy),storage),/quota/);assert.equal(storage.getItem(SAVE_KEY),bytes);});
test('V1 game over and paid rent migrate without reviving or replaying transactions',()=>{const old=structuredClone(legacy);old.day=7;old.cash=0;old.gameOver=true;const s=migrate(old);assert.ok(validate(s));assert.equal(action(s,'endDay').day,7);assert.equal(choose(s,'help').cash,0);});
test('interactions are one-shot, preserve inventory and reject stale encounter IDs',()=>{
 let s=newGame(42),limit=s.customer.limit;s=action(s,'talk');assert.equal(s.customer.limit,Math.round(limit*.97));assert.equal(s.cash,1000);assert.equal(s.customer.patience,4);assert.deepEqual(action(s,'talk').customer,s.customer);
 s=action(s,'tea');assert.equal(s.cash,990);assert.equal(s.ledger.spent,10);assert.equal(s.customer.patience,6);assert.equal(action(s,'tea').cash,990);
 s=action(s,'inspect');assert.equal(s.customer.interactions.inspected,true);assert.equal(s.inventory.length,0);assert.equal(s.collection.length,1);
 const stale=act(s,{type:'tea',customerId:'invalid'});assert.equal(stale.cash,s.cash);assert.ok(validate(s));
});
test('unaffordable tea and interactions after departure cannot charge cash',()=>{let s=newGame(42);s.cash=9;assert.equal(action(s,'tea').customer.interactions.tea,false);s=action(s,'reject');assert.equal(action(s,'tea').cash,9);});
test('collection records survive resale, do not duplicate and respect scanner ownership',()=>{let s=newGame(42);assert.equal(s.collection.length,1);assert.equal(s.collection[0].owned,false);s=action(s,'accept');const key=s.collection[0].key;assert.equal(s.collection[0].owned,true);assert.equal(s.collection[0].verified,false);s=action(s,'upgrade',{key:'scanner'});assert.equal(s.collection[0].verified,true);s=action(s,'quickSell',{itemId:s.inventory[0].id});assert.equal(s.inventory.length,0);assert.equal(s.collection.find(x=>x.key===key).owned,true);assert.equal(s.collection.length,1);});
test('courier choices persist and change day-five reward; repeated choices never pay twice',()=>{
 let helped=choose(newGame(42),'help'),declined=choose(newGame(42),'listen');assert.equal(helped.cash,940);assert.equal(helped.story.reputation,2);assert.equal(choose(helped,'help').cash,940);
 const storage=memory();save(helped,storage);helped=load(storage);
 while(helped.day<5){helped=action(helped,'endDay');declined=action(declined,'endDay');}
 const a=helped.cash,b=declined.cash;helped=choose(helped,'receive');declined=choose(declined,'receive');assert.equal(helped.cash-a,150);assert.equal(declined.cash-b,35);assert.equal(choose(helped,'receive').cash,helped.cash);assert.equal(helped.story.log.filter(x=>x.key==='return').length,1);assert.ok(validate(helped));
});
test('story costs cannot overdraw; unrecognized and stale choices do not mutate funds',()=>{let s=newGame(42);s.cash=59;assert.equal(choose(s,'help').cash,59);assert.equal(s.story.current.status,'pending');assert.equal(choose(s,'not-a-choice').cash,59);assert.equal(act(s,{type:'storyChoice',eventId:'old',choiceId:'help'}).cash,59);});
test('story effects apply to new visitors only and expire the next day',()=>{let s=newGame(42);while(s.day<3)s=action(s,'endDay');const patience=s.customer.patience;s=choose(s,'repair');assert.equal(s.customer.patience,patience);s=action(action(s,'reject'),'next');assert.equal(s.customer.patience,PERSONAS[s.customer.personality].patience+1);s=action(s,'endDay');assert.equal(s.story.effects.patience,0);assert.equal(s.customer.patience,PERSONAS[s.customer.personality].patience);});
test('night market raises recycling rate for one day without exceeding market price',()=>{let s=newGame(42);s.cash=4000;while(s.day<7)s=action(s,'endDay');const item=s.customer.item,normal=quickPrice(s,item);s=choose(s,'stall');assert.ok(quickPrice(s,item)>normal);assert.equal(s.story.effects.resale,.1);s=action(s,'endDay');assert.equal(s.story.effects.resale,0);assert.equal(s.rent.paid,1);});
test('archive reward requires three acquired types; merely seen entries cannot claim it',()=>{let s=newGame(42);s.cash=4000;while(s.day<10)s=action(s,'endDay');const cash=s.cash;assert.equal(choose(s,'share').cash,cash);s.collection=[0,1,2].map(key=>({key,owned:false,verified:false,bestQuality:80,firstDay:1}));assert.equal(choose(s,'share').cash,cash);s.collection.forEach(x=>x.owned=true);s=choose(s,'share');assert.equal(s.cash,cash+120);assert.ok(validate(s));});
test('missed events are logged once; daily repeated settlement never advances stories twice',()=>{let s=newGame(42),id=s.story.current.id;s=action(s,'endDay');assert.equal(s.story.log.filter(x=>x.id===id).length,1);assert.equal(s.story.log[0].status,'missed');s=act(s,{type:'endDay',day:1});assert.equal(s.day,2);assert.equal(s.story.log.length,1);});
test('reject malformed V2 extensions and do not downgrade unknown save versions',()=>{for(const change of [s=>s.version=3,s=>s.collection=[null],s=>s.story=null,s=>s.story.effects.resale=100,s=>s.customer.interactions=null,s=>s.story.current.key='constructor',s=>s.story.current.choice='invalid']){const s=newGame(42);change(s);assert.throws(()=>migrate(s));}});
test('V2 story and interaction playthrough keeps 14-day cash accounting consistent',()=>{let s=newGame(2026);for(let day=1;day<=14;day++){
 const key=s.story.current?.key;if(key){const choice={parcel:'help',blackout:'repair',return:'receive',nightmarket:'stay',archive:'later',lights:'accept'}[key];s=choose(s,choice);}
 for(let n=0;n<6;n++){s=action(s,'talk');const c=s.customer;if(c.purpose==='sell')s=action(s,'offer',{price:Math.min(s.cash,c.limit)});else s=action(s,'accept');if(s.customer.status==='active')s=action(s,'reject');s=action(s,'next');}
 for(const item of [...s.inventory])s=action(s,'quickSell',{itemId:item.id});s=action(s,'endDay');assert.ok(validate(s));assert.equal(s.gameOver,false);
 }assert.equal(s.day,15);assert.equal(s.rent.paid,2);assert.equal(s.history.reduce((n,d)=>n+d.earned-d.spent,1000),s.cash);});
