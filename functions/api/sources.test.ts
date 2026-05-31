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
          {
            key: 'rsshub-weibo-space-keyword',
            name: 'RSSHub - 微博商业航天关键词',
            type: 'rsshub',
            region: 'cn',
            credibility: 2,
          } as T,
          {
            key: 'orphan-rsshub-source',
            name: 'RSSHub - 历史来源',
            type: 'rsshub',
            region: 'cn',
            credibility: 2,
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
  readonly queries: string[] = [];

  prepare(query: string): FakeSourcesStatement {
    this.queries.push(query);
    return new FakeSourcesStatement(query);
  }
}

describe('sources API', () => {
  it('returns public source labels and access summaries without technical labels', async () => {
    const db = new FakeSourcesDatabase();
    const response = await onRequestGet({
      env: {
        DB: db as unknown as D1Database,
      },
    } as Parameters<typeof onRequestGet>[0]);

    const payload = await response.json() as {
      items: Array<{ name: string; categoryLabel: string; domesticAccessLabel: string; globalAccessLabel: string; publicBadge: string | null }>;
      publicStats: Array<{ label: string; count: number; accessSummaryLabel: string }>;
      accessStats: Array<{ label: string; count: number }>;
    };

    expect(payload.items.map((item) => item.categoryLabel)).toEqual(['官方机构', '专业媒体', '来源', '来源']);
    expect(payload.items[0]).toMatchObject({
      name: '国家航天局新闻',
      categoryLabel: '官方机构',
      domesticAccessLabel: '直连',
      globalAccessLabel: '直连',
      publicBadge: null,
    });
    expect(payload.items[1]).toMatchObject({
      name: 'Spaceflight News',
      categoryLabel: '专业媒体',
      domesticAccessLabel: '可能受限',
      globalAccessLabel: '直连',
      publicBadge: '国内访问可能受限',
    });
    expect(payload.publicStats).toEqual([
      { label: '官方机构', count: 1, accessSummaryLabel: '直连' },
      { label: '专业媒体', count: 1, accessSummaryLabel: '可能受限' },
      { label: '来源', count: 2, accessSummaryLabel: '待验证' },
    ]);
    expect(payload.accessStats).toEqual([
      { label: '直连', count: 2 },
      { label: '可能受限', count: 1 },
      { label: '待验证', count: 1 },
    ]);
    expect(payload.items).toContainEqual(expect.objectContaining({ name: '微博商业航天关键词', categoryLabel: '来源' }));
    expect(payload.items).toContainEqual(expect.objectContaining({ name: '历史来源', categoryLabel: '来源' }));
    expect('key' in payload.items[0]).toBe(false);
    expect('region' in payload.items[0]).toBe(false);
    expect(JSON.stringify(payload)).not.toMatch(/snapi|cnsa-news|Google News RSS|RSSHub|google_news_rss|official_page|publicCategory|media|official|notice|direct|limited|blocked|unknown|accessDomestic|accessGlobal|directCount|limitedCount|blockedCount|unknownCount|API 源|RSS 源|备用聚合|credibility|region|stats/);
    expect(db.queries).toHaveLength(1);
  });
});
