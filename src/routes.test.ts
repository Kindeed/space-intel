import { describe, expect, it } from 'vitest';
import { articleDetailPath, companyDetailPath, launchDetailPath, topicDetailPath } from './routes';

describe('route helpers', () => {
  it('encodes dynamic detail route segments', () => {
    expect(articleDetailPath('story 42/alpha?x=1')).toBe('/articles/story%2042%2Falpha%3Fx%3D1');
    expect(companyDetailPath('rocket lab/us')).toBe('/companies/rocket%20lab%2Fus');
    expect(topicDetailPath('reusable rockets')).toBe('/topics/reusable%20rockets');
    expect(launchDetailPath('ll2/demo id')).toBe('/launches/ll2%2Fdemo%20id');
  });

  it('trims route segment boundaries before encoding', () => {
    expect(articleDetailPath(' story 42/alpha ')).toBe('/articles/story%2042%2Falpha');
    expect(companyDetailPath(' rocket-lab ')).toBe('/companies/rocket-lab');
    expect(topicDetailPath(' reusable rockets ')).toBe('/topics/reusable%20rockets');
    expect(launchDetailPath(' ll2/demo id ')).toBe('/launches/ll2%2Fdemo%20id');
  });

  it('keeps simple route identifiers unchanged', () => {
    expect(articleDetailPath(42)).toBe('/articles/42');
    expect(companyDetailPath('rocket-lab')).toBe('/companies/rocket-lab');
    expect(topicDetailPath('reusable-rockets')).toBe('/topics/reusable-rockets');
    expect(launchDetailPath('ll2-demo')).toBe('/launches/ll2-demo');
  });
});
