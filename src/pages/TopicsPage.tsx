import { Link } from 'react-router-dom';
import { EntityGridSkeleton } from '../components/EntityGridSkeleton';
import { PageShell } from '../components/PageShell';
import { useTopicsQuery } from '../hooks/queries';
import { topicDetailPath } from '../routes';
import { displayTopicCategory, displayTopicName, safeLoadMessage, shouldShowEmptyState } from '../utils';

export function TopicsPage() {
  const state = useTopicsQuery();
  const items = state.data?.items ?? [];

  return (
    <PageShell title="专题追踪">
      {state.error ? <div className="inline-status">{safeLoadMessage('专题列表')}</div> : null}
      <div className="card-grid">
        {state.isLoading && !items.length ? <EntityGridSkeleton label="专题记录加载中" /> : null}
        {items.map((topic) => (
          <Link to={topicDetailPath(topic.slug)} className="entity-card" key={topic.slug}>
            <strong>{displayTopicName(topic.name, '专题记录')}</strong>
            <span>{displayTopicCategory(topic.categoryLabel)}</span>
            <em>{topic.articleCount} 篇自动聚合 / {topic.curationCount} 条人工精选</em>
          </Link>
        ))}
        {shouldShowEmptyState(state.isLoading, state.error, items.length) ? <div className="empty-state">暂无专题记录。</div> : null}
      </div>
    </PageShell>
  );
}
