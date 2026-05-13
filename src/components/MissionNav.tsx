import { NavLink } from 'react-router-dom';
import { missionNav } from '../constants';

export function MissionNav() {
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
      <div className="signal-card">
        <span>来源透明</span>
        <strong>摘要、标签、实体与原文链接</strong>
        <p>保留来源入口，便于快速回看上下文。</p>
      </div>
      <div className="signal-card signal-card--metrics">
        <span>今日统计</span>
        <div>
          <strong>24</strong>
          <em>重点线索</em>
        </div>
        <div>
          <strong>6</strong>
          <em>追踪专题</em>
        </div>
      </div>
    </aside>
  );
}
