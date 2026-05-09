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

const curationsConfigSchema = z.object({
  home_highlights: z.array(weightedUrlSchema).default([]),
  pinned_items: z.array(pinnedItemSchema).default([]),
  topics: z.array(topicCurationSchema).default([]),
});

export type CurationConfigRecord = {
  targetType: 'home' | 'pinned' | 'topic';
  targetKey: string;
  itemUrl: string;
  weight: number;
  note: string;
  enabled: number;
};

export function parseCurationsYaml(yamlText: string): CurationConfigRecord[] {
  const config = curationsConfigSchema.parse(parse(yamlText) ?? {});
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
