import { useSourcesQuery } from '../hooks/queries';

export function SourceOptions({ type }: { type?: string }) {
  const state = useSourcesQuery();
  const sources = (state.data?.items ?? []).filter((source) => !type || source.type === type);

  return (
    <>
      {sources.map((source) => (
        <option key={source.key} value={source.key}>
          {source.name}
        </option>
      ))}
    </>
  );
}
