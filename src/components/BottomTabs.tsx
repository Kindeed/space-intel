import { NavLink } from 'react-router-dom';
import { primaryNav } from '../constants';

export function BottomTabs() {
  return (
    <nav className="bottom-tabs" aria-label="移动端导航">
      {primaryNav.map(({ label, to, icon: Icon }) => (
        <NavLink key={label} to={to}>
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
