import {readFile,mkdir,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const config=JSON.parse(await readFile('config/sources.generated.json','utf8')).sources;
const keys=['cnsa-policy','recent-orbita','regional-42565815064d','ttc-tyspace'];
await mkdir('.recent/transport-probe',{recursive:true});
console.log(JSON.stringify({probe:true,maxRequests:8,node:process.version,proxyConfigured:Boolean(process.env.HTTPS_PROXY||process.env.https_proxy||process.env.HTTP_PROXY||process.env.http_proxy)}));
for(const key of keys){
 const source=config.find(item=>item.key===key);if(!source)throw new Error('Unknown source');
 try{const response=await fetch(source.url,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'user-agent':'SpaceIntelBot/1.0 (+https://space.bytebaud.com)',accept:'text/html, application/xhtml+xml'}});await response.body?.cancel();console.log(JSON.stringify({source:key,transport:'node',status:response.status}));}
 catch(error){let entry=error;const codes=[];for(let i=0;i<4&&entry;i++,entry=entry.cause){if(typeof entry.code==='string')codes.push(entry.code);if(entry.errors)codes.push(...entry.errors.map(value=>value.code).filter(Boolean));}console.log(JSON.stringify({source:key,transport:'node',codes}));}
 const file=`.recent/transport-probe/${key}.html`;
 try{const result=await exec('curl',['--ipv4','--silent','--show-error','--max-time','12','--max-filesize','4194304','--user-agent','SpaceIntelBot/1.0 (+https://space.bytebaud.com)','--header','Accept: text/html, application/xhtml+xml','--output',file,'--write-out','%{http_code}',source.url],{timeout:15000,maxBuffer:4096,windowsHide:true});console.log(JSON.stringify({source:key,transport:'curl-ipv4',status:Number(result.stdout),bytes:(await stat(file)).size}));}
 catch(error){console.log(JSON.stringify({source:key,transport:'curl-ipv4',exit:error.code}));}
}
