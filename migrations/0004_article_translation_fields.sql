ALTER TABLE articles ADD COLUMN original_summary TEXT;
ALTER TABLE articles ADD COLUMN translation_status TEXT NOT NULL DEFAULT 'skipped';
ALTER TABLE articles ADD COLUMN translation_provider TEXT;
ALTER TABLE articles ADD COLUMN translated_at TEXT;
ALTER TABLE articles ADD COLUMN translation_error TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_translation_status
  ON articles(translation_status, language, published_at DESC);
