import sourcesConfig from '../../../../config/sources.generated.json';
import { createCollectorRegistry, parseSourcesConfig, runSourceIngestion, spaceflightNewsCollector } from '../../../../src/ingestion';
import type { TranslationEnv } from '../../../../src/translation';
import { adminIngestionFailureMessage, adminSourceNotConfiguredResponse, logAdminError, requireAdminRequest, type AdminEnv } from '../../_admin';
import { findEnabledAdminSourceByKey } from './_sources';

type Env = TranslationEnv & AdminEnv & {
  DB: D1Database;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const unauthorized = requireAdminRequest(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  const source = findEnabledAdminSourceByKey(parseSourcesConfig(sourcesConfig), 'snapi');

  if (!source) {
    return adminSourceNotConfiguredResponse();
  }

  const registry = createCollectorRegistry([spaceflightNewsCollector]);
  try {
    const result = await runSourceIngestion(
      env.DB,
      source,
      registry,
      {
        fetch: (input, init) => fetch(input, init),
        now: () => new Date(),
      },
      {
        translationEnv: env,
      },
    );

    return Response.json(result);
  } catch (error) {
    logAdminError(`Failed to run SNAPI ingestion for ${source.key}`, error);
    return Response.json({
      sourceKey: source.key,
      collected: 0,
      inserted: 0,
      skipped: 0,
      failures: 1,
      error: adminIngestionFailureMessage,
    });
  }
};
