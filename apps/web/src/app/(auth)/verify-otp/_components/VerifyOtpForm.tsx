'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@bus/ui';
import { emailSchema, otpSchema } from '@bus/validators';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessages, mapAuthError, zodFieldErrors } from '@/lib/auth/auth-errors';

const RESEND_COOLDOWN = 60;

export function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(() => {
    const queryEmail = searchParams.get('email') ?? '';
    return emailSchema.safeParse(queryEmail).success ? queryEmail : '';
  });
  const [token, setToken] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }

  async function handleSend() {
    setFormError(null);

    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setFieldErrors({ email: parsedEmail.error.issues[0].message });
      return;
    }
    setFieldErrors({});
    setIsSending(true);

    try {
      const { error } = await createClient().auth.signInWithOtp({
        email: parsedEmail.data,
      });
      if (error) {
        setFormError(mapAuthError(error, 'generic'));
        return;
      }
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch {
      setFormError(authErrorMessages.generic);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = otpSchema.safeParse({ email, token });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const { error } = await createClient().auth.verifyOtp({
        type: 'email',
        email: parsed.data.email,
        token: parsed.data.token,
      });
      if (error) {
        setFormError(mapAuthError(error, 'otp'));
        return;
      }
      router.push('/');
    } catch {
      setFormError(authErrorMessages.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  const sendLabel = !sent
    ? 'Gửi mã OTP'
    : cooldown > 0
      ? `Gửi lại sau ${cooldown}s`
      : 'Gửi lại mã';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xác thực OTP</CardTitle>
        <p className="text-sm text-gray-500">
          Nhập mã OTP gồm 6 chữ số được gửi đến email của bạn.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <Alert variant="error" data-testid="otp-error">
              {formError}
            </Alert>
          )}
          {sent && (
            <Alert variant="success" data-testid="otp-sent">
              {authErrorMessages.recoveryRequest}
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
          <Input
            label="Mã OTP"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={token}
            onChange={(event) => {
              setToken(event.target.value.replace(/\D/g, ''));
              clearFieldError('token');
            }}
            error={fieldErrors.token}
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleSend()}
            isLoading={isSending}
            disabled={isSending || (sent && cooldown > 0)}
          >
            {sendLabel}
          </Button>
          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
            Xác thực
          </Button>
          <p className="text-center text-sm text-gray-600">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Quay lại đăng nhập
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
