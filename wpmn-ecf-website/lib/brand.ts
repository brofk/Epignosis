export const brandDefaults = { violet: '#342758', teal: '#437D7C' };

export function isBrandColor(value: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) return false;
  const channels = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return 1.05 / (.2126 * r + .7152 * g + .0722 * b + .05) >= 4.5;
}

export function brandColor(value: string, fallback: string) {
  return isBrandColor(value) ? value : fallback;
}

export function colorChannels(hex: string) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(' ');
}

export function brandImage(value: string) {
  // Brand files come from the authenticated, validated site uploader.
  if (['/images/ecf-horizontal.png','/images/ecf-avatar.png','/images/ecf-brandmark.png','/images/ecf-primary-white.png','/images/ecf-horizontal-white.png'].includes(value)) return value;
  return /^\/api\/assets\/[0-9a-f-]{36}$/i.test(value) ? value : '';
}

export const brandHelp: Record<string, string> = {
  'brand.siteName': 'The name in the header and browser title. This does not change your web address. Edit the main homepage heading separately under Homepage.',
  'brand.logoImage': 'Upload your approved WPMN logo in Photos & files, then paste its /api/assets/ link. PNG, JPG, or WebP; use a transparent PNG when available.',
  'brand.logoAlt': 'A short description of the WPMN logo for people using a screen reader.',
  'brand.ecfLogoImage': 'Upload your approved ECF logo and paste its /api/assets/ link. The official ECF mark is already supplied. A replacement appears with the ECF identity on the site.',
  'brand.ecfLogoAlt': 'A short description of the ECF logo.',
  'brand.faviconImage': 'Upload a square version of your approved mark, ideally at least 48 × 48 pixels. Leave empty to retain the current W favicon.',
  'brand.midnightViolet': 'Six-digit hex color, including #. Choose a dark shade so white text remains readable. Official ECF Midnight Violet: #342758.',
  'brand.faithTeal': 'Six-digit hex color, including #. Official ECF Faith Teal: #437D7C.',
  'seo.homeTitle': 'Optional search title for the homepage. Leave empty to use your network name and website name.',
  'seo.homeDescription': 'A clear description of WPMN, ECF, and where you gather. Search engines may choose a different snippet.',
  'seo.googleVerification': 'Paste only the content value from Google’s HTML verification tag, not the whole tag. This is a public verification code, never a password.',
  'seo.bingVerification': 'Paste only the content value from Bing’s verification tag. Leave empty until you set up Bing Webmaster Tools.'
};
