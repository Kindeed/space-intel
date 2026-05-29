import { Activity, CalendarDays, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionTitle } from './SectionTitle';
import { useArticlesQuery, useLaunchesQuery, useSourcesQuery } from '../hooks/queries';
import type { ApiArticleSummary, ApiHomeStats, ApiLaunch } from '../types';
import { displayLaunchStatus, formatLaunchWindow } from '../utils';

function sourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    api: 'API 源',
    rss: 'RSS 源',
    google_news_rss: '备用聚合',
    official_page: '官网发布',
    procurement_page: '采购公告',
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

function PolicyBrief({ item }: { item: ApiArticleSummary }) {
  return (
    <li>
      <Link to={`/articles/${item.id}`}>{item.title}</Link>
    </li>
  );
}

export function LiveHud({ stats }: { stats?: ApiHomeStats }) {
  const launches = useLaunchesQuery('/api/launches?limit=4');
  const policy = useArticlesQuery('/api/articles?category=policy&limit=4');
  const sources = useSourcesQuery();
  const sourceStats = sources.data?.stats ?? stats?.enabledSourcesByType ?? [];

  return (
    <aside className="live-hud" aria-label="实时情报 HUD">
      <section className="panel launch-hud">
        <SectionTitle icon={CalendarDays} title="发射时间线" kicker="实时更新" />
        <div className="launch-stack">
          {launches.data?.items.length ? launches.data.items.slice(0, 4).map((launch, index) => <LaunchStrip key={launch.externalId || launch.id} launch={launch} index={index} />) : <div className="empty-state">暂无发射记录。</div>}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={FileText} title="政策动态" kicker="官方来源" />
        <ul className="compact-list">
          {policy.data?.items.length ? policy.data.items.slice(0, 4).map((item) => <PolicyBrief key={item.id} item={item} />) : <li>暂无政策信息。</li>}
        </ul>
      </section>

      <section className="panel intel-snapshot">
        <SectionTitle icon={Activity} title="来源状态" kicker="已启用" />
        <div className="source-status">
          {sourceStats.length ? sourceStats.slice(0, 6).map((source) => (
            <Link to="/articles" key={source.type}>
              <span>{sourceTypeLabel(source.type)}</span>
              <strong>{source.count}</strong>
              <em>可用</em>
            </Link>
          )) : <div className="empty-state">来源状态暂不可用。</div>}
        </div>
      </section>
    </aside>
  );
}
