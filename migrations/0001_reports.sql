CREATE TABLE IF NOT EXISTS public_events (
  id INTEGER PRIMARY KEY,
  data TEXT NOT NULL CHECK(json_valid(data)),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  event_id INTEGER PRIMARY KEY REFERENCES public_events(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','withdrawn')),
  source_hash TEXT,
  body TEXT CHECK(body IS NULL OR json_valid(body)),
  published_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  name TEXT PRIMARY KEY,
  lease_until INTEGER NOT NULL DEFAULT 0,
  token TEXT,
  last_success TEXT,
  last_error TEXT
);
