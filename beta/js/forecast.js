// ---------- Data ----------
let FC = null; // {points:[{marine,wind}], inside, whale, daily}
async function getJSON(u){const r=await fetch(u);if(!r.ok)throw new Error(r.status+' '+u.split('?')[0]);return r.json();}
async function loadForecast(){
  const pts=[...RT.wp,...(RT.abaco?[INSIDE,WHALE]:[])];   // RT: active-route.js (row 9)
  const lat=pts.map(p=>p.lat).join(','), lon=pts.map(p=>p.lon).join(',');
  const marineU=`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_direction,sea_level_height_msl,sea_surface_temperature&length_unit=imperial&timezone=${encodeURIComponent(TZ)}&forecast_days=5&cell_selection=sea`;
  const windU=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,weather_code,temperature_2m&daily=sunrise,sunset&wind_speed_unit=kn&temperature_unit=fahrenheit&timezone=${encodeURIComponent(TZ)}&forecast_days=5`;
  const [m,w]=await Promise.all([getJSON(marineU),getJSON(windU)]);
  const mA=Array.isArray(m)?m:[m], wA=Array.isArray(w)?w:[w];
  const idx=a=>{const map={};a.hourly.time.forEach((t,i)=>map[t]=i);return map;};
  const all=pts.map((p,i)=>({p,m:mA[i],w:wA[i],mi:idx(mA[i]),wi:idx(wA[i])}));
  const n=RT.wp.length;
  FC={route:all.slice(0,n),inside:RT.abaco?all[n]:null,whale:RT.abaco?all[n+1]:null,daily:wA[0].daily};
}
function at(pt,key){ // forecast values at an hour key "YYYY-MM-DDTHH:00"
  const i=pt.mi[key], j=pt.wi[key];
  const g=(o,k,ix)=>ix==null||!o.hourly[k]?null:o.hourly[k][ix];
  // Row 12: water and air temperature in °F (RJ, Nov 26: °F only). The marine
  // service may answer in °C; convert when its units say so.
  const sstC=pt.m.hourly_units&&/C/.test(pt.m.hourly_units.sea_surface_temperature||'');
  const sst=g(pt.m,'sea_surface_temperature',i);
  return {sst:sst==null?null:sstC?sst*9/5+32:sst,air:g(pt.w,'temperature_2m',j),
          wave:g(pt.m,'wave_height',i),per:g(pt.m,'wave_period',i),wdir:g(pt.m,'wave_direction',i),swell:g(pt.m,'swell_wave_height',i),sdir:g(pt.m,'swell_wave_direction',i),sea:g(pt.m,'sea_level_height_msl',i),
          wind:g(pt.w,'wind_speed_10m',j),dir:g(pt.w,'wind_direction_10m',j),gust:g(pt.w,'wind_gusts_10m',j),rain:g(pt.w,'precipitation_probability',j),code:g(pt.w,'weather_code',j)};
}
const hourKey = d => etKey(new Date(Math.round(d.getTime()/3600e3)*3600e3));

// ---------- Scoring ----------
function scoreRun(dep){
  const rows=[],flags=[];let worstWave=0,level=0; // 0 go,1 maybe,2 no
  FC.route.forEach((pt,i)=>{
    // Limits come from the saved setup (mysetup.js); with none they are today's 4 ft and 15 kt.
    const t=new Date(dep.getTime()+RT.cum[i]/MY.cruiseKt*3600e3);
    const v=at(pt,hourKey(t));rows.push({wp:RT.wp[i],t,v});
    if(v.wave!=null){worstWave=Math.max(worstWave,v.wave);
      if(v.wave>MY.seasFt){level=Math.max(level,2);if(MY.windRule)flags.push(`Seas ${v.wave.toFixed(1)} ft at ${RT.wp[i].name}, over your ${MY.seasFt} ft limit`);}
      else if(v.wave>=MY.seasFt-1)level=Math.max(level,1);}
    const inStream=(RT.wp[i].ocean||RT.wp[i].id==='inlet')&&isNorthish(v.dir);
    if(MY.noNorth&&inStream&&v.wind!=null){
      if(v.wind>=MY.windKt){level=2;flags.push(`North wind ${Math.round(v.wind)} kt against the Gulf Stream at ${RT.wp[i].name}`);}
      else if(v.wind>=MY.windKt-5){level=Math.max(level,1);flags.push(`${dirName(v.dir)} ${Math.round(v.wind)} kt in the Stream at ${RT.wp[i].name}: short, steep seas likely`);} }
    // Wind over the max from other directions: CROSSABLE, not NO-GO (RJ, Nov 27).
    else if(MY.windRule&&v.wind!=null&&v.wind>MY.windKt){level=Math.max(level,1);flags.push(`Wind ${Math.round(v.wind)} kt ${dirName(v.dir)} at ${RT.wp[i].name}, over your ${MY.windKt} kt limit`);}
    if(v.code!=null&&v.code>=95){level=Math.max(level,1);flags.push(`Thunderstorms possible near ${RT.wp[i].name} around ${fmtT(t)}`);}
    else if(v.rain!=null&&v.rain>=60)flags.push(`Rain likely (${v.rain}%) near ${RT.wp[i].name}`);
    if(v.gust!=null&&v.gust>=25){level=Math.max(level,1);flags.push(`Gusts to ${Math.round(v.gust)} kt at ${RT.wp[i].name}`);}
  });
  const missing=rows.some(r=>r.v.wave==null&&r.v.wind==null);
  return {dep,rows,flags:[...new Set(flags)],worstWave,level:missing?-1:level};
}
const LV=['go','maybe','no'], LVTXT=['GO','CROSS-<br>ABLE','NO-GO'];

