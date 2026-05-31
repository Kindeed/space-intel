import { parse } from 'yaml';
import { z } from 'zod';
import { routeSafeIdentifierSchema } from '../config/identifiers';
import { normalizeHttpUrl } from '../config/url';
import { companyCountryIds, companySectorIds, companySectorValues, type CompanyCountryId } from './companyTaxonomy';
import { topicCategoryIds, type TopicCategoryId } from './topicCategories';

const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .trim()
    .url()
    .transform((value, context) => {
      const normalized = normalizeHttpUrl(value);

      if (normalized === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Catalog URL must be a public http or https URL',
        });
        return z.NEVER;
      }

      return normalized;
    })
    .optional()
    .default(''),
);

const slugSchema = routeSafeIdentifierSchema('Slug');
const companyCountrySchema = z.string().transform(normalizeConfigText).pipe(z.enum(companyCountryIds));
const companySectorSchema = z.string().transform(normalizeCompanySector).superRefine((value, context) => {
  const sectors = companySectorValues(value);
  const hasEmptySector = sectors.some((sector) => sector.length === 0);
  const hasUnsupportedSector = sectors.some((sector) => !companySectorIds.includes(sector as (typeof companySectorIds)[number]));

  if (!value || hasEmptySector || hasUnsupportedSector) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Company sector must use supported values: ${companySectorIds.join(', ')}`,
    });
  }
});
const topicCategorySchema = z.string().trim().pipe(z.enum(topicCategoryIds));
const requiredDisplayTextSchema = z
  .string()
  .transform(normalizeConfigText)
  .pipe(z.string().min(1));
const optionalDisplayTextSchema = z
  .string()
  .transform(normalizeConfigText)
  .optional()
  .default('');

const companySchema = z.object({
  slug: slugSchema,
  name: requiredDisplayTextSchema,
  english_name: optionalDisplayTextSchema,
  country: companyCountrySchema,
  sector: companySectorSchema,
  website: optionalUrlSchema,
  profile: optionalDisplayTextSchema,
  stock_symbol: optionalDisplayTextSchema,
  logo_url: optionalUrlSchema,
});

const companiesFileSchema = z.object({
  companies: z.array(companySchema).default([]),
});

const topicSchema = z.object({
  slug: slugSchema,
  name: requiredDisplayTextSchema,
  category: topicCategorySchema,
  keywords: z.array(z.string()).default([]),
});

const topicsFileSchema = z.object({
  topics: z.array(topicSchema).default([]),
});

export type CompanyConfigRecord = {
  slug: string;
  name: string;
  englishName: string;
  country: CompanyCountryId;
  sector: string;
  website: string;
  profile: string;
  stockSymbol: string;
  logoUrl: string;
};

export type TopicConfigRecord = {
  slug: string;
  name: string;
  category: TopicCategoryId;
  keywords: string[];
};

function assertUniqueSlugs<T extends { slug: string }>(records: T[], label: string): void {
  const seen = new Set<string>();

  for (const record of records) {
    if (seen.has(record.slug)) {
      throw new Error(`Duplicate ${label} slug: ${record.slug}`);
    }

    seen.add(record.slug);
  }
}

function normalizeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();

  return keywords
    .map(normalizeConfigText)
    .filter((keyword) => {
      if (!keyword) {
        return false;
      }

      const key = keyword.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function normalizeConfigText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeCompanySector(value: string): string {
  const seen = new Set<string>();
  const sectors = value.split(',').map(normalizeConfigText);

  return sectors
    .filter((sector) => {
      if (!sector) {
        return true;
      }

      const key = sector.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .join(', ');
}

function assertTopicKeywords(records: TopicConfigRecord[]): void {
  for (const record of records) {
    if (record.keywords.length === 0) {
      throw new Error(`Topic must define at least one keyword: ${record.slug}`);
    }
  }
}

export function parseCompaniesConfig(input: unknown): CompanyConfigRecord[] {
  const records = companiesFileSchema.parse(input ?? {}).companies.map((company) => ({
    slug: company.slug,
    name: company.name,
    englishName: company.english_name,
    country: company.country,
    sector: company.sector,
    website: company.website,
    profile: company.profile,
    stockSymbol: company.stock_symbol,
    logoUrl: company.logo_url,
  }));

  assertUniqueSlugs(records, 'company');
  return records;
}

export function parseTopicsConfig(input: unknown): TopicConfigRecord[] {
  const records = topicsFileSchema.parse(input ?? {}).topics.map((topic) => ({
    ...topic,
    keywords: normalizeKeywords(topic.keywords),
  }));

  assertUniqueSlugs(records, 'topic');
  assertTopicKeywords(records);
  return records;
}

export function parseCompaniesYaml(yamlText: string): CompanyConfigRecord[] {
  return parseCompaniesConfig(parse(yamlText));
}

export function parseTopicsYaml(yamlText: string): TopicConfigRecord[] {
  return parseTopicsConfig(parse(yamlText));
}
