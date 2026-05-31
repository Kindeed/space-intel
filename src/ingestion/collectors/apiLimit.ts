import { normalizeBoundedPositiveInteger } from '../../number';
import type { SourceConfig } from '../types';

const defaultApiRequestLimit = 25;
const maxApiRequestLimit = 100;

export function apiRequestLimit(source: SourceConfig, url: URL): number {
  return normalizeBoundedPositiveInteger(source.max_items ?? url.searchParams.get('limit'), defaultApiRequestLimit, maxApiRequestLimit);
}
