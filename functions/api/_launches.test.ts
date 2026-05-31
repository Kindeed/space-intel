import { describe, expect, it } from 'vitest';
import { publicLaunch, publicLaunchListResult, publicLaunchStatusFilter } from './_launches';
import type { LaunchRow } from '../../src/db/launchQueries';

const launch: LaunchRow = {
  id: 7,
  externalId: 'll2-demo',
  mission: 'Demo launch',
  rocket: 'Long March 8',
  provider: 'CASC',
  windowStart: '2026-06-01T02:30:00Z',
  site: 'Wenchang',
  status: 'Go',
  rawUrl: 'https://example.com/launch',
};

describe('public launch serializers', () => {
  it('renames raw launch URLs to a public source URL field', () => {
    const result = publicLaunch(launch);

    expect(result).toMatchObject({
      id: 7,
      mission: 'Demo launch',
      statusLabel: '准备发射',
      sourceUrl: 'https://example.com/launch',
    });
    expect('status' in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain('rawUrl');
  });

  it('renames raw launch URLs in list results', () => {
    const result = publicLaunchListResult({
      items: [launch],
      page: 1,
      limit: 20,
      hasMore: false,
    });

    expect(result.items).toEqual([publicLaunch(launch)]);
    expect(result.page).toBe(1);
    expect(JSON.stringify(result)).not.toContain('rawUrl');
  });

  it('normalizes blank and padded public launch fields', () => {
    const result = publicLaunch({
      ...launch,
      externalId: ' ll2-demo ',
      mission: ' Demo   launch ',
      rocket: ' Electron\trocket ',
      provider: ' Rocket\nLab ',
      windowStart: ' 2026-05-31T00:00:00Z ',
      site: ' Launch   Complex 1 ',
      status: ' Go ',
      rawUrl: '   ',
    });

    expect(result).toMatchObject({
      externalId: 'll2-demo',
      mission: 'Demo launch',
      rocket: 'Electron rocket',
      provider: 'Rocket Lab',
      windowStart: '2026-05-31T00:00:00Z',
      site: 'Launch Complex 1',
      statusLabel: '准备发射',
      sourceUrl: null,
    });
  });

  it('returns null for unsafe or blank public launch source URLs', () => {
    expect(publicLaunch({ ...launch, rawUrl: 'javascript:alert(1)' }).sourceUrl).toBeNull();
    expect(publicLaunch({ ...launch, rawUrl: 'data:text/html,hi' }).sourceUrl).toBeNull();
    expect(publicLaunch({ ...launch, rawUrl: 'https://user:pass@example.com/launch' }).sourceUrl).toBeNull();
    expect(publicLaunch({ ...launch, rawUrl: '   ' }).sourceUrl).toBeNull();
  });

  it('uses Chinese public status labels for tentative and unknown launch statuses', () => {
    expect(publicLaunch({ ...launch, status: 'TBD' }).statusLabel).toBe('待确认');
    expect(publicLaunch({ ...launch, status: 'No Go' }).statusLabel).toBe('等待窗口');
    expect(publicLaunch({ ...launch, status: 'No   Go' }).statusLabel).toBe('等待窗口');
    expect(publicLaunch({ ...launch, status: '发射成功' }).statusLabel).toBe('发射成功');
    expect(publicLaunch({ ...launch, status: '发射   成功' }).statusLabel).toBe('发射成功');
    expect(publicLaunch({ ...launch, status: '失败' }).statusLabel).toBe('发射异常');
    expect(publicLaunch({ ...launch, status: '等待' }).statusLabel).toBe('等待窗口');
    expect(publicLaunch({ ...launch, status: '待确认' }).statusLabel).toBe('待确认');
    expect(publicLaunch({ ...launch, status: '任务评审' }).statusLabel).toBe('任务评审');
    expect(publicLaunch({ ...launch, status: 'ongoing' }).statusLabel).toBe('状态待定');
    expect(publicLaunch({ ...launch, status: 'Unsuccessful' }).statusLabel).toBe('发射异常');
    expect(publicLaunch({ ...launch, status: '不成功' }).statusLabel).toBe('发射异常');
    expect(publicLaunch({ ...launch, status: '不   成功' }).statusLabel).toBe('发射异常');
    expect(publicLaunch({ ...launch, status: 'Mystery upstream status' }).statusLabel).toBe('状态待定');
    expect(publicLaunch({ ...launch, status: '   ' }).statusLabel).toBe('状态待定');
  });

  it('uses a Chinese fallback for blank launch mission names', () => {
    const result = publicLaunch({
      ...launch,
      mission: '   ',
    });

    expect(result.mission).toBe('发射任务 #7');
  });

  it('normalizes public Chinese launch status filters to raw status keywords', () => {
    expect(publicLaunchStatusFilter(' 准备发射 ')).toBe('go');
    expect(publicLaunchStatusFilter('准备   发射')).toBe('go');
    expect(publicLaunchStatusFilter('等待窗口')).toBe('hold');
    expect(publicLaunchStatusFilter('发射成功')).toBe('success');
    expect(publicLaunchStatusFilter('发射   成功')).toBe('success');
    expect(publicLaunchStatusFilter('任务评审')).toBe('review');
    expect(publicLaunchStatusFilter('待确认')).toBe('confirm');
    expect(publicLaunchStatusFilter('发射异常')).toBe('fail');
    expect(publicLaunchStatusFilter('Go')).toBe('go');
    expect(publicLaunchStatusFilter('No Go')).toBe('hold');
    expect(publicLaunchStatusFilter('No   Go')).toBe('hold');
    expect(publicLaunchStatusFilter('ongoing')).toBe('ongoing');
    expect(publicLaunchStatusFilter('Unsuccessful')).toBe('fail');
    expect(publicLaunchStatusFilter('不成功')).toBe('fail');
    expect(publicLaunchStatusFilter('不   成功')).toBe('fail');
    expect(publicLaunchStatusFilter(undefined)).toBeUndefined();
  });
});
