type LatestIngestionLogRow = {
  sourceKey: string;
  startedAt: string;
  finishedAt: string | null;
  successCount: number;
  failureCount: number;
  hasError: number;
};

async function loadDiagnostics(db: D1Database | undefined) {
  if (!db) {
    return {
      latestArticlePublishedAt: null,
      latestIngestionLog: null,
    };
  }

  try {
    const latestArticle = await db
      .prepare('SELECT MAX(published_at) AS latestArticlePublishedAt FROM articles')
      .first<{ latestArticlePublishedAt: string | null }>();
    const latestIngestionLog = await db
      .prepare(
        `SELECT
          source_key AS sourceKey,
          started_at AS startedAt,
          finished_at AS finishedAt,
          success_count AS successCount,
          failure_count AS failureCount,
          CASE WHEN error IS NULL OR error = '' THEN 0 ELSE 1 END AS hasError
        FROM ingestion_logs
        ORDER BY started_at DESC, id DESC
        LIMIT 1`,
      )
      .first<LatestIngestionLogRow>();

    return {
      latestArticlePublishedAt: latestArticle?.latestArticlePublishedAt ?? null,
      latestIngestionLog: latestIngestionLog
        ? {
            sourceKey: latestIngestionLog.sourceKey,
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
      diagnosticsAvailable: false,
    };
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return Response.json({
    ok: true,
    service: 'space-intel',
    bindings: {
      d1: Boolean(env.DB),
      r2: Boolean(env.R2_ASSETS),
    },
    diagnostics: await loadDiagnostics(env.DB),
  });
};

type Env = {
  DB?: D1Database;
  R2_ASSETS?: R2Bucket;
};
