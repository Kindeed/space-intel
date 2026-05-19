import { ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useArticleDetailQuery } from '../hooks/queries';
import { companyName, companySlug, displayRegion, displayTime, launchLabel, launchSlug, safeLoadMessage, tagName, tagSlug } from '../utils';

export function ArticleDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const apiState = useArticleDetailQuery(apiSlug);
  const article = apiState.data;
  const title = article?.title ?? '文章详情';
  const summary = article?.summary ?? '当前文章详情暂不可用。';
  const detailTags = article?.tags ?? [];
  const detailCompanies = article?.companies ?? [];
  const detailLaunches = article?.launches ?? [];

  return (
    <PageShell title={title} subtitle="文章详情、相关公司、专题和发射信息。">
      {apiState.error ? <div className="inline-status">{safeLoadMessage('文章详情')}</div> : null}
      <section className="detail-panel">
        <div className="metadata-grid">
          <span>{article?.sourceName ?? '来源暂不可用'}</span>
          <span>{article ? displayTime(article.publishedAt) : '时间暂不可用'}</span>
          <span>{article ? displayRegion(article.region) : '地区暂不可用'}</span>
          <span>{article?.relatedSourceCount && article.relatedSourceCount > 1 ? `${article.relatedSourceCount} 源覆盖` : '单来源线索'}</span>
        </div>
        {article?.originalTitle && article.originalTitle !== article.title ? (
          <div className="metadata-block">
            <span>原文标题</span>
            <strong>{article.originalTitle}</strong>
          </div>
        ) : null}
        <p>{summary}</p>
        <div className="tag-row">
          {detailCompanies.map((company) => (
            <Link className="entity-chip" key={companyName(company)} to={`/companies/${companySlug(company)}`}>{companyName(company)}</Link>
          ))}
          {detailTags.map((tag) => <Link key={tagSlug(tag)} to={`/topics/${tagSlug(tag)}`}>{tagName(tag)}</Link>)}
          {detailLaunches.map((launch) => <Link key={launchSlug(launch)} to={`/launches/${launchSlug(launch)}`}>{launchLabel(launch)}</Link>)}
        </div>
        {article?.url ? (
          <a href={article.url} target="_blank" rel="noreferrer" className="source-link">
            <ExternalLink size={16} aria-hidden="true" />
            阅读原文
          </a>
        ) : null}
      </section>
    </PageShell>
  );
}
