/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const authMock = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: authMock })),
}));

import { GET } from '@/app/auth/callback/route';

const BASE = 'http://localhost:3100';

function request(path: string) {
  return new NextRequest(`${BASE}${path}`);
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
    authMock.verifyOtp.mockReset().mockResolvedValue({ error: null });
  });

  it('exchanges a PKCE code and redirects to the safe next path', async () => {
    const response = await GET(request('/auth/callback?code=pkce-code&next=%2Fmap'));

    expect(authMock.exchangeCodeForSession).toHaveBeenCalledWith('pkce-code');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${BASE}/map`);
  });

  it('falls back to / when no next param is present', async () => {
    const response = await GET(request('/auth/callback?code=pkce-code'));

    expect(response.headers.get('location')).toBe(`${BASE}/`);
  });

  it('rejects an unsafe next param and falls back to /', async () => {
    const response = await GET(
      request('/auth/callback?code=pkce-code&next=%2F%2Fevil.com')
    );

    expect(response.headers.get('location')).toBe(`${BASE}/`);
  });

  it('verifies a token_hash link when there is no PKCE code', async () => {
    const response = await GET(
      request('/auth/callback?token_hash=abc123&type=recovery&next=%2Freset-password')
    );

    expect(authMock.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(authMock.verifyOtp).toHaveBeenCalledWith({
      type: 'recovery',
      token_hash: 'abc123',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${BASE}/reset-password`);
  });

  it('redirects to /login with a generic error when the exchange fails', async () => {
    authMock.exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad code' } });

    const response = await GET(request('/auth/callback?code=pkce-code'));

    expect(response.headers.get('location')).toBe(`${BASE}/login?error=1`);
  });

  it('redirects to /login when neither code nor token_hash is present', async () => {
    const response = await GET(request('/auth/callback?next=%2Fmap'));

    expect(authMock.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(authMock.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe(`${BASE}/login?error=1`);
  });

  it('redirects to /login when the token type is not a supported OTP type', async () => {
    const response = await GET(request('/auth/callback?token_hash=abc&type=bogus'));

    expect(authMock.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe(`${BASE}/login?error=1`);
  });
});
