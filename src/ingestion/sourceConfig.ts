import { z } from 'zod';
import { parse } from 'yaml';
import type { SourceConfig } from './types';

const sourceSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['api', 'rss', 'google_news_rss', 'rsshub', 'official_page', 'capital_filing']),
  region: z.enum(['cn', 'global']),
  url: z.string().url(),
  credibility: z.number().int().min(1).max(5),
  enabled: z.boolean(),
  purpose: z.string().min(1),
  expected_content: z.string().min(1),
  risk_notes: z.string(),
  dedupe_strategy: z.string().min(1),
  default_tags: z.array(z.string().min(1)).optional(),
  default_companies: z.array(z.string().min(1)).optional(),
});

const sourcesFileSchema = z.object({
  sources: z.array(sourceSchema).min(1),
});

export function parseSourcesConfig(input: unknown): SourceConfig[] {
  const parsed = sourcesFileSchema.parse(input);
  const seen = new Set<string>();

  for (const source of parsed.sources) {
    if (seen.has(source.key)) {
      throw new Error(`Duplicate source key: ${source.key}`);
    }

    seen.add(source.key);
  }

  return parsed.sources;
}

export function parseSourcesYaml(input: string): SourceConfig[] {
  return parseSourcesConfig(parse(input));
}

export function getEnabledSources(sources: SourceConfig[]): SourceConfig[] {
  return sources.filter((source) => source.enabled);
}
