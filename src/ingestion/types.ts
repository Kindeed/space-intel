export type SourceType =
  | 'api'
  | 'rss'
  | 'google_news_rss'
  | 'rsshub'
  | 'official_page'
  | 'procurement_page';

export type SourceRegion = 'cn' | 'global';
export type SourcePublicCategory = 'official' | 'media' | 'organization' | 'notice' | 'data' | 'source';
export type SourceAccessStatus = 'direct' | 'limited' | 'blocked' | 'unknown';
export const sourceDedupeStrategies = ['url_title_source', 'canonical_url_title', 'external_id'] as const;
export type SourceDedupeStrategy = (typeof sourceDedupeStrategies)[number];

export type SourceConfig = {
  key: string;
  name: string;
  type: SourceType;
  region: SourceRegion;
  url: string;
  credibility: number;
  enabled: boolean;
  purpose: string;
  expected_content: string;
  risk_notes: string;
  dedupe_strategy: SourceDedupeStrategy;
  default_tags?: string[];
  default_companies?: string[];
  include_terms?: string[];
  exclude_terms?: string[];
  max_items?: number;
  public_category?: SourcePublicCategory;
  access_domestic?: SourceAccessStatus;
  access_global?: SourceAccessStatus;
  access_note?: string;
  public_badge?: string;
};

export type NormalizedItem = {
  sourceKey: string;
  sourceName: string;
  publisherName?: string;
  title: string;
  originalTitle?: string;
  summary: string;
  originalSummary?: string;
  url: string;
  publishedAt: string;
  language: 'zh' | 'en' | 'unknown';
  region: SourceRegion;
  rawId?: string;
  relatedLaunchIds: string[];
  companies: string[];
  tags: string[];
  translationStatus?: 'translated' | 'skipped' | 'failed';
  translationProvider?: string;
  translatedAt?: string;
  translationError?: string;
};

export type CollectorContext = {
  fetch: typeof fetch;
  now: () => Date;
};

export type SourceCollector = {
  type: SourceType;
  collect: (source: SourceConfig, context: CollectorContext) => Promise<NormalizedItem[]>;
};
