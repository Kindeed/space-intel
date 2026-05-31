import type { DbRunResult, DbStatement, SqlDatabase } from './types';

export async function runDbStatements(db: SqlDatabase, statements: DbStatement[]): Promise<DbRunResult[]> {
  if (!statements.length) {
    return [];
  }

  if (typeof db.batch === 'function') {
    return (await (db.batch as (items: DbStatement[]) => Promise<DbRunResult[]>)(statements)) ?? [];
  }

  const results: DbRunResult[] = [];

  for (const statement of statements) {
    results.push(await statement.run());
  }

  return results;
}

export function sumRunChanges(results: DbRunResult[]): number {
  return results.reduce((sum, result) => sum + (result.meta?.changes ?? 0), 0);
}
