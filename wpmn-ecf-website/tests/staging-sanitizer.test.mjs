import test from 'node:test';
import assert from 'node:assert/strict';
import {datasetShape,findSensitiveValues,sanitizeDataset} from '../scripts/migrations/staging-data-lib.mjs';

const sample={
 editors:[{user_id:'user_real_123',email:'pastor@example.com',role:'owner',created_at:'2026-09-24T00:00:00Z'}],
 claims:[{id:'claim_real_123',user_id:'user_real_123'}],
 submissions:[{
  id:'submission_real_1',category:'prayer',payload:JSON.stringify({firstName:'Sample',email:'person@example.com',phone:'+63 917 123 4567',prayerRequest:'This is synthetic test data, not a real prayer.',credentials:{apiKey:'ordinary-value',authorization:'Bearer ordinary-value',password:'plain-value',session:'opaque-value'}}),
  confidential:1,team:'Pastoral Team',status:'New',assignee:'Sample Pastor',follow_up:'',response_due_at:'',notes:'Synthetic private note',tags:'["pastoral-care"]',created_at:'2026-09-24T00:00:00Z',updated_at:'2026-09-24T00:00:00Z'
 }],
 rate_limits:[{key:'ip-derived-value',count:2,expires_at:1790208000}],
 records:[{id:'record_real_1',kind:'article',title:'Synthetic Article',slug:'synthetic-article',status:'draft',data:JSON.stringify({summary:'Contact person@example.com for the synthetic example.'}),version:1,updated_at:'2026-09-24T00:00:00Z'}]
};

test('sanitizer preserves table, row, and column shape while removing identities',()=>{
 const sanitized=sanitizeDataset(sample);
 assert.deepEqual(datasetShape(sanitized),datasetShape(sample));
 assert.equal(sanitized.submissions[0].category,'prayer');
 assert.equal(sanitized.submissions[0].confidential,1);
 assert.notEqual(sanitized.editors[0].user_id,sample.editors[0].user_id);
 assert.match(sanitized.editors[0].email,/@example\.invalid$/);
 assert.ok(!JSON.stringify(sanitized).includes('person@example.com'));
 assert.ok(!JSON.stringify(sanitized).includes('+63 917 123 4567'));
 assert.ok(!JSON.stringify(sanitized).includes('Synthetic private note'));
 const sanitizedPayload=JSON.parse(sanitized.submissions[0].payload);
 assert.match(sanitizedPayload.credentials.apiKey,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.authorization,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.password,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.session,/^test_secret_/);
 assert.ok(!JSON.stringify(sanitizedPayload).includes('ordinary-value'));
 assert.ok(!JSON.stringify(sanitizedPayload).includes('plain-value'));
 assert.ok(!JSON.stringify(sanitizedPayload).includes('opaque-value'));
 assert.deepEqual(findSensitiveValues(sanitized,{denylist:['Sample Pastor','user_real_123']}),[]);
});

test('leak scanner rejects unsanitized email, phone, token, and denylisted values',()=>{
 const unsafe={rows:[{email:'real.person@example.com',notes:'Call +63 917 555 1212 for Known Person',payload:JSON.stringify({authorization:'Bearer ordinary-value',password:'plain-value'}),token:'sk_live_1234567890abcdef'}]};
 const findings=findSensitiveValues(unsafe,{denylist:['Known Person']});
 assert.deepEqual(new Set(findings.map(item=>item.type)),new Set(['email','phone','token','denylist','secret-field']));
});

test('sanitizer rejects a malformed table export',()=>{
 assert.throws(()=>sanitizeDataset({submissions:{id:'not-an-array'}}),/array of rows/);
});
