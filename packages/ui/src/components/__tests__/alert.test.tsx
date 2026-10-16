import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from '../alert';

describe('Alert', () => {
  it('renders error variant with role="alert"', () => {
    render(<Alert variant="error">Email hoặc mật khẩu không đúng.</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Email hoặc mật khẩu không đúng.');
    expect(alert).toHaveClass('text-danger');
  });

  it('renders success variant without role="alert"', () => {
    render(<Alert variant="success">Gửi thành công.</Alert>);
    expect(screen.getByText('Gửi thành công.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders info variant without role="alert"', () => {
    render(<Alert variant="info">Thông tin hệ thống.</Alert>);
    expect(screen.getByText('Thông tin hệ thống.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('defaults to info variant', () => {
    render(<Alert>Mặc định</Alert>);
    expect(screen.getByText('Mặc định')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Alert className="custom-alert">Custom</Alert>);
    expect(screen.getByText('Custom')).toHaveClass('custom-alert');
  });
});
