import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordInput } from '../password-input';

describe('PasswordInput', () => {
  it('renders label linked to input', () => {
    render(<PasswordInput label="Mật khẩu" />);
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
  });

  it('masks the password by default and toggles visibility', () => {
    render(<PasswordInput label="Mật khẩu" />);
    const input = screen.getByLabelText('Mật khẩu');
    const toggle = screen.getByRole('button', { name: 'Hiện mật khẩu' });

    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAttribute('type', 'button');

    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('wires error message with role="alert", aria-invalid and aria-describedby', () => {
    render(<PasswordInput label="Mật khẩu" error="Mật khẩu tối thiểu 8 ký tự" />);
    const input = screen.getByLabelText('Mật khẩu');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    const errorId = input.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId as string)).toHaveTextContent('Mật khẩu tối thiểu 8 ký tự');
    expect(screen.getByRole('alert')).toHaveTextContent('Mật khẩu tối thiểu 8 ký tự');
  });

  it('has no error and aria-invalid false by default', () => {
    render(<PasswordInput label="Mật khẩu" />);
    const input = screen.getByLabelText('Mật khẩu');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders helperText when there is no error', () => {
    render(<PasswordInput label="Mật khẩu" helperText="Tối thiểu 8 ký tự" />);
    const input = screen.getByLabelText('Mật khẩu');
    const helperId = input.getAttribute('aria-describedby');
    expect(helperId).toBeTruthy();
    expect(document.getElementById(helperId as string)).toHaveTextContent('Tối thiểu 8 ký tự');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
