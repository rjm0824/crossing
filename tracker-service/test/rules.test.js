import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanText, validateStart, checkItem, applyItems, shapeRead,
  capAllows, cleanupCutoffs, utcDay, MINUTE, HOUR, DAY,
} from '../src/rules.js';

const NOW = Date.UTC(2026, 10, 25, 14, 0, 0);

function startBody(over = {}) {
  return {
    invite: 'not-checked-here',
    boat: "Goof n' Off",
    captain: 'RJ',
    route: {
      name: 'West Palm to Green Turtle',
      points: [
        { name: 'Lake Worth Inlet', lat: 26.77, lon: -80.03 },
        { name: 'Green Turtle', lat: 26.76, lon: -77.33 },
      ],
      dest: 'Green Turtle',
      cruiseKt: 26,
    },
    plannedArrival: NOW + 6 * HOUR,
    overdueAt: NOW + 8 * HOUR,
    ...over,
  };
}

function trip(over = {}) {
  return {
    id: 1, boat: "Goof n' Off", captain: 'RJ',
    route_json: JSON.stringify({ name: 'R', points: [], dest: 'Green Turtle' }),
    planned_arrival: NOW + 6 * HOUR, overdue_at: NOW + 8 * HOUR, overdue_set_t: 0,
    status: 'underway', state_t: 0, started_at: NOW - HOUR,
    ended_at: null, end_learned_at: null, last_json: null, last_t: 0,
    last_activity: NOW - HOUR, item_count: 0,
    ...over,
  };
}

const pos = (id, t, extra = {}) => ({ id, t, kind: 'pos', lat: 26.7, lon: -79.9, ...extra });
const ev = (id, t, kind, extra = {}) => ({ id, t, kind, ...extra });
const rowOf = (item, tr = trip()) => {
  const c = checkItem(item, tr, NOW);
  assert.ok(c.ok, `expected ${item.id} accepted, got ${c.refused}`);
  return c.row;
};

describe('cleanText', () => {
  test('keeps ordinary text', () => assert.equal(cleanText("Goof n' Off", 40), "Goof n' Off"));
  test('removes control and direction characters', () =>
    assert.equal(cleanText('Bo\u0007at‮⁦ X', 40), 'Boat X'));
  test('cuts to the limit in characters a person would count', () => {
    assert.equal(cleanText('🐟🐟🐟🐟', 3), '🐟🐟🐟');
    assert.equal(cleanText('a'.repeat(50), 40).length, 40);
  });
  test('empty after cleaning is null', () => {
    assert.equal(cleanText('\u0000 ‏', 40), null);
    assert.equal(cleanText(42, 40), null);
  });
});

describe('validateStart', () => {
  test('accepts a good body', () => {
    const v = validateStart(startBody(), NOW);
    assert.equal(v.ok, true);
    assert.equal(v.fields.boat, "Goof n' Off");
    assert.equal(JSON.parse(v.fields.route_json).cruiseKt, 26);
  });
  test('accepts a route without cruiseKt', () => {
    const b = startBody(); delete b.route.cruiseKt;
    assert.equal(validateStart(b, NOW).ok, true);
  });
  const bad = (name, body) => test(`refuses ${name}`, () =>
    assert.deepEqual(validateStart(body, NOW), { error: 'bad_request' }));
  bad('a body that is not an object', null);
  bad('an empty boat name', startBody({ boat: '\u0000' }));
  bad('a missing first name', startBody({ captain: undefined }));
  bad('an empty route name', startBody({ route: { ...startBody().route, name: ' ' } }));
  bad('an empty destination', startBody({ route: { ...startBody().route, dest: '' } }));
  bad('an empty point name', startBody({ route: { ...startBody().route,
    points: [{ name: '', lat: 1, lon: 1 }, { name: 'B', lat: 1, lon: 1 }] } }));
  bad('a route with 1 point', startBody({ route: { ...startBody().route,
    points: [{ name: 'A', lat: 1, lon: 1 }] } }));
  bad('a route with 31 points', startBody({ route: { ...startBody().route,
    points: Array.from({ length: 31 }, (_, i) => ({ name: 'P' + i, lat: 1, lon: 1 })) } }));
  bad('latitude out of range', startBody({ route: { ...startBody().route,
    points: [{ name: 'A', lat: 91, lon: 1 }, { name: 'B', lat: 1, lon: 1 }] } }));
  bad('longitude out of range', startBody({ route: { ...startBody().route,
    points: [{ name: 'A', lat: 1, lon: -181 }, { name: 'B', lat: 1, lon: 1 }] } }));
  bad('cruiseKt out of range', startBody({ route: { ...startBody().route, cruiseKt: 71 } }));
  bad('planned arrival in the past', startBody({ plannedArrival: NOW - 1 }));
  bad('overdue more than 14 days ahead', startBody({ overdueAt: NOW + 15 * DAY }));
  bad('overdue earlier than planned arrival', startBody({ overdueAt: NOW + 5 * HOUR }));
  bad('a time that is not a whole number', startBody({ plannedArrival: NOW + 1.5 }));
  test('a route with 30 points is fine', () => {
    const b = startBody({ route: { ...startBody().route,
      points: Array.from({ length: 30 }, (_, i) => ({ name: 'P' + i, lat: 1, lon: 1 })) } });
    assert.equal(validateStart(b, NOW).ok, true);
  });
});

describe('checkItem', () => {
  const tr = trip();
  test('accepts a position with speed and battery', () => {
    const c = checkItem(pos('p1', NOW, { sog: 24.5, bat: 76 }), tr, NOW);
    assert.equal(c.ok, true);
    assert.equal(c.row.sog, 24.5);
    assert.equal(c.row.bat, 76);
  });
  test('accepts a check-in, a waypoint, overdue, ended and resumed', () => {
    for (const it of [ev('e1', NOW, 'checkin'), ev('e2', NOW, 'waypoint', { label: 'Memory Rock' }),
      ev('e3', NOW, 'overdue', { value: NOW + HOUR }), ev('e4', NOW, 'ended', { value: 'arrived' }),
      ev('e5', NOW, 'resumed')]) {
      assert.equal(checkItem(it, tr, NOW).ok, true, it.kind);
    }
  });
  test('ignores fields not listed for a kind', () => {
    const c = checkItem(ev('e1', NOW, 'checkin', { lat: 5, label: 'x' }), tr, NOW);
    assert.equal(c.row.lat, null);
    assert.equal(c.row.label, null);
  });
  const refused = (name, item, why, id = item && item.id) => test(`refuses ${name}`, () =>
    assert.deepEqual(checkItem(item, tr, NOW), { id: id ?? null, refused: why }));
  refused('an entry that is not an object', 'x', 'invalid', null);
  refused('an entry with no id', { t: NOW, kind: 'checkin' }, 'invalid', null);
  refused('an id with a space', ev('a b', NOW, 'checkin'), 'invalid', null);
  refused('an id over 40 characters', ev('a'.repeat(41), NOW, 'checkin'), 'invalid', null);
  refused('an unknown kind', ev('e1', NOW, 'party'), 'invalid');
  refused('a time that is not whole', ev('e1', NOW + 0.5, 'checkin'), 'invalid');
  refused('a position without latitude', { id: 'p1', t: NOW, kind: 'pos', lon: 1 }, 'invalid');
  refused('a position off the map', pos('p1', NOW, { lat: 95 }), 'invalid');
  refused('speed over 100', pos('p1', NOW, { sog: 101 }), 'invalid');
  refused('battery over 100', pos('p1', NOW, { bat: 101 }), 'invalid');
  refused('battery not whole', pos('p1', NOW, { bat: 50.5 }), 'invalid');
  refused('a waypoint without a label', ev('e1', NOW, 'waypoint'), 'invalid');
  refused('overdue before the trip started', ev('e1', NOW, 'overdue', { value: tr.started_at - 1 }), 'invalid');
  refused('overdue more than 14 days ahead', ev('e1', NOW, 'overdue', { value: NOW + 15 * DAY }), 'invalid');
  refused('ended with an unknown value', ev('e1', NOW, 'ended', { value: 'sank' }), 'invalid');
  refused('a time over 10 minutes ahead', ev('e1', NOW + 11 * MINUTE, 'checkin'), 'future');
  refused('a time over 10 minutes before the start', ev('e1', tr.started_at - 11 * MINUTE, 'checkin'), 'early');
  test('accepts times just inside the 10-minute limits', () => {
    assert.equal(checkItem(ev('e1', NOW + 9 * MINUTE, 'checkin'), tr, NOW).ok, true);
    assert.equal(checkItem(ev('e1', tr.started_at - 9 * MINUTE, 'checkin'), tr, NOW).ok, true);
  });
  test('a full trip refuses positions, check-ins and waypoints', () => {
    const full = trip({ item_count: 5000 });
    assert.equal(checkItem(pos('p1', NOW), full, NOW).refused, 'full');
    assert.equal(checkItem(ev('e1', NOW, 'checkin'), full, NOW).refused, 'full');
    assert.equal(checkItem(ev('e2', NOW, 'waypoint', { label: 'X' }), full, NOW).refused, 'full');
  });
  test('a full trip still accepts ended, resumed and overdue', () => {
    const full = trip({ item_count: 5000 });
    assert.equal(checkItem(ev('e1', NOW, 'ended', { value: 'arrived' }), full, NOW).ok, true);
    assert.equal(checkItem(ev('e2', NOW, 'resumed'), full, NOW).ok, true);
    assert.equal(checkItem(ev('e3', NOW, 'overdue', { value: NOW + HOUR }), full, NOW).ok, true);
  });
  test('a trip at 4,999 items still accepts a position', () =>
    assert.equal(checkItem(pos('p1', NOW), trip({ item_count: 4999 }), NOW).ok, true));
});

describe('applyItems', () => {
  test('the newest position by device time becomes last, whatever the order', () => {
    const tr = trip();
    const rows = [rowOf(pos('a', NOW - 5 * MINUTE, { sog: 20 })), rowOf(pos('b', NOW - 20 * MINUTE))];
    const a = applyItems(tr, rows, NOW, 2);
    assert.equal(a.lastT, NOW - 5 * MINUTE);
    assert.deepEqual(JSON.parse(a.lastJson), { t: NOW - 5 * MINUTE, lat: 26.7, lon: -79.9, sog: 20 });
    assert.equal(a.next.item_count, 2);
    assert.equal(a.next.last_activity, NOW);
  });
  test('an older position does not replace a newer last position', () => {
    const tr = trip({ last_t: NOW - MINUTE, last_json: '{"t":1}' });
    const a = applyItems(tr, [rowOf(pos('a', NOW - 10 * MINUTE))], NOW, 1);
    assert.equal(a.lastT, 0);
    assert.equal(a.next.last_json, '{"t":1}');
  });
  test('a late "ended" sets the end time in the past and the window from now', () => {
    const ended = NOW - 2 * HOUR - 22 * MINUTE; // arrived 1:48, learned 4:10
    const tr = trip({ started_at: NOW - 8 * HOUR });
    const a = applyItems(tr, [rowOf(ev('e1', ended, 'ended', { value: 'arrived' }), tr)], NOW, 1);
    assert.equal(a.status, 'arrived');
    assert.equal(a.endedAt, ended);
    assert.equal(a.endLearnedAt, NOW);
    assert.equal(a.stateT, ended);
  });
  test('a second "ended" does not restart the 2-hour window', () => {
    const learned = NOW - HOUR;
    const tr = trip({ status: 'arrived', state_t: NOW - 70 * MINUTE, ended_at: NOW - 70 * MINUTE, end_learned_at: learned });
    const a = applyItems(tr, [rowOf(ev('e2', NOW - 30 * MINUTE, 'ended', { value: 'stopped' }), tr)], NOW, 1);
    assert.equal(a.endLearnedAt, learned);
    assert.equal(a.status, 'stopped');
  });
  test('"resumed" after "ended" reopens the trip', () => {
    const tr = trip({ status: 'arrived', state_t: NOW - 30 * MINUTE, ended_at: NOW - 30 * MINUTE, end_learned_at: NOW - 20 * MINUTE });
    const a = applyItems(tr, [rowOf(ev('r1', NOW - 10 * MINUTE, 'resumed'), tr)], NOW, 1);
    assert.equal(a.status, 'underway');
    assert.equal(a.endedAt, null);
    assert.equal(a.endLearnedAt, null);
  });
  test('"resumed" older than the "ended" changes nothing', () => {
    const tr = trip({ status: 'arrived', state_t: NOW - 10 * MINUTE, ended_at: NOW - 10 * MINUTE, end_learned_at: NOW - 5 * MINUTE });
    const a = applyItems(tr, [rowOf(ev('r1', NOW - 30 * MINUTE, 'resumed'), tr)], NOW, 1);
    assert.equal(a.stateT, 0);
    assert.equal(a.next.status, 'arrived');
  });
  test('an older "overdue" arriving after a newer one changes nothing', () => {
    const tr = trip({ overdue_set_t: NOW - 10 * MINUTE, overdue_at: NOW + 9 * HOUR });
    const a = applyItems(tr, [rowOf(ev('o1', NOW - 20 * MINUTE, 'overdue', { value: NOW + 3 * HOUR }), tr)], NOW, 1);
    assert.equal(a.overdueT, 0);
    assert.equal(a.next.overdue_at, NOW + 9 * HOUR);
  });
  test('a newer "overdue" changes the overdue time', () => {
    const tr = trip();
    const a = applyItems(tr, [rowOf(ev('o1', NOW, 'overdue', { value: NOW + 3 * HOUR }), tr)], NOW, 1);
    assert.equal(a.overdueT, NOW);
    assert.equal(a.overdueAt, NOW + 3 * HOUR);
  });
  test('an event with the same device time as the one applied changes nothing', () => {
    const tr = trip({ status: 'arrived', state_t: NOW - MINUTE, ended_at: NOW - MINUTE, end_learned_at: NOW });
    const a = applyItems(tr, [rowOf(ev('r1', NOW - MINUTE, 'resumed'), tr)], NOW, 1);
    assert.equal(a.stateT, 0);
  });
  test('events in one batch apply by device time, then batch order', () => {
    const tr = trip();
    // Arrives out of order: resumed (later) first, ended (earlier) second.
    const rows = [rowOf(ev('r1', NOW - 5 * MINUTE, 'resumed')), rowOf(ev('e1', NOW - 10 * MINUTE, 'ended', { value: 'arrived' }))];
    assert.equal(applyItems(tr, rows, NOW, 2).status, 'underway');
    // Same time: the first in the batch wins.
    const tie = [rowOf(ev('e1', NOW - 5 * MINUTE, 'ended', { value: 'arrived' })), rowOf(ev('e2', NOW - 5 * MINUTE, 'ended', { value: 'stopped' }))];
    assert.equal(applyItems(tr, tie, NOW, 2).status, 'arrived');
  });
  test('positions and check-ins on an ended trip do not change its status', () => {
    const tr = trip({ status: 'stopped', state_t: NOW - HOUR, ended_at: NOW - HOUR, end_learned_at: NOW - HOUR });
    const a = applyItems(tr, [rowOf(pos('p9', NOW), tr), rowOf(ev('c9', NOW, 'checkin'), tr)], NOW, 2);
    assert.equal(a.stateT, 0);
    assert.equal(a.next.status, 'stopped');
  });
  test('a repeated batch (nothing new stored) still repairs state', () => {
    const tr = trip();
    const a = applyItems(tr, [rowOf(ev('e1', NOW, 'ended', { value: 'arrived' }))], NOW, 0);
    assert.equal(a.addCount, 0);
    assert.equal(a.status, 'arrived');
  });
});

describe('shapeRead', () => {
  test('underway answer carries the trail, last and poll time', () => {
    const tr = trip({ last_json: '{"t":5,"lat":1,"lon":2}' });
    const items = [{ seq: 413, t: 5, kind: 'pos', lat: 1, lon: 2, sog: null, bat: null, value: null, label: null },
      { seq: 414, t: 6, kind: 'overdue', lat: null, lon: null, sog: null, bat: null, value: '123', label: null }];
    const r = shapeRead(tr, items, NOW, 30);
    assert.equal(r.status, 'underway');
    assert.equal(r.overdue, false);
    assert.deepEqual(r.items[0], { seq: 413, t: 5, kind: 'pos', lat: 1, lon: 2 });
    assert.deepEqual(r.items[1], { seq: 414, t: 6, kind: 'overdue', value: 123 });
    assert.deepEqual(r.last, { t: 5, lat: 1, lon: 2 });
    assert.equal(r.more, false);
    assert.equal(r.pollSeconds, 30);
    assert.equal(r.now, NOW);
  });
  test('last is null before any position', () => assert.equal(shapeRead(trip(), [], NOW, 30).last, null));
  test('more is true past 500 items, and only 500 are returned', () => {
    const items = Array.from({ length: 501 }, (_, i) => ({ seq: i + 1, t: 1, kind: 'checkin' }));
    const r = shapeRead(trip(), items, NOW, 30);
    assert.equal(r.items.length, 500);
    assert.equal(r.more, true);
  });
  test('a silent trip three days past its overdue time still returns last and overdue', () => {
    const tr = trip({ overdue_at: NOW - 3 * DAY, last_t: NOW - 3 * DAY - HOUR,
      last_json: JSON.stringify({ t: NOW - 3 * DAY - HOUR, lat: 26.71, lon: -78.95 }) });
    const r = shapeRead(tr, [], NOW, 30);
    assert.equal(r.overdue, true);
    assert.equal(r.last.lat, 26.71);
    assert.deepEqual(r.items, []);
  });
  test('within 2 hours of learning of the end: no positions or route', () => {
    const tr = trip({ status: 'arrived', ended_at: NOW - 3 * HOUR, end_learned_at: NOW - 119 * MINUTE,
      last_json: '{"t":1,"lat":1,"lon":1}' });
    const r = shapeRead(tr, [], NOW, 30);
    assert.deepEqual(r, { status: 'arrived', boat: "Goof n' Off", captain: 'RJ', dest: 'Green Turtle',
      endedAt: NOW - 3 * HOUR, now: NOW, pollSeconds: 300 });
  });
  test('after 2 hours it is closed', () => {
    const tr = trip({ status: 'stopped', ended_at: NOW - 3 * HOUR, end_learned_at: NOW - 2 * HOUR });
    assert.deepEqual(shapeRead(tr, [], NOW, 30), { status: 'closed' });
  });
});

describe('capAllows', () => {
  test('the 50th start is allowed', () => assert.equal(capAllows(50, 50), true));
  test('the 51st start is refused', () => assert.equal(capAllows(51, 50), false));
});

describe('cleanupCutoffs', () => {
  test('7 days, 30 days and the UTC date 7 days ago', () => {
    const c = cleanupCutoffs(NOW);
    assert.equal(c.endedBefore, NOW - 7 * DAY);
    assert.equal(c.idleBefore, NOW - 30 * DAY);
    assert.equal(c.countersBefore, '2026-11-18');
  });
  test('a trip ended 8 days ago is past the cut-off; 6 days ago is not', () => {
    const c = cleanupCutoffs(NOW);
    assert.ok(NOW - 8 * DAY < c.endedBefore);
    assert.ok(!(NOW - 6 * DAY < c.endedBefore));
  });
  test('utcDay uses UTC, not local time', () =>
    assert.equal(utcDay(Date.UTC(2026, 10, 19, 23, 30)), '2026-11-19'));
});
