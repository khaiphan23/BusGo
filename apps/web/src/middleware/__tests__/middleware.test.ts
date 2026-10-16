/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.hoisted(() => vi.fn());

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

import { middleware } from '@/middleware';

const BASE = 'http://localhost:3100';

function createRequest(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`${BASE}${path}`, { headers });
}

function unauthenticated() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

function authenticated() {
  getUserMock.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'an@busgo.vn' } },
    error: null,
  });
}

describe('middleware route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unauthenticated();
  });

  it('redirects unauthenticated requests on protected paths to /login with a safe next', async () => {
    const response = await middleware(createRequest('/settings'));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${BASE}/login?next=%2Fsettings`);
  });

  it('keeps the query string inside the next param', async () => {
    const response = await middleware(createRequest('/settings?tab=2'));

    expect(response.headers.get('location')).toBe(`${BASE}/login?next=%2Fsettings%3Ftab%3D2`);
  });

  it('falls back to bare /login when the path decodes to an absolute URL', async () => {
    const response = await middleware(createRequest('/%2f%2fevil'));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${BASE}/login`);
  });

  it('falls back to bare /login when the path contains an inner double slash', async () => {
    const response = await middleware(createRequest('/foo//bar'));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${BASE}/login`);
  });

  it.each([
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-otp',
    '/auth/callback?code=pkce-code',
    '/manifest.json',
    '/sw.js',
    '/service-worker.js',
    '/robots.txt',
    '/favicon.ico',
    '/map',
    '/map?bus=1',
    '/api/buses',
    '/_next/static/chunks/main-app.js',
    '/fonts/inter.woff2',
    '/workbox-0a9fb529.js',
  ])('allows unauthenticated access to public path %s', async (path) => {
    const response = await middleware(createRequest(path));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('ignores forged session cookies that getUser does not verify', async () => {
    const response = await middleware(
      createRequest('/settings', { cookie: 'sb-access-token=forged' })
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${BASE}/login?next=%2Fsettings`);
    expect(getUserMock).toHaveBeenCalledTimes(1);
  });

  describe('when authenticated', () => {
    beforeEach(() => {
      authenticated();
    });

    it.each(['/login', '/register'])('redirects %s to /', async (path) => {
      const response = await middleware(createRequest(path));

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(`${BASE}/`);
    });

    it('allows access to protected paths', async () => {
      const response = await middleware(createRequest('/settings'));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it('keeps other public auth pages reachable', async () => {
      const response = await middleware(createRequest('/forgot-password'));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });
  });
});
