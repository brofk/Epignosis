import Link from 'next/link';
import {Shell,PageHero,Paragraphs,TextLink,ConnectBand,CampusCards} from '@/components/site/ui';
import {getPublicContent} from '@/lib/store';
import {brandImage} from '@/lib/brand';
import {pageMetadata} from '@/lib/seo';

export const dynamic='force-dynamic';
export function generateMetadata(){return pageMetadata('Epignosis Christian Family | Church Life in Baguio','Meet Epignosis Christian Family within WPMN. Explore Sunday gatherings, house churches, discipleship, and shared life in Baguio, San Nicolas, and Candon.','/ecf');}

export default async function ECF(){
  const {settings:s}=await getPublicContent();
  const logo=brandImage(s['brand.ecfLogoImage']);
  return <Shell s={s}>
    <PageHero label="OUR CHURCH FAMILY" title={s['ecf.heading']} intro={s['ecf.intro']}>
      <div className="actions"><Link className="button" href="/visit">Plan a visit</Link><TextLink href="/campuses">Explore our communities</TextLink></div>
    </PageHero>
    <section className="section wrap"><div className="split">
      <div>{logo&&<img className="ecf-page-logo" src={logo} alt={s['brand.ecfLogoAlt']} width={375} height={121}/>}<h2>{s['ecf.familyHeading']}</h2></div>
      <div><Paragraphs text={s['ecf.familyBody']}/><TextLink href="/about">Our place within WPMN</TextLink></div>
    </div></section>
    <section className="section campuses-section"><div className="wrap two-col">
      <div className="text-panel"><h2>{s['ecf.sundayHeading']}</h2><Paragraphs text={s['ecf.sundayBody']}/><TextLink href="/visit">What to expect when you visit</TextLink></div>
      <div className="text-panel"><h2>{s['ecf.houseHeading']}</h2><Paragraphs text={s['ecf.houseBody']}/><TextLink href="/house-churches">Find a house church</TextLink></div>
    </div></section>
    <section className="section wrap narrow"><h2>{s['ecf.growthHeading']}</h2><Paragraphs text={s['ecf.growthBody']}/><div className="paragraph-links"><TextLink href="/discipleship">Explore discipleship</TextLink><TextLink href="/beliefs">Read what we teach</TextLink></div></section>
    <section className="section campuses-section"><div className="wrap"><h2>Our local communities</h2><CampusCards s={s}/></div></section>
    <ConnectBand s={s}/>
  </Shell>;
}
