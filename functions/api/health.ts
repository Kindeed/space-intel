import sourcesConfig from '../../config/sources.generated.json';
import { parseSourcesConfig } from '../../src/ingestion';
import { sourceDisplayName } from '../../src/sourceDisplay';

type LatestIngestionLogRow = {
  sourceKey: string;
  startedAt: string;
  finishedAt: string | null;
  successCount: number;
  failureCount: number;
  hasError: number;
};

const healthSourceNameByKey = new Map(parseSourcesConfig(sourcesConfig).map((source) => [source.key, sourceDisplayName(source)]));

function healthSourceName(sourceKey: string): string {
  return healthSourceNameByKey.get(sourceKey) ?? '来源';
}

async function loadDiagnostics(db: D1Database | undefined) {
  if (!db) {
    return {
      latestArticlePublishedAt: null,
      latestIngestionLog: null,
      latestSuccessfulIngestionAt: null,
      recentFailedIngestionLogs: [],
      openIngestionLogCount: 0,
    };
  }

  try {
    const latestArticleQuery = db
      .prepare('SELECT MAX(published_at) AS latestArticlePublishedAt FROM articles')
      .first<{ latestArticlePublishedAt: string | null }>();
    const openIngestionLogsQuery = db
      .prepare('SELECT COUNT(*) AS openIngestionLogCount FROM ingestion_logs WHERE finished_at IS NULL')
      .first<{ openIngestionLogCount: number }>();
    const latestSuccessfulIngestionQuery = db
      .prepare('SELECT MAX(finished_at) AS latestSuccessfulIngestionAt FROM ingestion_logs WHERE finished_at IS NOT NULL AND failure_count = 0')
      .first<{ latestSuccessfulIngestionAt: string | null }>();
    const latestIngestionLogQuery = db
      .prepare(
        `SELECT
          source_key AS sourceKey,
          started_at AS startedAt,
          finished_at AS finishedAt,
          success_count AS successCount,
          failure_count AS failureCount,
          CASE WHEN error IS NULL OR error = '' THEN 0 ELSE 1 END AS hasError
        FROM ingestion_logs
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC, id DESC
        LIMIT 1`,
      )
      .first<LatestIngestionLogRow>();
    const recentFailedIngestionLogsQuery = db
      .prepare(
        `SELECT
          source_key AS sourceKey,
          started_at AS startedAt,
          finished_at AS finishedAt,
          success_count AS successCount,
          failure_count AS failureCount,
          CASE WHEN error IS NULL OR error = '' THEN 0 ELSE 1 END AS hasError
        FROM ingestion_logs
        WHERE failure_count > 0 OR (error IS NOT NULL AND error != '')
        ORDER BY COALESCE(finished_at, started_at) DESC, id DESC
        LIMIT 5`,
      )
      .all?.<LatestIngestionLogRow>();
    const [latestArticle, openIngestionLogs, latestSuccessfulIngestion, latestIngestionLog, recentFailedIngestionLogs] = await Promise.all([
      latestArticleQuery,
      openIngestionLogsQuery,
      latestSuccessfulIngestionQuery,
      latestIngestionLogQuery,
      recentFailedIngestionLogsQuery,
    ]);

    return {
      latestArticlePublishedAt: latestArticle?.latestArticlePublishedAt ?? null,
      openIngestionLogCount: openIngestionLogs?.openIngestionLogCount ?? 0,
      latestSuccessfulIngestionAt: latestSuccessfulIngestion?.latestSuccessfulIngestionAt ?? null,
      recentFailedIngestionLogs:
        recentFailedIngestionLogs?.results.map((row) => ({
          sourceName: healthSourceName(row.sourceKey),
          startedAt: row.startedAt,
          finishedAt: row.finishedAt,
          successCount: row.successCount,
          failureCount: row.failureCount,
          hasError: Boolean(row.hasError),
        })) ?? [],
      latestIngestionLog: latestIngestionLog
        ? {
            sourceName: healthSourceName(latestIngestionLog.sourceKey),
            startedAt: latestIngestionLog.startedAt,
            finishedAt: latestIngestionLog.finishedAt,
            successCount: latestIngestionLog.successCount,
            failureCount: latestIngestionLog.failureCount,
            hasError: Boolean(latestIngestionLog.hasError),
          }
        : null,
    };
  } catch (error) {
    console.error('Failed to load health diagnostics', error);
    return {
      latestArticlePublishedAt: null,
      latestIngestionLog: null,
      latestSuccessfulIngestionAt: null,
      recentFailedIngestionLogs: [],
      openIngestionLogCount: 0,
      diagnosticsAvailable: false,
    };
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return Response.json({
    ok: true,
    service: 'space-intel',
    checks: {
      database: Boolean(env.DB),
      assets: Boolean(env.R2_ASSETS),
    },
    diagnostics: await loadDiagnostics(env.DB),
  });
};

type Env = {
  DB?: D1Database;
  R2_ASSETS?: R2Bucket;
};
