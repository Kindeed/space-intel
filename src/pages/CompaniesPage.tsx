import { Link } from 'react-router-dom';
import { EntityGridSkeleton } from '../components/EntityGridSkeleton';
import { PageShell } from '../components/PageShell';
import { useCompaniesQuery } from '../hooks/queries';
import { companyDetailPath } from '../routes';
import { displayCompanyMetadata, displayCompanyName, safeLoadMessage, shouldShowEmptyState } from '../utils';

export function CompaniesPage() {
  const state = useCompaniesQuery();
  const items = state.data?.items ?? [];

  return (
    <PageShell title="公司库">
      {state.error ? <div className="inline-status">{safeLoadMessage('公司列表')}</div> : null}
      <div className="card-grid">
        {state.isLoading && !items.length ? <EntityGridSkeleton label="公司档案加载中" /> : null}
        {items.map((company) => (
          <Link to={companyDetailPath(company.slug)} className="entity-card" key={company.slug}>
            <strong>{displayCompanyName(company.name, '公司档案')}</strong>
            <span>{displayCompanyMetadata(company.countryLabel, '地区待确认')} / {displayCompanyMetadata(company.sectorLabel, '赛道待确认')}</span>
            <em>{company.articleCount} 条相关新闻</em>
          </Link>
        ))}
        {shouldShowEmptyState(state.isLoading, state.error, items.length) ? <div className="empty-state">暂无公司档案。</div> : null}
      </div>
    </PageShell>
  );
}
