// Isolated tests only. Never imported by application code or production builds.
import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import ts from 'typescript';
const root=resolve(import.meta.dirname,'..');
registerHooks({
 resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return {url:'test:cloudflare',shortCircuit:true};
  if(specifier==='next/headers')return {url:'test:headers',shortCircuit:true};
  if(specifier==='next/navigation')return {url:'test:navigation',shortCircuit:true};
  if(specifier.startsWith('@/'))return {url:pathToFileURL(resolve(root,specifier.slice(2)+'.ts')).href,shortCircuit:true};
  if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:')){
   const u=new URL(specifier,context.parentURL);
   if(existsSync(fileURLToPath(u)+'.ts'))return {url:u.href+'.ts',shortCircuit:true};
  }
  return next(specifier,context);
 },
 load(url,context,next){
  if(url==='test:cloudflare')return {format:'module',source:'export const env=globalThis.__testEnv;',shortCircuit:true};
  if(url==='test:headers')return {format:'module',source:'export async function headers(){return globalThis.__testHeaders;}',shortCircuit:true};
  if(url==='test:navigation')return {format:'module',source:'export function redirect(url){throw new Error("redirect:"+url);}',shortCircuit:true};
  if(url.endsWith('.ts')&&!url.includes('/node_modules/'))return {format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,shortCircuit:true};
  return next(url,context);
 }
});
