import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeRedirectPath } from '@/lib/safe-redirect';

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-otp',
  '/auth/callback',
  '/manifest.json',
  '/sw.js',
  '/service-worker.js',
  '/robots.txt',
  '/favicon.ico',
]);

const PUBLIC_PREFIXES = ['/map', '/api/', '/_next/'];
const STATIC_FILE_PATTERN = /\.[a-z0-9]{2,5}(\?|$)/i;

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    STATIC_FILE_PATTERN.test(pathname)
  );
}

function withRefreshedCookies(response: NextResponse, supabaseResponse: NextResponse) {
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components; the same
  // getUser() result is the identity check for the deny-by-default guards.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (user) {
    if (pathname === '/login' || pathname === '/register') {
      return withRefreshedCookies(
        NextResponse.redirect(new URL('/', request.url), 302),
        supabaseResponse
      );
    }
    return supabaseResponse;
  }

  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  const loginUrl = new URL('/login', request.url);
  const next = safeRedirectPath(pathname + search);
  if (next !== null) {
    loginUrl.searchParams.set('next', next);
  }
  return withRefreshedCookies(NextResponse.redirect(loginUrl, 302), supabaseResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
