import {
  createCollectorRegistry,
  googleNewsRssCollector,
  launchLibraryCollector,
  officialPageCollector,
  rssCollector,
  runLaunchIngestion,
  runSourceIngestion,
  spaceflightNewsCollector,
} from './index';
import { parseCompaniesConfig, parseTopicsConfig } from '../catalog';
import { parseCurationsConfig, parseCurationsYaml } from '../curations/config';
import { closeStaleIngestionLogs, replaceConfiguredCurations, syncConfiguredCatalog, type FullCatalogSyncResult, type SqlDatabase } from '../db';
import { seedMarketItemsFromArticles, type MarketSeedResult } from '../market';
import type { LaunchIngestionResult } from './launchIngestion';
import type { PersistedIngestionResult } from './persistedRun';
import type { CollectorContext, SourceConfig } from './types';

export const sourceIngestionTimeoutMs = 25_000;

export type ScheduledIngestionInput = {
  db: SqlDatabase;
  sources: SourceConfig[];
  companiesConfig?: unknown;
  topicsConfig?: unknown;
  curationsConfig?: unknown;
  curationsYaml?: string;
  context: CollectorContext;
  kind: 'hourly' | 'daily';
  sourceTimeoutMs?: number;
};

export type ScheduledIngestionResult = {
  kind: 'hourly' | 'daily';
  sourceRuns: ScheduledSourceRunResult[];
  curationsInserted: number;
  marketSeed: ScheduledMarketSeedRunResult | null;
  catalogSync: FullCatalogSyncResult | null;
  maintenance: ScheduledMaintenanceResult | null;
  durationMs: number;
  successSourceCount: number;
  failedSourceCount: number;
};

export type FailedArticleIngestionResult = {
  sourceKey: string;
  collected: 0;
  inserted: 0;
  skipped: 0;
  failures: 1;
  error: string;
};

export type FailedLaunchIngestionResult = {
  sourceKey: string;
  collected: 0;
  upserted: 0;
  failures: 1;
  error: string;
};

export type ScheduledSourceRunResult =
  | PersistedIngestionResult
  | LaunchIngestionResult
  | FailedArticleIngestionResult
  | FailedLaunchIngestionResult;

export type ScheduledMarketSeedRunResult =
  | (MarketSeedResult & { failures: 0 })
  | {
      candidates: 0;
      inserted: 0;
      skipped: 0;
      failures: 1;
      error: string;
    };

export type ScheduledMaintenanceResult =
  | {
      staleIngestionLogsClosed: number;
      failures: 0;
    }
  | {
      staleIngestionLogsClosed: 0;
      failures: 1;
      error: string;
    };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function shouldRunLaunchIngestion(now: Date): boolean {
  return now.getUTCHours() % 6 === 0;
}

function concurrencyForSource(source: SourceConfig): number {
  if (source.type === 'rss' || source.type === 'official_page') {
    return 4;
  }

  return 1;
}

async function runBounded<T>(actions: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < actions.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await actions[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), actions.length) }, worker));
  return results;
}

async function runSourceGroup<T extends SourceConfig>(
  sources: T[],
  buildAction: (source: T) => () => Promise<ScheduledSourceRunResult>,
): Promise<ScheduledSourceRunResult[]> {
  if (!sources.length) {
    return [];
  }

  const concurrency = Math.max(...sources.map(concurrencyForSource));
  return runBounded(
    sources.map((source) => buildAction(source)),
    concurrency,
  );
}

async function runArticleSourceSafely(
  source: SourceConfig,
  action: () => Promise<PersistedIngestionResult>,
): Promise<PersistedIngestionResult | FailedArticleIngestionResult> {
  try {
    return await action();
  } catch (error) {
    return {
      sourceKey: source.key,
      collected: 0,
      inserted: 0,
      skipped: 0,
      failures: 1,
      error: errorMessage(error),
    };
  }
}

async function runLaunchSourceSafely(
  source: SourceConfig,
  action: () => Promise<LaunchIngestionResult>,
): Promise<LaunchIngestionResult | FailedLaunchIngestionResult> {
  try {
    return await action();
  } catch (error) {
    return {
      sourceKey: source.key,
      collected: 0,
      upserted: 0,
      failures: 1,
      error: errorMessage(error),
    };
  }
}

async function seedMarketSafely(db: SqlDatabase): Promise<ScheduledMarketSeedRunResult> {
  try {
    return {
      ...(await seedMarketItemsFromArticles(db)),
      failures: 0,
    };
  } catch (error) {
    return {
      candidates: 0,
      inserted: 0,
      skipped: 0,
      failures: 1,
      error: errorMessage(error),
    };
  }
}

async function closeStaleLogsSafely(db: SqlDatabase, now: Date): Promise<ScheduledMaintenanceResult> {
  try {
    const staleBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    return {
      staleIngestionLogsClosed: await closeStaleIngestionLogs(db, {
        finishedAt: now.toISOString(),
        staleBefore,
      }),
      failures: 0,
    };
  } catch (error) {
    return {
      staleIngestionLogsClosed: 0,
      failures: 1,
      error: errorMessage(error),
    };
  }
}

export async function runScheduledIngestion(input: ScheduledIngestionInput): Promise<ScheduledIngestionResult> {
  const startedAt = input.context.now();
  const sourceRuns: ScheduledSourceRunResult[] = [];
  let marketSeed: ScheduledMarketSeedRunResult | null = null;
  let catalogSync: FullCatalogSyncResult | null = null;
  let maintenance: ScheduledMaintenanceResult | null = null;
  const timeoutMs = input.sourceTimeoutMs ?? sourceIngestionTimeoutMs;

  if (input.kind === 'hourly') {
    const snapiSource = input.sources.find((source) => source.key === 'snapi');

    if (snapiSource) {
      sourceRuns.push(
        await runArticleSourceSafely(snapiSource, () =>
          runSourceIngestion(input.db, snapiSource, createCollectorRegistry([spaceflightNewsCollector]), input.context, {
            timeoutMs,
          }),
        ),
      );
    }

    const launchSource = input.sources.find((source) => source.key === 'launch-library-2');

    if (launchSource && shouldRunLaunchIngestion(input.context.now())) {
      sourceRuns.push(
        await runLaunchSourceSafely(launchSource, () =>
          runLaunchIngestion(input.db, launchSource, launchLibraryCollector, input.context, {
            timeoutMs,
          }),
        ),
      );
    }

    const rssRegistry = createCollectorRegistry([rssCollector]);
    sourceRuns.push(
      ...(await runSourceGroup(
        input.sources.filter((item) => item.type === 'rss' && item.enabled),
        (source) => () =>
          runArticleSourceSafely(source, () =>
            runSourceIngestion(input.db, source, rssRegistry, input.context, { timeoutMs }),
          ),
      )),
    );

    const googleNewsRegistry = createCollectorRegistry([googleNewsRssCollector]);
    sourceRuns.push(
      ...(await runSourceGroup(
        input.sources.filter((item) => item.type === 'google_news_rss' && item.enabled),
        (source) => () =>
          runArticleSourceSafely(source, () =>
            runSourceIngestion(input.db, source, googleNewsRegistry, input.context, { timeoutMs }),
          ),
      )),
    );

    const officialPageRegistry = createCollectorRegistry([officialPageCollector]);
    sourceRuns.push(
      ...(await runSourceGroup(
        input.sources.filter((item) => item.type === 'official_page' && item.enabled),
        (source) => () =>
          runArticleSourceSafely(source, () =>
            runSourceIngestion(input.db, source, officialPageRegistry, input.context, { timeoutMs }),
          ),
      )),
    );

    marketSeed = await seedMarketSafely(input.db);
  }

  if (input.kind === 'daily') {
    if (input.companiesConfig || input.topicsConfig) {
      catalogSync = await syncConfiguredCatalog(input.db, {
        sources: input.sources,
        companies: parseCompaniesConfig(input.companiesConfig),
        topics: parseTopicsConfig(input.topicsConfig),
      });
    }

    maintenance = await closeStaleLogsSafely(input.db, input.context.now());
  }

  const curationsInserted =
    input.kind === 'daily' && (input.curationsYaml || input.curationsConfig)
      ? (
          await replaceConfiguredCurations(
            input.db,
            input.curationsYaml ? parseCurationsYaml(input.curationsYaml) : parseCurationsConfig(input.curationsConfig),
          )
        ).inserted
      : 0;

  const durationMs = input.context.now().getTime() - startedAt.getTime();
  const failedSourceCount = sourceRuns.filter((run) => run.failures > 0).length;

  return {
    kind: input.kind,
    sourceRuns,
    curationsInserted,
    marketSeed,
    catalogSync,
    maintenance,
    durationMs,
    successSourceCount: sourceRuns.length - failedSourceCount,
    failedSourceCount,
  };
}
