import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import type { MouseEvent, KeyboardEvent } from 'react';
import type { FeedStory } from '../types';

function isNestedInteractiveTarget(target: EventTarget | null, boundary: HTMLElement): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactive = target.closest('a, button, input, select, textarea, summary');
  return Boolean(interactive && interactive !== boundary && boundary.contains(interactive));
}

export function ArticleCard({ item, feature = false }: { item: FeedStory; feature?: boolean }) {
  const sourceCount = item.relatedSourceCount ?? 1;
  const navigate = useNavigate();
  const detailPath = `/articles/${item.slug}`;

  function openDetail() {
    navigate(detailPath);
  }

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      isNestedInteractiveTarget(event.target, event.currentTarget)
    ) {
      return;
    }

    openDetail();
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    openDetail();
  }

  return (
    <article
      className={clsx('article-card', feature && 'article-card--feature')}
      role="link"
      tabIndex={0}
      aria-label={`查看 ${item.title} 的详情`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="article-card__meta">
        <Link to={`/articles?region=${item.region === '国内' ? 'cn' : 'global'}`}>{item.region}</Link>
        <span>{item.source}</span>
        <time>{item.time}</time>
        {sourceCount > 1 ? <span className="cluster-badge">{sourceCount} 源覆盖</span> : null}
      </div>
      <h3>
        <Link to={detailPath}>{item.title}</Link>
      </h3>
      <p>{item.summary}</p>
      <div className="article-card__footer">
        <div className="tag-row">
          {item.companies.map((company) => (
            <Link className="entity-chip" key={company.slug} to={`/companies/${company.slug}`} data-profile={company.name}>
              {company.name}
            </Link>
          ))}
          {item.tags.slice(0, 3).map((tag) => (
            <Link key={tag.slug} to={`/topics/${tag.slug}`}>{tag.name}</Link>
          ))}
        </div>
        <div className="article-actions">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" aria-label={`打开 ${item.title} 的原文`}>
              <ExternalLink size={15} />
            </a>
          ) : null}
          <Link to={detailPath}>详情</Link>
        </div>
      </div>
      {sourceCount > 1 && item.relatedSources?.length ? (
        <div className="cluster-sources">相关来源：{item.relatedSources.slice(0, 4).join(' / ')}</div>
      ) : null}
    </article>
  );
}
