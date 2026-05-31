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
    this.database.firstQuery = this.query;
    this.database.lastQuery = this.query;
    this.database.lastValues = this.values;
    this.database.values.push(this.values);
    return this.database.firstResult as T | null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    this.database.lastQuery = this.query;
    this.database.lastValues = this.values;
    this.database.queries.push(this.query);
    this.database.values.push(this.values);

    if (this.query.includes('FROM companies c') && !this.query.includes('WHERE c.slug')) {
      return { results: this.database.companyResults as T[] };
    }

    if (this.database.failTranslationColumns && this.query.includes('a.original_summary')) {
      throw new Error('D1_ERROR: no such column: a.original_summary');
    }

    return { results: this.database.articleResults as T[] };
  }
}

class FakeCompanyDatabase implements SqlDatabase {
  firstQuery = '';
  lastQuery = '';
  lastValues: unknown[] = [];
  values: unknown[][] = [];
  queries: string[] = [];
  failTranslationColumns = false;
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
  originalSummary: 'Short summary only.',
  url: 'https://example.com/article',
  sourceKey: 'snapi',
  sourceName: 'Spaceflight News API',
  sourceType: 'api',
  publisherName: 'Spaceflight News API',
  publishedAt: '2026-05-09T00:00:00Z',
  language: 'en',
  region: 'global',
  fetchStatus: 'fetched',
  translationStatus: 'skipped',
  translationProvider: null,
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
    expect(db.lastQuery).toContain("s.key = 'cnsa-news'");
    expect(db.lastQuery).toContain("a.url LIKE 'https://www.cnsa.gov.cn/%/index.html'");
    expect(db.lastQuery).toContain("s.type = 'official_page'");
    expect(db.lastQuery).toContain("ABS((julianday(a.published_at) - julianday(a.created_at)) * 86400) < 300");
    expect(db.lastValues).toEqual([company.id]);
  });

  it('trims company slugs before querying detail records', async () => {
    const db = new FakeCompanyDatabase();
    db.firstResult = company;

    await getCompanyBySlug(db, ' rocket-lab ');

    expect(db.values[0]).toEqual(['rocket-lab']);
  });

  it('matches company detail slugs case-insensitively', async () => {
    const db = new FakeCompanyDatabase();
    db.firstResult = company;

    await getCompanyBySlug(db, ' Rocket-Lab ');

    expect(db.firstQuery).toContain('LOWER(c.slug) = ?');
    expect(db.values[0]).toEqual(['rocket-lab']);
  });

  it('falls back to legacy company article queries when translation columns are missing', async () => {
    const db = new FakeCompanyDatabase();
    db.failTranslationColumns = true;
    db.firstResult = company;
    db.articleResults = [{ ...article, originalSummary: null, translationStatus: 'skipped', translationProvider: null }];

    const result = await getCompanyBySlug(db, 'rocket-lab');

    expect(result?.articles[0]).toMatchObject({
      id: 10,
      originalSummary: null,
      translationStatus: 'skipped',
    });
    expect(db.queries).toHaveLength(2);
    expect(db.queries[0]).toContain('a.original_summary AS originalSummary');
    expect(db.queries[1]).toContain('NULL AS originalSummary');
  });

  it('returns null for missing company slugs', async () => {
    const db = new FakeCompanyDatabase();

    await expect(getCompanyBySlug(db, '')).resolves.toBeNull();
    await expect(getCompanyBySlug(db, 'missing')).resolves.toBeNull();
  });
});
