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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesStockSymbol(text: string, stockSymbol: string): boolean {
  const symbol = stockSymbol.trim();

  if (symbol.length < 2) {
    return false;
  }

  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(symbol)}([^A-Za-z0-9]|$)`, 'i').test(text);
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
      .filter(
        (company) =>
          includesAny(text, [company.name, company.englishName]) ||
          (company.stockSymbol ? includesStockSymbol(text, company.stockSymbol) : false),
      )
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
