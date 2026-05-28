CREATE INDEX IF NOT EXISTS idx_articles_source_published_at
  ON articles(source_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_article_tags_tag_article
  ON article_tags(tag_id, article_id);

CREATE INDEX IF NOT EXISTS idx_article_companies_company_article
  ON article_companies(company_id, article_id);

CREATE INDEX IF NOT EXISTS idx_launches_window_start
  ON launches(window_start);

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_finished_id
  ON ingestion_logs(finished_at, id);

CREATE INDEX IF NOT EXISTS idx_sources_enabled_type
  ON sources(enabled, type);
