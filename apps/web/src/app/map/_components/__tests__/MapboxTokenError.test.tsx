import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapboxTokenError } from '../MapboxTokenError';
import type { TokenValidationResult } from '@/lib/mapbox';

const placeholder: TokenValidationResult = {
  valid: false,
  token: null,
  error:
    'Mapbox token is still set to the placeholder value. Please replace "your_mapbox_token" with your actual Mapbox access token in .env.local',
};

const missing: TokenValidationResult = {
  valid: false,
  token: null,
  error: 'NEXT_PUBLIC_MAPBOX_TOKEN is not set. Please add your Mapbox access token to .env.local',
};

const invalid: TokenValidationResult = {
  valid: false,
  token: null,
  error: 'Mapbox token appears to be invalid (too short). Please check your token in .env.local',
};

const unknown: TokenValidationResult = {
  valid: false,
  token: null,
  error: 'something else went wrong',
};

describe('MapboxTokenError', () => {
  it('renders an alert region so assistive tech announces the failure', () => {
    render(<MapboxTokenError validation={placeholder} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('guides the developer when the token is missing', () => {
    render(<MapboxTokenError validation={missing} />);
    expect(screen.getByRole('heading', { name: 'Mapbox Token Chưa Cấu Hình' })).toBeInTheDocument();
    expect(screen.getByText(/NEXT_PUBLIC_MAPBOX_TOKEN=pk\./)).toBeInTheDocument();
    expect(screen.getByText(/bạn cần cấu hình Mapbox access token/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mapbox Account/ })).toBeInTheDocument();
  });

  it('guides the developer when the token is still the placeholder', () => {
    render(<MapboxTokenError validation={placeholder} />);
    expect(
      screen.getByRole('heading', { name: 'Mapbox Token Chưa Được Cập Nhật' })
    ).toBeInTheDocument();
    expect(screen.getByText(/giá trị placeholder/)).toBeInTheDocument();
  });

  it('guides the developer when the token is malformed', () => {
    render(<MapboxTokenError validation={invalid} />);
    expect(screen.getByRole('heading', { name: 'Mapbox Token Không Hợp Lệ' })).toBeInTheDocument();
    expect(screen.getByText(/không hợp lệ/)).toBeInTheDocument();
  });

  it('falls back to a generic title for unclassified errors', () => {
    render(<MapboxTokenError validation={unknown} />);
    expect(screen.getByRole('heading', { name: 'Lỗi Cấu Hình Bản Đồ' })).toBeInTheDocument();
  });

  it('invokes onRetry from the retry button', () => {
    const onRetry = vi.fn();
    render(<MapboxTokenError validation={placeholder} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thử Lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry button when no handler is provided', () => {
    render(<MapboxTokenError validation={placeholder} />);
    expect(screen.queryByRole('button', { name: 'Thử Lại' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Tải Lại Trang' })).toBeInTheDocument();
  });

  it('links to the Mapbox token page without leaking the opener', () => {
    render(<MapboxTokenError validation={missing} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
    expect(screen.getByRole('link', { name: 'Lấy Token Mapbox' })).toBeInTheDocument();
  });
});
