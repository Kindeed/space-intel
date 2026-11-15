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
