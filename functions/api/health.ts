import {
  ingestionDiagnosticSourceName,
  ingestionDurationMs,
  ingestionErrorCategory,
  type IngestionLogDiagnosticRow,
} from './_ingestionDiagnostics';

function publicIngestionLog(row: IngestionLogDiagnosticRow) {
  return {
    sourceName: ingestionDiagnosticSourceName(row.sourceKey),
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    successCount: row.successCount,
    failureCount: row.failureCount,
    hasError: Boolean(row.hasError),
    errorCategory: ingestionErrorCategory(row.error),
    durationMs: ingestionDurationMs(row.startedAt, row.finishedAt),
  };
}

async function loadDiagnostics(db: D1Database | undefined) {
  if (!db) {
    return {
      latestArticlePublishedAt: null,
      latestIngestionLog: null,
      latestLaunchIngestionLog: null,
      upcomingLaunchCount: 0,
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
    const upcomingLaunchCountQuery = db
      .prepare('SELECT COUNT(*) AS upcomingLaunchCount FROM launches WHERE window_start >= ?')
      .bind(new Date().toISOString())
      .first<{ upcomingLaunchCount: number }>();
    const latestIngestionLogQuery = db
      .prepare(
        `SELECT
          source_key AS sourceKey,
          started_at AS startedAt,
          finished_at AS finishedAt,
          success_count AS successCount,
          failure_count AS failureCount,
          CASE WHEN error IS NULL OR error = '' THEN 0 ELSE 1 END AS hasError,
          error
        FROM ingestion_logs
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC, id DESC
        LIMIT 1`,
      )
      .first<IngestionLogDiagnosticRow>();
    const latestLaunchIngestionLogQuery = db
      .prepare(
        `SELECT
          source_key AS sourceKey,
          started_at AS startedAt,
          finished_at AS finishedAt,
          success_count AS successCount,
          failure_count AS failureCount,
          CASE WHEN error IS NULL OR error = '' THEN 0 ELSE 1 END AS hasError,
          error
        FROM ingestion_logs
        WHERE source_key = 'launch-library-2' AND finished_at IS NOT NULL
        ORDER BY finished_at DESC, id DESC
        LIMIT 1`,
      )
      .first<IngestionLogDiagnosticRow>();
    const recentFailedIngestionLogsQuery = db
      .prepare(
        `SELECT
          source_key AS sourceKey,
          started_at AS startedAt,
          finished_at AS finishedAt,
          success_count AS successCount,
          failure_count AS failureCount,
          CASE WHEN error IS NULL OR error = '' THEN 0 ELSE 1 END AS hasError,
          error
        FROM ingestion_logs
        WHERE failure_count > 0 OR (error IS NOT NULL AND error != '')
        ORDER BY COALESCE(finished_at, started_at) DESC, id DESC
        LIMIT 5`,
      )
      .all?.<IngestionLogDiagnosticRow>();
    const [
      latestArticle,
      openIngestionLogs,
      latestSuccessfulIngestion,
      upcomingLaunchCount,
      latestIngestionLog,
      latestLaunchIngestionLog,
      recentFailedIngestionLogs,
    ] = await Promise.all([
      latestArticleQuery,
      openIngestionLogsQuery,
      latestSuccessfulIngestionQuery,
      upcomingLaunchCountQuery,
      latestIngestionLogQuery,
      latestLaunchIngestionLogQuery,
      recentFailedIngestionLogsQuery,
    ]);

    return {
      latestArticlePublishedAt: latestArticle?.latestArticlePublishedAt ?? null,
      openIngestionLogCount: openIngestionLogs?.openIngestionLogCount ?? 0,
      upcomingLaunchCount: upcomingLaunchCount?.upcomingLaunchCount ?? 0,
      latestSuccessfulIngestionAt: latestSuccessfulIngestion?.latestSuccessfulIngestionAt ?? null,
      recentFailedIngestionLogs:
        recentFailedIngestionLogs?.results.map((row) => publicIngestionLog(row)) ?? [],
      latestIngestionLog: latestIngestionLog ? publicIngestionLog(latestIngestionLog) : null,
      latestLaunchIngestionLog: latestLaunchIngestionLog ? publicIngestionLog(latestLaunchIngestionLog) : null,
    };
  } catch (error) {
    console.error('Failed to load health diagnostics', error);
    return {
      latestArticlePublishedAt: null,
      latestIngestionLog: null,
      latestLaunchIngestionLog: null,
      upcomingLaunchCount: 0,
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
