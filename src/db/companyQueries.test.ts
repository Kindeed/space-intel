import { describe, expect, it } from 'vitest';
import { getCompanyBySlug, listCompanies, type CompanyRow } from './companyQueries';
import type { ArticleSummaryRow } from './articleQueries';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeCompanyDatabase,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]): DbStatement {
    this.values = values;
    return this;
  }

  async run(): Promise<DbRunResult> {
    return { meta: { changes: 0 } };
  }

  async first<T = unknown>(): Promise<T | null> {
    this.database.lastQuery = this.query;
    this.database.lastValues = this.values;
    return this.database.firstResult as T | null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    this.database.lastQuery = this.query;
    this.database.lastValues = this.values;

    if (this.query.includes('FROM companies c') && !this.query.includes('WHERE c.slug')) {
      return { results: this.database.companyResults as T[] };
    }

    return { results: this.database.articleResults as T[] };
  }
}

class FakeCompanyDatabase implements SqlDatabase {
  lastQuery = '';
  lastValues: unknown[] = [];
  companyResults: CompanyRow[] = [];
  articleResults: ArticleSummaryRow[] = [];
  firstResult: CompanyRow | null = null;

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }
}

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

const article: ArticleSummaryRow = {
  id: 10,
  title: 'Reusable rocket milestone',
  originalTitle: 'Reusable rocket milestone',
  summary: 'Short summary only.',
  url: 'https://example.com/article',
  sourceKey: 'snapi',
  sourceName: 'Spaceflight News API',
  sourceType: 'api',
  publishedAt: '2026-05-09T00:00:00Z',
  language: 'en',
  region: 'global',
  fetchStatus: 'fetched',
  tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
  companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
};

describe('company queries', () => {
  it('lists companies with article counts', async () => {
    const db = new FakeCompanyDatabase();
    db.companyResults = [company];

    const result = await listCompanies(db);

    expect(result).toEqual([company]);
    expect(db.lastQuery).toContain('COUNT(ac.article_id) AS articleCount');
    expect(db.lastQuery).toContain('ORDER BY articleCount DESC');
  });

  it('returns company detail with recent articles', async () => {
    const db = new FakeCompanyDatabase();
    db.firstResult = company;
    db.articleResults = [article];

    const result = await getCompanyBySlug(db, 'rocket-lab');

    expect(result).toEqual({
      ...company,
      articles: [article],
    });
    expect(db.lastQuery).toContain('AS tagsJson');
    expect(db.lastQuery).toContain('AS companiesJson');
    expect(db.lastValues).toEqual([company.id]);
  });

  it('returns null for missing company slugs', async () => {
    const db = new FakeCompanyDatabase();

    await expect(getCompanyBySlug(db, '')).resolves.toBeNull();
    await expect(getCompanyBySlug(db, 'missing')).resolves.toBeNull();
  });
});
