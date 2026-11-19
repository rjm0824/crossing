-- Tracker service database, first version.

CREATE TABLE trips (
  id              INTEGER PRIMARY KEY,
  trip_key_hash   TEXT    NOT NULL UNIQUE,
  family_key_hash TEXT    NOT NULL UNIQUE,
  boat            TEXT    NOT NULL,
  captain         TEXT    NOT NULL,
  route_json      TEXT    NOT NULL,
  planned_arrival INTEGER NOT NULL,
  overdue_at      INTEGER NOT NULL,
  overdue_set_t   INTEGER NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'underway',
  state_t         INTEGER NOT NULL DEFAULT 0,
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER,
  end_learned_at  INTEGER,
  last_json       TEXT,
  last_t          INTEGER NOT NULL DEFAULT 0,
  last_activity   INTEGER NOT NULL,
  item_count      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE items (
  seq     INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  item_id TEXT    NOT NULL,
  kind    TEXT    NOT NULL,
  t       INTEGER NOT NULL,
  lat     REAL,
  lon     REAL,
  sog     REAL,
  bat     INTEGER,
  value   TEXT,
  label   TEXT,
  recv_t  INTEGER NOT NULL,
  UNIQUE (trip_id, item_id)
);

CREATE INDEX items_trip_seq ON items (trip_id, seq);

CREATE TABLE counters (
  day TEXT    PRIMARY KEY,
  n   INTEGER NOT NULL
);
