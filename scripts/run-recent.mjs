import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Use the project's existing Vite/esbuild toolchain; no additional runtime service.
const require = createRequire(import.meta.resolve('vite'));
const { build } = require('esbuild');
await mkdir('.recent', { recursive: true });
const task=process.argv.includes('--task=r2')?'preview-r2':'collect-recent';
await build({
  entryPoints: [`scripts/${task}.ts`], outfile: `.recent/${task}.mjs`,
  platform: 'node', format: 'esm', target: 'node24', bundle: true,
  packages: 'external', logLevel: 'warning',
});
await import(`${pathToFileURL(resolve(`.recent/${task}.mjs`)).href}?run=${Date.now()}`);
