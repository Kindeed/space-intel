export function publicError(message = '数据暂不可用，请稍后重试。', status = 500): Response {
  return Response.json({ error: message }, { status });
}

export function logApiError(scope: string, error: unknown): void {
  console.error(scope, error);
}
