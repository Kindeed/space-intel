import { describe, expect, it } from 'vitest';
import {
  publicArticleCategoryFilter,
  publicArticleCollection,
  publicArticleDetail,
  publicArticleListResult,
  publicArticleRegionFilter,
  publicArticleSummary,
} from './_articles';
import type { ArticleDetailRow, ArticleSummaryRow } from '../../src/db/articleQueries';

const article: ArticleSummaryRow = {
  id: 42,
  title: 'Reusable rocket milestone',
  originalTitle: 'Reusable rocket milestone',
  summary: 'Short summary only.',
  originalSummary: 'Short summary only.',
  url: 'https://example.com/article',
  sourceKey: 'google-news-cn-commercial-space',
  sourceName: '商业航天动态',
  sourceType: 'google_news_rss',
  publisherName: '新华社',
  publishedAt: '2026-05-30T00:00:00Z',
  language: 'zh',
  region: 'cn',
  fetchStatus: 'fetched',
  translationStatus: 'skipped',
  translationProvider: 'hy_mt_1_8b',
  tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
  companies: [{ slug: 'landspace', name: '蓝箭航天' }],
  storyKey: 'cn:2026-05-30:reusable',
  relatedSourceCount: 2,
  relatedSources: ['新华社', '央视新闻'],
};

function expectNoProperty(value: unknown, propertyName: string) {
  if (Array.isArray(value)) {
    for (const item of value) {
      expectNoProperty(item, propertyName);
    }
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  expect(value).not.toHaveProperty(propertyName);

  for (const nested of Object.values(value)) {
    expectNoProperty(nested, propertyName);
  }
}

function expectInternalArticleFieldsHidden(value: unknown) {
  for (const field of ['sourceKey', 'fetchStatus', 'translationStatus', 'translationProvider', 'storyKey', 'sourceType', 'sourceCategory', 'language', 'region']) {
    expectNoProperty(value, field);
  }

  expect(JSON.stringify(value)).not.toContain('google-news-cn-commercial-space');
  expect(JSON.stringify(value)).not.toContain('google_news_rss');
  expect(JSON.stringify(value)).not.toContain('Google News RSS');
  expect(JSON.stringify(value)).not.toContain('hy_mt_1_8b');
}

describe('public article serializers', () => {
  it('normalizes public region filter labels to stored region codes', () => {
    expect(publicArticleRegionFilter(' 国内 ')).toBe('cn');
    expect(publicArticleRegionFilter('国   内')).toBe('cn');
    expect(publicArticleRegionFilter('中国')).toBe('cn');
    expect(publicArticleRegionFilter('CN')).toBe('cn');
    expect(publicArticleRegionFilter('国际')).toBe('global');
    expect(publicArticleRegionFilter('国   际')).toBe('global');
    expect(publicArticleRegionFilter('国外')).toBe('global');
    expect(publicArticleRegionFilter('International')).toBe('global');
    expect(publicArticleRegionFilter('unknown-region')).toBe('unknown-region');
    expect(publicArticleRegionFilter(undefined)).toBeUndefined();
  });

  it('normalizes public category filter labels to stored category filters', () => {
    expect(publicArticleCategoryFilter(' 官方 ')).toBe('official');
    expect(publicArticleCategoryFilter('官方信息')).toBe('official');
    expect(publicArticleCategoryFilter('Official')).toBe('official');
    expect(publicArticleCategoryFilter(' 政策监管 ')).toBe('policy');
    expect(publicArticleCategoryFilter('政策   监管')).toBe('policy');
    expect(publicArticleCategoryFilter('政策')).toBe('policy');
    expect(publicArticleCategoryFilter('官方机构')).toBe('policy');
    expect(publicArticleCategoryFilter('官方   机构')).toBe('policy');
    expect(publicArticleCategoryFilter('公告信息')).toBe('policy');
    expect(publicArticleCategoryFilter('Policy')).toBe('policy');
    expect(publicArticleCategoryFilter('商业航天')).toBe('商业航天');
    expect(publicArticleCategoryFilter(undefined)).toBeUndefined();
  });

  it('removes internal workflow fields from article summaries', () => {
    const result = publicArticleSummary(article);

    expect(result).toMatchObject({
      id: 42,
      title: 'Reusable rocket milestone',
      sourceName: '商业航天来源',
      sourceCategoryLabel: '来源',
      regionLabel: '国内',
      publisherName: '新华社',
      relatedSourceCount: 2,
    });
    expectInternalArticleFieldsHidden(result);
  });

  it('normalizes internal whitespace in public article region labels', () => {
    expect(publicArticleSummary({ ...article, region: '国   内' }).regionLabel).toBe('国内');
    expect(publicArticleSummary({ ...article, region: '国   际' }).regionLabel).toBe('国际');
  });

  it('removes internal fields from article lists', () => {
    const result = publicArticleListResult({
      items: [article],
      page: 1,
      limit: 20,
      hasMore: false,
    });

    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(1);
    expectInternalArticleFieldsHidden(result);
  });

  it('removes internal fields from article details while preserving launches', () => {
    const detail: ArticleDetailRow = {
      ...article,
      launches: [
        { id: 1, externalId: ' ll2-demo ', missionName: ' Demo   launch ', name: ' Demo\tlaunch ' },
        { id: 1, externalId: 'll2-demo', missionName: 'Duplicate launch', name: 'Duplicate launch' },
      ],
    };

    const result = publicArticleDetail(detail);

    expect(result.launches).toEqual([{ id: 1, externalId: 'll2-demo', missionName: 'Demo launch', name: 'Demo launch' }]);
    expectInternalArticleFieldsHidden(result);
  });

  it('uses stable Chinese fallback labels for blank nested launch references', () => {
    const detail: ArticleDetailRow = {
      ...article,
      launches: [{ id: 9, externalId: '   ', missionName: '   ', name: '   ' }],
    };

    const result = publicArticleDetail(detail);

    expect(result.launches).toEqual([{ id: 9, externalId: '', missionName: '发射任务 #9', name: '发射任务 #9' }]);
    expectInternalArticleFieldsHidden(result);
  });

  it('deduplicates launch references case-insensitively and keeps later usable labels', () => {
    const detail: ArticleDetailRow = {
      ...article,
      launches: [
        { id: 0, externalId: ' LL2/Demo ', missionName: '   ', name: '   ' },
        { id: 0, externalId: 'll2/demo', missionName: ' Demo   launch ', name: '   ' },
        { id: 9, externalId: '   ', missionName: '   ', name: '   ' },
        { id: 9, externalId: 'll2/other', missionName: 'Other launch', name: 'Other launch' },
      ],
    };

    const result = publicArticleDetail(detail);

    expect(result.launches).toEqual([
      { id: 0, externalId: 'LL2/Demo', missionName: 'Demo launch', name: 'Demo launch' },
      { id: 9, externalId: '', missionName: 'Other launch', name: 'Other launch' },
    ]);
    expectInternalArticleFieldsHidden(result);
  });

  it('removes internal fields from nested company and topic article collections', () => {
    const result = publicArticleCollection({
      slug: 'landspace',
      name: '蓝箭航天',
      articles: [article],
    });

    expect(result.slug).toBe('landspace');
    expect(result.articles).toHaveLength(1);
    expectInternalArticleFieldsHidden(result);
  });

  it('uses configured public source category overrides before source type fallbacks', () => {
    const result = publicArticleSummary({
      ...article,
      sourceKey: 'snapi',
      sourceName: 'Spaceflight News',
      sourceType: 'api',
    });

    expect(result.sourceCategoryLabel).toBe('专业媒体');
    expectInternalArticleFieldsHidden(result);
  });

  it('uses configured public source names instead of raw aggregator names', () => {
    const result = publicArticleSummary({
      ...article,
      sourceName: 'Google News RSS - 商业航天',
      publisherName: 'Google News RSS - 商业航天',
      relatedSources: ['Google News RSS - 商业航天', '新华社'],
    });

    expect(result.sourceName).toBe('商业航天来源');
    expect(result.publisherName).toBeNull();
    expect(result.relatedSources).toEqual(['商业航天', '新华社']);
    expectInternalArticleFieldsHidden(result);
  });

  it('keeps distinct aggregator publisher labels', () => {
    const result = publicArticleSummary({
      ...article,
      sourceName: '商业航天来源',
      publisherName: '示例媒体',
    });

    expect(result.sourceName).toBe('商业航天来源');
    expect(result.publisherName).toBe('示例媒体');
    expectInternalArticleFieldsHidden(result);
  });

  it('normalizes blank and padded public article fields', () => {
    const result = publicArticleSummary({
      ...article,
      title: ' Reusable   rocket\tmilestone ',
      originalTitle: ' Original   reusable\trocket ',
      summary: ' Short\nsummary   only. ',
      originalSummary: ' Original\nsummary\t only. ',
      url: ' https://example.com/article ',
      publisherName: ' ',
      publishedAt: ' 2026-05-30T00:00:00Z ',
      relatedSourceCount: 3,
      relatedSources: ['Google News RSS - 商业航天', 'Google News - 商业航天', '新华社', '   '],
    });

    expect(result).toMatchObject({
      title: 'Reusable rocket milestone',
      originalTitle: 'Original reusable rocket',
      summary: 'Short summary only.',
      originalSummary: 'Original summary only.',
      url: 'https://example.com/article',
      publisherName: null,
      publishedAt: '2026-05-30T00:00:00Z',
      relatedSourceCount: 2,
      relatedSources: ['商业航天', '新华社'],
    });
    expectInternalArticleFieldsHidden(result);
  });

  it('does not expose single related-source lists after public cleanup', () => {
    const result = publicArticleSummary({
      ...article,
      relatedSourceCount: 3,
      relatedSources: ['Google News RSS - 商业航天', 'Google News - 商业航天', '   '],
    });

    expect(result.relatedSourceCount).toBe(1);
    expect(result.relatedSources).toBeUndefined();
    expectInternalArticleFieldsHidden(result);
  });

  it('does not count blank related-source lists as public coverage', () => {
    const result = publicArticleSummary({
      ...article,
      relatedSourceCount: 3,
      relatedSources: ['   ', '\t', 'Google News RSS -    '],
    });

    expect(result.relatedSourceCount).toBe(0);
    expect(result.relatedSources).toBeUndefined();
    expectInternalArticleFieldsHidden(result);
  });

  it('does not expose generic source fallback for blank publisher labels', () => {
    const result = publicArticleSummary({
      ...article,
      publisherName: 'Google News RSS -    ',
    });

    expect(result.sourceName).toBe('商业航天来源');
    expect(result.publisherName).toBeNull();
    expectInternalArticleFieldsHidden(result);
  });

  it('does not expose duplicate publisher labels that match the public source name', () => {
    const result = publicArticleSummary({
      ...article,
      sourceKey: 'snapi',
      sourceName: 'Spaceflight News',
      sourceType: 'api',
      publisherName: 'spaceflight news',
    });

    expect(result.sourceName).toBe('Spaceflight News');
    expect(result.publisherName).toBeNull();
    expectInternalArticleFieldsHidden(result);
  });

  it('does not expose aggregator fallback source labels as publishers', () => {
    const result = publicArticleSummary({
      ...article,
      sourceName: 'Google News RSS - 商业航天',
      publisherName: 'google news - 商业航天',
    });

    expect(result.sourceName).toBe('商业航天来源');
    expect(result.publisherName).toBeNull();
    expectInternalArticleFieldsHidden(result);
  });

  it('deduplicates related source labels case-insensitively', () => {
    const result = publicArticleSummary({
      ...article,
      relatedSourceCount: 4,
      relatedSources: ['SpaceNews', 'spacenews', 'Google News RSS - Spaceflight Now', 'google news - spaceflight now'],
    });

    expect(result.relatedSourceCount).toBe(2);
    expect(result.relatedSources).toEqual(['SpaceNews', 'Spaceflight Now']);
    expectInternalArticleFieldsHidden(result);
  });

  it('normalizes internal whitespace in public source and publisher labels', () => {
    const result = publicArticleSummary({
      ...article,
      sourceKey: 'unknown-rss-source',
      sourceName: 'Google News RSS - Spaceflight\t\tNow',
      sourceType: 'rss',
      publisherName: 'Example   Publisher',
    });

    expect(result.sourceName).toBe('Spaceflight Now');
    expect(result.publisherName).toBe('Example Publisher');
    expectInternalArticleFieldsHidden(result);
  });

  it('deduplicates related source labels after whitespace normalization', () => {
    const result = publicArticleSummary({
      ...article,
      relatedSourceCount: 3,
      relatedSources: ['Spaceflight\t\tNow', 'Spaceflight Now', '新华社'],
    });

    expect(result.relatedSourceCount).toBe(2);
    expect(result.relatedSources).toEqual(['Spaceflight Now', '新华社']);
    expectInternalArticleFieldsHidden(result);
  });

  it('returns null for unsafe or blank public article URLs', () => {
    expect(publicArticleSummary({ ...article, url: 'javascript:alert(1)' }).url).toBeNull();
    expect(publicArticleSummary({ ...article, url: 'data:text/html,hi' }).url).toBeNull();
    expect(publicArticleSummary({ ...article, url: 'https://user:pass@example.com/article' }).url).toBeNull();
    expect(publicArticleSummary({ ...article, url: '   ' }).url).toBeNull();
  });

  it('uses Chinese fallbacks for blank public article title and summary', () => {
    const result = publicArticleSummary({
      ...article,
      title: '   ',
      summary: '   ',
    });

    expect(result.title).toBe('标题待确认');
    expect(result.summary).toBe('摘要待确认');
    expectInternalArticleFieldsHidden(result);
  });

  it('uses an explicit Chinese fallback for unknown public article regions', () => {
    const result = publicArticleSummary({
      ...article,
      region: '   ',
    });

    expect(result.regionLabel).toBe('地区待确认');
    expectInternalArticleFieldsHidden(result);
  });

  it('normalizes nested article entity references and drops blank slugs', () => {
    const result = publicArticleSummary({
      ...article,
      tags: [
        { slug: ' reusable-rockets ', name: ' 可回收\t火箭 ' },
        { slug: 'reusable-rockets', name: '重复专题' },
        { slug: 'satellite-internet', name: '   ' },
        { slug: 'Satellite-Internet', name: '卫星互联网' },
        { slug: '   ', name: '空白专题' },
      ],
      companies: [
        { slug: ' landspace ', name: ' 蓝箭   航天 ' },
        { slug: 'landspace', name: '重复公司' },
        { slug: 'spacex', name: '   ' },
        { slug: 'SpaceX', name: 'SpaceX' },
        { slug: '   ', name: '空白公司' },
      ],
    });

    expect(result.tags).toEqual([
      { slug: 'reusable-rockets', name: '可回收 火箭' },
      { slug: 'satellite-internet', name: '卫星互联网' },
    ]);
    expect(result.companies).toEqual([
      { slug: 'landspace', name: '蓝箭 航天' },
      { slug: 'spacex', name: 'SpaceX' },
    ]);
    expectInternalArticleFieldsHidden(result);
  });

  it('falls back to source type public category for unknown source keys', () => {
    const result = publicArticleSummary({
      ...article,
      sourceKey: 'unknown-api-source',
      sourceName: 'Unknown source',
      sourceType: 'api',
    });

    expect(result.sourceCategoryLabel).toBe('数据来源');
    expectInternalArticleFieldsHidden(result);
  });
});
