import { describe, expect, it } from 'vitest';
import { upsertConfiguredCompanies, upsertConfiguredSources, upsertConfiguredTags } from './catalog';
import type { CompanyConfigRecord, TopicConfigRecord } from '../catalog';
import type { SourceConfig } from '../ingestion';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  constructor(
    private readonly database: FakeCatalogDatabase,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]): DbStatement {
    this.database.boundValues.push(values);
    return this;
  }

  async run(): Promise<DbRunResult> {
    return { meta: { changes: 1 } };
  }

  async first<T = unknown>(): Promise<T | null> {
    return null;
  }
}

class FakeCatalogDatabase implements SqlDatabase {
  readonly queries: string[] = [];
  readonly boundValues: unknown[][] = [];
  readonly batchSizes: number[] = [];

  prepare(query: string): DbStatement {
    this.queries.push(query);
    return new FakeStatement(this, query);
  }

  async batch(statements: DbStatement[]): Promise<DbRunResult[]> {
    this.batchSizes.push(statements.length);
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

const source: SourceConfig = {
  key: 'snapi',
  name: 'Spaceflight News',
  type: 'api',
  region: 'global',
  url: 'https://example.com/api',
  credibility: 5,
  enabled: true,
  purpose: 'Core source',
  expected_content: 'News',
  risk_notes: '',
  dedupe_strategy: 'url_title_source',
};

const company: CompanyConfigRecord = {
  slug: 'rocket-lab',
  name: 'Rocket Lab',
  englishName: 'Rocket Lab',
  country: 'United States',
  sector: 'Launch',
  website: '',
  profile: '',
  stockSymbol: '',
  logoUrl: '',
};

const topic: TopicConfigRecord = {
  slug: 'reusable-rockets',
  name: '可回收火箭',
  category: 'technology',
  keywords: [],
};

describe('catalog persistence', () => {
  it('batches configured source, company, and topic upserts by catalog type', async () => {
    const db = new FakeCatalogDatabase();

    await expect(upsertConfiguredSources(db, [source, { ...source, key: 'rss-source', type: 'rss' }])).resolves.toEqual({ upserted: 2 });
    await expect(upsertConfiguredCompanies(db, [company, { ...company, slug: 'spacex', name: 'SpaceX' }])).resolves.toEqual({ upserted: 2 });
    await expect(upsertConfiguredTags(db, [topic, { ...topic, slug: 'satellite-internet', name: '卫星互联网' }])).resolves.toEqual({ upserted: 2 });

    expect(db.batchSizes).toEqual([2, 2, 2]);
    expect(db.queries.some((query) => query.includes('INSERT INTO sources'))).toBe(true);
    expect(db.queries.some((query) => query.includes('INSERT INTO companies'))).toBe(true);
    expect(db.queries.some((query) => query.includes('INSERT INTO tags'))).toBe(true);
  });
});
