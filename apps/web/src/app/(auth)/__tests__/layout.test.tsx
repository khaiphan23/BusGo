import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthLayout from '@/app/(auth)/layout';

describe('AuthLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the BusGo brand linking home and wraps children in a centered shell', () => {
    render(
      <AuthLayout>
        <div>trang-tro-lai</div>
      </AuthLayout>
    );

    expect(screen.getByRole('link', { name: /BusGo/ })).toHaveAttribute('href', '/');
    expect(screen.getByText('trang-tro-lai')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/');
  });
});
