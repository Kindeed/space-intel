import type { TopicCurationRow, TopicDetail, TopicRow } from '../../src/db/topicQueries';
import { topicCategoryLabel } from '../../src/catalog/topicCategories';
import { normalizeHttpUrl } from '../../src/config/url';
import { publicArticleSummary, type PublicArticleSummary } from './_articles';

export type PublicTopicCuration = Omit<Pick<TopicCurationRow, 'itemUrl' | 'note' | 'createdAt'>, 'itemUrl'> & {
  itemUrl: string;
};

export type PublicTopic = Omit<TopicRow, 'id' | 'category'> & {
  categoryLabel: string;
};

export type PublicTopicDetail = Omit<TopicDetail, 'id' | 'articles' | 'curations' | 'category'> & {
  categoryLabel: string;
  articles: PublicArticleSummary[];
  curations: PublicTopicCuration[];
};

function trimmedText(value: string): string {
  return value.trim();
}

function normalizedDisplayText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function displayText(value: string, fallback: string): string {
  return normalizedDisplayText(value) || fallback;
}

function trimmedNullableText(value: string | null): string | null {
  const trimmed = value ? normalizedDisplayText(value) : '';

  return trimmed || null;
}

export function publicTopicCategoryLabel(category: string): string {
  return topicCategoryLabel(category);
}

export function publicTopic(row: TopicRow): PublicTopic {
  return {
    slug: trimmedText(row.slug),
    name: displayText(row.name, '专题名称待确认'),
    categoryLabel: publicTopicCategoryLabel(row.category),
    articleCount: row.articleCount,
    curationCount: row.curationCount,
  };
}

export function publicTopicCuration(row: TopicCurationRow): PublicTopicCuration | null {
  const itemUrl = normalizeHttpUrl(row.itemUrl);

  if (!itemUrl) {
    return null;
  }

  return {
    itemUrl,
    note: trimmedNullableText(row.note),
    createdAt: row.createdAt,
  };
}

export function publicTopicDetail(topic: TopicDetail): PublicTopicDetail {
  const publicCurations = topic.curations.flatMap((curation) => {
    const publicCuration = publicTopicCuration(curation);

    return publicCuration ? [publicCuration] : [];
  });

  return {
    ...publicTopic(topic),
    curationCount: publicCurations.length,
    articles: topic.articles.map(publicArticleSummary),
    curations: publicCurations,
  };
}

export function publicTopicListResult(result: { items: TopicRow[] }): { items: PublicTopic[] } {
  return {
    items: result.items.map(publicTopic),
  };
}
