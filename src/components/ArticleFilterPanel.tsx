import { Filter, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { companies, slugify, topicWatch, trendTags } from '../data';
import { SourceOptions } from './SourceOptions';

export function ArticleFilterPanel({
  searchParams,
  region,
  category,
}: {
  searchParams: URLSearchParams;
  region: string | null;
  category: string | null;
}) {
  return (
    <details className="filter-drawer">
      <summary>
        <Filter size={16} aria-hidden="true" />
        高级筛选
      </summary>
      <form className="filter-form" action="/articles">
        <label>
          关键词
          <input name="query" type="search" defaultValue={searchParams.get('query') ?? ''} placeholder="公司、发射、政策" />
        </label>
        <label>
          来源
          <select name="source" defaultValue={searchParams.get('source') ?? ''}>
            <option value="">全部来源</option>
            <SourceOptions />
          </select>
        </label>
        <label>
          标签
          <input name="tag" list="topic-options" defaultValue={searchParams.get('tag') ?? ''} placeholder="选择或输入 topic slug" />
        </label>
        <label>
          公司
          <input name="company" list="company-options" defaultValue={searchParams.get('company') ?? ''} placeholder="选择或输入 company slug" />
        </label>
        {region ? <input type="hidden" name="region" value={region} /> : null}
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <button type="submit">
          <Search size={16} aria-hidden="true" />
          应用
        </button>
        <Link to="/articles">重置</Link>
      </form>
      <datalist id="topic-options">
        {topicWatch.map((topic) => <option key={topic.slug} value={topic.slug}>{topic.title}</option>)}
        {trendTags.map((tag) => <option key={tag} value={slugify(tag)}>{tag}</option>)}
      </datalist>
      <datalist id="company-options">
        {companies.map((company) => <option key={company} value={slugify(company)}>{company}</option>)}
      </datalist>
    </details>
  );
}
