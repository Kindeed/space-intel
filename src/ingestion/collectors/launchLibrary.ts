import { z } from 'zod';
import type { CollectorContext, SourceCollector, SourceConfig } from '../types';

const launchSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url().nullable().optional(),
  net: z.string().nullable().optional(),
  status: z
    .object({
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  rocket: z
    .object({
      configuration: z
        .object({
          full_name: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  launch_service_provider: z
    .object({
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  pad: z
    .object({
      name: z.string().nullable().optional(),
      location: z
        .object({
          name: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

const launchLibraryResponseSchema = z.object({
  results: z.array(launchSchema),
});

export type NormalizedLaunch = {
  externalId: string;
  mission: string;
  rocket: string | null;
  provider: string | null;
  windowStart: string | null;
  site: string | null;
  status: string;
  rawUrl: string | null;
};

export type LaunchLibraryCollectorResult = SourceCollector & {
  collectLaunches: (source: SourceConfig, context: CollectorContext) => Promise<NormalizedLaunch[]>;
};

function launchSite(launch: z.infer<typeof launchSchema>): string | null {
  const pad = launch.pad?.name;
  const location = launch.pad?.location?.name;

  if (pad && location) {
    return `${pad}, ${location}`;
  }

  return pad ?? location ?? null;
}

async function collectLaunches(source: SourceConfig, context: CollectorContext): Promise<NormalizedLaunch[]> {
  if (source.key !== 'launch-library-2') {
    return [];
  }

  const url = new URL(source.url);
  url.searchParams.set('limit', url.searchParams.get('limit') ?? '25');

  const response = await context.fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'user-agent': 'space-intel/0.1 (+https://space.bytebaud.com)',
    },
  });

  if (!response.ok) {
    throw new Error(`Launch Library 2 request failed with HTTP ${response.status}`);
  }

  const payload = launchLibraryResponseSchema.parse(await response.json());

  return payload.results.map((launch) => ({
    externalId: launch.id,
    mission: launch.name,
    rocket: launch.rocket?.configuration?.full_name ?? null,
    provider: launch.launch_service_provider?.name ?? null,
    windowStart: launch.net ?? null,
    site: launchSite(launch),
    status: launch.status?.name ?? 'unknown',
    rawUrl: launch.url ?? null,
  }));
}

export const launchLibraryCollector: LaunchLibraryCollectorResult = {
  type: 'api',
  collectLaunches,
  async collect() {
    return [];
  },
};
