import {z} from 'zod';
const id=z.string().min(1).max(100);
const version=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER-1);
const plainData=z.record(z.string().max(120000)).refine(x=>Object.keys(x).length<=40&&!Object.keys(x).some(k=>['__proto__','constructor','prototype'].includes(k))).superRefine((x,ctx)=>{
 const label=(x.nextStepLabel||'').trim(),url=(x.nextStepUrl||'').trim();
 if(Boolean(label)!==Boolean(url))ctx.addIssue({code:'custom',message:'A next step needs both a label and a page address.'});
 if(url&&(!url.startsWith('/')||url.startsWith('//')||url.includes('\\')))ctx.addIssue({code:'custom',path:['nextStepUrl'],message:'The next-step page must be an internal website address beginning with /.'});
});
const followUp=z.string().max(40).refine(s=>!s||/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s,'Choose a valid follow-up date.');
const recordInput=z.object({id,kind:z.enum(['sermon','article','event','series','faq']),title:z.string().trim().min(1).max(250),slug:z.string().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),status:z.enum(['draft','published']),data:plainData,version:version.default(0),updatedAt:z.string().max(50).optional()}).strict().superRefine((record,ctx)=>{
 if(record.status==='published'&&['sermon','article','series'].includes(record.kind)&&(!record.data.nextStepLabel?.trim()||!record.data.nextStepUrl?.trim()))ctx.addIssue({code:'custom',path:['data'],message:'Published teaching resources need one clear next step.'});
});
export const editorInput=z.discriminatedUnion('action',[
 z.object({action:z.literal('claim'),token:z.string().min(1).max(200)}).strict(),
 z.object({action:z.literal('settings'),changes:z.array(z.object({key:z.string().min(1).max(150),value:z.string().max(15000),version}).strict()).max(200).refine(x=>new Set(x.map(c=>c.key)).size===x.length)}).strict(),
 z.object({action:z.literal('record'),record:recordInput}).strict(),
 z.object({action:z.literal('message'),id,status:z.enum(['New','In progress','Follow-up scheduled','Complete']),assignee:z.string().max(300),followUp,notes:z.string().max(5000),tags:z.array(z.string().max(100)).max(30)}).strict(),
 z.object({action:z.literal('delete-message'),id}).strict()
]);
