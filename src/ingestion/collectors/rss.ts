import Parser from 'rss-parser';
import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';

type RssCustomFields = {
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
};

const parser = new Parser<Record<string, unknown>, RssCustomFields>();

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function itemSummary(item: RssCustomFields): string {
  return stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? '');
}

function itemDate(item: RssCustomFields, context: CollectorContext): string {
  return item.isoDate ?? context.now().toISOString();
}

export const rssCollector: SourceCollector = {
  type: 'rss',
  async collect(source: SourceConfig, context: CollectorContext): Promise<NormalizedItem[]> {
    const response = await context.fetch(source.url, {
      headers: {
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'user-agent': 'SpaceIntelBot/1.0 (+https://space.bytebaud.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`RSS request failed for ${source.key} with HTTP ${response.status}`);
    }

    const feed = await parser.parseString(await response.text());

    const maxItems = source.max_items ?? 50;

    return feed.items
      .filter((item) => item.title && item.link)
      .slice(0, maxItems)
      .map((item) => ({
        sourceKey: source.key,
        sourceName: feed.title ?? source.name,
        publisherName: feed.title ?? source.name,
        title: item.title ?? '',
        originalTitle: item.title ?? '',
        summary: itemSummary(item),
        url: item.link ?? '',
        publishedAt: itemDate(item, context),
        language: source.region === 'cn' ? 'zh' : 'en',
        region: source.region,
        rawId: item.guid ?? item.link,
        relatedLaunchIds: [],
        companies: source.default_companies ?? [],
        tags: source.default_tags ?? [],
      }));
  },
};
