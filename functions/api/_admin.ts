export type AdminEnv = {
  ADMIN_TOKEN?: string;
};

export const adminUnauthorizedMessage = '未授权。';
export const adminOperationFailureMessage = '操作失败，请查看运行日志。';
export const adminIngestionFailureMessage = '采集失败，请查看运行日志。';
export const adminSourceNotConfiguredMessage = '采集来源未配置。';

export function logAdminError(scope: string, error: unknown): void {
  console.error(scope, error);
}

export function adminOperationFailureResponse(scope: string, error: unknown): Response {
  logAdminError(scope, error);
  return Response.json({ error: adminOperationFailureMessage }, { status: 500 });
}

export function adminSourceNotConfiguredResponse(): Response {
  return Response.json({ error: adminSourceNotConfiguredMessage }, { status: 500 });
}

function parseBearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function isAdminRequestAuthorized(request: Request, env: AdminEnv): boolean {
  const expectedToken = env.ADMIN_TOKEN?.trim();

  if (!expectedToken) {
    return false;
  }

  return parseBearerToken(request.headers.get('authorization')) === expectedToken;
}

export function requireAdminRequest(request: Request, env: AdminEnv): Response | null {
  return isAdminRequestAuthorized(request, env) ? null : Response.json({ error: adminUnauthorizedMessage }, { status: 401 });
}
