import { ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { highlights } from '../data';
import { PageShell } from '../components/PageShell';
import { useArticleDetailQuery } from '../hooks/queries';
import { companyName, companySlug, displayRegion, displayTime, launchLabel, launchSlug, tagName, tagSlug } from '../utils';

export function ArticleDetailPage() {
  const { slug } = useParams();
  const apiSlug = slug ?? '';
  const apiState = useArticleDetailQuery(apiSlug);
  const fallbackArticle = highlights.find((item) => item.slug === slug) ?? highlights[0];
  const article = apiState.data;
  const title = article?.title ?? fallbackArticle.title;
  const summary = article?.summary ?? fallbackArticle.summary;
  const detailTags = article?.tags ?? fallbackArticle.tags;
  const detailCompanies = article?.companies ?? fallbackArticle.companies;
  const detailLaunches = article?.launches ?? (fallbackArticle.relatedLaunch ? [fallbackArticle.relatedLaunch] : []);

  return (
    <PageShell title={title} subtitle="摘要、要点、实体关系和原文链接；不存储或展示受版权限制全文。">
      {apiState.error ? <div className="inline-status">文章详情暂不可用，当前显示离线缓存。错误：{apiState.error.message}</div> : null}
      <section className="detail-panel">
        <div className="metadata-grid">
          <span>{article?.sourceName ?? fallbackArticle.source}</span>
          <span>{article ? displayTime(article.publishedAt) : fallbackArticle.time}</span>
          <span>{article ? displayRegion(article.region) : fallbackArticle.region}</span>
          <span>{article?.relatedSourceCount && article.relatedSourceCount > 1 ? `${article.relatedSourceCount} 源覆盖` : '单来源线索'}</span>
        </div>
        {article?.originalTitle && article.originalTitle !== article.title ? (
          <div className="metadata-block">
            <span>原文标题</span>
            <strong>{article.originalTitle}</strong>
          </div>
        ) : null}
        <p>{summary}</p>
        <div className="insight-list">
          <strong>核心要点</strong>
          <span>只展示摘要和元数据，避免全文转载。</span>
          <span>实体、标签和发射关系用于快速判断线索价值。</span>
          <span>需要完整上下文时跳转原文来源。</span>
        </div>
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
            打开原文链接
          </a>
        ) : null}
      </section>
    </PageShell>
  );
}
