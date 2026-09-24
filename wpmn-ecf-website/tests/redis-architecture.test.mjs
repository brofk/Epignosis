import {readFileSync,globSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const root=process.cwd();
const packageJson=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const runtimePackages={...packageJson.dependencies,...packageJson.devDependencies};
const redisPackage=/redis|upstash/i;
const redisSource=/(?:@upstash\/redis|\bioredis\b|(?:from|require\s*\()\s*['"]redis['"]|\bcreateClient\s*\(|\b(?:UPSTASH_REDIS_REST_URL|UPSTASH_REDIS_REST_TOKEN|REDIS_URL|REDIS_TLS_URL|REDIS_HOST|REDIS_PASSWORD|REDIS_TOKEN|KV_REST_API_URL|KV_REST_API_TOKEN)\b)/;

test('Redis or Upstash cannot enter the runtime without a dedicated security review',()=>{
  const packages=Object.keys(runtimePackages).filter(name=>redisPackage.test(name));
  const sourceFiles=[
    ...globSync('{app,components,lib,scripts}/**/*.{ts,tsx,js,mjs,cjs,json}',{cwd:root}),
    '.env.example',
    '.openai/hosting.json',
  ];
  const sourceSignals=sourceFiles.filter(file=>redisSource.test(readFileSync(file,'utf8')));

  assert.deepEqual(packages,[],securityMessage('runtime packages',packages));
  assert.deepEqual(sourceSignals,[],securityMessage('source or environment references',sourceSignals));
});

function securityMessage(kind,items){
  return [
    `Unreviewed Redis or Upstash ${kind} detected: ${items.join(', ')}`,
    'This website currently uses Sites authentication and Cloudflare D1, not Redis.',
    'Do not weaken this test to make the build pass.',
    'Before Redis is introduced, approve a separate security change that documents the exact commands and key prefixes, creates a least-privilege ACL user, rotates and stores credentials as secrets, defines session invalidation, and verifies a provider-supported network restriction.',
  ].join('\n');
}
