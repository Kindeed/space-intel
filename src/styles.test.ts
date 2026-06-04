import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('global styles', () => {
  it('centers pagination controls instead of leaving them left aligned', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');
    const paginationRowRule = css.match(/\.pagination-row\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? '';

    expect(paginationRowRule).toMatch(/justify-content:\s*center;/);
  });
});
