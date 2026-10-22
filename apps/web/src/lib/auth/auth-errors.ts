import type { AuthError } from '@supabase/supabase-js';
import type { ZodError } from 'zod';

export const authErrorMessages = {
  login: 'Email hoặc mật khẩu không đúng.',
  otp: 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
  recoveryRequest: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn. Vui lòng kiểm tra hộp thư.',
  rateLimit: 'Thao tác quá nhanh, vui lòng thử lại sau.',
  generic: 'Đã xảy ra lỗi. Vui lòng thử lại.',
  invalidLink: 'Liên kết xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
} as const;

export type AuthErrorKind = 'login' | 'otp' | 'generic';

const LOGIN_CODES = new Set([
  'invalid_credentials',
  'user_not_found',
  'email_not_found',
  'invalid_grant',
]);

const OTP_CODES = new Set([
  'otp_expired',
  'otp_not_found',
  'bad_code',
  'session_expired',
  'session_not_found',
  'refresh_token_not_found',
]);

const RATE_LIMIT_CODES = new Set([
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  'over_sms_send_rate_limit',
]);

function readError(error: unknown): { code: string; message: string } {
  if (error !== null && typeof error === 'object') {
    const candidate = error as Partial<AuthError>;
    return {
      code: typeof candidate.code === 'string' ? candidate.code : '',
      message: typeof candidate.message === 'string' ? candidate.message : '',
    };
  }
  return { code: '', message: '' };
}

export function mapAuthError(error: unknown, kind: AuthErrorKind = 'generic'): string {
  const { code, message } = readError(error);

  if (process.env.NODE_ENV === 'development') {
    console.warn('[auth]', code || '(no code)', message);
  }

  if (RATE_LIMIT_CODES.has(code) || /rate limit|too many requests/i.test(message)) {
    return authErrorMessages.rateLimit;
  }

  if (kind === 'login') {
    return LOGIN_CODES.has(code) || /invalid credentials/i.test(message)
      ? authErrorMessages.login
      : authErrorMessages.generic;
  }

  if (kind === 'otp') {
    return OTP_CODES.has(code) || /\botp\b/i.test(message)
      ? authErrorMessages.otp
      : authErrorMessages.generic;
  }

  return authErrorMessages.generic;
}

export function zodFieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && errors[key] === undefined) {
      errors[key] = issue.message;
    }
  }
  return errors;
}
