import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserMenu } from '@/components/auth/UserMenu';

type TestUser = { id: string; email?: string; fullName?: string; avatarUrl?: string } | null;

const userMock = vi.hoisted(() => ({
  user: null as TestUser,
  isLoading: false,
  signOut: vi.fn(),
}));
const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));

vi.mock('@/components/auth/AuthProvider', () => ({
  useUser: () => ({
    user: userMock.user,
    isLoading: userMock.isLoading,
    signOut: userMock.signOut,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userMock.user = null;
    userMock.isLoading = false;
    userMock.signOut.mockReset().mockResolvedValue(undefined);
  });

  it('renders a loading skeleton while the session is settling', () => {
    userMock.isLoading = true;

    render(<UserMenu />);

    const skeleton = screen.getByTestId('user-menu-loading');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument();
  });

  it('renders the signed-out auth links with the original header markup', () => {
    render(<UserMenu />);

    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the signed-in identity behind an accessible menu trigger', () => {
    userMock.user = { id: 'u1', email: 'an@busgo.vn', fullName: 'An Nguyên' };

    render(<UserMenu />);

    const trigger = screen.getByRole('button', { name: 'An Nguyên' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('A');
    expect(screen.queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument();
  });

  it('shows the full name and email inside the open menu', () => {
    userMock.user = { id: 'u1', email: 'an@busgo.vn', fullName: 'An Nguyên' };

    render(<UserMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'An Nguyên' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
    expect(screen.getByText('An Nguyên')).toBeInTheDocument();
    expect(screen.getByText('an@busgo.vn')).toBeInTheDocument();
  });

  it('falls back to the email initial when no full name exists', () => {
    userMock.user = { id: 'u1', email: 'an@busgo.vn' };

    render(<UserMenu />);

    expect(screen.getByRole('button', { name: 'an@busgo.vn' })).toHaveTextContent('A');
  });

  it('renders the avatar image when avatarUrl is present', () => {
    userMock.user = { id: 'u1', email: 'an@busgo.vn', avatarUrl: 'https://cdn.test/a.png' };

    render(<UserMenu />);

    expect(screen.getByRole('button', { name: 'an@busgo.vn' }).querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.test/a.png'
    );
  });

  it('signs out through the mocked hook and navigates home', async () => {
    userMock.user = { id: 'u1', email: 'an@busgo.vn', fullName: 'An Nguyên' };

    render(<UserMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'An Nguyên' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }));

    await waitFor(() => {
      expect(userMock.signOut).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu on outside click', () => {
    userMock.user = { id: 'u1', email: 'an@busgo.vn', fullName: 'An Nguyên' };

    render(<UserMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'An Nguyên' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'An Nguyên' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the menu open when clicking inside it', () => {
    userMock.user = { id: 'u1', email: 'an@busgo.vn', fullName: 'An Nguyên' };

    render(<UserMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'An Nguyên' }));
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Đăng xuất' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closes the menu on Escape and returns focus to the trigger', () => {
    userMock.user = { id: 'u1', email: 'an@busgo.vn', fullName: 'An Nguyên' };

    render(<UserMenu />);
    const trigger = screen.getByRole('button', { name: 'An Nguyên' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('opens the menu with ArrowDown from the trigger', () => {
    userMock.user = { id: 'u1', email: 'an@busgo.vn', fullName: 'An Nguyên' };

    render(<UserMenu />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'An Nguyên' }), { key: 'ArrowDown' });

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'An Nguyên' })).toHaveAttribute('aria-expanded', 'true');
  });
});
