const tideCache={};
async function noaaTides(day){
  if(tideCache[day])return tideCache[day];
  const prev=etDate(new Date(etTime(day,12).getTime()-86400e3)).replace(/-/g,'');
  const u=`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=goofnoff_crossing&begin_date=${prev}&range=72&datum=MLLW&station=${NOAA_TIDE_STATION}&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
  const j=await getJSON(u);if(!j.predictions)throw new Error('no tides');
  const ev=j.predictions.map(p=>{const [dd,tt]=p.t.split(' ');const [h,m]=tt.split(':').map(Number);return {type:p.type,ft:parseFloat(p.v),ms:etTime(dd,h+m/60).getTime()};}).sort((a,b)=>a.ms-b.ms);
  return tideCache[day]=ev;
}
// Tide curve (same look as Alfi's TV): half-cosine between highs and lows, markers for departure/arrival and now.
function svgEl(svg,tag,attrs,text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!=null)e.textContent=text;svg.appendChild(e);return e;}
function drawTideCurve(svg,title,level,events,day,marks,right){
  svg.innerHTML='';
  const d0=etTime(day,0).getTime(),d1=etTime(day,24).getTime();
  const W=540,X0=24,X1=W-24;
  const samples=[];for(let k=0;k<=96;k++){const ms=d0+(d1-d0)*k/96;const v=level(ms);if(v==null)return false;samples.push([ms,v]);}
  const vs=samples.map(s=>s[1]),lo=Math.min(...vs),hi=Math.max(...vs);
  const x=ms=>X0+(X1-X0)*(ms-d0)/(d1-d0),y=v=>76-(v-lo)/((hi-lo)||1)*40;
  const pts=samples.map(([ms,v])=>x(ms).toFixed(1)+','+y(v).toFixed(1));
  svgEl(svg,'text',{x:0,y:16,class:'k'},title);
  if(right)svgEl(svg,'text',{x:W,y:16,'text-anchor':'end',style:'fill:#e8f1f7;font-weight:700;font-size:15px'},right);
  svgEl(svg,'polygon',{points:X0+',80 '+pts.join(' ')+' '+X1+',80',fill:'#5cc8ff','fill-opacity':0.12});
  svgEl(svg,'polyline',{points:pts.join(' '),fill:'none',stroke:'#5cc8ff','stroke-width':2.5,'stroke-linejoin':'round'});
  events.filter(e=>e.ms>=d0&&e.ms<d1).forEach(e=>{const v=level(e.ms);svgEl(svg,'circle',{cx:x(e.ms),cy:y(v),r:3.5,fill:'#5cc8ff'});
    svgEl(svg,'text',{x:Math.min(Math.max(x(e.ms),36),W-36),y:106,'text-anchor':'middle',class:e.type==='H'?'h':''},(e.type==='H'?'H ':'L ')+fmtT(new Date(e.ms)).replace(':00','').replace(' AM','a').replace(' PM','p'));});
  (marks||[]).forEach(m=>{if(!m||m.ms<d0||m.ms>d1)return;const cx=x(m.ms);svgEl(svg,'line',{x1:cx,x2:cx,y1:28,y2:82,stroke:m.color,'stroke-width':1.5,'stroke-dasharray':m.dash?'3 3':''});
    svgEl(svg,'circle',{cx,cy:y(level(m.ms)),r:4.5,fill:m.color});if(m.label)svgEl(svg,'text',{x:Math.min(Math.max(cx,40),W-40),y:34,'text-anchor':'middle',style:'fill:'+m.color+';font-weight:700'},m.label);});
  return true;
}
function cosLevel(ev){return ms=>{let i=lastIdx(ev,e=>e.ms<=ms);if(i<0||i>=ev.length-1)return null;const a=ev[i],b=ev[i+1];const u=(ms-a.ms)/(b.ms-a.ms);return (a.ft+b.ft)/2+(a.ft-b.ft)/2*Math.cos(Math.PI*u);};}
function modelLevel(pt){const t=pt.m.hourly.time,s=pt.m.hourly.sea_level_height_msl;if(!s)return ()=>null;const ms=t.map(etMs);
  return q=>{let i=lastIdx(ms,m=>m<=q);if(i<0||i>=ms.length-1||s[i]==null||s[i+1]==null)return null;const u=(q-ms[i])/(ms[i+1]-ms[i]);return s[i]+(s[i+1]-s[i])*u;};}
function modelEvents(pt,day){const t=pt.m.hourly.time,s=pt.m.hourly.sea_level_height_msl,out=[];if(!s)return out;for(let i=1;i<t.length-1;i++){const a=s[i-1],b=s[i],c=s[i+1];if(a==null||b==null||c==null)continue;if(b>a&&b>=c)out.push({type:'H',ms:etMs(t[i])});else if(b<a&&b<=c)out.push({type:'L',ms:etMs(t[i])});}return out;}
function tideAt(pt,day){
  const s=pt.m.hourly.sea_level_height_msl;if(!s)return '–';
  const ts=pt.m.hourly.time;const out=[];
  for(let i=1;i<ts.length-1;i++){if(!ts[i].startsWith(day))continue;const a=s[i-1],b=s[i],c=s[i+1];if(b==null||a==null||c==null)continue;
    if(b>a&&b>=c)out.push('High ~'+fmtT(new Date(etMs(ts[i]))));else if(b<a&&b<=c)out.push('Low ~'+fmtT(new Date(etMs(ts[i]))));}
  return out.slice(0,4).join(' · ')||'–';
}

