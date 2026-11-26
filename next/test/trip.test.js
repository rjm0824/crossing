// Checks for the trip maths (and, from step 2, the send-queue rules).
// Node:    node --test next/test/trip.test.js
// Browser: next/trip-test.html loads this file and lists PASS or FAIL.
(function () {
  'use strict';
  var inNode = typeof window === 'undefined' && typeof module !== 'undefined';
  var TM = inNode ? require('../js/trip-math.js') : window.TripMath;
  var QR = inNode ? require('../js/queue.js') : window.QueueRules;

  var checks = [];
  function check(name, fn) { checks.push({ name: name, fn: fn }); }
  function ok(v, msg) { if (!v) throw new Error(msg || 'expected true'); }
  function eq(a, b, msg) {
    if (a !== b) throw new Error((msg || 'values differ') + ': got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b));
  }
  function near(a, b, tol, msg) {
    if (!(Math.abs(a - b) <= tol)) throw new Error((msg || 'not close') + ': got ' + a + ', want ' + b + ' ± ' + tol);
  }

  // ---- The routes, as in next/js/settings.js ----
  var P = {
    guana: { name: 'Guana Cay', lat: 26.6950, lon: -77.1300 },
    whale: { name: 'Whale Cay Passage', lat: 26.7400, lon: -77.1900 },
    gtc: { name: 'Green Turtle Cay', lat: 26.7700, lon: -77.3300 },
    crab: { name: 'Crab Cay', lat: 26.9336, lon: -77.5967 },
    sale: { name: 'Bank (north of Great Sale)', lat: 27.0512, lon: -78.2122 },
    mangrove: { name: 'Bank (Mangrove Cay)', lat: 26.9726, lon: -78.6657 },
    memory: { name: 'Memory Rock (outside)', lat: 26.9134, lon: -79.0907 },
    stream: { name: 'Gulf Stream', lat: 26.8575, lon: -79.5633 },
    inlet: { name: 'Palm Beach Inlet', lat: 26.7722, lon: -80.0301 }
  };
  var HOME_POINTS = [P.guana, P.whale, P.gtc, P.crab, P.sale, P.mangrove, P.memory, P.stream, P.inlet];
  var OVER_POINTS = [P.inlet, P.stream, P.memory, P.mangrove, P.sale, P.crab, P.gtc];
  var HOME = {
    dir: 'home', points: HOME_POINTS, cruiseKt: 26,
    gate: { side: 'west', lon: -77.36 },
    arrive: { lat: 26.7722, lon: -80.0301, pastSide: 'west', pastLon: -80.035 }
  };
  var OVER = {
    dir: 'over', points: OVER_POINTS, cruiseKt: 26,
    gate: { side: 'east', lon: -80.02 },
    arrive: { lat: 26.7700, lon: -77.3300, pastSide: 'east', pastLon: -77.325 }
  };

  var YD_PER_NM = 2025.37;
  // A point the given number of yards due north of p.
  function north(p, yards) { return { lat: p.lat + yards / YD_PER_NM / 60, lon: p.lon }; }
  function reading(p, extra) {
    var r = { t: 0, lat: p.lat, lon: p.lon, speedKt: null, accM: 10 };
    for (var k in extra) r[k] = extra[k];
    return r;
  }
  function trip(startPoint, hideStart) {
    return { status: 'underway', hideStart: hideStart !== false, startPoint: startPoint };
  }

  // ---- Distance left ----
  check('Distance left: the whole line at the start, 0 at the end', function () {
    var total = TM.lineLength(HOME_POINTS);
    ok(total > 150 && total < 200, 'trip home length looks wrong: ' + total);
    near(TM.leftNm(P.guana, HOME_POINTS), total, 0.01, 'at Guana');
    near(TM.leftNm(P.inlet, HOME_POINTS), 0, 0.01, 'at the inlet');
  });
  check('Distance left: a boat beside a long segment measures to the segment', function () {
    // 2 nm north of the middle of the Memory Rock to Gulf Stream leg.
    var mid = { lat: (P.memory.lat + P.stream.lat) / 2, lon: (P.memory.lon + P.stream.lon) / 2 };
    var boat = { lat: mid.lat + 2 / 60, lon: mid.lon };
    var a = TM.alongLine(boat, HOME_POINTS);
    var wantLeft = TM.distNm(mid, P.stream) + TM.distNm(P.stream, P.inlet);
    near(TM.leftNm(boat, HOME_POINTS), wantLeft, 0.3, 'left');
    ok(a.offNm > 1.5 && a.offNm < 2.1, 'off the line ' + a.offNm);
  });

  // ---- Start gate, trip home ----
  var homeStart = trip(P.guana);
  check('Gate, trip home: Guana Cay hidden', function () {
    eq(TM.mayShare(reading(north(P.guana, 50)), homeStart, HOME), false);
  });
  check('Gate, trip home: Whale Cay Passage hidden', function () {
    eq(TM.mayShare(reading(P.whale), homeStart, HOME), false);
  });
  check('Gate, trip home: 77.34°W hidden', function () {
    eq(TM.mayShare(reading({ lat: 26.78, lon: -77.34 }), homeStart, HOME), false);
  });
  check('Gate, trip home: 77.40°W shown', function () {
    eq(TM.mayShare(reading({ lat: 26.80, lon: -77.40 }), homeStart, HOME), true);
  });
  check('Gate, trip home: start at 77.40°W, 450 yards away hidden, 550 shown', function () {
    var start = { lat: 26.80, lon: -77.40 };
    eq(TM.mayShare(reading(north(start, 450)), trip(start), HOME), false, '450 yards');
    eq(TM.mayShare(reading(north(start, 550)), trip(start), HOME), true, '550 yards');
  });
  check('Gate, trip home: everything shown with "Hide my start" off', function () {
    var off = trip(P.guana, false);
    eq(TM.mayShare(reading(P.guana), off, HOME), true, 'Guana');
    eq(TM.mayShare(reading(P.whale), off, HOME), true, 'Whale Cay');
    eq(TM.mayShare(reading({ lat: 26.78, lon: -77.34 }), off, HOME), true, '77.34W');
  });

  // ---- Start gate, trip over ----
  check('Gate, trip over: west of 80.02°W hidden', function () {
    var start = { lat: 26.7700, lon: -80.0500 };
    eq(TM.mayShare(reading({ lat: 26.7722, lon: -80.0301 }), trip(start), OVER), false, 'inlet');
    eq(TM.mayShare(reading({ lat: 26.80, lon: -80.025 }), trip(start), OVER), false, '80.025W');
  });
  check('Gate, trip over: east of it and over 500 yards from the start shown', function () {
    var start = { lat: 26.7700, lon: -80.0500 };
    eq(TM.mayShare(reading({ lat: 26.7759, lon: -79.9835 }), trip(start), OVER), true);
  });
  check('Gate: a boat that passes the line and turns back is hidden again', function () {
    var t = trip(P.guana);
    eq(TM.mayShare(reading({ lat: 26.80, lon: -77.40 }), t, HOME), true, 'past the line');
    eq(TM.mayShare(reading({ lat: 26.78, lon: -77.34 }), t, HOME), false, 'back behind it');
  });
  check('Gate: nothing shared before the trip is underway, or from a poor reading', function () {
    var ended = { status: 'ended', hideStart: true, startPoint: P.guana };
    eq(TM.mayShare(reading({ lat: 26.80, lon: -77.40 }), ended, HOME), false, 'ended');
    eq(TM.mayShare(reading({ lat: 26.80, lon: -77.40 }, { accM: 500 }), homeStart, HOME), false, 'poor reading');
    eq(TM.mayShare(reading({ lat: 26.80, lon: -77.40 }), trip(null), HOME), false, 'no start point yet');
  });

  // ---- Direction guard ----
  check('Direction guard: at Guana, nearer the start of the trip home and the end of the trip over', function () {
    eq(TM.nearerStart(P.guana, HOME_POINTS), true, 'trip home');
    eq(TM.nearerStart(P.guana, OVER_POINTS), false, 'trip over');
  });

  // ---- Arrival zone ----
  check('Arrival zone: 400 yards from the inlet point in, 600 yards out', function () {
    eq(TM.inArrivalZone(north(P.inlet, 400), HOME), true, '400 yards');
    eq(TM.inArrivalZone(north(P.inlet, 600), HOME), false, '600 yards');
  });
  check('Arrival zone: west of 80.035°W counts as arrived', function () {
    eq(TM.inArrivalZone({ lat: 26.80, lon: -80.04 }, HOME), true);
  });
  check('Arrival zone, trip over: within 500 yards of Green Turtle, or east of 77.325°W', function () {
    eq(TM.inArrivalZone(north(P.gtc, 400), OVER), true, '400 yards');
    eq(TM.inArrivalZone({ lat: 26.70, lon: -77.30 }, OVER), true, 'past it');
    eq(TM.inArrivalZone({ lat: 26.85, lon: -77.45 }, OVER), false, 'not yet');
  });

  // ---- Accuracy ----
  check('Accuracy: 150 m good, 500 m not, missing not', function () {
    eq(TM.isGood(reading(P.gtc, { accM: 150 })), true, '150 m');
    eq(TM.isGood(reading(P.gtc, { accM: 500 })), false, '500 m');
    eq(TM.isGood(reading(P.gtc, { accM: null })), false, 'missing');
  });

  // ---- Speed and motion ----
  var NOW = Date.UTC(2026, 10, 29, 15, 0, 0);
  check('Speed: steady 24 kt gives 24', function () {
    var rs = [];
    for (var i = 0; i < 10; i++) rs.push({ t: NOW - i * 60e3, lat: 26.9, lon: -79, speedKt: 24, accM: 10 });
    near(TM.avgSpeed(rs, NOW), 24, 0.001);
    eq(TM.motion(24, 26), 'underway');
  });
  check('Speed: zeros give stopped', function () {
    var rs = [{ t: NOW - 60e3, lat: 26.9, lon: -79, speedKt: 0, accM: 10 }, { t: NOW, lat: 26.9, lon: -79, speedKt: 0, accM: 10 }];
    eq(TM.avgSpeed(rs, NOW), 0);
    eq(TM.motion(0, 26), 'stopped');
  });
  check('Speed: no readings give null and motion unknown', function () {
    eq(TM.avgSpeed([], NOW), null);
    eq(TM.motion(null, 26), 'unknown');
  });
  check('Speed: worked out from distance when the device gives none', function () {
    // 2 nm north in 5 minutes is 24 kt.
    var a = { t: NOW - 5 * 60e3, lat: 26.9, lon: -79, speedKt: null, accM: 10 };
    var b = { t: NOW, lat: 26.9 + 2 / 60, lon: -79, speedKt: null, accM: 10 };
    near(TM.avgSpeed([a, b], NOW), 24, 0.1);
  });
  check('Speed: readings older than 10 minutes are left out', function () {
    var rs = [{ t: NOW - 15 * 60e3, lat: 26.9, lon: -79, speedKt: 5, accM: 10 }, { t: NOW, lat: 26.9, lon: -79, speedKt: 25, accM: 10 }];
    near(TM.avgSpeed(rs, NOW), 25, 0.001);
  });
  check('Motion: under 40% of cruise is slow', function () {
    eq(TM.motion(10, 26), 'slow');
    eq(TM.motion(11, 26), 'underway');
  });
  check('Arrival estimate: distance over speed; none when stopped or no speed', function () {
    eq(TM.etaMs(NOW, 24, 24), NOW + 3600e3);
    eq(TM.etaMs(NOW, 24, 2), null, 'stopped');
    eq(TM.etaMs(NOW, 24, null), null, 'no speed');
  });

  // ---- Position read aloud ----
  check('Position read aloud: degrees and decimal minutes', function () {
    eq(TM.fmtLatLon(26.8123, -79.4567), "26° 48.74' N, 079° 27.40' W");
    eq(TM.fmtLatLon(26.0833, -80.0), "26° 05.00' N, 080° 00.00' W");
    eq(TM.fmtLatLon(26.99999, -79.99999), "27° 00.00' N, 080° 00.00' W", 'rounds up to whole degrees');
  });

  // ---- Family page states (made-up Read answers) ----
  var START = NOW - 3 * 3600e3;
  function underway(extra) {
    var r = {
      status: 'underway', overdue: false, boat: "Goof n' Off", captain: 'RJ',
      route: { name: 'Trip home', points: HOME_POINTS, dest: 'Palm Beach Inlet', cruiseKt: 26 },
      startedAt: START, plannedArrival: NOW + 3600e3, overdueAt: NOW + 2 * 3600e3,
      last: null, items: [], more: false, now: NOW, pollSeconds: 30
    };
    for (var k in extra) r[k] = extra[k];
    return r;
  }
  var atStream = { t: NOW - 2 * 60e3, lat: P.stream.lat, lon: P.stream.lon, sog: 24 };

  check('Family: bad link (no key, or not found)', function () {
    eq(TM.familyState(null, NOW).state, 'badlink', 'nothing');
    eq(TM.familyState({ error: 'nokey' }, NOW).state, 'badlink', 'no key');
    eq(TM.familyState({ error: 'not_found' }, NOW).state, 'badlink', 'not found');
  });
  check('Family: unavailable before any read worked', function () {
    var s = TM.familyState({ error: 'network' }, NOW);
    eq(s.state, 'unavailable');
    eq(s.unavailable, true);
  });
  check('Family: started, no position yet', function () {
    var s = TM.familyState(underway({ startedAt: NOW - 30 * 60e3 }), NOW);
    eq(s.state, 'started');
    eq(s.noPosLate, false);
  });
  check('Family: started, no position after 60 minutes', function () {
    var s = TM.familyState(underway({ startedAt: NOW - 64 * 60e3 }), NOW);
    eq(s.state, 'started');
    eq(s.noPosLate, true);
    eq(Math.round(s.sinceStartMs / 60e3), 64);
  });
  check('Family: underway, with distance left, estimate and age', function () {
    var s = TM.familyState(underway({ last: atStream }), NOW);
    eq(s.state, 'underway');
    near(s.leftNm, TM.distNm(P.stream, P.inlet), 0.05, 'left');
    eq(s.ageMs, 2 * 60e3);
    eq(s.sogKt, 24);
    eq(s.motion, 'underway');
    eq(s.etaMs, TM.etaMs(atStream.t, s.leftNm, 24));
    eq(s.etaPast, false);
    eq(s.overdue, false);
  });
  check('Family: slow and stopped', function () {
    var slow = TM.familyState(underway({ last: { t: NOW, lat: P.stream.lat, lon: P.stream.lon, sog: 8 } }), NOW);
    eq(slow.motion, 'slow');
    var stopped = TM.familyState(underway({ last: { t: NOW, lat: P.stream.lat, lon: P.stream.lon, sog: 1 } }), NOW);
    eq(stopped.motion, 'stopped');
    eq(stopped.etaMs, null, 'estimate on hold');
  });
  check('Family: quiet when the last position is over 20 minutes old', function () {
    var s = TM.familyState(underway({ last: { t: NOW - 43 * 60e3, lat: P.stream.lat, lon: P.stream.lon, sog: 24 } }), NOW);
    eq(s.state, 'quiet');
    eq(Math.round(s.ageMs / 60e3), 43);
  });
  check('Family: an estimate already in the past', function () {
    // Last heard 3 hours ago, 30-odd nm out at 24 kt.
    var s = TM.familyState(underway({ last: { t: NOW - 3 * 3600e3, lat: P.stream.lat, lon: P.stream.lon, sog: 24 } }), NOW);
    eq(s.etaPast, true);
    eq(s.state, 'quiet');
  });
  check('Family: overdue when the service says so', function () {
    var s = TM.familyState(underway({ last: atStream, overdue: true }), NOW);
    eq(s.overdue, true);
  });
  check('Family: overdue worked out by the page from the overdue time', function () {
    var r = underway({ last: atStream, overdue: false, overdueAt: NOW - 60e3 });
    eq(TM.familyState(r, NOW).overdue, true);
  });
  check('Family: overdue worked out with no successful read', function () {
    // The page holds an older answer; the latest read failed.
    var r = underway({ last: atStream, overdue: false, overdueAt: NOW - 60e3, error: 'network' });
    var s = TM.familyState(r, NOW);
    eq(s.overdue, true, 'overdue');
    eq(s.unavailable, true, 'unavailable');
    eq(s.state, 'underway', 'still shows the held position');
  });
  check('Family: overdue with no position', function () {
    var s = TM.familyState(underway({ overdueAt: NOW - 60e3 }), NOW);
    eq(s.state, 'started');
    eq(s.overdue, true);
  });
  check('Family: near the destination', function () {
    var p = north(P.inlet, 3 * YD_PER_NM);
    var s = TM.familyState(underway({ last: { t: NOW, lat: p.lat, lon: p.lon, sog: 20 }, overdue: true }), NOW);
    eq(s.nearDest, true);
    var far = TM.familyState(underway({ last: atStream }), NOW);
    eq(far.nearDest, false);
  });
  check('Family: arrived, stopped and closed', function () {
    var base = { boat: "Goof n' Off", captain: 'RJ', dest: 'Palm Beach Inlet', endedAt: NOW - 60e3, now: NOW, pollSeconds: 60 };
    var a = {}, b = {}, k;
    for (k in base) { a[k] = base[k]; b[k] = base[k]; }
    a.status = 'arrived'; b.status = 'stopped';
    eq(TM.familyState(a, NOW).state, 'arrived');
    eq(TM.familyState(b, NOW).state, 'stopped');
    eq(TM.familyState({ status: 'closed' }, NOW).state, 'closed');
    eq(TM.familyState(a, NOW).overdue, false, 'no overdue after arrival');
  });

  // ---- Send queue ----
  function pos(t) { return { id: QR.posId(t), t: t, kind: 'pos', lat: 26.9, lon: -79, sog: 24 }; }
  function ev(id, t, kind) { return { id: id, t: t, kind: kind || 'checkin' }; }
  function ids(list) { return list.map(function (it) { return it.id; }).join(','); }

  check('Queue: item IDs are "p" + time for positions and "e-" + 8 letters for events', function () {
    eq(QR.posId(1700000000123.4), 'p1700000000123');
    ok(/^e-[a-z0-9]{8}$/.test(QR.eventId()), 'event id');
    ok(QR.eventId() !== QR.eventId(), 'event ids differ');
  });
  check('Queue: events go before positions, then the oldest positions first', function () {
    var q = [pos(300), pos(100), ev('e-b', 400), pos(200), ev('e-a', 50, 'overdue')];
    eq(ids(QR.nextBatch(q, 100)), 'e-a,e-b,p100,p200,p300');
  });
  check('Queue: a batch holds at most 100 items, and at least 1', function () {
    var q = [];
    for (var i = 0; i < 150; i++) q.push(pos(1000 + i));
    eq(QR.nextBatch(q, 100).length, 100, 'default');
    eq(QR.nextBatch(q, 500).length, 100, 'never more than 100');
    eq(QR.nextBatch(q, 0).length, 100, 'no size means 100');
    eq(QR.nextBatch(q, 25).length, 25, 'a smaller size');
    eq(QR.nextBatch(q, 25)[0].id, 'p1000', 'oldest first');
  });
  check('Queue: an event the tracker would not accept goes last', function () {
    var q = [ev('e-bad', 10), pos(100), ev('e-ok', 20)];
    eq(ids(QR.nextBatch(q, 100, ['e-bad'])), 'e-ok,p100,e-bad');
  });
  check('Queue: "stored" and "had" remove the item', function () {
    var q = [pos(100), pos(200), ev('e-a', 150)];
    var out = QR.applyResults(q, [{ id: 'p100', r: 'stored' }, { id: 'e-a', r: 'had' }]);
    eq(ids(out.queue), 'p200');
    eq(out.received.join(','), 'p100,e-a');
    eq(out.notAccepted, 0);
  });
  check('Queue: refused as "future" is kept to try again', function () {
    var out = QR.applyResults([pos(100), ev('e-a', 150)],
      [{ id: 'p100', r: 'refused', why: 'future' }, { id: 'e-a', r: 'refused', why: 'future' }]);
    eq(ids(out.queue), 'p100,e-a');
    eq(out.notAccepted, 0);
    eq(out.eventErrors.length, 0, 'not reported as an error');
  });
  check('Queue: a refused position is removed and counted', function () {
    var out = QR.applyResults([pos(100), pos(200)], [{ id: 'p100', r: 'refused', why: 'invalid' }, { id: 'p200', r: 'stored' }]);
    eq(out.queue.length, 0);
    eq(out.notAccepted, 1);
  });
  check('Queue: a refused event is kept and reported', function () {
    var out = QR.applyResults([ev('e-a', 150)], [{ id: 'e-a', r: 'refused', why: 'early' }]);
    eq(ids(out.queue), 'e-a');
    eq(ids(out.eventErrors), 'e-a');
  });
  check('Queue: items added while a request was out are kept', function () {
    // The queue is read again before applying the answer; p300 arrived meanwhile.
    var out = QR.applyResults([pos(100), pos(300)], [{ id: 'p100', r: 'stored' }]);
    eq(ids(out.queue), 'p300');
  });
  check('Queue: a failed request removes nothing', function () {
    var q = [pos(100), ev('e-a', 150)];
    ['network', 'server', 'not_found'].forEach(function (err) {
      var out = QR.applyFailure(q, q, err);
      eq(ids(out.queue), 'p100,e-a', err);
      eq(out.notAccepted, 0, err);
    });
    eq(QR.applyFailure(q, q, 'not_found').notFound, true, 'not_found is reported');
  });
  check('Queue: "too_many" or "bad_request" halves the batch', function () {
    var q = [];
    for (var i = 0; i < 40; i++) q.push(pos(1000 + i));
    var out = QR.applyFailure(q, q, 'too_many');
    eq(out.nextSize, 20);
    eq(out.queue.length, 40, 'nothing removed');
    eq(QR.applyFailure(q, q.slice(0, 3), 'bad_request').nextSize, 1);
  });
  check('Queue: a single position refused on its own is removed; a single event is kept', function () {
    var q = [pos(100), ev('e-a', 150)];
    var a = QR.applyFailure(q, [q[0]], 'bad_request');
    eq(ids(a.queue), 'e-a');
    eq(a.notAccepted, 1);
    var b = QR.applyFailure(q, [q[1]], 'bad_request');
    eq(ids(b.queue), 'p100,e-a');
    eq(ids(b.eventErrors), 'e-a');
  });
  check('Queue: the 3,001st position drops the oldest and keeps events', function () {
    var q = [ev('e-old', 1)];
    for (var i = 0; i < 3000; i++) q.push(pos(1000 + i));
    q = QR.add(q, pos(99999));
    var positions = q.filter(function (it) { return it.kind === 'pos'; });
    eq(positions.length, 3000);
    ok(!q.some(function (it) { return it.id === 'p1000'; }), 'oldest dropped');
    ok(q.some(function (it) { return it.id === 'p99999'; }), 'newest kept');
    ok(q.some(function (it) { return it.id === 'e-old'; }), 'event kept');
  });
  check('Queue: adding an item already queued changes nothing', function () {
    var q = QR.add([pos(100)], pos(100));
    eq(q.length, 1);
  });

  // ---- Run ----
  if (inNode) {
    var test = require('node:test');
    checks.forEach(function (c) { test(c.name, c.fn); });
  } else {
    window.TRIP_CHECKS = checks;
  }
})();
