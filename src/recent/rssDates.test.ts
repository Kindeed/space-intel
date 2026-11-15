import { describe, expect, it } from 'vitest';
import { rssCollector } from '../ingestion/collectors/rss';
import {googleNewsRssCollector} from '../ingestion/collectors/googleNewsRss';
import type { SourceConfig } from '../ingestion/types';

describe('strict dates for the recent RSS pilot', () => {
  it.each([rssCollector,googleNewsRssCollector])('skips undated feed items instead of presenting collection time as publication time ($type)', async (collector) => {
    const source: SourceConfig={key:'test',name:'Test',type:collector.type,region:'global',url:'https://example.com/feed',
      credibility:5,enabled:true,purpose:'test',expected_content:'test',risk_notes:'test',dedupe_strategy:'canonical_url_title',strict_dates:true};
    const feed='<rss version="2.0"><channel><title>Test</title><item><title>Undated launch</title><link>https://example.com/one</link></item><item><title>Dated launch</title><link>https://example.com/two</link><pubDate>Thu, 12 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>';
    const items=await collector.collect(source,{now:()=>new Date('2026-11-14T12:00:00Z'),fetch:(async()=>new Response(feed)) as typeof fetch});
    expect(items.map((item)=>item.title)).toEqual(['Dated launch']);
    expect(items[0].publishedAt).toBe('2026-11-12T10:00:00.000Z');
  });
});
