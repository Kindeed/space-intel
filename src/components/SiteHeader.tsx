import { Command as CommandMenu } from 'cmdk';
import { Command as CommandIcon, Rocket, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companies, slugify, topicWatch, trendTags } from '../data';
import { missionNav } from '../constants';

export function SiteHeader() {
  const [commandOpen, setCommandOpen] = useState(false);
  const navigate = useNavigate();
  const commands = useMemo(
    () => [
      ...missionNav.map(({ label, to, icon }) => ({ label, to, icon, group: '频道' })),
      ...companies.map((company) => ({ label: company, to: `/companies/${slugify(company)}`, icon: Rocket, group: '公司' })),
      ...topicWatch.map((topic) => ({ label: topic.title, to: `/topics/${topic.slug}`, icon: Search, group: '专题' })),
      ...trendTags.map((tag) => ({ label: tag, to: `/topics/${slugify(tag)}`, icon: Search, group: '热词' })),
    ],
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function runCommand(to: string) {
    setCommandOpen(false);
    navigate(to);
  }

  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="商业航天情报站首页">
        <Rocket size={26} aria-hidden="true" />
        <span>Space Intel</span>
      </Link>
      <form action="/articles" className="command-search" role="search">
        <Search size={16} aria-hidden="true" />
        <input name="query" placeholder="搜索公司、发射、政策、资本线索" />
        <kbd>Ctrl K</kbd>
      </form>
      <button className="command-button" type="button" onClick={() => setCommandOpen(true)}>
        <CommandIcon size={16} aria-hidden="true" />
        指挥台
      </button>
      <CommandMenu.Dialog open={commandOpen} onOpenChange={setCommandOpen} label="Space Intel Command" className="command-palette">
        <div className="command-palette__input">
          <Search size={16} aria-hidden="true" />
          <CommandMenu.Input autoFocus placeholder="输入 SpaceX、融资、可回收火箭..." />
        </div>
        <CommandMenu.List>
          <CommandMenu.Empty>没有匹配的命令</CommandMenu.Empty>
          {['频道', '公司', '专题', '热词'].map((group) => (
            <CommandMenu.Group key={group} heading={group}>
              {commands.filter((command) => command.group === group).map(({ label, to, icon: Icon }) => (
                <CommandMenu.Item key={`${group}-${label}`} value={`${group} ${label}`} onSelect={() => runCommand(to)}>
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
