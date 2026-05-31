-- Remove official-page rows where crawl time was stored as article time, plus section/homepage links.
DELETE FROM article_tags
WHERE article_id IN (
  SELECT a.id
  FROM articles a
  JOIN sources s ON s.id = a.source_id
  WHERE s.type = 'official_page'
    AND (
      a.url LIKE '%/'
      OR a.url LIKE '%/index.html'
      OR a.url LIKE '%/index.htm'
      OR a.url LIKE '%/index.shtml'
      OR a.url LIKE '%/default.html'
      OR a.url LIKE '%/default.htm'
      OR a.url LIKE '%/default.shtml'
      OR (
        s.key IN ('landspace-news', 'spacechina-news', 'casic-news', 'cmse-news')
        AND ABS((julianday(a.published_at) - julianday(a.created_at)) * 86400) < 300
      )
    )
);

DELETE FROM article_companies
WHERE article_id IN (
  SELECT a.id
  FROM articles a
  JOIN sources s ON s.id = a.source_id
  WHERE s.type = 'official_page'
    AND (
      a.url LIKE '%/'
      OR a.url LIKE '%/index.html'
      OR a.url LIKE '%/index.htm'
      OR a.url LIKE '%/index.shtml'
      OR a.url LIKE '%/default.html'
      OR a.url LIKE '%/default.htm'
      OR a.url LIKE '%/default.shtml'
      OR (
        s.key IN ('landspace-news', 'spacechina-news', 'casic-news', 'cmse-news')
        AND ABS((julianday(a.published_at) - julianday(a.created_at)) * 86400) < 300
      )
    )
);

DELETE FROM article_launches
WHERE article_id IN (
  SELECT a.id
  FROM articles a
  JOIN sources s ON s.id = a.source_id
  WHERE s.type = 'official_page'
    AND (
      a.url LIKE '%/'
      OR a.url LIKE '%/index.html'
      OR a.url LIKE '%/index.htm'
      OR a.url LIKE '%/index.shtml'
      OR a.url LIKE '%/default.html'
      OR a.url LIKE '%/default.htm'
      OR a.url LIKE '%/default.shtml'
      OR (
        s.key IN ('landspace-news', 'spacechina-news', 'casic-news', 'cmse-news')
        AND ABS((julianday(a.published_at) - julianday(a.created_at)) * 86400) < 300
      )
    )
);

DELETE FROM articles
WHERE id IN (
  SELECT a.id
  FROM articles a
  JOIN sources s ON s.id = a.source_id
  WHERE s.type = 'official_page'
    AND (
      a.url LIKE '%/'
      OR a.url LIKE '%/index.html'
      OR a.url LIKE '%/index.htm'
      OR a.url LIKE '%/index.shtml'
      OR a.url LIKE '%/default.html'
      OR a.url LIKE '%/default.htm'
      OR a.url LIKE '%/default.shtml'
      OR (
        s.key IN ('landspace-news', 'spacechina-news', 'casic-news', 'cmse-news')
        AND ABS((julianday(a.published_at) - julianday(a.created_at)) * 86400) < 300
      )
    )
);
