const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let generation=0;
const motionSelector='[data-action],#offer-form button,#offer,[data-interact],#counter-item,#customer-actor,#door-next';
function animate(element,frames,duration,options={}){
  if(!element||reduce()||!element.animate)return Promise.resolve();
  return element.animate(frames,{duration,easing:'ease-out',...options}).finished.catch(()=>{});
}
function pulse(element,color='#72f6d1'){
  return animate(element,[{filter:'brightness(1)'},{filter:'brightness(1.7)',color},{filter:'brightness(1)'}],500);
}
export function cashFeedback(delta){
  if(!delta)return;pulse(document.querySelector('#cash'),delta>0?'#72f6d1':'#e98ccb');
  const target=document.querySelector('.cash-float');if(target){target.textContent=`${delta>0?'+':''}${delta} ₡`;target.dataset.positive=delta>0;animate(target,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-36px)'}],1100);}
}
export async function sceneMotion(kind){
  const id=++generation,scene=document.querySelector('.scene');if(!scene)return;
  const actor=scene.querySelector('.customer-actor'),door=scene.querySelector('.shop-door'),goods=scene.querySelector('#counter-item');
  scene.dataset.fx=kind;
  // Presentation never settles a transaction. A reload during motion uses already-saved state.
  if(['arrive','depart','deal'].includes(kind)){
    const controls=[...document.querySelectorAll(motionSelector)];
    const previouslyEnabled=controls.filter(e=>!e.disabled);previouslyEnabled.forEach(e=>e.disabled=true);
    const width=scene.clientWidth,from=-Math.min(width*.40,360);
    const travel=kind==='arrive'
      ?[{transform:`translateX(${from}px) scale(.68)`,opacity:0},{offset:.15,opacity:1},{offset:.7,transform:'translateX(-18px) scale(.97)',opacity:1},{transform:'translateX(0) scale(1)',opacity:1}]
      :[{transform:'translateX(0) scale(1)',opacity:1},{offset:.25,transform:'translateX(12px) scale(1)',opacity:1},{transform:`translateX(${from}px) scale(.68)`,opacity:0}];
    const duration=kind==='arrive'?850:900;
    const tasks=[animate(actor,travel,duration),animate(door,[{filter:'brightness(1)'},{filter:'brightness(2.3)'},{filter:'brightness(1)'}],duration)];
    if(kind==='deal')tasks.push(animate(goods,[{transform:'translateY(0) rotate(-8deg)',opacity:1},{transform:'translateY(-65px) rotate(14deg) scale(.4)',opacity:0}],550));
    if(kind==='depart')tasks.push(animate(goods,[{transform:'rotate(-8deg)',opacity:1},{transform:`translate(${from}px,-40px) scale(.4)`,opacity:0}],700));
    if(kind==='arrive')tasks.push(animate(goods,[{transform:'translate(-35px,-30px) rotate(10deg) scale(.6)',opacity:0},{transform:'translate(0,0) rotate(-8deg) scale(1)',opacity:1}],300,{delay:550,fill:'backwards'}));
    await Promise.all(tasks);if(id!==generation)return;
    previouslyEnabled.filter(e=>e.isConnected).forEach(e=>e.disabled=false);
  }else if(kind==='counter')await animate(actor,[{transform:'translateX(0)'},{transform:'translateX(-8px)'},{transform:'translateX(8px)'},{transform:'translateX(0)'}],400);
  else if(kind==='talk'||kind==='tea')await animate(actor,[{transform:'translateY(0)'},{transform:'translateY(-5px) rotate(-2deg)'},{transform:'translateY(0)'}],500);
  else if(kind==='scan')await pulse(goods);
  if(id===generation)delete scene.dataset.fx;
}
export function neonFeedback(){pulse(document.querySelector('.shop-sign'),'#e98ccb');}

// Patch matching nodes in place: the animated stage, focus and ambient loops survive offers.
export function patchDOM(target,source){
  const nodes=[...source.childNodes];
  for(let i=0;i<nodes.length;i++){
    const fresh=nodes[i],old=target.childNodes[i];
    if(!old){target.append(fresh.cloneNode(true));continue;}
    if(old.nodeType!==fresh.nodeType||old.nodeName!==fresh.nodeName||(old.nodeType===1&&old.getAttribute('data-key')!==fresh.getAttribute('data-key'))){old.replaceWith(fresh.cloneNode(true));continue;}
    if(fresh.nodeType===3){if(old.nodeValue!==fresh.nodeValue)old.nodeValue=fresh.nodeValue;continue;}
    if(fresh.nodeType!==1)continue;
    for(const attribute of [...old.attributes])if(!fresh.hasAttribute(attribute.name)&&!attribute.name.startsWith('data-fx'))old.removeAttribute(attribute.name);
    for(const attribute of fresh.attributes)if(old.getAttribute(attribute.name)!==attribute.value)old.setAttribute(attribute.name,attribute.value);
    if(old instanceof HTMLInputElement&&document.activeElement!==old)old.value=fresh.value;
    patchDOM(old,fresh);
  }
  while(target.childNodes.length>nodes.length)target.lastChild.remove();
}
