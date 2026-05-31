import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import type { MouseEvent, KeyboardEvent } from 'react';
import { articleDetailPath, companyDetailPath, topicDetailPath } from '../routes';
import type { FeedStory } from '../types';
import { articleRegionFilterPath, articleSourceFilterPath, displayArticleText, displayCompanyName, displayRelatedSourceNames, displayTopicName, safeExternalUrl } from '../utils';
import { shouldActivateCardKeyboardNavigation, shouldActivateCardPointerNavigation } from './ArticleCard.utils';

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
  const detailPath = articleDetailPath(item.slug);
  const sourceUrl = safeExternalUrl(item.url);
  const regionPath = articleRegionFilterPath(item.region);
  const sourcePath = articleSourceFilterPath(item.sourceFilter);
  const relatedSourceNames = displayRelatedSourceNames(item.relatedSources);
  const articleTitle = displayArticleText(item.title, '标题待确认');
  const articleSummary = displayArticleText(item.summary, '摘要待确认');

  function openDetail() {
    navigate(detailPath);
  }

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    if (!shouldActivateCardPointerNavigation({
      defaultPrevented: event.defaultPrevented,
      button: event.button,
      metaKey: event.metaKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      nestedInteractive: isNestedInteractiveTarget(event.target, event.currentTarget),
    })) {
      return;
    }

    openDetail();
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!shouldActivateCardKeyboardNavigation({ key: event.key, isCurrentTarget: event.target === event.currentTarget })) {
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
      aria-label={`查看 ${articleTitle} 的详情`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="article-card__meta">
        {regionPath ? <Link to={regionPath}>{item.region}</Link> : <span>{item.region}</span>}
        {sourcePath ? <Link to={sourcePath}>{item.source}</Link> : <span>{item.source}</span>}
        <time>{item.time}</time>
        {sourceCount > 1 ? <span className="cluster-badge">{sourceCount} 源覆盖</span> : null}
      </div>
      <h3>
        <Link to={detailPath}>{articleTitle}</Link>
      </h3>
      <p>{articleSummary}</p>
      <div className="article-card__footer">
        <div className="tag-row">
          {item.companies.map((company) => {
            const label = displayCompanyName(company.name, '公司档案');

            return (
              <Link className="entity-chip" key={company.slug} to={companyDetailPath(company.slug)} data-profile={label}>
                {label}
              </Link>
            );
          })}
          {item.tags.slice(0, 3).map((tag) => <Link key={tag.slug} to={topicDetailPath(tag.slug)}>{displayTopicName(tag.name, '专题记录')}</Link>)}
        </div>
        <div className="article-actions">
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`打开 ${articleTitle} 的原文`}>
              <ExternalLink size={15} />
            </a>
          ) : null}
          <Link to={detailPath}>详情</Link>
        </div>
      </div>
      {sourceCount > 1 && relatedSourceNames.length ? (
        <div className="cluster-sources">相关来源：{relatedSourceNames.join(' / ')}</div>
      ) : null}
    </article>
  );
}
