import { Building2, FileText, Home, Newspaper, Rocket, Tags, type LucideIcon } from 'lucide-react';

export type MissionNavItem = { label: string; to: string; icon: LucideIcon; signal: string };

export const primaryNav: MissionNavItem[] = [
  { label: '总览', to: '/', icon: Home, signal: '最新' },
  { label: '资讯', to: '/articles', icon: Newspaper, signal: '聚合' },
  { label: '发射', to: '/launches', icon: Rocket, signal: '窗口' },
  { label: '政策', to: '/policy', icon: FileText, signal: '官方' },
];

export const secondaryNav: MissionNavItem[] = [
  { label: '公司', to: '/companies', icon: Building2, signal: '档案' },
  { label: '专题', to: '/topics', icon: Tags, signal: '追踪' },
];

export const missionNav = [...primaryNav, ...secondaryNav];

export const channelChips = [
  ['全部', '/articles'],
  ['国内', '/articles?region=cn'],
  ['国际', '/articles?region=global'],
  ['政策', '/articles?category=policy'],
];
