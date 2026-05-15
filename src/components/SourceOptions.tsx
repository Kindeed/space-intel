import { useSourcesQuery } from '../hooks/queries';

export function SourceOptions() {
  const state = useSourcesQuery();
  const sources = state.data?.items ?? [];

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
