// ---------- Boot ----------
window.addEventListener('hashchange',()=>location.reload());
(async function(){
  const days=dayList();
  let saved=null;try{saved=localStorage.getItem('cx:beta:crossDay');}catch(e){}
  DAY=days.includes(saved)?saved:days[0];
  // The boat's name from setup (row 11); with no setup it reads as before.
  $('boatTitle').textContent=MY.boatName;
  document.title=(HOME?'Trip home · ':'Crossing · ')+MY.boatName;
  if(location.pathname.includes('/beta/')){$('previewBar').style.display='block';document.title='BETA · '+document.title;}
  renderDays();initMap();
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
  try{const tr=JSON.parse(localStorage.getItem('cx:beta:trip')||'null');$('liveBtn').href='live.html'+(HOME?'?trip=home':'');
    if(tr&&tr.status==='underway')$('liveBtn').textContent='Back to your trip';}catch(e){}
  try{await loadForecast();$('upd').textContent='Updated '+fmtT(new Date());render();}
  catch(e){$('upd').textContent='Forecast failed to load';$('call').innerHTML='<div class="badge na">Offline</div><div class="why">Couldn\'t reach the forecast service. Pull to refresh, or use the source links below.</div>';}
  // Move the tide "now" marker every minute.
  setInterval(()=>{if(FC)renderTFF(LASTSEL);},60e3);
  setInterval(async()=>{try{await loadForecast();$('upd').textContent='Updated '+fmtT(new Date());render();}catch(e){}},30*60e3);
})();

// Get ready (the go-day checklist; captain mode only; ticks saved on this device).
// Plan page part A (row 11): built from the saved setup (followers, tank and
// fuel, destination, papers link). The Abaco route keeps its customs and Sea
// of Abaco steps; other routes get the general list. Ticks are kept by item id.
(function(){
  if(!location.hash.startsWith('#captain'))return;
  const who=MY.followerList();
  const fu=MY.fuel(RT.totalNm);
  const fuelHint=`${MY.tankGal} gal tank; this run burns about ${fu.lo} to ${fu.hi} gal${fu.estimate?' (estimated burn)':''}. Note the gauge.`;
  const papers=MY.papers
    ?'Copies in <a href="'+esc(MY.papers)+'" target="_blank" rel="noopener">your papers</a>.'
    :'Tip: add a link to your papers folder in Menu \u2192 My Boat.';
  const customs='<a href="https://www.bahamascustoms.gov.bs/?p=5024" target="_blank" rel="noopener">Bahamas Customs</a>';
  const it=(id,title,hint)=>({id,title,hint});
  const common=[
    it('weather','Final weather call','Check the answer card above; go only on a green or a yellow you accept.'),
    it('net','Starlink or Wi-Fi set for offshore','Check it works before you lose the shore signal. For Starlink: Roam and Ocean Mode.'),
    it('float','Float plan texts sent','To '+esc(who)+': route, departure, ETA'+(HOME?' and the trip-home link.':', this page\'s link.'))
  ];
  let ITEMS;
  if(RT.abaco&&HOME)ITEMS=common.concat([
    it('fuel','Fuel and reserve check','Top up at Green Turtle if the reserve looks thin. '+fuelHint),
    it('whale','Whale Cay passage check','See Inside water; go inside or wait in a big northeast swell.'),
    it('papers','Registration, insurance, permit aboard',papers),
    it('start','Start trip & share with family','Button below (on the helm iPad), then Send link to family. Positions begin past Green Turtle.'),
    it('roam','Report arrival in CBP ROAM','Right after you reach Palm Beach; DTOPS decal number ready.'),
    it('ends','Trip ends by itself near home','Check the Live page says your followers can see the trip has ended.')
  ]);
  else if(RT.abaco)ITEMS=common.concat([
    it('fuel','Fuel and reserve check',fuelHint),
    it('papers','Current registration + insurance aboard',papers),
    it('start','Start trip & share with family','Button below (on the helm iPad), then Send link to family. Positions begin outside the inlet.'),
    it('c2c','Click2Clear filed and paid',customs+': Cruising Permit, Pleasure Craft, Create Inbound. 30-day permit + fishing.'),
    it('qflag','Q flag up at Green Turtle','Only the captain goes ashore until cleared.'),
    it('cleared','Cleared: permit stamped and signed','Then the courtesy flag goes up.'),
    it('whale','Whale Cay passage check','See Inside water; skip it in a big northeast swell.'),
    it('arrived','Arrived','The trip ends by itself at Green Turtle Cay. Text '+esc(who)+' you\'re in.')
  ]);
  else ITEMS=common.concat([
    it('fuel','Fuel and reserve check',fuelHint),
    it('papers','Registration and insurance aboard',papers),
    it('arrived','Arrived at '+esc(RT.dest),'Text '+esc(who)+' you\'re in.')
  ]);
  const KEY='cx:beta:goday-ticks';let t={};try{t=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(t))}catch(e){}};
  const ol=$('chkList');
  function draw(){
    ol.innerHTML='';let n=0;
    ITEMS.forEach((x,i)=>{
      const li=document.createElement('li');if(t[x.id]){li.className='done';n++;}
      const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!t[x.id];
      cb.setAttribute('aria-label',x.title);
      cb.onchange=()=>{t[x.id]=cb.checked;save();draw();};
      const sp=document.createElement('span');sp.innerHTML='<b>'+(i+1)+'. '+x.title+'</b><small>'+x.hint+'</small>';
      li.append(cb,sp);ol.append(li);
    });
    $('chkCount').textContent=n+' of '+ITEMS.length+' done';
  }
  $('chkReset').onclick=()=>{t={};save();draw();};
  // Buttons under the list: the captain's own papers (when a link is saved) and Bahamas Customs (Abaco only).
  const links=[];
  if(MY.papers)links.push('<a class="btn" href="'+esc(MY.papers)+'" target="_blank" rel="noopener">Open my papers</a>');
  if(RT.abaco)links.push('<a class="btn" href="https://www.bahamascustoms.gov.bs/?p=5024" target="_blank" rel="noopener">Bahamas Customs</a>');
  $('captainLinks').innerHTML=links.join('');
  if(!links.length)$('captainLinks').style.display='none';
  $('goday').style.display='block';draw();
})();

// Direction switch: trip over (default) or trip home (?trip=home), keeping #captain if set
(function(){
  const h=location.hash||'';
  const other=HOME?location.pathname+h:location.pathname+'?trip=home'+h;
  // Route line with a ⇄ button to flip direction (mockup: route label and flip).
  const label=!RT.abaco?esc(RT.orig)+' → '+esc(RT.dest):HOME?'Guana Cay → Palm Beach':'Palm Beach → Green Turtle';
  $('dirBar').innerHTML='<div class="rt"><small>'+(HOME?'Trip home':'Trip over')+'</small>'+label+'</div>'
    +'<a class="flip" href="'+other+'" aria-label="'+(HOME?'Switch to the trip over':'Switch to the trip home')+'">⇄ '+(HOME?'Trip over':'Trip home')+'</a>';
  if(!RT.abaco){$('depFrom').textContent='Departure options from '+RT.orig+'.';}
  else if(HOME){
    $('depFrom').textContent='Departure options from Guana Cay (via Whale Cay and Green Turtle).';
    $('trackNote').textContent='Start the trip on the helm iPad, then send the family link. Family follow the boat on their own page. Nothing is shared until you are past Green Turtle, and sharing stops when you arrive.';
  }
})();
