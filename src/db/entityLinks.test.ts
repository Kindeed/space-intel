import { describe, expect, it } from 'vitest';
import type { ArticleEntityMatch } from '../enrichment';
import { listArticlesForEntityMatching, upsertConfiguredEntityLinks } from './entityLinks';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class EntityLinkStatement implements DbStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: EntityLinkDatabase,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]): DbStatement {
    this.values = values;
    return this;
  }

  async run(): Promise<DbRunResult> {
    return this.database.run(this.query, this.values);
  }

  async first<T = unknown>(): Promise<T | null> {
    return this.database.first() as T | null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    return this.database.all(this.query) as { results: T[] };
  }
}

class EntityLinkDatabase implements SqlDatabase {
  readonly companyLinks: Array<{ articleId: number; slug: string }> = [];
  readonly tagLinks: Array<{ articleId: number; slug: string }> = [];
  readonly deletes: string[] = [];
  failTranslationColumns = false;

  prepare(query: string): DbStatement {
    return new EntityLinkStatement(this, query);
  }

  run(query: string, values: unknown[]): DbRunResult {
    const normalized = query.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('DELETE FROM')) {
      this.deletes.push(normalized);
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT OR IGNORE INTO article_companies')) {
      const articleId = Number(values[0]);
      const slug = String(values[1]);

      if (this.companyLinks.some((link) => link.articleId === articleId && link.slug === slug)) {
        return { meta: { changes: 0 } };
      }

      this.companyLinks.push({ articleId, slug });
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT OR IGNORE INTO article_tags')) {
      const articleId = Number(values[0]);
      const slug = String(values[1]);

      if (this.tagLinks.some((link) => link.articleId === articleId && link.slug === slug)) {
        return { meta: { changes: 0 } };
      }

      this.tagLinks.push({ articleId, slug });
      return { meta: { changes: 1 } };
    }

    throw new Error(`Unsupported query: ${query}`);
  }

  first(): unknown | null {
    return null;
  }

  all(query: string): { results: unknown[] } {
    const normalized = query.replace(/\s+/g, ' ').trim();

    if (this.failTranslationColumns && normalized.includes('original_summary')) {
      throw new Error('D1_ERROR: no such column: original_summary');
    }

    if (normalized.startsWith('SELECT id, title, original_title AS originalTitle, summary')) {
      return {
        results: [
          {
            id: 1,
            title: 'Rocket Lab reusable stage update',
            originalTitle: 'Rocket Lab reusable stage update',
            summary: 'Electron booster recovery progress.',
            originalSummary: normalized.includes('NULL AS originalSummary') ? null : 'Electron booster recovery progress.',
          },
        ],
      };
    }

    throw new Error(`Unsupported all query: ${query}`);
  }
}

describe('entity link persistence', () => {
  it('upserts configured entity links without clearing existing source defaults', async () => {
    const db = new EntityLinkDatabase();
    db.tagLinks.push({ articleId: 1, slug: 'source-default-tag' });

    const matches: ArticleEntityMatch[] = [
      {
        articleId: 1,
        companySlugs: ['rocket-lab', 'rocket-lab'],
        topicSlugs: ['reusable-rockets'],
      },
    ];

    const result = await upsertConfiguredEntityLinks(db, matches);
    const second = await upsertConfiguredEntityLinks(db, matches);

    expect(result).toEqual({ articleCount: 1, companyLinks: 1, tagLinks: 1 });
    expect(second).toEqual({ articleCount: 1, companyLinks: 0, tagLinks: 0 });
    expect(db.deletes).toEqual([]);
    expect(db.tagLinks).toEqual([
      { articleId: 1, slug: 'source-default-tag' },
      { articleId: 1, slug: 'reusable-rockets' },
    ]);
  });

  it('falls back to legacy article fields when translation columns are missing', async () => {
    const db = new EntityLinkDatabase();
    db.failTranslationColumns = true;

    await expect(listArticlesForEntityMatching(db)).resolves.toEqual([
      {
        id: 1,
        title: 'Rocket Lab reusable stage update',
        originalTitle: 'Rocket Lab reusable stage update',
        summary: 'Electron booster recovery progress.',
        originalSummary: null,
      },
    ]);
  });
});
