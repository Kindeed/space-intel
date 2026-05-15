import { Link } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useCompaniesQuery } from '../hooks/queries';
import { safeLoadMessage } from '../utils';

export function CompaniesPage() {
  const state = useCompaniesQuery();
  const items = state.data?.items ?? [];

  return (
    <PageShell title="公司库" subtitle="公司档案、赛道、新闻时间线、相关发射和资本动态。">
      {state.error ? <div className="inline-status">{safeLoadMessage('公司列表')}</div> : null}
      <div className="card-grid">
        {items.map((company) => (
          <Link to={`/companies/${company.slug}`} className="entity-card" key={company.slug}>
            <strong>{company.name}</strong>
            <span>{company.country} / {company.sector}</span>
            <em>{company.articleCount} 条相关新闻</em>
          </Link>
        ))}
        {!state.isLoading && !items.length ? <div className="empty-state">暂无公司档案。</div> : null}
      </div>
    </PageShell>
  );
}
