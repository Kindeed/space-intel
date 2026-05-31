import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adminIngestionFailureMessage,
  adminOperationFailureResponse,
  adminSourceNotConfiguredResponse,
  adminUnauthorizedMessage,
  isAdminRequestAuthorized,
  logAdminError,
  requireAdminRequest,
} from './_admin';

function requestWithAuthorization(value: string | null): Request {
  const headers = new Headers();

  if (value !== null) {
    headers.set('authorization', value);
  }

  return new Request('https://space.example.test/api/admin/catalog', { method: 'POST', headers });
}

describe('admin API authorization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts only bearer tokens that match the configured admin token', () => {
    const env = { ADMIN_TOKEN: 'expected-value' };

    expect(isAdminRequestAuthorized(requestWithAuthorization('Bearer expected-value'), env)).toBe(true);
    expect(isAdminRequestAuthorized(requestWithAuthorization('bearer expected-value '), env)).toBe(true);
    expect(isAdminRequestAuthorized(requestWithAuthorization('expected-value'), env)).toBe(false);
    expect(isAdminRequestAuthorized(requestWithAuthorization('Bearer wrong-token'), env)).toBe(false);
    expect(isAdminRequestAuthorized(requestWithAuthorization(null), env)).toBe(false);
  });

  it('rejects requests when no admin token is configured', async () => {
    const response = requireAdminRequest(requestWithAuthorization('Bearer expected-value'), {});

    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: adminUnauthorizedMessage });
    expect(adminUnauthorizedMessage).toBe('未授权。');
  });

  it('keeps raw admin failure details in logs instead of response copy', () => {
    const error = new Error('private upstream path /internal/source failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logAdminError('admin ingest failed', error);

    expect(consoleError).toHaveBeenCalledWith('admin ingest failed', error);
    expect(adminIngestionFailureMessage).toBe('采集失败，请查看运行日志。');
    expect(adminIngestionFailureMessage).not.toContain('private upstream path');
  });

  it('returns a generic admin operation failure response', async () => {
    const error = new Error('D1 internal failure /private/path');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = adminOperationFailureResponse('catalog sync failed', error);

    expect(consoleError).toHaveBeenCalledWith('catalog sync failed', error);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: '操作失败，请查看运行日志。' });
  });

  it('returns a generic missing-source response without collector names', async () => {
    const response = adminSourceNotConfiguredResponse();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: '采集来源未配置。' });
    expect(JSON.stringify(payload)).not.toContain('SNAPI');
    expect(JSON.stringify(payload)).not.toContain('Launch Library');
  });
});
