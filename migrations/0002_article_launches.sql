CREATE TABLE IF NOT EXISTS article_launches (
  article_id INTEGER NOT NULL,
  launch_external_id TEXT NOT NULL,
  PRIMARY KEY (article_id, launch_external_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_article_launches_launch_external_id
  ON article_launches(launch_external_id);
