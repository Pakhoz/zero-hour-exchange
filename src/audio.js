const KEY='zero-hour-exchange.audio.v2';
let preferences={enabled:false,ambience:false,volume:0.35};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&typeof p.enabled==='boolean'&&typeof p.ambience==='boolean'&&Number.isFinite(p.volume)&&p.volume>=0&&p.volume<=1)preferences=p;}catch{/* Playing without storage is supported. */}
let context,master,ambient=[],active=new Set();
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(preferences));}catch{/* Does not affect game saves. */}};
function stopAmbient(){for(const node of ambient){try{node.stop?.();node.disconnect();}catch{/* Already stopped. */}}ambient=[];}
function ambience(){
  stopAmbient();if(!context||context.state!=='running'||!preferences.enabled||!preferences.ambience||document.hidden)return;
  const gain=context.createGain();gain.gain.value=0.10;gain.connect(master);ambient.push(gain);
  for(const hz of [55,110]){const osc=context.createOscillator();osc.type='sine';osc.frequency.value=hz;osc.connect(gain);osc.start();ambient.push(osc);}
  const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*0.2;
  const rain=context.createBufferSource(),filter=context.createBiquadFilter();rain.buffer=buffer;rain.loop=true;filter.type='lowpass';filter.frequency.value=750;rain.connect(filter);filter.connect(gain);rain.start();ambient.push(rain,filter);
}
async function unlock(){
  if(!preferences.enabled)return false;
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return false;
  if(!context){context=new Audio();master=context.createGain();master.gain.value=preferences.volume*0.35;master.connect(context.destination);}
  if(context.state==='suspended')await context.resume();
  if(!ambient.length)ambience();return context.state==='running';
}
function tone(hz,start,duration,type='sine',strength=0.22){
  if(!context||context.state!=='running'||!preferences.enabled||document.hidden||active.size>=24)return;
  const at=context.currentTime+start,osc=context.createOscillator(),gain=context.createGain();
  osc.type=type;osc.frequency.setValueAtTime(hz,at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(strength,at+0.008);gain.gain.exponentialRampToValueAtTime(0.001,at+duration);
  osc.connect(gain);gain.connect(master);active.add(osc);osc.onended=()=>{active.delete(osc);osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+duration+0.02);
}
function play(kind){
  if(!preferences.enabled)return;
  const notes={bell:[[660,0,.13],[990,.12,.3]],step:[[90,0,.07,'triangle',.12],[75,.17,.07,'triangle',.1]],deal:[[520,0,.08],[780,.07,.10],[1040,.15,.24]],reject:[[150,0,.13,'triangle'],[110,.1,.19,'triangle']],talk:[[340,0,.07],[420,.08,.12]],tea:[[550,0,.10],[700,.1,.2]],scan:[[280,0,.08],[560,.08,.08],[1120,.16,.18]],click:[[460,0,.06,'triangle',.1]],story:[[330,0,.16],[440,.14,.18],[660,.28,.3]]};
  for(const n of notes[kind]||notes.click)tone(...n);
}
export const sound={
  unlock,play,
  getState:()=>({...preferences,contextState:context?.state||'uninitialized',activeVoices:active.size,ambientNodes:ambient.length}),
  async setEnabled(enabled){preferences.enabled=!!enabled;persist();if(!enabled){stopAmbient();if(master)master.gain.value=0;return true;}const ready=await unlock();if(master)master.gain.value=preferences.enabled?preferences.volume*0.35:0;if(!ready){preferences.enabled=false;persist();}return ready;},
  setAmbience(enabled){preferences.ambience=!!enabled;persist();ambience();},
  setVolume(volume){preferences.volume=Math.max(0,Math.min(1,Number(volume)||0));if(master)master.gain.setTargetAtTime(preferences.enabled?preferences.volume*0.35:0,context.currentTime,.04);persist();}
};
document.addEventListener('pointerdown',()=>{unlock().catch(()=>{});},{passive:true});
document.addEventListener('keydown',()=>{unlock().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAmbient();context?.suspend().catch(()=>{});}else if(preferences.enabled&&context)unlock().catch(()=>{});});
