import {describe,it,expect} from 'vitest';
import type {RecentSource} from './types';
import {priorSourceState} from './sourceState';
const old={url:'https://example.gov.cn/old',errorCategory:'timeout',transport:'direct',nextAttemptAt:'2026-11-16T00:00:00Z'} as RecentSource;
describe('source collection path state',()=>{
  it('rechecks a changed column or a repaired connection path',()=>{
    expect(priorSourceState(old,'https://example.gov.cn/new','direct')).toBeUndefined();
    expect(priorSourceState(old,old.url,'preview')).toBeUndefined();
    expect(priorSourceState(old,old.url,'direct')).toBe(old);
  });
  it('preserves rate limits and explicit HTTP restrictions',()=>{
    const limited={...old,errorCategory:'rate_limited' as const};
    expect(priorSourceState(limited,old.url,'preview')).toBe(limited);
    expect(priorSourceState(limited,'https://example.gov.cn/new','preview')).toBe(limited);
    const forbidden={...old,errorCategory:'http_error' as const};
    expect(priorSourceState(forbidden,old.url,'preview')).toBe(forbidden);
  });
});
