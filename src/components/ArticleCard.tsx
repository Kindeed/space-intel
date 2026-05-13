import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { slugify } from '../data';
import type { FeedStory } from '../types';

export function ArticleCard({ item, feature = false }: { item: FeedStory; feature?: boolean }) {
  const sourceCount = item.relatedSourceCount ?? 1;

  return (
    <article className={clsx('article-card', feature && 'article-card--feature')}>
      <div className="article-card__meta">
        <Link to={`/articles?region=${item.region === '国内' ? 'cn' : 'global'}`}>{item.region}</Link>
        <span>{item.source}</span>
        <time>{item.time}</time>
        {sourceCount > 1 ? <span className="cluster-badge">{sourceCount} 源覆盖</span> : null}
      </div>
      <h3>
        <Link to={`/articles/${item.slug}`}>{item.title}</Link>
      </h3>
      <p>{item.summary}</p>
      <div className="article-card__footer">
        <div className="tag-row">
          {item.companies.map((company) => (
            <Link className="entity-chip" key={company} to={`/companies/${slugify(company)}`} data-profile={company}>
              {company}
            </Link>
          ))}
          {item.tags.slice(0, 3).map((tag) => (
            <Link key={tag} to={`/topics/${slugify(tag)}`}>{tag}</Link>
          ))}
        </div>
        <div className="article-actions">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" aria-label={`打开 ${item.title} 的原文`}>
              <ExternalLink size={15} />
            </a>
          ) : null}
          <Link to={`/articles/${item.slug}`}>详情</Link>
        </div>
      </div>
      {sourceCount > 1 && item.relatedSources?.length ? (
        <div className="cluster-sources">相关来源：{item.relatedSources.slice(0, 4).join(' / ')}</div>
      ) : null}
    </article>
  );
}
