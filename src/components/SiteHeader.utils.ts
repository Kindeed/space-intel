import { displayCompanyName, displayTopicName } from '../utils';

function normalizedCommandText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function commandSearchPath(query: string): string | null {
  const trimmed = normalizedCommandText(query);

  if (!trimmed) {
    return null;
  }

  const params = new URLSearchParams({ query: trimmed });
  return `/articles?${params.toString()}`;
}

export function articleSearchPath(query: string): string {
  return commandSearchPath(query) ?? '/articles';
}

export function commandSearchLabel(query: string): string | null {
  return normalizedCommandText(query) || null;
}

export function commandCompanyLabel(name: string | null | undefined): string {
  return displayCompanyName(name, '公司档案');
}

export function commandTopicLabel(name: string | null | undefined): string {
  return displayTopicName(name, '专题记录');
}
