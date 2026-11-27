// ---------- Map ----------
let map,routeLine,radarLayer=null,radarOn=true;
function initMap(){
  map=L.map('map',{zoomControl:true,attributionControl:true});
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:15,maxNativeZoom:13,attribution:'Tiles © Esri, GEBCO, NOAA, Garmin'}).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',{maxZoom:15,maxNativeZoom:13}).addTo(map);
  L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{maxZoom:17,attribution:'© OpenSeaMap'}).addTo(map);
  routeLine=L.polyline(RT.track.map(p=>[p.lat,p.lon]),   // RT: active-route.js (row 9)
   {color:'#5cc8ff',weight:3,dashArray:'6 6'}).addTo(map);
  RT.wp.forEach((p,i)=>L.circleMarker([p.lat,p.lon],{radius:5,color:'#fff',weight:1,fillColor:p.ocean?'#f2b33d':'#5cc8ff',fillOpacity:1}).addTo(map).bindPopup(`<b>${esc(p.name)}</b><br>${Math.round(RT.cum[i])} nm from ${RT.abaco?'the inlet':'the start'}`));
  map.fitBounds(routeLine.getBounds(),{padding:[20,20]});
  $('fullBtn').onclick=()=>{const on=document.body.classList.toggle('mapfull');$('fullBtn').textContent=on?'✕ Close':'⛶ Full screen';setTimeout(()=>{map.invalidateSize();if(on)map.fitBounds(routeLine.getBounds(),{padding:[20,20]});},150);};
  $('fitBtn').onclick=()=>map.fitBounds(routeLine.getBounds(),{padding:[20,20]});
  $('radarBtn').onclick=()=>{radarOn=!radarOn;$('radarBtn').textContent=radarOn?'Radar on':'Radar off';if(radarLayer){radarOn?radarLayer.addTo(map):map.removeLayer(radarLayer);}};
  loadRadar();setInterval(loadRadar,10*60e3);
}
let radarFrames=[],radarIdx=0,radarTimer=null,radarLayers=[];
async function loadRadar(){
  try{const j=await getJSON('https://api.rainviewer.com/public/weather-maps.json');
    const frames=(j.radar&&j.radar.past||[]).slice(-6);if(!frames.length)throw 0;
    radarLayers.forEach(l=>map.removeLayer(l));
    radarLayers=frames.map(f=>L.tileLayer(`${j.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,{opacity:0,maxNativeZoom:7,maxZoom:15,attribution:'Radar © RainViewer'}));
    radarLayers.forEach(l=>l.addTo(map));radarFrames=frames;radarIdx=frames.length-1;
    clearInterval(radarTimer);
    const show=()=>{radarLayers.forEach((l,i)=>l.setOpacity(radarOn&&i===radarIdx?0.6:0));radarLayer=radarLayers[radarIdx];$('radarTime').textContent='Radar '+fmtT(new Date(radarFrames[radarIdx].time*1000))+(radarIdx===radarFrames.length-1?' (latest)':'');};
    show();radarTimer=setInterval(()=>{radarIdx=(radarIdx+1)%radarFrames.length;show();},900);
  }catch(e){$('radarTime').textContent='Radar unavailable right now';}
}

// ---------- GPX ----------
function gpx(){
  const pts=RT.track.map((p,i)=>`  <rtept lat="${p.lat}" lon="${p.lon}"><name>GNO${String(i+1).padStart(3,'0')}</name></rtept>`).join('\n');
  const wps=RT.wp.map(p=>`<wpt lat="${p.lat}" lon="${p.lon}"><name>${esc(p.name)}</name></wpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Goof n' Off Crossing" xmlns="http://www.topografix.com/GPX/1/1">\n${wps}\n<rte><name>${esc(RT.orig)} to ${esc(RT.dest)}</name>\n${pts}\n</rte>\n</gpx>\n`;
}
$('gpxBtn').onclick=()=>{const b=new Blob([gpx()],{type:'application/gpx+xml'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=RT.abaco?'PBI-to-Green-Turtle.gpx':'my-route.gpx';document.body.appendChild(a);a.click();a.remove();};

