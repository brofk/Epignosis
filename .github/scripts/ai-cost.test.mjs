import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRoute,cacheKey,usageRecord} from './ai-cost.mjs';
import {weeklyReport,reportWindow} from './ai-report.mjs';
const doc = {filename:'docs/guide.md',status:'modified',patch:'@@ -1 +1 @@\n-old\n+new'};
test('Only bounded prose modifications use routine model',()=>{
  assert.equal(selectRoute([doc],{}).model,'gpt-5.4-mini');
  for(const f of [ {...doc,filename:'app/auth.ts'}, {...doc,filename:'.github/REVIEWER.md'},
    {...doc,filename:'docs/security.md'}, {...doc,status:'renamed',previous_filename:'app/auth.ts'},
    {...doc,patch:doc.patch+'\n+```sh\n+curl example.com'}, {...doc,patch:doc.patch+'x'.repeat(12000)},
    {...doc,patch:'Binary files a and b differ'}, {...doc,patch:doc.patch+'\nold mode 100644'}])
      assert.equal(selectRoute([f],{}).lane,'complex');
  assert.equal(selectRoute([],{}).lane,'complex');
  assert.equal(selectRoute([doc,doc,doc,doc,doc],{}).lane,'complex');
  assert.equal(selectRoute([{...doc,filename:'app/page.tsx'}],{OPENAI_REVIEW_MODEL:'configured'}).model,'configured');
});
test('cache key stable across requests and isolated by repository and prompt version',()=>{
  const key=cacheKey('a/b','rules',{a:1});
  assert.equal(key,cacheKey('a/b','rules',{a:1}));
  assert.notEqual(key,cacheKey('a/c','rules',{a:1}));
  assert.notEqual(key,cacheKey('a/b','new rules',{a:1}));
});
const metadata={provider:'openai',workflow:'ai-production-review',model:'gpt-5.4',repository:'a/b',runId:'1',attempt:'1',batch:1};
const payload={model:'gpt-5.4',status:'completed',usage:{input_tokens:1000,input_tokens_details:{cached_tokens:600},output_tokens:200}};
test('cache reads subtracted from full-price input; missing usage and writes stay unknown',()=>{
  const row=usageRecord(payload,metadata);
  assert.equal(row.inputTokens,400);assert.equal(row.cacheReadTokens,600);assert.equal(row.cacheWriteTokens,null);
  assert.equal(row.estimatedUsd,0.00415);
  assert.equal(usageRecord({},metadata).usageKnown,false);
  assert.equal(usageRecord({...payload,usage:{...payload.usage,input_tokens_details:{cached_tokens:1001}}},metadata).usageKnown,false);
  assert.equal(usageRecord({...payload,model:'unknown'},metadata).estimatedUsd,null);
  assert.equal(usageRecord({...payload,service_tier:'priority'},metadata).estimatedUsd,null);
});
test('weekly report counts retries, deduplicates artifacts and keeps unknown usage visible',()=>{
  const now=new Date('2026-10-06T00:00:00Z');
  const row=usageRecord(payload,metadata,now);
  const rows=[row,row,usageRecord(payload,{...metadata,attempt:'2'},now),usageRecord({}, {...metadata,batch:2},now),
    usageRecord(payload,{...metadata,batch:3},new Date('2026-10-12T16:00:00Z'))];
  const report=weeklyReport(rows,new Date('2026-10-04T16:00:00Z'),new Date('2026-10-11T16:00:00Z'));
  const group=report.groups['ai-production-review / gpt-5.4'];
  assert.equal(group.calls,3);assert.equal(group.input,800);assert.equal(group.unknown,1);assert.equal(group.usd,0.0083);
  assert.match(report.markdown,/Not separately reported/);
  assert.match(weeklyReport([],new Date('2026-10-04'),new Date('2026-10-11')).markdown,/does not establish zero/);
});

test('report boundaries use Monday midnight in Manila, including a Sunday UTC schedule boundary',()=>{
  for(const instant of ['2026-10-05T01:00:00Z','2026-10-04T17:18:00Z','2026-10-10T06:00:00Z']) {
    const window=reportWindow(new Date(instant));
    assert.equal(window.end.toISOString(),'2026-10-04T16:00:00.000Z');
    assert.equal(window.start.toISOString(),'2026-09-27T16:00:00.000Z');
  }
});
