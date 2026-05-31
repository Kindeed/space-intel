export function normalizePositiveInteger(value: number | string | null | undefined, fallback: number): number {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      return fallback;
    }

    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export function normalizeBoundedPositiveInteger(
  value: number | string | null | undefined,
  fallback: number,
  max: number,
): number {
  return Math.min(normalizePositiveInteger(value, fallback), max);
}
