import { describe, expect, it } from 'vitest';
import { normalizeHttpUrl } from './url';

describe('normalizeHttpUrl', () => {
  it('normalizes only http and https URLs', () => {
    expect(normalizeHttpUrl(' https://example.com/article ')).toBe('https://example.com/article');
    expect(normalizeHttpUrl('http://example.com/path')).toBe('http://example.com/path');
    expect(normalizeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeHttpUrl('data:text/html,hi')).toBeNull();
    expect(normalizeHttpUrl('   ')).toBeNull();
    expect(normalizeHttpUrl(null)).toBeNull();
  });

  it('rejects URLs that contain credentials', () => {
    expect(normalizeHttpUrl('https://user@example.com/article')).toBeNull();
    expect(normalizeHttpUrl('https://user:pass@example.com/article')).toBeNull();
    expect(normalizeHttpUrl('/news/item', 'https://user:pass@example.com/list')).toBeNull();
  });

  it('resolves relative URLs only when a base URL is provided', () => {
    expect(normalizeHttpUrl('/news/item', 'https://example.com/list')).toBe('https://example.com/news/item');
    expect(normalizeHttpUrl('/news/item')).toBeNull();
  });
});
