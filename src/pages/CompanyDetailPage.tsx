import { Link, useParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { DetailSkeleton } from '../components/DetailSkeleton';
import { PageShell } from '../components/PageShell';
import { useCompanyDetailQuery } from '../hooks/queries';
import { articleCompanyFilterPath, articleFromApi, displayCompanyMetadata, displayCompanyName, friendlyError, safeExternalUrl } from '../utils';

function companyProfileText(profile: string): string {
  return profile.replace(/\s+/g, ' ').trim() || '暂无公开简介。';
}

export function CompanyDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const state = useCompanyDetailQuery(apiSlug);
  const related = state.data ? state.data.articles.map(articleFromApi) : [];
  const pageError = friendlyError(state.error, '公司详情');
  const websiteUrl = safeExternalUrl(state.data?.website);
  const companyTitle = state.data ? displayCompanyName(state.data.name, '公司详情') : '公司详情';
  const allArticlesPath = state.data && state.data.articleCount > related.length ? articleCompanyFilterPath(state.data.slug) : null;

  return (
    <PageShell title={companyTitle}>
      {pageError ? <div className="inline-status">{pageError}</div> : null}
      {state.isLoading && !state.data ? <DetailSkeleton label="公司详情加载中" /> : null}
      {state.data ? (
        <section className="detail-panel">
          <p>{companyProfileText(state.data.profile)}</p>
          <div className="metadata-grid">
            <span>{displayCompanyMetadata(state.data.countryLabel, '地区待确认')}</span>
            <span>{displayCompanyMetadata(state.data.sectorLabel, '赛道待确认')}</span>
            <span>{displayCompanyMetadata(state.data.stockSymbol, '未披露/未上市')}</span>
            {websiteUrl ? <a href={websiteUrl} target="_blank" rel="noopener noreferrer">官网</a> : <span>官网未披露</span>}
          </div>
      </section>
      ) : null}
      <div className="page-list">
        {related.map((item) => <ArticleCard key={item.slug} item={item} />)}
        {state.data && !state.isLoading && state.data.articleCount === 0 && !related.length ? <div className="empty-state">暂无相关新闻。</div> : null}
      </div>
      {allArticlesPath ? <Link className="source-link" to={allArticlesPath}>查看全部相关新闻</Link> : null}
      <Link className="source-link" to="/companies">返回公司库</Link>
    </PageShell>
  );
}
