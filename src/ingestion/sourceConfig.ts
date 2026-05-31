import { z } from 'zod';
import { parse } from 'yaml';
import { routeSafeIdentifierSchema } from '../config/identifiers';
import { normalizeHttpUrl } from '../config/url';
import { sourceDisplayName } from '../sourceDisplay';
import { defaultDomesticAccess, defaultPublicCategoryByType } from '../sourceMetadata';
import { sourceDedupeStrategies, type SourceConfig } from './types';

const sourceKeySchema = routeSafeIdentifierSchema('Source key');
const sourceDedupeStrategySchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(z.enum(sourceDedupeStrategies));
const requiredDisplayTextSchema = z
  .string()
  .transform(normalizeConfigText)
  .pipe(z.string().min(1));
const optionalDisplayTextSchema = z
  .string()
  .transform(normalizeConfigText)
  .transform((value) => value || undefined)
  .optional();
const sourceUrlSchema = z
  .string()
  .trim()
  .url()
  .transform((value, context) => {
    const normalized = normalizeHttpUrl(value);

    if (normalized === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source URL must be a public http or https URL',
      });
      return z.NEVER;
    }

    return normalized;
  });

const sourceSchema = z.object({
  key: sourceKeySchema,
  name: requiredDisplayTextSchema,
  type: z.enum(['api', 'rss', 'google_news_rss', 'rsshub', 'official_page', 'procurement_page']),
  region: z.enum(['cn', 'global']),
  url: sourceUrlSchema,
  credibility: z.number().int().min(1).max(5),
  enabled: z.boolean(),
  purpose: requiredDisplayTextSchema,
  expected_content: requiredDisplayTextSchema,
  risk_notes: requiredDisplayTextSchema,
  dedupe_strategy: sourceDedupeStrategySchema,
  default_tags: z.array(z.string()).optional(),
  default_companies: z.array(z.string()).optional(),
  include_terms: z.array(z.string()).optional(),
  exclude_terms: z.array(z.string()).optional(),
  max_items: z.number().int().min(1).max(100).optional(),
  public_category: z.enum(['official', 'media', 'organization', 'notice', 'data', 'source']).optional(),
  access_domestic: z.enum(['direct', 'limited', 'blocked', 'unknown']).optional(),
  access_global: z.enum(['direct', 'limited', 'blocked', 'unknown']).optional(),
  access_note: optionalDisplayTextSchema,
  public_badge: optionalDisplayTextSchema,
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

  const sources = parsed.sources.map((source) => ({
    ...source,
    default_tags: normalizeOptionalList(source.default_tags, referenceKey, normalizeConfigText),
    default_companies: normalizeOptionalList(source.default_companies, referenceKey, normalizeConfigText),
    include_terms: normalizeOptionalList(source.include_terms, termKey, normalizeTerm),
    exclude_terms: normalizeOptionalList(source.exclude_terms, termKey, normalizeTerm),
    public_category: source.public_category ?? defaultPublicCategoryByType[source.type],
    access_domestic: source.access_domestic ?? defaultDomesticAccess(source.region),
    access_global: source.access_global ?? 'direct',
  }));

  assertUniqueEnabledDisplayNames(sources);

  return sources;
}

export type SourceDefaultReferenceCatalog = {
  topicSlugs: Iterable<string>;
  companyIdentifiers: Iterable<string>;
};

export function assertValidSourceDefaultReferences(sources: SourceConfig[], catalog: SourceDefaultReferenceCatalog): void {
  const topicSlugs = new Set([...catalog.topicSlugs].map(referenceKey).filter(Boolean));
  const companyIdentifiers = new Set([...catalog.companyIdentifiers].map(referenceKey).filter(Boolean));

  for (const source of sources) {
    for (const tag of source.default_tags ?? []) {
      if (!topicSlugs.has(referenceKey(tag))) {
        throw new Error(`Unknown default tag "${tag}" in source ${source.key}`);
      }
    }

    for (const company of source.default_companies ?? []) {
      if (!companyIdentifiers.has(referenceKey(company))) {
        throw new Error(`Unknown default company "${company}" in source ${source.key}`);
      }
    }
  }
}

function referenceKey(value: string): string {
  return normalizeConfigText(value).toLowerCase();
}

function normalizeConfigText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeTerm(value: string): string {
  return normalizeConfigText(value);
}

function termKey(value: string): string {
  return normalizeTerm(value).toLowerCase();
}

function assertUniqueEnabledDisplayNames(sources: SourceConfig[]): void {
  const seen = new Map<string, string>();

  for (const source of sources.filter((item) => item.enabled)) {
    const displayName = sourceDisplayName(source);
    const normalizedDisplayName = displayName.toLowerCase();
    const existingKey = seen.get(normalizedDisplayName);

    if (existingKey) {
      throw new Error(`Duplicate enabled source display name: ${displayName} (${existingKey}, ${source.key})`);
    }

    seen.set(normalizedDisplayName, source.key);
  }
}

function normalizeOptionalList(
  values: string[] | undefined,
  keyForValue: (value: string) => string = (value) => value,
  normalizeValue: (value: string) => string = (value) => value.trim(),
): string[] | undefined {
  if (!values) {
    return undefined;
  }

  const seen = new Set<string>();
  const normalized = values
    .map((value) => normalizeValue(value))
    .filter((value) => {
      if (!value) {
        return false;
      }

      const key = keyForValue(value);
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  return values.length > 0 && normalized.length === 0 ? undefined : normalized;
}

export function parseSourcesYaml(input: string): SourceConfig[] {
  return parseSourcesConfig(parse(input));
}

export function getEnabledSources(sources: SourceConfig[]): SourceConfig[] {
  return sources.filter((source) => source.enabled);
}
