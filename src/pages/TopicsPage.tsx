import { Link } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useTopicsQuery } from '../hooks/queries';
import { safeLoadMessage } from '../utils';

export function TopicsPage() {
  const state = useTopicsQuery();
  const items = state.data?.items ?? [];

  return (
    <PageShell title="专题追踪" subtitle="围绕重点主题持续汇总相关新闻和精选资料。">
      {state.error ? <div className="inline-status">{safeLoadMessage('专题列表')}</div> : null}
      <div className="card-grid">
        {items.map((topic) => (
          <Link to={`/topics/${topic.slug}`} className="entity-card" key={topic.slug}>
            <strong>{topic.name}</strong>
            <span>{topic.category}</span>
            <em>{topic.articleCount} 篇自动聚合 / {topic.curationCount} 条人工精选</em>
          </Link>
        ))}
        {!state.isLoading && !items.length ? <div className="empty-state">暂无专题记录。</div> : null}
      </div>
    </PageShell>
  );
}
