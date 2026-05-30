import { describe, expect, it } from 'vitest';
import { onRequestGet } from './sources';

class FakeSourcesStatement {
  constructor(private readonly query: string) {}

  bind(): FakeSourcesStatement {
    return this;
  }

  async run() {
    return { meta: { changes: 0 } };
  }

  async first<T = unknown>(): Promise<T | null> {
    return null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    if (this.query.includes('SELECT key, name, type, region, credibility')) {
      return {
        results: [
          {
            key: 'snapi',
            name: 'Spaceflight News',
            type: 'api',
            region: 'global',
            credibility: 5,
          } as T,
          {
            key: 'cnsa-news',
            name: '国家航天局新闻',
            type: 'official_page',
            region: 'cn',
            credibility: 5,
          } as T,
        ],
      };
    }

    return {
      results: [
        { type: 'api', count: 1 } as T,
        { type: 'official_page', count: 1 } as T,
      ],
    };
  }
}

class FakeSourcesDatabase {
  prepare(query: string): FakeSourcesStatement {
    return new FakeSourcesStatement(query);
  }
}

describe('sources API', () => {
  it('returns public source labels and access summaries without technical labels', async () => {
    const response = await onRequestGet({
      env: {
        DB: new FakeSourcesDatabase() as unknown as D1Database,
      },
    } as Parameters<typeof onRequestGet>[0]);

    const payload = await response.json() as {
      items: Array<{ name: string; publicCategoryLabel: string; accessDomestic: string; publicBadge: string | null }>;
      publicStats: Array<{ label: string; count: number }>;
      accessStats: Array<{ status: string; count: number }>;
    };

    expect(payload.items[0]).toMatchObject({
      name: 'Spaceflight News',
      publicCategoryLabel: '专业媒体',
      accessDomestic: 'limited',
      publicBadge: '国内访问可能受限',
    });
    expect(payload.publicStats.map((item) => item.label)).toContain('专业媒体');
    expect(payload.accessStats.some((item) => item.status === 'limited')).toBe(true);
    expect(JSON.stringify(payload)).not.toMatch(/Google News RSS|google_news_rss|API 源|RSS 源|备用聚合/);
  });
});
