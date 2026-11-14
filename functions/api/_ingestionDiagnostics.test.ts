import { describe, expect, it } from 'vitest';
import { ingestionErrorCategory } from './_ingestionDiagnostics';

describe('ingestion resource diagnostics', () => {
  it.each([
    ['Too many subrequests by single Worker invocation.', 'resource_limit'],
    ['Too many API requests by single Worker invocation.', 'resource_limit'],
    ['Worker exceeded CPU time limit', 'resource_limit'],
    ['Worker exceeded resource limits', 'resource_limit'],
    ['Launch Library 2 request failed with HTTP 429', 'rate_limited'],
    ['RSS request failed with HTTP 403', 'http_error'],
    ['RSS request failed with HTTP 404', 'http_error'],
    ['Source ingestion timed out after 25000ms', 'timeout'],
    [null, null],
  ])('classifies %s without publishing its raw message', (message, category) => {
    expect(ingestionErrorCategory(message)).toBe(category);
  });
});
