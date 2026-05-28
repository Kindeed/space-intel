import { useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useLaunchesQuery } from '../hooks/queries';
import { displayLaunchStatus, formatLaunchWindow, friendlyError, launchProximity } from '../utils';
import type { ApiLaunch } from '../types';

function launchHref(launch: ApiLaunch): string | null {
  if (launch.isFallback) {
    return null;
  }

  return `/launches/${launch.id || launch.externalId}`;
}

function LaunchCard({ launch }: { launch: ApiLaunch }) {
  const href = launchHref(launch);
  const content = (
    <>
      <div className="launch-card__time">
        <span>{launchProximity(launch.windowStart)}</span>
        <strong>{formatLaunchWindow(launch.windowStart)}</strong>
      </div>
      <div className="launch-card__body">
        <strong>{launch.mission}</strong>
        <span>{launch.provider ?? '发射商待定'} / {displayLaunchStatus(launch.status)}</span>
        <em>{launch.rocket ?? '火箭型号未披露'} / {launch.site ?? '场站待定'}</em>
      </div>
    </>
  );

  return href ? (
    <Link to={href} className="launch-card">
      {content}
    </Link>
  ) : (
    <div className="launch-card launch-card--static">
      {content}
    </div>
  );
}

export function LaunchesPage() {
  const [searchParams] = useSearchParams();
  const apiPath = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of ['status', 'provider', 'query']) {
      const value = searchParams.get(key);
      if (value?.trim()) {
        params.set(key, value);
      }
    }
    params.set('limit', '12');
    return `/api/launches?${params.toString()}`;
  }, [searchParams]);
  const state = useLaunchesQuery(apiPath);
  const items = state.data?.items ?? [];

  return (
    <PageShell title="发射时间线" subtitle="按时间展示发射窗口、服务商和状态，支持关键词筛选。">
      <details className="filter-drawer">
        <summary><Filter size={16} aria-hidden="true" /> 发射筛选</summary>
        <form className="filter-form" action="/launches">
          <label>关键词<input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="任务、火箭、场站" /></label>
          <label>发射商<input name="provider" defaultValue={searchParams.get('provider') ?? ''} placeholder="Rocket Lab" /></label>
          <label>状态<input name="status" defaultValue={searchParams.get('status') ?? ''} placeholder="准备发射、等待窗口" /></label>
          <button type="submit"><Search size={16} aria-hidden="true" /> 应用</button>
        </form>
      </details>
      {friendlyError(state.error, '发射数据') ? <div className="inline-status">{friendlyError(state.error, '发射数据')}</div> : null}
      <div className="launch-timeline">
        {items.map((launch) => (
          <LaunchCard key={launch.externalId || launch.id} launch={launch} />
        ))}
        {!state.isLoading && !items.length ? <div className="empty-state">暂无发射记录。</div> : null}
      </div>
      {state.data?.hasMore ? <div className="inline-status">当前显示首批发射记录，可用关键词、发射商或状态继续筛选。</div> : null}
    </PageShell>
  );
}
