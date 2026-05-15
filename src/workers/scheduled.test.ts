import { describe, expect, it, vi } from 'vitest';
import { runSpaceIntelScheduled } from './scheduled';

vi.mock('../ingestion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ingestion')>();

  return {
    ...actual,
    runScheduledIngestion: vi.fn(async (input) => ({ kind: input.kind })),
  };
});

describe('scheduled Worker', () => {
  it('maps hourly cron events to hourly ingestion', async () => {
    const result = await runSpaceIntelScheduled('0 * * * *', { DB: {} as D1Database });

    expect(result).toEqual({ kind: 'hourly' });
  });

  it('maps the daily cron event to daily curation sync', async () => {
    const result = await runSpaceIntelScheduled('15 18 * * *', { DB: {} as D1Database });

    expect(result).toEqual({ kind: 'daily' });
  });
});
