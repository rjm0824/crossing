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
  function openForm(t) {
    editing = t || {};
    var routes = readyRoutes(setup);
    var sel = $('fRoute'); sel.innerHTML = '';
    routes.forEach(function (r) { sel.appendChild(h('option', { value: r.id, text: r.name })); });
    sel.value = t ? t.route : ((setup && setup.route && setup.route.id) || 'abaco');
    if (!sel.value) sel.value = routes[0].id;
    $('fName').value = t ? t.name : '';
    $('fDate').min = MyTrips.today();
    $('fDate').value = t ? t.date : MyTrips.addDays(MyTrips.today(), 1);
    $('fFollowers').value = (t ? t.followers : setupFollowers).join(', ');
    setDir(t ? t.home : false);
    $('fDelete').hidden = !t;
    $('fTitle').textContent = t ? 'Edit trip' : 'New trip';
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

  if (location.pathname.indexOf('/beta/') !== -1) { $('previewBar').style.display = 'block'; document.title = 'BETA · ' + document.title; }
  render();
})();
