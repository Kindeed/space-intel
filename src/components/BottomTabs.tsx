import { NavLink } from 'react-router-dom';
import { missionNav } from '../constants';

export function BottomTabs() {
  return (
    <nav className="bottom-tabs" aria-label="移动端导航">
      {missionNav.slice(0, 5).map(({ label, to, icon: Icon }) => (
        <NavLink key={label} to={to}>
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
