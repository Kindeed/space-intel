import {
  ingestionDiagnosticSourceName,
  ingestionDurationMs,
  ingestionErrorCategory,
  type IngestionLogDiagnosticRow,
} from './_ingestionDiagnostics';

const diagnosticCountLimit = 200;
const diagnosticLogIdWindow = 240;
type RecentLog = IngestionLogDiagnosticRow & { id: number };

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
      diagnosticsAvailable: false,
      latestArticlePublishedAt: null,
      latestIngestionLog: null,
      latestLaunchIngestionLog: null,
      upcomingLaunchCount: null,
      latestSuccessfulIngestionAt: null,
      recentFailedIngestionLogs: [],
      openIngestionLogCount: null,
    };
  }

  try {
    const latestArticleQuery = db
      .prepare('SELECT MAX(published_at) AS latestArticlePublishedAt FROM articles INDEXED BY idx_articles_published_at')
      .first<{ latestArticlePublishedAt: string | null }>();
    const openIngestionLogsQuery = db
      .prepare(`SELECT COUNT(*) AS openIngestionLogCount FROM (
        SELECT 1 FROM ingestion_logs INDEXED BY idx_ingestion_logs_open_started
        WHERE finished_at IS NULL LIMIT ${diagnosticCountLimit + 1}
      )`)
      .first<{ openIngestionLogCount: number }>();
    const upcomingLaunchCountQuery = db
      .prepare(`SELECT COUNT(*) AS upcomingLaunchCount FROM (
        SELECT 1 FROM launches INDEXED BY idx_launches_window_start
        WHERE window_start >= ? LIMIT ${diagnosticCountLimit + 1}
      )`)
      .bind(new Date().toISOString())
      .first<{ upcomingLaunchCount: number }>();
    const recentLogsQuery = db
      .prepare(
        `SELECT
          id,
          source_key AS sourceKey,
          started_at AS startedAt,
          finished_at AS finishedAt,
          success_count AS successCount,
          failure_count AS failureCount,
          CASE WHEN error IS NULL OR error = '' THEN 0 ELSE 1 END AS hasError,
          error
        FROM ingestion_logs
        WHERE id > (SELECT COALESCE(MAX(id), 0) FROM ingestion_logs) - ${diagnosticLogIdWindow}
        ORDER BY id DESC
        LIMIT ${diagnosticLogIdWindow}`,
      )
      .all<RecentLog>();
    const [
      latestArticle,
      openIngestionLogs,
      upcomingLaunchCount,
      recentLogs,
    ] = await Promise.all([
      latestArticleQuery,
      openIngestionLogsQuery,
      upcomingLaunchCountQuery,
      recentLogsQuery,
    ]);

    const orderedLogs = recentLogs.results.sort((a, b) =>
      Date.parse(b.finishedAt ?? b.startedAt) - Date.parse(a.finishedAt ?? a.startedAt) || b.id - a.id);
    const completed = orderedLogs.filter((row) => row.finishedAt !== null);
    const latestIngestionLog = completed[0];
    const latestLaunchIngestionLog = completed.find((row) => row.sourceKey === 'launch-library-2');

    return {
      latestArticlePublishedAt: latestArticle?.latestArticlePublishedAt ?? null,
      openIngestionLogCount: Math.min(openIngestionLogs?.openIngestionLogCount ?? 0, diagnosticCountLimit),
      openIngestionLogCountExact: (openIngestionLogs?.openIngestionLogCount ?? 0) <= diagnosticCountLimit,
      upcomingLaunchCount: Math.min(upcomingLaunchCount?.upcomingLaunchCount ?? 0, diagnosticCountLimit),
      upcomingLaunchCountExact: (upcomingLaunchCount?.upcomingLaunchCount ?? 0) <= diagnosticCountLimit,
      ingestionLogScope: 'recent_log_ids',
      ingestionLogIdWindow: diagnosticLogIdWindow,
      latestSuccessfulIngestionAt: completed.find((row) => row.failureCount === 0)?.finishedAt ?? null,
      recentFailedIngestionLogs: orderedLogs.filter((row) => row.failureCount > 0 || row.hasError).slice(0, 5).map(publicIngestionLog),
      latestIngestionLog: latestIngestionLog ? publicIngestionLog(latestIngestionLog) : null,
      latestLaunchIngestionLog: latestLaunchIngestionLog ? publicIngestionLog(latestLaunchIngestionLog) : null,
    };
  } catch (error) {
    console.error('Failed to load health diagnostics', error);
    return {
      latestArticlePublishedAt: null,
      latestIngestionLog: null,
      latestLaunchIngestionLog: null,
      upcomingLaunchCount: null,
      latestSuccessfulIngestionAt: null,
      recentFailedIngestionLogs: [],
      openIngestionLogCount: null,
      diagnosticsAvailable: false,
    };
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const detailed = request ? new URL(request.url).searchParams.get('diagnostics') === '1' : false;
  let databaseAvailable = false;
  try {
    const probe = await env.DB?.prepare('SELECT 1 AS healthy').first<{ healthy: number }>();
    databaseAvailable = probe?.healthy === 1;
  } catch (error) {
    console.error('Database health probe failed', error);
  }
  // Normal health requests never scan application tables. Detailed diagnostics
  // are explicit, count-bounded and require indexes instead of silently falling
  // back to full scans on an unmigrated production database.
  const diagnostics = databaseAvailable && detailed
    ? await loadDiagnostics(env.DB)
    : { diagnosticsAvailable: false, diagnosticsRequested: detailed };
  const healthy = databaseAvailable && (!detailed || diagnostics.diagnosticsAvailable !== false);
  return Response.json({
    ok: healthy,
    service: 'space-intel',
    checks: {
      database: databaseAvailable,
      assets: Boolean(env.R2_ASSETS),
    },
    diagnostics,
  }, { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
};

type Env = {
  DB?: D1Database;
  R2_ASSETS?: R2Bucket;
};
