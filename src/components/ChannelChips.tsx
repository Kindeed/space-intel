import { NavLink } from 'react-router-dom';
import { channelChips } from '../constants';

export function ChannelChips() {
  return (
    <nav className="filter-row" aria-label="频道">
      {channelChips.map(([label, to]) => (
        <NavLink key={label} to={to}>{label}</NavLink>
      ))}
    </nav>
  );
}
