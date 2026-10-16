import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/app/(auth)/login/_components/LoginForm';
import { authErrorMessages } from '@/lib/auth/auth-errors';

const authMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
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
  const { container } = render(<LoginForm />);
  const form = container.querySelector('form');
  if (!form) throw new Error('login form not found');
  return { form };
}

function fillCredentials() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@busgo.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'matkhau123' } });
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navMock.search = '';
    authMock.signInWithPassword.mockReset().mockResolvedValue({ data: { user: null }, error: null });
  });

  it('renders Vietnamese login copy and navigation links', () => {
    renderForm();

    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: 'Đăng nhập bằng OTP' })).toHaveAttribute('href', '/verify-otp');
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/register');
  });

  it('shows zod messages and does not call the API on invalid input', () => {
    const { form } = renderForm();

    fireEvent.submit(form);

    expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument();
    expect(screen.getByText('Mật khẩu tối thiểu 8 ký tự')).toBeInTheDocument();
    expect(authMock.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in and redirects to a safe next path', async () => {
    navMock.search = '?next=%2Fmap';
    const { form } = renderForm();
    fillCredentials();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(authMock.signInWithPassword).toHaveBeenCalledWith({
        email: 'an@busgo.vn',
        password: 'matkhau123',
      });
      expect(routerMock.push).toHaveBeenCalledWith('/map');
    });
  });

  it('falls back to / when the next path is unsafe', async () => {
    navMock.search = '?next=%2F%2Fevil.com';
    const { form } = renderForm();
    fillCredentials();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });
  });

  it('shows the generic login error for invalid credentials without enumeration', async () => {
    authMock.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    });
    const { form } = renderForm();
    fillCredentials();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(authErrorMessages.login);
    });
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('shows a generic failure message when the request throws', async () => {
    authMock.signInWithPassword.mockRejectedValue(new Error('network down'));
    const { form } = renderForm();
    fillCredentials();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(authErrorMessages.generic);
    });
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('surfaces a generic alert when the auth callback previously failed', () => {
    navMock.search = '?error=1';

    renderForm();

    expect(screen.getByRole('alert')).toHaveTextContent(authErrorMessages.invalidLink);
  });

  it('carries the entered email into the OTP link', () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@busgo.vn' } });

    expect(screen.getByRole('link', { name: 'Đăng nhập bằng OTP' })).toHaveAttribute(
      'href',
      '/verify-otp?email=an%40busgo.vn'
    );
  });

  it('disables the submit button while signing in', async () => {
    let resolveLogin: (value: unknown) => void = () => undefined;
    authMock.signInWithPassword.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        })
    );
    const { form } = renderForm();
    fillCredentials();

    fireEvent.submit(form);

    const button = screen.getByRole('button', { name: 'Đăng nhập' });
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    resolveLogin({ data: { user: null }, error: null });
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });
});
