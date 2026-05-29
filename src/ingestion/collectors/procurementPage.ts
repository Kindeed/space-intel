import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';

const domainTerms = [
  '航天',
  '卫星',
  '火箭',
  '发射',
  '遥感',
  '测控',
  '北斗',
  '空间信息',
  '星座',
  '商业航天',
  '载荷',
  '通信卫星',
  '低轨',
];

const procurementTerms = ['招标', '采购', '中标', '成交', '公告', '公示', '项目'];

function decodeHtml(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(input: string): string {
  return decodeHtml(input.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function absoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function extractDate(input: string, fallback: Date): string {
  const match = input.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);

  if (!match) {
    return fallback.toISOString();
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
}

function titleTags(title: string): string[] {
  const tags = new Set<string>(['space-procurement']);

  if (/政策|政府|监管|主管部门|规划|通知|公告|公示/.test(title)) {
    tags.add('policy-and-regulation');
  }

  if (/遥感|SAR|光学|测绘|观测/.test(title)) {
    tags.add('commercial-remote-sensing');
  }

  if (/卫星互联网|低轨|通信|星座|宽带/.test(title)) {
    tags.add('satellite-internet');
  }

  return [...tags];
}

function hasSpaceProcurementSignal(text: string): boolean {
  return domainTerms.some((term) => text.includes(term)) && procurementTerms.some((term) => text.includes(term));
}

function extractBlocks(html: string): string[] {
  const blocks = [...html.matchAll(/<(li|tr)\b[^>]*>[\s\S]*?<\/\1>/gi)].map((match) => match[0]);

  if (blocks.length) {
    return blocks;
  }

  return [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map((match) => match[0]);
}

function extractLink(block: string, baseUrl: string): { title: string; url: string } | null {
  const match = block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);

  if (!match) {
    return null;
  }

  const title = stripHtml(match[2]);

  if (!title || title.length < 4) {
    return null;
  }

  return {
    title,
    url: absoluteUrl(baseUrl, match[1]),
  };
}

export const procurementPageCollector: SourceCollector = {
  type: 'procurement_page',
  async collect(source: SourceConfig, context: CollectorContext): Promise<NormalizedItem[]> {
    const response = await context.fetch(source.url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'space-intel-public-procurement-monitor/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch procurement page ${source.key}: ${response.status}`);
    }

    const html = await response.text();
    const seen = new Set<string>();
    const items: NormalizedItem[] = [];

    for (const block of extractBlocks(html)) {
      const link = extractLink(block, source.url);

      if (!link || seen.has(link.url)) {
        continue;
      }

      const contextText = stripHtml(block);
      const signalText = `${link.title} ${contextText}`;

      if (!hasSpaceProcurementSignal(signalText)) {
        continue;
      }

      seen.add(link.url);
      items.push({
        sourceKey: source.key,
        sourceName: source.name,
        title: link.title,
        summary: `采购公告：${link.title}`,
        url: link.url,
        publishedAt: extractDate(signalText, context.now()),
        language: 'zh',
        region: source.region,
        rawId: link.url,
        relatedLaunchIds: [],
        companies: source.default_companies ?? [],
        tags: [...new Set([...(source.default_tags ?? []), ...titleTags(signalText)])],
      });

      if (items.length >= 30) {
        break;
      }
    }

    return items;
  },
};
