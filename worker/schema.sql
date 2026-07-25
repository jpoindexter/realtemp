CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,   -- push service URL, unique per browser+site
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  threshold_c REAL NOT NULL,   -- warn when tomorrow's max air temp ≥ this
  created_at INTEGER NOT NULL
);

-- Alert rules (roadmap C4a). One row per rule; a subscription may hold several.
-- Created lazily by the worker on first write as well, so a fresh deploy needs
-- no manual migration step.
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,      -- owning push subscription
  term TEXT NOT NULL,          -- trueFeel | airTemp | dewPoint | uvIndex
  direction TEXT NOT NULL,     -- above | below
  threshold REAL NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS alert_rules_endpoint ON alert_rules (endpoint);
