import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';

const relevantPolicyTerms = [
  '航天',
  '卫星',
  '火箭',
  '低空经济',
  '商业航天',
  '空间信息',
  '通信卫星',
  '遥感',
  'space',
  'satellite',
  'launch',
  'rocket',
  'commercial space',
  'space bureau',
  'spectrum',
];

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}

function absoluteUrl(value: string, base: string): string | null {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function isRelevant(source: SourceConfig, title: string): boolean {
  if (source.key === 'cnsa-news') {
    return true;
  }

  const text = title.toLowerCase();
  return relevantPolicyTerms.some((term) => text.includes(term.toLowerCase()));
}

function extractDate(value: string): string | null {
  const match = value.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`;
}

export const officialPageCollector: SourceCollector = {
  type: 'official_page',
  async collect(source: SourceConfig, context: CollectorContext): Promise<NormalizedItem[]> {
    const response = await context.fetch(source.url, {
      headers: {
        accept: 'text/html, application/xhtml+xml',
        'user-agent': 'SpaceIntelBot/1.0 (+https://space.bytebaud.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Official page request failed for ${source.key} with HTTP ${response.status}`);
    }

    const html = await response.text();
    const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const seen = new Set<string>();
    const items: NormalizedItem[] = [];

    for (const match of html.matchAll(linkPattern)) {
      const url = absoluteUrl(match[1], source.url);
      const title = stripHtml(match[2]);

      if (!url || !title || title.length < 4 || seen.has(url) || !isRelevant(source, title)) {
        continue;
      }

      seen.add(url);
      items.push({
        sourceKey: source.key,
        sourceName: source.name,
        title,
        originalTitle: title,
        summary: `官方发布：${title}`,
        url,
        publishedAt: extractDate(`${title} ${url}`) ?? context.now().toISOString(),
        language: source.region === 'cn' ? 'zh' : 'en',
        region: source.region,
        rawId: url,
        relatedLaunchIds: [],
        companies: [],
        tags: ['policy-and-regulation'],
      });

      if (items.length >= 20) {
        break;
      }
    }

    return items;
  },
};
