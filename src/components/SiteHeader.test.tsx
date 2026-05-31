import { describe, expect, it } from 'vitest';
import { articleSearchPath, commandCompanyLabel, commandSearchLabel, commandSearchPath, commandTopicLabel } from './SiteHeader.utils';

describe('SiteHeader command search', () => {
  it('builds article search paths from command palette input', () => {
    expect(commandSearchPath(' Rocket Lab ')).toBe('/articles?query=Rocket+Lab');
    expect(commandSearchPath('Rocket   Lab')).toBe('/articles?query=Rocket+Lab');
    expect(commandSearchPath('可回收火箭')).toBe('/articles?query=%E5%8F%AF%E5%9B%9E%E6%94%B6%E7%81%AB%E7%AE%AD');
    expect(commandSearchPath('   ')).toBeNull();
  });

  it('builds normalized visible command search labels', () => {
    expect(commandSearchLabel(' Rocket   Lab ')).toBe('Rocket Lab');
    expect(commandSearchLabel(' 可回收   火箭 ')).toBe('可回收 火箭');
    expect(commandSearchLabel('   ')).toBeNull();
  });

  it('normalizes command entity labels before rendering menu items', () => {
    expect(commandCompanyLabel(' Rocket   Lab ')).toBe('Rocket Lab');
    expect(commandCompanyLabel('   ')).toBe('公司档案');
    expect(commandTopicLabel(' 可回收   火箭 ')).toBe('可回收 火箭');
    expect(commandTopicLabel(null)).toBe('专题记录');
  });

  it('builds clean visible search form paths', () => {
    expect(articleSearchPath(' Rocket   Lab ')).toBe('/articles?query=Rocket+Lab');
    expect(articleSearchPath('   ')).toBe('/articles');
  });
});
