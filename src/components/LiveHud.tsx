import { Activity, CalendarDays, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionTitle } from './SectionTitle';
import { useArticlesQuery, useLaunchesQuery, useSourcesQuery } from '../hooks/queries';
import type { ApiArticleSummary, ApiHomeStats, ApiLaunch } from '../types';
import { displayLaunchStatus, formatLaunchWindow } from '../utils';

function accessLabel(status: string): string {
  const labels: Record<string, string> = {
    direct: '直连',
    limited: '可能受限',
    blocked: '受限',
    unknown: '待验证',
  };

  return labels[status] ?? '待验证';
}

function sourceAccessSummary(source: {
  directCount?: number;
  limitedCount?: number;
  blockedCount?: number;
  unknownCount?: number;
}): string {
  if (source.blockedCount) {
    return '部分受限';
  }

  if (source.limitedCount) {
    return '可能受限';
  }

  if (source.unknownCount) {
    return '待验证';
  }

  return '直连';
}

function hasAccessCounts(source: unknown): source is {
  directCount: number;
  limitedCount: number;
  blockedCount: number;
  unknownCount: number;
} {
  return (
    typeof source === 'object' &&
    source !== null &&
    typeof (source as { directCount?: unknown }).directCount === 'number' &&
    typeof (source as { limitedCount?: unknown }).limitedCount === 'number' &&
    typeof (source as { blockedCount?: unknown }).blockedCount === 'number' &&
    typeof (source as { unknownCount?: unknown }).unknownCount === 'number'
  );
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
  const sourceStats = sources.data?.publicStats ?? stats?.enabledSourcesByType.map((item) => ({ label: item.type, count: item.count })) ?? [];
  const accessStats = sources.data?.accessStats ?? [];

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
            <Link to="/articles" key={source.label}>
              <span>{source.label}</span>
              <strong>{source.count}</strong>
              <em>{hasAccessCounts(source) ? sourceAccessSummary(source) : accessStats.length ? accessStats.map((item) => `${accessLabel(item.status)} ${item.count}`).join(' / ') : '可用'}</em>
            </Link>
          )) : <div className="empty-state">来源状态暂不可用。</div>}
        </div>
      </section>
    </aside>
  );
}
