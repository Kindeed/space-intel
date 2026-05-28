import { describe, expect, it, vi } from 'vitest';
import { translateArticleFields, translateIngestionRecords } from './index';
import type { CollectorContext, NormalizedItem } from '../ingestion';

const englishItem: NormalizedItem = {
  sourceKey: 'snapi',
  sourceName: 'Spaceflight News API',
  title: 'Reusable rocket milestone',
  originalTitle: 'Reusable rocket milestone',
  summary: 'A commercial launch provider completed a booster recovery test.',
  url: 'https://example.com/reusable',
  publishedAt: '2026-05-09T00:00:00Z',
  language: 'en',
  region: 'global',
  rawId: 'article-1',
  relatedLaunchIds: [],
  companies: [],
  tags: [],
};

function contextWithResponse(response: Response): CollectorContext {
  return {
    now: () => new Date('2026-05-09T00:00:00Z'),
    fetch: vi.fn(async () => response),
  };
}

describe('translation adapter', () => {
  it('translates English title and summary from an OpenAI-compatible response', async () => {
    const context = contextWithResponse(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: '可回收火箭取得里程碑进展',
                  summary: '一家商业发射服务商完成了助推器回收测试。',
                }),
              },
            },
          ],
        }),
      ),
    );

    const result = await translateArticleFields(
      englishItem,
      {
        TRANSLATION_ENABLED: 'true',
        TRANSLATION_API_URL: 'https://translate.example.com/v1/chat/completions',
        TRANSLATION_API_TOKEN: 'test-token',
      },
      context,
    );

    expect(result).toMatchObject({
      title: '可回收火箭取得里程碑进展',
      originalTitle: 'Reusable rocket milestone',
      summary: '一家商业发射服务商完成了助推器回收测试。',
      originalSummary: 'A commercial launch provider completed a booster recovery test.',
      translationStatus: 'translated',
      translationProvider: 'hy_mt_1_8b',
      translatedAt: '2026-05-09T00:00:00.000Z',
      translationError: null,
    });
    expect(context.fetch).toHaveBeenCalledWith(
      'https://translate.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('skips translation when provider settings are not configured', async () => {
    const context = contextWithResponse(new Response('{}'));
    const result = await translateArticleFields(englishItem, {}, context);

    expect(result).toMatchObject({
      title: englishItem.title,
      summary: englishItem.summary,
      originalSummary: englishItem.summary,
      translationStatus: 'skipped',
    });
    expect(context.fetch).not.toHaveBeenCalled();
  });

  it('marks failures without throwing to the ingestion pipeline', async () => {
    const context = contextWithResponse(new Response('bad gateway', { status: 502 }));
    const result = await translateArticleFields(
      englishItem,
      {
        TRANSLATION_ENABLED: 'true',
        TRANSLATION_API_URL: 'https://translate.example.com/v1/chat/completions',
        TRANSLATION_API_TOKEN: 'test-token',
      },
      context,
    );

    expect(result).toMatchObject({
      title: englishItem.title,
      summary: englishItem.summary,
      originalSummary: englishItem.summary,
      translationStatus: 'failed',
      translationProvider: 'hy_mt_1_8b',
      translatedAt: null,
    });
    expect(result.translationError).toContain('HTTP 502');
  });

  it('keeps dedupe hashes unchanged after translating ingestion records', async () => {
    const context = contextWithResponse(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"title":"中文标题","summary":"中文摘要"}' } }],
        }),
      ),
    );

    const [record] = await translateIngestionRecords(
      [{ item: englishItem, dedupeHash: 'original-dedupe-hash' }],
      {
        TRANSLATION_ENABLED: 'true',
        TRANSLATION_API_URL: 'https://translate.example.com/v1/chat/completions',
        TRANSLATION_API_TOKEN: 'test-token',
      },
      context,
    );

    expect(record.dedupeHash).toBe('original-dedupe-hash');
    expect(record.item).toMatchObject({
      title: '中文标题',
      summary: '中文摘要',
      originalTitle: englishItem.title,
      originalSummary: englishItem.summary,
      translationStatus: 'translated',
    });
  });
});
