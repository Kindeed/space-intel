import type { CollectorContext, NormalizedItem, SourceCollector, SourceConfig } from '../types';
import { absoluteUrl, extractDate, extractHtmlListLinks, stripLeadingDatePrefix } from '../htmlList';

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
  '空天',
  '航空航天',
  '6g',
  '北斗',
  '测控',
  '空天产业园',
  '航天产业园',
  '商业航天产业园',
  '卫星产业园',
];

const defaultExcludeTerms = ['文旅', '旅游', '教育', '医疗', '生态环境', '食品安全', '天气', '体育赛事'];
const navigationTitles = new Set([
  '首页',
  '新闻动态',
  '时政要闻',
  '工作动态',
  '空间科学',
  '专题报道',
  '政务公开',
  '政府信息公开',
  '机构设置',
  '政策法规',
  '办事服务',
  '互动交流',
  '咨询建议',
  '意见征集',
  '联系我们',
  '网站地图',
  '搜索',
  '更多',
  'home',
  'about',
  'contact',
  'sitemap',
  'search',
  'more',
]);

function containsAny(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function isNavigationTitle(title: string): boolean {
  return navigationTitles.has(title.replace(/\s+/g, '').toLowerCase());
}

function scriptRedirectUrl(html: string, baseUrl: string): string | null {
  const match = html.match(/window\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i);
  const redirectedUrl = match ? absoluteUrl(match[1], baseUrl) : null;

  if (!redirectedUrl || redirectedUrl === baseUrl) {
    return null;
  }

  return new URL(redirectedUrl).origin === new URL(baseUrl).origin ? redirectedUrl : null;
}

function isRelevant(source: SourceConfig, text: string): boolean {
  if (source.key === 'cnsa-news') {
    return true;
  }

  if (containsAny(text, source.exclude_terms ?? defaultExcludeTerms)) {
    return false;
  }

  return containsAny(text, source.include_terms ?? relevantPolicyTerms);
}

function isCnsaArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === 'www.cnsa.gov.cn') {
      return parsed.pathname.endsWith('/content.html');
    }

    return parsed.hostname === 'mp.weixin.qq.com';
  } catch {
    return false;
  }
}

function isSectionLikeOfficialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    return path === '' || path === '/' || path.endsWith('/') || /\/(?:index|default)\.s?html?$/.test(path);
  } catch {
    return true;
  }
}

function isAcceptableOfficialLink(source: SourceConfig, url: string): boolean {
  if (source.key === 'cnsa-news') {
    return isCnsaArticleUrl(url);
  }

  return !isSectionLikeOfficialUrl(url);
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

function publicTitle(title: string): string {
  return stripLeadingDatePrefix(title);
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

    let html = await response.text();
    let effectiveUrl = source.url;
    let links = extractHtmlListLinks(html, effectiveUrl);
    const redirectedUrl = scriptRedirectUrl(html, effectiveUrl);

    if (!links.length && redirectedUrl) {
      const redirectedResponse = await context.fetch(redirectedUrl, {
        headers: {
          accept: 'text/html, application/xhtml+xml',
          'user-agent': 'SpaceIntelBot/1.0 (+https://space.bytebaud.com)',
        },
      });

      if (!redirectedResponse.ok) {
        throw new Error(`Official page redirect request failed for ${source.key} with HTTP ${redirectedResponse.status}`);
      }

      html = await redirectedResponse.text();
      effectiveUrl = redirectedUrl;
      links = extractHtmlListLinks(html, effectiveUrl);
    }

    const seen = new Set<string>();
    const items: NormalizedItem[] = [];
    const maxItems = source.max_items ?? 20;

    for (const link of links) {
      if (isNavigationTitle(link.title)) {
        continue;
      }

      const signalText = `${link.title} ${link.contextText} ${link.url}`;
      const publishedAt = extractDate(signalText);

      if (seen.has(link.url) || !publishedAt || !isAcceptableOfficialLink(source, link.url) || !isRelevant(source, signalText)) {
        continue;
      }

      seen.add(link.url);
      const title = publicTitle(link.title);
      items.push({
        sourceKey: source.key,
        sourceName: source.name,
        publisherName: source.name,
        title,
        originalTitle: link.title,
        summary: `官方发布：${title}`,
        url: link.url,
        publishedAt,
        language: source.region === 'cn' ? 'zh' : 'en',
        region: source.region,
        rawId: link.url,
        relatedLaunchIds: [],
        companies: source.default_companies ?? [],
        tags: itemTags(source, signalText),
      });

      if (items.length >= maxItems) {
        break;
      }
    }

    return items;
  },
};
