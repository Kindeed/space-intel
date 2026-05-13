import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { highlights, slugify } from '../data';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleFilterPanel } from '../components/ArticleFilterPanel';
import { ChannelChips } from '../components/ChannelChips';
import { PageShell } from '../components/PageShell';
import { SkeletonFeed } from '../components/SkeletonFeed';
import { useArticlesQuery } from '../hooks/queries';
import { articleFromApi, articleListApiPath, pageHref, parsePositiveInteger } from '../utils';

export function ArticlesPage() {
  const [searchParams] = useSearchParams();
  const region = searchParams.get('region');
  const category = searchParams.get('category');
  const query = searchParams.get('query')?.trim().toLowerCase();
  const tag = searchParams.get('tag');
  const company = searchParams.get('company');
  const currentPage = parsePositiveInteger(searchParams.get('page'), 1);
  const limit = parsePositiveInteger(searchParams.get('limit'), 12);
  const apiPath = useMemo(() => articleListApiPath(searchParams, currentPage, limit), [currentPage, limit, searchParams]);
  const apiState = useArticlesQuery(apiPath);
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
  const visibleItems = apiState.data?.items.map(articleFromApi) ?? fallbackItems.slice(fallbackStart, fallbackStart + limit);
  const hasMore = apiState.data?.hasMore ?? fallbackItems.length > fallbackStart + limit;

  return (
    <PageShell title="情报流" subtitle="按 story clustering 折叠重复报道，并用紧凑筛选控制信息密度。">
      <ChannelChips />
      <ArticleFilterPanel searchParams={searchParams} region={region} category={category} />
      {apiState.error ? <div className="inline-status">实时数据暂不可用，当前显示离线缓存。错误：{apiState.error.message}</div> : null}
      {apiState.isLoading ? <SkeletonFeed /> : null}
      <div className="page-list">
        {visibleItems.map((item) => <ArticleCard key={item.slug} item={item} />)}
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
