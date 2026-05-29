import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleFilterPanel } from '../components/ArticleFilterPanel';
import { ChannelChips } from '../components/ChannelChips';
import { PageShell } from '../components/PageShell';
import { SkeletonFeed } from '../components/SkeletonFeed';
import { useArticlesQuery } from '../hooks/queries';
import { articleFromApi, articleListApiPath, pageHref, parsePositiveInteger, safeLoadMessage } from '../utils';

export function ArticlesPage() {
  const [searchParams] = useSearchParams();
  const region = searchParams.get('region');
  const category = searchParams.get('category');
  const currentPage = parsePositiveInteger(searchParams.get('page'), 1);
  const limit = parsePositiveInteger(searchParams.get('limit'), 12);
  const apiPath = useMemo(() => articleListApiPath(searchParams, currentPage, limit), [currentPage, limit, searchParams]);
  const apiState = useArticlesQuery(apiPath);
  const visibleItems = apiState.data?.items.map(articleFromApi) ?? [];
  const hasMore = apiState.data?.hasMore ?? false;

  return (
    <PageShell title="资讯">
      <ChannelChips />
      <ArticleFilterPanel searchParams={searchParams} region={region} category={category} />
      {apiState.error ? <div className="inline-status">{safeLoadMessage('实时数据')}</div> : null}
      {apiState.isLoading ? <SkeletonFeed /> : null}
      <div className="page-list">
        {visibleItems.map((item) => <ArticleCard key={item.slug} item={item} />)}
        {!apiState.isLoading && !visibleItems.length ? <div className="empty-state">没有匹配的文章线索，请调整筛选条件。</div> : null}
      </div>
      <nav className="pagination-row" aria-label="文章分页">
        {currentPage > 1 ? <Link to={pageHref(searchParams, currentPage - 1)}>上一页</Link> : <span>上一页</span>}
        <strong>第 {currentPage} 页</strong>
        {hasMore ? <Link to={pageHref(searchParams, currentPage + 1)}>下一页</Link> : <span>下一页</span>}
      </nav>
    </PageShell>
  );
}
