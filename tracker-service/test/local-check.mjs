// End-to-end check against the service running locally (`npx wrangler dev --test-scheduled`).
// Run from tracker-service/:  TRACKER_URL=http://localhost:8787 INVITE_CODE=... node test/local-check.mjs
// Needs .dev.vars with DAILY_TRIP_CAP=3 and DEBUG_META=1. Not run by RJ.

import { execFileSync } from 'node:child_process';

const URL_ = (process.env.TRACKER_URL || '').replace(/\/$/, '');
const INVITE = process.env.INVITE_CODE || '';
if (!URL_ || !INVITE) {
  console.error('Set TRACKER_URL and INVITE_CODE.');
  process.exit(2);
}

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : '  -> ' + JSON.stringify(detail)}`);
  if (!ok) failures++;
}

async function call(path, body, method = 'POST') {
  const res = await fetch(URL_ + path, {
    method,
    headers: { 'Content-Type': 'text/plain', Origin: 'http://localhost:8788' },
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json, cors: res.headers.get('Access-Control-Allow-Origin') };
}

function sql(command) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--local', '--json', '--command', command],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  return JSON.parse(out)[0].results;
}

const HOUR = 3600 * 1000;
const route = {
  name: 'West Palm to Green Turtle',
  points: [{ name: 'Lake Worth Inlet', lat: 26.77, lon: -80.03 }, { name: 'Green Turtle', lat: 26.76, lon: -77.33 }],
  dest: 'Green Turtle', cruiseKt: 26,
};
function startBody(over = {}) {
  const now = Date.now();
  return { invite: INVITE, boat: "Goof n' Off", captain: 'RJ', route,
    plannedArrival: now + 6 * HOUR, overdueAt: now + 8 * HOUR, ...over };
}
const pos = (id, t, lat = 26.7712, lon = -79.9841) => ({ id, t, kind: 'pos', lat, lon, sog: 24.5, bat: 76 });

sql('DELETE FROM counters');

// Errors and the start gate.
let r = await call('/v1/start', startBody({ invite: 'wrong-code-123456' }));
check('wrong invite code gets 401 invite', r.status === 401 && r.json.error === 'invite', r);
r = await call('/v1/start', '{not json');
check('bad JSON gets 400 bad_request', r.status === 400 && r.json.error === 'bad_request', r);
r = await call('/v1/start', 'x'.repeat(70 * 1024));
check('a body over 64 KB gets 400 bad_request', r.status === 400 && r.json.error === 'bad_request', r);
r = await call('/v1/read', null, 'GET');
check('GET gets 404 not_found', r.status === 404 && r.json.error === 'not_found', r);
r = await call('/v1/nothing', {});
check('unknown address gets 404 not_found', r.status === 404, r);
check('errors carry the permission header', r.cors === 'http://localhost:8788', r.cors);

// CUJ 1: start.
r = await call('/v1/start', startBody());
check('start returns a trip key and a family key', r.status === 200 && /^[0-9a-f]{32}$/.test(r.json.tripKey)
  && /^[0-9a-f]{32}$/.test(r.json.familyKey), r);
const { tripKey, startedAt } = r.json;
let familyKey = r.json.familyKey;

// CUJ 4: first read.
r = await call('/v1/read', { familyKey });
check('first read: underway, no position yet', r.json.status === 'underway' && r.json.last === null
  && r.json.items.length === 0 && r.json.pollSeconds === 30 && r.json.route.cruiseKt === 26, r.json);

// CUJ 2: one position.
r = await call('/v1/add', { tripKey, items: [pos('p0', startedAt + 1000)] });
check('one position is stored', r.json.results[0].r === 'stored' && r.json.status === 'underway', r.json);
r = await call('/v1/read', { familyKey });
check('read returns the position', r.json.items.length === 1 && r.json.items[0].kind === 'pos'
  && r.json.last.t === startedAt + 1000 && !('id' in r.json.items[0]), r.json);
let seen = r.json.items.at(-1).seq;

// CUJ 3: a batch after a gap, sent twice.
const batch = [];
for (let i = 1; i <= 40; i++) batch.push(pos('p' + i, startedAt + 1000 + i * 1000, 26.77 - i * 0.001));
batch.push({ id: 'c1', t: startedAt + 50000, kind: 'checkin' });
r = await call('/v1/add', { tripKey, items: batch });
check('batch of 41: all stored', r.json.results.every((x) => x.r === 'stored'), r.json.results.filter((x) => x.r !== 'stored'));
r = await call('/v1/add', { tripKey, items: batch });
check('same batch again: all had', r.json.results.every((x) => x.r === 'had'), r.json.results.filter((x) => x.r !== 'had'));
r = await call('/v1/read', { familyKey, after: seen });
check('reader gets exactly the 41 new items', r.json.items.length === 41 && r.json.more === false, r.json.items.length);
check('last is the newest position by device time', r.json.last.t === startedAt + 41000, r.json.last);
seen = r.json.items.at(-1).seq;

// Late-dated position reaches a reader that already holds later items.
r = await call('/v1/add', { tripKey, items: [pos('late1', startedAt - 5 * 60 * 1000)] });
check('late-dated position is stored', r.json.results[0].r === 'stored', r.json);
r = await call('/v1/read', { familyKey, after: seen });
check('reader with an older sequence number receives the late item', r.json.items.length === 1
  && r.json.items[0].t === startedAt - 5 * 60 * 1000, r.json.items);
check('a late item does not replace the last position', r.json.last.t === startedAt + 41000, r.json.last);
seen = r.json.items.at(-1).seq;

// Incremental read with nothing new: rows read.
r = await call('/v1/read', { familyKey, after: seen });
check('incremental read with nothing new returns no items', r.json.items.length === 0, r.json);
console.log(`      rows read for an incremental read: ${r.json.debug?.rowsRead}`);

// Refusals inside a batch.
r = await call('/v1/add', { tripKey, items: [
  { id: 'f1', t: Date.now() + 20 * 60 * 1000, kind: 'checkin' },
  { id: 'e1', t: startedAt - 20 * 60 * 1000, kind: 'checkin' },
  { id: 'bad pos', t: startedAt, kind: 'pos' },
  'nonsense',
  { id: 'w1', t: startedAt + 2000, kind: 'waypoint', label: 'Memory Rock' },
  { id: 'w1', t: startedAt + 2000, kind: 'waypoint', label: 'Memory Rock' },
] });
const rs = r.json.results;
check('future, early, invalid, duplicate handled per item', rs[0].why === 'future' && rs[1].why === 'early'
  && rs[2].why === 'invalid' && rs[2].id === null && rs[3].id === null && rs[4].r === 'stored' && rs[5].r === 'had', rs);
r = await call('/v1/add', { tripKey, items: [] });
check('empty items gets bad_request', r.status === 400 && r.json.error === 'bad_request', r);
r = await call('/v1/add', { tripKey, items: Array.from({ length: 101 }, (_, i) => pos('x' + i, startedAt)) });
check('101 items gets too_many', r.status === 400 && r.json.error === 'too_many', r);

// 100-item batch (Q1: processing time is measured on the published copy).
const hundred = Array.from({ length: 100 }, (_, i) => pos('h' + i, startedAt + 60000 + i * 100));
const t0 = performance.now();
r = await call('/v1/add', { tripKey, items: hundred });
const ms = performance.now() - t0;
check('100-item batch: all stored', r.json.results.every((x) => x.r === 'stored'), r.json);
console.log(`      100-item batch: ${ms.toFixed(0)} ms wall time locally, rows written ${r.json.debug?.rowsWritten}`);
r = await call('/v1/read', { familyKey, after: seen });
seen = r.json.items.at(-1).seq;

// CUJ 5: overdue.
r = await call('/v1/add', { tripKey, items: [{ id: 'od1', t: startedAt + 3000, kind: 'overdue', value: startedAt }] });
r = await call('/v1/read', { familyKey, after: seen });
check('overdue time passed: overdue is true and last is kept', r.json.overdue === true && r.json.last !== null
  && r.json.items.at(-1).value === startedAt, r.json);
r = await call('/v1/add', { tripKey, items: [{ id: 'od0', t: startedAt + 2500, kind: 'overdue', value: startedAt + 9 * HOUR }] });
r = await call('/v1/read', { familyKey, after: seen });
check('an older overdue change arriving later changes nothing', r.json.overdueAt === startedAt, r.json.overdueAt);

// CUJ 6: ended, reported late.
r = await call('/v1/add', { tripKey, items: [{ id: 'end1', t: startedAt + 4000, kind: 'ended', value: 'arrived' }] });
check('ended: add answer says arrived', r.json.status === 'arrived', r.json);
r = await call('/v1/read', { familyKey });
check('read after end: arrived, end time, no positions or route', r.json.status === 'arrived'
  && r.json.endedAt === startedAt + 4000 && r.json.dest === 'Green Turtle' && !('items' in r.json)
  && !('route' in r.json) && !('last' in r.json) && r.json.pollSeconds === 300, r.json);
r = await call('/v1/add', { tripKey, items: [{ id: 'res1', t: startedAt + 5000, kind: 'resumed' }] });
check('resumed after ended reopens the trip', r.json.status === 'underway', r.json);
r = await call('/v1/add', { tripKey, items: [{ id: 'end2', t: startedAt + 6000, kind: 'ended', value: 'arrived' }] });
const thTrip = (await import('../src/keys.js')).hashKey;
const tkHash = await thTrip(tripKey);
sql(`UPDATE trips SET end_learned_at = end_learned_at - ${2 * HOUR + 1000} WHERE trip_key_hash = '${tkHash}'`);
r = await call('/v1/read', { familyKey });
check('more than 2 hours after learning of the end: closed', JSON.stringify(Object.keys(r.json).filter((k) => k !== 'debug')) === '["status"]'
  && r.json.status === 'closed', r.json);

// CUJ 7: replace the family link.
r = await call('/v1/new-link', { tripKey });
const newFamily = r.json.familyKey;
check('new link returns a different family key', /^[0-9a-f]{32}$/.test(newFamily) && newFamily !== familyKey, r.json);
r = await call('/v1/read', { familyKey });
check('old family key gets 404 not_found', r.status === 404 && r.json.error === 'not_found', r);
r = await call('/v1/read', { familyKey: newFamily });
check('new family key works', r.status === 200, r);
familyKey = newFamily;

// Delete.
r = await call('/v1/delete', { tripKey });
check('delete answers deleted', r.json.deleted === true, r.json);
r = await call('/v1/read', { familyKey });
check('after delete the family key gets 404', r.status === 404, r);
r = await call('/v1/add', { tripKey, items: [pos('z', startedAt)] });
check('after delete the trip key gets 404', r.status === 404, r);
const left = sql(`SELECT COUNT(*) AS n FROM items i LEFT JOIN trips t ON t.id = i.trip_id WHERE t.id IS NULL`)[0].n;
check('no orphaned items remain', left === 0, left);

// CUJ 8: clean-up.
sql('DELETE FROM counters');
const a = (await call('/v1/start', startBody())).json;
const b = (await call('/v1/start', startBody())).json;
const c = (await call('/v1/start', startBody())).json;
await call('/v1/add', { tripKey: a.tripKey, items: [pos('a1', a.startedAt), { id: 'ae', t: a.startedAt + 1, kind: 'ended', value: 'arrived' }] });
await call('/v1/add', { tripKey: c.tripKey, items: [pos('c1', c.startedAt)] });
const DAY = 24 * HOUR;
sql(`UPDATE trips SET end_learned_at = end_learned_at - ${8 * DAY} WHERE trip_key_hash = '${await thTrip(a.tripKey)}'`);
sql(`UPDATE trips SET last_activity = last_activity - ${31 * DAY} WHERE trip_key_hash = '${await thTrip(b.tripKey)}'`);
sql(`INSERT INTO counters(day, n) VALUES('2020-01-01', 1)`);
const sched = await fetch(URL_ + '/__scheduled?cron=0+8+*+*+*');
check('clean-up timer runs', sched.ok, sched.status);
await new Promise((res) => setTimeout(res, 500));
r = await call('/v1/read', { familyKey: a.familyKey });
check('trip ended 8 days ago is deleted', r.status === 404, r);
r = await call('/v1/read', { familyKey: b.familyKey });
check('trip idle 31 days is deleted', r.status === 404, r);
r = await call('/v1/read', { familyKey: c.familyKey });
check('a current trip is kept', r.status === 200 && r.json.items.length === 1, r);
check('old counter rows are deleted', sql(`SELECT COUNT(*) AS n FROM counters WHERE day = '2020-01-01'`)[0].n === 0);
check('items of deleted trips are gone', sql(`SELECT COUNT(*) AS n FROM items i LEFT JOIN trips t ON t.id = i.trip_id WHERE t.id IS NULL`)[0].n === 0);

// CUJ 9: daily cap (3 locally; 3 already started today).
r = await call('/v1/start', startBody());
check('start past the daily cap gets 429 cap', r.status === 429 && r.json.error === 'cap', r);
r = await call('/v1/start', startBody({ invite: 'wrong-code-123456' }));
check('a wrong invite code is still 401 when capped (cap not used up)', r.status === 401, r);
r = await call('/v1/read', { familyKey: c.familyKey });
check('trips already running are not affected by the cap', r.status === 200, r);
await call('/v1/delete', { tripKey: c.tripKey });
sql('DELETE FROM counters');

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
