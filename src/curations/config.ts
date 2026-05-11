import { parse } from 'yaml';
import { z } from 'zod';

const weightedUrlSchema = z.object({
  url: z.string().url(),
  weight: z.number().int().default(0),
  note: z.string().default(''),
});

const pinnedItemSchema = weightedUrlSchema.extend({
  target: z.string().min(1),
});

const topicCurationSchema = z.object({
  slug: z.string().min(1),
  urls: z.array(z.string().url()).default([]),
  weight: z.number().int().default(0),
  note: z.string().default(''),
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

  return records;
}

export function parseCurationsYaml(yamlText: string): CurationConfigRecord[] {
  return parseCurationsConfig(parse(yamlText));
}
