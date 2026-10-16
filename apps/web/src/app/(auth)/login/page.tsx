import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from './_components/LoginForm';

export const metadata: Metadata = {
  title: 'Đăng nhập — BusGo',
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
