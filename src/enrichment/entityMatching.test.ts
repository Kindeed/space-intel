import { describe, expect, it } from 'vitest';
import { matchArticleEntities } from './entityMatching';

describe('entity matching', () => {
  it('matches companies and topics from article text', () => {
    const match = matchArticleEntities(
      {
        id: 42,
        title: '蓝箭航天 advances reusable rocket work',
        originalTitle: null,
        summary: 'LandSpace focuses on booster recovery and commercial launch.',
      },
      [
        {
          slug: 'landspace',
          name: '蓝箭航天',
          englishName: 'LandSpace',
          country: 'China',
          sector: 'Launch',
          website: '',
          profile: '',
          stockSymbol: '',
          logoUrl: '',
        },
      ],
      [
        {
          slug: 'reusable-rockets',
          name: '可回收火箭',
          category: 'technology',
          keywords: ['reusable rocket', 'booster recovery'],
        },
      ],
    );

    expect(match).toEqual({
      articleId: 42,
      companySlugs: ['landspace'],
      topicSlugs: ['reusable-rockets'],
    });
  });
});
