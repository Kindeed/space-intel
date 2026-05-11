import { parse } from 'yaml';
import { z } from 'zod';

const companySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  english_name: z.string().optional().default(''),
  country: z.string().min(1),
  sector: z.string().min(1),
  website: z.string().url().optional().default(''),
  profile: z.string().optional().default(''),
  stock_symbol: z.string().optional().default(''),
  logo_url: z.string().url().optional().default(''),
});

const companiesFileSchema = z.object({
  companies: z.array(companySchema).default([]),
});

const topicSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  keywords: z.array(z.string()).default([]),
});

const topicsFileSchema = z.object({
  topics: z.array(topicSchema).default([]),
});

export type CompanyConfigRecord = {
  slug: string;
  name: string;
  englishName: string;
  country: string;
  sector: string;
  website: string;
  profile: string;
  stockSymbol: string;
  logoUrl: string;
};

export type TopicConfigRecord = {
  slug: string;
  name: string;
  category: string;
  keywords: string[];
};

export function parseCompaniesConfig(input: unknown): CompanyConfigRecord[] {
  return companiesFileSchema.parse(input ?? {}).companies.map((company) => ({
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
}

export function parseTopicsConfig(input: unknown): TopicConfigRecord[] {
  return topicsFileSchema.parse(input ?? {}).topics;
}

export function parseCompaniesYaml(yamlText: string): CompanyConfigRecord[] {
  return parseCompaniesConfig(parse(yamlText));
}

export function parseTopicsYaml(yamlText: string): TopicConfigRecord[] {
  return parseTopicsConfig(parse(yamlText));
}
