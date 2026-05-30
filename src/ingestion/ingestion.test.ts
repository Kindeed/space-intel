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
    expect(sources.some((source) => source.type === 'procurement_page')).toBe(true);
    expect(sources.filter((source) => source.enabled && source.type === 'google_news_rss')).toHaveLength(0);
    expect(sources.filter((source) => source.enabled && ['rss', 'official_page', 'procurement_page'].includes(source.type)).length).toBeGreaterThanOrEqual(40);
    expect(sources.filter((source) => source.enabled).every((source) => source.public_category || source.type !== 'google_news_rss')).toBe(true);
    expect(sources.map((source) => source.name).join('\n')).not.toMatch(/Google News RSS|google_news_rss|API 源|RSS 源|备用聚合/);
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
        publisherName: 'Spaceflight Now',
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
        );
      },
    });

    expect(items).toHaveLength(1);
    expect(requestHeaders).toMatchObject({
      'user-agent': 'SpaceIntelBot/1.0 (+https://space.bytebaud.com)',
    });
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
      companies: ['Rocket Lab'],
      tags: ['satellite-internet'],
    });
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
      sourceName: '商业航天来源',
      publisherName: '示例媒体',
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
              <a href="/news/demo">引力一号完成海上发射任务</a>
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
});
