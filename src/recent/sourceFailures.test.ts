import {describe,expect,it} from 'vitest';
import {sourceFailureCode,sourceFailureCategory} from './sourceFailures';
describe('safe source diagnostics',()=>{
  it('reveals nested DNS and connection codes without raw messages',()=>{
    expect(sourceFailureCode(new TypeError('private URL',{cause:Object.assign(new Error('private headers'),{code:'UND_ERR_CONNECT_TIMEOUT'})}))).toBe('UND_ERR_CONNECT_TIMEOUT');
    expect(sourceFailureCode(new AggregateError([Object.assign(new Error('private path'),{code:'ENOTFOUND'})]))).toBe('ENOTFOUND');
  });
  it('distinguishes HTTP, budget and login requirements',()=>{
    expect(sourceFailureCode(new Error('Official page request failed with HTTP 403'))).toBe('HTTP_403');
    expect(sourceFailureCode(new Error('request_budget'))).toBe('REQUEST_BUDGET');
    expect(sourceFailureCode(new Error('source_auth_required'))).toBe('AUTH_REQUIRED');
  });
  it('does not expose arbitrary codes, credentials or error details',()=>{
    expect(sourceFailureCode({code:'Bearer private-token',message:'https://example.test/?token=private'})).toBe('UNKNOWN');
  });
  it('separates socket timeouts, forbidden pages and parse failures',()=>{
    expect(sourceFailureCategory({cause:{code:'ETIMEDOUT'}})).toBe('timeout');
    expect(sourceFailureCategory({code:'UND_ERR_CONNECT_TIMEOUT'})).toBe('timeout');
    expect(sourceFailureCategory(new Error('source_auth_required'))).toBe('http_error');
    expect(sourceFailureCategory(new Error('parse_listing_requires_browser'))).toBe('parse_error');
    expect(sourceFailureCategory({code:'ENOTFOUND'})).toBe('network_error');
  });
});
