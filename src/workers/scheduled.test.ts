import { describe, expect, it, vi } from 'vitest';
import worker, { runSpaceIntelScheduled, sourceCron } from './scheduled';
import { runScheduledIngestion, parseSourcesConfig } from '../ingestion';
import sourcesConfig from '../../config/sources.generated.json';

vi.mock('../ingestion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ingestion')>();

  return {
    ...actual,
    runScheduledIngestion: vi.fn(async (input) => ({ kind: input.kind })),
  };
});

describe('scheduled Worker', () => {
  it('reports source failures even when the platform invocation resolves successfully', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const waitUntil = vi.fn();
    vi.mocked(runScheduledIngestion).mockResolvedValueOnce({
      kind: 'hourly', durationMs: 20, successSourceCount: 0, failedSourceCount: 1,
      sourceRuns: [{ sourceKey: 'snapi', collected: 0, inserted: 0, skipped: 0, failures: 1 }],
      maintenance: null, catalogSync: null, curationsInserted: 0, entityLinks: null,
    });
    try {
      await worker.scheduled({ cron: sourceCron, scheduledTime: Date.parse('2026-11-14T00:00:00Z') } as ScheduledController,
        { DB: {} as D1Database }, { waitUntil } as unknown as ExecutionContext);
      await waitUntil.mock.calls[0][0];
      expect(log).toHaveBeenCalledWith(expect.objectContaining({
        event: 'space_intel_ingestion', failedSources: 1,
        sources: [{ sourceKey: 'snapi', failures: 1, written: 0 }],
      }));
    } finally { log.mockRestore(); }
  });

  it('rejects HTTP probes without throwing or triggering ingestion', async () => {
    vi.mocked(runScheduledIngestion).mockClear();
    const response = await worker.fetch();
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Not Found');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(runScheduledIngestion).not.toHaveBeenCalled();
  });

  it('rotates all enabled sources exactly once without sharing invocation budgets', async () => {
    const enabled = parseSourcesConfig(sourcesConfig).filter((source) => source.enabled);
    const seen = new Set<string>();
    const firstMinute = Date.parse('2026-11-14T00:00:00Z');
    for (let i = 0; i < enabled.length; i += 1) {
      await runSpaceIntelScheduled(sourceCron, { DB: {} as D1Database }, firstMinute + i * 60_000);
      const input = vi.mocked(runScheduledIngestion).mock.calls.at(-1)?.[0];
      expect(input?.sources).toHaveLength(1);
      expect(input?.kind).toBe('hourly');
      seen.add(input!.sources[0].key);
      expect(input?.runMaintenance).toBe(i % 60 === 0);
    }
    expect([...seen].sort()).toEqual(enabled.map((source) => source.key).sort());
  });

  it('uses the scheduled event minute rather than delivery time', async () => {
    const eventTime = Date.parse('2026-11-14T01:13:00Z');
    await runSpaceIntelScheduled(sourceCron, { DB: {} as D1Database }, eventTime);
    const firstSource = vi.mocked(runScheduledIngestion).mock.calls.at(-1)?.[0].sources[0].key;
    await runSpaceIntelScheduled(sourceCron, { DB: {} as D1Database }, eventTime + 59_999);
    expect(vi.mocked(runScheduledIngestion).mock.calls.at(-1)?.[0].sources[0].key).toBe(firstSource);
  });

  it('rejects missing event times and unknown schedules rather than running the full workload', async () => {
    await expect(runSpaceIntelScheduled(sourceCron, { DB: {} as D1Database })).rejects.toThrow('scheduled time');
    await expect(runSpaceIntelScheduled(sourceCron, { DB: {} as D1Database }, NaN)).rejects.toThrow('scheduled time');
    await expect(runSpaceIntelScheduled('*/2 * * * *', { DB: {} as D1Database }, Date.now())).rejects.toThrow('Unsupported');
  });

  it('maps hourly cron events to hourly ingestion', async () => {
    const result = await runSpaceIntelScheduled('0 * * * *', { DB: {} as D1Database });

    expect(result).toEqual({ kind: 'hourly' });
  });

  it('maps the daily cron event to daily curation sync', async () => {
    const result = await runSpaceIntelScheduled('15 18 * * *', { DB: {} as D1Database });

    expect(result).toEqual({ kind: 'daily' });
  });
});
