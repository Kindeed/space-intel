import type { NormalizedItem, SourceDedupeStrategy } from './types';

export function normalizeDedupeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '')
    .replace(/\s+/g, ' ');
}

function defaultDedupeStrategy(item: Pick<NormalizedItem, 'sourceKey' | 'rawId'>): SourceDedupeStrategy {
  if (item.sourceKey.startsWith('google-news-')) {
    return 'canonical_url_title';
  }

  if (item.rawId) {
    return 'external_id';
  }

  return 'url_title_source';
}

export function createDedupeKey(
  item: Pick<NormalizedItem, 'sourceKey' | 'title' | 'url' | 'rawId'>,
  strategy: SourceDedupeStrategy = defaultDedupeStrategy(item),
): string {
  if (strategy === 'canonical_url_title') {
    return `google-news:${normalizeDedupeText(item.url)}:${normalizeDedupeText(item.title)}`;
  }

  if (strategy === 'external_id' && item.rawId) {
    return `external:${item.sourceKey}:${normalizeDedupeText(item.rawId)}`;
  }

  return `article:${item.sourceKey}:${normalizeDedupeText(item.url)}:${normalizeDedupeText(item.title)}`;
}

export async function createDedupeHash(
  item: Pick<NormalizedItem, 'sourceKey' | 'title' | 'url' | 'rawId'>,
  strategy?: SourceDedupeStrategy,
): Promise<string> {
  const bytes = new TextEncoder().encode(createDedupeKey(item, strategy));
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
