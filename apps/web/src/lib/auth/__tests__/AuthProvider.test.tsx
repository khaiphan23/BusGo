import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useUser } from '@/components/auth/AuthProvider';

type AuthListener = (event: string, session: { user: Record<string, unknown> } | null) => void;

const authMock = vi.hoisted(() => ({
  listeners: [] as AuthListener[],
  signOut: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (listener: AuthListener) => {
        authMock.listeners.push(listener);
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
      signOut: authMock.signOut,
    },
  }),
}));

function Probe() {
  const { user, isLoading, signOut } = useUser();
  return (
    <div>
      <span data-testid="identity">
        {user ? (user.fullName ?? user.email ?? user.id) : 'signed-out'}
      </span>
      <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>
      <button type="button" onClick={() => void signOut()}>
        Đăng xuất
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    authMock.listeners.length = 0;
    authMock.signOut.mockReset().mockResolvedValue(undefined);
  });

  it('renders the server-seeded user without a loading state', () => {
    render(
      <AuthProvider initialUser={{ id: 'u1', email: 'an@busgo.vn', fullName: 'An Nguyên' }}>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId('identity')).toHaveTextContent('An Nguyên');
    expect(screen.getByTestId('loading')).toHaveTextContent('ready');
  });

  it('settles isLoading on the first onAuthStateChange event and reflects the session', () => {
    render(
      <AuthProvider initialUser={null}>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId('identity')).toHaveTextContent('signed-out');
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    act(() => {
      authMock.listeners[0]('INITIAL_SESSION', {
        user: { id: 'u2', email: 'ben@busgo.vn', user_metadata: { full_name: 'Ben' } },
      });
    });

    expect(screen.getByTestId('identity')).toHaveTextContent('Ben');
    expect(screen.getByTestId('loading')).toHaveTextContent('ready');
  });

  it('clears the user on SIGNED_OUT', () => {
    render(
      <AuthProvider initialUser={{ id: 'u1', email: 'an@busgo.vn' }}>
        <Probe />
      </AuthProvider>
    );

    act(() => {
      authMock.listeners[0]('SIGNED_OUT', null);
    });

    expect(screen.getByTestId('identity')).toHaveTextContent('signed-out');
  });

  it('signs out through the browser client and clears local state', async () => {
    render(
      <AuthProvider initialUser={{ id: 'u1', email: 'an@busgo.vn' }}>
        <Probe />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => {
      expect(screen.getByTestId('identity')).toHaveTextContent('signed-out');
    });
    expect(authMock.signOut).toHaveBeenCalledTimes(1);
  });

  it('throws when useUser is used outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow('useUser must be used within an AuthProvider');

    consoleError.mockRestore();
  });
});
