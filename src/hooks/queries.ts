import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  ApiArticleDetail,
  ApiArticleListResult,
  ApiCompany,
  ApiCompanyDetail,
  ApiHomeResult,
  ApiLaunch,
  ApiLaunchListResult,
  ApiSourceListResult,
  ApiTopic,
  ApiTopicDetail,
} from '../types';

const autoRefreshInterval = 5 * 60_000;

type ApiQueryOptions = {
  staleTime?: number;
  refetchInterval?: number | false;
  retry?: boolean | number;
};

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function useApiQuery<T>(key: readonly unknown[], path: string | null, options: ApiQueryOptions = {}): UseQueryResult<T, Error> {
  return useQuery({
    queryKey: key,
    queryFn: () => fetchJson<T>(path ?? ''),
    enabled: Boolean(path),
    staleTime: options.staleTime ?? 60_000,
    gcTime: 5 * 60_000,
    refetchInterval: options.refetchInterval ?? false,
    refetchOnWindowFocus: false,
    retry: options.retry,
  });
}

export function useHomeQuery() {
  return useApiQuery<ApiHomeResult>(['home'], '/api/home?limit=12', { refetchInterval: autoRefreshInterval });
}

export function useArticlesQuery(path: string) {
  return useApiQuery<ApiArticleListResult>(['articles', path], path, { refetchInterval: autoRefreshInterval });
}

export function useArticleDetailQuery(slug: string) {
  return useApiQuery<ApiArticleDetail>(['article', slug], slug ? `/api/articles/${encodeURIComponent(slug)}` : null);
}

export function useCompaniesQuery() {
  return useApiQuery<{ items: ApiCompany[] }>(['companies'], '/api/companies', { staleTime: 15 * 60_000 });
}

export function useCompanyDetailQuery(slug: string) {
  return useApiQuery<ApiCompanyDetail>(['company', slug], slug ? `/api/companies/${encodeURIComponent(slug)}` : null);
}

export function useLaunchesQuery(path: string) {
  return useApiQuery<ApiLaunchListResult>(['launches', path], path, { refetchInterval: autoRefreshInterval });
}

export function useLaunchDetailQuery(slug: string) {
  return useApiQuery<ApiLaunch>(['launch', slug], slug ? `/api/launches/${encodeURIComponent(slug)}` : null);
}

export function useSourcesQuery() {
  return useApiQuery<ApiSourceListResult>(['sources'], '/api/sources', { staleTime: 15 * 60_000, retry: false });
}

export function useTopicsQuery() {
  return useApiQuery<{ items: ApiTopic[] }>(['topics'], '/api/topics', { staleTime: 15 * 60_000 });
}

export function useTopicDetailQuery(slug: string) {
  return useApiQuery<ApiTopicDetail>(['topic', slug], slug ? `/api/topics/${encodeURIComponent(slug)}` : null);
}
