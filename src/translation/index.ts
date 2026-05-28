import type { IngestionRecord } from '../ingestion/run';
import type { CollectorContext, NormalizedItem } from '../ingestion/types';

export type TranslationStatus = 'translated' | 'skipped' | 'failed';

export type TranslationEnv = {
  TRANSLATION_PROVIDER?: string;
  TRANSLATION_API_URL?: string;
  TRANSLATION_API_TOKEN?: string;
  TRANSLATION_MODEL?: string;
  TRANSLATION_ENABLED?: string;
  TRANSLATION_TIMEOUT_MS?: string;
  TRANSLATION_MAX_ITEMS_PER_SOURCE?: string;
};

export type TranslatableArticle = {
  title: string;
  originalTitle?: string | null;
  summary: string;
  originalSummary?: string | null;
  language: 'zh' | 'en' | 'unknown';
};

export type ArticleTranslationResult = {
  title: string;
  originalTitle: string | null;
  summary: string;
  originalSummary: string | null;
  translationStatus: TranslationStatus;
  translationProvider: string | null;
  translatedAt: string | null;
  translationError: string | null;
};

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
    text?: string;
  }>;
};

const providerName = 'hy_mt_1_8b';
const defaultModel = 'hy-mt-1.8b';
const defaultTimeoutMs = 8_000;
const defaultMaxItemsPerSource = 8;

function isEnabled(value: string | undefined): boolean {
  return value?.toLowerCase() === 'true';
}

function configured(env: TranslationEnv | undefined): env is TranslationEnv & {
  TRANSLATION_API_URL: string;
  TRANSLATION_API_TOKEN: string;
} {
  return Boolean(
    env &&
      isEnabled(env.TRANSLATION_ENABLED) &&
      (!env.TRANSLATION_PROVIDER || env.TRANSLATION_PROVIDER === providerName) &&
      env.TRANSLATION_API_URL?.trim() &&
      env.TRANSLATION_API_TOKEN?.trim(),
  );
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function translationMaxItemsPerSource(env: TranslationEnv | undefined): number {
  return positiveInteger(env?.TRANSLATION_MAX_ITEMS_PER_SOURCE, defaultMaxItemsPerSource);
}

function compactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 240);
}

function originalTitle(article: TranslatableArticle): string {
  return article.originalTitle?.trim() || article.title;
}

function originalSummary(article: TranslatableArticle): string {
  return article.originalSummary?.trim() || article.summary;
}

function skipped(article: TranslatableArticle): ArticleTranslationResult {
  return {
    title: article.title,
    originalTitle: article.language === 'en' ? originalTitle(article) : article.originalTitle ?? null,
    summary: article.summary,
    originalSummary: article.language === 'en' ? originalSummary(article) : article.originalSummary ?? null,
    translationStatus: 'skipped',
    translationProvider: null,
    translatedAt: null,
    translationError: null,
  };
}

function failed(article: TranslatableArticle, error: unknown): ArticleTranslationResult {
  return {
    title: originalTitle(article),
    originalTitle: originalTitle(article),
    summary: originalSummary(article),
    originalSummary: originalSummary(article),
    translationStatus: 'failed',
    translationProvider: providerName,
    translatedAt: null,
    translationError: compactError(error),
  };
}

function stripJsonFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
}

function parseTranslationContent(content: string): Pick<ArticleTranslationResult, 'title' | 'summary'> {
  const parsed: unknown = JSON.parse(stripJsonFence(content));

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { title?: unknown }).title !== 'string' ||
    typeof (parsed as { summary?: unknown }).summary !== 'string'
  ) {
    throw new Error('Translation response did not include string title and summary fields.');
  }

  return {
    title: (parsed as { title: string }).title.trim(),
    summary: (parsed as { summary: string }).summary.trim(),
  };
}

async function fetchWithTimeout(
  context: CollectorContext,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await context.fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestTranslation(
  article: TranslatableArticle,
  env: TranslationEnv & { TRANSLATION_API_URL: string; TRANSLATION_API_TOKEN: string },
  context: CollectorContext,
): Promise<Pick<ArticleTranslationResult, 'title' | 'summary'>> {
  const response = await fetchWithTimeout(
    context,
    env.TRANSLATION_API_URL,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.TRANSLATION_API_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.TRANSLATION_MODEL?.trim() || defaultModel,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Translate English commercial space news metadata into concise Simplified Chinese. Preserve company names and mission names unless a standard Chinese translation is obvious. Output JSON only.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              title: originalTitle(article),
              summary: originalSummary(article),
              terminology: {
                SpaceX: 'SpaceX',
                'Rocket Lab': 'Rocket Lab',
                Starship: '星舰',
                'Falcon 9': '猎鹰 9',
                'Long March': '长征',
                'launch vehicle': '运载火箭',
              },
              output: { title: '中文标题', summary: '中文摘要' },
            }),
          },
        ],
      }),
    },
    positiveInteger(env.TRANSLATION_TIMEOUT_MS, defaultTimeoutMs),
  );

  if (!response.ok) {
    throw new Error(`Translation request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as OpenAiCompatibleResponse;
  const content = payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text;

  if (!content) {
    throw new Error('Translation response was empty.');
  }

  return parseTranslationContent(content);
}

export async function translateArticleFields(
  article: TranslatableArticle,
  env: TranslationEnv | undefined,
  context: CollectorContext,
): Promise<ArticleTranslationResult> {
  if (article.language !== 'en' || !article.title.trim() || !article.summary.trim()) {
    return skipped(article);
  }

  if (!configured(env)) {
    return skipped(article);
  }

  try {
    const translated = await requestTranslation(article, env, context);

    if (!translated.title || !translated.summary) {
      throw new Error('Translation response contained empty fields.');
    }

    return {
      title: translated.title,
      originalTitle: originalTitle(article),
      summary: translated.summary,
      originalSummary: originalSummary(article),
      translationStatus: 'translated',
      translationProvider: providerName,
      translatedAt: context.now().toISOString(),
      translationError: null,
    };
  } catch (error) {
    return failed(article, error);
  }
}

function applyTranslation(item: NormalizedItem, translation: ArticleTranslationResult): NormalizedItem {
  return {
    ...item,
    title: translation.title,
    originalTitle: translation.originalTitle ?? undefined,
    summary: translation.summary,
    originalSummary: translation.originalSummary ?? undefined,
    translationStatus: translation.translationStatus,
    translationProvider: translation.translationProvider ?? undefined,
    translatedAt: translation.translatedAt ?? undefined,
    translationError: translation.translationError ?? undefined,
  };
}

export async function translateIngestionRecords(
  records: IngestionRecord[],
  env: TranslationEnv | undefined,
  context: CollectorContext,
): Promise<IngestionRecord[]> {
  let remaining = translationMaxItemsPerSource(env);
  const translatedRecords: IngestionRecord[] = [];

  for (const record of records) {
    if (record.item.language === 'en' && remaining > 0) {
      remaining -= 1;
      translatedRecords.push({
        ...record,
        item: applyTranslation(record.item, await translateArticleFields(record.item, env, context)),
      });
      continue;
    }

    translatedRecords.push({
      ...record,
      item: applyTranslation(record.item, skipped(record.item)),
    });
  }

  return translatedRecords;
}
