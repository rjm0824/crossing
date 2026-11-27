// ---------- My Trips page (MVP row 14a; beta) ----------
// Upcoming trips: add, edit, delete, and what the forecast says about each.
// Past trips with their track come in row 14b.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var setup = null;
  try { setup = JSON.parse(localStorage.getItem('cx:beta:setup') || 'null'); } catch (e) {}
  var setupFollowers = (setup && Array.isArray(setup.followers) ? setup.followers : []).map(function (f) { return String((f && f.name) || '').trim(); }).filter(Boolean);
  var h = function (tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'onclick') el.onclick = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  };

  // "Palm Beach → Green Turtle" or "Guana Cay → Palm Beach" for a route and direction.
  function dirLabel(r, home) {
    var pts = r.points || [];
    if (!pts.length) return r.name;
    if (r.id === 'abaco') return home ? 'Guana Cay → Palm Beach' : 'Palm Beach → Green Turtle';
    var a = pts[0].name, b = pts[pts.length - 1].name;
    return home ? b + ' → ' + a : a + ' → ' + b;
  }
  function tripPoints(r, home) { return (r.points || []).concat(home && r.home ? r.home.points : []); }

  // ---------- The form ----------
  var editing = null;   // trip being edited, or {} for a new one
  function openForm(t, copyFrom) {
    editing = t || {};
    var routes = readyRoutes(setup);
    var sel = $('fRoute'); sel.innerHTML = '';
    routes.forEach(function (r) { sel.appendChild(h('option', { value: r.id, text: r.name })); });
    sel.value = t ? t.route : ((setup && setup.route && setup.route.id) || 'abaco');
    if (!sel.value) sel.value = routes[0].id;
    $('fName').value = t ? t.name : '';
    $('fDate').min = MyTrips.today();
    $('fDate').value = t ? t.date : MyTrips.addDays(MyTrips.today(), 1);
    $('fFollowers').value = (t ? t.followers : copyFrom && copyFrom.followers.length ? copyFrom.followers : setupFollowers).join(', ');
    setDir(t ? t.home : copyFrom ? copyFrom.home : false);
    // Duplicate as new (row 14b): same route, direction, name and followers; pick a new date.
    if (copyFrom) {
      sel.value = routeById(copyFrom.route, setup).id; setDir(copyFrom.home);
      $('fName').value = copyFrom.name || ''; $('fDate').value = '';
    }
    $('fDelete').hidden = !t;
    $('fTitle').textContent = t ? 'Edit trip' : copyFrom ? 'Duplicate as new: pick a date' : 'New trip';
    result('');
    $('tripForm').hidden = false; $('newBtn').hidden = true;
    $('tripForm').scrollIntoView({ block: 'start' });
  }
  function closeForm() { editing = null; $('tripForm').hidden = true; $('newBtn').hidden = false; }
  var dirHome = false;
  function setDir(home) {
    dirHome = !!home;
    var r = routeById($('fRoute').value, setup);
    $('fOver').setAttribute('aria-pressed', dirHome ? 'false' : 'true'); $('fOver').className = dirHome ? '' : 'on';
    $('fHome').setAttribute('aria-pressed', dirHome ? 'true' : 'false'); $('fHome').className = dirHome ? 'on' : '';
    $('fOver').textContent = 'Trip over · ' + dirLabel(r, false);
    $('fHome').textContent = 'Trip home · ' + dirLabel(r, true);
  }
  function result(s, kind) { var el = $('fResult'); el.textContent = s; el.className = 'result' + (kind ? ' ' + kind : ''); }
  $('fOver').onclick = function () { setDir(false); };
  $('fHome').onclick = function () { setDir(true); };
  $('fRoute').onchange = function () { setDir(dirHome); };
  $('newBtn').onclick = function () { openForm(null); };
  $('fCancel').onclick = closeForm;
  $('fDelete').onclick = function () {
    if (!editing || !editing.id) return;
    if (!$('fDelete').dataset.sure) { $('fDelete').dataset.sure = '1'; $('fDelete').textContent = 'Tap again to delete'; return; }
    MyTrips.remove(editing.id); delete $('fDelete').dataset.sure; $('fDelete').textContent = 'Delete trip';
    closeForm(); render();
  };
  $('tripForm').onsubmit = function (e) {
    e.preventDefault();
    var date = $('fDate').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { result('Pick a date.', 'wait'); $('fDate').focus(); return; }
    if (MyTrips.daysOut(date) < 0) { result('Pick today or a later date.', 'wait'); $('fDate').focus(); return; }
    var saved = MyTrips.upsert({ id: editing && editing.id, name: $('fName').value, route: $('fRoute').value, home: dirHome, date: date,
      followers: $('fFollowers').value.split(',') });
    if (!saved) { result('Couldn’t save on this device. Check that private browsing is off.', 'wait'); return; }
    closeForm(); render();
  };

  // ---------- The lists ----------
  function card(t, past) {
    var r = MyTrips.route(t, setup), st = MyTrips.stage(t), n = MyTrips.daysOut(t.date);
    var when = MyTrips.fmtDate(t.date) + (n === 0 ? ' · today' : n === 1 ? ' · tomorrow' : n > 1 ? ' · in ' + n + ' days' : '');
    var status = h('div', { class: 'tstatus', id: 'st_' + t.id });
    if (st === 'later') status.textContent = 'Forecast opens ' + MyTrips.fmtDate(MyTrips.forecastOpens(t)) + '.';
    else if (st === 'past') status.textContent = 'This date has passed.';
    else status.textContent = 'Loading the forecast…';
    var buttons = [];
    if (st === 'full') buttons.push(h('a', { class: 'btn primary', href: MyTrips.planHref(t), text: 'Plan this trip' }));
    if (!past) buttons.push(h('button', { type: 'button', class: 'btn', text: 'Add to calendar', onclick: function () { addToCalendar(t, r); } }));
    buttons.push(h('button', { type: 'button', class: 'btn', text: past ? 'Delete' : 'Edit', onclick: function () {
      if (!past) { openForm(t); return; }
      MyTrips.remove(t.id); render();
    } }));
    return h('section', { class: 'card trip' + (past ? ' past' : '') }, [
      h('div', { class: 'thead' }, [h('b', { text: t.name || dirLabel(r, t.home) }), h('span', { class: 'tdir', text: (t.home ? 'Trip home' : 'Trip over') })]),
      h('div', { class: 'twhen', text: when }),
      t.name ? h('div', { class: 'troute', text: dirLabel(r, t.home) }) : null,
      t.followers.length ? h('div', { class: 'troute', text: 'Followers: ' + t.followers.join(', ') }) : null,
      status,
      h('div', { class: 'track', style: 'margin-top:10px' }, buttons)
    ]);
  }
  function render() {
    var up = MyTrips.upcoming(), old = MyTrips.earlier();
    var box = $('upcoming'); box.innerHTML = '';
    if (!up.length) box.appendChild(h('p', { class: 'note', text: 'No trips planned yet. Tap + New trip to save one, weeks ahead if you like. Each trip wakes up as the forecast reaches its date.' }));
    up.forEach(function (t) { box.appendChild(card(t, false)); });
    var ob = $('earlier'); ob.innerHTML = '';
    $('earlierHead').hidden = !old.length;
    old.forEach(function (t) { ob.appendChild(card(t, true)); });
    loadOutlooks(up.filter(function (t) { var s = MyTrips.stage(t); return s === 'full' || s === 'outlook'; }));
    renderPast();
  }

  // ---------- What the forecast says (ranges only; no advice) ----------
  // For each trip inside the forecast: the range of seas and wind along its
  // route from 6 AM to 3 PM on its date. Up to 3 days out the Plan page has
  // the full answer; 4 to 8 days out it is an early outlook.
  var cache = {};
  async function fetchRoute(r, home) {
    var key = r.id + (home ? ':home' : ':over');
    if (cache[key]) return cache[key];
    var pts = tripPoints(r, home);
    var lat = pts.map(function (p) { return p.lat; }).join(','), lon = pts.map(function (p) { return p.lon; }).join(',');
    var base = '&forecast_days=10&timezone=' + encodeURIComponent(TZ);
    cache[key] = Promise.all([
      getJSON('https://marine-api.open-meteo.com/v1/marine?latitude=' + lat + '&longitude=' + lon + '&hourly=wave_height&length_unit=imperial&cell_selection=sea' + base),
      getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&hourly=wind_speed_10m,wind_gusts_10m&wind_speed_unit=kn' + base)
    ]).then(function (a) { return { m: [].concat(a[0]), w: [].concat(a[1]) }; });
    cache[key].catch(function () { delete cache[key]; });
    return cache[key];
  }
  function rangeOn(series, date, k) {
    var vals = [];
    series.forEach(function (p) {
      p.hourly.time.forEach(function (tm, i) {
        var hr = +tm.slice(11, 13);
        if (tm.slice(0, 10) === date && hr >= 6 && hr <= 15 && p.hourly[k] && p.hourly[k][i] != null) vals.push(p.hourly[k][i]);
      });
    });
    if (!vals.length) return null;
    return [Math.min.apply(null, vals), Math.max.apply(null, vals)];
  }
  function loadOutlooks(trips) {
    trips.forEach(function (t) {
      var r = MyTrips.route(t, setup), el = $('st_' + t.id);
      fetchRoute(r, t.home).then(function (d) {
        if (!el.isConnected) return;
        var sea = rangeOn(d.m, t.date, 'wave_height'), wind = rangeOn(d.w, t.date, 'wind_speed_10m'), gust = rangeOn(d.w, t.date, 'wind_gusts_10m');
        if (!sea && !wind) { el.textContent = 'The forecast doesn’t reach this date yet. Forecast opens ' + MyTrips.fmtDate(MyTrips.forecastOpens(t)) + '.'; return; }
        var fmt = function (x, u) { var a = Math.round(x[0]), b = Math.round(x[1]); return a === b ? 'about ' + b + ' ' + u : a + ' to ' + b + ' ' + u; };
        var line = (sea ? 'Seas ' + fmt(sea, 'ft') : '') + (sea && wind ? ' · ' : '') + (wind ? 'wind ' + fmt(wind, 'kt') : '') +
          (gust && wind && gust[1] >= wind[1] + 5 ? ', gusts to ' + Math.round(gust[1]) : '') + ' along the route, 6 AM to 3 PM.';
        el.innerHTML = '';
        var full = MyTrips.stage(t) === 'full';
        el.appendChild(h('b', { class: full ? 'tready' : 'toutlook', text: full ? 'Forecast ready.' : 'Early outlook. Could still change.' }));
        el.appendChild(document.createTextNode(' ' + line + (full ? ' Plan this trip for the GO / NO-GO answer and departure times.' : '')));
      }).catch(function () { if (el.isConnected) el.textContent = 'Couldn’t load the forecast. Check your signal and open this page again.'; });
    });
  }

  // ---------- Add to calendar (row 14b) ----------
  // An all-day entry on the trip's date with a reminder at 6 PM the evening
  // before. Uses calendar.js (the same file maker as the Live screen's Remind me).
  function addToCalendar(t, r) {
    var C = typeof CalendarFile !== 'undefined' ? CalendarFile : null;
    if (!C) return;
    var d = t.date.replace(/-/g, ''), d2 = MyTrips.addDays(t.date, 1).replace(/-/g, '');
    var title = 'Crossing: ' + (t.name || ((t.home ? 'Trip home' : 'Trip over') + ', ' + dirLabel(r, t.home)));
    var link = location.origin + location.pathname.replace(/[^/]*$/, '') + MyTrips.planHref(t);
    var note = 'Check the forecast and plan the departure. Planning aid, not for navigation.\n' + link;
    var text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Crossing beta//My Trips//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:crossing-mytrip-' + t.id + '@rjm0824.github.io', 'DTSTAMP:' + C.utc(new Date()),
      'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + d2, 'SUMMARY:' + C.esc(title), 'DESCRIPTION:' + C.esc(note), 'URL:' + link,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + C.esc(title), 'TRIGGER:-PT6H', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].map(C.fold).join('\r\n') + '\r\n';
    C.openCalendarFile(text);
  }

  // ---------- Past trips (row 14b) ----------
  function dur(min) { var hh = Math.floor(min / 60), mm = min % 60; return (hh ? hh + ' h ' : '') + mm + ' min'; }
  var HOW = { arrived: 'Ended by itself on arrival', home: 'Ended by itself at the home port', stopped: 'You stopped sharing' };
  function renderPast() {
    var list = MyTrips.loadPast(), box = $('past'); box.innerHTML = '';
    $('pastHead').hidden = !list.length;
    list.forEach(function (p) {
      var r = routeById(p.route, setup);
      var when = new Date(p.startedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ });
      var stats = p.positions > 1
        ? dur(p.durationMin) + ' \u00b7 ' + p.distanceNm + ' nm shared' + (p.avgKt ? ' \u00b7 average ' + p.avgKt + ' kt' : '') + (p.topKt ? ' \u00b7 top ' + p.topKt + ' kt' : '')
        : dur(p.durationMin) + ' \u00b7 no positions were shared on this trip';
      var fuelIn = h('input', { type: 'text', inputmode: 'decimal', maxlength: '5', placeholder: 'gal', 'aria-label': 'Fuel used, gallons', class: 'fuelin', value: p.fuelGal == null ? '' : String(p.fuelGal) });
      var fuelMsg = h('span', { class: 'note', style: 'margin:0' });
      var showFuel = function () {
        fuelMsg.textContent = p.fuelGal == null ? 'Optional. From your gauge or the fuel dock.'
          : 'Saved. About ' + Math.round(p.fuelGal / Math.max(p.durationMin / 60, 0.1)) + ' gal an hour over the whole trip.';
      };
      showFuel();
      var mapBox = h('div', { class: 'pmap', hidden: true });
      var del = h('button', { type: 'button', class: 'btn', text: 'Delete' });
      del.onclick = function () {
        if (!del.dataset.sure) { del.dataset.sure = '1'; del.textContent = 'Tap again to delete'; return; }
        MyTrips.removePast(p.id); renderPast();
      };
      var card = h('section', { class: 'card trip pasttrip' }, [
        h('div', { class: 'thead' }, [h('b', { text: p.name || dirLabel(r, p.home) }), h('span', { class: 'tdir', text: p.home ? 'Trip home' : 'Trip over' })]),
        h('div', { class: 'twhen', text: when }),
        p.name ? h('div', { class: 'troute', text: dirLabel(r, p.home) }) : null,
        h('div', { class: 'tstatus', text: stats }),
        h('div', { class: 'troute', text: (HOW[p.endedHow] || 'Ended') + '.' }),
        h('label', { class: 'fuelrow' }, [h('span', { text: 'Fuel used' }), fuelIn,
          h('button', { type: 'button', class: 'btn', text: 'Save', onclick: function () {
            var v = fuelIn.value.trim(), n = v === '' ? null : Number(v);
            if (n != null && !(isFinite(n) && n > 0 && n <= 5000)) { fuelMsg.textContent = 'Enter gallons, for example 160.'; return; }
            p.fuelGal = n == null ? null : Math.round(n * 10) / 10;
            MyTrips.updatePast(p.id, { fuelGal: p.fuelGal }); showFuel();
          } })]),
        fuelMsg,
        mapBox,
        h('div', { class: 'track', style: 'margin-top:10px' }, [
          p.track && p.track.length > 1 ? h('button', { type: 'button', class: 'btn', text: 'View track', onclick: function (e) { toggleMap(p, mapBox, e.currentTarget); } }) : null,
          h('button', { type: 'button', class: 'btn', text: 'Duplicate as new', onclick: function () { openForm(null, p); } }),
          del
        ])
      ]);
      box.appendChild(card);
    });
  }
  function toggleMap(p, box, btn) {
    if (!box.hidden) { box.hidden = true; btn.textContent = 'View track'; return; }
    box.hidden = false; btn.textContent = 'Hide track';
    if (box._map || typeof L === 'undefined') { if (box._map) box._map.invalidateSize(); else box.textContent = 'The map needs a signal to load.'; return; }
    var map = L.map(box, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 15, maxNativeZoom: 13, attribution: 'Tiles \u00a9 Esri, GEBCO' }).addTo(map);
    var line = L.polyline(p.track, { color: '#5cc8ff', weight: 3 }).addTo(map);
    L.circleMarker(p.track[0], { radius: 6, color: '#fff', weight: 2, fillColor: '#2fbf71', fillOpacity: 1 }).addTo(map).bindTooltip('First shared position');
    L.circleMarker(p.track[p.track.length - 1], { radius: 6, color: '#fff', weight: 2, fillColor: '#f2b33d', fillOpacity: 1 }).addTo(map).bindTooltip('Last position');
    map.fitBounds(line.getBounds(), { padding: [16, 16] });
    box._map = map;
  }

  if (location.pathname.indexOf('/beta/') !== -1) { $('previewBar').style.display = 'block'; document.title = 'BETA · ' + document.title; }
  render();
})();
