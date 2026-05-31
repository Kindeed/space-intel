import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCompaniesYaml, parseTopicsYaml } from './config';
import { companyCountryIds, companySectorIds, companySectorValues } from './companyTaxonomy';
import { topicCategoryIds } from './topicCategories';

describe('catalog config', () => {
  it('normalizes company config defaults', () => {
    const records = parseCompaniesYaml(`
companies:
  - slug: ' rocket-lab '
    name: ' Rocket   Lab '
    english_name: ' Rocket\tLab USA '
    country: ' United   States '
    sector: ' Launch,   satellite   internet, Launch '
    website: ' https://WWW.ROCKETLABUSA.com '
    profile: ' Launch and   space systems company. '
    stock_symbol: ' NASDAQ:   RKLB '
    logo_url: ' https://EXAMPLE.com/rocket-lab.svg '
`);

    expect(records).toEqual([
      {
        slug: 'rocket-lab',
        name: 'Rocket Lab',
        englishName: 'Rocket Lab USA',
        country: 'United States',
        sector: 'Launch, satellite internet',
        website: 'https://www.rocketlabusa.com/',
        profile: 'Launch and space systems company.',
        stockSymbol: 'NASDAQ: RKLB',
        logoUrl: 'https://example.com/rocket-lab.svg',
      },
    ]);
  });

  it('treats blank optional company URLs as absent', () => {
    const records = parseCompaniesYaml(`
companies:
  - slug: rocket-lab
    name: Rocket Lab
    country: United States
    sector: Launch
    website: '   '
    logo_url: ''
`);

    expect(records[0].website).toBe('');
    expect(records[0].logoUrl).toBe('');
  });

  it('rejects unsupported company countries and sectors', () => {
    expect(() =>
      parseCompaniesYaml(`
companies:
  - slug: rocket-lab
    name: Rocket Lab
    country: New Zealand
    sector: Launch
`),
    ).toThrow();

    expect(() =>
      parseCompaniesYaml(`
companies:
  - slug: rocket-lab
    name: Rocket Lab
    country: United States
    sector: Launch, Unknown sector
`),
    ).toThrow('Company sector must use supported values');

    expect(() =>
      parseCompaniesYaml(`
companies:
  - slug: rocket-lab
    name: Rocket Lab
    country: United States
    sector: Launch,
`),
    ).toThrow('Company sector must use supported values');
  });

  it('accepts configured sector aliases that have public labels', () => {
    const records = parseCompaniesYaml(`
companies:
  - slug: spacex
    name: SpaceX
    country: United States
    sector: ' Launch,   satellite   internet '
`);

    expect(records[0].sector).toBe('Launch, satellite internet');
  });

  it('dedupes repeated company sectors after whitespace and case normalization', () => {
    const records = parseCompaniesYaml(`
companies:
  - slug: spacex
    name: SpaceX
    country: United States
    sector: ' Launch, launch, Satellite   internet, satellite internet '
`);

    expect(records[0].sector).toBe('Launch, Satellite internet');
  });

  it('normalizes topic config keywords', () => {
    const records = parseTopicsYaml(`
topics:
  - slug: ' reusable-rockets '
    name: ' 可回收   火箭 '
    category: ' technology '
    keywords: [' 可回收   火箭 ', reusable   rocket, 'Reusable Rocket', reusable rocket, '   ']
`);

    expect(records).toEqual([
      {
        slug: 'reusable-rockets',
        name: '可回收 火箭',
        category: 'technology',
        keywords: ['可回收 火箭', 'reusable rocket'],
      },
    ]);
  });

  it('rejects topics without usable keywords', () => {
    expect(() =>
      parseTopicsYaml(`
topics:
  - slug: reusable-rockets
    name: 可回收火箭
    category: technology
    keywords: ['   ', '']
`),
    ).toThrow('Topic must define at least one keyword: reusable-rockets');
  });

  it('rejects unsupported topic categories', () => {
    expect(() =>
      parseTopicsYaml(`
topics:
  - slug: reusable-rockets
    name: 可回收火箭
    category: marketplace
    keywords: [reusable rocket]
`),
    ).toThrow();
  });

  it('rejects duplicate company and topic slugs', () => {
    expect(() =>
      parseCompaniesYaml(`
companies:
  - slug: rocket-lab
    name: Rocket Lab
    country: United States
    sector: Launch
  - slug: ' rocket-lab '
    name: Rocket Lab Duplicate
    country: United States
    sector: Launch
`),
    ).toThrow('Duplicate company slug: rocket-lab');

    expect(() =>
      parseTopicsYaml(`
topics:
  - slug: reusable-rockets
    name: 可回收火箭
    category: technology
  - slug: ' reusable-rockets '
    name: 重复专题
    category: technology
`),
    ).toThrow('Duplicate topic slug: reusable-rockets');
  });

  it('rejects route-unsafe company and topic slugs', () => {
    expect(() =>
      parseCompaniesYaml(`
companies:
  - slug: Rocket_Lab
    name: Rocket Lab
    country: United States
    sector: Launch
`),
    ).toThrow('Slug must use lowercase letters, numbers, and single hyphen separators');

    expect(() =>
      parseTopicsYaml(`
topics:
  - slug: reusable rockets
    name: 可回收火箭
    category: technology
`),
    ).toThrow('Slug must use lowercase letters, numbers, and single hyphen separators');
  });

  it('rejects non-web company URLs', () => {
    expect(() =>
      parseCompaniesYaml(`
companies:
  - slug: rocket-lab
    name: Rocket Lab
    country: United States
    sector: Launch
    website: ftp://example.com/company
`),
    ).toThrow('Catalog URL must be a public http or https URL');

    expect(() =>
      parseCompaniesYaml(`
companies:
  - slug: rocket-lab
    name: Rocket Lab
    country: United States
    sector: Launch
    logo_url: data:image/svg+xml;base64,PHN2Zy8+
`),
    ).toThrow('Catalog URL must be a public http or https URL');

    expect(() =>
      parseCompaniesYaml(`
companies:
  - slug: rocket-lab
    name: Rocket Lab
    country: United States
    sector: Launch
    website: https://user:pass@example.com/company
`),
    ).toThrow('Catalog URL must be a public http or https URL');
  });

  it('validates the repository catalog configuration', () => {
    const companiesYaml = readFileSync(resolve(process.cwd(), 'config/companies.yaml'), 'utf8');
    const topicsYaml = readFileSync(resolve(process.cwd(), 'config/topics.yaml'), 'utf8');
    const companies = parseCompaniesYaml(companiesYaml);
    const topics = parseTopicsYaml(topicsYaml);

    expect(companies.length).toBeGreaterThanOrEqual(20);
    expect(topics.length).toBeGreaterThanOrEqual(5);
    expect(new Set(companies.map((company) => company.slug)).size).toBe(companies.length);
    expect(new Set(topics.map((topic) => topic.slug)).size).toBe(topics.length);
    expect(companies.every((company) => companyCountryIds.includes(company.country))).toBe(true);
    expect(
      companies.every((company) =>
        companySectorValues(company.sector).every((sector) => companySectorIds.includes(sector as (typeof companySectorIds)[number])),
      ),
    ).toBe(true);
    expect(topics.every((topic) => topic.keywords.length > 0)).toBe(true);
    expect(topics.every((topic) => topicCategoryIds.includes(topic.category))).toBe(true);
  });
});
