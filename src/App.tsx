import {
  Activity,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  Flame,
  Gauge,
  Home,
  ListFilter,
  Newspaper,
  Rocket,
  Search,
  Tags,
} from 'lucide-react';
import { BrowserRouter, Link, NavLink, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import {
  companies,
  highlights,
  marketBriefs,
  slugify,
  sourceStatus,
  topicWatch,
  trendTags,
  upcomingLaunches,
  type FeedItem,
} from './data';

const navItems = [
  { label: '总览', icon: Home, to: '/', signal: '+24h' },
  { label: '情报流', icon: Newspaper, to: '/articles', signal: '聚类' },
  { label: '发射', icon: Rocket, to: '/launches', signal: 'T-窗口' },
  { label: '公司', icon: Building2, to: '/companies', signal: '实体' },
  { label: '资本', icon: CircleDollarSign, to: '/capital', signal: '风控' },
  { label: '专题', icon: Tags, to: '/topics', signal: '追踪' },
];

const feedTabs = [
  ['全部', '/articles'],
  ['国内', '/articles?region=cn'],
  ['国际', '/articles?region=global'],
  ['政策', '/articles?category=policy'],
  ['资本', '/capital'],
  ['发射', '/launches'],
] as const;

type ApiArticleSummary = {
  id: number;
  title: string;
  originalTitle: string | null;
  summary: string;
  url: string;
  sourceKey: string;
  sourceName: string;
  publishedAt: string;
  language: string;
  region: string;
  fetchStatus: string;
  storyKey?: string;
  relatedSourceCount?: number;
  relatedSources?: string[];
};

type ApiArticleDetail = ApiArticleSummary & {
  dedupeHash?: string;
  tags?: Array<{ slug: string; name: string } | string>;
  companies?: Array<{ slug: string; name: string } | string>;
  launches?: Array<{ id?: number; externalId?: string; missionName?: string; name?: string } | string>;
};

type ApiArticleListResult = {
  items: ApiArticleSummary[];
  page: number;
  limit: number;
  hasMore: boolean;
};

type ApiCompany = {
  id: number;
  slug: string;
  name: string;
  englishName: string | null;
  country: string;
  sector: string;
  website: string | null;
  profile: string;
  stockSymbol: string | null;
  logoUrl: string | null;
  articleCount: number;
};

type ApiCompanyDetail = ApiCompany & {
  articles: ApiArticleSummary[];
};

type ApiLaunch = {
  id: number;
  externalId: string;
  mission: string;
  rocket: string | null;
  provider: string | null;
  windowStart: string | null;
  site: string | null;
  status: string;
  rawUrl: string | null;
  isFallback?: boolean;
};

type ApiLaunchListResult = {
  items: ApiLaunch[];
  page: number;
  limit: number;
  hasMore: boolean;
};

type ApiMarketItem = {
  id: number;
  title: string;
  itemType: string;
  companyId: number | null;
  companyName: string | null;
  companySlug: string | null;
  sourceId: number | null;
  sourceName: string | null;
  url: string;
  summary: string;
  publishedAt: string;
};

type ApiMarketListResult = {
  items: ApiMarketItem[];
  page: number;
  limit: number;
  hasMore: boolean;
  notice: string;
};

type ApiTopic = {
  id: number;
  slug: string;
  name: string;
  category: string;
  articleCount: number;
  curationCount: number;
};

type ApiTopicCuration = {
  id: number;
  targetType: string;
  targetKey: string;
  itemUrl: string;
  weight: number;
  note: string | null;
  enabled: number;
  createdAt: string;
};

type ApiTopicDetail = ApiTopic & {
  articles: ApiArticleSummary[];
  curations: ApiTopicCuration[];
};

type DisplayArticle = FeedItem & {
  url?: string;
  storyKey?: string;
  relatedSourceCount?: number;
  relatedSources?: string[];
};

type ApiState<T> = {
  data: T | null;
  error: Error | null;
  status?: number;
  loaded: boolean;
};

function useApi<T>(path: string | null): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loaded: false });

  useEffect(() => {
    if (!path) {
      return;
    }

    const controller = new AbortController();

    fetch(path, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
        }

        return response.json() as Promise<T>;
      })
      .then((data) => setState({ data, error: null, loaded: true }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : undefined;
        setState({ data: null, error: error instanceof Error ? error : new Error(String(error)), status, loaded: true });
      });

    return () => controller.abort();
  }, [path]);

  return state;
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function displayRegion(region: string): FeedItem['region'] {
  return ['cn', 'china', 'domestic', '中国', '国内'].includes(region.toLowerCase()) ? '国内' : '国际';
}

function displayTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatLaunchWindow(value: string | null): string {
  if (!value) {
    return '窗口待定';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(date);
  const nowKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(now);
  const time = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  if (dateKey === nowKey) {
    return `今天 ${time}`;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function launchProximity(value: string | null, fallback?: string): string {
  if (!value) {
    return fallback ?? '待定';
  }

  const date = new Date(value);
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86_400_000);

  if (!Number.isFinite(diffDays)) {
    return fallback ?? '待定';
  }

  if (diffDays <= -1) {
    return '已完成';
  }

  if (diffDays === 0) {
    return '今天';
  }

  if (diffDays === 1) {
    return '明天';
  }

  return `约 T+${diffDays} 天`;
}

function displayLaunchStatus(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized.includes('success')) {
    return '发射成功';
  }

  if (normalized.includes('go')) {
    return '准备发射';
  }

  if (normalized.includes('confirm')) {
    return '待确认';
  }

  if (normalized.includes('review')) {
    return '任务评审';
  }

  if (normalized.includes('hold')) {
    return '等待窗口';
  }

  if (normalized.includes('fail')) {
    return '发射异常';
  }

  return status || '状态待定';
}

function friendlyError(error: Error | null, status?: number, context = '数据'): string | null {
  if (!error) {
    return null;
  }

  if (status === 404) {
    return `${context}已更新或不在当前缓存中。`;
  }

  return `${context}暂不可用，正在显示本地缓存。`;
}

function articleFromApi(row: ApiArticleSummary): DisplayArticle {
  const region = displayRegion(row.region);

  return {
    slug: String(row.id),
    title: row.title.trim(),
    source: row.sourceName,
    time: displayTime(row.publishedAt),
    category: region === '国内' ? '国内商业航天' : '国际商业航天',
    region,
    summary: row.summary,
    companies: [],
    tags: [row.sourceKey, row.language].filter(Boolean),
    url: row.url,
    storyKey: row.storyKey,
    relatedSourceCount: row.relatedSourceCount,
    relatedSources: row.relatedSources,
  };
}

function normalizeStoryText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 34);
}

function storyKeyForArticle(item: DisplayArticle): string {
  return item.storyKey ?? `${item.region}:${normalizeStoryText(item.title)}`;
}

function clusterArticles(items: DisplayArticle[]): DisplayArticle[] {
  const clustered = new Map<string, DisplayArticle>();

  for (const item of items) {
    const key = storyKeyForArticle(item);
    const current = clustered.get(key);

    if (!current) {
      clustered.set(key, {
        ...item,
        storyKey: key,
        relatedSourceCount: item.relatedSourceCount ?? 1,
        relatedSources: item.relatedSources?.length ? item.relatedSources : [item.source],
      });
      continue;
    }

    const relatedSources = Array.from(new Set([...(current.relatedSources ?? [current.source]), item.source]));
    clustered.set(key, {
      ...current,
      relatedSourceCount: Math.max(current.relatedSourceCount ?? 1, item.relatedSourceCount ?? relatedSources.length),
      relatedSources,
    });
  }

  return Array.from(clustered.values());
}

function articleListApiPath(searchParams: URLSearchParams, page: number, limit: number): string {
  const apiParams = new URLSearchParams();

  for (const key of ['region', 'source', 'tag', 'company', 'query']) {
    const value = searchParams.get(key);

    if (value?.trim()) {
      apiParams.set(key, value);
    }
  }

  apiParams.set('page', String(page));
  apiParams.set('limit', String(limit));
  return `/api/articles?${apiParams.toString()}`;
}

function pageHref(searchParams: URLSearchParams, page: number): string {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.set('page', String(page));
  return `/articles?${nextParams.toString()}`;
}

function launchHref(launch: ApiLaunch): string | null {
  if (launch.isFallback) {
    return null;
  }

  return `/launches/${launch.id || launch.externalId}`;
}

function tagName(value: NonNullable<ApiArticleDetail['tags']>[number]): string {
  return typeof value === 'string' ? value : value.name;
}

function tagSlug(value: NonNullable<ApiArticleDetail['tags']>[number]): string {
  return typeof value === 'string' ? slugify(value) : value.slug;
}

function companyName(value: NonNullable<ApiArticleDetail['companies']>[number]): string {
  return typeof value === 'string' ? value : value.name;
}

function companySlug(value: NonNullable<ApiArticleDetail['companies']>[number]): string {
  return typeof value === 'string' ? slugify(value) : value.slug;
}

function launchLabel(value: NonNullable<ApiArticleDetail['launches']>[number]): string {
  return typeof value === 'string' ? value : (value.missionName ?? value.name ?? value.externalId ?? String(value.id ?? 'launch'));
}

function launchSlug(value: NonNullable<ApiArticleDetail['launches']>[number]): string {
  return typeof value === 'string' ? slugify(value) : String(value.id ?? value.externalId ?? slugify(launchLabel(value)));
}

function SectionTitle({ icon: Icon, title, kicker }: { icon: typeof Newspaper; title: string; kicker?: string }) {
  return (
    <div className="section-title">
      <Icon size={17} aria-hidden="true" />
      <div>
        {kicker ? <span>{kicker}</span> : null}
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="商业航天情报站首页">
        <Rocket size={25} aria-hidden="true" />
        <span>Space Intel</span>
      </Link>
      <form className="command-search" action="/articles">
        <Search size={17} aria-hidden="true" />
        <input name="query" type="search" placeholder="搜索公司、发射、政策、资本线索" />
        <kbd>Ctrl K</kbd>
      </form>
      <Link to="/articles" className="command-button">
        <ListFilter size={17} aria-hidden="true" />
        指挥台
      </Link>
    </header>
  );
}

function MissionNav() {
  return (
    <aside className="mission-nav" aria-label="Mission Control 导航">
      <div className="nav-card">
        {navItems.map(({ label, icon: Icon, to, signal }) => (
          <NavLink key={label} to={to}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            <em>{signal}</em>
          </NavLink>
        ))}
      </div>
      <div className="signal-card">
        <span>来源透明</span>
        <strong>摘要、标签、实体与原文链接</strong>
        <p>保留来源入口，便于快速回看上下文。</p>
      </div>
      <div className="signal-card signal-card--metrics">
        <span>今日统计</span>
        <div>
          <strong>24</strong>
          <em>重点线索</em>
        </div>
        <div>
          <strong>6</strong>
          <em>追踪专题</em>
        </div>
      </div>
    </aside>
  );
}

function FeedTabs() {
  return (
    <nav className="filter-row" aria-label="频道">
      {feedTabs.map(([label, to]) => (
        <NavLink key={label} to={to}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function ArticleCard({ item, feature = false }: { item: DisplayArticle; feature?: boolean }) {
  const relatedCount = item.relatedSourceCount ?? 1;

  return (
    <article className={clsx('article-card', feature && 'article-card--feature')}>
      <div className="article-card__meta">
        <Link to={`/articles?region=${item.region === '国内' ? 'cn' : 'global'}`}>{item.region}</Link>
        <span>{item.source}</span>
        <time>{item.time}</time>
        {relatedCount > 1 ? <span className="cluster-badge">{relatedCount} 源覆盖</span> : null}
      </div>
      <h3>
        <Link to={`/articles/${item.slug}`}>{item.title}</Link>
      </h3>
      <p>{item.summary}</p>
      <div className="article-card__footer">
        <div className="tag-row">
          {item.companies.map((company) => (
            <Link className="entity-chip" to={`/companies/${slugify(company)}`} key={company}>
              {company}
            </Link>
          ))}
          {item.tags.slice(0, 3).map((tag) => (
            <Link to={`/topics/${slugify(tag)}`} key={tag}>
              {tag}
            </Link>
          ))}
        </div>
        <div className="article-actions">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" aria-label={`打开 ${item.title} 的原文`}>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ) : null}
          <Link to={`/articles/${item.slug}`}>详情</Link>
        </div>
      </div>
      {relatedCount > 1 && item.relatedSources?.length ? (
        <div className="cluster-sources">相关来源：{item.relatedSources.slice(0, 4).join(' / ')}</div>
      ) : null}
    </article>
  );
}

function RightHud({ launches }: { launches: ApiLaunch[] }) {
  return (
    <aside className="live-hud" aria-label="实时情报 HUD">
      <section className="panel launch-hud">
        <SectionTitle icon={CalendarDays} title="发射时间线" kicker="Live HUD" />
        <div className="launch-stack">
          {launches.slice(0, 4).map((launch) => {
            const href = launchHref(launch);
            const content = (
              <>
                <span>{launchProximity(launch.windowStart, 'T+窗口')}</span>
                <div>
                  <strong>{launch.mission}</strong>
                  <em>{launch.provider ?? '发射商待定'} / {displayLaunchStatus(launch.status)}</em>
                </div>
                <i />
              </>
            );

            return href ? (
              <Link to={href} className="launch-strip" key={launch.externalId || launch.id}>
                {content}
              </Link>
            ) : (
              <div className="launch-strip launch-strip--static" key={launch.externalId || launch.mission}>
                {content}
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={CircleDollarSign} title="资本快讯" kicker="Info Only" />
        <p className="notice-copy">资本市场内容仅作信息聚合，不构成投资建议。</p>
        <ul className="compact-list">
          {marketBriefs.slice(0, 4).map((brief) => (
            <li key={brief}>
              <Link to="/capital">{brief}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <SectionTitle icon={Gauge} title="来源状态" kicker="Telemetry" />
        <div className="source-status">
          {sourceStatus.map((source) => (
            <Link to="/articles" key={source.label}>
              <span>{source.label}</span>
              <strong>{source.value}</strong>
              <em>{source.state}</em>
            </Link>
          ))}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={Tags} title="热力词" kicker="48H" />
        <div className="tag-row">
          {trendTags.map((tag) => (
            <Link to={`/topics/${slugify(tag)}`} key={tag}>
              {tag}
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}

function HomePage() {
  const home = useApi<{ items: ApiArticleSummary[] }>('/api/home?limit=24');
  const launchState = useApi<ApiLaunchListResult>('/api/launches?limit=8');
  const fallbackFeed = highlights.map((item) => ({ ...item, relatedSourceCount: 1 }));
  const feedItems = clusterArticles(home.data?.items.map(articleFromApi) ?? fallbackFeed).slice(0, 12);
  const launches = launchState.data?.items ?? fallbackLaunches();
  const feature = feedItems[0];

  return (
    <div className="mission-layout">
      <MissionNav />
      <section className="timeline-column" aria-label="情报时间线">
        <div className="timeline-header">
          <SectionTitle icon={Flame} title="今日重点" kicker="Mission Feed" />
          <p>按事件聚类的商业航天新闻、发射、公司、资本和政策线索。</p>
        </div>
        <FeedTabs />
        {friendlyError(home.error, home.status, '实时情报') ? (
          <div className="inline-status">{friendlyError(home.error, home.status, '实时情报')}</div>
        ) : null}
        <div className="timeline-feed">
          {feature ? <ArticleCard item={feature} feature /> : null}
          {feedItems.slice(1).map((item) => (
            <ArticleCard key={item.slug} item={item} />
          ))}
        </div>
      </section>
      <RightHud launches={launches} />
    </div>
  );
}

function fallbackLaunches(): ApiLaunch[] {
  return upcomingLaunches.map((launch, index) => ({
    id: index + 1,
    externalId: `fallback-${launch.slug}`,
    mission: launch.mission,
    rocket: null,
    provider: launch.provider,
    windowStart: null,
    site: launch.site,
    status: launch.status,
    rawUrl: null,
    isFallback: true,
  }));
}

function SourcesOptions() {
  return (
    <>
      <option value="snapi">Spaceflight News API</option>
      <option value="google-news-cn-commercial-space">Google News RSS - 商业航天</option>
      <option value="space-com-rss">Space.com</option>
    </>
  );
}

function FilterDrawer({ searchParams, region, category }: { searchParams: URLSearchParams; region?: string | null; category?: string | null }) {
  return (
    <details className="filter-drawer">
      <summary>
        <ListFilter size={16} aria-hidden="true" />
        高级筛选
      </summary>
      <form className="filter-form" action="/articles">
        <label>
          关键词
          <input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="公司、发射、政策" />
        </label>
        <label>
          来源
          <select name="source" defaultValue={searchParams.get('source') ?? ''}>
            <option value="">全部来源</option>
            <SourcesOptions />
          </select>
        </label>
        <label>
          标签
          <input name="tag" defaultValue={searchParams.get('tag') ?? ''} placeholder="topic slug" />
        </label>
        <label>
          公司
          <input name="company" defaultValue={searchParams.get('company') ?? ''} placeholder="company slug" />
        </label>
        {region ? <input type="hidden" name="region" value={region} /> : null}
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <button type="submit">
          <Search size={16} aria-hidden="true" />
          应用
        </button>
        <Link to="/articles">重置</Link>
      </form>
    </details>
  );
}

function LoadingList() {
  return (
    <div className="page-list" aria-label="正在加载">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <span />
          <strong />
          <p />
        </div>
      ))}
    </div>
  );
}

function ArticlesPage() {
  const [searchParams] = useSearchParams();
  const region = searchParams.get('region');
  const category = searchParams.get('category');
  const query = searchParams.get('query')?.trim().toLowerCase();
  const tag = searchParams.get('tag');
  const company = searchParams.get('company');
  const currentPage = parsePositiveInteger(searchParams.get('page'), 1);
  const limit = parsePositiveInteger(searchParams.get('limit'), 12);
  const apiPath = useMemo(() => articleListApiPath(searchParams, currentPage, limit), [currentPage, limit, searchParams]);
  const api = useApi<ApiArticleListResult>(apiPath);
  const fallbackItems = useMemo(() => {
    return highlights.filter((item) => {
      const regionMatch = !region || (region === 'cn' ? item.region === '国内' : item.region === '国际');
      const categoryMatch = !category || item.category === category || item.category.includes(category);
      const tagMatch = !tag || item.tags.some((itemTag) => slugify(itemTag) === tag || itemTag === tag);
      const companyMatch = !company || item.companies.some((itemCompany) => slugify(itemCompany) === company);
      const queryMatch = !query || `${item.title} ${item.summary} ${item.companies.join(' ')}`.toLowerCase().includes(query);
      return regionMatch && categoryMatch && tagMatch && companyMatch && queryMatch;
    });
  }, [category, company, query, region, tag]);
  const fallbackStart = (currentPage - 1) * limit;
  const visibleItems = clusterArticles(api.data?.items.map(articleFromApi) ?? fallbackItems.slice(fallbackStart, fallbackStart + limit));
  const hasMore = api.data?.hasMore ?? fallbackItems.length > fallbackStart + limit;

  return (
    <PageShell title="情报流" subtitle="默认按事件聚类折叠重复报道，并用紧凑筛选控制信息密度。">
      <FeedTabs />
      <FilterDrawer searchParams={searchParams} region={region} category={category} />
      {friendlyError(api.error, api.status, '实时数据') ? <div className="inline-status">{friendlyError(api.error, api.status, '实时数据')}</div> : null}
      {!api.loaded && !api.data ? <LoadingList /> : null}
      <div className="page-list">
        {visibleItems.map((item) => (
          <ArticleCard key={item.slug} item={item} />
        ))}
        {!visibleItems.length ? <div className="empty-state">没有匹配的文章线索，请调整筛选条件。</div> : null}
      </div>
      <nav className="pagination-row" aria-label="文章分页">
        {currentPage > 1 ? <Link to={pageHref(searchParams, currentPage - 1)}>上一页</Link> : <span>上一页</span>}
        <strong>第 {currentPage} 页</strong>
        {hasMore ? <Link to={pageHref(searchParams, currentPage + 1)}>下一页</Link> : <span>下一页</span>}
      </nav>
    </PageShell>
  );
}

function ArticleDetailPage() {
  const { slug } = useParams();
  const fallbackArticle = highlights.find((item) => item.slug === slug) ?? highlights[0];
  const api = useApi<ApiArticleDetail>(slug ? `/api/articles/${encodeURIComponent(slug)}` : null);
  const apiArticle = api.data;
  const article: DisplayArticle = apiArticle ? articleFromApi(apiArticle) : fallbackArticle;
  const detailTags = apiArticle?.tags ?? article.tags;
  const detailCompanies = apiArticle?.companies ?? article.companies;
  const detailLaunches = apiArticle?.launches ?? (article.relatedLaunch ? [article.relatedLaunch] : []);
  const pageError = friendlyError(api.error, api.status, '文章详情');

  return (
    <PageShell title={article.title} subtitle={`${article.source} / ${article.time} / ${article.region}`}>
      {pageError ? <div className="inline-status">{pageError}</div> : null}
      <section className="detail-panel">
        <div className="metadata-grid">
          <span>{article.source}</span>
          <span>{article.time}</span>
          <span>{article.region}</span>
          <span>{article.relatedSourceCount && article.relatedSourceCount > 1 ? `${article.relatedSourceCount} 源覆盖` : '单来源线索'}</span>
        </div>
        {apiArticle?.originalTitle && apiArticle.originalTitle !== apiArticle.title ? (
          <div className="metadata-block">
            <span>原文标题</span>
            <strong>{apiArticle.originalTitle}</strong>
          </div>
        ) : null}
        <p>{article.summary}</p>
        <div className="insight-list">
          <strong>核心要点</strong>
          <span>只展示摘要、标签、实体和来源入口。</span>
          <span>实体、标签和发射关系用于快速判断线索价值。</span>
          <span>需要完整上下文时跳转原文来源。</span>
        </div>
        <div className="tag-row">
          {detailCompanies.map((company) => (
            <Link className="entity-chip" key={companySlug(company)} to={`/companies/${companySlug(company)}`}>
              {companyName(company)}
            </Link>
          ))}
          {detailTags.map((tag) => (
            <Link key={tagSlug(tag)} to={`/topics/${tagSlug(tag)}`}>
              {tagName(tag)}
            </Link>
          ))}
          {detailLaunches.map((launch) => (
            <Link key={launchSlug(launch)} to={`/launches/${launchSlug(launch)}`}>
              {launchLabel(launch)}
            </Link>
          ))}
        </div>
        {article.url ? (
          <a href={article.url} target="_blank" rel="noreferrer" className="source-link">
            <ExternalLink size={16} aria-hidden="true" />
            打开原文链接
          </a>
        ) : null}
      </section>
    </PageShell>
  );
}

function CompaniesPage() {
  const api = useApi<{ items: ApiCompany[] }>('/api/companies');
  const fallbackCompanies = companies.map((company, index) => ({
    id: index + 1,
    slug: slugify(company),
    name: company,
    englishName: null,
    country: '待补充',
    sector: '商业航天',
    website: null,
    profile: '公司档案待从 D1 读取。',
    stockSymbol: null,
    logoUrl: null,
    articleCount: 0,
  }));
  const visibleCompanies = api.data?.items ?? fallbackCompanies;

  return (
    <PageShell title="公司库" subtitle="公司档案、赛道、新闻时间线、相关发射和资本动态。">
      {friendlyError(api.error, api.status, '公司列表') ? <div className="inline-status">{friendlyError(api.error, api.status, '公司列表')}</div> : null}
      <div className="card-grid">
        {visibleCompanies.map((company) => (
          <Link to={`/companies/${company.slug}`} className="entity-card" key={company.slug}>
            <strong>{company.name}</strong>
            <span>{company.country} / {company.sector}</span>
            <em>{company.articleCount} 条相关新闻</em>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

function CompanyDetailPage() {
  const { slug } = useParams();
  const fallbackCompany = companies.find((item) => slugify(item) === slug) ?? companies[0];
  const api = useApi<ApiCompanyDetail>(slug ? `/api/companies/${encodeURIComponent(slug)}` : null);
  const related = api.data ? api.data.articles.map(articleFromApi) : highlights.filter((item) => item.companies.includes(fallbackCompany));

  return (
    <PageShell title={api.data?.name ?? fallbackCompany} subtitle={api.data ? `${api.data.country} / ${api.data.sector}` : '公司档案、相关新闻和实体上下文。'}>
      {friendlyError(api.error, api.status, '公司详情') ? <div className="inline-status">{friendlyError(api.error, api.status, '公司详情')}</div> : null}
      {api.data ? (
        <section className="detail-panel">
          <p>{api.data.profile || '暂无公开简介。'}</p>
          <div className="metadata-grid">
            <span>{api.data.country}</span>
            <span>{api.data.sector}</span>
            <span>{api.data.stockSymbol ?? '未披露/未上市'}</span>
            {api.data.website ? <a href={api.data.website} target="_blank" rel="noreferrer">官网</a> : <span>官网未披露</span>}
          </div>
        </section>
      ) : null}
      <div className="page-list">
        {(related.length ? related : highlights.slice(0, 2)).map((item) => (
          <ArticleCard key={item.slug} item={item} />
        ))}
      </div>
      <Link className="source-link" to="/companies">返回公司库</Link>
    </PageShell>
  );
}

function LaunchCard({ launch, index }: { launch: ApiLaunch; index: number }) {
  const href = launchHref(launch);
  const content = (
    <>
      <div className="launch-card__time">
        <span>{launchProximity(launch.windowStart, upcomingLaunches[index]?.window)}</span>
        <strong>{formatLaunchWindow(launch.windowStart)}</strong>
      </div>
      <div className="launch-card__body">
        <strong>{launch.mission}</strong>
        <span>{launch.provider ?? '发射商待定'} / {displayLaunchStatus(launch.status)}</span>
        <em>{launch.rocket ?? '火箭型号未披露'} / {launch.site ?? '场站待定'}</em>
      </div>
    </>
  );

  return href ? (
    <Link to={href} className="launch-card">
      {content}
    </Link>
  ) : (
    <div className="launch-card launch-card--static">
      {content}
    </div>
  );
}

function LaunchesPage() {
  const [searchParams] = useSearchParams();
  const launchApiPath = useMemo(() => {
    const params = new URLSearchParams();

    for (const key of ['status', 'provider', 'query']) {
      const value = searchParams.get(key);

      if (value?.trim()) {
        params.set(key, value);
      }
    }

    params.set('limit', '12');
    return `/api/launches?${params.toString()}`;
  }, [searchParams]);
  const api = useApi<ApiLaunchListResult>(launchApiPath);
  const visibleLaunches = api.data?.items ?? fallbackLaunches();

  return (
    <PageShell title="发射时间线" subtitle="等高时间轴和紧凑列表并行展示发射窗口、服务商和状态。">
      <details className="filter-drawer">
        <summary>
          <ListFilter size={16} aria-hidden="true" />
          发射筛选
        </summary>
        <form className="filter-form" action="/launches">
          <label>
            关键词
            <input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="任务、火箭、场站" />
          </label>
          <label>
            发射商
            <input name="provider" defaultValue={searchParams.get('provider') ?? ''} placeholder="Rocket Lab" />
          </label>
          <label>
            状态
            <input name="status" defaultValue={searchParams.get('status') ?? ''} placeholder="Go / Hold" />
          </label>
          <button type="submit">
            <Search size={16} aria-hidden="true" />
            应用
          </button>
        </form>
      </details>
      {friendlyError(api.error, api.status, '发射数据') ? <div className="inline-status">{friendlyError(api.error, api.status, '发射数据')}</div> : null}
      <div className="launch-timeline">
        {visibleLaunches.map((launch, index) => (
          <LaunchCard key={launch.externalId || launch.id} launch={launch} index={index} />
        ))}
      </div>
      {api.data?.hasMore ? <div className="inline-status">当前显示首批发射记录，可用关键词、发射商或状态继续筛选。</div> : null}
    </PageShell>
  );
}

function LaunchDetailPage() {
  const { slug } = useParams();
  const api = useApi<ApiLaunch>(slug ? `/api/launches/${encodeURIComponent(slug)}` : null);
  const fallbackLaunch = upcomingLaunches.find((item) => slug === item.slug);
  const title = api.data?.mission ?? fallbackLaunch?.mission ?? '发射记录';
  const subtitle = api.data
    ? `${api.data.provider ?? '发射商待定'} / ${api.data.site ?? '场站待定'} / ${displayLaunchStatus(api.data.status)}`
    : fallbackLaunch
      ? `${fallbackLaunch.provider} / ${fallbackLaunch.site} / ${displayLaunchStatus(fallbackLaunch.status)}`
      : '缓存记录可能已更新';
  const pageError = api.error
    ? api.status === 404 || fallbackLaunch
      ? '该发射记录已更新或不在当前缓存中。'
      : friendlyError(api.error, api.status, '该发射记录')
    : null;

  return (
    <PageShell title={title} subtitle={subtitle}>
      {pageError ? <div className="inline-status inline-status--danger">{pageError}</div> : null}
      <section className="detail-panel">
        <p>发射窗口：{api.data ? formatLaunchWindow(api.data.windowStart) : fallbackLaunch?.window ?? '记录不在当前缓存中'}</p>
        <p>火箭型号：{api.data?.rocket ?? '未披露'}</p>
        {api.data?.rawUrl ? (
          <a href={api.data.rawUrl} target="_blank" rel="noreferrer" className="source-link">
            <ExternalLink size={16} aria-hidden="true" />
            打开发射原始来源
          </a>
        ) : null}
        <Link to="/launches" className="source-link">返回发射列表</Link>
      </section>
    </PageShell>
  );
}

function CapitalPage() {
  const [searchParams] = useSearchParams();
  const marketApiPath = useMemo(() => {
    const params = new URLSearchParams();

    for (const key of ['type', 'company', 'source', 'query']) {
      const value = searchParams.get(key);

      if (value?.trim()) {
        params.set(key, value);
      }
    }

    params.set('limit', '12');
    return `/api/market?${params.toString()}`;
  }, [searchParams]);
  const api = useApi<ApiMarketListResult>(marketApiPath);
  const fallbackMarketItems = highlights
    .filter((item) => item.category === '资本市场')
    .map((item, index) => ({
      id: index + 1,
      title: item.title,
      itemType: 'news',
      companyId: null,
      companyName: item.companies[0] ?? null,
      companySlug: item.companies[0] ? slugify(item.companies[0]) : null,
      sourceId: null,
      sourceName: item.source,
      url: '#',
      summary: item.summary,
      publishedAt: new Date().toISOString(),
    }));
  const visibleMarketItems = api.data?.items ?? fallbackMarketItems;

  return (
    <PageShell title="资本情报" subtitle="融资、公告、财报和市场线索；固定保持非投资建议提示。">
      <div className="notice-banner">{api.data?.notice ?? '资本市场内容仅作信息聚合，不构成投资建议。'}</div>
      <details className="filter-drawer">
        <summary>
          <ListFilter size={16} aria-hidden="true" />
          资本筛选
        </summary>
        <form className="filter-form" action="/capital">
          <label>
            关键词
            <input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="融资、公告、订单" />
          </label>
          <label>
            类型
            <select name="type" defaultValue={searchParams.get('type') ?? ''}>
              <option value="">全部类型</option>
              <option value="financing">融资</option>
              <option value="filing">公告/财报</option>
              <option value="market">市场</option>
              <option value="ipo">IPO</option>
            </select>
          </label>
          <label>
            公司
            <input name="company" defaultValue={searchParams.get('company') ?? ''} placeholder="company slug" />
          </label>
          <label>
            来源
            <select name="source" defaultValue={searchParams.get('source') ?? ''}>
              <option value="">全部来源</option>
              <SourcesOptions />
            </select>
          </label>
          <button type="submit">
            <Search size={16} aria-hidden="true" />
            应用
          </button>
        </form>
      </details>
      {friendlyError(api.error, api.status, '资本线索') ? <div className="inline-status">{friendlyError(api.error, api.status, '资本线索')}</div> : null}
      <div className="market-list">
        {visibleMarketItems.map((item) => (
          <article className="market-item" key={item.id}>
            <div className="article-card__meta">
              <span>{item.itemType}</span>
              <span>{item.sourceName ?? '公开来源'}</span>
              <time>{displayTime(item.publishedAt)}</time>
            </div>
            <h3>{item.url && item.url !== '#' ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</h3>
            <p>{item.summary}</p>
            {item.companyName && item.companySlug ? <Link className="entity-chip" to={`/companies/${item.companySlug}`}>{item.companyName}</Link> : null}
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function TopicsPage() {
  const api = useApi<{ items: ApiTopic[] }>('/api/topics');
  const fallbackTopics = topicWatch.map((topic, index) => ({
    id: index + 1,
    slug: topic.slug,
    name: topic.title,
    category: topic.note,
    articleCount: Number.parseInt(topic.count, 10) || 0,
    curationCount: 0,
  }));
  const visibleTopics = api.data?.items ?? fallbackTopics;

  return (
    <PageShell title="专题追踪" subtitle="自动标签聚合与人工精选形成持续追踪的 context。">
      {friendlyError(api.error, api.status, '专题列表') ? <div className="inline-status">{friendlyError(api.error, api.status, '专题列表')}</div> : null}
      <div className="card-grid">
        {visibleTopics.map((topic) => (
          <Link to={`/topics/${topic.slug}`} className="entity-card" key={topic.slug}>
            <strong>{topic.name}</strong>
            <span>{topic.category}</span>
            <em>{topic.articleCount} 篇自动聚合 / {topic.curationCount} 条人工精选</em>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

function TopicDetailPage() {
  const { slug } = useParams();
  const fallbackTopic = topicWatch.find((item) => item.slug === slug) ?? topicWatch[0];
  const api = useApi<ApiTopicDetail>(slug ? `/api/topics/${encodeURIComponent(slug)}` : null);
  const related = api.data
    ? api.data.articles.map(articleFromApi)
    : highlights.filter((item) => item.tags.some((itemTag) => slugify(itemTag) === slug) || item.tags.includes(fallbackTopic.title));

  return (
    <PageShell
      title={api.data?.name ?? fallbackTopic.title}
      subtitle={api.data ? `${api.data.category} / ${api.data.articleCount} 篇自动聚合` : `${fallbackTopic.count} / ${fallbackTopic.note}`}
    >
      {friendlyError(api.error, api.status, '专题详情') ? <div className="inline-status">{friendlyError(api.error, api.status, '专题详情')}</div> : null}
      {api.data?.curations.length ? (
        <section className="detail-panel">
          <SectionTitle icon={Activity} title="人工精选" />
          <div className="curation-list">
            {api.data.curations.map((curation) => (
              <a href={curation.itemUrl} target="_blank" rel="noreferrer" key={curation.id}>
                <strong>{curation.note ?? curation.itemUrl}</strong>
                <span>权重 {curation.weight} / {displayTime(curation.createdAt)}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
      <div className="page-list">
        {(related.length ? related : highlights.slice(0, 3)).map((item) => (
          <ArticleCard key={item.slug} item={item} />
        ))}
      </div>
      <Link className="source-link" to="/topics">返回专题列表</Link>
    </PageShell>
  );
}

function PageShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="page-shell">
      <header className="page-header">
        <span>Mission Control</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      {children}
    </div>
  );
}

function BottomTabs() {
  return (
    <nav className="bottom-tabs" aria-label="移动端导航">
      {navItems.slice(0, 5).map(({ label, icon: Icon, to }) => (
        <NavLink key={label} to={to}>
          <Icon size={17} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppRoutes() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/articles/:slug" element={<ArticleDetailPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:slug" element={<CompanyDetailPage />} />
        <Route path="/launches" element={<LaunchesPage />} />
        <Route path="/launches/:slug" element={<LaunchDetailPage />} />
        <Route path="/capital" element={<CapitalPage />} />
        <Route path="/topics" element={<TopicsPage />} />
        <Route path="/topics/:slug" element={<TopicDetailPage />} />
      </Routes>
      <BottomTabs />
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
