import {readFileSync,readdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url));
const ignored=new Set(['.git','.next','.sites-runtime','.turbo','.wrangler','coverage','dist','node_modules','tests']);
const sourceFile=/\.(?:[cm]?js|jsx|ts|tsx|json|jsonc|toml|ya?ml|sh|html)$/i;
const packageSignal=/(?:^|[/:])(?:openai|ai|@ai-sdk\/[^:]+|@anthropic-ai\/sdk|@google\/(?:genai|generative-ai)|@langchain\/[^:]+|langchain|llamaindex)(?:$|[@:])/i;
const sourceSignals=[
  /(?:api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.cohere\.(?:com|ai)|api\.mistral\.ai)/i,
  /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY|GEMINI_API_KEY|AI_GATEWAY_API_KEY)\b/,
  /(?:from\s*|import\s*\(|require\s*\()\s*['"](?:openai|ai|@ai-sdk\/|@anthropic-ai\/|@google\/(?:genai|generative-ai)|@langchain\/|langchain|llamaindex)/,
  /\b(?:chat\.completions|responses)\.create\s*\(/,
];

function dependencySignals(pkg){
  return ['dependencies','devDependencies','optionalDependencies','peerDependencies'].flatMap(section=>
    Object.entries(pkg[section]??{}).filter(([name,value])=>packageSignal.test(name)||packageSignal.test(String(value))).map(([name])=>`${section}:${name}`));
}
function runtimeSignals(source){return sourceSignals.some(pattern=>pattern.test(source));}
function walk(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const path=resolve(dir,entry.name);
    if(entry.isDirectory())return ignored.has(entry.name)?[]:walk(path);
    if(!entry.isFile())return [];
    return sourceFile.test(entry.name)||entry.name.startsWith('.env')?[path]:[];
  });
}

test('website has no unreviewed runtime AI data connection',()=>{
  const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
  const files=walk(root).filter(file=>runtimeSignals(readFileSync(file,'utf8'))).map(file=>relative(root,file));
  assert.deepEqual([...dependencySignals(pkg),...files],[],
    'Runtime AI requires a separate reviewed implementation of AI_DATA_BOUNDARY.md. Do not remove this guard merely to pass CI. The isolated GitHub diff reviewer is outside the website runtime.');
});
test('detects SDKs and aliased SDK dependencies in every dependency section',()=>{
  for(const section of ['dependencies','devDependencies','optionalDependencies','peerDependencies']){
    for(const [name,value] of [['openai','1'],['@ai-sdk/openai','1'],['@anthropic-ai/sdk','1'],['assistant','npm:openai@1']]){
      assert.equal(dependencySignals({[section]:{[name]:value}}).length,1);
    }
  }
  assert.deepEqual(dependencySignals({dependencies:{'lucide-react':'1','drizzle-orm':'1'}}),[]);
});
test('detects direct model calls and provider credentials without an SDK',()=>{
  for(const source of ["fetch('https://api.openai.com/v1/responses')",'process.env.OPENAI_API_KEY',"import {generateText} from 'ai'",'client.responses.create({})',"require('@google/genai')"]){
    assert.equal(runtimeSignals(source),true,source);
  }
  assert.equal(runtimeSignals('const response = await fetch("/api/contact");'),false);
});
