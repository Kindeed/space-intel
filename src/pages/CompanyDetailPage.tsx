import { Link, useParams } from 'react-router-dom';
import { companies, highlights, slugify } from '../data';
import { ArticleCard } from '../components/ArticleCard';
import { PageShell } from '../components/PageShell';
import { useCompanyDetailQuery } from '../hooks/queries';
import { articleFromApi } from '../utils';

export function CompanyDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const state = useCompanyDetailQuery(apiSlug);
  const fallbackCompany = companies.find((company) => slugify(company) === slug) ?? companies[0];
  const related = state.data ? state.data.articles.map(articleFromApi) : highlights.filter((item) => item.companies.includes(fallbackCompany));

  return (
    <PageShell title={state.data?.name ?? fallbackCompany} subtitle={state.data ? `${state.data.country} / ${state.data.sector}` : '公司档案、相关新闻和实体上下文。'}>
      {state.error ? <div className="inline-status">公司详情暂不可用，当前显示离线缓存。错误：{state.error.message}</div> : null}
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
        {(related.length ? related : highlights.slice(0, 2)).map((item) => <ArticleCard key={item.slug} item={item} />)}
      </div>
      <Link className="source-link" to="/companies">返回公司库</Link>
    </PageShell>
  );
}
