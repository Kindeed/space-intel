export type DbRunResult = {
  meta?: {
    changes?: number;
    last_row_id?: number;
  };
};

export type DbStatement = {
  bind: (...values: unknown[]) => DbStatement;
  run: () => Promise<DbRunResult>;
  first: <T = unknown>() => Promise<T | null>;
  all?: <T = unknown>() => Promise<{ results: T[] }>;
};

export type SqlDatabase = {
  prepare: (query: string) => DbStatement;
};
