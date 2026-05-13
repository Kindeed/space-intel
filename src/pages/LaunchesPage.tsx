import { type CSSProperties, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { upcomingLaunches } from '../data';
import { PageShell } from '../components/PageShell';
import { useLaunchesQuery } from '../hooks/queries';
import { displayTime } from '../utils';

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
  const fallback = upcomingLaunches.map((launch, index) => ({
    id: index + 1,
    externalId: launch.slug,
    mission: launch.mission,
    rocket: null,
    provider: launch.provider,
    windowStart: null,
    site: launch.site,
    status: launch.status,
    rawUrl: null,
  }));
  const items = state.data?.items ?? fallback;

  return (
    <PageShell title="发射时间轴" subtitle="横向 Gantt-style 时间轴和紧凑列表并行展示发射窗口、服务商和状态。">
      <details className="filter-drawer">
        <summary><Filter size={16} aria-hidden="true" /> 发射筛选</summary>
        <form className="filter-form" action="/launches">
          <label>关键词<input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="任务、火箭、场站" /></label>
          <label>发射商<input name="provider" defaultValue={searchParams.get('provider') ?? ''} placeholder="Rocket Lab" /></label>
          <label>状态<input name="status" defaultValue={searchParams.get('status') ?? ''} placeholder="Go / Hold" /></label>
          <button type="submit"><Search size={16} aria-hidden="true" /> 应用</button>
        </form>
      </details>
      {state.error ? <div className="inline-status">发射数据暂不可用，当前显示离线缓存。错误：{state.error.message}</div> : null}
      <div className="launch-timeline">
        {items.map((launch, index) => (
          <Link to={`/launches/${launch.id || launch.externalId}`} key={launch.externalId || launch.id} style={{ '--lane': index % 4 } as CSSProperties}>
            <span>{launch.windowStart ? displayTime(launch.windowStart) : `T+${index + 1}`}</span>
            <strong>{launch.mission}</strong>
            <em>{launch.provider ?? '发射商待定'} / {launch.status}</em>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
