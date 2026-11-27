// ---------- Share my setup and Back up my setup (MVP row 15; beta) ----------
// Both are links to this page with the data after the # (never sent to a
// server; the part after # stays on the phone). #s= is a friend's setup,
// #b= is the captain's own backup. Opening one shows every value for review;
// nothing is saved until "Use these". Every value is checked and anything out
// of range is dropped and listed.
//   Share: boat type, length, engines, speed, tank, burn, limits, route.
//   Backup: the above plus boat name, My Boat details, papers link,
//           followers' first names (no phone numbers), settings and upcoming
//           trips. Never: invite code, trip keys, photo, home port, past trips.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var S = window.CXSetup;
  var VERSION = 1;

  // ---------- link encoding: JSON, UTF-8, base64url ----------
  function encode(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj)), bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(str) {
    var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  // ---------- checking every value ----------
  var txt = function (v, max) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max) : ''; };
  var num = function (v, lo, hi) { return typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? v : null; };
  var ROUTE_IDS = ['abaco', 'ftl-bimini', 'mia-bimini', 'mine'];
  function check(p) {
    var out = {}, dropped = [];
    var keep = function (obj, key, val, label) { if (val === null || val === '') { dropped.push(label); return; } obj[key] = val; };
    var b = p.boat || {};
    out.boat = {};
    if (b.type != null) keep(out.boat, 'type', txt(b.type, 40), 'Type of boat');
    if (b.length != null) { var len = num(Number(b.length), 10, 200); keep(out.boat, 'length', len == null ? null : String(Math.round(len)), 'Length'); }
    if (b.engines != null) keep(out.boat, 'engines', txt(b.engines, 60), 'Engines');
    if (b.cruiseKt != null) keep(out.boat, 'cruiseKt', num(b.cruiseKt, 5, 60), 'Cruise speed');
    if (b.tankGal != null) keep(out.boat, 'tankGal', num(b.tankGal, 10, 2000), 'Fuel tank');
    if (b.burnGph != null) keep(out.boat, 'burnGph', num(b.burnGph, 1, 200), 'Fuel burn');
    if (out.boat.burnGph != null) out.boat.burnEstimate = !!b.burnEstimate;
    if (p.k === 'b') {
      if (b.name != null) keep(out.boat, 'name', txt(b.name, 40), 'Boat name');
      if (b.make != null) keep(out.boat, 'make', txt(b.make, 60), 'Make and model');
      if (b.colour != null) keep(out.boat, 'colour', txt(b.colour, 30), 'Hull colour');
      if (b.marina != null) keep(out.boat, 'marina', txt(b.marina, 60), 'Home marina');
      if (b.papers != null) keep(out.boat, 'papers', typeof b.papers === 'string' && /^https:\/\/[^\s"'<>]+$/.test(b.papers) && b.papers.length <= 500 ? b.papers : null, 'Papers link');
    }
    var L = p.limits;
    if (L) {
      var lim = { preset: ['cautious', 'standard', 'experienced', 'custom'].indexOf(L.preset) !== -1 ? L.preset : 'custom',
        seasFt: num(L.seasFt, 1, 8), windKt: num(L.windKt, 5, 30), noNorthInStream: L.noNorthInStream !== false };
      if (lim.seasFt == null || lim.windKt == null) dropped.push('Limits'); else out.limits = lim;
    }
    if (p.route && ROUTE_IDS.indexOf(p.route.id) !== -1) out.route = { id: p.route.id };
    else if (p.route) dropped.push('Route');
    if (p.myRoute && Array.isArray(p.myRoute.points)) {
      var pts = p.myRoute.points.slice(0, 12).map(function (q) {
        var lat = num(q.lat, -90, 90), lon = num(q.lon, -180, 180), name = txt(q.name, 40);
        return lat == null || lon == null ? null : { name: name || 'Point', lat: lat, lon: lon, stream: !!q.stream };
      });
      if (pts.length >= 2 && pts.every(Boolean)) out.myRoute = { name: txt(p.myRoute.name, 40) || 'My route', points: pts };
      else dropped.push('Your own route points');
    }
    if (out.route && out.route.id === 'mine' && !out.myRoute) { delete out.route; dropped.push('Route'); }
    if (p.k === 'b') {
      if (Array.isArray(p.followers)) out.followers = p.followers.map(function (n) { return txt(n, 40); }).filter(Boolean).slice(0, 12);
      if (p.prefs) {
        var pr = {}, iv = [1, 5, 10, 30], od = [30, 60, 80, 120];
        if (iv.indexOf(p.prefs.intervalMin) !== -1) pr.intervalMin = p.prefs.intervalMin;
        if (od.indexOf(p.prefs.overdueMin) !== -1) pr.overdueMin = p.prefs.overdueMin;
        if (typeof p.prefs.keepAwake === 'boolean') pr.keepAwake = p.prefs.keepAwake;
        out.prefs = pr;
      }
      if (Array.isArray(p.trips)) {
        out.trips = p.trips.slice(0, 50).map(function (t) {
          if (!t || !/^[a-z0-9]{6,20}$/.test(t.id || '') || !/^\d{4}-\d{2}-\d{2}$/.test(t.date || '') || ROUTE_IDS.indexOf(t.route) === -1) return null;
          return { id: t.id, name: txt(t.name, 40), route: t.route, home: !!t.home, date: t.date,
            followers: Array.isArray(t.followers) ? t.followers.map(function (n) { return txt(n, 40); }).filter(Boolean).slice(0, 12) : [] };
        });
        if (out.trips.some(function (t) { return !t; })) dropped.push('Some trips');
        out.trips = out.trips.filter(Boolean);
      }
    }
    return { data: out, dropped: dropped };
  }

  // ---------- making the links ----------
  function current() {
    var s = S.load() || {}, b = s.boat || {};
    var pick = function (o, keys) { var r = {}; keys.forEach(function (k) { if (o[k] != null && o[k] !== '') r[k] = o[k]; }); return r; };
    var share = { v: VERSION, k: 's', boat: pick(b, ['type', 'length', 'engines', 'cruiseKt', 'tankGal', 'burnGph', 'burnEstimate']) };
    if (s.limits) share.limits = pick(s.limits, ['preset', 'seasFt', 'windKt', 'noNorthInStream']);
    if (s.route && s.route.id) share.route = { id: s.route.id };
    if (s.myRoute && s.route && s.route.id === 'mine') share.myRoute = s.myRoute;
    var backup = JSON.parse(JSON.stringify(share));
    backup.k = 'b';
    Object.assign(backup.boat, pick(b, ['name', 'make', 'colour', 'marina', 'papers']));
    if (s.myRoute) backup.myRoute = s.myRoute;
    backup.followers = (Array.isArray(s.followers) ? s.followers : []).map(function (f) { return String((f && f.name) || '').trim(); }).filter(Boolean);
    try { var pr = JSON.parse(localStorage.getItem('cx:beta:prefs') || 'null'); if (pr) backup.prefs = pick(pr, ['intervalMin', 'overdueMin', 'keepAwake']); } catch (e) {}
    backup.trips = MyTrips.upcoming().map(function (t) { return { id: t.id, name: t.name, route: t.route, home: t.home, date: t.date, followers: t.followers }; });
    return { s: s, share: share, backup: backup };
  }
  function base() { return location.origin + location.pathname; }

  // ---------- review list ----------
  function rows(d, kind) {
    var b = d.boat || {}, out = [];
    var add = function (label, v) { if (v != null && v !== '') out.push([label, String(v)]); };
    if (kind === 'b') add('Boat name', b.name);
    add('Type of boat', b.type); add('Length', b.length ? b.length + ' ft' : '');
    add('Engines', b.engines); add('Cruise speed', b.cruiseKt != null ? b.cruiseKt + ' kt' : '');
    add('Fuel tank', b.tankGal != null ? b.tankGal + ' gal' : '');
    add('Fuel burn', b.burnGph != null ? b.burnGph + ' gal an hour' + (b.burnEstimate ? ' (estimate)' : '') : '');
    if (d.limits) add('Limits', 'seas ' + d.limits.seasFt + ' ft, wind ' + d.limits.windKt + ' kt' + (d.limits.noNorthInStream ? ', no north wind in the Stream' : ''));
    if (d.route) add('Route', d.route.id === 'mine' && d.myRoute ? d.myRoute.name + ' (' + d.myRoute.points.length + ' points)' : (typeof routeById === 'function' ? routeById(d.route.id, d).name : d.route.id));
    if (kind === 'b') {
      add('Make and model', b.make); add('Hull colour', b.colour); add('Home marina', b.marina); add('Papers link', b.papers ? 'yes' : '');
      add('Followers', d.followers && d.followers.length ? d.followers.join(', ') : '');
      if (d.prefs && (d.prefs.intervalMin || d.prefs.overdueMin)) add('Settings', [d.prefs.intervalMin ? 'every ' + d.prefs.intervalMin + ' min' : '', d.prefs.overdueMin ? 'overdue after ' + d.prefs.overdueMin + ' min' : ''].filter(Boolean).join(', '));
      add('Upcoming trips', d.trips && d.trips.length ? d.trips.map(function (t) { return (t.name || (t.home ? 'Trip home' : 'Trip over')) + ' (' + MyTrips.fmtDate(t.date) + ')'; }).join('; ') : '');
    }
    return out;
  }
  function list(el, r) {
    el.innerHTML = '';
    r.forEach(function (x) {
      var d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = x[0]; dd.textContent = x[1]; d.append(dt, dd); el.appendChild(d);
    });
    if (!r.length) { var p = document.createElement('p'); p.className = 'note'; p.textContent = 'Nothing saved yet. Set up your boat first (Menu → Setup).'; el.appendChild(p); }
  }

  // ---------- make mode ----------
  function showLink(kind) {
    var c = current(), payload = kind === 's' ? c.share : c.backup;
    var link = base() + '#' + kind + '=' + encode(payload);
    $('linkBox').hidden = false;
    $('linkTitle').textContent = kind === 's' ? 'Share my setup' : 'Back up my setup';
    $('linkWhat').textContent = kind === 's'
      ? 'For a friend. It does not include your boat name, followers, photo, trips, papers link or invite code.'
      : 'Keep this for yourself: it has your boat name, followers’ first names and upcoming trips. Save it in Notes or email it to yourself. Not included: past trips and tracks, the photo, your home port position, phone numbers or the invite code.';
    list($('linkList'), rows(check(payload).data, kind));
    $('linkText').value = link;
    $('linkMsg').textContent = '';
    $('linkSend').hidden = !navigator.share;
    $('linkSend').onclick = function () {
      navigator.share({ title: kind === 's' ? 'My boat setup for the Crossing app' : 'Crossing app backup (keep this private)', url: link }).catch(function () {});
    };
    $('linkCopy').onclick = function () {
      var done = function (ok) { $('linkMsg').textContent = ok ? 'Link copied.' : 'Press and hold the link above to copy it.'; };
      try { navigator.clipboard.writeText(link).then(function () { done(true); }, function () { $('linkText').select(); done(false); }); }
      catch (e) { $('linkText').select(); done(false); }
    };
    $('linkBox').scrollIntoView({ block: 'start' });
  }

  // ---------- open mode (a link was opened) ----------
  function openLink(kind, str) {
    $('makeBox').hidden = true; $('openBox').hidden = false;
    var parsed = null, res;
    try { parsed = decode(str); } catch (e) {}
    if (!parsed || parsed.v !== VERSION || parsed.k !== kind) {
      $('openTitle').textContent = 'This link can’t be read';
      $('openWhat').textContent = 'It may have been cut short when it was copied. Ask for it again, or open it from the original message.';
      $('openUse').hidden = true; return;
    }
    res = check(parsed);
    var d = res.data, had = S.load();
    $('openTitle').textContent = kind === 's' ? 'A friend’s boat setup' : 'Your setup backup';
    $('openWhat').textContent = kind === 's'
      ? 'Check these over. If you use them, Setup opens with them filled in for you to check. Your own boat name, followers and trips are not changed.'
      : 'Check these over. Using them puts this setup on this device' + (had ? ', replacing the boat, limits, route and followers saved here now' : '') + '. Upcoming trips are added to My Trips.';
    list($('openList'), rows(d, kind));
    $('openDropped').textContent = res.dropped.length ? 'Left out because they didn’t look right: ' + res.dropped.join(', ') + '.' : '';
    $('openUse').onclick = function () {
      var ok;
      if (kind === 's') {
        var parts = { boat: d.boat, prefilled: 'friend' };
        if (d.limits) parts.limits = d.limits;
        if (d.route) parts.route = d.route;
        if (d.myRoute) parts.myRoute = d.myRoute;
        ok = S.save(parts);
      } else {
        var old = (had && Array.isArray(had.followers)) ? had.followers : [];
        var phoneOf = function (n) { var f = old.find(function (x) { return x && x.name === n; }); return f && f.phone ? f.phone : ''; };
        var parts2 = { boat: d.boat };
        if (d.limits) parts2.limits = d.limits;
        if (d.route) parts2.route = d.route;
        if (d.myRoute) parts2.myRoute = d.myRoute;
        if (d.followers) parts2.followers = d.followers.map(function (n) { return { name: n, phone: phoneOf(n) }; });
        ok = S.save(parts2);
        if (ok && d.prefs && Object.keys(d.prefs).length) {
          try { var pr = JSON.parse(localStorage.getItem('cx:beta:prefs') || 'null') || {}; localStorage.setItem('cx:beta:prefs', JSON.stringify(Object.assign(pr, d.prefs, { savedAt: Date.now() }))); } catch (e) {}
        }
        if (ok && d.trips) d.trips.forEach(function (t) { MyTrips.upsert(t); });
      }
      if (!ok) { $('openMsg').textContent = 'Couldn’t save on this device. Check that private browsing is off.'; return; }
      history.replaceState(null, '', location.pathname);
      $('openUse').hidden = true; $('openCancel').hidden = true;
      $('openMsg').innerHTML = '';
      var a = document.createElement('a'); a.className = 'btn primary fwide';
      a.href = kind === 's' ? 'setup.html' : 'index.html#captain';
      a.textContent = kind === 's' ? 'Continue in Setup' : 'Open my plan';
      var p = document.createElement('p'); p.className = 'note';
      p.textContent = kind === 's' ? 'Saved on this device. To share trips with family you also need an invite code: ask RJ for an invite to share trips.' : 'Saved on this device.';
      $('openMsg').append(p, a);
    };
    $('openCancel').onclick = function () { history.replaceState(null, '', location.pathname); location.reload(); };
  }

  if (location.pathname.indexOf('/beta/') !== -1) { $('previewBar').style.display = 'block'; document.title = 'BETA · ' + document.title; }
  var m = /^#(s|b)=([A-Za-z0-9_-]+)$/.exec(location.hash);
  if (m) openLink(m[1], m[2]);
  else {
    $('shareBtn').onclick = function () { showLink('s'); };
    $('backupBtn').onclick = function () { showLink('b'); };
  }
  window.CXShare = { encode: encode, decode: decode, check: check };   // for the checks page
})();
