import sourcesConfig from '../../config/sources.generated.json';
import companiesConfig from '../../config/companies.generated.json';
import topicsConfig from '../../config/topics.generated.json';
import curationsConfig from '../../config/curations.generated.json';
import { parseSourcesConfig, runScheduledIngestion } from '../ingestion';

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

export async function runSpaceIntelScheduled(cron: string, env: Env): Promise<unknown> {
  const kind = cron === '15 18 * * *' ? 'daily' : 'hourly';

  return runScheduledIngestion({
    db: env.DB,
    sources: parseSourcesConfig(sourcesConfig),
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
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runSpaceIntelScheduled(controller.cron, env));
  },
};
