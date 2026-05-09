import { describe, expect, it } from 'vitest';
import { parseCurationsYaml } from './config';

describe('curation config', () => {
  it('normalizes home, pinned, and topic curations', () => {
    const records = parseCurationsYaml(`
home_highlights:
  - url: https://example.com/top
    weight: 100
    note: Top story
pinned_items:
  - target: capital
    url: https://example.com/filing
    weight: 80
topics:
  - slug: reusable-rockets
    weight: 60
    note: Reusable focus
    urls:
      - https://example.com/reusable
`);

    expect(records).toEqual([
      {
        targetType: 'home',
        targetKey: 'highlights',
        itemUrl: 'https://example.com/top',
        weight: 100,
        note: 'Top story',
        enabled: 1,
      },
      {
        targetType: 'pinned',
        targetKey: 'capital',
        itemUrl: 'https://example.com/filing',
        weight: 80,
        note: '',
        enabled: 1,
      },
      {
        targetType: 'topic',
        targetKey: 'reusable-rockets',
        itemUrl: 'https://example.com/reusable',
        weight: 60,
        note: 'Reusable focus',
        enabled: 1,
      },
    ]);
  });
});
