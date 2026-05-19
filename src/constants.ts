import { Building2, CircleDollarSign, Home, Newspaper, Rocket, Tags, type LucideIcon } from 'lucide-react';

export const missionNav: Array<{ label: string; to: string; icon: LucideIcon; signal: string }> = [
  { label: '总览', to: '/', icon: Home, signal: '最新' },
  { label: '情报流', to: '/articles', icon: Newspaper, signal: '合并' },
  { label: '发射', to: '/launches', icon: Rocket, signal: '窗口' },
  { label: '公司', to: '/companies', icon: Building2, signal: '档案' },
  { label: '资本', to: '/capital', icon: CircleDollarSign, signal: '提示' },
  { label: '专题', to: '/topics', icon: Tags, signal: '追踪' },
];

export const channelChips = [
  ['全部', '/articles'],
  ['国内', '/articles?region=cn'],
  ['国际', '/articles?region=global'],
  ['政策', '/articles?category=policy'],
  ['资本', '/capital'],
  ['发射', '/launches'],
];

export const marketTypes = [
  ['全部', ''],
  ['融资', 'financing'],
  ['公告/财报', 'filing'],
  ['IPO/上市', 'ipo'],
  ['市场', 'market'],
  ['研报', 'report'],
];
