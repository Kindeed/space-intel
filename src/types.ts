import type { FeedItem } from './data';

export type ApiArticleEntity = {
  slug: string;
  name: string;
};

export type ApiArticleLaunch = {
  id: number;
  externalId: string;
  missionName: string;
  name: string;
};

export type ApiArticleSummary = {
  id: number;
  title: string;
  originalTitle: string | null;
  summary: string;
  originalSummary: string | null;
  url: string | null;
  sourceName: string;
  sourceCategoryLabel: string;
  publisherName: string | null;
  publishedAt: string;
  regionLabel: FeedItem['region'];
  tags: ApiArticleEntity[];
  companies: ApiArticleEntity[];
  relatedSourceCount?: number;
  relatedSources?: string[];
};

export type ApiArticleDetail = ApiArticleSummary & {
  launches: ApiArticleLaunch[];
};

export type ApiArticleListResult = {
  items: ApiArticleSummary[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export type ApiHomeStats = {
  recentArticleCount: number;
  topicCount: number;
  enabledSourceCategories: Array<{ label: string; count: number; accessSummaryLabel: string }>;
};

export type ApiTrendingTag = {
  slug: string;
  name: string;
  count: number;
};

export type ApiHomeResult = {
  items: ApiArticleSummary[];
  stats: ApiHomeStats;
  trendingTags: ApiTrendingTag[];
};

export type ApiCompany = {
  slug: string;
  name: string;
  englishName: string | null;
  countryLabel: string;
  sectorLabel: string;
  website: string | null;
  profile: string;
  stockSymbol: string | null;
  logoUrl: string | null;
  articleCount: number;
};

export type ApiCompanyDetail = ApiCompany & {
  articles: ApiArticleSummary[];
};

export type ApiLaunch = {
  id: number;
  externalId: string;
  mission: string;
  rocket: string | null;
  provider: string | null;
  windowStart: string | null;
  site: string | null;
  statusLabel: string;
  sourceUrl: string | null;
  isFallback?: boolean;
};

export type ApiLaunchListResult = {
  items: ApiLaunch[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export type ApiTopic = {
  slug: string;
  name: string;
  categoryLabel: string;
  articleCount: number;
  curationCount: number;
};

export type ApiTopicCuration = {
  itemUrl: string;
  note: string | null;
  createdAt: string;
};

export type ApiTopicDetail = ApiTopic & {
  articles: ApiArticleSummary[];
  curations: ApiTopicCuration[];
};

export type ApiSource = {
  name: string;
  categoryLabel: string;
  domesticAccessLabel: string;
  globalAccessLabel: string;
  accessNote: string | null;
  publicBadge: string | null;
};

export type ApiSourceListResult = {
  items: ApiSource[];
  publicStats: Array<{
    label: string;
    count: number;
    accessSummaryLabel: string;
  }>;
  accessStats: Array<{ label: string; count: number }>;
};

export type FeedStory = FeedItem & {
  url?: string;
  sourceFilter?: string;
  relatedSourceCount?: number;
  relatedSources?: string[];
};
