import { RadioTower } from 'lucide-react';
import { highlights } from '../data';
import { ArticleCard } from '../components/ArticleCard';
import { ChannelChips } from '../components/ChannelChips';
import { LiveHud } from '../components/LiveHud';
import { MissionNav } from '../components/MissionNav';
import { SectionTitle } from '../components/SectionTitle';
import { useArticlesQuery } from '../hooks/queries';
import { articleFromApi } from '../utils';

export function HomePage() {
  const articles = useArticlesQuery('/api/articles?limit=12');
  const feed = articles.data?.items.map(articleFromApi) ?? highlights.map((item) => ({ ...item, relatedSourceCount: 1 }));
  const featured = feed[0];

  return (
    <div className="mission-layout">
      <MissionNav />
      <section className="timeline-column" aria-label="情报时间线">
        <div className="timeline-header">
          <SectionTitle icon={RadioTower} title="今日重点" kicker="Mission Feed" />
          <p>按事件聚类的商业航天新闻、发射、公司、资本和政策线索。</p>
        </div>
        <ChannelChips />
        <div className="timeline-feed">
          {featured ? <ArticleCard item={featured} feature /> : null}
          {feed.slice(1).map((item) => <ArticleCard key={item.slug} item={item} />)}
        </div>
      </section>
      <LiveHud />
    </div>
  );
}
