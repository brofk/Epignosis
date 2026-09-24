import {readFileSync,readdirSync} from 'node:fs';
import {relative,resolve} from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const root=process.cwd();
const packageJson=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const runtimePackages=packageJson.dependencies??{};
const redisPackage=/redis|upstash/i;
const redisSource=/(?:@upstash\/redis|\bioredis\b|(?:from|require\s*\()\s*['"]redis['"]|\bcreateClient\s*\(|\b(?:UPSTASH_REDIS_REST_URL|UPSTASH_REDIS_REST_TOKEN|REDIS_URL|REDIS_TLS_URL|REDIS_HOST|REDIS_PASSWORD|REDIS_TOKEN|KV_REST_API_URL|KV_REST_API_TOKEN)\b)/;
const excludedDirectories=new Set(['.git','.next','.sites-runtime','.turbo','.wrangler','coverage','dist','node_modules']);
const excludedFiles=new Set(['pnpm-lock.yaml','package-lock.json','yarn.lock','SECURITY_ARCHITECTURE.md','redis-architecture.test.mjs']);
const reviewedFile=/\.(?:cjs|env|js|json|jsx|mjs|sh|toml|ts|tsx|yaml|yml)$/i;

test('Redis or Upstash cannot enter the runtime without a dedicated security review',()=>{
  const packages=Object.keys(runtimePackages).filter(name=>redisPackage.test(name));
  const sourceFiles=walk(root);
  const sourceSignals=sourceFiles
    .filter(file=>redisSource.test(readFileSync(file,'utf8')))
    .map(file=>relative(root,file));

  assert.deepEqual(packages,[],securityMessage('runtime packages',packages));
  assert.deepEqual(sourceSignals,[],securityMessage('source or environment references',sourceSignals));
});

function walk(directory){
  const files=[];
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    if(entry.isDirectory()){
      if(!excludedDirectories.has(entry.name))files.push(...walk(resolve(directory,entry.name)));
      continue;
    }
    if(!entry.isFile()||excludedFiles.has(entry.name))continue;
    if(reviewedFile.test(entry.name)||entry.name.startsWith('.env'))files.push(resolve(directory,entry.name));
  }
  return files;
}

function securityMessage(kind,items){
  return [
    `Unreviewed Redis or Upstash ${kind} detected: ${items.join(', ')}`,
    'This website currently uses Sites authentication and Cloudflare D1, not Redis.',
    'Do not weaken this test to make the build pass.',
    'Before Redis is introduced, approve a separate security change that documents the exact commands and key prefixes, creates a least-privilege ACL user, rotates and stores credentials as secrets, defines session invalidation, and verifies a provider-supported network restriction.',
  ].join('\n');
}
