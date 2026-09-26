import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {applyMigrationFile,applyMigrations,columnNames,listMigrationFiles,tableNames} from '../scripts/migrations/migration-lib.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const migrations=join(here,'..','drizzle');
const migration0=join(migrations,'0000_sweet_vulcan.sql');

function withDatabase(run){
 const db=new DatabaseSync(':memory:');
 try{return run(db);}finally{db.close();}
}

test('fresh database reaches the complete current schema',()=>withDatabase(db=>{
 const result=applyMigrations(db,migrations);
 assert.deepEqual(result.map(item=>item.status),['applied','applied']);
 assert.deepEqual(tableNames(db),[
  '__migration_history','assets','audit_events','claims','editors','rate_limits','records','settings','submissions','write_guards'
 ]);
 assert.ok(columnNames(db,'submissions').includes('response_due_at'));
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND name='idx_records_kind_slug'").get().n,1);
}));

test('upgrade from the previous schema preserves rows and applies defaults',()=>withDatabase(db=>{
 applyMigrationFile(db,migration0);
 db.prepare('INSERT INTO records (id,kind,title,slug,status,data,version,updated_at) VALUES (?,?,?,?,?,?,?,?)').run('record-1','article','Test','test','draft','{}',1,'2026-09-24T00:00:00Z');
 db.prepare('INSERT INTO submissions (id,category,payload,confidential,team,status,assignee,follow_up,notes,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('submission-1','prayer','{}',1,'Pastoral Team','New','','','','[]','2026-09-24T00:00:00Z','2026-09-24T00:00:00Z');
 const result=applyMigrations(db,migrations);
 assert.deepEqual(result.map(item=>item.status),['skipped','applied']);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM records').get().n,1);
 assert.equal(db.prepare('SELECT response_due_at FROM submissions WHERE id=?').get('submission-1').response_due_at,'');
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='audit_events'").get().n,1);
}));

test('migration runner is repeat-safe and skips verified migrations',()=>withDatabase(db=>{
 applyMigrations(db,migrations);
 const second=applyMigrations(db,migrations);
 assert.deepEqual(second.map(item=>item.status),['skipped','skipped']);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM __migration_history').get().n,2);
 const timestamps=db.prepare('SELECT applied_at FROM __migration_history ORDER BY name').all();
 assert.equal(timestamps.length,2);
 for(const row of timestamps)assert.match(row.applied_at,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
}));

test('expand and backfill can be repeated while old reads remain reversible',()=>withDatabase(db=>{
 db.exec('CREATE TABLE example_submissions (id TEXT PRIMARY KEY, assignee TEXT NOT NULL)');
 db.prepare('INSERT INTO example_submissions VALUES (?,?)').run('one','Connect Team');
 db.prepare('INSERT INTO example_submissions VALUES (?,?)').run('two','Pastoral Team');
 db.exec('ALTER TABLE example_submissions ADD COLUMN assigned_to TEXT');
 const backfill=()=>db.exec('UPDATE example_submissions SET assigned_to=assignee WHERE assigned_to IS NULL');
 backfill();
 backfill();
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM example_submissions WHERE assigned_to IS NULL OR assigned_to<>assignee').get().n,0);
 db.prepare('UPDATE example_submissions SET assignee=?, assigned_to=? WHERE id=?').run('Admin','Admin','one');
 // Before contract, rollback means returning reads to the old column. No destructive schema action is needed.
 assert.equal(db.prepare('SELECT assignee FROM example_submissions WHERE id=?').get('one').assignee,'Admin');
 assert.ok(columnNames(db,'example_submissions').includes('assigned_to'));
}));

test('failed migration rolls back every statement and history write',()=>{
 const directory=mkdtempSync(join(tmpdir(),'wpmn-migration-'));
 const file=join(directory,'0002_failure.sql');
 try{
  writeFileSync(file,'ALTER TABLE stable ADD COLUMN value TEXT;\n--> statement-breakpoint\nINSERT INTO missing_table VALUES (1);\n');
  withDatabase(db=>{
   db.exec('CREATE TABLE stable (id TEXT PRIMARY KEY)');
   assert.throws(()=>applyMigrationFile(db,file),/missing_table/);
   assert.deepEqual(columnNames(db,'stable'),['id']);
   assert.equal(db.prepare("SELECT COUNT(*) AS n FROM __migration_history WHERE name='0002_failure.sql'").get().n,0);
  });
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('changing an already applied migration is rejected by checksum',()=>{
 const directory=mkdtempSync(join(tmpdir(),'wpmn-checksum-'));
 const file=join(directory,'0001_test.sql');
 try{
  writeFileSync(file,'CREATE TABLE example (id TEXT PRIMARY KEY);\n');
  withDatabase(db=>{
   applyMigrationFile(db,file);
   writeFileSync(file,'CREATE TABLE example (id TEXT PRIMARY KEY, changed TEXT);\n');
   assert.throws(()=>applyMigrationFile(db,file),/checksum changed/);
  });
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('migration filenames are ordered by numeric prefix rather than text order',()=>{
 const directory=mkdtempSync(join(tmpdir(),'wpmn-order-'));
 try{
  const names=['10_ten.sql','2_two.sql','001_one.sql','0000000000000000000000000000000000003_three.sql','99999999999999999999999999999999999999_large.sql','notes.txt'];
  for(const name of names)writeFileSync(join(directory,name),'SELECT 1;\n');
  assert.deepEqual(listMigrationFiles(directory).map(file=>file.slice(directory.length+1)),[
   '001_one.sql','2_two.sql','0000000000000000000000000000000000003_three.sql','10_ten.sql','99999999999999999999999999999999999999_large.sql'
  ]);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
