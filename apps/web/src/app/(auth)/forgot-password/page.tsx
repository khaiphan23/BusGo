import type { Metadata } from 'next';
import { ForgotPasswordForm } from './_components/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Quên mật khẩu — BusGo',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
