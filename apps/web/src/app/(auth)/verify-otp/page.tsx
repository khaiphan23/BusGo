import { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyOtpForm } from './_components/VerifyOtpForm';

export const metadata: Metadata = {
  title: 'Xác thực OTP — BusGo',
};

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
