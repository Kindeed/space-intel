import { Activity, CalendarDays, CircleDollarSign, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { slugify, trendTags } from '../data';
import { SectionTitle } from './SectionTitle';
import { useLaunchesQuery, useMarketQuery, useSourcesQuery } from '../hooks/queries';
import type { ApiHomeStats, ApiLaunch, ApiMarketItem, ApiTrendingTag } from '../types';
import { displayLaunchStatus, formatLaunchWindow } from '../utils';

function sourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    api: 'API 源',
    rss: 'RSS 源',
    google_news_rss: '备用聚合',
    official_page: '官网发布',
    capital_filing: '资本披露',
    rsshub: 'RSSHub',
  };

  return labels[type] ?? type;
}

function LaunchStrip({ launch, index }: { launch: ApiLaunch; index: number }) {
  return (
    <Link to={`/launches/${launch.id || launch.externalId}`} className="launch-strip">
      <span>{formatLaunchWindow(launch.windowStart)}</span>
      <div>
        <strong>{launch.mission}</strong>
        <em>{launch.provider ?? '发射商待定'} / {displayLaunchStatus(launch.status)}</em>
      </div>
      <i style={{ inlineSize: `${Math.max(28, 92 - index * 16)}%` }} />
    </Link>
  );
}

function MarketBrief({ item }: { item: ApiMarketItem }) {
  return (
    <li>
      {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : <Link to="/capital">{item.title}</Link>}
    </li>
  );
}

export function LiveHud({ stats, trendingTags }: { stats?: ApiHomeStats; trendingTags?: ApiTrendingTag[] }) {
  const launches = useLaunchesQuery('/api/launches?limit=4');
  const market = useMarketQuery('/api/market?limit=4');
  const sources = useSourcesQuery();
  const sourceStats = sources.data?.stats ?? stats?.enabledSourcesByType ?? [];
  const fallbackTags = trendTags.map((tag) => ({ slug: slugify(tag), name: tag, count: 0 }));
  const hotTags = trendingTags?.length ? trendingTags : fallbackTags;
  const hotTagsKicker = trendingTags?.length ? '近期' : '配置';

  return (
    <aside className="live-hud" aria-label="实时情报 HUD">
      <section className="panel launch-hud">
        <SectionTitle icon={CalendarDays} title="发射时间线" kicker="实时更新" />
        <div className="launch-stack">
          {launches.data?.items.length ? launches.data.items.slice(0, 4).map((launch, index) => <LaunchStrip key={launch.externalId || launch.id} launch={launch} index={index} />) : <div className="empty-state">暂无发射记录。</div>}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={CircleDollarSign} title="资本快讯" kicker="信息聚合" />
        <p className="notice-copy">资本市场内容仅作信息聚合，不构成投资建议。</p>
        <ul className="compact-list">
          {market.data?.items.length ? market.data.items.slice(0, 4).map((item) => <MarketBrief key={item.id} item={item} />) : <li>暂无资本线索。</li>}
        </ul>
      </section>

      <section className="panel intel-snapshot">
        <SectionTitle icon={Activity} title="情报索引" kicker="来源与热词" />
        <div className="source-status">
          {sourceStats.length ? sourceStats.slice(0, 3).map((source) => (
            <Link to="/articles" key={source.type}>
              <span>{sourceTypeLabel(source.type)}</span>
              <strong>{source.count}</strong>
              <em>可用</em>
            </Link>
          )) : <div className="empty-state">来源状态暂不可用。</div>}
        </div>
        <div className="snapshot-tags">
          <Zap size={15} aria-hidden="true" />
          <span>{hotTagsKicker}热词</span>
          <div className="tag-row">
            {hotTags.slice(0, 6).map((tag) => (
              <Link key={tag.slug} to={`/topics/${tag.slug}`}>{tag.name}</Link>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}
