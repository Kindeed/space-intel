import {mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.resolve('vite'));
const {build}=require('esbuild');
await mkdir('.recent/deploy/site',{recursive:true});
await cp('dist','.recent/deploy/site',{recursive:true});
// Runtime data is read from the isolated R2 prefix, never baked into a deploy.
await rm('.recent/deploy/site/recent',{recursive:true,force:true});
const pilot=JSON.parse(await readFile('config/recent-pilot.json','utf8')).sources;
const sources=JSON.parse(await readFile('config/sources.generated.json','utf8')).sources;
const allowed=Object.fromEntries(sources.filter(source=>pilot.includes(source.key)&&source.region==='cn'&&['official_page','procurement_page'].includes(source.type)).map(source=>[source.key,source.url]));
await build({entryPoints:['src/workers/recentPreview.ts'],outfile:'.recent/deploy/site/_worker.js',format:'esm',platform:'browser',target:'es2022',bundle:true,define:{__RECENT_ALLOWED_SOURCES__:JSON.stringify(allowed)}});
await writeFile('.recent/deploy/site/_routes.json',JSON.stringify({version:1,include:['/','/recent','/recent/*','/api/*'],exclude:['/assets/*','/favicon.ico']}));
const config=(await readFile('wrangler.preview.toml','utf8'))
  .replace(/^account_id\s*=.*\r?\n/m,'')
  .replace('pages_build_output_dir = ".recent/deploy/site"','pages_build_output_dir = "site"');
if(config.includes('d1_databases'))throw new Error('Preview must not bind a production database');
await writeFile('.recent/deploy/wrangler.toml',config);
console.log('Prepared an isolated Pages preview: static app + one read-only R2 route, no D1 binding.');
