import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MapErrorBoundary } from '../MapErrorBoundary';

function ThrowErrorComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="child">Child content</div>;
}

describe('MapErrorBoundary', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleError.mockClear();
  });

  it('renders children when no error', () => {
    render(
      <MapErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </MapErrorBoundary>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders fallback UI when error occurs', () => {
    render(
      <MapErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </MapErrorBoundary>
    );
    expect(screen.getByText('Không thể tải bản đồ')).toBeInTheDocument();
    expect(screen.getByText(/Đã xảy ra lỗi khi tải bản đồ/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tải lại trang/i })).toBeInTheDocument();
  });

  it('calls componentDidCatch when error occurs', () => {
    render(
      <MapErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </MapErrorBoundary>
    );
    expect(consoleError).toHaveBeenCalledWith(
      '[MapErrorBoundary] Error caught:',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('renders custom fallback when provided', () => {
    render(
      <MapErrorBoundary fallback={<div data-testid="custom-fallback">Custom fallback</div>}>
        <ThrowErrorComponent shouldThrow={true} />
      </MapErrorBoundary>
    );
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByText('Không thể tải bản đồ')).not.toBeInTheDocument();
  });
});