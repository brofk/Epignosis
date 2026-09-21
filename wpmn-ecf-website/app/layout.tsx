import type { Metadata } from 'next';
import type {CSSProperties} from 'react';
import {getPublicContent} from '@/lib/store';
import {brandColor,brandDefaults,brandImage,colorChannels} from '@/lib/brand';
import {siteOrigin} from '@/lib/seo';
import './globals.css';
import './ecf-branding.css';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{const {settings:s}=await getPublicContent();const icon=brandImage(s['brand.faviconImage'])||'/favicon.svg';return {metadataBase:new URL(siteOrigin()),title:{default:s['seo.homeTitle']||s['identity.name']+' | '+s['brand.siteName'],template:'%s | '+s['brand.siteName'].replace(/%/g,'')},description:s['seo.homeDescription'],icons:{icon,shortcut:icon},verification:{...(s['seo.googleVerification']?{google:s['seo.googleVerification']}:{ }),...(s['seo.bingVerification']?{other:{'msvalidate.01':s['seo.bingVerification']}}:{})}};}
export default async function RootLayout({children}:{children:React.ReactNode}){const {settings:s}=await getPublicContent();const violet=brandColor(s['brand.midnightViolet'],brandDefaults.violet),teal=brandColor(s['brand.faithTeal'],brandDefaults.teal);const style={'--violet':violet,'--violet-rgb':colorChannels(violet),'--teal':teal,'--teal-rgb':colorChannels(teal),'--primary':teal,'--accent-foreground':teal,'--ring':teal} as CSSProperties;return <html lang="en" style={style}><body>{children}</body></html>}
