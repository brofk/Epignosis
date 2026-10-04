import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,[
 '--enable-source-maps','--test','--experimental-test-coverage',
 '--test-coverage-include=lib/**/*.ts','--test-coverage-include=app/chatgpt-auth.ts',
 '--test-coverage-exclude=lib/defaults.ts','--test-coverage-exclude=lib/write-sql.ts',
 '--test-coverage-lines=60','--test-coverage-branches=60','--test-coverage-functions=60',
 'tests/unit.test.mjs','tests/csp.test.mjs','tests/staging-sanitizer.test.mjs',
 'tests/ai-architecture.test.mjs','tests/redis-architecture.test.mjs'
],{cwd:new URL('..',import.meta.url),stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
