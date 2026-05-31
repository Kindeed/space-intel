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
  officialPageCollector,
  parseSourcesConfig,
  parseSourcesYaml,
  procurementPageCollector,
  rssCollector,
  rsshubCollector,
  spaceflightNewsCollector,
  assertValidSourceDefaultReferences,
  type SourceCollector,
} from './index';
import { parseCompaniesYaml, parseTopicsYaml } from '../catalog';
import { createCollectorRegistry } from './registry';
import { sourceDisplayName } from '../sourceDisplay';

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
    const sources = parseSourcesConfig({
      sources: [
        {
          ...validConfig.sources[0],
          key: ' snapi ',
          name: ' Spaceflight   News API ',
          url: ' HTTPS://API.SPACEFLIGHTNEWSAPI.NET/v4/articles/ ',
          purpose: ' Core international   commercial space news aggregation. ',
          expected_content: ' News metadata\tand summaries. ',
          risk_notes: ' Public API; store   summaries and links only. ',
          dedupe_strategy: ' URL_TITLE_SOURCE ',
          access_note: ' Usually   reachable globally. ',
          public_badge: ' Data\tAPI ',
        },
      ],
    });

    expect(sources).toHaveLength(1);
    expect(sources[0].key).toBe('snapi');
    expect(sources[0]).toMatchObject({
      public_category: 'data',
      access_domestic: 'unknown',
      access_global: 'direct',
    });
    expect(sources[0].name).toBe('Spaceflight News API');
    expect(sources[0].url).toBe('https://api.spaceflightnewsapi.net/v4/articles/');
    expect(sources[0].purpose).toBe('Core international commercial space news aggregation.');
    expect(sources[0].expected_content).toBe('News metadata and summaries.');
    expect(sources[0].risk_notes).toBe('Public API; store summaries and links only.');
    expect(sources[0].dedupe_strategy).toBe('url_title_source');
    expect(sources[0].access_note).toBe('Usually reachable globally.');
    expect(sources[0].public_badge).toBe('Data API');
  });

  it('normalizes default source relation metadata', () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          ...validConfig.sources[0],
          default_tags: [' satellite-internet ', 'Satellite-Internet', 'satellite-internet', '   '],
          default_companies: [' Rocket   Lab ', 'rocket lab', 'Rocket Lab'],
          include_terms: [' reusable   rocket ', 'Reusable Rocket', '   '],
          exclude_terms: [' tourism   coverage ', 'Tourism Coverage', '   '],
        },
      ],
    });

    expect(source.default_tags).toEqual(['satellite-internet']);
    expect(source.default_companies).toEqual(['Rocket Lab']);
    expect(source.include_terms).toEqual(['reusable rocket']);
    expect(source.exclude_terms).toEqual(['tourism coverage']);
  });

  it('treats blank optional source display fields as absent', () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          ...validConfig.sources[0],
          access_note: '   ',
          public_badge: '   ',
        },
      ],
    });

    expect(source.access_note).toBeUndefined();
    expect(source.public_badge).toBeUndefined();
  });

  it('treats blank-only optional source lists as absent', () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          ...validConfig.sources[0],
          default_tags: ['', '   '],
          default_companies: ['', '   '],
          include_terms: ['', '   '],
          exclude_terms: ['', '   '],
        },
      ],
    });

    expect(source.default_tags).toBeUndefined();
    expect(source.default_companies).toBeUndefined();
    expect(source.include_terms).toBeUndefined();
    expect(source.exclude_terms).toBeUndefined();
  });

  it('rejects default source references that are not in the configured catalog', () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          ...validConfig.sources[0],
          default_tags: ['missing-topic'],
          default_companies: ['Missing Company'],
        },
      ],
    });

    expect(() =>
      assertValidSourceDefaultReferences([source], {
        topicSlugs: ['satellite-internet'],
        companyIdentifiers: ['rocket-lab', 'Rocket Lab'],
      }),
    ).toThrow('Unknown default tag "missing-topic" in source snapi');

    expect(() =>
      assertValidSourceDefaultReferences([{ ...source, default_tags: ['satellite-internet'] }], {
        topicSlugs: ['satellite-internet'],
        companyIdentifiers: ['rocket-lab', 'Rocket Lab'],
      }),
    ).toThrow('Unknown default company "Missing Company" in source snapi');
  });

  it('validates default source references case-insensitively', () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          ...validConfig.sources[0],
          default_tags: ['Reusable-Rockets'],
          default_companies: ['rocket   lab'],
        },
      ],
    });

    expect(() =>
      assertValidSourceDefaultReferences([source], {
        topicSlugs: ['reusable-rockets'],
        companyIdentifiers: ['rocket-lab', 'Rocket Lab'],
      }),
    ).not.toThrow();
  });

  it('rejects duplicate source keys', () => {
    expect(() =>
      parseSourcesConfig({
        sources: [validConfig.sources[0], { ...validConfig.sources[0], key: ' snapi ' }],
      }),
    ).toThrow('Duplicate source key: snapi');
  });

  it('rejects duplicate enabled public source display names', () => {
    expect(() =>
      parseSourcesConfig({
        sources: [
          {
            ...validConfig.sources[0],
            key: 'rsshub-space',
            name: 'RSSHub - 商业航天',
            type: 'rsshub',
          },
          {
            ...validConfig.sources[0],
            key: 'google-news-space',
            name: 'Google News RSS - 商业航天',
            type: 'google_news_rss',
          },
        ],
      }),
    ).toThrow('Duplicate enabled source display name: 商业航天 (rsshub-space, google-news-space)');
  });

  it('rejects duplicate enabled public source display names after whitespace normalization', () => {
    expect(() =>
      parseSourcesConfig({
        sources: [
          {
            ...validConfig.sources[0],
            key: 'rss-space',
            name: 'Spaceflight  News',
            type: 'rss',
            public_category: 'media',
          },
          {
            ...validConfig.sources[0],
            key: 'rss-space-alt',
            name: 'Spaceflight\tNews',
            type: 'rss',
            public_category: 'media',
          },
        ],
      }),
    ).toThrow('Duplicate enabled source display name: Spaceflight News (rss-space, rss-space-alt)');
  });

  it('allows disabled sources to share a public display name with enabled sources', () => {
    const sources = parseSourcesConfig({
      sources: [
        {
          ...validConfig.sources[0],
          key: 'rsshub-space',
          name: 'RSSHub - 商业航天',
          type: 'rsshub',
        },
        {
          ...validConfig.sources[0],
          key: 'google-news-space',
          name: 'Google News RSS - 商业航天',
          type: 'google_news_rss',
          enabled: false,
        },
      ],
    });

    expect(sources).toHaveLength(2);
  });

  it('rejects route-unsafe source keys', () => {
    expect(() =>
      parseSourcesConfig({
        sources: [{ ...validConfig.sources[0], key: 'Launch_Library 2' }],
      }),
    ).toThrow('Source key must use lowercase letters, numbers, and single hyphen separators');
  });

  it('rejects non-public source URLs', () => {
    expect(() =>
      parseSourcesConfig({
        sources: [{ ...validConfig.sources[0], url: 'ftp://example.com/feed.xml' }],
      }),
    ).toThrow('Source URL must be a public http or https URL');

    expect(() =>
      parseSourcesConfig({
        sources: [{ ...validConfig.sources[0], url: 'https://user:pass@example.com/feed.xml' }],
      }),
    ).toThrow('Source URL must be a public http or https URL');
  });

  it('requires source risk notes for compliance review', () => {
    expect(() =>
      parseSourcesConfig({
        sources: [{ ...validConfig.sources[0], risk_notes: '   ' }],
      }),
    ).toThrow();
  });

  it('rejects unsupported source dedupe strategies', () => {
    expect(() =>
      parseSourcesConfig({
        sources: [{ ...validConfig.sources[0], dedupe_strategy: 'url-title-source' }],
      }),
    ).toThrow();
  });

  it('validates the repository source configuration', () => {
    const yaml = readFileSync(resolve(process.cwd(), 'config/sources.yaml'), 'utf8');
    const companiesYaml = readFileSync(resolve(process.cwd(), 'config/companies.yaml'), 'utf8');
    const topicsYaml = readFileSync(resolve(process.cwd(), 'config/topics.yaml'), 'utf8');
    const sources = parseSourcesYaml(yaml);
    const companies = parseCompaniesYaml(companiesYaml);
    const topics = parseTopicsYaml(topicsYaml);

    expect(sources.length).toBeGreaterThanOrEqual(20);
    expect(sources.some((source) => source.type === 'api')).toBe(true);
    expect(sources.some((source) => source.type === 'rss')).toBe(true);
    expect(sources.some((source) => source.type === 'google_news_rss')).toBe(true);
    expect(sources.some((source) => source.type === 'procurement_page')).toBe(true);
    expect(sources.filter((source) => source.enabled && source.type === 'google_news_rss')).toHaveLength(6);
    expect(sources.filter((source) => source.enabled && ['rss', 'official_page', 'procurement_page'].includes(source.type)).length).toBeGreaterThanOrEqual(40);
    expect(
      sources
        .filter((source) =>
          ['hainan-gov-news', 'hainan-wenchang-space-special', 'sichuan-gov-policy', 'sichuan-gov-news'].includes(source.key),
        )
        .map((source) => ({ key: source.key, enabled: source.enabled, accessGlobal: source.access_global })),
    ).toEqual([
      { key: 'hainan-gov-news', enabled: false, accessGlobal: 'blocked' },
      { key: 'hainan-wenchang-space-special', enabled: false, accessGlobal: 'direct' },
      { key: 'sichuan-gov-policy', enabled: false, accessGlobal: 'blocked' },
      { key: 'sichuan-gov-news', enabled: false, accessGlobal: 'blocked' },
    ]);
    expect(sources.filter((source) => source.enabled).every((source) => source.public_category)).toBe(true);
    expect(sources.filter((source) => source.enabled).every((source) => source.access_domestic && source.access_global)).toBe(true);
    expect(sources.map((source) => source.name).join('\n')).not.toMatch(/Google News RSS|google_news_rss|API 源|RSS 源|备用聚合/);
    expect(sources.flatMap((source) => source.include_terms ?? [])).not.toContain('产业园');
    expect(
      sources
        .filter((source) => source.enabled && source.type === 'official_page')
        .flatMap((source) => source.include_terms ?? []),
    ).not.toEqual(expect.arrayContaining(['申报', '通知', '公示', '重大项目', '产业基金', '行动方案', '政策措施', '行动计划']));
    const enabledDisplayNames = sources.filter((source) => source.enabled).map(sourceDisplayName);
    expect(new Set(enabledDisplayNames).size).toBe(enabledDisplayNames.length);
    expect(() =>
      assertValidSourceDefaultReferences(sources, {
        topicSlugs: topics.map((topic) => topic.slug),
        companyIdentifiers: companies.flatMap((company) => [company.slug, company.name, company.englishName].filter(Boolean)),
      }),
    ).not.toThrow();
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

  it('deduplicates the same Google News story across keyword feeds', () => {
    const first = createDedupeKey({
      sourceKey: 'google-news-cn-commercial-space',
      title: '民营火箭企业完成发动机试车',
      url: 'https://news.google.com/rss/articles/example?oc=5',
    });
    const second = createDedupeKey({
      sourceKey: 'google-news-cn-private-launch',
      title: '民营火箭企业完成发动机试车',
      url: 'https://news.google.com/rss/articles/example?hl=zh-CN',
    });

    expect(first).toBe(second);
  });

  it('supports canonical URL/title dedupe beyond Google News source keys', () => {
    const first = createDedupeKey(
      {
        sourceKey: 'rsshub-weibo-space-keyword',
        title: '商业航天企业完成发射',
        url: 'https://example.com/story?utm_source=rsshub',
      },
      'canonical_url_title',
    );
    const second = createDedupeKey(
      {
        sourceKey: 'rsshub-bilibili-space-keyword',
        title: ' 商业航天企业完成发射 ',
        url: 'https://www.example.com/story',
      },
      'canonical_url_title',
    );

    expect(first).toBe(second);
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

  it('applies configured source dedupe strategies when collecting', async () => {
    const collector: SourceCollector = {
      type: 'rsshub',
      async collect(source) {
        return [
          {
            sourceKey: source.key,
            sourceName: source.name,
            title: '商业航天企业完成发射',
            summary: '',
            url: 'https://example.com/story?utm_source=rsshub',
            publishedAt: '2026-05-31T00:00:00.000Z',
            language: 'zh',
            region: 'cn',
            relatedLaunchIds: [],
            companies: [],
            tags: [],
          },
        ];
      },
    };
    const registry = createCollectorRegistry([collector]);
    const [firstSource, secondSource] = parseSourcesConfig({
      sources: [
        {
          ...validConfig.sources[0],
          key: 'rsshub-weibo-space-keyword',
          name: 'RSSHub - 微博商业航天关键词',
          type: 'rsshub',
          region: 'cn',
          url: 'https://rsshub.example.com/weibo/keyword/space',
          dedupe_strategy: 'canonical_url_title',
        },
        {
          ...validConfig.sources[0],
          key: 'rsshub-bilibili-space-keyword',
          name: 'RSSHub - B站商业航天关键词',
          type: 'rsshub',
          region: 'cn',
          url: 'https://rsshub.example.com/bilibili/search/space',
          dedupe_strategy: 'canonical_url_title',
        },
      ],
    });

    const [firstRecord] = await collectSource(firstSource, registry, { now: () => new Date(), fetch });
    const [secondRecord] = await collectSource(secondSource, registry, { now: () => new Date(), fetch });

    expect(firstRecord.dedupeHash).toBe(secondRecord.dedupeHash);
  });
});

describe('Spaceflight News API collector', () => {
  it('normalizes SNAPI v4 article results', async () => {
    let requestHeaders: HeadersInit | undefined;
    const [source] = parseSourcesConfig(validConfig);
    const items = await spaceflightNewsCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async (_input, init) => {
        requestHeaders = init?.headers;
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 37838,
                title: ' <em>Rescue</em>   &lt;strong&gt;mission&lt;/strong&gt; passes key testing milestone ',
                url: 'https://spaceflightnow.com/example/',
                news_site: ' <b>Spaceflight</b>   Now ',
                summary: 'A commercial <strong>servicing</strong> mission &lt;em&gt;passed&lt;/em&gt; testing.',
                published_at: '2026-05-08T23:19:34Z',
                launches: [{ launch_id: 'f596ad48-881e-47d6-806d-113c6dd97427' }],
              },
            ],
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    });

    expect(requestHeaders).toMatchObject({
      'user-agent': 'space-intel/0.1 (+https://space.bytebaud.com)',
    });
    expect(items).toEqual([
      {
        sourceKey: 'snapi',
        sourceName: 'Spaceflight Now',
        publisherName: 'Spaceflight Now',
        title: 'Rescue mission passes key testing milestone',
        originalTitle: 'Rescue mission passes key testing milestone',
        summary: 'A commercial servicing mission passed testing.',
        url: 'https://spaceflightnow.com/example/',
        publishedAt: '2026-05-08T23:19:34.000Z',
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

  it('drops SNAPI articles without web article links', async () => {
    const [source] = parseSourcesConfig(validConfig);
    const items = await spaceflightNewsCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                id: 37838,
                title: 'Unsafe article link',
                url: 'ftp://example.com/article',
                news_site: 'Spaceflight Now',
                summary: 'Should not be collected.',
                published_at: '2026-05-08T23:19:34Z',
                launches: [],
              },
              {
                id: 37840,
                title: '   ',
                url: 'https://example.com/blank-title',
                news_site: 'Spaceflight Now',
                summary: 'Should not be collected without a usable title.',
                published_at: '2026-05-08T23:21:34Z',
                launches: [],
              },
              {
                id: 37839,
                title: 'Safe article link',
                url: 'https://example.com/article',
                news_site: 'Spaceflight Now',
                summary: 'Should be collected.',
                published_at: 'not-a-date',
                launches: [],
              },
            ],
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        ),
    });

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Safe article link');
    expect(items[0].url).toBe('https://example.com/article');
    expect(items[0].publishedAt).toBe('2026-05-09T00:00:00.000Z');
  });

  it('uses source max_items as the SNAPI request and output limit', async () => {
    let requestedUrl = '';
    const [source] = parseSourcesConfig({
      sources: [
        {
          ...validConfig.sources[0],
          url: 'https://api.spaceflightnewsapi.net/v4/articles/?limit=99',
          max_items: 1,
        },
      ],
    });

    const items = await spaceflightNewsCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async (input) => {
        requestedUrl = String(input);
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 37838,
                title: 'First article',
                url: 'https://example.com/first',
                news_site: 'Spaceflight Now',
                summary: 'Should be collected.',
                published_at: '2026-05-08T23:19:34Z',
                launches: [],
              },
              {
                id: 37839,
                title: 'Second article',
                url: 'https://example.com/second',
                news_site: 'Spaceflight Now',
                summary: 'Should be capped.',
                published_at: '2026-05-08T23:20:34Z',
                launches: [],
              },
            ],
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    });

    expect(new URL(requestedUrl).searchParams.get('limit')).toBe('1');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('First article');
  });

  it('falls back from invalid SNAPI URL limits before requesting upstream data', async () => {
    let requestedUrl = '';
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'snapi',
          name: 'Spaceflight News',
          type: 'api',
          region: 'global',
          url: 'https://api.spaceflightnewsapi.net/v4/articles/?limit=1e3',
          credibility: 5,
          enabled: true,
          purpose: 'International commercial space news.',
          expected_content: 'Article metadata and original links.',
          risk_notes: 'Public API metadata only.',
          dedupe_strategy: 'url_title_source',
        },
      ],
    });

    await spaceflightNewsCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async (input) => {
        requestedUrl = String(input);
        return new Response(JSON.stringify({ results: [] }), {
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    expect(new URL(requestedUrl).searchParams.get('limit')).toBe('25');
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
                name: ' Electron   | Commercial rideshare ',
                url: 'https://ll.thespacedevs.com/2.2.0/launch/f596ad48-881e-47d6-806d-113c6dd97427/',
                net: 'Sun, 10 May 2026 12:00:00 GMT',
                status: { name: ' Go   for Launch ' },
                rocket: { configuration: { full_name: ' Electron ' } },
                launch_service_provider: { name: ' Rocket   Lab ' },
                pad: { name: ' LC-1A ', location: { name: ' Mahia,   New Zealand ' } },
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
        windowStart: '2026-05-10T12:00:00.000Z',
        site: 'LC-1A, Mahia, New Zealand',
        status: 'Go for Launch',
        rawUrl: 'https://ll.thespacedevs.com/2.2.0/launch/f596ad48-881e-47d6-806d-113c6dd97427/',
      },
    ]);
  });
});

describe('RSS collector', () => {
  it('normalizes RSS items into metadata-only article records', async () => {
    let requestHeaders: HeadersInit | undefined;
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
          default_tags: ['satellite-internet'],
          default_companies: ['Rocket Lab'],
        },
      ],
    });

    const items = await rssCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async (_input, init) => {
        requestHeaders = init?.headers;
        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title><![CDATA[<strong>Space</strong> &amp; Defense News]]></title>
              <item>
                <title><![CDATA[Commercial <em>launch</em> &amp; provider signs &lt;strong&gt;new&lt;/strong&gt; contract]]></title>
                <link>https://example.com/contract</link>
                <guid>contract-1</guid>
                <pubDate>Sat, 09 May 2026 01:00:00 GMT</pubDate>
                <description><![CDATA[Short <strong>summary</strong> &amp; market update &lt;em&gt;&#183;&lt;/em&gt; satellite demand.]]></description>
              </item>
            </channel>
          </rss>`,
          {
            headers: { 'content-type': 'application/rss+xml' },
          },
        );
      },
    });

    expect(items).toHaveLength(1);
    expect(requestHeaders).toMatchObject({
      'user-agent': 'SpaceIntelBot/1.0 (+https://space.bytebaud.com)',
    });
    expect(items[0]).toMatchObject({
      sourceKey: 'spacenews-rss',
      sourceName: 'Space & Defense News',
      publisherName: 'Space & Defense News',
      title: 'Commercial launch & provider signs new contract',
      originalTitle: 'Commercial launch & provider signs new contract',
      summary: 'Short summary & market update · satellite demand.',
      url: 'https://example.com/contract',
      publishedAt: '2026-05-09T01:00:00.000Z',
      language: 'en',
      region: 'global',
      rawId: 'contract-1',
      relatedLaunchIds: [],
      companies: ['Rocket Lab'],
      tags: ['satellite-internet'],
    });
  });

  it('uses the configured source name when RSS feed title is blank', async () => {
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
              <title><![CDATA[   ]]></title>
              <item>
                <title>Safe feed link</title>
                <link>https://example.com/safe</link>
                <description>Should be collected.</description>
              </item>
            </channel>
          </rss>`,
          {
            headers: { 'content-type': 'application/rss+xml' },
          },
        ),
    });

    expect(items[0]).toMatchObject({
      sourceName: 'SpaceNews RSS',
      publisherName: 'SpaceNews RSS',
    });
  });

  it('drops RSS items without web article links', async () => {
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
              <title> SpaceNews </title>
              <item>
                <title>Unsafe feed link</title>
                <link>javascript:alert(1)</link>
                <description>Should not be collected.</description>
              </item>
              <item>
                <title><![CDATA[   ]]></title>
                <link>https://example.com/blank-title</link>
                <description>Should not be collected without a usable title.</description>
              </item>
              <item>
                <title>Safe feed link</title>
                <link>https://example.com/safe</link>
                <pubDate>not-a-date</pubDate>
                <description>Should be collected.</description>
              </item>
            </channel>
          </rss>`,
          {
            headers: { 'content-type': 'application/rss+xml' },
          },
        ),
    });

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Safe feed link');
    expect(items[0].url).toBe('https://example.com/safe');
    expect(items[0].publishedAt).toBe('2026-05-09T00:00:00.000Z');
  });

  it('applies RSS max_items after dropping invalid feed links', async () => {
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
          max_items: 1,
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
                <title>Unsafe feed link</title>
                <link>javascript:alert(1)</link>
                <description>Should not count against max_items.</description>
              </item>
              <item>
                <title>First safe link</title>
                <link>https://example.com/first-safe</link>
                <description>Should be collected.</description>
              </item>
              <item>
                <title>Second safe link</title>
                <link>https://example.com/second-safe</link>
                <description>Should be capped by max_items.</description>
              </item>
            </channel>
          </rss>`,
          {
            headers: { 'content-type': 'application/rss+xml' },
          },
        ),
    });

    expect(items.map((item) => item.title)).toEqual(['First safe link']);
  });
});

describe('Google News RSS collector', () => {
  it('normalizes Chinese keyword feed items and keeps original source links', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'google-news-cn-private-launch',
          name: '商业航天来源',
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
                <title><![CDATA[民营&lt;b&gt;火箭&lt;/b&gt;&#183;发动机试车 - 示例&amp;媒体-中文站]]></title>
                <link>https://news.google.com/rss/articles/example</link>
                <guid>google-news-1</guid>
                <pubDate>Sat, 09 May 2026 02:00:00 GMT</pubDate>
                <description>只保留&lt;strong&gt;摘要&lt;/strong&gt; &amp; 原文入口&#x2014;商业航天。</description>
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
      sourceName: '商业航天来源',
      publisherName: '示例&媒体-中文站',
      title: '民营火箭·发动机试车',
      originalTitle: '民营火箭·发动机试车 - 示例&媒体-中文站',
      summary: '只保留摘要 & 原文入口—商业航天。',
      url: 'https://news.google.com/rss/articles/example',
      language: 'zh',
      region: 'cn',
      rawId: 'google-news-1',
    });
  });

  it('drops Google News RSS items without web article links', async () => {
    let requestHeaders: HeadersInit | undefined;
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'google-news-cn-private-launch',
          name: '商业航天来源',
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
      fetch: async (_input, init) => {
        requestHeaders = init?.headers;
        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Google 新闻 - 商业航天</title>
              <item>
                <title>无效链接 - 示例媒体</title>
                <link>javascript:alert(1)</link>
                <description>Should not be collected.</description>
              </item>
              <item>
                <title> - 示例媒体</title>
                <link>https://news.google.com/rss/articles/blank?url=https%3A%2F%2Fexample.com%2Fblank</link>
                <description>Should not be collected without a usable title.</description>
              </item>
              <item>
                <title>有效链接 - 示例媒体</title>
                <link>https://news.google.com/rss/articles/example?url=https%3A%2F%2Fexample.com%2Fstory</link>
                <pubDate>not-a-date</pubDate>
                <description>Should be collected.</description>
              </item>
            </channel>
          </rss>`,
          {
            headers: { 'content-type': 'application/rss+xml' },
          },
        );
      },
    });

    expect(requestHeaders).toMatchObject({
      'user-agent': 'SpaceIntelBot/1.0 (+https://space.bytebaud.com)',
    });
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('有效链接');
    expect(items[0].url).toBe('https://example.com/story');
    expect(items[0].publishedAt).toBe('2026-05-09T00:00:00.000Z');
  });

  it('applies Google News RSS max_items after dropping invalid feed links', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'google-news-cn-private-launch',
          name: '商业航天来源',
          type: 'google_news_rss',
          region: 'cn',
          url: 'https://news.google.com/rss/search?q=%E5%95%86%E4%B8%9A%E8%88%AA%E5%A4%A9',
          credibility: 3,
          enabled: true,
          purpose: 'Chinese keyword monitoring.',
          expected_content: 'Chinese news metadata.',
          risk_notes: 'Public RSS metadata only.',
          dedupe_strategy: 'url_title_source',
          max_items: 1,
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
                <title>无效链接 - 示例媒体</title>
                <link>javascript:alert(1)</link>
                <description>Should not count against max_items.</description>
              </item>
              <item>
                <title>第一条有效链接 - 示例媒体</title>
                <link>https://news.google.com/rss/articles/first?url=https%3A%2F%2Fexample.com%2Ffirst</link>
                <description>Should be collected.</description>
              </item>
              <item>
                <title>第二条有效链接 - 示例媒体</title>
                <link>https://news.google.com/rss/articles/second?url=https%3A%2F%2Fexample.com%2Fsecond</link>
                <description>Should be capped by max_items.</description>
              </item>
            </channel>
          </rss>`,
          {
            headers: { 'content-type': 'application/rss+xml' },
          },
        ),
    });

    expect(items.map((item) => item.title)).toEqual(['第一条有效链接']);
  });
});

describe('RSSHub collector', () => {
  it('normalizes RSSHub feed items through the RSS metadata pipeline', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'rsshub-weibo-space-keyword',
          name: '微博商业航天关键词',
          type: 'rsshub',
          region: 'cn',
          url: 'https://rsshub.app/weibo/keyword/%E5%95%86%E4%B8%9A%E8%88%AA%E5%A4%A9',
          credibility: 2,
          enabled: true,
          purpose: 'Chinese platform keyword monitoring.',
          expected_content: 'Public post metadata and original links.',
          risk_notes: 'RSSHub route availability may vary; metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['domestic-private-launch'],
          max_items: 1,
        },
      ],
    });

    const items = await rsshubCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>微博商业航天关键词</title>
              <item>
                <title>商业航天发射动态</title>
                <link>https://weibo.com/example/status/1</link>
                <guid>weibo-1</guid>
                <pubDate>Sat, 09 May 2026 00:00:00 GMT</pubDate>
                <description>公开平台摘要。</description>
              </item>
              <item>
                <title>第二条动态</title>
                <link>https://weibo.com/example/status/2</link>
                <guid>weibo-2</guid>
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
      sourceKey: 'rsshub-weibo-space-keyword',
      sourceName: '微博商业航天关键词',
      title: '商业航天发射动态',
      url: 'https://weibo.com/example/status/1',
      language: 'zh',
      region: 'cn',
      tags: ['domestic-private-launch'],
    });
  });
});

describe('official page collector', () => {
  it('extracts official policy links and filters unrelated broad-source items', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'miit-news',
          name: '工业和信息化部新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.miit.gov.cn/xwdt/index.html',
          credibility: 5,
          enabled: true,
          purpose: 'Official industrial policy updates.',
          expected_content: 'Official metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="/xwdt/2026-05-08-satellite.html">关于卫星互联网产业发展的通知</a>
              <a href="/xwdt/2026-05-08-unrelated.html">纺织行业质量提升活动</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items).toEqual([
      {
        sourceKey: 'miit-news',
        sourceName: '工业和信息化部新闻',
        publisherName: '工业和信息化部新闻',
        title: '关于卫星互联网产业发展的通知',
        originalTitle: '关于卫星互联网产业发展的通知',
        summary: '官方发布：关于卫星互联网产业发展的通知',
        url: 'https://www.miit.gov.cn/xwdt/2026-05-08-satellite.html',
        publishedAt: '2026-05-08T00:00:00Z',
        language: 'zh',
        region: 'cn',
        rawId: 'https://www.miit.gov.cn/xwdt/2026-05-08-satellite.html',
        relatedLaunchIds: [],
        companies: [],
        tags: ['policy-and-regulation', 'satellite-internet'],
      },
    ]);
  });

  it('does not treat generic industrial-park or leadership-inspection labels as official-page relevance', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'local-gov-news',
          name: '地方政府新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://example.gov.cn/news/',
          credibility: 5,
          enabled: true,
          purpose: 'Local government news.',
          expected_content: 'Official metadata and original links.',
          risk_notes: 'Broad official page metadata only.',
          dedupe_strategy: 'url_title_source',
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="/news/health-park.html">2026-05-08 区领导调研无锡美丽健康产业园</a>
              <a href="/news/space-park.html">2026-05-08 空天产业园卫星制造项目完成阶段建设</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items.map((item) => item.title)).toEqual(['空天产业园卫星制造项目完成阶段建设']);
  });

  it('drops generic official-site navigation and section links even for broad official sources', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'cnsa-news',
          name: '国家航天局新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.cnsa.gov.cn/n6758967/n6758971/index.html',
          credibility: 5,
          enabled: true,
          purpose: 'National space administration updates.',
          expected_content: 'Official news metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['policy-and-regulation'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="/n6758967/n6758970/index.html">意见征集</a>
              <a href="/n6758967/n6758971/index.html">咨询建议</a>
              <a href="/n6758967/n6758972/index.html">互动交流</a>
              <a href="/xwdt/szyw/">时政要闻</a>
              <a href="/xwzx/kjkx/">空间科学</a>
              <a href="/xwzx/ztbd/">专题报道</a>
              <a href="/xwdt/gzdt/">工作动态</a>
              <a href="/n6758967/n6758973/c10750640/content.html">2026-05-08 国家航天局发布卫星互联网应用试点通知</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items.map((item) => item.title)).toEqual(['国家航天局发布卫星互联网应用试点通知']);
  });

  it('requires real CNSA article URLs before accepting broad space-related titles', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'cnsa-news',
          name: '国家航天局新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.cnsa.gov.cn/n6758823/n6758838/index.html',
          credibility: 5,
          enabled: true,
          purpose: 'National space administration updates.',
          expected_content: 'Official news metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['policy-and-regulation'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="/n6758823/n6758838/index.html">2026-05-08 国家航天局商业航天服务入口</a>
              <a href="/n6758823/n6758838/c10750640/content.html">2026-05-08 国家航天局发布商业航天政策通知</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items.map((item) => ({ title: item.title, url: item.url }))).toEqual([
      {
        title: '国家航天局发布商业航天政策通知',
        url: 'https://www.cnsa.gov.cn/n6758823/n6758838/c10750640/content.html',
      },
    ]);
  });

  it('drops external footer links while keeping external article links from official page candidates', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'cnsa-news',
          name: '国家航天局新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.cnsa.gov.cn/n6758823/n6758838/index.html',
          credibility: 5,
          enabled: true,
          purpose: 'National space administration updates.',
          expected_content: 'Official news metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['policy-and-regulation'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="/n6758823/n6758838/c10750640/content.html">2026-05-08 神舟二十二号载人飞船顺利撤离空间站组合体</a>
              <a href="https://www.miit.gov.cn/">中华人民共和国工业和信息化部</a>
              <a href="http://www.spacechina.com/n25/index.html">中国航天科技集团有限公司</a>
              <a href="https://mp.weixin.qq.com/s/example">2026-05-08 引力一号实现第二次海上发射</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items.map((item) => ({ title: item.title, url: item.url }))).toEqual([
      {
        title: '神舟二十二号载人飞船顺利撤离空间站组合体',
        url: 'https://www.cnsa.gov.cn/n6758823/n6758838/c10750640/content.html',
      },
      {
        title: '引力一号实现第二次海上发射',
        url: 'https://mp.weixin.qq.com/s/example',
      },
    ]);
  });

  it('does not treat generic press-conference context as aerospace relevance', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'miit-news',
          name: '工信部新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.miit.gov.cn/xwdt/index.html',
          credibility: 5,
          enabled: true,
          purpose: 'Industry ministry updates.',
          expected_content: 'Official news metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['policy-and-regulation'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <ul>
                <li>
                  <a href="./politics.html">2026-05-08 李强主持召开国务院常务会议 研究促进创业投资发展的有关举措等</a>
                  <a href="./auto.html">2026-05-08 2024世界智能网联汽车大会新闻发布会在京召开</a>
                  <a href="./project.html">2026-05-08 关于开展重大项目申报工作的通知</a>
                </li>
                <li>
                  <a href="./space.html">2026-05-08 商业航天新闻发布会发布卫星互联网行动方案</a>
                </li>
              </ul>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items.map((item) => item.title)).toEqual(['商业航天新闻发布会发布卫星互联网行动方案']);
  });

  it('follows same-origin script redirects before extracting official page links', async () => {
    const requestedUrls: string[] = [];
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'ndrc-policy',
          name: '国家发展改革委政策',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.ndrc.gov.cn/xxgk/zcfb/',
          credibility: 5,
          enabled: true,
          purpose: 'Macro industrial policy references.',
          expected_content: 'Official policy metadata and original links.',
          risk_notes: 'Official page uses same-origin script redirects.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['policy-and-regulation'],
          include_terms: ['低空经济'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async (input) => {
        requestedUrls.push(String(input));

        if (String(input).endsWith('/xxgk/zcfb/')) {
          return new Response(`<script>window.location.href='./fzggwl/';</script>`, {
            headers: { 'content-type': 'text/html' },
          });
        }

        return new Response(
          `<html>
            <body>
              <a href="./2026-05-08-demo.html">关于低空经济发展规划的通知</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        );
      },
    });

    expect(requestedUrls).toEqual(['https://www.ndrc.gov.cn/xxgk/zcfb/', 'https://www.ndrc.gov.cn/xxgk/zcfb/fzggwl/']);
    expect(items).toEqual([
      expect.objectContaining({
        sourceKey: 'ndrc-policy',
        title: '关于低空经济发展规划的通知',
        url: 'https://www.ndrc.gov.cn/xxgk/zcfb/fzggwl/2026-05-08-demo.html',
      }),
    ]);
  });

  it('does not follow incidental script redirects when the official page already has links', async () => {
    const requestedUrls: string[] = [];
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'cmse-news',
          name: '中国载人航天工程新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.cmse.gov.cn/xwzx/',
          credibility: 5,
          enabled: true,
          purpose: 'Official crewed-space program news.',
          expected_content: 'Official news metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['policy-and-regulation'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async (input) => {
        requestedUrls.push(String(input));

        return new Response(
          `<html>
            <body>
              <script>if (false) window.location.href='/fallback/';</script>
              <a href="./2026-05-08-demo.html">载人航天工程任务取得新进展</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        );
      },
    });

    expect(requestedUrls).toEqual(['https://www.cmse.gov.cn/xwzx/']);
    expect(items).toEqual([
      expect.objectContaining({
        sourceKey: 'cmse-news',
        title: '载人航天工程任务取得新进展',
        url: 'https://www.cmse.gov.cn/xwzx/2026-05-08-demo.html',
      }),
    ]);
  });

  it('uses configured defaults for company official pages', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'orienspace-news',
          name: '东方空间新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.orienspace.com/newsPage',
          credibility: 4,
          enabled: true,
          purpose: 'Company announcements.',
          expected_content: 'Company news metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['domestic-private-launch'],
          default_companies: ['东方空间'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="/news/demo">2026-05-08 引力一号完成海上发射任务</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items[0]).toMatchObject({
      sourceKey: 'orienspace-news',
      companies: ['东方空间'],
      tags: ['domestic-private-launch'],
    });
  });

  it('uses leading source dates for published time without keeping them in public titles', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'orienspace-news',
          name: '东方空间新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.orienspace.com/newsPage',
          credibility: 4,
          enabled: true,
          purpose: 'Company announcements.',
          expected_content: 'Company news metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['domestic-private-launch'],
          default_companies: ['东方空间'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="/news/gravity-1">11/10/2025 引力一号实现第二次海上发射，率先满足规模化低轨星座组网发射需求</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items[0]).toMatchObject({
      title: '引力一号实现第二次海上发射，率先满足规模化低轨星座组网发射需求',
      originalTitle: '11/10/2025 引力一号实现第二次海上发射，率先满足规模化低轨星座组网发射需求',
      summary: '官方发布：引力一号实现第二次海上发射，率先满足规模化低轨星座组网发射需求',
      publishedAt: '2025-10-11T00:00:00Z',
    });
  });

  it('uses trailing Chinese source dates for company news without keeping them in public titles', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'landspace-news',
          name: '蓝箭航天新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.landspace.com/site/',
          credibility: 4,
          enabled: true,
          purpose: 'Company announcements.',
          expected_content: 'Company news metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['domestic-private-launch'],
          default_companies: ['蓝箭航天'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="/site/news-detail.html?itemid=67">蓝箭航天成功进行多星堆叠及卫星组合体试验 06 02月 2026</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items[0]).toMatchObject({
      title: '蓝箭航天成功进行多星堆叠及卫星组合体试验',
      originalTitle: '蓝箭航天成功进行多星堆叠及卫星组合体试验 06 02月 2026',
      summary: '官方发布：蓝箭航天成功进行多星堆叠及卫星组合体试验',
      publishedAt: '2026-02-06T00:00:00Z',
    });
  });

  it('drops official page candidates without a real source date instead of using crawl time', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'casic-news',
          name: '中国航天科工集团新闻',
          type: 'official_page',
          region: 'cn',
          url: 'http://www.casic.com.cn/',
          credibility: 5,
          enabled: true,
          purpose: 'Company news.',
          expected_content: 'Company news metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['domestic-private-launch'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="https://www.e-casic.com/">航天科工集中采购平台</a>
              <a href="/news/demo.html">航天科工发布商业航天合作动态</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items).toEqual([]);
  });

  it('drops official page section URLs even when they have relevant titles and dates', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'cmse-news',
          name: '中国载人航天工程新闻',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.cmse.gov.cn/xwzx/',
          credibility: 5,
          enabled: true,
          purpose: 'Official crewed-space program news.',
          expected_content: 'Official news metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['policy-and-regulation'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="/kjkx/kjkxyjyyy/">2026-05-08 空间科学研究与应用</a>
              <a href="/xwzx/2026-05-08-demo.html">2026-05-08 载人航天工程任务取得新进展</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items.map((item) => ({ title: item.title, url: item.url }))).toEqual([
      {
        title: '载人航天工程任务取得新进展',
        url: 'https://www.cmse.gov.cn/xwzx/2026-05-08-demo.html',
      },
    ]);
  });

  it('removes bracketed leading source dates from official page public titles', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'cnsa-news',
          name: '国家航天局',
          type: 'official_page',
          region: 'cn',
          url: 'https://www.cnsa.gov.cn/news/',
          credibility: 5,
          enabled: true,
          purpose: 'Official space agency updates.',
          expected_content: 'Official metadata and original links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['policy-and-regulation'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <a href="/news/c10750641/content.html">【2026年5月30日】商业航天政策公告发布</a>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items[0]).toMatchObject({
      title: '商业航天政策公告发布',
      originalTitle: '【2026年5月30日】商业航天政策公告发布',
      summary: '官方发布：商业航天政策公告发布',
      publishedAt: '2026-05-30T00:00:00Z',
    });
  });

  it('uses list item context dates and configured include terms for local policy pages', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'beijing-jxj-notices',
          name: '北京市经信局通知公告',
          type: 'official_page',
          region: 'cn',
          url: 'https://jxj.beijing.gov.cn/jxdt/tzgg/',
          credibility: 5,
          enabled: true,
          purpose: 'Official notices.',
          expected_content: 'Official metadata and links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['policy-and-regulation'],
          include_terms: ['公共试验平台'],
          exclude_terms: ['教育'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <ul>
                <li><span>2026-05-08</span><a href="./demo.html">商业航天公共试验平台申报通知</a></li>
                <li><span>2026-05-08</span><a href="./edu.html">教育培训服务通知</a></li>
              </ul>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items).toEqual([
      expect.objectContaining({
        sourceKey: 'beijing-jxj-notices',
        title: '商业航天公共试验平台申报通知',
        url: 'https://jxj.beijing.gov.cn/jxdt/tzgg/demo.html',
        publishedAt: '2026-05-08T00:00:00Z',
        tags: ['policy-and-regulation'],
      }),
    ]);
  });

  it('drops official page candidates when source dates are invalid', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'beijing-jxj-notices',
          name: '北京市经信局通知公告',
          type: 'official_page',
          region: 'cn',
          url: 'https://jxj.beijing.gov.cn/jxdt/tzgg/',
          credibility: 5,
          enabled: true,
          purpose: 'Official notices.',
          expected_content: 'Official metadata and links.',
          risk_notes: 'Official page metadata only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['policy-and-regulation'],
          include_terms: ['公共试验平台'],
        },
      ],
    });

    const items = await officialPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <ul>
                <li><span>2026-13-40</span><a href="./demo.html">商业航天公共试验平台申报通知</a></li>
              </ul>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items).toEqual([]);
  });

  it('drops non-web Launch Library source URLs while keeping launch metadata', async () => {
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
                url: 'data:text/html,hi',
                net: 'not-a-date',
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

    expect(launches).toHaveLength(1);
    expect(launches[0]).toMatchObject({
      externalId: 'f596ad48-881e-47d6-806d-113c6dd97427',
      windowStart: null,
      rawUrl: null,
    });
  });
});

describe('procurement page collector', () => {
  it('extracts public procurement links with space-domain signals', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'ccgp-central-procurement',
          name: '中国政府采购网中央公告',
          type: 'procurement_page',
          region: 'cn',
          url: 'https://www.ccgp.gov.cn/cggg/zygg/',
          credibility: 5,
          enabled: true,
          purpose: 'Monitor public procurement notices.',
          expected_content: 'Public listing metadata and links.',
          risk_notes: 'Public listing only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['space-procurement', 'policy-and-regulation'],
          max_items: 1,
        },
      ],
    });

    const items = await procurementPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <ul>
                <li><span>2026-05-08</span><a href="./notice-1.htm">某卫星遥感数据采购项目中标公告</a></li>
                <li><span>2026-05-08</span><a href="./notice-2.htm">办公用品采购公告</a></li>
                <li><span>2026-05-08</span><a href="./notice-3.htm">某卫星测控系统采购公告</a></li>
              </ul>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items).toEqual([
      {
        sourceKey: 'ccgp-central-procurement',
        sourceName: '中国政府采购网中央公告',
        publisherName: '中国政府采购网中央公告',
        title: '某卫星遥感数据采购项目中标公告',
        summary: '采购公告：某卫星遥感数据采购项目中标公告',
        url: 'https://www.ccgp.gov.cn/cggg/zygg/notice-1.htm',
        publishedAt: '2026-05-08T00:00:00Z',
        language: 'zh',
        region: 'cn',
        rawId: 'https://www.ccgp.gov.cn/cggg/zygg/notice-1.htm',
        relatedLaunchIds: [],
        companies: [],
        tags: ['space-procurement', 'policy-and-regulation', 'commercial-remote-sensing'],
      },
    ]);
  });

  it('does not use neighboring procurement context as the space-domain signal', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'ccgp-central-procurement',
          name: '中国政府采购网中央公告',
          type: 'procurement_page',
          region: 'cn',
          url: 'https://www.ccgp.gov.cn/cggg/zygg/',
          credibility: 5,
          enabled: true,
          purpose: 'Monitor public procurement notices.',
          expected_content: 'Public listing metadata and links.',
          risk_notes: 'Public listing only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['space-procurement', 'policy-and-regulation'],
        },
      ],
    });

    const items = await procurementPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <ul>
                <li>
                  <a href="./general.htm">节能降碳产品政府采购制度意见</a>
                  <span>2026-05-08</span><a href="./space.htm">某卫星遥感数据采购项目中标公告</a>
                </li>
              </ul>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items.map((item) => item.title)).toEqual(['某卫星遥感数据采购项目中标公告']);
  });

  it('skips procurement page candidates when dates are invalid', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'ccgp-central-procurement',
          name: '中国政府采购网中央公告',
          type: 'procurement_page',
          region: 'cn',
          url: 'https://www.ccgp.gov.cn/cggg/zygg/',
          credibility: 5,
          enabled: true,
          purpose: 'Monitor public procurement notices.',
          expected_content: 'Public listing metadata and links.',
          risk_notes: 'Public listing only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['space-procurement', 'policy-and-regulation'],
        },
      ],
    });

    const items = await procurementPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <ul>
                <li><span>2026-02-30</span><a href="./notice-1.htm">某卫星遥感数据采购项目中标公告</a></li>
              </ul>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items).toEqual([]);
  });

  it('removes leading source dates from procurement page public titles', async () => {
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'ccgp-central-procurement',
          name: '中国政府采购网中央公告',
          type: 'procurement_page',
          region: 'cn',
          url: 'https://www.ccgp.gov.cn/cggg/zygg/',
          credibility: 5,
          enabled: true,
          purpose: 'Monitor public procurement notices.',
          expected_content: 'Public listing metadata and links.',
          risk_notes: 'Public listing only.',
          dedupe_strategy: 'url_title_source',
          default_tags: ['space-procurement', 'policy-and-regulation'],
        },
      ],
    });

    const items = await procurementPageCollector.collect(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          `<html>
            <body>
              <ul>
                <li><a href="./notice-1.htm">【2026年5月30日】某卫星遥感数据采购项目中标公告</a></li>
              </ul>
            </body>
          </html>`,
          { headers: { 'content-type': 'text/html' } },
        ),
    });

    expect(items[0]).toMatchObject({
      title: '某卫星遥感数据采购项目中标公告',
      originalTitle: '【2026年5月30日】某卫星遥感数据采购项目中标公告',
      summary: '采购公告：某卫星遥感数据采购项目中标公告',
      publishedAt: '2026-05-30T00:00:00Z',
    });
  });

  it('uses source max_items as the Launch Library request and output limit', async () => {
    let requestedUrl = '';
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'launch-library-2',
          name: 'Launch Library 2',
          type: 'api',
          region: 'global',
          url: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=99',
          credibility: 5,
          enabled: true,
          purpose: 'Upcoming launch cache.',
          expected_content: 'Launch event metadata.',
          risk_notes: 'Public API metadata only.',
          dedupe_strategy: 'external_id',
          max_items: 1,
        },
      ],
    });

    const launches = await launchLibraryCollector.collectLaunches(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async (input) => {
        requestedUrl = String(input);
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 'launch-1',
                name: 'First launch',
                url: 'https://example.com/launch-1',
                net: 'Sun, 10 May 2026 12:00:00 GMT',
                status: { name: 'Go for Launch' },
              },
              {
                id: 'launch-2',
                name: 'Second launch',
                url: 'https://example.com/launch-2',
                net: '2026-05-11T12:00:00Z',
                status: { name: 'TBD' },
              },
            ],
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    });

    expect(new URL(requestedUrl).searchParams.get('limit')).toBe('1');
    expect(launches).toHaveLength(1);
    expect(launches[0].externalId).toBe('launch-1');
  });

  it('normalizes invalid Launch Library URL limits before requesting upstream data', async () => {
    let requestedUrl = '';
    const [source] = parseSourcesConfig({
      sources: [
        {
          key: 'launch-library-2',
          name: 'Launch Library 2',
          type: 'api',
          region: 'global',
          url: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=1000',
          credibility: 5,
          enabled: true,
          purpose: 'Upcoming launch cache.',
          expected_content: 'Launch event metadata.',
          risk_notes: 'Public API metadata only.',
          dedupe_strategy: 'external_id',
        },
      ],
    });

    await launchLibraryCollector.collectLaunches(source, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async (input) => {
        requestedUrl = String(input);
        return new Response(JSON.stringify({ results: [] }), {
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    expect(new URL(requestedUrl).searchParams.get('limit')).toBe('100');
  });
});
