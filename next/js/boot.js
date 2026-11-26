// ---------- Boot ----------
window.addEventListener('hashchange',()=>location.reload());
(async function(){
  const days=dayList();
  let saved=null;try{saved=localStorage.getItem('crossDay');}catch(e){}
  DAY=days.includes(saved)?saved:days[0];
  if(location.pathname.includes('/next/')){$('previewBar').style.display='block';document.title='PREVIEW · '+document.title;}
  renderDays();initMap();
  if(IS_CAPTAIN)$('captain').style.display='block';
  // Saved setup and route (rows 8 and 9). With no setup and the Abaco route, the page reads as before.
  if(MY.saved)$('callHow').textContent=`The call scores seas and wind at each point along the route at the hour you'd pass it (cruise ${MY.cruiseKt} kt, from your setup). Your limits: seas over ${MY.seasFt} ft = no, within a foot of it = crossable, not comfortable; wind over ${MY.windKt} kt = crossable, not comfortable`+(MY.noNorth?`; north wind of ${MY.windKt} kt or more against the Gulf Stream = no.`:'.');
  if(!RT.abaco){
    $('insideCard').style.display='none';
    $('gpxNote').textContent='GPX: save it, then send it to your plotter (for a Garmin, through the ActiveCaptain app or a microSD card). This route is the points you set, joined by straight lines. Check it against your charts before you run it.';
    // The Live screen is frozen until after the crossing and only knows the Abaco route.
    $('liveBtn').style.display='none';
    $('trackNote').textContent='Live tracking follows West Palm \u2192 Abaco until after the crossing (Dec 1). To start a trip now, pick that route in Menu \u2192 Setup.';
  }
  // Start trip & share with family: opens the Live page, keeping the direction.
  try{const tr=JSON.parse(localStorage.getItem('cx:next:trip')||'null');$('liveBtn').href='live.html'+(HOME?'?trip=home':'');
    if(tr&&tr.status==='underway')$('liveBtn').textContent='Back to your trip';}catch(e){}
  try{await loadForecast();$('upd').textContent='Updated '+fmtT(new Date());render();}
  catch(e){$('upd').textContent='Forecast failed to load';$('call').innerHTML='<div class="badge na">Offline</div><div class="why">Couldn\'t reach the forecast service. Pull to refresh, or use the source links below.</div>';}
  // Move the tide "now" marker every minute.
  setInterval(()=>{if(FC)renderTFF(LASTSEL);},60e3);
  setInterval(async()=>{try{await loadForecast();$('upd').textContent='Updated '+fmtT(new Date());render();}catch(e){}},30*60e3);
})();

// Go-day checklist (captain mode only; ticks in localStorage on this device)
(function(){
  if(!location.hash.startsWith('#captain'))return;
  if(!RT.abaco)return;   // this checklist is the Abaco trip's; other routes get theirs later
  const ITEMS=HOME?[
    ['Final weather call','Check the call card above; go only on a green or a yellow you accept.'],
    ['Starlink to Roam + Ocean Mode','In the Starlink app on the boat; it takes effect right away.'],
    ['Float plan texts sent','To Mom and Raul: route, departure, ETA and the trip-home link.'],
    ['Fuel and reserve check','Top up at Green Turtle if the reserve looks thin.'],
    ['Whale Cay passage check','See Inside the Sea of Abaco; go inside or wait in a big northeast swell.'],
    ['Registration, insurance, permit aboard','Copies also in <a href="https://drive.google.com/drive/folders/1u51aeIJ9toHbiC0g27jImnC4RvHu-O4h" target="_blank" rel="noopener">trip docs</a>.'],
    ['Start trip & share with family','Button above (on the helm iPad), then Send link to family. Positions begin past Green Turtle.'],
    ['Report arrival in CBP ROAM','Right after you reach Palm Beach; DTOPS decal number ready.'],
    ['Trip ends by itself near home','Check the Live page says your followers can see the trip has ended.']
  ]:[
    ['Final weather call','Check the call card above; go only on a green or a yellow you accept.'],
    ['Starlink to Roam + Ocean Mode','In the Starlink app on the boat; it takes effect right away.'],
    ['Float plan texts sent','To Mom and Raul: route, departure, ETA, this page\'s link.'],
    ['Fuel and reserve check','215 gal tank; crossing burns ~150 to 180 gal. Note the gauge.'],
    ['Current registration + insurance aboard','Copies also in <a href="https://drive.google.com/drive/folders/1u51aeIJ9toHbiC0g27jImnC4RvHu-O4h" target="_blank" rel="noopener">trip docs</a>.'],
    ['Start trip & share with family','Button above (on the helm iPad), then Send link to family. Positions begin outside the inlet.'],
    ['Click2Clear filed and paid','<a href="https://www.bahamascustoms.gov.bs/?p=5024" target="_blank" rel="noopener">Bahamas Customs</a>: Cruising Permit, Pleasure Craft, Create Inbound. 30-day permit + fishing.'],
    ['Q flag up at Green Turtle','Only the captain goes ashore until cleared.'],
    ['Cleared: permit stamped and signed','Then the courtesy flag goes up.'],
    ['Whale Cay passage check','See Inside the Sea of Abaco; skip it in a big northeast swell.'],
    ['Arrived at Coconut Grove','The trip ends by itself at Green Turtle Cay. Text Mom and Raul you\'re in.']
  ];
  const KEY='goday-ticks';let t={};try{t=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(t))}catch(e){}};
  const ol=$('chkList');
  function draw(){
    ol.innerHTML='';let n=0;
    ITEMS.forEach(([title,hint],i)=>{
      const li=document.createElement('li');if(t[i]){li.className='done';n++;}
      const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!t[i];
      cb.onchange=()=>{t[i]=cb.checked;save();draw();};
      const sp=document.createElement('span');sp.innerHTML='<b>'+(i+1)+'. '+title+'</b><small>'+hint+'</small>';
      li.append(cb,sp);ol.append(li);
    });
    $('chkCount').textContent=n+' of '+ITEMS.length+' done';
  }
  $('chkReset').onclick=()=>{t={};save();draw();};
  $('goday').style.display='block';draw();
})();

// Direction switch: trip over (default) or trip home (?trip=home), keeping #captain if set
(function(){
  const h=location.hash||'';
  const other=HOME?location.pathname+h:location.pathname+'?trip=home'+h;
  $('dirBar').innerHTML=(!RT.abaco?(HOME?'<b>Trip home:</b> ':'<b>Trip over:</b> ')+esc(RT.orig)+' → '+esc(RT.dest):HOME?'<b>Trip home:</b> Guana → Palm Beach':'<b>Trip over:</b> Palm Beach → Green Turtle')+' · <a href="'+other+'" style="color:var(--accent)">'+(HOME?'switch to trip over':'switch to trip home')+'</a>';
  if(!RT.abaco){$('depFrom').textContent='Departure options from '+RT.orig+'.';if(HOME)document.title='Trip home · '+document.title;}
  else if(HOME){
    $('depFrom').textContent='Departure options from Guana Cay (via Whale Cay and Green Turtle).';
    $('trackNote').textContent='Start the trip on the helm iPad, then send the family link. Family follow the boat on their own page. Nothing is shared until you are past Green Turtle, and sharing stops when you arrive.';
    document.title='Trip home · Goof n\' Off';
  }
})();
