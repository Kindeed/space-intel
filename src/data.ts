export type FeedLink = {
  slug: string;
  name: string;
};

export type FeedItem = {
  slug: string;
  title: string;
  source: string;
  time: string;
  category: string;
  region: '国内' | '国际';
  summary: string;
  companies: FeedLink[];
  tags: FeedLink[];
  relatedLaunch?: string;
};

export function slugify(value: string): string {
  return encodeURIComponent(value.toLowerCase().replace(/\s+/g, '-'));
}
