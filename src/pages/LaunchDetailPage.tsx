import { ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { DetailSkeleton } from '../components/DetailSkeleton';
import { PageShell } from '../components/PageShell';
import { useLaunchDetailQuery } from '../hooks/queries';
import { displayLaunchMission, displayLaunchProvider, displayLaunchRocket, displayLaunchSite, formatLaunchWindow, friendlyError, launchProviderFilterPath, safeExternalUrl } from '../utils';

export function LaunchDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const state = useLaunchDetailQuery(apiSlug);
  const launch = state.data;
  const pageError = friendlyError(state.error, '该发射记录');
  const title = launch ? displayLaunchMission(launch.mission, '发射记录') : '发射记录';
  const sourceUrl = safeExternalUrl(launch?.sourceUrl);
  const providerLabel = displayLaunchProvider(launch?.provider, '待定');
  const providerFilterPath = launchProviderFilterPath(launch?.provider);
  const rocketLabel = displayLaunchRocket(launch?.rocket, '未披露');
  const siteLabel = displayLaunchSite(launch?.site, '待定');

  return (
    <PageShell title={title}>
      {state.isLoading && !launch ? <DetailSkeleton label="发射记录加载中" /> : null}
      <section className="detail-panel">
        {pageError ? <div className="inline-status inline-status--danger">{pageError}</div> : null}
        {launch ? (
          <>
            <p>发射窗口：{formatLaunchWindow(launch.windowStart)}</p>
            <p>任务状态：{launch.statusLabel}</p>
            <p>发射商：{providerFilterPath ? <Link to={providerFilterPath}>{providerLabel}</Link> : <span>{providerLabel}</span>}</p>
            <p>火箭型号：{rocketLabel}</p>
            <p>发射场：{siteLabel}</p>
            {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link"><ExternalLink size={16} /> 查看发射来源</a> : null}
          </>
        ) : null}
        <Link to="/launches" className="source-link">返回发射列表</Link>
      </section>
    </PageShell>
  );
}
