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

  return { KEY: KEY, FULL_DAYS: FULL_DAYS, OUTLOOK_DAYS: OUTLOOK_DAYS, load: load, upsert: upsert, remove: remove, get: get,
    daysOut: daysOut, addDays: addDays, stage: stage, forecastOpens: forecastOpens, upcoming: upcoming, earlier: earlier,
    next: next, route: route, fmtDate: fmtDate, planHref: planHref, today: today };
})();
