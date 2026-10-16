'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@bus/ui';
import { forgotPasswordSchema } from '@bus/validators';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessages, mapAuthError, zodFieldErrors } from '@/lib/auth/auth-errors';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const { error } = await createClient().auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        setFormError(mapAuthError(error, 'generic'));
        return;
      }
      setSent(true);
    } catch {
      setFormError(authErrorMessages.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quên mật khẩu</CardTitle>
        <p className="text-sm text-gray-500">
          Nhập email của bạn, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
        </p>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <Alert variant="success" data-testid="recovery-sent">
              {authErrorMessages.recoveryRequest}
            </Alert>
            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="text-primary font-medium hover:underline">
                Quay lại đăng nhập
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <Alert variant="error" data-testid="forgot-error">
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
                setFieldErrors({});
              }}
              error={fieldErrors.email}
              disabled={isSubmitting}
            />
            <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
              Gửi hướng dẫn
            </Button>
            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="text-primary font-medium hover:underline">
                Quay lại đăng nhập
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
