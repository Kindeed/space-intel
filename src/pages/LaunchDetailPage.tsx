import { ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useLaunchDetailQuery } from '../hooks/queries';
import { formatLaunchWindow, friendlyError } from '../utils';

export function LaunchDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const state = useLaunchDetailQuery(apiSlug);
  const launch = state.data;
  const pageError = state.error
    ? state.error.message.includes('404')
      ? '该发射记录已更新或暂时不可访问。'
      : friendlyError(state.error, '该发射记录')
    : null;
  const title = launch?.mission ?? '发射记录';

  return (
    <PageShell title={title}>
      <section className="detail-panel">
        {pageError ? <div className="inline-status inline-status--danger">{pageError}</div> : null}
        <p>发射窗口：{launch ? formatLaunchWindow(launch.windowStart) : '记录暂时不可访问'}</p>
        <p>火箭型号：{launch?.rocket ?? '未披露'}</p>
        {launch?.rawUrl ? <a href={launch.rawUrl} target="_blank" rel="noreferrer" className="source-link"><ExternalLink size={16} /> 查看发射来源</a> : null}
        <Link to="/launches" className="source-link">返回发射列表</Link>
      </section>
    </PageShell>
  );
}
