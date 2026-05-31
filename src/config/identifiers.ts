import { z } from 'zod';

export const routeSafeIdentifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function routeSafeIdentifierSchema(label: string): z.ZodString {
  return z
    .string()
    .trim()
    .regex(routeSafeIdentifierPattern, `${label} must use lowercase letters, numbers, and single hyphen separators`);
}
