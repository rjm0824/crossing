// ---------- Send queue (Live page) ----------
// Every item is saved on the device first, then sent. Nothing leaves the
// queue until the tracker has answered "stored" or "had" for it.
// QueueRules: the pure decisions (no saved data, no network), loaded by Node for tests.
var QueueRules = (function () {
  'use strict';

  var BATCH_MAX = 100;          // the tracker takes 1 to 100 items per request
  var MAX_POSITIONS = 3000;     // ten days at one every 5 minutes

  var isEvent = function (item) { return item.kind !== 'pos'; };
  var byTime = function (a, b) { return a.t - b.t; };

  // Item IDs. Positions: "p" + time. Events: "e-" + 8 random letters and digits.
  function posId(t) { return 'p' + Math.round(t); }
  function eventId(random) {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789', s = '';
    var rnd = random || Math.random;
    for (var i = 0; i < 8; i++) s += chars[Math.floor(rnd() * chars.length)];
    return 'e-' + s;
  }

  // What goes in the next request: events first, then the oldest positions,
  // up to size. Events the tracker would not accept (stuck: a list of IDs)
  // go last, so one bad event can never hold up the positions behind it.
  function nextBatch(queue, size, stuck) {
    var n = Math.max(1, Math.min(BATCH_MAX, size || BATCH_MAX));
    var isStuck = function (it) { return !!stuck && stuck.indexOf(it.id) !== -1; };
    var events = queue.filter(function (it) { return isEvent(it) && !isStuck(it); }).sort(byTime);
    var positions = queue.filter(function (it) { return !isEvent(it); }).sort(byTime);
    var held = queue.filter(function (it) { return isEvent(it) && isStuck(it); }).sort(byTime);
    return events.concat(positions, held).slice(0, n);
  }

  // Apply the tracker's per-item answers ({ id, r, why }) to the queue as it
  // is now (read again just before, so a second tab's items are not lost).
  // Returns { queue, received: [ids], notAccepted: count, eventErrors: [items] }.
  function applyResults(queue, results) {
    var byId = {};
    (results || []).forEach(function (res) { if (res && res.id) byId[res.id] = res; });
    var out = { queue: [], received: [], notAccepted: 0, eventErrors: [] };
    queue.forEach(function (it) {
      var res = byId[it.id];
      if (!res) { out.queue.push(it); return; }                  // not in this request
      if (res.r === 'stored' || res.r === 'had') { out.received.push(it.id); return; }
      if (res.r === 'refused' && res.why === 'future') { out.queue.push(it); return; } // retry
      if (!isEvent(it)) { out.notAccepted++; return; }           // a refused position is dropped
      out.queue.push(it);                                        // a refused event is kept
      out.eventErrors.push(it);
    });
    return out;
  }

  // The whole request failed. error: the tracker's word, or 'network'.
  // Returns { queue, nextSize, notAccepted, eventErrors, notFound }.
  // Nothing is removed unless the tracker refused a single position on its own.
  function applyFailure(queue, batch, error) {
    var out = { queue: queue.slice(), nextSize: BATCH_MAX, notAccepted: 0, eventErrors: [], notFound: false };
    if (error === 'not_found') { out.notFound = true; return out; }
    if (error !== 'too_many' && error !== 'bad_request') return out; // network, time-out, server: try again later
    if (batch.length > 1) { out.nextSize = Math.floor(batch.length / 2); return out; }
    var only = batch[0];
    if (!only) return out;
    if (isEvent(only)) { out.eventErrors.push(only); return out; }
    out.queue = queue.filter(function (it) { return it.id !== only.id; });
    out.notAccepted = 1;
    return out;
  }

  // Past 3,000 positions the oldest are dropped. Events are never dropped.
  function cap(queue) {
    var positions = queue.filter(function (it) { return !isEvent(it); });
    if (positions.length <= MAX_POSITIONS) return queue;
    var drop = {};
    positions.sort(byTime).slice(0, positions.length - MAX_POSITIONS)
      .forEach(function (it) { drop[it.id] = true; });
    return queue.filter(function (it) { return !drop[it.id]; });
  }

  // Add an item unless one with the same ID is already queued.
  function add(queue, item) {
    for (var i = 0; i < queue.length; i++) if (queue[i].id === item.id) return queue;
    return cap(queue.concat([item]));
  }

  return {
    BATCH_MAX: BATCH_MAX, MAX_POSITIONS: MAX_POSITIONS,
    isEvent: isEvent, posId: posId, eventId: eventId,
    nextBatch: nextBatch, applyResults: applyResults, applyFailure: applyFailure,
    cap: cap, add: add
  };
})();
if (typeof module !== 'undefined') module.exports = QueueRules;
