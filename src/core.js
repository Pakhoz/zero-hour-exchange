export const VERSION = 1;
export const CATEGORIES = ['电子设备', '机械零件', '旧世收藏', '艺术品', '未知科技'];
export const CATALOG = [
  ['回声随身听', 0, 260, '旧时代的磁带里，还留着一场没结束的雨。', 'radio'],
  ['义体伺服核心', 1, 340, '适配第三代义体，轴承带着地下拳场的磨损。', 'gear'],
  ['末班地铁票', 2, 200, '2077 年停运线路的实体车票，编号仍可辨认。', 'ticket'],
  ['霓虹记忆画', 3, 380, '像素会随着环境光变化，记录一座消失的城市。', 'art'],
  ['量子种子', 4, 480, '密封玻璃中，有一束不肯熄灭的微光。', 'orb'],
  ['便携终端 MK-II', 0, 310, '离线时代的终端，键盘有咖啡和故事的痕迹。', 'terminal'],
  ['磁悬浮轴承', 1, 220, '从快递无人机拆下的零件，仍保持平稳旋转。', 'gear'],
  ['月面纪念币', 2, 300, '第一批月面居民发行的纪念币。注意仿制品。', 'coin'],
  ['全息锦鲤', 3, 280, '它只游向不存在的水面。', 'orb'],
  ['黑匣信标', 4, 360, '每隔七秒发出一次无声的呼叫。', 'terminal']
];
export const PERSONAS = [
  {name:'普通顾客', patience:4, sell:0.60, buy:1.10, chance:0.45, line:'价格合适的话，我们就成交。'},
  {name:'精明商人', patience:3, sell:0.75, buy:0.96, chance:0.15, line:'行情我很清楚，拿出你的诚意。'},
  {name:'急需现金', patience:3, sell:0.44, buy:1.02, chance:0.65, line:'我今晚就需要钱。能快一点吗？'},
  {name:'收藏家', patience:5, sell:0.67, buy:1.34, chance:0.55, line:'有些东西的价值，不能只看年份。'},
  {name:'可疑交易者', patience:2, sell:0.46, buy:1.15, chance:0.25, line:'别问来路。你只要说，收不收。'}
];
export const UPGRADES = {
  storage: {name:'扩展货架', description:'每级增加 6 格库存', base:280, max:3},
  scanner: {name:'光谱鉴定仪', description:'揭示真伪、真实估值与品质', base:360, max:1},
  counter: {name:'神经交互柜台', description:'每级每天多接待 2 人，顾客耐心 +1', base:400, max:2}
};
const integer = (n, min=0, max=1e9) => Number.isSafeInteger(n) && n >= min && n <= max;
function random(s) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
const pick = (s, a) => a[Math.floor(random(s) * a.length)];
const uid = s => `z${s.nextId++}`;
export const capacity = s => 12 + s.upgrades.storage * 6;
export const dailyLimit = s => 6 + s.upgrades.counter * 2;
export const upgradeCost = (s, key) => UPGRADES[key].base * (s.upgrades[key] + 1);
export function valueOf(s, item, revealed=false) {
  return Math.max(1, Math.round(item.base * (0.7 + item.quality / 100 * 0.6) * s.market.rates[item.category] * (revealed && !item.authentic ? 0.4 : 1)));
}
export const quickPrice = (s, item) => Math.floor(valueOf(s,item,true) * 0.78);
function market(s) {
  const category = Math.floor(random(s) * 5), up = random(s) > 0.32;
  s.market = {category, headline:`${CATEGORIES[category]}${up ? '需求升温' : '行情回落'}`, rates:CATEGORIES.map((_,i)=>i===category ? (up ? 1.25 : 0.80) : 1)};
}
function item(s, suspicious=false) {
  const [name, category, base, description, icon] = pick(s, CATALOG);
  return {id:uid(s), name, category, base, description, icon, quality:Math.floor(45+random(s)*51), authentic:random(s) > (suspicious ? 0.42 : 0.07), cost:0};
}
function visitor(s) {
  if (s.served >= dailyLimit(s)) { s.customer = null; return; }
  const personality = Math.floor(random(s)*PERSONAS.length), p=PERSONAS[personality];
  const purpose = s.inventory.length && random(s)<0.55 ? 'buy' : 'sell';
  const goods = purpose==='buy' ? pick(s,s.inventory) : item(s,personality===4);
  const reference = valueOf(s,goods,true);
  const limit = Math.round(reference * (purpose==='sell' ? p.sell : p.buy) * (0.95+random(s)*0.10));
  s.customer = {id:uid(s), name:pick(s,['雨燕','阿岚','陆七','莫莉','灰狐','祁川','洛零','白噪']), identity:pick(s,['下城区信使','义体维修师','夜班调音师','轨道拾荒者','旧物档案员']), personality, purpose, item:structuredClone(goods), limit, quote:Math.round(limit*(purpose==='sell'?1.30:0.78)), patience:p.patience+s.upgrades.counter, maxPatience:p.patience+s.upgrades.counter, status:'active', rounds:0, line:p.line};
}
export function newGame(seed = Date.now() >>> 0) {
  const s = {version:VERSION, seed:seed>>>0, nextId:1, day:1, cash:1000, inventory:[], upgrades:{storage:0,scanner:0,counter:0}, rent:{amount:650,due:7,paid:0}, served:0, customer:null, market:null, stats:{trades:0,profit:0}, ledger:{opening:1000,earned:0,spent:0,profit:0}, history:[], gameOver:false, message:'霓虹灯已亮起。欢迎来到零点交易所。'};
  market(s); visitor(s); return s;
}
function settle(s, price) {
  const c=s.customer;
  if(c.purpose==='sell') {
    if(s.inventory.length>=capacity(s)) return '货架已满，请先出售库存。';
    if(price>s.cash) return '现金不足，无法完成收购。';
    s.cash-=price; s.ledger.spent+=price; s.inventory.push({...c.item,cost:price});
  } else {
    const index=s.inventory.findIndex(i=>i.id===c.item.id);
    if(index<0) return '这件商品已不在库存中。';
    const [sold]=s.inventory.splice(index,1); s.cash+=price; s.ledger.earned+=price;
    s.ledger.profit+=price-sold.cost; s.stats.profit+=price-sold.cost;
  }
  c.status='done'; c.quote=price; c.line=`成交，${price} ₡。下次见。`; s.served++; s.stats.trades++;
  return `${c.purpose==='sell'?'收购':'售出'}「${c.item.name}」· ${price} ₡，${c.purpose==='sell'?'商品已入库':'货款已到账'}。`;
}
// All mutations pass through one synchronous transition; closed encounters cannot settle again.
export function act(original, action) {
  const s=structuredClone(original), c=s.customer;
  const say = message => {s.message=message; return s;};
  if(s.gameOver) return say('店铺已停业。你可以查看存档或重新开始。');
  if(['offer','accept','reject'].includes(action.type)) {
    if(!c || c.status!=='active' || action.customerId!==c.id) return say('这次交易已经结束。');
    if(action.type==='reject') { c.status='left'; c.line='那就到这里吧。'; s.served++; return say('交易已取消，没有扣款。'); }
    const price=action.type==='accept'?c.quote:Number(action.price);
    if(!integer(price,1,1000000)) return say('请输入 1–1,000,000 的整数报价。');
    if(c.purpose==='sell' && price>s.cash) return say('现金不足，无法完成收购。');
    if(c.purpose==='sell' && s.inventory.length>=capacity(s)) return say('货架已满，请先出售库存。');
    if(action.type==='accept') return say(settle(s,price));
    const good=c.purpose==='sell'?price>=c.limit:price<=c.limit;
    const near=c.purpose==='sell'?price>=c.limit*0.9:price<=c.limit*1.1;
    if(good || (near && random(s)<PERSONAS[c.personality].chance)) return say(settle(s,price));
    c.patience--; c.rounds++;
    if(c.patience<=0) {c.status='left';c.line='算了，我们谈不拢。';s.served++;return say('顾客离开了。交易未完成，没有扣款。');}
    c.quote=Math.round(c.purpose==='sell'?Math.max(c.limit,c.quote*0.91):Math.min(c.limit,c.quote*1.10));
    c.line=`这个价格不行。${c.quote} ₡，你再考虑一下。`;
    return say(`顾客还价 ${c.quote} ₡ · 耐心 ${c.patience}/${c.maxPatience}`);
  }
  if(action.type==='next') {
    if(c?.status==='active') return say('请先完成或拒绝当前交易。');
    if(c && action.customerId!==c.id) return say('请稍候，下一位顾客已经到店。');
    visitor(s); return say(s.customer?'门铃响了，一位新顾客走进店铺。':'今日顾客已全部接待，可以结束营业。');
  }
  if(action.type==='quickSell') {
    const index=s.inventory.findIndex(i=>i.id===action.itemId);
    if(index<0) return say('商品已售出。');
    if(c?.status==='active' && c.purpose==='buy' && c.item.id===action.itemId) return say('这件商品正在议价，请先完成或拒绝交易。');
    const [goods]=s.inventory.splice(index,1), price=quickPrice(s,goods);
    s.cash+=price;s.ledger.earned+=price;s.ledger.profit+=price-goods.cost;s.stats.profit+=price-goods.cost;s.stats.trades++;
    return say(`快速出售「${goods.name}」获得 ${price} ₡ · 利润 ${price-goods.cost} ₡。`);
  }
  if(action.type==='upgrade') {
    const u=UPGRADES[action.key]; if(!u) return say('未知升级。');
    if(s.upgrades[action.key]>=u.max) return say('这项设备已满级。');
    const cost=upgradeCost(s,action.key); if(s.cash<cost) return say('升级资金不足。');
    s.cash-=cost;s.ledger.spent+=cost;s.upgrades[action.key]++;return say(`${u.name}升级完成 · 花费 ${cost} ₡。`);
  }
  if(action.type==='endDay') {
    if(action.day!==s.day) return say('今天已经结算。');
    let rent=0;
    if(s.day===s.rent.due) {
      if(s.cash<s.rent.amount) {s.gameOver=true;return say(`租金到期，需要 ${s.rent.amount} ₡，现金不足。零点交易所暂时熄灯了。`);}
      rent=s.rent.amount;s.cash-=rent;s.ledger.spent+=rent;s.rent.paid++;s.rent.due+=7;s.rent.amount=Math.round(s.rent.amount*1.08);
    }
    s.history.unshift({day:s.day,...s.ledger,closing:s.cash,rent});s.history=s.history.slice(0,30);
    s.day++;s.served=0;s.ledger={opening:s.cash,earned:0,spent:0,profit:0};market(s);visitor(s);
    return say(`第 ${s.day} 天开始营业。${rent?`已支付租金 ${rent} ₡。`:''}`);
  }
  return say('未知操作。');
}
function validItem(i) {return i && typeof i.id==='string' && /^z\d+$/.test(i.id) && typeof i.name==='string' && i.name.length<100 && integer(i.category,0,4) && integer(i.base,1,1000000) && integer(i.cost) && integer(i.quality,0,100) && typeof i.authentic==='boolean' && CATALOG.some(x=>x[4]===i.icon) && typeof i.description==='string' && i.description.length<1000;}
export function validate(s) {
  if(!s || s.version!==VERSION || !integer(s.seed,0,4294967295) || !integer(s.nextId,1) || !integer(s.day,1,100000) || !integer(s.cash) || typeof s.gameOver!=='boolean') return false;
  if(!s.upgrades || !Object.keys(UPGRADES).every(k=>integer(s.upgrades[k],0,UPGRADES[k].max))) return false;
  if(!Array.isArray(s.inventory) || s.inventory.length>capacity(s) || !s.inventory.every(validItem) || new Set(s.inventory.map(i=>i.id)).size!==s.inventory.length) return false;
  if(!s.rent || !integer(s.rent.amount,1) || !integer(s.rent.due,s.day,s.day+6) || s.rent.due%7!==0 || !integer(s.rent.paid) || s.rent.paid!==s.rent.due/7-1) return false;
  if(!s.market || !integer(s.market.category,0,4) || typeof s.market.headline!=='string' || !Array.isArray(s.market.rates) || s.market.rates.length!==5 || !s.market.rates.every(r=>[0.8,1,1.25].includes(r))) return false;
  const validLedger=l=>l && ['opening','earned','spent'].every(k=>integer(l[k])) && integer(l.profit,-1e9);
  if(!validLedger(s.ledger) || !s.stats || !integer(s.stats.trades) || !integer(s.stats.profit,-1e9) || !integer(s.served,0,dailyLimit(s)) || !Array.isArray(s.history) || s.history.length>30 || !s.history.every(h=>validLedger(h)&&integer(h.day,1)&&integer(h.closing)&&integer(h.rent))) return false;
  const c=s.customer;
  if(c && (!validItem(c.item) || typeof c.id!=='string' || !/^z\d+$/.test(c.id) || typeof c.name!=='string' || typeof c.identity!=='string' || !integer(c.personality,0,4) || !['buy','sell'].includes(c.purpose) || !['active','done','left'].includes(c.status) || !integer(c.maxPatience,1,10) || !integer(c.patience,0,c.maxPatience) || !integer(c.limit,1,1000000) || !integer(c.quote,1,1000000) || !integer(c.rounds,0,10) || typeof c.line!=='string')) return false;
  if(c?.status==='active' && c.purpose==='buy' && !s.inventory.some(i=>i.id===c.item.id)) return false;
  if([...s.inventory.map(i=>i.id),...(c?[c.id,c.item.id]:[])].some(id=>Number(id.slice(1))>=s.nextId)) return false;
  return typeof s.message==='string';
}
