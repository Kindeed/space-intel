import { createDedupeHash } from './dedupe';
import type { CollectorContext, NormalizedItem, SourceConfig } from './types';
import type { CollectorRegistry } from './registry';

export type IngestionRecord = {
  item: NormalizedItem;
  dedupeHash: string;
};

export async function collectSource(
  source: SourceConfig,
  registry: CollectorRegistry,
  context: CollectorContext,
): Promise<IngestionRecord[]> {
  if (!source.enabled) {
    return [];
  }

  const collector = registry.get(source);
  const items = await collector.collect(source, context);

  return Promise.all(
    items.map(async (item) => ({
      item,
      dedupeHash: await createDedupeHash(item, source.dedupe_strategy),
    })),
  );
}
