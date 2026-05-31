import sourcesConfig from '../../../../config/sources.generated.json';
import { launchLibraryCollector, parseSourcesConfig, runLaunchIngestion } from '../../../../src/ingestion';
import { adminIngestionFailureMessage, adminSourceNotConfiguredResponse, logAdminError, requireAdminRequest, type AdminEnv } from '../../_admin';
import { findEnabledAdminSourceByKey } from './_sources';

type Env = AdminEnv & {
  DB: D1Database;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const unauthorized = requireAdminRequest(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  const source = findEnabledAdminSourceByKey(parseSourcesConfig(sourcesConfig), 'launch-library-2');

  if (!source) {
    return adminSourceNotConfiguredResponse();
  }

  try {
    const result = await runLaunchIngestion(env.DB, source, launchLibraryCollector, {
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
    });

    return Response.json(result);
  } catch (error) {
    logAdminError(`Failed to run launch ingestion for ${source.key}`, error);
    return Response.json({
      sourceKey: source.key,
      collected: 0,
      upserted: 0,
      failures: 1,
      error: adminIngestionFailureMessage,
    });
  }
};
