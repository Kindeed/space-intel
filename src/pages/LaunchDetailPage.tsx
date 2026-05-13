import { ExternalLink } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { upcomingLaunches } from '../data';
import { PageShell } from '../components/PageShell';
import { useLaunchDetailQuery } from '../hooks/queries';
import { displayTime } from '../utils';

export function LaunchDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const state = useLaunchDetailQuery(apiSlug);
  const fallback = upcomingLaunches.find((item) => item.slug === slug) ?? upcomingLaunches[0];
  const launch = state.data;

  return (
    <PageShell title={launch?.mission ?? fallback.mission} subtitle={`${launch?.provider ?? fallback.provider} / ${launch?.site ?? fallback.site} / ${launch?.status ?? fallback.status}`}>
      <section className="detail-panel">
        {state.error ? <div className="inline-status">发射详情暂不可用，当前显示离线缓存。错误：{state.error.message}</div> : null}
        <p>发射窗口：{launch?.windowStart ? displayTime(launch.windowStart) : fallback.window}</p>
        <p>火箭型号：{launch?.rocket ?? '未披露'}</p>
        {launch?.rawUrl ? <a href={launch.rawUrl} target="_blank" rel="noreferrer" className="source-link"><ExternalLink size={16} /> 打开发射原始来源</a> : null}
      </section>
    </PageShell>
  );
}
