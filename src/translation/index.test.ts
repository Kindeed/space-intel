import { describe, expect, it } from 'vitest';
import { translationMaxItemsPerSource } from './index';

describe('translation configuration', () => {
  it('accepts only positive integer max item limits', () => {
    expect(translationMaxItemsPerSource({ TRANSLATION_MAX_ITEMS_PER_SOURCE: '8' })).toBe(8);
    expect(translationMaxItemsPerSource({ TRANSLATION_MAX_ITEMS_PER_SOURCE: '4.9' })).toBe(8);
    expect(translationMaxItemsPerSource({ TRANSLATION_MAX_ITEMS_PER_SOURCE: '0' })).toBe(8);
    expect(translationMaxItemsPerSource(undefined)).toBe(8);
  });
});
