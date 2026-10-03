import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
const sqlSource=readFileSync(new URL('../lib/write-sql.ts',import.meta.url),'utf8');
const query=name=>{const match=sqlSource.match(new RegExp('export const '+name+' = (`[\\s\\S]*?`|\'[^\']*\');'));assert.ok(match,name);return match[1].slice(1,-1);};
test('D1 local runtime rolls back guarded batch and enforces slug uniqueness',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-01-01',d1Databases:{DB:'security-test'}});
 try{
  const db=await mf.getD1Database('DB');
  for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())for(const statement of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split('--> statement-breakpoint'))if(statement.trim())await db.prepare(statement).run();
  await db.prepare('INSERT INTO settings VALUES (?,?,?,?)').bind('a','other editor',2,'now').run();
  await assert.rejects(db.batch([
   db.prepare(query('settingsGuard')).bind('stale',JSON.stringify([{key:'a',version:1},{key:'b',version:0}])),
   db.prepare(query('saveSetting')).bind('b','new','now'),db.prepare(query('clearGuard')).bind('stale')
  ]),/CHECK constraint failed/);
  assert.equal((await db.prepare("SELECT count(*) n FROM settings WHERE key='b'").first()).n,0);
  await db.batch([db.prepare(query('settingsGuard')).bind('fresh',JSON.stringify([{key:'a',version:2},{key:'b',version:0}])),db.prepare(query('saveSetting')).bind('a','fresh','now'),db.prepare(query('saveSetting')).bind('b','new','now'),db.prepare(query('clearGuard')).bind('fresh')]);
  assert.equal((await db.prepare("SELECT version FROM settings WHERE key='a'").first()).version,3);
  assert.equal((await db.prepare('SELECT count(*) n FROM write_guards').first()).n,0);
  await db.prepare(query('saveRecord')).bind('one','article','title','same-slug','draft','{}','now').run();
  await assert.rejects(db.prepare(query('saveRecord')).bind('two','article','title','same-slug','draft','{}','now').run(),/UNIQUE constraint failed/);
  // An audit write must roll back when a later mutation fails.
  await assert.rejects(db.batch([db.prepare(query('auditWrite')).bind('audit','owner','delete-submission','missing','now'),db.prepare(query('submissionGuard')).bind('missing-guard','missing')]),/CHECK constraint failed/);
  assert.equal((await db.prepare('SELECT count(*) n FROM audit_events').first()).n,0);
 }finally{await mf.dispose();}
});
