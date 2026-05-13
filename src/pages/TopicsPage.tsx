import { Link } from 'react-router-dom';
import { topicWatch } from '../data';
import { PageShell } from '../components/PageShell';
import { useTopicsQuery } from '../hooks/queries';

export function TopicsPage() {
  const state = useTopicsQuery();
  const fallback = topicWatch.map((topic, index) => ({
    id: index + 1,
    slug: topic.slug,
    name: topic.title,
    category: topic.note,
    articleCount: Number.parseInt(topic.count, 10) || 0,
    curationCount: 0,
  }));
  const items = state.data?.items ?? fallback;

  return (
    <PageShell title="专题追踪" subtitle="自动标签聚合与人工精选形成持续追踪的 context。">
      {state.error ? <div className="inline-status">专题列表暂不可用，当前显示离线缓存。错误：{state.error.message}</div> : null}
      <div className="card-grid">
        {items.map((topic) => (
          <Link to={`/topics/${topic.slug}`} className="entity-card" key={topic.slug}>
            <strong>{topic.name}</strong>
            <span>{topic.category}</span>
            <em>{topic.articleCount} 篇自动聚合 / {topic.curationCount} 条人工精选</em>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
