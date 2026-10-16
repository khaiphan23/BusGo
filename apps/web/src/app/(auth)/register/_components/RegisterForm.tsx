'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, PasswordInput } from '@bus/ui';
import { registerSchema } from '@bus/validators';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessages, mapAuthError, zodFieldErrors } from '@/lib/auth/auth-errors';

const RESEND_COOLDOWN = 60;

export function RegisterForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }

  function confirmationRedirectUrl() {
    return `${window.location.origin}/auth/callback?next=/`;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedPhone = phone.trim();
    const parsed = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      phone: trimmedPhone === '' ? undefined : trimmedPhone,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const { data, error } = await createClient().auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            full_name: parsed.data.fullName,
            ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
          },
          emailRedirectTo: confirmationRedirectUrl(),
        },
      });

      if (error) {
        setFormError(mapAuthError(error, 'generic'));
        return;
      }

      if (data.session) {
        router.push('/');
        return;
      }

      setAwaitingConfirmation(true);
      setResendCooldown(RESEND_COOLDOWN);
    } catch {
      setFormError(authErrorMessages.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || isResending) return;
    setFormError(null);
    setIsResending(true);

    try {
      const { error } = await createClient().auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: confirmationRedirectUrl() },
      });
      if (error) {
        setFormError(mapAuthError(error, 'generic'));
        return;
      }
      setResendCooldown(RESEND_COOLDOWN);
    } catch {
      setFormError(authErrorMessages.generic);
    } finally {
      setIsResending(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đăng ký thành công</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="success" data-testid="confirmation-sent">
            Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác thực tài khoản.
          </Alert>
          {formError && (
            <Alert variant="error" data-testid="register-error">
              {formError}
            </Alert>
          )}
          <p className="text-sm text-gray-600">
            Không nhận được email? Kiểm tra thư rác hoặc gửi lại yêu cầu.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleResend()}
            isLoading={isResending}
            disabled={isResending || resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại email xác thực'}
          </Button>
          <p className="text-center text-sm text-gray-600">
            Đã xác thực?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng ký</CardTitle>
        <p className="text-sm text-gray-500">Tạo tài khoản BusGo miễn phí.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <Alert variant="error" data-testid="register-error">
              {formError}
            </Alert>
          )}
          <Input
            label="Họ và tên"
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              clearFieldError('fullName');
            }}
            error={fieldErrors.fullName}
            disabled={isSubmitting}
          />
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
          <Input
            label="Số điện thoại (tuỳ chọn)"
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="0901234567"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              clearFieldError('phone');
            }}
            error={fieldErrors.phone}
            disabled={isSubmitting}
          />
          <PasswordInput
            label="Mật khẩu"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError('password');
            }}
            error={fieldErrors.password}
            disabled={isSubmitting}
          />
          <PasswordInput
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearFieldError('confirmPassword');
            }}
            error={fieldErrors.confirmPassword}
            disabled={isSubmitting}
          />
          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
            Đăng ký
          </Button>
          <p className="text-center text-sm text-gray-600">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Đăng nhập
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
