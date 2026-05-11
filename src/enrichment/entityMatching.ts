import type { CompanyConfigRecord, TopicConfigRecord } from '../catalog';

export type EnrichmentArticle = {
  id: number;
  title: string;
  originalTitle: string | null;
  summary: string;
};

export type ArticleEntityMatch = {
  articleId: number;
  companySlugs: string[];
  topicSlugs: string[];
};

function includesAny(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some((term) => term.trim() && normalized.includes(term.toLowerCase()));
}

export function matchArticleEntities(
  article: EnrichmentArticle,
  companies: CompanyConfigRecord[],
  topics: TopicConfigRecord[],
): ArticleEntityMatch {
  const text = [article.title, article.originalTitle, article.summary].filter(Boolean).join('\n');

  return {
    articleId: article.id,
    companySlugs: companies
      .filter((company) => includesAny(text, [company.name, company.englishName, company.stockSymbol]))
      .map((company) => company.slug),
    topicSlugs: topics.filter((topic) => includesAny(text, [topic.name, ...topic.keywords])).map((topic) => topic.slug),
  };
}

export function matchArticlesEntities(
  articles: EnrichmentArticle[],
  companies: CompanyConfigRecord[],
  topics: TopicConfigRecord[],
): ArticleEntityMatch[] {
  return articles.map((article) => matchArticleEntities(article, companies, topics));
}
