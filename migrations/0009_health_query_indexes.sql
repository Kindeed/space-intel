-- Additive only: verify the Free daily read/write budget before applying to a
-- large production log table. This migration does not delete historical data.
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_finished_id
  ON ingestion_logs(finished_at, id);

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_success_finished
  ON ingestion_logs(finished_at DESC)
  WHERE finished_at IS NOT NULL AND failure_count = 0;

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_source_finished_id
  ON ingestion_logs(source_key, finished_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_failed_order
  ON ingestion_logs(COALESCE(finished_at, started_at) DESC, id DESC)
  WHERE failure_count > 0 OR (error IS NOT NULL AND error != '');

CREATE INDEX IF NOT EXISTS idx_launches_window_start
  ON launches(window_start);
