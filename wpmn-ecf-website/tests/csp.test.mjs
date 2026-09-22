import './route-loader.mjs';
import {readFileSync, globSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalSecurityPath, contentSecurityPolicy, isSensitivePath} from '../lib/csp.ts';

test('protected path variations receive the sensitive policy', () => {
  const paths = [
    '/editor', '/editor/', '//editor', '/%65ditor', '/%2565ditor',
    '/api/editor', '/api/editor/export', '/api//editor/export',
    '/api/%65ditor', '/api/%2565ditor', '/api/upload', '/prefix/api/editor',
    '/signin-with-chatgpt', '/signout-with-chatgpt', '/callback',
  ];
  for (const path of paths) {
    assert.equal(isSensitivePath(path), true, path);
    assert.match(contentSecurityPolicy('testnonce', path), /frame-src 'none'/);
  }
});

test('public pages allow only the privacy-enhanced YouTube frame host', () => {
  const policy = contentSecurityPolicy('testnonce', '/media/sermon');
  assert.match(policy, /script-src 'self' 'nonce-testnonce' 'strict-dynamic'/);
  assert.match(policy, /frame-src https:\/\/www\.youtube-nocookie\.com/);
  assert.doesNotMatch(policy, /unsafe-eval/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /frame-ancestors 'none'/);
});

test('canonicalization is bounded and removes slash and encoding variations', () => {
  assert.equal(canonicalSecurityPath('/API//%2565DITOR/'), '/api/editor/');
  assert.equal(canonicalSecurityPath('\\api\\upload'), '/api/upload');
});

test('sensitive page source contains no third-party script or frame', () => {
  const sensitive = [
    'app/editor/page.tsx',
    'components/site/editor.tsx',
    'app/api/editor/route.ts',
    'app/api/editor/export/route.ts',
    'app/api/upload/route.ts',
  ];
  for (const file of sensitive) {
    const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /<script\b[^>]*\bsrc=/i, file);
    assert.doesNotMatch(source, /<iframe\b/i, file);
    assert.doesNotMatch(source, /googletagmanager|google-analytics|facebook\.net|chat-widget/i, file);
  }
});

test('proxy matcher and server guards both cover protected endpoints', () => {
  const proxy = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8');
  assert.match(proxy, /matcher:/);
  for (const file of globSync('app/api/**/route.ts').filter(path => path.includes('/editor/') || path.endsWith('/upload/route.ts'))) {
    assert.match(readFileSync(file, 'utf8'), /protectedRoute\(/, file);
  }
});
