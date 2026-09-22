const protectedSegments = /(^|\/)(editor|api\/editor|api\/upload)(\/|$)/;
const authPaths = new Set(['/signin-with-chatgpt', '/signout-with-chatgpt', '/callback']);

export function canonicalSecurityPath(pathname: string): string {
  let value = pathname.replace(/\\/g, '/');
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return ('/' + value).replace(/\/{2,}/g, '/').toLowerCase();
}

export function isSensitivePath(pathname: string): boolean {
  const path = canonicalSecurityPath(pathname);
  return authPaths.has(path) || protectedSegments.test(path);
}

export function contentSecurityPolicy(nonce: string, pathname: string): string {
  const sensitive = isSensitivePath(pathname);
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' https:",
    sensitive
      ? "frame-src 'none'"
      : 'frame-src https://www.youtube-nocookie.com',
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
  ];
  return directives.join('; ');
}
