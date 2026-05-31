import { type FormEvent, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useLaunchesQuery } from '../hooks/queries';
import { launchDetailPath } from '../routes';
import {
  displayLaunchProvider,
  displayLaunchMission,
  displayLaunchRocket,
  displayLaunchSite,
  formatLaunchWindow,
  filterFormPath,
  friendlyError,
  launchProximity,
  parseBoundedPositiveInteger,
  parsePositiveInteger,
  setPositiveIntegerSearchParam,
  shouldShowEmptyState,
  trimmedSearchParams,
} from '../utils';
import type { ApiLaunch } from '../types';

const launchListMaxLimit = 50;

function launchPageApiPath(searchParams: URLSearchParams, page: number, limit: number): string {
  const params = trimmedSearchParams(searchParams, ['status', 'provider', 'query']);

  params.set('page', String(page));
  params.set('limit', String(limit));
  return `/api/launches?${params.toString()}`;
}

function launchPageHref(searchParams: URLSearchParams, page: number): string {
  const nextParams = trimmedSearchParams(searchParams, ['status', 'provider', 'query']);

  setPositiveIntegerSearchParam(nextParams, 'limit', searchParams.get('limit'), launchListMaxLimit);
  nextParams.set('page', String(page));
  return `/launches?${nextParams.toString()}`;
}

function launchHref(launch: ApiLaunch): string | null {
  if (launch.isFallback) {
    return null;
  }

  return launchDetailPath(launch.id || launch.externalId);
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
        <strong>{displayLaunchMission(launch.mission)}</strong>
        <span>{displayLaunchProvider(launch.provider)} / {launch.statusLabel}</span>
        <em>{displayLaunchRocket(launch.rocket)} / {displayLaunchSite(launch.site)}</em>
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

function LaunchTimelineSkeleton() {
  return (
    <div className="launch-timeline__loading" aria-label="发射记录加载中">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="launch-card launch-card--skeleton" key={index}>
          <div className="launch-card__time">
            <span />
            <strong />
          </div>
          <div className="launch-card__body">
            <strong />
            <span />
            <em />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LaunchesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentPage = parsePositiveInteger(searchParams.get('page'), 1);
  const limit = parseBoundedPositiveInteger(searchParams.get('limit'), 12, launchListMaxLimit);
  const apiPath = useMemo(() => launchPageApiPath(searchParams, currentPage, limit), [currentPage, limit, searchParams]);
  const state = useLaunchesQuery(apiPath);
  const items = state.data?.items ?? [];
  const hasMore = state.data?.hasMore ?? false;
  const errorMessage = friendlyError(state.error, '发射数据');

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(filterFormPath('/launches', new FormData(event.currentTarget), ['query', 'provider', 'status']));
  }

  return (
    <PageShell title="发射时间线">
      <details className="filter-drawer">
        <summary><Filter size={16} aria-hidden="true" /> 发射筛选</summary>
        <form className="filter-form" action="/launches" onSubmit={handleFilterSubmit}>
          <label>关键词<input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="任务、火箭、场站" /></label>
          <label>发射商<input name="provider" defaultValue={searchParams.get('provider') ?? ''} placeholder="Rocket Lab" /></label>
          <label>状态<input name="status" defaultValue={searchParams.get('status') ?? ''} placeholder="准备发射、等待窗口" /></label>
          <button type="submit"><Search size={16} aria-hidden="true" /> 应用</button>
        </form>
      </details>
      {errorMessage ? <div className="inline-status">{errorMessage}</div> : null}
      <div className="launch-timeline">
        {state.isLoading && !items.length ? <LaunchTimelineSkeleton /> : null}
        {items.map((launch) => (
          <LaunchCard key={launch.externalId || launch.id} launch={launch} />
        ))}
        {shouldShowEmptyState(state.isLoading, state.error, items.length) ? <div className="empty-state">暂无发射记录。</div> : null}
      </div>
      <nav className="pagination-row" aria-label="发射分页">
        {currentPage > 1 ? <Link to={launchPageHref(searchParams, currentPage - 1)}>上一页</Link> : <span>上一页</span>}
        <strong>第 {currentPage} 页</strong>
        {hasMore ? <Link to={launchPageHref(searchParams, currentPage + 1)}>下一页</Link> : <span>下一页</span>}
      </nav>
    </PageShell>
  );
}
