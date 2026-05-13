import { useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { marketTypes } from '../constants';
import { highlights, slugify } from '../data';
import { PageShell } from '../components/PageShell';
import { SourceOptions } from '../components/SourceOptions';
import { useMarketQuery } from '../hooks/queries';
import { displayTime } from '../utils';

export function CapitalPage() {
  const [searchParams] = useSearchParams();
  const apiPath = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of ['type', 'company', 'source', 'query']) {
      const value = searchParams.get(key);
      if (value?.trim()) {
        params.set(key, value);
      }
    }
    params.set('limit', '12');
    return `/api/market?${params.toString()}`;
  }, [searchParams]);
  const state = useMarketQuery(apiPath);
  const fallback = highlights.filter((item) => item.category === '资本市场').map((item, index) => ({
    id: index + 1,
    title: item.title,
    itemType: 'news',
    companyName: item.companies[0] ?? null,
    companySlug: item.companies[0] ? slugify(item.companies[0]) : null,
    sourceName: item.source,
    url: '#',
    summary: item.summary,
    publishedAt: new Date().toISOString(),
  }));
  const items = state.data?.items ?? fallback;

  return (
    <PageShell title="资本情报" subtitle="融资、公告、财报和市场线索；固定保持非投资建议提示。">
      <div className="notice-banner">{state.data?.notice ?? '资本市场内容仅作信息聚合，不构成投资建议。'}</div>
      <details className="filter-drawer">
        <summary><Filter size={16} aria-hidden="true" /> 资本筛选</summary>
        <form className="filter-form" action="/capital">
          <label>关键词<input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="融资、公告、订单" /></label>
          <label>类型<select name="type" defaultValue={searchParams.get('type') ?? ''}>{marketTypes.map(([label, value]) => <option key={value || 'all'} value={value}>{label}</option>)}</select></label>
          <label>公司<input name="company" list="company-options" defaultValue={searchParams.get('company') ?? ''} placeholder="company slug" /></label>
          <label>来源<select name="source" defaultValue={searchParams.get('source') ?? ''}><option value="">全部来源</option><SourceOptions /></select></label>
          <button type="submit"><Search size={16} aria-hidden="true" /> 应用</button>
        </form>
      </details>
      {state.error ? <div className="inline-status">资本线索暂不可用，当前显示离线缓存。错误：{state.error.message}</div> : null}
      <div className="market-list">
        {items.map((item) => (
          <article className="market-item" key={item.id}>
            <div className="article-card__meta">
              <span>{item.itemType}</span>
              <span>{item.sourceName ?? '公开来源'}</span>
              <time>{displayTime(item.publishedAt)}</time>
            </div>
            <h3>{item.url && item.url !== '#' ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</h3>
            <p>{item.summary}</p>
            {item.companyName && item.companySlug ? <Link className="entity-chip" to={`/companies/${item.companySlug}`}>{item.companyName}</Link> : null}
          </article>
        ))}
      </div>
    </PageShell>
  );
}
