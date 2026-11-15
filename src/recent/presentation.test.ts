import {describe,it,expect} from 'vitest';
import {articleSummary,directorySources,recentView} from './presentation';
import type {RecentSource} from './types';
describe('recent reading and directory presentation',()=>{
 it('omits repeated headline/publisher summaries but retains additional information',()=>{
  expect(articleSummary({title:'商业航天项目开工',publisher:'发布方',summary:'商业航天项目开工 发布方'})).toBe('');
  expect(articleSummary({title:'商业航天项目开工',publisher:'发布方',summary:'商业航天项目开工，预计明年投入使用。'})).toContain('明年');
 });
 it('combines directory search with honest source status',()=>{
  const sources=[{name:'海南审批',url:'https://a.gov.cn/',selected:true,status:'error'},{name:'海南政府',url:'https://b.gov.cn/',selected:false,status:'directory'},
   {name:'企业新闻',url:'https://c.example.com/',selected:true,status:'ok'}] as RecentSource[];
  expect(directorySources(sources,'海南','error')).toHaveLength(1);
  expect(directorySources(sources,'','active')).toHaveLength(2);
  expect(directorySources(sources,'海南','directory')[0].name).toBe('海南政府');
 });
 it('falls back to the feed on unknown view links',()=>{
  expect(recentView('missing')).toBe('feed');expect(recentView('projects')).toBe('projects');
 });
});
