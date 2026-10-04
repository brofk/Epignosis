import Link from '@/components/site/site-link';
import {resourceNextSteps,type RecordItem} from '@/lib/defaults';
import {safeInternalPath} from '@/lib/store';

export function getResourceNextStep(record:RecordItem){
 const fallback=resourceNextSteps[record.kind+':'+record.slug];
 const label=(record.data.nextStepLabel||fallback?.label||'').trim();
 const legacySeriesUrl=record.kind==='series'?record.data.nextTeaching||'':'';
 const href=safeInternalPath(record.data.nextStepUrl||legacySeriesUrl||fallback?.url||'');
 return label&&href?{label,href}:null;
}

export function ResourceNextStep({record}:{record:RecordItem}){
 const next=getResourceNextStep(record);
 if(!next)return null;
 return <div className="space-top"><p className="eyebrow">TAKE YOUR NEXT STEP</p><Link className="button" href={next.href}>{next.label}</Link></div>;
}
