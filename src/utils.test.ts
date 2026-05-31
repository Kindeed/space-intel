import { describe, expect, it, vi } from 'vitest';
import {
  articleCompanyFilterPath,
  articleFromApi,
  articleListApiPath,
  articleRegionFilterPath,
  articleSourceFilterValue,
  articleSourceFilterPath,
  articleTopicFilterPath,
  companyName,
  displayArticleText,
  displayOptionalArticleText,
  displayCompanyMetadata,
  displayCompanyName,
  displayLaunchMission,
  displayLaunchProvider,
  displayLaunchRocket,
  displayLaunchSite,
  displayLaunchStatus,
  displayRegion,
  displayRelatedSourceNames,
  displayTime,
  displayTopicCategory,
  displayTopicName,
  filterFormPath,
  friendlyError,
  formatLaunchWindow,
  isNotFoundError,
  launchLabel,
  launchProviderFilterPath,
  launchProximity,
  pageHref,
  parseBoundedPositiveInteger,
  parsePositiveInteger,
  setPositiveIntegerSearchParam,
  setTrimmedSearchParam,
  safeExternalUrl,
  shouldShowEmptyState,
  tagName,
  trimmedSearchParams,
} from './utils';
import {
  accessStatusRank,
  publicCategoryRank,
  sourceAccessSummaryLabel,
  sourceDisplayMetadata,
  sourceDisplayName,
  sourceTypeFallbackCategory,
  sourceTypeFallbackLabel,
  stripAggregatorPrefix,
} from './sourceDisplay';
import type { ApiArticleSummary } from './types';

const article: ApiArticleSummary = {
  id: 1,
  title: 'Reusable rocket milestone',
  originalTitle: 'Reusable rocket milestone',
  summary: 'Short summary only.',
  originalSummary: 'Short summary only.',
  url: 'https://example.com/article',
  sourceName: 'Google News - 商业航天',
  sourceCategoryLabel: '来源',
  publisherName: '新华社',
  publishedAt: '2026-05-09T00:00:00Z',
  regionLabel: '国内',
  tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
  companies: [{ slug: 'landspace', name: '蓝箭航天' }],
};

describe('articleFromApi', () => {
  it('maps only real article relations into visible tags and companies', () => {
    const result = articleFromApi(article);

    expect(result.tags).toEqual([{ slug: 'reusable-rockets', name: '可回收火箭' }]);
    expect(result.companies).toEqual([{ slug: 'landspace', name: '蓝箭航天' }]);
    expect(result.source).toBe('新华社');
    expect(result.sourceFilter).toBeUndefined();
    expect(result.tags.map((tag) => tag.name)).not.toContain('google-news-cn-commercial-space');
    expect(result.tags.map((tag) => tag.name)).not.toContain('zh');
  });

  it('normalizes visible article text from API rows', () => {
    const result = articleFromApi({
      ...article,
      title: ' Reusable   rocket\tmilestone ',
      summary: ' Short\nsummary   only. ',
    });

    expect(result.title).toBe('Reusable rocket milestone');
    expect(result.summary).toBe('Short summary only.');
  });

  it('keeps source filters tied to configured source names instead of publisher labels', () => {
    expect(articleFromApi({ ...article, publisherName: null, sourceName: 'SpaceNews' }).sourceFilter).toBe('SpaceNews');
    expect(articleFromApi({ ...article, publisherName: '新华社', sourceName: '商业航天来源' }).sourceFilter).toBeUndefined();
    expect(articleSourceFilterValue({ publisherName: '新华社', sourceName: '商业航天来源' })).toBeUndefined();
    expect(articleFromApi({ ...article, publisherName: 'Google News RSS -    ', sourceName: 'Google News RSS - 商业航天' }).sourceFilter).toBe('商业航天');
    expect(articleFromApi({ ...article, publisherName: ' SpaceNews ', sourceName: 'SpaceNews' }).sourceFilter).toBe('SpaceNews');
    expect(articleSourceFilterValue({ publisherName: ' SpaceNews ', sourceName: 'SpaceNews' })).toBe('SpaceNews');
  });

  it('hides aggregator implementation prefixes from visible publisher labels', () => {
    expect(articleFromApi({ ...article, publisherName: 'Google News RSS - 商业航天', sourceName: 'Google News RSS - 商业航天' }).source).toBe('商业航天');
    expect(articleFromApi({ ...article, publisherName: 'RSSHub - 微博商业航天关键词', sourceName: 'RSSHub - 微博商业航天关键词' }).source).toBe(
      '微博商业航天关键词',
    );
  });

  it('uses public source category labels for visible article categories', () => {
    expect(articleFromApi({ ...article, sourceCategoryLabel: '官方机构' }).category).toBe('政策监管');
    expect(articleFromApi({ ...article, sourceCategoryLabel: '官方   机构' }).category).toBe('政策监管');
    expect(articleFromApi({ ...article, sourceCategoryLabel: '公告信息' }).category).toBe('政策监管');
    expect(articleFromApi({ ...article, sourceCategoryLabel: '专业媒体', regionLabel: '国   内' as ApiArticleSummary['regionLabel'] }).category).toBe(
      '国内商业航天',
    );
    expect(articleFromApi({ ...article, sourceCategoryLabel: '专业媒体', regionLabel: '国   际' as ApiArticleSummary['regionLabel'] }).category).toBe(
      '国际商业航天',
    );
    expect(articleFromApi({ ...article, sourceCategoryLabel: '专业媒体', regionLabel: '地区待确认' }).category).toBe('商业航天');
  });
});

describe('region display helpers', () => {
  it('uses an explicit fallback for unknown article regions', () => {
    expect(displayRegion('cn')).toBe('国内');
    expect(displayRegion('国   内')).toBe('国内');
    expect(displayRegion('global')).toBe('国际');
    expect(displayRegion('国   际')).toBe('国际');
    expect(displayRegion('国   外')).toBe('国际');
    expect(displayRegion('   ')).toBe('地区待确认');
    expect(displayRegion('unknown-region')).toBe('地区待确认');
  });

  it('builds article region filter links only for precise public regions', () => {
    expect(articleRegionFilterPath('国内')).toBe('/articles?region=cn');
    expect(articleRegionFilterPath('国   内')).toBe('/articles?region=cn');
    expect(articleRegionFilterPath('国际')).toBe('/articles?region=global');
    expect(articleRegionFilterPath('国   际')).toBe('/articles?region=global');
    expect(articleRegionFilterPath('地区待确认')).toBeNull();
  });
});

describe('article source filter helpers', () => {
  it('builds public source filter links from configured source names', () => {
    expect(articleSourceFilterPath(' Spaceflight   Now ')).toBe('/articles?source=Spaceflight+Now');
    expect(articleSourceFilterPath('新华社')).toBe('/articles?source=%E6%96%B0%E5%8D%8E%E7%A4%BE');
    expect(articleSourceFilterPath('来源')).toBeNull();
    expect(articleSourceFilterPath('来   源')).toBeNull();
    expect(articleSourceFilterPath(undefined)).toBeNull();
    expect(articleSourceFilterPath('   ')).toBeNull();
  });
});

describe('article entity filter helpers', () => {
  it('builds article entity filter links only for usable entity values', () => {
    expect(articleCompanyFilterPath('rocket-lab')).toBe('/articles?company=rocket-lab');
    expect(articleCompanyFilterPath(' Rocket   Lab ')).toBe('/articles?company=Rocket+Lab');
    expect(articleCompanyFilterPath('   ')).toBeNull();
    expect(articleCompanyFilterPath(null)).toBeNull();
    expect(articleTopicFilterPath('reusable-rockets')).toBe('/articles?tag=reusable-rockets');
    expect(articleTopicFilterPath(' 可回收   火箭 ')).toBe('/articles?tag=%E5%8F%AF%E5%9B%9E%E6%94%B6+%E7%81%AB%E7%AE%AD');
    expect(articleTopicFilterPath('   ')).toBeNull();
    expect(articleTopicFilterPath(null)).toBeNull();
  });
});

describe('company display helpers', () => {
  it('normalizes company names for display', () => {
    expect(displayCompanyName(' Rocket   Lab ')).toBe('Rocket Lab');
    expect(displayCompanyName(null)).toBe('公司');
    expect(displayCompanyName('   ', '公司详情')).toBe('公司详情');
  });

  it('normalizes company metadata for display', () => {
    expect(displayCompanyMetadata(' 发射   服务 ', '赛道待确认')).toBe('发射 服务');
    expect(displayCompanyMetadata(null, '未披露/未上市')).toBe('未披露/未上市');
    expect(displayCompanyMetadata('   ', '地区待确认')).toBe('地区待确认');
  });
});

describe('topic display helpers', () => {
  it('normalizes topic names and category labels for display', () => {
    expect(displayTopicName(' 可回收   火箭 ')).toBe('可回收 火箭');
    expect(displayTopicName(null)).toBe('专题');
    expect(displayTopicName('   ', '专题详情')).toBe('专题详情');
    expect(displayTopicCategory(' 技术   路线 ')).toBe('技术 路线');
    expect(displayTopicCategory('   ')).toBe('专题');
  });
});

describe('article detail entity helpers', () => {
  it('normalizes nested article entity labels for display', () => {
    expect(companyName({ slug: 'rocket-lab', name: ' Rocket   Lab ' })).toBe('Rocket Lab');
    expect(companyName({ slug: 'unknown-company', name: '   ' })).toBe('公司档案');
    expect(tagName({ slug: 'reusable-rockets', name: ' 可回收   火箭 ' })).toBe('可回收 火箭');
    expect(tagName({ slug: 'unknown-topic', name: '   ' })).toBe('专题记录');
    expect(launchLabel({ id: 1, externalId: 'll2/demo', missionName: ' Demo   launch ', name: '' })).toBe('Demo launch');
  });
});

describe('article related source helpers', () => {
  it('normalizes related source names before display', () => {
    expect(displayRelatedSourceNames(['Google News RSS - 商业   航天', ' Spaceflight\tNow ', '   '])).toEqual(['商业 航天', 'Spaceflight Now']);
    expect(displayRelatedSourceNames(['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
    expect(displayRelatedSourceNames(undefined)).toEqual([]);
  });

  it('deduplicates related source names after display cleanup', () => {
    expect(displayRelatedSourceNames(['SpaceNews', 'spacenews', 'Google News RSS - SpaceNews', '新华社'])).toEqual(['SpaceNews', '新华社']);
    expect(displayRelatedSourceNames(['A', 'B', 'b', 'C'], 3)).toEqual(['A', 'B', 'C']);
  });
});

describe('article text display helpers', () => {
  it('normalizes article text and applies Chinese fallbacks', () => {
    expect(displayArticleText(' Reusable   rocket ', '标题待确认')).toBe('Reusable rocket');
    expect(displayArticleText('   ', '标题待确认')).toBe('标题待确认');
    expect(displayArticleText(null, '摘要待确认')).toBe('摘要待确认');
    expect(displayOptionalArticleText(' Original\nsummary\t only. ')).toBe('Original summary only.');
    expect(displayOptionalArticleText('   ')).toBeNull();
  });
});

describe('time display helpers', () => {
  it('uses a Chinese fallback for invalid article timestamps', () => {
    expect(displayTime('invalid-timestamp-value')).toBe('时间待定');
  });
});

describe('URL helpers', () => {
  it('allows only http and https external URLs', () => {
    expect(safeExternalUrl('https://example.com/article')).toBe('https://example.com/article');
    expect(safeExternalUrl(' http://example.com/path ')).toBe('http://example.com/path');
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,hi')).toBeNull();
    expect(safeExternalUrl('https://user:pass@example.com/article')).toBeNull();
    expect(safeExternalUrl('/relative/path')).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });

  it('parses only positive integer URL values', () => {
    expect(parsePositiveInteger('12', 1)).toBe(12);
    expect(parsePositiveInteger(' 12 ', 1)).toBe(12);
    expect(parsePositiveInteger('3.9', 1)).toBe(1);
    expect(parsePositiveInteger('1e3', 1)).toBe(1);
    expect(parsePositiveInteger('+12', 1)).toBe(1);
    expect(parsePositiveInteger(String(Number.MAX_SAFE_INTEGER + 1), 1)).toBe(1);
    expect(parsePositiveInteger('0', 1)).toBe(1);
    expect(parsePositiveInteger('-2', 1)).toBe(1);
    expect(parsePositiveInteger('abc', 1)).toBe(1);
    expect(parsePositiveInteger(null, 1)).toBe(1);
  });

  it('parses bounded positive integer URL values', () => {
    expect(parseBoundedPositiveInteger('24', 12, 50)).toBe(24);
    expect(parseBoundedPositiveInteger('1000', 12, 50)).toBe(50);
    expect(parseBoundedPositiveInteger('3.9', 12, 50)).toBe(12);
    expect(parseBoundedPositiveInteger(null, 12, 50)).toBe(12);
  });

  it('trims article list filters before creating API paths', () => {
    const params = new URLSearchParams({
      source: ' snapi ',
      query: ' rocket   lab ',
      tag: '  ',
      page: '9',
    });

    expect(articleListApiPath(params, 1, 12)).toBe('/api/articles?source=snapi&query=rocket+lab&page=1&limit=12');
  });

  it('sets only non-empty trimmed search parameters', () => {
    const params = new URLSearchParams();

    setTrimmedSearchParam(params, 'provider', ' Rocket   Lab ');
    setTrimmedSearchParam(params, 'status', '   ');

    expect(params.toString()).toBe('provider=Rocket+Lab');
  });

  it('sets only positive integer search parameters', () => {
    const params = new URLSearchParams();

    setPositiveIntegerSearchParam(params, 'limit', ' 24 ');
    setPositiveIntegerSearchParam(params, 'page', '3.9');
    setPositiveIntegerSearchParam(params, 'offset', '0');
    setPositiveIntegerSearchParam(params, 'cursor', '1e3');

    expect(params.toString()).toBe('limit=24');
  });

  it('caps positive integer search parameters when a max is provided', () => {
    const params = new URLSearchParams();

    setPositiveIntegerSearchParam(params, 'limit', '1000', 50);

    expect(params.toString()).toBe('limit=50');
  });

  it('copies only allowed non-empty query parameters', () => {
    const params = new URLSearchParams({
      source: ' snapi ',
      query: '   ',
      unknown: 'debug',
    });

    expect(trimmedSearchParams(params, ['source', 'query']).toString()).toBe('source=snapi');
  });

  it('builds clean filter form paths from submitted fields', () => {
    const formData = new FormData();
    formData.set('query', ' Rocket   Lab ');
    formData.set('source', '   ');
    formData.set('tag', ' 可回收火箭 ');
    formData.set('unknown', 'debug');

    expect(filterFormPath('/articles', formData, ['query', 'source', 'tag'])).toBe(
      '/articles?query=Rocket+Lab&tag=%E5%8F%AF%E5%9B%9E%E6%94%B6%E7%81%AB%E7%AE%AD',
    );
  });

  it('drops all-empty filter form parameters', () => {
    const formData = new FormData();
    formData.set('query', '   ');
    formData.set('source', '');

    expect(filterFormPath('/policy', formData, ['query', 'source'])).toBe('/policy');
  });

  it('sanitizes article pagination links', () => {
    const params = new URLSearchParams({
      source: ' snapi ',
      query: '   ',
      unknown: 'debug',
      limit: ' 24 ',
    });

    expect(pageHref(params, 2)).toBe('/articles?source=snapi&limit=24&page=2');
  });

  it('drops invalid limit values from article pagination links', () => {
    const params = new URLSearchParams({
      source: 'snapi',
      limit: '1e3',
    });

    expect(pageHref(params, 2)).toBe('/articles?source=snapi&page=2');
  });

  it('caps oversized limit values in article pagination links', () => {
    const params = new URLSearchParams({
      source: 'snapi',
      limit: '1000',
    });

    expect(pageHref(params, 2)).toBe('/articles?source=snapi&limit=50&page=2');
  });
});

describe('error helpers', () => {
  it('detects not-found errors through one shared predicate', () => {
    expect(isNotFoundError(new Error('HTTP 404'))).toBe(true);
    expect(isNotFoundError(new Error('HTTP 404: Not Found'))).toBe(true);
    expect(isNotFoundError(new Error('request failed (404)'))).toBe(true);
    expect(isNotFoundError(new Error('HTTP 500'))).toBe(false);
    expect(isNotFoundError(new Error('HTTP 1404'))).toBe(false);
    expect(isNotFoundError(new Error('upstream 4040'))).toBe(false);
    expect(friendlyError(new Error('HTTP 404'), '文章详情')).toBe('文章详情已更新或暂时不可访问。');
    expect(friendlyError(new Error('HTTP 404'), '专题详情', '专题不存在或已调整。')).toBe('专题不存在或已调整。');
  });

  it('shows empty states only for successful empty loads', () => {
    expect(shouldShowEmptyState(false, null, 0)).toBe(true);
    expect(shouldShowEmptyState(true, null, 0)).toBe(false);
    expect(shouldShowEmptyState(false, new Error('HTTP 500'), 0)).toBe(false);
    expect(shouldShowEmptyState(false, null, 1)).toBe(false);
  });
});

describe('launch display helpers', () => {
  it('builds launch provider filter links only for usable provider labels', () => {
    expect(launchProviderFilterPath('Rocket Lab')).toBe('/launches?provider=Rocket+Lab');
    expect(launchProviderFilterPath('  Rocket   Lab  ')).toBe('/launches?provider=Rocket+Lab');
    expect(launchProviderFilterPath('  CASC  ')).toBe('/launches?provider=CASC');
    expect(launchProviderFilterPath(null)).toBeNull();
    expect(launchProviderFilterPath('   ')).toBeNull();
    expect(launchProviderFilterPath('待定')).toBeNull();
    expect(launchProviderFilterPath('发射商待定')).toBeNull();
    expect(launchProviderFilterPath('发射商   待定')).toBeNull();
  });

  it('normalizes launch provider labels for display', () => {
    expect(displayLaunchProvider(' Rocket   Lab ')).toBe('Rocket Lab');
    expect(displayLaunchProvider('发射商   待定')).toBe('发射商待定');
    expect(displayLaunchProvider(null)).toBe('发射商待定');
    expect(displayLaunchProvider('   ', '待定')).toBe('待定');
  });

  it('normalizes launch mission labels for display', () => {
    expect(displayLaunchMission(' Demo   launch ')).toBe('Demo launch');
    expect(displayLaunchMission(null)).toBe('发射任务');
    expect(displayLaunchMission('   ', '发射记录')).toBe('发射记录');
  });

  it('normalizes launch vehicle and site labels for display', () => {
    expect(displayLaunchRocket(' Falcon   9 ')).toBe('Falcon 9');
    expect(displayLaunchRocket(null)).toBe('火箭型号未披露');
    expect(displayLaunchRocket('   ', '未披露')).toBe('未披露');
    expect(displayLaunchSite(' Cape   Canaveral ')).toBe('Cape Canaveral');
    expect(displayLaunchSite(null)).toBe('场站待定');
    expect(displayLaunchSite('   ', '待定')).toBe('待定');
  });

  it('uses a Chinese fallback for missing or invalid launch windows', () => {
    expect(formatLaunchWindow(null)).toBe('窗口待定');
    expect(formatLaunchWindow('invalid-window-value')).toBe('窗口待定');
    expect(launchProximity(null)).toBe('待定');
    expect(launchProximity('invalid-window-value')).toBe('待定');
  });

  it('does not treat arbitrary go substrings as ready launch statuses', () => {
    expect(displayLaunchStatus('Go')).toBe('准备发射');
    expect(displayLaunchStatus('Launch Go')).toBe('准备发射');
    expect(displayLaunchStatus('No Go')).toBe('等待窗口');
    expect(displayLaunchStatus('No   Go')).toBe('等待窗口');
    expect(displayLaunchStatus('ongoing review')).toBe('任务评审');
    expect(displayLaunchStatus('ongoing')).toBe('状态待定');
  });

  it('does not treat unsuccessful statuses as launch success', () => {
    expect(displayLaunchStatus('Successful')).toBe('发射成功');
    expect(displayLaunchStatus('Unsuccessful')).toBe('发射异常');
    expect(displayLaunchStatus('不成功')).toBe('发射异常');
    expect(displayLaunchStatus('不   成功')).toBe('发射异常');
  });

  it('maps stored Chinese launch status aliases to public labels', () => {
    expect(displayLaunchStatus('发射成功')).toBe('发射成功');
    expect(displayLaunchStatus('发射   成功')).toBe('发射成功');
    expect(displayLaunchStatus('失败')).toBe('发射异常');
    expect(displayLaunchStatus('发射异常')).toBe('发射异常');
    expect(displayLaunchStatus('等待')).toBe('等待窗口');
    expect(displayLaunchStatus('待确认')).toBe('待确认');
    expect(displayLaunchStatus('任务评审')).toBe('任务评审');
  });

  it('uses future-facing copy for upcoming launches more than one day away', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-30T00:00:00+08:00'));

    try {
      expect(launchProximity('2026-06-02T00:00:00+08:00')).toBe('约 3 天后');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('source display helpers', () => {
  it('normalizes aggregator source prefixes in one shared helper', () => {
    expect(stripAggregatorPrefix('Google News RSS - 商业航天')).toBe('商业航天');
    expect(stripAggregatorPrefix('Google News - 政策动态')).toBe('政策动态');
    expect(stripAggregatorPrefix('RSSHub - 微博商业航天关键词')).toBe('微博商业航天关键词');
    expect(stripAggregatorPrefix('Google News RSS - RSSHub - 微博商业航天关键词')).toBe('微博商业航天关键词');
    expect(stripAggregatorPrefix('Google News - Google News RSS - Spaceflight Now')).toBe('Spaceflight Now');
    expect(stripAggregatorPrefix('专业媒体')).toBe('专业媒体');
  });

  it('hides aggregator implementation prefixes from public source names', () => {
    expect(sourceDisplayName({ name: 'RSSHub - 微博商业航天关键词', type: 'rsshub', public_category: undefined })).toBe('微博商业航天关键词');
    expect(sourceDisplayName({ name: 'Google News RSS - 商业航天', type: 'google_news_rss', public_category: 'source' })).toBe('商业航天');
    expect(sourceDisplayName({ name: ' SpaceNews ', type: 'rss', public_category: 'media' })).toBe('SpaceNews');
    expect(sourceDisplayName({ name: '   ', type: 'rss', public_category: 'media' })).toBe('来源');
  });

  it('normalizes internal whitespace in public source display names', () => {
    expect(sourceDisplayName({ name: 'RSSHub - 微博\t\t商业航天关键词', type: 'rsshub', public_category: undefined })).toBe('微博 商业航天关键词');
    expect(sourceDisplayName({ name: 'Spaceflight   News', type: 'rss', public_category: 'media' })).toBe('Spaceflight News');
    expect(stripAggregatorPrefix('Google News RSS - Spaceflight\tNow')).toBe('Spaceflight Now');
  });

  it('maps internal source types to public fallback labels', () => {
    expect(sourceTypeFallbackCategory('api')).toBe('data');
    expect(sourceTypeFallbackCategory('rss')).toBe('media');
    expect(sourceTypeFallbackCategory('unknown_internal_type')).toBe('source');
    expect(sourceTypeFallbackLabel('api')).toBe('数据来源');
    expect(sourceTypeFallbackLabel('rss')).toBe('专业媒体');
    expect(sourceTypeFallbackLabel('google_news_rss')).toBe('来源');
    expect(sourceTypeFallbackLabel('unknown_internal_type')).toBe('来源');
  });

  it('keeps shared public source sort orders stable', () => {
    const categories: Array<'source' | 'data' | 'media' | 'official'> = ['source', 'data', 'media', 'official'];
    const accessStatuses: Array<'unknown' | 'limited' | 'direct' | 'blocked'> = ['unknown', 'limited', 'direct', 'blocked'];

    expect(categories.sort((left, right) => publicCategoryRank(left) - publicCategoryRank(right))).toEqual([
      'official',
      'media',
      'data',
      'source',
    ]);
    expect(accessStatuses.sort((left, right) => accessStatusRank(left) - accessStatusRank(right))).toEqual([
      'direct',
      'limited',
      'blocked',
      'unknown',
    ]);
  });

  it('summarizes source access counts with the strongest public warning', () => {
    expect(sourceAccessSummaryLabel({ directCount: 2, limitedCount: 0, blockedCount: 0, unknownCount: 0 })).toBe('直连');
    expect(sourceAccessSummaryLabel({ directCount: 2, limitedCount: 0, blockedCount: 0, unknownCount: 1 })).toBe('待验证');
    expect(sourceAccessSummaryLabel({ directCount: 2, limitedCount: 1, blockedCount: 0, unknownCount: 1 })).toBe('可能受限');
    expect(sourceAccessSummaryLabel({ directCount: 2, limitedCount: 1, blockedCount: 1, unknownCount: 1 })).toBe('部分受限');
  });

  it('normalizes optional source display metadata text', () => {
    expect(
      sourceDisplayMetadata({
        key: 'space-news',
        name: 'SpaceNews',
        type: 'rss',
        region: 'global',
        enabled: true,
        url: 'https://example.com/feed.xml',
        credibility: 4,
        purpose: 'News feed.',
        expected_content: 'Article metadata.',
        risk_notes: 'Public feed.',
        dedupe_strategy: 'url_title_source',
        access_note: '  Global   access note.  ',
        public_badge: '  Professional\t source  ',
      }),
    ).toMatchObject({
      accessNote: 'Global access note.',
      publicBadge: 'Professional source',
    });

    expect(
      sourceDisplayMetadata({
        key: 'blank-source',
        name: 'Blank Source',
        type: 'rss',
        region: 'global',
        enabled: true,
        url: 'https://example.com/feed.xml',
        credibility: 4,
        purpose: 'News feed.',
        expected_content: 'Article metadata.',
        risk_notes: 'Public feed.',
        dedupe_strategy: 'url_title_source',
        access_note: '   ',
        public_badge: '   ',
      }),
    ).toMatchObject({
      accessNote: null,
      publicBadge: null,
    });
  });
});
