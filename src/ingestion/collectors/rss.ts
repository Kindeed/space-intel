import Parser from 'rss-parser';
import { normalizeHttpUrl } from '../../config/url';
import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';
import { collectorDisplayText, collectorPublishedAt, stripHtml } from './metadata';

type RssCustomFields = {
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
};

const parser = new Parser<Record<string, unknown>, RssCustomFields>();

function itemSummary(item: RssCustomFields): string {
  return stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? '');
}

function itemDate(item: RssCustomFields, context: CollectorContext): string {
  return collectorPublishedAt(item.isoDate, context);
}

export async function collectRssFeed(source: SourceConfig, context: CollectorContext): Promise<NormalizedItem[]> {
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
  const sourceName = collectorDisplayText(feed.title, source.name);

  return feed.items
    .filter((item) => collectorDisplayText(item.title, '') && item.link)
    .flatMap((item) => {
      const title = collectorDisplayText(item.title, '');
      const url = normalizeHttpUrl(item.link ?? '');
      const language: NormalizedItem['language'] = source.region === 'cn' ? 'zh' : 'en';

      if (!url) {
        return [];
      }

      return {
        sourceKey: source.key,
        sourceName,
        publisherName: sourceName,
        title,
        originalTitle: title,
        summary: itemSummary(item),
        url,
        publishedAt: itemDate(item, context),
        language,
        region: source.region,
        rawId: item.guid ?? url,
        relatedLaunchIds: [],
        companies: source.default_companies ?? [],
        tags: source.default_tags ?? [],
      };
    })
    .slice(0, maxItems);
}

export const rssCollector: SourceCollector = {
  type: 'rss',
  collect: collectRssFeed,
};

export const rsshubCollector: SourceCollector = {
  type: 'rsshub',
  collect: collectRssFeed,
};
