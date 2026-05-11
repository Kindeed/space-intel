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

  it('does not match stock symbols inside ordinary words', () => {
    const match = matchArticleEntities(
      {
        id: 7,
        title: 'Supplies arrive for a NASA mission',
        originalTitle: null,
        summary: 'No company is named in this article.',
      },
      [
        {
          slug: 'planet-labs',
          name: 'Planet Labs',
          englishName: 'Planet Labs',
          country: 'United States',
          sector: 'Remote sensing',
          website: '',
          profile: '',
          stockSymbol: 'PL',
          logoUrl: '',
        },
      ],
      [],
    );

    expect(match.companySlugs).toEqual([]);
  });

  it('matches stock symbols as standalone tokens', () => {
    const match = matchArticleEntities(
      {
        id: 8,
        title: 'RKLB reports quarterly results',
        originalTitle: null,
        summary: 'Rocket company update.',
      },
      [
        {
          slug: 'rocket-lab',
          name: 'Rocket Lab',
          englishName: 'Rocket Lab',
          country: 'United States',
          sector: 'Launch',
          website: '',
          profile: '',
          stockSymbol: 'RKLB',
          logoUrl: '',
        },
      ],
      [],
    );

    expect(match.companySlugs).toEqual(['rocket-lab']);
  });
});
