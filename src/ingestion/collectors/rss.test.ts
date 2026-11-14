import { describe, expect, it, vi } from 'vitest';
import { rssCollector } from './rss';
import type { SourceConfig } from '../types';

const mocks = vi.hoisted(() => ({ parseString: vi.fn() }));
vi.mock('rss-parser', () => ({ default: class { parseString = mocks.parseString; } }));

describe('bounded RSS normalization', () => {
  it('skips invalid links and stops inspecting item content once the configured limit is filled', async () => {
    const summary = vi.fn(() => 'A public news summary');
    mocks.parseString.mockResolvedValue({
      title: 'Space news',
      items: [
        { title: 'Unsafe link', link: 'javascript:void(0)' },
        ...Array.from({ length: 500 }, (_, id) => ({
          title: `Satellite news ${id}`,
          link: `https://example.com/news/${id}`,
          isoDate: '2026-11-14T00:00:00Z',
          get contentSnippet() { return summary(); },
        })),
      ],
    });
    const source: SourceConfig = {
      key: 'demo-rss', name: 'Space news', type: 'rss', region: 'global',
      url: 'https://example.com/feed', credibility: 3, enabled: true,
      purpose: 'Public news', expected_content: 'Summaries', risk_notes: 'Public feed',
      dedupe_strategy: 'url_title_source', max_items: 2,
    };
    const result = await rssCollector.collect(source, {
      fetch: vi.fn(async () => new Response('<rss/>')),
      now: () => new Date('2026-11-14T00:00:00Z'),
    });
    expect(result.map((item) => item.url)).toEqual(['https://example.com/news/0', 'https://example.com/news/1']);
    expect(summary).toHaveBeenCalledTimes(2);
  });
});
