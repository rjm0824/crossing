// ---------- Boat tracking ----------
const NEAR_GTC_NM = 4;
async function loadTrack(){
  if(!TRACK_URL){$('trackText').textContent='Tracking not set up yet.';return;}
  try{const j=await getJSON(TRACK_URL+'?t='+Date.now());const pts=(j.points||[]).filter(p=>p.lat&&p.lon);
    usePlan(j.plan,pts);
    if(!pts.length){$('trackText').textContent='No position yet. The boat hasn\'t started sharing.';return;}
    const last=pts[pts.length-1],t=new Date(last.t),mins=Math.round((Date.now()-t)/60e3);
    const ll=[last.lat,last.lon];
    // Heading from the last two different positions; default east-northeast (toward Abaco)
    let hdg=HOME?255:75;for(let i=pts.length-2;i>=0;i--){const a=pts[i];if(a.lat!==last.lat||a.lon!==last.lon){const y=Math.sin(toRad(last.lon-a.lon))*Math.cos(toRad(last.lat)),x=Math.cos(toRad(a.lat))*Math.sin(toRad(last.lat))-Math.sin(toRad(a.lat))*Math.cos(toRad(last.lat))*Math.cos(toRad(last.lon-a.lon));hdg=(Math.atan2(y,x)*180/Math.PI+360)%360;break;}}
    const boatSvg=`<svg class="boat-ico" viewBox="0 0 34 34" style="transform:rotate(${hdg}deg)"><path d="M17 2 C22 8 24 14 24 22 L24 30 Q17 33 10 30 L10 22 C10 14 12 8 17 2 Z" fill="#ffffff" stroke="#0b1d2c" stroke-width="1.5"/><rect x="13" y="15" width="8" height="7" rx="1.5" fill="#5cc8ff" stroke="#0b1d2c" stroke-width="1"/><path d="M17 4 L17 11" stroke="#2fbf71" stroke-width="2" stroke-linecap="round"/></svg>`;
    const icon=L.divIcon({className:'',html:boatSvg,iconSize:[34,34],iconAnchor:[17,17]});
    if(!boatMarker){boatMarker=L.marker(ll,{icon,zIndexOffset:1000}).addTo(map).bindPopup("Goof n' Off");}
    else boatMarker.setIcon(icon);
    boatMarker.setLatLng(ll);
    if(trail)map.removeLayer(trail);trail=L.polyline(pts.map(p=>[p.lat,p.lon]),{color:'#2fbf71',weight:3}).addTo(map);
    const left=nm({lat:last.lat,lon:last.lon},WP[WP.length-1]);
    const sog=last.sog?Math.round(last.sog):null;
    const eta=sog&&sog>3?new Date(Date.now()+left/sog*3600e3):null;
    $('trackDot').className='dot'+(mins<20&&last.status!=='arrived'?' live':'');
    $('trackText').innerHTML=last.status==='arrived'?`<b>Arrived near ${DEST}</b> · ${fmtT(t)}`:`Last seen <b>${mins} min ago</b> · ${Math.round(left)} nm to ${DEST}${sog?' · '+sog+' kt':''}${eta?' · ETA ~'+fmtT(eta):''}`;
  }catch(e){$('trackText').innerHTML='<span class="err">Couldn\'t load the boat position.</span>';}
}
// Family link: take the captain's departure from the tracker. Until the tracker script is updated,
// fall back to the first position of today's run (only when the list isn't cut short).
let planSeen='';
function usePlan(plan,pts){
  if(IS_CAPTAIN)return;
  let p=plan&&plan.dep?plan:null;
  if(!p&&pts.length&&pts.length<50){let i=pts.length-1;while(i>0&&Date.parse(pts[i].t)-Date.parse(pts[i-1].t)<45*60e3)i--;p={dep:pts[i].t,home:HOME,actual:true};}
  const sig=p?JSON.stringify([p.dep,!!p.home,!!p.actual]):'';
  if(sig===planSeen)return;
  const first=!planSeen;planSeen=sig;CAP_PLAN=p;
  if(p&&first&&!!p.home===HOME){const d=etDate(new Date(Date.parse(p.dep)));if(dayList().includes(d))DAY=d;}
  render();
}
function sendPlan(v){
  if(!TRACK_URL)return;const key=($('capKey').value||'').trim();if(!key)return;
  fetch(TRACK_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({key,plan:{dep:new Date(v.ms).toISOString(),home:v.home,actual:v.actual}})}).catch(()=>{});
}
// Captain mode: open the page with #captain on the helm iPad
let watchId=null,lastSent=0,lastPos=null;
// Keep the screen awake while sharing, and notice when the page was paused.
let wakeLock=null,shareKey=null,lastTick=Date.now(),lastTry=0,pauseNote='';
const sharing=()=>watchId!=null;
function showStatus(){
  const el=$('capStatus');if(!sharing()){el.style.display='none';return;}
  const awake=!!(wakeLock&&!wakeLock.released);
  el.style.display='block';el.className='capstatus '+(awake?'ok':'warn');
  el.innerHTML=(awake?'<b>✓ Screen will stay awake</b> while sharing.':'<b>⚠ This device can\'t keep the screen awake by itself.</b> Open Settings › Display &amp; Brightness › Auto-Lock and choose Never.')
    +'<br><b>Keep this page open in front while sharing.</b> Switching apps or tabs pauses it, even with the screen awake.'
    +(pauseNote?'<br><span class="err">'+pauseNote+'</span>':'');
}
async function keepAwake(){
  try{if('wakeLock' in navigator&&(!wakeLock||wakeLock.released)){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',showStatus);}}catch(e){wakeLock=null;}
  showStatus();
}
function stopShare(){
  if(watchId!=null)navigator.geolocation.clearWatch(watchId);watchId=null;
  try{if(wakeLock&&!wakeLock.released)wakeLock.release();}catch(e){}wakeLock=null;showStatus();
}
function pollPos(){lastTry=Date.now();navigator.geolocation.getCurrentPosition(p=>onPos(p,shareKey),()=>{},{enableHighAccuracy:true,maximumAge:0,timeout:20000});}
function resumed(gap){
  if(!sharing())return;
  if(gap>6*60e3)pauseNote='Sharing was paused for about '+Math.round(gap/60e3)+' min (page in the background or screen off). It\'s back on now.';
  keepAwake();pollPos();
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){const g=Date.now()-lastTick;lastTick=Date.now();resumed(g);}});
setInterval(()=>{const now=Date.now(),g=now-lastTick;lastTick=now;if(!sharing())return;
  if(g>2*60e3){resumed(g);return;}
  if(document.visibilityState==='visible'&&(!wakeLock||wakeLock.released))keepAwake();
  if(now-lastSent>5.5*60e3&&now-lastTry>5*60e3)pollPos();},30e3);
function setupCaptain(){
  if(!location.hash.startsWith('#captain'))return;
  $('captain').style.display='block';
  try{const k=localStorage.getItem('capKey');if(k)$('capKey').value=k;}catch(e){}
  $('capStart').onclick=()=>{
    if(!TRACK_URL){alertBox('Tracking endpoint not set yet.');return;}
    const key=$('capKey').value.trim();if(!key){alertBox('Enter the captain key first.');return;}
    try{localStorage.setItem('capKey',key);}catch(e){}
    if(!navigator.geolocation){alertBox('This browser has no location.');return;}
    watchId=navigator.geolocation.watchPosition(p=>onPos(p,key),e=>alertBox('Location: '+e.message),{enableHighAccuracy:true,maximumAge:60000});
    shareKey=key;pauseNote='';lastTick=Date.now();keepAwake();
    $('capStart').style.display='none';$('capStop').style.display='inline-block';
    $('trackNote').textContent='Sharing is on. Keep this page open and the screen awake.';
    // The moment you start sharing becomes the departure time (for this device and the family link).
    DAY=etDate(new Date());try{localStorage.setItem('crossDay',DAY);}catch(e){}saveDep(Date.now(),true);render();
  };
  $('capTest').onclick=()=>{
    const key=$('capKey').value.trim();if(!key){alertBox('Enter the captain key first.');return;}
    try{localStorage.setItem('capKey',key);}catch(e){}
    sendPos(key,26.77,-79.98,0,'underway');
    $('trackNote').textContent='Test point sent (just offshore of the inlet). Reload in a minute to see the boat dot, then delete the row in the Crossing Tracker sheet.';
    setTimeout(loadTrack,8000);
  };
  $('capStop').onclick=()=>{stopShare();$('capStart').style.display='inline-block';$('capStop').style.display='none';$('trackNote').textContent='Sharing stopped.';};
}
function alertBox(m){$('trackNote').innerHTML='<span class="err">'+m+'</span>';}
function sendPos(key,lat,lon,sog,status){
  const body={key,lat:Math.round(lat*50)/50,lon:Math.round(lon*50)/50,sog:sog==null?'':Math.round(sog),status};
  fetch(TRACK_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)}).catch(()=>{});
}
function onPos(p,key){
  const now=Date.now();if(now-lastSent<5*60e3)return;
  const lat=p.coords.latitude,lon=p.coords.longitude;
  const near=HOME?(nm({lat,lon},WP[WP.length-1])<2||lon<-80.0):(nm({lat,lon},WP[WP.length-1])<NEAR_GTC_NM||lon>-77.36);
  let sog=p.coords.speed!=null?p.coords.speed*1.94384:null;
  if(sog==null&&lastPos){const h=(now-lastPos.t)/3600e3;if(h>0)sog=nm(lastPos,{lat,lon})/h;}
  lastPos={lat,lon,t:now};
  // Privacy: nothing is sent until the boat is east of the inlet (offshore), so home and the ICW never show.
  if(lon<-80.02){$('trackNote').textContent='Waiting until you\'re outside the inlet to start sharing.';return;}
  // Trip home: nothing is sent until the boat is west of Green Turtle, so the Abaco house never shows.
  if(HOME&&lon>-77.36){$('trackNote').textContent='Waiting until you\'re past Green Turtle to start sharing.';return;}
  lastSent=now;
  sendPos(key,lat,lon,sog,near?'arrived':'underway');
  $('trackNote').textContent='Sent '+fmtT(new Date(now))+(near?' · arrived, sharing stopped':'');
  if(near&&watchId!=null)stopShare();
}

