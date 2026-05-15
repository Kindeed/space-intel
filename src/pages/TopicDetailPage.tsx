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

  return (
    <PageShell title={state.data?.name ?? '专题详情'} subtitle={state.data ? `${state.data.category} / ${state.data.articleCount} 篇自动聚合` : '自动标签聚合与人工精选。'}>
      {state.error ? <div className="inline-status">{safeLoadMessage('专题详情')}</div> : null}
      {state.data?.curations.length ? (
        <section className="detail-panel">
          <SectionTitle icon={ShieldCheck} title="人工精选" />
          <div className="curation-list">
            {state.data.curations.map((curation) => (
              <a href={curation.itemUrl} target="_blank" rel="noreferrer" key={curation.id}>
                <strong>{curation.note ?? curation.itemUrl}</strong>
                <span>权重 {curation.weight} / {displayTime(curation.createdAt)}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
      <div className="page-list">
        {related.map((item) => <ArticleCard key={item.slug} item={item} />)}
        {!state.isLoading && !related.length ? <div className="empty-state">暂无专题文章。</div> : null}
      </div>
      <Link className="source-link" to="/topics">返回专题列表</Link>
    </PageShell>
  );
}
