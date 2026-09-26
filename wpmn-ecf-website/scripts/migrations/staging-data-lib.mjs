import {createHash} from 'node:crypto';

const PRESERVED_COLUMNS=new Map([
 ['records',new Set(['version'])],
 ['submissions',new Set(['confidential'])],
 ['rate_limits',new Set(['count'])],
 ['write_guards',new Set(['valid'])],
 ['settings',new Set(['version'])]
]);
const PRESERVED_STRING_VALUES=new Map([
 ['records.kind',new Set(['sermon','article','event','series','faq'])],
 ['records.status',new Set(['draft','published'])],
 ['editors.role',new Set(['pastoral-owner','editor'])],
 ['submissions.category',new Set(['visitor','prayer','house','discipleship','college','partnership','giving','general'])],
 ['submissions.team',new Set(['Connect Team','Prayer Team','House Church Coordinator','Discipleship Coordinator','ELC Admin','WPMN Leadership','Finance / Admin','Admin / Connect Team','Pastoral Team'])],
 ['submissions.status',new Set(['New','In progress','Follow-up scheduled','Complete'])],
 ['assets.type',new Set(['image/jpeg','image/png','image/webp','application/pdf'])],
 ['audit_events.action',new Set(['giving-setting','update-submission','delete-submission'])]
]);
const REVIEWED_COLUMNS=new Map([
 ['assets',new Set(['id','name','type','owner','created_at'])],
 ['audit_events',new Set(['id','actor','action','target','created_at'])],
 ['claims',new Set(['id','user_id'])],
 ['editors',new Set(['user_id','email','role','created_at'])],
 ['rate_limits',new Set(['key','count','expires_at'])],
 ['records',new Set(['id','kind','title','slug','status','data','version','updated_at'])],
 ['settings',new Set(['key','value','version','updated_at'])],
 ['submissions',new Set(['id','category','payload','confidential','team','status','assignee','follow_up','response_due_at','notes','tags','created_at','updated_at'])],
 ['write_guards',new Set(['id','valid'])]
]);
const SUPPORTED_TABLES=new Set(REVIEWED_COLUMNS.keys());
const TEMPORAL_KEYS=new Set([
 'expires_at','expiresAt','created_at','createdAt','updated_at','updatedAt','follow_up','followUp',
 'response_due_at','responseDueAt','date','event_date','eventDate','scheduled_at','scheduledAt','due_at','dueAt'
]);
const EMAIL_KEYS=/email/i;
const PHONE_KEYS=/(phone|mobile|whatsapp|contactNumber)/i;
const ID_KEYS=/(^id$|(?:^|_)[a-z0-9]+_id$|[a-z0-9]+Id$|(?:^|_)(user|claim|owner|actor|assignee)(?:_|$))/i;
const NAME_KEYS=/(name|submitted.?by|created.?by|updated.?by|requested.?by|reviewed.?by|assigned.?by)/i;
const SECRET_KEYS=/(token|secret|password|authorization|cookie|session|credential|api.?key|access.?key|private.?key|client.?secret|signing.?key|(^|[_-])key($|[_-]))/i;
const AUTH_CODE_KEYS=/(^|[_-])(otp|pin|passcode|verification[_-]?code|recovery[_-]?code|mfa[_-]?code|two[_-]?factor[_-]?code|auth[_-]?code|security[_-]?code)($|[_-])/i;
const EMAIL_RE=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const EMAIL_TEST_RE=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_CANDIDATE_RE=/\+?\d(?:[\d\s().-]{6,}\d)/g;
const JWT_RE=/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const TOKEN_RE=/\b(?:sk|pk|api|token|secret)[-_][A-Za-z0-9_-]{16,}\b/gi;
const AUTH_HEADER_RE=/\b(?:Bearer\s+[A-Za-z0-9._~+/-]{8,}={0,2}|Basic\s+[A-Za-z0-9+/]{8,}={0,2})\b/gi;
const OPAQUE_TOKEN_RE=/\b(?=[A-Za-z0-9_-]{32,}\b)(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+\b/g;

function digest(value){return createHash('sha256').update(String(value)).digest('hex');}

function fit(seed,length,alphabet='abcdefghijklmnopqrstuvwxyz'){
 if(length<=0)return '';
 const hash=digest(seed);
 let result='';
 for(let i=0;i<length;i++)result+=alphabet[Number.parseInt(hash[(i*2)%hash.length]+hash[(i*2+1)%hash.length],16)%alphabet.length];
 return result;
}

function fakeValue(value,path){
 return `test_value_${digest(`${path}:${value}`).slice(0,16)}`;
}

function fakeIdentifier(value,path){
 const source=String(value);
 const prefix=source.includes('_')?'test_':'';
 return (prefix+fit(`${path}:${source}`,Math.max(1,source.length-prefix.length))).slice(0,source.length);
}

function fakeSecret(value,path){
 return `test_secret_${digest(`${path}:${value}`).slice(0,16)}`;
}

function fakePerson(value,path){
 return `test_person_${digest(`${path}:${value}`).slice(0,16)}`;
}

function fakeEmail(value,path){
 const source=String(value);
 const candidate=`user-${digest(`${path}:${source}`).slice(0,10)}@example.invalid`;
 return candidate;
}

function fakePhone(value){
 const source=String(value);
 return [...source].map(char=>/[0-9]/.test(char)?'0':char).join('');
}

function fakeNumber(value,path){
 const hash=Number.parseInt(digest(`${path}:${value}`).slice(0,12),16);
 if(Number.isInteger(value)){
  const sign=value<0?-1:1;
  const digits=Math.min(15,Math.max(1,String(Math.abs(value)).replace(/\D/g,'').length));
  const floor=digits===1?0:10**(digits-1),range=10**digits-floor;
  let result=sign*(floor+(hash%range));
  if(result===value)result=sign*(floor+((hash+1)%range));
  return result;
 }
 const result=(hash%1_000_000)/1000;
 return result===value?result+0.001:result;
}

function maybeStructured(value,key,path,context){
 if(typeof value!=='string'||!['{','['].includes(value.trimStart()[0]))return null;
 try{
  const parsed=JSON.parse(value);
  if(parsed===null||typeof parsed!=='object')return null;
  return JSON.stringify(sanitizeValue(parsed,key,path,context));
 }catch{return null;}
}

function shiftTemporal(value,shiftMs,path){
 if(value===null||value==='')return value;
 if(typeof value==='number'){
  const milliseconds=Math.abs(value)<1e12?value*1000:value;
  const shifted=milliseconds+shiftMs;
  return Math.abs(value)<1e12?Math.trunc(shifted/1000):Math.trunc(shifted);
 }
 if(typeof value!=='string')return value;
 if(/^\d+$/.test(value))return String(shiftTemporal(Number(value),shiftMs,path));
 const parsed=Date.parse(value);
 if(!Number.isFinite(parsed))return fakeValue(value,path);
 const shifted=new Date(parsed+shiftMs);
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return shifted.toISOString().slice(0,10);
 const iso=shifted.toISOString();
 return value.includes('.')?iso:iso.replace('.000Z','Z');
}

function contextFor(dataset){
 const days=180+(Number.parseInt(digest(JSON.stringify(dataset)).slice(0,8),16)%1460);
 return {dateShiftMs:days*24*60*60*1000};
}

function isAuthCodeKey(key){
 const normalized=String(key).replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase();
 return AUTH_CODE_KEYS.test(normalized);
}

function looksLikeNumericPhone(value,key){
 if(!Number.isFinite(value)||!Number.isInteger(value)||value===0||TEMPORAL_KEYS.has(key))return false;
 const digits=String(Math.abs(value)).replace(/\D/g,'');
 return digits.length>=8&&digits.length<=15;
}

function isPreservedColumn(path,key,value){
 if(EMAIL_KEYS.test(key)||PHONE_KEYS.test(key)||ID_KEYS.test(key)||NAME_KEYS.test(key)||SECRET_KEYS.test(key)||isAuthCodeKey(key))return false;
 const match=path.match(/^([a-z_][a-z0-9_]*)\[\d+\]\.([a-zA-Z_][a-zA-Z0-9_]*)$/);
 if(!match||match[2]!==key)return false;
 const table=match[1];
 if(PRESERVED_COLUMNS.get(table)?.has(key))return true;
 const allowed=PRESERVED_STRING_VALUES.get(`${table}.${key}`);
 if(!allowed)return false;
 if(typeof value!=='string'||!allowed.has(value))throw new Error(`Unsupported value in ${table}.${key}. Review the application enum and sanitizer before preserving it.`);
 return true;
}

export function sanitizeValue(value,key='',path='root',context={dateShiftMs:731*24*60*60*1000}){
 if(TEMPORAL_KEYS.has(key))return shiftTemporal(value,context.dateShiftMs,path);
 if(value===null)return value;
 if(isPreservedColumn(path,key,value))return value;
 if(typeof value==='number')return SECRET_KEYS.test(key)||PHONE_KEYS.test(key)||ID_KEYS.test(key)||NAME_KEYS.test(key)||isAuthCodeKey(key)||looksLikeNumericPhone(value,key)?0:fakeNumber(value,path);
 if(typeof value==='boolean')return !value;
 if(Array.isArray(value))return value.map((item,index)=>sanitizeValue(item,key,`${path}[${index}]`,context));
 if(typeof value==='object')return Object.fromEntries(Object.entries(value).map(([childKey,child])=>[childKey,sanitizeValue(child,childKey,`${path}.${childKey}`,context)]));
 if(typeof value!=='string')return value;
 const structured=maybeStructured(value,key,path,context);
 if(structured!==null)return structured;
 if(SECRET_KEYS.test(key)||isAuthCodeKey(key))return fakeSecret(value,path);
 if(EMAIL_KEYS.test(key)||EMAIL_TEST_RE.test(value))return fakeEmail(value,path);
 if(PHONE_KEYS.test(key))return fakePhone(value);
 if(NAME_KEYS.test(key))return fakePerson(value,path);
 const scrubbed=value
  .replace(EMAIL_RE,match=>fakeEmail(match,path))
  .replace(JWT_RE,match=>fakeSecret(match,path))
  .replace(TOKEN_RE,match=>fakeSecret(match,path))
  .replace(AUTH_HEADER_RE,match=>fakeSecret(match,path))
  .replace(OPAQUE_TOKEN_RE,match=>fakeSecret(match,path))
  .replace(PHONE_CANDIDATE_RE,match=>looksLikePhone(match)?fakePhone(match):match);
 if(scrubbed!==value)return scrubbed;
 if(ID_KEYS.test(key))return fakeIdentifier(value,path);
 // Default-deny: every string not on the structural allowlist becomes synthetic.
 return fakeValue(value,path);
}

function validateRows(table,rows){
 if(!Array.isArray(rows))throw new Error(`Table ${table} must contain an array of rows`);
 rows.forEach((row,index)=>{
  if(row===null||typeof row!=='object'||Array.isArray(row))throw new Error(`Table ${table} row ${index} must be an object`);
  const unexpected=Object.keys(row).filter(column=>!REVIEWED_COLUMNS.get(table)?.has(column));
  if(unexpected.length)throw new Error(`Unsupported column(s) in ${table}: ${unexpected.sort().join(', ')}. Review the schema and sanitizer before adding a column.`);
 });
}

export function sanitizeDataset(dataset){
 if(!dataset||typeof dataset!=='object'||Array.isArray(dataset))throw new Error('Dataset must be an object keyed by table name');
 const unknown=Object.keys(dataset).filter(table=>!SUPPORTED_TABLES.has(table));
 if(unknown.length)throw new Error(`Unsupported table(s): ${unknown.sort().join(', ')}. Review the schema and sanitizer before adding a table.`);
 const context=contextFor(dataset);
 return Object.fromEntries(Object.entries(dataset).map(([table,rows])=>{
  validateRows(table,rows);
  return [table,rows.map((row,index)=>sanitizeValue(row,table,`${table}[${index}]`,context))];
 }));
}

function looksLikePhone(value){
 if(/^\d{4}-\d{2}-\d{2}/.test(value))return false;
 const digits=value.replace(/\D/g,'');
 if(/^0+$/.test(digits))return false;
 return digits.length>=8&&digits.length<=15&&/^[+\d\s().-]+$/.test(value);
}

export function findSensitiveValues(value,{denylist=[]}={}){
 const findings=[];
 const denied=denylist.filter(Boolean).map(item=>String(item).toLowerCase());
 function visit(current,path,key=''){
  if(current===null||current===undefined)return;
 if(Array.isArray(current)){current.forEach((item,index)=>visit(item,`${path}[${index}]`,key));return;}
  if(typeof current==='object'){for(const [childKey,child] of Object.entries(current))visit(child,`${path}.${childKey}`,childKey);return;}
  if(typeof current==='number'){
   if((SECRET_KEYS.test(key)||PHONE_KEYS.test(key)||ID_KEYS.test(key)||NAME_KEYS.test(key)||isAuthCodeKey(key)||looksLikeNumericPhone(current,key))&&current!==0)findings.push({path,type:'numeric-sensitive',detail:'non-synthetic numeric identity, contact, or secret value'});
   return;
  }
  if(typeof current!=='string')return;
  if(['{','['].includes(current.trimStart()[0])){
   try{
    const parsed=JSON.parse(current);
    if(parsed!==null&&typeof parsed==='object'){
     visit(parsed,`${path}.$parsed`,key);
     return;
    }
   }catch{}
  }
  const lower=current.toLowerCase();
  for(const term of denied)if(lower.includes(term))findings.push({path,type:'denylist',detail:term});
  if((SECRET_KEYS.test(key)||isAuthCodeKey(key))&&!current.startsWith('test_secret_'))findings.push({path,type:'secret-field',detail:'non-synthetic value under a secret-bearing key'});
  if(NAME_KEYS.test(key)&&!current.startsWith('test_person_'))findings.push({path,type:'identity-field',detail:'non-synthetic value under an identity-bearing key'});
  const scanText=current.replace(/test_(?:secret|person|value)_[a-f0-9]+/gi,'');
  for(const match of scanText.matchAll(EMAIL_RE))if(!match[0].toLowerCase().endsWith('@example.invalid'))findings.push({path,type:'email',detail:match[0]});
  EMAIL_RE.lastIndex=0;
  for(const match of scanText.matchAll(PHONE_CANDIDATE_RE))if(looksLikePhone(match[0]))findings.push({path,type:'phone',detail:'phone-like value'});
  PHONE_CANDIDATE_RE.lastIndex=0;
  if(JWT_RE.test(scanText)){findings.push({path,type:'token',detail:'JWT-like value'});JWT_RE.lastIndex=0;}
  if(TOKEN_RE.test(scanText)){findings.push({path,type:'token',detail:'secret-like value'});TOKEN_RE.lastIndex=0;}
  if(AUTH_HEADER_RE.test(scanText)){findings.push({path,type:'token',detail:'authorization-header value'});AUTH_HEADER_RE.lastIndex=0;}
  if(OPAQUE_TOKEN_RE.test(scanText)){findings.push({path,type:'token',detail:'long opaque value'});OPAQUE_TOKEN_RE.lastIndex=0;}
 }
 visit(value,'root');
 return findings;
}

export function datasetShape(dataset){
 return Object.fromEntries(Object.entries(dataset).map(([table,rows])=>{
  validateRows(table,rows);
  return [table,{rows:rows.length,keys:[...new Set(rows.flatMap(row=>Object.keys(row)))].sort()}];
 }));
}
