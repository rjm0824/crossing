// The tracker service's rules, as pure functions: no database, no network.
// Trip objects use the database column names (see migrations/0001_init.sql).

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const MAX_ITEMS_PER_BATCH = 100;
export const MAX_ITEMS_PER_TRIP = 5000;
export const MAX_READ_ITEMS = 500;
export const ENDED_WINDOW = 2 * HOUR;
export const ENDED_POLL_SECONDS = 300;
export const FUTURE_SLACK = 10 * MINUTE;
export const EARLY_SLACK = 10 * MINUTE;
export const MAX_AHEAD = 14 * DAY;

const KINDS = new Set(['pos', 'checkin', 'waypoint', 'overdue', 'ended', 'resumed']);
const CAPPED_KINDS = new Set(['pos', 'checkin', 'waypoint']);
const STATE_KINDS = new Set(['ended', 'resumed']);
const ITEM_ID = /^[A-Za-z0-9_-]{1,40}$/;
// Control characters, and invisible direction-changing characters.
const UNWANTED = /[\p{Cc}؜‎‏‪-‮⁦-⁩]/gu;

// Cleans a piece of text and cuts it to `max` characters (code points).
// Returns null when the value is not text or nothing is left.
export function cleanText(value, max) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(UNWANTED, '').trim();
  const cut = Array.from(cleaned).slice(0, max).join('').trim();
  return cut.length ? cut : null;
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}
function inRange(v, lo, hi) {
  return isNum(v) && v >= lo && v <= hi;
}
function isWhole(v) {
  return Number.isInteger(v);
}

// Checks a Start body (the invite code is checked separately).
// Returns { ok: true, fields } with column values, or { error: 'bad_request' }.
export function validateStart(body, now) {
  const bad = { error: 'bad_request' };
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad;
  const boat = cleanText(body.boat, 40);
  const captain = cleanText(body.captain, 30);
  if (!boat || !captain) return bad;

  const r = body.route;
  if (!r || typeof r !== 'object' || Array.isArray(r)) return bad;
  const name = cleanText(r.name, 40);
  const dest = cleanText(r.dest, 40);
  if (!name || !dest) return bad;
  if (!Array.isArray(r.points) || r.points.length < 2 || r.points.length > 30) return bad;
  const points = [];
  for (const p of r.points) {
    if (!p || typeof p !== 'object') return bad;
    const pname = cleanText(p.name, 40);
    if (!pname || !inRange(p.lat, -90, 90) || !inRange(p.lon, -180, 180)) return bad;
    points.push({ name: pname, lat: p.lat, lon: p.lon });
  }
  const route = { name, points, dest };
  if (r.cruiseKt !== undefined && r.cruiseKt !== null) {
    if (!inRange(r.cruiseKt, 1, 70)) return bad;
    route.cruiseKt = r.cruiseKt;
  }

  const pa = body.plannedArrival;
  const od = body.overdueAt;
  if (!isWhole(pa) || !isWhole(od)) return bad;
  if (pa <= now || od <= now || pa > now + MAX_AHEAD || od > now + MAX_AHEAD) return bad;
  if (od < pa) return bad;

  return {
    ok: true,
    fields: {
      boat,
      captain,
      route_json: JSON.stringify(route),
      planned_arrival: pa,
      overdue_at: od,
    },
  };
}

// Checks one item from an Add batch against the trip.
// Returns { ok: true, id, row } or { id, refused: 'invalid' | 'future' | 'early' | 'full' }.
// `id` is null when the item has no usable id.
export function checkItem(item, trip, now) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return { id: null, refused: 'invalid' };
  if (typeof item.id !== 'string' || !ITEM_ID.test(item.id)) return { id: null, refused: 'invalid' };
  const id = item.id;
  const invalid = { id, refused: 'invalid' };
  if (!isWhole(item.t) || !KINDS.has(item.kind)) return invalid;

  const row = {
    item_id: id, kind: item.kind, t: item.t,
    lat: null, lon: null, sog: null, bat: null, value: null, label: null,
  };

  switch (item.kind) {
    case 'pos':
      if (!inRange(item.lat, -90, 90) || !inRange(item.lon, -180, 180)) return invalid;
      row.lat = item.lat;
      row.lon = item.lon;
      if (item.sog !== undefined && item.sog !== null) {
        if (!inRange(item.sog, 0, 100)) return invalid;
        row.sog = item.sog;
      }
      if (item.bat !== undefined && item.bat !== null) {
        if (!isWhole(item.bat) || !inRange(item.bat, 0, 100)) return invalid;
        row.bat = item.bat;
      }
      break;
    case 'waypoint': {
      const label = cleanText(item.label, 60);
      if (!label) return invalid;
      row.label = label;
      break;
    }
    case 'overdue':
      if (!isWhole(item.value) || item.value < trip.started_at || item.value > now + MAX_AHEAD) return invalid;
      row.value = String(item.value);
      break;
    case 'ended':
      if (item.value !== 'arrived' && item.value !== 'stopped') return invalid;
      row.value = item.value;
      break;
    default: // checkin, resumed: nothing else
      break;
  }

  if (item.t > now + FUTURE_SLACK) return { id, refused: 'future' };
  if (item.t < trip.started_at - EARLY_SLACK) return { id, refused: 'early' };
  if (CAPPED_KINDS.has(item.kind) && trip.item_count >= MAX_ITEMS_PER_TRIP) return { id, refused: 'full' };
  return { ok: true, id, row };
}

export function isCappedKind(kind) {
  return CAPPED_KINDS.has(kind);
}

// Works out how one Add changes the trip. `rows` are every valid item in the
// request (newly stored or already held), in batch order. `storedCount` is how
// many were newly stored. Returns the values for the guarded UPDATE in
// index.js (a time of 0 means "nothing of that sort to apply") and `next`,
// the trip as it will be afterwards.
export function applyItems(trip, rows, now, storedCount = 0) {
  // Newest position by device time.
  let lastT = 0;
  let lastJson = null;
  for (const r of rows) {
    if (r.kind === 'pos' && r.t > lastT) {
      lastT = r.t;
      const last = { t: r.t, lat: r.lat, lon: r.lon };
      if (r.sog !== null) last.sog = r.sog;
      if (r.bat !== null) last.bat = r.bat;
      lastJson = JSON.stringify(last);
    }
  }
  if (lastT <= trip.last_t) { lastT = 0; lastJson = null; }

  // Events applied by device time, then batch order. A tie with what is
  // already applied changes nothing, so the first of equal times wins.
  const ordered = rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.t - b.r.t || a.i - b.i)
    .map((x) => x.r);

  let overdueT = 0;
  let overdueAt = trip.overdue_at;
  let curOverdueT = trip.overdue_set_t;
  for (const r of ordered) {
    if (r.kind === 'overdue' && r.t > curOverdueT) {
      curOverdueT = r.t;
      overdueT = r.t;
      overdueAt = Number(r.value);
    }
  }

  let stateT = 0;
  let status = trip.status;
  let endedAt = trip.ended_at ?? null;
  let endLearnedAt = trip.end_learned_at ?? null;
  let curStateT = trip.state_t;
  for (const r of ordered) {
    if (!STATE_KINDS.has(r.kind) || r.t <= curStateT) continue;
    curStateT = r.t;
    stateT = r.t;
    if (r.kind === 'ended') {
      // The 2-hour window starts when the service first learns of the end.
      if (status === 'underway' || endLearnedAt === null) endLearnedAt = now;
      status = r.value;
      endedAt = r.t;
    } else {
      status = 'underway';
      endedAt = null;
      endLearnedAt = null;
    }
  }

  const next = {
    ...trip,
    item_count: trip.item_count + storedCount,
    last_activity: now,
  };
  if (lastT) { next.last_t = lastT; next.last_json = lastJson; }
  if (overdueT) { next.overdue_set_t = overdueT; next.overdue_at = overdueAt; }
  if (stateT) {
    next.state_t = stateT;
    next.status = status;
    next.ended_at = endedAt;
    next.end_learned_at = endLearnedAt;
  }

  return {
    addCount: storedCount,
    lastActivity: now,
    lastT, lastJson,
    overdueT, overdueAt,
    stateT, status, endedAt, endLearnedAt,
    next,
  };
}

// The answer to a Read. `items` are rows after `after`, in seq order
// (up to MAX_READ_ITEMS + 1; the extra one only sets `more`).
export function shapeRead(trip, items, now, pollSeconds) {
  if (trip.status !== 'underway') {
    if (trip.end_learned_at !== null && trip.end_learned_at !== undefined
        && now - trip.end_learned_at < ENDED_WINDOW) {
      const route = JSON.parse(trip.route_json);
      return {
        status: trip.status, boat: trip.boat, captain: trip.captain,
        dest: route.dest, endedAt: trip.ended_at,
        now, pollSeconds: ENDED_POLL_SECONDS,
      };
    }
    return { status: 'closed' };
  }

  const more = items.length > MAX_READ_ITEMS;
  const out = items.slice(0, MAX_READ_ITEMS).map((r) => {
    const o = { seq: r.seq, t: r.t, kind: r.kind };
    if (r.lat !== null && r.lat !== undefined) o.lat = r.lat;
    if (r.lon !== null && r.lon !== undefined) o.lon = r.lon;
    if (r.sog !== null && r.sog !== undefined) o.sog = r.sog;
    if (r.bat !== null && r.bat !== undefined) o.bat = r.bat;
    if (r.label !== null && r.label !== undefined) o.label = r.label;
    if (r.value !== null && r.value !== undefined) o.value = r.kind === 'overdue' ? Number(r.value) : r.value;
    return o;
  });

  return {
    status: 'underway',
    overdue: now > trip.overdue_at,
    boat: trip.boat,
    captain: trip.captain,
    route: JSON.parse(trip.route_json),
    startedAt: trip.started_at,
    plannedArrival: trip.planned_arrival,
    overdueAt: trip.overdue_at,
    last: trip.last_json ? JSON.parse(trip.last_json) : null,
    items: out,
    more,
    now,
    pollSeconds,
  };
}

// True when a day's start count (after adding this start) is within the cap.
export function capAllows(countAfterIncrement, cap) {
  return countAfterIncrement <= cap;
}

// UTC date as YYYY-MM-DD.
export function utcDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Cut-off times for the daily clean-up.
export function cleanupCutoffs(now) {
  return {
    endedBefore: now - 7 * DAY,
    idleBefore: now - 30 * DAY,
    countersBefore: utcDay(now - 7 * DAY),
  };
}
