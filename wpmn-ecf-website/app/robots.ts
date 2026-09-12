import {runtime} from '@/lib/store';
export const dynamic='force-dynamic';
export default function robots(){const base=runtime('SITE_ORIGIN').replace(/\/$/,'')||'https://wpmn-ecf.franciskumi17.chatgpt.site';return {rules:{userAgent:'*',allow:'/',disallow:['/editor','/api/']},sitemap:base+'/sitemap.xml'}}
