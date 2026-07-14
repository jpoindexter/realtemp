CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,   -- push service URL, unique per browser+site
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  threshold_c REAL NOT NULL,   -- warn when tomorrow's max air temp ≥ this
  created_at INTEGER NOT NULL
);
