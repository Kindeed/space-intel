import {describe,expect,it} from 'vitest';
import {sourceFailureCode} from './sourceFailures';
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
});
