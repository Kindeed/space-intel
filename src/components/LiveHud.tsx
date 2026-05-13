import { Activity, CalendarDays, CircleDollarSign, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { marketBriefs, slugify, sourceStatus, trendTags, upcomingLaunches } from '../data';
import { SectionTitle } from './SectionTitle';

export function LiveHud({
  launches = upcomingLaunches,
  market = marketBriefs,
}: {
  launches?: Array<{ slug: string; mission: string; provider: string; window: string; site: string; status: string }>;
  market?: string[];
}) {
  return (
    <aside className="live-hud" aria-label="实时情报 HUD">
      <section className="panel launch-hud">
        <SectionTitle icon={CalendarDays} title="Launch Timeline" kicker="Live HUD" />
        <div className="launch-stack">
          {launches.slice(0, 4).map((launch, index) => (
            <Link key={launch.slug} to={`/launches/${launch.slug}`} className="launch-strip">
              <span>{launch.window}</span>
              <div>
                <strong>{launch.mission}</strong>
                <em>{launch.provider} / {launch.status}</em>
              </div>
              <i style={{ inlineSize: `${Math.max(28, 92 - index * 16)}%` }} />
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={CircleDollarSign} title="资本快讯" kicker="Info Only" />
        <p className="notice-copy">资本市场内容仅作信息聚合，不构成投资建议。</p>
        <ul className="compact-list">
          {market.slice(0, 4).map((brief) => (
            <li key={brief}>
              <Link to="/capital">{brief}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <SectionTitle icon={Activity} title="来源状态" kicker="Telemetry" />
        <div className="source-status">
          {sourceStatus.map((source) => (
            <Link to="/articles" key={source.label}>
              <span>{source.label}</span>
              <strong>{source.value}</strong>
              <em>{source.state}</em>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={Zap} title="热力词" kicker="48H" />
        <div className="tag-row">
          {trendTags.map((tag) => (
            <Link key={tag} to={`/topics/${slugify(tag)}`}>{tag}</Link>
          ))}
        </div>
      </section>
    </aside>
  );
}
