import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,existsSync,renameSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {completeDiff,changedRightLines,reviewBatches,validateReview} from './review-diff.mjs';

function fixture(run){
  const cwd=mkdtempSync(join(tmpdir(),'review-diff-'));
  const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
  try{
    git('init','-q');git('config','user.name','Reviewer fixture');git('config','user.email','reviewer@example.invalid');
    writeFileSync(join(cwd,'existing.txt'),'one\ntwo\nthree\n');writeFileSync(join(cwd,'remove.txt'),'deleted\n');
    git('add','.');git('commit','-qm','base');const base=git('rev-parse','HEAD');
    run({cwd,git,base});
  }finally{rmSync(cwd,{recursive:true,force:true});}
}

test('retrieves a complete omitted patch from exact commits, not the working tree',()=>fixture(({cwd,git,base})=>{
  writeFileSync(join(cwd,'large.yaml'),Array.from({length:200},(_,i)=>`entry-${i}: value-${i}`).join('\n'));
  git('add','.');git('commit','-qm','large file');const head=git('rev-parse','HEAD');
  writeFileSync(join(cwd,'large.yaml'),'uncommitted content');
  const files=completeDiff([{filename:'large.yaml',status:'added',additions:200,deletions:0}],{cwd,baseSha:base,headSha:head});
  assert.match(files[0].patch,/entry-199/);assert.doesNotMatch(files[0].patch,/uncommitted/);
  assert.equal(changedRightLines(files[0].patch).size,200);
}));
test('rejects missing manifest coverage and invalid commit identity',()=>fixture(({cwd,git,base})=>{
  writeFileSync(join(cwd,'one.txt'),'new');writeFileSync(join(cwd,'two.txt'),'new');git('add','.');git('commit','-qm','changes');
  const options={cwd,baseSha:base,headSha:git('rev-parse','HEAD')};
  assert.throws(()=>completeDiff([{filename:'one.txt'}],options),/manifest/);
  assert.throws(()=>completeDiff([{filename:'one.txt'}],{...options,headSha:'--upload-pack=bad'}),/identity/);
}));
test('handles renamed, deleted, binary and mode-only changes without executing diff drivers',()=>fixture(({cwd,git,base})=>{
  renameSync(join(cwd,'existing.txt'),join(cwd,'renamed.txt'));rmSync(join(cwd,'remove.txt'));
  writeFileSync(join(cwd,'image.png'),Buffer.from([0,1,2,3,0]));
  writeFileSync(join(cwd,'tool.sh'),'echo safe\n');git('add','.');git('commit','-qm','mixed changes');
  const files=completeDiff([{filename:'renamed.txt',previous_filename:'existing.txt',status:'renamed'},{filename:'remove.txt',status:'removed'},{filename:'image.png',status:'added'},{filename:'tool.sh',status:'added'}],{cwd,baseSha:base,headSha:git('rev-parse','HEAD')});
  assert.equal(files.length,4);assert.match(files[2].patch,/Binary files/);
  git('update-index','--chmod=+x','tool.sh');git('commit','-qm','mode');
  const previous=git('rev-parse','HEAD^');const mode=completeDiff([{filename:'tool.sh',status:'modified'}],{cwd,baseSha:previous,headSha:git('rev-parse','HEAD')});
  assert.match(mode[0].patch,/new mode 100755/);
}));
test('does not invoke a configured external diff command or execute symlink targets',()=>fixture(({cwd,git,base})=>{
  git('config','diff.external','touch malicious-marker');
  writeFileSync(join(cwd,'existing.txt'),'changed\n');symlinkSync('/not-a-readable-target',join(cwd,'link'));
  git('add','.');git('commit','-qm','data only');
  completeDiff([{filename:'existing.txt',status:'modified'},{filename:'link',status:'added'}],{cwd,baseSha:base,headSha:git('rev-parse','HEAD')});
  assert.equal(existsSync(join(cwd,'malicious-marker')),false);
}));
test('splits oversized hunks without dropping lines and preserves source line numbers',()=>{
  const patch='@@ -0,0 +1,100 @@\n'+Array.from({length:100},(_,i)=>`+unique-row-${i+1}`).join('\n');
  const batches=reviewBatches([{filename:'lock.yaml',status:'added',additions:100,deletions:0,patch}],{maxBatchCharacters:450,maxTotalCharacters:20_000});
  assert.ok(batches.length>1);assert.ok(batches.every(b=>b.length<=450));
  const text=batches.join('\n');
  for(let i=1;i<=100;i++)assert.equal(text.split(`RIGHT ${i} | +unique-row-${i}\n`).length-1+(text.endsWith(`RIGHT ${i} | +unique-row-${i}`)?1:0),1);
  assert.equal(changedRightLines(patch).size,100);
  assert.throws(()=>reviewBatches([{filename:'lock.yaml',status:'added',additions:100,deletions:0,patch}],{maxBatchCharacters:450,maxTotalCharacters:20_000,maxBatches:1}),/batch count/);
});
test('fails closed on single oversized lines, total-budget overflow and empty input',()=>{
  const file={filename:'file',status:'added',additions:1,deletions:0,patch:'@@ -0,0 +1 @@\n+'+'x'.repeat(1000)};
  assert.throws(()=>reviewBatches([file],{maxBatchCharacters:400}),/single diff line/);
  assert.throws(()=>reviewBatches([{...file,patch:'+ok'}],{maxTotalCharacters:10}),/total review budget/);
  assert.throws(()=>reviewBatches([]),/No review input/);
});
test('uses a merge-base diff so unrelated target-branch work is excluded',()=>fixture(({cwd,git,base})=>{
  git('switch','-qc','feature');writeFileSync(join(cwd,'feature.txt'),'feature');git('add','.');git('commit','-qm','feature');const head=git('rev-parse','HEAD');
  git('switch','-q','--detach',base);writeFileSync(join(cwd,'target.txt'),'target');git('add','.');git('commit','-qm','target');const target=git('rev-parse','HEAD');
  const files=completeDiff([{filename:'feature.txt',status:'added'}],{cwd,baseSha:target,headSha:head});
  assert.equal(files.length,1);assert.doesNotMatch(files[0].patch,/target.txt/);
}));
test('validates severity and complete response shape rather than trusting JSON alone',()=>{
  const finding={severity:'critical',path:'file',line:1,title:'issue',explanation:'why',evidence:'where',suggested_fix:'fix'};
  assert.equal(validateReview({summary:'done',findings:[finding]}).findings.length,1);
  for(const invalid of [{summary:'done',findings:[{...finding,severity:'PASS'}]},{summary:'done',findings:[{...finding,line:0}]},{summary:'done',findings:[{...finding,unexpected:'field'}]},{summary:'done',findings:[],extra:true}])assert.throws(()=>validateReview(invalid),/Invalid structured/);
});
