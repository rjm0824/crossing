// ---------- Saved trips (MVP row 14a; beta) ----------
// Upcoming trips the captain plans ahead, saved on this device only
// (localStorage 'cx:beta:mytrips'). Not the Live screen's running trip, which
// stays in 'cx:beta:trip'. Never sent anywhere.
//
// A trip: { id, name, route: route id (routes.js), home: true for the trip
//           home, date: 'YYYY-MM-DD' (Eastern), followers: [first names],
//           createdAt, updatedAt }
// Needs helpers.js (etDate) and, for route names, routes.js.
var MyTrips = (function () {
  'use strict';
  var KEY = 'cx:beta:mytrips', MAX = 50;
  // How far the forecast reaches (checked against Open-Meteo on Nov 26: sea
  // data about 9 days ahead). Full answer up to 3 days out, as the Plan page.
  var FULL_DAYS = 3, OUTLOOK_DAYS = 8;

  function clean(t) {
    if (!t || typeof t !== 'object') return null;
    if (typeof t.id !== 'string' || !/^[a-z0-9]{6,20}$/.test(t.id)) return null;
    if (typeof t.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return null;
    return {
      id: t.id,
      name: String(t.name || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 40),
      route: typeof t.route === 'string' ? t.route.slice(0, 30) : 'abaco',
      home: !!t.home,
      date: t.date,
      followers: Array.isArray(t.followers) ? t.followers.map(function (f) { return String(f || '').trim().slice(0, 40); }).filter(Boolean).slice(0, 12) : [],
      createdAt: +t.createdAt || Date.now(), updatedAt: +t.updatedAt || Date.now()
    };
  }
  function load() {
    var v = null;
    try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    return Array.isArray(v) ? v.map(clean).filter(Boolean) : [];
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); return true; } catch (e) { return false; }
  }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function upsert(t) {
    var list = load(), c = clean(Object.assign({}, t, { id: t.id || newId(), updatedAt: Date.now() }));
    if (!c) return null;
    var i = list.findIndex(function (x) { return x.id === c.id; });
    if (i >= 0) { c.createdAt = list[i].createdAt; list[i] = c; } else list.push(c);
    return save(list) ? c : null;
  }
  function remove(id) { return save(load().filter(function (x) { return x.id !== id; })); }
  function get(id) { return load().find(function (x) { return x.id === id; }) || null; }

  function today() { return etDate(new Date()); }
  // Whole days from today (Eastern) to a 'YYYY-MM-DD' date.
  function daysOut(date) {
    var a = today().split('-').map(Number), b = date.split('-').map(Number);
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400e3);
  }
  function addDays(date, n) {
    var b = date.split('-').map(Number), d = new Date(Date.UTC(b[0], b[1] - 1, b[2] + n));
    return d.toISOString().slice(0, 10);
  }
  // 'full' (0 to 3 days out), 'outlook' (4 to 8), 'later' (further), 'past'.
  function stage(t) {
    var n = daysOut(t.date);
    return n < 0 ? 'past' : n <= FULL_DAYS ? 'full' : n <= OUTLOOK_DAYS ? 'outlook' : 'later';
  }
  function forecastOpens(t) { return addDays(t.date, -OUTLOOK_DAYS); }
  function sorted(list) { return list.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt; }); }
  function upcoming() { return sorted(load().filter(function (t) { return daysOut(t.date) >= 0; })); }
  function earlier() { return sorted(load().filter(function (t) { return daysOut(t.date) < 0; })).reverse(); }
  function next() { return upcoming()[0] || null; }
  // The trip's route (routes.js) or Abaco when the saved route is gone.
  function route(t, setup) { return typeof routeById === 'function' ? routeById(t.route, setup) : null; }
  // "Sun, Nov 29" from 'YYYY-MM-DD'.
  function fmtDate(date) {
    var b = date.split('-').map(Number);
    return new Date(Date.UTC(b[0], b[1] - 1, b[2], 17)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' });
  }
  // Link to the Plan page for this trip (its direction, route and day).
  function planHref(t) { return 'index.html?' + (t.home ? 'trip=home&' : '') + 't=' + encodeURIComponent(t.id) + '#captain'; }

  // ---------- Past trips (row 14b) ----------
  // When a real trip ends, the Live screen still holds it ('cx:beta:trip') and
  // its trail of shared positions ('cx:beta:trail') until the next trip starts
  // or it is deleted. capture() copies a summary and a simplified track into
  // 'cx:beta:pasttrips' (device only). live.js is not changed: this runs on
  // pages that load this file, and every 30 s on the Live page. Practice runs
  // are skipped. A saved upcoming trip for the same day and direction lends
  // its name and followers, and is then cleared from Upcoming.
  var PKEY = 'cx:beta:pasttrips', PMAX = 30, TRACK_MAX = 400;
  function loadPast() {
    var v = null;
    try { v = JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch (e) {}
    return Array.isArray(v) ? v.filter(function (p) { return p && typeof p.id === 'string' && isFinite(p.startedAt); }) : [];
  }
  function savePast(list) {
    try { localStorage.setItem(PKEY, JSON.stringify(list.slice(0, PMAX))); return true; } catch (e) { return false; }
  }
  function nmBetween(a, b) {
    var R = 3440.065, rad = function (d) { return d * Math.PI / 180; };
    var dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    var x = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.pow(Math.sin(dLon / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  // Distance, average and top speed from the shared positions. A jump faster
  // than 70 kt between two positions is treated as a bad fix and skipped.
  function summarize(trail) {
    var raw = (trail || []).filter(function (p) { return p && isFinite(p.lat) && isFinite(p.lon) && isFinite(p.t); });
    var dist = 0, top = 0, pts = raw.length ? [raw[0]] : [];
    // Each position is compared with the last good one, so a bad fix is left
    // out of the distance, the speeds and the track.
    for (var i = 1; i < raw.length; i++) {
      var prev = pts[pts.length - 1];
      var d = nmBetween(prev, raw[i]), hrs = (raw[i].t - prev.t) / 3600e3;
      if (hrs <= 0) continue;
      var kt = d / hrs;
      if (kt > 70) continue;
      pts.push(raw[i]);
      dist += d;
      if (hrs >= 2 / 60 && kt > top) top = kt;
    }
    var span = pts.length > 1 ? (pts[pts.length - 1].t - pts[0].t) / 3600e3 : 0;
    var step = Math.max(1, Math.ceil(pts.length / TRACK_MAX));
    var track = pts.filter(function (p, i) { return i % step === 0 || i === pts.length - 1; })
      .map(function (p) { return [Math.round(p.lat * 1e4) / 1e4, Math.round(p.lon * 1e4) / 1e4]; });
    return { distanceNm: Math.round(dist * 10) / 10, avgKt: span > 0 ? Math.round(dist / span * 10) / 10 : null,
      topKt: top ? Math.round(top * 10) / 10 : null, track: track, positions: pts.length };
  }
  function capture() {
    var t = null, trail = null;
    try { t = JSON.parse(localStorage.getItem('cx:beta:trip') || 'null'); trail = JSON.parse(localStorage.getItem('cx:beta:trail') || 'null'); } catch (e) { return false; }
    if (!t || t.status !== 'ended' || t.practice || !isFinite(t.startedAt) || !isFinite(t.endedAt)) return false;
    var id = 'p' + Math.round(t.startedAt).toString(36);
    var past = loadPast();
    if (past.some(function (p) { return p.id === id; })) return false;
    var home = t.dir === 'home', date = etDate(new Date(t.startedAt));
    var match = load().find(function (x) { return x.date === date && x.home === home; }) || null;
    var s = summarize(trail);
    past.unshift({ id: id, startedAt: t.startedAt, endedAt: t.endedAt, endedHow: String(t.endedHow || ''), home: home,
      route: match ? match.route : 'abaco', name: match ? match.name : '', followers: match ? match.followers : [],
      durationMin: Math.round((t.endedAt - t.startedAt) / 60e3), distanceNm: s.distanceNm, avgKt: s.avgKt, topKt: s.topKt,
      positions: s.positions, track: s.track, fuelGal: null });
    if (!savePast(past)) return false;
    if (match) remove(match.id);
    return true;
  }
  function updatePast(id, fields) {
    var past = loadPast(), p = past.find(function (x) { return x.id === id; });
    if (!p) return false;
    Object.keys(fields).forEach(function (k) { p[k] = fields[k]; });
    return savePast(past);
  }
  function removePast(id) { return savePast(loadPast().filter(function (x) { return x.id !== id; })); }

  // Copy an ended trip now, and every 30 s on the Live page (it can end there).
  try { capture(); } catch (e) {}
  if (typeof document !== 'undefined' && document.body && document.body.getAttribute('data-tab') === 'live') {
    setInterval(function () { try { capture(); } catch (e) {} }, 30e3);
    document.addEventListener('visibilitychange', function () { try { capture(); } catch (e) {} });
  }

  return { KEY: KEY, FULL_DAYS: FULL_DAYS, OUTLOOK_DAYS: OUTLOOK_DAYS, load: load, upsert: upsert, remove: remove, get: get,
    daysOut: daysOut, addDays: addDays, stage: stage, forecastOpens: forecastOpens, upcoming: upcoming, earlier: earlier,
    next: next, route: route, fmtDate: fmtDate, planHref: planHref, today: today,
    PKEY: PKEY, loadPast: loadPast, capture: capture, summarize: summarize, updatePast: updatePast, removePast: removePast };
})();
