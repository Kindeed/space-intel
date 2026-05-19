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
  url: string;
  sourceKey: string;
  sourceName: string;
  sourceType: string;
  publishedAt: string;
  language: string;
  region: string;
  fetchStatus: string;
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
  enabledSourcesByType: Array<{ type: string; count: number }>;
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
  id: number;
  slug: string;
  name: string;
  englishName: string | null;
  country: string;
  sector: string;
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
  status: string;
  rawUrl: string | null;
  isFallback?: boolean;
};

export type ApiLaunchListResult = {
  items: ApiLaunch[];
  hasMore: boolean;
};

export type ApiMarketItem = {
  id: number;
  title: string;
  itemType: string;
  companyName: string | null;
  companySlug: string | null;
  sourceName: string | null;
  url: string;
  summary: string;
  publishedAt: string;
};

export type ApiMarketListResult = {
  items: ApiMarketItem[];
  notice: string;
};

export type ApiTopic = {
  id: number;
  slug: string;
  name: string;
  category: string;
  articleCount: number;
  curationCount: number;
};

export type ApiTopicCuration = {
  id: number;
  itemUrl: string;
  note: string | null;
  createdAt: string;
};

export type ApiTopicDetail = ApiTopic & {
  articles: ApiArticleSummary[];
  curations: ApiTopicCuration[];
};

export type ApiSource = {
  key: string;
  name: string;
  type: string;
  region: string;
  credibility: number;
};

export type ApiSourceListResult = {
  items: ApiSource[];
  stats: Array<{ type: string; count: number }>;
};

export type FeedStory = FeedItem & {
  url?: string;
  sourceKey?: string;
  relatedSourceCount?: number;
  relatedSources?: string[];
};
