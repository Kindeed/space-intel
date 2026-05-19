import { ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { PageShell } from '../components/PageShell';
import { SectionTitle } from '../components/SectionTitle';
import { useTopicDetailQuery } from '../hooks/queries';
import { articleFromApi, displayTime, safeLoadMessage } from '../utils';

export function TopicDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const state = useTopicDetailQuery(apiSlug);
  const related = state.data ? state.data.articles.map(articleFromApi) : [];
  const pageError = state.error
    ? state.error.message.includes('404')
      ? '专题不存在或已调整。'
      : safeLoadMessage('专题详情')
    : null;

  return (
    <PageShell title={state.data?.name ?? '专题详情'} subtitle={state.data ? `${state.data.category} / ${state.data.articleCount} 篇相关新闻` : '专题相关新闻与精选资料。'}>
      {pageError ? <div className="inline-status">{pageError}</div> : null}
      {state.data?.curations.length ? (
        <section className="detail-panel">
          <SectionTitle icon={ShieldCheck} title="精选资料" />
          <div className="curation-list">
            {state.data.curations.map((curation) => (
              <a href={curation.itemUrl} target="_blank" rel="noreferrer" key={curation.id}>
                <strong>{curation.note ?? curation.itemUrl}</strong>
                <span>{displayTime(curation.createdAt)}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
      <div className="page-list">
        {related.map((item) => <ArticleCard key={item.slug} item={item} />)}
        {state.data && !state.isLoading && !related.length ? <div className="empty-state">该专题暂无相关新闻。</div> : null}
      </div>
      <Link className="source-link" to="/topics">返回专题列表</Link>
    </PageShell>
  );
}
