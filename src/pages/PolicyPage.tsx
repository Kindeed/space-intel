import { type FormEvent, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { PageShell } from '../components/PageShell';
import { SkeletonFeed } from '../components/SkeletonFeed';
import { SourceOptions } from '../components/SourceOptions';
import { useArticlesQuery } from '../hooks/queries';
import { articleFromApi, filterFormPath, parseBoundedPositiveInteger, parsePositiveInteger, safeLoadMessage, setPositiveIntegerSearchParam, shouldShowEmptyState, trimmedSearchParams } from '../utils';

const officialListMaxLimit = 50;

function officialPageApiPath(searchParams: URLSearchParams, page: number, limit: number): string {
  const params = trimmedSearchParams(searchParams, ['region', 'source', 'query']);

  params.set('category', 'official');
  params.set('page', String(page));
  params.set('limit', String(limit));
  return `/api/articles?${params.toString()}`;
}

function officialPageHref(basePath: string, searchParams: URLSearchParams, page: number): string {
  const nextParams = trimmedSearchParams(searchParams, ['region', 'source', 'query']);
  setPositiveIntegerSearchParam(nextParams, 'limit', searchParams.get('limit'), officialListMaxLimit);
  nextParams.set('page', String(page));
  return `${basePath}?${nextParams.toString()}`;
}

export function PolicyPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = location.pathname.startsWith('/policy') ? '/policy' : '/official';
  const currentPage = parsePositiveInteger(searchParams.get('page'), 1);
  const limit = parseBoundedPositiveInteger(searchParams.get('limit'), 12, officialListMaxLimit);
  const apiPath = useMemo(() => officialPageApiPath(searchParams, currentPage, limit), [currentPage, limit, searchParams]);
  const state = useArticlesQuery(apiPath);
  const items = state.data?.items.map(articleFromApi) ?? [];
  const hasMore = state.data?.hasMore ?? false;

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(filterFormPath(basePath, new FormData(event.currentTarget), ['query', 'region', 'source']));
  }

  return (
    <PageShell title="官方">
      <details className="filter-drawer">
        <summary><Filter size={16} aria-hidden="true" /> 官方筛选</summary>
        <form className="filter-form" action={basePath} onSubmit={handleFilterSubmit}>
          <label>关键词<input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="政策、采购、园区、公告" /></label>
          <label>地区<select name="region" defaultValue={searchParams.get('region') ?? ''}><option value="">全部地区</option><option value="cn">国内</option><option value="global">国际</option></select></label>
          <label>来源<select name="source" defaultValue={searchParams.get('source') ?? ''}><option value="">全部来源</option><SourceOptions categoryLabels={['官方机构', '公告信息']} /></select></label>
          <button type="submit"><Search size={16} aria-hidden="true" /> 应用</button>
        </form>
      </details>
      {state.error ? <div className="inline-status">{safeLoadMessage('官方信息')}</div> : null}
      {state.isLoading ? <SkeletonFeed /> : null}
      <div className="page-list">
        {items.map((item) => <ArticleCard key={item.slug} item={item} />)}
        {shouldShowEmptyState(state.isLoading, state.error, items.length) ? <div className="empty-state">暂无官方信息。</div> : null}
      </div>
      <nav className="pagination-row" aria-label="官方分页">
        {currentPage > 1 ? <Link to={officialPageHref(basePath, searchParams, currentPage - 1)}>上一页</Link> : <span>上一页</span>}
        <strong>第 {currentPage} 页</strong>
        {hasMore ? <Link to={officialPageHref(basePath, searchParams, currentPage + 1)}>下一页</Link> : <span>下一页</span>}
      </nav>
    </PageShell>
  );
}
