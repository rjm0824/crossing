// ---------- Render ----------
let DAY=null;
function dayList(){const out=[];const now=new Date();for(let i=0;i<4;i++){out.push(etDate(new Date(now.getTime()+i*86400e3)));}return out;}
function renderDays(){
  const box=$('days');box.innerHTML='';
  dayList().forEach(d=>{const b=document.createElement('button');b.textContent=fmtDay(etTime(d,12));if(d===DAY)b.className='on';b.onclick=()=>{DAY=d;try{localStorage.setItem('crossDay',d)}catch(e){};render();};box.appendChild(b);});
}
// The chosen departure: saved on this device for its date.
let LASTSEL=null;
const DEPKEY='crossDep';
function savedDep(){try{const v=JSON.parse(localStorage.getItem(DEPKEY)||'null');if(v&&v.day&&v.ms&&!!v.home===HOME)return v;}catch(e){}return null;}
function saveDep(ms,actual){const v={day:etDate(new Date(ms)),ms,home:HOME,actual:!!actual};try{localStorage.setItem(DEPKEY,JSON.stringify(v));}catch(e){}}
function chosenDep(){
  const v=savedDep();return v&&v.day===DAY?{ms:v.ms,actual:!!v.actual}:null;
}
function render(){
  renderDays();
  if(!FC)return;
  const now=new Date();
  const opts=[];for(let h=5.5;h<=11;h+=0.5){const dep=etTime(DAY,h);if(dep>now-1800e3)opts.push(scoreRun(dep));}
  const deps=$('deps');deps.innerHTML='';
  const ch=chosenDep();let chosen=null;
  if(ch){chosen=opts.find(o=>o.dep.getTime()===ch.ms);if(!chosen){chosen=scoreRun(new Date(ch.ms));chosen.extra=true;opts.unshift(chosen);}chosen.actual=ch.actual;chosen.captain=ch.captain;}
  const fromCaptain=!!(chosen&&chosen.captain);
  deps.style.display=fromCaptain?'none':'';
  $('depHow').textContent=fromCaptain?(chosen.actual?'This is the time the captain left.':'This is the departure time the captain picked.'):'Tap a time to see it; your pick is saved on this device. ★ marks the best departure.';
  if(!opts.length){$('call').innerHTML='<div class="badge na">Past</div><div class="why">No departure windows left for this day. Pick another day.</div>';$('flags').innerHTML='';renderLegs(null);renderInside(null);renderTFF(null);return;}
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
  else{$('call').innerHTML='<div class="badge na">No data</div><div class="why">The forecast doesn\'t reach this day yet.</div>';$('flags').innerHTML='';renderLegs(null);renderInside(null);renderTFF(null);}
}
function showCall(o,isBest){
  const t=o.rows,arr=t[t.length-1].t;
  const lead=o.actual?'Left at':o.captain?'Captain\'s departure':isBest?'Best departure':'Departure';
  if(o.level<0){$('call').innerHTML=`<div class="badge na">No data</div><div class="why"><b>${lead} ${fmtT(o.dep)}</b>The forecast doesn't cover this time.</div>`;$('flags').innerHTML='';return;}
  const txt=o.level===0?'Looks like a go':o.level===1?'Crossable, not comfortable':'Not today';
  $('call').innerHTML=`<div class="badge ${LV[o.level]}">${LVTXT[o.level]}</div><div class="why"><b>${txt}</b>${lead} <b style="display:inline;font-size:inherit">${fmtT(o.dep)}</b> · worst seas ${o.worstWave.toFixed(1)} ft · ${DEST} about ${fmtT(arr)}</div>`;
  $('flags').innerHTML=o.flags.map(f=>`<li>${f}</li>`).join('')||'<li>No wind-against-Stream, storm or gust flags.</li>';
}
function cls(v,lo,hi){return v==null?'':v>hi?'n':v>=lo?'m':'g';}
function renderLegs(o){
  const t=$('legs');
  if(!o){t.innerHTML='';return;}
  t.innerHTML='<tr><th>Point</th><th>Pass</th><th>Seas</th><th>Wind</th><th>Rain</th></tr>'+o.rows.map(r=>{const v=r.v;
    const windCls=(MY.noNorth&&isNorthish(v.dir)&&(r.wp.ocean||r.wp.id==='inlet'))?cls(v.wind,MY.windKt-5,MY.windKt-0.1):cls(v.wind,MY.windKt,MY.windKt+5);
    return `<tr><td>${r.wp.name}<br><small style="color:var(--soft)">${Math.round(cum[WP.indexOf(r.wp)])} nm</small></td><td>${fmtT(r.t)}</td><td class="${cls(v.wave,MY.seasFt-1,MY.seasFt)}">${v.wave==null?'–':v.wave.toFixed(1)+' ft'}<br><small>${v.per==null?'':v.per.toFixed(0)+'s '+dirName(v.wdir)}</small></td><td class="${windCls}">${v.wind==null?'–':Math.round(v.wind)+' kt '+dirName(v.dir)}<br><small>${v.gust==null?'':'gusts '+Math.round(v.gust)}</small></td><td>${v.rain==null?'–':v.rain+'%'}</td></tr>`;}).join('');
}
function chop(w){if(w==null)return '–';if(w<10)return 'under 1 ft';if(w<15)return '1–2 ft';if(w<20)return '2–3 ft';return '3+ ft, sloppy';}
function renderInside(o){
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
  const dist=TOTAL_NM, hrs=dist/MY.cruiseKt;
  const fu=MY.fuel(dist), fuelLo=fu.lo, fuelHi=fu.hi, tank=MY.tankGal;
  const fuelLeft=tank-fuelHi<0?'more than your tank':`${tank-fuelHi}–${tank-fuelLo} left`;
  const di=FC.daily.time.indexOf(DAY);
  const sunrise=di>=0?new Date(etMs(FC.daily.sunrise[di])):null;
  let tideTxt='–',tideNote='';
  const dep=o?o.dep.getTime():null,arrMs=arr?arr.getTime():null,nowMs=Date.now(),isToday=etDate(new Date())===DAY,nowMark=isToday?{ms:nowMs,color:'#e8f1f7',dash:true}:null;
  const nowTxt=(level,ft)=>{if(!isToday)return '';const a=level(nowMs),b=level(nowMs+10*60e3);if(a==null)return '';return 'now '+fmtT(new Date(nowMs))+(ft?' · '+a.toFixed(1)+' ft':'')+(b==null?'':b>a?' · rising':' · falling');};
  try{const ev=await noaaTides(DAY);const d0=etTime(DAY,0).getTime(),d1=etTime(DAY,24).getTime();
    tideTxt=ev.filter(e=>e.ms>=d0&&e.ms<d1).map(x=>`${x.type==='H'?'High':'Low'} ${fmtT(new Date(x.ms))}`).join(' · ');
    tideNote='Palm Beach tides: NOAA Lake Worth Pier (8722670). ';
    const lv=cosLevel(ev);drawTideCurve($('tidePB'),'PALM BEACH INLET TIDE',lv,ev,DAY,[nowMark,HOME?(arrMs&&{ms:arrMs,color:'#f2b33d',label:'arrive'}):(dep&&{ms:dep,color:'#2fbf71',label:'leave'})],nowTxt(lv,true));}
  catch(e){tideTxt='Tide service didn\'t load';$('tidePB').innerHTML='';}
  const gpt=FC.route[GTI];
  const glv=modelLevel(gpt);
  if(!drawTideCurve($('tideGT'),'GREEN TURTLE TIDE (MODEL)',glv,modelEvents(gpt,DAY),DAY,[nowMark,HOME?(dep&&{ms:dep,color:'#2fbf71',label:'leave'}):(arrMs&&{ms:arrMs,color:'#f2b33d',label:'arrive'})],nowTxt(glv,false)))$('tideGT').innerHTML='';
  const gt=tideAt(FC.route[GTI],DAY);
  $('tff').innerHTML=`
    <div><span>Distance (${ORIG} → ${DEST})</span><b>${Math.round(dist)} nm</b></div>
    <div><span>Run time at ${MY.cruiseKt} kt</span><b>${Math.floor(hrs)}h ${Math.round((hrs%1)*60)}m</b></div>
    <div><span>Arrive ${DEST}</span><b>${arr?fmtT(arr):'–'}</b></div>
    <div><span>Fuel (${tank} gal tank${fu.estimate?', estimated burn':''})</span><b>${fuelLo}–${fuelHi} gal · ${fuelLeft}</b></div>
    <div><span>Sunrise / first light</span><b>${sunrise?fmtT(sunrise)+' / ~'+fmtT(new Date(sunrise.getTime()-25*60e3)):'–'}</b></div>
    <div><span>Palm Beach tides</span><b style="font-size:14px">${tideTxt}</b></div>
    <div style="grid-column:1/-1"><span>Green Turtle tide (model, rough)</span><b style="font-size:14px">${gt}</b></div>`;
  $('tideNote').textContent=tideNote+'Green Turtle tide is from an ocean model, fine for timing but not for depth. Check your tide tables for skinny water.';
}
