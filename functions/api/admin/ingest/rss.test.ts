import { describe, expect, it } from 'vitest';
import { isManualRssIngestionSource } from './rss';
import type { SourceConfig } from '../../../../src/ingestion';

const baseSource: SourceConfig = {
  key: 'spacenews-rss',
  name: 'SpaceNews',
  type: 'rss',
  region: 'global',
  url: 'https://example.com/feed.xml',
  credibility: 4,
  enabled: true,
  purpose: 'RSS metadata.',
  expected_content: 'Article metadata.',
  risk_notes: 'Metadata only.',
  dedupe_strategy: 'url_title_source',
};

describe('admin RSS ingestion source selection', () => {
  it('includes enabled RSS and RSSHub sources', () => {
    expect(isManualRssIngestionSource(baseSource)).toBe(true);
    expect(isManualRssIngestionSource({ ...baseSource, key: 'rsshub-weibo', type: 'rsshub' })).toBe(true);
  });

  it('excludes disabled and non-RSS-like sources', () => {
    expect(isManualRssIngestionSource({ ...baseSource, enabled: false })).toBe(false);
    expect(isManualRssIngestionSource({ ...baseSource, key: 'google-news', type: 'google_news_rss' })).toBe(false);
  });
});
