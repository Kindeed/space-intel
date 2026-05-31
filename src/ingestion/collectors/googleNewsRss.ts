import Parser from 'rss-parser';
import { normalizeHttpUrl } from '../../config/url';
import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';
import { collectorDisplayText, collectorPublishedAt, stripHtml } from './metadata';

type GoogleNewsItemFields = {
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
};

const parser = new Parser<Record<string, unknown>, GoogleNewsItemFields>();

function parseGoogleNewsTitle(title: string): { title: string; publisherName: string | null } {
  const separatorIndex = title.lastIndexOf(' - ');

  if (separatorIndex < 0) {
    return { title: collectorDisplayText(title, ''), publisherName: null };
  }

  const itemTitle = title.slice(0, separatorIndex);
  const publisherName = title.slice(separatorIndex + 3);

  return {
    title: collectorDisplayText(itemTitle, ''),
    publisherName: collectorDisplayText(publisherName, '') || null,
  };
}

function canonicalGoogleNewsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const nestedUrl = url.searchParams.get('url') ?? url.searchParams.get('q');
    const normalizedNestedUrl = nestedUrl ? normalizeHttpUrl(nestedUrl) : null;

    if (normalizedNestedUrl) {
      return normalizedNestedUrl;
    }

    url.search = '';
    url.hash = '';
    return normalizeHttpUrl(url.toString());
  } catch {
    return null;
  }
}

export const googleNewsRssCollector: SourceCollector = {
  type: 'google_news_rss',
  async collect(source: SourceConfig, context: CollectorContext): Promise<NormalizedItem[]> {
    const response = await context.fetch(source.url, {
      headers: {
        accept: 'application/rss+xml, application/xml, text/xml',
        'user-agent': 'SpaceIntelBot/1.0 (+https://space.bytebaud.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Google News RSS request failed for ${source.key} with HTTP ${response.status}`);
    }

    const feed = await parser.parseString(await response.text());
    const maxItems = source.max_items ?? 50;

    return feed.items
      .filter((item) => item.title && item.link)
      .flatMap((item) => {
        const parsedTitle = parseGoogleNewsTitle(item.title ?? '');
        const url = canonicalGoogleNewsUrl(item.link ?? '');
        const language: NormalizedItem['language'] = 'zh';

        if (!url || !parsedTitle.title) {
          return [];
        }

        return {
          sourceKey: source.key,
          sourceName: source.name,
          publisherName: parsedTitle.publisherName ?? source.name,
          title: parsedTitle.title,
          originalTitle: collectorDisplayText(item.title, ''),
          summary: stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? ''),
          url,
          publishedAt: collectorPublishedAt(item.isoDate, context),
          language,
          region: source.region,
          rawId: item.guid ?? url,
          relatedLaunchIds: [],
          companies: [],
          tags: [],
        };
      })
      .slice(0, maxItems);
  },
};
