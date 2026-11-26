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

// ---------- Saved data and the sender (browser only) ----------
// Saved names start with cx:next: on the preview (cx:live: at promote).
var Queue = (typeof window === 'undefined') ? null : (function () {
  'use strict';
  var PREFIX = 'cx:next:';
  var LOG_MAX = 30;
  var TICK_MS = 30e3, NOT_FOUND_MS = 60e3;

  var mem = {};                 // used when the device can't save
  var saveFailed = false;
  var store = {
    get: function (name) {
      try {
        var raw = localStorage.getItem(PREFIX + name);
        if (raw !== null) return JSON.parse(raw);
      } catch (e) {}
      return mem.hasOwnProperty(name) ? mem[name] : null;
    },
    set: function (name, value) {
      mem[name] = value;
      try { localStorage.setItem(PREFIX + name, JSON.stringify(value)); return true; }
      catch (e) { saveFailed = true; emit(); return false; }
    },
    remove: function (name) {
      delete mem[name];
      try { localStorage.removeItem(PREFIX + name); } catch (e) {}
    }
  };

  var tripKey = null;
  var sending = 0;              // items in the request now out
  var size = QueueRules.BATCH_MAX;
  var stuck = [];               // IDs of events the tracker would not accept
  var lastReceivedMs = null, notAccepted = 0, eventError = null, notFound = false;
  var lastError = null, lastNotFoundTry = 0;
  var listeners = [];

  function readQueue() { var q = store.get('queue'); return Array.isArray(q) ? q : []; }
  function writeQueue(q) { store.set('queue', q); }
  function readLog() { var l = store.get('log'); return Array.isArray(l) ? l : []; }

  // Log rows: { id, t, text, state: saved | received | refused, rt }.
  function logAdd(id, t, text) {
    var log = readLog().filter(function (r) { return r.id !== id; });
    log.push({ id: id, t: t, text: text, state: 'saved' });
    store.set('log', log.slice(-LOG_MAX));
  }
  function logMark(idList, state, when) {
    if (!idList.length) return;
    var log = readLog(), changed = false;
    log.forEach(function (r) {
      if (idList.indexOf(r.id) !== -1 && r.state !== 'received') { r.state = state; if (when) r.rt = when; changed = true; }
    });
    if (changed) store.set('log', log);
  }
  function logText(id) {
    var row = readLog().filter(function (r) { return r.id === id; })[0];
    return row ? row.text : null;
  }

  function status() {
    var q = readQueue();
    return {
      waiting: q.length,
      waitingPositions: q.filter(function (it) { return it.kind === 'pos'; }).length,
      sending: sending, lastReceivedMs: lastReceivedMs, notAccepted: notAccepted,
      eventError: eventError, notFound: notFound, saveFailed: saveFailed,
      lastError: lastError, log: readLog()
    };
  }
  function emit() { var s = status(); listeners.forEach(function (fn) { try { fn(s); } catch (e) {} }); }

  // Saved first, then sent.
  function enqueue(item, text) {
    writeQueue(QueueRules.add(readQueue(), item));
    if (text) logAdd(item.id, item.t, text);
    emit();
    sendNow();
  }

  function sendNow() {
    if (sending || !tripKey) return;
    var q = readQueue();
    if (!q.length) return;
    if (notFound && Date.now() - lastNotFoundTry < NOT_FOUND_MS) return;
    var batch = QueueRules.nextBatch(q, size, stuck);
    sending = batch.length;
    emit();
    Tracker.call('/v1/add', { tripKey: tripKey, items: batch }).then(function (res) {
      var cur = readQueue();          // read again: items may have been added meanwhile
      var again = false;
      if (res.ok) {
        var out = QueueRules.applyResults(cur, res.data.results || []);
        writeQueue(out.queue);
        size = QueueRules.BATCH_MAX;
        notFound = false; lastError = null;
        if (out.received.length) {
          lastReceivedMs = Date.now();
          store.set('lastrx', lastReceivedMs);   // kept across a reload (RJ's test, Nov 25)
          logMark(out.received, 'received', lastReceivedMs);
          stuck = stuck.filter(function (id) { return out.received.indexOf(id) === -1; });
        }
        notAccepted += out.notAccepted;
        noteEventErrors(out.eventErrors);
        // More waiting that the tracker hasn't just refused: send the next batch now.
        again = out.received.length > 0 && out.queue.length > 0;
      } else {
        var f = QueueRules.applyFailure(cur, batch, res.error);
        writeQueue(f.queue);
        size = f.nextSize;
        lastError = res.error;
        notAccepted += f.notAccepted;
        noteEventErrors(f.eventErrors);
        if (f.notFound) { notFound = true; lastNotFoundTry = Date.now(); }
        again = (res.error === 'too_many' || res.error === 'bad_request') && f.queue.length > 0 && batch.length > 1;
      }
      sending = 0;
      emit();
      if (again) sendNow();
    });
  }
  function noteEventErrors(list) {
    list.forEach(function (it) {
      if (stuck.indexOf(it.id) === -1) stuck.push(it.id);
      eventError = logText(it.id) || it.kind;
      logMark([it.id], 'refused');
    });
  }

  // After a reload (Safari does this to pages in the background), remember
  // when the tracker last confirmed something, so the status line still says
  // "All sent. Tracker last received …" rather than "Nothing to send yet."
  var savedRx = store.get('lastrx');
  if (typeof savedRx === 'number') lastReceivedMs = savedRx;

  setInterval(function () { if (readQueue().length) sendNow(); }, TICK_MS);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') sendNow(); });
  window.addEventListener('online', sendNow);

  return {
    store: store, enqueue: enqueue, sendNow: sendNow, status: status,
    onStatus: function (fn) { listeners.push(fn); fn(status()); },
    start: function (key) { tripKey = key; notFound = false; sendNow(); },
    clear: function () {
      store.remove('queue'); store.remove('log'); store.remove('lastrx');
      stuck = []; notAccepted = 0; eventError = null; notFound = false; lastReceivedMs = null; lastError = null;
      emit();
    }
  };
})();
