import { z } from 'zod';
import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';

const snapiArticleSchema = z.object({
  id: z.number(),
  title: z.string(),
  url: z.string().url(),
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
    url.searchParams.set('limit', url.searchParams.get('limit') ?? '25');

    const response = await context.fetch(url.toString(), {
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SNAPI request failed with HTTP ${response.status}`);
    }

    const payload = snapiResponseSchema.parse(await response.json());

    return payload.results.map((article) => ({
      sourceKey: source.key,
      sourceName: article.news_site || source.name,
      title: article.title,
      originalTitle: article.title,
      summary: article.summary ?? '',
      url: article.url,
      publishedAt: article.published_at,
      language: 'en',
      region: 'global',
      rawId: String(article.id),
      relatedLaunchIds: article.launches.map((launch) => launch.launch_id),
      companies: [],
      tags: [],
    }));
  },
};
