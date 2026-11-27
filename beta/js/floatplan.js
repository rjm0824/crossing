// ---------- Float plan page (MVP row 13, part 1; beta) ----------
// A print-ready summary of the planned trip that the phone can save as a PDF
// (Share > Print > Save to Files). Built from the saved setup (mysetup.js),
// the active route (active-route.js) and what the Plan page passes in the
// link: ?dep=<ms>&arr=<ms>&fuel=<lo>-<hi>[&trip=home]. Nothing is sent
// anywhere. The captain's name, people aboard and notes typed here are saved
// on this device only (cx:beta:floatplan).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'cx:beta:floatplan';
  var q = new URLSearchParams(location.search);
  var num = function (k, lo, hi) { var v = Number(q.get(k)); return isFinite(v) && v >= lo && v <= hi ? v : null; };
  var now = Date.now();
  var dep = num('dep', now - 7 * 86400e3, now + 14 * 86400e3);
  var arr = num('arr', now - 7 * 86400e3, now + 15 * 86400e3);
  if (dep && arr && arr <= dep) arr = null;
  var fuel = /^\d{1,4}-\d{1,4}$/.test(q.get('fuel') || '') ? q.get('fuel').split('-').map(Number) : null;

  var s = null;
  try { s = JSON.parse(localStorage.getItem('cx:beta:setup') || 'null'); } catch (e) {}
  var b = (s && s.boat) || {};
  var str = function (v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : (typeof v === 'number' && isFinite(v) ? String(v) : ''); };
  var prefs = null;
  try { prefs = JSON.parse(localStorage.getItem('cx:beta:prefs') || 'null'); } catch (e) {}
  var overdueMin = prefs && [30, 60, 80, 120].indexOf(prefs.overdueMin) !== -1 ? prefs.overdueMin : 80;

  function fmtWhen(ms) { return new Date(ms).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ, timeZoneName: 'short' }); }
  function row(label, value) {
    var d = document.createElement('div');
    var l = document.createElement('dt'); l.textContent = label;
    var v = document.createElement('dd'); v.textContent = value || '–';
    d.append(l, v); return d;
  }
  function blank(label) { return row(label, '______________________'); }

  // Boat
  var boat = $('fpBoat');
  boat.append(
    row('Boat name', MY.boatName),
    row('Type', str(b.type, 40) || str(b.make, 60)),
    row('Length', b.length ? str(b.length, 6) + ' ft' : ''),
    row('Hull colour', str(b.colour, 30)),
    row('Engines', str(b.engines, 60)),
    row('Home marina', str(b.marina, 60)),
    row('Cruise speed', MY.cruiseKt + ' kt'),
    row('Fuel tank', MY.tankGal + ' gal')
  );

  // Trip
  $('fpDir').textContent = (HOME ? 'Trip home' : 'Trip over') + (TRIP_PLAN && TRIP_PLAN.name ? ' (' + TRIP_PLAN.name + ')' : '') + ': ' + RT.orig + ' → ' + RT.dest;
  var trip = $('fpTrip');
  trip.append(
    row('Route', RT.name + (HOME ? ' (reversed for the trip home)' : '') + ', about ' + Math.round(RT.totalNm) + ' nm'),
    dep ? row('Planned departure', fmtWhen(dep)) : blank('Planned departure'),
    arr ? row('Planned arrival (forecast)', fmtWhen(arr)) : blank('Planned arrival'),
    arr ? row('Overdue after', fmtWhen(arr + overdueMin * 60e3) + ' (' + overdueMin + ' min after arrival)') : blank('Overdue after'),
    fuel ? row('Fuel for this run', fuel[0] + ' to ' + fuel[1] + ' gal of ' + MY.tankGal + ' (estimate)') : row('Fuel tank', MY.tankGal + ' gal')
  );
  var ol = $('fpPoints');
  RT.wp.forEach(function (p, i) {
    var li = document.createElement('li');
    li.textContent = p.name + ' · ' + Math.round(RT.cum[i]) + ' nm · ' + Math.abs(p.lat).toFixed(3) + '°' + (p.lat >= 0 ? 'N' : 'S') + ' ' + Math.abs(p.lon).toFixed(3) + '°' + (p.lon >= 0 ? 'E' : 'W') + (p.ocean ? ' · Gulf Stream' : '');
    ol.appendChild(li);
  });

  // Followers (first names only; phone numbers stay off the page)
  $('fpWho').textContent = MY.followers.length ? MY.followers.join(', ') : 'None saved yet (add them in Menu → Setup).';

  // Typed on this page, saved on this device only
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
  [['fpCaptain', 'captain', 60], ['fpAboard', 'aboard', 600], ['fpNotes', 'notes', 1000]].forEach(function (f) {
    var el = $(f[0]), out = $(f[0] + 'Print');
    el.maxLength = f[2];
    el.value = typeof saved[f[1]] === 'string' ? saved[f[1]].slice(0, f[2]) : '';
    var sync = function () { out.textContent = el.value.trim() || '______________________'; };
    sync();
    el.addEventListener('input', function () {
      saved[f[1]] = el.value.slice(0, f[2]); sync();
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
    });
  });

  $('fpMade').textContent = 'Made ' + new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ });
  document.title = 'Float plan · ' + MY.boatName;
  if (location.pathname.indexOf('/beta/') !== -1) { $('previewBar').style.display = 'block'; document.title = 'BETA · ' + document.title; }
  $('fpBack').href = 'index.html' + (HOME ? '?trip=home' : '') + '#captain';
  $('fpPrint').onclick = function () { window.print(); };
})();
