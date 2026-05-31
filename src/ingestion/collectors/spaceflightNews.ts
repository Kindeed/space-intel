import { z } from 'zod';
import { normalizeHttpUrl } from '../../config/url';
import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';
import { apiRequestLimit } from './apiLimit';
import { collectorDisplayText, collectorPublishedAt, stripHtml } from './metadata';

const snapiArticleSchema = z.object({
  id: z.number(),
  title: z.string(),
  url: z.string(),
  news_site: z.string(),
  summary: z.string().nullable(),
  published_at: z.string(),
  launches: z
    .array(
      z.object({
        launch_id: z.string(),
      }),
    )
    .default([]),
});

const snapiResponseSchema = z.object({
  results: z.array(snapiArticleSchema),
});

export const spaceflightNewsCollector: SourceCollector = {
  type: 'api',
  async collect(source: SourceConfig, context: CollectorContext): Promise<NormalizedItem[]> {
    if (source.key !== 'snapi') {
      return [];
    }

    const url = new URL(source.url);
    const maxItems = apiRequestLimit(source, url);
    url.searchParams.set('limit', String(maxItems));

    const response = await context.fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'user-agent': 'space-intel/0.1 (+https://space.bytebaud.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`SNAPI request failed with HTTP ${response.status}`);
    }

    const payload = snapiResponseSchema.parse(await response.json());

    const items: NormalizedItem[] = payload.results.flatMap((article) => {
      const title = collectorDisplayText(article.title, '');
      const articleUrl = normalizeHttpUrl(article.url);
      const sourceName = collectorDisplayText(article.news_site, source.name);

      if (!articleUrl || !title) {
        return [];
      }

      return {
        sourceKey: source.key,
        sourceName,
        publisherName: sourceName,
        title,
        originalTitle: title,
        summary: stripHtml(article.summary ?? ''),
        url: articleUrl,
        publishedAt: collectorPublishedAt(article.published_at, context),
        language: 'en',
        region: 'global',
        rawId: String(article.id),
        relatedLaunchIds: article.launches.map((launch) => launch.launch_id),
        companies: [],
        tags: [],
      };
    });

    return items.slice(0, maxItems);
  },
};
