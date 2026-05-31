import { describe, expect, it } from 'vitest';
import { createPublicSourceFilterToKey, publicSourceFilterToKey } from './_sourceFilters';
import type { SourceConfig } from '../../src/ingestion';

const source: SourceConfig = {
  key: 'public-source',
  name: '公开来源',
  type: 'rss',
  region: 'cn',
  url: 'https://example.com/feed.xml',
  credibility: 3,
  enabled: true,
  purpose: 'Fixture.',
  expected_content: 'Metadata.',
  risk_notes: 'Fixture only.',
  dedupe_strategy: 'url_title_source',
};

describe('public source filters', () => {
  it('maps public source names to internal source keys', () => {
    expect(publicSourceFilterToKey(' Spaceflight News ')).toBe('snapi');
    expect(publicSourceFilterToKey('Spaceflight   News')).toBe('snapi');
  });

  it('keeps existing source key filters compatible', () => {
    expect(publicSourceFilterToKey('snapi')).toBe('snapi');
  });

  it('keeps previous raw aggregator display names compatible after public label cleanup', () => {
    const mapSourceFilter = createPublicSourceFilterToKey([
      {
        ...source,
        key: 'rsshub-weibo-space-keyword',
        name: 'RSSHub - 微博商业航天关键词',
        type: 'rsshub',
      },
    ]);

    expect(mapSourceFilter('微博商业航天关键词')).toBe('rsshub-weibo-space-keyword');
    expect(mapSourceFilter('RSSHub - 微博商业航天关键词')).toBe('rsshub-weibo-space-keyword');
    expect(mapSourceFilter('RSSHub  -   微博商业航天关键词')).toBe('rsshub-weibo-space-keyword');
    expect(mapSourceFilter('Google News RSS - RSSHub - 微博商业航天关键词')).toBe('rsshub-weibo-space-keyword');
    expect(mapSourceFilter('rsshub-weibo-space-keyword')).toBe('rsshub-weibo-space-keyword');
  });

  it('drops blank source filters', () => {
    expect(publicSourceFilterToKey('   ')).toBeUndefined();
  });

  it('does not map public names through disabled sources', () => {
    const mapSourceFilter = createPublicSourceFilterToKey([
      source,
      {
        ...source,
        key: 'disabled-source',
        enabled: false,
      },
    ]);

    expect(mapSourceFilter('公开来源')).toBe('public-source');
  });
});
