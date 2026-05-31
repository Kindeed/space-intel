export function parseOptionalPositiveInteger(value: string | null): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parsePositiveInteger(value: string | null, fallback: number): number {
  return parseOptionalPositiveInteger(value) ?? fallback;
}

export function parseOptionalText(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
