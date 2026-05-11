import { describe, expect, it } from 'vitest';
import { parseCompaniesYaml, parseTopicsYaml } from './config';

describe('catalog config', () => {
  it('normalizes company config defaults', () => {
    const records = parseCompaniesYaml(`
companies:
  - slug: rocket-lab
    name: Rocket Lab
    country: United States
    sector: Launch
`);

    expect(records).toEqual([
      {
        slug: 'rocket-lab',
        name: 'Rocket Lab',
        englishName: '',
        country: 'United States',
        sector: 'Launch',
        website: '',
        profile: '',
        stockSymbol: '',
        logoUrl: '',
      },
    ]);
  });

  it('normalizes topic config keywords', () => {
    const records = parseTopicsYaml(`
topics:
  - slug: reusable-rockets
    name: 可回收火箭
    category: technology
    keywords: [可回收火箭, reusable rocket]
`);

    expect(records).toEqual([
      {
        slug: 'reusable-rockets',
        name: '可回收火箭',
        category: 'technology',
        keywords: ['可回收火箭', 'reusable rocket'],
      },
    ]);
  });
});
