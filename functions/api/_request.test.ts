import { describe, expect, it } from 'vitest';
import { parseOptionalPositiveInteger, parseOptionalText, parsePositiveInteger } from './_request';

describe('API request parsing', () => {
  it('parses optional positive integers and rejects invalid values', () => {
    expect(parseOptionalPositiveInteger('12')).toBe(12);
    expect(parseOptionalPositiveInteger(' 12 ')).toBe(12);
    expect(parseOptionalPositiveInteger('001')).toBe(1);
    expect(parseOptionalPositiveInteger('3.9')).toBeUndefined();
    expect(parseOptionalPositiveInteger(null)).toBeUndefined();
    expect(parseOptionalPositiveInteger('0')).toBeUndefined();
    expect(parseOptionalPositiveInteger('-2')).toBeUndefined();
    expect(parseOptionalPositiveInteger('+12')).toBeUndefined();
    expect(parseOptionalPositiveInteger('1e3')).toBeUndefined();
    expect(parseOptionalPositiveInteger(String(Number.MAX_SAFE_INTEGER + 1))).toBeUndefined();
    expect(parseOptionalPositiveInteger('abc')).toBeUndefined();
  });

  it('falls back when required positive integers are absent or invalid', () => {
    expect(parsePositiveInteger('8', 20)).toBe(8);
    expect(parsePositiveInteger('1e3', 20)).toBe(20);
    expect(parsePositiveInteger('0', 20)).toBe(20);
    expect(parsePositiveInteger('-4', 20)).toBe(20);
    expect(parsePositiveInteger(null, 20)).toBe(20);
  });

  it('trims optional text and rejects empty values', () => {
    expect(parseOptionalText('  snapi  ')).toBe('snapi');
    expect(parseOptionalText(' rocket lab ')).toBe('rocket lab');
    expect(parseOptionalText('   ')).toBeUndefined();
    expect(parseOptionalText(null)).toBeUndefined();
  });
});
