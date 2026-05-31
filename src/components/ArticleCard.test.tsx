import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ArticleCard } from './ArticleCard';
import type { FeedStory } from '../types';

const article: FeedStory = {
  slug: '42',
  title: 'Reusable rocket milestone',
  source: 'Spaceflight Now',
  sourceFilter: 'Spaceflight Now',
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
    expect(html).toContain('href="/articles?source=Spaceflight+Now"');
    expect(html).toContain('href="/companies/rocket-lab"');
    expect(html).toContain('href="/topics/reusable-rockets"');
  });

  it('encodes article and entity route identifiers in nested links', () => {
    const html = renderToString(
      <MemoryRouter>
        <ArticleCard
          item={{
            ...article,
            slug: 'story 42/alpha',
            companies: [{ slug: 'rocket lab/us', name: 'Rocket Lab US' }],
            tags: [{ slug: 'reusable rockets', name: 'Reusable rockets' }],
          }}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('href="/articles/story%2042%2Falpha"');
    expect(html).toContain('href="/companies/rocket%20lab%2Fus"');
    expect(html).toContain('href="/topics/reusable%20rockets"');
  });

  it('normalizes visible article text before rendering cards', () => {
    const html = renderToString(
      <MemoryRouter>
        <ArticleCard item={{ ...article, title: ' Reusable   rocket\tmilestone ', summary: ' Short\nsummary   only. ' }} />
      </MemoryRouter>,
    );

    expect(html).toContain('Reusable rocket milestone');
    expect(html).toContain('Short summary only.');
    expect(html).toContain('查看 Reusable rocket milestone 的详情');
    expect(html).toContain('打开 Reusable rocket milestone 的原文');
    expect(html).not.toContain(' Reusable   rocket');
    expect(html).not.toContain('Short\nsummary');
  });

  it('normalizes nested entity labels before rendering chips', () => {
    const html = renderToString(
      <MemoryRouter>
        <ArticleCard
          item={{
            ...article,
            companies: [{ slug: 'rocket-lab', name: ' Rocket   Lab ' }],
            tags: [{ slug: 'reusable-rockets', name: ' 可回收   火箭 ' }],
          }}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Rocket Lab');
    expect(html).toContain('data-profile="Rocket Lab"');
    expect(html).toContain('可回收 火箭');
    expect(html).not.toContain(' Rocket   Lab ');
    expect(html).not.toContain(' 可回收   火箭 ');
  });

  it('does not render unsafe original article links', () => {
    const html = [
      renderToString(
        <MemoryRouter>
          <ArticleCard item={{ ...article, url: 'javascript:alert(1)' }} />
        </MemoryRouter>,
      ),
      renderToString(
        <MemoryRouter>
          <ArticleCard item={{ ...article, url: 'https://user:pass@example.com/article' }} />
        </MemoryRouter>,
      ),
    ].join('');

    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('user:pass');
    expect(html).not.toContain('打开 Reusable rocket milestone 的原文');
  });

  it('marks original article links as isolated external tabs', () => {
    const html = renderToString(
      <MemoryRouter>
        <ArticleCard item={article} />
      </MemoryRouter>,
    );

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('does not link unknown regions to the global filter', () => {
    const html = renderToString(
      <MemoryRouter>
        <ArticleCard item={{ ...article, region: '地区待确认', category: '商业航天' }} />
      </MemoryRouter>,
    );

    expect(html).toContain('地区待确认');
    expect(html).not.toContain('href="/articles?region=global"');
  });

  it('does not link generic source fallback labels to empty source filters', () => {
    const html = renderToString(
      <MemoryRouter>
        <ArticleCard item={{ ...article, source: '来源', sourceFilter: undefined }} />
      </MemoryRouter>,
    );

    expect(html).toContain('来源');
    expect(html).not.toContain('href="/articles?source=');
  });

  it('does not link publisher labels when no configured source filter is available', () => {
    const html = renderToString(
      <MemoryRouter>
        <ArticleCard item={{ ...article, source: '新华社', sourceFilter: undefined }} />
      </MemoryRouter>,
    );

    expect(html).toContain('新华社');
    expect(html).not.toContain('href="/articles?source=%E6%96%B0%E5%8D%8E%E7%A4%BE"');
  });

  it('normalizes related source labels before rendering clusters', () => {
    const html = renderToString(
      <MemoryRouter>
        <ArticleCard
          item={{
            ...article,
            relatedSourceCount: 4,
            relatedSources: ['Google News RSS - 商业   航天', '商业 航天', ' Spaceflight\tNow ', '   '],
          }}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('相关来源');
    expect(html).toContain('商业 航天 / Spaceflight Now');
    expect(html).not.toContain('商业 航天 / 商业 航天');
    expect(html).not.toContain('Google News RSS');
    expect(html).not.toContain('商业   航天');
  });
});
