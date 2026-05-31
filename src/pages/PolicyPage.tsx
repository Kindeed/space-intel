import { type FormEvent, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { PageShell } from '../components/PageShell';
import { SkeletonFeed } from '../components/SkeletonFeed';
import { SourceOptions } from '../components/SourceOptions';
import { useArticlesQuery } from '../hooks/queries';
import { articleFromApi, filterFormPath, parseBoundedPositiveInteger, parsePositiveInteger, safeLoadMessage, setPositiveIntegerSearchParam, shouldShowEmptyState, trimmedSearchParams } from '../utils';

const policyListMaxLimit = 50;

function policyPageApiPath(searchParams: URLSearchParams, page: number, limit: number): string {
  const params = trimmedSearchParams(searchParams, ['region', 'source', 'query']);

  params.set('category', 'policy');
  params.set('page', String(page));
  params.set('limit', String(limit));
  return `/api/articles?${params.toString()}`;
}

function policyPageHref(searchParams: URLSearchParams, page: number): string {
  const nextParams = trimmedSearchParams(searchParams, ['region', 'source', 'query']);
  setPositiveIntegerSearchParam(nextParams, 'limit', searchParams.get('limit'), policyListMaxLimit);
  nextParams.set('page', String(page));
  return `/policy?${nextParams.toString()}`;
}

export function PolicyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentPage = parsePositiveInteger(searchParams.get('page'), 1);
  const limit = parseBoundedPositiveInteger(searchParams.get('limit'), 12, policyListMaxLimit);
  const apiPath = useMemo(() => policyPageApiPath(searchParams, currentPage, limit), [currentPage, limit, searchParams]);
  const state = useArticlesQuery(apiPath);
  const items = state.data?.items.map(articleFromApi) ?? [];
  const hasMore = state.data?.hasMore ?? false;

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(filterFormPath('/policy', new FormData(event.currentTarget), ['query', 'region', 'source']));
  }

  return (
    <PageShell title="政策">
      <details className="filter-drawer">
        <summary><Filter size={16} aria-hidden="true" /> 政策筛选</summary>
        <form className="filter-form" action="/policy" onSubmit={handleFilterSubmit}>
          <label>关键词<input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="地方、园区、讲话、行动方案" /></label>
          <label>地区<select name="region" defaultValue={searchParams.get('region') ?? ''}><option value="">全部地区</option><option value="cn">国内</option><option value="global">国际</option></select></label>
          <label>来源<select name="source" defaultValue={searchParams.get('source') ?? ''}><option value="">全部来源</option><SourceOptions categoryLabels={['官方机构', '公告信息', '专业媒体']} /></select></label>
          <button type="submit"><Search size={16} aria-hidden="true" /> 应用</button>
        </form>
      </details>
      {state.error ? <div className="inline-status">{safeLoadMessage('政策信息')}</div> : null}
      {state.isLoading ? <SkeletonFeed /> : null}
      <div className="page-list">
        {items.map((item) => <ArticleCard key={item.slug} item={item} />)}
        {shouldShowEmptyState(state.isLoading, state.error, items.length) ? <div className="empty-state">暂无政策信息。</div> : null}
      </div>
      <nav className="pagination-row" aria-label="政策分页">
        {currentPage > 1 ? <Link to={policyPageHref(searchParams, currentPage - 1)}>上一页</Link> : <span>上一页</span>}
        <strong>第 {currentPage} 页</strong>
        {hasMore ? <Link to={policyPageHref(searchParams, currentPage + 1)}>下一页</Link> : <span>下一页</span>}
      </nav>
    </PageShell>
  );
}
