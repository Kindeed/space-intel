import { ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { DetailSkeleton } from '../components/DetailSkeleton';
import { PageShell } from '../components/PageShell';
import { companyDetailPath, launchDetailPath, topicDetailPath } from '../routes';
import { articlePublisherLabel } from '../sourceDisplay';
import { useArticleDetailQuery } from '../hooks/queries';
import {
  articleRegionFilterPath,
  articleSourceFilterValue,
  articleSourceFilterPath,
  companyName,
  companySlug,
  displayArticleText,
  displayOptionalArticleText,
  displayRegion,
  displayRelatedSourceNames,
  displayTime,
  friendlyError,
  launchLabel,
  launchSlug,
  safeExternalUrl,
  tagName,
  tagSlug,
} from '../utils';

export function ArticleDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const apiState = useArticleDetailQuery(apiSlug);
  const article = apiState.data;
  const title = article ? displayArticleText(article.title, '标题待确认') : '文章详情';
  const summary = article ? displayArticleText(article.summary, '摘要待确认') : '';
  const originalTitle = article ? displayOptionalArticleText(article.originalTitle) : null;
  const originalSummary = article ? displayOptionalArticleText(article.originalSummary) : null;
  const pageError = friendlyError(apiState.error, '文章详情');
  const detailTags = article?.tags ?? [];
  const detailCompanies = article?.companies ?? [];
  const detailLaunches = article?.launches ?? [];
  const relatedSourceCount = article?.relatedSourceCount ?? 0;
  const relatedSources = relatedSourceCount > 1 ? displayRelatedSourceNames(article?.relatedSources) : [];
  const sourceUrl = safeExternalUrl(article?.url);
  const articleSource = article ? articlePublisherLabel(article) : '';
  const articleRegion = article ? displayRegion(article.regionLabel) : '';
  const sourceFilterPath = article ? articleSourceFilterPath(articleSourceFilterValue(article)) : null;
  const regionFilterPath = article ? articleRegionFilterPath(articleRegion) : null;

  return (
    <PageShell title={title}>
      {pageError ? <div className="inline-status">{pageError}</div> : null}
      {apiState.isLoading && !article ? <DetailSkeleton label="文章详情加载中" /> : null}
      {article ? (
        <section className="detail-panel">
          <div className="metadata-grid">
            {sourceFilterPath ? <Link to={sourceFilterPath}>{articleSource}</Link> : <span>{articleSource}</span>}
            <span>{displayTime(article.publishedAt)}</span>
            {regionFilterPath ? <Link to={regionFilterPath}>{articleRegion}</Link> : <span>{articleRegion}</span>}
            <span>{relatedSourceCount > 1 ? `${relatedSourceCount} 源覆盖` : '单来源线索'}</span>
          </div>
          {originalTitle && originalTitle !== title ? (
            <div className="metadata-block">
              <span>原文标题</span>
              <strong>{originalTitle}</strong>
            </div>
          ) : null}
          <p>{summary}</p>
          {originalSummary && originalSummary !== summary ? (
            <div className="metadata-block">
              <span>原文摘要</span>
              <strong>{originalSummary}</strong>
            </div>
          ) : null}
          {relatedSources.length ? (
            <div className="metadata-block">
              <span>相关来源</span>
              <strong>{relatedSources.join(' / ')}</strong>
            </div>
          ) : null}
          <div className="tag-row">
            {detailCompanies.map((company) => (
              <Link className="entity-chip" key={companyName(company)} to={companyDetailPath(companySlug(company))}>{companyName(company)}</Link>
            ))}
            {detailTags.map((tag) => <Link key={tagSlug(tag)} to={topicDetailPath(tagSlug(tag))}>{tagName(tag)}</Link>)}
            {detailLaunches.map((launch) => <Link key={launchSlug(launch)} to={launchDetailPath(launchSlug(launch))}>{launchLabel(launch)}</Link>)}
          </div>
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
              <ExternalLink size={16} aria-hidden="true" />
              阅读原文
            </a>
          ) : null}
        </section>
      ) : null}
    </PageShell>
  );
}
