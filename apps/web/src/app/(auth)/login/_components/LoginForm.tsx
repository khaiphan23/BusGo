'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, PasswordInput } from '@bus/ui';
import { loginSchema } from '@bus/validators';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { authErrorMessages, mapAuthError, zodFieldErrors } from '@/lib/auth/auth-errors';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(
    searchParams.get('error') === '1' ? authErrorMessages.invalidLink : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const next = safeRedirectPath(searchParams.get('next')) ?? '/';
  const otpHref = `/verify-otp${email ? `?email=${encodeURIComponent(email)}` : ''}`;

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const { error } = await createClient().auth.signInWithPassword(parsed.data);
      if (error) {
        setFormError(mapAuthError(error, 'login'));
        return;
      }
      router.push(next);
    } catch {
      setFormError(authErrorMessages.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng nhập</CardTitle>
        <p className="text-sm text-gray-500">
          Đăng nhập để theo dõi xe buýt và đặt chỗ trước.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <Alert variant="error" data-testid="login-error">
              {formError}
            </Alert>
          )}
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="ban@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError('email');
            }}
            error={fieldErrors.email}
            disabled={isSubmitting}
          />
          <PasswordInput
            label="Mật khẩu"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError('password');
            }}
            error={fieldErrors.password}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Quên mật khẩu?
            </Link>
            <Link href={otpHref} className="text-primary hover:underline">
              Đăng nhập bằng OTP
            </Link>
          </div>
          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
            Đăng nhập
          </Button>
          <p className="text-center text-sm text-gray-600">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Đăng ký
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
