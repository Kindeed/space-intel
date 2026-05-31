-- Remove CNSA navigation pages that were previously ingested as articles.
DELETE FROM article_tags
WHERE article_id IN (
  SELECT a.id
  FROM articles a
  JOIN sources s ON s.id = a.source_id
  WHERE s.key = 'cnsa-news'
    AND (
      a.url LIKE 'https://www.cnsa.gov.cn/%/index.html'
      OR a.url IN ('https://www.cpeos.org.cn/home', 'https://www.cpeos.org.cn/home/')
      OR a.title IN (
        '咨询建议',
        '意见征集',
        '互动交流',
        '资源服务',
        '国际合作',
        '空间应用',
        '空间科学',
        '宇航产品',
        '重大任务',
        '中国航天',
        '专题专栏',
        '视频点播',
        '精彩图集',
        '图解航天',
        '国际航天',
        '政策公告',
        '信息发布',
        '机构简介',
        '国家遥感数据与应用服务平台'
      )
    )
);

DELETE FROM article_companies
WHERE article_id IN (
  SELECT a.id
  FROM articles a
  JOIN sources s ON s.id = a.source_id
  WHERE s.key = 'cnsa-news'
    AND (
      a.url LIKE 'https://www.cnsa.gov.cn/%/index.html'
      OR a.url IN ('https://www.cpeos.org.cn/home', 'https://www.cpeos.org.cn/home/')
      OR a.title IN (
        '咨询建议',
        '意见征集',
        '互动交流',
        '资源服务',
        '国际合作',
        '空间应用',
        '空间科学',
        '宇航产品',
        '重大任务',
        '中国航天',
        '专题专栏',
        '视频点播',
        '精彩图集',
        '图解航天',
        '国际航天',
        '政策公告',
        '信息发布',
        '机构简介',
        '国家遥感数据与应用服务平台'
      )
    )
);

DELETE FROM article_launches
WHERE article_id IN (
  SELECT a.id
  FROM articles a
  JOIN sources s ON s.id = a.source_id
  WHERE s.key = 'cnsa-news'
    AND (
      a.url LIKE 'https://www.cnsa.gov.cn/%/index.html'
      OR a.url IN ('https://www.cpeos.org.cn/home', 'https://www.cpeos.org.cn/home/')
      OR a.title IN (
        '咨询建议',
        '意见征集',
        '互动交流',
        '资源服务',
        '国际合作',
        '空间应用',
        '空间科学',
        '宇航产品',
        '重大任务',
        '中国航天',
        '专题专栏',
        '视频点播',
        '精彩图集',
        '图解航天',
        '国际航天',
        '政策公告',
        '信息发布',
        '机构简介',
        '国家遥感数据与应用服务平台'
      )
    )
);

DELETE FROM articles
WHERE id IN (
  SELECT a.id
  FROM articles a
  JOIN sources s ON s.id = a.source_id
  WHERE s.key = 'cnsa-news'
    AND (
      a.url LIKE 'https://www.cnsa.gov.cn/%/index.html'
      OR a.url IN ('https://www.cpeos.org.cn/home', 'https://www.cpeos.org.cn/home/')
      OR a.title IN (
        '咨询建议',
        '意见征集',
        '互动交流',
        '资源服务',
        '国际合作',
        '空间应用',
        '空间科学',
        '宇航产品',
        '重大任务',
        '中国航天',
        '专题专栏',
        '视频点播',
        '精彩图集',
        '图解航天',
        '国际航天',
        '政策公告',
        '信息发布',
        '机构简介',
        '国家遥感数据与应用服务平台'
      )
    )
);

-- Stale SEC source rows are no longer configured collectors and should not remain enabled.
UPDATE sources
SET enabled = 0
WHERE key IN (
  'sec-ast-spacemobile',
  'sec-intuitive-machines',
  'sec-planet-labs',
  'sec-rocket-lab'
);
