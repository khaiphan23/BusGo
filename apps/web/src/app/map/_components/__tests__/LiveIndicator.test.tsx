/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LiveIndicator } from '../LiveIndicator';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('LiveIndicator', () => {
  let mockChannel: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        // Simulate async subscription - call callback with SUBSCRIBED after a tick
        setTimeout(() => callback('SUBSCRIBED'), 0);
      }),
    };

    mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    };

    (createClient as unknown as import('vitest').Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders connecting state initially', () => {
    render(<LiveIndicator />);
    expect(screen.getByText(/Đang kết nối/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows connected state when subscribed', async () => {
    render(<LiveIndicator />);
    await waitFor(() => {
      expect(screen.getByText('Trực tuyến')).toBeInTheDocument();
    });
  });

  it('has correct aria attributes', () => {
    render(<LiveIndicator />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('Trạng thái kết nối'));
  });

  it('cleans up channel on unmount', () => {
    const { unmount } = render(<LiveIndicator />);
    unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});