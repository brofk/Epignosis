import './route-loader.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
globalThis.__testEnv={SITE_ORIGIN:'https://ministry.test',RATE_LIMIT_SALT:'synthetic'};
globalThis.__testHeaders=new Headers();
// Include every shared library in coverage, even when no behavior test exists yet.
const modules={};
for(const file of readdirSync(new URL('../lib/',import.meta.url)).filter(f=>f.endsWith('.ts')))modules[file]=await import('../lib/'+file);
const auth=await import('../app/chatgpt-auth.ts');
const permissions=modules['permissions.ts'],store=modules['store.ts'],brand=modules['brand.ts'],security=modules['security.ts'];
const {editorInput}=modules['editor-input.ts'];
test('permission matrix rejects unknown roles and limits ordinary editors',()=>{
 for(const role of [null,undefined,'viewer','owner','unexpected',{},0]){
  assert.equal(permissions.isEditorRole(role),false);
  for(const permission of ['content','pastoral','giving'])assert.equal(permissions.permits(role,permission),false);
 }
 for(const permission of ['content','pastoral','giving'])assert.equal(permissions.permits('pastoral-owner',permission),true);
 assert.equal(permissions.permits('editor','content'),true);
 for(const permission of ['pastoral','giving'])assert.equal(permissions.permits('editor',permission),false);
 for(const key of ['give.paymentUrl','give.bankName','give.accountName','give.accountNumber'])assert.equal(permissions.sensitiveSetting(key),true);
 assert.equal(permissions.sensitiveSetting('home.heroHeading'),false);
});
test('sign-in and sign-out redirects reject external and recursive auth destinations',()=>{
 for(const path of ['https://evil.test','//evil.test','/\\evil.test','/callback','/signin-with-chatgpt','/signout-with-chatgpt']){
  assert.equal(auth.chatGPTSignInPath(path),'/signin-with-chatgpt?return_to=%2F');
  assert.equal(auth.chatGPTSignOutPath(path),'/signout-with-chatgpt?return_to=%2F');
 }
 assert.equal(auth.chatGPTSignInPath('/editor?tab=content#article'),'/signin-with-chatgpt?return_to=%2Feditor%3Ftab%3Dcontent%23article');
 assert.equal(auth.chatGPTSignOutPath(),'/signout-with-chatgpt?return_to=%2F');
});
test('signed-out users redirect; identity requires both ID and email',async()=>{
 globalThis.__testHeaders=new Headers();assert.equal(await auth.getChatGPTUser(),null);
 await assert.rejects(auth.requireChatGPTUser('/editor'),/redirect:\/signin-with-chatgpt/);
 globalThis.__testHeaders=new Headers({'oai-authenticated-user-id':'synthetic'});assert.equal(await auth.getChatGPTUser(),null);
 globalThis.__testHeaders.set('oai-authenticated-user-email','synthetic@example.test');
 assert.equal((await auth.requireChatGPTUser('/editor')).displayName,'synthetic@example.test');
 globalThis.__testHeaders.set('oai-authenticated-user-full-name','Francis%20Test');
 globalThis.__testHeaders.set('oai-authenticated-user-full-name-encoding','percent-encoded-utf-8');
 assert.equal((await auth.getChatGPTUser()).fullName,'Francis Test');
 globalThis.__testHeaders.set('oai-authenticated-user-full-name','%ZZ');assert.equal((await auth.getChatGPTUser()).fullName,null);
 globalThis.__testHeaders=new Headers();
});
test('links and media IDs reject unsafe destinations',()=>{
 for(const url of ['javascript:alert(1)','http://evil.test','https://user:password@example.test','//evil.test','/\\evil.test','bad'])assert.equal(store.safeUrl(url),'');
 assert.equal(store.safeUrl('/media/article'),'/media/article');assert.equal(store.safeUrl('https://example.test'),'https://example.test/');
 assert.equal(store.safeInternalPath('/media'),'/media');for(const path of ['https://evil.test','//evil.test','/\\evil.test'])assert.equal(store.safeInternalPath(path),'');
 for(const url of ['https://youtu.be/abcdefghijk','https://www.youtube.com/watch?v=abcdefghijk','https://youtube.com/embed/abcdefghijk'])assert.equal(store.youtubeId(url),'abcdefghijk');
 for(const url of ['https://evil.test/abcdefghijk','bad','https://youtu.be/short'])assert.equal(store.youtubeId(url),null);
});
test('brand choices and CSS merging validate actual outputs',()=>{
 assert.equal(brand.brandColor('#342758','#000000'),'#342758');assert.equal(brand.brandColor('#ffffff','#000000'),'#000000');assert.equal(brand.brandColor('red','#000000'),'#000000');
 assert.equal(brand.colorChannels('#342758'),'52 39 88');assert.equal(brand.brandImage('/images/ecf-horizontal.png'),'/images/ecf-horizontal.png');
 const asset='/api/assets/00000000-0000-0000-0000-000000000000';assert.equal(brand.brandImage(asset),asset);assert.equal(brand.brandImage('https://evil.test/logo.png'),'');
 assert.equal(modules['utils.ts'].cn('p-2',false,'p-4'),'p-4');
 const payload={id:'synthetic',reason:'visitor'};assert.equal(modules['contact-payload.ts'].publicContactPayload(payload),payload);
});
test('editor schema rejects invalid dates, duplicate settings and unsafe next steps',()=>{
 const message={action:'message',id:'synthetic',status:'New',assignee:'',followUp:'2028-02-29',notes:'',tags:[]};
 assert.equal(editorInput.safeParse(message).success,true);
 for(const date of ['2026-02-30','02/03/2026','2026-13-01'])assert.equal(editorInput.safeParse({...message,followUp:date}).success,false);
 const change={key:'home.heroHeading',value:'Test',version:0};assert.equal(editorInput.safeParse({action:'settings',changes:[change]}).success,true);
 for(const changes of [[change,change],[{...change,version:-1}],[{...change,version:1.2}]])assert.equal(editorInput.safeParse({action:'settings',changes}).success,false);
 const record={id:'synthetic',kind:'article',title:'Test',slug:'test-article',status:'draft',data:{},version:0};
 assert.equal(editorInput.safeParse({action:'record',record}).success,true);
 for(const data of [{nextStepLabel:'Visit'},{nextStepUrl:'/connect'},{nextStepLabel:'Visit',nextStepUrl:'//evil.test'},{nextStepLabel:'Visit',nextStepUrl:'/\\evil.test'},{constructor:'bad'}])assert.equal(editorInput.safeParse({action:'record',record:{...record,data}}).success,false);
 assert.equal(editorInput.safeParse({action:'record',record:{...record,data:{nextStepLabel:'Visit',nextStepUrl:'/connect'}}}).success,true);
 assert.equal(editorInput.safeParse({action:'claim',token:'synthetic',unexpected:true}).success,false);
});
test('request parser enforces byte limits and errors conceal internal details',async()=>{
 const request=(body,headers={'content-type':'application/json'})=>new Request('https://ministry.test/api',{method:'POST',headers,body});
 assert.deepEqual(await security.readJson(request('{"ok":true}')),{ok:true});
 for(const req of [request('{}',{}),new Request('https://ministry.test')])await assert.rejects(security.readJson(req),e=>e.status===400);
 await assert.rejects(security.readJson(request('{}',{'content-type':'application/json','content-length':'100'}),5),e=>e.status===413);
 await assert.rejects(security.readJson(request('{"value":"too large"}'),5),e=>e.status===413);
 await assert.rejects(security.readJson(request('{')),SyntaxError);
 assert.equal(security.routeError(new security.HttpError(413,'Too big')).status,413);assert.equal(security.routeError(new SyntaxError()).status,400);
 const response=security.routeError(new Error('PRIVATE_DETAIL'));assert.equal(response.status,503);assert.ok(!(await response.text()).includes('PRIVATE_DETAIL'));
 assert.equal(security.reply({ok:true}).headers.get('cache-control'),'private, no-store');
 assert.equal(await security.hash('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('origin and missing-binding guards fail safely',async()=>{
 assert.equal(security.sameOrigin(new Request('https://ministry.test/api',{headers:{origin:'https://ministry.test'}})),true);
 for(const headers of [{},{origin:'https://evil.test'},{origin:'https://ministry.test','sec-fetch-site':'cross-site'}])assert.equal(security.sameOrigin(new Request('https://ministry.test/api',{headers})),false);
 assert.throws(store.db,/Database unavailable/);assert.throws(store.bucket,/Uploads unavailable/);assert.equal(store.runtime('MISSING'),'');
 assert.equal((await store.getContent()).available,false);await assert.rejects(store.getContent(true),/Content unavailable/);await assert.rejects(store.getPublicContent(),/Database unavailable/);
});
test('metadata builds canonical URLs and filters unsafe social links',()=>{
 const seo=modules['seo.ts'];assert.equal(seo.siteOrigin(),'https://ministry.test');assert.equal(seo.pageMetadata('Title','Description','/about').alternates.canonical,'https://ministry.test/about');
 const result=seo.websiteData({'brand.siteName':'Test','identity.name':'Test Network','identity.short':'Synthetic','brand.logoImage':'/images/ecf-horizontal.png','contact.facebook':'javascript:bad','contact.youtube':'https://youtube.com'});
 assert.deepEqual(result['@graph'][1].sameAs,['https://youtube.com/']);
});
test('protected handlers reject signed-out and unauthorized users before mutation',async()=>{
 globalThis.__testHeaders=new Headers();assert.equal(await security.editor(),null);let calls=0;
 const handler=security.protectedRoute('content',async()=>{calls++;return security.reply({ok:true});});
 assert.equal((await handler(new Request('https://ministry.test/api'))).status,403);assert.equal(calls,0);
 globalThis.__testHeaders=new Headers({'oai-authenticated-user-id':'synthetic','oai-authenticated-user-email':'synthetic@example.test'});
 globalThis.__testEnv.DB={prepare:()=>({bind(){return this;},async first(){return {role:'editor'};},async run(){}})};
 assert.equal((await handler(new Request('https://ministry.test/api'))).status,200);assert.equal(calls,1);
 assert.equal((await security.protectedRoute('giving',async()=>security.reply({ok:true}))(new Request('https://ministry.test/api'))).status,403);
 assert.equal((await security.protectedRoute('content',async()=>{throw new Error('secret');})(new Request('https://ministry.test/api'))).status,503);
 let count=0;globalThis.__testEnv.DB.prepare=()=>({bind(){return this;},async first(){return {count:++count};},async run(){}});
 assert.equal(await security.rateLimit(new Request('https://ministry.test'),'test',1),true);assert.equal(await security.rateLimit(new Request('https://ministry.test'),'test',1),false);
 delete globalThis.__testEnv.DB;globalThis.__testHeaders=new Headers();
});

test('international formatting keeps calendar dates stable and converts actual instants',()=>{
 const locale=modules['locale.ts'];
 assert.equal(locale.validLocale('en-IN'),true);assert.equal(locale.validLocale('invalid_locale'),false);
 assert.equal(locale.validTimeZone('Asia/Kolkata'),true);assert.equal(locale.validTimeZone('American central'),false);
 assert.equal(locale.validCalendarDate('2028-02-29'),true);assert.equal(locale.validCalendarDate('2026-02-30'),false);
 assert.equal(locale.formatDateOnly('2026-10-05','en-IN'),'5 October 2026');
 assert.equal(locale.formatDateOnly('2026-10-05','en-US'),'October 5, 2026');
 assert.equal(locale.formatDateOnly('Next Sunday','en-IN'),'Next Sunday');
 assert.match(locale.formatInstant('2026-10-05T00:00:00Z','en-GB','Asia/Kolkata'),/05:30/);
 assert.match(locale.formatInstant('2026-10-05T00:00:00Z','en-GB','Europe/London'),/01:00/);
 assert.equal(locale.formatInstant('2026-10-05T00:00:00','en-GB','Asia/Kolkata'),'2026-10-05T00:00:00');
 assert.match(locale.formatInstant('2026-10-05T00:00:00Z','invalid_locale','bad-zone'),/12:00 AM/);
 assert.ok(locale.validTimeZone(locale.browserPreferences().timeZone));
});


const locale=await import('../lib/locale.ts');
test('unavailable browser date/time detection keeps forms and raw dates usable',()=>{
 const original=Intl.DateTimeFormat;
 try{Intl.DateTimeFormat=function(){throw new Error('Unsupported runtime');};
  assert.equal(locale.browserPreferences().timeZone,'UTC');
  assert.equal(locale.formatDateOnly('2026-10-05','en'),'2026-10-05');
  assert.equal(locale.formatInstant('2026-10-05T00:00:00Z','en','Asia/Manila'),'2026-10-05T00:00:00Z');
 }finally{Intl.DateTimeFormat=original;}
});
