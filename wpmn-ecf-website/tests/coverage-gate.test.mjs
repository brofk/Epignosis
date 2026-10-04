import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('coverage rejects passing assertions when coverage falls below 60 percent',()=>{
 const cwd=mkdtempSync(join(tmpdir(),'coverage-gate-'));
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 try{
  writeFileSync(join(cwd,'feature.mjs'),'export function feature(value){\n if(value){\n return 1;\n }else{\n let result=0;\n result+=1;\n result+=2;\n result+=3;\n result+=4;\n result+=5;\n result+=6;\n return result;\n }\n}\n');
  writeFileSync(join(cwd,'feature.test.mjs'),"import {test} from 'node:test';import assert from 'node:assert/strict';import {feature} from './feature.mjs';test('feature',()=>assert.equal(feature(true),1));");
  const run=threshold=>spawnSync(process.execPath,['--test','--experimental-test-coverage','--test-coverage-include=feature.mjs',`--test-coverage-lines=${threshold}`,'feature.test.mjs'],{cwd,env,encoding:'utf8'});
  const passing=run(0),failing=run(60);assert.equal(passing.status,0,passing.stdout+passing.stderr);assert.equal(failing.status,1,failing.stdout+failing.stderr);
  assert.match(failing.stdout+failing.stderr,/coverage/);
 }finally{rmSync(cwd,{recursive:true,force:true});}
});
