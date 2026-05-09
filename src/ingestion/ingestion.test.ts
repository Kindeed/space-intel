import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createDedupeHash,
  createDedupeKey,
  createPlaceholderCollector,
  collectSource,
  googleNewsRssCollector,
  launchLibraryCollector,
  parseSourcesConfig,
  parseSourcesYaml,
  rssCollector,
  spaceflightNewsCollector,
} from './index';
import { createCollectorRegistry } from './registry';

const validConfig = {
  sources: [
    {
      key: 'snapi',
      name: 'Spaceflight News API',
      type: 'api',
      region: 'global',
      url: 'https://api.spaceflightnewsapi.net/v4/articles/',
      credibility: 5,
      enabled: true,
      purpose: 'Core international commercial space news aggregation.',
      expected_content: 'News metadata and summaries.',
      risk_notes: 'Public API; store summaries and links only.',
      dedupe_strategy: 'url_title_source',
    },
  ],
};

describe('source config', () => {
  it('validates source config records', () => {
    const sources = parseSourcesConfig(validConfig);

    expect(sources).toHaveLength(1);
    expect(sources[0].key).toBe('snapi');
  });

  it('rejects duplicate source keys', () => {
    expect(() =>
      parseSourcesConfig({
        sources: [validConfig.sources[0], validConfig.sources[0]],
      }),
    ).toThrow('Duplicate source key: snapi');
  });

  it('validates the repository source configuration', () => {
    const yaml = readFileSync(resolve(process.cwd(), 'config/sources.yaml'), 'utf8');
    const sources = parseSourcesYaml(yaml);

    expect(sources.length).toBeGreaterThanOrEqual(20);
    expect(sources.some((source) => source.type === 'api')).toBe(true);
    expect(sources.some((source) => source.type === 'rss')).toBe(true);
    expect(sources.some((source) => source.type === 'google_news_rss')).toBe(true);
    expect(sources.some((source) => source.type === 'capital_filing')).toBe(true);
  });
});

describe('dedupe', () => {
  it('normalizes tracking parameters and trailing slashes', () => {
    const first = createDedupeKey({
      sourceKey: 'snapi',
      title: 'Reusable Rocket Test',
      url: 'https://www.example.com/news/reusable-rocket/?utm_source=x',
    });
    const second = createDedupeKey({
      sourceKey: 'snapi',
      title: ' reusable   rocket test ',
      url: 'https://example.com/news/reusable-rocket',
    });

    expect(first).toBe(second);
  });

  it('uses external ids when present', async () => {
    const hash = await createDedupeHash({
      sourceKey: 'launch-library-2',
      rawId: 'abc-123',
      title: 'Mission title can change',
      url: 'https://example.com/launch/abc-123',
    });

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('collector registry', () => {
  it('routes sources to collectors by source type', () => {
    const registry = createCollectorRegistry([createPlaceholderCollector('api')]);
    const [source] = parseSourcesConfig(validConfig);

    expect(registry.get(source).type).toBe('api');
    expect(registry.supportedTypes()).toEqual(['api']);
  });

  it('fails when a collector type is missing', () => {
    const registry = createCollectorRegistry([]);
    const [source] = parseSourcesConfig(validConfig);

    expect(() => registry.get(source)).toThrow('No collector registered for source type: api');
  });
});

describe('Spaceflight News API collector', () => {
  it('normalizes SNAPI v4 article results', async () => {
    const [source] = parseSourcesConfig(validConfig);
    const items = await spaceflightNewsCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                id: 37838,
                title: 'Rescue mission passes key testing milestone',
                url: 'https://spaceflightnow.com/example/',
                news_site: 'Spaceflight Now',
                summary: 'A commercial servicing mission passed testing.',
                published_at: '2026-05-08T23:19:34Z',
                launches: [{ launch_id: 'f596ad48-881e-47d6-806d-113c6dd97427' }],
              },
            ],
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        ),
    });

    expect(items).toEqual([
      {
        sourceKey: 'snapi',
        sourceName: 'Spaceflight Now',
        title: 'Rescue mission passes key testing milestone',
        originalTitle: 'Rescue mission passes key testing milestone',
        summary: 'A commercial servicing mission passed testing.',
        url: 'https://spaceflightnow.com/example/',
        publishedAt: '2026-05-08T23:19:34Z',
        language: 'en',
        region: 'global',
        rawId: '37838',
        relatedLaunchIds: ['f596ad48-881e-47d6-806d-113c6dd97427'],
        companies: [],
        tags: [],
      },
    ]);
  });

  it('collects enabled sources and attaches dedupe hashes', async () => {
    const registry = createCollectorRegistry([spaceflightNewsCollector]);
    const [source] = parseSourcesConfig(validConfig);
    const records = await collectSource(source, registry, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                id: 37838,
                title: 'Rescue mission passes key testing milestone',
                url: 'https://spaceflightnow.com/example/',
                news_site: 'Spaceflight Now',
                summary: 'A commercial servicing mission passed testing.',
                published_at: '2026-05-08T23:19:34Z',
                launches: [],
              },
            ],
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        ),
    });

    expect(records).toHaveLength(1);
    expect(records[0].dedupeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(records[0].item.rawId).toBe('37838');
  });
});

describe('Launch Library 2 collector', () => {
  it('normalizes upcoming launch results without storing article bodies', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'launch-library-2',
          name: 'Launch Library 2',
          type: 'api',
          region: 'global',
          url: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/',
          credibility: 5,
          enabled: true,
          purpose: 'Upcoming launch cache.',
          expected_content: 'Launch event metadata.',
          risk_notes: 'Public API metadata only.',
          dedupe_strategy: 'external_id',
        },
      ],
    });

    const launches = await launchLibraryCollector.collectLaunches(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                id: 'f596ad48-881e-47d6-806d-113c6dd97427',
                name: 'Electron | Commercial rideshare',
                url: 'https://ll.thespacedevs.com/2.2.0/launch/f596ad48-881e-47d6-806d-113c6dd97427/',
                net: '2026-05-10T12:00:00Z',
                status: { name: 'Go for Launch' },
                rocket: { configuration: { full_name: 'Electron' } },
                launch_service_provider: { name: 'Rocket Lab' },
                pad: { name: 'LC-1A', location: { name: 'Mahia, New Zealand' } },
              },
            ],
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        ),
    });

    expect(launches).toEqual([
      {
        externalId: 'f596ad48-881e-47d6-806d-113c6dd97427',
        mission: 'Electron | Commercial rideshare',
        rocket: 'Electron',
        provider: 'Rocket Lab',
        windowStart: '2026-05-10T12:00:00Z',
        site: 'LC-1A, Mahia, New Zealand',
        status: 'Go for Launch',
        rawUrl: 'https://ll.thespacedevs.com/2.2.0/launch/f596ad48-881e-47d6-806d-113c6dd97427/',
      },
    ]);
  });
});

describe('RSS collector', () => {
  it('normalizes RSS items into metadata-only article records', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'spacenews-rss',
          name: 'SpaceNews RSS',
          type: 'rss',
          region: 'global',
          url: 'https://example.com/rss.xml',
          credibility: 4,
          enabled: true,
          purpose: 'International commercial space reporting.',
          expected_content: 'Article summaries and links.',
          risk_notes: 'RSS metadata only.',
          dedupe_strategy: 'url_title_source',
        },
      ],
    });

    const items = await rssCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>SpaceNews</title>
              <item>
                <title>Commercial launch provider signs new contract</title>
                <link>https://example.com/contract</link>
                <guid>contract-1</guid>
                <pubDate>Sat, 09 May 2026 01:00:00 GMT</pubDate>
                <description><![CDATA[Short <strong>summary</strong> only.]]></description>
              </item>
            </channel>
          </rss>`,
          {
            headers: { 'content-type': 'application/rss+xml' },
          },
        ),
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      sourceKey: 'spacenews-rss',
      sourceName: 'SpaceNews',
      title: 'Commercial launch provider signs new contract',
      originalTitle: 'Commercial launch provider signs new contract',
      summary: 'Short summary only.',
      url: 'https://example.com/contract',
      language: 'en',
      region: 'global',
      rawId: 'contract-1',
      relatedLaunchIds: [],
    });
  });
});

describe('Google News RSS collector', () => {
  it('normalizes Chinese keyword feed items and keeps original source links', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'google-news-cn-private-launch',
          name: 'Google News - 商业航天',
          type: 'google_news_rss',
          region: 'cn',
          url: 'https://news.google.com/rss/search?q=%E5%95%86%E4%B8%9A%E8%88%AA%E5%A4%A9',
          credibility: 3,
          enabled: true,
          purpose: 'Chinese keyword monitoring.',
          expected_content: 'Chinese news metadata.',
          risk_notes: 'Public RSS metadata only.',
          dedupe_strategy: 'url_title_source',
        },
      ],
    });

    const items = await googleNewsRssCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Google 新闻 - 商业航天</title>
              <item>
                <title>民营火箭企业完成发动机试车 - 示例媒体</title>
                <link>https://news.google.com/rss/articles/example</link>
                <guid>google-news-1</guid>
                <pubDate>Sat, 09 May 2026 02:00:00 GMT</pubDate>
                <description>只保留摘要和原文入口。</description>
              </item>
            </channel>
          </rss>`,
          {
            headers: { 'content-type': 'application/rss+xml' },
          },
        ),
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      sourceKey: 'google-news-cn-private-launch',
      sourceName: 'Google 新闻 - 商业航天',
      title: '民营火箭企业完成发动机试车',
      originalTitle: '民营火箭企业完成发动机试车 - 示例媒体',
      summary: '只保留摘要和原文入口。',
      url: 'https://news.google.com/rss/articles/example',
      language: 'zh',
      region: 'cn',
      rawId: 'google-news-1',
    });
  });
});
