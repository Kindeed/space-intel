import { describe, expect, it } from 'vitest';
import { publicHomeStats } from './_home';

describe('public home serializers', () => {
  it('maps internal source types to public source category labels', () => {
    const result = publicHomeStats({
      recentArticleCount: 8,
      topicCount: 12,
      enabledSources: [
        { key: 'launch-library-2', type: 'api', region: 'global' },
        { key: 'nasa-spaceflight-rss', type: 'rss', region: 'global' },
        { key: 'spacenews-rss', type: 'rss', region: 'global' },
        { key: 'space-com-rss', type: 'rss', region: 'global' },
        { key: 'spaceflight-now-rss', type: 'rss', region: 'global' },
        { key: 'the-space-review-rss', type: 'rss', region: 'global' },
        { key: 'google-news-cn-commercial-space', type: 'google_news_rss', region: 'cn' },
        { key: 'unknown-source', type: 'unknown_internal_type', region: 'global' },
      ],
    });

    expect(result).toEqual({
      recentArticleCount: 8,
      topicCount: 12,
      enabledSourceCategories: [
        { label: '专业媒体', count: 5, accessSummaryLabel: '待验证' },
        { label: '数据来源', count: 1, accessSummaryLabel: '可能受限' },
        { label: '来源', count: 2, accessSummaryLabel: '可能受限' },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('enabledSources');
    expect(JSON.stringify(result)).not.toContain('google_news_rss');
    expect(JSON.stringify(result)).not.toContain('unknown_internal_type');
  });

  it('uses configured public source category overrides before source type fallbacks', () => {
    const result = publicHomeStats({
      recentArticleCount: 8,
      topicCount: 12,
      enabledSources: [{ key: 'snapi', type: 'api', region: 'global' }],
    });

    expect(result.enabledSourceCategories).toEqual([{ label: '专业媒体', count: 1, accessSummaryLabel: '可能受限' }]);
  });
});
