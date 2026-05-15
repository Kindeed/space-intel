export type FeedItem = {
  slug: string;
  title: string;
  source: string;
  time: string;
  category: string;
  region: '国内' | '国际';
  summary: string;
  companies: string[];
  tags: string[];
  relatedLaunch?: string;
};

export const highlights: FeedItem[] = [];

export const upcomingLaunches: Array<{
  slug: string;
  mission: string;
  provider: string;
  window: string;
  site: string;
  status: string;
}> = [];

export const marketBriefs: string[] = [];

export const sourceStatus: Array<{ label: string; value: string; state: string }> = [];

export const trendTags = ['可回收火箭', '卫星互联网', '商业遥感', '月球商业服务', '低轨通信', '政策监管'];

export const topicWatch = [
  { slug: 'reusable-rockets', title: '可回收火箭', note: '技术进展' },
  { slug: 'satellite-internet', title: '卫星互联网', note: '星座与终端' },
  { slug: 'commercial-remote-sensing', title: '商业遥感', note: '遥感应用' },
  { slug: 'policy-and-regulation', title: '政策监管', note: '官方政策' },
];

export const companies = ['SpaceX', '蓝箭航天', 'Rocket Lab', '银河航天', 'Intuitive Machines'];

export function slugify(value: string): string {
  return encodeURIComponent(value.toLowerCase().replace(/\s+/g, '-'));
}
