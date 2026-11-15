import type {RecentSource} from './types';
export function priorSourceState(previous:RecentSource|undefined,url:string,transport:'direct'|'preview'){
  if(!previous)return undefined;
  // A new path does not cancel an explicit upstream rate-limit/backoff.
  if(previous.errorCategory==='rate_limited')return previous;
  if(previous.url!==url)return undefined;
  if((previous.transport??'direct')!==transport&&previous.errorCategory!=='http_error')return undefined;
  return previous;
}
