import {
  ingestionDiagnosticSourceName,
  ingestionDurationMs,
  ingestionErrorCategory,
  type IngestionLogDiagnosticRow,
} from '../../_ingestionDiagnostics';
import { adminOperationFailureResponse, requireAdminRequest, type AdminEnv } from '../../_admin';
import { parseOptionalPositiveInteger } from '../../_request';

type Env = AdminEnv & {
  DB: D1Database;
};

function limitFromRequest(request: Request): number {
  return parseOptionalPositiveInteger(new URL(request.url).searchParams.get('limit')) ?? 20;
}

function sourceKeyFromRequest(request: Request): string | null {
  return new URL(request.url).searchParams.get('sourceKey')?.trim() || null;
}

function publicAdminLog(row: IngestionLogDiagnosticRow) {
  return {
    sourceKey: row.sourceKey,
    sourceName: ingestionDiagnosticSourceName(row.sourceKey),
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    durationMs: ingestionDurationMs(row.startedAt, row.finishedAt),
    successCount: row.successCount,
    failureCount: row.failureCount,
    errorCategory: ingestionErrorCategory(row.error),
    error: row.error,
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const unauthorized = requireAdminRequest(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const sourceKey = sourceKeyFromRequest(request);
    const whereClause = sourceKey
      ? 'WHERE source_key = ?'
      : "WHERE failure_count > 0 OR (error IS NOT NULL AND error != '')";
    const statement = env.DB.prepare(
      `SELECT
        source_key AS sourceKey,
        started_at AS startedAt,
        finished_at AS finishedAt,
        success_count AS successCount,
        failure_count AS failureCount,
        error
      FROM ingestion_logs
      ${whereClause}
      ORDER BY COALESCE(finished_at, started_at) DESC, id DESC
      LIMIT ?`,
    );
    const values = sourceKey ? [sourceKey, limitFromRequest(request)] : [limitFromRequest(request)];
    const result = await statement
      .bind(...values)
      .all?.<IngestionLogDiagnosticRow>();

    return Response.json({ items: result?.results.map(publicAdminLog) ?? [] });
  } catch (error) {
    return adminOperationFailureResponse('Failed to load admin ingestion logs', error);
  }
};
