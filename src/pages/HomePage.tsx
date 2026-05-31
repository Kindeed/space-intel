import { RadioTower } from 'lucide-react';
import { ArticleCard } from '../components/ArticleCard';
import { LiveHud } from '../components/LiveHud';
import { MissionNav } from '../components/MissionNav';
import { SectionTitle } from '../components/SectionTitle';
import { SkeletonFeed } from '../components/SkeletonFeed';
import { useHomeQuery } from '../hooks/queries';
import { articleFromApi, safeLoadMessage, shouldShowEmptyState } from '../utils';

export function HomePage() {
  const home = useHomeQuery();
  const feed = home.data?.items.map(articleFromApi) ?? [];
  const featured = feed[0];

  return (
    <div className="mission-layout">
      <MissionNav stats={home.data?.stats} />
      <section className="timeline-column" aria-label="情报时间线">
        <div className="timeline-header">
          <SectionTitle icon={RadioTower} title="今日重点" kicker="最新" />
        </div>
        {home.error ? <div className="inline-status">{safeLoadMessage('首页数据')}</div> : null}
        {home.isLoading ? <SkeletonFeed /> : null}
        <div className="timeline-feed">
          {featured ? <ArticleCard item={featured} feature /> : null}
          {feed.slice(1).map((item) => <ArticleCard key={item.slug} item={item} />)}
          {shouldShowEmptyState(home.isLoading, home.error, feed.length) ? <div className="empty-state">暂无可展示线索。</div> : null}
        </div>
      </section>
      <LiveHud stats={home.data?.stats} />
    </div>
  );
}
