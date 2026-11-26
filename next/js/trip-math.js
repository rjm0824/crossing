// ---------- Trip maths (Live page and family page) ----------
// Calculations only: no screen code, no saved data, reads no other file.
// The route, gate line and arrival rule are passed in by the page.
// Loaded as a plain script (defines the global TripMath) and by Node for tests.
// Planning aid, not for navigation. The captain decides.
var TripMath = (function () {
  'use strict';

  var GATE_NM = 0.247;          // 500 yards
  var GOOD_ACC_M = 200;         // a reading is good at 200 m accuracy or better
  var SPEED_WINDOW_MS = 10 * 60e3;
  var STOPPED_KT = 3;
  var SLOW_SHARE = 0.4;         // under 40% of cruise speed is "slow"
  var QUIET_MS = 20 * 60e3;     // family page: last position older than this is "quiet"
  var LATE_NO_POS_MS = 60 * 60e3;
  var NEAR_DEST_NM = 4;

  var rad = function (d) { return d * Math.PI / 180; };
  var isNum = function (v) { return typeof v === 'number' && isFinite(v); };

  // Great-circle distance in nautical miles. (A copy of nm() in helpers.js,
  // which the family page cannot load; to be merged in Sprint 2.)
  function distNm(a, b) {
    var R = 3440.065, dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    var x = Math.pow(Math.sin(dLat / 2), 2) +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.pow(Math.sin(dLon / 2), 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
  }

  function lineLength(points) {
    var total = 0;
    for (var i = 1; i < points.length; i++) total += distNm(points[i - 1], points[i]);
    return total;
  }

  // The place on the line through the points nearest pos, checking every
  // straight segment (not only the corners). alongNm: distance along the line
  // from its start to that place. offNm: how far pos is from it.
  function alongLine(pos, points) {
    if (!points || points.length === 0) return { alongNm: 0, offNm: 0 };
    if (points.length === 1) return { alongNm: 0, offNm: distNm(pos, points[0]) };
    var best = null, run = 0;
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      var segNm = distNm(a, b);
      // A flat local picture of this segment, in nautical miles.
      var k = Math.cos(rad((a.lat + b.lat) / 2)) * 60;
      var bx = (b.lon - a.lon) * k, by = (b.lat - a.lat) * 60;
      var px = (pos.lon - a.lon) * k, py = (pos.lat - a.lat) * 60;
      var len2 = bx * bx + by * by;
      var t = len2 > 0 ? (px * bx + py * by) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      var foot = { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
      var off = distNm(pos, foot);
      if (!best || off < best.offNm) best = { alongNm: run + segNm * t, offNm: off };
      run += segNm;
    }
    return best;
  }

  function leftNm(pos, points) {
    return Math.max(0, lineLength(points) - alongLine(pos, points).alongNm);
  }

  // A reading is { t, lat, lon, speedKt, accM }.
  function isGood(reading) {
    return !!reading && isNum(reading.lat) && isNum(reading.lon) &&
      isNum(reading.accM) && reading.accM <= GOOD_ACC_M;
  }

  // Average speed (knots) over the last 10 minutes: the GPS speed readings
  // where the device gives them, otherwise worked out from the distance run.
  // Null when there is nothing to go on.
  function avgSpeed(readings, nowMs) {
    var recent = (readings || []).filter(function (r) {
      return r && isNum(r.t) && r.t <= nowMs && nowMs - r.t <= SPEED_WINDOW_MS;
    });
    var given = recent.filter(function (r) { return isNum(r.speedKt); });
    if (given.length) {
      var sum = 0;
      given.forEach(function (r) { sum += r.speedKt; });
      return sum / given.length;
    }
    var placed = recent.filter(function (r) { return isNum(r.lat) && isNum(r.lon); });
    if (placed.length < 2) return null;
    placed.sort(function (x, y) { return x.t - y.t; });
    var hours = (placed[placed.length - 1].t - placed[0].t) / 3600e3;
    if (hours <= 0) return null;
    var run = 0;
    for (var i = 1; i < placed.length; i++) run += distNm(placed[i - 1], placed[i]);
    return run / hours;
  }

  function motion(sogKt, cruiseKt) {
    if (!isNum(sogKt)) return 'unknown';
    if (sogKt < STOPPED_KT) return 'stopped';
    if (isNum(cruiseKt) && sogKt < SLOW_SHARE * cruiseKt) return 'slow';
    return 'underway';
  }

  // Arrival estimate: a time, or null when there is no speed or the boat is
  // stopped ("On hold").
  function etaMs(fromMs, left, sogKt) {
    if (!isNum(fromMs) || !isNum(left) || !isNum(sogKt) || sogKt < STOPPED_KT) return null;
    return Math.round(fromMs + left / sogKt * 3600e3);
  }

  function pastLine(pos, side, lon) {
    return side === 'west' ? pos.lon < lon : pos.lon > lon;
  }

  // Start gate (D1). True only when this reading may be recorded and shared.
  // trip: { status, hideStart, startPoint }. rules.gate: { side, lon }.
  function mayShare(reading, trip, rules) {
    if (!trip || trip.status !== 'underway') return false;
    if (!isGood(reading)) return false;
    if (trip.hideStart === false) return true;
    if (!trip.startPoint) return false;
    if (distNm(reading, trip.startPoint) <= GATE_NM) return false;
    return pastLine(reading, rules.gate.side, rules.gate.lon);
  }

  // Direction guard: is this reading nearer the route's first point than its last?
  function nearerStart(reading, points) {
    return distNm(reading, points[0]) < distNm(reading, points[points.length - 1]);
  }

  // One reading inside the arrival zone: within 500 yards of the arrival
  // point, or past it. The "two readings 5 seconds apart, after the gate has
  // opened" count is kept by live.js.
  function inArrivalZone(reading, rules) {
    var a = rules.arrive;
    if (distNm(reading, a) <= GATE_NM) return true;
    return pastLine(reading, a.pastSide, a.pastLon);
  }

  // Degrees and decimal minutes, for reading aloud: 26° 48.74' N, 079° 27.40' W
  function fmtLatLon(lat, lon) {
    function part(v, width, pos, neg) {
      var a = Math.abs(v), d = Math.floor(a);
      var m = Math.round((a - d) * 6000) / 100;
      if (m >= 60) { d += 1; m = 0; }
      var ds = String(d);
      while (ds.length < width) ds = '0' + ds;
      var ms = m.toFixed(2);
      if (m < 10) ms = '0' + ms;
      return ds + '° ' + ms + "' " + (v < 0 ? neg : pos);
    }
    return part(lat, 2, 'N', 'S') + ', ' + part(lon, 3, 'E', 'W');
  }

  // What the family page should show. read is the last good Read answer the
  // page holds, plus error (the service's word, 'network', or 'nokey') when
  // the latest read failed. nowMs is in service time.
  // state: badlink, unavailable, closed, arrived, stopped, started, underway, quiet.
  // unavailable is also true when the latest read failed but older data is shown.
  function familyState(read, nowMs) {
    var out = {
      state: 'badlink', overdue: false, unavailable: false,
      leftNm: null, etaMs: null, etaPast: false, ageMs: null,
      sogKt: null, motion: 'unknown', nearDest: false,
      sinceStartMs: null, noPosLate: false
    };
    if (!read || read.error === 'not_found' || read.error === 'nokey') return out;
    out.unavailable = !!read.error;
    if (!read.status) { out.state = 'unavailable'; return out; }
    if (read.status === 'closed' || read.status === 'arrived' || read.status === 'stopped') {
      out.state = read.status;
      return out;
    }
    out.overdue = read.overdue === true || (isNum(read.overdueAt) && nowMs > read.overdueAt);
    if (isNum(read.startedAt)) out.sinceStartMs = nowMs - read.startedAt;
    var last = read.last;
    if (!last || !isNum(last.lat) || !isNum(last.lon)) {
      out.state = 'started';
      out.noPosLate = isNum(out.sinceStartMs) && out.sinceStartMs > LATE_NO_POS_MS;
      return out;
    }
    var route = read.route || {};
    var points = route.points || [];
    out.leftNm = points.length ? leftNm(last, points) : null;
    out.sogKt = isNum(last.sog) ? last.sog : null;
    out.motion = motion(out.sogKt, route.cruiseKt);
    out.etaMs = etaMs(last.t, out.leftNm, out.sogKt);
    out.etaPast = out.etaMs !== null && out.etaMs < nowMs;
    out.ageMs = isNum(last.t) ? nowMs - last.t : null;
    out.nearDest = out.leftNm !== null && out.leftNm <= NEAR_DEST_NM;
    out.state = out.ageMs !== null && out.ageMs > QUIET_MS ? 'quiet' : 'underway';
    return out;
  }

  return {
    GATE_NM: GATE_NM, QUIET_MS: QUIET_MS,
    distNm: distNm, lineLength: lineLength, alongLine: alongLine, leftNm: leftNm,
    isGood: isGood, avgSpeed: avgSpeed, motion: motion, etaMs: etaMs,
    mayShare: mayShare, nearerStart: nearerStart, inArrivalZone: inArrivalZone,
    fmtLatLon: fmtLatLon, familyState: familyState
  };
})();
if (typeof module !== 'undefined') module.exports = TripMath;
