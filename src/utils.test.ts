import { describe, expect, it } from 'vitest';
import { articleFromApi } from './utils';
import type { ApiArticleSummary } from './types';

const article: ApiArticleSummary = {
  id: 1,
  title: 'Reusable rocket milestone',
  originalTitle: 'Reusable rocket milestone',
  summary: 'Short summary only.',
  originalSummary: 'Short summary only.',
  url: 'https://example.com/article',
  sourceKey: 'google-news-cn-commercial-space',
  sourceName: 'Google News - 商业航天',
  sourceType: 'google_news_rss',
  publishedAt: '2026-05-09T00:00:00Z',
  language: 'zh',
  region: 'cn',
  fetchStatus: 'fetched',
  translationStatus: 'skipped',
  translationProvider: null,
  tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
  companies: [{ slug: 'landspace', name: '蓝箭航天' }],
};

describe('articleFromApi', () => {
  it('maps only real article relations into visible tags and companies', () => {
    const result = articleFromApi(article);

    expect(result.tags).toEqual([{ slug: 'reusable-rockets', name: '可回收火箭' }]);
    expect(result.companies).toEqual([{ slug: 'landspace', name: '蓝箭航天' }]);
    expect(result.tags.map((tag) => tag.name)).not.toContain('google-news-cn-commercial-space');
    expect(result.tags.map((tag) => tag.name)).not.toContain('zh');
  });
});
