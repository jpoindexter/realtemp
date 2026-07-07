CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cell TEXT NOT NULL,          -- lat/lon rounded to 0.01° ≈ 1km grid
  vote TEXT NOT NULL CHECK (vote IN ('hotter', 'cooler', 'spot-on')),
  created_at INTEGER NOT NULL  -- unix ms
);
CREATE INDEX IF NOT EXISTS idx_reports_cell_time ON reports (cell, created_at);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,   -- push service URL, unique per browser+site
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  threshold_c REAL NOT NULL,   -- warn when tomorrow's max air temp ≥ this
  created_at INTEGER NOT NULL
);
