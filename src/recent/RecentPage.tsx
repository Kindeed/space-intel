import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Building2, Globe2, Radio, RefreshCw, Rocket, Search, SlidersHorizontal } from 'lucide-react';
import { filterRecentItems } from './snapshot';
import { recentSnapshotSchema, type RecentSnapshot } from './types';
import './recent.css';

const labels = { news: '新闻动态', policy: '政策公告', company: '企业动态', procurement: '采购公告', approval:'报批公示' };
const stageLabels={planning_notice:'规划公示',eia_notice:'环评受理／公示',eia_approved:'环评批复',land_notice:'用地／选址信息',tender:'招采公告',award_candidate:'中标候选人公示',award:'中标／成交',construction_update:'建设动态',operational_update:'运行／任务动态',withdrawn:'终止／撤销信息'};
const dateLabel = (value: string, dateOnly = false) => new Intl.DateTimeFormat('zh-CN', { month:'2-digit',day:'2-digit',...(dateOnly?{}:{hour:'2-digit',minute:'2-digit'}),hour12:false,timeZone:'Asia/Shanghai' }).format(new Date(value));

export function RecentPage() {
  const [params, setParams] = useSearchParams();
  const [snapshot, setSnapshot] = useState<RecentSnapshot>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState(params.get('q') || '');
  const view = params.get('view') || 'feed';
  const region = params.get('region') || 'cn';
  const days = [1,7,30].includes(Number(params.get('days'))) ? Number(params.get('days')) : 7;
  const province = region === 'global' ? '' : params.get('province') || '';
  const company = params.get('company') || '';
  const category = params.get('category') || '';
  const focus=params.get('focus')||'';
  const facility=params.get('facility')||'';
  const visibleLimit=Math.min(2000,Math.max(100,Number(params.get('limit'))||100));
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    fetch('/recent/current.json', {signal:abort.signal, cache:'no-cache'})
      .then((response) => { if (!response.ok) throw new Error('unavailable'); return response.json(); })
      .then((value) => { setSnapshot(recentSnapshotSchema.parse(value)); setError(false); })
      .catch(() => { if (!abort.signal.aborted) setError(true); });
    return () => abort.abort();
  }, [attempt]);

  function update(values: Record<string,string>) {
    const next = new URLSearchParams(params);
    for (const [key,value] of Object.entries(values)) { if(value) next.set(key,value); else next.delete(key); }
    setParams(next);
  }
  const filters = {region,province,company,category,days,focus,facility,query:params.get('q') || ''};
  const items = snapshot ? filterRecentItems(snapshot,filters,now) : [];
  const windowItems = snapshot ? filterRecentItems(snapshot,{days:30},now) : [];
  const cnItems = windowItems.filter((item)=>item.region==='cn');
  const companyMap = new Map(snapshot?.companies.map((item)=>[item.id,item.name]));
  const selectedSources = snapshot?.sources.filter((source)=>source.selected) || [];
  const updated = snapshot?.lastCheckedAt || snapshot?.lastDataUpdatedAt;
  const delayed = !updated || now.getTime()-Date.parse(updated) > 86_400_000;
  const visibleProvinces = snapshot?.provinces || [];
  const companyOptions = snapshot?.companies.filter((entry) =>
    windowItems.some((item)=>item.companyIds.includes(entry.id)) || selectedSources.some((source)=>source.companyIds.includes(entry.id)),
  ).sort((a,b) => Number(b.country==='China')-Number(a.country==='China') || a.name.localeCompare(b.name,'zh-CN')) || [];

  return <div className="recent-app">
    <header className="recent-header">
      <Link to="/recent" className="recent-brand"><Rocket size={24}/><strong>航天信息</strong><span>近期资讯</span></Link>
      <nav aria-label="近期资讯导航">
        {([['feed','近期资讯'],['companies','公司'],['projects','发射场与项目'],['sources','来源目录']] as const).map(([id,label]) =>
          <button type="button" key={id} className={view===id?'is-active':''} onClick={()=>update({view:id})}>{label}</button>)}
      </nav>
      <span className="recent-preview">预览版</span>
    </header>

    <section className="recent-intro">
      <div><div className="recent-eyebrow"><Radio size={14}/> COMMERCIAL SPACE</div>
        <h1>关注商业航天的<span>下一步。</span></h1>
        <p>政策、项目与公司动态，按地区和公司一起看。</p>
      </div>
      <div className="recent-update"><span className={delayed?'status-dot is-delayed':'status-dot'}/>
        <div><strong>{updated?`最近检查 ${dateLabel(updated)}`:'等待本次更新'}</strong>
          <small>{updated?(delayed?'更新有延迟，以下为已有资讯':'点击标题，前往原发布方阅读'):'近期资讯正在准备中'}</small></div>
        <button type="button" aria-label="刷新近期资讯" onClick={()=>setAttempt((value)=>value+1)}><RefreshCw size={17}/></button>
      </div>
    </section>

    <div className="recent-metrics" aria-label="近期资讯概况">
      <div><span>近 30 天资讯</span><strong>{windowItems.length}<small>条</small></strong></div>
      <div><span>国内动态</span><strong>{cnItems.length}<small>条</small></strong></div>
      <div><span>涉及省级地区</span><strong>{new Set(cnItems.flatMap((item)=>item.provinces).filter((id)=>!['全国','未明确'].includes(id))).size}<small>个</small></strong></div>
      <div><span>跟踪来源</span><strong>{selectedSources.length}<small>个</small></strong></div>
    </div>

    {error && <div className="recent-notice" role="alert">暂时无法取得最新资讯。{snapshot?'已有内容仍可查看。':'请稍后重试。'}<button type="button" onClick={()=>setAttempt((value)=>value+1)}>重新加载</button></div>}
    {!snapshot && !error && <div className="recent-empty" role="status">正在载入近期资讯…</div>}

    {snapshot && view==='feed' && <div className="recent-layout">
      <aside className="recent-sidebar">
        <div className="recent-section-label"><Globe2 size={15}/>国内地区</div>
        <div className="recent-provinces" aria-label="省份筛选">
          <button type="button" className={!province?'is-active':''} onClick={()=>update({province:'',region:'cn'})}>全部地区<span>{cnItems.length}</span></button>
          {visibleProvinces.map((entry)=>{
            const count=cnItems.filter((item)=>item.provinces.includes(entry.id)).length;
            return <button key={entry.id} type="button" className={province===entry.id?'is-active':''} onClick={()=>update({province:entry.id,region:'cn'})}>
              {entry.name}<span>{count || '—'}</span></button>;
          })}
        </div>
        <p className="recent-sidebar-note">按政策适用地区或新闻中的项目地点归类。未明确地区的内容单独列出。</p>
      </aside>

      <section className="recent-feed" aria-label="资讯列表">
        <div className="recent-feed-top"><div className="recent-tabs" aria-label="国内外筛选">
          {([['cn','国内'],['global','国外'],['all','全部']] as const).map(([id,label])=>
            <button key={id} type="button" className={region===id?'is-active':''} onClick={()=>update({region:id,province:'',company:''})}>{label}</button>)}
        </div><div className="recent-days" aria-label="时间范围">
          {([1,7,30] as const).map((value)=><button type="button" key={value} className={days===value?'is-active':''} onClick={()=>update({days:String(value)})}>{value===1?'24 小时':`${value} 天`}</button>)}
        </div></div>
        <form className="recent-filters" onSubmit={(event)=>{event.preventDefault();update({q:query});}}>
          <label><Building2 size={15}/><select aria-label="公司筛选" value={company} onChange={(event)=>update({company:event.target.value})}>
            <option value="">全部公司</option>{companyOptions.map((entry)=><option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select></label>
          <label><SlidersHorizontal size={15}/><select aria-label="内容类型" value={category} onChange={(event)=>update({category:event.target.value})}>
            <option value="">全部类型</option>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select></label>
          <label className="recent-search"><Search size={15}/><input aria-label="搜索近期资讯" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="搜索标题、来源或公司"/><button type="submit">搜索</button></label>
        </form>
        <div className="recent-focus" aria-label="关注领域">
          {([['','全部领域'],['spaceport','发射场／建设项目'],['ttc','遥测／测运控']] as const).map(([id,label])=><button type="button" key={id} className={focus===id?'is-active':''} onClick={()=>update({focus:id,facility:''})}>{label}</button>)}
          {facility&&<span>{snapshot.facilities.find((entry)=>entry.id===facility)?.name}</span>}
        </div>
        <div className="recent-results"><span>{province || (region==='cn'?'国内动态':region==='global'?'国外动态':'全部动态')}{company?` · ${companyMap.get(company) || company}`:''}{params.get('q')?` · 搜索：${params.get('q')}`:''}{category?` · ${labels[category as keyof typeof labels]||category}`:''}</span>
          <span>{items.length} 条{(province||company||category||focus||facility||params.get('q')) && <button type="button" onClick={()=>{setQuery('');update({province:'',company:'',category:'',q:'',focus:'',facility:''});}}>清除筛选</button>}</span></div>
        {snapshot.truncated && <p className="recent-notice">已保留最新 {snapshot.items.length} 条资讯，实际覆盖自 {snapshot.coverageStart?dateLabel(snapshot.coverageStart):'本次更新'} 起。</p>}
        {!items.length && <div className="recent-empty"><Search size={28}/><h2>这个范围暂时没有近期资讯</h2><p>可以换一个地区、公司，或查看最近 30 天。</p>
          <button type="button" onClick={()=>{setQuery('');update({days:'30',province:'',company:'',category:'',q:'',focus:'',facility:''});}}>查看近 30 天动态</button></div>}
        <div className="recent-cards">{items.slice(0,visibleLimit).map((item)=><article className="recent-card" key={item.id}>
          <div className="recent-card-meta"><span className={`recent-category category-${item.category}`}>{labels[item.category]}</span><span>{item.publisher}</span><time dateTime={item.publishedAt}>{dateLabel(item.publishedAt,item.datePrecision==='date')}</time></div>
          <a className="recent-card-title" href={item.url} target="_blank" rel="noreferrer"><h2>{item.title}</h2><ArrowUpRight size={19}/></a>
          {item.summary && <p>{item.summary}</p>}
          <div className="recent-tags">{item.provinces.filter((id)=>id!=='未明确').map((id)=><button type="button" key={id} onClick={()=>update({province:id,region:'cn'})}>{id}</button>)}
            {item.accessLimited&&<span>原文访问可能受限</span>}
            {item.milestone&&<span className="recent-stage">{stageLabels[item.milestone]}</span>}
            {item.focus.includes('ttc')&&<span>遥测／测运控</span>}
            {item.companyIds.map((id)=><button type="button" key={id} onClick={()=>update({company:id})}>{companyMap.get(id) || id}</button>)}
            {item.sourceIds.length>1 && <span>{item.sourceIds.length} 个来源</span>}</div>
        </article>)}</div>
        {items.length>visibleLimit && <div className="recent-footnote"><button type="button" className="recent-more" onClick={()=>update({limit:String(visibleLimit+100)})}>加载更多 · 已显示 {visibleLimit} / {items.length} 条</button></div>}
      </section>
    </div>}

    {snapshot && view==='companies' && <section className="recent-directory"><div className="recent-directory-heading"><h2>公司动态</h2><span>按公司查看近 30 天资讯</span></div>
      <div className="recent-company-grid">{companyOptions.map((entry)=>{
        const count=windowItems.filter((item)=>item.companyIds.includes(entry.id)).length;
        return <button type="button" key={entry.id} onClick={()=>update({view:'feed',company:entry.id,province:'',region:entry.country==='China'?'cn':'global',days:'30'})}>
          <Building2 size={21}/><strong>{entry.name}</strong><span>{entry.country==='China'?'中国':'国外'} · {count} 条近期动态</span><ArrowUpRight size={17}/></button>;
      })}</div></section>}

    {snapshot&&view==='projects'&&<section className="recent-directory"><div className="recent-directory-heading"><h2>发射场与项目</h2><span>规划、报批、招采与建设进展</span></div>
      <p className="recent-project-note">跟踪对象与配套项目分开列出。公示、受理与批复分别标注，具体进展以原始公告为准。</p>
      <div className="recent-project-grid">{snapshot.facilities.map((entry)=>{
        const related=windowItems.filter((item)=>item.facilityIds.includes(entry.id));
        const latest=related[0];
        return <article className="recent-source" key={entry.id}><div><strong>{entry.name}</strong><span className="recent-preview">{entry.province}</span></div>
          <p>{entry.kind}</p><small>{latest?`${dateLabel(latest.publishedAt,true)} · ${latest.milestone?stageLabels[latest.milestone]:'近期动态'}`:'本轮暂无可确认的近期公告'}</small>
          <div className="recent-project-actions"><button type="button" onClick={()=>update({view:'feed',region:'cn',province:'',company:'',category:'',q:'',focus:'spaceport',facility:entry.id,days:'30'})}>查看近期信息 · {related.length}</button>
          {entry.sourceUrls.slice(0,2).map((url,index)=><a href={url} key={url} target="_blank" rel="noreferrer">{index?'相关部门':'官方入口'}<ArrowUpRight size={12}/></a>)}</div>
        </article>;
      })}</div></section>}

    {snapshot && view==='sources' && <section className="recent-directory"><div className="recent-directory-heading"><h2>来源目录</h2><span>官方、公司与专业媒体</span></div>
      <div className="recent-source-grid">{snapshot.sources.map((source)=><article className="recent-source" key={source.id}>
        <div><a href={source.url} target="_blank" rel="noreferrer">{source.name}<ArrowUpRight size={15}/></a><span className={`recent-source-status ${source.status==='error'?'is-delayed':''}`}>{source.status==='directory'?'来源入口':source.errorCategory==='budget'?'本轮延后':source.status==='error'?'暂时不可用':source.status==='empty'?'待核验':source.recentCount?'有近期动态':'近期暂无更新'}</span></div>
        <p>{source.publisherRegion || (source.region==='cn'?'国内':'国外')} · {labels[source.category]}</p>
        <small>{source.lastSuccessAt?`上次成功 ${dateLabel(source.lastSuccessAt)}`:'尚未确认成功更新'} · 本轮 {source.recentCount} 条近期资讯</small>
      </article>)}</div></section>}

    <footer className="recent-footer"><span>航天信息 · 关注近期发展</span><span>最多保留 30 天资讯 · 原文由发布方提供</span></footer>
  </div>;
}
