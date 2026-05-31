import { describe, expect, it } from 'vitest';
import {
  publicCompany,
  publicCompanyCountryLabel,
  publicCompanyDetail,
  publicCompanyListResult,
  publicCompanySectorLabel,
} from './_companies';
import type { CompanyDetail, CompanyRow } from '../../src/db/companyQueries';

const company: CompanyRow = {
  id: 1,
  slug: 'rocket-lab',
  name: 'Rocket Lab',
  englishName: 'Rocket Lab',
  country: 'United States',
  sector: 'Launch, spacecraft',
  website: 'https://www.rocketlabusa.com/',
  profile: '',
  stockSymbol: 'RKLB',
  logoUrl: null,
  articleCount: 2,
};

describe('public company serializers', () => {
  it('adds public Chinese country and sector labels to company list payloads', () => {
    const result = publicCompanyListResult({ items: [company] });

    expect(result.items[0]).toMatchObject({
      countryLabel: '美国',
      sectorLabel: '发射服务、航天器',
    });
    expect('id' in result.items[0]).toBe(false);
    expect('country' in result.items[0]).toBe(false);
    expect('sector' in result.items[0]).toBe(false);
  });

  it('adds public labels to company detail payloads and sanitizes nested articles', () => {
    const detail: CompanyDetail = {
      ...company,
      articles: [
        {
          id: 42,
          title: 'Reusable rocket milestone',
          originalTitle: 'Reusable rocket milestone',
          summary: 'Short summary only.',
          originalSummary: 'Short summary only.',
          url: 'https://example.com/article',
          sourceKey: 'snapi',
          sourceName: 'Spaceflight News',
          sourceType: 'api',
          publisherName: 'Spaceflight News',
          publishedAt: '2026-05-30T00:00:00Z',
          language: 'en',
          region: 'global',
          fetchStatus: 'fetched',
          translationStatus: 'translated',
          translationProvider: 'hy_mt_1_8b',
          tags: [],
          companies: [],
        },
      ],
    };

    const result = publicCompanyDetail(detail);

    expect(result.countryLabel).toBe('美国');
    expect(result.sectorLabel).toBe('发射服务、航天器');
    expect('id' in result).toBe(false);
    expect('country' in result).toBe(false);
    expect('sector' in result).toBe(false);
    expect(result.articles[0]).toMatchObject({
      sourceCategoryLabel: '专业媒体',
    });
    expect(JSON.stringify(result)).not.toContain('sourceKey');
    expect(JSON.stringify(result)).not.toContain('fetchStatus');
  });

  it('maps known country and sector values while using Chinese fallbacks for unknown values', () => {
    expect(publicCompanyCountryLabel('China')).toBe('中国');
    expect(publicCompanyCountryLabel('United States')).toBe('美国');
    expect(publicCompanyCountryLabel(' United   States ')).toBe('美国');
    expect(publicCompanyCountryLabel('Japan')).toBe('地区待确认');
    expect(publicCompanyCountryLabel('   ')).toBe('地区待确认');
    expect(publicCompanySectorLabel('Launch, satellite internet')).toBe('发射服务、卫星互联网');
    expect(publicCompanySectorLabel(' Launch,   Satellite   internet ')).toBe('发射服务、卫星互联网');
    expect(publicCompanySectorLabel('Launch, launch, Satellite internet, satellite internet')).toBe('发射服务、卫星互联网');
    expect(publicCompanySectorLabel('Launch, lunar services')).toBe('发射服务、月球服务');
    expect(publicCompanySectorLabel('Remote sensing, spacecraft')).toBe('遥感数据、航天器');
    expect(publicCompanySectorLabel('Unknown sector')).toBe('赛道待确认');
    expect(publicCompanySectorLabel('Launch, Unknown sector')).toBe('发射服务、赛道待确认');
    expect(publicCompanySectorLabel('   ')).toBe('赛道待确认');
  });

  it('serializes individual companies with public labels', () => {
    const result = publicCompany(company);

    expect(result).toMatchObject({
      countryLabel: '美国',
      sectorLabel: '发射服务、航天器',
    });
    expect('id' in result).toBe(false);
    expect('country' in result).toBe(false);
    expect('sector' in result).toBe(false);
  });

  it('normalizes blank and padded public company fields', () => {
    const result = publicCompany({
      ...company,
      slug: ' rocket-lab ',
      name: ' Rocket   Lab ',
      englishName: ' Rocket\tLab USA ',
      country: ' United States ',
      sector: ' Launch, spacecraft ',
      website: '   ',
      profile: '  Launch\nprovider.  ',
      stockSymbol: '   ',
      logoUrl: '  ',
    });

    expect(result).toMatchObject({
      slug: 'rocket-lab',
      name: 'Rocket Lab',
      englishName: 'Rocket Lab USA',
      countryLabel: '美国',
      sectorLabel: '发射服务、航天器',
      website: null,
      profile: 'Launch provider.',
      stockSymbol: null,
      logoUrl: null,
    });
  });

  it('returns null for unsafe or blank public company URLs', () => {
    expect(publicCompany({ ...company, website: 'javascript:alert(1)', logoUrl: 'data:text/html,hi' })).toMatchObject({
      website: null,
      logoUrl: null,
    });
    expect(publicCompany({ ...company, website: 'https://user:pass@example.com/company', logoUrl: 'https://user:pass@example.com/logo.svg' })).toMatchObject({
      website: null,
      logoUrl: null,
    });
    expect(publicCompany({ ...company, website: '   ', logoUrl: '   ' })).toMatchObject({
      website: null,
      logoUrl: null,
    });
    expect(publicCompany({ ...company, website: ' https://example.com/company ', logoUrl: ' https://example.com/logo.svg ' })).toMatchObject({
      website: 'https://example.com/company',
      logoUrl: 'https://example.com/logo.svg',
    });
  });

  it('uses a Chinese fallback for blank company names', () => {
    const result = publicCompany({
      ...company,
      name: '   ',
    });

    expect(result.name).toBe('公司名称待确认');
  });
});
