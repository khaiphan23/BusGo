import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResetPasswordForm } from '@/app/(auth)/reset-password/_components/ResetPasswordForm';
import { authErrorMessages } from '@/lib/auth/auth-errors';

const authMock = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
}));
const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: authMock }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

function withRecoverySession() {
  authMock.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'an@busgo.vn' } } });
}

function withoutRecoverySession() {
  authMock.getUser.mockResolvedValue({ data: { user: null } });
}

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.updateUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
    withRecoverySession();
  });

  it('shows a loading state while checking the recovery session', () => {
    authMock.getUser.mockReturnValue(new Promise(() => undefined));

    render(<ResetPasswordForm />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Đang kiểm tra phiên khôi phục/)).toBeInTheDocument();
  });

  it('shows a link to request a new recovery link when there is no session', async () => {
    withoutRecoverySession();

    render(<ResetPasswordForm />);

    await waitFor(() => {
      expect(screen.getByTestId('no-recovery-session')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Yêu cầu lại liên kết' })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
    expect(screen.queryByLabelText('Mật khẩu mới')).not.toBeInTheDocument();
  });

  it('renders the form when a recovery session exists', async () => {
    render(<ResetPasswordForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Đặt lại mật khẩu' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Mật khẩu mới')).toBeInTheDocument();
    expect(screen.getByLabelText('Xác nhận mật khẩu mới')).toBeInTheDocument();
  });

  it('shows zod messages and does not call the API on mismatched passwords', async () => {
    const { container } = render(<ResetPasswordForm />);
    await waitFor(() => {
      expect(screen.getByLabelText('Mật khẩu mới')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'matkhau123' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'khacnhau1' } });
    fireEvent.submit(container.querySelector('form')!);

    expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    expect(authMock.updateUser).not.toHaveBeenCalled();
  });

  it('updates the password through the browser client and redirects home', async () => {
    const { container } = render(<ResetPasswordForm />);
    await waitFor(() => {
      expect(screen.getByLabelText('Mật khẩu mới')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'matkhau123' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'matkhau123' } });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(authMock.updateUser).toHaveBeenCalledWith({ password: 'matkhau123' });
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });
  });

  it('shows a generic alert when updateUser fails', async () => {
    authMock.updateUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'same_password', message: 'New password should be different' },
    });
    const { container } = render(<ResetPasswordForm />);
    await waitFor(() => {
      expect(screen.getByLabelText('Mật khẩu mới')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'matkhau123' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'matkhau123' } });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByTestId('reset-error')).toHaveTextContent(authErrorMessages.generic);
    });
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});
