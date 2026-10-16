import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/safe-redirect';

const OTP_TYPES: ReadonlySet<string> = new Set([
  'email',
  'signup',
  'recovery',
  'invite',
  'magiclink',
  'email_change',
  'reauthentication',
]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = safeRedirectPath(searchParams.get('next')) ?? '/';

  const supabase = await createClient();
  let succeeded = false;

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      succeeded = !error;
    } else if (tokenHash && type && OTP_TYPES.has(type)) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as EmailOtpType,
        token_hash: tokenHash,
      });
      succeeded = !error;
    }
  } catch {
    succeeded = false;
  }

  if (succeeded) {
    return NextResponse.redirect(new URL(next, origin), 302);
  }

  return NextResponse.redirect(new URL('/login?error=1', origin), 302);
}
