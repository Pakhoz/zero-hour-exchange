import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,act,validate,capacity,dailyLimit,valueOf,quickPrice} from '../src/core.js';
import {save,load,SAVE_KEY} from '../src/storage.js';
const deal=(s,type='accept',price)=>act(s,{type,price,customerId:s.customer.id});
const next=s=>act(s,{type:'next',customerId:s.customer?.id});
const end=s=>act(s,{type:'endDay',day:s.day});
test('initial funds, visitors, rent and valid save',()=>{const s=newGame(42);assert.equal(s.cash,1000);assert.equal(dailyLimit(s),6);assert.equal(s.rent.amount,650);assert.equal(s.rent.due,7);assert.ok(validate(s));});
test('buying decreases funds, adds one item with cost and prevents double settlement',()=>{const s=newGame(42),q=s.customer.quote,t=deal(s);assert.equal(t.cash,1000-q);assert.equal(t.inventory.length,1);assert.equal(t.inventory[0].cost,q);const twice=deal(t);assert.equal(twice.cash,t.cash);assert.deepEqual(twice.inventory,t.inventory);assert.equal(s.cash,1000);});
test('customer purchase increases funds and removes inventory with realized profit',()=>{let s=deal(newGame(42));const i=s.inventory[0];s.customer={...s.customer,id:`z${s.nextId++}`,purpose:'buy',item:structuredClone(i),quote:400,limit:450,status:'active'};const t=deal(s);assert.equal(t.cash,s.cash+400);assert.equal(t.inventory.length,0);assert.equal(t.stats.profit,400-i.cost);});
test('failed negotiation spends patience, counteroffers, then leaves without charging',()=>{let s=newGame(42);const cash=s.cash;for(let n=0;n<10;n++)s=deal(s,'offer',1);assert.equal(s.customer.status,'left');assert.equal(s.cash,cash);assert.equal(s.inventory.length,0);assert.equal(s.served,1);});
test('insufficient cash blocks acquisition without consuming patience',()=>{const s=newGame(42);s.cash=1;const t=deal(s);assert.equal(t.cash,1);assert.equal(t.customer.patience,s.customer.patience);assert.equal(t.inventory.length,0);});
test('full storage blocks acquisition',()=>{const s=newGame(42);s.inventory=Array.from({length:capacity(s)},()=>({...s.customer.item,id:`z${s.nextId++}`}));const t=deal(s);assert.equal(t.inventory.length,12);assert.equal(t.cash,s.cash);assert.match(t.message,/已满/);});
test('invalid prices never move funds',()=>{for(const p of [0,-1,NaN,Infinity,1.5,'',1000001]){const s=newGame(42),t=deal(s,'offer',p);assert.equal(t.cash,s.cash);assert.equal(t.customer.status,'active');}});
test('new day resets visitors, updates market and is idempotent for the day token',()=>{const s=newGame(42),t=end(s),again=act(t,{type:'endDay',day:1});assert.equal(t.day,2);assert.equal(t.served,0);assert.equal(t.history.length,1);assert.equal(again.day,2);assert.ok(validate(t));});
test('rent charges on seventh day only and grows for the next period',()=>{let s=newGame(42);for(let n=0;n<6;n++)s=end(s);assert.equal(s.day,7);assert.equal(s.cash,1000);s=end(s);assert.equal(s.cash,350);assert.equal(s.day,8);assert.equal(s.rent.amount,702);assert.equal(s.rent.due,14);assert.equal(s.history[0].rent,650);assert.equal(s.rent.paid,1);});
test('unaffordable rent ends game without negative funds or subsequent mutation',()=>{let s=newGame(42);s.cash=649;for(let n=0;n<7;n++)s=end(s);assert.equal(s.gameOver,true);assert.equal(s.day,7);assert.equal(s.cash,649);assert.equal(end(s).day,7);assert.ok(validate(s));});
test('all upgrades spend money and change real mechanics',()=>{let s=newGame(42);s.cash=5000;for(const key of ['storage','scanner','counter'])s=act(s,{type:'upgrade',key});assert.equal(s.cash,3960);assert.equal(capacity(s),18);assert.equal(dailyLimit(s),8);const fake={...s.customer.item,authentic:false};assert.ok(valueOf(s,fake,true)<valueOf(s,fake,false));assert.equal(s.upgrades.scanner,1);s=next(deal(s,'reject'));assert.equal(s.customer.maxPatience,[4,3,3,5,2][s.customer.personality]+1);});
test('quick sell uses true market value once and protects goods under negotiation',()=>{let s=deal(newGame(42));const i=s.inventory[0],price=quickPrice(s,i),cash=s.cash;s=act(s,{type:'quickSell',itemId:i.id});assert.equal(s.cash,cash+price);assert.equal(s.inventory.length,0);assert.equal(act(s,{type:'quickSell',itemId:i.id}).cash,s.cash);s=deal(newGame(42));s.customer={...s.customer,purpose:'buy',item:s.inventory[0],status:'active'};assert.equal(act(s,{type:'quickSell',itemId:s.inventory[0].id}).inventory.length,1);});
test('market changes reference values for affected category',()=>{const s=newGame(42),i=s.customer.item;s.market.rates[i.category]=1;const base=valueOf(s,i);s.market.rates[i.category]=1.25;assert.ok(valueOf(s,i)>base);s.market.rates[i.category]=0.8;assert.ok(valueOf(s,i)<base);});
test('roundtrip save preserves negotiation RNG and blocks invalid schemas',()=>{const mem=new Map(),storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};const s=deal(newGame(42),'offer',1);save(s,storage);assert.deepEqual(load(storage),s);assert.deepEqual(deal(load(storage),'offer',100),deal(s,'offer',100));for(const mutate of [x=>x.version=99,x=>x.cash=-1,x=>x.inventory=[{}],x=>x.customer.limit=null,x=>x.market.rates=[],x=>x.ledger=null,x=>x.nextId=1]){const t=structuredClone(s);mutate(t);mem.set(SAVE_KEY,JSON.stringify(t));assert.throws(()=>load(storage));}mem.set(SAVE_KEY,'bad');assert.throws(()=>load(storage));});
test('storage quota failure is surfaced without pretending to save',()=>{assert.throws(()=>save(newGame(42),{setItem(){throw new Error('quota');}}),/quota/);});
test('all five personalities and both trade purposes occur across seeds',()=>{const personalities=new Set(),purposes=new Set();for(let seed=1;seed<150;seed++){let s=newGame(seed*1234567);personalities.add(s.customer.personality);purposes.add(s.customer.purpose);s=next(deal(s));purposes.add(s.customer.purpose);}assert.equal(personalities.size,5);assert.equal(purposes.size,2);});
test('14 day viable trading simulation across 30 seeds with correct accounting',()=>{
 for(let seed=1;seed<=30;seed++){
  let s=newGame(seed*98765);
  // Observable strategy: buy under 60% of estimate, sell to buyers, recycle remaining stock.
  for(let day=1;day<=14;day++){
   for(let n=0;n<dailyLimit(s);n++){
    if(s.customer.purpose==='sell')s=deal(s,'offer',Math.min(s.cash,Math.floor(valueOf(s,s.customer.item)*0.58)));
    else s=deal(s);
    if(s.customer.status==='active')s=deal(s,'reject');
    s=next(s);assert.ok(validate(s),`invalid ${seed}/${day}`);
   }
   for(const i of [...s.inventory])s=act(s,{type:'quickSell',itemId:i.id});
   s=end(s);assert.ok(validate(s));assert.equal(s.gameOver,false,`seed ${seed}, day ${day}, cash ${s.cash}`);
  }
  assert.equal(s.day,15);assert.equal(s.rent.paid,2);assert.equal(s.rent.due,21);assert.equal(s.history.reduce((n,h)=>n+h.earned-h.spent,1000),s.cash);
 }
});
