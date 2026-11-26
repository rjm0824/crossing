// ---------- Trip map (Live and family pages) ----------
// map.js stays with the Plan page; this one needs nothing from it.
// makeTripMap(element, { line, points }) draws the chart layers, the route
// (line, or straight lines between points) and the named points, and returns
// { setBoat(pos, headingDeg, greyed), setTrail(list), clearBoat(), recenter(), fitRoute(), map }.
// Uses TripMath for distances.
function tripHeading(a, b) {
  var r = function (d) { return d * Math.PI / 180; };
  var y = Math.sin(r(b.lon - a.lon)) * Math.cos(r(b.lat));
  var x = Math.cos(r(a.lat)) * Math.sin(r(b.lat)) - Math.sin(r(a.lat)) * Math.cos(r(b.lat)) * Math.cos(r(b.lon - a.lon));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function makeTripMap(element, opts) {
  'use strict';
  var FOLLOW_MAX_NM = 40;       // recenter zooms in to about 40 nm across
  var map = L.map(element, { zoomControl: true, attributionControl: true });
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 15, maxNativeZoom: 13, attribution: 'Tiles © Esri, GEBCO, NOAA, Garmin' }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 15, maxNativeZoom: 13 }).addTo(map);
  L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenSeaMap' }).addTo(map);

  var points = opts.points || [];
  var lineSrc = opts.line && opts.line.length ? opts.line : points;
  var route = L.polyline(lineSrc.map(function (p) { return [p.lat, p.lon]; }), { color: '#5cc8ff', weight: 3, dashArray: '6 6' }).addTo(map);
  points.forEach(function (p) {
    var label = document.createElement('b');
    label.textContent = p.name;          // names from the tracker are text, never page code
    L.circleMarker([p.lat, p.lon], { radius: 5, color: '#fff', weight: 1, fillColor: '#5cc8ff', fillOpacity: 1 }).addTo(map).bindPopup(label);
  });

  var boat = null, boatPos = null, trail = null;
  var follow = true, quiet = 0;           // quiet > 0 while the page itself moves the map

  function moveMap(fn) { quiet++; fn(); setTimeout(function () { quiet = Math.max(0, quiet - 1); }, 400); }
  function fitRoute() { if (route.getLatLngs().length) moveMap(function () { map.fitBounds(route.getBounds(), { padding: [20, 20] }); }); }

  // Recenter: a third square button under + and −.
  var btn;
  var Recenter = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
      var box = L.DomUtil.create('div', 'leaflet-bar leaflet-control tm-recenter');
      btn = L.DomUtil.create('a', '', box);
      btn.href = '#';
      btn.setAttribute('role', 'button');
      btn.setAttribute('aria-label', 'Recenter');
      btn.title = 'Recenter';
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle class="tm-dot" cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      L.DomEvent.disableClickPropagation(box);
      L.DomEvent.on(btn, 'click', function (e) { L.DomEvent.preventDefault(e); recenter(); });
      return box;
    }
  });
  map.addControl(new Recenter());
  function showFollow() { if (btn) btn.classList.toggle('on', follow && !!boatPos); }

  // Someone drags or zooms the map: stop following until Recenter is tapped.
  map.on('dragstart', function () { follow = false; showFollow(); });
  map.on('zoomstart', function () { if (!quiet) { follow = false; showFollow(); } });

  function widthNm() {
    var b = map.getBounds(), c = b.getCenter();
    return TripMath.distNm({ lat: c.lat, lon: b.getWest() }, { lat: c.lat, lon: b.getEast() });
  }
  function centreOnBoat(zoomIn) {
    if (!boatPos) return;
    moveMap(function () {
      if (zoomIn && widthNm() > FOLLOW_MAX_NM) {
        var d = FOLLOW_MAX_NM / 2 / 60, k = Math.cos(boatPos.lat * Math.PI / 180) || 1;
        var box = L.latLngBounds([boatPos.lat - d, boatPos.lon - d / k], [boatPos.lat + d, boatPos.lon + d / k]);
        map.setView([boatPos.lat, boatPos.lon], map.getBoundsZoom(box), { animate: false });
      } else {
        map.panTo([boatPos.lat, boatPos.lon], { animate: false });
      }
    });
  }
  function recenter() {
    if (boatPos) { follow = true; centreOnBoat(true); }
    else fitRoute();
    showFollow();
  }

  function setBoat(pos, headingDeg, greyed) {
    var first = !boatPos;
    boatPos = { lat: pos.lat, lon: pos.lon };
    var svg = '<svg class="boat-ico' + (greyed ? ' grey' : '') + '" viewBox="0 0 34 34" style="transform:rotate(' + Math.round(headingDeg || 0) + 'deg)"><path d="M17 2 C22 8 24 14 24 22 L24 30 Q17 33 10 30 L10 22 C10 14 12 8 17 2 Z" fill="#ffffff" stroke="#0b1d2c" stroke-width="1.5"/><rect x="13" y="15" width="8" height="7" rx="1.5" fill="#5cc8ff" stroke="#0b1d2c" stroke-width="1"/><path d="M17 4 L17 11" stroke="#2fbf71" stroke-width="2" stroke-linecap="round"/></svg>';
    var icon = L.divIcon({ className: '', html: svg, iconSize: [34, 34], iconAnchor: [17, 17] });
    if (!boat) boat = L.marker([pos.lat, pos.lon], { icon: icon, zIndexOffset: 1000, keyboard: false }).addTo(map);
    else { boat.setIcon(icon); boat.setLatLng([pos.lat, pos.lon]); }
    if (follow) centreOnBoat(first);
    showFollow();
  }
  function clearBoat() {
    if (boat) { map.removeLayer(boat); boat = null; }
    if (trail) { map.removeLayer(trail); trail = null; }
    boatPos = null; showFollow();
  }
  function setTrail(list) {
    var ll = (list || []).map(function (p) { return [p.lat, p.lon]; });
    if (trail) trail.setLatLngs(ll);
    else trail = L.polyline(ll, { color: '#2fbf71', weight: 3 }).addTo(map);
  }

  fitRoute();
  showFollow();
  return {
    map: map, setBoat: setBoat, setTrail: setTrail, clearBoat: clearBoat,
    recenter: recenter, fitRoute: fitRoute,
    following: function () { return follow; },
    invalidate: function () { map.invalidateSize(); }
  };
}
