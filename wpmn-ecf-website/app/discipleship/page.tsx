import Link from 'next/link';
import {Shell,PageHero,Paragraphs,TextLink,ConnectBand} from '@/components/site/ui';
import {getPublicContent} from '@/lib/store';
import {pageMetadata} from '@/lib/seo';

export const dynamic='force-dynamic';
export function generateMetadata(){return pageMetadata('Discipleship at ECF | Growing Together in Christ','Explore Welcome to the Family, Scripture, house churches, devotional support, and guided service through ECF’s Christ-centered discipleship pathway.','/discipleship');}

export default async function Discipleship(){
 const {settings:s}=await getPublicContent();
 const sections=[['welcome','/contact?reason=discipleship','Ask about Welcome to the Family'],['growth','/beliefs','Explore what we teach'],['daily','/house-churches','Find a house church'],['service','/contact?reason=discipleship','Ask about guided service'],['mission','/about','Learn about WPMN’s mission']];
 return <Shell s={s}>
   <PageHero label="DISCIPLESHIP" title={s['discipleship.heading']} intro={s['discipleship.intro']}><div className="actions"><Link className="button" href="/contact?reason=discipleship">Talk with us about discipleship</Link></div></PageHero>
   {sections.map(([key,href,label],i)=><section key={key} className={'section '+(i%2?'campuses-section':'')}><div className="wrap narrow"><h2>{s['discipleship.'+key+'Heading']}</h2><Paragraphs text={s['discipleship.'+key+'Body']}/><TextLink href={href}>{label}</TextLink></div></section>)}
   <ConnectBand s={s}/>
 </Shell>;
}
