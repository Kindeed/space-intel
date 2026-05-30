import Parser from 'rss-parser';
import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';

type GoogleNewsItemFields = {
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
};

const parser = new Parser<Record<string, unknown>, GoogleNewsItemFields>();

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseGoogleNewsTitle(title: string): { title: string; publisherName: string | null } {
  const match = title.match(/^(.*?)\s+-\s+([^-]+)$/);

  if (!match) {
    return { title: title.trim(), publisherName: null };
  }

  return {
    title: match[1].trim(),
    publisherName: match[2].trim() || null,
  };
}

function canonicalGoogleNewsUrl(value: string): string {
  try {
    const url = new URL(value);
    const nestedUrl = url.searchParams.get('url') ?? url.searchParams.get('q');

    if (nestedUrl?.startsWith('http')) {
      return nestedUrl;
    }

    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value;
  }
}

export const googleNewsRssCollector: SourceCollector = {
  type: 'google_news_rss',
  async collect(source: SourceConfig, context: CollectorContext): Promise<NormalizedItem[]> {
    const response = await context.fetch(source.url, {
      headers: {
        accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Google News RSS request failed for ${source.key} with HTTP ${response.status}`);
    }

    const feed = await parser.parseString(await response.text());

    return feed.items
      .filter((item) => item.title && item.link)
      .map((item) => {
        const parsedTitle = parseGoogleNewsTitle(item.title ?? '');
        const url = canonicalGoogleNewsUrl(item.link ?? '');

        return {
          sourceKey: source.key,
          sourceName: source.name,
          publisherName: parsedTitle.publisherName ?? source.name,
          title: parsedTitle.title,
          originalTitle: item.title ?? '',
          summary: stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? ''),
          url,
          publishedAt: item.isoDate ?? context.now().toISOString(),
          language: 'zh',
          region: source.region,
          rawId: item.guid ?? url,
          relatedLaunchIds: [],
          companies: [],
          tags: [],
        };
      });
  },
};
