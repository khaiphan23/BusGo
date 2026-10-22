import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from '@/app/(auth)/forgot-password/_components/ForgotPasswordForm';
import { authErrorMessages } from '@/lib/auth/auth-errors';

const authMock = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: authMock }),
}));

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
  });

  it('renders the forgot-password form', () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByRole('heading', { name: 'Quên mật khẩu' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi hướng dẫn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quay lại đăng nhập' })).toHaveAttribute('href', '/login');
  });

  it('shows a zod message and does not call the API on an invalid email', () => {
    const { container } = render(<ForgotPasswordForm />);
    const form = container.querySelector('form')!;

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sai-email' } });
    fireEvent.submit(form);

    expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument();
    expect(authMock.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('shows the generic success copy and points the redirect at the callback', async () => {
    const { container } = render(<ForgotPasswordForm />);
    const form = container.querySelector('form')!;

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@busgo.vn' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId('recovery-sent')).toHaveTextContent(authErrorMessages.recoveryRequest);
    });
    expect(authMock.resetPasswordForEmail).toHaveBeenCalledWith('an@busgo.vn', {
      redirectTo: expect.stringContaining('/auth/callback?next=/reset-password'),
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a generic alert when the request fails', async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({
      error: { code: 'unexpected_failure', message: 'Request failed' },
    });
    const { container } = render(<ForgotPasswordForm />);
    const form = container.querySelector('form')!;

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@busgo.vn' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId('forgot-error')).toHaveTextContent(authErrorMessages.generic);
    });
    expect(screen.getByTestId('forgot-error')).not.toHaveTextContent('Request failed');
    expect(screen.queryByTestId('recovery-sent')).not.toBeInTheDocument();
  });

  it('shows the same success copy for a second, different email (no enumeration)', async () => {
    const first = render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@busgo.vn' } });
    fireEvent.submit(first.container.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByTestId('recovery-sent')).toHaveTextContent(authErrorMessages.recoveryRequest);
    });
    const firstCopy = screen.getByTestId('recovery-sent').textContent;
    first.unmount();

    const second = render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'khong-ton-tai@busgo.vn' } });
    fireEvent.submit(second.container.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByTestId('recovery-sent')).toHaveTextContent(authErrorMessages.recoveryRequest);
    });

    expect(screen.getByTestId('recovery-sent').textContent).toBe(firstCopy);
  });
});
