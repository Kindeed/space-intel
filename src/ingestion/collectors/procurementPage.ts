import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';
import { extractDate as extractHtmlDate, extractHtmlListLinks } from '../htmlList';

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

function extractDate(input: string, fallback: Date): string {
  return extractHtmlDate(input) ?? fallback.toISOString();
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

    for (const link of extractHtmlListLinks(html, source.url)) {
      if (seen.has(link.url)) {
        continue;
      }

      const signalText = `${link.title} ${link.contextText}`;

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
