/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { expect, it } from 'vitest';
import { onRequestGet } from './health';

it('uses indexes for real health log queries after the additive migration', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(`
      CREATE TABLE articles (published_at TEXT);
      CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
      CREATE TABLE launches (window_start TEXT);
      CREATE TABLE ingestion_logs (
        id INTEGER PRIMARY KEY, source_key TEXT, started_at TEXT,
        finished_at TEXT, success_count INTEGER, failure_count INTEGER, error TEXT
      );
      INSERT INTO articles VALUES ('2026-11-14T06:00:41Z');
      WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 2000)
      INSERT INTO ingestion_logs
      SELECT n, CASE WHEN n % 60 = 1 THEN 'launch-test' ELSE 'snapi' END,
        datetime('2026-11-01', '+' || n || ' minutes'),
        CASE WHEN n = 2000 THEN NULL ELSE datetime('2026-11-01', '+' || n || ' minutes') END,
        0, CASE WHEN n % 7 = 0 THEN 1 ELSE 0 END,
        CASE WHEN n % 7 = 0 THEN 'HTTP 429' ELSE NULL END
      FROM seq;
    `);
    const migration = readFileSync(new NodeURL('../../migrations/0009_health_query_indexes.sql', import.meta.url), 'utf8');
    sqlite.exec(migration);
    sqlite.exec(migration); // Applying the additive migration twice is safe.
    const plans: string[] = [];
    const db = {
      prepare(query: string) {
        let parameters: string[] = [];
        const execute = () => {
          if (query.includes('FROM ingestion_logs')) {
            plans.push(sqlite.prepare('EXPLAIN QUERY PLAN ' + query).all(...parameters).map(row => row.detail).join(' | '));
          }
          return sqlite.prepare(query).all(...parameters);
        };
        return {
          bind(...values: string[]) { parameters = values; return this; },
          async first() { return execute()[0] ?? null; },
          async all() { return { results: execute() }; },
        };
      },
    };
    const response = await onRequestGet({ env: { DB: db } } as unknown as Parameters<typeof onRequestGet>[0]);
    expect(response.status).toBe(200);
    const payload = await response.json() as { diagnostics: { openIngestionLogCount: number; recentFailedIngestionLogs: unknown[] } };
    expect(payload.diagnostics.openIngestionLogCount).toBe(1);
    expect(payload.diagnostics.recentFailedIngestionLogs).toHaveLength(5);
    expect(plans).toHaveLength(5);
    for (const plan of plans) {
      expect(plan).toContain('USING');
      expect(plan).not.toContain('USE TEMP B-TREE');
      expect(plan).not.toMatch(/SCAN ingestion_logs(?:$| \|)/);
    }
  } finally {
    sqlite.close();
  }
});
