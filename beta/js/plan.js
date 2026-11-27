// ---------- Render ----------
let DAY=null;
function dayList(){const out=[];const now=new Date();for(let i=0;i<4;i++){out.push(etDate(new Date(now.getTime()+i*86400e3)));}return out;}
function renderDays(){
  const box=$('days');box.innerHTML='';
  dayList().forEach(d=>{const b=document.createElement('button');b.textContent=fmtDay(etTime(d,12));if(d===DAY)b.className='on';b.onclick=()=>{DAY=d;try{localStorage.setItem('cx:beta:crossDay',d)}catch(e){};render();};box.appendChild(b);});
}
// The chosen departure: saved on this device for its date.
let LASTSEL=null, FUELNOW=null;
const DEPKEY='cx:beta:crossDep';
function savedDep(){try{const v=JSON.parse(localStorage.getItem(DEPKEY)||'null');if(v&&v.day&&v.ms&&!!v.home===HOME)return v;}catch(e){}return null;}
function saveDep(ms,actual){const v={day:etDate(new Date(ms)),ms,home:HOME,actual:!!actual};try{localStorage.setItem(DEPKEY,JSON.stringify(v));}catch(e){}}
function chosenDep(){
  const v=savedDep();return v&&v.day===DAY?{ms:v.ms,actual:!!v.actual}:null;
}
function render(){
  renderDays();
  if(!FC)return;
  renderBest();
  const now=new Date();
  const opts=[];for(let h=5.5;h<=11;h+=0.5){const dep=etTime(DAY,h);if(dep>now-1800e3)opts.push(scoreRun(dep));}
  const deps=$('deps');deps.innerHTML='';
  const ch=chosenDep();let chosen=null;
  if(ch){chosen=opts.find(o=>o.dep.getTime()===ch.ms);if(!chosen){chosen=scoreRun(new Date(ch.ms));chosen.extra=true;opts.unshift(chosen);}chosen.actual=ch.actual;chosen.captain=ch.captain;}
  const fromCaptain=!!(chosen&&chosen.captain);
  deps.style.display=fromCaptain?'none':'';
  $('depHow').textContent=fromCaptain?(chosen.actual?'This is the time the captain left.':'This is the departure time the captain picked.'):'Tap a time to see it; your pick is saved on this device. ★ marks the best departure.';
  if(!opts.length){clearTiles();$('call').innerHTML='<div class="badge na">Past</div><div class="why">No departure windows left for this day. Pick another day.</div>';$('flags').innerHTML='';renderLegs(null);renderInside(null);renderTFF(null);return;}
  const valid=opts.filter(o=>o.level>=0&&!o.extra);
  const best=valid.length?valid.reduce((a,b)=>(b.level<a.level||(b.level===a.level&&b.worstWave<a.worstWave))?b:a):null;
  // Tapping a time saves it, unless the boat has already left (then a tap only previews).
  const select=(o,el,tap)=>{deps.querySelectorAll('.dep').forEach(x=>x.classList.remove('sel'));if(el)el.classList.add('sel');
    if(tap&&!(chosen&&chosen.actual))saveDep(o.dep.getTime(),false);
    showCall(o,o===best);renderLegs(o.level<0?null:o);renderInside(o);renderTFF(o);};
  let bestEl=null,chosenEl=null;
  opts.forEach(o=>{const d=document.createElement('div');d.className='dep '+(o.level<0?'':LV[o.level]);
    const tag=o.extra?(o.actual?'LEFT':'YOUR TIME'):o===best?'★ BEST':'';
    d.innerHTML=`<b>${fmtT(o.dep)}</b>${o.level<0?'no data':(o.worstWave.toFixed(1)+' ft max')}${tag?'<span class="star">'+tag+'</span>':''}`;d.onclick=()=>select(o,d,true);deps.appendChild(d);if(o===best)bestEl=d;if(o===chosen)chosenEl=d;});
  if(chosen)select(chosen,chosenEl);
  else if(best)select(best,bestEl);
  else{clearTiles();$('call').innerHTML='<div class="badge na">No data</div><div class="why">The forecast doesn\'t reach this day yet.</div>';$('flags').innerHTML='';renderLegs(null);renderInside(null);renderTFF(null);}
}
function showCall(o,isBest){
  const t=o.rows,arr=t[t.length-1].t;
  const lead=o.actual?'Left at':o.captain?'Captain\'s departure':isBest?'Best departure':'Departure';
  if(o.level<0){clearTiles();$('call').innerHTML=`<div class="badge na">No data</div><div class="why"><b>${lead} ${fmtT(o.dep)}</b>The forecast doesn't cover this time.</div>`;$('flags').innerHTML='';return;}
  const txt=o.level===0?'Looks like a go':o.level===1?'Crossable, not comfortable':'Not today';
  $('call').innerHTML=`<div class="badge ${LV[o.level]}">${LVTXT[o.level]}</div><div class="why"><b>${txt}</b>${lead} <b style="display:inline;font-size:inherit">${fmtT(o.dep)}</b> · worst seas ${o.worstWave.toFixed(1)} ft · ${esc(RT.dest)} about ${fmtT(arr)}</div>`;
  $('flags').innerHTML=o.flags.map(f=>`<li>${esc(f)}</li>`).join('')||'<li>No wind-against-Stream, storm or gust flags.</li>';
  renderTiles(o,arr);
}
// Seas · Wind · Arrive for the chosen departure (Plan page part A, row 11): the
// worst seas and the strongest wind along the route, and the arrival time.
function clearTiles(){$('tiles').innerHTML='';$('brief').textContent='';if(typeof renderAlerts==='function')renderAlerts(null);if($('models'))$('models').textContent='';}
function renderTiles(o,arr){
  const has=k=>o.rows.filter(r=>r.v[k]!=null);
  const ws=has('wave'),wd=has('wind');
  const sea=ws.length?ws.reduce((a,b)=>b.v.wave>a.v.wave?b:a):null;
  const win=wd.length?wd.reduce((a,b)=>b.v.wind>a.v.wind?b:a):null;
  const sun=sunFor(DAY);
  const tile=(l,v,sub)=>`<div><span>${l}</span><b>${v}</b><small>${sub}</small></div>`;
  $('tiles').innerHTML=
    tile('Seas',sea?sea.v.wave.toFixed(1)+' ft':'–',sea?'worst, at '+esc(sea.wp.name):'')+
    tile('Wind',win?Math.round(win.v.wind)+' kt '+dirName(win.v.dir):'–',win?'strongest, at '+esc(win.wp.name):'')+
    tile('Arrive',fmtT(arr),esc(RT.dest))+
    tile('Water',range(o.rows,'sst','°F'),'along the route')+
    tile('Air',range(o.rows,'air','°F'),'while underway')+
    tile('Sunrise',sun?fmtT(sun.rise):'–',sun?'sunset '+fmtT(sun.set):'');
  $('brief').textContent=briefText(o);
  // Row 13 part 2 (warnings.js): US marine warnings and the forecast models for this run.
  if(typeof renderAlerts==='function'){renderAlerts(o);renderModels(o);}
}
// Low to high along the run, rounded: "79°F" or "75–81°F".
function range(rows,k,unit){
  const v=rows.map(r=>r.v[k]).filter(x=>x!=null).map(Math.round);
  if(!v.length)return '–';
  const lo=Math.min(...v),hi=Math.max(...v);
  return lo===hi?lo+unit:lo+'–'+hi+unit;
}
// Sunrise and sunset for the planned day (Open-Meteo daily).
function sunFor(day){
  if(!FC||!FC.daily||!FC.daily.time)return null;
  const i=FC.daily.time.indexOf(day);
  if(i<0||!FC.daily.sunrise[i])return null;
  return {rise:new Date(etMs(FC.daily.sunrise[i])),set:new Date(etMs(FC.daily.sunset[i]))};
}
// ---------- The written summary (row 12) ----------
// Fixed rules from the forecast numbers; no AI. It only describes conditions:
// never advice and none of the wording CLAUDE.md rules out. The answer card and the
// captain make the call.
const DIRWORD=d=>['north','northeast','east','southeast','south','southwest','west','northwest'][Math.round(d/45)%8];
function briefText(o){
  const R=o.rows,has=k=>R.filter(r=>r.v[k]!=null),out=[];
  const between=(a,b,u)=>a===b?'about '+b+u:a+' to '+b+u;
  const W=has('wave');
  if(W.length){
    const top=W.reduce((a,b)=>b.v.wave>a.v.wave?b:a);
    const lo=Math.round(Math.min(...W.map(r=>r.v.wave))),hi=Math.round(top.v.wave);
    out.push('Seas '+between(lo,hi,' ft')+(hi>lo?', highest near '+top.wp.name+' around '+fmtT(top.t):'')+'.');
  }
  const D=has('wind');
  if(D.length){
    const top=D.reduce((a,b)=>b.v.wind>a.v.wind?b:a);
    const lo=Math.round(Math.min(...D.map(r=>r.v.wind))),hi=Math.round(top.v.wind);
    const g=has('gust').map(r=>r.v.gust),gust=g.length?Math.round(Math.max(...g)):null;
    const dir=top.v.dir==null?'':DIRWORD(top.v.dir)+' ';
    const w=dir+'wind '+between(lo,hi,' kt')+(gust!=null&&gust>=hi+5?', gusts to '+gust:'');
    out.push(w.charAt(0).toUpperCase()+w.slice(1)+'.');
  }
  const wt=range(R,'sst','°F'),at=range(R,'air','°F');
  if(wt!=='–'||at!=='–')out.push([wt!=='–'?'Water '+wt.replace('–',' to '):'',at!=='–'?'air '+at.replace('–',' to '):''].filter(Boolean).join(', ').replace(/^air/,'Air')+'.');
  const rain=has('rain').map(r=>r.v.rain),storm=R.some(r=>r.v.code!=null&&r.v.code>=95);
  if(storm)out.push('Thunderstorms possible.');
  else if(rain.length){const m=Math.max(...rain);out.push(m>=50?'Rain likely.':m>=20?'A chance of rain.':'Rain unlikely.');}
  return out.join(' ');
}
// ---------- Best day this week (row 12) ----------
// The same scoring as the answer card, run for each day's departure times.
function bestOfDay(d){
  const now=Date.now(),opts=[];
  for(let h=5.5;h<=11;h+=0.5){const dep=etTime(d,h);if(dep>now-1800e3){const o=scoreRun(dep);if(o.level>=0)opts.push(o);}}
  return opts.length?opts.reduce((a,b)=>(b.level<a.level||(b.level===a.level&&b.worstWave<a.worstWave))?b:a):null;
}
function renderBest(){
  const box=$('bestDays');if(!FC){box.innerHTML='';return;}
  const days=dayList().map(d=>({d,o:bestOfDay(d)}));
  const ok=days.filter(x=>x.o);
  const top=ok.length?ok.reduce((a,b)=>(b.o.level<a.o.level||(b.o.level===a.o.level&&b.o.worstWave<a.o.worstWave))?b:a):null;
  const WORD=['GO','CROSSABLE','NO-GO'];
  box.innerHTML='';
  days.forEach(x=>{
    const b=document.createElement('button');b.type='button';
    b.className='bestday'+(x.d===DAY?' on':'');
    b.innerHTML=`<b>${fmtDay(etTime(x.d,12))}</b>`+(x.o
      ?`<span class="lv ${LV[x.o.level]}">${WORD[x.o.level]}</span><small>${fmtT(x.o.dep)} · ${x.o.worstWave.toFixed(1)} ft max${top===x?'<em>★ Best day</em>':''}</small>`
      :`<small>${x.d===etDate(new Date())&&etTime(x.d,11)<new Date()-1800e3?'This morning\u2019s departures have passed':'No forecast for that morning yet'}</small>`);
    b.onclick=()=>{DAY=x.d;try{localStorage.setItem('cx:beta:crossDay',x.d)}catch(e){};render();window.scrollTo(0,0);};
    box.appendChild(b);
  });
}
function cls(v,lo,hi){return v==null?'':v>hi?'n':v>=lo?'m':'g';}
function renderLegs(o){
  const t=$('legs');
  if(!o){t.innerHTML='';return;}
  t.innerHTML='<tr><th>Point</th><th>Pass</th><th>Seas</th><th>Wind</th><th>Rain</th></tr>'+o.rows.map(r=>{const v=r.v;
    const windCls=(MY.noNorth&&isNorthish(v.dir)&&(r.wp.ocean||r.wp.id==='inlet'))?cls(v.wind,MY.windKt-5,MY.windKt-0.1):cls(v.wind,MY.windKt,MY.windKt+5);
    return `<tr><td>${esc(r.wp.name)}<br><small style="color:var(--soft)">${Math.round(RT.cum[RT.wp.indexOf(r.wp)])} nm${v.sst!=null||v.air!=null?'<br>Water '+(v.sst==null?'–':Math.round(v.sst)+'°')+' · Air '+(v.air==null?'–':Math.round(v.air)+'°'):''}</small></td><td>${fmtT(r.t)}</td><td class="${cls(v.wave,MY.seasFt-1,MY.seasFt)}">${v.wave==null?'–':v.wave.toFixed(1)+' ft'}<br><small>${v.per==null?'':v.per.toFixed(0)+'s '+dirName(v.wdir)}</small></td><td class="${windCls}">${v.wind==null?'–':Math.round(v.wind)+' kt '+dirName(v.dir)}<br><small>${v.gust==null?'':'gusts '+Math.round(v.gust)}</small></td><td>${v.rain==null?'–':v.rain+'%'}</td></tr>`;}).join('');
}
function chop(w){if(w==null)return '–';if(w<10)return 'under 1 ft';if(w<15)return '1–2 ft';if(w<20)return '2–3 ft';return '3+ ft, sloppy';}
function renderInside(o){
  if(!RT.abaco)return;   // Sea of Abaco and Whale Cay: the Abaco route only
  const when=o?o.rows[o.rows.length-1].t:etTime(DAY,14);
  const k=hourKey(when), iv=at(FC.inside,k), wv=at(FC.whale,k);
  const rage=wv.wave!=null&&(wv.wave>=5||(wv.swell>=4&&wv.sdir!=null&&wv.sdir>=0&&wv.sdir<=110));
  $('inside').innerHTML=`
    <div><span>Wind inside at ${fmtT(when)}</span><b>${iv.wind==null?'–':Math.round(iv.wind)+' kt '+dirName(iv.dir)}</b></div>
    <div><span>Estimated chop inside</span><b>${chop(iv.wind)}</b></div>
    <div><span>Whale Cay passage (outside)</span><b style="color:${rage?'var(--no)':'inherit'}">${wv.wave==null?'–':wv.wave.toFixed(1)+' ft'}${wv.swell!=null?' · swell '+wv.swell.toFixed(1)+' ft '+dirName(wv.sdir):''}</b></div>
    <div><span>Whale Cay call</span><b style="color:${rage?'var(--no)':'var(--go)'}">${wv.wave==null?'–':rage?'Possible rage: wait or go inside':'Looks passable'}</b></div>`;
}
async function renderTFF(o){
  LASTSEL=o;
  const arr=o?o.rows[o.rows.length-1].t:null;
  const dist=RT.totalNm, hrs=dist/MY.cruiseKt;
  // Row 13: a fixed allowance for the worst forecast seas on this run (RJ, Nov 26):
  // under 2 ft 0%, 2 to 3 ft +5%, 3 to 4 ft +10%, over 4 ft +15%. Planning numbers.
  const ww=o&&o.level>=0?Math.round(o.worstWave*10)/10:null;   // the band follows the number shown (one decimal)
  const seaPct=ww==null?0:ww<2?0:ww<3?5:ww<=4?10:15;
  const fu=MY.fuel(dist), tank=MY.tankGal;
  const fuelLo=Math.round(fu.lo*(1+seaPct/100)), fuelHi=Math.round(fu.hi*(1+seaPct/100));
  FUELNOW={lo:fuelLo,hi:fuelHi};
  const di=FC.daily.time.indexOf(DAY);
  const sunrise=di>=0?new Date(etMs(FC.daily.sunrise[di])):null;
  let tideTxt='–',tideNote='';
  const dep=o?o.dep.getTime():null,arrMs=arr?arr.getTime():null,nowMs=Date.now(),isToday=etDate(new Date())===DAY,nowMark=isToday?{ms:nowMs,color:'#e8f1f7',dash:true}:null;
  const nowTxt=(level,ft)=>{if(!isToday)return '';const a=level(nowMs),b=level(nowMs+10*60e3);if(a==null)return '';return 'now '+fmtT(new Date(nowMs))+(ft?' · '+a.toFixed(1)+' ft':'')+(b==null?'':b>a?' · rising':' · falling');};
  // Palm Beach (NOAA Lake Worth Pier): the Abaco route only. Other routes show the destination's model tide.
  if(!RT.abaco){$('tidePB').innerHTML='';$('tidePB').style.display='none';}
  else try{const ev=await noaaTides(DAY);const d0=etTime(DAY,0).getTime(),d1=etTime(DAY,24).getTime();
    tideTxt=ev.filter(e=>e.ms>=d0&&e.ms<d1).map(x=>`${x.type==='H'?'High':'Low'} ${fmtT(new Date(x.ms))}`).join(' · ');
    tideNote='Palm Beach tides: NOAA Lake Worth Pier (8722670). ';
    const lv=cosLevel(ev);drawTideCurve($('tidePB'),'PALM BEACH INLET TIDE',lv,ev,DAY,[nowMark,HOME?(arrMs&&{ms:arrMs,color:'#f2b33d',label:'arrive'}):(dep&&{ms:dep,color:'#2fbf71',label:'leave'})],nowTxt(lv,true));}
  catch(e){tideTxt='Tide service didn\'t load';$('tidePB').innerHTML='';}
  const gpt=FC.route[RT.abaco?GTI:FC.route.length-1];
  const glv=modelLevel(gpt);
  if(!drawTideCurve($('tideGT'),RT.abaco?'GREEN TURTLE TIDE (MODEL)':RT.dest.toUpperCase()+' TIDE (MODEL)',glv,modelEvents(gpt,DAY),DAY,[nowMark,HOME&&RT.abaco?(dep&&{ms:dep,color:'#2fbf71',label:'leave'}):(arrMs&&{ms:arrMs,color:'#f2b33d',label:'arrive'})],nowTxt(glv,false)))$('tideGT').innerHTML='';
  const gt=tideAt(gpt,DAY);
  $('tff').innerHTML=`
    <div><span>Distance (${esc(RT.orig)} → ${esc(RT.dest)})</span><b>${Math.round(dist)} nm</b></div>
    <div><span>Run time at ${MY.cruiseKt} kt</span><b>${Math.floor(hrs)}h ${Math.round((hrs%1)*60)}m</b></div>
    <div><span>Arrive ${esc(RT.dest)}</span><b>${arr?fmtT(arr):'–'}</b></div>
    <div style="grid-column:1/-1"><span>Fuel needed (${tank} gal tank${fu.estimate?', estimated burn':''})</span><b>${fuelLo}–${fuelHi} gal of ${tank} · ${tank-fuelHi<0?'more than your tank':'reserve left '+(tank-fuelHi)+'–'+(tank-fuelLo)+' gal'}</b><span style="margin-top:2px">${seaPct?'Includes +'+seaPct+'% for the forecast seas (worst '+o.worstWave.toFixed(1)+' ft)':o&&o.level>=0?'No allowance added: forecast seas under 2 ft':'Before any allowance for the seas'}</span></div>
    <div><span>Sunrise / first light</span><b>${sunrise?fmtT(sunrise)+' / ~'+fmtT(new Date(sunrise.getTime()-25*60e3)):'–'}</b></div>
    ${RT.abaco?`<div><span>Palm Beach tides</span><b style="font-size:14px">${tideTxt}</b></div>`:''}
    <div style="grid-column:1/-1"><span>${RT.abaco?'Green Turtle':esc(RT.dest)} tide (model, rough)</span><b style="font-size:14px">${gt}</b></div>`;
  $('tideNote').textContent=RT.abaco?tideNote+'Green Turtle tide is from an ocean model, fine for timing but not for depth. Check your tide tables for skinny water.'
    :RT.dest+' tide is from an ocean model, fine for timing but not for depth. Check your tide tables, especially at the inlets and in skinny water.';
}

// Link to the float plan page (row 13) with the chosen departure, arrival and fuel.
function floatPlanHref(){
  const p=new URLSearchParams();
  if(HOME)p.set('trip','home');
  const o=LASTSEL;
  if(o&&o.dep){p.set('dep',o.dep.getTime());if(o.level>=0)p.set('arr',o.rows[o.rows.length-1].t.getTime());}
  if(FUELNOW)p.set('fuel',FUELNOW.lo+'-'+FUELNOW.hi);
  const q=p.toString();
  return 'float-plan.html'+(q?'?'+q:'');
}
