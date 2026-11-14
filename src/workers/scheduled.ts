import sourcesConfig from '../../config/sources.generated.json';
import companiesConfig from '../../config/companies.generated.json';
import topicsConfig from '../../config/topics.generated.json';
import curationsConfig from '../../config/curations.generated.json';
import { parseSourcesConfig, runScheduledIngestion } from '../ingestion';

const configuredSources = parseSourcesConfig(sourcesConfig);
export const sourceCron = '* * * * *';
const dailyCron = '15 18 * * *';

type Env = {
  DB: D1Database;
  TRANSLATION_PROVIDER?: string;
  TRANSLATION_API_URL?: string;
  TRANSLATION_API_TOKEN?: string;
  TRANSLATION_MODEL?: string;
  TRANSLATION_ENABLED?: string;
  TRANSLATION_TIMEOUT_MS?: string;
  TRANSLATION_MAX_ITEMS_PER_SOURCE?: string;
};

export async function runSpaceIntelScheduled(cron: string, env: Env, scheduledTime?: number): Promise<unknown> {
  if (![sourceCron, dailyCron, '0 * * * *'].includes(cron)) {
    throw new Error('Unsupported ingestion schedule');
  }

  const kind = cron === dailyCron ? 'daily' : 'hourly';
  let sources = configuredSources;
  let runMaintenance = true;

  if (cron === sourceCron) {
    if (scheduledTime === undefined || !Number.isFinite(scheduledTime) || scheduledTime < 0) {
      throw new Error('A valid scheduled time is required for source rotation');
    }

    // Each source receives its own invocation budget. Use the event time so
    // delayed delivery does not select a different source.
    const enabledSources = configuredSources.filter((source) => source.enabled);
    const minute = Math.floor(scheduledTime / 60_000);
    sources = enabledSources.length ? [enabledSources[minute % enabledSources.length]] : [];
    runMaintenance = minute % 60 === 0;
  }

  return runScheduledIngestion({
    db: env.DB,
    sources,
    runMaintenance,
    companiesConfig,
    topicsConfig,
    curationsConfig,
    translationEnv: env,
    kind,
    context: {
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
    },
  });
}

export default {
  async fetch(): Promise<Response> {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runSpaceIntelScheduled(controller.cron, env, controller.scheduledTime));
  },
};
