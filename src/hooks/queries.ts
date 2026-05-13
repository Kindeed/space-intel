import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  ApiArticleDetail,
  ApiArticleListResult,
  ApiCompany,
  ApiCompanyDetail,
  ApiLaunch,
  ApiLaunchListResult,
  ApiMarketListResult,
  ApiSource,
  ApiTopic,
  ApiTopicDetail,
} from '../types';

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function useApiQuery<T>(key: readonly unknown[], path: string | null): UseQueryResult<T, Error> {
  return useQuery({
    queryKey: key,
    queryFn: () => fetchJson<T>(path ?? ''),
    enabled: Boolean(path),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useArticlesQuery(path: string) {
  return useApiQuery<ApiArticleListResult>(['articles', path], path);
}

export function useArticleDetailQuery(slug: string) {
  return useApiQuery<ApiArticleDetail>(['article', slug], slug ? `/api/articles/${encodeURIComponent(slug)}` : null);
}

export function useCompaniesQuery() {
  return useApiQuery<{ items: ApiCompany[] }>(['companies'], '/api/companies');
}

export function useCompanyDetailQuery(slug: string) {
  return useApiQuery<ApiCompanyDetail>(['company', slug], slug ? `/api/companies/${encodeURIComponent(slug)}` : null);
}

export function useLaunchesQuery(path: string) {
  return useApiQuery<ApiLaunchListResult>(['launches', path], path);
}

export function useLaunchDetailQuery(slug: string) {
  return useApiQuery<ApiLaunch>(['launch', slug], slug ? `/api/launches/${encodeURIComponent(slug)}` : null);
}

export function useMarketQuery(path: string) {
  return useApiQuery<ApiMarketListResult>(['market', path], path);
}

export function useSourcesQuery() {
  return useApiQuery<{ items: ApiSource[] }>(['sources'], '/api/sources');
}

export function useTopicsQuery() {
  return useApiQuery<{ items: ApiTopic[] }>(['topics'], '/api/topics');
}

export function useTopicDetailQuery(slug: string) {
  return useApiQuery<ApiTopicDetail>(['topic', slug], slug ? `/api/topics/${encodeURIComponent(slug)}` : null);
}
