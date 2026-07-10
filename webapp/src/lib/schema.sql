-- Engine Study schema — run once on a new Neon database.
-- Connect to your Neon branch and execute this file:
--   psql "$DATABASE_URL" -f src/lib/schema.sql

-- Per-user study data.
-- One row per Google user; data is the full CosmosData envelope (JSON).
CREATE TABLE IF NOT EXISTS user_data (
  user_id    TEXT        PRIMARY KEY,           -- Google subject ID (stable)
  email      TEXT        NOT NULL,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily AI call counters — used for per-user rate limiting.
-- Rows are upserted on every AI call; old rows accumulate but are cheap.
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id        TEXT  NOT NULL,
  date           DATE  NOT NULL DEFAULT CURRENT_DATE,
  mark_calls     INT   NOT NULL DEFAULT 0,
  generate_calls INT   NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Index for fast per-user data lookup (already covered by the PK, but
-- keep an explicit index in case the query planner needs guidance).
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage (user_id, date);
