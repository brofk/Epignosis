import test from 'node:test';
import assert from 'node:assert/strict';
import {datasetShape,findSensitiveValues,sanitizeDataset} from '../scripts/migrations/staging-data-lib.mjs';

const sample={
 editors:[{user_id:'user_real_123',email:'pastor@example.com',role:'owner',created_at:'2026-09-24T00:00:00Z'}],
 claims:[{id:'claim_real_123',user_id:'user_real_123'}],
 submissions:[{
  id:'submission_real_1',category:'prayer',payload:JSON.stringify({firstName:'Sample',first_name:'Sample',last_name:'Person',full_name:'Sample Person',display_name:'Sample Display',given_name:'Sample Given',family_name:'Sample Family',contact_name:'Sample Contact',owner_name:'Sample Pastor',submitted_by:'Sample Submitter',created_by:'Sample Creator',updated_by:'Sample Updater',requested_by:'Sample Requester',reviewed_by:'Sample Reviewer',assigned_by:'Sample Assigner',comments_text:'Pastoral comment',unanticipated:'Personal detail',email:'person@example.com',phone:639171234567,contactValue:639181112222,otp:123456,pin:4321,verificationCode:654321,recovery_code:246810,mfaCode:135790,authCode:111222,user_id:987654,record_id:'record-real-1',submission_id:'submission-real-1',editor_id:'editor-real-1',owner_id:'owner-real-1',relatedRecordId:'related-real-1',consent:true,prayerRequest:'This is synthetic test data, not a real prayer.',status:'Pastoral crisis involving person',role:'Named family member',category:'Private care detail',team:'Specific care relationship',credentials:{apiKey:'ordinary-value',access_key:'access-value',owner_key:'owner-secret-value',api_key_id:'key-id-value',authorization:'Bearer ordinary-value',password:'plain-value',session:'opaque-value'}}),
  confidential:1,team:'Pastoral Team',status:'New',assignee:'Sample Pastor',follow_up:'',response_due_at:'',notes:'Synthetic private note',tags:'["pastoral-care"]',created_at:'2026-09-24T00:00:00Z',updated_at:'2026-09-24T00:00:00Z'
 }],
 rate_limits:[{key:'ip-derived-value',count:2,expires_at:1790208000}],
 records:[{id:'record_real_1',kind:'article',title:'Synthetic Article',slug:'synthetic-article',status:'draft',data:JSON.stringify({summary:'Contact person@example.com for the synthetic example.',contact:'alternate@example.com',phone:'+63 918 765 4321',password:'alternate-plain-value',pastoralNote:'Synthetic pastoral detail',misc:'Bearer abcDEF1234567890 then call +63 919 555 0101',opaque:'Abcdefghijklmnopqrstuvwxyz1234567890'}),version:1,updated_at:'2026-09-24T00:00:00Z'}]
};

test('sanitizer preserves table, row, and column shape while removing identities',()=>{
 const sanitized=sanitizeDataset(sample);
 assert.deepEqual(datasetShape(sanitized),datasetShape(sample));
 assert.equal(sanitized.submissions[0].category,'prayer');
 assert.equal(sanitized.submissions[0].team,'Pastoral Team');
 assert.equal(sanitized.submissions[0].status,'New');
 assert.equal(sanitized.submissions[0].confidential,1);
 assert.notEqual(sanitized.submissions[0].created_at,sample.submissions[0].created_at);
 assert.notEqual(sanitized.submissions[0].updated_at,sample.submissions[0].updated_at);
 assert.equal(sanitized.submissions[0].created_at,sanitized.submissions[0].updated_at);
 assert.match(sanitized.submissions[0].created_at,/^\d{4}-\d{2}-\d{2}T/);
 assert.notEqual(sanitized.rate_limits[0].expires_at,sample.rate_limits[0].expires_at);
 assert.notEqual(sanitized.editors[0].user_id,sample.editors[0].user_id);
 assert.match(sanitized.editors[0].email,/@example\.invalid$/);
 assert.ok(!JSON.stringify(sanitized).includes('person@example.com'));
 assert.ok(!JSON.stringify(sanitized).includes('Synthetic private note'));
 assert.ok(!JSON.stringify(sanitized).includes('Pastoral comment'));
 assert.ok(!JSON.stringify(sanitized).includes('Personal detail'));
 const sanitizedPayload=JSON.parse(sanitized.submissions[0].payload);
 for(const key of ['firstName','first_name','last_name','full_name','display_name','given_name','family_name','contact_name','owner_name','submitted_by','created_by','updated_by','requested_by','reviewed_by','assigned_by'])assert.match(sanitizedPayload[key],/^test_person_/);
 assert.match(sanitizedPayload.credentials.apiKey,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.access_key,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.owner_key,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.api_key_id,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.authorization,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.password,/^test_secret_/);
 assert.match(sanitizedPayload.credentials.session,/^test_secret_/);
 assert.notEqual(sanitizedPayload.status,'Pastoral crisis involving person');
 assert.notEqual(sanitizedPayload.role,'Named family member');
 assert.notEqual(sanitizedPayload.category,'Private care detail');
 assert.notEqual(sanitizedPayload.team,'Specific care relationship');
 assert.equal(sanitizedPayload.phone,0);
 assert.equal(sanitizedPayload.contactValue,0);
 assert.equal(sanitizedPayload.otp,0);
 assert.equal(sanitizedPayload.pin,0);
 assert.equal(sanitizedPayload.verificationCode,0);
 assert.equal(sanitizedPayload.recovery_code,0);
 assert.equal(sanitizedPayload.mfaCode,0);
 assert.equal(sanitizedPayload.authCode,0);
 assert.notEqual(sanitizedPayload.user_id,987654);
 assert.notEqual(sanitizedPayload.record_id,'record-real-1');
 assert.notEqual(sanitizedPayload.submission_id,'submission-real-1');
 assert.notEqual(sanitizedPayload.editor_id,'editor-real-1');
 assert.notEqual(sanitizedPayload.owner_id,'owner-real-1');
 assert.notEqual(sanitizedPayload.relatedRecordId,'related-real-1');
 assert.equal(sanitizedPayload.consent,false);
 assert.ok(!JSON.stringify(sanitizedPayload).includes('ordinary-value'));
 assert.ok(!JSON.stringify(sanitizedPayload).includes('plain-value'));
 assert.ok(!JSON.stringify(sanitizedPayload).includes('opaque-value'));
 const sanitizedData=JSON.parse(sanitized.records[0].data);
 assert.ok(!JSON.stringify(sanitizedData).includes('alternate@example.com'));
 assert.ok(!JSON.stringify(sanitizedData).includes('+63 918 765 4321'));
 assert.match(sanitizedData.password,/^test_secret_/);
 assert.ok(!JSON.stringify(sanitizedData).includes('Synthetic pastoral detail'));
 assert.match(sanitizedData.misc,/^test_secret_/);
 assert.ok(!sanitizedData.misc.includes('+63 919 555 0101'));
 assert.match(sanitizedData.opaque,/^test_secret_/);
 assert.deepEqual(findSensitiveValues(sanitized,{denylist:['Sample Pastor','user_real_123']}),[]);
});

test('date shifting is deterministic and preserves ordering',()=>{
 const dated={submissions:[
  {id:'one',created_at:'2026-01-01T00:00:00Z',date:'2026-01-01'},
  {id:'two',created_at:'2026-01-03T00:00:00Z',date:'2026-01-03'}
 ]};
 const first=sanitizeDataset(dated);
 const second=sanitizeDataset(dated);
 assert.deepEqual(first,second);
 assert.notEqual(first.submissions[0].created_at,dated.submissions[0].created_at);
 assert.equal(Date.parse(first.submissions[1].created_at)-Date.parse(first.submissions[0].created_at),2*24*60*60*1000);
 assert.equal(Date.parse(`${first.submissions[1].date}T00:00:00Z`)-Date.parse(`${first.submissions[0].date}T00:00:00Z`),2*24*60*60*1000);
});

test('leak scanner rejects unsanitized email, phone, token, and denylisted values',()=>{
 const unsafe={rows:[{email:'real.person@example.com',phone:639175551212,alternate:639181234567,otp:123456,user_id:987654,full_name:'Known Person',notes:'Call +63 917 555 1212 for Known Person',details:JSON.stringify({authorization:'Bearer ordinary-value',password:'plain-value',alternateEmail:'alternate@example.com',misc:'Bearer abcDEF1234567890',opaque:'Abcdefghijklmnopqrstuvwxyz1234567890'}),token:'sk_live_1234567890abcdef'}]};
 const findings=findSensitiveValues(unsafe,{denylist:['Known Person']});
 assert.deepEqual(new Set(findings.map(item=>item.type)),new Set(['email','phone','token','denylist','secret-field','numeric-sensitive','identity-field']));
});

test('sanitizer rejects a malformed table export',()=>{
 assert.throws(()=>sanitizeDataset({submissions:{id:'not-an-array'}}),/array of rows/);
 assert.throws(()=>sanitizeDataset({submissions:[null]}),/Table submissions row 0 must be an object/);
 assert.throws(()=>sanitizeDataset({submissions:['not-an-object']}),/Table submissions row 0 must be an object/);
 assert.throws(()=>datasetShape({submissions:[42]}),/Table submissions row 0 must be an object/);
 assert.throws(()=>sanitizeDataset({pastoral_secrets:[{id:'one'}]}),/Unsupported table\(s\): pastoral_secrets/);
 assert.throws(()=>sanitizeDataset({submissions:[{id:'one',owner_email:'private@example.com'}]}),/Unsupported column\(s\) in submissions: owner_email/);
});
