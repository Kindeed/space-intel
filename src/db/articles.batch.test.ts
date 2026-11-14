import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { persistArticleRecords } from './articles';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';
import type { IngestionRecord } from '../ingestion/run';
import type { SourceConfig } from '../ingestion/types';

class SQLiteStatement implements DbStatement {
  values: SQLInputValue[] = [];
  constructor(readonly db: SQLiteD1, readonly query: string) {}
  bind(...values: unknown[]) { this.values = values as SQLInputValue[]; return this; }
  async run() {
    if (!this.db.inBatch) this.db.requests++;
    const result = this.db.sql.prepare(this.query).run(...this.values);
    return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
  async first<T>(): Promise<T | null> {
    if (!this.db.inBatch) this.db.requests++;
    return (this.db.sql.prepare(this.query).get(...this.values) as T | undefined) ?? null;
  }
  async all<T>(): Promise<{ results: T[] }> {
    if (!this.db.inBatch) this.db.requests++;
    return { results: this.db.sql.prepare(this.query).all(...this.values) as T[] };
  }
}

class SQLiteD1 implements SqlDatabase {
  readonly sql = new DatabaseSync(':memory:');
  requests = 0;
  inBatch = false;
  prepare(query: string) { return new SQLiteStatement(this, query); }
  async batch(statements: SQLiteStatement[]): Promise<DbRunResult[]> {
    this.requests++;
    this.inBatch = true;
    this.sql.exec('BEGIN');
    try {
      const result: DbRunResult[] = [];
      for (const statement of statements) {
        result.push(statement.query.startsWith('SELECT') ? await statement.all() : await statement.run());
      }
      this.sql.exec('COMMIT');
      return result;
    } catch (error) {
      this.sql.exec('ROLLBACK');
      throw error;
    } finally {
      this.inBatch = false;
    }
  }
}

const source: SourceConfig = {
  key: 'test-news', name: 'Space news', type: 'rss', region: 'global',
  url: 'https://example.com/feed', credibility: 3, enabled: true,
  purpose: 'News', expected_content: 'Summaries', risk_notes: 'Public feed', dedupe_strategy: 'external_id',
};
const records: IngestionRecord[] = Array.from({ length: 80 }, (_, id) => ({
  dedupeHash: `hash-${id}`,
  item: {
    sourceKey: source.key, sourceName: source.name, publisherName: source.name,
    title: `Satellite news ${id}`, summary: 'Public summary', url: `https://example.com/news/${id}`,
    publishedAt: '2026-11-14T00:00:00Z', language: 'en', region: 'global',
    relatedLaunchIds: ['launch-1'], tags: ['rockets'], companies: [],
  },
}));

describe('D1 article batch persistence with SQLite', () => {
  it.each([false, true])('bounds requests and preserves deduplication and relation updates (legacy schema: %s)', async (legacy) => {
    const db = new SQLiteD1();
    try {
      const migrations = ['0001_initial_schema.sql', '0002_article_launches.sql'];
      if (!legacy) migrations.push('0004_article_translation_fields.sql', '0006_article_publisher_name.sql');
      for (const migration of migrations) db.sql.exec(readFileSync(new URL(`../../migrations/${migration}`, import.meta.url), 'utf8'));
      db.sql.exec("INSERT INTO tags (slug, name, category) VALUES ('rockets', 'Rockets', 'topic'), ('satellites', 'Satellites', 'topic')");

      expect(await persistArticleRecords(db, source, records)).toEqual({ inserted: 80, skipped: 0 });
      expect(db.requests).toBeLessThanOrEqual(10);
      expect(db.sql.prepare('SELECT COUNT(*) AS count FROM articles').get()?.count).toBe(80);
      expect(db.sql.prepare('SELECT COUNT(*) AS count FROM article_launches').get()?.count).toBe(80);

      db.requests = 0;
      const updated = records.map((record) => ({ ...record, item: { ...record.item, tags: ['satellites'] } }));
      expect(await persistArticleRecords(db, source, updated)).toEqual({ inserted: 0, skipped: 80 });
      expect(db.requests).toBeLessThanOrEqual(10);
      expect(db.sql.prepare('SELECT COUNT(*) AS count FROM articles').get()?.count).toBe(80);
      expect(db.sql.prepare('SELECT COUNT(*) AS count FROM article_tags').get()?.count).toBe(160);
    } finally {
      db.sql.close();
    }
  });
});
