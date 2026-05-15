import { NavLink } from 'react-router-dom';
import { missionNav } from '../constants';
import type { ApiHomeStats } from '../types';

export function MissionNav({ stats }: { stats?: ApiHomeStats }) {
  return (
    <aside className="mission-nav" aria-label="Mission Control 导航">
      <div className="nav-card">
        {missionNav.map(({ label, to, icon: Icon, signal }) => (
          <NavLink key={label} to={to}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            <em>{signal}</em>
          </NavLink>
        ))}
      </div>
      {stats ? (
        <div className="signal-card signal-card--metrics">
          <span>实时统计</span>
          <div>
            <strong>{stats.recentArticleCount}</strong>
            <em>近 24 小时线索</em>
          </div>
          <div>
            <strong>{stats.topicCount}</strong>
            <em>追踪专题</em>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
