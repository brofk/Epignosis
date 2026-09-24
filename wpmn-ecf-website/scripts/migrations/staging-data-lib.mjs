import {createHash} from 'node:crypto';

const PRESERVED_KEYS=new Set([
 'category','confidential','team','status','kind','role','type','version','count',
 'campus','published'
]);
const TEMPORAL_KEYS=new Set([
 'expires_at','expiresAt','created_at','createdAt','updated_at','updatedAt','follow_up','followUp',
 'response_due_at','responseDueAt','date','event_date','eventDate','scheduled_at','scheduledAt','due_at','dueAt'
]);
const EMAIL_KEYS=/email/i;
const PHONE_KEYS=/(phone|mobile|whatsapp|contactNumber)/i;
const ID_KEYS=/(^id$|_id$|Id$|user|claim|owner|actor|assignee)/i;
const SECRET_KEYS=/(token|secret|password|authorization|cookie|session|credential|api.?key|access.?key|private.?key|client.?secret|signing.?key|(^|[_-])key($|[_-]))/i;
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

function fakeText(value,path){
 const source=String(value);
 let index=0;
 return [...source].map(char=>{
  if(char==='\n'||char==='\r'||char==='\t'||char===' ')return char;
  if(/[0-9]/.test(char))return String(Number.parseInt(digest(`${path}:${index++}`)[0],16)%10);
  if(/[A-Z]/.test(char))return fit(`${path}:${index++}`,1).toUpperCase();
  if(/[a-z]/.test(char))return fit(`${path}:${index++}`,1);
  index++;
  return char;
 }).join('');
}

function fakeIdentifier(value,path){
 const source=String(value);
 const prefix=source.includes('_')?'test_':'';
 return (prefix+fit(`${path}:${source}`,Math.max(1,source.length-prefix.length))).slice(0,source.length);
}

function fakeSecret(value,path){
 return `test_secret_${digest(`${path}:${value}`).slice(0,16)}`;
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
 if(!Number.isFinite(parsed))return fakeText(value,path);
 const shifted=new Date(parsed+shiftMs);
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return shifted.toISOString().slice(0,10);
 const iso=shifted.toISOString();
 return value.includes('.')?iso:iso.replace('.000Z','Z');
}

function contextFor(dataset){
 const days=180+(Number.parseInt(digest(JSON.stringify(dataset)).slice(0,8),16)%1460);
 return {dateShiftMs:days*24*60*60*1000};
}

export function sanitizeValue(value,key='',path='root',context={dateShiftMs:731*24*60*60*1000}){
 if(TEMPORAL_KEYS.has(key))return shiftTemporal(value,context.dateShiftMs,path);
 if(value===null||typeof value==='number'||typeof value==='boolean')return value;
 if(Array.isArray(value))return value.map((item,index)=>sanitizeValue(item,key,`${path}[${index}]`,context));
 if(typeof value==='object')return Object.fromEntries(Object.entries(value).map(([childKey,child])=>[childKey,sanitizeValue(child,childKey,`${path}.${childKey}`,context)]));
 if(typeof value!=='string')return value;
 if(PRESERVED_KEYS.has(key))return value;
 const structured=maybeStructured(value,key,path,context);
 if(structured!==null)return structured;
 if(SECRET_KEYS.test(key))return fakeSecret(value,path);
 if(EMAIL_KEYS.test(key)||EMAIL_TEST_RE.test(value))return fakeEmail(value,path);
 if(PHONE_KEYS.test(key))return fakePhone(value);
 const scrubbed=value
  .replace(EMAIL_RE,match=>fakeEmail(match,path))
  .replace(JWT_RE,match=>fakeSecret(match,path))
  .replace(TOKEN_RE,match=>fakeSecret(match,path))
  .replace(AUTH_HEADER_RE,match=>fakeSecret(match,path))
  .replace(OPAQUE_TOKEN_RE,match=>fakeSecret(match,path));
 if(scrubbed!==value)return scrubbed;
 if(ID_KEYS.test(key))return fakeIdentifier(value,path);
 // Default-deny: every string not on the structural allowlist becomes synthetic.
 return fakeText(value,path);
}

function validateRows(table,rows){
 if(!Array.isArray(rows))throw new Error(`Table ${table} must contain an array of rows`);
 rows.forEach((row,index)=>{
  if(row===null||typeof row!=='object'||Array.isArray(row))throw new Error(`Table ${table} row ${index} must be an object`);
 });
}

export function sanitizeDataset(dataset){
 if(!dataset||typeof dataset!=='object'||Array.isArray(dataset))throw new Error('Dataset must be an object keyed by table name');
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
  if(typeof current!=='string')return;
  if(['{','['].includes(current.trimStart()[0])){
   try{
    const parsed=JSON.parse(current);
    if(parsed!==null&&typeof parsed==='object')visit(parsed,`${path}.$parsed`,key);
   }catch{}
  }
  const lower=current.toLowerCase();
  for(const term of denied)if(lower.includes(term))findings.push({path,type:'denylist',detail:term});
  if(SECRET_KEYS.test(key)&&!current.startsWith('test_secret_'))findings.push({path,type:'secret-field',detail:'non-synthetic value under a secret-bearing key'});
  const scanText=current.replace(/test_secret_[a-f0-9]+/gi,'');
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
