-- Additive only: verify the Free daily read/write budget before applying to a
-- large production log table. This migration does not delete historical data.
CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON articles(published_at DESC);

-- Only unfinished logs need a new index entry. Detailed health history uses
-- the existing INTEGER PRIMARY KEY and a bounded range of 240 recent IDs.
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_open_started
  ON ingestion_logs(started_at, id) WHERE finished_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_launches_window_start
  ON launches(window_start);
