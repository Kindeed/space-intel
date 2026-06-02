import sourcesConfig from '../../config/sources.generated.json';
import { parseSourcesConfig } from '../../src/ingestion';
import { sourceDisplayName } from '../../src/sourceDisplay';

export type IngestionLogDiagnosticRow = {
  sourceKey: string;
  startedAt: string;
  finishedAt: string | null;
  successCount: number;
  failureCount: number;
  hasError?: number;
  error: string | null;
};

const sourceNameByKey = new Map(parseSourcesConfig(sourcesConfig).map((source) => [source.key, sourceDisplayName(source)]));

export function ingestionDiagnosticSourceName(sourceKey: string): string {
  return sourceNameByKey.get(sourceKey) ?? '来源';
}

export function ingestionDurationMs(startedAt: string, finishedAt: string | null): number | null {
  if (!finishedAt) {
    return null;
  }

  const started = new Date(startedAt).getTime();
  const finished = new Date(finishedAt).getTime();

  if (Number.isNaN(started) || Number.isNaN(finished)) {
    return null;
  }

  return Math.max(0, finished - started);
}

export function ingestionErrorCategory(error: string | null): string | null {
  const message = error?.toLowerCase() ?? '';

  if (!message) {
    return null;
  }

  if (message.includes('timed out') || message.includes('timeout')) {
    return 'timeout';
  }

  if (message.includes('abort')) {
    return 'aborted';
  }

  if (message.includes('http ')) {
    return 'http_error';
  }

  if (message.includes('d1_error') || message.includes('no such column') || message.includes('database')) {
    return 'db_error';
  }

  if (message.includes('parse') || message.includes('unexpected token') || message.includes('invalid')) {
    return 'parse_error';
  }

  return 'ingestion_error';
}
