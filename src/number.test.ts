import { describe, expect, it } from 'vitest';
import { normalizeBoundedPositiveInteger, normalizePositiveInteger } from './number';

describe('number normalization helpers', () => {
  it('accepts positive integers and rejects decimals or invalid values', () => {
    expect(normalizePositiveInteger('12', 1)).toBe(12);
    expect(normalizePositiveInteger(' 12 ', 1)).toBe(12);
    expect(normalizePositiveInteger('001', 1)).toBe(1);
    expect(normalizePositiveInteger(8, 1)).toBe(8);
    expect(normalizePositiveInteger('3.9', 1)).toBe(1);
    expect(normalizePositiveInteger(3.9, 1)).toBe(1);
    expect(normalizePositiveInteger('1e3', 1)).toBe(1);
    expect(normalizePositiveInteger('+12', 1)).toBe(1);
    expect(normalizePositiveInteger(String(Number.MAX_SAFE_INTEGER + 1), 1)).toBe(1);
    expect(normalizePositiveInteger(Number.MAX_SAFE_INTEGER + 1, 1)).toBe(1);
    expect(normalizePositiveInteger('0', 1)).toBe(1);
    expect(normalizePositiveInteger('-2', 1)).toBe(1);
    expect(normalizePositiveInteger('abc', 1)).toBe(1);
    expect(normalizePositiveInteger('   ', 1)).toBe(1);
    expect(normalizePositiveInteger(null, 1)).toBe(1);
  });

  it('caps accepted positive integers', () => {
    expect(normalizeBoundedPositiveInteger(60, 20, 50)).toBe(50);
    expect(normalizeBoundedPositiveInteger('12', 20, 50)).toBe(12);
    expect(normalizeBoundedPositiveInteger('3.9', 20, 50)).toBe(20);
  });
});
