import { Filter, Search } from 'lucide-react';
import { type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompaniesQuery, useTopicsQuery } from '../hooks/queries';
import { displayCompanyName, displayTopicName, filterFormPath } from '../utils';
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
  const topics = useTopicsQuery();
  const companies = useCompaniesQuery();
  const navigate = useNavigate();

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(filterFormPath('/articles', new FormData(event.currentTarget), ['query', 'source', 'tag', 'company', 'region', 'category']));
  }

  return (
    <details className="filter-drawer">
      <summary>
        <Filter size={16} aria-hidden="true" />
        高级筛选
      </summary>
      <form className="filter-form" action="/articles" onSubmit={handleFilterSubmit}>
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
          <input name="tag" list="topic-options" defaultValue={searchParams.get('tag') ?? ''} placeholder="选择或输入专题" />
        </label>
        <label>
          公司
          <input name="company" list="company-options" defaultValue={searchParams.get('company') ?? ''} placeholder="选择或输入公司" />
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
        {topics.data?.items.map((topic) => <option key={topic.slug} value={displayTopicName(topic.name, '专题记录')} />)}
      </datalist>
      <datalist id="company-options">
        {companies.data?.items.map((company) => <option key={company.slug} value={displayCompanyName(company.name, '公司档案')} />)}
      </datalist>
    </details>
  );
}
