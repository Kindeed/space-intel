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
import type { CollectorContext, SourceConfig } from './types';

export type ScheduledIngestionInput = {
  db: SqlDatabase;
  sources: SourceConfig[];
  curationsConfig?: unknown;
  curationsYaml?: string;
  context: CollectorContext;
  kind: 'hourly' | 'daily';
};

export type ScheduledIngestionResult = {
  kind: 'hourly' | 'daily';
  sourceRuns: unknown[];
  curationsInserted: number;
};

export async function runScheduledIngestion(input: ScheduledIngestionInput): Promise<ScheduledIngestionResult> {
  const sourceRuns: unknown[] = [];

  if (input.kind === 'hourly') {
    const snapiSource = input.sources.find((source) => source.key === 'snapi');

    if (snapiSource) {
      sourceRuns.push(
        await runSourceIngestion(input.db, snapiSource, createCollectorRegistry([spaceflightNewsCollector]), input.context),
      );
    }

    const launchSource = input.sources.find((source) => source.key === 'launch-library-2');

    if (launchSource) {
      sourceRuns.push(await runLaunchIngestion(input.db, launchSource, launchLibraryCollector, input.context));
    }

    const rssRegistry = createCollectorRegistry([rssCollector]);

    for (const source of input.sources.filter((item) => item.type === 'rss' && item.enabled)) {
      sourceRuns.push(await runSourceIngestion(input.db, source, rssRegistry, input.context));
    }

    const googleNewsRegistry = createCollectorRegistry([googleNewsRssCollector]);

    for (const source of input.sources.filter((item) => item.type === 'google_news_rss' && item.enabled)) {
      sourceRuns.push(await runSourceIngestion(input.db, source, googleNewsRegistry, input.context));
    }

    const officialPageRegistry = createCollectorRegistry([officialPageCollector]);

    for (const source of input.sources.filter((item) => item.type === 'official_page' && item.enabled)) {
      sourceRuns.push(await runSourceIngestion(input.db, source, officialPageRegistry, input.context));
    }
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
  };
}
