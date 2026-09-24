import {createHash} from 'node:crypto';

const PRESERVED_KEYS=new Set([
 'category','confidential','team','status','kind','role','type','version','count','expires_at',
 'expiresAt','created_at','createdAt','updated_at','updatedAt','follow_up','followUp',
 'response_due_at','responseDueAt','campus','published','date'
]);
const EMAIL_KEYS=/email/i;
const PHONE_KEYS=/(phone|mobile|whatsapp|contactNumber)/i;
const ID_KEYS=/(^id$|_id$|Id$|user|claim|owner|actor|assignee|key)/i;
const SECRET_KEYS=/(token|secret|password|authorization|cookie|session|api.?key)/i;
const FREE_TEXT_KEYS=/(name|title|message|prayer|note|request|subject|description|content|body|summary|payload|data|tag|target)/i;
const EMAIL_RE=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const EMAIL_TEST_RE=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_CANDIDATE_RE=/\+?\d(?:[\d\s().-]{6,}\d)/g;
const JWT_RE=/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const TOKEN_RE=/\b(?:sk|pk|api|token|secret)[-_][A-Za-z0-9_-]{16,}\b/gi;

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

function maybeStructured(value,key,path){
 if(typeof value!=='string'||!['{','['].includes(value.trimStart()[0]))return null;
 try{
  const parsed=JSON.parse(value);
  if(parsed===null||typeof parsed!=='object')return null;
  return JSON.stringify(sanitizeValue(parsed,key,path));
 }catch{return null;}
}

export function sanitizeValue(value,key='',path='root'){
 if(value===null||typeof value==='number'||typeof value==='boolean')return value;
 if(Array.isArray(value))return value.map((item,index)=>sanitizeValue(item,key,`${path}[${index}]`));
 if(typeof value==='object')return Object.fromEntries(Object.entries(value).map(([childKey,child])=>[childKey,sanitizeValue(child,childKey,`${path}.${childKey}`)]));
 if(typeof value!=='string')return value;
 if(PRESERVED_KEYS.has(key))return value;
 const structured=maybeStructured(value,key,path);
 if(structured!==null)return structured;
 if(SECRET_KEYS.test(key))return fakeSecret(value,path);
 if(EMAIL_KEYS.test(key)||EMAIL_TEST_RE.test(value))return fakeEmail(value,path);
 if(PHONE_KEYS.test(key))return fakePhone(value);
 if(ID_KEYS.test(key))return fakeIdentifier(value,path);
 if(FREE_TEXT_KEYS.test(key))return fakeText(value,path);
 return value.replace(EMAIL_RE,match=>fakeEmail(match,path)).replace(JWT_RE,match=>fakeIdentifier(match,path)).replace(TOKEN_RE,match=>fakeIdentifier(match,path));
}

export function sanitizeDataset(dataset){
 if(!dataset||typeof dataset!=='object'||Array.isArray(dataset))throw new Error('Dataset must be an object keyed by table name');
 return Object.fromEntries(Object.entries(dataset).map(([table,rows])=>{
  if(!Array.isArray(rows))throw new Error(`Table ${table} must contain an array of rows`);
  return [table,rows.map((row,index)=>sanitizeValue(row,table,`${table}[${index}]`))];
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
  for(const match of current.matchAll(EMAIL_RE))if(!match[0].toLowerCase().endsWith('@example.invalid'))findings.push({path,type:'email',detail:match[0]});
  EMAIL_RE.lastIndex=0;
  for(const match of current.matchAll(PHONE_CANDIDATE_RE))if(looksLikePhone(match[0]))findings.push({path,type:'phone',detail:'phone-like value'});
  PHONE_CANDIDATE_RE.lastIndex=0;
  if(JWT_RE.test(current)){findings.push({path,type:'token',detail:'JWT-like value'});JWT_RE.lastIndex=0;}
  if(TOKEN_RE.test(current)){findings.push({path,type:'token',detail:'secret-like value'});TOKEN_RE.lastIndex=0;}
 }
 visit(value,'root');
 return findings;
}

export function datasetShape(dataset){
 return Object.fromEntries(Object.entries(dataset).map(([table,rows])=>[table,{
  rows:rows.length,
  keys:[...new Set(rows.flatMap(row=>Object.keys(row)))].sort()
 }]));
}
