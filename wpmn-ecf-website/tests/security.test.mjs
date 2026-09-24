import './route-loader.mjs';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,globSync as fsGlob} from 'node:fs';
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
const sqlite=new DatabaseSync(':memory:');
for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
let queryCount=0;
class Statement {
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sql,args);}
 async first(){queryCount++;return sqlite.prepare(this.sql).get(...this.args)??null;}
 async all(){queryCount++;return {results:sqlite.prepare(this.sql).all(...this.args)};}
 async run(){queryCount++;const r=sqlite.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}};}
}
const DB={prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
globalThis.__testEnv={DB,SITE_ORIGIN:'https://ministry.test',RATE_LIMIT_SALT:'test-only'};
globalThis.__testHeaders=new Headers();
const editor=await import('../app/api/editor/route.ts');
const exports=await import('../app/api/editor/export/route.ts');
const upload=await import('../app/api/upload/route.ts');
const contact=await import('../app/api/contact/route.ts');
const content=await import('../app/api/content/route.ts');
const {hash}=await import('../lib/security.ts');
const {settingsGuard,saveSetting,clearGuard}=await import('../lib/write-sql.ts');
function identity(role){globalThis.__testHeaders=new Headers(role?{'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'test@example.test'}:{});sqlite.prepare('DELETE FROM editors').run();if(role&&role!=='unlisted')sqlite.prepare('INSERT INTO editors VALUES (?,?,?,?)').run('test-user','test@example.test',role,'now');}
function req(body,path='/api/editor',origin='https://ministry.test'){return new Request('https://ministry.test'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}
const change=(key='home.heroHeading',value='Changed',version=0)=>({action:'settings',changes:[{key,value,version}]});
const record=(id,slug)=>({action:'record',record:{id,kind:'article',title:'Test',slug,status:'draft',data:{body:'Text'},version:0}});
const submission=(reason='visitor')=>({id:crypto.randomUUID(),reason,consent:true,data:reason==='visitor'?{firstName:'Test',email:'person@example.test'}:{message:'Private test prayer'},followUp:false});
beforeEach(()=>{for(const t of ['settings','records','submissions','claims','editors','audit_events','write_guards','rate_limits','assets'])sqlite.exec('DELETE FROM '+t);identity(null);queryCount=0;globalThis.__testEnv.EDITOR_SETUP_HASH='';});
for(const role of [null,'unlisted','viewer','unexpected'])test('private routes deny '+role,async()=>{
 identity(role);
 for(const response of [await editor.GET(new Request('https://ministry.test/api/editor')),await editor.POST(req(change())),await exports.GET(new Request('https://ministry.test/api/editor/export')),await upload.POST(req({},'/api/upload'))])assert.equal(response.status,403);
 assert.equal(sqlite.prepare('SELECT count(*) n FROM settings').get().n,0);
});
test('ordinary editor edits content but cannot alter giving, intake or exports',async()=>{
 identity('editor');assert.equal((await editor.POST(req(change()))).status,200);
 for(const key of ['give.paymentUrl','give.bankName','give.accountName','give.accountNumber'])assert.equal((await editor.POST(req(change(key,'https://example.test')))).status,403);
 assert.equal((await editor.POST(req({action:'delete-message',id:'other-person'}))).status,403);
 assert.equal((await editor.POST(req({action:'message',id:'other-person',status:'Complete',assignee:'',followUp:'',notes:'',tags:[]}))).status,403);
 assert.equal((await exports.GET(new Request('https://ministry.test/api/editor/export'))).status,403);
});
test('owner can save giving destination, with audit metadata only',async()=>{
 identity('pastoral-owner');assert.equal((await editor.POST(req(change('give.paymentUrl','https://example.test/give')))).status,200);
 const events=sqlite.prepare('SELECT * FROM audit_events').all();assert.equal(events.length,1);assert.equal(events[0].target,'give.paymentUrl');assert.ok(!JSON.stringify(events).includes('https://example.test'));
});
test('cross-origin owner write denied',async()=>{identity('pastoral-owner');assert.equal((await editor.POST(req(change(),'/api/editor','https://evil.test'))).status,403);});
test('malformed and prototype-key requests return 400',async()=>{
 identity('pastoral-owner');for(const body of [null,[],{},change('toString'),change('__proto__'),{action:'settings',changes:[null]},change('home.heroHeading','x',-1),{...record('a','valid'),record:{...record('a','valid').record,slug:12}}])assert.equal((await editor.POST(req(body))).status,400);
 assert.equal((await contact.POST(req({...submission(),reason:'constructor'},'/api/contact'))).status,400);
 assert.equal((await editor.POST(new Request('https://ministry.test/api/editor',{method:'POST',headers:{origin:'https://ministry.test','content-type':'application/json'},body:'{'}))).status,400);
});
test('settings conflict rolls back all fields and giving audit',async()=>{
 identity('pastoral-owner');assert.equal((await editor.POST(req(change()))).status,200);
 const r=await editor.POST(req({action:'settings',changes:[{key:'give.bankName',value:'New bank',version:0},{key:'home.heroHeading',value:'stale',version:0}]}));assert.equal(r.status,409);
 assert.equal(sqlite.prepare("SELECT count(*) n FROM settings WHERE key='give.bankName'").get().n,0);assert.equal(sqlite.prepare('SELECT count(*) n FROM audit_events').get().n,0);
});
test('transaction guard also rejects a competing write after prior validation',async()=>{
 sqlite.prepare('INSERT INTO settings VALUES (?,?,?,?)').run('a','other editor',2,'now');
 await assert.rejects(DB.batch([DB.prepare(settingsGuard).bind('g',JSON.stringify([{key:'a',version:1},{key:'b',version:0}])),DB.prepare(saveSetting).bind('b','new','now'),DB.prepare(clearGuard).bind('g')]));
 assert.equal(sqlite.prepare("SELECT count(*) n FROM settings WHERE key='b'").get().n,0);
});
test('SQL payload is stored as data and duplicate slug is rejected',async()=>{
 identity('editor');assert.equal((await editor.POST(req(change('home.heroHeading',"x'); DROP TABLE records; --")))).status,200);
 assert.equal((await editor.POST(req(record('first','same-address')))).status,200);assert.equal((await editor.POST(req(record('second','same-address')))).status,409);
 assert.throws(()=>sqlite.prepare('INSERT INTO records VALUES (?,?,?,?,?,?,?,?)').run('second','article','t','same-address','draft','{}',1,'now'),/UNIQUE/);
 assert.equal((await editor.POST(req(record('other','what-is-union-with-christ')))).status,409);
});
test('private prayer is excluded from editor content and normal export',async()=>{
 const p=submission('prayer');assert.equal((await contact.POST(req(p,'/api/contact'))).status,200);
 assert.equal(sqlite.prepare('SELECT confidential FROM submissions').get().confidential,1);
 identity('editor');assert.deepEqual((await (await editor.GET(new Request('https://ministry.test/api/editor'))).json()).messages,[]);
 identity('pastoral-owner');const text=await (await exports.GET(new Request('https://ministry.test/api/editor/export'))).text();assert.ok(!text.includes('Private test prayer'));
});
test('deletion requires existing record and commits audit atomically',async()=>{
 const p=submission();await contact.POST(req(p,'/api/contact'));identity('pastoral-owner');
 assert.equal((await editor.POST(req({action:'delete-message',id:p.id}))).status,200);
 assert.equal(sqlite.prepare('SELECT count(*) n FROM submissions').get().n,0);assert.equal(sqlite.prepare('SELECT count(*) n FROM audit_events').get().n,1);
 assert.equal((await editor.POST(req({action:'delete-message',id:p.id}))).status,404);assert.equal(sqlite.prepare('SELECT count(*) n FROM audit_events').get().n,1);
});
test('invalid calendar date fails and missing message returns 404',async()=>{
 identity('pastoral-owner');const m={action:'message',id:'missing',status:'New',assignee:'',followUp:'2026-02-30',notes:'',tags:[]};assert.equal((await editor.POST(req(m))).status,400);assert.equal((await editor.POST(req({...m,followUp:''}))).status,404);
});
test('public retry creates one intake and precise response target',async()=>{
 const p=submission();assert.equal((await contact.POST(req(p,'/api/contact'))).status,200);assert.equal((await contact.POST(req(p,'/api/contact'))).status,200);
 const row=sqlite.prepare('SELECT * FROM submissions').get();assert.equal(sqlite.prepare('SELECT count(*) n FROM submissions').get().n,1);assert.ok(Math.abs((Date.parse(row.response_due_at)-Date.parse(row.created_at))-24*3600000)<=25);assert.equal(row.follow_up,'');
});
test('public content contains no drafts',async()=>{
 identity('editor');await editor.POST(req(record('test-draft','test-draft')));identity(null);const data=await(await content.GET()).json();assert.ok(data.records.every(r=>r.status==='published'));assert.ok(!data.records.some(r=>r.id==='test-draft'));
});
test('claim requires identity and setup token; cannot replace owner',async()=>{
 globalThis.__testEnv.EDITOR_SETUP_HASH=await hash('test-setup');assert.equal((await editor.POST(req({action:'claim',token:'test-setup'}))).status,401);
 identity('unlisted');assert.equal((await editor.POST(req({action:'claim',token:'wrong'}))).status,403);assert.equal((await editor.POST(req({action:'claim',token:'test-setup'}))).status,200);
 globalThis.__testHeaders=new Headers({'oai-authenticated-user-id':'other-user','oai-authenticated-user-email':'other@example.test'});assert.equal((await editor.POST(req({action:'claim',token:'test-setup'}))).status,403);
});
test('unpublishing a seeded article cannot expose its default text',async()=>{
 const {defaultRecords}=await import('../lib/defaults.ts');const seed=defaultRecords.find(r=>r.kind==='article'&&r.status==='published');assert.ok(seed);
 identity('editor');assert.equal((await editor.POST(req({action:'record',record:{...seed,status:'draft',version:0}}))).status,200);
 identity(null);const c=await (await content.GET()).json();assert.ok(!c.records.some(r=>r.id===seed.id));
});
test('multi-field save does not query each setting version',async()=>{
 identity('editor');queryCount=0;const changes=['home.heroHeading','home.heroIntro','home.pathsHeading','home.pathsIntro'].map(key=>({key,value:'Test',version:0}));
 assert.equal((await editor.POST(req({action:'settings',changes}))).status,200);
 // One membership read, guard, four writes, guard cleanup. No per-field SELECT.
 assert.equal(queryCount,7);
});
test('every API route is classified; private handlers use the shared guard',()=>{
 const {globSync}=requireFs();
 const files=[...globSync('app/api/**/route.ts')].sort();
 assert.deepEqual(files,['app/api/assets/[id]/route.ts','app/api/contact/route.ts','app/api/content/route.ts','app/api/editor/export/route.ts','app/api/editor/route.ts','app/api/upload/route.ts'].sort());
 for(const file of files.filter(f=>f.includes('/editor/')||f==='app/api/upload/route.ts'))assert.match(readFileSync(file,'utf8'),/protectedRoute\(/);
});
function requireFs(){return {globSync:fsGlob};}
