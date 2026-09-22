import {cache} from 'react';
import {env} from 'cloudflare:workers';
import {defaults,defaultRecords,type RecordItem} from './defaults';
export function db(){const binding=(env as unknown as {DB?:D1Database}).DB;if(!binding)throw new Error('Database unavailable');return binding;}
export function bucket(){const binding=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(!binding)throw new Error('Uploads unavailable');return binding;}
export function runtime(key:string){return String((env as unknown as Record<string,unknown>)[key]||'');}
const getSettings=cache(async()=>{
 const rows=await db().prepare('SELECT key,value,version FROM settings').all<{key:string;value:string;version:number}>();
 const settings={...defaults},versions:Record<string,number>={};
 for(const row of rows.results)if(Object.hasOwn(defaults,row.key)){settings[row.key]=row.value;versions[row.key]=row.version;}
 return {settings,versions};
});
function item(r:Record<string,unknown>):RecordItem{return {id:String(r.id),kind:r.kind as RecordItem['kind'],title:String(r.title),slug:String(r.slug),status:r.status as RecordItem['status'],data:JSON.parse(String(r.data)),updatedAt:String(r.updated_at),version:Number(r.version)};}
export const getContent=cache(async(strict=false)=>{
 try{
  const config=await getSettings();
  const rows=await db().prepare('SELECT * FROM records ORDER BY updated_at DESC').all<Record<string,unknown>>();
  const map=new Map<string,RecordItem>(defaultRecords.map(r=>[r.id,{...r,version:0}]));
  for(const r of rows.results)map.set(String(r.id),item(r));
  return {...config,records:Array.from(map.values()),available:true};
 }catch{if(strict)throw new Error('Content unavailable');return {settings:{...defaults},versions:{},records:defaultRecords,available:false};}
});
// React cache is request-scoped, never a shared cache for private data.
export const getPublicContent=cache(async()=>{
 const config=await getSettings();
 const rows=await db().prepare("SELECT * FROM records WHERE status='published' ORDER BY updated_at DESC").all<Record<string,unknown>>();
 // A saved draft must suppress its seeded public version without loading draft bodies.
 const overrides=await db().prepare('SELECT id FROM records WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(defaultRecords.map(r=>r.id))).all<{id:string}>();
 const saved=new Set(overrides.results.map(r=>r.id));
 const records=[...defaultRecords.filter(r=>r.status==='published'&&!saved.has(r.id)).map(r=>({...r,version:0})),...rows.results.map(item)];
 return {...config,records,available:true};
});
export function safeUrl(value:string){if(value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\'))return value;try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}return '';}
export function youtubeId(value:string){try{const u=new URL(value);const id=u.hostname==='youtu.be'?u.pathname.slice(1):['www.youtube.com','youtube.com','m.youtube.com'].includes(u.hostname)?u.searchParams.get('v')||u.pathname.split('/').pop():null;return id&&/^[a-zA-Z0-9_-]{11}$/.test(id)?id:null;}catch{return null;}}
