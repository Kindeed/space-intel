import type { SourceConfig } from '../../../../src/ingestion';

export function findEnabledAdminSourceByKey(sources: SourceConfig[], key: string): SourceConfig | null {
  const source = sources.find((item) => item.key === key);
  return source?.enabled ? source : null;
}
