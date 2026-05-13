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
      <div className="compliance-card">
        <span>Content Policy</span>
        <strong>不存全文，仅聚合摘要、元数据和原文链接</strong>
      </div>
    </aside>
  );
}
