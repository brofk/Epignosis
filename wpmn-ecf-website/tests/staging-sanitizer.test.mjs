import test from 'node:test';
import assert from 'node:assert/strict';
import {datasetShape,findSensitiveValues,sanitizeDataset} from '../scripts/migrations/staging-data-lib.mjs';

const sample={
 editors:[{user_id:'user_real_123',email:'pastor@example.com',role:'owner',created_at:'2026-09-24T00:00:00Z'}],
 claims:[{id:'claim_real_123',user_id:'user_real_123'}],
 submissions:[{
  id:'submission_real_1',category:'prayer',payload:JSON.stringify({firstName:'Sample',email:'person@example.com',phone:'+63 917 123 4567',prayerRequest:'This is synthetic test data, not a real prayer.',credentials:{apiKey:'ordinary-value',access_key:'access-value',owner_key:'owner-secret-value',api_key_id:'key-id-value',authorization:'Bearer ordinary-value',password:'plain-value',session:'opaque-value'}}),
  confidential:1,team:'Pastoral Team',status:'New',assignee:'Sample Pastor',first_name:'Sample',last_name:'Person',full_name:'Sample Person',display_name:'Sample Display',given_name:'Sample Given',family_name:'Sample Family',contact_name:'Sample Contact',owner_name:'Sample Pastor',submitted_by:'Sample Submitter',created_by:'Sample Creator',updated_by:'Sample Updater',requested_by:'Sample Requester',reviewed_by:'Sample Reviewer',assigned_by:'Sample Assigner',comments_text:'Pastoral comment',unanticipated:'Personal detail',follow_up:'',response_due_at:'',notes:'Synthetic private note',tags:'["pastoral-care"]',created_at:'2026-09-24T00:00:00Z',updated_at:'2026-09-24T00:00:00Z'
 }],
 rate_limits:[{key:'ip-derived-value',count:2,expires_at:1790208000}],
 records:[{id:'record_real_1',kind:'article',title:'Synthetic Article',slug:'synthetic-article',status:'draft',data:JSON.stringify({summary:'Contact person@example.com for the synthetic example.'}),metadata:JSON.stringify({contact:'alternate@example.com',phone:'+63 918 765 4321',password:'alternate-plain-value',pastoralNote:'Synthetic pastoral detail',misc:'Bearer abcDEF1234567890 then call +63 919 555 0101',opaque:'Abcdefghijklmnopqrstuvwxyz1234567890'}),version:1,updated_at:'2026-09-24T00:00:00Z'}]
};

test('sanitizer preserves table, row, and column shape while removing identities',()=>{
 const sanitized=sanitizeDataset(sample);
 assert.deepEqual(datasetShape(sanitized),datasetShape(sample));
 assert.equal(sanitized.submissions[0].category,'prayer');
 assert.equal(sanitized.submissions[0].confidential,1);
 assert.notEqual(sanitized.submissions[0].created_at,sample.submissions[0].created_at);
 assert.notEqual(sanitized.submissions[0].updated_at,sample.submissions[0].updated_at);
 assert.equal(sanitized.submissions[0].created_at,sanitized.submissions[0].updated_at);
 assert.match(sanitized.submissions[0].created_at,/^\d{4}-\d{2}-\d{2}T/);
 assert.notEqual(sanitized.rate_limits[0].expires_at,sample.rate_limits[0].expires_at);
 assert.notEqual(sanitized.editors[0].user_id,sample.editors[0].user_id);
 assert.match(sanitized.editors[0].email,/@example\.invalid$/);
 assert.ok(!JSON.stringify(sanitized).includes('person@example.com'));
 assert.ok(!JSON.stringify(sanitized).includes('+63 917 123 4567'));
 assert.ok(!JSON.stringify(sanitized).includes('Synthetic private note'));
 assert.ok(!JSON.stringify(sanitized).includes('Pastoral comment'));
 assert.ok(!JSON.stringify(sanitized).includes('Personal detail'));
 assert.notEqual(sanitized.submissions[0].first_name,sample.submissions[0].first_name);
 assert.notEqual(sanitized.submissions[0].last_name,sample.submissions[0].last_name);
 assert.notEqual(sanitized.submissions[0].full_name,sample.submissions[0].full_name);
 assert.notEqual(sanitized.submissions[0].display_name,sample.submissions[0].display_name);
 assert.notEqual(sanitized.submissions[0].given_name,sample.submissions[0].given_name);
 assert.notEqual(sanitized.submissions[0].family_name,sample.submissions[0].family_name);
 assert.notEqual(sanitized.submissions[0].contact_name,sample.submissions[0].contact_name);
 assert.notEqual(sanitized.submissions[0].owner_name,sample.submissions[0].owner_name);
 assert.notEqual(sanitized.submissions[0].submitted_by,sample.submissions[0].submitted_by);
 assert.notEqual(sanitized.submissions[0].created_by,sample.submissions[0].created_by);
 assert.notEqual(sanitized.submissions[0].updated_by,sample.submissions[0].updated_by);
 assert.notEqual(sanitized.submissions[0].requested_by,sample.submissions[0].requested_by);
 assert.notEqual(sanitized.submissions[0].reviewed_by,sample.submissions[0].reviewed_by);
 assert.notEqual(sanitized.submissions[0].assigned_by,sample.submissions[0].assigned_by);
 const sanitizedPayload=JSON.parse(sanitized.submissions[0].payload);
 assert.match(sanitizedPayload.credentials.apiKey,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.access_key,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.owner_key,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.api_key_id,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.authorization,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.password,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.session,/^test_secret_/);
 assert.ok(!JSON.stringify(sanitizedPayload).includes('ordinary-value'));
 assert.ok(!JSON.stringify(sanitizedPayload).includes('plain-value'));
 assert.ok(!JSON.stringify(sanitizedPayload).includes('opaque-value'));
 const sanitizedMetadata=JSON.parse(sanitized.records[0].metadata);
 assert.ok(!JSON.stringify(sanitizedMetadata).includes('alternate@example.com'));
 assert.ok(!JSON.stringify(sanitizedMetadata).includes('+63 918 765 4321'));
 assert.match(sanitizedMetadata.password,/^test_secret_/);
 assert.ok(!JSON.stringify(sanitizedMetadata).includes('Synthetic pastoral detail'));
 assert.match(sanitizedMetadata.misc,/^test_secret_/);
 assert.ok(!sanitizedMetadata.misc.includes('+63 919 555 0101'));
 assert.match(sanitizedMetadata.opaque,/^test_secret_/);
 assert.deepEqual(findSensitiveValues(sanitized,{denylist:['Sample Pastor','user_real_123']}),[]);
});

test('date shifting is deterministic and preserves ordering',()=>{
 const dated={rows:[
  {id:'one',created_at:'2026-01-01T00:00:00Z',date:'2026-01-01'},
  {id:'two',created_at:'2026-01-03T00:00:00Z',date:'2026-01-03'}
 ]};
 const first=sanitizeDataset(dated);
 const second=sanitizeDataset(dated);
 assert.deepEqual(first,second);
 assert.notEqual(first.rows[0].created_at,dated.rows[0].created_at);
 assert.equal(Date.parse(first.rows[1].created_at)-Date.parse(first.rows[0].created_at),2*24*60*60*1000);
 assert.equal(Date.parse(`${first.rows[1].date}T00:00:00Z`)-Date.parse(`${first.rows[0].date}T00:00:00Z`),2*24*60*60*1000);
});

test('leak scanner rejects unsanitized email, phone, token, and denylisted values',()=>{
 const unsafe={rows:[{email:'real.person@example.com',notes:'Call +63 917 555 1212 for Known Person',details:JSON.stringify({authorization:'Bearer ordinary-value',password:'plain-value',alternateEmail:'alternate@example.com',misc:'Bearer abcDEF1234567890',opaque:'Abcdefghijklmnopqrstuvwxyz1234567890'}),token:'sk_live_1234567890abcdef'}]};
 const findings=findSensitiveValues(unsafe,{denylist:['Known Person']});
 assert.deepEqual(new Set(findings.map(item=>item.type)),new Set(['email','phone','token','denylist','secret-field']));
});

test('sanitizer rejects a malformed table export',()=>{
 assert.throws(()=>sanitizeDataset({submissions:{id:'not-an-array'}}),/array of rows/);
 assert.throws(()=>sanitizeDataset({submissions:[null]}),/Table submissions row 0 must be an object/);
 assert.throws(()=>sanitizeDataset({submissions:['not-an-object']}),/Table submissions row 0 must be an object/);
 assert.throws(()=>datasetShape({submissions:[42]}),/Table submissions row 0 must be an object/);
});
