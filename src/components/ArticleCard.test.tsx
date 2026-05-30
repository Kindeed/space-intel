import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ArticleCard } from './ArticleCard';
import type { FeedStory } from '../types';

const article: FeedStory = {
  slug: '42',
  title: 'Reusable rocket milestone',
  source: 'Spaceflight Now',
  time: '05/30 10:00',
  category: '国际商业航天',
  region: '国际',
  summary: 'Short summary only.',
  companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
  tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
  url: 'https://example.com/article',
};

describe('ArticleCard', () => {
  it('exposes the whole card as a detail link while keeping nested links', () => {
    const html = renderToString(
      <MemoryRouter>
        <ArticleCard item={article} />
      </MemoryRouter>,
    );

    expect(html).toContain('role="link"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('查看 Reusable rocket milestone 的详情');
    expect(html).toContain('href="/articles/42"');
    expect(html).toContain('href="/companies/rocket-lab"');
    expect(html).toContain('href="/topics/reusable-rockets"');
  });
});
