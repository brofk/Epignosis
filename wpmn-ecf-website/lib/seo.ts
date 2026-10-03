import type {Metadata} from 'next';
import {runtime, safeUrl} from './store';
import {brandImage} from './brand';

export function siteOrigin() {
  return runtime('SITE_ORIGIN').replace(/\/$/, '') || 'https://wpmn-ecf.franciskumi17.chatgpt.site';
}

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {title, description, alternates: {canonical: new URL(path, siteOrigin()).href}};
}

export function websiteData(s: Record<string, string>) {
  const base = siteOrigin();
  const logo = brandImage(s['brand.logoImage']);
  const social = [s['contact.facebook'], s['contact.youtube']].map(safeUrl).filter(Boolean);
  return {'@context': 'https://schema.org', '@graph': [
    {'@type': 'WebSite', '@id': base + '/#website', url: base + '/', name: s['brand.siteName'], alternateName: s['identity.name'], publisher: {'@id': base + '/#network'}},
    {'@type': 'Organization', '@id': base + '/#network', name: s['identity.name'], url: base + '/', description: s['identity.short'], ...(logo ? {logo: new URL(logo, base).href} : {}), ...(social.length ? {sameAs: social} : {})}
  ]};
}
