// The Crossing tracker service: one Cloudflare Worker with one D1 database.
// See docs/designs/tracker-service.md for every request and rule.

import { newKey, hashKey, sameSecret, isKeyShape } from './keys.js';
import {
  validateStart, checkItem, applyItems, shapeRead, capAllows, cleanupCutoffs, utcDay,
  isCappedKind, MAX_ITEMS_PER_BATCH, MAX_READ_ITEMS,
} from './rules.js';

const MAX_BODY_BYTES = 64 * 1024;
const MIN_INVITE_LENGTH = 12;

class Answer extends Error {
  constructor(status, error) {
    super(error);
    this.status = status;
    this.body = { error };
  }
}
const badRequest = () => new Answer(400, 'bad_request');
const notFound = () => new Answer(404, 'not_found');

// Adds up the database's own report of rows read and written.
function meter() {
  const m = { rowsRead: 0, rowsWritten: 0 };
  m.add = (results) => {
    for (const r of [].concat(results)) {
      m.rowsRead += r?.meta?.rows_read ?? 0;
      m.rowsWritten += r?.meta?.rows_written ?? 0;
    }
    return results;
  };
  return m;
}

function intSetting(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

async function readBody(request) {
  const declared = Number(request.headers.get('Content-Length'));
  if (declared > MAX_BODY_BYTES) throw badRequest();
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw badRequest();
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest();
    return body;
  } catch {
    throw badRequest();
  }
}

async function tripByKey(env, m, column, key) {
  if (!isKeyShape(key)) throw notFound();
  const res = m.add(await env.DB.prepare(`SELECT * FROM trips WHERE ${column} = ?`).bind(await hashKey(key)).all());
  const trip = res.results[0];
  if (!trip) throw notFound();
  return trip;
}

// 1. Start
async function start(body, env, now, m) {
  const v = validateStart(body, now);
  if (!v.ok) throw badRequest();

  const code = env.INVITE_CODE;
  const codeSet = typeof code === 'string' && Array.from(code).length >= MIN_INVITE_LENGTH;
  if (!codeSet || typeof body.invite !== 'string' || !(await sameSecret(body.invite, code))) {
    throw new Answer(401, 'invite');
  }

  const counted = m.add(await env.DB.prepare(
    'INSERT INTO counters(day, n) VALUES(?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1 RETURNING n',
  ).bind(utcDay(now)).all());
  if (!capAllows(counted.results[0].n, intSetting(env.DAILY_TRIP_CAP, 50))) throw new Answer(429, 'cap');

  const tripKey = newKey();
  const familyKey = newKey();
  const f = v.fields;
  m.add(await env.DB.prepare(
    `INSERT INTO trips (trip_key_hash, family_key_hash, boat, captain, route_json,
       planned_arrival, overdue_at, started_at, last_activity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(await hashKey(tripKey), await hashKey(familyKey), f.boat, f.captain, f.route_json,
    f.planned_arrival, f.overdue_at, now, now).run());

  return { tripKey, familyKey, startedAt: now };
}

// 2. Add
async function add(body, env, now, m) {
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) throw badRequest();
  if (items.length > MAX_ITEMS_PER_BATCH) throw new Answer(400, 'too_many');

  const trip = await tripByKey(env, m, 'trip_key_hash', body.tripKey);

  const results = new Array(items.length);
  const valid = []; // { index, row }
  const seen = new Set();
  let count = trip.item_count;
  items.forEach((raw, index) => {
    const c = checkItem(raw, { ...trip, item_count: count }, now);
    if (!c.ok) {
      results[index] = { id: c.id, r: 'refused', why: c.refused };
    } else if (seen.has(c.id)) {
      results[index] = { id: c.id, r: 'had' };
    } else {
      seen.add(c.id);
      valid.push({ index, row: c.row });
      if (isCappedKind(c.row.kind)) count++;
    }
  });

  if (valid.length === 0) return { status: trip.status, results };

  const insert = env.DB.prepare(
    `INSERT OR IGNORE INTO items (trip_id, item_id, kind, t, lat, lon, sog, bat, value, label, recv_t)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING seq`,
  );
  const inserted = m.add(await env.DB.batch(valid.map(({ row: r }) =>
    insert.bind(trip.id, r.item_id, r.kind, r.t, r.lat, r.lon, r.sog, r.bat, r.value, r.label, now))));

  let stored = 0;
  valid.forEach(({ index, row }, i) => {
    const isNew = inserted[i].results.length > 0;
    if (isNew) stored++;
    results[index] = { id: row.item_id, r: isNew ? 'stored' : 'had' };
  });

  const a = applyItems(trip, valid.map((x) => x.row), now, stored);
  const updated = m.add(await env.DB.prepare(
    `UPDATE trips SET
       item_count     = item_count + ?1,
       last_activity  = ?2,
       last_json      = CASE WHEN ?3 > last_t THEN ?4 ELSE last_json END,
       last_t         = MAX(last_t, ?3),
       overdue_at     = CASE WHEN ?5 > overdue_set_t THEN ?6 ELSE overdue_at END,
       overdue_set_t  = MAX(overdue_set_t, ?5),
       status         = CASE WHEN ?7 > state_t THEN ?8  ELSE status END,
       ended_at       = CASE WHEN ?7 > state_t THEN ?9  ELSE ended_at END,
       end_learned_at = CASE WHEN ?7 > state_t THEN ?10 ELSE end_learned_at END,
       state_t        = MAX(state_t, ?7)
     WHERE id = ?11 RETURNING status`,
  ).bind(a.addCount, a.lastActivity, a.lastT, a.lastJson, a.overdueT, a.overdueAt,
    a.stateT, a.status, a.endedAt, a.endLearnedAt, trip.id).all());

  return { status: updated.results[0]?.status ?? a.next.status, results };
}

// 3. Read
async function read(body, env, now, m) {
  let after = 0;
  if (body.after !== undefined && body.after !== null) {
    if (!Number.isInteger(body.after) || body.after < 0) throw badRequest();
    after = body.after;
  }
  const trip = await tripByKey(env, m, 'family_key_hash', body.familyKey);
  let items = [];
  if (trip.status === 'underway') {
    const res = m.add(await env.DB.prepare(
      `SELECT seq, t, kind, lat, lon, sog, bat, value, label FROM items
       WHERE trip_id = ? AND seq > ? ORDER BY seq LIMIT ?`,
    ).bind(trip.id, after, MAX_READ_ITEMS + 1).all());
    items = res.results;
  }
  return shapeRead(trip, items, now, intSetting(env.POLL_SECONDS, 30));
}

// 4. New family link
async function newLink(body, env, now, m) {
  if (!isKeyShape(body.tripKey)) throw notFound();
  const familyKey = newKey();
  const res = m.add(await env.DB.prepare('UPDATE trips SET family_key_hash = ? WHERE trip_key_hash = ?')
    .bind(await hashKey(familyKey), await hashKey(body.tripKey)).run());
  if (!res.meta.changes) throw notFound();
  return { familyKey };
}

// 5. Delete
async function del(body, env, now, m) {
  if (!isKeyShape(body.tripKey)) throw notFound();
  const h = await hashKey(body.tripKey);
  const res = m.add(await env.DB.batch([
    env.DB.prepare('DELETE FROM items WHERE trip_id IN (SELECT id FROM trips WHERE trip_key_hash = ?)').bind(h),
    env.DB.prepare('DELETE FROM trips WHERE trip_key_hash = ?').bind(h),
  ]));
  if (!res[1].meta.changes) throw notFound();
  return { deleted: true };
}

const ROUTES = {
  '/v1/start': start,
  '/v1/add': add,
  '/v1/read': read,
  '/v1/new-link': newLink,
  '/v1/delete': del,
};

// Daily clean-up.
export async function cleanup(env, now) {
  const c = cleanupCutoffs(now);
  const which = `(status <> 'underway' AND end_learned_at < ?1) OR (status = 'underway' AND last_activity < ?2)`;
  return env.DB.batch([
    env.DB.prepare(`DELETE FROM items WHERE trip_id IN (SELECT id FROM trips WHERE ${which})`)
      .bind(c.endedBefore, c.idleBefore),
    env.DB.prepare(`DELETE FROM trips WHERE ${which}`).bind(c.endedBefore, c.idleBefore),
    env.DB.prepare('DELETE FROM counters WHERE day < ?1').bind(c.countersBefore),
  ]);
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    const m = meter();
    let status = 200;
    let out;
    try {
      const handler = ROUTES[new URL(request.url).pathname];
      if (request.method !== 'POST' || !handler) throw notFound();
      const body = await readBody(request);
      out = await handler(body, env, Date.now(), m);
    } catch (e) {
      if (e instanceof Answer) {
        status = e.status;
        out = e.body;
      } else {
        status = 500;
        out = { error: 'server' };
      }
    }
    if (env.DEBUG_META === '1') out = { ...out, debug: { rowsRead: m.rowsRead, rowsWritten: m.rowsWritten } };
    return new Response(JSON.stringify(out), { status, headers });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(cleanup(env, Date.now()));
  },
};
