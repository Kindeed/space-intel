import {describe,expect,it} from 'vitest';
import {officialPageCollector} from '../ingestion/collectors/officialPage';
import type {SourceConfig} from '../ingestion/types';
import {expandPublicListingData} from './htmlData';
import {milestoneFromTitle} from './snapshot';

describe('public approval listings',()=>{
  it('extracts a dated public XML record without executing or exposing executable scripts',async()=>{
    const source:SourceConfig={key:'approval',name:'生态环境公告',url:'https://example.gov.cn/list',type:'official_page',region:'cn',credibility:5,enabled:false,
      purpose:'环评',expected_content:'项目公示',risk_notes:'公开列表',dedupe_strategy:'canonical_url_title',include_terms:['航天'],exclude_terms:[]};
    const html='<script type="text/xml"><record><![CDATA[<li><a href="/202611/t20261112_123.html">商业航天发射场环境影响报告书拟审批公示</a><span>2026-11-12</span></li>]]></record></script><script><a href="/fake.html">虚假的商业航天新闻 2026-11-13</a></script>';
    const items=await officialPageCollector.collect(source,{now:()=>new Date('2026-11-14'),fetch:(async()=>new Response(html)) as typeof fetch,transformHtml:expandPublicListingData});
    expect(items).toHaveLength(1);
    expect(items[0].publishedAt).toBe('2026-11-12T00:00:00Z');
    expect(items[0].url).not.toContain('fake');
  });
  it('distinguishes approval intent, approval, procurement and construction notices',()=>{
    expect(milestoneFromTitle('商业发射场环评拟批复公示')).toBe('eia_notice');
    expect(milestoneFromTitle('商业发射场环境影响报告书批复公示')).toBe('eia_approved');
    expect(milestoneFromTitle('商业发射场建设工程招标公告')).toBe('tender');
    expect(milestoneFromTitle('商业发射场建设工程中标公告')).toBe('award');
    expect(milestoneFromTitle('商业发射场项目取消招标公告')).toBe('withdrawn');
  });
});
