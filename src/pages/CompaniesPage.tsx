import { Link } from 'react-router-dom';
import { companies, slugify } from '../data';
import { PageShell } from '../components/PageShell';
import { useCompaniesQuery } from '../hooks/queries';

export function CompaniesPage() {
  const state = useCompaniesQuery();
  const fallback = companies.map((company, index) => ({
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
  const items = state.data?.items ?? fallback;

  return (
    <PageShell title="公司库" subtitle="公司档案、赛道、新闻时间线、相关发射和资本动态。">
      {state.error ? <div className="inline-status">公司列表暂不可用，当前显示离线缓存。错误：{state.error.message}</div> : null}
      <div className="card-grid">
        {items.map((company) => (
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
