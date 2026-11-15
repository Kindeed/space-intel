// Emit transport codes rather than raw errors, URLs or request headers in logs.
export function sourceFailureCode(error:unknown):string {
  let current=error;
  for(let depth=0;depth<5&&current&&typeof current==='object';depth++){
    const entry=current as {code?:unknown;cause?:unknown;errors?:unknown[];message?:unknown};
    if(typeof entry.code==='string'&&/^(?:UND_ERR_[A-Z_]+|ERR_[A-Z_]+|E[A-Z_]+|CERT_[A-Z_]+|DEPTH_[A-Z_]+|UNABLE_[A-Z_]+)$/.test(entry.code))return entry.code;
    if(entry.errors?.length){
      const nested=sourceFailureCode(entry.errors[0]);if(nested!=='UNKNOWN')return nested;
    }
    if(typeof entry.message==='string'){
      const http=entry.message.match(/\bHTTP ([1-5]\d\d)\b/);if(http)return `HTTP_${http[1]}`;
      if(entry.message==='request_budget')return 'REQUEST_BUDGET';
      if(entry.message==='source_auth_required')return 'AUTH_REQUIRED';
    }
    current=entry.cause;
  }
  return 'UNKNOWN';
}

export function sourceFailureCategory(error:unknown,aborted=false):'budget'|'timeout'|'http_error'|'parse_error'|'network_error' {
  const code=sourceFailureCode(error);
  if(code==='REQUEST_BUDGET')return 'budget';
  if(aborted||code==='ETIMEDOUT'||code==='UND_ERR_CONNECT_TIMEOUT'||code==='UND_ERR_HEADERS_TIMEOUT'||code==='UND_ERR_BODY_TIMEOUT')return 'timeout';
  if(code==='AUTH_REQUIRED'||code.startsWith('HTTP_'))return 'http_error';
  if(error instanceof Error&&/parse|xml|charset/i.test(error.message))return 'parse_error';
  return 'network_error';
}
