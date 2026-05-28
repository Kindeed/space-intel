import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';

const relevantPolicyTerms = [
  '航天',
  '卫星',
  '火箭',
  '发射',
  '运载',
  '入轨',
  '试车',
  '试验',
  '飞船',
  '载荷',
  '低轨',
  '组网',
  '星座',
  '低空经济',
  '商业航天',
  '商业火箭',
  '空间信息',
  '通信卫星',
  '卫星互联网',
  '遥感',
  '朱雀',
  '天龙',
  '谷神星',
  '引力',
  '力箭',
  '星云',
  '吉林一号',
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

function topicTagsForTitle(title: string): string[] {
  const text = title.toLowerCase();
  const tags: string[] = [];

  if (/(可回收|垂直回收|重复使用|reusable|booster recovery)/i.test(title)) {
    tags.push('reusable-rockets');
  }

  if (text.includes('卫星互联网') || text.includes('低轨') || text.includes('星座') || text.includes('leo broadband')) {
    tags.push('satellite-internet');
  }

  if (text.includes('遥感') || text.includes('earth observation') || text.includes('吉林一号')) {
    tags.push('commercial-remote-sensing');
  }

  if (text.includes('民营火箭') || text.includes('商业火箭') || text.includes('朱雀') || text.includes('天龙') || text.includes('谷神星') || text.includes('力箭') || text.includes('引力')) {
    tags.push('domestic-private-launch');
  }

  if (text.includes('政策') || text.includes('监管') || text.includes('regulation') || text.includes('policy') || text.includes('spectrum')) {
    tags.push('policy-and-regulation');
  }

  return tags;
}

function itemTags(source: SourceConfig, title: string): string[] {
  const defaults = source.default_tags ?? ['policy-and-regulation'];
  return [...new Set([...defaults, ...topicTagsForTitle(title)])];
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
        companies: source.default_companies ?? [],
        tags: itemTags(source, title),
      });

      if (items.length >= 20) {
        break;
      }
    }

    return items;
  },
};
