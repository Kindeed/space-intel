import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCurationsYaml } from './config';

describe('curation config', () => {
  it('treats commented-out YAML sections as empty arrays', () => {
    const records = parseCurationsYaml(`
home_highlights:
  # - url: https://example.com/top
pinned_items:
  # - target: policy
topics:
  # - slug: reusable-rockets
`);

    expect(records).toEqual([]);
  });

  it('normalizes home, pinned, and topic curations', () => {
    const records = parseCurationsYaml(`
home_highlights:
  - url: ' https://EXAMPLE.com/top '
    weight: 100
    note: ' Top   story '
pinned_items:
  - target: ' policy '
    url: ' https://example.com/policy '
    weight: 80
topics:
  - slug: ' reusable-rockets '
    weight: 60
    note: ' Reusable\tfocus '
    urls:
      - ' https://example.com/reusable '
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
        targetKey: 'policy',
        itemUrl: 'https://example.com/policy',
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

  it('rejects duplicate curation targets', () => {
    expect(() =>
      parseCurationsYaml(`
home_highlights:
  - url: https://EXAMPLE.com/top
    weight: 100
  - url: https://example.com/top
    weight: 80
`),
    ).toThrow('Duplicate curation target: home/highlights https://example.com/top');

    expect(() =>
      parseCurationsYaml(`
topics:
  - slug: reusable-rockets
    urls:
      - https://example.com/reusable
      - ' https://example.com/reusable '
`),
    ).toThrow('Duplicate curation target: topic/reusable-rockets https://example.com/reusable');

    expect(() =>
      parseCurationsYaml(`
pinned_items:
  - target: policy
    url: https://example.com/policy
  - target: ' policy '
    url: ' https://example.com/policy '
`),
    ).toThrow('Duplicate curation target: pinned/policy https://example.com/policy');
  });

  it('rejects route-unsafe curation target keys', () => {
    expect(() =>
      parseCurationsYaml(`
pinned_items:
  - target: Policy_Page
    url: https://example.com/policy
`),
    ).toThrow('Curation target key must use lowercase letters, numbers, and single hyphen separators');

    expect(() =>
      parseCurationsYaml(`
topics:
  - slug: reusable rockets
    urls:
      - https://example.com/reusable
`),
    ).toThrow('Curation target key must use lowercase letters, numbers, and single hyphen separators');
  });

  it('rejects non-public curation URLs', () => {
    expect(() =>
      parseCurationsYaml(`
home_highlights:
  - url: ftp://example.com/top
`),
    ).toThrow('Curation URL must be a public http or https URL');

    expect(() =>
      parseCurationsYaml(`
topics:
  - slug: reusable-rockets
    urls:
      - mailto:editor@example.com
`),
    ).toThrow('Curation URL must be a public http or https URL');

    expect(() =>
      parseCurationsYaml(`
home_highlights:
  - url: https://user:pass@example.com/top
`),
    ).toThrow('Curation URL must be a public http or https URL');
  });

  it('rejects curation weights outside the public ranking range', () => {
    expect(() =>
      parseCurationsYaml(`
home_highlights:
  - url: https://example.com/top
    weight: 101
`),
    ).toThrow();

    expect(() =>
      parseCurationsYaml(`
topics:
  - slug: reusable-rockets
    weight: -1
    urls:
      - https://example.com/reusable
`),
    ).toThrow();
  });

  it('validates the repository curation configuration', () => {
    const yaml = readFileSync(resolve(process.cwd(), 'config/curations.yaml'), 'utf8');
    const records = parseCurationsYaml(yaml);

    expect(records.every((record) => ['home', 'pinned', 'topic'].includes(record.targetType))).toBe(true);
    expect(records.every((record) => record.targetKey.length > 0)).toBe(true);
    expect(records.every((record) => record.itemUrl.startsWith('http'))).toBe(true);
  });
});
