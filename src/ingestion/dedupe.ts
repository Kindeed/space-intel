import type { NormalizedItem } from './types';

export function normalizeDedupeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '')
    .replace(/\s+/g, ' ');
}

export function createDedupeKey(item: Pick<NormalizedItem, 'sourceKey' | 'title' | 'url' | 'rawId'>): string {
  if (item.sourceKey.startsWith('google-news-')) {
    return `google-news:${normalizeDedupeText(item.url)}:${normalizeDedupeText(item.title)}`;
  }

  if (item.rawId) {
    return `external:${item.sourceKey}:${normalizeDedupeText(item.rawId)}`;
  }

  return `article:${item.sourceKey}:${normalizeDedupeText(item.url)}:${normalizeDedupeText(item.title)}`;
}

export async function createDedupeHash(item: Pick<NormalizedItem, 'sourceKey' | 'title' | 'url' | 'rawId'>): Promise<string> {
  const bytes = new TextEncoder().encode(createDedupeKey(item));
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
