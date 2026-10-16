'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, PasswordInput, Spinner } from '@bus/ui';
import { resetPasswordSchema } from '@bus/validators';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessages, mapAuthError, zodFieldErrors } from '@/lib/auth/auth-errors';

type SessionStatus = 'checking' | 'ready' | 'no-session';

export function ResetPasswordForm() {
  const router = useRouter();

  const [status, setStatus] = useState<SessionStatus>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setStatus(data.user ? 'ready' : 'no-session');
      })
      .catch(() => {
        if (!cancelled) setStatus('no-session');
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const { error } = await createClient().auth.updateUser({
        password: parsed.data.password,
      });
      if (error) {
        setFormError(mapAuthError(error, 'generic'));
        return;
      }
      router.push('/');
    } catch {
      setFormError(authErrorMessages.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === 'checking') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <Spinner label="Đang kiểm tra phiên..." />
          <p className="text-sm text-gray-500">Đang kiểm tra phiên khôi phục...</p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'no-session') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đặt lại mật khẩu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info" data-testid="no-recovery-session">
            Không tìm thấy phiên khôi phục hợp lệ. Vui lòng yêu cầu lại liên kết đặt lại mật khẩu.
          </Alert>
          <p className="text-center text-sm text-gray-600">
            <Link href="/forgot-password" className="text-primary font-medium hover:underline">
              Yêu cầu lại liên kết
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đặt lại mật khẩu</CardTitle>
        <p className="text-sm text-gray-500">Chọn mật khẩu mới cho tài khoản của bạn.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <Alert variant="error" data-testid="reset-error">
              {formError}
            </Alert>
          )}
          <PasswordInput
            label="Mật khẩu mới"
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
            label="Xác nhận mật khẩu mới"
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
            Đặt lại mật khẩu
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
