import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {basename,join} from 'node:path';

const HISTORY_TABLE='__migration_history';

export function migrationChecksum(sql){
 return createHash('sha256').update(sql).digest('hex');
}

export function splitMigration(sql){
 return sql.split('--> statement-breakpoint').map(statement=>statement.trim()).filter(Boolean);
}

export function listMigrationFiles(directory){
 const files=readdirSync(directory).filter(name=>/^\d+.*\.sql$/.test(name));
 return files.sort((left,right)=>{
  const normalize=name=>name.match(/^\d+/)[0].replace(/^0+(?=\d)/,'');
  const leftNumber=normalize(left),rightNumber=normalize(right);
  return leftNumber.length-rightNumber.length||leftNumber.localeCompare(rightNumber)||left.localeCompare(right);
 }).map(name=>join(directory,name));
}

export function ensureMigrationHistory(db){
 db.exec(`CREATE TABLE IF NOT EXISTS ${HISTORY_TABLE} (
  name TEXT PRIMARY KEY NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL
 )`);
}

export function appliedMigrations(db){
 ensureMigrationHistory(db);
 return new Map(db.prepare(`SELECT name, checksum FROM ${HISTORY_TABLE} ORDER BY name`).all().map(row=>[row.name,row.checksum]));
}

export function applyMigrationFile(db,file){
 const name=basename(file);
 const sql=readFileSync(file,'utf8');
 const checksum=migrationChecksum(sql);
 const applied=appliedMigrations(db);
 if(applied.has(name)){
  if(applied.get(name)!==checksum)throw new Error(`Applied migration checksum changed: ${name}`);
  return {name,status:'skipped',checksum};
 }
 db.exec('BEGIN IMMEDIATE');
 try{
  for(const statement of splitMigration(sql))db.exec(statement);
  db.prepare(`INSERT INTO ${HISTORY_TABLE} (name,checksum,applied_at) VALUES (?,?,?)`).run(name,checksum,new Date().toISOString());
  db.exec('COMMIT');
  return {name,status:'applied',checksum};
 }catch(error){
  db.exec('ROLLBACK');
  throw error;
 }
}

export function applyMigrations(db,directory){
 return listMigrationFiles(directory).map(file=>applyMigrationFile(db,file));
}

export function tableNames(db){
 return db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>row.name);
}

export function columnNames(db,table){
 if(!/^[a-z_][a-z0-9_]*$/i.test(table))throw new Error('Unsafe table name');
 return db.prepare(`PRAGMA table_info(${table})`).all().map(row=>row.name);
}
