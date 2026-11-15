import { z } from 'zod';
import type { RecentSource } from './types';
import type { SourceConfig } from '../ingestion/types';

export const controlSchema = z.object({
  version:z.literal(1), day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reserved:z.number().int().min(0).max(600), runId:z.string().max(100),
  lastRunAt:z.string().datetime(),
  sourceTokenHash:z.string().regex(/^[a-f0-9]{64}$/).optional(),
});
export type PreviewControl = z.infer<typeof controlSchema>;
export function reserveBudget(previous:PreviewControl|undefined, now:Date, runId:string) {
  const day=now.toISOString().slice(0,10);
  const used=previous?.day===day?previous.reserved:0;
  const budget=Math.min(150,600-used);
  return {budget,control:controlSchema.parse({version:1,day,reserved:used+budget,runId,lastRunAt:now.toISOString(),sourceTokenHash:previous?.sourceTokenHash})};
}
export function releaseUnused(control:PreviewControl, runId:string, budget:number, used:number):PreviewControl {
  if(control.runId!==runId || used<0 || used>budget) throw new Error('Invalid reservation completion');
  return {...control,reserved:control.reserved-(budget-used)};
}
export function scheduleSlot(now:Date):string {
  const hour=now.getUTCHours();
  const slot=[0,4,10,14].filter((value)=>value<=hour).at(-1)!;
  return `${now.toISOString().slice(0,10)}:${slot}`;
}
export function sourceDue(source:SourceConfig,previous:RecentSource|undefined,now:Date,manual=false):boolean {
  if(previous?.nextAttemptAt && Date.parse(previous.nextAttemptAt)>now.getTime()) return false;
  if(manual || !previous) return true;
  const slot=scheduleSlot(now);
  if(previous.checkedSlot===slot) return false;
  if(source.recent?.cadence==='twice'||(source.recent?.cadence!=='four'&&['policy','approval','procurement'].includes(source.recent?.category??''))) return /:(0|10)$/.test(slot);
  return true;
}
export function retryAt(value:string|null,now:Date):string {
  const seconds=value && /^\d+$/.test(value)?Number(value):null;
  const date=seconds===null?(value?Date.parse(value):NaN):now.getTime()+seconds*1000;
  return new Date(Number.isFinite(date)&&date>now.getTime()?date:now.getTime()+6*60*60_000).toISOString();
}
