import {cache} from 'react';
import {env} from 'cloudflare:workers';
import {defaults,defaultRecords,type RecordItem} from './defaults';
import {createPublicContentRepository,createEditorContentRepository} from './content-repository';
export function db(){const binding=(env as unknown as {DB?:D1Database}).DB;if(!binding)throw new Error('Database unavailable');return binding;}
export function bucket(){const binding=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(!binding)throw new Error('Uploads unavailable');return binding;}
export function runtime(key:string){return String((env as unknown as Record<string,unknown>)[key]||'');}
const getSettings=cache(async()=>{
 const rows=await createPublicContentRepository(db()).settings();
 const settings={...defaults},versions:Record<string,number>={};
 for(const row of rows)if(Object.hasOwn(defaults,row.key)){settings[row.key]=row.value;versions[row.key]=row.version;}
 return {settings,versions};
});
export const getContent=cache(async(strict=false)=>{
 try{
  const config=await getSettings();
  const records=await createEditorContentRepository(db()).records();
  const map=new Map<string,RecordItem>(defaultRecords.map(r=>[r.id,{...r,version:0}]));
  for(const record of records)map.set(record.id,record);
  return {...config,records:Array.from(map.values()),available:true};
 }catch{if(strict)throw new Error('Content unavailable');return {settings:{...defaults},versions:{},records:defaultRecords,available:false};}
});
// React cache is request-scoped, never a shared cache for private data.
export const getPublicContent=cache(async()=>{
 const config=await getSettings();
 const repository=createPublicContentRepository(db());
 const published=await repository.publishedRecords();
 // A saved draft must suppress its seeded public version without loading draft bodies.
 const saved=new Set(await repository.savedSeedIds(defaultRecords.map(r=>r.id)));
 const records=[...defaultRecords.filter(r=>r.status==='published'&&!saved.has(r.id)).map(r=>({...r,version:0})),...published];
 return {...config,records,available:true};
});
export function safeUrl(value:string){if(value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\'))return value;try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}return '';}
export function safeInternalPath(value:string){return value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')?value:'';}
export function youtubeId(value:string){try{const u=new URL(value);const id=u.hostname==='youtu.be'?u.pathname.slice(1):['www.youtube.com','youtube.com','m.youtube.com'].includes(u.hostname)?u.searchParams.get('v')||u.pathname.split('/').pop():null;return id&&/^[a-zA-Z0-9_-]{11}$/.test(id)?id:null;}catch{return null;}}
