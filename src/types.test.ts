import { describe, expect, it } from 'vitest';
import type { ApiLaunchListResult } from './types';

describe('API response types', () => {
  it('keeps launch list pagination metadata in the public type', () => {
    const response = {
      items: [],
      page: 1,
      limit: 20,
      hasMore: false,
    } satisfies ApiLaunchListResult;

    expect(response.page).toBe(1);
    expect(response.limit).toBe(20);
  });
});
