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

export const highlights: FeedItem[] = [
  {
    slug: 'domestic-engine-hot-fire',
    title: '国内商业火箭企业完成新一轮发动机热试车',
    source: '国内产业源',
    time: '08:30',
    category: '国内商业航天',
    region: '国内',
    summary: '用于验证复用发动机长程工作能力，后续将关联发射计划、融资动态和公司时间线。',
    companies: ['蓝箭航天', '星河动力'],
    tags: ['可回收火箭', '国内民营火箭'],
    relatedLaunch: 'commercial-remote-sensing-rideshare',
  },
  {
    slug: 'reusable-upper-stage-test',
    title: 'Launch provider updates reusable upper-stage test schedule',
    source: 'Spaceflight News API',
    time: '07:20',
    category: '国际商业航天',
    region: '国际',
    summary: '英文资讯保留原文标题和来源链接，同时展示中文摘要，便于国内读者快速判断信息价值。',
    companies: ['Rocket Lab'],
    tags: ['可回收火箭'],
  },
  {
    slug: 'satellite-internet-policy-support',
    title: '地方政策提出卫星互联网产业链专项扶持',
    source: '政策源',
    time: '昨日',
    category: '政策监管',
    region: '国内',
    summary: '政策条目只保存元数据、摘要、标签和原始链接，避免全文转载。',
    companies: ['银河航天', '长光卫星'],
    tags: ['卫星互联网', '政策监管'],
  },
  {
    slug: 'remote-sensing-data-contract',
    title: '商业遥感星座签署多行业数据服务框架协议',
    source: '资本/公告源',
    time: '昨日',
    category: '资本市场',
    region: '国内',
    summary: '资本与公告类内容只做信息聚合，并在资本页持续展示非投资建议说明。',
    companies: ['长光卫星', 'Planet Labs'],
    tags: ['商业遥感', '融资动态'],
  },
  {
    slug: 'leo-terminal-ecosystem',
    title: '低轨通信星座进入批量组网窗口，地面终端生态开始放量',
    source: '产业链观察',
    time: '昨日',
    category: '卫星互联网',
    region: '国内',
    summary: '关注卫星平台、相控阵终端、网关站和运营侧的联动变化，后续将进入专题聚合。',
    companies: ['银河航天', '时空道宇'],
    tags: ['卫星互联网', '低轨通信'],
  },
  {
    slug: 'lunar-payload-readiness',
    title: 'Commercial lunar payload providers prepare next mission readiness reviews',
    source: '国际任务源',
    time: '2 天前',
    category: '月球商业服务',
    region: '国际',
    summary: '月球商业服务条目将关联发射窗口、服务商、任务状态和相关报道。',
    companies: ['Intuitive Machines', 'Firefly Aerospace'],
    tags: ['月球商业服务'],
  },
  {
    slug: 'low-altitude-economy-policy',
    title: '地方低空经济政策提及卫星通信和遥感数据基础设施',
    source: '政策源',
    time: '2 天前',
    category: '政策监管',
    region: '国内',
    summary: '政策信息进入监管频道，保留政策原文链接，并用标签连接相关产业链公司。',
    companies: ['中科宇航', '微纳星空'],
    tags: ['政策监管', '低轨通信'],
  },
  {
    slug: 'public-space-company-backlog',
    title: 'Public space companies publish quarterly delivery and backlog updates',
    source: '公告/财报源',
    time: '3 天前',
    category: '资本市场',
    region: '国际',
    summary: '公告、财报和订单更新只作为资讯线索展示，不提供实时行情或交易建议。',
    companies: ['Rocket Lab', 'AST SpaceMobile'],
    tags: ['融资动态'],
  },
];

export const upcomingLaunches = [
  {
    slug: 'commercial-remote-sensing-rideshare',
    mission: '商业遥感星座补网发射',
    provider: '待确认',
    window: 'T+2 天',
    site: '中国酒泉',
    status: '准备中',
  },
  {
    slug: 'electron-rideshare',
    mission: 'Electron rideshare mission',
    provider: 'Rocket Lab',
    window: 'T+5 天',
    site: 'Mahia',
    status: '待发射',
  },
  {
    slug: 'clps-lunar-payload',
    mission: 'CLPS lunar payload update',
    provider: 'Intuitive Machines',
    window: 'T+9 天',
    site: 'Florida',
    status: '任务评审',
  },
];

export const marketBriefs = [
  '商业遥感公司披露新合同收入，待关联公告原文。',
  '低轨通信产业链多家公司发布订单进展。',
  '融资动态页面固定展示非投资建议说明。',
];

export const sourceStatus = [
  { label: 'API 源', value: '2', state: '正常' },
  { label: 'RSS 源', value: '8', state: '待接入' },
  { label: '中文聚合', value: '6', state: '待接入' },
];

export const trendTags = ['可回收火箭', '卫星互联网', '商业遥感', '月球商业服务', '低轨通信', '融资动态'];

export const topicWatch = [
  { slug: 'domestic-private-launch', title: '国内民营火箭', count: '12 条线索', note: '发射、发动机、融资' },
  { slug: 'satellite-internet', title: '卫星互联网', count: '9 条线索', note: '星座、终端、政策' },
  { slug: 'lunar-commercial-services', title: '月球商业服务', count: '5 条线索', note: 'CLPS、着陆器、载荷' },
];

export const companies = ['SpaceX', '蓝箭航天', 'Rocket Lab', '银河航天', 'Intuitive Machines'];

export function slugify(value: string): string {
  return encodeURIComponent(value.toLowerCase().replace(/\s+/g, '-'));
}
