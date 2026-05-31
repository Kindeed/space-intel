export const topicCategoryIds = ['technology', 'market', 'launch', 'company', 'policy'] as const;

export type TopicCategoryId = (typeof topicCategoryIds)[number];

export const topicCategoryLabels: Record<TopicCategoryId, string> = {
  technology: '技术路线',
  market: '产业市场',
  launch: '发射任务',
  company: '公司图谱',
  policy: '政策监管',
};

export function topicCategoryLabel(category: string): string {
  const normalized = category.trim();

  return topicCategoryLabels[normalized as TopicCategoryId] ?? '专题';
}
