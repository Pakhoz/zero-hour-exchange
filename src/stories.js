// Original, deterministic street stories. Choices are settled by the game engine.
export const STORIES = {
  parcel: {title:'雨夜的寄件人', speaker:'雨燕 / 下城区信使', icon:'ticket', text:'门外的信使把一只防水盒放在柜台上。她要赶末班车，把修好的助听器送给母亲，却差一笔车费。「借我 60，几天后我一定回来。」', choices:[
    {id:'help',label:'借给她车费',hint:'支付 60 ₡ · 街区信任 +2 · 第 5 天回访',cost:60,reputation:2,flag:'helped-courier',result:'雨燕在收据背面留下名字。临走前，她把你的招牌擦亮了一角。'},
    {id:'listen',label:'记下她的地址',hint:'不花钱 · 留下一个故事',result:'你替她查了夜间步行路线。她点点头，把盒子重新揣进怀里。'}]},
  blackout: {title:'整条街暗了三秒',speaker:'陆七 / 义体维修师',icon:'gear',text:'变压器又坏了。陆七提着工具站在门口：「凑 40 买一枚稳压片，今晚大家的灯都能亮着。」门外的队伍在雨里躁动。',choices:[
    {id:'repair',label:'一起修好电网',hint:'支付 40 ₡ · 街区信任 +1 · 今日新顾客耐心 +1',cost:40,reputation:1,effect:'patience',result:'电流重新流过招牌。外面的顾客看见你帮忙，愿意多等一会儿。'},
    {id:'wait',label:'点起备用灯',hint:'不花钱 · 正常营业',result:'你点亮柜台下的小灯。街道很暗，但生意还得继续。'}]},
  return: {title:'那张写了名字的收据',speaker:'雨燕 / 第一次回访',icon:'radio',text:'熟悉的门铃响了。雨燕带来一段母亲录下的声音：「谢谢你让她赶上了那班车。」她从口袋里翻出一张被雨打皱的收据。',choices:[
    {id:'receive',label:'听完这段录音',hint:'曾借车费：获得 150 ₡；否则获得 35 ₡ 路线酬谢',reward:'courier',result:'录音里有电车声，有笑声。你把收据夹进账本，城市似乎也没那么冷。'},
    {id:'gift',label:'把酬谢留给街区',hint:'不收钱 · 街区信任 +2',reputation:2,result:'她把酬谢送去了街角的公共充电站。有人记住了零点交易所。'}]},
  nightmarket: {title:'只开一晚的旧物集',speaker:'灰狐 / 夜市联络人',icon:'art',text:'灰狐从窗边探进头：「回收商今晚也来摆摊。80 块给你留个位置，库存能卖得更好。明早就散场。」',choices:[
    {id:'stall',label:'租下夜市摊位',hint:'支付 80 ₡ · 仅今日快速出售率 78% → 88%',cost:80,effect:'resale',result:'你把货架接到夜市目录。今晚，回收商愿意多付一成市价。'},
    {id:'stay',label:'守好自己的柜台',hint:'不花钱 · 保留现金准备交租',result:'你向灰狐摆摆手。窗外很热闹，你继续整理自己的小店。'}]},
  archive: {title:'替旧时代留一份底稿',speaker:'白噪 / 城市档案员',icon:'terminal',text:'白噪想把旧物的故事放进公共档案。「至少三种不同的藏品记录，就能拼出一小段城市历史。东西仍归你，记录借我看看？」',choices:[
    {id:'share',label:'分享收购记录',hint:'收购过至少 3 种商品 · 获得 120 ₡ · 信任 +1',requiredOwned:3,reward:120,reputation:1,result:'扫描仪轻轻响了三声。你的旧物故事，现在也属于城市。'},
    {id:'later',label:'等收藏再丰富一点',hint:'不花钱 · 不影响图鉴',result:'白噪留下了档案馆的地址：「故事不会过期，我们改天再聊。」'}]},
  lights: {title:'零点之后，还有灯',speaker:'地下街 / 联名来信',icon:'orb',text:'一封联名来信被塞进门缝。有人记得你修过电路，有人记得你听过他们的故事。信封里是一份街坊凑出的支持金。',choices:[
    {id:'accept',label:'让招牌继续亮着',hint:'信任达到 3：获得 180 ₡；否则获得 60 ₡',reward:'neighborhood',result:'你把来信贴在柜台里侧。这里开始不只是一间买卖旧物的店。'},
    {id:'pass',label:'转给公共充电站',hint:'不收钱 · 街区信任 +2',reputation:2,result:'收信人变成了整条街。今夜，充电站的灯也没有熄灭。'}]},
  broadcast: {title:'午夜点歌台',speaker:'莫莉 / 地下电台',icon:'radio',text:'莫莉的电台收到一封找人的信。她请你把招牌当作碰头地点，给等候的人留一杯热饮。',choices:[
    {id:'tea',label:'留两杯热饮',hint:'支付 20 ₡ · 信任 +1 · 今日新顾客耐心 +1',cost:20,reputation:1,effect:'patience',result:'两杯热饮慢慢冒着蒸汽。电台里传来一句很轻的「找到了」。'},
    {id:'sign',label:'借出招牌做路标',hint:'不花钱',result:'你把招牌朝街外转了半寸。深夜里，有人终于认出了方向。'}]}
};
export const storyForDay = day => ({1:'parcel',3:'blackout',5:'return',7:'nightmarket',10:'archive',14:'lights'}[day] || (day>14 && day%3===0 ? 'broadcast' : null));
export function scheduleStory(s) {
  const key=storyForDay(s.day);
  s.story.current=key?{id:`story-${s.day}-${key}`,key,day:s.day,status:'pending',choice:null,result:''}:null;
  s.story.effects={patience:0,resale:0};
}
export function storyReward(s,choice){
  if(choice.reward==='courier')return s.story.flags.includes('helped-courier')?150:35;
  if(choice.reward==='neighborhood')return s.story.reputation>=3?180:60;
  return choice.reward||0;
}
export function choiceBlock(s,choice){
  if(s.cash<(choice.cost||0))return '现金不足';
  if(choice.requiredOwned && s.collection.filter(x=>x.owned).length<choice.requiredOwned)return `需要收购过 ${choice.requiredOwned} 种商品`;
  return '';
}
export function chooseStory(s,eventId,choiceId){
  const event=s.story.current;
  if(!event || event.id!==eventId || event.status!=='pending')return '这段故事已经做出了选择。';
  const choice=STORIES[event.key].choices.find(c=>c.id===choiceId);
  if(!choice)return '未知的故事选择。';
  const blocked=choiceBlock(s,choice);if(blocked)return blocked;
  const cost=choice.cost||0,reward=storyReward(s,choice);
  s.cash+=reward-cost;s.ledger.spent+=cost;s.ledger.earned+=reward;
  s.story.reputation=Math.min(100,s.story.reputation+(choice.reputation||0));
  if(choice.flag&&!s.story.flags.includes(choice.flag))s.story.flags.push(choice.flag);
  if(choice.effect==='patience')s.story.effects.patience=1;
  if(choice.effect==='resale')s.story.effects.resale=0.10;
  event.status='resolved';event.choice=choice.id;event.result=choice.result;
  s.story.log.unshift({...event,cost,reward});s.story.log=s.story.log.slice(0,50);
  return `${choice.result}${cost?` 支出 ${cost} ₡。`:''}${reward?` 收到 ${reward} ₡。`:''}`;
}
export function expireStory(s){
  const event=s.story.current;if(event?.status==='pending'){
    s.story.log.unshift({...event,status:'missed',result:'你忙于营业，错过了这次街区来访。',cost:0,reward:0});s.story.log=s.story.log.slice(0,50);
  }
}
