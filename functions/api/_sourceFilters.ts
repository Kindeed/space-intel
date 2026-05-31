import sourcesConfig from '../../config/sources.generated.json';
import { parseSourcesConfig } from '../../src/ingestion/sourceConfig';
import type { SourceConfig } from '../../src/ingestion/types';
import { sourceDisplayName, stripAggregatorPrefix } from '../../src/sourceDisplay';

function normalizeSourceFilter(value: string): string {
  return stripAggregatorPrefix(value).toLowerCase();
}

export function createPublicSourceFilterToKey(sources: SourceConfig[]): (value: string | undefined) => string | undefined {
  const sourceKeyByPublicName = new Map<string, string>();

  for (const source of sources.filter((item) => item.enabled)) {
    sourceKeyByPublicName.set(normalizeSourceFilter(sourceDisplayName(source)), source.key);
    sourceKeyByPublicName.set(normalizeSourceFilter(source.name), source.key);
    sourceKeyByPublicName.set(normalizeSourceFilter(source.key), source.key);
  }

  return (value) => {
    const trimmed = value?.trim();

    if (!trimmed) {
      return undefined;
    }

    return sourceKeyByPublicName.get(normalizeSourceFilter(trimmed)) ?? trimmed;
  };
}

export const publicSourceFilterToKey = createPublicSourceFilterToKey(parseSourcesConfig(sourcesConfig));
