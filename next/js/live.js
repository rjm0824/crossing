// ---------- Live page: Ready, Live and Ended screens ----------
// Reads GPS on the tracking device, records one position every 5 minutes once
// the start gate allows, saves it to the send queue and sends it. Planning aid,
// not for navigation: it says where the boat is and when it may arrive.
(function () {
  'use strict';
  var store = Queue.store;
  var params = new URLSearchParams(location.search);

  // ---- Rules for each direction (live-family.md, D1 and D11) ----
  var DIRS = {
    home: {
      name: 'Trip home: Guana Cay to Palm Beach Inlet',
      gate: { side: 'west', lon: -77.36 }, gatePlace: 'past Green Turtle',
      arrive: { lat: 26.7722, lon: -80.0301, pastSide: 'west', pastLon: -80.035 }
    },
    over: {
      name: 'Trip over: Palm Beach Inlet to Green Turtle Cay',
      gate: { side: 'east', lon: -80.02 }, gatePlace: 'outside the inlet',
      arrive: { lat: 26.7700, lon: -77.3300, pastSide: 'east', pastLon: -77.325 }
    }
  };
  var DIR = HOME ? 'home' : 'over';
  var RULES = {
    dir: DIR, name: DIRS[DIR].name, gate: DIRS[DIR].gate, arrive: DIRS[DIR].arrive,
    points: WP.map(function (p) { return { name: p.name, lat: p.lat, lon: p.lon }; }),
    dest: DEST, cruiseKt: CRUISE_KT
  };
  var GATE_TEXT = 'Waiting until you\'re ' + DIRS[DIR].gatePlace + ' to share your position.';

  var PRACTICE_URL = params.get('practice') === '1';
  var OVERDUE_TEST = params.get('overdue') === '1';
  var MIN = 60e3, HOUR = 3600e3;
  var RECORD_MS = 5 * MIN, PRACTICE_RECORD_MS = 5000, PRACTICE_SPEEDUP = 60;
  var NO_GPS_MS = 2 * MIN, ASK_GPS_MS = 5 * MIN;
  var ARRIVE_GAP_MS = 5000;

  // ---- Small helpers ----
  function show(id, on) { $(id).hidden = !on; }
  function text(id, s) { $(id).textContent = s; }
  function setResult(el, s, kind) { el.textContent = s; el.className = 'result' + (kind ? ' ' + kind : '') + (el.classList.contains('odResult') ? ' odResult' : ''); }
  // Times in this device's own time zone (RJ, Nov 25). tz() adds the zone's
  // short name ("7:05 AM EST") for the key times and the family message.
  function t(ms) { return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  function tz(ms) { return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); }
  function dur(ms) {
    var m = Math.max(0, Math.floor(ms / MIN));
    return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' m';
  }
  var round5 = function (v) { return Math.round(v * 1e5) / 1e5; };
  var trip = null;
  function svcNow() { return Math.round(Date.now() + (trip && trip.clockOffsetMs || 0)); }
  function saveTrip() { store.set('trip', trip); }
  function linkWith(dir) {
    var p = new URLSearchParams(location.search);
    if (dir === 'home') p.set('trip', 'home'); else p.delete('trip');
    var q = p.toString();
    return location.pathname + (q ? '?' + q : '');
  }
  function familyLink() {
    // The family page sits next to this one; the key goes after # so it is never sent to GitHub.
    return location.origin + location.pathname.replace(/live\.html$/, '') + 'family.html#k=' + trip.familyKey;
  }

  // ---- On load ----
  trip = store.get('trip');
  if (trip && trip.dir && trip.dir !== DIR) { location.replace(linkWith(trip.dir)); return; }

  var map = null;
  function ensureMap() {
    if (!map) map = makeTripMap($('map'), { line: TRACK, points: RULES.points });
    setTimeout(function () { map.invalidate(); }, 50);
  }

  // =====================================================================
  // Ready screen
  // =====================================================================
  var odSteps = 0;       // 30-minute steps added to the default overdue time
  var startBusy = false;
  function plannedNow() {
    if (PRACTICE_URL && OVERDUE_TEST) return Math.ceil((Date.now() + 2 * MIN) / 1000) * 1000;
    var hours = TripMath.lineLength(RULES.points) / CRUISE_KT;
    return Math.ceil((Date.now() + hours * HOUR) / MIN) * MIN;
  }
  function overdueFor(planned) {
    if (PRACTICE_URL && OVERDUE_TEST) return planned + MIN;
    return Math.max(planned, planned + 80 * MIN + odSteps * 30 * MIN);
  }
  function renderReady() {
    text('rRoute', RULES.name);
    var p = plannedNow(), o = overdueFor(p);
    text('rPlanned', 'about ' + tz(p));
    text('rOverdue', t(o));
    $('odMinus').disabled = o - 30 * MIN < p;
    text('hideHelp', $('hideStart').checked
      ? 'On: your position is hidden until you are ' + DIRS[DIR].gatePlace + '. Off: shared from the dock, for test runs away from home.'
      : 'Off: your position is shared from the dock. For test runs away from home only.');
    renderHome();
    var saved = store.get('invite');
    show('inviteBox', !saved);
    show('inviteChange', !!saved);
  }
  function showReady() {
    show('ready', true); show('live', false); show('ended', false);
    show('practiceTag', PRACTICE_URL);
    $('hideStart').checked = true;          // not remembered between trips
    odSteps = 0;
    renderReady();
  }
  // ---- Home port (D15): saved on this device only ----
  function homePort() { var h = store.get('homeport'); return h && typeof h.lat === 'number' && typeof h.lon === 'number' ? h : null; }
  function renderHome() {
    var h = homePort(), rule = TripMath.endRule(RULES, h);
    text('hpState', !h ? 'not set' : rule.kind === 'home' ? 'set' : 'set, not used for this route');
    text('hpHelp', !h ? 'Optional. Set where the boat is kept, and the trip keeps sharing past ' + DEST + ' until you are nearly home.'
      : rule.kind === 'home' ? 'This trip keeps sharing past ' + DEST + ' and ends within about 500 yards of your home port. Followers see the boat until then.'
      : 'Your home port is more than 15 nm from ' + DEST + ', so this trip ends at ' + DEST + '.');
    text('hpBtn', h ? 'Change home port' : 'Set home port');
  }
  var hpMap = null, hpPick = null, hpMark = null;
  $('hpBtn').onclick = function () {
    show('hpBox', true); show('hpBtn', false);
    var h = homePort(), last = RULES.points[RULES.points.length - 1];
    if (!hpMap) {
      hpMap = makeTripMap($('hpMap'), { line: TRACK, points: RULES.points });
      hpMap.map.on('click', function (e) {
        hpPick = { lat: round5(e.latlng.lat), lon: round5(e.latlng.lng) };
        if (hpMark) hpMark.setLatLng(e.latlng);
        else hpMark = L.circleMarker(e.latlng, { radius: 9, color: '#fff', weight: 2, fillColor: '#B42318', fillOpacity: 1 }).addTo(hpMap.map);
        $('hpSave').disabled = false;
      });
    }
    setTimeout(function () {
      hpMap.invalidate();
      var c = h || last;
      hpMap.map.setView([c.lat, c.lon], 12, { animate: false });
      if (h && !hpMark) hpMark = L.circleMarker([h.lat, h.lon], { radius: 9, color: '#fff', weight: 2, fillColor: '#B42318', fillOpacity: 1 }).addTo(hpMap.map);
    }, 60);
    show('hpRemove', !!h);
  };
  function closeHome() { show('hpBox', false); show('hpBtn', true); hpPick = null; $('hpSave').disabled = true; renderHome(); }
  $('hpSave').onclick = function () { if (hpPick) store.set('homeport', hpPick); closeHome(); };
  $('hpRemove').onclick = function () {
    store.remove('homeport');
    if (hpMark) { hpMap.map.removeLayer(hpMark); hpMark = null; }
    closeHome();
  };
  $('hpCancel').onclick = function () {
    var h = homePort();
    if (hpMark) { if (h) hpMark.setLatLng([h.lat, h.lon]); else { hpMap.map.removeLayer(hpMark); hpMark = null; } }
    closeHome();
  };

  $('odMinus').onclick = function () { odSteps--; renderReady(); };
  $('odPlus').onclick = function () { odSteps++; renderReady(); };
  $('hideStart').onchange = renderReady;
  $('inviteChange').onclick = function (e) { e.preventDefault(); show('inviteBox', true); show('inviteChange', false); $('invite').focus(); };
  setInterval(function () { if (!$('ready').hidden && !startBusy) renderReady(); }, 30e3);

  function startFail(msg, help) {
    startBusy = false;
    $('startBtn').disabled = false;
    text('startBtn', 'Start trip');
    setResult($('startResult'), msg, 'bad');
    $('startHelp').innerHTML = help || '';
    show('startHelp', !!help);
  }

  function getOneReading() {
    if (PRACTICE_URL) return Promise.resolve(practiceReading(0));
    return new Promise(function (resolve) {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(function (p) { resolve(toReading(p)); }, function () { resolve(null); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    });
  }

  $('startBtn').onclick = function () {
    if (startBusy) return;
    var inviteTyped = ($('invite').value || '').trim();
    var invite = !$('inviteBox').hidden ? inviteTyped : store.get('invite');
    if (!invite) { setResult($('startResult'), 'Type the invite code first.', 'bad'); $('invite').focus(); return; }
    startBusy = true;
    $('startBtn').disabled = true;
    text('startBtn', 'Starting…');
    setResult($('startResult'), '');
    show('startHelp', false);
    var hideStart = $('hideStart').checked;

    getOneReading().then(function (reading) {
      if (!reading) {
        startFail('This page needs your location to start a trip. No trip was started.',
          'On iPhone or iPad: Settings › Privacy &amp; Security › Location Services: on. Then Safari Websites: While Using the App. Come back, reload this page and tap Start trip again.');
        return;
      }
      // Direction guard: a trip home must start nearer Guana than the inlet, and the reverse.
      if (!TripMath.nearerStart(reading, RULES.points)) {
        var other = DIR === 'home' ? 'over' : 'home';
        startFail('This looks like the trip ' + other + '. No trip was started.',
          '<a href="' + linkWith(other) + '">Switch to trip ' + other + '</a>');
        return;
      }
      var planned = plannedNow(), overdue = overdueFor(planned);
      var rule = TripMath.endRule(RULES, homePort());
      var body = {
        invite: invite,
        boat: (PRACTICE_URL ? 'Practice run' : "Goof n' Off"), captain: 'RJ',
        // With a home port the destination is saved as "Home" (never where it is),
        // so the family page knows to say "heading in" and "RJ is home!".
        route: { name: RULES.name, points: RULES.points, dest: rule.kind === 'home' ? 'Home' : RULES.dest, cruiseKt: CRUISE_KT },
        plannedArrival: planned, overdueAt: overdue
      };
      body.endRule = rule;                    // kept on this device; removed before sending
      tryStart(body, reading, hideStart, 1);
    });
  };

  function tryStart(body, reading, hideStart, attempt) {
    var sentAt = Date.now();
    var send = {};
    for (var k in body) if (k !== 'endRule') send[k] = body[k];
    Tracker.call('/v1/start', send).then(function (res) {
      if (res.ok) { started(res.data, body, reading, hideStart, sentAt); return; }
      var e = res.error;
      if (e === 'invite') { show('inviteBox', true); show('inviteChange', false); return startFail('Invite code not accepted. Check it and try again.'); }
      if (e === 'cap') return startFail('The tracker has reached today\'s limit for new trips. Try again after 7 PM Eastern.');
      if (e === 'bad_request') return startFail('The tracker did not accept this trip. Nothing was started.');
      if (attempt < 3) {
        setResult($('startResult'), 'Couldn\'t reach the tracker. Trying again…', 'wait');
        setTimeout(function () { tryStart(body, reading, hideStart, attempt + 1); }, 15000);
        return;
      }
      startFail('Couldn\'t reach the tracker.');
      text('startBtn', 'Try again');
    });
  }

  function started(data, body, reading, hideStart, sentAt) {
    var gotAt = Date.now();
    store.set('invite', body.invite);
    Queue.clear();
    store.remove('trail');
    trip = {
      tripKey: data.tripKey, familyKey: data.familyKey, dir: DIR,
      startedAt: data.startedAt, clockOffsetMs: Math.round(data.startedAt - (sentAt + gotAt) / 2),
      plannedArrival: body.plannedArrival, overdueAt: body.overdueAt,
      hideStart: hideStart, startPoint: null, gateOpened: false,
      status: 'underway', endedAt: null, endedHow: null,
      practice: PRACTICE_URL, overdueTest: PRACTICE_URL && OVERDUE_TEST,
      lastRecordT: 0,
      endRule: body.endRule || { kind: 'route' }, passedLast: false
    };
    if (TripMath.isGood(reading)) trip.startPoint = { lat: reading.lat, lon: reading.lon };
    saveTrip();
    startBusy = false;
    $('startBtn').disabled = false;
    text('startBtn', 'Start trip');
    $('invite').value = '';
    showLive();
  }

  // =====================================================================
  // GPS (or the practice boat)
  // =====================================================================
  var watchId = null, practiceTimer = null, readings = [], lastGood = null, lastAny = 0, lastAsk = 0;
  var gpsError = '', arriveFirst = null, gateOpenNow = false;
  var cur = null;          // the latest reading, for the captain's own map and stats

  function toReading(p) {
    var c = p.coords;
    return {
      t: Date.now(), lat: c.latitude, lon: c.longitude,
      speedKt: (c.speed != null && c.speed >= 0) ? c.speed * 1.943844 : null, accM: c.accuracy
    };
  }

  // Practice: a made-up boat runs the detailed line at 26 kt, 60 times fast.
  var practiceLine = TRACK.map(function (p) { return { lat: p.lat, lon: p.lon }; });
  var practiceTotal = TripMath.lineLength(practiceLine);
  function practiceFor(t) {      // with a home port, the made-up boat runs on to it
    var line = TRACK.map(function (p) { return { lat: p.lat, lon: p.lon }; });
    if (t && t.endRule && t.endRule.kind === 'home') line.push({ lat: t.endRule.lat, lon: t.endRule.lon });
    practiceLine = line; practiceTotal = TripMath.lineLength(line);
  }
  function pointAlong(d) {
    for (var i = 1; i < practiceLine.length; i++) {
      var seg = TripMath.distNm(practiceLine[i - 1], practiceLine[i]);
      if (d <= seg) {
        var f = seg > 0 ? d / seg : 0, a = practiceLine[i - 1], b = practiceLine[i];
        return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f };
      }
      d -= seg;
    }
    return practiceLine[practiceLine.length - 1];
  }
  function practiceReading(elapsedMs) {
    var d = CRUISE_KT * (elapsedMs * PRACTICE_SPEEDUP / HOUR);
    var stopAt = trip && trip.overdueTest ? practiceTotal / 2 : practiceTotal;
    var moving = d < stopAt;
    var p = pointAlong(Math.min(d, stopAt));
    return { t: Date.now(), lat: p.lat, lon: p.lon, speedKt: moving ? CRUISE_KT : 0, accM: 5 };
  }

  function startGps() {
    stopGps();
    practiceFor(trip);
    if (trip.practice) {
      var tick = function () { onReading(practiceReading(svcNow() - trip.startedAt)); };
      tick();
      practiceTimer = setInterval(tick, 1000);
      return;
    }
    if (!navigator.geolocation) { gpsError = 'This browser has no location.'; render(); return; }
    watchId = navigator.geolocation.watchPosition(function (p) { gpsError = ''; onReading(toReading(p)); },
      function (e) { gpsError = e && e.code === 1 ? 'Location is not allowed for this page. Settings › Privacy & Security › Location Services › Safari Websites › While Using the App.' : ''; render(); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 60000 });
  }
  function stopGps() {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    clearInterval(practiceTimer); practiceTimer = null;
  }
  function askOnce() {
    if (trip.practice || !navigator.geolocation) return;
    lastAsk = Date.now();
    navigator.geolocation.getCurrentPosition(function (p) { onReading(toReading(p)); }, function () {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  }

  function onReading(r) {
    if (!trip || trip.status !== 'underway') return;
    lastAny = Date.now();
    cur = r;
    readings.push(r);
    readings = readings.filter(function (x) { return r.t - x.t <= 10 * MIN; });
    if (TripMath.isGood(r)) {
      lastGood = r;
      if (!trip.startPoint) { trip.startPoint = { lat: r.lat, lon: r.lon }; saveTrip(); }
      gateOpenNow = TripMath.mayShare(r, trip, RULES);
      if (gateOpenNow && !trip.gateOpened) { trip.gateOpened = true; saveTrip(); }
      maybeRecord(r);
      checkArrival(r);
    }
    render();
  }

  // One recorded position every 5 minutes (5 seconds in practice), if the gate allows.
  function maybeRecord(r) {
    if (!gateOpenNow || trip.status !== 'underway') return;
    // Never record inside the 500 yards round a home port (privacy page: followers
    // see the boat "to within about 500 yards" of where it is kept).
    if (trip.endRule && trip.endRule.kind === 'home' && TripMath.inEndZone(r, RULES, trip.endRule)) return;
    var every = trip.practice ? PRACTICE_RECORD_MS : RECORD_MS;
    var now = svcNow();
    if (now - (trip.lastRecordT || 0) < every) return;
    trip.lastRecordT = now;
    saveTrip();
    var sog = trip.practice ? (r.speedKt > 0 ? CRUISE_KT : 0) : TripMath.avgSpeed(readings, r.t);
    var item = { id: QueueRules.posId(now), t: now, kind: 'pos', lat: round5(r.lat), lon: round5(r.lon) };
    if (sog != null) item.sog = Math.round(sog * 10) / 10;
    var trail = store.get('trail') || [];
    trail.push({ lat: item.lat, lon: item.lon, t: now });
    store.set('trail', trail.slice(-3000));
    Queue.enqueue(item);
  }

  // Arrival: two good readings at least 5 seconds apart in the zone, after the gate has opened once.
  function checkArrival(r) {
    if (!trip.gateOpened) return;
    var rule = trip.endRule || { kind: 'route' };
    // With a home port: passing the route's end is told to followers ("heading in").
    if (rule.kind === 'home' && !trip.passedLast && TripMath.inArrivalZone(r, RULES)) {
      trip.passedLast = true;
      saveTrip();
      Queue.enqueue({ id: QueueRules.eventId(), t: svcNow(), kind: 'waypoint', label: 'Passed ' + DEST }, 'Passed ' + DEST);
    }
    if (!TripMath.inEndZone(r, RULES, rule)) { arriveFirst = null; return; }
    if (!arriveFirst) { arriveFirst = r; return; }
    if (r.t - arriveFirst.t >= ARRIVE_GAP_MS) endTrip('arrived');
  }

  // =====================================================================
  // Live screen
  // =====================================================================
  var pendingOk = null, pendingOd = null, okTimer = null, liveSince = Date.now();

  function showLive() {
    show('ready', false); show('ended', false); show('live', true);
    show('practiceTag', !!trip.practice);
    text('started', 'Trip started ' + tz(trip.startedAt) + (trip.practice ? ' · practice run, the boat is made up' : ''));
    text('every', trip.practice ? 'every 5 seconds (practice)' : 'every 5 min');
    text('stopsAt', trip.endRule && trip.endRule.kind === 'home'
      ? 'Stops by itself within about 500 yards of your home port.' : 'Stops by itself at ' + DEST + '.');
    ensureMap();
    var trail = store.get('trail') || [];
    if (trail.length) map.setTrail(trail);
    Queue.start(trip.tripKey);
    lastAny = liveSince = Date.now();
    startGps();
    keepAwake();
    render();
  }

  function heading() {
    for (var i = readings.length - 2; i >= 0; i--) {
      if (TripMath.distNm(readings[i], cur) > 0.02) return tripHeading(readings[i], cur);
    }
    return DIR === 'home' ? 255 : 75;
  }

  function render() {
    if (!trip) return;
    if (trip.status !== 'underway') { renderEnded(); return; }
    var now = svcNow();
    // Map and stats follow every reading, recorded or not (they stay on this device).
    if (cur) {
      map.setBoat(cur, heading(), false);
      var trail = store.get('trail') || [];
      map.setTrail(trail);
      // Practice runs 60 times fast, so a 10-minute average would lag: use the made-up boat's speed.
      var sp = trip.practice ? cur.speedKt : TripMath.avgSpeed(readings, Date.now());
      var mo = TripMath.motion(sp, CRUISE_KT);
      var left = TripMath.leftNm(cur, RULES.points);
      text('sSpeed', sp == null ? '–' : Math.round(sp) + ' kt');
      show('sMotion', mo === 'slow' || mo === 'stopped');
      text('sMotion', mo === 'slow' ? 'Slow' : mo === 'stopped' ? 'Stopped' : '');
      text('sLeft', trip.passedLast ? 'Heading in' : Math.round(left) + ' nm');
      var eta = TripMath.etaMs(now, left, sp);
      text('sEta', trip.passedLast ? '–' : mo === 'stopped' ? 'On hold' : eta ? 'about ' + t(eta) : '–');
      text('sAcc', 'GPS accuracy ± ' + Math.round(cur.accM) + ' m' + (TripMath.isGood(cur) ? '' : ' · too rough to use'));
    }
    text('sUnder', dur(now - trip.startedAt));

    // Overdue.
    var over = now > trip.overdueAt;
    show('odAlert', over);
    if (over) text('odAlertText', 'You are past your overdue time (' + tz(trip.overdueAt) + '). Your followers see an overdue notice.');
    text('odLine', 'If not arrived by ' + tz(trip.overdueAt) + ' your followers see an overdue notice.');

    renderStatus($('status'), Queue.status());
  }

  function renderStatus(el, q) {
    var lines = [], level = '';
    var add = function (s, lv) { lines.push(s); if (lv === 'bad' || (lv === 'wait' && level !== 'bad')) level = lv; };
    if (q.saveFailed) add('This device can\'t save updates. They will be lost if the page closes.', 'bad');
    if (trip.status === 'underway') {
      if (gpsError) add(gpsError, 'bad');
      else if (Date.now() - (lastGood ? lastGood.t : liveSince) > NO_GPS_MS) add('No GPS position right now.', 'wait');
      if (trip.hideStart !== false && !gateOpenNow) add(GATE_TEXT, 'wait');
      if (trip.passedLast) add('Past ' + DEST + ', heading in. Sharing until you are within about 500 yards of your home port.');
    }
    if (q.notFound) add('The tracker can\'t find this trip. Still saving. Trying again each minute.', 'bad');
    if (q.sending) add('Sending ' + q.sending + (q.sending === 1 ? ' update…' : ' updates…'));
    else if (q.waiting && q.lastError) add('Saved ' + q.waiting + (q.waiting === 1 ? ' update' : ' updates') + '. Will send when signal returns. Keep this page open.', 'wait');
    else if (q.waiting) add('Saved ' + q.waiting + (q.waiting === 1 ? ' update' : ' updates') + '. Sending soon.');
    else if (trip.status === 'underway') add(q.lastReceivedMs ? 'All sent. Tracker last received ' + t(q.lastReceivedMs) + '.' : 'Nothing to send yet.');
    if (q.notAccepted) add(q.notAccepted + (q.notAccepted === 1 ? ' position was' : ' positions were') + ' not accepted by the tracker.', 'wait');
    if (q.eventError) add('The tracker did not accept ‘' + q.eventError + '’. Followers may not see it.', 'bad');
    el.innerHTML = '';
    lines.forEach(function (s) { var d = document.createElement('div'); d.textContent = s; el.appendChild(d); });
    el.className = 'status' + (level ? ' ' + level : '');
  }

  function renderLog(q) {
    var rows = (q.log || []).slice().reverse();
    show('logCard', rows.length > 0);
    var ul = $('log');
    ul.innerHTML = '';
    rows.forEach(function (r) {
      var li = document.createElement('li'), s = document.createElement('small');
      li.textContent = r.text + ' · ' + t(r.t);
      s.textContent = r.state === 'received' ? 'Received by tracker ' + t(r.rt)
        : r.state === 'refused' ? 'Not accepted by the tracker' : 'Saved on this device, not yet received';
      li.appendChild(s);
      ul.appendChild(li);
    });
  }

  // Button results follow the item's log row: saved, then received.
  Queue.onStatus(function (q) {
    if (!trip) return;
    renderLog(q);
    var rowOf = function (id) { return (q.log || []).filter(function (r) { return r.id === id; })[0]; };
    if (pendingOk) {
      var r = rowOf(pendingOk);
      if (r && r.state === 'received') {
        setResult($('okResult'), '✓ Received ' + t(r.rt), 'good');
        pendingOk = null; resetOk();
      } else if (r && r.state === 'refused') {
        setResult($('okResult'), 'The tracker did not accept it. Followers may not see it.', 'bad');
        pendingOk = null; resetOk();
      } else if (!q.sending && q.lastError) {
        setResult($('okResult'), 'Couldn\'t send. Saved, will retry.', 'wait');
        resetOk();
      }
    }
    if (pendingOd) {
      var o = rowOf(pendingOd.id);
      var els = document.querySelectorAll('.odResult');
      var msg = null, kind = '';
      if (o && o.state === 'received') { msg = 'New overdue time ' + tz(pendingOd.value) + ' received'; kind = 'good'; pendingOd = null; }
      else if (o && o.state === 'refused') { msg = 'The tracker did not accept the new time. Followers still see ' + t(pendingOd.before) + '.'; kind = 'bad'; pendingOd = null; }
      else if (!q.sending && q.lastError) { msg = pendingOd.wasOver ? 'Saved, will retry. Followers still see overdue.' : 'Saved, will retry.'; kind = 'wait'; }
      if (msg) { for (var i = 0; i < els.length; i++) setResult(els[i], msg, kind); setOdButtons(false); }
    }
    if (trip.status === 'underway') renderStatus($('status'), q); else renderEnded();
  });

  function resetOk() {
    clearTimeout(okTimer);
    $('okBtn').disabled = false;
    text('okBtn', 'Send "All good" to family');
  }
  $('okBtn').onclick = function () {
    if (!trip || trip.status !== 'underway') return;
    $('okBtn').disabled = true;
    text('okBtn', 'Sending…');
    setResult($('okResult'), '');
    var now = svcNow();
    pendingOk = QueueRules.eventId();
    Queue.enqueue({ id: pendingOk, t: now, kind: 'checkin' }, 'All good');
  };

  function setOdButtons(busy) {
    var bs = document.querySelectorAll('.odAdd');
    for (var i = 0; i < bs.length; i++) { bs[i].disabled = busy; bs[i].textContent = busy ? 'Sending…' : 'I\'m fine, add 1 hour'; }
  }
  var odClick = function () {
    if (!trip || trip.status !== 'underway') return;
    var now = svcNow();
    var before = trip.overdueAt;
    var value = Math.round(Math.max(now, before) + HOUR);
    trip.overdueAt = value;           // shown at once, marked saved until the tracker confirms
    saveTrip();
    setOdButtons(true);
    var els = document.querySelectorAll('.odResult');
    for (var i = 0; i < els.length; i++) setResult(els[i], '');
    pendingOd = { id: QueueRules.eventId(), value: value, before: before, wasOver: now > before };
    render();
    Queue.enqueue({ id: pendingOd.id, t: now, kind: 'overdue', value: value }, 'Overdue time changed to ' + t(value));
  };
  var odButtons = document.querySelectorAll('.odAdd');
  for (var i = 0; i < odButtons.length; i++) odButtons[i].onclick = odClick;

  // "Send link to family" (version A, chosen by RJ on Nov 25). Draft wording
  // for RJ's attorney, like the overdue notice. The page only opens the share
  // screen; the iPad or iPhone does the sending, so it never says "sent".
  function familyText() {
    var home = DIR === 'home';
    var boat = trip.practice ? 'Practice run' : "Goof n' Off";
    return (home ? 'Heading home! ' : 'Heading to Abaco! ') +
      'Leaving ' + RULES.points[0].name + ' on ' + boat + ' at ' + tz(trip.startedAt) +
      ', aiming for ' + DEST + ' around ' + tz(trip.plannedArrival) + '. ' +
      'You can follow the boat live here, no app needed: ' + familyLink() + '\n' +
      'If you haven\'t heard from me by ' + tz(trip.overdueAt) + ', check the link first, then give me a call.';
  }
  $('shareBtn').onclick = function () {
    var msg = familyText();
    show('shareBox', false);
    var copyInstead = function () {
      var shown = function () {
        $('shareBox').value = msg; show('shareBox', true); $('shareBox').select();
        setResult($('shareResult'), 'Couldn\'t open the share screen. The message is below: press and hold it to copy.', 'wait');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(function () { setResult($('shareResult'), 'Message copied. Paste it into a text to your family.', 'good'); }, shown);
      } else shown();
    };
    if (navigator.share) {
      setResult($('shareResult'), 'Share screen opened', 'good');
      navigator.share({ text: msg }).catch(function (e) {
        if (e && e.name === 'AbortError') setResult($('shareResult'), '');   // closed without choosing
        else copyInstead();
      });
    } else copyInstead();
  };

  $('copyBtn').onclick = function () {
    var link = familyLink();
    var shown = function () {
      $('linkBox').value = link; show('linkBox', true); $('linkBox').select();
      setResult($('copyResult'), 'Couldn\'t copy by itself. The link is below: press and hold it to copy.', 'wait');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () { setResult($('copyResult'), 'Link copied', 'good'); show('linkBox', false); }, shown);
    } else shown();
  };

  $('stopBtn').onclick = function () { show('stopDialog', true); $('stopNo').focus(); };
  $('stopNo').onclick = function () { show('stopDialog', false); };
  $('stopYes').onclick = function () { show('stopDialog', false); endTrip('stopped'); };

  function endTrip(how) {
    if (!trip || trip.status !== 'underway') return;
    var now = svcNow();
    trip.status = 'ended'; trip.endedAt = now; trip.endedHow = how;
    trip.endId = QueueRules.eventId();
    saveTrip();
    stopGps();
    releaseAwake();
    Queue.enqueue({ id: trip.endId, t: now, kind: 'ended', value: how },
      how === 'arrived' ? 'Trip ended, arrived' : 'Sharing stopped');
    showEnded();
  }

  // =====================================================================
  // Ended screen
  // =====================================================================
  function showEnded() {
    show('ready', false); show('live', false); show('ended', true);
    show('practiceTag', !!trip.practice);
    Queue.start(trip.tripKey);      // anything still waiting goes when there is signal
    renderEnded();
  }
  function renderEnded() {
    if (!trip || trip.status === 'underway') return;
    text('eHow', trip.endedHow === 'arrived'
      ? (trip.endRule && trip.endRule.kind === 'home' ? 'Arrived at your home port ' : 'Arrived at ' + DEST + ' ') + tz(trip.endedAt) + '. Sharing has stopped.'
      : 'Sharing stopped at ' + tz(trip.endedAt) + '.');
    text('eUnder', 'Underway ' + dur(trip.endedAt - trip.startedAt) + (trip.practice ? ' · practice run' : ''));
    var q = Queue.status();
    var el = $('eStatus');
    var row = (q.log || []).filter(function (r) { return r.id === trip.endId; })[0];
    if (q.waiting) {
      renderStatus(el, q);
      var d = document.createElement('div');
      d.textContent = trip.endedHow === 'arrived'
        ? 'Open this page when you have signal so your followers see you arrived.'
        : 'Open this page when you have signal so your followers see sharing has stopped.';
      el.insertBefore(d, el.firstChild);
      el.className = 'status wait';
    } else if (trip.deleted) {
      el.textContent = 'Deleted from the tracker. Your followers\' link no longer works.';
      el.className = 'status';
    } else {
      el.textContent = 'Your followers can see the trip has ended.' + (row && row.rt ? ' Received ' + t(row.rt) + '.' : '');
      el.className = 'status';
    }
    show('newBtn', !q.waiting);
    show('delBtn', !q.waiting && !trip.deleted);
  }
  // "Delete this trip from the tracker": only once everything has been delivered.
  $('delBtn').onclick = function () { show('delDialog', true); $('delNo').focus(); };
  $('delNo').onclick = function () { show('delDialog', false); };
  $('delYes').onclick = function () {
    show('delDialog', false);
    if (!trip || trip.deleted) return;
    $('delBtn').disabled = true;
    text('delBtn', 'Deleting…');
    setResult($('delResult'), '');
    Tracker.call('/v1/delete', { tripKey: trip.tripKey }).then(function (res) {
      $('delBtn').disabled = false;
      text('delBtn', 'Delete this trip from the tracker');
      if (res.ok || res.error === 'not_found') {
        trip.deleted = true;
        saveTrip();
        setResult($('delResult'), '');            // the status line says it was deleted
      } else {
        setResult($('delResult'), 'Couldn\'t delete. Try again with signal.', 'bad');
      }
      renderEnded();
    });
  };

  $('newBtn').onclick = function () {
    setResult($('delResult'), '');
    if (Queue.status().waiting) return;
    store.remove('trip'); store.remove('trail'); Queue.clear();
    trip = null; cur = null; readings = []; lastGood = null; arriveFirst = null; gateOpenNow = false;
    if (map) map.clearBoat();
    showReady();
  };

  // =====================================================================
  // Keep the screen awake (copied from tracking.js)
  // =====================================================================
  var wakeLock = null, lastTick = Date.now(), pauseNote = '';
  var underway = function () { return !!trip && trip.status === 'underway'; };
  function showAwake() {
    var el = $('awake');
    if (!underway()) return;
    var awake = !!(wakeLock && !wakeLock.released);
    el.className = 'note' + (awake ? ' ok' : '');
    el.innerHTML = (awake ? '<b>✓ Screen will stay awake</b> while sharing.' : '<b>⚠ The screen may lock.</b> Tap anywhere on this page, or set Settings › Display &amp; Brightness › Auto-Lock to Never.')
      + '<br><b>Keep this page open in front while sharing.</b> Switching apps or tabs pauses it, even with the screen awake.';
    if (pauseNote) { var s = document.createElement('div'); s.textContent = pauseNote; el.appendChild(s); }
  }
  function keepAwake() {
    try {
      if ('wakeLock' in navigator && (!wakeLock || wakeLock.released) && document.visibilityState === 'visible') {
        navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; w.addEventListener('release', showAwake); showAwake(); }, function () { wakeLock = null; showAwake(); });
      }
    } catch (e) { wakeLock = null; }
    showAwake();
  }
  function releaseAwake() { try { if (wakeLock && !wakeLock.released) wakeLock.release(); } catch (e) {} wakeLock = null; }
  function resumed(gap) {
    if (!underway()) return;
    if (gap > 6 * MIN) pauseNote = 'Sharing was paused for about ' + Math.round(gap / MIN) + ' min (page in the background or screen off). It\'s back on now.';
    keepAwake();
    askOnce();
  }
  document.addEventListener('click', function () { if (underway() && (!wakeLock || wakeLock.released)) keepAwake(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { var g = Date.now() - lastTick; lastTick = Date.now(); resumed(g); render(); }
  });
  setInterval(function () {
    var now = Date.now(), g = now - lastTick; lastTick = now;
    if (!underway()) return;
    if (g > 2 * MIN) { resumed(g); return; }
    if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) keepAwake();
    if (now - lastAny > ASK_GPS_MS && now - lastAsk > ASK_GPS_MS) askOnce();
    render();
  }, 30e3);
  // Keep the clock and "No GPS" line fresh between readings.
  setInterval(function () { if (underway() && !trip.practice) render(); }, 10e3);

  // ---- First screen ----
  if (!trip) showReady();
  else if (trip.status === 'underway') showLive();
  else showEnded();
})();
