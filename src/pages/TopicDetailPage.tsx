import { ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { highlights, slugify, topicWatch } from '../data';
import { ArticleCard } from '../components/ArticleCard';
import { PageShell } from '../components/PageShell';
import { SectionTitle } from '../components/SectionTitle';
import { useTopicDetailQuery } from '../hooks/queries';
import { articleFromApi, displayTime } from '../utils';

export function TopicDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const state = useTopicDetailQuery(apiSlug);
  const fallback = topicWatch.find((item) => item.slug === slug) ?? topicWatch[0];
  const related = state.data ? state.data.articles.map(articleFromApi) : highlights.filter((item) => item.tags.some((tag) => slugify(tag) === slug) || item.tags.includes(fallback.title));

  return (
    <PageShell title={state.data?.name ?? fallback.title} subtitle={state.data ? `${state.data.category} / ${state.data.articleCount} 篇自动聚合` : `${fallback.count} / ${fallback.note}`}>
      {state.error ? <div className="inline-status">专题详情暂不可用，当前显示离线缓存。错误：{state.error.message}</div> : null}
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
        {(related.length ? related : highlights.slice(0, 3)).map((item) => <ArticleCard key={item.slug} item={item} />)}
      </div>
      <Link className="source-link" to="/topics">返回专题列表</Link>
    </PageShell>
  );
}
