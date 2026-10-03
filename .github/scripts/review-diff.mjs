import {execFileSync} from 'node:child_process';

const SHA=/^[a-f0-9]{40}$/;
function git(args,cwd){
  return execFileSync('git',['--literal-pathspecs',...args],{cwd,encoding:'utf8',maxBuffer:2_000_000,timeout:60_000});
}

// Fetch commits as data only. Never check out or execute the pull request's code.
export function completeDiff(files,{baseSha,headSha,cwd=process.cwd()}){
  if(!SHA.test(baseSha)||!SHA.test(headSha))throw new Error('Invalid review commit identity.');
  for(const sha of [baseSha,headSha]){
    try{git(['cat-file','-e',`${sha}^{commit}`],cwd);}
    catch{git(['fetch','--no-tags','--no-write-fetch-head','origin',sha],cwd);}
  }
  const ancestor=git(['merge-base',baseSha,headSha],cwd).trim();
  if(!SHA.test(ancestor))throw new Error('Review merge base is unavailable.');
  if(!files.length)throw new Error('Pull request has no files to review.');
  const allowed=new Set();
  for(const file of files){
    for(const path of [file.filename,file.previous_filename].filter(Boolean)){
      if(typeof path!=='string'||path.includes('\0')||path.startsWith('/')||path.split('/').includes('..'))throw new Error('Invalid review file path.');
      allowed.add(path);
    }
  }
  const actual=git(['diff','--no-ext-diff','--no-textconv','--no-renames','--name-only','-z',ancestor,headSha],cwd).split('\0').filter(Boolean);
  if(actual.some(path=>!allowed.has(path)))throw new Error('GitHub file manifest does not cover the complete commit diff.');
  return files.map(file=>{
    if(!actual.includes(file.filename)&&!actual.includes(file.previous_filename))throw new Error('GitHub file manifest does not match the review commits.');
    const paths=[...new Set([file.previous_filename,file.filename].filter(Boolean))];
    const patch=git(['diff','--no-ext-diff','--no-textconv','--find-renames','--unified=3',ancestor,headSha,'--',...paths],cwd);
    if(!patch.trim())throw new Error('A changed file has no complete diff.');
    return {...file,patch};
  });
}

export function changedRightLines(patch=''){
  const lines=new Set();let right=0;
  for(const line of patch.split('\n')){
    const hunk=/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if(hunk){right=Number(hunk[1]);continue;}
    if(line.startsWith('+')&&!line.startsWith('+++')){lines.add(right);right++;}
    else if(!line.startsWith('-')&&!line.startsWith('\\')&&right)right++;
  }
  return lines;
}

// Retain every diff line, with explicit line numbers across split hunks.
function numberedLines(patch){
  let right=0,left=0;
  return patch.split('\n').map(line=>{
    const hunk=/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if(hunk){left=Number(hunk[1]);right=Number(hunk[2]);return line;}
    if(!right||line.startsWith('+++')||line.startsWith('---')||line.startsWith('\\'))return line;
    if(line.startsWith('+'))return `RIGHT ${right++} | ${line}`;
    if(line.startsWith('-'))return `LEFT ${left++} | ${line}`;
    if(line.startsWith(' ')){left++;return `RIGHT ${right++} | ${line}`;}
    return line;
  });
}

export function reviewBatches(files,{maxBatchCharacters=120_000,maxTotalCharacters=1_500_000,maxBatches=16}={}){
  const parts=[];
  for(const file of files){
    const header=`FILE ${file.filename}\nSTATUS ${file.status} +${file.additions} -${file.deletions}\n`;
    const budget=maxBatchCharacters-header.length-80;
    if(budget<1)throw new Error('File metadata exceeds the review budget.');
    const chunks=[];let rows=[],size=0;
    for(const row of numberedLines(file.patch)){
      if(row.length+1>budget)throw new Error('A single diff line exceeds the review budget; split the source change.');
      if(rows.length&&size+row.length+1>budget){chunks.push(rows.join('\n'));rows=[];size=0;}
      rows.push(row);size+=row.length+1;
    }
    if(rows.length)chunks.push(rows.join('\n'));
    chunks.forEach((chunk,i)=>parts.push(`${header}FILE PART ${i+1}/${chunks.length}\n${chunk}`));
  }
  const batches=[];let current='';
  for(const part of parts){
    const joined=current?`${current}\n\n${part}`:part;
    if(joined.length>maxBatchCharacters){if(!current)throw new Error('Review batch exceeds its budget.');batches.push(current);current=part;}
    else current=joined;
  }
  if(current)batches.push(current);
  if(!batches.length)throw new Error('No review input was generated.');
  if(batches.length>maxBatches)throw new Error('Complete diff exceeds the review batch count; split the pull request.');
  if(batches.reduce((n,s)=>n+s.length,0)>maxTotalCharacters)throw new Error('Complete diff exceeds the total review budget; split the pull request.');
  return batches;
}

export function validateReview(review){
  const keys=(value,expected)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...expected].sort().join(',');
  if(!keys(review,['summary','findings'])||typeof review.summary!=='string'||review.summary.length>20_000||!Array.isArray(review.findings)||review.findings.length>30)throw new Error('Invalid structured review.');
  const fields=['severity','path','line','title','explanation','evidence','suggested_fix'];
  for(const finding of review.findings){
    if(!keys(finding,fields)||!['critical','warning','info'].includes(finding.severity)||!(finding.line===null||(Number.isInteger(finding.line)&&finding.line>0))||fields.filter(x=>x!=='line').some(x=>typeof finding[x]!=='string'||finding[x].length>20_000))throw new Error('Invalid structured finding.');
  }
  return review;
}
