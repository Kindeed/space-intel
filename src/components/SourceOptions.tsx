import { useSourcesQuery } from '../hooks/queries';

function normalizeOptionText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function compactOptionText(value: string | null | undefined): string {
  return normalizeOptionText(value).replace(/\s+/g, '');
}

function sourceOptionName(name: string): string {
  return normalizeOptionText(name) || '来源';
}

export function SourceOptions({ categoryLabel, categoryLabels }: { categoryLabel?: string; categoryLabels?: string[] }) {
  const state = useSourcesQuery();
  const allowedCategoryLabels = categoryLabels ?? (categoryLabel ? [categoryLabel] : undefined);
  const allowedCategoryKeys = allowedCategoryLabels?.map(compactOptionText).filter(Boolean);
  const sources = (state.data?.items ?? []).filter(
    (source) => !allowedCategoryKeys?.length || allowedCategoryKeys.includes(compactOptionText(source.categoryLabel)),
  );
  const statusLabel = state.isLoading
    ? '来源加载中'
    : state.error
      ? '来源暂不可用'
      : '暂无可选来源';

  return (
    <>
      {sources.length
        ? sources.map((source, index) => {
            const optionName = sourceOptionName(source.name);
            const publicBadge = normalizeOptionText(source.publicBadge);

            return (
              <option key={`${optionName}:${index}`} value={optionName}>
                {publicBadge ? `${optionName}（${publicBadge}）` : optionName}
              </option>
            );
          })
        : (
            <option value="__source_status" disabled>
              {statusLabel}
            </option>
          )}
    </>
  );
}
