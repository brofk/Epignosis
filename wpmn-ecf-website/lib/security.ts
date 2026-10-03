import {isEditorRole,permits,type Permission,type EditorRole} from './permissions';
import {getChatGPTUser} from '@/app/chatgpt-auth';import {db,runtime} from './store';
export async function editor(){const user=await getChatGPTUser();if(!user)return null;const row=await db().prepare('SELECT role FROM editors WHERE user_id = ?').bind(user.userId).first<{role:string}>();return row&&isEditorRole(row.role)?{...user,role:row.role as EditorRole}:null;}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !!origin&&[runtime('SITE_ORIGIN'),new URL(req.url).origin].filter(Boolean).includes(origin)&&req.headers.get('sec-fetch-site')!=='cross-site';}
export function reply(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function rateLimit(req:Request,scope:string,max=6){const now=Date.now(),slot=Math.floor(now/3600000);const key=await hash(scope+':'+(req.headers.get('cf-connecting-ip')||'unknown')+':'+slot+':'+runtime('RATE_LIMIT_SALT'));const row=await db().prepare('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+7200000).first<{count:number}>();await db().prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run();return !!row&&row.count<=max;}
export async function readJson(req:Request,limit=60000){if(Number(req.headers.get('content-length')||0)>limit)throw new HttpError(413,'Message is too large.');if(!req.headers.get('content-type')?.includes('application/json'))throw new HttpError(400,'Please submit the form normally.');const reader=req.body?.getReader();if(!reader)throw new HttpError(400,'No message was provided.');let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new HttpError(413,'Message is too large.');}chunks.push(value);}const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.byteLength;}return JSON.parse(new TextDecoder().decode(data));}

export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
export function routeError(error:unknown){
 if(error instanceof HttpError)return reply({error:error.message},error.status);
 if(error instanceof SyntaxError)return reply({error:'Please check the submitted information.'},400);
 return reply({error:'Your request could not be completed. Please try again.'},503);
}
export type AuthorizedEditor = NonNullable<Awaited<ReturnType<typeof editor>>>;
export function protectedRoute(permission:Permission,handler:(req:Request,user:AuthorizedEditor)=>Promise<Response>){
 return async(req:Request)=>{try{
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!sameOrigin(req))throw new HttpError(403,'Please use this website to make changes.');
  const user=await editor();
  if(!user||!permits(user.role,permission))throw new HttpError(403,'You do not have access to this operation.');
  return await handler(req,user);
 }catch(error){return routeError(error);}};
}
