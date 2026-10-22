import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { authErrorMessages, mapAuthError, zodFieldErrors } from '@/lib/auth/auth-errors';

describe('mapAuthError', () => {
  it('maps invalid_credentials to the generic login message', () => {
    expect(mapAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' }, 'login')).toBe(
      authErrorMessages.login
    );
  });

  it('maps unknown-email login failures to the same login message', () => {
    expect(mapAuthError({ code: 'user_not_found', message: 'User not found' }, 'login')).toBe(
      authErrorMessages.login
    );
  });

  it('falls back to the generic message for non-credential login failures', () => {
    expect(mapAuthError(new Error('fetch failed'), 'login')).toBe(authErrorMessages.generic);
  });

  it('maps OTP verification failures to the generic OTP message', () => {
    expect(mapAuthError({ code: 'otp_expired', message: 'expired' }, 'otp')).toBe(authErrorMessages.otp);
    expect(
      mapAuthError({ code: undefined, message: 'OTP provided is invalid or expired' }, 'otp')
    ).toBe(authErrorMessages.otp);
  });

  it('returns the generic message for non-object errors', () => {
    expect(mapAuthError('boom')).toBe(authErrorMessages.generic);
    expect(mapAuthError(null)).toBe(authErrorMessages.generic);
  });

  it('never leaks the underlying error message', () => {
    const result = mapAuthError({ code: 'invalid_credentials', message: 'secret-detail' }, 'login');
    expect(result).not.toContain('secret-detail');
    expect(result).toBe(authErrorMessages.login);
  });

  it('maps rate-limit codes to the rate-limit message regardless of kind', () => {
    expect(
      mapAuthError({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }, 'generic')
    ).toBe(authErrorMessages.rateLimit);
  });

  it('prioritises rate-limit mapping over the login branch', () => {
    expect(
      mapAuthError({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }, 'login')
    ).toBe(authErrorMessages.rateLimit);
  });

  it('falls back to rate-limit mapping from the message alone', () => {
    expect(mapAuthError({ code: undefined, message: 'Email rate limit exceeded' })).toBe(
      authErrorMessages.rateLimit
    );
  });
});

describe('zodFieldErrors', () => {
  it('maps the first issue per field to its message', () => {
    const schema = z.object({
      email: z.string().email('Email không hợp lệ'),
      password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    });

    const parsed = schema.safeParse({ email: 'nope', password: '123' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(zodFieldErrors(parsed.error)).toEqual({
      email: 'Email không hợp lệ',
      password: 'Mật khẩu tối thiểu 8 ký tự',
    });
  });
});
