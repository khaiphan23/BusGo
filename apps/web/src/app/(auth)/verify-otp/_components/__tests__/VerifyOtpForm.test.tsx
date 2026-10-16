import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VerifyOtpForm } from '@/app/(auth)/verify-otp/_components/VerifyOtpForm';
import { authErrorMessages } from '@/lib/auth/auth-errors';

const authMock = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));
const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));
const navMock = vi.hoisted(() => ({ search: '' }));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: authMock }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(navMock.search),
}));

function renderForm() {
  const { container } = render(<VerifyOtpForm />);
  const form = container.querySelector('form');
  if (!form) throw new Error('otp form not found');
  return { form };
}

function fillOtp() {
  fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: '123456' } });
}

describe('VerifyOtpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navMock.search = '';
    authMock.signInWithOtp.mockReset().mockResolvedValue({ data: { user: null }, error: null });
    authMock.verifyOtp.mockReset().mockResolvedValue({ data: { user: null, session: null }, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with a valid email prefilled from the query string', () => {
    navMock.search = '?email=an%40busgo.vn';

    renderForm();

    expect(screen.getByRole('heading', { name: 'Xác thực OTP' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('an@busgo.vn');
    expect(screen.getByRole('button', { name: 'Gửi mã OTP' })).toBeEnabled();
  });

  it('ignores an invalid email query param', () => {
    navMock.search = '?email=khong-phai-email';

    renderForm();

    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it('shows a zod message and does not call the API for an invalid email', () => {
    const { form } = renderForm();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sai-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));

    expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument();
    expect(authMock.signInWithOtp).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: '123' } });
    fireEvent.submit(form);
    expect(screen.getByText('Mã OTP phải gồm 6 chữ số')).toBeInTheDocument();
    expect(authMock.verifyOtp).not.toHaveBeenCalled();
  });

  it('sends the OTP, shows the generic sent copy, and starts the 60s cooldown', async () => {
    vi.useFakeTimers();
    navMock.search = '?email=an%40busgo.vn';
    renderForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    });

    expect(authMock.signInWithOtp).toHaveBeenCalledWith({ email: 'an@busgo.vn' });
    expect(screen.getByTestId('otp-sent')).toHaveTextContent(authErrorMessages.recoveryRequest);
    expect(screen.getByRole('button', { name: 'Gửi lại sau 60s' })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole('button', { name: 'Gửi lại sau 59s' })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(59_000);
    });
    const resendButton = screen.getByRole('button', { name: 'Gửi lại mã' });
    expect(resendButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(resendButton);
    });
    expect(authMock.signInWithOtp).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Gửi lại sau 60s' })).toBeDisabled();
  });

  it('shows a generic alert when the OTP request fails', async () => {
    navMock.search = '?email=an%40busgo.vn';
    authMock.signInWithOtp.mockResolvedValue({
      data: { user: null },
      error: { code: 'over_email_send_rate_limit', message: 'Rate limit' },
    });
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));

    await waitFor(() => {
      expect(screen.getByTestId('otp-error')).toHaveTextContent(authErrorMessages.generic);
    });
    expect(screen.queryByTestId('otp-sent')).not.toBeInTheDocument();
  });

  it('verifies the code and redirects home on success', async () => {
    navMock.search = '?email=an%40busgo.vn';
    const { form } = renderForm();
    fillOtp();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(authMock.verifyOtp).toHaveBeenCalledWith({
        type: 'email',
        email: 'an@busgo.vn',
        token: '123456',
      });
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });
  });

  it('shows the generic OTP error for an invalid or expired code', async () => {
    navMock.search = '?email=an%40busgo.vn';
    authMock.verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'otp_expired', message: 'OTP has expired' },
    });
    const { form } = renderForm();
    fillOtp();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId('otp-error')).toHaveTextContent(authErrorMessages.otp);
    });
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});
