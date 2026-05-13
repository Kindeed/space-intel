import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Flame,
  Home,
  ListFilter,
  Newspaper,
  RadioTower,
  Rocket,
  Search,
  ShieldCheck,
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
  { label: '最新', to: '/articles' },
  { label: '国内', to: '/articles?region=cn' },
  { label: '国际', to: '/articles?region=global' },
  { label: '发射', to: '/launches' },
  { label: '公司', to: '/companies' },
  { label: '资本', to: '/capital' },
  { label: '政策', to: '/articles?category=policy' },
  { label: '专题', to: '/topics' },
  { label: '搜索', to: '/articles?query=' },
];

const timelineTabs = [
  { label: '推荐', to: '/' },
  { label: '最新', to: '/articles' },
  { label: '国内', to: '/articles?region=cn' },
  { label: '国际', to: '/articles?region=global' },
  { label: '资本', to: '/capital' },
  { label: '政策', to: '/articles?category=policy' },
];

const leftNavItems = [
  { label: '首页', icon: Home, to: '/' },
  { label: '最新', icon: Newspaper, to: '/articles' },
  { label: '发射', icon: Rocket, to: '/launches' },
  { label: '公司', icon: Building2, to: '/companies' },
  { label: '资本', icon: CircleDollarSign, to: '/capital' },
  { label: '政策', icon: ShieldCheck, to: '/articles?category=policy' },
];

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
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function articleFromApi(row: ApiArticleSummary): FeedItem {
  const region = displayRegion(row.region);

  return {
    slug: String(row.id),
    title: row.title,
    source: row.sourceName,
    time: displayTime(row.publishedAt),
    category: region === '国内' ? '国内商业航天' : '国际商业航天',
    region,
    summary: row.summary,
    companies: [],
    tags: [row.sourceKey, row.language].filter(Boolean),
  };
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

function displayLaunchWindow(value: string | null): string {
  return value ? displayTime(value) : '窗口待定';
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

function SectionTitle({ icon: Icon, title }: { icon: typeof Newspaper; title: string }) {
  return (
    <div className="section-title">
      <Icon size={18} aria-hidden="true" />
      <h2>{title}</h2>
    </div>
  );
}

function ArticleCard({ item, compact = false, feature = false }: { item: FeedItem; compact?: boolean; feature?: boolean }) {
  return (
    <article className={clsx('article-card', compact && 'article-card--compact', feature && 'article-card--feature')}>
      <div className="article-card__meta">
        <Link to={`/articles?category=${encodeURIComponent(item.category)}`}>{item.category}</Link>
        <span>{item.source}</span>
        <time>{item.time}</time>
      </div>
      <h3>
        <Link to={`/articles/${item.slug}`}>{item.title}</Link>
      </h3>
      <p>{item.summary}</p>
      <div className="article-card__footer">
        <div className="tag-row">
          <Link
            to={`/articles?region=${item.region === '国内' ? 'cn' : 'global'}`}
            className={clsx('region-tag', item.region === '国内' ? 'region-tag--cn' : 'region-tag--global')}
          >
            {item.region}
          </Link>
          {item.companies.map((company) => (
            <Link key={company} to={`/companies/${slugify(company)}`}>
              {company}
            </Link>
          ))}
        </div>
        <Link className="article-card__open" to={`/articles/${item.slug}`} aria-label={`打开 ${item.title} 的详情页`}>
          <ExternalLink size={16} />
        </Link>
      </div>
    </article>
  );
}

function SiteHeader() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="商业航天情报站首页">
        <Rocket size={28} aria-hidden="true" />
        <span>商业航天情报站</span>
      </Link>
      <nav aria-label="主导航">
        {navItems.map((item) => (
          <NavLink key={item.label} to={item.to}>
            {item.label === '搜索' ? <Search size={15} aria-hidden="true" /> : null}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function LeftRail() {
  return (
    <aside className="left-rail" aria-label="频道导航">
      <div className="rail-card">
        {leftNavItems.map(({ label, icon: Icon, to }) => (
          <NavLink key={label} to={to}>
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
      <div className="rail-note">
        <span>Cloudflare-first v1</span>
        <strong>摘要、标签、公司和原文链接优先</strong>
      </div>
    </aside>
  );
}

function RightRail() {
  return (
    <aside className="right-rail" aria-label="侧边情报栏">
      <form className="panel search-panel" action="/articles">
        <label htmlFor="feed-search">搜索情报</label>
        <div>
          <Search size={17} aria-hidden="true" />
          <input id="feed-search" name="query" type="search" placeholder="公司、发射、政策、关键词" />
        </div>
      </form>

      <section className="panel">
        <SectionTitle icon={CalendarDays} title="即将发射" />
        <div className="launch-list">
          {upcomingLaunches.map((launch) => (
            <Link key={launch.mission} to={`/launches/${launch.slug}`} className="launch-item">
              <span className="launch-item__window">{launch.window}</span>
              <div>
                <strong>{launch.mission}</strong>
                <span>{launch.provider} · {launch.site}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel notice-panel">
        <SectionTitle icon={CircleDollarSign} title="资本/融资快讯" />
        <p>资本市场内容仅作信息聚合，不构成投资建议。</p>
        <ul>
          {marketBriefs.map((brief) => (
            <li key={brief}>
              <Link to="/capital">{brief}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel status-panel">
        <SectionTitle icon={Clock3} title="来源状态" />
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

      <section className="panel trends-panel">
        <SectionTitle icon={Tags} title="关键词趋势" />
        <div className="tag-row tag-row--large">
          {trendTags.map((tag) => (
            <Link key={tag} to={`/topics/${slugify(tag)}`}>
              {tag}
            </Link>
          ))}
        </div>
      </section>

      <TopicWatchPanel />
    </aside>
  );
}

function TopicWatchPanel({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? '' : 'panel topic-watch-panel'}>
      {!compact ? <SectionTitle icon={Activity} title="专题追踪" /> : null}
      <div className={clsx('topic-watch-list', compact && 'topic-watch-list--compact')}>
        {topicWatch.map((topic) => (
          <Link to={`/topics/${topic.slug}`} key={topic.title}>
            <strong>{topic.title}</strong>
            <span>{topic.count}</span>
            <em>{topic.note}</em>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <>
      <div className="social-layout">
        <LeftRail />
        <section className="timeline-column" aria-label="情报时间线">
          <div className="timeline-header">
            <div>
              <SectionTitle icon={Flame} title="今日重点" />
              <p>商业航天新闻、发射、公司、资本与政策的聚合时间线。</p>
            </div>
            <Link to="/articles" aria-label="筛选信息流" className="icon-button">
              <ListFilter size={18} />
            </Link>
          </div>

          <div className="timeline-tabs" aria-label="时间线筛选">
            {timelineTabs.map((tab) => (
              <NavLink key={tab.label} to={tab.to} className={tab.label === '推荐' ? 'is-active' : undefined}>
                {tab.label}
              </NavLink>
            ))}
          </div>

          <div className="timeline-feed">
            {highlights.map((item, index) => (
              <ArticleCard key={item.title} item={item} feature={index === 0} />
            ))}
          </div>
        </section>
        <RightRail />
      </div>
      <ChannelGrid />
    </>
  );
}

function ChannelGrid() {
  return (
    <section className="channel-grid" aria-label="分类信息流">
      <div className="channel-panel channel-panel--wide">
        <SectionTitle icon={RadioTower} title="国内商业航天" />
        {highlights.filter((item) => item.region === '国内').map((item) => (
          <ArticleCard key={item.title} item={item} compact />
        ))}
      </div>
      <div className="channel-panel">
        <SectionTitle icon={Activity} title="国际商业航天" />
        {highlights.filter((item) => item.region === '国际').map((item) => (
          <ArticleCard key={item.title} item={item} compact />
        ))}
      </div>
      <div className="channel-panel">
        <SectionTitle icon={ShieldCheck} title="政策监管" />
        <ArticleCard item={highlights[2]} compact />
      </div>
      <div className="channel-panel">
        <SectionTitle icon={BarChart3} title="资本市场" />
        <ArticleCard item={highlights[3]} compact />
      </div>
      <div className="channel-panel company-panel">
        <SectionTitle icon={Building2} title="公司热度" />
        <div className="rank-list">
          {companies.map((company, index) => (
            <Link to={`/companies/${slugify(company)}`} key={company}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{company}</strong>
            </Link>
          ))}
        </div>
      </div>
      <div className="channel-panel">
        <SectionTitle icon={Tags} title="专题追踪" />
        <TopicWatchPanel compact />
      </div>
    </section>
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
  const limit = parsePositiveInteger(searchParams.get('limit'), 6);
  const apiPath = useMemo(() => articleListApiPath(searchParams, currentPage, limit), [currentPage, limit, searchParams]);
  const [apiState, setApiState] = useState<{
    path: string;
    items: FeedItem[] | null;
    hasMore: boolean;
    error: string | null;
  }>({
    path: '',
    items: null,
    hasMore: false,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch(apiPath, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<ApiArticleListResult>;
      })
      .then((result) => {
        setApiState({
          path: apiPath,
          items: result.items.map(articleFromApi),
          hasMore: result.hasMore,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiState({
          path: apiPath,
          items: null,
          hasMore: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => controller.abort();
  }, [apiPath]);

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
  const fallbackPageItems = fallbackItems.slice(fallbackStart, fallbackStart + limit);
  const fallbackHasMore = fallbackItems.length > fallbackStart + limit;
  const visibleItems = apiState.items ?? fallbackPageItems;
  const hasMore = apiState.items ? apiState.hasMore : fallbackHasMore;
  const isLoading = apiState.path !== apiPath && !apiState.error;

  return (
    <PageShell title="新闻列表" subtitle="支持地区、来源、标签、公司和关键词过滤；优先读取 D1 API，本地开发无 API 时使用示例数据兜底。">
      <form className="filter-form" action="/articles">
        <label>
          关键词
          <input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="公司、发射、政策、关键词" />
        </label>
        <label>
          来源
          <input name="source" defaultValue={searchParams.get('source') ?? ''} placeholder="例如 snapi" />
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
          筛选
        </button>
      </form>
      <div className="filter-row">
        {[
          ['全部', '/articles'],
          ['国内', '/articles?region=cn'],
          ['国际', '/articles?region=global'],
          ['政策', '/articles?category=政策监管'],
          ['资本', '/capital'],
        ].map(([label, to]) => (
          <Link key={label} to={to}>
            {label}
          </Link>
        ))}
      </div>
      {apiState.error ? <div className="inline-status">API 暂不可用，当前展示本地示例数据。错误：{apiState.error}</div> : null}
      {isLoading ? <div className="inline-status">正在读取文章 API...</div> : null}
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
        <Link to="/articles">重置筛选</Link>
      </nav>
      <div className="compliance-note">
        列表只展示标题、摘要、来源、发布时间、标签和原文入口，不保存或展示新闻全文。
      </div>
    </PageShell>
  );
}

function ArticleDetailPage() {
  const { slug } = useParams();
  const fallbackArticle = highlights.find((item) => item.slug === slug) ?? highlights[0];
  const [apiState, setApiState] = useState<{
    slug: string;
    article: ApiArticleDetail | null;
    error: string | null;
  }>({
    slug: '',
    article: null,
    error: null,
  });
  const apiSlug = slug ?? '';

  useEffect(() => {
    if (!apiSlug) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/articles/${encodeURIComponent(apiSlug)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<ApiArticleDetail>;
      })
      .then((article) => {
        setApiState({ slug: apiSlug, article, error: null });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiState({
          slug: apiSlug,
          article: null,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => controller.abort();
  }, [apiSlug]);

  const apiArticle = apiState.slug === apiSlug ? apiState.article : null;
  const article = apiArticle ? articleFromApi(apiArticle) : fallbackArticle;
  const detailTags = apiArticle?.tags ?? article.tags;
  const detailCompanies = apiArticle?.companies ?? article.companies;
  const detailLaunches = apiArticle?.launches ?? (article.relatedLaunch ? [article.relatedLaunch] : []);
  const originalTitle = apiArticle?.originalTitle;
  const originalUrl = apiArticle?.url;
  const isLoading = apiState.slug !== apiSlug && !apiState.error;

  return (
    <PageShell title={article.title} subtitle={`${article.source} · ${article.time} · ${article.region}`}>
      <article className="detail-panel">
        {apiState.error ? <div className="inline-status">API 暂不可用，当前展示本地示例详情。错误：{apiState.error}</div> : null}
        {isLoading ? <div className="inline-status">正在读取文章详情 API...</div> : null}
        {originalTitle ? (
          <div className="metadata-block">
            <span>原文标题</span>
            <strong>{originalTitle}</strong>
          </div>
        ) : null}
        <p>{article.summary}</p>
        {originalUrl ? (
          <a href={originalUrl} target="_blank" rel="noreferrer" className="source-link">
            <ExternalLink size={16} aria-hidden="true" />
            打开原文链接
          </a>
        ) : null}
        <div className="tag-row tag-row--large">
          {detailTags.map((tag) => (
            <Link key={tagSlug(tag)} to={`/topics/${tagSlug(tag)}`}>
              {tagName(tag)}
            </Link>
          ))}
        </div>
        <h2>相关公司</h2>
        <div className="link-grid">
          {detailCompanies.length ? detailCompanies.map((company) => (
            <Link key={companySlug(company)} to={`/companies/${companySlug(company)}`}>
              {companyName(company)}
            </Link>
          )) : <span>暂无公司关联</span>}
        </div>
        {detailLaunches.length ? (
          <>
            <h2>相关发射</h2>
            <div className="link-grid">
              {detailLaunches.map((launch) => (
                <Link key={launchSlug(launch)} to={`/launches/${launchSlug(launch)}`}>
                  {launchLabel(launch)}
                </Link>
              ))}
            </div>
          </>
        ) : null}
        <p className="compliance-note">这里只展示摘要、标签、关联实体和原文入口占位，不保存或转载新闻全文。</p>
      </article>
    </PageShell>
  );
}

function CompaniesPage() {
  const [apiState, setApiState] = useState<{
    items: ApiCompany[] | null;
    error: string | null;
    loaded: boolean;
  }>({
    items: null,
    error: null,
    loaded: false,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/companies', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<{ items: ApiCompany[] }>;
      })
      .then((result) => {
        setApiState({ items: result.items, error: null, loaded: true });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiState({ items: null, error: error instanceof Error ? error.message : String(error), loaded: true });
      });

    return () => controller.abort();
  }, []);

  const fallbackCompanies = companies.map((company) => ({
    slug: slugify(company),
    name: company,
    sector: '商业航天',
    country: '待完善',
    articleCount: highlights.filter((item) => item.companies.includes(company)).length || 1,
  }));
  const visibleCompanies = apiState.items ?? fallbackCompanies;

  return (
    <PageShell title="公司库" subtitle="公司简介、赛道、新闻时间线和资本动态入口。">
      {apiState.error ? <div className="inline-status">API 暂不可用，当前展示本地示例公司库。错误：{apiState.error}</div> : null}
      {!apiState.loaded ? <div className="inline-status">正在读取公司 API...</div> : null}
      <div className="card-grid">
        {visibleCompanies.map((company) => (
          <Link to={`/companies/${company.slug}`} className="entity-card" key={company.slug}>
            <strong>{company.name}</strong>
            <span>{company.country} · {company.sector}</span>
            <em>{company.articleCount} 条相关线索</em>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

function CompanyDetailPage() {
  const { slug } = useParams();
  const fallbackCompany = companies.find((item) => slugify(item) === slug) ?? companies[0];
  const [apiState, setApiState] = useState<{
    slug: string;
    company: ApiCompanyDetail | null;
    error: string | null;
  }>({
    slug: '',
    company: null,
    error: null,
  });
  const apiSlug = slug ?? '';

  useEffect(() => {
    if (!apiSlug) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/companies/${encodeURIComponent(apiSlug)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<ApiCompanyDetail>;
      })
      .then((company) => {
        setApiState({ slug: apiSlug, company, error: null });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiState({
          slug: apiSlug,
          company: null,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => controller.abort();
  }, [apiSlug]);

  const apiCompany = apiState.slug === apiSlug ? apiState.company : null;
  const related = apiCompany ? apiCompany.articles.map(articleFromApi) : highlights.filter((item) => item.companies.includes(fallbackCompany));
  const companyTitle = apiCompany?.name ?? fallbackCompany;
  const subtitle = apiCompany
    ? `${apiCompany.country} · ${apiCompany.sector}${apiCompany.stockSymbol ? ` · ${apiCompany.stockSymbol}` : ''}`
    : '公司档案、新闻时间线、相关发射和资本动态。';

  return (
    <PageShell title={companyTitle} subtitle={subtitle}>
      {apiState.error ? <div className="inline-status">API 暂不可用，当前展示本地示例公司详情。错误：{apiState.error}</div> : null}
      {apiState.slug !== apiSlug && !apiState.error ? <div className="inline-status">正在读取公司详情 API...</div> : null}
      {apiCompany ? (
        <section className="detail-panel">
          <p>{apiCompany.profile || '公司简介待补充。'}</p>
          <div className="entity-meta-grid">
            <span>国家/地区：{apiCompany.country}</span>
            <span>赛道：{apiCompany.sector}</span>
            <span>股票代码：{apiCompany.stockSymbol ?? '未披露/未上市'}</span>
            {apiCompany.website ? <a href={apiCompany.website} target="_blank" rel="noreferrer">官网</a> : <span>官网：待补充</span>}
          </div>
        </section>
      ) : null}
      <div className="page-list">
        {(related.length ? related : highlights.slice(0, 2)).map((item) => (
          <ArticleCard key={item.slug} item={item} />
        ))}
      </div>
    </PageShell>
  );
}

function LaunchesPage() {
  const [searchParams] = useSearchParams();
  const [apiState, setApiState] = useState<{
    items: ApiLaunch[] | null;
    error: string | null;
    loaded: boolean;
    hasMore: boolean;
  }>({
    items: null,
    error: null,
    loaded: false,
    hasMore: false,
  });
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

  useEffect(() => {
    const controller = new AbortController();

    fetch(launchApiPath, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<ApiLaunchListResult>;
      })
      .then((result) => {
        setApiState({ items: result.items, error: null, loaded: true, hasMore: result.hasMore });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiState({
          items: null,
          error: error instanceof Error ? error.message : String(error),
          loaded: true,
          hasMore: false,
        });
      });

    return () => controller.abort();
  }, [launchApiPath]);

  const fallbackLaunches = upcomingLaunches.map((launch, index) => ({
    id: index + 1,
    externalId: launch.slug,
    mission: launch.mission,
    rocket: null,
    provider: launch.provider,
    windowStart: null,
    site: launch.site,
    status: launch.status,
    rawUrl: null,
  }));
  const visibleLaunches = apiState.items ?? fallbackLaunches;

  return (
    <PageShell title="发射日历" subtitle="日历视图和列表视图入口，展示任务、火箭、发射商、时间、地点和状态。">
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
          <input name="status" defaultValue={searchParams.get('status') ?? ''} placeholder="待发射/Go" />
        </label>
        <button type="submit">
          <Search size={16} aria-hidden="true" />
          筛选
        </button>
      </form>
      {apiState.error ? <div className="inline-status">API 暂不可用，当前展示本地示例发射数据。错误：{apiState.error}</div> : null}
      {!apiState.loaded ? <div className="inline-status">正在读取发射 API...</div> : null}
      <div className="card-grid">
        {visibleLaunches.map((launch) => (
          <Link to={`/launches/${launch.id || launch.externalId}`} className="entity-card" key={launch.externalId || launch.id}>
            <strong>{launch.mission}</strong>
            <span>{displayLaunchWindow(launch.windowStart)} · {launch.provider ?? '发射商待定'} · {launch.status}</span>
            <em>{launch.rocket ?? '火箭型号待定'} · {launch.site ?? '场站待定'}</em>
          </Link>
        ))}
      </div>
      {apiState.hasMore ? <div className="inline-status">当前显示首批发射记录，可用关键词、发射商或状态继续筛选。</div> : null}
    </PageShell>
  );
}

function LaunchDetailPage() {
  const { slug } = useParams();
  const fallbackLaunch = upcomingLaunches.find((item) => item.slug === slug) ?? upcomingLaunches[0];
  const [apiState, setApiState] = useState<{
    slug: string;
    launch: ApiLaunch | null;
    error: string | null;
  }>({
    slug: '',
    launch: null,
    error: null,
  });
  const apiSlug = slug ?? '';

  useEffect(() => {
    if (!apiSlug) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/launches/${encodeURIComponent(apiSlug)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<ApiLaunch>;
      })
      .then((launch) => {
        setApiState({ slug: apiSlug, launch, error: null });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiState({
          slug: apiSlug,
          launch: null,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => controller.abort();
  }, [apiSlug]);

  const apiLaunch = apiState.slug === apiSlug ? apiState.launch : null;
  const title = apiLaunch?.mission ?? fallbackLaunch.mission;
  const provider = apiLaunch?.provider ?? fallbackLaunch.provider;
  const site = apiLaunch?.site ?? fallbackLaunch.site;
  const status = apiLaunch?.status ?? fallbackLaunch.status;
  const windowText = apiLaunch ? displayLaunchWindow(apiLaunch.windowStart) : fallbackLaunch.window;

  return (
    <PageShell title={title} subtitle={`${provider} · ${site} · ${status}`}>
      <div className="detail-panel">
        {apiState.error ? <div className="inline-status">API 暂不可用，当前展示本地示例发射详情。错误：{apiState.error}</div> : null}
        {apiState.slug !== apiSlug && !apiState.error ? <div className="inline-status">正在读取发射详情 API...</div> : null}
        <p>发射窗口：{windowText}</p>
        <p>火箭型号：{apiLaunch?.rocket ?? '待补充'}</p>
        {apiLaunch?.rawUrl ? (
          <a href={apiLaunch.rawUrl} target="_blank" rel="noreferrer" className="source-link">
            <ExternalLink size={16} aria-hidden="true" />
            打开发射原始来源
          </a>
        ) : null}
        <p>相关报道会通过 Launch Library 2 缓存和新闻采集结果继续自动关联。</p>
        <Link to="/launches">返回发射列表</Link>
      </div>
    </PageShell>
  );
}

function CapitalPage() {
  const [searchParams] = useSearchParams();
  const [apiState, setApiState] = useState<{
    items: ApiMarketItem[] | null;
    notice: string;
    error: string | null;
    loaded: boolean;
  }>({
    items: null,
    notice: '资本市场内容仅作信息聚合，不构成投资建议。',
    error: null,
    loaded: false,
  });
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

  useEffect(() => {
    const controller = new AbortController();

    fetch(marketApiPath, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<ApiMarketListResult>;
      })
      .then((result) => {
        setApiState({ items: result.items, notice: result.notice, error: null, loaded: true });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiState({
          items: null,
          notice: '资本市场内容仅作信息聚合，不构成投资建议。',
          error: error instanceof Error ? error.message : String(error),
          loaded: true,
        });
      });

    return () => controller.abort();
  }, [marketApiPath]);

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
  const visibleMarketItems = apiState.items ?? fallbackMarketItems;

  return (
    <PageShell title="资本市场" subtitle="融资动态、上市公司动态、研报/公告链接和产业链公司。">
      <div className="notice-banner">{apiState.notice}</div>
      <form className="filter-form" action="/capital">
        <label>
          关键词
          <input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="融资、公告、订单" />
        </label>
        <label>
          类型
          <input name="type" defaultValue={searchParams.get('type') ?? ''} placeholder="financing/filing/report" />
        </label>
        <label>
          公司
          <input name="company" defaultValue={searchParams.get('company') ?? ''} placeholder="company slug" />
        </label>
        <label>
          来源
          <input name="source" defaultValue={searchParams.get('source') ?? ''} placeholder="source key" />
        </label>
        <button type="submit">
          <Search size={16} aria-hidden="true" />
          筛选
        </button>
      </form>
      {apiState.error ? <div className="inline-status">API 暂不可用，当前展示本地示例资本线索。错误：{apiState.error}</div> : null}
      {!apiState.loaded ? <div className="inline-status">正在读取资本市场 API...</div> : null}
      <div className="market-list">
        {visibleMarketItems.map((item) => (
          <article className="market-item" key={item.id}>
            <div className="article-card__meta">
              <span>{item.itemType}</span>
              <span>{item.sourceName ?? '来源待补充'}</span>
              <time>{displayTime(item.publishedAt)}</time>
            </div>
            <h3>{item.url && item.url !== '#' ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</h3>
            <p>{item.summary}</p>
            {item.companyName && item.companySlug ? <Link to={`/companies/${item.companySlug}`}>{item.companyName}</Link> : null}
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function TopicsPage() {
  const [apiState, setApiState] = useState<{
    items: ApiTopic[] | null;
    error: string | null;
    loaded: boolean;
  }>({
    items: null,
    error: null,
    loaded: false,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/topics', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<{ items: ApiTopic[] }>;
      })
      .then((result) => {
        setApiState({ items: result.items, error: null, loaded: true });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiState({ items: null, error: error instanceof Error ? error.message : String(error), loaded: true });
      });

    return () => controller.abort();
  }, []);

  const fallbackTopics = topicWatch.map((topic, index) => ({
    id: index + 1,
    slug: topic.slug,
    name: topic.title,
    category: topic.note,
    articleCount: Number.parseInt(topic.count, 10) || 0,
    curationCount: 0,
  }));
  const visibleTopics = apiState.items ?? fallbackTopics;

  return (
    <PageShell title="专题" subtitle="自动标签聚合与人工精选入口。">
      {apiState.error ? <div className="inline-status">API 暂不可用，当前展示本地示例专题。错误：{apiState.error}</div> : null}
      {!apiState.loaded ? <div className="inline-status">正在读取专题 API...</div> : null}
      <div className="card-grid">
        {visibleTopics.map((topic) => (
          <Link to={`/topics/${topic.slug}`} className="entity-card" key={topic.slug}>
            <strong>{topic.name}</strong>
            <span>{topic.category}</span>
            <em>{topic.articleCount} 篇自动聚合 · {topic.curationCount} 条人工精选</em>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

function TopicDetailPage() {
  const { slug } = useParams();
  const fallbackTopic = topicWatch.find((item) => item.slug === slug) ?? topicWatch[0];
  const [apiState, setApiState] = useState<{
    slug: string;
    topic: ApiTopicDetail | null;
    error: string | null;
  }>({
    slug: '',
    topic: null,
    error: null,
  });
  const apiSlug = slug ?? '';

  useEffect(() => {
    if (!apiSlug) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/topics/${encodeURIComponent(apiSlug)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<ApiTopicDetail>;
      })
      .then((topic) => {
        setApiState({ slug: apiSlug, topic, error: null });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiState({
          slug: apiSlug,
          topic: null,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => controller.abort();
  }, [apiSlug]);

  const apiTopic = apiState.slug === apiSlug ? apiState.topic : null;
  const related = apiTopic
    ? apiTopic.articles.map(articleFromApi)
    : highlights.filter((item) => item.tags.some((tag) => slugify(tag) === slug) || item.tags.includes(fallbackTopic.title));
  const title = apiTopic?.name ?? fallbackTopic.title;
  const subtitle = apiTopic ? `${apiTopic.category} · ${apiTopic.articleCount} 篇自动聚合 · ${apiTopic.curationCount} 条人工精选` : `${fallbackTopic.count} · ${fallbackTopic.note}`;

  return (
    <PageShell title={title} subtitle={subtitle}>
      {apiState.error ? <div className="inline-status">API 暂不可用，当前展示本地示例专题详情。错误：{apiState.error}</div> : null}
      {apiState.slug !== apiSlug && !apiState.error ? <div className="inline-status">正在读取专题详情 API...</div> : null}
      {apiTopic?.curations.length ? (
        <section className="detail-panel">
          <h2>人工精选</h2>
          <div className="curation-list">
            {apiTopic.curations.map((curation) => (
              <a href={curation.itemUrl} target="_blank" rel="noreferrer" key={curation.id}>
                <strong>{curation.note ?? curation.itemUrl}</strong>
                <span>权重 {curation.weight} · {displayTime(curation.createdAt)}</span>
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
    </PageShell>
  );
}

function PageShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      {children}
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <SectionTitle icon={Tags} title="关键词趋势" />
        <div className="tag-row tag-row--large">
          {trendTags.map((tag) => (
            <Link key={tag} to={`/topics/${slugify(tag)}`}>
              {tag}
            </Link>
          ))}
        </div>
      </div>
      <p>Cloudflare Pages Functions 已接入 D1、R2、采集日志和人工精选配置；生产库已写入文章、发射与资本市场数据。</p>
    </footer>
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
      <SiteFooter />
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
