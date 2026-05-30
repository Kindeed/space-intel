import { describe, expect, it, vi } from 'vitest';
import { backfillArticleTranslations } from './backfill';
import type { DbRunResult, DbStatement, SqlDatabase } from '../db/types';

class FakeStatement implements DbStatement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeTranslationDatabase,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]): DbStatement {
    this.values = values;
    return this;
  }

  async run(): Promise<DbRunResult> {
    this.database.updateValues.push(this.values);
    return { meta: { changes: 1 } };
  }

  async first<T = unknown>(): Promise<T | null> {
    return null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    if (this.database.queryError) {
      throw this.database.queryError;
    }

    this.database.lastValues = this.values;
    return { results: this.database.candidates as T[] };
  }
}

class FakeTranslationDatabase implements SqlDatabase {
  lastValues: unknown[] = [];
  updateValues: unknown[][] = [];
  queryError: Error | null = null;
  candidates = [
    {
      id: 1,
      title: 'Reusable rocket milestone',
      originalTitle: null,
      summary: 'A booster recovery test completed.',
      originalSummary: null,
      language: 'en' as const,
    },
  ];

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }
}

describe('translation backfill', () => {
  it('translates eligible historical English articles in bounded batches', async () => {
    const db = new FakeTranslationDatabase();
    const result = await backfillArticleTranslations(
      db,
      {
        TRANSLATION_ENABLED: 'true',
        TRANSLATION_API_URL: 'https://translate.example.com/v1/chat/completions',
        TRANSLATION_API_TOKEN: 'test-token',
      },
      {
        now: () => new Date('2026-05-09T00:00:00Z'),
        fetch: vi.fn(async () =>
          new Response(
            JSON.stringify({
              choices: [{ message: { content: '{"title":"中文标题","summary":"中文摘要"}' } }],
            }),
          ),
        ),
      },
      5,
    );

    expect(result).toEqual({ candidates: 1, translated: 1, failed: 0, skipped: 0 });
    expect(db.lastValues).toEqual([5]);
    expect(db.updateValues[0]).toEqual([
      '中文标题',
      'Reusable rocket milestone',
      '中文摘要',
      'A booster recovery test completed.',
      'translated',
      'hy_mt_1_8b',
      '2026-05-09T00:00:00.000Z',
      null,
      1,
    ]);
  });

  it('skips gracefully when production D1 is missing translation columns', async () => {
    const db = new FakeTranslationDatabase();
    db.queryError = new Error('D1_ERROR: no such column: translation_status');

    await expect(
      backfillArticleTranslations(
        db,
        {
          TRANSLATION_ENABLED: 'true',
          TRANSLATION_API_URL: 'https://translate.example.com/v1/chat/completions',
          TRANSLATION_API_TOKEN: 'test-token',
        },
        {
          now: () => new Date('2026-05-09T00:00:00Z'),
          fetch,
        },
      ),
    ).resolves.toEqual({
      candidates: 0,
      translated: 0,
      failed: 0,
      skipped: 0,
    });
  });
});
