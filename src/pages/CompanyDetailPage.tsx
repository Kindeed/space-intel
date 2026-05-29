import { Link, useParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { PageShell } from '../components/PageShell';
import { useCompanyDetailQuery } from '../hooks/queries';
import { articleFromApi, safeLoadMessage } from '../utils';

export function CompanyDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const state = useCompanyDetailQuery(apiSlug);
  const related = state.data ? state.data.articles.map(articleFromApi) : [];

  return (
    <PageShell title={state.data?.name ?? '公司详情'}>
      {state.error ? <div className="inline-status">{safeLoadMessage('公司详情')}</div> : null}
      {state.data ? (
        <section className="detail-panel">
          <p>{state.data.profile || '暂无公开简介。'}</p>
          <div className="metadata-grid">
            <span>{state.data.country}</span>
            <span>{state.data.sector}</span>
            <span>{state.data.stockSymbol ?? '未披露/未上市'}</span>
            {state.data.website ? <a href={state.data.website} target="_blank" rel="noreferrer">官网</a> : <span>官网未披露</span>}
          </div>
        </section>
      ) : null}
      <div className="page-list">
        {related.map((item) => <ArticleCard key={item.slug} item={item} />)}
        {!state.isLoading && !related.length ? <div className="empty-state">暂无相关新闻。</div> : null}
      </div>
      <Link className="source-link" to="/companies">返回公司库</Link>
    </PageShell>
  );
}
