import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {datasetShape,findSensitiveValues,sanitizeDataset} from './staging-data-lib.mjs';

function valueAfter(flag){
 const index=process.argv.indexOf(flag);
 return index>=0?process.argv[index+1]:undefined;
}

const input=valueAfter('--input');
const output=valueAfter('--output');
const denylistFile=valueAfter('--denylist');
if(!input||!output)throw new Error('Usage: npm run staging:sanitize -- --input export.json --output staging.json [--denylist denylist.txt]');
if(resolve(input)===resolve(output))throw new Error('Refusing to overwrite the source export');

const source=JSON.parse(readFileSync(input,'utf8'));
const denylist=denylistFile?readFileSync(denylistFile,'utf8').split(/\r?\n/).map(line=>line.trim()).filter(Boolean):[];
const sanitized=sanitizeDataset(source);
const findings=findSensitiveValues(sanitized,{denylist});
if(findings.length)throw new Error(`Sanitized output failed leak scan: ${JSON.stringify(findings.slice(0,10))}`);
if(JSON.stringify(datasetShape(source))!==JSON.stringify(datasetShape(sanitized)))throw new Error('Sanitization changed table, row, or column shape');
writeFileSync(output,`${JSON.stringify(sanitized,null,2)}\n`,{flag:'wx',mode:0o600});
console.log(`Sanitized ${Object.values(sanitized).reduce((total,rows)=>total+rows.length,0)} rows; leak scan passed.`);
