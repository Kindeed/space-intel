import type { SourceCollector, SourceType } from '../types';

export function createPlaceholderCollector(type: SourceType): SourceCollector {
  return {
    type,
    async collect() {
      return [];
    },
  };
}
