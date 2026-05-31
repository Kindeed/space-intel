import { describe, expect, it } from 'vitest';
import {
  publicTopic,
  publicTopicCategoryLabel,
  publicTopicCuration,
  publicTopicDetail,
  publicTopicListResult,
} from './_topics';
import type { TopicDetail } from '../../src/db/topicQueries';

const topic: TopicDetail = {
  id: 3,
  slug: 'reusable-rockets',
  name: '可回收火箭',
  category: 'technology',
  articleCount: 0,
  curationCount: 1,
  articles: [],
  curations: [
    {
      id: 9,
      targetType: 'topic',
      targetKey: 'reusable-rockets',
      itemUrl: 'https://example.com/reference',
      note: 'Reference',
      enabled: 1,
      createdAt: '2026-05-30T00:00:00Z',
    },
  ],
};

describe('public topic serializers', () => {
  it('removes internal curation routing fields from topic detail payloads', () => {
    const result = publicTopicDetail(topic);

    expect(result.categoryLabel).toBe('技术路线');
    expect('id' in result).toBe(false);
    expect('category' in result).toBe(false);
    expect(result.curations).toEqual([
      {
        itemUrl: 'https://example.com/reference',
        note: 'Reference',
        createdAt: '2026-05-30T00:00:00Z',
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('targetType');
    expect(JSON.stringify(result)).not.toContain('targetKey');
    expect(JSON.stringify(result)).not.toContain('enabled');
  });

  it('serializes individual topic curations with only public fields', () => {
    const result = publicTopicCuration(topic.curations[0]);

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error('Expected valid curation to be serialized');
    }
    expect(result).toEqual({
      itemUrl: 'https://example.com/reference',
      note: 'Reference',
      createdAt: '2026-05-30T00:00:00Z',
    });
    expect('id' in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain('targetType');
    expect(JSON.stringify(result)).not.toContain('targetKey');
    expect(JSON.stringify(result)).not.toContain('enabled');
  });

  it('normalizes blank and padded public topic curation fields', () => {
    const result = publicTopicCuration({
      ...topic.curations[0],
      itemUrl: '  https://example.com/reference  ',
      note: '  Reference\t note  ',
    });

    expect(result).toEqual({
      itemUrl: 'https://example.com/reference',
      note: 'Reference note',
      createdAt: '2026-05-30T00:00:00Z',
    });
  });

  it('drops unsafe or blank public topic curation URLs', () => {
    expect(publicTopicCuration({ ...topic.curations[0], itemUrl: 'javascript:alert(1)' })).toBeNull();
    expect(publicTopicCuration({ ...topic.curations[0], itemUrl: 'data:text/html,hi' })).toBeNull();
    expect(publicTopicCuration({ ...topic.curations[0], itemUrl: 'https://user:pass@example.com/reference' })).toBeNull();
    expect(publicTopicCuration({ ...topic.curations[0], itemUrl: '   ' })).toBeNull();
    expect(publicTopicCuration({ ...topic.curations[0], itemUrl: ' https://example.com/reference ' })).toMatchObject({
      itemUrl: 'https://example.com/reference',
    });
  });

  it('omits invalid curation records from topic detail payloads', () => {
    const result = publicTopicDetail({
      ...topic,
      curationCount: 3,
      curations: [
        { ...topic.curations[0], itemUrl: 'javascript:alert(1)', note: 'Unsafe' },
        { ...topic.curations[0], itemUrl: '   ', note: 'Blank' },
        { ...topic.curations[0], itemUrl: ' https://example.com/reference ', note: ' Valid ' },
      ],
    });

    expect(result.curations).toEqual([
      {
        itemUrl: 'https://example.com/reference',
        note: 'Valid',
        createdAt: '2026-05-30T00:00:00Z',
      },
    ]);
    expect(result.curationCount).toBe(1);
  });

  it('adds public Chinese category labels to topic list payloads', () => {
    const result = publicTopicListResult({
      items: [
        {
          id: 1,
          slug: 'satellite-internet',
          name: '卫星互联网',
          category: 'market',
          articleCount: 2,
          curationCount: 0,
        },
        {
          id: 2,
          slug: 'unknown-topic',
          name: '未知专题',
          category: 'custom',
          articleCount: 0,
          curationCount: 0,
        },
      ],
    });

    expect(result.items).toEqual([
      {
        slug: 'satellite-internet',
        name: '卫星互联网',
        categoryLabel: '产业市场',
        articleCount: 2,
        curationCount: 0,
      },
      {
        slug: 'unknown-topic',
        name: '未知专题',
        categoryLabel: '专题',
        articleCount: 0,
        curationCount: 0,
      },
    ]);
  });

  it('maps known topic category codes to public labels', () => {
    expect(publicTopicCategoryLabel('technology')).toBe('技术路线');
    expect(publicTopicCategoryLabel('market')).toBe('产业市场');
    expect(publicTopicCategoryLabel('launch')).toBe('发射任务');
    expect(publicTopicCategoryLabel('company')).toBe('公司图谱');
    expect(publicTopicCategoryLabel('policy')).toBe('政策监管');
    expect(publicTopicCategoryLabel('custom')).toBe('专题');
  });

  it('serializes individual topics with a public category label', () => {
    const result = publicTopic({
      id: 1,
      slug: ' policy-and-regulation ',
      name: ' 政策\t监管 ',
      category: ' policy ',
      articleCount: 1,
      curationCount: 0,
    });

    expect(result).toMatchObject({
      slug: 'policy-and-regulation',
      name: '政策 监管',
      categoryLabel: '政策监管',
    });
    expect('id' in result).toBe(false);
    expect('category' in result).toBe(false);
  });

  it('uses a Chinese fallback for blank topic names', () => {
    const result = publicTopic({
      id: 1,
      slug: 'satellite-internet',
      name: '   ',
      category: 'market',
      articleCount: 1,
      curationCount: 0,
    });

    expect(result.name).toBe('专题名称待确认');
  });
});
