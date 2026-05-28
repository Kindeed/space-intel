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
import { parseCurationsConfig, parseCurationsYaml } from '../curations/config';
import { replaceConfiguredCurations, type SqlDatabase } from '../db';
import { seedMarketItemsFromArticles, type MarketSeedResult } from '../market';
import type { LaunchIngestionResult } from './launchIngestion';
import type { PersistedIngestionResult } from './persistedRun';
import type { CollectorContext, SourceConfig } from './types';

export const sourceIngestionTimeoutMs = 25_000;

export type ScheduledIngestionInput = {
  db: SqlDatabase;
  sources: SourceConfig[];
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function shouldRunLaunchIngestion(now: Date): boolean {
  return now.getUTCHours() % 6 === 0;
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

export async function runScheduledIngestion(input: ScheduledIngestionInput): Promise<ScheduledIngestionResult> {
  const sourceRuns: ScheduledSourceRunResult[] = [];
  let marketSeed: ScheduledMarketSeedRunResult | null = null;
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

    for (const source of input.sources.filter((item) => item.type === 'rss' && item.enabled)) {
      sourceRuns.push(
        await runArticleSourceSafely(source, () =>
          runSourceIngestion(input.db, source, rssRegistry, input.context, { timeoutMs }),
        ),
      );
    }

    const googleNewsRegistry = createCollectorRegistry([googleNewsRssCollector]);

    for (const source of input.sources.filter((item) => item.type === 'google_news_rss' && item.enabled)) {
      sourceRuns.push(
        await runArticleSourceSafely(source, () =>
          runSourceIngestion(input.db, source, googleNewsRegistry, input.context, { timeoutMs }),
        ),
      );
    }

    const officialPageRegistry = createCollectorRegistry([officialPageCollector]);

    for (const source of input.sources.filter((item) => item.type === 'official_page' && item.enabled)) {
      sourceRuns.push(
        await runArticleSourceSafely(source, () =>
          runSourceIngestion(input.db, source, officialPageRegistry, input.context, { timeoutMs }),
        ),
      );
    }

    marketSeed = await seedMarketSafely(input.db);
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

  return {
    kind: input.kind,
    sourceRuns,
    curationsInserted,
    marketSeed,
  };
}
