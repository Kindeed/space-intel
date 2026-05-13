import { ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { upcomingLaunches } from '../data';
import { PageShell } from '../components/PageShell';
import { useLaunchDetailQuery } from '../hooks/queries';
import { displayLaunchStatus, formatLaunchWindow, friendlyError } from '../utils';

export function LaunchDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const state = useLaunchDetailQuery(apiSlug);
  const fallback = upcomingLaunches.find((item) => item.slug === slug);
  const launch = state.data;
  const pageError = state.error
    ? state.error.message.includes('404') || fallback
      ? '该发射记录已更新或不在当前缓存中。'
      : friendlyError(state.error, '该发射记录')
    : null;
  const title = launch?.mission ?? fallback?.mission ?? '发射记录';
  const subtitle = launch
    ? `${launch.provider ?? '发射商待定'} / ${launch.site ?? '场站待定'} / ${displayLaunchStatus(launch.status)}`
    : fallback
      ? `${fallback.provider} / ${fallback.site} / ${displayLaunchStatus(fallback.status)}`
      : '缓存记录可能已更新';

  return (
    <PageShell title={title} subtitle={subtitle}>
      <section className="detail-panel">
        {pageError ? <div className="inline-status inline-status--danger">{pageError}</div> : null}
        <p>发射窗口：{launch ? formatLaunchWindow(launch.windowStart) : fallback?.window ?? '记录不在当前缓存中'}</p>
        <p>火箭型号：{launch?.rocket ?? '未披露'}</p>
        {launch?.rawUrl ? <a href={launch.rawUrl} target="_blank" rel="noreferrer" className="source-link"><ExternalLink size={16} /> 打开发射原始来源</a> : null}
        <Link to="/launches" className="source-link">返回发射列表</Link>
      </section>
    </PageShell>
  );
}
