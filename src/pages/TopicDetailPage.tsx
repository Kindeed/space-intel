import { ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { DetailSkeleton } from '../components/DetailSkeleton';
import { PageShell } from '../components/PageShell';
import { SectionTitle } from '../components/SectionTitle';
import { useTopicDetailQuery } from '../hooks/queries';
import { articleFromApi, articleTopicFilterPath, displayTime, displayTopicName, friendlyError, safeExternalUrl } from '../utils';

function curationLabel(note: string | null, safeItemUrl: string): string {
  const trimmedNote = note?.replace(/\s+/g, ' ').trim();

  if (trimmedNote) {
    return trimmedNote;
  }

  try {
    return new URL(safeItemUrl).hostname.replace(/^www\./, '') || '精选资料';
  } catch {
    return '精选资料';
  }
}

export function TopicDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const state = useTopicDetailQuery(apiSlug);
  const related = state.data ? state.data.articles.map(articleFromApi) : [];
  const pageError = friendlyError(state.error, '专题详情', '专题不存在或已调整。');
  const allArticlesPath = state.data && state.data.articleCount > related.length ? articleTopicFilterPath(state.data.slug) : null;
  const safeCurations = state.data?.curations
    .map((curation) => ({ ...curation, safeItemUrl: safeExternalUrl(curation.itemUrl) }))
    .filter((curation): curation is typeof curation & { safeItemUrl: string } => Boolean(curation.safeItemUrl)) ?? [];

  return (
    <PageShell title={state.data ? displayTopicName(state.data.name, '专题详情') : '专题详情'}>
      {pageError ? <div className="inline-status">{pageError}</div> : null}
      {state.isLoading && !state.data ? <DetailSkeleton label="专题详情加载中" /> : null}
      {safeCurations.length ? (
        <section className="detail-panel">
          <SectionTitle icon={ShieldCheck} title="精选资料" />
          <div className="curation-list">
            {safeCurations.map((curation) => (
              <a href={curation.safeItemUrl} target="_blank" rel="noopener noreferrer" key={`${curation.itemUrl}:${curation.createdAt}`}>
                <strong>{curationLabel(curation.note, curation.safeItemUrl)}</strong>
                <span>{displayTime(curation.createdAt)}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
      <div className="page-list">
        {related.map((item) => <ArticleCard key={item.slug} item={item} />)}
        {state.data && !state.isLoading && state.data.articleCount === 0 && !related.length ? <div className="empty-state">该专题暂无相关新闻。</div> : null}
      </div>
      {allArticlesPath ? <Link className="source-link" to={allArticlesPath}>查看全部专题文章</Link> : null}
      <Link className="source-link" to="/topics">返回专题列表</Link>
    </PageShell>
  );
}
