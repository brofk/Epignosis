import {siteOrigin} from '@/lib/seo';
export const dynamic='force-dynamic';
export default function robots(){return {rules:{userAgent:'*',allow:['/','/api/assets/'],disallow:['/editor','/api/']},sitemap:siteOrigin()+'/sitemap.xml'}}
