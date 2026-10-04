// Isolated production-build test runtime. It cannot connect to production D1/R2.
import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const state=resolve(root,'.wrangler/browser-tests');
rmSync(state,{recursive:true,force:true});mkdirSync(state,{recursive:true});
const built=resolve(root,'dist/server');
const config=JSON.parse(readFileSync(resolve(built,'wrangler.json'),'utf8'));
config.vars={SITE_ORIGIN:'http://127.0.0.1:4174',RATE_LIMIT_SALT:'synthetic-browser-test-only'};
const configPath=resolve(built,'browser.wrangler.json');writeFileSync(configPath,JSON.stringify(config));
const command=resolve(root,'node_modules/wrangler/bin/wrangler.js');
for(const file of readdirSync(resolve(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort()){
 const result=spawnSync(process.execPath,[command,'d1','execute','DB','--local','--persist-to',state,'--config',configPath,'--file',resolve(root,'drizzle',file)],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'}});
 if(result.status!==0)process.exit(result.status??1);
}
const child=spawn(process.execPath,['--import',resolve(root,'scripts/sites-env.mjs'),command,'dev','--config',configPath,'--local','--persist-to',state,'--ip','127.0.0.1','--port','4174','--inspector-port','0'],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exit(1);});
child.on('exit',code=>process.exit(code??1));
