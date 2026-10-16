import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from '@/lib/safe-redirect';

describe('safeRedirectPath', () => {
  it.each([
    '/',
    '/map',
    '/map?x=1',
    '/settings',
    '/booking?seat=2&tab=info',
    '/verify-otp?email=an%40busgo.vn',
  ])('accepts safe relative path %s', (value) => {
    expect(safeRedirectPath(value)).toBe(value);
  });

  it.each([
    ['null input', null],
    ['empty string', ''],
    ['protocol-relative host', '//evil.com'],
    ['http url', 'http://evil.com'],
    ['https url', 'https://a'],
    ['backslash only', '\\x'],
    ['backslash inside path', '/\\evil.com'],
    ['encoded double slash', '/%2f%2fevil.com'],
    ['double-encoded double slash', '/%252f%252fevil.com'],
    ['javascript scheme with tab', 'java\tscript:alert(1)'],
    ['encoded colon', '/page%3Aevil'],
    ['encoded newline', '/page%0aSet-Cookie:x'],
    ['encoded null byte', '/page%00evil'],
    ['inner double slash', '/foo//bar'],
    ['relative path without slash', 'login'],
    ['overlong path', `/${'a'.repeat(2048)}`],
  ])('rejects %s', (_label, value) => {
    expect(safeRedirectPath(value)).toBeNull();
  });
});
