import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../spinner';

describe('Spinner', () => {
  it('renders with default Vietnamese label and status role', () => {
    render(<Spinner />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Đang tải...');
    expect(status).toHaveAttribute('aria-busy', 'true');
  });

  it('renders with custom label', () => {
    render(<Spinner label="Đang xử lý" />);
    expect(screen.getByRole('status', { name: 'Đang xử lý' })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Spinner className="custom-spinner" />);
    expect(screen.getByRole('status')).toHaveClass('custom-spinner');
  });
});
