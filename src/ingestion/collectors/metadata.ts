import type { CollectorContext } from '../types';
import { decodeHtml } from '../htmlList';

function removeHtmlTags(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?(?:article|blockquote|br|div|footer|h[1-6]|header|li|ol|p|section|table|tbody|td|th|thead|tr|ul)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '');
}

function collectorText(value: string): string {
  return decodeHtml(removeHtmlTags(decodeHtml(removeHtmlTags(value))));
}

export function stripHtml(value: string): string {
  return collectorText(value);
}

export function collectorDisplayText(value: string | null | undefined, fallback: string): string {
  const decodedValue = value ? collectorText(value) : '';
  const decodedFallback = collectorText(fallback);

  return decodedValue || decodedFallback;
}

export function collectorOptionalDisplayText(value: string | null | undefined): string | null {
  return collectorDisplayText(value, '') || null;
}

export function collectorPublishedAt(value: string | null | undefined, context: CollectorContext): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return context.now().toISOString();
  }

  return collectorOptionalIsoDate(trimmed) ?? context.now().toISOString();
}

export function collectorOptionalIsoDate(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
