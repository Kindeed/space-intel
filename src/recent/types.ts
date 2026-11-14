import { z } from 'zod';
import { normalizeHttpUrl } from '../config/url';

const publicUrl = z.string().url().refine((value) => normalizeHttpUrl(value) !== null, 'Expected a public http(s) URL');

export const recentCategories = ['news', 'policy', 'company', 'procurement', 'approval'] as const;
export const milestones = ['planning_notice','eia_notice','eia_approved','land_notice','tender','award','construction_update','operational_update','withdrawn'] as const;
export type RecentCategory = typeof recentCategories[number];
export const recentItemSchema = z.object({
  id: z.string(), title: z.string().min(1), url: publicUrl,
  publishedAt: z.string().datetime(), fetchedAt: z.string().datetime(),
  datePrecision: z.enum(['date', 'time']).default('date'),
  publisher: z.string(), sourceIds: z.array(z.string()),
  region: z.enum(['cn', 'global']), provinces: z.array(z.string()),
  companyIds: z.array(z.string()), category: z.enum(recentCategories),
  summary: z.string().max(160), originalTitle: z.string().optional(),
  focus: z.array(z.enum(['spaceport','ttc'])).default([]),
  facilityIds: z.array(z.string()).default([]),
  milestone: z.enum(milestones).optional(),
  accessLimited:z.boolean().default(false),
});
export type RecentItem = z.infer<typeof recentItemSchema>;
export const recentSourceSchema = z.object({
  id: z.string(), name: z.string(), url: publicUrl,
  region: z.enum(['cn', 'global']), category: z.enum(recentCategories),
  publisherRegion: z.string().optional(), companyIds: z.array(z.string()),
  selected: z.boolean(), attemptedAt: z.string().datetime(),
  lastSuccessAt: z.string().datetime().nullable(),
  status: z.enum(['ok', 'empty', 'error', 'directory']),
  errorCategory: z.enum(['http_error', 'rate_limited', 'timeout', 'parse_error', 'network_error', 'budget']).optional(),
  collected: z.number().int().nonnegative(), recentCount: z.number().int().nonnegative(),
  requests: z.number().int().nonnegative(), durationMs: z.number().nonnegative(),
  etag: z.string().optional(), lastModified: z.string().optional(),
  nextAttemptAt: z.string().datetime().optional(), checkedSlot: z.string().optional(),
  unchanged: z.boolean().optional(), skipped: z.boolean().optional(),
  listed: z.number().int().nonnegative().optional(),
});
export type RecentSource = z.infer<typeof recentSourceSchema>;
export const recentSnapshotSchema = z.object({
  schemaVersion: z.literal(1), builtAt: z.string().datetime(),
  lastDataUpdatedAt: z.string().datetime().nullable(),
  lastCheckedAt: z.string().datetime().nullable().optional(),
  retentionDays: z.literal(30), limit: z.literal(2000),
  coverageStart: z.string().datetime().nullable(), truncated: z.boolean(),
  items: z.array(recentItemSchema).max(2000), sources: z.array(recentSourceSchema).max(250),
  companies: z.array(z.object({ id: z.string(), name: z.string(), aliases: z.array(z.string()), country: z.string() })),
  provinces: z.array(z.object({ id: z.string(), name: z.string(), aliases: z.array(z.string()) })),
  facilities: z.array(z.object({id:z.string(),name:z.string(),province:z.string(),kind:z.string(),aliases:z.array(z.string()),sourceUrls:z.array(publicUrl)})).default([]),
});
export type RecentSnapshot = z.infer<typeof recentSnapshotSchema>;
