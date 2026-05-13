import { useSourcesQuery } from '../hooks/queries';

const fallbackSources = [
  { key: 'snapi', name: 'Spaceflight News API' },
  { key: 'google-news-cn-commercial-space', name: 'Google News RSS - 商业航天' },
];

export function SourceOptions() {
  const state = useSourcesQuery();
  const sources = state.data?.items ?? fallbackSources;

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
