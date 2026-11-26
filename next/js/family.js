// ---------- Family page ----------
// Reads one trip with the family key from the link (#k=...). Holds everything
// in memory only: nothing is saved on the follower's phone. All text from the
// tracker is placed on the page as plain text, never as page code.
// Planning aid, not for navigation. This page cannot call for help.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MIN = 60e3;
  var key = (location.hash.match(/[#&]k=([A-Za-z0-9_-]+)/) || [])[1] || null;

  var held = null;          // the last good underway answer
  var ended = null;         // the last good ended answer
  var items = [], maxSeq = 0;
  var clockOffset = 0;      // service time minus this phone's time
  var lastGoodAt = null;    // this phone's time of the last good read
  var error = key ? null : 'nokey';
  var closed = false, timer = null, reading = false, pollMs = 30e3;
  var map = null;

  // Times in the follower's own zone.
  function t(ms) { return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  function ago(ms) {
    var m = Math.max(0, Math.round(ms / MIN));
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min ago';
  }
  function dur(ms) {
    var m = Math.max(0, Math.floor(ms / MIN));
    return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' m';
  }
  function nm(v) { return v < 10 ? (Math.round(v * 10) / 10) + ' nm' : Math.round(v) + ' nm'; }
  function svcNow() { return Date.now() + clockOffset; }
  function set(id, s) { $(id).textContent = s || ''; $(id).hidden = !s; }

  // ---- Reading ----
  function schedule(ms) { clearTimeout(timer); if (!closed) timer = setTimeout(readNow, ms); }
  function readNow() {
    if (closed || reading || !key) return;
    if (document.visibilityState === 'hidden') return;     // read again on return
    reading = true;
    var body = { familyKey: key };
    if (held && maxSeq) body.after = maxSeq;
    var sentAt = Date.now();
    Tracker.call('/v1/read', body).then(function (res) {
      reading = false;
      var gotAt = Date.now();
      if (!res.ok) {
        error = res.error === 'not_found' ? 'not_found' : (res.error || 'network');
        if (error === 'not_found') { closed = true; held = null; ended = null; }
        render();
        schedule(pollMs);
        return;
      }
      var d = res.data;
      error = null;
      lastGoodAt = gotAt;
      if (typeof d.now === 'number') clockOffset = d.now - (sentAt + gotAt) / 2;
      if (d.pollSeconds) pollMs = Math.max(10, d.pollSeconds) * 1000;
      if (d.status === 'underway') {
        held = d;
        (d.items || []).forEach(function (it) {
          if (it.seq > maxSeq) maxSeq = it.seq;
          items.push(it);
        });
        ended = null;
      } else if (d.status === 'closed') {
        closed = true; ended = d; held = null; items = [];
      } else {
        ended = d; held = null; items = [];    // arrived or stopped: no position is kept
      }
      render();
      if (d.more) readNow(); else schedule(pollMs);
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { render(); readNow(); }
  });
  setInterval(function () { if (document.visibilityState === 'visible') render(); }, 15e3);

  // ---- Showing ----
  function view() {
    if (error === 'nokey' || error === 'not_found') return { error: error };
    var v = ended || held;
    if (!v) return error ? { error: error } : null;
    var out = {};
    for (var k in v) out[k] = v[k];
    if (error) out.error = error;
    return out;
  }

  function positions() {
    return items.filter(function (it) { return it.kind === 'pos'; }).sort(function (a, b) { return a.t - b.t; });
  }

  function render() {
    var v = view();
    if (!v && !error) return;                      // first read not back yet
    var s = TripMath.familyState(v, svcNow());
    var cap = (held && held.captain) || (ended && ended.captain) || 'The captain';
    var dest = (held && held.route && held.route.dest) || (ended && ended.dest) || 'the destination';
    var boat = (held && held.boat) || (ended && ended.boat);
    if (boat) { $('title').textContent = '⚓ ' + boat; document.title = boat + ' · Crossing'; }

    // Cannot reach the tracker.
    if (s.unavailable && s.state !== 'unavailable') {
      set('unavail', 'Can\'t reach the tracker right now. Showing what this page had at ' + t(lastGoodAt) + '. Trying again.');
    } else set('unavail', '');

    // Overdue notice, above whichever state applies.
    $('odAlert').hidden = !s.overdue;
    if (s.overdue) {
      var last = held && held.last;
      $('odHead').textContent = (s.nearDest ? 'Last heard close to ' + dest + '. ' : '') +
        cap + ' has not arrived by the overdue time, ' + t(held.overdueAt) + '.';
      if (last) {
        $('odWhere').textContent = 'Last known position: ' + TripMath.fmtLatLon(last.lat, last.lon) + '.';
        $('odPos').textContent = 'At ' + t(last.t) + ', ' + ago(svcNow() - last.t) + ', ' + nm(s.leftNm) + ' from ' + dest + '.';
      } else {
        $('odWhere').textContent = 'No position was received for this trip.';
        $('odPos').textContent = '';
      }
    }

    var l1 = '', l2 = '', l3 = '', l4 = '', amber = '';
    var showMap = false, greyed = false;
    switch (s.state) {
      case 'badlink':
        l1 = 'This link doesn\'t work. Ask the captain for a new one.';
        break;
      case 'unavailable':
        l1 = 'Can\'t reach the tracker right now. Trying again.';
        break;
      case 'closed':
        l1 = 'This trip has ended.';
        break;
      case 'arrived':
        l1 = cap + ' arrived at ' + dest + ' at ' + t(ended.endedAt) + '. Position sharing has stopped.';
        break;
      case 'stopped':
        l1 = cap + ' stopped sharing at ' + t(ended.endedAt) + '. This page no longer shows the boat.';
        break;
      case 'started':
        showMap = true;
        l1 = 'Trip started at ' + t(held.startedAt) + '. The boat\'s position will appear once it is in open water.';
        l2 = 'Planned arrival about ' + t(held.plannedArrival) + '.';
        if (s.noPosLate) amber = 'No position received yet, ' + Math.round(s.sinceStartMs / MIN) + ' min after the start.';
        break;
      default: {  // underway or quiet
        showMap = true;
        var quiet = s.state === 'quiet';
        greyed = quiet;
        l1 = s.motion === 'stopped' ? cap + ' is stopped, ' + nm(s.leftNm) + ' from ' + dest : cap + ' is ' + nm(s.leftNm) + ' from ' + dest;
        if (s.motion === 'stopped') l2 = 'Arrival estimate on hold';
        else if (s.etaMs) l2 = (quiet ? 'Estimate was about ' : s.etaPast ? 'Was due about ' : 'Arriving about ') + t(s.etaMs);
        else l2 = 'Arrival estimate: not yet';
        if (s.motion === 'slow') l2 += ' · Moving slowly';
        l3 = 'Last update ' + ago(s.ageMs);
        l4 = (s.sogKt != null ? Math.round(s.sogKt) + ' kt · ' : '') + dur(svcNow() - held.startedAt) + ' underway';
        if (quiet) amber = 'No update for ' + Math.round(s.ageMs / MIN) + ' min. The boat may be out of signal. This page fills in when it reconnects.';
      }
    }
    $('line1').textContent = l1;
    set('line2', l2); set('line3', l3); set('line4', l4); set('amber', amber);
    $('line2').style.opacity = greyed ? '.55' : '';

    // Map: boat, trail, route. Removed once the trip has ended.
    $('map').hidden = !showMap;
    if (showMap) {
      if (!map) {
        map = makeTripMap($('map'), { points: (held.route && held.route.points) || [] });
      }
      map.invalidate();
      var pos = positions();
      map.setTrail(pos);
      if (held.last) {
        var prev = null;
        for (var i = pos.length - 1; i >= 0; i--) {
          if (TripMath.distNm(pos[i], held.last) > 0.02) { prev = pos[i]; break; }
        }
        map.setBoat(held.last, prev ? tripHeading(prev, held.last) : 270, greyed);
      }
    } else if (map) {
      map.clearBoat();
    }

    // Check-ins and overdue-time changes, newest first.
    var rows = held ? items.filter(function (it) { return it.kind === 'checkin' || it.kind === 'overdue'; })
      .sort(function (a, b) { return b.t - a.t; }) : [];
    $('listCard').hidden = !rows.length;
    var ul = $('list');
    ul.innerHTML = '';
    rows.forEach(function (it) {
      var li = document.createElement('li');
      li.textContent = it.kind === 'checkin'
        ? '✓ “All good” from ' + cap + ' · ' + t(it.t)
        : 'Overdue time changed to ' + t(it.value) + ' · ' + t(it.t);
      ul.appendChild(li);
    });

    var ex = $('explain');
    if (held) {
      ex.textContent = 'If ' + cap + ' isn\'t in by ' + t(held.overdueAt) + ' this page shows an overdue notice with the boat\'s last known position. The link closes 2 hours after the trip ends.';
      ex.hidden = false;
    } else ex.hidden = true;
  }

  if (!key) render(); else readNow();
})();
