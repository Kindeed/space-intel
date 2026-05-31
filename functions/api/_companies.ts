import type { CompanyDetail, CompanyRow } from '../../src/db/companyQueries';
import { companyCountryLabel, companySectorLabel } from '../../src/catalog/companyTaxonomy';
import { normalizeHttpUrl } from '../../src/config/url';
import { publicArticleSummary, type PublicArticleSummary } from './_articles';

export type PublicCompany = Omit<CompanyRow, 'id' | 'country' | 'sector'> & {
  countryLabel: string;
  sectorLabel: string;
};

export type PublicCompanyDetail = Omit<CompanyDetail, 'id' | 'articles' | 'country' | 'sector'> & {
  countryLabel: string;
  sectorLabel: string;
  articles: PublicArticleSummary[];
};

function trimmedText(value: string): string {
  return value.trim();
}

function normalizedDisplayText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function displayText(value: string, fallback: string): string {
  return normalizedDisplayText(value) || fallback;
}

function displayOptionalText(value: string | null): string | null {
  const trimmed = value ? normalizedDisplayText(value) : '';

  return trimmed || null;
}

export function publicCompanyCountryLabel(country: string): string {
  return companyCountryLabel(country);
}

export function publicCompanySectorLabel(sector: string): string {
  return companySectorLabel(sector);
}

export function publicCompany(row: CompanyRow): PublicCompany {
  return {
    slug: trimmedText(row.slug),
    name: displayText(row.name, '公司名称待确认'),
    englishName: displayOptionalText(row.englishName),
    countryLabel: publicCompanyCountryLabel(row.country),
    sectorLabel: publicCompanySectorLabel(row.sector),
    website: normalizeHttpUrl(row.website),
    profile: normalizedDisplayText(row.profile),
    stockSymbol: displayOptionalText(row.stockSymbol),
    logoUrl: normalizeHttpUrl(row.logoUrl),
    articleCount: row.articleCount,
  };
}

export function publicCompanyDetail(row: CompanyDetail): PublicCompanyDetail {
  return {
    ...publicCompany(row),
    articles: row.articles.map(publicArticleSummary),
  };
}

export function publicCompanyListResult(result: { items: CompanyRow[] }): { items: PublicCompany[] } {
  return {
    items: result.items.map(publicCompany),
  };
}
