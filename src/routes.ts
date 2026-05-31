function routeSegment(value: string | number): string {
  return encodeURIComponent(String(value).trim());
}

export function articleDetailPath(idOrSlug: string | number): string {
  return `/articles/${routeSegment(idOrSlug)}`;
}

export function companyDetailPath(slug: string | number): string {
  return `/companies/${routeSegment(slug)}`;
}

export function launchDetailPath(idOrSlug: string | number): string {
  return `/launches/${routeSegment(idOrSlug)}`;
}

export function topicDetailPath(slug: string | number): string {
  return `/topics/${routeSegment(slug)}`;
}
