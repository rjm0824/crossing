// ---------- Outside checks for the Plan page (MVP row 13, part 2; beta) ----------
// 1. Forecast models: three wave models from Open-Meteo (the same service as
//    the main forecast), compared for the chosen run. Model names checked
//    against the live service on Nov 26 (evening, Eastern): ecmwf_wam025, ncep_gfswave016 and
//    meteofrance_wave all cover every Abaco route point for 5 days.
// 2. US marine warnings: active alerts from the National Weather Service
//    (api.weather.gov, free, no key, open to browsers) for the US marine
//    zones the route crosses. The Bahamas side is not covered.
// Both only describe; neither changes the answer card. Nothing about the
// user is sent: the services receive the route's points (models) or zone
// names (warnings), plus what every website receives (IP address).
var MODELS = [['ecmwf_wam025', 'European'], ['ncep_gfswave016', 'US (GFS)'], ['meteofrance_wave', 'French']];
var FCM = null;      // { route: [ { idx: {hourKey: i}, h: hourly } ] } per route point
var ALERTS = null;   // { ok: true, zones: [...], list: [...] } or { ok: false }

async function loadModels() {
  var lat = RT.wp.map(function (p) { return p.lat; }).join(','), lon = RT.wp.map(function (p) { return p.lon; }).join(',');
  var u = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + lat + '&longitude=' + lon +
    '&hourly=wave_height&length_unit=imperial&forecast_days=5&cell_selection=sea&timezone=' + encodeURIComponent(TZ) +
    '&models=' + MODELS.map(function (m) { return m[0]; }).join(',');
  var d;
  try { d = await getJSON(u); }
  catch (e) { await new Promise(function (r) { setTimeout(r, 3000); }); d = await getJSON(u); }   // one retry on a weak signal
  var a = Array.isArray(d) ? d : [d];
  FCM = { route: a.map(function (p) { var idx = {}; p.hourly.time.forEach(function (t, i) { idx[t] = i; }); return { idx: idx, h: p.hourly }; }) };
}

// Each model's worst seas along the chosen run, and how far apart they are.
function modelsFor(o) {
  if (!FCM || !o || !o.rows) return null;
  var out = [];
  MODELS.forEach(function (m) {
    var worst = null;
    o.rows.forEach(function (r, i) {
      var pt = FCM.route[i]; if (!pt) return;
      var j = pt.idx[hourKey(r.t)], s = pt.h['wave_height_' + m[0]];
      var v = j == null || !s ? null : s[j];
      if (v != null && (worst == null || v > worst)) worst = v;
    });
    if (worst != null) out.push({ name: m[1], worst: worst });
  });
  if (out.length < 2) return null;
  var hi = Math.max.apply(null, out.map(function (x) { return x.worst; })), lo = Math.min.apply(null, out.map(function (x) { return x.worst; }));
  return { list: out, spread: hi - lo };
}
function renderModels(o) {
  var el = document.getElementById('models'); if (!el) return;
  var m = modelsFor(o);
  if (!m) { el.textContent = FCM ? '' : 'Forecast models: couldn\u2019t load them this time; they try again with the next forecast update.'; return; }
  el.textContent = 'Forecast models, worst seas on this run: ' + m.list.map(function (x) { return x.name + ' ' + x.worst.toFixed(1) + ' ft'; }).join(' · ') +
    (m.spread <= 1 ? ' · they agree (within 1 ft).' : ' · they differ by ' + m.spread.toFixed(1) + ' ft.');
}

// US marine zones by latitude, for route points on the US side of the Stream
// (west of 79.3°W). Inner (0 to 20 nm) and outer (20 to 60 nm) waters.
var ZONE_BANDS = [
  { s: 26.95, n: 27.85, zones: ['AMZ555', 'AMZ575'], area: 'Sebastian Inlet to Jupiter Inlet' },
  { s: 26.32, n: 26.95, zones: ['AMZ650', 'AMZ670'], area: 'Jupiter Inlet to Deerfield Beach' },
  { s: 25.10, n: 26.32, zones: ['AMZ651', 'AMZ671'], area: 'Deerfield Beach to Ocean Reef' }
];
function zonesFor(wp) {
  var bands = [];
  wp.forEach(function (p) {
    if (p.lon > -79.3) return;
    ZONE_BANDS.forEach(function (b) { if (p.lat >= b.s && p.lat < b.n && bands.indexOf(b) === -1) bands.push(b); });
  });
  return bands;
}
async function loadAlerts() {
  var bands = zonesFor(RT.wp);
  if (!bands.length) { ALERTS = { ok: true, bands: [], list: [] }; return; }
  var zones = [].concat.apply([], bands.map(function (b) { return b.zones; }));
  try {
    var r = await fetch('https://api.weather.gov/alerts/active?zone=' + zones.join(','), { headers: { Accept: 'application/geo+json' }, cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    var d = await r.json();
    var list = (d.features || []).map(function (f) {
      var p = f.properties || {};
      return { event: String(p.event || 'Marine alert'), from: Date.parse(p.onset || p.effective || '') || null,
        to: Date.parse(p.ends || p.expires || '') || null, area: String(p.areaDesc || '') };
    });
    ALERTS = { ok: true, bands: bands, list: list };
  } catch (e) { ALERTS = { ok: false, bands: bands }; }
}
// Alerts whose time overlaps the run (or that are in force now, when no run is chosen).
function renderAlerts(o) {
  var el = document.getElementById('warnings'); if (!el) return;
  el.innerHTML = ''; el.className = 'warnings';
  if (!ALERTS) return;
  var add = function (txt, cls) { var li = document.createElement('li'); li.textContent = txt; if (cls) li.className = cls; el.appendChild(li); };
  if (!ALERTS.ok) { add('Couldn’t check US marine warnings. See NWS Miami waters under Check the sources.', 'warn'); add('The Bahamas side is not covered.'); return; }
  if (!ALERTS.bands.length) { add('No US waters on this route to check for marine warnings. The Bahamas side is not covered.'); return; }
  var from = o && o.dep ? o.dep.getTime() : Date.now();
  var to = o && o.rows ? o.rows[o.rows.length - 1].t.getTime() : from;
  var hits = ALERTS.list.filter(function (a) { return (a.from == null || a.from <= to) && (a.to == null || a.to >= from); });
  var area = ALERTS.bands.map(function (b) { return b.area; }).join(' and ');
  if (!hits.length) add('✓ No US marine warnings for your run (' + area + ' waters).', 'ok');
  else {
    el.className = 'warnings has';
    var seen = {};
    hits.forEach(function (a) {
      var t = a.event + (a.to ? ' until ' + fmtDay(new Date(a.to)) + ', ' + fmtT(new Date(a.to)) : '');
      if (seen[t]) return; seen[t] = 1;
      add('⚠ ' + t + ' · ' + a.area.slice(0, 120), 'warn');
    });
  }
  add('From the US National Weather Service. The Bahamas side is not covered.');
}
