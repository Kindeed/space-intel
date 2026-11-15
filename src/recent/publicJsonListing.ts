import {z} from 'zod';
import type {SourceCollector,NormalizedItem} from '../ingestion/types';
import {extractDate} from '../ingestion/htmlList';
import {isRecentDate} from './snapshot';
import {normalizeHttpUrl} from '../config/url';

const listingSchema=z.object({success:z.literal(true),list:z.array(z.object({
  infoid:z.string().regex(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i),
  title:z.string().min(1),updatetime:z.string(),classname:z.string(),
})).max(20_000)});

function nuxtNews(html:string){
  const script=html.match(/<script\b(?=[^>]*\bid\s*=\s*["']__NUXT_DATA__["'])(?=[^>]*\btype\s*=\s*["']application\/json["'])[^>]*>([\s\S]*?)<\/script\s*>/i);
  if(!script)throw new Error('parse_missing_public_news_data');
  let data:unknown;
  try{data=JSON.parse(script[1]);}catch{throw new Error('parse_invalid_public_news_data');}
  if(!Array.isArray(data)||data.length>50_000)throw new Error('parse_invalid_public_news_data');
  const values:unknown[]=data;
  const reference=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<values.length?values[value]:undefined;
  const records=[];
  for(const entry of values){
    if(!entry||typeof entry!=='object'||Array.isArray(entry))continue;
    const row=entry as Record<string,unknown>;
    const id=reference(row.id),title=reference(row.chTitle),published=reference(row.releaseTime);
    if(typeof id!=='number'||!Number.isSafeInteger(id)||id<=0||typeof title!=='string'||typeof published!=='string')continue;
    // Ignore updateTime, full article content, images and every unrelated field.
    records.push({infoid:String(id),title,updatetime:published,classname:''});
  }
  return records;
}

// Static public JSON is explicitly linked by the government's public list page.
// It is neither an authenticated endpoint nor a replacement publication date.
export const publicJsonListingCollector:SourceCollector={
  type:'official_page',
  async collect(source,context){
    const prefix=source.recent?.article_url_prefix;
    if(!prefix||!normalizeHttpUrl(prefix))throw new Error('parse_invalid_article_prefix');
    const nuxt=source.recent?.format==='nuxt_news';
    const response=await context.fetch(source.url,{headers:{accept:nuxt?'text/html, application/xhtml+xml':'application/json','user-agent':'SpaceIntelBot/1.0 (+https://space.bytebaud.com)'}});
    if(!response.ok)throw new Error(`Public list failed with HTTP ${response.status}`);
    let rows;
    if(nuxt)rows=nuxtNews(await response.text());
    else{
      const parsed=listingSchema.safeParse(await response.json());
      if(!parsed.success)throw new Error('parse_invalid_public_listing');
      rows=parsed.data.list;
    }
    const dated=rows.map(row=>({row,date:extractDate(row.updatetime)})).filter(entry=>entry.date);
    context.observeListing?.({links:rows.length,datedLinks:dated.length});
    const items:NormalizedItem[]=[];
    for(const {row,date} of dated){
      if(!isRecentDate(date!,context.now()))continue;
      const text=`${row.title} ${row.classname}`;
      if(!(source.include_terms??[]).some(term=>text.includes(term)))continue;
      const url=normalizeHttpUrl(`${prefix}${encodeURIComponent(row.infoid)}`);
      if(!url)continue;
      items.push({sourceKey:source.key,sourceName:source.name,publisherName:source.name,title:row.title,
        summary:row.classname,url,publishedAt:date!,language:'zh',region:source.region,
        rawId:row.infoid,relatedLaunchIds:[],companies:source.default_companies??[],tags:source.default_tags??[]});
      if(items.length>=(source.max_items??30))break;
    }
    return items;
  },
};
