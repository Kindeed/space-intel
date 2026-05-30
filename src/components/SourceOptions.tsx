import { useSourcesQuery } from '../hooks/queries';

export function SourceOptions({ type, types }: { type?: string; types?: string[] }) {
  const state = useSourcesQuery();
  const allowedTypes = types ?? (type ? [type] : undefined);
  const sources = (state.data?.items ?? []).filter((source) => !allowedTypes || allowedTypes.includes(source.type));

  return (
    <>
      {sources.map((source) => (
        <option key={source.key} value={source.key}>
          {source.publicBadge ? `${source.name}（${source.publicBadge}）` : source.name}
        </option>
      ))}
    </>
  );
}
