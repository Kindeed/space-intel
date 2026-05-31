import { parse } from 'yaml';
import { z } from 'zod';
import { routeSafeIdentifierSchema } from '../config/identifiers';
import { normalizeHttpUrl } from '../config/url';

const targetKeySchema = routeSafeIdentifierSchema('Curation target key');
const curationUrlSchema = z
  .string()
  .trim()
  .url()
  .transform((value, context) => {
    const normalized = normalizeHttpUrl(value);

    if (normalized === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Curation URL must be a public http or https URL',
      });
      return z.NEVER;
    }

    return normalized;
  });

const weightedUrlSchema = z.object({
  url: curationUrlSchema,
  weight: z.number().int().min(0).max(100).default(0),
  note: z.string().transform(normalizeDisplayText).default(''),
});

const pinnedItemSchema = weightedUrlSchema.extend({
  target: targetKeySchema,
});

const topicCurationSchema = z.object({
  slug: targetKeySchema,
  urls: z.array(curationUrlSchema).default([]),
  weight: z.number().int().min(0).max(100).default(0),
  note: z.string().transform(normalizeDisplayText).default(''),
});

const nullableArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === null ? undefined : value), z.array(schema).default([]));

const curationsConfigSchema = z.object({
  home_highlights: nullableArray(weightedUrlSchema),
  pinned_items: nullableArray(pinnedItemSchema),
  topics: nullableArray(topicCurationSchema),
});

export type CurationConfigRecord = {
  targetType: 'home' | 'pinned' | 'topic';
  targetKey: string;
  itemUrl: string;
  weight: number;
  note: string;
  enabled: number;
};

function assertUniqueCurationTargets(records: CurationConfigRecord[]): void {
  const seen = new Set<string>();

  for (const record of records) {
    const key = `${record.targetType}:${record.targetKey}:${record.itemUrl}`;

    if (seen.has(key)) {
      throw new Error(`Duplicate curation target: ${record.targetType}/${record.targetKey} ${record.itemUrl}`);
    }

    seen.add(key);
  }
}

function normalizeDisplayText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function parseCurationsConfig(input: unknown): CurationConfigRecord[] {
  const config = curationsConfigSchema.parse(input ?? {});
  const records: CurationConfigRecord[] = [];

  for (const item of config.home_highlights) {
    records.push({
      targetType: 'home',
      targetKey: 'highlights',
      itemUrl: item.url,
      weight: item.weight,
      note: item.note,
      enabled: 1,
    });
  }

  for (const item of config.pinned_items) {
    records.push({
      targetType: 'pinned',
      targetKey: item.target,
      itemUrl: item.url,
      weight: item.weight,
      note: item.note,
      enabled: 1,
    });
  }

  for (const topic of config.topics) {
    for (const itemUrl of topic.urls) {
      records.push({
        targetType: 'topic',
        targetKey: topic.slug,
        itemUrl,
        weight: topic.weight,
        note: topic.note,
        enabled: 1,
      });
    }
  }

  assertUniqueCurationTargets(records);
  return records;
}

export function parseCurationsYaml(yamlText: string): CurationConfigRecord[] {
  return parseCurationsConfig(parse(yamlText));
}
