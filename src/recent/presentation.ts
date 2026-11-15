import type {RecentSource,RecentItem} from './types';
export function articleSummary(item:Pick<RecentItem,'title'|'summary'|'publisher'>):string{
 const remainder=item.summary.replaceAll(item.title,'').replaceAll(item.publisher,'').replace(/[\s·:：—\-，,。.!！“”"'‘’]/g,'');
 return remainder?item.summary:'';
}
export function directorySources(sources:RecentSource[],query:string,status:string):RecentSource[]{
 const text=query.trim().toLowerCase();
 return sources.filter(source=>(!text||`${source.name} ${source.publisherRegion??''} ${source.url}`.toLowerCase().includes(text))&&
   (status==='all'||(status==='active'?source.selected:status==='error'?source.status==='error':status==='directory'?source.status==='directory':source.status==='ok')));
}
export function recentView(value:string|null):'feed'|'companies'|'projects'|'sources'{
 return value==='companies'||value==='projects'||value==='sources'?value:'feed';
}
