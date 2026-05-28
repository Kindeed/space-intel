export type SourceType =
  | 'api'
  | 'rss'
  | 'google_news_rss'
  | 'rsshub'
  | 'official_page'
  | 'capital_filing';

export type SourceRegion = 'cn' | 'global';

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
  dedupe_strategy: string;
  default_tags?: string[];
  default_companies?: string[];
};

export type NormalizedItem = {
  sourceKey: string;
  sourceName: string;
  title: string;
  originalTitle?: string;
  summary: string;
  url: string;
  publishedAt: string;
  language: 'zh' | 'en' | 'unknown';
  region: SourceRegion;
  rawId?: string;
  relatedLaunchIds: string[];
  companies: string[];
  tags: string[];
};

export type CollectorContext = {
  fetch: typeof fetch;
  now: () => Date;
};

export type SourceCollector = {
  type: SourceType;
  collect: (source: SourceConfig, context: CollectorContext) => Promise<NormalizedItem[]>;
};
