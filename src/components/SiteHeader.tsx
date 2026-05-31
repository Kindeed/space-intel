import { Command as CommandMenu } from 'cmdk';
import { Rocket, Search } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { missionNav } from '../constants';
import { useCompaniesQuery, useTopicsQuery } from '../hooks/queries';
import { companyDetailPath, topicDetailPath } from '../routes';
import { articleSearchPath, commandCompanyLabel, commandSearchLabel, commandSearchPath, commandTopicLabel } from './SiteHeader.utils';

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const navigate = useNavigate();
  const companies = useCompaniesQuery();
  const topics = useTopicsQuery();
  const searchPath = commandSearchPath(commandQuery);
  const searchLabel = commandSearchLabel(commandQuery);
  const commands = useMemo(
    () => [
      ...missionNav.map(({ label, to, icon }) => ({ label, to, icon, group: '频道' })),
      ...(companies.data?.items ?? []).map((company) => ({ label: commandCompanyLabel(company.name), to: companyDetailPath(company.slug), icon: Rocket, group: '公司' })),
      ...(topics.data?.items ?? []).map((topic) => ({ label: commandTopicLabel(topic.name), to: topicDetailPath(topic.slug), icon: Search, group: '专题' })),
    ],
    [companies.data?.items, topics.data?.items],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function runCommand(to: string) {
    setSearchOpen(false);
    setCommandQuery('');
    navigate(to);
  }

  function handleSearchOpenChange(open: boolean) {
    setSearchOpen(open);

    if (!open) {
      setCommandQuery('');
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const queryValue = new FormData(event.currentTarget).get('query');
    navigate(articleSearchPath(typeof queryValue === 'string' ? queryValue : ''));
  }

  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="商业航天情报站首页">
        <Rocket size={26} aria-hidden="true" />
        <span>商业航天情报</span>
      </Link>
      <form action="/articles" className="command-search" role="search" onSubmit={handleSearchSubmit}>
        <Search size={16} aria-hidden="true" />
        <input name="query" placeholder="搜索公司、发射、政策、地方" />
      </form>
      <button className="command-button" type="button" onClick={() => setSearchOpen(true)}>
        <Search size={16} aria-hidden="true" />
        搜索
      </button>
      <CommandMenu.Dialog open={searchOpen} onOpenChange={handleSearchOpenChange} label="站内搜索" className="command-palette">
        <div className="command-palette__input">
          <Search size={16} aria-hidden="true" />
          <CommandMenu.Input autoFocus value={commandQuery} onValueChange={setCommandQuery} placeholder="输入公司、政策、可回收火箭..." />
        </div>
        <CommandMenu.List>
          <CommandMenu.Empty>没有匹配结果</CommandMenu.Empty>
          {searchPath ? (
            <CommandMenu.Group heading="搜索">
              <CommandMenu.Item value={`搜索 ${searchLabel}`} onSelect={() => runCommand(searchPath)}>
                <Search size={16} aria-hidden="true" />
                <span>搜索 {searchLabel}</span>
              </CommandMenu.Item>
            </CommandMenu.Group>
          ) : null}
          {['频道', '公司', '专题'].map((group) => (
            <CommandMenu.Group key={group} heading={group}>
              {commands.filter((command) => command.group === group).map(({ label, to, icon: Icon }) => (
                <CommandMenu.Item key={`${group}-${to}`} value={`${group} ${label}`} onSelect={() => runCommand(to)}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </CommandMenu.Item>
              ))}
            </CommandMenu.Group>
          ))}
        </CommandMenu.List>
      </CommandMenu.Dialog>
    </header>
  );
}
