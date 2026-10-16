import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RegisterForm } from '@/app/(auth)/register/_components/RegisterForm';
import { authErrorMessages } from '@/lib/auth/auth-errors';

const authMock = vi.hoisted(() => ({
  signUp: vi.fn(),
  resend: vi.fn(),
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

function renderForm() {
  const { container } = render(<RegisterForm />);
  const form = container.querySelector('form');
  if (!form) throw new Error('register form not found');
  return { form };
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn Văn A' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@busgo.vn' } });
  fireEvent.change(screen.getByLabelText('Số điện thoại (tuỳ chọn)'), {
    target: { value: '0901234567' },
  });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'matkhau123' } });
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: 'matkhau123' } });
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.signUp.mockReset().mockResolvedValue({ data: { user: null, session: null }, error: null });
    authMock.resend.mockReset().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all registration fields including the optional phone', () => {
    renderForm();

    expect(screen.getByRole('heading', { name: 'Đăng ký' })).toBeInTheDocument();
    expect(screen.getByLabelText('Họ và tên')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Số điện thoại (tuỳ chọn)')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByLabelText('Xác nhận mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
  });

  it('shows zod messages and does not call the API on invalid input', () => {
    const { form } = renderForm();

    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sai-email' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'matkhau123' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: 'khacnhau1' } });
    fireEvent.submit(form);

    expect(screen.getByText('Họ tên tối thiểu 2 ký tự')).toBeInTheDocument();
    expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument();
    expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    expect(authMock.signUp).not.toHaveBeenCalled();
  });

  it('signs up with profile metadata and redirects home when a session is returned', async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: { access_token: 'x' } },
      error: null,
    });
    const { form } = renderForm();
    fillValidForm();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(authMock.signUp).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });

    const payload = authMock.signUp.mock.calls[0][0];
    expect(payload.email).toBe('an@busgo.vn');
    expect(payload.password).toBe('matkhau123');
    expect(payload.options.data.full_name).toBe('Nguyễn Văn A');
    expect(payload.options.data.phone).toBe('0901234567');
    expect(payload.options.emailRedirectTo).toContain('/auth/callback?next=/');
    expect(screen.queryByTestId('confirmation-sent')).not.toBeInTheDocument();
  });

  it('omits empty phone metadata', async () => {
    const { form } = renderForm();
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn Văn B' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ben@busgo.vn' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'matkhau123' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: 'matkhau123' } });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(authMock.signUp).toHaveBeenCalledTimes(1);
    });
    expect(authMock.signUp.mock.calls[0][0].options.data).toEqual({ full_name: 'Nguyễn Văn B' });
  });

  it('shows the email-confirmation state with an active resend cooldown when no session is returned', async () => {
    const { form } = renderForm();
    fillValidForm();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-sent')).toHaveTextContent(/kiểm tra email/i);
    });
    const resendButton = screen.getByRole('button', { name: 'Gửi lại sau 60s' });
    expect(resendButton).toBeDisabled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('counts the resend cooldown down and resends the confirmation email', async () => {
    vi.useFakeTimers();
    const { form } = renderForm();
    fillValidForm();

    await act(async () => {
      fireEvent.submit(form);
    });
    expect(screen.getByTestId('confirmation-sent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi lại sau 60s' })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole('button', { name: 'Gửi lại sau 59s' })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(59_000);
    });
    const resendButton = screen.getByRole('button', { name: 'Gửi lại email xác thực' });
    expect(resendButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(resendButton);
    });
    expect(authMock.resend).toHaveBeenCalledTimes(1);
    expect(authMock.resend.mock.calls[0][0].type).toBe('signup');
    expect(authMock.resend.mock.calls[0][0].email).toBe('an@busgo.vn');
    expect(screen.getByRole('button', { name: 'Gửi lại sau 60s' })).toBeDisabled();
  });

  it('shows a generic alert on signup failure without leaking enumeration details', async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'user_already_exists', message: 'User already registered' },
    });
    const { form } = renderForm();
    fillValidForm();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId('register-error')).toHaveTextContent(authErrorMessages.generic);
    });
    expect(screen.getByTestId('register-error')).not.toHaveTextContent('already registered');
    expect(screen.queryByTestId('confirmation-sent')).not.toBeInTheDocument();
  });
});
