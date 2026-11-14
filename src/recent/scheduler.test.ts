import {describe,expect,it} from 'vitest';
import {reserveBudget,releaseUnused,retryAt,scheduleSlot,sourceDue} from './scheduler';
import type {SourceConfig} from '../ingestion/types';
import type {RecentSource} from './types';

const now=new Date('2026-11-14T10:17:00Z');
const source={recent:{candidate:true,category:'policy'}} as SourceConfig;
const previous={checkedSlot:'2026-11-14:4'} as RecentSource;
describe('preview scheduler and budget',()=>{
  it('shares a 600-request daily cap with manual runs and preserves reservations on interruption',()=>{
    let control=reserveBudget(undefined,now,'one').control;
    for(const id of ['two','three','four'])control=reserveBudget(control,now,id).control;
    expect(control.reserved).toBe(600);
    expect(reserveBudget(control,now,'manual').budget).toBe(0);
    expect(reserveBudget(control,new Date('2026-11-15T00:17:00Z'),'tomorrow').budget).toBe(150);
  });
  it('releases only unused requests from the matching serialized reservation',()=>{
    const {control,budget}=reserveBudget(undefined,now,'one');
    expect(releaseUnused(control,'one',budget,70).reserved).toBe(70);
    expect(()=>releaseUnused(control,'other',budget,70)).toThrow();
  });
  it('runs policy/approval sources at the two intended slots and news at four slots',()=>{
    expect(scheduleSlot(now)).toBe('2026-11-14:10');
    expect(sourceDue(source,previous,now)).toBe(true);
    expect(sourceDue(source,previous,new Date('2026-11-14T14:17:00Z'))).toBe(false);
    expect(sourceDue({...source,recent:{candidate:true,category:'news'}},previous,new Date('2026-11-14T14:17:00Z'))).toBe(true);
    expect(sourceDue(source,{...previous,checkedSlot:'2026-11-14:10'},now)).toBe(false);
  });
  it('respects Retry-After for seconds and dates, including forced checks',()=>{
    expect(retryAt('3600',now)).toBe('2026-11-14T11:17:00.000Z');
    expect(retryAt('Sat, 14 Nov 2026 12:17:00 GMT',now)).toBe('2026-11-14T12:17:00.000Z');
    expect(sourceDue(source,{...previous,nextAttemptAt:'2026-11-15T00:00:00Z'},now,true)).toBe(false);
  });
  it('retries a locally budget-deferred news source at the next slot without a six-hour upstream backoff',()=>{
    const news={...source,recent:{candidate:true as const,category:'news' as const}};
    const deferred={...previous,status:'error' as const,errorCategory:'budget' as const,checkedSlot:'2026-11-14:0'};
    expect(sourceDue(news,deferred,new Date('2026-11-14T04:17:00Z'))).toBe(true);
  });
});
