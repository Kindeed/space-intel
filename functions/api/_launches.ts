import type { LaunchListResult, LaunchRow } from '../../src/db/launchQueries';
import { normalizeHttpUrl } from '../../src/config/url';
import { displayLaunchStatus } from '../../src/utils';

export type PublicLaunch = Omit<LaunchRow, 'rawUrl' | 'status'> & {
  statusLabel: string;
  sourceUrl: string | null;
};

export type PublicLaunchListResult = Omit<LaunchListResult, 'items'> & {
  items: PublicLaunch[];
};

const launchStatusFilterAliases: Array<{ patterns: string[]; value: string }> = [
  { patterns: ['发射成功', '成功', 'success'], value: 'success' },
  { patterns: ['准备发射', '准备', 'go'], value: 'go' },
  { patterns: ['待确认', '确认', 'confirm', 'tbc', 'tbd'], value: 'confirm' },
  { patterns: ['任务评审', '评审', 'review'], value: 'review' },
  { patterns: ['等待窗口', '等待', 'hold', 'no go', 'no-go'], value: 'hold' },
  { patterns: ['发射异常', '异常', '失败', '不成功', 'fail', 'unsuccess'], value: 'fail' },
];

function matchesLaunchStatusPattern(normalized: string, pattern: string): boolean {
  const compact = normalized.replace(/\s+/g, '');
  const compactPattern = pattern.replace(/\s+/g, '');

  if (pattern === '成功') {
    return compact.includes('成功') && !compact.includes('不成功');
  }

  if (pattern === 'success') {
    return normalized.includes('success') && !normalized.includes('unsuccess');
  }

  if (pattern === 'go') {
    return !normalized.includes('no go') && !normalized.includes('no-go') && /(^|[^a-z])go([^a-z]|$)/.test(normalized);
  }

  return normalized.includes(pattern) || compact.includes(compactPattern);
}

function trimmedText(value: string): string {
  return value.trim();
}

function normalizedDisplayText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function displayText(value: string, fallback: string): string {
  return normalizedDisplayText(value) || fallback;
}

function trimmedOptionalText(value: string | null): string | null {
  const trimmed = value ? normalizedDisplayText(value) : '';

  return trimmed || null;
}

export function publicLaunchStatusFilter(value: string | undefined): string | undefined {
  const normalized = value ? normalizedDisplayText(value).toLowerCase() : '';

  if (!normalized) {
    return undefined;
  }

  return launchStatusFilterAliases.find((alias) => alias.patterns.some((pattern) => matchesLaunchStatusPattern(normalized, pattern)))?.value ?? normalized;
}

export function publicLaunch(row: LaunchRow): PublicLaunch {
  const { rawUrl, status, ...launch } = row;

  return {
    ...launch,
    externalId: trimmedText(launch.externalId),
    mission: displayText(launch.mission, `发射任务 #${launch.id}`),
    rocket: trimmedOptionalText(launch.rocket),
    provider: trimmedOptionalText(launch.provider),
    site: trimmedOptionalText(launch.site),
    windowStart: trimmedOptionalText(launch.windowStart),
    statusLabel: displayLaunchStatus(trimmedText(status)),
    sourceUrl: normalizeHttpUrl(rawUrl),
  };
}

export function publicLaunchListResult(result: LaunchListResult): PublicLaunchListResult {
  return {
    ...result,
    items: result.items.map(publicLaunch),
  };
}
