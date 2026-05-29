import { describe, expect, it } from 'vitest';
import { missionNav, primaryNav, secondaryNav } from './constants';

describe('navigation constants', () => {
  it('keeps the primary navigation to four destinations', () => {
    expect(primaryNav.map((item) => item.label)).toEqual(['总览', '情报流', '发射', '资本']);
  });

  it('keeps index destinations available outside the mobile tab bar', () => {
    expect(secondaryNav.map((item) => item.label)).toEqual(['公司', '专题']);
    expect(missionNav.map((item) => item.label)).toEqual(['总览', '情报流', '发射', '资本', '公司', '专题']);
  });
});
