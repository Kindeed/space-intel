import { Activity, CalendarDays, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionTitle } from './SectionTitle';
import { useArticlesQuery, useLaunchesQuery, useSourcesQuery } from '../hooks/queries';
import { articleDetailPath, launchDetailPath } from '../routes';
import type { ApiArticleSummary, ApiHomeStats, ApiLaunch } from '../types';
import { displayLaunchMission, displayLaunchProvider, formatLaunchWindow } from '../utils';

function sourceAccessText(source: { label: string; count: number; accessSummaryLabel?: string }): string {
  if (source.accessSummaryLabel) {
    return source.accessSummaryLabel;
  }

  return '待验证';
}

function sourceCategoryPath(label: string): string {
  return label === '官方机构' || label === '公告信息' ? '/articles?category=official' : '/articles';
}

function LaunchStrip({ launch, index }: { launch: ApiLaunch; index: number }) {
  const content = (
    <>
      <span>{formatLaunchWindow(launch.windowStart)}</span>
      <div>
        <strong>{displayLaunchMission(launch.mission)}</strong>
        <em>{displayLaunchProvider(launch.provider)} / {launch.statusLabel}</em>
      </div>
      <i style={{ inlineSize: `${Math.max(28, 92 - index * 16)}%` }} />
    </>
  );

  return launch.isFallback ? (
    <div className="launch-strip launch-strip--static">
      {content}
    </div>
  ) : (
    <Link to={launchDetailPath(launch.id || launch.externalId)} className="launch-strip">
      {content}
    </Link>
  );
}

function PolicyBrief({ item }: { item: ApiArticleSummary }) {
  return (
    <li>
      <Link to={articleDetailPath(item.id)}>{item.title}</Link>
    </li>
  );
}

export function LiveHud({ stats }: { stats?: ApiHomeStats }) {
  const launches = useLaunchesQuery('/api/launches?limit=4');
  const policy = useArticlesQuery('/api/articles?category=official&limit=4');
  const sources = useSourcesQuery();
  const sourceStats = sources.data?.publicStats ?? stats?.enabledSourceCategories ?? [];
  const launchItems = launches.data?.items ?? [];
  const policyItems = policy.data?.items ?? [];

  return (
    <aside className="live-hud" aria-label="实时概览">
      <section className="panel launch-hud">
        <SectionTitle icon={CalendarDays} title="发射时间线" kicker="实时更新" />
        <div className="launch-stack">
          {launchItems.length ? launchItems.slice(0, 4).map((launch, index) => <LaunchStrip key={launch.externalId || launch.id} launch={launch} index={index} />) : null}
          {launches.isLoading && !launchItems.length ? <div className="empty-state">发射记录加载中。</div> : null}
          {launches.error && !launchItems.length ? <div className="empty-state">发射记录暂不可用。</div> : null}
          {!launches.isLoading && !launches.error && !launchItems.length ? <div className="empty-state">暂无发射记录。</div> : null}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={FileText} title="官方信息" kicker="政策与公告" />
        <ul className="compact-list">
          {policyItems.length ? policyItems.slice(0, 4).map((item) => <PolicyBrief key={item.id} item={item} />) : null}
          {policy.isLoading && !policyItems.length ? <li>官方信息加载中。</li> : null}
          {policy.error && !policyItems.length ? <li>官方信息暂不可用。</li> : null}
          {!policy.isLoading && !policy.error && !policyItems.length ? <li>暂无官方信息。</li> : null}
        </ul>
      </section>

      <section className="panel intel-snapshot">
        <SectionTitle icon={Activity} title="来源状态" kicker="已启用" />
        <div className="source-status">
          {sourceStats.length ? sourceStats.slice(0, 6).map((source) => (
            <Link to={sourceCategoryPath(source.label)} key={source.label}>
              <span>{source.label}</span>
              <strong>{source.count}</strong>
              <em>{sourceAccessText(source)}</em>
            </Link>
          )) : null}
          {sources.isLoading && !sourceStats.length ? <div className="empty-state">来源状态加载中。</div> : null}
          {sources.error && !sourceStats.length ? <div className="empty-state">来源状态暂不可用。</div> : null}
          {!sources.isLoading && !sources.error && !sourceStats.length ? <div className="empty-state">暂无来源状态。</div> : null}
        </div>
      </section>
    </aside>
  );
}
