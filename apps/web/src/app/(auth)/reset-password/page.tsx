import type { Metadata } from 'next';
import { ResetPasswordForm } from './_components/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu — BusGo',
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
